import asyncio
import random
import time
from typing import Dict, List, Optional

CHAT_TEMPLATES = {
    'suspicious': [
        "I don't trust {player}, they've been quiet.",
        "{player} was near the task area at a weird time.",
        "Something feels off about {player}.",
    ],
    'defensive': [
        "I was just doing my task, wasn't near anyone.",
        "Why is everyone looking at me?",
        "I didn't do anything suspicious.",
    ],
    'neutral': [
        "Anyone have new info?",
        "Let's think about this carefully.",
        "Who do we suspect right now?",
    ],
    'accusatory': [
        "I think it's {player}.",
        "{player} needs to explain themselves.",
        "Vote out {player}, I'm sure.",
    ]
}

PERSONA_CATEGORY_WEIGHTS = {
    'aggressive': {'accusatory': 0.4, 'suspicious': 0.4, 'neutral': 0.1, 'defensive': 0.1},
    'quiet':      {'neutral': 0.5, 'defensive': 0.3, 'suspicious': 0.1, 'accusatory': 0.1},
    'neutral':    {'neutral': 0.4, 'suspicious': 0.2, 'defensive': 0.2, 'accusatory': 0.2},
}


BOT_MEETING_LINES = {
    'DETECTIVE': [
        "I've been analyzing the access logs in Computer Lab. We need to cross-check player locations.",
        "Check the Evidence Board timeline before we vote. Let's see who was near Research Center.",
        "Some evidence was demolished earlier. The Mastermind is actively covering their tracks.",
        "I reviewed the witness records. One statement directly contradicts what was logged.",
        "Let's not vote recklessly. Who can account for their whereabouts during the last 2 minutes?",
    ],
    'INVESTIGATOR': [
        "I completed all my assigned tasks in MCA Department and Library. I'm clean.",
        "I was in Cafeteria placing orders when the alert triggered. Who else was around?",
        "Check the global campus task bar! We're making solid progress.",
        "I didn't see anything suspicious in Auditorium, but the doors were locked earlier.",
        "My tasks are almost done! Make sure everyone is focusing on their objectives.",
    ],
    'MASTERMIND': [
        "I saw someone near Research Center right before the drive was wiped...",
        "I was in Computer Lab the whole time fixing network terminals. Ask anyone!",
        "Don't rush the vote! We need to verify who hasn't been doing their tasks.",
        "That evidence in Main Block looks fabricated to me. Someone is trying to frame us.",
        "Look at the player who was moving near Security Office. That seems suspicious to me.",
    ],
    'CONSPIRATOR': [
        "I was archiving files in Library when the emergency started.",
        "Whoever is doing the sabotage is moving fast. Watch out near Research Center.",
        "I stuck to my tasks in Auditorium. We should look closely at the CCTV logs.",
        "I saw two players heading toward Computer Lab around the same time.",
    ]
}

BOT_PUBLIC_LINES = {
    'DETECTIVE': [
        "Monitoring Security Office CCTV feeds. Stay sharp everyone.",
        "Investigating digital logs near Computer Lab.",
        "Gathering evidence in Main Block.",
        "Reviewing campus access logs.",
    ],
    'INVESTIGATOR': [
        "Head's up! Working on task in Library.",
        "Finished restocking lab supplies in Research Center.",
        "Heading to Cafeteria to complete my next task.",
        "Submitting attendance records at MCA Department.",
    ],
    'MASTERMIND': [
        "Working on terminal calibrations in Computer Lab.",
        "Everything looks clear near Security Office.",
        "Moving to MCA Department for routine checks.",
    ],
    'CONSPIRATOR': [
        "Clearing security checkpoints in Main Block.",
        "Archiving files in Library now.",
        "Checking equipment nodes in Auditorium.",
    ]
}

BOT_VILLAIN_LINES = [
    "Stay quiet in public chat. Keep deflecting suspicion to the Investigators.",
    "I'll handle the virus exploit in Computer Lab; focus on your tasks.",
    "They don't have enough solid evidence on the board yet. Keep moving.",
    "I'm wiping the backup logs now. Try to distract anyone heading toward Research Center.",
    "If they call a meeting, claim you were doing tasks in Library.",
]

BOT_REACTIVE_REPLIES = {
    'DETECTIVE': [
        "Noted. I'll cross-reference that with the evidence logs.",
        "That matches some of the digital records I found.",
        "Keep focused on your tasks while I analyze the timeline.",
    ],
    'INVESTIGATOR': [
        "Agreed, let's finish our tasks quickly!",
        "I can confirm that area was clear when I passed by.",
        "Let's stick together and complete the campus objectives.",
    ],
    'MASTERMIND': [
        "Are you sure? I was nearby and didn't notice that.",
        "Sounds plausible, but we shouldn't make hasty assumptions.",
        "Let's verify the facts before blaming anyone.",
    ],
    'CONSPIRATOR': [
        "I agree, let's proceed carefully.",
        "That makes sense. I was in the adjacent area.",
        "Let's keep moving and stay focused.",
    ]
}


class BotChatService:
    def __init__(self):
        # room_code -> last_chat_time
        self.last_autonomous_chat: Dict[str, float] = {}

    def get_autonomous_message(
        self,
        room_code: str,
        assignments: Dict[str, str],
        bot_players: List[dict],
        channel: str = 'meeting'
    ) -> Optional[dict]:
        """Generates an autonomous role-aligned chat message from a bot player."""
        if not bot_players:
            return None

        bot = random.choice(bot_players)
        bot_id = str(bot['id'])
        bot_name = bot['name']
        role = (assignments.get(bot_id) or 'INVESTIGATOR').upper()

        if channel == 'villain':
            if role not in ('MASTERMIND', 'CONSPIRATOR'):
                return None
            msg_text = random.choice(BOT_VILLAIN_LINES)
        elif channel == 'meeting':
            lines = BOT_MEETING_LINES.get(role, BOT_MEETING_LINES['INVESTIGATOR'])
            msg_text = random.choice(lines)
        else:
            lines = BOT_PUBLIC_LINES.get(role, BOT_PUBLIC_LINES['INVESTIGATOR'])
            msg_text = random.choice(lines)

        return {
            'channel': channel,
            'sender_id': bot_id,
            'sender_name': bot_name,
            'message': msg_text,
            'timestamp': time.time()
        }

    def get_reactive_response(
        self,
        room_code: str,
        assignments: Dict[str, str],
        bot_players: List[dict],
        human_message: str,
        channel: str = 'public'
    ) -> Optional[dict]:
        """Generates a realistic reactive response from a bot to human chat."""
        if not bot_players:
            return None

        # If villain channel, pick a villain bot
        if channel == 'villain':
            eligible_bots = [
                b for b in bot_players
                if (assignments.get(str(b['id'])) or '').upper() in ('MASTERMIND', 'CONSPIRATOR')
            ]
            if not eligible_bots:
                return None
            bot = random.choice(eligible_bots)
            msg_text = random.choice(BOT_VILLAIN_LINES)
        else:
            bot = random.choice(bot_players)
            bot_id = str(bot['id'])
            role = (assignments.get(bot_id) or 'INVESTIGATOR').upper()
            replies = BOT_REACTIVE_REPLIES.get(role, BOT_REACTIVE_REPLIES['INVESTIGATOR'])
            msg_text = random.choice(replies)

        return {
            'channel': channel,
            'sender_id': str(bot['id']),
            'sender_name': bot['name'],
            'message': msg_text,
            'timestamp': time.time()
        }

    def generate_template_message(self, persona: str, target_player_name: str) -> str:
        """Generates template-based chat message weighted by persona."""
        weights = PERSONA_CATEGORY_WEIGHTS.get(persona, PERSONA_CATEGORY_WEIGHTS['neutral'])
        categories = list(weights.keys())
        prob_dist = list(weights.values())
        chosen_cat = random.choices(categories, weights=prob_dist, k=1)[0]
        templates = CHAT_TEMPLATES.get(chosen_cat, CHAT_TEMPLATES['neutral'])
        raw_template = random.choice(templates)
        return raw_template.format(player=target_player_name)


bot_chat_service = BotChatService()

