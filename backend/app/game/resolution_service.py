from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.db.models.game import GameSession, UserGameStats
from app.game.task_manager import task_manager
from app.game.evidence_manager import evidence_manager


def resolve_game(
    room_code: str,
    assignments: Dict[str, str],
    mastermind_id: str,
    conspirator_id: str,
    accusation: Optional[Dict[str, str]],
    player_names: Dict[str, str],
    session_db_id,
    db: Session,
) -> dict:
    """
    Determines the winner, persists stats to DB, returns full result payload.
    
    accusation = {
        'mastermind_accusation': player_id,
        'conspirator_accusation': player_id,
    }
    """
    correct_accusation = False
    winner_faction = 'VILLAINS'

    if accusation:
        correct_mm = accusation.get('mastermind_accusation') == mastermind_id if mastermind_id else True
        correct_co = accusation.get('conspirator_accusation') == conspirator_id if conspirator_id else True
        correct_accusation = correct_mm and correct_co
        if correct_accusation:
            winner_faction = 'INVESTIGATORS'

    # Determine win status per player
    investigator_roles = {'DETECTIVE', 'INVESTIGATOR'}
    villain_roles = {'MASTERMIND', 'CONSPIRATOR'}

    player_results = []
    for player_id, role in assignments.items():
        is_investigator = role in investigator_roles
        won = (winner_faction == 'INVESTIGATORS' and is_investigator) or \
              (winner_faction == 'VILLAINS' and role in villain_roles)

        tasks_done = task_manager.get_tasks_completed_count(room_code, player_id)
        score = task_manager.get_player_score(room_code, player_id)

        player_results.append({
            'player_id': player_id,
            'username': player_names.get(player_id, player_id),
            'role': role,
            'evidence_collected': evidence_manager.get_player_collected_count(room_code, player_id),
            'tasks_completed': tasks_done,
            'points_earned': score,
            'won': won,
        })

    # Persist to DB
    try:
        game_session = db.query(GameSession).filter(GameSession.id == session_db_id).first()
        if game_session:
            game_session.status = 'finished'
            game_session.winner_faction = winner_faction
            game_session.ended_at = datetime.now(timezone.utc)

        for pr in player_results:
            stat = UserGameStats(
                user_id=int(pr['player_id']),
                session_id=session_db_id,
                role=pr['role'],
                evidence_collected=pr['evidence_collected'],
                tasks_completed=pr['tasks_completed'],
                points_earned=pr['points_earned'],
                won=pr['won'],
            )
            db.add(stat)

        db.commit()
    except Exception:
        pass  # Don't fail game resolution if DB write fails

    return {
        'winner_faction': winner_faction,
        'correct_accusation': correct_accusation,
        'mastermind_id': mastermind_id,
        'conspirator_id': conspirator_id,
        'player_stats': player_results,
        'all_roles': assignments,
        'player_names': player_names,
    }
