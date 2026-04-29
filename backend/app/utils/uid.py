import random
import string
from datetime import datetime, timezone


def generate_article_uid() -> str:
    """Generate a unique article ID in the format JT-YYYYMM-XXXXXX."""
    now = datetime.now(timezone.utc)
    date_part = now.strftime("%Y%m")
    rand_part = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"JT-{date_part}-{rand_part}"


def generate_post_uid() -> str:
    """Generate a unique community post ID in the format JTP-YYYYMM-XXXXXX."""
    now = datetime.now(timezone.utc)
    date_part = now.strftime("%Y%m")
    rand_part = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"JTP-{date_part}-{rand_part}"
