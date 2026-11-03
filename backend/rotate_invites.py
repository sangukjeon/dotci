"""학과 초대 코드 바꾸기: 지금 쓰는 코드를 모두 끄고, 학과마다 무작위 새 코드를 만든다.

코드가 밖으로 퍼졌을 때 쓴다 (CLAUDE.md 9장 "초대 코드 유출 → 교체").
이미 가입한 계정은 그대로 남는다. 새 코드는 화면에 한 번만 출력한다.

실행 (backend 폴더에서):  .venv/Scripts/python rotate_invites.py
"""

import secrets

from sqlmodel import Session, select

from app.db import engine
from app.models import Department, InviteCode

# 학과 이름 → 코드 앞부분
PREFIX = {"컴퓨터공학과": "CSE", "전자공학과": "EE", "경영학과": "BIZ"}
MAX_USES = 50
# 헷갈리는 글자(0/O, 1/I/L)는 뺀다
ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def new_code(prefix: str) -> str:
    return f"{prefix}-" + "".join(secrets.choice(ALPHABET) for _ in range(6))


def main() -> None:
    with Session(engine) as session:
        for invite in session.exec(select(InviteCode).where(InviteCode.is_active)).all():
            invite.is_active = False
            session.add(invite)
            print(f"끔: {invite.code}")

        created = []
        for dept in session.exec(select(Department).order_by(Department.id)).all():
            code = new_code(PREFIX.get(dept.name, "DOT"))
            session.add(InviteCode(code=code, department_id=dept.id, max_uses=MAX_USES))
            created.append((dept.name, code))
        session.commit()

    print("\n새 초대 코드 (최대 %d명씩)" % MAX_USES)
    for name, code in created:
        print(f"  {name}: {code}")


if __name__ == "__main__":
    main()
