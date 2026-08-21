# Campus Undercover: The Christ Mystery

## 1. Project Overview

Campus Undercover: The Christ Mystery is a multiplayer social deduction and investigation game built as a 3D campus-themed browser experience. Players are assigned secret roles and must investigate evidence, complete tasks, and identify the hidden threat before time runs out.

The game follows a deduction loop similar to hidden-role games:

- one player is the Detective,
- one or more players are Investigators,
- one player is the Mastermind,
- one player is the Conspirator,
- the goal is to expose the villain team through evidence gathering, voting, and accusation logic.

The project combines a React + Three.js frontend with a FastAPI backend and WebSocket-based multiplayer architecture. It includes lobby creation, role assignment, custom game loops, task progression, bot players, investigations, and end-of-match resolution.

---

## 2. Tech Stack

### Frontend

- React 18
- Vite
- JavaScript / JSX
- @react-three/fiber
- @react-three/drei
- three.js
- Zustand for client state
- Lucide React for icons
- WebSockets for live game updates

### Backend

- Python 3
- FastAPI
- SQLAlchemy 2
- Pydantic and Pydantic Settings
- Python-Jose (JWT)
- Python-Multipart
- PostgreSQL driver: psycopg2-binary
- Alembic for migrations
- Uvicorn for running the server

### Database / Other

- PostgreSQL 15
- Docker / Docker Compose
- Alembic migrations
- JWT-based auth
- WebSocket channel communication for lobby and game updates

---

## 3. Project Architecture

The repository is separated into two main runtime components:

1. Frontend application in `frontend/`
2. Backend API/game server in `backend/`

The flow is:

- The frontend renders the 3D campus, player avatars, UI panels, and lobby authentication flow.
- The backend exposes REST endpoints for authentication and lobby management.
- Real-time gameplay is delivered over WebSocket channels for player movement, task events, chat, meeting state, evidence updates, and resolution.
- PostgreSQL stores persistent user accounts and match outcome statistics.
- The backend keeps active room/game state in memory during a match, while database models hold the persistent records for users and session results.

In practice, the architecture is:

- `frontend` = presentation layer and client-side game loop
- `backend/app/main.py` = central server, room lifecycle, game loop, WebSocket broadcasting, session orchestration
- `backend/app/game/*` = gameplay logic modules for tasks, evidence, roles, NPC behavior, ability use, meetings, and resolution
- `backend/app/db/*` = data models, database session setup, and migration metadata

---

## 4. Frontend Structure

The frontend is organized under `frontend/src/`.

### Main directories

- `src/components/game/` — 3D world, player movement, tasks, remote players, evidence, NPCs
- `src/components/ui/` — HUD, lobby, screens, overlays, task panels, results panels, decision screens
- `src/store/` — Zustand store for app state and live game state
- `src/utils/` — helper modules such as audio and evidence visuals
- `src/config/` — configuration-related frontend files (currently minimal but present)

### Key frontend files

- `src/App.jsx` — app root, socket lifecycle, onboarding flow, solo/offline setup, game bootstrap
- `src/main.jsx` — React entry point
- `src/store/gameStore.js` — central state management for game phase, player data, evidence, chat, task state, and results
- `src/components/game/GameScene.jsx` — main 3D scene, world composition, overlays, and HUD integration
- `src/components/game/Player.jsx` — local player avatar and movement behavior
- `src/components/game/RemotePlayers.jsx` — remote player rendering and role badges
- `src/components/ui/HomeScreen.jsx` — lobby/auth screen and API helpers
- `src/components/ui/RoleRevealScreen.jsx` — role identity reveal screen
- `src/components/ui/DecisionPhaseScreen.jsx` — Detective/Investigator vote submission screen
- `src/components/ui/ResultsScreen.jsx` — end-of-game summary, winner reveal, and dossier tabs
- `src/components/ui/TaskMinigame.jsx` — task interaction mini-game logic
- `src/components/ui/ChatPanel.jsx` — in-game chat UI

### State management

The frontend uses Zustand in `src/store/gameStore.js` to store:

- current screen
- player identity and role
- room code and WebSocket connection
- other players
- tasks and task progress
- evidence and dossier state
- game phase and result payload
- chat and meeting status

This is the primary state source for gameplay and UI transitions.

---

## 5. Backend Structure

The backend is organized under `backend/app/`.

### Core backend areas

- `app/api/v1/` — REST API routers for auth and lobby endpoints
- `app/core/` — settings and JWT/security helpers
- `app/db/` — database models and SQLAlchemy setup
- `app/game/` — gameplay engine modules for roles, tasks, evidence, NPCs, meetings, and resolution
- `app/main.py` — FastAPI app entry point, room lifecycle, WebSocket endpoints, game loop

### API routes

Authentication endpoints:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/login/oauth`
- `GET /api/v1/auth/me`

Lobby endpoints:

- `POST /api/v1/lobby/create`
- `POST /api/v1/lobby/join`
- `GET /api/v1/lobby/rooms`
- `GET /api/v1/lobby/room/{room_code}`
- `POST /api/v1/lobby/leave/{room_code}`

WebSocket endpoints:

- `/ws/lobby/{room_code}/{player_id}`
- `/ws/game/{room_code}/{player_id}`

### Server logic

`backend/app/main.py` contains the core match orchestration:

- room creation and lifecycle
- player join / lobby handling
- role assignment generation
- task assignment and progress tracking
- bot movement and bot chat logic
- evidence collection and event broadcasting
- meeting timing and decision phase control
- final game resolution and winner calculation

It also manages a central in-memory game state for each room using `active_game_states` and a periodic game loop.

---

## 6. Database Structure

The project uses PostgreSQL with SQLAlchemy ORM and Alembic migrations.

### Current schema

#### `users`

Fields:

- `id` — integer primary key
- `username` — unique username
- `email` — unique email address
- `hashed_password` — password hash
- `is_active` — active/inactive flag
- `created_at` — timestamp

This table stores authentication and account data.

#### `game_sessions`

Fields:

- `id` — UUID primary key
- `status` — waiting / playing / finished
- `difficulty` — standard (current game rules are fixed to a standard ruleset)
- `winner_faction` — winning faction such as `INVESTIGATORS` or `VILLAINS`
- `created_at` — creation timestamp
- `ended_at` — end timestamp

#### `user_game_stats`

Fields:

- `id` — integer primary key
- `user_id` — FK to `users.id`
- `session_id` — FK to `game_sessions.id`
- `role` — DETECTIVE / INVESTIGATOR / MASTERMIND / CONSPIRATOR
- `evidence_collected`
- `tasks_completed`
- `points_earned`
- `won`

Relationships:

- `User` has a one-to-many relationship with `UserGameStats`
- `GameSession` has a one-to-many relationship with `UserGameStats`

### Migration notes

The Alembic directory exists under `backend/alembic/` and includes the initial migration file `backend/alembic/versions/b9a2f4653155_initial_schema.py`.

The architecture currently uses:

- database for persistence of users and session records,
- in-memory server state for active game runtime,
- real-time WebSocket payloads for live gameplay state.

---

## 7. Game Logic

### Core game loop

The match is driven by a room-based game lifecycle:

1. A player creates a lobby or joins a waiting room.
2. The backend assigns roles using `assign_roles()` in `role_service.py`.
3. The game transitions to the role reveal phase.
4. Players explore a 3D campus map, investigate evidence, and complete tasks.
5. Once the task threshold is reached, or the timer ends, the decision phase is triggered.
6. The Detective submits a suspect accusation and Investigators submit a majority vote.
7. The backend resolves the round and broadcasts the result payload.

### Roles

The rules implemented in `role_service.py` support player counts from 1 to 6:

- `DETECTIVE`
- `INVESTIGATOR`
- `MASTERMIND`
- `CONSPIRATOR`

The project currently follows a fixed standard ruleset with a 5-minute round, and the code explicitly preserves a standard configuration instead of different difficulty modes.

### Win conditions

The resolution logic in `backend/app/game/resolution_service.py` determines the winner by evaluating:

- Detective accusation against the actual Mastermind
- Investigator majority vote against the actual Conspirator
- overall faction outcome: `INVESTIGATORS` or `VILLAINS`

If both accusations are correct, the Investigators win. Otherwise, the Villains win. The game also supports timeout-based villain victory when the countdown expires before tasks are complete.

### Gameplay systems

The backend includes modular systems for:

- `task_manager.py` — task assignment, completion, scoring, room progress
- `evidence_manager.py` — evidence collection and distribution
- `npc_manager.py` — NPC behavior and observation logic
- `ability_manager.py` — role-specific actions and abilities
- `meeting_manager.py` — phase-based discussion and meeting timing
- `cctv_service.py` — surveillance and clue generation
- `correlation_engine.py` — evidence linking and deduction support
- `suspect_dossier_service.py` — Detective dossier generation
- `bot_manager.py` and `bot_chat_service.py` — autonomous bot behavior and bot messages

### Frontend gameplay flow

The React client renders:

- a campus map in 3D,
- player movement and interactions,
- UI to accept evidence and tasks,
- a meeting screen,
- accusation and decision phases,
- a results screen with reveal cards and vote summary.

---

## 8. Setup & Installation

### Prerequisites

- Node.js 18+
- Python 3.10+
- Docker + Docker Compose (recommended for PostgreSQL)
- Git

### 1. Clone the repository

```bash
git clone <repository-url>
cd campusgame
```

### 2. Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Linux/macOS
# or .venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

### 3. Database setup

The repository includes a PostgreSQL service in `docker-compose.yml`.

```bash
cd ..
docker compose up -d db
```

This starts PostgreSQL on port `5432` using the default config in the compose file.

### 4. Run backend

From the `backend` directory:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

If using Docker Compose for the full stack:

```bash
docker compose up --build
```

### 5. Frontend setup

From the project root:

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

Then open the frontend in the browser, typically at:

- http://localhost:5173

### 6. Environment notes

The project includes default settings in `backend/app/core/config.py`:

- `DATABASE_URL` defaults to Postgres on localhost:5432
- backend CORS allows local frontend origins

If needed, override values using environment variables or a `.env` file in the backend directory.

---

## 9. Contributors & Contributions

Based on the repository `git log` history, the project currently has three contributors recorded in commit activity.

| Contributor | Based on actual git history | Contribution summary |
| --- | --- | --- |
| `sudeeepaa` | Multiple feature and stability commits across backend and gameplay work | Worked on backend game logic, lobby/session management, task and evidence systems, role reveal flow, WebSocket stability, single-player mode, decision-phase resolution, and real-time game-state fixes. The commit history includes entries such as “Task Assignment System + Evidence & Detective System”, “Dynamic Voter Status, Immediate Resolution”, and “decision screen real time fix”. |
| `AkashdeepDey` | Frontend polish, multiplayer fixes, room management, responsive UI, timer and socket issues | Focused on frontend fixes, layout responsiveness, landing page work, multiplayer room and movement sync, timer bug fixes, and stable game launch flows. Commit messages include “Frontend fix v5”, “Fix Multiplayer room issue”, “resolve multiplayer player movement sync across devices”, and “feat: complete social deduction game implementation with responsive UI”. |
| `snehavvv` | UI and game mechanics on the frontend and gameplay systems | Built major game UI screens and interactive mechanics, including the results screen, decision phase, loading screen, task minigame, task assignment logic, CCTV-related systems, and gameplay flow improvements. Commit history includes entries such as “Result Screen”, “Decision phase”, “TaskMinigame variants”, and “tasks assigning according to the role”. |

No additional active contributors are present in the current commit history at the time of review.

---

## 10. Folder Structure

```text
campusgame/
├── backend/
│   ├── alembic/
│   │   ├── README
│   │   ├── env.py
│   │   └── versions/
│   │       └── b9a2f4653155_initial_schema.py
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── api.py
│   │   │       └── endpoints/
│   │   │           ├── auth.py
│   │   │           └── lobby.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── security.py
│   │   ├── db/
│   │   │   ├── base.py
│   │   │   ├── base_class.py
│   │   │   ├── session.py
│   │   │   └── models/
│   │   │       ├── game.py
│   │   │       └── user.py
│   │   ├── game/
│   │   │   ├── ability_manager.py
│   │   │   ├── bot_chat_service.py
│   │   │   ├── bot_manager.py
│   │   │   ├── cctv_service.py
│   │   │   ├── correlation_engine.py
│   │   │   ├── evidence_manager.py
│   │   │   ├── investigation_service.py
│   │   │   ├── lobby_manager.py
│   │   │   ├── meeting_manager.py
│   │   │   ├── npc_manager.py
│   │   │   ├── resolution_service.py
│   │   │   ├── role_service.py
│   │   │   ├── suspect_dossier_service.py
│   │   │   └── task_manager.py
│   │   ├── schemas/
│   │   │   ├── game.py
│   │   │   ├── lobby.py
│   │   │   └── user.py
│   │   ├── tests/
│   │   └── main.py
│   ├── Dockerfile
│   ├── requirements.txt
│   └── alembic.ini
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── game/
│   │   │   └── ui/
│   │   ├── config/
│   │   ├── store/
│   │   │   └── gameStore.js
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   ├── main.jsx
│   │   └── ...
│   ├── Dockerfile
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── ...
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## Summary

Campus Undercover: The Christ Mystery is a full-stack social deduction game that combines 3D campus exploration, hidden-role gameplay, evidence-based investigations, and real-time multiplayer interaction. The codebase is organized around a React frontend, a FastAPI backend, PostgreSQL persistence, and an in-memory server game engine for live room orchestration.

The project is designed as a browser-based deduction game with role-based hidden information, task completion, bot agents, and a clear end-of-match resolution cycle.
