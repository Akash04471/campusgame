from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class RoomCreate(BaseModel):
    difficulty: str = Field("medium")
    max_players: int = Field(6, ge=1, le=6)

class RoomJoin(BaseModel):
    room_code: str = Field(..., min_length=6, max_length=6)

class PlayerStateResponse(BaseModel):
    player_id: int
    username: str
    is_ready: bool
    role: Optional[str] = None

class RoomStateResponse(BaseModel):
    room_code: str
    status: str # waiting, playing, finished
    difficulty: str
    host_id: int
    max_players: int
    players: List[PlayerStateResponse]
