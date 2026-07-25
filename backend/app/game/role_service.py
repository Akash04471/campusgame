import random
import secrets
from typing import Dict, List, Optional

ROLE_DISTRIBUTIONS = {
    4: ['DETECTIVE', 'INVESTIGATOR', 'MASTERMIND', 'CONSPIRATOR'],
    5: ['DETECTIVE', 'INVESTIGATOR', 'INVESTIGATOR', 'MASTERMIND', 'CONSPIRATOR'],
    6: ['DETECTIVE', 'INVESTIGATOR', 'INVESTIGATOR', 'INVESTIGATOR', 'MASTERMIND', 'CONSPIRATOR'],
}

DIFFICULTY_MODIFIERS = {
    'easy': {
        'evidence_density_multiplier': 1.4,
        'npc_reliability_range': (0.85, 1.0),
        'mastermind_sabotage_cooldown': 180,       # 3 min
        'conspirator_destroy_rate': 1,             # per minute
        'fake_evidence_grace_period': 300,         # 5 min
        'timer_seconds': 12 * 60,
        'detection_chance_fabricated': 0.30,
    },
    'medium': {
        'evidence_density_multiplier': 1.0,
        'npc_reliability_range': (0.60, 0.85),
        'mastermind_sabotage_cooldown': 120,
        'conspirator_destroy_rate': 2,
        'fake_evidence_grace_period': 0,
        'timer_seconds': 10 * 60,
        'detection_chance_fabricated': 0.20,
    },
    'hard': {
        'evidence_density_multiplier': 0.7,
        'npc_reliability_range': (0.30, 0.60),
        'mastermind_sabotage_cooldown': 60,
        'conspirator_destroy_rate': 3,
        'fake_evidence_grace_period': 0,
        'timer_seconds': 8 * 60,
        'detection_chance_fabricated': 0.10,
    },
}


def assign_roles(player_ids: List[str], difficulty: str = 'medium') -> dict:
    """
    Assigns roles based on player count per GDD spec.
    Returns assignments + per-player reveals + difficulty modifiers.
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

    modifiers = DIFFICULTY_MODIFIERS.get(difficulty, DIFFICULTY_MODIFIERS['medium'])

    return {
        'assignments': assignments,
        'reveals': reveals,
        'mastermind_id': mastermind_id,
        'conspirator_id': conspirator_id,
        'modifiers': modifiers,
    }
