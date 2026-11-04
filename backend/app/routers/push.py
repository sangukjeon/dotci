"""공지 푸시 알림 (웹 푸시).

흐름:
1. 브라우저가 GET /api/push/key 로 서버 공개키를 받아 "알림 구독"을 만든다.
2. 그 구독(endpoint + 암호화 키)을 POST /api/push/subscribe 로 서버에 저장한다.
3. 관리자가 POST /api/admin/announcements 로 공지를 쓰면, 저장된 구독 모두에게 보낸다.
   알림 내용은 브라우저 키로 암호화돼서 구글·애플 같은 중간 서버도 읽을 수 없다.
"""

import json
from urllib.parse import urlparse

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlmodel import Session, col, delete, select

from ..banned import find_banned
from ..config import settings
from ..db import get_session
from ..deps import admin_user, current_user, fail
from ..models import Announcement, PushSubscription, User
from .places import iso

router = APIRouter(prefix="/api", tags=["push"])

# 브라우저 회사의 알림 서버만 허용한다. 아무 주소나 받으면 우리 서버가 엉뚱한 곳에 요청을 보내게 될 수 있다.
PUSH_HOSTS = (
    "fcm.googleapis.com",  # 크롬·엣지·삼성 인터넷
    "push.services.mozilla.com",  # 파이어폭스
    "web.push.apple.com",  # 사파리·아이폰
    "notify.windows.com",  # 옛 엣지
)


def allowed_endpoint(endpoint: str) -> bool:
    url = urlparse(endpoint)
    host = (url.hostname or "").lower()
    return url.scheme == "https" and any(host == h or host.endswith("." + h) for h in PUSH_HOSTS)


class Keys(BaseModel):
    p256dh: str = Field(min_length=1, max_length=200)
    auth: str = Field(min_length=1, max_length=100)


class SubscribeIn(BaseModel):
    endpoint: str = Field(min_length=1, max_length=1000)
    keys: Keys


class UnsubscribeIn(BaseModel):
    endpoint: str = Field(min_length=1, max_length=1000)


class AnnouncementIn(BaseModel):
    title: str = Field(min_length=1, max_length=40)
    body: str = Field(min_length=1, max_length=120)
    url: str = Field(default="/", max_length=100)


@router.get("/push/key")
def push_key() -> dict:
    """공개키는 비밀이 아니다. 비어 있으면 서버에 알림 기능이 꺼져 있다는 뜻."""
    return {"public_key": settings.vapid_public_key if settings.push_enabled else None}


@router.post("/push/subscribe")
def subscribe(body: SubscribeIn, session: Session = Depends(get_session), user: User = Depends(current_user)) -> dict:
    if not settings.push_enabled:
        raise fail(400, "push_disabled")  # 503은 화면이 "서버 깨는 중"으로 알고 재시도하므로 쓰지 않는다
    if not allowed_endpoint(body.endpoint):
        raise fail(400, "bad_endpoint")
    sub = session.exec(select(PushSubscription).where(PushSubscription.endpoint == body.endpoint)).first()
    if sub is None:
        sub = PushSubscription(user_id=user.id, endpoint=body.endpoint, p256dh=body.keys.p256dh, auth=body.keys.auth)
    else:  # 같은 폰에서 다른 계정으로 로그인했거나 키가 바뀐 경우
        sub.user_id, sub.p256dh, sub.auth = user.id, body.keys.p256dh, body.keys.auth
    session.add(sub)
    session.commit()
    return {"ok": True}


@router.post("/push/unsubscribe")
def unsubscribe(body: UnsubscribeIn, session: Session = Depends(get_session), user: User = Depends(current_user)) -> dict:
    session.exec(
        delete(PushSubscription).where(PushSubscription.endpoint == body.endpoint, PushSubscription.user_id == user.id)
    )
    session.commit()
    return {"ok": True}


def send_push(sub: PushSubscription, payload: str) -> int:
    """알림 한 개를 보내고 HTTP 상태 코드를 돌려준다. (테스트에서는 이 함수를 가짜로 바꾼다)"""
    from pywebpush import WebPushException, webpush

    try:
        res = webpush(
            subscription_info={"endpoint": sub.endpoint, "keys": {"p256dh": sub.p256dh, "auth": sub.auth}},
            data=payload,
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": settings.vapid_subject},
            ttl=24 * 60 * 60,  # 폰이 꺼져 있어도 하루 안에 켜지면 받는다
            timeout=10,
        )
        return res.status_code
    except WebPushException as e:
        return e.response.status_code if e.response is not None else 0
    except Exception:  # 네트워크 오류 등: 이번 한 명만 실패로 치고 계속 보낸다
        return 0


@router.post("/admin/announcements")
def send_announcement(
    body: AnnouncementIn, session: Session = Depends(get_session), admin: User = Depends(admin_user)
) -> dict:
    if not settings.push_enabled:
        raise fail(400, "push_disabled")  # 503은 화면이 "서버 깨는 중"으로 알고 재시도하므로 쓰지 않는다
    title, text = body.title.strip(), body.body.strip()
    if not title or not text:
        raise fail(400, "bad_request")
    if find_banned(title, text):
        raise fail(400, "banned_word")
    # 알림을 누르면 열 주소는 우리 앱 안 주소만 ("/"로 시작, "//"는 다른 사이트라 안 됨)
    url = body.url.strip() or "/"
    if not url.startswith("/") or url.startswith("//"):
        raise fail(400, "bad_url")

    payload = json.dumps({"title": title, "body": text, "url": url}, ensure_ascii=False)
    sent = removed = failed = 0
    for sub in session.exec(select(PushSubscription)).all():
        status = send_push(sub, payload)
        if 200 <= status < 300:
            sent += 1
        elif status in (404, 410):  # 알림을 끈 브라우저: 구독 지우기
            session.delete(sub)
            removed += 1
        else:
            failed += 1

    ann = Announcement(author_id=admin.id, title=title, body=text, url=url, sent_count=sent)
    session.add(ann)
    session.commit()
    return {"id": ann.id, "sent": sent, "removed": removed, "failed": failed}


@router.get("/admin/announcements")
def list_announcements(session: Session = Depends(get_session), _admin: User = Depends(admin_user)) -> dict:
    rows = session.exec(select(Announcement).order_by(col(Announcement.created_at).desc()).limit(20)).all()
    subscribers = len(session.exec(select(PushSubscription.id)).all())
    return {
        "subscribers": subscribers,
        "items": [
            {"id": a.id, "title": a.title, "body": a.body, "url": a.url, "sent": a.sent_count, "created_at": iso(a.created_at)}
            for a in rows
        ],
    }
