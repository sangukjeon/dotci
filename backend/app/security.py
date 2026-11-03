"""비밀번호와 토큰 (CLAUDE.md 5장, 8장).

- 비밀번호는 bcrypt 해시로만 저장한다. 원래 비밀번호는 어디에도 남기지 않는다.
- 로그인 토큰(JWT)은 httpOnly 쿠키에 넣는다. 자바스크립트가 읽을 수 없다.
- 쓰기 토큰(JWT)은 "이 사람이 이 장소에서 30분 안에 쓸 수 있다"는 서버의 도장이다.
"""

import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Response

from .config import settings

SESSION_COOKIE = "dotci_session"
SESSION_DAYS = 14
WRITE_WINDOW = timedelta(minutes=30)
_ALGORITHM = "HS256"


# ---------- 비밀번호 ----------


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


# 없는 아이디로 로그인할 때도 bcrypt 검사 시간만큼 걸리게 해서, 응답 속도로 아이디 존재 여부를 알 수 없게 한다.
DUMMY_HASH = hash_password("dotci-dummy-password")


# ---------- JWT ----------


def _encode(payload: dict, lifetime: timedelta) -> tuple[str, datetime]:
    expires = datetime.now(timezone.utc) + lifetime
    token = jwt.encode({**payload, "exp": expires}, settings.jwt_secret, algorithm=_ALGORITHM)
    return token, expires


def _decode(token: str, typ: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[_ALGORITHM])
    except jwt.PyJWTError:  # 만료, 위조, 형식 오류 모두
        return None
    return payload if payload.get("typ") == typ else None


def set_session_cookie(response: Response, user_id: uuid.UUID) -> None:
    token, _ = _encode({"typ": "session", "sub": str(user_id)}, timedelta(days=SESSION_DAYS))
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=SESSION_DAYS * 24 * 3600,
        httponly=True,  # 자바스크립트로 못 읽음
        secure=settings.is_prod,  # 배포(https)에서만 Secure. 내 컴퓨터(http)에서는 끈다
        samesite="lax",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE, path="/")


def read_session(token: str | None) -> uuid.UUID | None:
    payload = _decode(token, "session") if token else None
    if payload is None:
        return None
    try:
        return uuid.UUID(payload["sub"])
    except (KeyError, ValueError):
        return None


def make_write_token(user_id: uuid.UUID, place_id: str) -> tuple[str, datetime]:
    return _encode({"typ": "write", "sub": str(user_id), "place": place_id}, WRITE_WINDOW)


def check_write_token(token: str | None, user_id: uuid.UUID, place_id: str) -> bool:
    payload = _decode(token, "write") if token else None
    return bool(payload) and payload.get("sub") == str(user_id) and payload.get("place") == place_id
