from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
import random

from app.db.models.user import User
from app.core import security
from app.core.config import settings
from app.schemas.user import UserCreate, UserResponse, Token, TokenData, UserLogin

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login/oauth"
)

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(id=str(user_id))
    except JWTError:
        raise credentials_exception
        
    user = await User.find_one(User.user_id == int(token_data.id)) if token_data.id.isdigit() else await User.get(token_data.id)
    if user is None:
        raise credentials_exception
    return user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_in: UserCreate):
    # Check if username or email exists
    existing_user = await User.find_one(
        (User.username == user_in.username) | (User.email == user_in.email)
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or Email already registered",
        )
        
    hashed_password = security.get_password_hash(user_in.password)
    # Generate integer ID for legacy frontend compatibility
    numeric_id = random.randint(1000, 999999)
    new_user = User(
        user_id=numeric_id,
        username=user_in.username,
        email=user_in.email,
        hashed_password=hashed_password
    )
    await new_user.insert()
    return {
        "id": new_user.user_id if new_user.user_id else str(new_user.id),
        "username": new_user.username,
        "email": new_user.email,
        "is_active": new_user.is_active,
        "created_at": new_user.created_at
    }


@router.post("/login", response_model=Token)
async def login_json(user_in: UserLogin):
    """JSON-based login route supporting email or username."""
    identifier = user_in.username_or_email or user_in.email or user_in.username
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email is required",
        )
    user = await User.find_one(
        (User.email == identifier) | (User.username == identifier)
    )
    if not user or not security.verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect username/email or password",
        )
    user_identifier = str(user.user_id if user.user_id else user.id)
    access_token = security.create_access_token(subject=user_identifier)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login/oauth", response_model=Token)
async def login_oauth(form_data: OAuth2PasswordRequestForm = Depends()):
    """Standard OAuth2 form-based login route."""
    user = await User.find_one(
        (User.username == form_data.username) | (User.email == form_data.username)
    )
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect username/email or password",
        )
    user_identifier = str(user.user_id if user.user_id else user.id)
    access_token = security.create_access_token(subject=user_identifier)
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def read_current_user(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.user_id if current_user.user_id else str(current_user.id),
        "username": current_user.username,
        "email": current_user.email,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at
    }
