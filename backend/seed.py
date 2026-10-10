"""처음 데이터 넣기: 학과, 초대 코드, 장소 10곳.

실행 (backend 폴더에서):  .venv/Scripts/python seed.py

- 이미 있는 데이터는 건너뛴다 (여러 번 실행해도 안전).
- 장소 좌표는 아직 **예시 값**이다. 캠퍼스에서 실제 좌표를 모으면 PLACES를 고친다.
- QR 값과 6자리 코드는 무작위로 만들고, QR 인쇄용으로 qr_codes.local.csv에 저장한다.
  이 파일은 .gitignore에 있어 Git에 올라가지 않는다. 화면이나 API로는 절대 내보내지 않는다.
"""

import csv
import secrets
import string

from sqlmodel import Session, select

from app.config import settings
from app.db import create_db_and_tables, engine
from app.models import Department, InviteCode, Place

DEPARTMENTS = ["컴퓨터공학과", "전자공학과", "경영학과"]

# (학과 이름, 초대 코드, 최대 사용 횟수) — 실제 배포 전에 코드를 새로 정한다.
INVITE_CODES = [
    ("컴퓨터공학과", "CSE-2026", 50),
    ("전자공학과", "EE-2026", 50),
    ("경영학과", "BIZ-2026", 50),
]

# (id, 이름, 건물, 위도 오프셋, 경도 오프셋, 반경m, 지도x%, 지도y%, 소개)
# 위도·경도는 캠퍼스 중심(CAMPUS_LAT/LNG) + 오프셋인 **예시 값**. 0.001도 ≈ 111m.
PLACES = [
    ("lib-3f", "도서관 3층 열람실", "중앙도서관", 0.0000, 0.0000, 40, 30, 28, "조용히 공부하는 곳"),
    ("lib-1f", "도서관 1층 로비", "중앙도서관", 0.0006, 0.0004, 40, 38, 22, "프린터와 사물함"),
    ("cafeteria", "학생식당", "학생회관", -0.0012, 0.0010, 150, 62, 55, "점심 메뉴 꿀팁"),
    ("eng-301", "공학관 301호", "공학관", 0.0015, -0.0012, 40, 20, 62, "전공 수업 강의실"),
    ("union", "학생회관 라운지", "학생회관", -0.0008, 0.0018, 40, 70, 48, "동아리방과 휴게 공간"),
    ("gate", "정문", "정문", -0.0030, 0.0000, 60, 50, 90, "캠퍼스 첫걸음"),
    ("cafe", "본관 앞 카페", "본관", 0.0000, 0.0025, 150, 80, 30, "시험기간 생존 카페"),
    ("gym", "체육관", "체육관", 0.0025, 0.0020, 60, 78, 12, "운동과 샤워실"),
    ("hum-201", "인문관 201호", "인문관", 0.0020, -0.0025, 40, 12, 38, "교양 수업 강의실"),
    ("dorm", "기숙사 1동", "기숙사", -0.0025, -0.0025, 60, 15, 80, "생활관 팁"),
]


def random_qr_code() -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(16))


def random_manual_code(used: set[str]) -> str:
    while True:
        code = f"{secrets.randbelow(1_000_000):06d}"
        if code not in used:
            used.add(code)
            return code


def main() -> None:
    create_db_and_tables()
    with Session(engine) as session:
        # 학과
        dept_ids: dict[str, int] = {}
        for name in DEPARTMENTS:
            dept = session.exec(select(Department).where(Department.name == name)).first()
            if dept is None:
                dept = Department(name=name)
                session.add(dept)
                session.commit()
                session.refresh(dept)
            dept_ids[name] = dept.id

        # 초대 코드
        for dept_name, code, max_uses in INVITE_CODES:
            if session.get(InviteCode, code) is None:
                session.add(InviteCode(code=code, department_id=dept_ids[dept_name], max_uses=max_uses))

        # 장소
        used_manual = set(session.exec(select(Place.manual_code)).all())
        new_codes = []
        for pid, name, building, dlat, dlng, radius, mx, my, intro in PLACES:
            if session.get(Place, pid) is not None:
                continue
            place = Place(
                id=pid,
                name=name,
                building=building,
                lat=settings.campus_lat + dlat,
                lng=settings.campus_lng + dlng,
                radius_m=radius,
                qr_code=random_qr_code(),
                manual_code=random_manual_code(used_manual),
                map_x=mx,
                map_y=my,
                intro=intro,
            )
            session.add(place)
            new_codes.append((place.id, place.name, place.qr_code, place.manual_code))

        session.commit()

    if new_codes:
        with open("qr_codes.local.csv", "a", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            if f.tell() == 0:
                writer.writerow(["place_id", "name", "qr_code", "manual_code"])
            writer.writerows(new_codes)
    print(f"완료: 장소 {len(new_codes)}곳 새로 추가 (QR 코드는 qr_codes.local.csv)")


if __name__ == "__main__":
    main()
