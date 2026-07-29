import time as _time
import asyncio
import math
import random as _rnd
# pyrefly: ignore [missing-import]
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Optional
from jose import jwt, JWTError

from app.core.config import settings
from app.core import security
from app.api.v1.api import api_router
from app.game.lobby_manager import lobby_manager, PlayerLobbyState
from app.game.role_service import assign_roles
from app.game.evidence_manager import evidence_manager
from app.game.task_manager import task_manager, AREA_WORLD_POSITIONS
from app.game.npc_manager import npc_manager
from app.game.ability_manager import ability_manager
from app.game.meeting_manager import meeting_manager
from app.game.resolution_service import resolve_game
from app.game.cctv_service import get_or_create_cctv_engine, cleanup_cctv_engine
from app.game.correlation_engine import correlation_engine
from app.game.suspect_dossier_service import suspect_dossier_engine
from app.game.bot_chat_service import bot_chat_service
from app.game.bot_manager import bot_manager
from app.db.base import Base


from app.db.session import engine, SessionLocal


def verify_ws_token(token: str, expected_user_id: int) -> bool:
    """Validate a JWT and confirm its subject matches expected_user_id."""
    if not token:
        return False
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[security.ALGORITHM])
        return int(payload.get("sub", -1)) == expected_user_id
    except (JWTError, ValueError):
        return False

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.include_router(api_router, prefix=settings.API_V1_STR)

# CORS configuration for development and production (Vercel + custom origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# ── Create all DB tables on startup ──
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


# ──────────────────────────────────────────────────────────────
# In-memory game session state (per room)
# ──────────────────────────────────────────────────────────────
class GameSessionState:
    def __init__(self):
        self.assignments: Dict[str, str] = {}       # player_id -> role
        self.mastermind_id: Optional[str] = None
        self.conspirator_id: Optional[str] = None
        self.modifiers: dict = {}
        self.started_at: float = 0.0
        self.is_active: bool = False
        self.correlations_log: List[dict] = []     # server-side store of correlation evaluation dicts
        self.movement_traces: Dict[str, list] = {}  # player_id -> list of visited area presence dicts

    @property
    def elapsed_seconds(self) -> int:
        if not self.is_active:
            return 0
        return int(_time.time() - self.started_at)

# room_code -> GameSessionState
active_game_states: Dict[str, GameSessionState] = {}
active_game_loops: Dict[str, asyncio.Task] = {}


async def push_dossier_update(room_code: str, gs: GameSessionState):
    """Helper to build and send a refreshed suspect dossier to the Detective."""
    detective_id = next(
        (int(pid) for pid, role in gs.assignments.items() if role == 'DETECTIVE'), None
    )
    if detective_id:
        cctv = get_or_create_cctv_engine(room_code)
        dossier = suspect_dossier_engine.build_dossier(
            room_code=room_code,
            player_ids=list(gs.assignments.keys()),
            assignments=gs.assignments,
            evidence_manager=evidence_manager,
            cctv_engine=cctv,
            correlations=gs.correlations_log,
            movement_traces=gs.movement_traces,
        )
        await send_to_player(room_code, detective_id, {
            "type": "SUSPECT_DOSSIER_UPDATE",
            "payload": {"suspects": dossier}
        })


import logging
logger = logging.getLogger(__name__)

BOT_WAYPOINTS = [
    {"area": "Computer Lab", "position": [34.5, 0.5, 3.5]},
    {"area": "Research Center", "position": [-30.5, 0.5, 43]},
    {"area": "Security Office", "position": [-31.5, 0.5, 18]},
    {"area": "MCA Department", "position": [19, 0.5, 18]},
    {"area": "Main Block", "position": [-9, 0.5, -6]},
    {"area": "Auditorium", "position": [-12, 0.5, -38]},
    {"area": "Library", "position": [-30.5, 0.5, 29.5]},
    {"area": "Cafeteria", "position": [34, 0.5, -22]}
]

async def force_resolve_decision_phase(room_code: str, gs, room, broadcast_func):

    """
    Force-resolves the Decision Phase using whatever votes exist so far.
    Called when Decision Phase timer expires or when all active voters submit.
    """
    if getattr(gs, 'decision_resolved', False):
        return
    gs.decision_resolved = True
    gs.decision_phase_active = False

    if not hasattr(gs, 'decision_votes'):
        gs.decision_votes = {
            'detective_choice': None,
            'investigator_choices': {},
            'submitted_detective': False,
            'submitted_investigators': set(),
        }

    player_names = {str(pid): p.username for pid, p in room.players.items()}
    accusation = {
        "conspirator_accusation": gs.decision_votes['detective_choice'],
    }

    db = SessionLocal()
    try:
        result = resolve_game(
            room_code=room_code,
            assignments=gs.assignments,
            mastermind_id=gs.mastermind_id,
            conspirator_id=gs.conspirator_id,
            accusation=accusation,
            player_names=player_names,
            session_db_id=getattr(gs, 'db_session_id', None),
            db=db,
            investigator_choices=gs.decision_votes['investigator_choices'],
        )
        db.commit()
    except Exception as e:
        logger.error(f"[Resolution] Error in force_resolve_decision_phase for room {room_code}: {e}", exc_info=True)
        result = {
            'winner_faction': 'VILLAINS',
            'correct_accusation': False,
            'winningRoles': ['MASTERMIND', 'CONSPIRATOR'],
            'mastermind_id': gs.mastermind_id,
            'conspirator_id': gs.conspirator_id,
            'actualConspirator': {'id': gs.conspirator_id, 'name': player_names.get(gs.conspirator_id, 'Conspirator')},
            'actualMastermind': {'id': gs.mastermind_id, 'name': player_names.get(gs.mastermind_id, 'Mastermind')},
            'detective': {'playerId': None, 'guess': None, 'guessName': None, 'correct': False},
            'investigators': {'success': False, 'finalGuess': None, 'finalGuessName': None, 'voteCounts': {}, 'correct': False, 'failMessage': 'The Investigators could not reach a majority decision.'},
            'player_stats': [],
            'all_roles': gs.assignments,
            'player_names': player_names,
        }
    finally:
        db.close()

    gs.is_active = False
    room.status = "finished"
    await broadcast_func(room_code, {
        "type": "GAME_OVER",
        "payload": result
    })


async def run_authoritative_game_loop(room_code: str):
    logger.info(f"[Game Loop] Starting authoritative loop for room {room_code}")
    try:
        while True:
            gs = active_game_states.get(room_code)
            room = lobby_manager.get_room(room_code)
            if not gs or not room or room.status != "playing" or not gs.is_active:
                logger.info(f"[Game Loop] Terminating for room {room_code}. Status: {room.status if room else 'None'}")
                break

            try:
                # 1. Authoritative Elapsed time check
                elapsed = int(_time.time() - gs.started_at)
                timer_limit = gs.modifiers.get('timer_seconds', 600)
                time_remaining = max(0, timer_limit - elapsed)

                # Periodic health logging every 30 seconds
                if elapsed > 0 and elapsed % 30 == 0:
                    bot_count = len([p for p in room.players.values() if p.player_id >= 9000])
                    logger.info(f"[Game Loop] Room {room_code} tick {elapsed}s — {bot_count} bots active")

                # Broadcast timer update
                await broadcast_to_room(room_code, {
                    "type": "MATCH_TIMER_UPDATE",
                    "payload": {
                        "time_remaining": time_remaining,
                        "elapsed": elapsed
                    }
                })

                # 2. Check active meeting
                mtg = meeting_manager.get_active_meeting(room_code)
                if mtg:
                    mtg_elapsed = int(_time.time() - mtg.started_at)
                    mtg_remaining = max(0, MEETING_DURATION - mtg_elapsed)
                    
                    # Broadcast meeting timer update
                    await broadcast_to_room(room_code, {
                        "type": "MEETING_TIMER_UPDATE",
                        "payload": {
                            "time_remaining": mtg_remaining
                        }
                    })

                    if mtg_remaining <= 0 and mtg.is_active:
                        # Auto end meeting when expired
                        meeting_manager.end_meeting(room_code)
                        await broadcast_to_room(room_code, {
                            "type": "MEETING_ENDED",
                            "payload": {"resumed": True}
                        })

                # 3. Check midpoint meeting (runs at 10 minutes / 600s elapsed)
                if meeting_manager.check_midpoint(room_code, elapsed):
                    new_mtg = meeting_manager.start_meeting(room_code, "SYSTEM")
                    if new_mtg:
                        await broadcast_to_room(room_code, {
                            "type": "MEETING_STARTED",
                            "payload": {**new_mtg.to_dict(), "triggered_by": "MIDPOINT"}
                        })

                # 4. Tick NPCs
                npc_manager.tick_npc_movements(room_code, dt=1.0)
                await broadcast_to_room(room_code, {
                    "type": "NPC_POSITIONS",
                    "payload": {
                        "npcs": npc_manager.get_room_npcs(room_code)
                    }
                })

                # 5. Update player area durations (for Research Center presence check)
                if hasattr(gs, 'player_positions'):
                    for p_pid, pstate in gs.player_positions.items():
                        c_area = pstate.get('area', 'Unknown')
                        dur_dict = pstate.setdefault('durations', {})
                        dur_dict[c_area] = dur_dict.get(c_area, 0) + 1

                # 6. Check observations every 10 seconds
                if hasattr(gs, 'player_positions'):
                    npc_manager.obs_tick_counters[room_code] = npc_manager.obs_tick_counters.get(room_code, 0) + 1
                    if npc_manager.obs_tick_counters[room_code] >= 10:
                        npc_manager.obs_tick_counters[room_code] = 0
                        npc_manager.run_observation_check(room_code, gs.player_positions, elapsed)

                # 6.5. Tick Bot Players (if present)
                bot_players = [p for p in room.players.values() if p.player_id >= 9000]
                if bot_players:
                    if not hasattr(gs, 'bot_states'):
                        gs.bot_states = {}
                    for bot in bot_players:
                        try:
                            bot_id_str = str(bot.player_id)
                            initial_bot_pos = [0.0, 0.5, -35.0]
                            if hasattr(gs, 'player_positions') and bot_id_str in gs.player_positions:
                                initial_bot_pos = list(gs.player_positions[bot_id_str].get('position', [0.0, 0.5, -35.0]))

                            bot_st = gs.bot_states.setdefault(bot_id_str, {
                                'target_idx': _rnd.randint(0, len(BOT_WAYPOINTS) - 1),
                                'curr_pos': initial_bot_pos,
                                'task_arrival_hold': 0
                            })

                            # Determine bot's next task destination
                            bot_tasks = task_manager.get_player_tasks(room_code, bot_id_str)
                            pending_tasks = [t for t in bot_tasks if not t.get('completed')]

                            active_task = None
                            target_wp = None

                            if pending_tasks:
                                active_task = pending_tasks[0]
                                target_area_name = active_task.get('area') or active_task.get('location')
                                target_wp = next((w for w in BOT_WAYPOINTS if w['area'] == target_area_name), None)
                                if not target_wp:
                                    logger.warning(f"[Bot] Task area '{target_area_name}' for bot {bot_id_str} not found in BOT_WAYPOINTS; falling back to wander.")

                            # Fallback to idle wander if no pending tasks or unmapped location
                            if not target_wp:
                                target_wp = BOT_WAYPOINTS[bot_st.get('target_idx', 0) % len(BOT_WAYPOINTS)]

                            tx, ty, tz = target_wp['position']
                            cx, cy, cz = bot_st['curr_pos']
                            dx = tx - cx
                            dz = tz - cz
                            dist = (dx * dx + dz * dz) ** 0.5

                            if dist < 1.5:
                                if active_task:
                                    # Bot has ARRIVED at the task location — only now progress task
                                    bot_st['task_arrival_hold'] = bot_st.get('task_arrival_hold', 0) + 1
                                    if bot_st['task_arrival_hold'] >= 3:
                                        bot_st['task_arrival_hold'] = 0
                                        updated = task_manager.update_task_progress(room_code, bot_id_str, active_task['task_id'], 0.35)
                                        if updated:
                                            if updated.get('completed'):
                                                logger.info(f"[Bot] Bot {bot_id_str} completed task '{updated['name']}' at {target_wp['area']}")
                                                await broadcast_to_room(room_code, {
                                                    "type": "TASK_COMPLETED",
                                                    "payload": {"player_id": bot_id_str, "task": updated}
                                                })
                                            global_progress = task_manager.get_room_completion_percent(room_code)
                                            await broadcast_to_room(room_code, {
                                                "type": "GLOBAL_TASK_PROGRESS",
                                                "payload": global_progress
                                            })
                                            if global_progress.get('percent', 0) >= 100:
                                                if not meeting_manager.get_active_meeting(room_code):
                                                    mtg = meeting_manager.start_meeting(room_code, "TASKS_COMPLETED")
                                                    if mtg:
                                                        await broadcast_to_room(room_code, {
                                                            "type": "MEETING_STARTED",
                                                            "payload": {
                                                                **mtg.to_dict(),
                                                                "triggered_by": "TASKS_COMPLETED",
                                                                "time_remaining": 120,
                                                                "topic": "Discuss who the Conspirator and Mastermind are!"
                                                            }
                                                        })
                                else:
                                    # No pending tasks — idle wander waypoint cycling
                                    bot_st['target_idx'] = (bot_st.get('target_idx', 0) + 1) % len(BOT_WAYPOINTS)
                                    bot_st['task_arrival_hold'] = 0
                            else:
                                # Walking toward target location
                                speed = 1.6
                                bot_st['curr_pos'][0] += (dx / dist) * speed
                                bot_st['curr_pos'][2] += (dz / dist) * speed
                                bot_st['task_arrival_hold'] = 0

                            rot = math.atan2(dx, dz) if dist >= 0.001 else 0.0
                            if not hasattr(gs, 'player_positions'):
                                gs.player_positions = {}
                            gs.player_positions[bot_id_str] = {
                                'position': bot_st['curr_pos'],
                                'rotation': rot,
                                'area': target_wp['area'],
                                'durations': {}
                            }

                            # Broadcast bot movement so client renders bot walking the full path on 3D canvas & radar map
                            await broadcast_to_room(room_code, {
                                "type": "PLAYER_MOVED",
                                "payload": {
                                    "player_id": bot_id_str,
                                    "position": bot_st['curr_pos'],
                                    "rotation": rot,
                                    "area": target_wp['area']
                                }
                            })
                        except Exception as bot_error:
                            logger.error(f"[Bot] Error ticking bot {bot.player_id} in room {room_code}: {bot_error}", exc_info=True)
                            continue


                # 6.6 Autonomous Bot Chat Tick
                bot_players_list = [{'id': p.player_id, 'name': p.username} for p in room.players.values() if p.player_id >= 9000]
                if bot_players_list:
                    if not hasattr(gs, 'bot_chat_timer'):
                        gs.bot_chat_timer = 0
                    gs.bot_chat_timer += 1
                    chat_interval = 18 if (mtg and mtg.is_active) else 35
                    if gs.bot_chat_timer >= chat_interval:
                        gs.bot_chat_timer = 0
                        channel = 'meeting' if (mtg and mtg.is_active) else 'public'
                        bot_msg = bot_chat_service.get_autonomous_message(
                            room_code, gs.assignments, bot_players_list, channel=channel
                        )
                        if bot_msg:
                            if channel == 'villain':
                                vids = [int(p) for p, r in gs.assignments.items() if r in ("MASTERMIND", "CONSPIRATOR")]
                                for vid in vids:
                                    await send_to_player(room_code, vid, {"type": "CHAT_MESSAGE", "payload": bot_msg})
                            else:
                                await broadcast_to_room(room_code, {"type": "CHAT_MESSAGE", "payload": bot_msg})

                # 6.8 Decision Phase Countdown & Force Resolution Tick
                if getattr(gs, 'decision_phase_active', False) and not getattr(gs, 'decision_resolved', False):
                    if hasattr(gs, 'decision_phase_deadline'):
                        d_remaining = max(0, int(gs.decision_phase_deadline - _time.time()))
                        await broadcast_to_room(room_code, {
                            "type": "DECISION_TIMER_UPDATE",
                            "payload": {"time_remaining": d_remaining}
                        })
                        if d_remaining <= 0:
                            await force_resolve_decision_phase(room_code, gs, room, broadcast_to_room)

                # 7. Check match exploration timer expiration -> trigger Decision Phase
                if elapsed >= timer_limit and not getattr(gs, 'decision_phase_active', False) and not getattr(gs, 'decision_resolved', False):
                    gs.decision_phase_active = True
                    gs.decision_resolved = False
                    gs.decision_phase_deadline = _time.time() + 10.0
                    bot_manager.on_phase_change(room_code, 'decision', gs, room, broadcast_to_room, send_to_player)
                    await broadcast_to_room(room_code, {
                        "type": "DECISION_PHASE",
                        "payload": {"status": "started", "reason": "TIME_EXPIRED", "time_remaining": 10}
                    })


            except Exception as tick_error:
                logger.error(
                    f"[Game Loop] Tick error in room {room_code}: {tick_error}",
                    exc_info=True
                )

            await asyncio.sleep(1.0)
    except asyncio.CancelledError:
        logger.info(f"[Game Loop] Authoritative loop for room {room_code} cancelled")
    except Exception as e:
        logger.error(f"[Game Loop] Error in room {room_code}: {e}", exc_info=True)
    finally:
        if room_code in active_game_loops:
            del active_game_loops[room_code]


# Reconnection tracking: room_code -> {pid_str: disconnect_timestamp}
disconnected_players: Dict[str, Dict[str, float]] = {}
RECONNECT_GRACE_SECONDS = 60


# ──────────────────────────────────────────────────────────────
# WebSocket broadcast helpers
# ──────────────────────────────────────────────────────────────
async def broadcast_to_room(room_code: str, message: dict):
    """Send a message to every connected player in the room."""
    room = lobby_manager.get_room(room_code)
    if not room:
        return
    for player in list(room.players.values()):
        if player.websocket:
            try:
                await player.websocket.send_json(message)
            except Exception:
                pass


async def send_to_player(room_code: str, player_id: int, message: dict):
    """Send a private message to one specific player."""
    room = lobby_manager.get_room(room_code)
    if not room:
        return
    player = room.players.get(player_id)
    if player and player.websocket:
        try:
            await player.websocket.send_json(message)
        except Exception:
            pass


# ──────────────────────────────────────────────────────────────
# Health endpoints
# ──────────────────────────────────────────────────────────────
@app.get("/")
def read_root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API Server",
        "environment": settings.ENVIRONMENT,
        "status": "healthy"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}


# ──────────────────────────────────────────────────────────────
# Lobby WebSocket — waiting room management
# ──────────────────────────────────────────────────────────────
@app.websocket("/ws/lobby/{room_code}/{player_id}")
async def websocket_lobby_endpoint(websocket: WebSocket, room_code: str, player_id: str, token: str = ""):
    await websocket.accept()
    room_code = room_code.strip().upper()

    try:
        p_id_check = int(player_id)
    except ValueError:
        await websocket.send_json({"type": "ERROR", "payload": {"message": "Invalid player ID."}})
        await websocket.close(code=1008)
        return

    if not verify_ws_token(token, p_id_check):
        await websocket.send_json({"type": "ERROR", "payload": {"message": "Invalid or missing auth token."}})
        await websocket.close(code=1008)
        return

    p_id = p_id_check  # already validated above

    room = lobby_manager.get_room(room_code)
    if not room:
        await websocket.send_json({"type": "ERROR", "payload": {"message": f"Room '{room_code}' not found."}})
        await websocket.close(code=1008)
        return

    player = room.players.get(p_id)
    if not player:
        await websocket.send_json({"type": "ERROR", "payload": {"message": f"Player {player_id} not in room {room_code}."}})
        await websocket.close(code=1008)
        return

    player.websocket = websocket
    await lobby_manager.broadcast_state(room_code)

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")

            if action == "TOGGLE_READY":
                lobby_manager.toggle_ready(room_code, p_id)
                await lobby_manager.broadcast_state(room_code)

            elif action == "START_GAME":
                if room.host_id != p_id:
                    continue
                # Verify required player count has joined
                if room.max_players > 1 and len(room.players) < room.max_players:
                    await websocket.send_json({
                        "type": "ERROR",
                        "payload": {"message": f"Waiting for all {room.max_players} players to join the room before starting ({len(room.players)}/{room.max_players})."}
                    })
                    continue

                # Verify all non-host players are ready
                non_host_players = [p for p in room.players.values() if p.player_id != room.host_id]
                if not all(p.is_ready for p in non_host_players):
                    await websocket.send_json({"type": "ERROR", "payload": {"message": "Waiting for all players to be ready."}})
                    continue
                players = list(room.players.keys())
                if len(players) < 1:
                    await websocket.send_json({"type": "ERROR", "payload": {"message": "At least 1 player is required to start the game."}})
                    continue

                # Fill remaining slots up to 4 with Bot players so there are 4 distinct roles
                bot_initial_positions = [
                    [12.0, 0.5, -10.0],
                    [-10.0, 0.5, 15.0],
                    [20.0, 0.5, 5.0]
                ]
                if len(players) < 4:
                    dummy_count = 1
                    bot_names = ["Agent Maya (Bot)", "Officer Alex (Bot)", "Dr. Viktor (Bot)"]
                    while len(players) < 4:
                        dummy_id = 9000 + dummy_count
                        dummy_name = bot_names[(dummy_count - 1) % len(bot_names)]
                        room.players[dummy_id] = PlayerLobbyState(dummy_id, dummy_name)
                        room.players[dummy_id].is_ready = True
                        players.append(dummy_id)
                        dummy_count += 1

                # Assign roles
                player_ids_str = [str(pid) for pid in players]
                result = assign_roles(player_ids_str, difficulty=room.difficulty)

                # Store game state
                # Create DB Game Session row
                db_session = SessionLocal()
                db_session_id = None
                try:
                    from app.db.models.game import GameSession
                    db_gs = GameSession(status="playing", difficulty=room.difficulty)
                    db_session.add(db_gs)
                    db_session.commit()
                    db_session.refresh(db_gs)
                    db_session_id = db_gs.id
                except Exception as e:
                    print(f"Failed to create GameSession in DB: {e}")
                finally:
                    db_session.close()

                gs = GameSessionState()
                gs.db_session_id = db_session_id
                gs.assignments = result['assignments']
                gs.mastermind_id = result['mastermind_id']
                gs.conspirator_id = result['conspirator_id']
                gs.modifiers = result['modifiers']
                gs.started_at = _time.time()
                gs.is_active = True
                gs.player_positions = {}
                gs.bot_states = {}

                # Pre-populate bot positions so they are visible from frame 1
                bot_idx = 0
                for pid in players:
                    if pid >= 9000:
                        b_pos = bot_initial_positions[bot_idx % len(bot_initial_positions)]
                        gs.player_positions[str(pid)] = {
                            'position': b_pos,
                            'rotation': 0.0,
                            'area': 'Campus',
                            'durations': {}
                        }
                        gs.bot_states[str(pid)] = {
                            'target_idx': bot_idx % len(BOT_WAYPOINTS),
                            'curr_pos': list(b_pos),
                            'progress_timer': 0
                        }
                        bot_idx += 1
                active_game_states[room_code] = gs

                # Generate world data
                player_names = {str(pid): p.username for pid, p in room.players.items()}
                npc_manager.spawn_npcs_for_room(room_code)
                evidence_manager.generate_evidence_for_room(
                    room_code, player_ids_str, result['assignments'],
                    difficulty=room.difficulty, modifiers=result['modifiers']
                )
                task_manager.assign_tasks_for_room(room_code, result['assignments'])
                ability_manager.assign_abilities(room_code, result['assignments'], difficulty=room.difficulty)

                # Initialise CCTV engine and assign colors for this room
                cctv = get_or_create_cctv_engine(room_code)
                for pid_str in player_ids_str:
                    cctv.assign_player_color(pid_str)

                # Update lobby status
                room.status = "playing"

                # Send private role reveal to each player
                for pid_str, reveal in result['reveals'].items():
                    pid_int = int(pid_str)
                    partner_name = player_names.get(reveal['partner_id']) if reveal.get('partner_id') else None
                    await send_to_player(room_code, pid_int, {
                        "type": "ROLE_REVEAL",
                        "payload": {
                            **reveal,
                            "partner_name": partner_name,
                            "timer_seconds": result['modifiers']['timer_seconds'],
                            "difficulty": room.difficulty,
                        }
                    })

                # Broadcast game started to all
                await broadcast_to_room(room_code, {
                    "type": "GAME_STARTED",
                    "payload": {
                        "npcs": npc_manager.get_room_npcs(room_code),
                        "timer_seconds": result['modifiers']['timer_seconds'],
                    }
                })

                # Send each player their personalized GAME_STATE
                all_evidence_public = [
                    e.to_dict() for e in evidence_manager.get_room_evidence(room_code)
                    if not e.is_destroyed
                ]
                for pid_str2, role2 in result['assignments'].items():
                    pid_int2 = int(pid_str2)
                    player_tasks = task_manager.get_player_tasks(room_code, pid_str2)
                    player_abilities = ability_manager.get_player_abilities(room_code, pid_str2)
                    await send_to_player(room_code, pid_int2, {
                        "type": "GAME_STATE",
                        "payload": {
                            "tasks": player_tasks,
                            "abilities": player_abilities,
                            "evidence": all_evidence_public,
                            "role": role2,
                        }
                    })
                
                # Trigger BotManager for exploration phase
                bot_manager.on_phase_change(room_code, 'exploration', gs, room, broadcast_to_room, send_to_player)

                # Start authoritative background game loop
                active_game_loops[room_code] = asyncio.create_task(run_authoritative_game_loop(room_code))


    except WebSocketDisconnect:
        player.websocket = None
        await lobby_manager.broadcast_state(room_code)


# ──────────────────────────────────────────────────────────────
# Game WebSocket — live gameplay events
# ──────────────────────────────────────────────────────────────
@app.websocket("/ws/game/{room_code}/{player_id}")
async def websocket_game_endpoint(websocket: WebSocket, room_code: str, player_id: str, token: str = ""):
    await websocket.accept()
    room_code = room_code.strip().upper()

    try:
        p_id_check = int(player_id)
    except ValueError:
        await websocket.send_json({"type": "ERROR", "payload": {"message": "Invalid player ID."}})
        await websocket.close(code=1008)
        return

    if not verify_ws_token(token, p_id_check):
        await websocket.send_json({"type": "ERROR", "payload": {"message": "Invalid or missing auth token."}})
        await websocket.close(code=1008)
        return

    room = lobby_manager.get_room(room_code)
    if not room:
        await websocket.send_json({"type": "ERROR", "payload": {"message": f"Room '{room_code}' not found. Join via lobby first."}})
        await websocket.close(code=1008)
        return

    try:
        p_id = int(player_id)
    except ValueError:
        await websocket.send_json({"type": "ERROR", "payload": {"message": "Invalid player ID."}})
        await websocket.close(code=1008)
        return

    player = room.players.get(p_id)
    if not player:
        await websocket.send_json({"type": "ERROR", "payload": {"message": f"Player {player_id} not in room {room_code}."}})
        await websocket.close(code=1008)
        return

    # Reconnection handling — clear grace period entry if this player was disconnected
    pid_str_early = str(p_id)
    if room_code in disconnected_players and pid_str_early in disconnected_players[room_code]:
        del disconnected_players[room_code][pid_str_early]
        player.websocket = websocket
        await broadcast_to_room(room_code, {
            "type": "PLAYER_RECONNECTED",
            "payload": {"player_id": pid_str_early}
        })
    else:
        player.websocket = websocket

    gs = active_game_states.get(room_code)
    if not gs:
        # Game not started yet — send waiting status and keep connection open
        await websocket.send_json({"type": "WAITING", "payload": {"message": "Waiting for game to start..."}})
        # Keep alive until disconnected
        try:
            while True:
                await websocket.receive_text()
                gs = active_game_states.get(room_code)
                if gs:
                    break
        except WebSocketDisconnect:
            player.websocket = None
            return

    player_names = {str(pid): p.username for pid, p in room.players.items()}
    pid_str = str(p_id)
    role = gs.assignments.get(pid_str)
    if role:
        reveal = {
            'role': role,
            'partner_id': gs.conspirator_id if role == 'MASTERMIND' else (gs.mastermind_id if role == 'CONSPIRATOR' else None),
            'partner_role': 'CONSPIRATOR' if role == 'MASTERMIND' else ('MASTERMIND' if role == 'CONSPIRATOR' else None),
        }
        partner_name = player_names.get(reveal['partner_id']) if reveal.get('partner_id') else None
        
        # 1. Send private role reveal
        await websocket.send_json({
            "type": "ROLE_REVEAL",
            "payload": {
                **reveal,
                "partner_name": partner_name,
                "timer_seconds": gs.modifiers.get('timer_seconds', 600),
                "difficulty": room.difficulty,
            }
        })
        
        # 2. Send personalized game state
        player_tasks = task_manager.get_player_tasks(room_code, pid_str)
        player_abilities = ability_manager.get_player_abilities(room_code, pid_str)
        all_evidence_public = [
            e.to_dict() for e in evidence_manager.get_room_evidence(room_code)
            if not e.is_destroyed
        ]
        # Calculate synchronized authoritative timer state
        timer_limit = gs.modifiers.get('timer_seconds', 600)
        elapsed = int(_time.time() - gs.started_at)
        time_remaining = max(0, timer_limit - elapsed)
        mtg = meeting_manager.get_active_meeting(room_code)
        meeting_active = mtg is not None
        meeting_time_remaining = 0
        if mtg:
            mtg_elapsed = int(_time.time() - mtg.started_at)
            meeting_time_remaining = max(0, MEETING_DURATION - mtg_elapsed)

        # Include current positions of all other players in room
        other_players_data = {}
        if hasattr(gs, 'player_positions'):
            for other_pid, pos_info in gs.player_positions.items():
                if str(other_pid) != pid_str:
                    other_players_data[str(other_pid)] = pos_info

        await websocket.send_json({
            "type": "GAME_STATE",
            "payload": {
                "tasks": player_tasks,
                "abilities": player_abilities,
                "evidence": all_evidence_public,
                "role": role,
                "time_remaining": time_remaining,
                "game_phase": "meeting" if meeting_active else "exploration",
                "meeting_active": meeting_active,
                "meeting_time_remaining": meeting_time_remaining,
                "other_players": other_players_data,
                "all_players": {
                    str(pid): {"username": p.username, "role": gs.assignments.get(str(pid))}
                    for pid, p in room.players.items()
                }
            }
        })

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")
            pid_str = str(p_id)

            # ── Position update (broadcast to all) ──
            if action == "POSITION_UPDATE" or action == "PLAYER_MOVE":
                pos = data.get("position")
                rot = data.get("rotation")
                area = data.get("area", "Unknown")

                if gs:
                    if not hasattr(gs, 'player_positions'):
                        gs.player_positions = {}
                    if pid_str not in gs.player_positions:
                        gs.player_positions[pid_str] = {
                            'position': pos,
                            'rotation': rot,
                            'area': area,
                            'durations': {}
                        }
                    else:
                        gs.player_positions[pid_str]['position'] = pos
                        gs.player_positions[pid_str]['rotation'] = rot
                        gs.player_positions[pid_str]['area'] = area

                await broadcast_to_room(room_code, {
                    "type": "PLAYER_MOVED",
                    "payload": {
                        "player_id": pid_str,
                        "position": pos,
                        "rotation": rot,
                        "area": area
                    }
                })

            # ── Collect evidence ──
            elif action == "COLLECT_EVIDENCE":
                ev_id = data.get("evidence_id")
                client_pos = data.get("position")
                all_ev = evidence_manager.get_room_evidence(room_code)
                ev_item = next((e for e in all_ev if e.evidence_id == ev_id), None)
                if not ev_item:
                    continue

                def _extract_xz(p):
                    if isinstance(p, dict):
                        return float(p.get('x', 0.0)), float(p.get('z', 0.0))
                    elif isinstance(p, (list, tuple)) and len(p) >= 3:
                        return float(p[0]), float(p[2])
                    return 0.0, 0.0

                # Update position if provided in payload
                if client_pos and gs:
                    gs.player_positions.setdefault(pid_str, {})['position'] = client_pos

                # Server-side distance validation
                player_pos_data = getattr(gs, 'player_positions', {}).get(pid_str)
                if player_pos_data and 'position' in player_pos_data:
                    px, pz = _extract_xz(player_pos_data['position'])
                    ex, ez = _extract_xz(ev_item.position)
                    dx = px - ex
                    dz = pz - ez
                    dist = (dx * dx + dz * dz) ** 0.5
                    # Validate that player is within reasonable collect radius (e.g. 5.5 units including latency buffer)
                    if dist > 5.5:
                        await send_to_player(room_code, p_id, {
                            "type": "ERROR",
                            "payload": {"message": "Too far away to collect evidence."}
                        })
                        continue

                item = evidence_manager.collect_evidence(room_code, ev_id, pid_str)

                if item:
                    # Log action for NPC observation system
                    npc_manager.log_player_action(room_code, pid_str, 'EVIDENCE_COLLECTED', item.area)
                    await broadcast_to_room(room_code, {
                        "type": "EVIDENCE_COLLECTED",
                        "payload": {"evidence": item.to_dict(), "collector_id": pid_str}
                    })
                    # Send collector private role-aware evidence card
                    collector_role = gs.assignments.get(pid_str, "INVESTIGATOR")
                    await send_to_player(room_code, p_id, {
                        "type": "EVIDENCE_CARD",
                        "payload": item.to_player_card(viewer_role=collector_role)
                    })
                    # Update detective's board privately
                    detective_id = next(
                        (int(pid) for pid, role in gs.assignments.items() if role == 'DETECTIVE'), None
                    )
                    if detective_id:
                        await send_to_player(room_code, detective_id, {
                            "type": "EVIDENCE_BOARD_UPDATE",
                            "payload": evidence_manager.get_detective_board(room_code)
                        })
                        await push_dossier_update(room_code, gs)


            # ── CCTV movement recording (called by client every 5s) ──
            elif action == "RECORD_MOVEMENT":
                cctv = get_or_create_cctv_engine(room_code)
                cctv.record_movement(
                    player_id=pid_str,
                    position=data.get("position", {}),
                    area=data.get("area", "Unknown"),
                    game_timestamp=gs.elapsed_seconds,
                )

            # ── Use ability ──
            elif action == "USE_ABILITY":
                ability_id = data.get("ability_id")
                target_player = data.get("target_player_id")
                target_area = data.get("target_area")
                target_npc = data.get("target_npc_id")

                # Server-side role gate — mirror ability_manager.py ABILITY_DEFINITIONS
                DETECTIVE_ONLY = {"CCTV_ANALYSIS", "CORRELATE_EVIDENCE", "DIGITAL_ANALYSIS", "RECOVER_LOGS", "MOVEMENT_TRACE"}
                VILLAIN_ONLY   = {"PLANT_FAKE_EVIDENCE", "DESTROY_EVIDENCE", "TRIGGER_MEETING",
                                  "MANIPULATE_NPC", "FRAME_PLAYER", "SECURE_PERIMETER", "CREATE_ALIBI"}
                player_role = gs.assignments.get(pid_str)
                if ability_id in DETECTIVE_ONLY and player_role != "DETECTIVE":
                    await send_to_player(room_code, p_id, {
                        "type": "ERROR", "payload": {"message": "Not authorized for this ability."}
                    })
                    continue
                if ability_id in VILLAIN_ONLY and player_role not in ("MASTERMIND", "CONSPIRATOR"):
                    await send_to_player(room_code, p_id, {
                        "type": "ERROR", "payload": {"message": "Not authorized for this ability."}
                    })
                    continue

                result = ability_manager.use_ability(room_code, pid_str, ability_id)
                if result and result['success']:

                    # CCTV Analysis — Detective exclusive
                    if ability_id == "CCTV_ANALYSIS":
                        area = target_area or "Security Office"
                        cctv = get_or_create_cctv_engine(room_code)
                        report = cctv.generate_cctv_report(
                            requested_area=area,
                            time_window_minutes=5,
                            current_game_time=gs.elapsed_seconds,
                        )
                        await send_to_player(room_code, p_id, {
                            "type": "CCTV_REPORT",
                            "payload": report
                        })

                    # Movement Trace — Detective exclusive
                    elif ability_id == "MOVEMENT_TRACE":
                        area = target_area or "Security Office"
                        cctv = get_or_create_cctv_engine(room_code)
                        trace = cctv.generate_movement_trace(
                            requested_area=area,
                            time_window_minutes=8,
                            current_game_time=gs.elapsed_seconds,
                            player_id_lookup={v: k for k, v in cctv.color_assignments.items()},
                        )
                        for presence in trace.get("identified_presence", []):
                            pid_tr = presence["player_id"]
                            gs.movement_traces.setdefault(pid_tr, []).append({
                                "area": area,
                                "first_seen": presence.get("first_seen"),
                                "last_seen": presence.get("last_seen"),
                                "duration_seconds": presence.get("duration_seconds")
                            })
                        await send_to_player(room_code, p_id, {
                            "type": "MOVEMENT_TRACE_REPORT",
                            "payload": trace
                        })
                        await push_dossier_update(room_code, gs)

                    # Correlate Evidence — Detective exclusive
                    elif ability_id == "CORRELATE_EVIDENCE":
                        ev_id_a = data.get("evidence_id_a")
                        ev_id_b = data.get("evidence_id_b")
                        all_ev = evidence_manager.get_room_evidence(room_code)
                        ev_a = next((e for e in all_ev if e.evidence_id == ev_id_a), None)
                        ev_b = next((e for e in all_ev if e.evidence_id == ev_id_b), None)
                        if ev_a and ev_b:
                            corr = correlation_engine.evaluate_correlation(
                                ev_a.to_dict(include_hidden=True),
                                ev_b.to_dict(include_hidden=True),
                                difficulty=room.difficulty,
                            )
                            gs.correlations_log.append(corr)
                            await send_to_player(room_code, p_id, {
                                "type": "CORRELATION_RESULT",
                                "payload": {**corr, "evidence_id_a": ev_id_a, "evidence_id_b": ev_id_b}
                            })
                            await push_dossier_update(room_code, gs)


                    # Handle ability-specific effects
                    elif ability_id == "PLANT_FAKE_EVIDENCE":
                        item = evidence_manager.plant_fake_evidence(
                            room_code, target_area or "Main Block",
                            target_player or "", gs.elapsed_seconds
                        )
                        if item:
                            npc_manager.log_player_action(room_code, pid_str, 'PLANT_FAKE_EVIDENCE', target_area or "Main Block")
                            await broadcast_to_room(room_code, {
                                "type": "EVIDENCE_APPEARED",
                                "payload": {"evidence": item.to_dict()}
                              })

                    elif ability_id == "DESTROY_EVIDENCE":
                        ev_id = data.get("evidence_id")
                        all_ev = evidence_manager.get_room_evidence(room_code)
                        ev_item = next((e for e in all_ev if e.evidence_id == ev_id), None)
                        area_name = ev_item.area if ev_item else "Unknown"
                        destroyed = evidence_manager.destroy_evidence(room_code, ev_id)
                        if destroyed:
                            npc_manager.log_player_action(room_code, pid_str, 'EVIDENCE_DESTROYED', area_name)
                            await broadcast_to_room(room_code, {
                                "type": "EVIDENCE_DESTROYED",
                                "payload": {
                                    "evidence_id": ev_id,
                                    "area": area_name,
                                    "message": "Evidence has been demolished."
                                }
                            })
                            detective_id = next(
                                (int(pid) for pid, role in gs.assignments.items() if role == 'DETECTIVE'), None
                            )
                            if detective_id:
                                await send_to_player(room_code, detective_id, {
                                    "type": "EVIDENCE_BOARD_UPDATE",
                                    "payload": evidence_manager.get_detective_board(room_code)
                                })

                    elif ability_id == "TRIGGER_MEETING":
                        if meeting_manager.can_trigger_mastermind_meeting(room_code):
                            mtg = meeting_manager.start_meeting(room_code, pid_str, is_mastermind=True)
                            if mtg:
                                await broadcast_to_room(room_code, {
                                    "type": "MEETING_STARTED",
                                    "payload": mtg.to_dict()
                                })

                    elif ability_id == "MANIPULATE_NPC":
                        npc_manager.prime_npc(room_code, target_npc, pid_str, target_player or "")
                        # Log action
                        npc_item = next((n for n in npc_manager.room_npcs.get(room_code, []) if n.npc_id == target_npc), None)
                        area_name = npc_item.area if npc_item else "Unknown"
                        npc_manager.log_player_action(room_code, pid_str, 'MANIPULATE_NPC', area_name)

                    elif ability_id == "FRAME_PLAYER":
                        # Generate fake testimonial evidence
                        item = evidence_manager.plant_fake_evidence(
                            room_code, "Research Center",
                            target_player or "", gs.elapsed_seconds
                        )
                        if item:
                            # Secretly add to board, appears as testimonial
                            item.evidence_type = "TESTIMONIAL"
                            # Log action
                            npc_manager.log_player_action(room_code, pid_str, 'PLANT_FAKE_EVIDENCE', 'Research Center')
                            detective_id = next(
                                (int(pid) for pid, role in gs.assignments.items() if role == 'DETECTIVE'), None
                            )
                            if detective_id:
                                await send_to_player(room_code, detective_id, {
                                    "type": "EVIDENCE_BOARD_UPDATE",
                                    "payload": {"board": evidence_manager.get_detective_board(room_code)}
                                })

                await send_to_player(room_code, p_id, {
                    "type": "ABILITY_RESULT",
                    "payload": result or {"success": False, "message": "Unknown ability."}
                })

            # ── Task events ──
            elif action == "TASK_PROGRESS":
                task_id = data.get("task_id")
                raw_delta = float(data.get("delta", 0.05))

                # ── Look up the task object for server-side checks ──
                task_obj = task_manager.get_task_by_id(room_code, pid_str, task_id)
                if not task_obj:
                    continue

                # 1. Server-side proximity validation (mirrors COLLECT_EVIDENCE pattern)
                task_world = AREA_WORLD_POSITIONS.get(task_obj.location)
                player_pos_data = getattr(gs, 'player_positions', {}).get(pid_str)
                if task_world and player_pos_data and 'position' in player_pos_data:
                    p = player_pos_data['position']
                    if isinstance(p, dict):
                        px, pz = float(p.get('x', 0.0)), float(p.get('z', 0.0))
                    elif isinstance(p, (list, tuple)) and len(p) >= 3:
                        px, pz = float(p[0]), float(p[2])
                    else:
                        px, pz = 0.0, 0.0
                    tx, tz = task_world
                    dist = ((px - tx) ** 2 + (pz - tz) ** 2) ** 0.5
                    if dist > 5.5:
                        await send_to_player(room_code, p_id, {
                            "type": "ERROR",
                            "payload": {"message": "Too far from task zone to make progress."}
                        })
                        continue

                # 2. Clamp delta per call to 0.25 max for normal ticks, or 1.0 for minigame completion
                if raw_delta >= 0.9:
                    delta = 1.0
                else:
                    delta = min(raw_delta, 0.25)

                updated = task_manager.update_task_progress(room_code, pid_str, task_id, delta)
                if updated:
                    await send_to_player(room_code, p_id, {
                        "type": "TASK_UPDATED", "payload": updated
                    })
                    if updated.get("completed"):
                        if task_obj.is_sabotage:
                            # ── Sabotage task completed: apply real side-effect ──

                            effect = task_manager.apply_sabotage_effect(room_code, task_obj.task_type)
                            effect_result = {}

                            if effect:
                                effect_type = effect['effect']
                                effect_area = effect['area']

                                if effect_type == 'CORRUPT_EVIDENCE':
                                    # Destroy a random uncollected evidence item in the area
                                    area_evidence = [
                                        e for e in evidence_manager.get_room_evidence(room_code)
                                        if e.area == effect_area and not e.is_collected and not e.is_destroyed
                                    ]
                                    if area_evidence:
                                        target_ev = area_evidence[0]
                                        evidence_manager.destroy_evidence(room_code, target_ev.evidence_id)
                                        # Broadcast the destruction publicly (looks organic — no villain attribution)
                                        await broadcast_to_room(room_code, {
                                            "type": "EVIDENCE_DESTROYED",
                                            "payload": {"evidence_id": target_ev.evidence_id}
                                        })
                                        effect_result['destroyed_evidence_id'] = target_ev.evidence_id

                                elif effect_type == 'NPC_SUSPICION_SHIFT':
                                    # Log action attributed to a random innocent — NPCs will
                                    # later misreport this as suspicious behaviour by that player.
                                    innocent_ids = [
                                        pid for pid, r in gs.assignments.items()
                                        if r not in ('MASTERMIND', 'CONSPIRATOR')
                                    ]
                                    if innocent_ids:
                                        scapegoat = _rnd.choice(innocent_ids)
                                        npc_manager.log_player_action(
                                            room_code, scapegoat, 'SABOTAGE', effect_area
                                        )
                                        effect_result['scapegoat_id'] = scapegoat

                                effect_result['description'] = effect.get('description', '')

                            # Notify villains-only channel (Mastermind + Conspirator)
                            villain_ids = [
                                int(pid) for pid, r in gs.assignments.items()
                                if r in ('MASTERMIND', 'CONSPIRATOR')
                            ]
                            for vid in villain_ids:
                                await send_to_player(room_code, vid, {
                                    "type": "SABOTAGE_TASK_COMPLETED",
                                    "payload": {
                                        "player_id": pid_str,
                                        "task": updated,
                                        "effect": effect_result,
                                    }
                                })
                            # Log the action for NPC observation system (attributed to the villain)
                            npc_manager.log_player_action(
                                room_code, pid_str, 'SABOTAGE_TASK', task_obj.location
                            )

                        else:
                            # ── Innocent task completed: normal public broadcast ──
                            await broadcast_to_room(room_code, {
                                "type": "TASK_COMPLETED",
                                "payload": {"player_id": pid_str, "task": updated}
                            })

                        # ── Broadcast overall task progress to the entire room ──
                        global_task_progress = task_manager.get_room_completion_percent(room_code)
                        await broadcast_to_room(room_code, {
                            "type": "GLOBAL_TASK_PROGRESS",
                            "payload": global_task_progress
                        })


            elif action == "TASK_RESET":
                task_id = data.get("task_id")
                updated = task_manager.reset_task_progress(room_code, pid_str, task_id)
                if updated:
                    await send_to_player(room_code, p_id, {
                        "type": "TASK_UPDATED", "payload": updated
                    })

            # ── NPC Interaction ──
            elif action == "NPC_INTERACT":
                npc_id = data.get("npc_id")
                if not npc_manager.can_interact(room_code, pid_str, npc_id):
                    await send_to_player(room_code, p_id, {
                        "type": "ERROR",
                        "payload": {"message": "NPC is not available yet (cooldown)."}
                    })
                    continue
                rel_range = gs.modifiers.get('npc_reliability_range', (0.60, 0.85))
                statement = npc_manager.generate_statement(
                    room_code, npc_id, pid_str,
                    gs.assignments, player_names, rel_range, gs.elapsed_seconds
                )
                # Send statement to player
                await send_to_player(room_code, p_id, {
                    "type": "NPC_STATEMENT", "payload": statement
                })
                # Also add to Detective's board as testimonial evidence
                detective_id = next(
                    (int(pid) for pid, role in gs.assignments.items() if role == 'DETECTIVE'), None
                )
                if detective_id and statement:
                    await send_to_player(room_code, detective_id, {
                        "type": "NPC_REPORT_RECEIVED",
                        "payload": statement
                    })

            # ── Chat ──
            elif action == "CHAT_MESSAGE":
                channel = data.get("channel", "public")
                message = data.get("message", "")[:300]
                role = gs.assignments.get(pid_str)

                # Validate villain chat access
                if channel == "villain" and role not in ("MASTERMIND", "CONSPIRATOR"):
                    continue

                # For villain chat: send only to Mastermind and Conspirator
                if channel == "villain":
                    villain_ids = [
                        int(pid) for pid, r in gs.assignments.items()
                        if r in ("MASTERMIND", "CONSPIRATOR")
                    ]
                    for vid in villain_ids:
                        await send_to_player(room_code, vid, {
                            "type": "CHAT_MESSAGE",
                            "payload": {
                                "channel": "villain",
                                "sender_id": pid_str,
                                "sender_name": player_names.get(pid_str, "Unknown"),
                                "message": message,
                                "timestamp": _time.time(),
                            }
                        })
                else:
                    await broadcast_to_room(room_code, {
                        "type": "CHAT_MESSAGE",
                        "payload": {
                            "channel": channel,
                            "sender_id": pid_str,
                            "sender_name": player_names.get(pid_str, "Unknown"),
                            "message": message,
                            "timestamp": _time.time(),
                        }
                    })

                # Schedule reactive response from bot player if human sent message
                bot_players_list = [{'id': p.player_id, 'name': p.username} for p in room.players.values() if p.player_id >= 9000]
                if bot_players_list and int(pid_str) < 9000:
                    async def schedule_bot_reply(target_channel: str, user_msg: str):
                        await asyncio.sleep(_rnd.uniform(1.8, 3.2))
                        reply = bot_chat_service.get_reactive_response(
                            room_code, gs.assignments, bot_players_list, user_msg, channel=target_channel
                        )
                        if reply:
                            if target_channel == "villain":
                                vids = [int(p) for p, r in gs.assignments.items() if r in ("MASTERMIND", "CONSPIRATOR")]
                                for vid in vids:
                                    await send_to_player(room_code, vid, {"type": "CHAT_MESSAGE", "payload": reply})
                            else:
                                await broadcast_to_room(room_code, {"type": "CHAT_MESSAGE", "payload": reply})

                    asyncio.create_task(schedule_bot_reply(channel, message))

            # ── Meeting end ──
            elif action == "MEETING_END_ACK":
                # Host can end meeting
                if room.host_id == p_id:
                    meeting_manager.end_meeting(room_code)
                    bot_manager.on_phase_change(room_code, 'exploration', gs, room, broadcast_to_room, send_to_player)
                    await broadcast_to_room(room_code, {
                        "type": "MEETING_ENDED",
                        "payload": {"resumed": True}
                    })

            elif action in ("START_DECISION_PHASE", "TRIGGER_DECISION_PHASE"):
                if not getattr(gs, 'decision_phase_active', False):
                    gs.decision_phase_active = True
                    gs.decision_resolved = False
                    gs.decision_phase_deadline = _time.time() + 10.0
                bot_manager.on_phase_change(room_code, 'decision', gs, room, broadcast_to_room, send_to_player)
                await broadcast_to_room(room_code, {
                    "type": "DECISION_PHASE",
                    "payload": {"status": "started", "time_remaining": 10}
                })


            # ── Midpoint meeting check ──
            elif action == "TIMER_TICK":
                # Ticks are now server-authoritative. Clients sending heartbeats is a no-op.
                pass


            # ── Final Accusation / Decision Phase ──
            elif action in ("SUBMIT_DECISION", "SUBMIT_ACCUSATION"):
                player_role = (gs.assignments.get(pid_str) or "").upper()
                if player_role in ("MASTERMIND", "CONSPIRATOR"):
                    await send_to_player(room_code, p_id, {
                        "type": "ERROR",
                        "payload": {"message": "Voting is disabled for Conspirator and Mastermind roles."}
                    })
                    continue

                if not hasattr(gs, 'decision_votes'):
                    gs.decision_votes = {
                        'detective_choice': None,
                        'investigator_choices': {},
                        'submitted_detective': False,
                        'submitted_investigators': set(),
                    }

                conspirator_choice = data.get("conspirator_choice") or data.get("conspirator_accusation")
                mastermind_choice = data.get("mastermind_choice") or data.get("mastermind_accusation")

                if player_role == "DETECTIVE":
                    gs.decision_votes['detective_choice'] = conspirator_choice
                    gs.decision_votes['submitted_detective'] = True
                elif player_role == "INVESTIGATOR":
                    gs.decision_votes['investigator_choices'][pid_str] = mastermind_choice
                    gs.decision_votes['submitted_investigators'].add(pid_str)

                # Broadcast submission acknowledgment
                await broadcast_to_room(room_code, {
                    "type": "DECISION_SUBMITTED",
                    "payload": {
                        "role": player_role,
                        "voter_id": pid_str
                    }
                })



    except WebSocketDisconnect:
        player.websocket = None
        pid_str_dc = str(p_id)
        disconnected_players.setdefault(room_code, {})[pid_str_dc] = _time.time()
        await broadcast_to_room(room_code, {
            "type": "PLAYER_DISCONNECTED",
            "payload": {"player_id": pid_str_dc, "grace_seconds": RECONNECT_GRACE_SECONDS}
        })

    finally:
        # Clean up CCTV engine when all players disconnect
        room = lobby_manager.get_room(room_code)
        if room and not any(p.websocket for p in room.players.values()):
            cleanup_cctv_engine(room_code)
