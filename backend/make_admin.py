"""가입한 계정을 관리자로 바꾼다. 관리자는 어디서나 공식 쪽지를 쓰고, 쪽지를 숨길 수 있다.

실행 (backend 폴더에서):  .venv/Scripts/python make_admin.py 아이디
되돌리기:                 .venv/Scripts/python make_admin.py 아이디 --off
"""

import sys

from sqlmodel import Session, select

from app.db import engine
from app.models import User


def main() -> None:
    if len(sys.argv) < 2:
        print("사용법: python make_admin.py 아이디 [--off]")
        sys.exit(1)
    username = sys.argv[1]
    on = "--off" not in sys.argv[2:]
    with Session(engine) as session:
        user = session.exec(select(User).where(User.username == username)).first()
        if user is None:
            print(f"'{username}' 계정이 없어요. 먼저 화면에서 가입해 주세요.")
            sys.exit(1)
        user.is_admin = on
        session.add(user)
        session.commit()
    print(f"'{username}' → 관리자 {'켜짐' if on else '꺼짐'}")


if __name__ == "__main__":
    main()
