from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    organization_name: str = Field(
        min_length=2,
        max_length=150,
    )

    organization_slug: str = Field(
        min_length=2,
        max_length=150,
    )

    email: EmailStr

    password: str = Field(
        min_length=8,
        max_length=128,
    )

    first_name: str = Field(
        min_length=1,
        max_length=100,
    )

    last_name: str | None = Field(
        default=None,
        max_length=100,
    )


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    role: str
    organization_id: str


class RegisterResponse(BaseModel):
    message: str
    user: UserResponse


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class MeResponse(BaseModel):
    id: str
    email: EmailStr
    role: str
    organization_id: str
    employee_id: str | None = None
    employee_id: str | None = None