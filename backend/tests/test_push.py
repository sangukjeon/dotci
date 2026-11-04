"""공지 푸시 알림: 구독 저장, 아무 주소나 못 넣기, 관리자만 공지, 끈 브라우저 정리."""

import json

import pytest
from sqlmodel import Session, select

from app.config import settings
from app.db import engine
from app.models import PushSubscription, User
from app.routers import push
from conftest import make_client, signup, unlock_gps, write

FCM = "https://fcm.googleapis.com/fcm/send/abc123"
APPLE = "https://web.push.apple.com/QGxyz"
KEYS = {"p256dh": "BOrk-test-public-key", "auth": "test-auth"}


@pytest.fixture(autouse=True)
def push_on(monkeypatch):
    monkeypatch.setattr(settings, "vapid_public_key", "test-public-key")
    monkeypatch.setattr(settings, "vapid_private_key", "test-private-key")


@pytest.fixture
def sent(monkeypatch):
    """실제로 구글·애플에 보내지 않고, 보낸 내용을 모아 둔다. endpoint에 'gone'이 있으면 410(끈 브라우저)."""
    box = []

    def fake_send(sub, payload):
        box.append((sub.endpoint, json.loads(payload)))
        return 410 if "gone" in sub.endpoint else 201

    monkeypatch.setattr(push, "send_push", fake_send)
    return box


def make_admin(username: str) -> None:
    with Session(engine) as s:
        user = s.exec(select(User).where(User.username == username)).one()
        user.is_admin = True
        s.add(user)
        s.commit()


def subs() -> list[PushSubscription]:
    with Session(engine) as s:
        return list(s.exec(select(PushSubscription)).all())


def test_key_is_public_and_hidden_when_off(monkeypatch):
    with make_client() as c:
        assert c.get("/api/push/key").json() == {"public_key": "test-public-key"}
        monkeypatch.setattr(settings, "vapid_private_key", "")
        assert c.get("/api/push/key").json() == {"public_key": None}


def test_subscribe_needs_login_and_saves_once():
    with make_client() as c:
        assert c.post("/api/push/subscribe", json={"endpoint": FCM, "keys": KEYS}).status_code == 401
        signup(c)
        assert c.post("/api/push/subscribe", json={"endpoint": FCM, "keys": KEYS}).status_code == 200
        assert c.post("/api/push/subscribe", json={"endpoint": FCM, "keys": KEYS}).status_code == 200
    assert len(subs()) == 1


@pytest.mark.parametrize("endpoint", [
    "http://fcm.googleapis.com/fcm/send/x",  # https 아님
    "https://evil.example.com/push",  # 알림 서버가 아님
    "https://fcm.googleapis.com.evil.com/x",  # 이름만 비슷한 가짜
    "https://localhost/internal",
])
def test_subscribe_rejects_other_hosts(endpoint):
    with make_client() as c:
        signup(c)
        r = c.post("/api/push/subscribe", json={"endpoint": endpoint, "keys": KEYS})
        assert r.status_code == 400
        assert r.json()["detail"]["code"] == "bad_endpoint"
    assert subs() == []


def test_unsubscribe_only_mine():
    with make_client() as a, make_client() as b:
        signup(a, "senior4")
        a.post("/api/push/subscribe", json={"endpoint": FCM, "keys": KEYS})
        signup(b, "fresh1", grade=1)
        b.post("/api/push/unsubscribe", json={"endpoint": FCM})  # 남의 구독은 못 지움
        assert len(subs()) == 1
        a.post("/api/push/unsubscribe", json={"endpoint": FCM})
    assert subs() == []


def test_only_admin_can_announce(sent):
    with make_client() as c:
        signup(c)
        r = c.post("/api/admin/announcements", json={"title": "축제", "body": "쪽지 이벤트"})
        assert r.status_code == 403
    assert sent == []


def test_announce_sends_to_all_and_drops_gone(sent):
    with make_client() as admin, make_client() as fresh:
        signup(admin, "senior4")
        make_admin("senior4")
        admin.post("/api/push/subscribe", json={"endpoint": FCM, "keys": KEYS})
        signup(fresh, "fresh1", grade=1)
        fresh.post("/api/push/subscribe", json={"endpoint": APPLE + "gone", "keys": KEYS})

        r = admin.post("/api/admin/announcements",
                       json={"title": "축제 주간", "body": "학생회관에 축제 쪽지가 열렸어요", "url": "/place/w16-union"})
        assert r.status_code == 200
        assert r.json()["sent"] == 1 and r.json()["removed"] == 1

        assert {e for e, _ in sent} == {FCM, APPLE + "gone"}
        assert sent[0][1] == {"title": "축제 주간", "body": "학생회관에 축제 쪽지가 열렸어요",
                              "url": "/place/w16-union", "tag": "dotci-announcement"}
        assert [s.endpoint for s in subs()] == [FCM]  # 끈 브라우저는 지워짐

        history = admin.get("/api/admin/announcements").json()
        assert history["subscribers"] == 1
        assert history["items"][0]["title"] == "축제 주간" and history["items"][0]["sent"] == 1


@pytest.mark.parametrize("body,code", [
    ({"title": "공지", "body": "바보 같은 공지"}, "banned_word"),
    ({"title": "공지", "body": "링크", "url": "https://evil.example.com"}, "bad_url"),
    ({"title": "공지", "body": "링크", "url": "//evil.example.com"}, "bad_url"),
])
def test_announce_rejects_bad_input(sent, body, code):
    with make_client() as c:
        signup(c)
        make_admin("senior4")
        r = c.post("/api/admin/announcements", json=body)
        assert r.status_code == 400 and r.json()["detail"]["code"] == code
    assert sent == []


def test_withdraw_removes_subscription(sent):
    with make_client() as c:
        signup(c)
        make_admin("senior4")
        c.post("/api/push/subscribe", json={"endpoint": FCM, "keys": KEYS})
        c.post("/api/admin/announcements", json={"title": "공지", "body": "안녕하세요"})
        assert c.request("DELETE", "/api/auth/me", json={"password": "cozy-desk-731"}).status_code == 200
    assert subs() == []


# ---------- 내 쪽지 반응 알림 ----------


def test_helpful_notifies_author_once_per_milestone(sent):
    with make_client() as author, make_client() as reader:
        signup(author, "senior4")
        token = unlock_gps(author).json()["write_token"]
        note_id = write(author, token).json()["id"]
        author.post("/api/push/subscribe", json={"endpoint": FCM, "keys": KEYS})

        signup(reader, "fresh1", grade=1)
        reader.post("/api/push/subscribe", json={"endpoint": APPLE, "keys": KEYS})
        unlock_gps(reader)
        assert reader.post(f"/api/notes/{note_id}/helpful").status_code == 200

        # 쓴 사람(FCM)에게만, 도서관 책상으로 가는 알림 하나
        assert [e for e, _ in sent] == [FCM]
        payload = sent[0][1]
        assert payload["title"] == "내 쪽지가 도움됐어요 💙"
        assert "우송도서관" in payload["body"] and payload["url"] == "/place/w1-library"

        # 취소했다가 다시 눌러도 같은 단계(1개) 알림은 또 가지 않는다
        reader.delete(f"/api/notes/{note_id}/helpful")
        reader.post(f"/api/notes/{note_id}/helpful")
        assert len(sent) == 1


def test_helpful_without_subscription_or_push_off(sent, monkeypatch):
    with make_client() as author, make_client() as reader:
        signup(author, "senior4")
        token = unlock_gps(author).json()["write_token"]
        note_id = write(author, token).json()["id"]
        signup(reader, "fresh1", grade=1)
        unlock_gps(reader)
        monkeypatch.setattr(settings, "vapid_private_key", "")  # 서버에 알림 키가 없어도
        assert reader.post(f"/api/notes/{note_id}/helpful").json() == {"helpful_count": 1}  # 도움됐어요는 정상
    assert sent == []


def test_delete_note_and_withdraw_clean_milestones(sent):
    from app.models import NoteMilestone

    with make_client() as author, make_client() as reader:
        signup(author, "senior4")
        token = unlock_gps(author).json()["write_token"]
        note_id = write(author, token).json()["id"]
        signup(reader, "fresh1", grade=1)
        unlock_gps(reader)
        reader.post(f"/api/notes/{note_id}/helpful")
        with Session(engine) as s:
            assert len(s.exec(select(NoteMilestone)).all()) == 1
        assert author.delete(f"/api/notes/{note_id}").status_code == 200
        with Session(engine) as s:
            assert s.exec(select(NoteMilestone)).all() == []
        # 쪽지가 남아 있는 상태에서 탈퇴해도 지워진다
        note2 = write(author, token, "두 번째 쪽지예요. 창가 자리가 조용해요").json()["id"]
        reader.post(f"/api/notes/{note2}/helpful")
        assert author.request("DELETE", "/api/auth/me", json={"password": "cozy-desk-731"}).status_code == 200
        with Session(engine) as s:
            assert s.exec(select(NoteMilestone)).all() == []


def test_admin_can_delete_announcement_record(sent):
    with make_client() as admin, make_client() as other:
        signup(admin, "senior4")
        make_admin("senior4")
        ann_id = admin.post("/api/admin/announcements", json={"title": "공지", "body": "지울 공지"}).json()["id"]

        signup(other, "fresh1", grade=1)
        assert other.delete(f"/api/admin/announcements/{ann_id}").status_code == 403  # 관리자만

        assert admin.delete(f"/api/admin/announcements/{ann_id}").status_code == 200
        assert admin.get("/api/admin/announcements").json()["items"] == []
        assert admin.delete(f"/api/admin/announcements/{ann_id}").status_code == 404
