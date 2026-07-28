from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.game.lobby_manager import lobby_manager, RoomLobbyState
from app.db.models.user import User
from app.api.v1.endpoints.auth import get_current_user
from app.schemas.lobby import RoomCreate, RoomJoin, RoomStateResponse

router = APIRouter()

@router.post("/create", response_model=RoomStateResponse)
def create_room(room_in: RoomCreate, current_user: User = Depends(get_current_user)):
    room = lobby_manager.create_room(
        host_id=current_user.id,
        host_username=current_user.username,
        difficulty=room_in.difficulty,
        max_players=room_in.max_players
    )
    return room.to_dict()

@router.post("/join", response_model=RoomStateResponse)
def join_room(room_in: RoomJoin, current_user: User = Depends(get_current_user)):
    clean_code = room_in.room_code.strip().upper()
    room = lobby_manager.get_room(clean_code)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room '{clean_code}' not found."
        )
    if current_user.id not in room.players and len(room.players) >= room.max_players:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room is full"
        )
    if room.status != "waiting":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Game already in progress"
        )
        
    updated_room = lobby_manager.join_room(
        room_code=clean_code,
        player_id=current_user.id,
        username=current_user.username
    )
    if not updated_room:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not join room"
        )
    return updated_room.to_dict()

@router.get("/rooms", response_model=List[RoomStateResponse])
def get_rooms():
    lobby_manager.cleanup_stale_rooms()
    # Return waiting rooms that have active players
    return [
        r.to_dict() for r in lobby_manager.rooms.values()
        if r.status == "waiting" and len(r.players) > 0
    ]

@router.get("/room/{room_code}", response_model=RoomStateResponse)
def get_room_details(room_code: str):
    clean_code = room_code.strip().upper()
    room = lobby_manager.get_room(clean_code)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room '{clean_code}' not found."
        )
    return room.to_dict()

