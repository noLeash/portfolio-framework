import re
from pathlib import PurePath
from models.user import User
import boto3
from botocore.exceptions import ClientError
from utils.auth import get_current_user
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from app_config import settings

s3_router = APIRouter()
s3 = boto3.client("s3", region_name=settings.AWS_REGION)
BUCKET = settings.S3_BUCKET

NAME_RE = re.compile(r"^[A-Za-z0-9._\- ]+(/[A-Za-z0-9._\- ]+)*$")
FILENAME_RE = re.compile(r"^[A-Za-z0-9._\- ]+$")
IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/avif"}
MAX_IMAGE_BYTES = 20 * 1024 * 1024


def to_prefix(name: str) -> str:
    name = name.strip().strip("/")
    if not name or ".." in name or not NAME_RE.match(name):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid folder name")
    return f"{name}/"


def prefix_exists(prefix: str) -> bool:
    resp = s3.list_objects_v2(Bucket=BUCKET, Prefix=prefix, MaxKeys=1)
    return resp.get("KeyCount", 0) > 0


class FolderCreate(BaseModel):
    name: str


@s3_router.post("", status_code=status.HTTP_201_CREATED)
def create_folder(body: FolderCreate):
    prefix = to_prefix(body.name)
    if prefix_exists(prefix):
        raise HTTPException(status.HTTP_409_CONFLICT, "Folder already exists")
    try:
        s3.put_object(Bucket=BUCKET, Key=prefix, Body=b"")
    except ClientError as e:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(e))
    return {"folder": prefix}


@s3_router.get("")
def list_folders(parent: str = ""):
    """Lists folders at the top level, or inside ?parent=some/path"""
    prefix = to_prefix(parent) if parent else ""
    folders = []
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=BUCKET, Prefix=prefix, Delimiter="/"):
        for cp in page.get("CommonPrefixes", []):
            folders.append(cp["Prefix"])
    return folders

@s3_router.post("/upload", status_code=status.HTTP_201_CREATED)
def upload_images(
    prefix: str = Query(..., description="Folder to upload into, e.g. portfolio/my-project"),
    # format: binary makes Swagger UI render a file picker instead of text inputs
    files: list[UploadFile] = File(..., json_schema_extra={"items": {"type": "string", "format": "binary"}}),
    user: User = Depends(get_current_user)
):
    folder = to_prefix(prefix)
    # Validate every file before uploading any, so a bad file doesn't leave a partial upload
    for f in files:
        name = PurePath(f.filename or "").name
        if not name or not FILENAME_RE.match(name):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Invalid filename: {f.filename!r}")
        if f.content_type not in IMAGE_TYPES:
            raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, f"{name} is not a supported image type")
        if f.size is not None and f.size > MAX_IMAGE_BYTES:
            raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, f"{name} exceeds {MAX_IMAGE_BYTES // (1024 * 1024)} MB")

    uploaded = []
    for f in files:
        key = folder + PurePath(f.filename).name
        try:
            s3.upload_fileobj(f.file, BUCKET, key, ExtraArgs={"ContentType": f.content_type})
        except ClientError as e:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(e))
        uploaded.append(key)
    return {"folder": folder, "uploaded": uploaded}


@s3_router.delete("/{name:path}")
def delete_folder(name: str):
    prefix = to_prefix(name)
    paginator = s3.get_paginator("list_objects_v2")
    deleted = 0
    for page in paginator.paginate(Bucket=BUCKET, Prefix=prefix):
        keys = [{"Key": obj["Key"]} for obj in page.get("Contents", [])]
        if keys:  # each page is at most 1000 keys, which matches delete_objects' limit
            resp = s3.delete_objects(Bucket=BUCKET, Delete={"Objects": keys, "Quiet": True})
            if resp.get("Errors"):
                raise HTTPException(status.HTTP_502_BAD_GATEWAY, resp["Errors"])
            deleted += len(keys)
    if deleted == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Folder not found")
    return {"folder": prefix, "objects_deleted": deleted}

@s3_router.delete("/image/{imageId}")
def delete_image(imageId: str):
    prefix = to_prefix(imageId)
    paginator = s3.get_paginator("list_objects_v2")
    deleted = 0
    for page in paginator.paginate(Bucket=BUCKET, Prefix=prefix):
        keys = [{"Key": obj["Key"]} for obj in page.get("Contents", [])]
        if keys:  # each page is at most 1000 keys, which matches delete_objects' limit
            resp = s3.delete_objects(Bucket=BUCKET, Delete={"Objects": keys, "Quiet": True})
            if resp.get("Errors"):
                raise HTTPException(status.HTTP_502_BAD_GATEWAY, resp["Errors"])
            deleted += len(keys)
    if deleted == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Image not found")
    return {"imageId": imageId, "objects_deleted": deleted}