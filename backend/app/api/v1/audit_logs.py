import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth_dependencies import get_current_user
from app.core.permissions import require_org_admin
from app.db.dependencies import get_db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.audit_log import AuditLogResponse

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])

def log_audit(
    db: Session,
    organization_id: uuid.UUID,
    user_id: uuid.UUID | None,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    details: str | None = None,
    ip_address: str | None = None,
) -> AuditLog:
    entry = AuditLog(
        organization_id=organization_id,
        user_id=user_id,
        action=action.upper(),
        entity_type=entity_type.lower(),
        entity_id=entity_id,
        details=details,
        ip_address=ip_address,
    )
    db.add(entry)
    db.flush()
    return entry

@router.get("", response_model=list[AuditLogResponse])
def list_audit_logs(
    action: str | None = None,
    entity_type: str | None = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    current_user: User = Depends(require_org_admin),
    db: Session = Depends(get_db),
):
    query = select(AuditLog).where(AuditLog.organization_id == current_user.organization_id)
    if action:
        query = query.where(AuditLog.action == action.upper())
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type.lower())

    query = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
    return db.scalars(query).all()

