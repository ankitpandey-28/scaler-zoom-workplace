import os
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect
from backend.database import database
from backend.main import app
from backend.rooms import rooms


class MeetingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {'DATABASE_PATH': os.path.join(self.temp.name, 'test.db')})
        self.env.start()
        self.client = TestClient(app)
        self.client.__enter__()
        self.client.post('/api/auth/login', json={'email': 'ankit.sharma@example.com', 'password': 'ZoomDemo123!'})
        self.guest = TestClient(app)
        self.guest.get('/api/me')

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.guest.close()
        rooms.rooms.clear()
        self.env.stop()
        self.temp.cleanup()

    def create(self):
        response = self.client.post('/api/meetings', json={'title': 'Team call'})
        self.assertEqual(response.status_code, 201)
        return response.json()

    def join(self, client, identifier, name):
        response = client.post(f'/api/meetings/{identifier}/join', json={'display_name': name})
        self.assertEqual(response.status_code, 200)
        return response.json()

    def test_seed_and_unique_instant_meetings(self):
        seeded = self.client.get('/api/meetings').json()
        self.assertEqual(len(seeded), 5)
        self.assertTrue(any(row['status'] == 'ended' for row in seeded))
        first, second = self.create(), self.create()
        self.assertNotEqual(first['id'], second['id'])
        self.assertEqual(len(first['id']), 11)
        self.assertTrue(first['is_host'])
        self.assertNotIn('host_session', first)
        self.assertFalse(self.guest.get(f"/api/meetings/{first['id']}").json()['is_host'])

    def test_schedule_persists_and_validates(self):
        scheduled = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
        response = self.client.post('/api/meetings', json={'title': 'Planning', 'description': 'Roadmap', 'scheduled_at': scheduled, 'duration_minutes': 45})
        self.assertEqual(response.status_code, 201)
        meeting = response.json()
        with database() as connection:
            row = connection.execute('SELECT * FROM meetings WHERE id=?', (meeting['id'],)).fetchone()
            self.assertEqual(row['description'], 'Roadmap')
            self.assertEqual(row['duration_minutes'], 45)
        for body in [{'title': ' '}, {'duration_minutes': 0}, {'scheduled_at': '2020-01-01T10:00:00Z'}, {'scheduled_at': '2030-01-01T10:00:00'}]:
            self.assertEqual(self.client.post('/api/meetings', json=body).status_code, 422)

    def test_missing_meeting_cancel_and_host_authority(self):
        self.assertEqual(self.client.get('/api/meetings/00000000000').status_code, 404)
        meeting = self.create()
        self.assertEqual(self.guest.delete(f"/api/meetings/{meeting['id']}").status_code, 401)
        self.assertEqual(self.client.delete(f"/api/meetings/{meeting['id']}").status_code, 204)
        self.assertEqual(self.client.post(f"/api/meetings/{meeting['id']}/join", json={'display_name': 'Ankit'}).status_code, 409)

    def test_socket_requires_participant_session(self):
        meeting = self.create()
        host = self.join(self.client, meeting['id'], 'Host')
        with self.assertRaises(WebSocketDisconnect):
            with self.client.websocket_connect(f"/api/ws/{meeting['id']}/{host['participant_id']}", headers={'cookie': f"zoom_session={self.guest.cookies.get('zoom_session')}"}):
                pass

    def test_two_participants_chat_host_controls_and_end(self):
        meeting = self.create(); identifier = meeting['id']
        host = self.join(self.client, identifier, 'Host')
        guest = self.join(self.guest, identifier, 'Guest')
        with self.client.websocket_connect(f"/api/ws/{identifier}/{host['participant_id']}") as hs:
            self.assertEqual(hs.receive_json()['type'], 'welcome')
            with self.client.websocket_connect(f"/api/ws/{identifier}/{guest['participant_id']}", headers={'cookie': f"zoom_session={self.guest.cookies.get('zoom_session')}"}) as gs:
                self.assertEqual(gs.receive_json()['type'], 'welcome')
                self.assertEqual(hs.receive_json()['type'], 'participant-joined')
                gs.send_json({'type': 'end'})
                self.assertEqual(gs.receive_json()['type'], 'error')
                gs.send_json({'type': 'chat', 'body': 'Hello team!'})
                self.assertEqual(hs.receive_json()['message']['body'], 'Hello team!')
                self.assertEqual(gs.receive_json()['message']['display_name'], 'Guest')
                hs.send_json({'type': 'mute-all'})
                self.assertEqual(gs.receive_json()['type'], 'force-mute')
                self.assertFalse(gs.receive_json()['participant']['audio'])
                self.assertEqual(hs.receive_json()['type'], 'participant-updated')
                hs.send_json({'type': 'end'})
                self.assertEqual(hs.receive_json()['type'], 'ended')
                self.assertEqual(gs.receive_json()['type'], 'ended')
        self.assertEqual(self.client.get(f'/api/meetings/{identifier}').json()['status'], 'ended')
        with database() as connection:
            self.assertEqual(connection.execute('SELECT COUNT(*) FROM messages WHERE meeting_id=?', (identifier,)).fetchone()[0], 1)
            self.assertEqual(connection.execute('SELECT COUNT(*) FROM participants WHERE meeting_id=? AND left_at IS NULL', (identifier,)).fetchone()[0], 0)

    def test_removed_participant_cannot_rejoin(self):
        identifier = self.create()['id']
        host = self.join(self.client, identifier, 'Host')
        guest = self.join(self.guest, identifier, 'Guest')
        with self.client.websocket_connect(f"/api/ws/{identifier}/{host['participant_id']}") as hs:
            hs.receive_json()
            with self.client.websocket_connect(f"/api/ws/{identifier}/{guest['participant_id']}", headers={'cookie': f"zoom_session={self.guest.cookies.get('zoom_session')}"}) as gs:
                gs.receive_json(); hs.receive_json()
                hs.send_json({'type': 'remove', 'target': guest['participant_id']})
                self.assertEqual(gs.receive_json()['type'], 'removed')
            self.assertEqual(hs.receive_json()['type'], 'participant-left')
            self.assertEqual(self.guest.post(f'/api/meetings/{identifier}/join', json={'display_name': 'Guest'}).status_code, 403)


if __name__ == '__main__':
    unittest.main()
