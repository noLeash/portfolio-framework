import datetime as dt
from pydantic import BaseModel
from schema.auth import UserToken
from typing import Optional


class CreateUserRequest(BaseModel):
    user_name: str
    password: str
    email: str
    admin: bool = False
    access_level: int

class UpdateUserRequest(BaseModel):
    user_name: Optional[str] = None
    password: Optional[str] = None
    email: Optional[str] = None
    admin: Optional[bool] = False
    access_level: Optional[int] = None


class UserProfile(BaseModel):
    user_name: str
    id: str
    admin: bool
    email: str
    access_level: int

class UpdateUserResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    profile: UserProfile | None = None

class CreateUserResponse(BaseModel):
    message: str
    user: UserProfile | None = None

class UserLoginHistoryRequest(BaseModel):
    skip: int = 0
    limit: int = 10

class StatusResponse(BaseModel):
    ok: bool = False
    message: str = "-"
    error: str = ""

class CreateFirstUser(BaseModel):
    user: str
    password: str
    passwordConfirm: str
    email: str