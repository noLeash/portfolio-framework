from fastapi import APIRouter, Request, Depends, HTTPException, status
from typing import Annotated
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from utils.auth import verify_password, generate_access_token
from datetime import datetime, timedelta, timezone
import crud.user as crud_user
import crud.user as crud_user
from schema.auth import Token, UserLoginRequest
import pprint
from app_config import settings

# Move to Schema
from pydantic import BaseModel

auth = APIRouter()


@auth.post("/token")
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    request: Request
) -> Token:
    user = crud_user.find_user_by_username(form_data.username)
    verified = verify_password(form_data.password, user.password_hash)

    pprint.pp(request.__dict__)

    log_login = UserLoginRequest(
        host=request.client.host if request.client else None,
        x_forwarded_for = request.headers.get("x-forwarded-for"),
        x_real_ip = request.headers.get("x-real-ip") or (request.client.host if request.client else None),
        user_agent=request.headers.get("user-agent"),
        referer=request.headers.get("referer"),
        accept_language=request.headers.get("accept-language"),
        success=verified,
        #user_agent
        sec_ch_ua=request.headers.get("sec-ch-ua"),
        sec_ch_ua_mobile=request.headers.get("sec-ch-ua-mobile"),
        origin=request.headers.get("origin")
    )

    crud_user.log_user_entry(user=user, user_ip_login=log_login)

    pprint.pp(log_login.__dict__)
    if not verified:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return generate_access_token(user)
