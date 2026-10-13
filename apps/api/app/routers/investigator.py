import json
from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_

from app.database import get_db
from app.models import (
    User,
    Claim,
    PatientProfile,
    Provider,
    InvestigationNote,
    DocumentRequest,
    RiskAssessment,
    RiskFinding,
    DuplicateMatch,
    AuditLog,
)
from app.schemas import (
    ClaimListItem,
    ClaimDetail,
    ClaimAssignRequest,
    ClaimDecisionRequest,
    FalsePositiveRequest,
    InvestigationNoteCreate,
    InvestigationNoteResponse,
    DocumentRequestCreate,
    DocumentRequestResponse,
    RiskAssessmentResponse,
    RiskFindingResponse,
    DuplicateMatchResponse,
    AuditLogResponse,
    InvestigatorDashboardKPIs,
    PaginatedResponse,
)
from app.dependencies import require_investigator
from app.routers.claims import format_claim_detail
from app.services.claim_service import transition_status
from app.services.risk_engine import risk_engine
from app.services.notification_service import notify_document_requested
from app.services.audit_service import log_action

router = APIRouter(prefix="/investigator", tags=["Investigator"])


@router.get("/dashboard", response_model=InvestigatorDashboardKPIs)
def get_investigator_dashboard(
    current_user: User = Depends(require_investigator),
    db: Session = Depends(get_db),
):
    """Aggregate KPIs and summary statistics for the investigator dashboard."""
    all_claims = db.query(Claim).all()
    total_claims = len(all_claims)

    pending_review = len([c for c in all_claims if c.status in ["under_review", "risk_screening", "validation"]])
    high_critical_risk = len([c for c in all_claims if c.risk_priority in ["high", "critical"]])
    detected_duplicates = db.query(DuplicateMatch).count()

    total_exposure = sum([Decimal(str(c.total_claimed_amount)) for c in all_claims], Decimal("0.00"))
    flagged_amount = sum(
        [Decimal(str(c.total_claimed_amount)) for c in all_claims if c.risk_priority in ["high", "critical"]],
        Decimal("0.00"),
    )
    approved_amount = sum(
        [
            Decimal(str(c.approved_amount if c.approved_amount is not None else c.total_claimed_amount))
            for c in all_claims
            if c.status in ["approved", "settled", "payment_processing", "partially_approved"]
        ],
        Decimal("0.00"),
    )
    settled_amount = sum(
        [
            Decimal(str(c.settled_amount if c.settled_amount is not None else (c.approved_amount or c.total_claimed_amount)))
            for c in all_claims
            if c.status == "settled"
        ],
        Decimal("0.00"),
    )
    rejected_amount = sum(
        [Decimal(str(c.total_claimed_amount)) for c in all_claims if c.status == "rejected"],
        Decimal("0.00"),
    )

    # Average review time calculation
    review_hours = []
    for c in all_claims:
        if c.status in ["approved", "rejected", "partially_approved", "settled"]:
            diff_hours = (c.updated_at - c.created_at).total_seconds() / 3600.0
            review_hours.append(diff_hours)

    avg_review_hours = sum(review_hours) / len(review_hours) if review_hours else 14.5
    auto_flagged_rate = (high_critical_risk / total_claims * 100.0) if total_claims > 0 else 0.0

    return InvestigatorDashboardKPIs(
        total_claims=total_claims,
        pending_review=pending_review,
        high_critical_risk=high_critical_risk,
        detected_duplicates=detected_duplicates,
        total_exposure_amount=total_exposure,
        flagged_amount=flagged_amount,
        approved_amount=approved_amount,
        settled_amount=settled_amount,
        rejected_amount=rejected_amount,
        avg_review_time_hours=round(avg_review_hours, 1),
        auto_flagged_rate=round(auto_flagged_rate, 1),
    )


@router.get("/claims", response_model=PaginatedResponse[ClaimListItem])
def list_investigator_claims(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    claim_status: Optional[str] = Query(None, alias="status"),
    risk_priority: Optional[str] = None,
    min_score: Optional[float] = None,
    max_score: Optional[float] = None,
    queue_type: Optional[str] = Query(None),  # 'flagged' | 'all'
    provider_id: Optional[str] = None,
    assigned_to: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = Query("risk_score_desc"),
    current_user: User = Depends(require_investigator),
    db: Session = Depends(get_db),
):
    """Investigation queue with multi-faceted filtering, sorting, and pagination."""
    query = (
        db.query(Claim)
        .outerjoin(PatientProfile, Claim.patient_id == PatientProfile.id)
        .outerjoin(User, PatientProfile.user_id == User.id)
        .outerjoin(Provider, Claim.provider_id == Provider.id)
    )

    if queue_type == "flagged":
        query = query.filter(
            or_(
                Claim.risk_priority.in_(["high", "critical"]),
                Claim.risk_score >= Decimal("50.0"),
                Claim.status.in_(["under_review", "documentation_requested"]),
            )
        )

    if claim_status and claim_status != "all":
        query = query.filter(Claim.status == claim_status)
    if risk_priority and risk_priority != "all":
        query = query.filter(Claim.risk_priority == risk_priority)
    if min_score is not None:
        query = query.filter(Claim.risk_score >= Decimal(str(min_score)))
    if max_score is not None:
        query = query.filter(Claim.risk_score <= Decimal(str(max_score)))
    if provider_id:
        query = query.filter(Claim.provider_id == provider_id)
    if assigned_to:
        query = query.filter(Claim.assigned_investigator_id == assigned_to)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Claim.claim_reference.ilike(search_pattern),
                Claim.invoice_number.ilike(search_pattern),
                Claim.patient_name.ilike(search_pattern),
                User.full_name.ilike(search_pattern),
                Provider.name.ilike(search_pattern),
            )
        )

    # Sorting
    if sort_by in ["date_desc", "created_at_desc", "newest", "date"]:
        query = query.order_by(desc(Claim.created_at))
    elif sort_by in ["date_asc", "created_at_asc", "oldest"]:
        query = query.order_by(asc(Claim.created_at))
    elif sort_by == "risk_score_desc":
        query = query.order_by(desc(Claim.risk_score), desc(Claim.created_at))
    elif sort_by == "risk_score_asc":
        query = query.order_by(asc(Claim.risk_score), desc(Claim.created_at))
    elif sort_by == "amount_desc":
        query = query.order_by(desc(Claim.total_claimed_amount))
    elif sort_by == "amount_asc":
        query = query.order_by(asc(Claim.total_claimed_amount))
    else:
        query = query.order_by(desc(Claim.created_at))

    total = query.count()
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    claims = query.offset((page - 1) * page_size).limit(page_size).all()

    items = [
        ClaimListItem(
            id=c.id,
            claim_reference=c.claim_reference,
            patient_id=c.patient_id,
            patient_name=(
                c.patient_name
                if getattr(c, "patient_name", None)
                else (
                    c.patient.user.full_name
                    if c.patient and c.patient.user and c.patient.user.full_name
                    else (
                        c.patient.user.email
                        if c.patient and c.patient.user and c.patient.user.email
                        else (f"Member {c.patient.member_reference}" if c.patient and c.patient.member_reference else "Patient")
                    )
                )
            ),
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
def get_investigator_claim_detail(
    claim_id: str,
    current_user: User = Depends(require_investigator),
    db: Session = Depends(get_db),
):
    """Retrieve complete claim dossier with risk assessments, duplicate links, and notes."""
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found.")

    detail = format_claim_detail(claim, is_investigator=True)

    # Attach duplicate matches
    duplicates = (
        db.query(DuplicateMatch)
        .filter(or_(DuplicateMatch.claim_id_1 == claim.id, DuplicateMatch.claim_id_2 == claim.id))
        .all()
    )
    dup_responses = []
    for d in duplicates:
        other_id = d.claim_id_2 if d.claim_id_1 == claim.id else d.claim_id_1
        other_claim = db.query(Claim).filter(Claim.id == other_id).first()
        dup_responses.append(
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
    detail.duplicate_matches = dup_responses

    return detail


@router.post("/claims/{claim_id}/assign", response_model=ClaimDetail)
def assign_claim(
    claim_id: str,
    assign_in: ClaimAssignRequest,
    current_user: User = Depends(require_investigator),
    db: Session = Depends(get_db),
):
    """Assign or reassign claim to an investigator."""
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found.")

    investigator_id = assign_in.investigator_id or current_user.id
    target_user = db.query(User).filter(User.id == investigator_id).first()
    if not target_user or target_user.role not in ["investigator", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Designated assignee must be an investigator or administrator.",
        )

    old_assignee = claim.assigned_investigator_id
    claim.assigned_investigator_id = investigator_id
    db.commit()
    db.refresh(claim)

    log_action(
        db=db,
        actor_id=current_user.id,
        action="claim_assigned",
        entity_type="claim",
        entity_id=claim.id,
        old_value={"assigned_to": old_assignee},
        new_value={"assigned_to": investigator_id, "investigator_name": target_user.full_name},
    )

    return format_claim_detail(claim, is_investigator=True)


@router.post("/claims/{claim_id}/notes", response_model=InvestigationNoteResponse, status_code=status.HTTP_201_CREATED)
def add_investigation_note(
    claim_id: str,
    note_in: InvestigationNoteCreate,
    current_user: User = Depends(require_investigator),
    db: Session = Depends(get_db),
):
    """Add private internal investigator note to a claim."""
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found.")

    note = InvestigationNote(
        claim_id=claim.id,
        author_id=current_user.id,
        content=note_in.content,
        is_private=note_in.is_private,
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    log_action(
        db=db,
        actor_id=current_user.id,
        action="note_added",
        entity_type="investigation_note",
        entity_id=note.id,
        new_value={"claim_id": claim.id, "content_snippet": note.content[:100]},
    )

    return InvestigationNoteResponse(
        id=note.id,
        claim_id=note.claim_id,
        author_id=note.author_id,
        author_name=current_user.full_name,
        content=note.content,
        is_private=note.is_private,
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


@router.get("/claims/{claim_id}/notes", response_model=List[InvestigationNoteResponse])
def get_investigation_notes(
    claim_id: str,
    current_user: User = Depends(require_investigator),
    db: Session = Depends(get_db),
):
    """Retrieve all internal notes for a claim."""
    notes = (
        db.query(InvestigationNote)
        .filter(InvestigationNote.claim_id == claim_id)
        .order_by(desc(InvestigationNote.created_at))
        .all()
    )
    return [
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
        for n in notes
    ]


@router.post("/claims/{claim_id}/document-request", response_model=DocumentRequestResponse)
@router.post("/claims/{claim_id}/request-documents", response_model=DocumentRequestResponse)
def request_claim_documents(
    claim_id: str,
    req_in: DocumentRequestCreate,
    current_user: User = Depends(require_investigator),
    db: Session = Depends(get_db),
):
    """Issue official request for documents from the claimant."""
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found.")

    doc_request = DocumentRequest(
        claim_id=claim.id,
        requested_by_id=current_user.id,
        document_types=json.dumps(req_in.document_types),
        message=req_in.message,
        due_date=req_in.due_date,
        status="pending",
    )
    db.add(doc_request)

    # Transition claim to documentation_requested
    if claim.status in ["under_review"]:
        transition_status(
            db=db,
            claim=claim,
            new_status="documentation_requested",
            actor=current_user,
            reason=f"Requested documents: {', '.join(req_in.document_types)}",
        )

    db.commit()
    db.refresh(doc_request)

    # Send notification to patient
    if claim.patient and claim.patient.user_id:
        notify_document_requested(
            db=db,
            user_id=claim.patient.user_id,
            claim_reference=claim.claim_reference,
            claim_id=claim.id,
            doc_types=req_in.document_types,
            message=req_in.message,
        )

    log_action(
        db=db,
        actor_id=current_user.id,
        action="document_requested",
        entity_type="document_request",
        entity_id=doc_request.id,
        new_value={"document_types": req_in.document_types, "message": req_in.message},
    )

    return DocumentRequestResponse(
        id=doc_request.id,
        claim_id=doc_request.claim_id,
        requested_by_id=doc_request.requested_by_id,
        requested_by_name=current_user.full_name,
        document_types=req_in.document_types,
        message=doc_request.message,
        due_date=doc_request.due_date,
        status=doc_request.status,
        created_at=doc_request.created_at,
        fulfilled_at=doc_request.fulfilled_at,
    )


@router.post("/claims/{claim_id}/decision", response_model=ClaimDetail)
def make_claim_decision(
    claim_id: str,
    decision_in: ClaimDecisionRequest,
    current_user: User = Depends(require_investigator),
    db: Session = Depends(get_db),
):
    """
    Render formal decision on a claim (approved, rejected, partially_approved, payment_processing, settled).
    Records decision rationale and optional private notes.
    """
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found.")

    dec = decision_in.decision.strip().lower()
    mapping = {
        "approve": "approved",
        "approved": "approved",
        "reject": "rejected",
        "rejected": "rejected",
        "partial": "partially_approved",
        "partially_approve": "partially_approved",
        "partially_approved": "partially_approved",
        "request_verification": "documentation_requested",
        "documentation_requested": "documentation_requested",
        "escalate": "under_review",
        "payment_processing": "payment_processing",
        "settle": "settled",
        "settled": "settled",
    }

    target_status = mapping.get(dec)
    if not target_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported decision '{decision_in.decision}'. Choose from: approved, rejected, partially_approved, documentation_requested, payment_processing, settled.",
        )

    # Set financial fields and reasons
    if target_status == "approved":
        claim.approved_amount = Decimal(str(decision_in.approved_amount or claim.total_claimed_amount))
        claim.rejection_reason = None
    elif target_status == "partially_approved":
        claim.approved_amount = Decimal(str(decision_in.approved_amount or round(float(claim.total_claimed_amount) * 0.8, 2)))
        claim.rejection_reason = None
    elif target_status == "rejected":
        claim.approved_amount = Decimal("0.00")
        claim.rejection_reason = decision_in.reason or decision_in.notes or "Claim rejected following investigator review"
    elif target_status == "settled":
        claim.settled_amount = claim.approved_amount or claim.total_claimed_amount
        claim.approved_amount = claim.settled_amount
        claim.rejection_reason = None

    # Record internal note if provided
    if decision_in.notes:
        note = InvestigationNote(
            claim_id=claim.id,
            author_id=current_user.id,
            content=f"Decision Note: {decision_in.notes}",
            is_private=True,
        )
        db.add(note)

    # Perform transition
    transition_status(
        db=db,
        claim=claim,
        new_status=target_status,
        actor=current_user,
        reason=decision_in.reason or (f"Claim rejected: {claim.rejection_reason}" if target_status == "rejected" else f"Decision: {target_status}"),
    )
    db.commit()
    db.refresh(claim)

    return format_claim_detail(claim, is_investigator=True)


@router.post("/claims/{claim_id}/rescreen", response_model=RiskAssessmentResponse)
def rescreen_investigator_claim(
    claim_id: str,
    current_user: User = Depends(require_investigator),
    db: Session = Depends(get_db),
):
    """Re-run deterministic risk engine scoring."""
    assessment = risk_engine.screen_claim(db, claim_id)
    return assessment


@router.get("/duplicates", response_model=List[DuplicateMatchResponse])
def list_duplicates(
    current_user: User = Depends(require_investigator),
    db: Session = Depends(get_db),
):
    """Retrieve all detected duplicate matches across the system."""
    matches = db.query(DuplicateMatch).order_by(desc(DuplicateMatch.similarity_score)).all()
    res = []
    for m in matches:
        other_claim = db.query(Claim).filter(Claim.id == m.claim_id_2).first()
        res.append(
            DuplicateMatchResponse(
                id=m.id,
                claim_id_1=m.claim_id_1,
                claim_id_2=m.claim_id_2,
                match_type=m.match_type,
                similarity_score=m.similarity_score,
                matching_fields=json.loads(m.matching_fields) if m.matching_fields else {},
                differing_fields=json.loads(m.differing_fields) if m.differing_fields else {},
                confirmed_duplicate=m.confirmed_duplicate,
                confirmed_by_id=m.confirmed_by_id,
                confirmed_at=m.confirmed_at,
                notes=m.notes,
                other_claim_reference=other_claim.claim_reference if other_claim else None,
            )
        )
    return res


class DuplicateResolveRequest(BaseModel):
    status: Optional[str] = None
    action: Optional[str] = None
    notes: Optional[str] = None


@router.get("/duplicates/{claim_id}", response_model=List[DuplicateMatchResponse])
@router.get("/claims/{claim_id}/duplicates", response_model=List[DuplicateMatchResponse])
def get_claim_duplicates(
    claim_id: str,
    current_user: User = Depends(require_investigator),
    db: Session = Depends(get_db),
):
    """Retrieve duplicate matches related to a specific claim."""
    matches = (
        db.query(DuplicateMatch)
        .filter(or_(DuplicateMatch.claim_id_1 == claim_id, DuplicateMatch.claim_id_2 == claim_id))
        .all()
    )
    res = []
    for m in matches:
        other_id = m.claim_id_2 if m.claim_id_1 == claim_id else m.claim_id_1
        other_claim = db.query(Claim).filter(Claim.id == other_id).first()
        res.append(
            DuplicateMatchResponse(
                id=m.id,
                claim_id_1=m.claim_id_1,
                claim_id_2=m.claim_id_2,
                match_type=m.match_type,
                similarity_score=m.similarity_score,
                matching_fields=json.loads(m.matching_fields) if m.matching_fields else {},
                differing_fields=json.loads(m.differing_fields) if m.differing_fields else {},
                confirmed_duplicate=m.confirmed_duplicate,
                confirmed_by_id=m.confirmed_by_id,
                confirmed_at=m.confirmed_at,
                notes=m.notes,
                other_claim_reference=other_claim.claim_reference if other_claim else None,
            )
        )
    return res


@router.post("/duplicates/{duplicate_id}/resolve")
@router.post("/duplicates/{duplicate_id}/confirm")
@router.post("/duplicates/{duplicate_id}/clear")
def resolve_duplicate_match(
    duplicate_id: str,
    req: Optional[DuplicateResolveRequest] = None,
    current_user: User = Depends(require_investigator),
    db: Session = Depends(get_db),
):
    """Confirm a duplicate match or clear it as false positive."""
    dup = db.query(DuplicateMatch).filter(DuplicateMatch.id == duplicate_id).first()
    if not dup:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Duplicate match not found.")

    status_val = "confirmed_duplicate"
    if req:
        val = (req.action or req.status or "").lower()
        if "clear" in val or "false" in val:
            status_val = "cleared_false_positive"
        elif "confirm" in val:
            status_val = "confirmed_duplicate"
        if req.notes:
            dup.notes = req.notes

    dup.confirmed_duplicate = (status_val == "confirmed_duplicate")
    dup.confirmed_by_id = current_user.id
    dup.confirmed_at = datetime.utcnow()
    db.commit()
    db.refresh(dup)

    log_action(
        db=db,
        actor_id=current_user.id,
        action="duplicate_resolved",
        entity_type="duplicate_match",
        entity_id=dup.id,
        new_value={"status": status_val, "notes": dup.notes},
    )
    return {"status": status_val, "id": dup.id, "confirmed_duplicate": dup.confirmed_duplicate}


@router.post("/findings/{finding_id}/false-positive", response_model=RiskFindingResponse)
def mark_finding_false_positive(
    finding_id: str,
    req: FalsePositiveRequest,
    current_user: User = Depends(require_investigator),
    db: Session = Depends(get_db),
):
    """Mark a risk finding as a false positive with explanation and adjust claim score."""
    finding = db.query(RiskFinding).filter(RiskFinding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risk finding not found.")

    finding.is_false_positive = True
    finding.false_positive_reason = req.reason
    finding.false_positive_by_id = current_user.id
    finding.false_positive_at = datetime.utcnow()

    # Recalculate assessment score excluding false positives
    assessment = db.query(RiskAssessment).filter(RiskAssessment.id == finding.assessment_id).first()
    claim = db.query(Claim).filter(Claim.id == finding.claim_id).first()

    if assessment and claim:
        active_findings = [f for f in assessment.findings if not f.is_false_positive]
        new_score = sum([float(f.score_contribution) for f in active_findings], 0.0)
        new_score = min(100.0, max(0.0, round(new_score, 2)))

        if new_score < 25.0:
            new_priority = "low"
        elif new_score < 50.0:
            new_priority = "medium"
        elif new_score < 75.0:
            new_priority = "high"
        else:
            new_priority = "critical"

        assessment.score = Decimal(str(new_score))
        assessment.priority = new_priority
        claim.risk_score = Decimal(str(new_score))
        claim.risk_priority = new_priority

    db.commit()
    db.refresh(finding)

    log_action(
        db=db,
        actor_id=current_user.id,
        action="finding_marked_false_positive",
        entity_type="risk_finding",
        entity_id=finding.id,
        new_value={"reason": req.reason, "rule_id": finding.rule_id},
    )

    evidence_val = json.loads(finding.evidence) if finding.evidence else None
    return RiskFindingResponse(
        id=finding.id,
        assessment_id=finding.assessment_id,
        claim_id=finding.claim_id,
        rule_id=finding.rule_id,
        rule_name=finding.rule_name,
        severity=finding.severity,
        score_contribution=finding.score_contribution,
        evidence=evidence_val,
        explanation=finding.explanation,
        recommended_action=finding.recommended_action,
        is_false_positive=finding.is_false_positive,
        false_positive_reason=finding.false_positive_reason,
        false_positive_by_id=finding.false_positive_by_id,
        false_positive_at=finding.false_positive_at,
    )


@router.get("/audit-logs", response_model=PaginatedResponse[AuditLogResponse])
def get_investigator_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    current_user: User = Depends(require_investigator),
    db: Session = Depends(get_db),
):
    """Paginated system audit logs."""
    query = db.query(AuditLog)
    total = query.count()
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    logs = query.order_by(desc(AuditLog.timestamp)).offset((page - 1) * page_size).limit(page_size).all()

    items = [
        AuditLogResponse(
            id=log.id,
            actor_id=log.actor_id,
            actor_name=log.actor.full_name if log.actor else "System",
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            old_value=json.loads(log.old_value) if log.old_value else None,
            new_value=json.loads(log.new_value) if log.new_value else None,
            ip_address=log.ip_address,
            timestamp=log.timestamp,
        )
        for log in logs
    ]

    return PaginatedResponse[AuditLogResponse](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/cases", response_model=PaginatedResponse[ClaimListItem])
def get_my_assigned_cases(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_investigator),
    db: Session = Depends(get_db),
):
    """Retrieve queue of active claims assigned to the current investigator."""
    query = (
        db.query(Claim)
        .filter(Claim.assigned_investigator_id == current_user.id)
        .order_by(desc(Claim.risk_score), desc(Claim.created_at))
    )

    total = query.count()
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    claims = query.offset((page - 1) * page_size).limit(page_size).all()

    items = [
        ClaimListItem(
            id=c.id,
            claim_reference=c.claim_reference,
            patient_id=c.patient_id,
            patient_name=getattr(c, "patient_name", None) or (c.patient.user.full_name if c.patient and c.patient.user else None),
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
            assigned_investigator_name=current_user.full_name,
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
