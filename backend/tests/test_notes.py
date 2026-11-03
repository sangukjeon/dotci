"""가장 중요한 규칙: 잠긴 쪽지에는 본문이 절대 나가지 않는다 (CLAUDE.md 2장 규칙 8)."""

import uuid
from datetime import timedelta

from sqlmodel import Session, select

from app.db import engine
from app.models import Note
from conftest import FAR, LIB, TIP, login, make_client, signup, unlock_gps, write


def senior_writes_note(content=TIP, hint="창가 명당") -> int:
    with make_client() as senior:
        signup(senior, "senior4")
        token = unlock_gps(senior).json()["write_token"]
        res = write(senior, token, content, hint=hint)
        assert res.status_code == 200, res.text
        return res.json()["id"]


def age_all_notes(minutes: int = 5) -> None:
    """쓰기 쿨다운(1분)과 '마지막으로 본 시각' 비교를 테스트하려고 쪽지 시각을 과거로 돌린다."""
    with Session(engine) as s:
        for n in s.exec(select(Note)).all():
            n.created_at -= timedelta(minutes=minutes)
            s.add(n)
        s.commit()


def test_locked_note_has_no_content_key():
    senior_writes_note()
    with make_client() as junior:
        signup(junior, "junior1", grade=1)
        res = junior.get("/api/places/w1-library/notes")
        note = res.json()["notes"][0]
        assert note["locked"] is True
        assert "content" not in note  # 키 자체가 없다
        assert TIP not in res.text  # 응답 어디에도 본문이 없다
        assert note["hint"] == "창가 명당" and note["author_grade"] == 4  # 뒷면 정보는 보인다


def test_gps_too_far_and_low_accuracy():
    senior_writes_note()
    with make_client() as junior:
        signup(junior, "junior1")
        far = unlock_gps(junior, pos=FAR).json()
        assert far["unlocked"] is False and far["reason"] == "too_far"
        assert far["distance_m"] > 150
        assert "notes" not in far
        assert unlock_gps(junior, accuracy=150).json()["reason"] == "low_accuracy"
        # 실패해도 본문은 안 나간다
        assert "content" not in junior.get("/api/places/w1-library/notes").json()["notes"][0]


def test_gps_unlock_reveals_content():
    senior_writes_note()
    with make_client() as junior:
        signup(junior, "junior1")
        body = unlock_gps(junior, pos=(LIB[0] + 0.0003, LIB[1])).json()  # 약 33m 떨어짐
        assert body["unlocked"] is True and body["first_time"] is True
        assert body["notes"][0]["content"] == TIP
        assert body["write_token"]
        assert junior.get("/api/places").json()[0]["unlocked"] is True


def test_qr_unlock_wrong_place_and_bad_code(client):
    signup(client)
    wrong = client.post("/api/places/w1-library/unlock", json={"method": "qr", "code": "QRUNION000000002"}).json()
    assert wrong == {"unlocked": False, "reason": "wrong_qr", "place_id": "w16-union"}
    bad = client.post("/api/places/w1-library/unlock", json={"method": "qr", "code": "000000"}).json()
    assert bad["reason"] == "bad_code"
    ok = client.post("/api/places/w1-library/unlock", json={"method": "qr", "code": "111111"}).json()
    assert ok["unlocked"] is True
    assert client.post("/api/codes/resolve", json={"code": "222222"}).json() == {"place_id": "w16-union"}


def test_new_note_after_visit_is_locked_until_revisit():
    senior_writes_note()
    age_all_notes()
    with make_client() as junior:
        signup(junior, "junior1")
        unlock_gps(junior)
        # 후배가 다녀간 시각도 과거로 돌려서, 그 뒤에 새 쪽지가 생긴 상황을 만든다
        from app.models import Unlock

        with Session(engine) as s:
            for u in s.exec(select(Unlock)).all():
                u.last_seen_at -= timedelta(minutes=1)
                s.add(u)
            s.commit()
        with make_client() as senior:
            login(senior)
            token = unlock_gps(senior).json()["write_token"]
            new_id = write(senior, token, "새로 생긴 쪽지예요. 다시 와야 보여요").json()["id"]

        notes = {n["id"]: n for n in junior.get("/api/places/w1-library/notes").json()["notes"]}
        assert notes[new_id]["locked"] is True and "content" not in notes[new_id]
        assert len([n for n in notes.values() if not n["locked"]]) == 1  # 예전 쪽지는 계속 보인다
        again = unlock_gps(junior).json()
        assert again["new_ids"] == [new_id] and again["first_time"] is False


def test_write_needs_valid_token_and_rules(client):
    signup(client)
    assert write(client, "fake-token").json()["detail"]["code"] == "write_expired"
    token = unlock_gps(client).json()["write_token"]
    assert write(client, token, "짧아요").json()["detail"]["code"] == "length"
    banned = write(client, token, "이 자리 차지하는 사람 바 보 같아요 진짜")
    assert banned.json()["detail"] == {"code": "banned_word", "word": "바보"}
    assert write(client, token).status_code == 200
    assert write(client, token, "1분 안에 또 쓰면 막혀야 해요 그렇죠").json()["detail"]["code"] == "too_fast"


def test_write_token_is_bound_to_place(client):
    signup(client)
    token = unlock_gps(client).json()["write_token"]
    res = write(client, token, "도서관 토큰으로 학생회관에 쓰기", place="w16-union")
    assert res.json()["detail"]["code"] == "write_expired"


def test_same_request_id_saves_once(client):
    signup(client)
    token = unlock_gps(client).json()["write_token"]
    rid = str(uuid.uuid4())
    a = write(client, token, client_request_id=rid).json()
    b = write(client, token, client_request_id=rid).json()
    assert a["id"] == b["id"]
    assert len(client.get("/api/places/w1-library/notes").json()["notes"]) == 1


def test_helpful_rules():
    note_id = senior_writes_note()
    with make_client() as junior:
        signup(junior, "junior1")
        assert junior.post(f"/api/notes/{note_id}/helpful").json()["detail"]["code"] == "locked"
        unlock_gps(junior)
        assert junior.post(f"/api/notes/{note_id}/helpful").json() == {"helpful_count": 1}
        assert junior.post(f"/api/notes/{note_id}/helpful").json() == {"helpful_count": 1}  # 1인 1회
        assert junior.delete(f"/api/notes/{note_id}/helpful").json() == {"helpful_count": 0}  # 취소
        assert junior.delete(f"/api/notes/{note_id}/helpful").json() == {"helpful_count": 0}  # 두 번 취소해도 0
        assert junior.post(f"/api/notes/{note_id}/helpful").json() == {"helpful_count": 1}  # 다시 누르기
    with make_client() as senior:
        login(senior)
        assert senior.post(f"/api/notes/{note_id}/helpful").json()["detail"]["code"] == "own_note"


def test_delete_only_author_or_admin():
    note_id = senior_writes_note()
    with make_client() as other:
        signup(other, "junior1")
        assert other.delete(f"/api/notes/{note_id}").status_code == 403
        assert other.post(f"/api/admin/notes/{note_id}/hide").status_code == 403
    with make_client() as senior:
        login(senior)
        assert senior.delete(f"/api/notes/{note_id}").json() == {"ok": True}


def test_withdraw_removes_notes():
    senior_writes_note()
    with make_client() as senior:
        login(senior)
        senior.delete("/api/auth/me")
    with Session(engine) as s:
        assert s.exec(select(Note)).all() == []


def test_places_never_expose_codes(client):
    signup(client)
    text = client.get("/api/places").text
    assert "QRLIBRARY" not in text and "111111" not in text
    assert "qr_code" not in text and "manual_code" not in text
