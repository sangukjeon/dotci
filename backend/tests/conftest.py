"""테스트 준비: 테스트마다 비어 있는 임시 DB를 만들고, 학과·초대 코드·장소 2곳을 넣는다.

실행 (backend 폴더에서):  .venv/Scripts/python -m pytest
"""

import os
import tempfile
import uuid

# app을 불러오기 전에 DB 주소를 임시 파일로 바꾼다 (내 dev.db·Neon은 건드리지 않음)
_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["ENV"] = "dev"
os.environ["JWT_SECRET"] = "test-only-secret-" + "x" * 32

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlmodel import Session, SQLModel  # noqa: E402

from app.db import engine  # noqa: E402
from app.deps import unlock_limiter  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Department, InviteCode, Place  # noqa: E402

# 우송도서관 좌표. 테스트에서 "도착"은 이 좌표, "멂"은 약 200m 남쪽
LIB = (36.338101, 127.446411)
FAR = (36.336300, 127.446411)
TIP = "9시 전에 오면 창가 자리 거의 다 비어 있어요"


@pytest.fixture(autouse=True)
def fresh_db():
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    unlock_limiter.reset()
    with Session(engine) as s:
        s.add(Department(id=1, name="컴퓨터공학과"))
        s.add(InviteCode(code="TEST-2026", department_id=1, max_uses=2))
        s.add(Place(id="w1-library", name="우송도서관", building="W1", lat=LIB[0], lng=LIB[1],
                    radius_m=40, qr_code="QRLIBRARY0000001", manual_code="111111"))
        s.add(Place(id="w16-union", name="학생회관", building="W16", lat=36.336068, lng=127.444977,
                    radius_m=30, qr_code="QRUNION000000002", manual_code="222222"))
        s.commit()
    yield


def make_client() -> TestClient:
    return TestClient(app)


def signup(client: TestClient, username: str = "senior4", grade: int = 4, **extra):
    body = {
        "username": username,
        "password": "cozy-desk-731",
        "grade": grade,
        "invite_code": "TEST-2026",
        "location": {"method": "qr", "code": "111111"},
        **extra,
    }
    return client.post("/api/auth/signup", json=body)


def login(client: TestClient, username: str = "senior4"):
    return client.post("/api/auth/login", json={"username": username, "password": "cozy-desk-731"})


def unlock_gps(client: TestClient, place: str = "w1-library", pos=LIB, accuracy: float = 10):
    return client.post(f"/api/places/{place}/unlock",
                       json={"method": "gps", "lat": pos[0], "lng": pos[1], "accuracy": accuracy})


def write(client: TestClient, token: str, content: str = TIP, place: str = "w1-library", **extra):
    body = {"category": "tip", "content": content, "write_token": token,
            "client_request_id": str(uuid.uuid4()), **extra}
    return client.post(f"/api/places/{place}/notes", json=body)


@pytest.fixture
def client():
    with make_client() as c:
        yield c
