import asyncio
import time
from typing import Dict, Optional, List

MEETING_DURATION = 120  # 2 minutes (120 seconds)


class MeetingState:
    def __init__(self, room_code: str, triggered_by: str):
        self.room_code = room_code
        self.triggered_by = triggered_by
        self.started_at: float = time.time()
        self.is_active: bool = True
        self.mastermind_triggered: bool = False

    @property
    def time_remaining(self) -> int:
        elapsed = time.time() - self.started_at
        return max(0, MEETING_DURATION - int(elapsed))

    @property
    def is_expired(self) -> bool:
        return self.time_remaining <= 0

    def to_dict(self) -> dict:
        return {
            'room_code': self.room_code,
            'triggered_by': self.triggered_by,
            'time_remaining': self.time_remaining,
            'is_active': self.is_active,
        }


class MeetingManager:
    def __init__(self):
        self.active_meetings: Dict[str, MeetingState] = {}
        # room_code -> mastermind_triggered
        self.mastermind_meeting_used: Dict[str, bool] = {}
        # room_code -> midpoint_triggered
        self.midpoint_triggered: Dict[str, bool] = {}

    def can_trigger_mastermind_meeting(self, room_code: str) -> bool:
        return not self.mastermind_meeting_used.get(room_code, False)

    def start_meeting(self, room_code: str, triggered_by: str, is_mastermind: bool = False) -> Optional[MeetingState]:
        if room_code in self.active_meetings:
            return None  # Meeting already active
        meeting = MeetingState(room_code, triggered_by)
        if is_mastermind:
            meeting.mastermind_triggered = True
            self.mastermind_meeting_used[room_code] = True
        self.active_meetings[room_code] = meeting
        return meeting

    def get_active_meeting(self, room_code: str) -> Optional[MeetingState]:
        return self.active_meetings.get(room_code)

    def end_meeting(self, room_code: str) -> bool:
        if room_code in self.active_meetings:
            self.active_meetings[room_code].is_active = False
            del self.active_meetings[room_code]
            return True
        return False

    def check_midpoint(self, room_code: str, elapsed_seconds: int) -> bool:
        """Returns True if midpoint meeting should trigger (2.5 min / 150s elapsed, not yet triggered)."""
        if elapsed_seconds >= 150 and not self.midpoint_triggered.get(room_code, False):
            self.midpoint_triggered[room_code] = True
            return True
        return False


meeting_manager = MeetingManager()
