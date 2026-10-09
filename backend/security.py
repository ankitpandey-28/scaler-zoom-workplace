"""Password hashing and browser session helpers; no client-side bearer tokens."""
import hashlib
import hmac
import secrets
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from time import monotonic
from fastapi import HTTPException, Request, Response

PASSWORD_ITERATIONS = 600_000
COOKIE_NAME = 'zoom_session'
failed_logins = defaultdict(deque)


def hash_password(password):
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), PASSWORD_ITERATIONS).hex()
    return f'pbkdf2_sha256${PASSWORD_ITERATIONS}${salt}${digest}'


def verify_password(password, encoded):
    try:
        algorithm, iterations, salt, expected = encoded.split('$')
        if algorithm != 'pbkdf2_sha256':
            return False
        actual = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), int(iterations)).hex()
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def check_origin(request: Request):
    """Reject browser mutations from another origin, including sibling sites."""
    origin = request.headers.get('origin')
    host = request.headers.get('x-forwarded-host', request.headers.get('host', '')).split(',')[0].strip()
    if origin and origin.rstrip('/').split('://')[-1] != host:
        raise HTTPException(403, 'This request came from a different website.')


def login_key(request, email):
    return (request.client.host if request.client else 'unknown', email)


def check_login_limit(key):
    attempts = failed_logins[key]
    current = monotonic()
    while attempts and attempts[0] < current - 60:
        attempts.popleft()
    if len(attempts) >= 10:
        raise HTTPException(429, 'Too many sign-in attempts. Please try again in a minute.')


def record_failed_login(key):
    if len(failed_logins) > 4000:
        failed_logins.clear()
    failed_logins[key].append(monotonic())


def set_session_cookie(request: Request, response: Response, token, seconds):
    secure = request.headers.get('x-forwarded-proto', request.url.scheme).split(',')[0].strip() == 'https'
    response.set_cookie(COOKIE_NAME, token, max_age=seconds, httponly=True, secure=secure, samesite='lax', path='/')


def new_session(connection, request, response, user_id, authenticated, remember=False):
    token = secrets.token_urlsafe(32)
    seconds = 30 * 86400 if remember else 86400
    current = datetime.now(timezone.utc)
    connection.execute('''INSERT INTO sessions (token,user_id,created_at,expires_at,authenticated)
        VALUES (?,?,?,?,?)''', (token, user_id, current.isoformat(),
                              (current + timedelta(seconds=seconds)).isoformat(), int(authenticated)))
    set_session_cookie(request, response, token, seconds)
    return token


def public_user(row):
    return {key: row[key] for key in ('id', 'display_name', 'email')}
