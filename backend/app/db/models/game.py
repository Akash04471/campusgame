import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.base_class import Base

class GameSession(Base):
    __tablename__ = "game_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    status = Column(String(20), default="waiting", nullable=False) # waiting, playing, finished
    difficulty = Column(String(10), default="standard", nullable=False) # standard (fixed 10-min game)
    winner_faction = Column(String(50), nullable=True) # Faction Detective/Investigators, Faction Villains
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    player_stats = relationship("UserGameStats", back_populates="session")


class UserGameStats(Base):
    __tablename__ = "user_game_stats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(UUID(as_uuid=True), ForeignKey("game_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False) # DETECTIVE, INVESTIGATOR, MASTERMIND, CONSPIRATOR
    evidence_collected = Column(Integer, default=0)
    tasks_completed = Column(Integer, default=0)
    points_earned = Column(Integer, default=0)
    won = Column(Boolean, default=False)

    # Relationships
    user = relationship("User", back_populates="game_history")
    session = relationship("GameSession", back_populates="player_stats")
