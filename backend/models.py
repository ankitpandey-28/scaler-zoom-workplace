from datetime import datetime, timezone
from pydantic import BaseModel, Field, field_validator
import re


class MeetingCreate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    description: str = Field(default='', max_length=2000)
    scheduled_at: datetime | None = None
    duration_minutes: int = Field(default=30, ge=15, le=480)

    @field_validator('title')
    @classmethod
    def clean_title(cls, value):
        if value is None:
            return value
        if not value.strip():
            raise ValueError('A meeting topic is required.')
        return value.strip()

    @field_validator('scheduled_at')
    @classmethod
    def future_time(cls, value):
        if value:
            if value.tzinfo is None:
                raise ValueError('Include a timezone in the meeting time.')
            if value <= datetime.now(timezone.utc):
                raise ValueError('Choose a date and time in the future.')
        return value


class JoinRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=60)

    @field_validator('display_name')
    @classmethod
    def clean_name(cls, value):
        if not value.strip():
            raise ValueError('Enter your display name.')
        return value.strip()


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)
    remember: bool = False

    @field_validator('email')
    @classmethod
    def valid_email(cls, value):
        value = value.strip().lower()
        if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', value):
            raise ValueError('Enter a valid email address.')
        return value


class SignupRequest(LoginRequest):
    display_name: str = Field(min_length=1, max_length=60)

    @field_validator('display_name')
    @classmethod
    def clean_name(cls, value):
        if not value.strip():
            raise ValueError('Enter your name.')
        return value.strip()

    @field_validator('password')
    @classmethod
    def strong_password(cls, value):
        if len(value) < 8 or not any(c.islower() for c in value) or not any(c.isupper() for c in value) or not any(c.isdigit() for c in value):
            raise ValueError('Use at least 8 characters with uppercase and lowercase letters and a number.')
        return value
