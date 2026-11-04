"""DB 테이블 정의 (CLAUDE.md 7장).

주의: places.qr_code / places.manual_code 는 절대 API 응답에 넣지 않는다.
응답은 schemas 쪽 모양(PlaceOut 등)으로만 내보낸다.
"""

import uuid
from datetime import datetime, time, timezone
from typing import Optional

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


CATEGORIES = ("tip", "study", "food", "warn", "class")


class Department(SQLModel, table=True):
    __tablename__ = "departments"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=50, unique=True)


class InviteCode(SQLModel, table=True):
    __tablename__ = "invite_codes"

    code: str = Field(primary_key=True, max_length=20)
    department_id: int = Field(foreign_key="departments.id")
    max_uses: int = 50
    used_count: int = 0
    expires_at: Optional[datetime] = None
    is_active: bool = True


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    username: str = Field(max_length=20, unique=True, index=True)
    password_hash: str
    nickname: str = Field(max_length=12)
    grade: int = Field(ge=1, le=6)
    department_id: int = Field(foreign_key="departments.id")
    is_admin: bool = False
    failed_logins: int = 0
    locked_until: Optional[datetime] = None
    created_at: datetime = Field(default_factory=now_utc)


class Place(SQLModel, table=True):
    __tablename__ = "places"

    id: str = Field(primary_key=True, max_length=40)  # 예: "lib-3f"
    name: str = Field(max_length=40)
    building: str = Field(max_length=40)
    lat: float
    lng: float
    radius_m: int = 40
    qr_code: str = Field(max_length=16, unique=True)  # 응답 금지
    manual_code: str = Field(max_length=6, unique=True)  # 응답 금지
    intro: str = Field(default="", max_length=200)
    is_active: bool = True


class Note(SQLModel, table=True):
    __tablename__ = "notes"

    id: Optional[int] = Field(default=None, primary_key=True)
    place_id: str = Field(foreign_key="places.id", index=True)
    author_id: uuid.UUID = Field(foreign_key="users.id")
    category: str = Field(max_length=10)  # CATEGORIES 중 하나
    course_name: Optional[str] = Field(default=None, max_length=40)
    content: str = Field(max_length=200)  # 잠금 해제 전에는 절대 응답에 넣지 않음
    hint: Optional[str] = Field(default=None, max_length=15)  # 잠겨 있어도 보이는 작성자 한마디
    helpful_count: int = 0
    parent_id: Optional[int] = Field(default=None, foreign_key="notes.id")  # 덧붙이기
    is_official: bool = False
    is_hidden: bool = False
    client_request_id: uuid.UUID = Field(unique=True)  # 중복 저장 방지
    created_at: datetime = Field(default_factory=now_utc, index=True)


class Unlock(SQLModel, table=True):
    """누가 어느 장소를 열었는지. 좌표는 저장하지 않는다."""

    __tablename__ = "unlocks"
    __table_args__ = (UniqueConstraint("place_id", "user_id"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    place_id: str = Field(foreign_key="places.id")
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    method: str = Field(max_length=3)  # "gps" 또는 "qr"
    first_unlocked_at: datetime = Field(default_factory=now_utc)
    last_seen_at: datetime = Field(default_factory=now_utc)


class Helpful(SQLModel, table=True):
    """도움됐어요. (note_id, user_id) 묶음이 기본키라 같은 사람이 두 번 못 누른다."""

    __tablename__ = "helpfuls"

    note_id: int = Field(foreign_key="notes.id", primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", primary_key=True)
    created_at: datetime = Field(default_factory=now_utc)


class TimetableEntry(SQLModel, table=True):
    """시간표 (시간 되면)."""

    __tablename__ = "timetable_entries"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    course_name: str = Field(max_length=40)
    day: int = Field(ge=0, le=4)  # 0=월 ~ 4=금
    start_time: time
    end_time: time
    building: str = Field(max_length=40)
    place_id: Optional[str] = Field(default=None, foreign_key="places.id")


class Report(SQLModel, table=True):
    """신고 (11/5 확장)."""

    __tablename__ = "reports"

    note_id: int = Field(foreign_key="notes.id", primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", primary_key=True)
    reason: str = Field(max_length=100)
    created_at: datetime = Field(default_factory=now_utc)


class PushSubscription(SQLModel, table=True):
    """공지 알림을 받겠다고 한 브라우저 하나. endpoint는 브라우저 회사(구글·애플 등)의 알림 주소."""

    __tablename__ = "push_subscriptions"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    endpoint: str = Field(max_length=1000, unique=True)
    p256dh: str = Field(max_length=200)  # 알림 내용 암호화용 공개키 (브라우저가 만든 값)
    auth: str = Field(max_length=100)
    created_at: datetime = Field(default_factory=now_utc)


class Announcement(SQLModel, table=True):
    """관리자가 보낸 공지 기록."""

    __tablename__ = "announcements"

    id: Optional[int] = Field(default=None, primary_key=True)
    author_id: Optional[uuid.UUID] = Field(default=None, foreign_key="users.id")  # 보낸 관리자가 탈퇴하면 비움
    title: str = Field(max_length=40)
    body: str = Field(max_length=120)
    url: str = Field(default="/", max_length=100)  # 알림을 누르면 열 앱 안 주소
    sent_count: int = 0
    created_at: datetime = Field(default_factory=now_utc, index=True)


class NoteMilestone(SQLModel, table=True):
    """쪽지 반응 알림을 이미 보낸 단계 (같은 단계 알림을 두 번 보내지 않으려고).
    도움됐어요를 취소했다가 다시 눌러도 같은 알림이 또 가지 않는다."""

    __tablename__ = "note_milestones"

    note_id: int = Field(primary_key=True)  # 쪽지를 지울 때 함께 지운다
    milestone: int = Field(primary_key=True)  # 1, 3, 10, 30, 100
    created_at: datetime = Field(default_factory=now_utc)
