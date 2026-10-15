from fastapi import APIRouter, HTTPException, Request
from database import engine, SessionLocal
from sqlalchemy import text, select

from app_config import settings
import crud.user as crud_user
from models.user import User
from schema.auth import UserLoginRequest
from schema.admin import StatusResponse, CreateFirstUser
from utils.auth import hash_password

bootstrap = APIRouter()




@bootstrap.get("/apiStatus", response_model=StatusResponse)
def health():
    response = StatusResponse(
        ok = True,
        message = "API responding"
    )
    print(f"PG username {settings.POSTGRES_USER}")
    return response


@bootstrap.get("/dbStatus", response_model=StatusResponse)
def db_status():
    response = StatusResponse()
    try:
        with engine.connect() as conn:
            res = conn.execute(text("SELECT 1"))
            print(res.all())
            response.message = "Connected to DB"
            response.ok = True
        return response
    except Exception as e:
        response.ok = False
        response.message = "Failed to connect do DB"
        response.error = f"Error: {e}"
        return response

@bootstrap.get("/adminExists")
def admin_exists():
    response = StatusResponse()
    with SessionLocal() as session:
        admins = session.execute(select(User).where(User.admin == True)).all()
        if len(admins) > 0:
            response.ok = True
            response.message = f"Admin Users: {len(admins)}"
        else:
            response.ok = False
            response.message = "Create First Admin"

    return response

# Create first admin
@bootstrap.post("/createFirstAdmin")
def create_first_admin(body: CreateFirstUser, request: Request):
    print(body)

    u = User()

    r = UserLoginRequest(
        host=request.client.host if request.client else None,
        x_forwarded_for = request.headers.get("x-forwarded-for"),
        x_real_ip = request.headers.get("x-real-ip") or (request.client.host if request.client else None),
        user_agent=request.headers.get("user-agent"),
        referer=request.headers.get("referer"),
        accept_language=request.headers.get("accept-language"),
        success=False,
        #user_agent
        sec_ch_ua=request.headers.get("sec-ch-ua"),
        sec_ch_ua_mobile=request.headers.get("sec-ch-ua-mobile"),
        origin=request.headers.get("origin")
    )


    if u.password_hash == u.admin:
        pw_hash = hash_password(str(body.password))
    else:
        raise HTTPException(status_code=301, detail="Passwords do not match")
    u.admin = True
    u.user_name = body.user
    u.password_hash = pw_hash
    u.email = body.email
    
    r.success=True
    res = crud_user.create_first_user(user=u, login_request=r)
 
    print(f"create_first_user_res {res}")
    return res.__dict__