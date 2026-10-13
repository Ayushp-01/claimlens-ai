from typing import Optional
from sqlalchemy.orm import Session
from app.models import Notification


def create_notification(
    db: Session,
    user_id: str,
    notification_type: str,
    title: str,
    message: str,
    claim_id: Optional[str] = None,
) -> Notification:
    """Create a persistent notification record for a user."""
    notif = Notification(
        user_id=user_id,
        claim_id=claim_id,
        notification_type=notification_type,
        title=title,
        message=message,
        is_read=False,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def notify_claim_submitted(db: Session, user_id: str, claim_reference: str, claim_id: str) -> Notification:
    return create_notification(
        db=db,
        user_id=user_id,
        claim_id=claim_id,
        notification_type="claim_submitted",
        title="Claim Submitted Successfully",
        message=f"Claim {claim_reference} has been received and scheduled for validation and risk screening.",
    )


def notify_document_requested(
    db: Session, user_id: str, claim_reference: str, claim_id: str, doc_types: list[str], message: str
) -> Notification:
    docs_formatted = ", ".join([d.replace("_", " ").title() for d in doc_types])
    return create_notification(
        db=db,
        user_id=user_id,
        claim_id=claim_id,
        notification_type="document_requested",
        title="Documents Requested for Claim",
        message=f"Additional documentation requested for {claim_reference}: {docs_formatted}. Note: {message}",
    )


def notify_status_changed(
    db: Session, user_id: str, claim_reference: str, claim_id: str, old_status: str, new_status: str, reason: Optional[str] = None
) -> Notification:
    msg = f"Claim {claim_reference} status changed from {old_status} to {new_status}."
    if reason:
        msg += f" Note: {reason}"
    return create_notification(
        db=db,
        user_id=user_id,
        claim_id=claim_id,
        notification_type="status_changed",
        title="Claim Status Updated",
        message=msg,
    )


def notify_decision_made(
    db: Session, user_id: str, claim_reference: str, claim_id: str, decision: str, reason: str
) -> Notification:
    return create_notification(
        db=db,
        user_id=user_id,
        claim_id=claim_id,
        notification_type="decision_made",
        title=f"Claim Decision: {decision.replace('_', ' ').title()}",
        message=f"A decision has been reached for claim {claim_reference}: {decision}. Reason: {reason}",
    )


def notify_payment_processed(
    db: Session, user_id: str, claim_reference: str, claim_id: str, amount: str
) -> Notification:
    return create_notification(
        db=db,
        user_id=user_id,
        claim_id=claim_id,
        notification_type="payment_processed",
        title="Payment In Process",
        message=f"Payment processing initiated for claim {claim_reference} for amount INR {amount}.",
    )


def notify_claim_settled(
    db: Session, user_id: str, claim_reference: str, claim_id: str, amount: str
) -> Notification:
    return create_notification(
        db=db,
        user_id=user_id,
        claim_id=claim_id,
        notification_type="settled",
        title="Claim Settled",
        message=f"Claim {claim_reference} has been settled successfully for amount INR {amount}.",
    )
