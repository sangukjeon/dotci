"""여러 주소가 같이 쓰는 도구: 로그인한 사람 찾기, 실패 응답, 시도 횟수 제한."""

import time
from collections import defaultdict, deque

from fastapi import Cookie, Depends, HTTPException
from sqlmodel import Session

from .db import get_session
from .models import User
from .security import SESSION_COOKIE, read_session


def fail(status: int, code: str, **extra) -> HTTPException:
    """화면이 err.code로 알아들을 수 있게 {"detail": {"code": ..., ...}} 모양으로 실패를 보낸다."""
    return HTTPException(status_code=status, detail={"code": code, **extra})


def optional_user(
    session: Session = Depends(get_session),
    token: str | None = Cookie(default=None, alias=SESSION_COOKIE),
) -> User | None:
    user_id = read_session(token)
    return session.get(User, user_id) if user_id else None


def current_user(user: User | None = Depends(optional_user)) -> User:
    if user is None:
        raise fail(401, "not_logged_in")
    return user


def admin_user(user: User = Depends(current_user)) -> User:
    if not user.is_admin:
        raise fail(403, "forbidden")
    return user


class RateLimiter:
    """최근 window초 안에 limit번까지만 허용. 서버 메모리에 기록하므로 재시작하면 초기화된다 (CLAUDE.md 6장)."""

    def __init__(self, limit: int, window_s: float):
        self.limit = limit
        self.window_s = window_s
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        hits = self._hits[key]
        while hits and now - hits[0] > self.window_s:
            hits.popleft()
        if len(hits) >= self.limit:
            return False
        hits.append(now)
        return True

    def reset(self) -> None:
        self._hits.clear()


# 잠금 해제·코드 확인: 사용자당 1분 10회
unlock_limiter = RateLimiter(limit=10, window_s=60)
