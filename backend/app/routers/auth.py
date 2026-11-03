"""회원가입·로그인 (CLAUDE.md 5장).

가입: 아이디 + 비밀번호 + 학년 + 학과 초대 코드 + 캠퍼스 위치 확인(GPS 또는 장소 QR)
닉네임은 서버가 자동으로 짓는다. 로그인 5번 틀리면 10분 잠금.
"""

from datetime import timedelta
from typing import Literal

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, Field
from sqlmodel import Session, col, delete, or_, select

from ..config import settings
from ..db import get_session
from ..deps import current_user, fail
from ..geo import distance_m
from ..models import Department, Helpful, InviteCode, Note, Place, Report, TimetableEntry, Unlock, User, now_utc
from ..nicknames import random_nickname
from ..security import (
    DUMMY_HASH,
    clear_session_cookie,
    hash_password,
    set_session_cookie,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

LOCK_AFTER = 5
LOCK_FOR = timedelta(minutes=10)
SIGNUP_MAX_ACCURACY_M = 1000  # 가입 때 받아 주는 위치 오차 한도
SIGNUP_ACCURACY_BONUS_M = 200  # 오차만큼 봐주되 최대 200m까지

# 아이디: 영문·숫자·_·- 3~20자 / 비밀번호: 8~64자 (bcrypt는 72바이트까지만 읽음)
USERNAME = Field(min_length=3, max_length=20, pattern=r"^[A-Za-z0-9_-]+$")
PASSWORD = Field(min_length=8, max_length=64)


# ---------- 모양 ----------


class GpsLocation(BaseModel):
    method: Literal["gps"]
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    accuracy: float = Field(ge=0, le=100_000)


class QrLocation(BaseModel):
    method: Literal["qr"]
    code: str = Field(min_length=1, max_length=200)


class SignupIn(BaseModel):
    username: str = USERNAME
    password: str = PASSWORD
    grade: int = Field(ge=1, le=6)
    invite_code: str = Field(min_length=1, max_length=20)
    location: GpsLocation | QrLocation = Field(discriminator="method")


class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=40)
    password: str = Field(min_length=1, max_length=64)


class InviteIn(BaseModel):
    code: str = Field(min_length=1, max_length=20)


class UserOut(BaseModel):
    id: str
    username: str
    nickname: str
    grade: int
    department: str
    is_admin: bool


def user_out(session: Session, user: User) -> UserOut:
    dept = session.get(Department, user.department_id)
    return UserOut(
        id=str(user.id),
        username=user.username,
        nickname=user.nickname,
        grade=user.grade,
        department=dept.name if dept else "",
        is_admin=user.is_admin,
    )


def find_place_by_code(session: Session, code: str) -> Place | None:
    """QR 값(16자) 또는 6자리 코드로 장소를 찾는다. QR 주소 전체를 붙여 넣어도 ?qr= 값을 읽는다."""
    code = code.strip()
    if "qr=" in code:
        code = code.split("qr=", 1)[1].split("&", 1)[0]
    return session.exec(
        select(Place).where(Place.is_active, or_(Place.qr_code == code, Place.manual_code == code))
    ).first()


def usable_invite(session: Session, code: str) -> InviteCode | None:
    invite = session.get(InviteCode, code.strip().upper())
    if invite is None or not invite.is_active or invite.used_count >= invite.max_uses:
        return None
    if invite.expires_at is not None and invite.expires_at < now_utc():
        return None
    return invite


# ---------- 주소 ----------


@router.post("/invite")
def check_invite(body: InviteIn, session: Session = Depends(get_session)) -> dict:
    """가입 첫 단계에서 초대 코드가 맞는지, 어느 학과인지 미리 보여 준다."""
    invite = usable_invite(session, body.code)
    if invite is None:
        raise fail(400, "bad_invite")
    return {"department": session.get(Department, invite.department_id).name}


@router.post("/signup", response_model=UserOut)
def signup(body: SignupIn, response: Response, session: Session = Depends(get_session)) -> UserOut:
    invite = usable_invite(session, body.invite_code)
    if invite is None:
        raise fail(400, "bad_invite")
    if session.exec(select(User).where(User.username == body.username)).first():
        raise fail(409, "username_taken")

    # 캠퍼스 위치 확인: GPS가 캠퍼스 안이거나, 등록된 장소 QR·코드를 알고 있으면 통과
    loc = body.location
    if isinstance(loc, GpsLocation):
        # 노트북은 와이파이로 위치를 추정해 오차가 수백 m인 경우가 많다.
        # 가입은 초대 코드도 함께 보므로, 장소 잠금 해제(오차 100m까지)보다 넉넉하게 판정한다.
        if loc.accuracy > SIGNUP_MAX_ACCURACY_M:
            raise fail(400, "low_accuracy")
        d = distance_m(loc.lat, loc.lng, settings.campus_lat, settings.campus_lng)
        if d > settings.campus_radius_m + min(loc.accuracy, SIGNUP_ACCURACY_BONUS_M):
            raise fail(400, "off_campus")
    elif find_place_by_code(session, loc.code) is None:
        raise fail(400, "bad_code")

    user = User(
        username=body.username,
        password_hash=hash_password(body.password),
        nickname=random_nickname(),
        grade=body.grade,
        department_id=invite.department_id,
    )
    invite.used_count += 1
    session.add(user)
    session.add(invite)
    session.commit()
    session.refresh(user)

    set_session_cookie(response, user.id)
    return user_out(session, user)


@router.post("/login", response_model=UserOut)
def login(body: LoginIn, response: Response, session: Session = Depends(get_session)) -> UserOut:
    user = session.exec(select(User).where(User.username == body.username)).first()
    if user is None:
        verify_password(body.password, DUMMY_HASH)  # 시간 맞추기용
        raise fail(401, "bad_credentials")

    now = now_utc()
    if user.locked_until and user.locked_until > now:
        raise fail(423, "locked")

    if not verify_password(body.password, user.password_hash):
        user.failed_logins += 1
        if user.failed_logins >= LOCK_AFTER:
            user.failed_logins = 0
            user.locked_until = now + LOCK_FOR
            session.add(user)
            session.commit()
            raise fail(423, "locked")
        session.add(user)
        session.commit()
        raise fail(401, "bad_credentials", remaining=LOCK_AFTER - user.failed_logins)

    user.failed_logins = 0
    user.locked_until = None
    session.add(user)
    session.commit()
    set_session_cookie(response, user.id)
    return user_out(session, user)


@router.post("/logout")
def logout(response: Response) -> dict:
    clear_session_cookie(response)
    return {"ok": True}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user), session: Session = Depends(get_session)) -> UserOut:
    return user_out(session, user)


@router.delete("/me")
def withdraw(response: Response, user: User = Depends(current_user), session: Session = Depends(get_session)) -> dict:
    """탈퇴: 계정과 그 사람이 남긴 기록(쪽지, 해제, 도움됐어요, 신고, 시간표)을 모두 지운다."""
    my_note_ids = select(Note.id).where(Note.author_id == user.id)
    # 내 쪽지에 달린 덧붙이기·도움됐어요·신고부터 지운다 (외래 키 순서)
    child_ids = select(Note.id).where(col(Note.parent_id).in_(my_note_ids))
    for note_ids in (child_ids, my_note_ids):
        session.exec(delete(Helpful).where(col(Helpful.note_id).in_(note_ids)))
        session.exec(delete(Report).where(col(Report.note_id).in_(note_ids)))
    session.exec(delete(Note).where(col(Note.id).in_(child_ids)))
    session.exec(delete(Note).where(Note.author_id == user.id))

    session.exec(delete(Helpful).where(Helpful.user_id == user.id))
    session.exec(delete(Report).where(Report.user_id == user.id))
    session.exec(delete(Unlock).where(Unlock.user_id == user.id))
    session.exec(delete(TimetableEntry).where(TimetableEntry.user_id == user.id))
    session.delete(user)
    session.commit()

    clear_session_cookie(response)
    return {"ok": True}
