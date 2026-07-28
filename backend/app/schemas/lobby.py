from pydantic import BaseModel, Field, computed_field
from typing import List, Optional

class RoomCreate(BaseModel):
    difficulty: str = Field("standard")  # fixed: always standard
    max_players: int = Field(1, ge=1, le=4)  # max 4 human players (bots fill remaining to 4)

class RoomJoin(BaseModel):
    room_code: str = Field(..., min_length=6, max_length=6)

class PlayerStateResponse(BaseModel):
    player_id: int
    username: str
    is_ready: bool
    role: Optional[str] = None

class RoomStateResponse(BaseModel):
    room_code: str
    status: str  # waiting, playing, finished
    difficulty: str
    host_id: int
    max_players: int
    players: List[PlayerStateResponse]

    @computed_field
    @property
    def player_count(self) -> int:
        return len(self.players)
