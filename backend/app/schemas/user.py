from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional

# Shared properties
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr

# Properties to receive on user creation
class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)

# Properties to receive on user login
class UserLogin(BaseModel):
    username_or_email: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    password: str = Field(..., min_length=1, max_length=100)

# Properties to return to client (excludes hashed password)
class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# JWT Token structure properties
class Token(BaseModel):
    access_token: str
    token_type: str

# Payload stored in token
class TokenData(BaseModel):
    id: Optional[str] = None
