# 선배의 흔적

> 검색하지 마세요, 도착하세요.

필요한 장소에 도착한 순간 선배가 남긴 쪽지(포스트잇)가 열리는 캠퍼스 웹 서비스입니다.
2026 비교과 연계 창의융합 협력학습 경진대회 출품작.

- 기획·결정 사항: [CLAUDE.md](CLAUDE.md)
- 디자인 규칙: [DESIGN.md](DESIGN.md)

## 구조

```
폰 → https://도메인 (Vercel)
     ├─ /      → React 빌드 파일          (frontend/)
     └─ /api/* → Render의 FastAPI → Neon  (backend/)
```

## 내 컴퓨터에서 실행하기 (Windows)

**1. 서버 (backend)**

```bash
cd backend
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
cp .env.example .env          # 값 채우기. 비워 두면 SQLite(dev.db) 사용
.venv/Scripts/python seed.py  # 학과·초대 코드·장소 10곳 넣기
.venv/Scripts/uvicorn app.main:app --reload --port 8000
```

API 설명 화면: http://localhost:8000/api/docs

**2. 화면 (frontend)** — 새 터미널에서

```bash
cd frontend
npm install
cp .env.example .env          # 네이버 지도 Client ID 넣기. 비워 두면 목록 화면으로 표시
npm run dev
```

http://localhost:5173 접속. `/api` 요청은 자동으로 8000번 서버로 넘어갑니다.

## 보안 원칙

- 잠긴 쪽지의 본문은 서버가 보내지 않습니다. (화면에서 숨기는 방식이 아님)
- 비밀값은 `.env`와 배포 서비스 환경변수에만 둡니다. Git에는 `.env.example`만 올립니다.
- 위치 좌표는 판정에만 쓰고 저장하지 않습니다.
