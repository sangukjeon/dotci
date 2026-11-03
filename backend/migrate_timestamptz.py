"""한 번만 실행: Neon의 시각 칼럼을 '시간대 포함(TIMESTAMPTZ)'으로 바꾼다.

예전 SQLModel로 만든 테이블은 시각 칼럼이 TIMESTAMP(시간대 없음)였다.
지금 SQLModel(0.0.48)은 TIMESTAMPTZ를 쓰므로 맞춰 준다. 저장된 값은 UTC로 보고 그대로 옮긴다.
여러 번 실행해도 이미 바뀐 칼럼은 건너뛴다.

실행 (backend 폴더에서):  .venv/Scripts/python migrate_timestamptz.py
"""

from sqlalchemy import inspect, text

from app.db import engine

# (테이블, 칼럼) — 문장은 아래에 고정된 값으로만 만든다 (사용자 입력 없음)
STATEMENTS = {
    ("users", "locked_until"): "ALTER TABLE users ALTER COLUMN locked_until TYPE TIMESTAMPTZ USING locked_until AT TIME ZONE 'UTC'",
    ("users", "created_at"): "ALTER TABLE users ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC'",
    ("notes", "created_at"): "ALTER TABLE notes ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC'",
    ("unlocks", "first_unlocked_at"): "ALTER TABLE unlocks ALTER COLUMN first_unlocked_at TYPE TIMESTAMPTZ USING first_unlocked_at AT TIME ZONE 'UTC'",
    ("unlocks", "last_seen_at"): "ALTER TABLE unlocks ALTER COLUMN last_seen_at TYPE TIMESTAMPTZ USING last_seen_at AT TIME ZONE 'UTC'",
    ("invite_codes", "expires_at"): "ALTER TABLE invite_codes ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING expires_at AT TIME ZONE 'UTC'",
    ("helpfuls", "created_at"): "ALTER TABLE helpfuls ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC'",
    ("reports", "created_at"): "ALTER TABLE reports ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC'",
}


def main() -> None:
    if engine.dialect.name != "postgresql":
        print("PostgreSQL(Neon)에서만 필요해요. 지금 DB는", engine.dialect.name)
        return
    inspector = inspect(engine)
    with engine.begin() as conn:
        for (table, column), sql in STATEMENTS.items():
            col = next(c for c in inspector.get_columns(table) if c["name"] == column)
            if getattr(col["type"], "timezone", False):
                print(f"{table}.{column}: 이미 TIMESTAMPTZ")
                continue
            conn.execute(text(sql))
            print(f"{table}.{column}: TIMESTAMPTZ로 변경")


if __name__ == "__main__":
    main()
