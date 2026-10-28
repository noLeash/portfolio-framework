from fileinput import filename
import pprint
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from schema import portfolios
from models.user import User
from utils.auth import get_current_user
from schema.portfolios import PurgeDeletedResponse, UpdateMediaRequest, UpdatePortfolioRequest, StartVideoUpload, StartVideoUploadResponse, MediaSchema, CreatePortfolioRequest, PortfolioSchema, EditPortfolioSchema, DisplayPortfolioSchema, PortfolioOrder, ListPortfolioSchema, PortfolioIndexSchema, IndexGroupSchema
from models.portfolio import MediaType, Portfolio, PortfolioMedia
from models.project_group import ProjectGroup
from database import get_db
from sqlalchemy.orm import Session
from routes.s3 import list_folders as list_s3_folders, s3, BUCKET, to_prefix, IMAGE_TYPES, MAX_IMAGE_BYTES
import crud.portfolio as crud_portfolio
from services.image_processor import resize_image
import mimetypes
from io import BytesIO
from pathlib import Path
import boto3
from PIL import Image, ImageOps, UnidentifiedImageError
from pathlib import PurePath
from botocore.config import Config
from botocore.exceptions import ClientError
from sqlalchemy import func
from sqlalchemy.orm import selectinload
from io import BytesIO
from app_config import settings

s3 = boto3.client("s3", region_name=settings.AWS_DEFAULT_REGION)
# Presigned URLs are opened by the browser. The bucket name contains dots, which breaks
# TLS on virtual-hosted URLs, so sign path-style URLs against the regional endpoint.
s3_presign = boto3.client(
    "s3",
    region_name=settings.AWS_DEFAULT_REGION,
    endpoint_url=f"https://s3.{settings.AWS_DEFAULT_REGION}.amazonaws.com",
    config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
)

portfolio_router = APIRouter()

def sync_portfolio_folders(
        folders: list,
        portfolios: list,
        db: Session = Depends(get_db),
    ):
    if not folders:
        return portfolios or []
    portfolios = portfolios or []
    for folder in folders:
        if folder not in [portfolio.folder for portfolio in portfolios]:
            # Here you would create a new portfolio entry in the database
            print(f"Creating portfolio for folder: {folder}")
            name = [string for string in folder.split("/") if string != "/"][-2]
            print(name)
            portfolio = Portfolio(
                folder=folder,
                name=name,
                slug=crud_portfolio.unique_portfolio_slug(db, name),
                description="",
            )
            portfolios.append(crud_portfolio.create_portfolio(db, portfolio))
    return portfolios

@portfolio_router.get("/listS3", response_model=list[PortfolioSchema])
def list_portfolio_folders(db: Session = Depends(get_db)):
    folders = list_s3_folders("portfolio")
    portfolios_db = crud_portfolio.list_portfolios(db)
    portfolios = sync_portfolio_folders(folders=folders, portfolios=portfolios_db, db=db)
    return portfolios

@portfolio_router.get("/list", response_model=list[ListPortfolioSchema])
def list_portfolio(db: Session = Depends(get_db)):
    portfolios_db = crud_portfolio.list_portfolios(db)
    return portfolios_db

@portfolio_router.get("/edit/{slug}",response_model=EditPortfolioSchema)
def get_edit_portfolio(slug: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    portfolio = crud_portfolio.get_portfolio_by_slug(db, slug)
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Portfolio {slug} not found"
        )
    return portfolio

def ensure_name_available(db: Session, name: str, exclude_id: UUID | None = None):
    existing = crud_portfolio.get_portfolio_by_name(db, name)
    if existing and existing.id != exclude_id:
        raise HTTPException(status.HTTP_409_CONFLICT, f"A portfolio named {name} already exists")

def ensure_cover_candidate(portfolio: Portfolio, media_id: UUID) -> UUID:
    """The media must belong to this portfolio, not be deleted, and have a preview image."""
    media = next((m for m in portfolio.media if m.id == media_id), None)
    if media is None or media.deleted_at is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Media {media_id} is not in this portfolio")
    if not media.large_path:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"{media.filename} has no preview image to use")
    return media.id

@portfolio_router.patch("/{portfolio_id}", response_model=EditPortfolioSchema)
def update_portfolio(
    portfolio_id: UUID,
    body: UpdatePortfolioRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    portfolio = crud_portfolio.get_portfolio_by_id(db, portfolio_id)
    # get_current_user returns a UserToken whose id is a str, not a UUID
    if not portfolio or str(portfolio.user_id) != str(user.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Portfolio with ID {portfolio_id} not found")

    if body.name is not None and body.name.strip() != portfolio.name:
        name = body.name.strip()
        ensure_name_available(db, name, exclude_id=portfolio.id)
        portfolio.name = name
        # The URL follows the name. The S3 folder deliberately doesn't move.
        portfolio.slug = crud_portfolio.unique_portfolio_slug(db, name, exclude_id=portfolio.id)
    if "description" in body.model_fields_set:
        portfolio.description = (body.description or "").strip() or None
    if "primary_media_id" in body.model_fields_set:
        portfolio.primary_media_id = body.primary_media_id and ensure_cover_candidate(portfolio, body.primary_media_id)
    if body.published is True and portfolio.published_at is None:
        portfolio.published_at = func.now()
    elif body.published is False:
        portfolio.published_at = None
    db.commit()
    db.refresh(portfolio)
    return portfolio


# Pillow can't rasterize SVG, so those get no thumbnail
NO_THUMB_TYPES = {"image/svg+xml"}

def upload_bytes(data, key: str, content_type: str, user: User = Depends(get_current_user)) -> str:
    body = data if hasattr(data, "read") else BytesIO(data)
    try:
        s3.upload_fileobj(body, settings.S3_BUCKET, key, ExtraArgs={"ContentType": content_type})
    except ClientError as e:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(e))
    return key

@portfolio_router.patch("/reorder/portfolios")
def reorder_portfolios(
    # portfolio_id: UUID,
    body: PortfolioOrder,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # portfolio = crud_portfolio.get_portfolio_by_id(db, portfolio_id)
    # if not portfolio:
    #     raise HTTPException(status.HTTP_404_NOT_FOUND, f"Portfolio with ID {portfolio_id} not found")
    # print(body.order)
    for position, portfolio_id in enumerate(body.order):
        portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
        if portfolio:
            portfolio.position = position

    db.commit()
    return {"status": "success"}

@portfolio_router.patch("/reorder/{portfolio_id}")
def reorder_portfolio_images(
    portfolio_id: UUID,
    body: PortfolioOrder = Depends(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    portfolio = crud_portfolio.get_portfolio_by_id(db, portfolio_id)
    if not portfolio:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Portfolio with ID {portfolio_id} not found")

    for position, img in enumerate(body.order):
        portfolio_image = db.query(PortfolioMedia).filter(PortfolioMedia.id == img).first()
        if portfolio_image:
            portfolio_image.position = position

    db.commit()
    return {"status": "success"}

@portfolio_router.post("/uploadImage")
def upload_portfolio_image(
    portfolio_id: UUID = Query(..., description="ID of the portfolio to upload into"),
    prefix: str = Query(..., description="Folder to upload into, e.g. portfolio/my-project"),
    files: list[UploadFile] = File(..., json_schema_extra={"items": {"type": "string", "format": "binary"}}),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    portfolio = crud_portfolio.get_portfolio_by_id(db, portfolio_id)
    if not portfolio:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Portfolio with ID {portfolio_id} not found")

    folder = to_prefix(prefix)  # validated, ends with "/"

    # Validate everything before uploading anything
    for f in files:
        if f.content_type not in IMAGE_TYPES:
            raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, f"{f.filename} is not a supported image type")
        if f.size is not None and f.size > MAX_IMAGE_BYTES:
            raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, f"{f.filename} exceeds {MAX_IMAGE_BYTES // (1024 * 1024)} MB")

    uploaded = []
    for f in files:
        data = f.file.read()
        file_id = uuid4()
        ext = PurePath(f.filename or "").suffix.lower()

        width = height = None
        if f.content_type not in NO_THUMB_TYPES:
            try:
                with Image.open(BytesIO(data)) as img:
                    width, height = img.size

                thumb = resize_image(data)
                small = resize_image(data, size=(600, 600))
                medium = resize_image(data, size=(800, 800))
                large = resize_image(data, size=(1964, 1964))
            except UnidentifiedImageError:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, f"{f.filename} is not a valid image")
            thumb_key = upload_bytes(thumb, f"{folder}{file_id}.webp", "image/webp")
            small_key = upload_bytes(small, f"{folder}{file_id}_small.webp", "image/webp")
            medium_key = upload_bytes(medium, f"{folder}{file_id}_medium.webp", "image/webp")
            large_key = upload_bytes(large, f"{folder}{file_id}_large.webp", "image/webp")

        original_key = upload_bytes(data, f"{folder}originals/{file_id}{ext}", f.content_type)

        if f.content_type in NO_THUMB_TYPES:
            # vectors scale losslessly, so every size points at the original
            thumb_key = small_key = medium_key = large_key = original_key

        db.add(PortfolioMedia(
            id=file_id,
            portfolio_id=portfolio.id,
            media_type=MediaType.image,
            filename=f.filename,
            original_path=original_key,
            thumbnail_path=thumb_key,
            small_path=small_key,
            medium_path=medium_key,
            large_path=large_key,
            content_type=f.content_type,
            size=len(data),
            original_width=width,
            original_height=height,
        ))
        uploaded.append({"id": str(file_id), "path": original_key, "thumbnail": thumb_key, "medium": medium_key, "large": large_key})

    db.commit()
    return uploaded

VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
MAX_VIDEO_BYTES = 500 * 1024 * 1024
VIDEO_UPLOAD_EXPIRES = 60 * 60  # seconds the presigned PUT stays valid

def next_position(db: Session, portfolio_id: UUID) -> int:
    last = db.query(func.max(PortfolioMedia.position)).filter(PortfolioMedia.portfolio_id == portfolio_id).scalar()
    return 0 if last is None else last + 1

def video_key_prefix(portfolio: Portfolio, video_id: UUID) -> str:
    return f"{to_prefix(portfolio.folder)}videos/{video_id}"

@portfolio_router.post("/uploadVideo/start", response_model=StartVideoUploadResponse)
def start_video_upload(
    body: StartVideoUpload,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    portfolio = crud_portfolio.get_portfolio_by_id(db, body.portfolio_id)
    if not portfolio:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Portfolio with ID {body.portfolio_id} not found")
    if body.content_type not in VIDEO_TYPES:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, f"{body.filename} is not a supported video type")
    if body.size > MAX_VIDEO_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, f"{body.filename} exceeds {MAX_VIDEO_BYTES // (1024 * 1024)} MB")

    video_id = uuid4()
    key = f"{video_key_prefix(portfolio, video_id)}{PurePath(body.filename).suffix.lower()}"
    # The browser must send this exact Content-Type, since it is part of the signature
    upload_url = s3_presign.generate_presigned_url(
        "put_object",
        Params={"Bucket": settings.S3_BUCKET, "Key": key, "ContentType": body.content_type},
        ExpiresIn=VIDEO_UPLOAD_EXPIRES,
    )
    return StartVideoUploadResponse(video_id=video_id, key=key, upload_url=upload_url)

@portfolio_router.post("/uploadVideo/complete", response_model=MediaSchema)
def complete_video_upload(
    portfolio_id: UUID = Form(...),
    video_id: UUID = Form(...),
    key: str = Form(...),
    filename: str = Form(...),
    width: int | None = Form(None),
    height: int | None = Form(None),
    duration: float | None = Form(None),
    poster: UploadFile | None = File(None, description="Frame captured by the browser, used for thumbnails"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    portfolio = crud_portfolio.get_portfolio_by_id(db, portfolio_id)
    if not portfolio:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Portfolio with ID {portfolio_id} not found")
    # Only accept the key handed out by /uploadVideo/start for this portfolio
    if not key.startswith(video_key_prefix(portfolio, video_id)):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Key does not belong to this upload")

    # Trust S3 for type and size, not the client
    try:
        head = s3.head_object(Bucket=settings.S3_BUCKET, Key=key)
    except ClientError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Video was not uploaded")
    content_type = head["ContentType"]
    size = head["ContentLength"]
    if content_type not in VIDEO_TYPES or size > MAX_VIDEO_BYTES:
        s3.delete_object(Bucket=settings.S3_BUCKET, Key=key)
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Uploaded file is not an allowed video")

    folder = to_prefix(portfolio.folder)
    thumb_key = small_key = medium_key = large_key = None
    if poster is not None:
        data = poster.file.read()
        try:
            thumb = resize_image(data)
            small = resize_image(data, size=(600, 600))
            medium = resize_image(data, size=(800, 800))
            large = resize_image(data, size=(1964, 1964))
        except UnidentifiedImageError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Poster is not a valid image")
        thumb_key = upload_bytes(thumb, f"{folder}{video_id}.webp", "image/webp")
        small_key = upload_bytes(small, f"{folder}{video_id}_small.webp", "image/webp")
        medium_key = upload_bytes(medium, f"{folder}{video_id}_medium.webp", "image/webp")
        large_key = upload_bytes(large, f"{folder}{video_id}_large.webp", "image/webp")

    media = PortfolioMedia(
        id=video_id,
        portfolio_id=portfolio.id,
        media_type=MediaType.video,
        filename=filename,
        original_path=key,
        thumbnail_path=thumb_key,
        small_path=small_key,
        medium_path=medium_key,
        large_path=large_key,
        content_type=content_type,
        size=size,
        original_width=width,
        original_height=height,
        duration=duration,
        position=next_position(db, portfolio.id),
    )
    db.add(media)
    db.commit()
    db.refresh(media)
    return media

@portfolio_router.patch("/media/{media_id}", response_model=MediaSchema)
def update_portfolio_media(
    media_id: UUID,
    body: UpdateMediaRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    media = get_owned_media(db, media_id, user)
    # blank strings clear a field rather than storing ""
    for field in body.model_fields_set:
        value = getattr(body, field)
        setattr(media, field, (value.strip() or None) if isinstance(value, str) else value)
    db.commit()
    db.refresh(media)
    return media

def get_owned_media(db: Session, media_id: UUID, user: User) -> PortfolioMedia:
    media = crud_portfolio.get_image_by_id(db, media_id)
    # get_current_user returns a UserToken whose id is a str, not a UUID
    if not media or str(media.portfolio.user_id) != str(user.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Media with ID {media_id} not found")
    return media

# Declared before /media/{media_id} so "purge" isn't parsed as a media ID
@portfolio_router.delete("/media/purge", response_model=PurgeDeletedResponse)
def purge_deleted_media(
    portfolio_id: UUID | None = Query(None, description="Only purge this portfolio; omit to purge every portfolio"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Permanently removes soft-deleted media and their files on S3."""
    query = (
        db.query(PortfolioMedia)
        # explicit: portfolio also points back at media via primary_media_id
        .join(PortfolioMedia.portfolio)
        .filter(PortfolioMedia.deleted_at.is_not(None), Portfolio.user_id == user.id)
    )
    if portfolio_id is not None:
        query = query.filter(PortfolioMedia.portfolio_id == portfolio_id)
    media = query.all()

    keys_by_media = {
        m.id: {k for k in (m.original_path, m.thumbnail_path, m.small_path, m.medium_path, m.large_path) if k}
        for m in media
    }
    keys = sorted(set().union(*keys_by_media.values()))
    failed_keys = set()
    # delete_objects takes at most 1000 keys per call
    for i in range(0, len(keys), 1000):
        batch = keys[i:i + 1000]
        try:
            resp = s3.delete_objects(
                Bucket=settings.S3_BUCKET,
                Delete={"Objects": [{"Key": k} for k in batch], "Quiet": True},
            )
            failed_keys.update(err["Key"] for err in resp.get("Errors", []))
        except ClientError:
            failed_keys.update(batch)

    # Keep rows whose files weren't all removed, so a later purge can retry them
    failed = [media_id for media_id, k in keys_by_media.items() if k & failed_keys]
    purged = [media_id for media_id in keys_by_media if media_id not in failed]
    if purged:
        # collection items referencing these rows are removed by ON DELETE CASCADE
        db.query(PortfolioMedia).filter(PortfolioMedia.id.in_(purged)).delete(synchronize_session=False)
        db.commit()
    return PurgeDeletedResponse(purged=len(purged), deleted_files=len(keys) - len(failed_keys), failed=failed)

@portfolio_router.delete("/media/{media_id}", response_model=MediaSchema)
def soft_delete_media(media_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Hides the media everywhere; its files stay on S3 until purged."""
    media = get_owned_media(db, media_id, user)
    if media.deleted_at is None:
        media.deleted_at = func.now()
        db.commit()
        db.refresh(media)
    return media

@portfolio_router.post("/media/{media_id}/restore", response_model=MediaSchema)
def restore_media(media_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    media = get_owned_media(db, media_id, user)
    media.deleted_at = None
    db.commit()
    db.refresh(media)
    return media

@portfolio_router.post("/createPortfolio")
# def show_body(request: dict):
#     pprint.pp(request)
def create_portfolio(
    request: CreatePortfolioRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):  
    name = request.portfolio_name.strip()
    ensure_name_available(db, name)
    safe_name = name.replace(" ", "_")
    folder_name = f"{str(user.id)}/{safe_name}"
    portfolio = Portfolio(
        name=name,
        slug=crud_portfolio.unique_portfolio_slug(db, name),
        description=request.description,
        user_id=user.id,
        folder=folder_name
    )
    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)
    return portfolio

# Public: backs the header's index sidebar and the /index page. Declared before /{slug} so "index"
# isn't parsed as a slug
@portfolio_router.get("/index", response_model=PortfolioIndexSchema)
def get_portfolio_index(db: Session = Depends(get_db)):
    published = (
        db.query(Portfolio)
        .filter(Portfolio.published_at.is_not(None), Portfolio.deleted_at.is_(None))
        .options(selectinload(Portfolio.media), selectinload(Portfolio.primary_media))
        .order_by(Portfolio.position)
        .all()
    )
    groups = db.query(ProjectGroup).order_by(ProjectGroup.position, ProjectGroup.created_at).all()
    # empty groups are left out
    by_group = [
        IndexGroupSchema(id=g.id, name=g.name, portfolios=[p for p in published if p.group_id == g.id])
        for g in groups
    ]
    return PortfolioIndexSchema(
        groups=[g for g in by_group if g.portfolios],
        ungrouped=[p for p in published if p.group_id is None],
    )

# Public: backs the /:portfolioSlug page, so no login required
@portfolio_router.get("/{slug}", response_model=DisplayPortfolioSchema)
def get_portfolio_by_slug(
    slug: str,
    db: Session = Depends(get_db),
):
    portfolio = crud_portfolio.get_portfolio_by_slug(db, slug)
    if not portfolio or portfolio.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Portfolio {slug} not found")
    display = DisplayPortfolioSchema.model_validate(portfolio)
    display.media = [m for m in display.media if m.deleted_at is None]
    return display