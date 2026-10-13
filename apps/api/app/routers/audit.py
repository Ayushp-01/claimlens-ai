import json
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import User, AuditLog
from app.schemas import AuditLogResponse, PaginatedResponse
from app.dependencies import require_investigator

router = APIRouter(prefix="/audit", tags=["Audit Logs"])


@router.get("/logs", response_model=PaginatedResponse[AuditLogResponse])
def get_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    current_user: User = Depends(require_investigator),
    db: Session = Depends(get_db),
):
    """Retrieve paginated audit trail logs (Investigator/Admin only)."""
    query = db.query(AuditLog)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if action:
        query = query.filter(AuditLog.action == action)

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


@router.get("/logs/{entity_type}/{entity_id}", response_model=List[AuditLogResponse])
def get_entity_audit_logs(
    entity_type: str,
    entity_id: str,
    current_user: User = Depends(require_investigator),
    db: Session = Depends(get_db),
):
    """Retrieve complete audit history for a specific entity."""
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.entity_type == entity_type, AuditLog.entity_id == entity_id)
        .order_by(desc(AuditLog.timestamp))
        .all()
    )

    return [
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
