"""FastAPI 앱 입구.

실행 (backend 폴더에서):  .venv/Scripts/uvicorn app.main:app --reload
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .config import settings
from .db import create_db_and_tables
from .routers import auth, notes, places


@asynccontextmanager
async def lifespan(_app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(
    title="DOTCI API",
    lifespan=lifespan,
    # 운영 모드에서는 API 설명 화면(/docs)을 숨긴다.
    docs_url=None if settings.is_prod else "/api/docs",
    redoc_url=None,
    openapi_url=None if settings.is_prod else "/api/openapi.json",
)


@app.exception_handler(RequestValidationError)
async def bad_request(_request: Request, exc: RequestValidationError) -> JSONResponse:
    """입력 형식이 틀리면 422. 운영 모드에서는 어느 칸이 틀렸는지만 알려 주고 입력값은 돌려보내지 않는다."""
    fields = [".".join(str(p) for p in e["loc"][1:]) for e in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": {"code": "bad_request", "fields": fields}})


# HEAD도 받는다: UptimeRobot 같은 깨우기 모니터는 HEAD로 확인해서, GET만 받으면 405가 나 "down"으로 보인다
@app.api_route("/api/health", methods=["GET", "HEAD"])
def health() -> dict:
    return {"ok": True}


app.include_router(auth.router)
app.include_router(places.router)
app.include_router(notes.router)
