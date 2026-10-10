"""설정값 읽기.

값은 환경변수 또는 backend/.env 파일에서 읽는다 (pydantic-settings).
비밀값(DB 주소, JWT 비밀키)은 절대 코드에 적지 않는다. .env는 Git에 올리지 않는다.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # env_ignore_empty: .env에 "DATABASE_URL=" 처럼 빈 값이면 아래 기본값을 쓴다.
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore", env_ignore_empty=True
    )

    # "dev"(내 컴퓨터) 또는 "prod"(Render). prod에서는 오류 상세와 API 문서 화면을 숨긴다.
    env: str = "dev"

    # 비어 있으면 내 컴퓨터의 SQLite 파일(dev.db)을 쓴다. Neon 주소를 넣으면 Neon을 쓴다.
    database_url: str = "sqlite:///./dev.db"

    # 로그인 쿠키·쓰기 토큰 서명용 비밀키. prod에서는 반드시 길고 무작위인 값을 넣는다.
    jwt_secret: str = "dev-only-change-me"

    # 가입 시 "학교에 있어요" 확인에 쓰는 캠퍼스 중심 좌표와 허용 반경(m)
    campus_lat: float = 37.0
    campus_lng: float = 127.0
    campus_radius_m: int = 800

    @property
    def is_prod(self) -> bool:
        return self.env == "prod"

    @property
    def sqlalchemy_url(self) -> str:
        """Neon이 주는 postgresql:// 주소를 psycopg(3) 드라이버용 주소로 바꾼다."""
        url = self.database_url
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://"):]
        if url.startswith("postgresql://"):
            url = "postgresql+psycopg://" + url[len("postgresql://"):]
        return url


settings = Settings()

if settings.is_prod and settings.jwt_secret == "dev-only-change-me":
    raise RuntimeError("운영 모드에서는 JWT_SECRET 환경변수를 반드시 설정해야 합니다.")
