import re
import unicodedata
from typing import Callable, Optional

# Top-level frontend routes a portfolio slug must not shadow (see frontend/src/routes.ts)
RESERVED_SLUGS = {"api", "login", "portfolios", "dashboard", "edit", "collections"}


def slugify(text: Optional[str], fallback: str = "portfolio") -> str:
    """Lower snake case, URL-safe: "Café Shoot 01!" -> "cafe_shoot_01"."""
    ascii_text = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "_", ascii_text.lower()).strip("_")
    return slug or fallback


def unique_slug(text: Optional[str], is_taken: Callable[[str], bool]) -> str:
    """slugify, then append _2, _3, ... until the slug is free and not reserved."""
    base = slugify(text)
    slug, n = base, 2
    while slug in RESERVED_SLUGS or is_taken(slug):
        slug, n = f"{base}_{n}", n + 1
    return slug
