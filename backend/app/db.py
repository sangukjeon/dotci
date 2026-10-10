"""DB 연결.

SQL을 문자열로 만들지 않고, 항상 SQLModel 쿼리(select(...))를 쓴다.
"""

from collections.abc import Iterator

from sqlmodel import Session, SQLModel, create_engine

from .config import settings

_url = settings.sqlalchemy_url
_connect_args = {"check_same_thread": False} if _url.startswith("sqlite") else {}

# pool_pre_ping: Neon이 쉬다가 깨어날 때 끊긴 연결을 자동으로 다시 잇는다.
engine = create_engine(_url, connect_args=_connect_args, pool_pre_ping=True)


def create_db_and_tables() -> None:
    from . import models  # noqa: F401  (테이블 정의를 등록하기 위해 불러옴)

    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
