from fastapi import APIRouter, Depends, HTTPException, Request, Query
from typing import Optional
import crud.user as crud_user
from models.user import User
from schema.auth import UserLoginRequest, UserToken
from utils.auth import get_current_user, hash_password
from schema.admin import (
    CreateUserRequest,
    CreateUserResponse,
    UserProfile,
    UserLoginHistoryRequest,
    UpdateUserResponse,
    UpdateUserRequest,
)

admin = APIRouter()

@admin.get('/allUsers')
def test_admin(user: dict = Depends(get_current_user)) -> list[UserProfile]:
    all_users = crud_user.list_all_users(admin=user)
    profiles = []
    for u in all_users:
        user_dict = u.__dict__
        user_dict['id'] = str(u.id)
        profile = UserProfile.model_validate(user_dict)
        profiles.append(profile)
    return profiles


@admin.post('/createUser')
def create_user(body: CreateUserRequest, request: Request, user = Depends(get_current_user)) -> CreateUserResponse:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    try:
        print(user)
        body.admin = body.admin if body.admin is not None else False
        pw = hash_password(body.password)
        
        new_user = User(
            user_name=body.user_name,
            password_hash=pw,
            email=body.email,
            admin=body.admin,
            access_level=body.access_level,
        )
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
        created_user = crud_user.create_user(new_user, login_request=r)
        profile = UserProfile(
            user_name=created_user.user_name,
            id=str(created_user.id),
            admin=created_user.admin,
            email=created_user.email,
            access_level=created_user.access_level
        )
        print("Created user:", created_user.user_name if created_user else "None")
        
        return CreateUserResponse(
            message=f"User {created_user.user_name if created_user else 'None'} created successfully",
            user=profile if created_user else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating user: {str(e)}")

@admin.patch('/updateUser/{user_id}')
def update_user(user_id: str, request: Request, body: Optional[UpdateUserRequest] = None,  user: UserToken = Depends(get_current_user)):
    
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    # raise HTTPException(status_code=303, detail="Error permissions")
    updated_user = crud_user.update_user(user_id, body.dict(exclude_unset=True))
    db_profile = crud_user.find_user_by_id(user_id)
    profile = UserProfile(
        user_name=db_profile.user_name,
        id=str(db_profile.id),
        admin=db_profile.admin,
        email=db_profile.email,
        access_level=db_profile.access_level
    )
    return UpdateUserResponse(
        success=True,
        profile=profile if updated_user else None
    )

@admin.get('/userLoginHistory/{user_id}')
def user_login_history(user_id: str, request: UserLoginHistoryRequest = Query(...), user: UserToken = Depends(get_current_user)):
    print(user_id, request.skip, request.limit)
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    history = crud_user.user_login_history(user_id, request.skip, request.limit)
    print(history["logins"])
    log_list = []
    for item in history["logins"]:
        log_list.append(item.__dict__)
    return log_list

@admin.delete('/deleteUser/{user_id}')
def delete_user(user_id: str, user: UserToken = Depends(get_current_user)):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    success = crud_user.delete_user(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully", "success": True}