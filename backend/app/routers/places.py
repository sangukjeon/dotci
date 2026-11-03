"""장소·쪽지 (CLAUDE.md 4장 F2~F7, 8장).

가장 중요한 규칙 (CLAUDE.md 2장 규칙 8):
  쪽지 본문(content)은 그 사람이 그 장소를 열었고, 쪽지가 마지막으로 본 시각 이전에 생긴 경우에만 보낸다.
  잠긴 쪽지에는 뒷면 정보만 보내고 content 키 자체를 넣지 않는다.
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, field_validator
from sqlmodel import Session, col, func, select

from ..banned import find_banned
from ..db import get_session
from ..deps import current_user, fail, optional_user, unlock_limiter
from ..geo import judge_gps
from ..models import CATEGORIES, Department, Helpful, Note, Place, Unlock, User, now_utc
from ..security import check_write_token, make_write_token
from .auth import find_place_by_code

router = APIRouter(prefix="/api", tags=["places"])

WRITE_COOLDOWN = timedelta(minutes=1)


# ---------- 응답 모양 ----------
# 응답은 항상 이 모양으로만 내보낸다. qr_code·manual_code 같은 칼럼이 실수로 새지 않게 하기 위함.


class PlaceOut(BaseModel):
    id: str
    name: str
    building: str
    lat: float
    lng: float
    intro: str
    note_count: int
    category_counts: dict[str, int]
    unlocked: bool


def iso(dt: datetime) -> str:
    """화면에 보낼 시각. 예: 2026-11-03T05:16:04Z (끝의 Z = UTC)"""
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def visible_notes(session: Session, place_id: str) -> list[Note]:
    """숨기지 않은 쪽지. 카드 순서는 도움됐어요 많은 순 → 최신순. (덧붙이기 꼬리는 제외)"""
    return list(
        session.exec(
            select(Note)
            .where(Note.place_id == place_id, Note.is_hidden == False, Note.parent_id == None)  # noqa: E711, E712
            .order_by(col(Note.helpful_count).desc(), col(Note.created_at).desc())
        ).all()
    )


def shape_notes(session: Session, notes: list[Note], user: User | None, unlock: Unlock | None) -> list[dict]:
    """쪽지 목록을 응답 모양으로. 볼 수 있는 쪽지만 본문을 넣는다."""
    seen_until = unlock.last_seen_at if unlock else None
    seen = [n for n in notes if seen_until is not None and n.created_at <= seen_until]
    seen_ids = {n.id for n in seen}

    # 본 쪽지에만 필요한 작성자 정보와 "내가 눌렀는지"를 한 번에 불러온다
    authors: dict[uuid.UUID, User] = {}
    liked: set[int] = set()
    if seen:
        author_ids = {n.author_id for n in seen}
        authors = {u.id: u for u in session.exec(select(User).where(col(User.id).in_(author_ids))).all()}
        if user:
            liked = set(
                session.exec(
                    select(Helpful.note_id).where(
                        Helpful.user_id == user.id, col(Helpful.note_id).in_([n.id for n in seen])
                    )
                ).all()
            )
    departments = {d.id: d.name for d in session.exec(select(Department)).all()}

    # 잠긴 카드 뒷면에 보일 작성자 학년
    grade_of = {
        u.id: u.grade
        for u in session.exec(select(User).where(col(User.id).in_({n.author_id for n in notes}))).all()
    } if notes else {}

    result = []
    for n in notes:
        base = {
            "id": n.id,
            "category": n.category,
            "author_grade": grade_of.get(n.author_id),
            "helpful_count": n.helpful_count,
            "course_name": n.course_name,
            "hint": n.hint,
            "is_official": n.is_official,
            "created_at": iso(n.created_at),
        }
        if n.id not in seen_ids:
            result.append({**base, "locked": True})  # content 키 없음
            continue
        author = authors.get(n.author_id)
        result.append(
            {
                **base,
                "locked": False,
                "content": n.content,
                "author_nickname": author.nickname if author else "알 수 없음",
                "author_department": departments.get(author.department_id, "") if author else "",
                "is_mine": user is not None and n.author_id == user.id,
                "liked_by_me": n.id in liked,
            }
        )
    return result


def get_place(session: Session, place_id: str) -> Place:
    place = session.get(Place, place_id)
    if place is None or not place.is_active:
        raise fail(404, "not_found")
    return place


def get_unlock(session: Session, place_id: str, user: User | None) -> Unlock | None:
    if user is None:
        return None
    return session.exec(select(Unlock).where(Unlock.place_id == place_id, Unlock.user_id == user.id)).first()


# ---------- 장소 목록 ----------


@router.get("/places", response_model=list[PlaceOut])
def list_places(
    session: Session = Depends(get_session), user: User | None = Depends(optional_user)
) -> list[PlaceOut]:
    places = session.exec(select(Place).where(Place.is_active).order_by(Place.id)).all()

    # 장소별·카테고리별 쪽지 개수 (숨긴 쪽지, 덧붙이기 꼬리는 제외)
    rows = session.exec(
        select(Note.place_id, Note.category, func.count())
        .where(Note.is_hidden == False, Note.parent_id == None)  # noqa: E711, E712
        .group_by(Note.place_id, Note.category)
    ).all()
    counts: dict[str, dict[str, int]] = {}
    for place_id, category, n in rows:
        counts.setdefault(place_id, {})[category] = n

    opened: set[str] = set()
    if user:
        opened = set(session.exec(select(Unlock.place_id).where(Unlock.user_id == user.id)).all())

    result = []
    for p in places:
        by_cat = {c: counts.get(p.id, {}).get(c, 0) for c in CATEGORIES}
        result.append(
            PlaceOut(
                id=p.id,
                name=p.name,
                building=p.building,
                lat=p.lat,
                lng=p.lng,
                intro=p.intro,
                note_count=sum(by_cat.values()),
                category_counts=by_cat,
                unlocked=p.id in opened,
            )
        )
    return result


# ---------- 책상 (쪽지 목록) ----------


@router.get("/places/{place_id}/notes")
def list_notes(
    place_id: str, session: Session = Depends(get_session), user: User = Depends(current_user)
) -> dict:
    get_place(session, place_id)
    unlock = get_unlock(session, place_id, user)
    return {
        "notes": shape_notes(session, visible_notes(session, place_id), user, unlock),
        "unlocked": unlock is not None,
    }


# ---------- 잠금 해제 ----------


class UnlockIn(BaseModel):
    method: Literal["gps", "qr"]
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    accuracy: float | None = Field(default=None, ge=0, le=100_000)
    code: str | None = Field(default=None, max_length=200)


@router.post("/places/{place_id}/unlock")
def unlock_place(
    place_id: str, body: UnlockIn, session: Session = Depends(get_session), user: User = Depends(current_user)
) -> dict:
    place = get_place(session, place_id)
    if not unlock_limiter.allow(str(user.id)):
        return {"unlocked": False, "reason": "rate_limited"}

    # 좌표는 판정에만 쓰고 저장하거나 로그에 남기지 않는다.
    if body.method == "gps":
        if body.lat is None or body.lng is None or body.accuracy is None:
            raise fail(422, "bad_request")
        ok, reason, distance = judge_gps(place.lat, place.lng, place.radius_m, body.lat, body.lng, body.accuracy)
        if not ok:
            return {"unlocked": False, "reason": reason, "distance_m": distance}
    else:
        owner = find_place_by_code(session, body.code or "")
        if owner is None:
            return {"unlocked": False, "reason": "bad_code"}
        if owner.id != place.id:
            return {"unlocked": False, "reason": "wrong_qr", "place_id": owner.id}

    now = now_utc()
    notes = visible_notes(session, place_id)
    unlock = get_unlock(session, place_id, user)
    first_time = unlock is None
    # 지난번에 본 뒤로 새로 생긴 쪽지 = NEW로 뒤집을 쪽지
    new_ids = [] if first_time else [n.id for n in notes if n.created_at > unlock.last_seen_at]
    if first_time:
        unlock = Unlock(place_id=place_id, user_id=user.id, method=body.method, first_unlocked_at=now)
    unlock.last_seen_at = now
    session.add(unlock)
    session.commit()

    token, expires = make_write_token(user.id, place_id)
    return {
        "unlocked": True,
        "notes": shape_notes(session, notes, user, unlock),
        "new_ids": new_ids,
        "first_time": first_time,
        "write_token": token,
        "write_until": int(expires.timestamp() * 1000),
    }


class CodeIn(BaseModel):
    code: str = Field(min_length=1, max_length=200)


@router.post("/codes/resolve")
def resolve_code(body: CodeIn, session: Session = Depends(get_session), user: User = Depends(current_user)) -> dict:
    """지도에서 바로 QR을 찍었을 때 어느 장소인지만 알려 준다. 해제는 그 장소 책상에서."""
    if not unlock_limiter.allow(str(user.id)):
        raise fail(429, "rate_limited")
    place = find_place_by_code(session, body.code)
    if place is None:
        raise fail(404, "bad_code")
    return {"place_id": place.id}


# ---------- 쪽지 쓰기 ----------


class NoteIn(BaseModel):
    category: Literal["tip", "study", "food", "warn", "class"]
    content: str = Field(max_length=1000)
    course_name: str | None = Field(default=None, max_length=40)
    hint: str | None = Field(default=None, max_length=100)
    write_token: str | None = Field(default=None, max_length=1000)
    client_request_id: uuid.UUID

    @field_validator("content")
    @classmethod
    def _content(cls, v: str) -> str:
        return v.strip()

    @field_validator("hint", "course_name")
    @classmethod
    def _blank_to_none(cls, v: str | None) -> str | None:
        v = (v or "").strip()
        return v or None


@router.post("/places/{place_id}/notes")
def write_note(
    place_id: str, body: NoteIn, session: Session = Depends(get_session), user: User = Depends(current_user)
) -> dict:
    get_place(session, place_id)

    # 같은 요청이 두 번 와도(서버가 깨는 동안 재시도 등) 한 번만 저장한다
    existing = session.exec(select(Note).where(Note.client_request_id == body.client_request_id)).first()
    if existing is not None:
        if existing.author_id != user.id:
            raise fail(409, "duplicate")
        return shape_notes(session, [existing], user, get_unlock(session, place_id, user))[0]

    if not user.is_admin and not check_write_token(body.write_token, user.id, place_id):
        raise fail(403, "write_expired")
    if not 10 <= len(body.content) <= 200:
        raise fail(400, "length")
    if body.hint and len(body.hint) > 15:
        raise fail(400, "hint_length")
    banned = find_banned(body.content, body.hint, body.course_name)
    if banned:
        raise fail(400, "banned_word", word=banned)

    now = now_utc()
    if not user.is_admin:
        last = session.exec(
            select(Note.created_at).where(Note.author_id == user.id).order_by(col(Note.created_at).desc())
        ).first()
        if last is not None and now - last < WRITE_COOLDOWN:
            raise fail(429, "too_fast")

    note = Note(
        place_id=place_id,
        author_id=user.id,
        category=body.category,
        course_name=body.course_name if body.category == "class" else None,
        content=body.content,
        hint=body.hint,
        is_official=user.is_admin,
        client_request_id=body.client_request_id,
        created_at=now,
    )
    session.add(note)

    # 쓴 사람은 자기 쪽지를 바로 볼 수 있게 "마지막으로 본 시각"을 지금으로
    unlock = get_unlock(session, place_id, user)
    if unlock is None:  # 관리자가 열지 않은 장소에 쓴 경우
        unlock = Unlock(place_id=place_id, user_id=user.id, method="adm", first_unlocked_at=now)
    unlock.last_seen_at = now
    session.add(unlock)
    session.commit()
    session.refresh(note)
    return shape_notes(session, [note], user, unlock)[0]
