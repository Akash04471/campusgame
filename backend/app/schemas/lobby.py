from pydantic import BaseModel, Field, computed_field
from typing import List, Optional

class RoomCreate(BaseModel):
    difficulty: Optional[str] = Field("standard")
    max_players: int = Field(1, ge=1, le=4)

class RoomJoin(BaseModel):
    room_code: str = Field(..., min_length=1, max_length=10)

class PlayerStateResponse(BaseModel):
    player_id: int
    username: str
    is_ready: bool
    role: Optional[str] = None

class RoomStateResponse(BaseModel):
    room_code: str
    status: str  # waiting, playing, finished
    difficulty: Optional[str] = "standard"
    host_id: int
    max_players: int
    players: List[PlayerStateResponse]

    @computed_field
    @property
    def player_count(self) -> int:
        return len(self.players)
