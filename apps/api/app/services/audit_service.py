import json
from typing import Optional, Any
from sqlalchemy.orm import Session
from app.models import AuditLog


def log_action(
    db: Session,
    actor_id: Optional[str],
    action: str,
    entity_type: str,
    entity_id: str,
    old_value: Optional[Any] = None,
    new_value: Optional[Any] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    """Create and persist an audit log entry."""
    old_val_str = None
    if old_value is not None:
        if isinstance(old_value, str):
            old_val_str = old_value
        else:
            old_val_str = json.dumps(old_value, default=str)

    new_val_str = None
    if new_value is not None:
        if isinstance(new_value, str):
            new_val_str = new_value
        else:
            new_val_str = json.dumps(new_value, default=str)

    log_entry = AuditLog(
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        old_value=old_val_str,
        new_value=new_val_str,
        ip_address=ip_address,
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry
