import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import (
    User,
    Claim,
    ClaimLineItem,
    ClaimDocument,
    PatientProfile,
    InsurancePolicy,
    Provider,
    InvestigationNote,
    RiskAssessment,
    DuplicateMatch,
)
from app.schemas import (
    ClaimSubmit,
    ClaimDetail,
    ClaimResponse,
    ClaimStatusUpdate,
    RiskAssessmentResponse,
    InvestigationNoteResponse,
    DocumentRequestResponse,
    ClaimStatusHistoryResponse,
    DuplicateMatchResponse,
)
from app.dependencies import get_current_user, require_investigator
from app.services.claim_service import (
    generate_claim_reference,
    validate_claim_submission,
    transition_status,
)
from app.services.risk_engine import risk_engine
from app.services.notification_service import notify_claim_submitted
from app.services.audit_service import log_action

router = APIRouter(prefix="/claims", tags=["Claims"])


def format_claim_detail(claim: Claim, is_investigator: bool, db: Optional[Session] = None) -> ClaimDetail:
    """Format claim details with role-based redactions."""
    # Line items
    line_items = [li for li in claim.line_items]

    # Documents
    docs = [d for d in claim.documents]

    # Status history
    history = [
        ClaimStatusHistoryResponse(
            id=h.id,
            claim_id=h.claim_id,
            from_status=h.from_status,
            to_status=h.to_status,
            changed_by_id=h.changed_by_id,
            changed_by_name=h.changed_by.full_name if h.changed_by else None,
            reason=h.reason,
            timestamp=h.timestamp,
        )
        for h in claim.status_history
    ]

    # Document requests
    doc_reqs = []
    for dr in claim.document_requests:
        types_val = dr.document_types
        if isinstance(types_val, str):
            try:
                types_val = json.loads(types_val)
                if not isinstance(types_val, list):
                    types_val = [str(types_val)]
            except Exception:
                types_val = [types_val]

        doc_reqs.append(
            DocumentRequestResponse(
                id=dr.id,
                claim_id=dr.claim_id,
                requested_by_id=dr.requested_by_id,
                requested_by_name=dr.requested_by.full_name if dr.requested_by else None,
                document_types=types_val,
                message=dr.message,
                due_date=dr.due_date,
                status=dr.status,
                created_at=dr.created_at,
                fulfilled_at=dr.fulfilled_at,
            )
        )

    # Patient info
    patient_user = claim.patient.user if claim.patient else None

    # Status explanation for claimant clarity
    status_explanations = None
    if claim.status == "submitted":
        status_explanations = "Your claim has been securely received and is undergoing automated policy validation."
    elif claim.status in ["validation", "risk_screening"]:
        status_explanations = "Your claim is currently undergoing preliminary compliance and fraud screening checks."
    elif claim.status == "under_review":
        status_explanations = "Your claim is actively being reviewed by a senior clinical claims investigator."
    elif claim.status == "documentation_requested":
        status_explanations = "Additional medical or billing documents are required before processing can resume."
    elif claim.status == "approved":
        amt = claim.approved_amount or claim.total_claimed_amount
        status_explanations = f"Your claim has been approved for ₹{float(amt):,.2f} and dispatched for settlement."
    elif claim.status == "partially_approved":
        amt = claim.approved_amount or (float(claim.total_claimed_amount) * 0.8)
        status_explanations = f"Your claim has been partially approved for ₹{float(amt):,.2f} following itemized medical evaluation."
    elif claim.status == "payment_processing":
        status_explanations = "Payment transfer order generated with banking partner. Funds will credit shortly."
    elif claim.status == "settled":
        amt = claim.settled_amount or claim.approved_amount or claim.total_claimed_amount
        status_explanations = f"Claim settled. Payout of ₹{float(amt):,.2f} completed successfully."
    elif claim.status == "rejected":
        reason_txt = f": {claim.rejection_reason}" if claim.rejection_reason else "."
        status_explanations = f"Investigation closed: Claim not approved for payout{reason_txt}"

    # Investigator-only information
    notes_data = None
    risk_assessment_data = None
    duplicate_matches_data = None

    if is_investigator:
        # Notes
        notes_data = [
            InvestigationNoteResponse(
                id=n.id,
                claim_id=n.claim_id,
                author_id=n.author_id,
                author_name=n.author.full_name if n.author else None,
                content=n.content,
                is_private=n.is_private,
                created_at=n.created_at,
                updated_at=n.updated_at,
            )
            for n in claim.notes
        ]

        # Latest Risk Assessment
        latest_assessment = next((ra for ra in claim.risk_assessments if ra.is_latest), None)
        if latest_assessment:
            risk_assessment_data = RiskAssessmentResponse.model_validate(latest_assessment)

        # Duplicate matches
        if db:
            duplicates = (
                db.query(DuplicateMatch)
                .filter(or_(DuplicateMatch.claim_id_1 == claim.id, DuplicateMatch.claim_id_2 == claim.id))
                .all()
            )
            dup_list = []
            for d in duplicates:
                other_id = d.claim_id_2 if d.claim_id_1 == claim.id else d.claim_id_1
                other_claim = db.query(Claim).filter(Claim.id == other_id).first()
                dup_list.append(
                    DuplicateMatchResponse(
                        id=d.id,
                        claim_id_1=d.claim_id_1,
                        claim_id_2=d.claim_id_2,
                        match_type=d.match_type,
                        similarity_score=d.similarity_score,
                        matching_fields=json.loads(d.matching_fields) if d.matching_fields else {},
                        differing_fields=json.loads(d.differing_fields) if d.differing_fields else {},
                        confirmed_duplicate=d.confirmed_duplicate,
                        confirmed_by_id=d.confirmed_by_id,
                        confirmed_at=d.confirmed_at,
                        notes=d.notes,
                        other_claim_reference=other_claim.claim_reference if other_claim else None,
                    )
                )
            duplicate_matches_data = dup_list

    return ClaimDetail(
        id=claim.id,
        claim_reference=claim.claim_reference,
        patient_id=claim.patient_id,
        patient_name=(
            claim.patient_name
            if getattr(claim, "patient_name", None)
            else (patient_user.full_name if patient_user else None)
        ),
        patient_phone=claim.patient.phone if claim.patient else None,
        patient_email=patient_user.email if patient_user else None,
        policy_id=claim.policy_id,
        policy=claim.policy,
        provider_id=claim.provider_id,
        provider=claim.provider,
        treatment_date=claim.treatment_date,
        admission_date=claim.admission_date,
        discharge_date=claim.discharge_date,
        treatment_description=claim.treatment_description,
        invoice_number=claim.invoice_number,
        total_claimed_amount=claim.total_claimed_amount,
        status=claim.status,
        created_at=claim.created_at,
        updated_at=claim.updated_at,
        assigned_investigator_id=claim.assigned_investigator_id,
        assigned_investigator_name=(
            claim.assigned_investigator.full_name if claim.assigned_investigator else None
        ),
        risk_score=claim.risk_score,
        risk_priority=claim.risk_priority,
        is_synthetic=claim.is_synthetic,
        approved_amount=claim.approved_amount,
        settled_amount=claim.settled_amount,
        rejection_reason=claim.rejection_reason,
        status_explanations=status_explanations,
        line_items=line_items,
        documents=docs,
        status_history=history,
        document_requests=doc_reqs,
        notes=notes_data,
        risk_assessment=risk_assessment_data,
        duplicate_matches=duplicate_matches_data,
    )


@router.post("", response_model=ClaimDetail, status_code=status.HTTP_201_CREATED)
def submit_claim(
    claim_in: ClaimSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submit a new insurance claim.
    Requires patient profile. Enforces policy validation and executes risk screening pipeline.
    """
    patient_profile = (
        db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
    )
    if not patient_profile and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have an associated patient profile.",
        )

    patient_id = patient_profile.id if patient_profile else None
    if not patient_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot identify patient profile for claim submission.",
        )

    # Validate submission data against policy and date logic
    validate_claim_submission(claim_in, db, patient_id)

    # Generate reference
    ref = generate_claim_reference(db)

    # Patient name resolution
    submitted_patient_name = (
        claim_in.patient_name.strip()
        if (claim_in.patient_name and claim_in.patient_name.strip())
        else (current_user.full_name if current_user and current_user.full_name else None)
    )

    # Create Claim
    new_claim = Claim(
        claim_reference=ref,
        patient_id=patient_id,
        patient_name=submitted_patient_name,
        policy_id=claim_in.policy_id,
        provider_id=claim_in.provider_id,
        treatment_date=claim_in.treatment_date,
        admission_date=claim_in.admission_date,
        discharge_date=claim_in.discharge_date,
        treatment_description=claim_in.treatment_description,
        invoice_number=claim_in.invoice_number,
        total_claimed_amount=claim_in.total_claimed_amount,
        status="submitted",
        is_synthetic=False,
    )
    db.add(new_claim)
    db.flush()

    # Create line items
    if claim_in.line_items:
        for idx, item in enumerate(claim_in.line_items, start=1):
            line_item = ClaimLineItem(
                claim_id=new_claim.id,
                service_description=item.service_description,
                billing_code=item.billing_code,
                quantity=item.quantity,
                unit_amount=item.unit_amount,
                line_total=item.line_total,
                sequence_number=item.sequence_number or idx,
            )
            db.add(line_item)
        db.flush()

    # Move through initial pipeline: submitted -> validation -> risk_screening
    transition_status(db, new_claim, "validation", actor=current_user, reason="Automated intake validation")
    transition_status(db, new_claim, "risk_screening", actor=current_user, reason="Initiating risk screening engine")

    # Screen claim using RiskEngine
    assessment = risk_engine.screen_claim(db, new_claim.id)

    # Progress beyond risk_screening
    # Note: risk engine NEVER auto-rejects claims; newly submitted claims queue for investigator review
    transition_status(
        db,
        new_claim,
        "under_review",
        actor=current_user,
        reason=f"Risk screening complete ({assessment.priority.upper()} risk, score: {assessment.score}). Queued for investigator evaluation."
    )

    notify_claim_submitted(db, current_user.id, new_claim.claim_reference, new_claim.id)

    log_action(
        db=db,
        actor_id=current_user.id,
        action="claim_submitted",
        entity_type="claim",
        entity_id=new_claim.id,
        new_value={"claim_reference": new_claim.claim_reference, "amount": str(new_claim.total_claimed_amount)},
    )

    db.refresh(new_claim)
    return format_claim_detail(new_claim, is_investigator=(current_user.role in ["investigator", "admin"]), db=db)


@router.get("/{claim_id}", response_model=ClaimDetail)
def get_claim(
    claim_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get detailed view of a claim.
    Patients can only view their own claims with private notes omitted.
    Investigators and Admins have full access.
    """
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Claim not found.",
        )

    is_investigator = current_user.role in ["investigator", "admin"]

    # Security check: patients can only access their own claim
    if not is_investigator:
        patient_profile = (
            db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
        )
        if not patient_profile or claim.patient_id != patient_profile.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: you do not have permission to view this claim.",
            )

    return format_claim_detail(claim, is_investigator=is_investigator, db=db)


@router.put("/{claim_id}/status", response_model=ClaimResponse)
def update_claim_status(
    claim_id: str,
    status_update: ClaimStatusUpdate,
    request: Request,
    current_user: User = Depends(require_investigator),
    db: Session = Depends(get_db),
):
    """Update claim status according to permitted state machine transitions (Investigator only)."""
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Claim not found.",
        )

    updated_claim = transition_status(
        db=db,
        claim=claim,
        new_status=status_update.status,
        actor=current_user,
        reason=status_update.reason,
        ip_address=request.client.host if request.client else None,
    )
    return updated_claim


@router.post("/{claim_id}/rescreen", response_model=RiskAssessmentResponse)
def rescreen_claim(
    claim_id: str,
    current_user: User = Depends(require_investigator),
    db: Session = Depends(get_db),
):
    """Rerun deterministic risk screening engine on the claim (Investigator only)."""
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Claim not found.",
        )

    assessment = risk_engine.screen_claim(db, claim_id)
    log_action(
        db=db,
        actor_id=current_user.id,
        action="claim_rescreened",
        entity_type="claim",
        entity_id=claim_id,
        new_value={"new_score": str(assessment.score), "priority": assessment.priority},
    )
    return assessment
