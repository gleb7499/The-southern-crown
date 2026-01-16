import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    verify_password,
)
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import LoginRequest, UserResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/login")
def login(credentials: LoginRequest, response: Response, db: Session = Depends(get_db)):
    """
    Аутентификация пользователя и возврат JWT токена в httponly cookie.

    - **email**: Email адрес пользователя
    - **password**: Пароль пользователя

    Возвращает сообщение об успешной аутентификации.
    """
    logger.info(f"Login attempt for email: {credentials.email}")

    user = db.query(User).filter(User.email == credentials.email).first()

    if not user:
        logger.warning(f"Login failed: user not found - {credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password"
        )

    if not verify_password(credentials.password, user.hashed_password):
        logger.warning(f"Login failed: incorrect password - {credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password"
        )

    if not user.is_active:
        logger.warning(f"Login failed: inactive user - {credentials.email}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token, refresh_jti, refresh_expires_at = create_refresh_token(
        data={"sub": str(user.id)}
    )

    db_refresh = RefreshToken(
        user_id=user.id,
        jti=refresh_jti,
        expires_at=refresh_expires_at,
    )
    db.add(db_refresh)
    db.commit()

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=settings.ENV == "production",
        path="/",
    )

    # Refresh cookie is scoped to refresh endpoint to avoid sending it with every request.
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        samesite="lax",
        secure=settings.ENV == "production",
        path="/auth/refresh",
    )

    logger.info(f"Login successful: {credentials.email}")
    return {"message": "Login successful", "user": {"email": user.email, "is_admin": user.is_admin}}


@router.post("/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    """Обновить access токен через refresh токен (ротация refresh)."""

    refresh_cookie = request.cookies.get("refresh_token")
    if not refresh_cookie:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = decode_refresh_token(refresh_cookie)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials"
        )

    user_id = payload.get("sub")
    jti = payload.get("jti")
    if user_id is None or jti is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials"
        )

    db_token = db.query(RefreshToken).filter(RefreshToken.jti == str(jti)).first()
    if db_token is None or db_token.user_id != int(user_id):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    if db_token.revoked_at is not None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    if db_token.expires_at <= datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    # Rotate refresh token
    new_refresh_token, new_jti, new_expires_at = create_refresh_token(data={"sub": str(user.id)})
    db_token.revoked_at = datetime.utcnow()
    db_token.replaced_by_jti = new_jti

    db.add(
        RefreshToken(
            user_id=user.id,
            jti=new_jti,
            expires_at=new_expires_at,
        )
    )
    db.commit()

    new_access_token = create_access_token(data={"sub": str(user.id)})

    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=settings.ENV == "production",
        path="/",
    )

    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        samesite="lax",
        secure=settings.ENV == "production",
        path="/auth/refresh",
    )

    return {"message": "Token refreshed"}


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    """
    Выход из системы. Удаляет cookie с токеном аутентификации.
    """

    refresh_cookie = request.cookies.get("refresh_token")
    if refresh_cookie:
        payload = decode_refresh_token(refresh_cookie)
        if payload is not None:
            jti = payload.get("jti")
            if jti is not None:
                db_token = db.query(RefreshToken).filter(RefreshToken.jti == str(jti)).first()
                if db_token is not None and db_token.revoked_at is None:
                    db_token.revoked_at = datetime.utcnow()
                    db.commit()

    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/auth/refresh")
    return {"message": "Logout successful"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Получить информацию о текущем авторизованном пользователе.
    """
    return current_user
