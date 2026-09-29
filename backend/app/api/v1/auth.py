import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

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
    UserResponse,
)
from app.core.auth_dependencies import get_current_user

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)
from fastapi.security import OAuth2PasswordRequestForm

from app.core.permissions import require_org_admin

@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db),
):
    # --------------------------------
    # 1. Check if email already exists
    # --------------------------------

    existing_user = db.scalar(
        select(User).where(
            User.email == data.email.lower()
        )
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered.",
        )

    # --------------------------------
    # 2. Check organization slug
    # --------------------------------

    existing_org = db.scalar(
        select(Organization).where(
            Organization.slug == data.organization_slug.lower()
        )
    )

    if existing_org:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Organization slug is already in use.",
        )

    # --------------------------------
    # 3. Find ORG_ADMIN role
    # --------------------------------

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

    # --------------------------------
    # 4. Create organization
    # --------------------------------

    organization = Organization(
        name=data.organization_name,
        slug=data.organization_slug.lower(),
    )

    db.add(organization)
    db.flush()

    # --------------------------------
    # 5. Create user
    # --------------------------------

    user = User(
        organization_id=organization.id,
        role_id=org_admin_role.id,
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        is_active=True,
        is_verified=True,
    )

    db.add(user)
    db.flush()

    # --------------------------------
    # 6. Create employee profile
    # --------------------------------

    employee = Employee(
        organization_id=organization.id,
        user_id=user.id,
        employee_code=f"EMP-{uuid.uuid4().hex[:8].upper()}",
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email.lower(),
        employment_status="active",
    )

    db.add(employee)

    # --------------------------------
    # 7. Commit everything
    # --------------------------------

    db.commit()

    return RegisterResponse(
        message="Organization and admin account created successfully.",
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            role=org_admin_role.name,
            organization_id=str(organization.id),
        ),
    )

@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.scalar(
        select(User).where(
            User.email == form_data.username.lower()
        )
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
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
            detail="Invalid email or password.",
        )

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

    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "organization_id": str(
            current_user.organization_id
        ),
        "role": role.name if role else None,
    }

@router.get("/admin-test")
def admin_test(
    current_user: User = Depends(require_org_admin),
):
    return {
        "message": "You have organization admin access.",
        "user_id": str(current_user.id),
    }