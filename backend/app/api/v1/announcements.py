import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth_dependencies import get_current_user
from app.core.permissions import require_hr
from app.db.dependencies import get_db
from app.models.announcement import Announcement
from app.models.user import User
from app.schemas.announcement import AnnouncementCreate, AnnouncementResponse
from app.services.audit import log_audit
from app.services.notifications import notify_all_org_employees

router = APIRouter(prefix="/announcements", tags=["Announcements"])

@router.get("", response_model=list[AnnouncementResponse])
def list_announcements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(Announcement)
        .where(
            Announcement.organization_id == current_user.organization_id,
            Announcement.is_active == True,
        )
        .order_by(Announcement.created_at.desc())
    ).all()

@router.post("", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
def create_announcement(
    data: AnnouncementCreate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    a = Announcement(
        organization_id=current_user.organization_id,
        published_by_id=current_user.id,
        title=data.title.strip(),
        content=data.content.strip(),
        priority=data.priority,
        expires_at=data.expires_at,
        is_active=True,
    )
    db.add(a)
    db.flush()

    log_audit(
        db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="PUBLISH_ANNOUNCEMENT",
        entity_type="announcement",
        entity_id=str(a.id),
        details={"title": a.title, "priority": a.priority},
    )

    notify_all_org_employees(
        db,
        organization_id=current_user.organization_id,
        title=f"Announcement: {a.title}",
        message=a.content[:160],
        notification_type="announcement",
        link="/announcements",
    )

    db.commit()
    db.refresh(a)
    return a

@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_announcement(
    announcement_id: uuid.UUID,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db),
):
    a = db.scalar(
        select(Announcement).where(
            Announcement.id == announcement_id,
            Announcement.organization_id == current_user.organization_id,
        )
    )
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found.")

    a.is_active = False
    db.commit()
    return None

