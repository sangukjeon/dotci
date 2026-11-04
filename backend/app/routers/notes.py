"""쪽지 하나에 대한 일: 도움됐어요(누르기·취소), 삭제, 관리자 숨기기, 도감 (CLAUDE.md 4장 F8·F9, 8장)."""

import json

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlmodel import Session, col, delete, func, select

from ..db import get_session
from ..deps import admin_user, current_user, fail
from ..models import Helpful, Note, NoteMilestone, Place, Report, Unlock, User
from .places import get_place, iso
from .push import send_to_user

router = APIRouter(prefix="/api", tags=["notes"])


def get_note(session: Session, note_id: int) -> Note:
    note = session.get(Note, note_id)
    if note is None:
        raise fail(404, "not_found")
    return note


# 도움됐어요가 이 수에 처음 닿을 때만 쓴 사람에게 알림 (너무 자주 오지 않게)
MILESTONES = (1, 3, 10, 30, 100)


def reaction_payload(note: Note, place_name: str, count: int) -> str:
    body = (
        f"{place_name}에 남긴 쪽지가 누군가에게 도움이 됐어요."
        if count == 1
        else f"{place_name}에 남긴 쪽지에 도움됐어요가 {count}개 모였어요."
    )
    return json.dumps(
        {"title": "내 쪽지가 도움됐어요 💙", "body": body, "url": f"/place/{note.place_id}", "tag": f"note-{note.id}"},
        ensure_ascii=False,
    )


@router.post("/notes/{note_id}/helpful")
def add_helpful(
    note_id: int,
    background: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(current_user),
) -> dict:
    """연 쪽지에만, 1인 1회, 자기 쪽지는 안 됨."""
    note = get_note(session, note_id)
    if note.is_hidden:
        raise fail(404, "not_found")
    if note.author_id == user.id:
        raise fail(400, "own_note")
    unlock = session.exec(select(Unlock).where(Unlock.place_id == note.place_id, Unlock.user_id == user.id)).first()
    if unlock is None or note.created_at > unlock.last_seen_at:
        raise fail(403, "locked")

    if session.get(Helpful, (note.id, user.id)) is None:
        session.add(Helpful(note_id=note.id, user_id=user.id))
        note.helpful_count += 1
        session.add(note)
        count = note.helpful_count
        notify = count in MILESTONES and session.get(NoteMilestone, (note.id, count)) is None
        if notify:
            session.add(NoteMilestone(note_id=note.id, milestone=count))
        session.commit()
        if notify:
            place = session.get(Place, note.place_id)
            background.add_task(send_to_user, note.author_id, reaction_payload(note, place.name if place else "캠퍼스", count))
    return {"helpful_count": note.helpful_count}


@router.delete("/notes/{note_id}/helpful")
def remove_helpful(note_id: int, session: Session = Depends(get_session), user: User = Depends(current_user)) -> dict:
    """내가 누른 도움됐어요 취소. 누른 적 없으면 그대로 둔다."""
    note = get_note(session, note_id)
    helpful = session.get(Helpful, (note.id, user.id))
    if helpful is not None:
        session.delete(helpful)
        note.helpful_count = max(0, note.helpful_count - 1)
        session.add(note)
        session.commit()
    return {"helpful_count": note.helpful_count}


def _delete_note(session: Session, note: Note) -> None:
    ids = [note.id, *session.exec(select(Note.id).where(Note.parent_id == note.id)).all()]
    session.exec(delete(Helpful).where(col(Helpful.note_id).in_(ids)))
    session.exec(delete(Report).where(col(Report.note_id).in_(ids)))
    session.exec(delete(NoteMilestone).where(col(NoteMilestone.note_id).in_(ids)))
    session.exec(delete(Note).where(Note.parent_id == note.id))
    session.delete(note)
    session.commit()


@router.delete("/notes/{note_id}")
def delete_note(note_id: int, session: Session = Depends(get_session), user: User = Depends(current_user)) -> dict:
    note = get_note(session, note_id)
    if note.author_id != user.id and not user.is_admin:
        raise fail(403, "forbidden")
    _delete_note(session, note)
    return {"ok": True}


# ---------- 관리자 ----------


def _set_hidden(session: Session, note_id: int, hidden: bool) -> dict:
    note = get_note(session, note_id)
    note.is_hidden = hidden
    session.add(note)
    session.commit()
    return {"ok": True}


@router.post("/admin/notes/{note_id}/hide")
def hide_note(note_id: int, session: Session = Depends(get_session), _admin: User = Depends(admin_user)) -> dict:
    return _set_hidden(session, note_id, True)


@router.post("/admin/notes/{note_id}/unhide")
def unhide_note(note_id: int, session: Session = Depends(get_session), _admin: User = Depends(admin_user)) -> dict:
    return _set_hidden(session, note_id, False)


@router.get("/admin/places/{place_id}/notes")
def admin_list_notes(
    place_id: str, session: Session = Depends(get_session), _admin: User = Depends(admin_user)
) -> list[dict]:
    """관리자 화면: 숨긴 쪽지까지 전부, 본문 포함."""
    get_place(session, place_id)
    notes = session.exec(
        select(Note).where(Note.place_id == place_id).order_by(col(Note.created_at).desc())
    ).all()
    authors = {u.id: u for u in session.exec(select(User).where(col(User.id).in_({n.author_id for n in notes}))).all()}
    reports = dict(
        session.exec(
            select(Report.note_id, func.count()).where(col(Report.note_id).in_([n.id for n in notes])).group_by(Report.note_id)
        ).all()
    )
    return [
        {
            "id": n.id,
            "place_id": n.place_id,
            "category": n.category,
            "content": n.content,
            "hint": n.hint,
            "course_name": n.course_name,
            "helpful_count": n.helpful_count,
            "is_official": n.is_official,
            "is_hidden": n.is_hidden,
            "created_at": iso(n.created_at),
            "report_count": reports.get(n.id, 0),
            "author": {
                "nickname": authors[n.author_id].nickname if n.author_id in authors else "알 수 없음",
                "grade": authors[n.author_id].grade if n.author_id in authors else None,
            },
        }
        for n in notes
    ]


# ---------- 도감 ----------


@router.get("/me/collection")
def collection(session: Session = Depends(get_session), user: User = Depends(current_user)) -> dict:
    unlocks = session.exec(
        select(Unlock).where(Unlock.user_id == user.id, Unlock.method != "adm").order_by(Unlock.first_unlocked_at)
    ).all()
    notes = session.exec(
        select(Note).where(Note.author_id == user.id).order_by(col(Note.created_at).desc())
    ).all()
    return {
        "unlocked": [{"place_id": u.place_id, "first_unlocked_at": iso(u.first_unlocked_at)} for u in unlocks],
        "my_notes": [
            {"id": n.id, "place_id": n.place_id, "category": n.category, "content": n.content, "created_at": iso(n.created_at)}
            for n in notes
        ],
    }
