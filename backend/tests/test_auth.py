import os
import tempfile
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect
from backend.main import app
from backend.database import database
from backend.security import failed_logins, verify_password
from backend.rooms import rooms


class AuthTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {'DATABASE_PATH': os.path.join(self.temp.name, 'test.db')})
        self.env.start()
        failed_logins.clear()
        self.client = TestClient(app)
        self.client.__enter__()
        self.other = TestClient(app)

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.other.close()
        rooms.rooms.clear()
        self.env.stop()
        self.temp.cleanup()

    def signup(self, client, email='priya@example.com'):
        response = client.post('/api/auth/signup', json={'display_name': 'Priya Sharma', 'email': email, 'password': 'SecurePass123!'})
        self.assertEqual(response.status_code, 201)
        return response

    def test_signup_password_hash_cookie_and_logout(self):
        response = self.signup(self.client, 'PRIYA@example.com')
        user = response.json()
        self.assertEqual(user['email'], 'priya@example.com')
        self.assertNotIn('password_hash', user)
        cookie = response.headers['set-cookie']
        self.assertIn('HttpOnly', cookie)
        self.assertIn('SameSite=lax', cookie)
        self.assertEqual(self.client.get('/api/me').json(), user)
        with database() as connection:
            encoded = connection.execute('SELECT password_hash FROM users WHERE id=?', (user['id'],)).fetchone()[0]
            self.assertNotEqual(encoded, 'SecurePass123!')
            self.assertTrue(verify_password('SecurePass123!', encoded))
        token = self.client.cookies.get('zoom_session')
        self.assertEqual(self.client.post('/api/auth/logout').status_code, 204)
        self.assertEqual(self.client.get('/api/me').status_code, 401)
        self.assertEqual(self.other.get('/api/me', headers={'cookie': f'zoom_session={token}'}).status_code, 401)

    def test_login_rotation_expiration_and_remember(self):
        self.signup(self.client)
        old = self.client.cookies.get('zoom_session')
        response = self.client.post('/api/auth/login', json={'email': 'PRIYA@example.com', 'password': 'SecurePass123!', 'remember': True})
        self.assertEqual(response.status_code, 200)
        token = self.client.cookies.get('zoom_session')
        self.assertNotEqual(old, token)
        self.assertIn('Max-Age=2592000', response.headers['set-cookie'])
        self.assertEqual(self.other.get('/api/me', headers={'cookie': f'zoom_session={old}'}).status_code, 401)
        with database() as connection:
            connection.execute("UPDATE sessions SET expires_at='2000-01-01T00:00:00+00:00' WHERE token=?", (token,))
        self.assertEqual(self.client.get('/api/me').status_code, 401)

    def test_duplicates_validation_wrong_password_and_rate_limit(self):
        self.signup(self.client)
        duplicate = self.other.post('/api/auth/signup', json={'display_name': 'Another user', 'email': 'PRIYA@example.com', 'password': 'SecurePass123!'})
        self.assertEqual(duplicate.status_code, 409)
        for extra in [{'password': 'weak'}, {'display_name': ' '}, {'email': 'broken'}]:
            payload = {'display_name': 'Valid name', 'email': 'new@example.com', 'password': 'SecurePass123!', **extra}
            self.assertEqual(self.other.post('/api/auth/signup', json=payload).status_code, 422)
        for _ in range(10):
            response = self.other.post('/api/auth/login', json={'email': 'priya@example.com', 'password': 'wrong'})
            self.assertEqual(response.status_code, 401)
        self.assertEqual(self.other.post('/api/auth/login', json={'email': 'priya@example.com', 'password': 'wrong'}).status_code, 429)

    def test_meeting_privacy_guest_join_and_host_across_login(self):
        user = self.signup(self.client).json()
        self.assertEqual(self.client.get('/api/meetings').json(), [])
        meeting = self.client.post('/api/meetings', json={}).json()
        self.assertIn(user['display_name'], meeting['title'])
        self.assertEqual(self.other.get('/api/meetings').status_code, 401)
        self.assertEqual(self.other.post('/api/meetings', json={}).status_code, 401)
        guest = self.other.post(f"/api/meetings/{meeting['id']}/join", json={'display_name': 'Guest'}).json()
        self.assertFalse(guest['is_host'])
        self.signup(self.other, 'other@example.com')
        self.assertEqual(self.other.get('/api/meetings').json(), [])
        self.assertEqual(self.other.delete(f"/api/meetings/{meeting['id']}").status_code, 403)
        self.client.post('/api/auth/logout')
        self.client.post('/api/auth/login', json={'email': 'priya@example.com', 'password': 'SecurePass123!'})
        self.assertTrue(self.client.get(f"/api/meetings/{meeting['id']}").json()['is_host'])
        registered = self.other.post(f"/api/meetings/{meeting['id']}/join", json={'display_name': 'Other account'}).json()
        self.assertFalse(registered['is_host'])
        self.assertEqual(len(self.other.get('/api/meetings').json()), 1)
        self.assertTrue(self.client.post(f"/api/meetings/{meeting['id']}/join", json={'display_name': 'Host'}).json()['is_host'])

    def test_cross_origin_rejected_and_https_secure_cookie(self):
        payload = {'email': 'ankit.sharma@example.com', 'password': 'ZoomDemo123!'}
        self.assertEqual(self.client.post('/api/auth/login', json=payload, headers={'origin': 'https://evil.example'}).status_code, 403)
        response = self.client.post('/api/auth/login', json=payload, headers={'origin': 'https://demo.example', 'x-forwarded-host': 'demo.example', 'x-forwarded-proto': 'https'})
        self.assertEqual(response.status_code, 200)
        self.assertIn('Secure', response.headers['set-cookie'])

    def test_logout_disconnects_existing_room_and_invalidates_ticket(self):
        self.signup(self.client)
        identifier = self.client.post('/api/meetings', json={}).json()['id']
        ticket = self.client.post(f'/api/meetings/{identifier}/join', json={'display_name': 'Host'}).json()
        token = self.client.cookies.get('zoom_session')
        with self.client.websocket_connect(f"/api/ws/{identifier}/{ticket['participant_id']}") as socket:
            self.assertEqual(socket.receive_json()['type'], 'welcome')
            self.assertEqual(self.client.post('/api/auth/logout').status_code, 204)
            self.assertEqual(socket.receive_json()['type'], 'session-expired')
        with self.assertRaises(WebSocketDisconnect):
            with self.client.websocket_connect(f"/api/ws/{identifier}/{ticket['participant_id']}", headers={'cookie': f'zoom_session={token}'}):
                pass


if __name__ == '__main__':
    unittest.main()
