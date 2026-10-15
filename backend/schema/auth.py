from pydantic import BaseModel
from dataclasses import dataclass

class UserToken(BaseModel):
    id: str
    user_name: str | None = None   # 👈 add username
    first_name: str | None = None
    email: str | None = None
    is_admin: bool | None = False
    access_level: int | None = 0

class Token(BaseModel):
    access_token: str
    token_type: str

@dataclass
class UserLoginRequest:
    x_real_ip: str = None
    host:str = None
    x_forwarded_for: str = None
    sec_ch_ua_platform: str = None
    user_agent:str = None
    referer:str = None
    accept_language:str = None
    success: bool = False
    sec_ch_ua: str = None
    sec_ch_ua_mobile: str = None
    origin: str = None

