from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth_dependencies import get_current_user
from app.db.dependencies import get_db
from app.models.role import Role
from app.models.user import User


def require_roles(*allowed_roles: str):
    def role_dependency(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        role = db.scalar(
            select(Role).where(
                Role.id == current_user.role_id
            )
        )

        if not role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User role not found.",
            )

        if role.name not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )

        return current_user

    return role_dependency


require_super_admin = require_roles(
    "SUPER_ADMIN"
)

require_org_admin = require_roles(
    "SUPER_ADMIN",
    "ORG_ADMIN",
)

require_hr = require_roles(
    "SUPER_ADMIN",
    "ORG_ADMIN",
    "HR",
)

require_manager = require_roles(
    "SUPER_ADMIN",
    "ORG_ADMIN",
    "HR",
    "MANAGER",
)

require_employee = require_roles(
    "SUPER_ADMIN",
    "ORG_ADMIN",
    "HR",
    "MANAGER",
    "EMPLOYEE",
)


def get_user_role_name(user: User, db: Session) -> str:
    if getattr(user, "role", None) and user.role:
        return user.role.name
    role = db.scalar(select(Role).where(Role.id == user.role_id))
    return role.name if role else "EMPLOYEE"