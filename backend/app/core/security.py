import secrets
from datetime import datetime, timedelta
from typing import Optional, Tuple

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def generate_jti() -> str:
    # URL-safe random identifier suitable for token replay prevention via rotation.
    return secrets.token_urlsafe(32)


def _create_jwt(*, data: dict, token_type: str, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now = datetime.utcnow()
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "iat": now, "type": token_type})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    return _create_jwt(data=data, token_type=ACCESS_TOKEN_TYPE, expires_delta=expires_delta)


def create_refresh_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
    jti: Optional[str] = None,
) -> Tuple[str, str, datetime]:
    """Create refresh JWT and return (token, jti, expires_at)."""

    now = datetime.utcnow()
    jti_value = jti or generate_jti()

    if expires_delta is None:
        expires_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    expires_at = now + expires_delta
    token = _create_jwt(
        data={**data, "jti": jti_value},
        token_type=REFRESH_TOKEN_TYPE,
        expires_delta=expires_delta,
    )
    return token, jti_value, expires_at


def _decode_token(token: str, expected_type: Optional[str]) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None

    if expected_type is not None and payload.get("type") != expected_type:
        return None

    return payload


def decode_access_token(token: str) -> Optional[dict]:
    return _decode_token(token, expected_type=ACCESS_TOKEN_TYPE)


def decode_refresh_token(token: str) -> Optional[dict]:
    return _decode_token(token, expected_type=REFRESH_TOKEN_TYPE)
