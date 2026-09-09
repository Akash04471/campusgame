import uuid
from beanie import Document
from pydantic import Field
from datetime import datetime
from typing import Optional

class GameSession(Document):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "waiting" # waiting, playing, finished
    difficulty: str = "standard"
    winner_faction: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None

    class Settings:
        name = "game_sessions"


class UserGameStats(Document):
    user_id: str
    session_id: str
    role: str # DETECTIVE, INVESTIGATOR, MASTERMIND, CONSPIRATOR
    evidence_collected: int = 0
    tasks_completed: int = 0
    points_earned: int = 0
    won: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "user_game_stats"
