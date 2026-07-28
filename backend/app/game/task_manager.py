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
# Guarantees role alignment and distinct character responsibilities
TASK_DEFINITIONS = [
    # 🔍 DETECTIVE TASKS
    {
        'task_type': 'CHECK_CCTV',
        'name': 'Analyze CCTV Surveillance Feeds',
        'location': 'Security Office',
        'duration_seconds': 45,
        'points': 20,
        'role_restricted': 'DETECTIVE',
    },
    {
        'task_type': 'AUDIT_LOGS',
        'name': 'Audit Server System Access Logs',
        'location': 'Computer Lab',
        'duration_seconds': 40,
        'points': 18,
        'role_restricted': 'DETECTIVE',
    },
    {
        'task_type': 'DECRYPT_FILES',
        'name': 'Decrypt Encrypted Schematics',
        'location': 'Research Center',
        'duration_seconds': 50,
        'points': 25,
        'role_restricted': 'DETECTIVE',
    },
    {
        'task_type': 'INTERROGATE_RECORDS',
        'name': 'Review Witness Interview Records',
        'location': 'Main Block',
        'duration_seconds': 35,
        'points': 15,
        'role_restricted': 'DETECTIVE',
    },

    # 🧩 INVESTIGATOR TASKS
    {
        'task_type': 'REPAIR_NETWORK',
        'name': 'Repair Network Terminal',
        'location': 'Computer Lab',
        'duration_seconds': 35,
        'points': 12,
        'role_restricted': 'INVESTIGATOR',
    },
    {
        'task_type': 'ARCHIVE_FILES',
        'name': 'Archive Campus Research Files',
        'location': 'Library',
        'duration_seconds': 40,
        'points': 15,
        'role_restricted': 'INVESTIGATOR',
    },
    {
        'task_type': 'SUBMIT_ATTENDANCE',
        'name': 'Submit Attendance Records',
        'location': 'MCA Department',
        'duration_seconds': 25,
        'points': 10,
        'role_restricted': 'INVESTIGATOR',
    },
    {
        'task_type': 'RESTOCK_LAB',
        'name': 'Restock Lab Supplies',
        'location': 'Research Center',
        'duration_seconds': 30,
        'points': 10,
        'role_restricted': 'INVESTIGATOR',
    },
    {
        'task_type': 'SETUP_AUDITORIUM',
        'name': 'Set Up Auditorium Equipment',
        'location': 'Auditorium',
        'duration_seconds': 35,
        'points': 12,
        'role_restricted': 'INVESTIGATOR',
    },
    {
        'task_type': 'RETRIEVE_PRINT',
        'name': 'Retrieve Print Job',
        'location': 'Main Block',
        'duration_seconds': 20,
        'points': 8,
        'role_restricted': 'INVESTIGATOR',
    },
    {
        'task_type': 'PLACE_LUNCH',
        'name': 'Place Lunch Order',
        'location': 'Cafeteria',
        'duration_seconds': 15,
        'points': 5,
        'role_restricted': 'INVESTIGATOR',
    },

    # 🧠 MASTERMIND TASKS (Sabotage)
    {
        'task_type': 'INJECT_VIRUS',
        'name': 'Inject Server Virus Exploits',
        'location': 'Computer Lab',
        'duration_seconds': 40,
        'points': 0,
        'role_restricted': 'MASTERMIND',
    },
    {
        'task_type': 'TAMPER_CCTV',
        'name': 'Tamper Surveillance Cameras',
        'location': 'Security Office',
        'duration_seconds': 45,
        'points': 0,
        'role_restricted': 'MASTERMIND',
    },
    {
        'task_type': 'SCRAMBLE_BADGES',
        'name': 'Scramble Keycard Authorizations',
        'location': 'Main Block',
        'duration_seconds': 30,
        'points': 0,
        'role_restricted': 'MASTERMIND',
    },
    {
        'task_type': 'PLANT_COVER_STORY',
        'name': 'Plant Cover Story Logs',
        'location': 'MCA Department',
        'duration_seconds': 35,
        'points': 0,
        'role_restricted': 'MASTERMIND',
    },

    # 🔪 CONSPIRATOR TASKS (Sabotage)
    {
        'task_type': 'SHRED_LOGS',
        'name': 'Shred Physical Evidence Logs',
        'location': 'Library',
        'duration_seconds': 35,
        'points': 0,
        'role_restricted': 'CONSPIRATOR',
    },
    {
        'task_type': 'WIPE_DRIVE',
        'name': 'Wipe Backup Hard Drive',
        'location': 'Research Center',
        'duration_seconds': 40,
        'points': 0,
        'role_restricted': 'CONSPIRATOR',
    },
    {
        'task_type': 'LOCK_DOOR',
        'name': 'Lock Down Security Door Nodes',
        'location': 'Auditorium',
        'duration_seconds': 30,
        'points': 0,
        'role_restricted': 'CONSPIRATOR',
    },
    {
        'task_type': 'DISTRACT_GUARD',
        'name': 'Distract Campus Guard',
        'location': 'Cafeteria',
        'duration_seconds': 25,
        'points': 0,
        'role_restricted': 'CONSPIRATOR',
    },
]

VILLAIN_ROLES = {'MASTERMIND', 'CONSPIRATOR'}

SABOTAGE_EFFECTS = {
    'INJECT_VIRUS':      {'effect': 'CORRUPT_EVIDENCE', 'area': 'Computer Lab', 'description': 'A keylogger corrupts nearby digital evidence.'},
    'TAMPER_CCTV':       {'effect': 'CORRUPT_EVIDENCE', 'area': 'Security Office', 'description': 'Camera feeds are wiped; a digital evidence item is destroyed.'},
    'SCRAMBLE_BADGES':   {'effect': 'NPC_SUSPICION_SHIFT', 'area': 'Main Block', 'description': 'Intercepted keycard printout implicates an innocent.'},
    'PLANT_COVER_STORY': {'effect': 'NPC_SUSPICION_SHIFT', 'area': 'MCA Department', 'description': 'Falsified records deflect NPC suspicion to an innocent.'},
    'SHRED_LOGS':        {'effect': 'CORRUPT_EVIDENCE', 'area': 'Library', 'description': 'Research database corruption wipes an evidence trail.'},
    'WIPE_DRIVE':        {'effect': 'CORRUPT_EVIDENCE', 'area': 'Research Center', 'description': 'Drive wipe destroys physical/digital evidence.'},
    'LOCK_DOOR':         {'effect': 'NPC_SUSPICION_SHIFT', 'area': 'Auditorium', 'description': 'Rigged lights cause panic; NPCs misremember who was present.'},
    'DISTRACT_GUARD':    {'effect': 'NPC_SUSPICION_SHIFT', 'area': 'Cafeteria', 'description': 'Food tampering incident draws attention away from the villains.'},
    'REPAIR_NETWORK':    {'effect': 'CORRUPT_EVIDENCE', 'area': 'Computer Lab', 'description': 'Corrupts evidence in Computer Lab.'},
    'ARCHIVE_FILES':     {'effect': 'CORRUPT_EVIDENCE', 'area': 'Library', 'description': 'Corrupts evidence in Library.'},
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
        Assigns 3 role-specific tasks per player on game start.
        Guarantees that no two players are assigned the same task simultaneously.
        """
        self.room_tasks[room_code] = {}
        result = {}
        assigned_task_types: Set[str] = set()

        for player_id, role in assignments.items():
            is_villain = role in VILLAIN_ROLES

            # 1. Filter tasks restricted to player's specific role (or general Investigator tasks)
            # that have NOT been assigned to any other player in the room yet.
            role_eligible = [
                t for t in TASK_DEFINITIONS
                if t['task_type'] not in assigned_task_types
                and (
                    t['role_restricted'] == role or
                    (t['role_restricted'] is None and role == 'INVESTIGATOR') or
                    (t['role_restricted'] == 'INVESTIGATOR' and role == 'INVESTIGATOR')
                )
            ]

            # 2. Fallback to any remaining unassigned task if role-specific pool is less than 3
            if len(role_eligible) < 3:
                other_unassigned = [
                    t for t in TASK_DEFINITIONS
                    if t['task_type'] not in assigned_task_types
                    and t not in role_eligible
                ]
                role_eligible.extend(other_unassigned)

            # 3. Select up to 3 distinct tasks for this player
            selected_count = min(3, len(role_eligible))
            selected = random.sample(role_eligible, selected_count)

            # Mark selected task types as assigned globally across the room
            for t in selected:
                assigned_task_types.add(t['task_type'])

            player_tasks = [PlayerTask(d, is_sabotage=is_villain) for d in selected]
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
