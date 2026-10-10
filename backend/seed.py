"""처음 데이터 넣기: 학과, 초대 코드, 장소 10곳.

실행 (backend 폴더에서):  .venv/Scripts/python seed.py

- 이미 있는 데이터는 건너뛴다 (여러 번 실행해도 안전).
- 장소는 우송대 서캠퍼스 건물 10곳. 현장 확인 후 이름·반경을 고친다.
- QR 값과 6자리 코드는 무작위로 만들고, QR 인쇄용으로 qr_codes.local.csv에 저장한다.
  이 파일은 .gitignore에 있어 Git에 올라가지 않는다. 화면이나 API로는 절대 내보내지 않는다.
"""

import csv
import secrets
import string

from sqlmodel import Session, select

from app.db import create_db_and_tables, engine
from app.models import Department, InviteCode, Place

DEPARTMENTS = ["컴퓨터공학과", "전자공학과", "경영학과"]

# (학과 이름, 초대 코드, 최대 사용 횟수) — 실제 배포 전에 코드를 새로 정한다.
INVITE_CODES = [
    ("컴퓨터공학과", "CSE-2026", 50),
    ("전자공학과", "EE-2026", 50),
    ("경영학과", "BIZ-2026", 50),
]

# (id, 이름, 건물, 위도, 경도, 반경m, 소개) — 우송대학교 서캠퍼스
# 좌표 출처: OpenStreetMap (© OpenStreetMap contributors, ODbL). 건물 중심점이라 현장에서 반경을 조정한다.
# 장소끼리 최소 60m 떨어져 있다. 가장 가까운 W16–W17(60m)은 반경을 30m로 줄였다.
PLACES = [
    ("w1-library", "우송도서관", "W1 우송도서관", 36.338101, 127.446411, 40, "공부 자리·열람실 팁"),
    ("w4-railway", "철도물류관", "W4 철도물류관", 36.338765, 127.445733, 40, "전공 강의실 팁"),
    ("w6-liberal", "교양관", "W6 교양관", 36.337563, 127.445734, 40, "교양 수업 팁"),
    ("w7-admin", "우송관", "W7 우송관", 36.337102, 127.445092, 40, "학사·행정 처리 팁"),
    ("w11-gym", "서캠 체육관", "W11 체육관", 36.335832, 127.443296, 50, "체육 수업·운동 팁"),
    ("w13-tower", "우송타워", "W13 우송타워", 36.335600, 127.444313, 40, "강의실·휴게 공간 팁"),
    ("w16-union", "학생회관", "W16 학생회관", 36.336068, 127.444977, 30, "식당·동아리 팁"),
    ("w17-media", "미디어융합관", "W17 미디어융합관", 36.335810, 127.445564, 30, "전공 강의실 팁"),
    ("dorm-cheongun1", "청운1숙", "청운1숙 기숙사", 36.337859, 127.447622, 50, "기숙사 생활 팁"),
    ("cu-west", "서캠 CU", "편의점", 36.338896, 127.444856, 30, "간식·생필품 팁"),
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
        for pid, name, building, lat, lng, radius, intro in PLACES:
            if session.get(Place, pid) is not None:
                continue
            place = Place(
                id=pid,
                name=name,
                building=building,
                lat=lat,
                lng=lng,
                radius_m=radius,
                qr_code=random_qr_code(),
                manual_code=random_manual_code(used_manual),
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
