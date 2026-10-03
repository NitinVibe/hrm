import uuid
from datetime import datetime
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from jose import JWTError, jwt
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.db.dependencies import get_db
from app.models.employee import Employee
from app.models.organization import Organization
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
    RefreshTokenRequest,
    UserResponse,
)
from app.core.auth_dependencies import get_current_user
from app.core.permissions import require_org_admin

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db),
):
    existing_user = db.scalar(
        select(User).where(
            User.email == data.email.lower()
        )
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered.",
        )

    existing_org = db.scalar(
        select(Organization).where(
            Organization.slug == data.organization_slug.lower()
        )
    )

    if existing_org:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization slug is already in use.",
        )

    org_admin_role = db.scalar(
        select(Role).where(
            Role.name == "ORG_ADMIN"
        )
    )

    if not org_admin_role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ORG_ADMIN role is missing.",
        )

    organization = Organization(
        name=data.organization_name,
        slug=data.organization_slug.lower(),
    )

    db.add(organization)
    db.flush()

    user = User(
        organization_id=organization.id,
        role_id=org_admin_role.id,
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        is_active=True,
        is_verified=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)
    db.refresh(organization)

    return RegisterResponse(
        organization_id=organization.id,
        user_id=user.id,
        email=user.email,
        message="Organization and admin user created successfully.",
    )

@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    identifier = form_data.username.strip()

    # 1. Try lookup by email
    user = db.scalar(
        select(User).where(
            User.email == identifier.lower()
        )
    )

    # 2. Try lookup by employee code
    if not user:
        emp = db.scalar(
            select(Employee).where(
                Employee.employee_code.ilike(identifier)
            )
        )
        if emp and emp.user_id:
            user = db.scalar(select(User).where(User.id == emp.user_id))

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/Employee ID or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    if not verify_password(
        form_data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/Employee ID or password.",
        )

    user.last_login_at = datetime.utcnow()
    db.commit()

    access_token = create_access_token(
        subject=str(user.id),
    )

    refresh_token = create_refresh_token(
        subject=str(user.id),
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )

@router.post(
    "/refresh",
    response_model=TokenResponse,
)
def refresh_token(
    data: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate refresh token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            data.refresh_token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        user_id = payload.get("sub")
        token_type = payload.get("type")

        if not user_id or token_type != "refresh":
            raise credentials_exception

        user_uuid = uuid.UUID(user_id)
    except (JWTError, ValueError):
        raise credentials_exception

    user = db.scalar(select(User).where(User.id == user_uuid))
    if not user:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    new_access_token = create_access_token(subject=str(user.id))
    new_refresh_token = create_refresh_token(subject=str(user.id))

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
    )

@router.post("/logout")
def logout(
    current_user: User = Depends(get_current_user),
):
    return {"message": "Logged out successfully."}

@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = db.scalar(
        select(Role).where(
            Role.id == current_user.role_id
        )
    )

    org = db.scalar(
        select(Organization).where(
            Organization.id == current_user.organization_id
        )
    )

    emp = db.scalar(
        select(Employee).where(
            Employee.user_id == current_user.id
        )
    )

    role_name = role.name if role else "EMPLOYEE"

    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "organization_id": str(current_user.organization_id),
        "role": role_name,
        "user": {
            "id": str(current_user.id),
            "email": current_user.email,
            "role": role_name,
        },
        "organization": {
            "id": str(org.id) if org else str(current_user.organization_id),
            "name": org.name if org else "Enterprise Organization",
            "slug": org.slug if org else "default",
        },
        "employee": {
            "id": str(emp.id),
            "first_name": emp.first_name,
            "last_name": emp.last_name,
            "employee_code": emp.employee_code,
            "department_id": str(emp.department_id) if emp.department_id else None,
            "designation_id": str(emp.designation_id) if emp.designation_id else None,
            "branch_id": str(emp.branch_id) if emp.branch_id else None,
            "employment_status": emp.employment_status,
            "joining_date": emp.joining_date.isoformat() if emp.joining_date else None,
            "phone": emp.phone,
        } if emp else None,
    }

@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password does not match.",
        )

    current_user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "Password changed successfully."}

@router.get("/admin-test")
def admin_test(
    current_user: User = Depends(require_org_admin),
):
    return {
        "message": "You have organization admin access.",
        "user_id": str(current_user.id),
    }