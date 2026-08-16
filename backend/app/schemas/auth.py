from enum import Enum

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRole(str, Enum):
    STUDENT = "student"
    FACULTY = "faculty"
    ADMIN = "admin"


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = UserRole.STUDENT

    usn: str | None = Field(
        default=None,
        min_length=3,
        max_length=30,
    )

    employee_id: str | None = Field(
        default=None,
        min_length=3,
        max_length=30,
    )

    department: str | None = Field(
        default=None,
        max_length=100,
    )

    semester: int | None = Field(
        default=None,
        ge=1,
        le=12,
    )

    section: str | None = Field(
        default=None,
        max_length=10,
    )


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: UserRole
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
