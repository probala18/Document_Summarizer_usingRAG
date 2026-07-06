"""User Pydantic schemas."""

from datetime import datetime
from pydantic import BaseModel
from backend.schemas.base import BaseSchema


class RegisterInput(BaseModel):
    email: str
    name: str
    password: str


class LoginInput(BaseModel):
    email: str
    password: str


class UserOut(BaseSchema):
    id: str
    email: str
    name: str
    created_at: datetime


class AuthResponse(BaseSchema):
    token: str
    user: UserOut
