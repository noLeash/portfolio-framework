from database import SessionLocal, get_db
from models.user import User, UserLoginIP
from schema.auth import UserLoginRequest
from sqlalchemy import select, update, delete
from uuid import UUID


def list_assets(folder: str = "images") -> list[dict]:
    session = get_db()
    try:
        result = session.execute(
            select(User).where(User.status != None)
        )
        issuer = result.scalars().all()
        if not issuer:
            return None
        return issuer

    finally:
        session.close()

def create_first_user(user: User, login_request: UserLoginRequest):#, user_login_ip: UserLoginIP):
    with SessionLocal() as session:
        admins = session.execute(
            select(User).where(User.admin.is_(True))
        ).scalars().all()
        user.access_level = 10
        if admins:
            return None
        user.admin = True
        session.add(user)
        session.flush()
        is_mobile = True if login_request.sec_ch_ua_mobile else False
        login_entry = UserLoginIP(
            user_id=user.id,
            ip_address=login_request.x_real_ip,
            user_agent=login_request.user_agent,
            ip_forwared_for=login_request.x_forwarded_for,
            # access_level=10,
            mobile = is_mobile,
            referer = login_request.referer,
            language = login_request.accept_language,
            success = login_request.success
        )
        session.add(login_entry)
        session.commit()
        session.refresh(user)
        return user

def create_user(user: User, login_request: UserLoginRequest):#, user_login_ip: UserLoginIP):
    """ Creates a new user and logs the login attempt. Returns the created user or None if an admin already exists."""
    try:
        with SessionLocal() as session:
            session.add(user)
            session.flush()
            is_mobile = True if login_request.sec_ch_ua_mobile else False
            login_entry = UserLoginIP(
                user_id=user.id,
                ip_address=login_request.x_real_ip,
                user_agent=login_request.user_agent,
                ip_forwared_for=login_request.x_forwarded_for,
                mobile = is_mobile,
                referer = login_request.referer,
                language = login_request.accept_language,
                success = login_request.success
            )
            session.add(login_entry)
            session.commit()
            session.refresh(user)
            session.add(login_entry)
            session.commit()
            session.refresh(user)
            session.refresh(login_entry)
            return user
    except Exception as e:
        raise Exception(f"Error creating user: {str(e)}")
    
def delete_user(user_id: str):
    with SessionLocal() as session:
        stmt = delete(User).where(User.id == UUID(user_id))
        result = session.execute(stmt)
        session.commit()
        return result.rowcount > 0

def find_user_by_username(username: str):
    with SessionLocal() as session:
        res = session.execute(select(User).where(User.user_name == username))
        user = res.scalar_one_or_none()
    if user:
        return user
    
    else:
        return {"error": "no-user"}
    
def find_user_by_id(id: str):
    with SessionLocal() as session:
        res = session.execute(select(User).where(User.id == UUID(id)))
        user = res.scalar_one_or_none()
    if user:
        return user
    else:
        return {"error": "no-user"}

def list_all_users(admin: User):
    with SessionLocal() as session:
        res = session.execute(select(User).order_by(User.updated_at.desc())).scalars().all()
    return res

def log_user_entry(user: User, user_ip_login: UserLoginRequest):
        
        print(f"user_ip_login.sec_ch_ua_mobile:{user_ip_login.sec_ch_ua_mobile}")
        is_mobile = True if '1' in user_ip_login.sec_ch_ua_mobile else False

        with SessionLocal() as session:
            is_mobile = True if '1' in user_ip_login.sec_ch_ua_mobile else False
            login_entry = UserLoginIP(
                user_id=user.id,
                ip_address=user_ip_login.x_real_ip,
                user_agent=user_ip_login.user_agent,
                ip_forwared_for=user_ip_login.x_forwarded_for,
                mobile = is_mobile,
                referer = user_ip_login.referer,
                language = user_ip_login.accept_language,
                success = user_ip_login.success
            )
            session.add(login_entry)
            session.commit()
            session.refresh(login_entry)
            return login_entry

def update_user(user_id: str, update_data: dict):
    with SessionLocal() as session:
        stmt = (
            update(User)
            .where(User.id == UUID(user_id))
            .values(**update_data)
        )
        session.execute(stmt)
        session.commit()
        return session.scalar(select(User).where(User.id == UUID(user_id)))



def user_login_history(user_id: str, start: int = 0, limit: int = 10):
    print(user_id, start, limit)
    with SessionLocal() as session:
        try:
            parsed_user_id = UUID(user_id)
        except ValueError:
            return {"error": "invalid-user-id"}
        # return {"error": "invalid-user-id"}

        user = session.scalar(
            select(User).where(User.id == parsed_user_id)
        )

        if not user:
            return None
        
        print(f"User found: {user.user_name} (ID: {user.id})")

        logins = session.scalars(
            select(UserLoginIP)
            .where(UserLoginIP.user_id == user.id)
            .order_by(UserLoginIP.created_at.desc())
            .offset(start)
            .limit(limit)
        ).all()

        print(logins)

        return {
            "user": user,
            "logins": logins,
        }