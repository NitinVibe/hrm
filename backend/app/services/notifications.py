import uuid
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.user import User
from app.models.role import Role
from app.models.employee import Employee


def send_notification(
    db: Session,
    organization_id: uuid.UUID,
    user_id: uuid.UUID,
    title: str,
    message: str,
    notification_type: str = "info",
    link: str | None = None,
) -> Notification:
    notif = Notification(
        organization_id=organization_id,
        user_id=user_id,
        title=title,
        message=message,
        type=notification_type,
        link=link,
        is_read=False,
    )
    db.add(notif)
    db.flush()
    return notif


def notify_admins_and_hr(
    db: Session,
    organization_id: uuid.UUID,
    title: str,
    message: str,
    notification_type: str = "info",
    link: str | None = None,
) -> list[Notification]:
    admin_users = db.scalars(
        select(User)
        .join(Role, User.role_id == Role.id)
        .where(
            User.organization_id == organization_id,
            User.is_active == True,
            Role.name.in_(["ORG_ADMIN", "HR", "HR_MANAGER", "SUPER_ADMIN"]),
        )
    ).all()

    created = []
    for u in admin_users:
        created.append(
            send_notification(
                db, organization_id, u.id, title, message, notification_type, link
            )
        )
    return created


def notify_manager_or_admin(
    db: Session,
    organization_id: uuid.UUID,
    employee: Employee,
    title: str,
    message: str,
    notification_type: str = "info",
    link: str | None = None,
) -> list[Notification]:
    notified_user_ids = set()
    created = []

    # 1. Notify reporting manager if present and has user account
    if employee.reporting_manager_id:
        mgr = db.scalar(
            select(Employee).where(Employee.id == employee.reporting_manager_id)
        )
        if mgr and mgr.user_id:
            notified_user_ids.add(mgr.user_id)
            created.append(
                send_notification(
                    db, organization_id, mgr.user_id, title, message, notification_type, link
                )
            )

    # 2. Also notify org admins / HR
    admin_users = db.scalars(
        select(User)
        .join(Role, User.role_id == Role.id)
        .where(
            User.organization_id == organization_id,
            User.is_active == True,
            Role.name.in_(["ORG_ADMIN", "HR", "HR_MANAGER", "SUPER_ADMIN"]),
        )
    ).all()

    for u in admin_users:
        if u.id not in notified_user_ids:
            notified_user_ids.add(u.id)
            created.append(
                send_notification(
                    db, organization_id, u.id, title, message, notification_type, link
                )
            )

    return created


def notify_all_org_employees(
    db: Session,
    organization_id: uuid.UUID,
    title: str,
    message: str,
    notification_type: str = "announcement",
    link: str | None = None,
) -> list[Notification]:
    users = db.scalars(
        select(User).where(
            User.organization_id == organization_id,
            User.is_active == True,
        )
    ).all()

    created = []
    for u in users:
        created.append(
            send_notification(
                db, organization_id, u.id, title, message, notification_type, link
            )
        )
    return created
