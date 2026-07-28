import asyncio
import random
import time
from typing import Dict, List, Optional
from app.game.bot_chat_service import bot_chat_service
from app.game.task_manager import task_manager
from app.game.resolution_service import resolve_game
from app.db.session import SessionLocal

# Waypoint targets around campus for simulated bot movement
BOT_CAMPUS_LOCATIONS = [
    {"name": "Computer Lab", "pos": [34.5, 0.5, 3.5]},
    {"name": "Library", "pos": [-30.5, 0.5, 29.5]},
    {"name": "Cafeteria", "pos": [34.0, 0.5, -22.0]},
    {"name": "Research Center", "pos": [-30.5, 0.5, 43.0]},
    {"name": "Security Office", "pos": [-31.5, 0.5, 18.0]},
    {"name": "Main Block", "pos": [-9.0, 0.5, -6.0]},
    {"name": "Auditorium", "pos": [-12.0, 0.5, -38.0]},
    {"name": "Park Garden", "pos": [20.0, 0.5, -2.0]},
]

PERSONA_TYPES = ["aggressive", "quiet", "neutral"]

class BotManager:
    def __init__(self):
        # room_code -> list of active background asyncio Tasks for bots
        self.active_tasks: Dict[str, List[asyncio.Task]] = {}
        # room_code -> { bot_id_str: persona_str }
        self.bot_personas: Dict[str, Dict[str, str]] = {}
        # room_code -> { target_player_id_str: accusation_count }
        self.accusation_tracker: Dict[str, Dict[str, int]] = {}

    def is_bot_player(self, player_id: int or str) -> bool:
        try:
            return int(player_id) >= 9000
        except ValueError:
            return False

    def assign_personas_for_room(self, room_code: str, bot_ids: List[int or str]):
        """Assigns 3 distinct personas across the 3 bots for variety each game."""
        available_personas = list(PERSONA_TYPES)
        random.shuffle(available_personas)
        
        self.bot_personas[room_code] = {}
        for idx, bot_id in enumerate(bot_ids):
            bot_id_str = str(bot_id)
            persona = available_personas[idx % len(available_personas)]
            self.bot_personas[room_code][bot_id_str] = persona

        self.accusation_tracker[room_code] = {}

    def cancel_room_tasks(self, room_code: str):
        """Cancels all active bot background loops for a room."""
        if room_code in self.active_tasks:
            for task in self.active_tasks[room_code]:
                if not task.done():
                    task.cancel()
            self.active_tasks[room_code] = []

    def on_phase_change(self, room_code: str, phase: str, gs, room, broadcast_func, send_func):
        """
        Main entry point called when game phase changes or initializes.
        Schedules chat, task/movement, and decision phase submissions for all 3 bots.
        """
        self.cancel_room_tasks(room_code)
        if not gs or not gs.is_active or not room:
            return

        bot_ids = [pid for pid in room.players.keys() if self.is_bot_player(pid)]
        if not bot_ids:
            return

        # Ensure personas are assigned for this room session
        if room_code not in self.bot_personas or len(self.bot_personas[room_code]) == 0:
            self.assign_personas_for_room(room_code, bot_ids)

        tasks = []

        if phase in ('decision', 'accusation'):
            print(f"[BotManager] Scheduling decision phase bots for room {room_code}")
            for bot_id in bot_ids:
                bot_role = (gs.assignments.get(str(bot_id)) or '').upper()
                if bot_role in ('DETECTIVE', 'INVESTIGATOR'):
                    tasks.append(asyncio.create_task(
                        self._bot_decision_submission(room_code, bot_id, bot_role, gs, room, broadcast_func)
                    ))

        self.active_tasks[room_code] = tasks


    async def _bot_exploration_loop(self, room_code: str, bot_id: int, gs, room, broadcast_func):
        """Movement and task execution loop for a bot player."""
        bot_id_str = str(bot_id)

        try:
            while gs.is_active:
                # Randomized movement tick (3 to 8s)
                await asyncio.sleep(random.uniform(3.5, 7.5))

                # Move to a random campus waypoint with noise
                loc = random.choice(BOT_CAMPUS_LOCATIONS)
                noise_x = random.uniform(-2.0, 2.0)
                noise_z = random.uniform(-2.0, 2.0)
                new_pos = [loc['pos'][0] + noise_x, loc['pos'][1], loc['pos'][2] + noise_z]
                
                gs.player_positions[bot_id_str] = {
                    'position': new_pos,
                    'rotation': random.uniform(0, 6.28),
                    'area': loc['name'],
                    'durations': {}
                }

                await broadcast_func(room_code, {
                    "type": "PLAYER_MOVED",
                    "payload": {
                        "player_id": bot_id_str,
                        "position": new_pos,
                        "rotation": random.uniform(0, 6.28),
                        "area": loc['name']
                    }
                })

                # Task execution (random delay 5-15s pacing)
                if random.random() < 0.6:
                    bot_tasks = task_manager.get_player_tasks(room_code, bot_id_str)
                    pending_tasks = [t for t in bot_tasks if not t.get('completed')]
                    if pending_tasks:
                        target_task = random.choice(pending_tasks)
                        updated = task_manager.complete_task(room_code, bot_id_str, target_task['task_id'])
                        if updated:
                            await broadcast_func(room_code, {
                                "type": "TASK_COMPLETED",
                                "payload": {"player_id": bot_id_str, "task": updated}
                            })
                            global_progress = task_manager.get_room_completion_percent(room_code)
                            await broadcast_func(room_code, {
                                "type": "GLOBAL_TASK_PROGRESS",
                                "payload": global_progress
                            })

        except asyncio.CancelledError:
            pass

    async def _bot_chat_loop(self, room_code: str, bot_id: int, channel: str, gs, room, broadcast_func):
        """Paced template-based chat loop with persona limits & category weighting."""
        bot_id_str = str(bot_id)
        persona = self.bot_personas.get(room_code, {}).get(bot_id_str, 'neutral')

        # Config per persona
        if persona == 'aggressive':
            min_delay, max_delay, max_msgs = 3.0, 7.0, 6
        elif persona == 'quiet':
            min_delay, max_delay, max_msgs = 8.0, 16.0, 3
        else: # neutral
            min_delay, max_delay, max_msgs = 5.0, 10.0, 4

        messages_sent = 0

        try:
            while gs.is_active and messages_sent < max_msgs:
                await asyncio.sleep(random.uniform(min_delay, max_delay))

                if not gs.is_active:
                    break

                # Pick target player excluding self
                other_players = [
                    p for pid, p in room.players.items()
                    if str(pid) != bot_id_str
                ]
                if not other_players:
                    continue

                target_p = random.choice(other_players)
                target_id_str = str(target_p.player_id)
                target_name = target_p.username

                # Generate template-based chat message
                msg_text = bot_chat_service.generate_template_message(persona, target_name)
                bot_name = room.players[bot_id].username

                # Track accusation in room memory if message was accusatory/suspicious
                if any(kw in msg_text for kw in ["don't trust", "suspicious", "think it's", "Vote out"]):
                    self.accusation_tracker.setdefault(room_code, {})
                    self.accusation_tracker[room_code][target_id_str] = (
                        self.accusation_tracker[room_code].get(target_id_str, 0) + 1
                    )

                messages_sent += 1

                await broadcast_func(room_code, {
                    "type": "CHAT_MESSAGE",
                    "payload": {
                        "channel": channel,
                        "sender_id": bot_id_str,
                        "sender_name": bot_name,
                        "message": msg_text,
                        "timestamp": time.time()
                    }
                })

        except asyncio.CancelledError:
            pass

    async def _bot_decision_submission(self, room_code: str, bot_id: int, bot_role: str, gs, room, broadcast_func):
        """
        Schedules decision voting submission for Detective and Investigator bots.
        Submits within randomized point (30% - 90%) of phase time window.
        Includes a safety fallback near phase timeout.
        """
        bot_id_str = str(bot_id)

        try:
            # 60-second phase duration window: 30% = 18s, 90% = 54s
            delay = random.uniform(18.0, 52.0)
            await asyncio.sleep(delay)

            if not gs.is_active:
                return

            await self._execute_bot_decision(room_code, bot_id_str, bot_role, gs, room, broadcast_func)

        except asyncio.CancelledError:
            pass

    async def _execute_bot_decision(self, room_code: str, bot_id_str: str, bot_role: str, gs, room, broadcast_func):
        """Executes actual decision submission with weighted random target pick."""
        if not hasattr(gs, 'decision_votes'):
            gs.decision_votes = {
                'detective_choice': None,
                'investigator_choices': {},
                'submitted_detective': False,
                'submitted_investigators': set(),
            }

        # Check if already submitted
        if bot_role == 'DETECTIVE' and gs.decision_votes['submitted_detective']:
            return
        if bot_role == 'INVESTIGATOR' and bot_id_str in gs.decision_votes['submitted_investigators']:
            return

        # Valid targets excluding self
        valid_targets = [
            str(pid) for pid in room.players.keys()
            if str(pid) != bot_id_str
        ]

        if not valid_targets:
            return

        # Pick target using weighted random logic (heuristic boost from accusations)
        persona = self.bot_personas.get(room_code, {}).get(bot_id_str, 'neutral')
        target_choice = self.pick_bot_target(bot_id_str, persona, valid_targets, room_code)

        if bot_role == 'DETECTIVE':
            gs.decision_votes['detective_choice'] = target_choice
            gs.decision_votes['submitted_detective'] = True
        elif bot_role == 'INVESTIGATOR':
            gs.decision_votes['investigator_choices'][bot_id_str] = target_choice
            gs.decision_votes['submitted_investigators'].add(bot_id_str)

        # Broadcast submission receipt
        await broadcast_func(room_code, {
            "type": "DECISION_SUBMITTED",
            "payload": {
                "role": bot_role,
                "voter_id": bot_id_str
            }
        })

        # Check if all active players (human + bot) have submitted
        active_investigators = {
            p_id_k for p_id_k, r in gs.assignments.items()
            if r == "INVESTIGATOR" and int(p_id_k) in room.players
        }
        has_detective = any(r == "DETECTIVE" for r in gs.assignments.values())

        detective_done = not has_detective or gs.decision_votes['submitted_detective']
        investigators_done = active_investigators.issubset(gs.decision_votes['submitted_investigators'])

        if detective_done and investigators_done:
            player_names = {str(pid): p.username for pid, p in room.players.items()}
            db = SessionLocal()
            try:
                result = resolve_game(
                    room_code=room_code,
                    assignments=gs.assignments,
                    mastermind_id=gs.mastermind_id,
                    conspirator_id=gs.conspirator_id,
                    accusation={
                        "conspirator_accusation": gs.decision_votes['detective_choice'],
                    },
                    player_names=player_names,
                    session_db_id=getattr(gs, 'db_session_id', None),
                    db=db,
                    investigator_choices=gs.decision_votes['investigator_choices'],
                )
                db.commit()
            finally:
                db.close()

            gs.is_active = False
            room.status = "finished"
            await broadcast_func(room_code, {
                "type": "GAME_OVER",
                "payload": result
            })

    def pick_bot_target(self, bot_id_str: str, persona: str, valid_targets: List[str], room_code: str) -> str:
        """
        Weighted random heuristic target selection.
        Boosts probability weight for candidates that were accused in chat.
        """
        boost_per_accusation = 0.3 if persona == 'aggressive' else (0.2 if persona == 'neutral' else 0.1)
        accusations = self.accusation_tracker.get(room_code, {})

        weights = []
        for target in valid_targets:
            acc_count = accusations.get(target, 0)
            weight = 1.0 + (acc_count * boost_per_accusation)
            weights.append(weight)

        chosen = random.choices(valid_targets, weights=weights, k=1)[0]
        return chosen


bot_manager = BotManager()
