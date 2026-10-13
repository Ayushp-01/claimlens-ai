import os
import shutil
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.config import settings
from app.models import (
    User,
    PatientProfile,
    InsurancePolicy,
    Claim,
    ClaimLineItem,
    ClaimDocument,
    DocumentRequest,
    Notification,
)
from app.schemas import (
    ClaimSubmit,
    ClaimDetail,
    ClaimListItem,
    PaginatedResponse,
    PatientDashboardStats,
    PatientProfileResponse,
    PatientProfileUpdate,
    PolicyCreate,
    PolicyResponse,
    ClaimDocumentResponse,
    NotificationResponse,
    DocumentRequestFulfill,
    DocumentRequestResponse,
)
from app.dependencies import get_current_user, require_patient, get_patient_profile
from app.routers.claims import submit_claim, format_claim_detail
from app.services.claim_service import transition_status
from app.services.audit_service import log_action

router = APIRouter(prefix="/patient", tags=["Patient"])


@router.get("/dashboard", response_model=PatientDashboardStats)
def get_patient_dashboard(
    current_user: User = Depends(require_patient),
    patient_profile: PatientProfile = Depends(get_patient_profile),
    db: Session = Depends(get_db),
):
    """Aggregate statistics for patient home dashboard."""
    claims = db.query(Claim).filter(Claim.patient_id == patient_profile.id).all()

    total_claims = len(claims)
    active_claims = len([c for c in claims if c.status in ["submitted", "validation", "risk_screening", "under_review", "documentation_requested", "payment_processing"]])
    approved_claims = len([c for c in claims if c.status in ["approved", "partially_approved"]])
    rejected_claims = len([c for c in claims if c.status == "rejected"])
    settled_claims = len([c for c in claims if c.status == "settled"])

    total_claimed = sum([Decimal(str(c.total_claimed_amount)) for c in claims], Decimal("0.00"))
    total_settled = sum([Decimal(str(c.total_claimed_amount)) for c in claims if c.status == "settled"], Decimal("0.00"))

    # Recent 5 claims
    recent = (
        db.query(Claim)
        .filter(Claim.patient_id == patient_profile.id)
        .order_by(desc(Claim.created_at))
        .limit(5)
        .all()
    )

    recent_items = [
        ClaimListItem(
            id=c.id,
            claim_reference=c.claim_reference,
            patient_id=c.patient_id,
            patient_name=current_user.full_name,
            policy_id=c.policy_id,
            policy_number=c.policy.policy_number if c.policy else None,
            provider_id=c.provider_id,
            provider_name=c.provider.name if c.provider else None,
            provider_specialty=c.provider.specialty if c.provider else None,
            treatment_date=c.treatment_date,
            admission_date=c.admission_date,
            discharge_date=c.discharge_date,
            treatment_description=c.treatment_description,
            invoice_number=c.invoice_number,
            total_claimed_amount=c.total_claimed_amount,
            status=c.status,
            risk_score=c.risk_score,
            risk_priority=c.risk_priority,
            created_at=c.created_at,
            assigned_investigator_name=c.assigned_investigator.full_name if c.assigned_investigator else None,
            document_count=len(c.documents),
            line_item_count=len(c.line_items),
        )
        for c in recent
    ]

    return PatientDashboardStats(
        total_claims=total_claims,
        active_claims=active_claims,
        approved_claims=approved_claims,
        rejected_claims=rejected_claims,
        settled_claims=settled_claims,
        total_claimed_amount=total_claimed,
        total_settled_amount=total_settled,
        recent_claims=recent_items,
    )


@router.get("/claims", response_model=PaginatedResponse[ClaimListItem])
def get_patient_claims(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    claim_status: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(require_patient),
    patient_profile: PatientProfile = Depends(get_patient_profile),
    db: Session = Depends(get_db),
):
    """Retrieve paginated list of claims belonging exclusively to the current patient."""
    query = db.query(Claim).filter(Claim.patient_id == patient_profile.id)

    if claim_status:
        query = query.filter(Claim.status == claim_status)

    total = query.count()
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    claims = (
        query.order_by(desc(Claim.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        ClaimListItem(
            id=c.id,
            claim_reference=c.claim_reference,
            patient_id=c.patient_id,
            patient_name=current_user.full_name,
            policy_id=c.policy_id,
            policy_number=c.policy.policy_number if c.policy else None,
            provider_id=c.provider_id,
            provider_name=c.provider.name if c.provider else None,
            provider_specialty=c.provider.specialty if c.provider else None,
            treatment_date=c.treatment_date,
            admission_date=c.admission_date,
            discharge_date=c.discharge_date,
            treatment_description=c.treatment_description,
            invoice_number=c.invoice_number,
            total_claimed_amount=c.total_claimed_amount,
            status=c.status,
            risk_score=c.risk_score,
            risk_priority=c.risk_priority,
            created_at=c.created_at,
            assigned_investigator_name=c.assigned_investigator.full_name if c.assigned_investigator else None,
            document_count=len(c.documents),
            line_item_count=len(c.line_items),
        )
        for c in claims
    ]

    return PaginatedResponse[ClaimListItem](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/claims/{claim_id}", response_model=ClaimDetail)
def get_patient_claim_detail(
    claim_id: str,
    current_user: User = Depends(require_patient),
    patient_profile: PatientProfile = Depends(get_patient_profile),
    db: Session = Depends(get_db),
):
    """Patient-facing claim detail (timeline included, internal risk notes suppressed)."""
    claim = db.query(Claim).filter(Claim.id == claim_id, Claim.patient_id == patient_profile.id).first()
    if not claim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Claim not found or you do not have permission to view it.",
        )
    return format_claim_detail(claim, is_investigator=False)


@router.post("/claims", response_model=ClaimDetail, status_code=status.HTTP_201_CREATED)
def submit_patient_claim(
    claim_in: ClaimSubmit,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    """Submit new insurance claim for current patient."""
    return submit_claim(claim_in=claim_in, current_user=current_user, db=db)


@router.get("/notifications", response_model=PaginatedResponse[NotificationResponse])
def get_patient_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    unread_only: bool = Query(False),
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    """Paginated notifications for the patient."""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        query = query.filter(Notification.is_read.is_(False))

    total = query.count()
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    notifs = (
        query.order_by(desc(Notification.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return PaginatedResponse[NotificationResponse](
        items=[NotificationResponse.model_validate(n) for n in notifs],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.put("/notifications/{notification_id}/read", response_model=NotificationResponse)
def mark_patient_notification_read(
    notification_id: str,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    """Mark notification as read."""
    notif = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


@router.get("/documents", response_model=List[ClaimDocumentResponse])
def get_patient_documents(
    current_user: User = Depends(require_patient),
    patient_profile: PatientProfile = Depends(get_patient_profile),
    db: Session = Depends(get_db),
):
    """List all documents uploaded across all claims belonging to the patient."""
    docs = (
        db.query(ClaimDocument)
        .join(Claim, ClaimDocument.claim_id == Claim.id)
        .filter(Claim.patient_id == patient_profile.id)
        .order_by(desc(ClaimDocument.uploaded_at))
        .all()
    )
    return [ClaimDocumentResponse.model_validate(d) for d in docs]


@router.post("/documents/{claim_id}/upload", response_model=ClaimDocumentResponse)
def upload_patient_document(
    claim_id: str,
    file: UploadFile = File(...),
    document_type: str = Form(...),
    current_user: User = Depends(require_patient),
    patient_profile: PatientProfile = Depends(get_patient_profile),
    db: Session = Depends(get_db),
):
    """Upload a supporting document for an existing claim."""
    claim = db.query(Claim).filter(Claim.id == claim_id, Claim.patient_id == patient_profile.id).first()
    if not claim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Claim not found or you do not have permission to upload documents to it.",
        )

    # Save file
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    claim_upload_dir = os.path.join(settings.UPLOAD_DIR, claim_id)
    os.makedirs(claim_upload_dir, exist_ok=True)

    filename = f"{int(datetime.utcnow().timestamp())}_{file.filename}"
    file_path = os.path.join(claim_upload_dir, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(file_path)

    doc = ClaimDocument(
        claim_id=claim.id,
        document_type=document_type,
        filename=file.filename or "uploaded_file",
        file_path=file_path,
        file_size=file_size,
        mime_type=file.content_type or "application/octet-stream",
        uploaded_by_id=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    log_action(
        db=db,
        actor_id=current_user.id,
        action="patient_uploaded_document",
        entity_type="claim_document",
        entity_id=doc.id,
        new_value={"claim_id": claim.id, "document_type": document_type, "filename": doc.filename},
    )

    return doc


@router.post("/document-requests/{request_id}/fulfill", response_model=DocumentRequestResponse)
def fulfill_document_request(
    request_id: str,
    payload: DocumentRequestFulfill,
    current_user: User = Depends(require_patient),
    patient_profile: PatientProfile = Depends(get_patient_profile),
    db: Session = Depends(get_db),
):
    """Fulfill a document request from an investigator."""
    doc_request = (
        db.query(DocumentRequest)
        .join(Claim, DocumentRequest.claim_id == Claim.id)
        .filter(DocumentRequest.id == request_id, Claim.patient_id == patient_profile.id)
        .first()
    )
    if not doc_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document request not found.")

    doc_request.status = "fulfilled"
    doc_request.fulfilled_at = datetime.utcnow()

    # Move claim back to under_review from documentation_requested if appropriate
    claim = doc_request.claim
    if claim.status == "documentation_requested":
        transition_status(
            db=db,
            claim=claim,
            new_status="under_review",
            actor=current_user,
            reason="Patient submitted requested documentation.",
        )

    db.commit()
    db.refresh(doc_request)

    log_action(
        db=db,
        actor_id=current_user.id,
        action="patient_fulfilled_document_request",
        entity_type="document_request",
        entity_id=doc_request.id,
        new_value={"status": "fulfilled"},
    )

    return DocumentRequestResponse(
        id=doc_request.id,
        claim_id=doc_request.claim_id,
        requested_by_id=doc_request.requested_by_id,
        requested_by_name=doc_request.requested_by.full_name if doc_request.requested_by else None,
        document_types=eval(doc_request.document_types) if doc_request.document_types.startswith("[") else [doc_request.document_types],
        message=doc_request.message,
        due_date=doc_request.due_date,
        status=doc_request.status,
        created_at=doc_request.created_at,
        fulfilled_at=doc_request.fulfilled_at,
    )


@router.get("/profile", response_model=PatientProfileResponse)
def get_patient_profile_endpoint(
    current_user: User = Depends(require_patient),
    patient_profile: PatientProfile = Depends(get_patient_profile),
):
    """Get the profile of the current patient."""
    resp = PatientProfileResponse.model_validate(patient_profile)
    resp.name = current_user.full_name
    resp.full_name = current_user.full_name
    resp.email = current_user.email
    return resp


@router.put("/profile", response_model=PatientProfileResponse)
def update_patient_profile_endpoint(
    profile_in: PatientProfileUpdate,
    current_user: User = Depends(require_patient),
    patient_profile: PatientProfile = Depends(get_patient_profile),
    db: Session = Depends(get_db),
):
    """Update profile fields for the current patient and user account."""
    if profile_in.name or profile_in.full_name:
        current_user.full_name = (profile_in.name or profile_in.full_name).strip()
    if profile_in.email:
        current_user.email = profile_in.email.strip()
    if profile_in.date_of_birth is not None:
        patient_profile.date_of_birth = profile_in.date_of_birth
    if profile_in.phone is not None:
        patient_profile.phone = profile_in.phone.strip()
    if profile_in.address is not None:
        patient_profile.address = profile_in.address.strip()
    if profile_in.policy_number is not None:
        patient_profile.policy_number = profile_in.policy_number.strip()
    if profile_in.member_reference is not None:
        patient_profile.member_reference = profile_in.member_reference.strip()

    db.add(current_user)
    db.add(patient_profile)
    db.commit()
    db.refresh(patient_profile)
    db.refresh(current_user)

    resp = PatientProfileResponse.model_validate(patient_profile)
    resp.name = current_user.full_name
    resp.full_name = current_user.full_name
    resp.email = current_user.email
    return resp


@router.get("/policies", response_model=List[PolicyResponse])
def get_patient_policies(
    current_user: User = Depends(require_patient),
    patient_profile: PatientProfile = Depends(get_patient_profile),
    db: Session = Depends(get_db),
):
    """List insurance policies belonging to the patient."""
    policies = (
        db.query(InsurancePolicy)
        .filter(InsurancePolicy.patient_id == patient_profile.id)
        .all()
    )
    return [PolicyResponse.model_validate(p) for p in policies]


@router.post("/policies", response_model=PolicyResponse, status_code=status.HTTP_201_CREATED)
def create_patient_policy(
    policy_in: PolicyCreate,
    current_user: User = Depends(require_patient),
    patient_profile: PatientProfile = Depends(get_patient_profile),
    db: Session = Depends(get_db),
):
    """Add a new insurance policy under current patient."""
    new_policy = InsurancePolicy(
        patient_id=patient_profile.id,
        policy_number=policy_in.policy_number,
        member_reference=policy_in.member_reference,
        policy_type=policy_in.policy_type,
        insurer_name=policy_in.insurer_name,
        coverage_start=policy_in.coverage_start,
        coverage_end=policy_in.coverage_end,
        max_coverage_amount=policy_in.max_coverage_amount,
        is_active=policy_in.is_active,
        copay_percentage=policy_in.copay_percentage or Decimal("10.00"),
        deductible_amount=policy_in.deductible_amount or Decimal("0.00"),
        tpa_name=policy_in.tpa_name or "Medi Assist Insurance TPA",
    )
    db.add(new_policy)
    db.commit()
    db.refresh(new_policy)

    log_action(
        db=db,
        actor_id=current_user.id,
        action="policy_created",
        entity_type="insurance_policy",
        entity_id=new_policy.id,
        new_value={"policy_number": new_policy.policy_number},
    )

    return new_policy
