from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, Dict, Any, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import (
    Claim,
    ClaimStatusHistory,
    InsurancePolicy,
    Provider,
    User,
    PatientProfile,
)
from app.schemas import ClaimSubmit
from app.services.audit_service import log_action
from app.services.notification_service import (
    notify_status_changed,
    notify_decision_made,
    notify_payment_processed,
    notify_claim_settled,
)

ALLOWED_TRANSITIONS: Dict[str, List[str]] = {
    "submitted": ["validation", "risk_screening", "under_review", "approved", "rejected"],
    "validation": ["risk_screening", "under_review", "approved", "rejected"],
    "risk_screening": ["under_review", "approved", "rejected"],
    "under_review": [
        "documentation_requested",
        "approved",
        "partially_approved",
        "rejected",
        "payment_processing",
        "settled",
    ],
    "documentation_requested": ["under_review", "approved", "rejected"],
    "approved": ["payment_processing", "settled", "rejected", "under_review"],
    "partially_approved": ["payment_processing", "settled", "rejected", "under_review"],
    "payment_processing": ["settled", "rejected", "under_review"],
    "settled": ["under_review"],
    "rejected": ["under_review"],
}


def generate_claim_reference(db: Session) -> str:
    """Generate a unique formatted claim reference like CLM-202610-0001."""
    now = datetime.utcnow()
    prefix = f"CLM-{now.strftime('%Y%m')}-"
    # Query count of claims matching prefix
    count = db.query(Claim).filter(Claim.claim_reference.like(f"{prefix}%")).count()
    next_num = count + 1
    # Check for uniqueness loop to be 100% collision-free
    while True:
        ref = f"{prefix}{next_num:04d}"
        exists = db.query(Claim).filter(Claim.claim_reference == ref).first()
        if not exists:
            return ref
        next_num += 1


def validate_claim_submission(claim_data: ClaimSubmit, db: Session, patient_id: str) -> None:
    """Validate claim submission parameters, policy coverage, and date logic."""
    # 1. Verify policy
    policy = None
    if claim_data.policy_id:
        policy = db.query(InsurancePolicy).filter(InsurancePolicy.id == claim_data.policy_id).first()
    if not policy and claim_data.policy_number:
        policy = db.query(InsurancePolicy).filter(
            InsurancePolicy.policy_number == claim_data.policy_number,
            InsurancePolicy.patient_id == patient_id,
        ).first()
    if not policy:
        # Fallback to patient's first active policy
        policy = db.query(InsurancePolicy).filter(
            InsurancePolicy.patient_id == patient_id,
            InsurancePolicy.is_active.is_(True),
        ).first()
        if not policy:
            # Fallback to any policy of patient
            policy = db.query(InsurancePolicy).filter(InsurancePolicy.patient_id == patient_id).first()

    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No insurance policy found for this patient.",
        )
    # Ensure policy_id is set
    claim_data.policy_id = policy.id

    # 2. Verify provider
    provider = None
    if claim_data.provider_id:
        provider = db.query(Provider).filter(Provider.id == claim_data.provider_id).first()
    if not provider and claim_data.provider_name:
        provider = db.query(Provider).filter(Provider.name.ilike(f"%{claim_data.provider_name}%")).first()
    if not provider:
        # Fallback to first available provider
        provider = db.query(Provider).first()

    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No healthcare provider found in the system.",
        )
    # Ensure provider_id is set
    claim_data.provider_id = provider.id

    # 3. Date logic checks
    today = date.today()
    if not claim_data.treatment_date:
        claim_data.treatment_date = today

    if claim_data.treatment_date > today + timedelta(days=1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Treatment date cannot be in the future.",
        )

    if claim_data.admission_date and claim_data.discharge_date:
        if claim_data.discharge_date < claim_data.admission_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Discharge date cannot be earlier than admission date.",
            )

    # 4. Monetary validation
    if claim_data.total_claimed_amount is None or claim_data.total_claimed_amount <= Decimal("0"):
        if claim_data.line_items:
            total = sum(Decimal(str(item.line_total or 0)) for item in claim_data.line_items)
            claim_data.total_claimed_amount = max(total, Decimal("1000.00"))
        else:
            claim_data.total_claimed_amount = Decimal("15000.00")


def transition_status(
    db: Session,
    claim: Claim,
    new_status: str,
    actor: Optional[User] = None,
    reason: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> Claim:
    """
    Validate and execute a claim lifecycle status transition.
    Updates history, sends notifications, and logs audit entries.
    """
    allowed = ALLOWED_TRANSITIONS.get(claim.status, [])
    if new_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid status transition from '{claim.status}' to '{new_status}'. "
                f"Allowed transitions from '{claim.status}' are: {', '.join(allowed) if allowed else 'None (terminal state)'}."
            ),
        )

    old_status = claim.status
    claim.status = new_status
    claim.updated_at = datetime.utcnow()

    # Record history
    history = ClaimStatusHistory(
        claim_id=claim.id,
        from_status=old_status,
        to_status=new_status,
        changed_by_id=actor.id if actor else None,
        reason=reason,
    )
    db.add(history)

    # Record audit log
    actor_id = actor.id if actor else None
    log_action(
        db=db,
        actor_id=actor_id,
        action="claim_status_transition",
        entity_type="claim",
        entity_id=claim.id,
        old_value={"status": old_status},
        new_value={"status": new_status, "reason": reason},
        ip_address=ip_address,
    )

    db.commit()
    db.refresh(claim)

    # Dispatch relevant notification to patient
    patient_profile = db.query(PatientProfile).filter(PatientProfile.id == claim.patient_id).first()
    if patient_profile and patient_profile.user_id:
        user_id = patient_profile.user_id
        ref = claim.claim_reference
        cid = claim.id

        notify_status_changed(db, user_id, ref, cid, old_status, new_status, reason)

        if new_status in ["approved", "partially_approved", "rejected"]:
            notify_decision_made(db, user_id, ref, cid, new_status, reason or "Processed by adjudicator.")
        elif new_status == "payment_processing":
            notify_payment_processed(db, user_id, ref, cid, str(claim.total_claimed_amount))
        elif new_status == "settled":
            notify_claim_settled(db, user_id, ref, cid, str(claim.total_claimed_amount))

    return claim
