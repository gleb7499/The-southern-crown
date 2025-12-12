from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.core.config import settings
from app.schemas.auth import LoginRequest, UserResponse
from app.models.user import User
from app.api.deps import get_current_user
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/login")
def login(
    credentials: LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return JWT token in httponly cookie.
    
    - **email**: User email address
    - **password**: User password
    
    Returns success message on successful authentication.
    """
    logger.info(f"Login attempt for email: {credentials.email}")
    
    user = db.query(User).filter(User.email == credentials.email).first()
    
    if not user:
        logger.warning(f"Login failed: user not found - {credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not verify_password(credentials.password, user.hashed_password):
        logger.warning(f"Login failed: incorrect password - {credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        logger.warning(f"Login failed: inactive user - {credentials.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    access_token = create_access_token(data={"sub": str(user.id)})
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=settings.ENV == "production"
    )
    
    logger.info(f"Login successful: {credentials.email}")
    return {"message": "Login successful", "user": {"email": user.email, "is_admin": user.is_admin}}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {"message": "Logout successful"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
