import json
import uuid
from typing import Any
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog

def log_audit(
    db: Session,
    organization_id: uuid.UUID,
    user_id: uuid.UUID | None,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    details: Any = None,
    ip_address: str | None = None,
) -> AuditLog:
    """Helper to record audit trail entries with tenant isolation."""
    details_str = None
    if details is not None:
        if isinstance(details, (dict, list)):
            details_str = json.dumps(details, default=str)
        else:
            details_str = str(details)

    log_entry = AuditLog(
        organization_id=organization_id,
        user_id=user_id,
        action=action.upper(),
        entity_type=entity_type.lower(),
        entity_id=str(entity_id) if entity_id else None,
        details=details_str,
        ip_address=ip_address,
    )
    db.add(log_entry)
    db.flush()
    return log_entry
