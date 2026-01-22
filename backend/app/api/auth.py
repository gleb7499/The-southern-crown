import logging

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest, UserResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/login")
async def login(
    credentials: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)
):
    """
    Аутентификация пользователя и возврат JWT токена в httponly cookie.

    - **email**: Email адрес пользователя
    - **password**: Пароль пользователя

    Возвращает сообщение об успешной аутентификации.
    """
    logger.info(f"Login attempt for email: {credentials.email}")

    result = await db.execute(select(User).filter(User.email == credentials.email))
    user = result.scalar_one_or_none()

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

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=settings.ENV == "production",
    )

    logger.info(f"Login successful: {credentials.email}")
    return {"message": "Login successful", "user": {"email": user.email, "is_admin": user.is_admin}}


@router.post("/logout")
async def logout(response: Response):
    """
    Выход из системы. Удаляет cookie с токеном аутентификации.
    """
    response.delete_cookie(key="access_token")
    return {"message": "Logout successful"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Получить информацию о текущем авторизованном пользователе.
    """
    return current_user
