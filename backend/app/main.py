"""FastAPI 앱 입구.

실행 (backend 폴더에서):  .venv/Scripts/uvicorn app.main:app --reload
"""

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from pydantic import BaseModel
from sqlmodel import Session, func, select

from .config import settings
from .db import create_db_and_tables, get_session
from .models import CATEGORIES, Note, Place


@asynccontextmanager
async def lifespan(_app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(
    title="선배의 흔적 API",
    lifespan=lifespan,
    # 운영 모드에서는 API 설명 화면(/docs)을 숨긴다.
    docs_url=None if settings.is_prod else "/api/docs",
    redoc_url=None,
    openapi_url=None if settings.is_prod else "/api/openapi.json",
)


# ---------- 응답 모양 ----------
# 응답은 항상 이 모양으로만 내보낸다. qr_code·manual_code 같은 칼럼이 실수로 새지 않게 하기 위함.


class PlaceOut(BaseModel):
    id: str
    name: str
    building: str
    map_x: float
    map_y: float
    note_count: int
    category_counts: dict[str, int]
    unlocked: bool


# ---------- 주소 ----------


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}


@app.get("/api/places", response_model=list[PlaceOut])
def list_places(session: Session = Depends(get_session)) -> list[PlaceOut]:
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

    result = []
    for p in places:
        by_cat = {c: counts.get(p.id, {}).get(c, 0) for c in CATEGORIES}
        result.append(
            PlaceOut(
                id=p.id,
                name=p.name,
                building=p.building,
                map_x=p.map_x,
                map_y=p.map_y,
                note_count=sum(by_cat.values()),
                category_counts=by_cat,
                unlocked=False,  # 로그인(10/13)이 생기면 unlocks 테이블로 판단
            )
        )
    return result
