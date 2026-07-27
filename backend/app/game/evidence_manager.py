import uuid
import random
import time
from typing import Dict, List, Optional, Tuple

# Evidence types
EVIDENCE_TYPES = ['DIGITAL', 'PHYSICAL', 'TESTIMONIAL', 'FABRICATED']

# Spawn Point Registry (GDD §6.3, Title Case matching codebase)
EVIDENCE_SPAWN_POINTS = {
    'Research Center': [
        {'id': 'rc_001', 'position': {'x': 12.5, 'y': 0.5, 'z': -8.0}, 'type_pool': ['DIGITAL', 'PHYSICAL']},
        {'id': 'rc_002', 'position': {'x': 14.0, 'y': 0.5, 'z': -6.5}, 'type_pool': ['DIGITAL']},
        {'id': 'rc_003', 'position': {'x': 10.0, 'y': 0.5, 'z': -9.0}, 'type_pool': ['PHYSICAL']},
        {'id': 'rc_004', 'position': {'x': 13.0, 'y': 1.2, 'z': -7.0}, 'type_pool': ['DIGITAL', 'PHYSICAL']},
        {'id': 'rc_005', 'position': {'x': 11.5, 'y': 0.5, 'z': -10.0}, 'type_pool': ['PHYSICAL']},
    ],
    'Computer Lab': [
        {'id': 'cl_001', 'position': {'x': 5.0, 'y': 0.5, 'z': -8.5}, 'type_pool': ['DIGITAL']},
        {'id': 'cl_002', 'position': {'x': 7.0, 'y': 0.5, 'z': -9.0}, 'type_pool': ['DIGITAL']},
        {'id': 'cl_003', 'position': {'x': 6.0, 'y': 0.8, 'z': -7.5}, 'type_pool': ['DIGITAL', 'PHYSICAL']},
        {'id': 'cl_004', 'position': {'x': 4.5, 'y': 0.5, 'z': -10.0}, 'type_pool': ['DIGITAL']},
    ],
    'Security Office': [
        {'id': 'so_001', 'position': {'x': 22.0, 'y': 0.5, 'z': -8.0}, 'type_pool': ['DIGITAL', 'PHYSICAL']},
        {'id': 'so_002', 'position': {'x': 23.5, 'y': 0.5, 'z': -9.0}, 'type_pool': ['DIGITAL']},
        {'id': 'so_003', 'position': {'x': 21.0, 'y': 1.0, 'z': -7.5}, 'type_pool': ['PHYSICAL']},
    ],
    'MCA Department': [
        {'id': 'mca_001', 'position': {'x': -5.0, 'y': 0.5, 'z': 2.0}, 'type_pool': ['PHYSICAL']},
        {'id': 'mca_002', 'position': {'x': -6.5, 'y': 0.5, 'z': 1.0}, 'type_pool': ['DIGITAL', 'PHYSICAL']},
        {'id': 'mca_003', 'position': {'x': -4.0, 'y': 0.5, 'z': 3.0}, 'type_pool': ['PHYSICAL']},
        {'id': 'mca_004', 'position': {'x': -7.0, 'y': 0.8, 'z': 2.5}, 'type_pool': ['DIGITAL']},
    ],
    'Library': [
        {'id': 'lib_001', 'position': {'x': -8.0, 'y': 0.5, 'z': 12.0}, 'type_pool': ['PHYSICAL', 'DIGITAL']},
        {'id': 'lib_002', 'position': {'x': -9.5, 'y': 0.5, 'z': 10.5}, 'type_pool': ['PHYSICAL']},
        {'id': 'lib_003', 'position': {'x': -7.0, 'y': 0.5, 'z': 13.0}, 'type_pool': ['PHYSICAL']},
        {'id': 'lib_004', 'position': {'x': -10.0, 'y': 1.5, 'z': 11.0}, 'type_pool': ['DIGITAL']},
    ],
    'Main Block': [
        {'id': 'mb_001', 'position': {'x': 0.0, 'y': 0.5, 'z': 0.0}, 'type_pool': ['PHYSICAL']},
        {'id': 'mb_002', 'position': {'x': 1.5, 'y': 0.5, 'z': -1.0}, 'type_pool': ['PHYSICAL']},
        {'id': 'mb_003', 'position': {'x': -1.0, 'y': 0.5, 'z': 1.0}, 'type_pool': ['PHYSICAL']},
    ],
    'Auditorium': [
        {'id': 'aud_001', 'position': {'x': 15.0, 'y': 0.5, 'z': 5.0}, 'type_pool': ['PHYSICAL']},
        {'id': 'aud_002', 'position': {'x': 16.5, 'y': 0.5, 'z': 4.0}, 'type_pool': ['PHYSICAL']},
    ],
    'Cafeteria': [
        {'id': 'caf_001', 'position': {'x': 3.0, 'y': 0.5, 'z': 14.0}, 'type_pool': ['PHYSICAL']},
        {'id': 'caf_002', 'position': {'x': 4.5, 'y': 0.5, 'z': 13.0}, 'type_pool': ['PHYSICAL']},
    ]
}

DIGITAL_TEMPLATES = [
    "Server access log showing entry at {time}",
    "Email fragment mentioning 'the transfer'",
    "USB device transfer record",
    "Login timestamp from workstation",
    "Deleted file metadata recovered",
]

PHYSICAL_TEMPLATES = [
    "ID card scan logged at entrance",
    "Handwritten note with partial address",
    "Keycard access log",
    "Security camera footage excerpt",
    "Personal item left behind",
]

DENSITY_MULTIPLIER = {
    'easy': 1.4,
    'medium': 1.0,
    'hard': 0.7
}


ANALYST_NOTES = {
    'DIGITAL': [
        "Looks like server metadata. Might mean something to the right person.",
        "Encrypted transfer log fragment. Contains timestamp traces.",
        "System log dump recovered from workstation buffer."
    ],
    'PHYSICAL': [
        "Physical artifact left at the scene. Shows signs of recent handling.",
        "Material evidence recovered nearby. Could yield fingerprints.",
        "Dropped item found near key access point."
    ],
    'TESTIMONIAL': [
        "Verbal statement recorded during questioning.",
        "Witness testimony regarding suspicious activity.",
        "Unsolicited tip from campus personnel."
    ],
    'FABRICATED': [
        "Document found near workstation. Inconsistencies apparent.",
        "Suspicious paper trail. Seems deliberately placed.",
        "Orphaned file record with questionable metadata."
    ]
}


class EvidenceItem:
    def __init__(
        self,
        room_id: str,
        area: str,
        evidence_type: str,
        points_to_player_id: Optional[str],
        reliability_score: float,
        spawn_point_id: Optional[str] = None,
        position: Optional[dict] = None,
        spawn_timestamp: float = 0.0,
        is_fabricated: bool = False,
        template_id: Optional[str] = None,
        description: Optional[str] = None
    ):
        self.evidence_id = str(uuid.uuid4())
        self.room_id = room_id
        self.evidence_type = evidence_type
        self.area = area
        self.area_found = area  # compatibility alias
        self.spawn_point_id = spawn_point_id
        self.position = position or {'x': 0.0, 'y': 0.5, 'z': 0.0}
        self.points_to_player_id = points_to_player_id
        self.reliability_score = reliability_score
        self.is_fabricated = is_fabricated
        self.is_destroyed = False
        self.is_collected = False
        self.collected_by: Optional[str] = None
        self.destruction_possible = True
        self.spawn_timestamp = spawn_timestamp
        self.timestamp_in_game = int(spawn_timestamp)  # compatibility alias
        self.collected_timestamp: Optional[float] = None
        self.destroyed_timestamp: Optional[float] = None
        self.template_id = template_id or self._assign_template_id(evidence_type)
        self.description = description or self._generate_description(evidence_type)

    def _assign_template_id(self, evidence_type: str) -> str:
        if evidence_type == 'DIGITAL':
            return random.choice(['usb_drive', 'server_log_printout', 'deleted_email'])
        elif evidence_type == 'PHYSICAL':
            return random.choice(['id_card', 'handwritten_note', 'security_badge'])
        elif evidence_type == 'TESTIMONIAL':
            return 'witness_statement'
        elif evidence_type == 'FABRICATED':
            return 'fake_document'
        return 'handwritten_note'

    def _generate_description(self, evidence_type: str) -> str:
        if evidence_type == 'DIGITAL':
            template = random.choice(DIGITAL_TEMPLATES)
        elif evidence_type == 'PHYSICAL':
            template = random.choice(PHYSICAL_TEMPLATES)
        elif evidence_type == 'TESTIMONIAL':
            return 'A verbal account from a campus occupant.'
        elif evidence_type == 'FABRICATED':
            return 'A document found near a workstation.'
        else:
            template = "Circumstantial evidence found"
        return template.format(time=f"{random.randint(18,23)}:{random.randint(0,59):02d}")

    def to_dict(self, include_hidden: bool = False) -> dict:
        data = {
            'evidence_id': self.evidence_id,
            'room_id': self.room_id,
            'evidence_type': self.evidence_type,
            'area': self.area,
            'area_found': self.area_found,
            'spawn_point_id': self.spawn_point_id,
            'position': self.position,
            'points_to_player_id': self.points_to_player_id,
            'reliability_score': round(self.reliability_score, 2),
            'is_fabricated': self.is_fabricated,
            'is_destroyed': self.is_destroyed,
            'is_collected': self.is_collected,
            'collected_by': self.collected_by,
            'destruction_possible': self.destruction_possible,
            'spawn_timestamp': self.spawn_timestamp,
            'timestamp_in_game': self.timestamp_in_game,
            'collected_timestamp': self.collected_timestamp,
            'destroyed_timestamp': self.destroyed_timestamp,
            'template_id': self.template_id,
            'description': self.description,
        }
        return data

    def to_player_card(self, viewer_role: str) -> dict:
        """
        Build role-aware card payload for collector:
        - DETECTIVE: full card with points_to_player_id and reliability_score.
        - Non-DETECTIVE: redacted card with flavor analyst_note, hiding points_to_player_id and reliability_score.
        """
        card = {
            'evidence_id': self.evidence_id,
            'template_id': self.template_id,
            'evidence_type': self.evidence_type,
            'area': self.area,
            'area_found': self.area_found,
            'description': self.description,
        }
        if viewer_role == 'DETECTIVE':
            card['points_to_player_id'] = self.points_to_player_id
            card['reliability_score'] = round(self.reliability_score, 2)
        else:
            notes = ANALYST_NOTES.get(self.evidence_type, ANALYST_NOTES['PHYSICAL'])
            card['analyst_note'] = random.choice(notes)
        return card



class EvidenceManager:
    def __init__(self):
        # room_code -> list of EvidenceItem
        self.room_evidence: Dict[str, List[EvidenceItem]] = {}
        # room_code -> list of investigation timeline event dicts
        self.room_timelines: Dict[str, List[dict]] = {}

    def log_timeline_event(
        self,
        room_code: str,
        event_type: str,
        title: str,
        description: str,
        area: str,
        metadata: Optional[dict] = None
    ) -> dict:
        timeline = self.room_timelines.setdefault(room_code, [])
        event = {
            'event_id': str(uuid.uuid4()),
            'event_type': event_type,  # 'COLLECTED' | 'DEMOLISHED' | 'STATEMENT' | 'SABOTAGE'
            'title': title,
            'description': description,
            'area': area,
            'timestamp': time.time(),
            'metadata': metadata or {}
        }
        timeline.append(event)
        return event

    def get_room_timeline(self, room_code: str) -> List[dict]:
        return self.room_timelines.get(room_code, [])

    def determine_evidence_target(
        self,
        difficulty: str,
        actual_mastermind_id: str,
        player_ids: List[str]
    ) -> Optional[str]:
        innocent_players = [pid for pid in player_ids if pid != actual_mastermind_id]
        if not innocent_players:
            innocent_players = player_ids

        r = random.random()

        if difficulty.lower() == 'easy':
            if r < 0.80:
                return actual_mastermind_id
            return None

        elif difficulty.lower() == 'medium':
            if r < 0.70:
                return actual_mastermind_id
            if r < 0.90:
                return None
            return random.choice(innocent_players)

        else:  # hard
            if r < 0.60:
                return actual_mastermind_id
            if r < 0.80:
                return None
            return random.choice(innocent_players)

    def generate_reliability_score(self, difficulty: str, evidence_type: str) -> float:
        base_ranges = {
            'easy':   (0.70, 0.95),
            'medium': (0.55, 0.85),
            'hard':   (0.35, 0.75),
        }
        lo, hi = base_ranges.get(difficulty.lower(), (0.55, 0.85))
        if evidence_type == 'DIGITAL':
            hi = min(1.0, hi + 0.05)
        return round(random.uniform(lo, hi), 2)

    def generate_evidence_for_room(
        self,
        room_code: str,
        player_ids: List[str],
        assignments: Dict[str, str],
        difficulty: str = 'medium',
        modifiers: dict = None,
    ) -> List[EvidenceItem]:
        """Generate initial evidence items scattered across campus areas per GDD specifications."""
        difficulty = difficulty.lower()
        multiplier = DENSITY_MULTIPLIER.get(difficulty, 1.0)
        
        mastermind_id = next((pid for pid, role in assignments.items() if role == 'MASTERMIND'), player_ids[0])

        all_spawn_points = []
        for area, points in EVIDENCE_SPAWN_POINTS.items():
            all_spawn_points.extend([(area, point) for point in points])

        total_possible = len(all_spawn_points)
        active_count = int(total_possible * multiplier)

        required_areas = {'Research Center', 'Computer Lab'}
        required_points = [(a, p) for a, p in all_spawn_points if a in required_areas]
        optional_points = [(a, p) for a, p in all_spawn_points if a not in required_areas]
        random.shuffle(optional_points)

        remaining = max(0, active_count - len(required_points))
        selected = required_points + optional_points[:remaining]

        evidence_items: List[EvidenceItem] = []
        for area, spawn_point in selected:
            ev_type = random.choice(spawn_point['type_pool'])
            points_to = self.determine_evidence_target(difficulty, mastermind_id, player_ids)
            reliability = self.generate_reliability_score(difficulty, ev_type)

            item = EvidenceItem(
                room_id=room_code,
                area=area,
                evidence_type=ev_type,
                points_to_player_id=points_to,
                reliability_score=reliability,
                spawn_point_id=spawn_point['id'],
                position=spawn_point['position'],
                spawn_timestamp=0.0
            )
            evidence_items.append(item)

        self.room_evidence[room_code] = evidence_items
        self.room_timelines[room_code] = []
        return evidence_items

    def get_room_evidence(self, room_code: str) -> List[EvidenceItem]:
        return self.room_evidence.get(room_code, [])

    def get_player_collected_count(self, room_code: str, player_id: str) -> int:
        pid_str = str(player_id)
        items = self.room_evidence.get(room_code, [])
        return sum(1 for item in items if item.is_collected and str(item.collected_by) == pid_str)

    def collect_evidence(self, room_code: str, evidence_id: str, collector_id: str) -> Optional[EvidenceItem]:
        items = self.room_evidence.get(room_code, [])
        for item in items:
            if item.evidence_id == evidence_id and not item.is_collected and not item.is_destroyed:
                item.is_collected = True
                item.collected_by = collector_id
                item.collected_timestamp = time.time()
                # Automatically log evidence collection on the investigation timeline
                self.log_timeline_event(
                    room_code,
                    event_type='COLLECTED',
                    title='Evidence Secured',
                    description=f'Secured {item.evidence_type} evidence in {item.area}.',
                    area=item.area,
                    metadata={'evidence_id': evidence_id, 'collector_id': collector_id}
                )
                return item
        return None

    def destroy_evidence(self, room_code: str, evidence_id: str) -> bool:
        items = self.room_evidence.get(room_code, [])
        for item in items:
            if item.evidence_id == evidence_id and not item.is_collected and not item.is_destroyed and item.destruction_possible:
                item.is_destroyed = True
                item.destroyed_timestamp = time.time()
                # Automatically log demolished evidence event on the investigation timeline
                self.log_timeline_event(
                    room_code,
                    event_type='DEMOLISHED',
                    title='Evidence Demolished',
                    description=f'Evidence in {item.area} has been demolished.',
                    area=item.area,
                    metadata={'evidence_id': evidence_id}
                )
                return True
        return False

    def plant_fake_evidence(
        self,
        room_code: str,
        area: str,
        target_player_id: str,
        game_timestamp: float,
        difficulty: str = 'medium',
    ) -> Optional[EvidenceItem]:
        items = self.room_evidence.get(room_code, [])
        fabricated_count = sum(1 for i in items if i.is_fabricated and not i.is_destroyed)
        if fabricated_count >= 3:
            return None
            
        reliability = round(random.uniform(0.3, 0.6), 2)
        spawn_points = EVIDENCE_SPAWN_POINTS.get(area, [{'id': 'fake', 'position': {'x': 0.0, 'y': 0.5, 'z': 0.0}}])
        chosen_spawn = random.choice(spawn_points)

        item = EvidenceItem(
            room_id=room_code,
            area=area,
            evidence_type='FABRICATED',
            points_to_player_id=target_player_id,
            reliability_score=reliability,
            spawn_point_id=chosen_spawn['id'],
            position=chosen_spawn['position'],
            spawn_timestamp=game_timestamp,
            is_fabricated=True
        )
        items.append(item)
        return item

    def get_area_evidence(self, room_code: str, area: str) -> List[dict]:
        return [
            i.to_dict() for i in self.room_evidence.get(room_code, [])
            if i.area == area and not i.is_collected and not i.is_destroyed
        ]

    def get_detective_board(self, room_code: str) -> dict:
        """Returns collected evidence and full investigation timeline for Detective's Canvas Board."""
        collected = [
            i.to_dict() for i in self.room_evidence.get(room_code, [])
            if i.is_collected and not i.is_destroyed
        ]
        return {
            'board': collected,
            'timeline': self.get_room_timeline(room_code)
        }


evidence_manager = EvidenceManager()

