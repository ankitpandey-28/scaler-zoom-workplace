import json
import os
import secrets
import sqlite3
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import Depends, FastAPI, HTTPException, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from .database import database, initialize, meeting_id, now
from .models import JoinRequest, MeetingCreate, LoginRequest, SignupRequest
from .rooms import Member, rooms
from .security import (COOKIE_NAME, check_origin, check_login_limit, failed_logins,
                       hash_password, login_key, new_session, public_user,
                       record_failed_login, verify_password)


@asynccontextmanager
async def lifespan(_app):
    initialize()
    yield


app = FastAPI(title='Zoom Workplace API', version='1.0.0', lifespan=lifespan)
origins = os.getenv('FRONTEND_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000').split(',')
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True,
                   allow_methods=['GET', 'POST', 'DELETE'], allow_headers=['Content-Type'])


def session(request: Request, response: Response):
    if request.method not in ('GET', 'HEAD'):
        check_origin(request)
    token = request.cookies.get(COOKIE_NAME, '')
    with database() as connection:
        row = connection.execute('SELECT * FROM sessions WHERE token=? AND expires_at>?', (token, now())).fetchone()
        if not row:
            token = new_session(connection, request, response, 1, False)
            return {'token': token, 'user_id': None}
        return {'token': token, 'user_id': row['user_id'] if row['authenticated'] else None}


def require_user(request: Request):
    if request.method not in ('GET', 'HEAD'):
        check_origin(request)
    token = request.cookies.get(COOKIE_NAME, '')
    with database() as connection:
        row = connection.execute('SELECT user_id FROM sessions WHERE token=? AND authenticated=1 AND expires_at>?', (token, now())).fetchone()
    if not row:
        raise HTTPException(401, 'Sign in to your account to continue.')
    return {'token': token, 'user_id': row['user_id']}


def find_meeting(connection, identifier):
    row = connection.execute('SELECT m.*,u.display_name AS host_name FROM meetings m JOIN users u ON u.id=m.host_user_id WHERE m.id=?',
                             (identifier,)).fetchone()
    if not row:
        raise HTTPException(404, 'Meeting not found. Check the meeting ID and try again.')
    return row


def public_meeting(row, context):
    value = dict(row)
    value['is_host'] = value['host_user_id'] == context['user_id']
    value.pop('host_session', None)
    value['invite_path'] = f"/meeting/{value['id']}"
    return value


@app.get('/api/health')
def health():
    with database() as connection:
        connection.execute('SELECT 1').fetchone()
    return {'status': 'ok', 'database': 'sqlite'}


@app.get('/api/me')
def me(context=Depends(require_user)):
    with database() as connection:
        return public_user(connection.execute('SELECT * FROM users WHERE id=?', (context['user_id'],)).fetchone())


@app.post('/api/auth/signup', status_code=201)
def signup(body: SignupRequest, request: Request, response: Response):
    check_origin(request)
    encoded = hash_password(body.password)
    with database() as connection:
        try:
            cursor = connection.execute('INSERT INTO users (display_name,email,password_hash,created_at) VALUES (?,?,?,?)',
                                        (body.display_name, body.email, encoded, now()))
        except sqlite3.IntegrityError:
            raise HTTPException(409, 'An account with this email already exists. Sign in instead.')
        old_token = request.cookies.get(COOKIE_NAME)
        if old_token:
            connection.execute('UPDATE sessions SET authenticated=0,expires_at=? WHERE token=?', (now(), old_token))
        new_session(connection, request, response, cursor.lastrowid, True, body.remember)
        return public_user(connection.execute('SELECT * FROM users WHERE id=?', (cursor.lastrowid,)).fetchone())


@app.post('/api/auth/login')
def login(body: LoginRequest, request: Request, response: Response):
    check_origin(request)
    key = login_key(request, body.email)
    check_login_limit(key)
    with database() as connection:
        user = connection.execute('SELECT * FROM users WHERE email=? COLLATE NOCASE', (body.email,)).fetchone()
        # Perform equivalent password work for an unknown email to reduce timing disclosure.
        encoded = user['password_hash'] if user else connection.execute('SELECT password_hash FROM users WHERE id=1').fetchone()['password_hash']
        valid = verify_password(body.password, encoded)
        if not user or not valid:
            record_failed_login(key)
            raise HTTPException(401, 'Incorrect email or password.')
        failed_logins.pop(key, None)
        old_token = request.cookies.get(COOKIE_NAME)
        if old_token:
            connection.execute('UPDATE sessions SET authenticated=0,expires_at=? WHERE token=?', (now(), old_token))
        new_session(connection, request, response, user['id'], True, body.remember)
        return public_user(user)


@app.post('/api/auth/logout', status_code=204)
async def logout(request: Request, response: Response, context=Depends(session)):
    with database() as connection:
        connection.execute('UPDATE sessions SET authenticated=0,expires_at=? WHERE token=?', (now(), context['token']))
    response.delete_cookie(COOKIE_NAME, path='/')
    for room in list(rooms.rooms.values()):
        for member in list(room.values()):
            if member.session_token == context['token']:
                await rooms.send(member, {'type': 'session-expired'})
                await member.socket.close(code=1008)


@app.get('/api/meetings')
def list_meetings(context=Depends(require_user)):
    with database() as connection:
        rows = connection.execute('''SELECT m.*,u.display_name AS host_name,
            (SELECT COUNT(*) FROM participants p WHERE p.meeting_id=m.id) AS participant_count
            FROM meetings m JOIN users u ON u.id=m.host_user_id
            WHERE m.host_user_id=? OR EXISTS (SELECT 1 FROM participants p WHERE p.meeting_id=m.id AND p.user_id=?)
            ORDER BY scheduled_at''', (context['user_id'], context['user_id'])).fetchall()
        return [public_meeting(row, context) for row in rows]


@app.post('/api/meetings', status_code=201)
def create_meeting(body: MeetingCreate, context=Depends(require_user)):
    with database() as connection:
        identifier = meeting_id(connection)
        scheduled = body.scheduled_at.astimezone(timezone.utc).isoformat() if body.scheduled_at else now()
        user = connection.execute('SELECT display_name FROM users WHERE id=?', (context['user_id'],)).fetchone()
        title = body.title or f"{user['display_name']}’s Zoom Meeting"
        connection.execute('''INSERT INTO meetings
            (id,host_user_id,host_session,title,description,scheduled_at,duration_minutes,kind,status,created_at)
            VALUES (?,?,?,?,?,?,?,?,'scheduled',?)''',
            (identifier, context['user_id'], context['token'], title, body.description.strip(), scheduled, body.duration_minutes,
             'scheduled' if body.scheduled_at else 'instant', now()))
        return public_meeting(find_meeting(connection, identifier), context)


@app.get('/api/meetings/{identifier}')
def get_meeting(identifier: str, context=Depends(session)):
    with database() as connection:
        return public_meeting(find_meeting(connection, identifier), context)


@app.delete('/api/meetings/{identifier}', status_code=204)
def cancel_meeting(identifier: str, context=Depends(require_user)):
    with database() as connection:
        meeting = find_meeting(connection, identifier)
        if meeting['host_user_id'] != context['user_id']:
            raise HTTPException(403, 'Only the host can cancel this meeting.')
        if meeting['status'] != 'scheduled':
            raise HTTPException(409, 'Only an upcoming meeting can be cancelled.')
        connection.execute("UPDATE meetings SET status='cancelled' WHERE id=?", (identifier,))


@app.post('/api/meetings/{identifier}/join')
def join_meeting(identifier: str, body: JoinRequest, context=Depends(session)):
    with database() as connection:
        meeting = find_meeting(connection, identifier)
        if meeting['status'] in ('ended', 'cancelled'):
            raise HTTPException(409, 'This meeting has ended or was cancelled.')
        if connection.execute('SELECT 1 FROM participants WHERE meeting_id=? AND removed=1 AND (session_token=? OR user_id=?)', (identifier, context['token'], context['user_id'])).fetchone():
            raise HTTPException(403, 'You were removed from this meeting by the host.')
        is_host = meeting['host_user_id'] == context['user_id']
        participant_id = secrets.token_urlsafe(18)
        connection.execute('''INSERT INTO participants
            (id,meeting_id,session_token,user_id,display_name,is_host,joined_at) VALUES (?,?,?,?,?,?,?)''',
            (participant_id, identifier, context['token'], context['user_id'], body.display_name, int(is_host), now()))
        return {'participant_id': participant_id, 'is_host': is_host, 'display_name': body.display_name}


@app.get('/api/rtc-config')
def rtc_config():
    servers = [{'urls': ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302']}]
    if os.getenv('TURN_URL'):
        servers.append({'urls': os.environ['TURN_URL'], 'username': os.getenv('TURN_USERNAME', ''),
                        'credential': os.getenv('TURN_CREDENTIAL', '')})
    return {'iceServers': servers}


@app.websocket('/api/ws/{identifier}/{participant_id}')
async def meeting_socket(socket: WebSocket, identifier: str, participant_id: str):
    # Credentials are HttpOnly; never send host capabilities in invite URLs or signaling.
    origin = socket.headers.get('origin')
    forwarded_host = socket.headers.get('x-forwarded-host', socket.headers.get('host', ''))
    if origin and origin not in origins and origin.split('://')[-1] != forwarded_host:
        await socket.close(code=1008)
        return
    token = socket.cookies.get('zoom_session')
    with database() as connection:
        participant = connection.execute('''SELECT p.id,p.display_name,p.is_host FROM participants p
            JOIN sessions s ON s.token=p.session_token WHERE p.id=? AND p.meeting_id=? AND p.session_token=?
            AND p.left_at IS NULL AND p.removed=0 AND s.expires_at>?''',
            (participant_id, identifier, token, now())).fetchone()
        meeting = connection.execute('SELECT status FROM meetings WHERE id=?', (identifier,)).fetchone()
        if not participant or not meeting or meeting['status'] in ('ended', 'cancelled'):
            await socket.close(code=1008)
            return
        connection.execute("UPDATE meetings SET status='active',started_at=COALESCE(started_at,?) WHERE id=?", (now(), identifier))
        history = [dict(row) for row in connection.execute('''SELECT m.id,m.body,m.created_at,p.display_name,p.id AS participant_id
            FROM messages m JOIN participants p ON p.id=m.participant_id WHERE m.meeting_id=? ORDER BY m.id DESC LIMIT 100''', (identifier,))][::-1]
    await socket.accept()
    room = rooms.rooms.setdefault(identifier, {})
    if participant_id in room:
        await socket.close(code=1008)
        return
    member = Member(socket, dict(participant), session_token=token)
    member.participant['is_host'] = bool(member.participant['is_host'])
    room[participant_id] = member
    await rooms.send(member, {'type': 'welcome', 'self': member.public(),
                              'participants': [other.public() for other in room.values()], 'messages': history})
    await rooms.broadcast(identifier, {'type': 'participant-joined', 'participant': member.public()}, exclude=participant_id)
    try:
        while True:
            raw = await socket.receive_text()
            with database() as connection:
                valid_session = connection.execute('SELECT authenticated FROM sessions WHERE token=? AND expires_at>?', (token, now())).fetchone()
            if not valid_session or (member.participant['is_host'] and not valid_session['authenticated']):
                await rooms.send(member, {'type': 'session-expired'})
                await socket.close(code=1008)
                break
            if len(raw) > 100_000:
                await rooms.send(member, {'type': 'error', 'message': 'Message is too large.'})
                continue
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if not isinstance(data, dict):
                continue
            kind = data.get('type')
            if kind == 'signal':
                target = room.get(data.get('to'))
                payload = data.get('payload')
                if target and target is not member and isinstance(payload, dict):
                    await rooms.send(target, {'type': 'signal', 'from': participant_id, 'payload': payload})
            elif kind == 'media':
                for key in ('audio', 'video', 'sharing', 'hand'):
                    if isinstance(data.get(key), bool):
                        setattr(member, key, data[key])
                await rooms.broadcast(identifier, {'type': 'participant-updated', 'participant': member.public()})
            elif kind == 'chat':
                body = data.get('body')
                if not isinstance(body, str) or not body.strip() or len(body) > 2000:
                    continue
                created = now()
                with database() as connection:
                    cursor = connection.execute('INSERT INTO messages (meeting_id,participant_id,body,created_at) VALUES (?,?,?,?)',
                                                (identifier, participant_id, body.strip(), created))
                    message = {'id': cursor.lastrowid, 'body': body.strip(), 'created_at': created,
                               'participant_id': participant_id, 'display_name': participant['display_name']}
                await rooms.broadcast(identifier, {'type': 'chat', 'message': message})
            elif kind in ('mute-all', 'mute', 'remove', 'end'):
                if not member.participant['is_host']:
                    await rooms.send(member, {'type': 'error', 'message': 'Only the host can do that.'})
                    continue
                if kind == 'end':
                    with database() as connection:
                        connection.execute("UPDATE meetings SET status='ended',ended_at=? WHERE id=?", (now(), identifier))
                    await rooms.broadcast(identifier, {'type': 'ended'})
                    for other in list(room.values()):
                        await other.socket.close(code=1000)
                    break
                targets = [other for other in room.values() if not other.participant['is_host']] if kind == 'mute-all' else [room.get(data.get('target'))]
                for other in targets:
                    if other and not other.participant['is_host']:
                        if kind == 'remove':
                            with database() as connection:
                                connection.execute('UPDATE participants SET removed=1,left_at=? WHERE id=?', (now(), other.participant['id']))
                            room.pop(other.participant['id'], None)
                            await rooms.send(other, {'type': 'removed'})
                            await rooms.broadcast(identifier, {'type': 'participant-left', 'id': other.participant['id']})
                            await other.socket.close(code=1008)
                        else:
                            other.audio = False
                            await rooms.send(other, {'type': 'force-mute'})
                            await rooms.broadcast(identifier, {'type': 'participant-updated', 'participant': other.public()})
            elif kind == 'ping':
                await rooms.send(member, {'type': 'pong'})
    except (WebSocketDisconnect, RuntimeError, OSError):
        pass
    finally:
        was_present = room.pop(participant_id, None) is not None
        with database() as connection:
            connection.execute('UPDATE participants SET left_at=? WHERE id=?', (now(), participant_id))
            if not room:
                connection.execute("UPDATE meetings SET status='ended',ended_at=? WHERE id=? AND status='active'", (now(), identifier))
                rooms.rooms.pop(identifier, None)
        if was_present:
            await rooms.broadcast(identifier, {'type': 'participant-left', 'id': participant_id})
