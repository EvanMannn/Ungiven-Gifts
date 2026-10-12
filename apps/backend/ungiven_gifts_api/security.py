"""Password hashing and session tokens, using only the standard library.

Nothing stored here is sensitive, so this aims for "not plaintext, not guessable"
rather than anything heavier. Tokens are stateless HMAC-signed strings.
"""

import base64
import hashlib
import hmac
import secrets
import time

_PBKDF2_ITERATIONS = 200_000


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _PBKDF2_ITERATIONS)
    return f"{salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    salt_hex, digest_hex = stored.split("$", 1)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), bytes.fromhex(salt_hex), _PBKDF2_ITERATIONS
    )
    return hmac.compare_digest(digest.hex(), digest_hex)


def new_admin_key() -> str:
    return secrets.token_urlsafe(24)


def hash_admin_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def new_slug() -> str:
    alphabet = "abcdefghjkmnpqrstuvwxyz23456789"  # no lookalikes, easy to read aloud
    return "".join(secrets.choice(alphabet) for _ in range(8))


def new_participant_id() -> str:
    return secrets.token_hex(6)


def _sign(payload: str, secret: str) -> str:
    sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(sig).decode().rstrip("=")


def issue_token(slug: str, participant_id: str, password_version: int, secret: str) -> str:
    payload = f"{slug}.{participant_id}.{password_version}.{int(time.time())}"
    return f"{payload}.{_sign(payload, secret)}"


def read_token(token: str, secret: str, max_age_seconds: int) -> tuple[str, str, int] | None:
    """Return (slug, participant_id, password_version) for a valid token, else None."""
    try:
        payload, signature = token.rsplit(".", 1)
        slug, participant_id, version, issued = payload.split(".")
        if not hmac.compare_digest(signature, _sign(payload, secret)):
            return None
        if time.time() - int(issued) > max_age_seconds:
            return None
        return slug, participant_id, int(version)
    except ValueError:
        return None
