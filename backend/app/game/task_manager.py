import uuid
import random
from typing import Dict, List, Optional, Set

# ── Area → world [x, z] positions (mirrored from frontend/src/components/game/TaskZones.jsx)
AREA_WORLD_POSITIONS: Dict[str, tuple] = {
    'Research Center': (28.0, -20.0),
    'Computer Lab':    (28.0,   0.0),
    'Security Office': (-30.0,  4.0),
    'MCA Department':  (  8.0, 14.0),
    'Main Block':      (-10.0, -8.0),
    'Auditorium':      (-28.0,-28.0),
    'Library':         (-24.0, 22.0),
    'Cafeteria':       ( 32.0, 16.0),
}

# Role-specific task definitions
# Each role has exactly 3 unique tasks. No task_type is shared between roles.
# Each role's 3 tasks map to 3 different minigame variants (wire, valve, hold).
TASK_DEFINITIONS = {
    # 🔍 DETECTIVE — Investigation & Analysis tasks
    'DETECTIVE': [
        {
            'task_type': 'ANALYZE_CCTV',
            'name': 'Analyze CCTV Surveillance Feeds',
            'location': 'Security Office',
            'duration_seconds': 45,
            'points': 25,
            'role_restricted': 'DETECTIVE',
        },
        {
            'task_type': 'AUDIT_SERVER_LOGS',
            'name': 'Audit Server Access Logs',
            'location': 'Computer Lab',
            'duration_seconds': 40,
            'points': 20,
            'role_restricted': 'DETECTIVE',
        },
        {
            'task_type': 'DECRYPT_SCHEMATICS',
            'name': 'Decrypt Encrypted Schematics',
            'location': 'Research Center',
            'duration_seconds': 50,
            'points': 30,
            'role_restricted': 'DETECTIVE',
        },
    ],

    # 🧩 INVESTIGATOR — Field Forensics & Evidence tasks
    'INVESTIGATOR': [
        {
            'task_type': 'CATALOG_EVIDENCE',
            'name': 'Catalog Physical Evidence',
            'location': 'Library',
            'duration_seconds': 40,
            'points': 20,
            'role_restricted': 'INVESTIGATOR',
        },
        {
            'task_type': 'SCAN_FINGERPRINTS',
            'name': 'Scan Fingerprint Database',
            'location': 'MCA Department',
            'duration_seconds': 35,
            'points': 18,
            'role_restricted': 'INVESTIGATOR',
        },
        {
            'task_type': 'TRACE_SIGNAL',
            'name': 'Trace Radio Signal Source',
            'location': 'Auditorium',
            'duration_seconds': 45,
            'points': 22,
            'role_restricted': 'INVESTIGATOR',
        },
    ],

    # 🧠 MASTERMIND — Sabotage & Disruption tasks
    'MASTERMIND': [
        {
            'task_type': 'INJECT_MALWARE',
            'name': 'Inject Malware into Server',
            'location': 'Computer Lab',
            'duration_seconds': 40,
            'points': 0,
            'role_restricted': 'MASTERMIND',
        },
        {
            'task_type': 'FORGE_ACCESS_BADGE',
            'name': 'Forge Security Access Badge',
            'location': 'Main Block',
            'duration_seconds': 35,
            'points': 0,
            'role_restricted': 'MASTERMIND',
        },
        {
            'task_type': 'SCRAMBLE_COMMS',
            'name': 'Scramble Communication Channels',
            'location': 'Security Office',
            'duration_seconds': 45,
            'points': 0,
            'role_restricted': 'MASTERMIND',
        },
    ],

    # 🔪 CONSPIRATOR — Sabotage & Cover-up tasks
    'CONSPIRATOR': [
        {
            'task_type': 'SHRED_EVIDENCE',
            'name': 'Shred Physical Evidence Logs',
            'location': 'Library',
            'duration_seconds': 35,
            'points': 0,
            'role_restricted': 'CONSPIRATOR',
        },
        {
            'task_type': 'WIPE_BACKUP_DRIVE',
            'name': 'Wipe Backup Hard Drive',
            'location': 'Research Center',
            'duration_seconds': 40,
            'points': 0,
            'role_restricted': 'CONSPIRATOR',
        },
        {
            'task_type': 'PLANT_DIVERSION',
            'name': 'Plant Diversionary Device',
            'location': 'Cafeteria',
            'duration_seconds': 30,
            'points': 0,
            'role_restricted': 'CONSPIRATOR',
        },
    ],
}

VILLAIN_ROLES = {'MASTERMIND', 'CONSPIRATOR'}

SABOTAGE_EFFECTS = {
    # Mastermind sabotage effects
    'INJECT_MALWARE':      {'effect': 'CORRUPT_EVIDENCE', 'area': 'Computer Lab', 'description': 'A keylogger corrupts nearby digital evidence.'},
    'FORGE_ACCESS_BADGE':  {'effect': 'NPC_SUSPICION_SHIFT', 'area': 'Main Block', 'description': 'Forged badge implicates an innocent player.'},
    'SCRAMBLE_COMMS':      {'effect': 'CORRUPT_EVIDENCE', 'area': 'Security Office', 'description': 'Scrambled comms destroy surveillance evidence.'},
    # Conspirator sabotage effects
    'SHRED_EVIDENCE':      {'effect': 'CORRUPT_EVIDENCE', 'area': 'Library', 'description': 'Shredded logs destroy physical evidence trails.'},
    'WIPE_BACKUP_DRIVE':   {'effect': 'CORRUPT_EVIDENCE', 'area': 'Research Center', 'description': 'Drive wipe destroys forensic backup data.'},
    'PLANT_DIVERSION':     {'effect': 'NPC_SUSPICION_SHIFT', 'area': 'Cafeteria', 'description': 'Diversionary device draws attention away from villains.'},
}


class PlayerTask:
    def __init__(self, definition: dict, is_sabotage: bool = False):
        self.task_id = str(uuid.uuid4())
        self.task_type = definition['task_type']
        self.name = definition['name']
        self.location = definition['location']
        self.duration_seconds = definition['duration_seconds']
        self.points = 0 if is_sabotage else definition['points']
        self.role_restricted = definition['role_restricted']
        self.is_sabotage: bool = is_sabotage
        self.progress: float = 0.0
        self.completed: bool = False

    def to_dict(self) -> dict:
        return {
            'task_id': self.task_id,
            'task_type': self.task_type,
            'name': self.name,
            'location': self.location,
            'area': self.location,
            'duration_seconds': self.duration_seconds,
            'points': self.points,
            'role_restricted': self.role_restricted,
            'is_sabotage': self.is_sabotage,
            'progress': round(self.progress, 3),
            'completed': self.completed,
        }



class TaskManager:
    def __init__(self):
        self.room_tasks: Dict[str, Dict[str, List[PlayerTask]]] = {}

    def assign_tasks_for_room(
        self,
        room_code: str,
        assignments: Dict[str, str],
    ) -> Dict[str, List[dict]]:
        """
        Assigns exactly 3 role-specific tasks per player on game start.
        Each role has its own dedicated pool of 3 tasks in TASK_DEFINITIONS.
        """
        self.room_tasks[room_code] = {}
        result = {}

        for player_id, role in assignments.items():
            is_villain = role in VILLAIN_ROLES
            role_pool = TASK_DEFINITIONS.get(role, [])

            # Each role has exactly 3 tasks — assign all of them
            player_tasks = [PlayerTask(d, is_sabotage=is_villain) for d in role_pool]
            self.room_tasks[room_code][player_id] = player_tasks
            result[player_id] = [t.to_dict() for t in player_tasks]

        return result

    def get_player_tasks(self, room_code: str, player_id: str) -> List[dict]:
        tasks = self.room_tasks.get(room_code, {}).get(player_id, [])
        return [t.to_dict() for t in tasks]

    def get_task_by_id(self, room_code: str, player_id: str, task_id: str) -> Optional['PlayerTask']:
        tasks = self.room_tasks.get(room_code, {}).get(player_id, [])
        return next((t for t in tasks if t.task_id == task_id), None)

    def update_task_progress(
        self,
        room_code: str,
        player_id: str,
        task_id: str,
        delta_progress: float,
    ) -> Optional[dict]:
        tasks = self.room_tasks.get(room_code, {}).get(player_id, [])
        for task in tasks:
            if task.task_id == task_id and not task.completed:
                task.progress = min(1.0, task.progress + delta_progress)
                if task.progress >= 1.0:
                    task.completed = True
                return task.to_dict()
        return None

    def reset_task_progress(self, room_code: str, player_id: str, task_id: str) -> Optional[dict]:
        tasks = self.room_tasks.get(room_code, {}).get(player_id, [])
        for task in tasks:
            if task.task_id == task_id and not task.completed:
                task.progress = 0.0
                return task.to_dict()
        return None

    def apply_sabotage_effect(
        self,
        room_code: str,
        task_type: str,
    ) -> Optional[dict]:
        return SABOTAGE_EFFECTS.get(task_type)

    def get_player_score(self, room_code: str, player_id: str) -> int:
        tasks = self.room_tasks.get(room_code, {}).get(player_id, [])
        return sum(t.points for t in tasks if t.completed and not t.is_sabotage)

    def get_room_completion_percent(self, room_code: str) -> dict:
        player_tasks_map = self.room_tasks.get(room_code, {})
        non_villain_tasks = [
            task
            for tasks in player_tasks_map.values()
            for task in tasks
            if not task.is_sabotage
        ]
        total = len(non_villain_tasks)
        completed = sum(1 for t in non_villain_tasks if t.completed)
        percent = round((completed / total * 100), 1) if total > 0 else 0.0
        return {
            'percent': percent,
            'completed': completed,
            'total': total,
        }

    def get_tasks_completed_count(self, room_code: str, player_id: str) -> int:
        tasks = self.room_tasks.get(room_code, {}).get(player_id, [])
        return sum(1 for t in tasks if t.completed)


task_manager = TaskManager()
