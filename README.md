# DOTCI

> 점 하나, 이야기 하나.

**검색하지 마세요, 도착하세요.**
캠퍼스의 그 장소에 직접 도착해야 선배가 남긴 쪽지가 열리는 위치 기반 웹 서비스입니다.
게시판은 검색해야 찾을 수 있지만, DOTCI는 **장소가 곧 검색어**입니다.

- 대상: 우송대학교 서캠퍼스 21곳 (도서관, 학생회관, 체육관, 운동장, 기숙사 등)
- 출품: 2026 비교과 연계 창의융합 협력학습 경진대회 및 전시회 (발표 2026-11-05 14:00)
- 개발: 컴퓨터공학과 1학년 전상욱

## 체험판 바로 보기

**👉 https://sangukjeon.github.io/dotci/**

체험판은 **서버 없이 화면만** 올린 버전입니다.

- 쪽지, 로그인, 도착 확인은 모두 브라우저 안의 **예시 데이터**로 동작합니다. 실제 선배의 팁이 아니에요.
- 새로고침하면 처음 상태로 돌아가고, 다른 사람과 쪽지가 공유되지 않습니다.
- 지도 대신 **장소 목록**으로 보입니다. (네이버 지도는 등록한 주소에서만 동작해요)
- 아이디·비밀번호는 아무거나 입력해도 로그인됩니다. 진짜 비밀번호는 넣지 마세요.

### 체험용 아이디

체험판은 가짜 서버라서 **처음 입력한 비밀번호(8자 이상)를 그 아이디의 비밀번호로 기억**합니다.
아래 값을 그대로 써도 되고, 아무 아이디나 새로 만들어도 됩니다.

| 용도 | 아이디 | 비밀번호 |
|---|---|---|
| 일반 학생 | `woosong24` | `dotci-demo` |
| 관리자 (쪽지 관리·통계) | `admin-demo` | `dotci-demo` |

- 아이디가 `admin`으로 시작하면 관리자로 로그인됩니다.
- **가입**해 보려면 학과 초대 코드가 필요해요: `CSE-2026` (컴퓨터공학과) · `EE-2026` (전자공학과) · `BIZ-2026` (경영학과).
  "학교에 있어요" 단계에서는 아래 6자리 장소 코드를 넣으면 됩니다.

### 장소와 체험용 코드

실제 서비스에서는 장소에 붙은 QR을 찍어야 열리지만, 체험판에서는 아래 코드로 열 수 있어요. (서캠퍼스 21곳 + 전시 부스, 2026-11-04 12곳 추가)
**바로 열기** 주소는 체험판 주소 뒤에 붙이면 됩니다. (폰 카메라로 QR을 찍은 것과 같아요)

| 장소 | 건물 | 6자리 코드 | 바로 열기 |
|---|---|---|---|
| 우송도서관 | W1 | `100001` | `place/w1-library?qr=MOCKQR1` |
| 철도물류관 | W4 | `100002` | `place/w4-railway?qr=MOCKQR2` |
| 교양교육원 | W6 | `100003` | `place/w6-liberal?qr=MOCKQR3` |
| 우송관 | W7 | `100004` | `place/w7-admin?qr=MOCKQR4` |
| 서캠 체육관 | W11 | `100005` | `place/w11-gym?qr=MOCKQR5` |
| 우송타워 | W13 | `100006` | `place/w13-tower?qr=MOCKQR6` |
| 학생회관 | W16 | `100007` | `place/w16-union?qr=MOCKQR7` |
| 미디어융합관 | W17 | `100008` | `place/w17-media?qr=MOCKQR8` |
| 청운1숙(남) | 기숙사 | `100009` | `place/dorm-cheongun1?qr=MOCKQR9` |
| 전시 부스 | 전시회 | `100010` | `place/booth?qr=MOCKQR10` |
| 운동장 | 서캠 운동장 | `100011` | `place/field?qr=MOCKQR11` |
| 국제교육센터 | W2 | `100012` | `place/w2-intl?qr=MOCKQR12` |
| 유학생기숙사 | W3 | `100013` | `place/w3-intldorm?qr=MOCKQR13` |
| 보건의료과학관 | W5 | `100014` | `place/w5-health?qr=MOCKQR14` |
| 우송유치원 | W8 | `100015` | `place/w8-kinder?qr=MOCKQR15` |
| 정례원 | W9 | `100016` | `place/w9-jeongnye?qr=MOCKQR16` |
| 사회복지융합관 | W10 | `100017` | `place/w10-welfare?qr=MOCKQR17` |
| SICA | W12 | `100018` | `place/w12-sica?qr=MOCKQR18` |
| 컬리너리센터 | W14 | `100019` | `place/w14-culinary?qr=MOCKQR19` |
| 식품건축관 | W15 | `100020` | `place/w15-food?qr=MOCKQR20` |
| 우송예술회관 | W18 | `100021` | `place/w18-art?qr=MOCKQR21` |
| 엔디컷 빌딩 | W19 | `100022` | `place/w19-endicott?qr=MOCKQR22` |

> 이 코드들은 **체험판 전용 예시 값**입니다. 실제 서비스의 QR 값과 6자리 코드는 서버 DB에만 있고 화면이나 저장소에 나오지 않아요.

### 체험해 볼 것

| 해 보기 | 방법 |
|---|---|
| 잠긴 쪽지 보기 | 목록에서 장소 선택 → 카드에 카테고리·힌트만 보여요 |
| QR로 열기 | 주소 끝에 `place/w1-library?qr=MOCKQR1` → 카드가 뒤집히며 열려요 |
| 6자리 코드로 열기 | 책상에서 코드 입력 `100001` (우송도서관) |
| 도착 실패 안내 | `place/w1-library?mock=far` (거리 멂) · `?mock=blur` (위치 흐림) |
| 쪽지 쓰기 · 도움됐어요 | 책상을 연 뒤 "흔적 남기기", 카드의 하트 |
| 관람객 모드 | 로그인 화면 "로그인 없이 체험하기" |
| 도감 · 수료증 | `me?mock=complete` |
| 학과 대항전 · 멘토링 코스 · 과목별 팁 | `ranking` · `courses` · `subjects` |
| 관리자 화면 | 아이디를 `admin`으로 시작해서 로그인 → `admin` |

## 정식 서비스

**👉 https://dotci.vercel.app/** (진짜 서버·DB에 저장되는 버전)

### 학과 초대 코드 (2026-11-03 교체)

| 학과 | 초대 코드 | 최대 가입 |
|---|---|---|
| 컴퓨터공학과 | `CSE-4H6N7K` | 50명 |
| 전자공학과 | `EE-PT57E3` | 50명 |
| 경영학과 | `BIZ-Q7HM8T` | 50명 |

### 장소 코드 (6자리, 2026-11-04 기준)

책상 화면 "QR이나 코드로 열기"나 가입 3단계 "장소 코드 6자리"에 넣으면 그 장소에 도착한 것으로 열려요.

| 장소 | 건물 | 6자리 코드 |
|---|---|---|
| 우송도서관 | W1 | `465287` |
| 국제교육센터 | W2 | `533883` |
| 유학생기숙사 | W3 | `716398` |
| 철도물류관 | W4 | `887926` |
| 보건의료과학관 | W5 | `498340` |
| 교양교육원 | W6 | `794582` |
| 우송관 | W7 | `611366` |
| 우송유치원 | W8 | `104420` |
| 정례원 | W9 | `654219` |
| 사회복지융합관 | W10 | `079160` |
| 서캠 체육관 | W11 | `289738` |
| SICA | W12 | `180664` |
| 우송타워 | W13 | `785905` |
| 컬리너리센터 | W14 | `976224` |
| 식품건축관 | W15 | `378166` |
| 학생회관 | W16 | `761795` |
| 미디어융합관 | W17 | `584580` |
| 우송예술회관 | W18 | `068194` |
| 엔디컷 빌딩 | W19 | `587613` |
| 청운1숙(남) | 기숙사 | `099737` |
| 운동장 | 서캠 운동장 | `667139` |

QR에 들어가는 긴 값은 `backend/qr_codes.local.csv`에 있어요 (Git에는 안 올라감).

> ⚠️ 저장소가 **비공개**라서 적어 둔 값입니다. 저장소를 공개로 바꾸기 전에 반드시 초대 코드·장소 코드 표를 지우고 `backend/rotate_invites.py`로 초대 코드를, 장소 코드도 새로 바꾸세요.
> 위 "체험용 아이디"의 `CSE-2026` 등은 체험판 전용이라 정식 서비스에서는 쓸 수 없습니다.

## 핵심 기능

1. **장소 목록 · 지도**: 장소마다 쪽지 수 표시
2. **잠긴 카드**: 도착 전에는 카테고리, 작성자 학년, 도움됐어요 수, 작성자 한마디(힌트)만 보여요
3. **GPS 도착 확인**: 서버가 거리와 GPS 정확도를 함께 판정해요
4. **QR 도착 확인**: GPS가 약한 실내는 장소에 붙은 QR이나 6자리 코드로 확인해요
5. **쪽지 쓰기 · 도움됐어요**: 그 장소에 도착한 사람만 30분 안에 쓸 수 있어요

## 기술 구성

| 역할 | 기술 |
|---|---|
| 화면 | React (Vite), react-router-dom, motion, lucide-react, html5-qrcode |
| 지도 | 네이버 지도 API (NAVER Cloud Maps) |
| 서버 | Python FastAPI, SQLModel, bcrypt, PyJWT |
| DB | PostgreSQL (Neon) |
| 배포 | 체험판: GitHub Pages · 정식: Vercel + Render + Neon (예정) |

```
폰 → https://도메인 (Vercel)
     ├─ /      → React 빌드 파일          (frontend/)
     └─ /api/* → Render의 FastAPI → Neon  (backend/)
```

## 보안 원칙

- 잠긴 쪽지의 **본문은 서버가 보내지 않습니다.** 화면에서 숨기는 방식이 아니에요.
- 위치 좌표는 판정에만 쓰고 저장하지 않습니다.
- 비밀값(DB 주소, JWT 키)은 `.env`와 배포 서비스 환경변수에만 둡니다. Git에는 `.env.example`만 올립니다.
- 비밀번호는 bcrypt 해시로만 저장하고, 쪽지에는 서버가 자동으로 지은 닉네임만 보입니다.
- LLM API(ChatGPT, Claude 등)는 쓰지 않습니다.

## 진행 상황

- [x] 모든 화면 (목업 데이터)
- [x] 서버: 장소 목록, GPS 거리 판정 함수, 자동 닉네임
- [x] 체험판 배포 (GitHub Pages)
- [x] 서버: 로그인·가입, 쪽지 조회·잠금 해제·쓰기, 도움됐어요, 관리자 숨기기, 도감 API + pytest 19개
- [ ] 정식 배포 (Vercel + Render + Neon)
- [ ] 서버로 옮길 확장 기능: 학과 대항전, 멘토링 코스, 과목별 팁, 신고, 통계, 게스트 모드 (지금은 화면 목업)
- [ ] 네이버 지도 연결

## 내 컴퓨터에서 실행하기 (Windows)

**1. 서버 (backend)**

```bash
cd backend
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
cp .env.example .env          # 값 채우기. 비워 두면 SQLite(dev.db) 사용
.venv/Scripts/python seed.py  # 학과·초대 코드·장소 넣기
.venv/Scripts/uvicorn app.main:app --reload --port 8000
```

API 설명 화면: http://localhost:8000/api/docs

자동 테스트 (잠긴 쪽지에 본문이 안 나가는지, 멀면 안 열리는지 등):

```bash
.venv/Scripts/python -m pip install -r requirements-dev.txt
.venv/Scripts/python -m pytest
```

관리자 지정 (가입한 뒤): `.venv/Scripts/python make_admin.py 아이디`

초대 코드 교체 (유출됐을 때): `.venv/Scripts/python rotate_invites.py` — 지금 코드를 모두 끄고 학과마다 새 코드를 만든다

**2. 화면 (frontend)** — 새 터미널에서

```bash
cd frontend
npm install
cp .env.example .env          # 네이버 지도 Client ID 넣기. 비워 두면 목록 화면으로 표시
npm run dev
```

http://localhost:5173 접속. `/api` 요청은 자동으로 8000번 서버로 넘어갑니다.

**체험판으로 실행하기** (서버 없이): `frontend/.env`에 `VITE_DEMO=1`을 넣고 `npm run dev`

## 체험판 배포 방법

`main`에 올리면 GitHub Actions(`.github/workflows/pages.yml`)가 자동으로 체험판을 빌드해서 GitHub Pages에 올립니다.
처음 한 번만 저장소 **Settings → Pages → Source**를 **GitHub Actions**로 바꾸면 됩니다.

## 정식 배포 (Render + Vercel + Neon)

| 무엇 | 어디 | 설정 |
|---|---|---|
| DB | Neon (ap-southeast-1) | `backend/.env`의 `DATABASE_URL`로 `seed.py` 실행 → QR 값은 `qr_codes.local.csv`에만 |
| 서버 | Render (Singapore, 무료) | 저장소의 `render.yaml`을 Blueprint로. `DATABASE_URL`만 대시보드에 직접 입력, `JWT_SECRET`은 Render가 자동 생성 |
| 화면 | Vercel | Root Directory `frontend`. `vercel.json`이 `/api/*`를 Render로 넘겨서 같은 주소처럼 쓴다 |

## 문서

- 기획·결정 사항: [CLAUDE.md](CLAUDE.md)
- 디자인 규칙: [DESIGN.md](DESIGN.md)

장소 좌표 출처: © OpenStreetMap contributors (ODbL)
