import random
import secrets
from typing import Dict, List, Optional

ROLE_DISTRIBUTIONS = {
    4: ['DETECTIVE', 'INVESTIGATOR', 'MASTERMIND', 'CONSPIRATOR'],
    5: ['DETECTIVE', 'INVESTIGATOR', 'INVESTIGATOR', 'MASTERMIND', 'CONSPIRATOR'],
    6: ['DETECTIVE', 'INVESTIGATOR', 'INVESTIGATOR', 'INVESTIGATOR', 'MASTERMIND', 'CONSPIRATOR'],
}

# Single standard ruleset — fixed 10-minute game duration for all rooms.
STANDARD_MODIFIERS = {
    'evidence_density_multiplier': 1.0,
    'npc_reliability_range': (0.60, 0.85),
    'mastermind_sabotage_cooldown': 120,
    'conspirator_destroy_rate': 2,
    'fake_evidence_grace_period': 0,
    'timer_seconds': 10 * 60,          # 600 s — fixed 10-minute investigation window
    'detection_chance_fabricated': 0.20,
}

# Legacy alias kept so any remaining call-site using 'easy'/'medium'/'hard'
# still resolves without error — all map to the same standard ruleset.
DIFFICULTY_MODIFIERS = {
    'standard': STANDARD_MODIFIERS,
    'easy':     STANDARD_MODIFIERS,
    'medium':   STANDARD_MODIFIERS,
    'hard':     STANDARD_MODIFIERS,
}


def assign_roles(player_ids: List[str], difficulty: str = 'standard') -> dict:
    """
    Assigns roles based on player count per GDD spec.
    Returns assignments + per-player reveals + standard game modifiers.

    The difficulty argument is accepted for API back-compatibility but is
    ignored — all sessions now use the standard 10-minute ruleset.
    """
    player_count = len(player_ids)
    if player_count not in ROLE_DISTRIBUTIONS:
        raise ValueError(f"Unsupported player count: {player_count}. Must be 4, 5, or 6.")

    roles = ROLE_DISTRIBUTIONS[player_count].copy()

    # Cryptographically secure shuffle
    for i in range(len(roles) - 1, 0, -1):
        j = secrets.randbelow(i + 1)
        roles[i], roles[j] = roles[j], roles[i]

    assignments: Dict[str, str] = {}
    for i, player_id in enumerate(player_ids):
        assignments[player_id] = roles[i]

    # Find villain pair
    mastermind_id = next(pid for pid, role in assignments.items() if role == 'MASTERMIND')
    conspirator_id = next(pid for pid, role in assignments.items() if role == 'CONSPIRATOR')

    # Build per-player reveals
    reveals = {}
    for player_id, role in assignments.items():
        if role == 'MASTERMIND':
            reveals[player_id] = {
                'role': role,
                'partner_id': conspirator_id,
                'partner_role': 'CONSPIRATOR',
            }
        elif role == 'CONSPIRATOR':
            reveals[player_id] = {
                'role': role,
                'partner_id': mastermind_id,
                'partner_role': 'MASTERMIND',
            }
        else:
            reveals[player_id] = {
                'role': role,
                'partner_id': None,
                'partner_role': None,
            }

    return {
        'assignments': assignments,
        'reveals': reveals,
        'mastermind_id': mastermind_id,
        'conspirator_id': conspirator_id,
        'modifiers': STANDARD_MODIFIERS,
    }
