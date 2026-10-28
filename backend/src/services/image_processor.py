import datetime as dt
from io import BytesIO
from typing import BinaryIO, Union
from PIL import Image as PILImage, ImageOps, ImageCms

SRGB = ImageCms.createProfile("sRGB")

COPYRIGHT_OWNER = "Greg Comollo"
EXIF_COPYRIGHT = 0x8298
EXIF_ARTIST = 0x013B


def copyright_exif(source_exif: PILImage.Exif) -> bytes:
    """EXIF with only the source's copyright and artist, so GPS and camera details aren't published."""
    exif = PILImage.Exif()
    copyright = str(source_exif.get(EXIF_COPYRIGHT) or "").strip("\x00 ")
    exif[EXIF_COPYRIGHT] = copyright# or f"(c) {COPYRIGHT_OWNER} {dt.date.today().year}"
    artist = str(source_exif.get(EXIF_ARTIST) or "").strip("\x00 ")
    if artist:
        exif[EXIF_ARTIST] = artist
    return exif.tobytes()


def convert_to_srgb(img: PILImage.Image) -> PILImage.Image:
    """Convert pixels to sRGB using the embedded ICC profile, so the output can ship untagged."""
    icc = img.info.get("icc_profile")
    if not icc:
        return img  # untagged images are already treated as sRGB
    if img.mode not in ("RGB", "RGBA", "L", "CMYK"):
        img = img.convert("RGBA" if "A" in img.getbands() or "transparency" in img.info else "RGB")
    try:
        out = ImageCms.profileToProfile(
            img, ImageCms.ImageCmsProfile(BytesIO(icc)), SRGB,
            outputMode="RGBA" if img.mode == "RGBA" else "RGB",
        )
    except (ImageCms.PyCMSError, OSError):
        return img  # unreadable or mismatched profile: leave the pixels alone
    out.info.pop("icc_profile", None)  # ship untagged: browsers assume sRGB
    return out

def resize_image(
    source: Union[bytes, BinaryIO],
    size: tuple[int, int] = (400, 400),
    fmt: str = "WEBP",
    quality: int = 90,
    fit: bool = False,
    to_srgb: bool = True
) -> BytesIO:
    """Return a BytesIO (positioned at 0) containing the thumbnail."""
    fmt = fmt.upper()
    if fmt == "JPG":
        fmt = "JPEG"

    if isinstance(source, (bytes, bytearray)):
        source = BytesIO(source)

    with PILImage.open(source) as img:
        exif = copyright_exif(img.getexif())  # read before transposing changes img
        img = ImageOps.exif_transpose(img)
        if fit:
            img = ImageOps.fit(img, size)
        else:
            img.thumbnail(size)

        if fmt == "JPEG" and img.mode != "RGB":
            img = img.convert("RGB")
        elif img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA")

        if to_srgb:
            img = convert_to_srgb(img)

        buf = BytesIO()
        img.save(buf, format=fmt, quality=quality, exif=exif)
        buf.seek(0)
        return buf