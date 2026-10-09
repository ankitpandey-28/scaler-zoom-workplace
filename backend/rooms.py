"""Room state and signaling are in memory; attendance and chat live in SQLite.

Run one ASGI worker. Scaling requires shared pub/sub and an SFU, documented in README.
"""
from dataclasses import dataclass
from fastapi import WebSocket


@dataclass
class Member:
    socket: WebSocket
    participant: dict
    session_token: str = ''
    audio: bool = False
    video: bool = False
    sharing: bool = False
    hand: bool = False

    def public(self):
        return {**self.participant, 'audio': self.audio, 'video': self.video,
                'sharing': self.sharing, 'hand': self.hand}


class Rooms:
    def __init__(self):
        self.rooms: dict[str, dict[str, Member]] = {}

    async def send(self, member, payload):
        try:
            await member.socket.send_json(payload)
        except (RuntimeError, OSError):
            pass

    async def broadcast(self, meeting_id, payload, exclude=None):
        for participant_id, member in list(self.rooms.get(meeting_id, {}).items()):
            if participant_id != exclude:
                await self.send(member, payload)


rooms = Rooms()
