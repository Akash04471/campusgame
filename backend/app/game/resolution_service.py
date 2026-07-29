from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.db.models.game import GameSession, UserGameStats
from app.game.task_manager import task_manager
from app.game.evidence_manager import evidence_manager


def resolve_investigator_votes(investigator_choices: Dict[str, str]) -> dict:
    """
    Server-side authoritative majority calculation for Investigator guesses.
    investigator_choices = { [investigatorId]: targetPlayerId }
    
    A strict majority is defined as strictly more than half of total Investigators:
    majorityThreshold = floor(totalInvestigators / 2) + 1
    """
    if not investigator_choices:
        return {
            'success': False,
            'final_guess': None,
            'vote_counts': {},
            'fail_message': "The Investigators could not reach a majority decision."
        }

    vote_counts = {}
    total_investigators = len(investigator_choices)

    for target_id in investigator_choices.values():
        if target_id is not None:
            t_str = str(target_id)
            vote_counts[t_str] = vote_counts.get(t_str, 0) + 1

    majority_threshold = (total_investigators // 2) + 1

    majority_target = None
    for target_id, count in vote_counts.items():
        if count >= majority_threshold:
            majority_target = target_id
            break

    if majority_target:
        return {
            'success': True,
            'final_guess': majority_target,
            'vote_counts': vote_counts,
            'fail_message': None
        }
    else:
        return {
            'success': False,
            'final_guess': None,
            'vote_counts': vote_counts,
            'fail_message': "The Investigators could not reach a majority decision."
        }


def resolve_game(
    room_code: str,
    assignments: Dict[str, str],
    mastermind_id: str,
    conspirator_id: str,
    accusation: Optional[Dict[str, str]],
    player_names: Dict[str, str],
    session_db_id,
    db: Session,
    investigator_choices: Optional[Dict[str, str]] = None,
) -> dict:
    """
    Determines the winner, persists stats to DB, returns full result payload.
    """
    mastermind_id_str = str(mastermind_id) if mastermind_id is not None else None
    conspirator_id_str = str(conspirator_id) if conspirator_id is not None else None

    detective_correct = False
    if accusation and accusation.get('conspirator_accusation') is not None:
        detective_guess = str(accusation.get('conspirator_accusation'))
        detective_correct = (detective_guess == conspirator_id_str) if conspirator_id_str else True
    else:
        # If there is no Conspirator assigned in this session, Detective is trivially correct
        detective_correct = True if not conspirator_id_str else False

    # Calculate Investigator majority resolution
    if investigator_choices is not None:
        # Normalize all investigator choice values to str
        norm_inv_choices = {str(k): str(v) for k, v in investigator_choices.items() if v is not None}
        vote_res = resolve_investigator_votes(norm_inv_choices)
        investigators_correct = False
        if vote_res['success'] and vote_res['final_guess']:
            final_guess_str = str(vote_res['final_guess'])
            investigators_correct = (final_guess_str == mastermind_id_str) if mastermind_id_str else True
        else:
            investigators_correct = True if not mastermind_id_str else False

        investigator_vote_result = {
            'success': vote_res['success'] if mastermind_id_str else True,
            'final_guess': vote_res['final_guess'],
            'vote_counts': vote_res['vote_counts'],
            'investigators_correct': investigators_correct,
            'fail_message': vote_res['fail_message'] if mastermind_id_str else None
        }
    elif accusation and accusation.get('mastermind_accusation') is not None:
        mm_guess = str(accusation.get('mastermind_accusation'))
        inv_correct = (mm_guess == mastermind_id_str) if mastermind_id_str else True
        investigator_vote_result = {
            'success': True,
            'final_guess': mm_guess,
            'vote_counts': {mm_guess: 1},
            'investigators_correct': inv_correct,
            'fail_message': None
        }
    else:
        investigator_vote_result = {
            'success': True if not mastermind_id_str else False,
            'final_guess': None,
            'vote_counts': {},
            'investigators_correct': True if not mastermind_id_str else False,
            'fail_message': None if not mastermind_id_str else "The Investigators could not reach a majority decision."
        }

    correct_accusation = detective_correct and investigator_vote_result['investigators_correct']
    winner_faction = 'INVESTIGATORS' if correct_accusation else 'VILLAINS'

    # Determine win status per player
    investigator_roles = {'DETECTIVE', 'INVESTIGATOR'}
    villain_roles = {'MASTERMIND', 'CONSPIRATOR'}

    player_results = []
    for raw_pid, role in assignments.items():
        player_id = str(raw_pid)
        is_investigator = role in investigator_roles
        won = (winner_faction == 'INVESTIGATORS' and is_investigator) or \
              (winner_faction == 'VILLAINS' and role in villain_roles)

        tasks_done = task_manager.get_tasks_completed_count(room_code, player_id)
        score = task_manager.get_player_score(room_code, player_id)

        player_results.append({
            'player_id': player_id,
            'username': player_names.get(player_id, player_names.get(raw_pid, player_id)),
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

    detective_id = next(
        (pid for pid, r in assignments.items() if r == 'DETECTIVE'), None
    )
    detective_guess = accusation.get('conspirator_accusation') if accusation else None
    winning_roles = ['DETECTIVE', 'INVESTIGATOR'] if winner_faction == 'INVESTIGATORS' else ['MASTERMIND', 'CONSPIRATOR']

    return {
        'winner_faction': winner_faction,
        'correct_accusation': correct_accusation,
        'winningRoles': winning_roles,
        'mastermind_id': mastermind_id,
        'conspirator_id': conspirator_id,
        'actualConspirator': {
            'id': conspirator_id,
            'name': player_names.get(conspirator_id, conspirator_id) if conspirator_id else 'None'
        },
        'actualMastermind': {
            'id': mastermind_id,
            'name': player_names.get(mastermind_id, mastermind_id) if mastermind_id else 'None'
        },
        'detective': {
            'playerId': detective_id,
            'guess': detective_guess,
            'guessName': player_names.get(detective_guess, detective_guess) if detective_guess else None,
            'correct': detective_correct,
        },
        'investigators': {
            'success': investigator_vote_result['success'],
            'finalGuess': investigator_vote_result['final_guess'],
            'finalGuessName': player_names.get(investigator_vote_result['final_guess']) if investigator_vote_result['final_guess'] else None,
            'voteCounts': investigator_vote_result['vote_counts'],
            'correct': investigator_vote_result['investigators_correct'],
            'failMessage': investigator_vote_result.get('fail_message')
        },
        'detectiveCorrect': detective_correct,
        'investigatorVoteResult': investigator_vote_result,
        'failMessage': investigator_vote_result.get('fail_message'),
        'player_stats': player_results,
        'all_roles': assignments,
        'player_names': player_names,
    }


