from passlib.context import CryptContext
from schema.auth import Token, UserToken
from app_config import settings
import crud.user as crud_user
import datetime as dt
import jwt
from models.user import User
from fastapi import HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
import datetime as dt
import crud.user as crud_user


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

myctx = CryptContext(schemes=["sha256_crypt", "md5_crypt", "des_crypt"])

def hash_password(password: str) -> str:
    return myctx.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return myctx.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: dt.timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = dt.datetime.now(dt.timezone.utc) + expires_delta
    else:
        expire = dt.datetime.now(dt.timezone.utc) + dt.timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_current_user(access_token: str = Depends(oauth2_scheme)) -> UserToken:
    if not access_token or access_token.strip().lower() == "undefined":
        raise HTTPException(status_code=401, detail="Token missing")
    try:
        payload = jwt.decode(access_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except jwt.exceptions.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    id = payload.get("id")
    if not id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = crud_user.find_user_by_id(id=id)
    if not user or not isinstance(user, User):
        raise HTTPException(status_code=401, detail="User not found")
    return UserToken(
        id=str(user.id),
        email=user.email,
        is_admin=user.admin,
        user_name=user.user_name,
        # first_name=user["first_name"],
    )


def generate_access_token(user: User):
    access_token_expires = dt.timedelta(minutes=float(settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    access_token = create_access_token(
        data={"sub": user.user_name, "id": str(user.id), "is_admin": user.admin}, expires_delta=access_token_expires
    )
    return Token(access_token=access_token, token_type="bearer")
