"""회원가입·로그인 규칙 확인."""

from sqlmodel import Session, select

from app.db import engine
from app.models import User
from conftest import login, signup


def test_signup_sets_httponly_cookie_and_auto_nickname(client):
    res = signup(client)
    assert res.status_code == 200
    user = res.json()
    assert user["department"] == "컴퓨터공학과"  # 학과는 초대 코드로 자동 결정
    assert user["nickname"] and user["nickname"] != "senior4"  # 닉네임은 서버가 짓는다
    assert "password" not in res.text
    assert "HttpOnly" in res.headers["set-cookie"]
    assert client.get("/api/auth/me").json()["username"] == "senior4"


def test_signup_rejects_bad_invite_and_off_campus(client):
    assert signup(client, invite_code="NOPE").json()["detail"]["code"] == "bad_invite"
    seoul = {"method": "gps", "lat": 37.5665, "lng": 126.9780, "accuracy": 10}
    assert signup(client, location=seoul).json()["detail"]["code"] == "off_campus"
    assert signup(client, location={"method": "qr", "code": "999999"}).json()["detail"]["code"] == "bad_code"


def test_invite_usage_limit_and_duplicate_username(client):
    assert signup(client, "first").status_code == 200
    assert signup(client, "first").json()["detail"]["code"] == "username_taken"
    assert signup(client, "second").status_code == 200
    # max_uses=2 를 다 썼다
    assert signup(client, "third").json()["detail"]["code"] == "bad_invite"


def test_password_is_hashed_not_stored(client):
    signup(client)
    with Session(engine) as s:
        user = s.exec(select(User)).one()
    assert user.password_hash != "cozy-desk-731"
    assert user.password_hash.startswith("$2")  # bcrypt 해시


def test_login_locks_after_five_failures(client):
    signup(client)
    client.post("/api/auth/logout")
    for i in range(4):
        res = client.post("/api/auth/login", json={"username": "senior4", "password": "wrong-pass"})
        assert res.status_code == 401
        assert res.json()["detail"]["remaining"] == 4 - i
    res = client.post("/api/auth/login", json={"username": "senior4", "password": "wrong-pass"})
    assert res.status_code == 423
    # 잠긴 동안은 맞는 비밀번호도 안 된다
    assert login(client).json()["detail"]["code"] == "locked"


def test_sql_injection_login_fails(client):
    signup(client)
    client.post("/api/auth/logout")
    res = client.post("/api/auth/login", json={"username": "' OR '1'='1", "password": "' OR '1'='1"})
    assert res.status_code == 401


def test_logout_and_withdraw(client):
    signup(client)
    assert client.post("/api/auth/logout").status_code == 200
    assert client.get("/api/auth/me").status_code == 401
    login(client)
    assert client.delete("/api/auth/me").status_code == 200
    assert login(client).status_code == 401


def test_signup_gps_allows_blurry_laptop_location(client):
    # 캠퍼스 중심에서 약 450m, 오차 300m (노트북 와이파이 위치) → 400 + 200 안이라 통과
    laptop = {"method": "gps", "lat": 36.33716 + 0.00405, "lng": 127.44536, "accuracy": 300}
    assert signup(client, location=laptop).status_code == 200


def test_signup_gps_rejects_too_blurry(client):
    blurry = {"method": "gps", "lat": 36.33716, "lng": 127.44536, "accuracy": 1500}
    assert signup(client, location=blurry).json()["detail"]["code"] == "low_accuracy"


def test_weak_passwords_are_rejected(client):
    for pw, reason in [("password123", "common"), ("senior4-pw!", "has_username"),
                       ("aaaaaaaa", "repeated"), ("23456789", "sequence")]:
        res = signup(client, password=pw)
        assert res.json()["detail"] == {"code": "weak_password", "reason": reason}, pw
        assert client.post("/api/auth/password-check",
                           json={"username": "senior4", "password": pw}).json() == {"ok": False, "reason": reason}
    ok = client.post("/api/auth/password-check", json={"username": "senior4", "password": "cozy-desk-731"})
    assert ok.json() == {"ok": True, "reason": None}
