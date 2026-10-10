# 선배의 흔적 — 프로젝트 안내 (CLAUDE.md)

> 마지막 갱신: 2026-10-11 (네이버 지도, 카드형 책상, 디자인 규칙 DESIGN.md 반영). 이 파일이 최신 결정이다.
> 화면 디자인 규칙은 **DESIGN.md**를 따른다.
> 기획·설계 문서(https://claude.ai/code/artifact/e6bc60cf-cc87-4b33-b2ed-e0f732caa809)는
> 같은 결정(회원가입, Vercel + Render + Neon, 서버 깨우기)으로 갱신되어 있으나, 이번 갱신분은 아직 반영 전이다.
> 둘이 다르면 **이 파일을 따른다.**
> PPT 목차, 시연 콘티, 심사 예상 질문은 그 문서를 참고한다. (기획 문서의 나무 책상·흩어진 포스트잇 화면 설계는 DESIGN.md로 대체됨)

## 1. 프로젝트 한 줄

필요한 장소에 도착한 순간 선배가 남긴 쪽지(포스트잇)가 열리는 캠퍼스 웹 서비스.
"검색하지 마세요, 도착하세요." 게시판은 검색해야 하지만 이건 장소가 곧 검색어다.

- 대회: 2026 비교과 연계 창의융합 협력학습 경진대회 및 전시회
- 제출: 2026-10-15 (프로그램 + PPT) / 발표·전시: 2026-11-05 (시연은 영상)
- 개발자: 컴퓨터공학과 1학년, 개인 참가, Windows, 하루 3~4시간
- 대회 키워드: 창의융합 / 협력학습(선배→후배 지식 릴레이) / 비교과 연계(신입생 적응·멘토링)

## 2. 작업 규칙 (Claude Code가 지킬 것)

1. 웹사이트·GitHub 관련 작업 전에는 **요청 이해 요약 → 실행 계획 → 최종 확인** 후 진행한다.
2. 설명은 1학년이 이해할 수 있게 쉽게. 어려운 용어는 풀어서. 새로 배우는 기술은 🆕 표시.
3. 응답은 한국어.
4. **LLM API(ChatGPT/Claude 등) 사용 금지.** 서비스 가치는 '위치'와 '쌓이는 기록'에서 나온다.
5. SQL을 f-string이나 문자열 이어 붙이기로 만들지 않는다. 항상 SQLModel 쿼리 사용.
6. 비밀키(DB 주소, JWT 비밀키 등)는 코드·프론트·Git에 절대 넣지 않는다. `.env.example`만 커밋.
7. 프론트에서 `dangerouslySetInnerHTML` 금지.
8. 쪽지 **본문(content)**은 서버가 잠금 판정을 통과한 경우에만 응답에 포함한다. 브라우저에서 숨기는 방식 금지.
   잠긴 쪽지에는 **뒷면용 정보**(카테고리, 작성자 학년, 도움됐어요 수, 과목명, 작성자가 쓴 `hint`)만 보낸다.
   본문 앞부분을 잘라 힌트로 쓰는 것은 금지.

## 3. 기술 구성 (확정)

| 역할 | 기술 | 배포 |
|---|---|---|
| 화면 | React (Vite), react-router-dom, motion(구 Framer Motion), html5-qrcode, lucide-react | **Vercel** (보유 도메인 연결) |
| 지도 | **네이버 지도 API** (NAVER Cloud Maps, Web Dynamic Map) | 브라우저에서 직접 불러옴 |
| 서버 | FastAPI (Python), SQLModel, psycopg[binary], pydantic-settings, bcrypt, PyJWT | **Render** 무료 웹 서비스 |
| DB | PostgreSQL | **Neon** 무료 요금제 |
| 위치 | 브라우저 Geolocation (https 필수) | — |

```
폰 → https://내도메인 (Vercel)
     ├─ /      → React 빌드 파일
     └─ /api/* → vercel.json rewrites → Render의 FastAPI → Neon PostgreSQL
```

- `/api`를 Vercel rewrites로 Render에 넘겨서 **화면과 서버를 같은 주소처럼** 쓴다.
  → CORS 설정 불필요, httpOnly 쿠키 로그인 가능.
- 홈 서버(Proxmox)는 이번 제출에는 쓰지 않는다. 11/5 이전 여유 있으면 이전 검토.
- Supabase는 쓰지 않는다 (무료 프로젝트 7일 비활성 정지, 아이디 로그인 우회 필요).
- 네이버 지도 Client ID는 비밀키가 아니다(브라우저에 공개되는 값, 등록한 주소에서만 동작). `frontend/.env`의 `VITE_NAVER_MAP_CLIENT_ID`에 둔다.
  NAVER Cloud 콘솔의 Web 서비스 URL에 `http://localhost:5173`과 배포 도메인을 등록해야 한다. 무료 이용량은 대표 계정에만 있으니 콘솔에서 확인.

## 4. 핵심 기능

### 꼭 (10/15 제출 전)
| ID | 기능 | 요점 |
|---|---|---|
| F1 | 회원가입·로그인 | 아래 5장 참고 |
| F2 | 캠퍼스 지도 | **네이버 지도** 위에 장소 마커(위도·경도), 마커마다 쪽지 개수 배지. 누르면 하단 시트로 장소 카드 → "책상 열기". 내 위치 점은 화면에만 표시(서버로 안 보냄). 내용은 안 보냄 |
| F3 | 장소 책상 | **2열 카드**(DESIGN.md). 잠긴 카드는 카테고리 연한 색 + 아이콘 + **뒷면 힌트**(`hint`, 과목명, "4학년 · 도움 12") + 자물쇠. 0개면 "첫 흔적의 주인공이 되어 보세요". 최대 12개 표시(도움됐어요 순), 나머지는 "더 보기" |
| F4 | GPS 잠금 해제 | 좌표+정확도 전송 → 서버 판정. 정확도 100m 초과면 거절, 반경 + min(정확도, 25m) 안이면 열림 |
| F5 | QR 잠금 해제 | 장소 QR 스캔 또는 6자리 수동 코드. 다른 장소 QR이면 그 장소로 안내 |
| F6 | 열람 | 해제 시 안 본 쪽지가 순서대로 뒤집힘. 한 번 본 쪽지는 계속 볼 수 있음. 재방문 시 새 쪽지만 NEW로 뒤집힘 |
| F7 | 쪽지 쓰기 | 일반 사용자: 해제 후 30분 안, 해제한 장소에서만(쓰기 토큰). 관리자: 어디서나. 10~200자, 금칙어, 1분 1개. 카테고리 5개. (시간 되면) **"뒷면 한마디"** 입력칸(선택, 15자 이하, 금칙어 적용) |
| F8 | 관리자 | `is_admin` 사용자. 쪽지 시딩, 숨기기 |
| F9 | 도움됐어요 | 연 쪽지에만, 1인 1회, 자기 쪽지 불가. 하트 도장 애니메이션 |
| F10 | 수강 팁 | 카테고리 '수업'(연두) + 과목명(선택). 강의실을 장소로 등록. **별점·교수 평가 없음** |
| F11 | 서버 깨우기 | 6장 참고 |

### 시간 되면
- 덧붙이기(꼬리 포스트잇, 50자, 쓰기 조건 F7과 동일)
- 시간표 **직접 입력** → "오늘 수업 동선의 쪽지" 화면
- 도감(연 장소 스탬프)
- 근처 알림(앱 열려 있을 때만 watchPosition)

### 11/5까지 확장
- 시간표 **캡처 업로드 자동 인식**: OpenCV로 색 블록 검출 → 위치로 요일·시간 계산 → Tesseract로 글자 인식 → 건물명 매칭 → 확인·수정 화면. 카메라 촬영은 지원 안 함. 이미지는 메모리에서 처리 후 저장 안 함 (Render 파일 시스템은 휘발성)
- 학과 대항전: 학과별 '받은 도움됐어요 수' 합산, 전시 부스 점수판
- 전시 부스 장소 + 로그인 없이 체험하는 게스트 모드
- 신고 3건 자동 숨김, PWA, 멘토링 코스, 실사용 테스트(15~20명, 쪽지 100개 목표)

### 하지 않음
장소 사진 인식, 에타 연동(공식 API 없음·약관·보안), 학교 대항전, 사진 첨부(보류), 앱 꺼진 상태 푸시, 직접 그린 지도 일러스트,
본문 앞부분 자동 미리보기(규칙 8 위반)

## 5. 회원가입·로그인

학교 메일 인증은 접근성이 낮아 쓰지 않는다. **A(캠퍼스 위치) + B(학과 초대 코드)** 방식.

- 가입: 아이디 + 비밀번호(8자 이상) + 닉네임 + 학년 + **학과 초대 코드** + **캠퍼스 위치 확인**
  - 위치 확인: GPS가 캠퍼스 범위 안(설정값: 캠퍼스 중심 좌표 + 반경) **또는** 등록된 장소 QR 스캔
  - 학과는 초대 코드로 자동 결정 (사용자가 고르지 않음)
  - 초대 코드: 사용 횟수 제한, 만료일, 비활성화 가능
- 로그인: 아이디 + 비밀번호만 (집에서도 가능, 쪽지 열람은 여전히 현장)
- 비밀번호: bcrypt 해시만 저장
- 로그인 유지: JWT를 **httpOnly + Secure + SameSite 쿠키**에 저장 (자바스크립트가 못 읽음)
- 로그인 실패 5회 → 10분 잠금
- 화면에 보이는 정보: 닉네임·학년·학과만. 실명·학번·전화·메일 수집 안 함
- 가입 시 수집 항목 안내와 동의 체크. 탈퇴(`DELETE /api/auth/me`) 시 계정·기록 삭제
- 시간이 부족하면: 초대 코드만 남기고 캠퍼스 위치 확인은 11/5로 미룬다 (회원가입 자체는 자르지 않음)

## 6. Render 잠듦 대응

Render 무료 웹 서비스는 15분간 요청이 없으면 잠들고, 첫 요청에 수 초~수십 초 걸려 깬다.
무료 사용 시간은 월 750시간. 서버 파일 시스템은 재시작 시 사라진다.

1. **`useServerWake` 훅** (App 최상단):
   - 앱 열자마자 `/api/health` 호출, 성공할 때까지 3초 간격 재시도
   - 깨는 동안 "책상을 닦는 중..." 애니메이션
   - 로그인 화면에서 미리 깨워서 입력 시간 동안 깨어나게
   - 화면이 보이는 동안만(`document.visibilityState === "visible"`) 10분마다 `/api/health`
   - `visibilitychange`로 복귀 감지 → 즉시 `/api/health`, **1.5초 넘을 때만** 로딩 표시
2. **`apiFetch` 래퍼** (`src/api.js`): 모든 서버 요청은 이걸로.
   1.5초 넘으면 "닦는 중" 표시, 502/503·네트워크 오류는 3초 간격 최대 약 1분 재시도.
3. **중복 저장 방지**: 쪽지 쓰기 요청에 `client_request_id`(UUID)를 보내고, 서버는 같은 ID면 한 번만 저장.
4. 촬영·테스트·전시 시간대에만 외부 모니터(UptimeRobot 등)로 10분마다 깨워 둠. 전시 주간은 유료 인스턴스 검토.
5. 해제 시도 제한 기록은 서버 메모리라 재시작 시 초기화됨(대회 규모에선 허용). uvicorn 작업자 1개.

## 7. 데이터 모델 (Neon PostgreSQL, SQLModel)

| 테이블 | 주요 칼럼 | 비고 |
|---|---|---|
| `departments` | id, name | |
| `invite_codes` | code, department_id, max_uses, used_count, expires_at, is_active | |
| `users` | id(uuid), username(unique), password_hash, nickname, grade, department_id, is_admin, failed_logins, locked_until, created_at | |
| `places` | id(텍스트 슬러그, 예 `lib-3f`), name, building, lat, lng, radius_m(기본 40), qr_code(무작위 16자), manual_code(6자리), intro, is_active | qr_code·manual_code는 **절대 응답에 포함 금지**. 반경은 **장소마다** 정한다 (맛집처럼 미리 알아야 하는 장소는 넓게, 예 150~200m) |
| `notes` | id, place_id, author_id, category(`tip`,`study`,`food`,`warn`,`class`), course_name(nullable), content, hint(nullable, 15자 이하), helpful_count, parent_id(덧붙이기), is_official, is_hidden, client_request_id(unique), created_at | `hint`는 잠김 상태에서도 공개되는 작성자 한마디. 카드 순서는 도움됐어요 순 → 최신순 |
| `unlocks` | place_id, user_id, method(`gps`,`qr`), first_unlocked_at, last_seen_at | (place_id, user_id) 유일. **좌표 저장 안 함** |
| `helpfuls` | note_id, user_id, created_at | 두 칼럼 복합 기본키 |
| `timetable_entries` | id, user_id, course_name, day(0~4), start_time, end_time, building, place_id(nullable) | 시간 되면 |
| `reports` | note_id, user_id, reason, created_at | 11/5 확장 |

"다시 보기" 규칙: 사용자는 `notes.created_at <= unlocks.last_seen_at`인 쪽지만 본문을 받는다.
재해제 시 `last_seen_at` = 지금, 그사이 생긴 쪽지 id를 `new_ids`로 반환.

카테고리: 꿀팁 `tip` / 공부 `study` / 맛집 `food` / 주의 `warn` / 수업 `class`. 색·아이콘은 DESIGN.md 1장.

## 8. API (모두 `/api` 아래, 인증은 쿠키)

| 방식·주소 | 보내는 값 | 받는 값 |
|---|---|---|
| `GET /api/health` | — | `{ok: true}` |
| `POST /api/auth/signup` | username, password, nickname, grade, invite_code, location(`{method:"gps",lat,lng,accuracy}` 또는 `{method:"qr",code}`) | 사용자 정보 + 로그인 쿠키 |
| `POST /api/auth/login` | username, password | 사용자 정보 + 로그인 쿠키 |
| `POST /api/auth/logout` | — | 쿠키 삭제 |
| `GET /api/auth/me` | — | 닉네임, 학년, 학과, is_admin |
| `DELETE /api/auth/me` | password(재확인) | 계정·쪽지·해제 기록 삭제 + 쿠키 삭제 |
| `GET /api/places` | — | id, name, building, lat, lng, intro, note_count, category_counts, unlocked |
| `GET /api/places/{id}/notes` | — | 안 본 쪽지: `{id, category, author_grade, helpful_count, course_name, hint, locked:true}` (**content 없음**) / 본 쪽지: 본문·작성자·학년·학과·helpful_count·liked_by_me |
| `POST /api/places/{id}/unlock` | GPS: `{method:"gps",lat,lng,accuracy}` / QR: `{method:"qr",code}` | 성공: `{unlocked:true, notes, new_ids, write_token, token_expires_at}` / 실패: `{unlocked:false, reason, distance_m}` |
| `POST /api/codes/resolve` | `{code}` (QR 값 또는 6자리) | `{place_id}` — 지도에서 바로 QR을 찍었을 때 어느 장소인지만 알려 줌. 해제는 그 장소 책상에서 `unlock`으로 |
| `POST /api/places/{id}/notes` | category, content, course_name?, hint?, parent_id?, write_token, client_request_id | 저장된 쪽지 (관리자는 write_token 불필요) |
| `DELETE /api/notes/{id}` | — | `{ok:true}` (작성자 본인 또는 관리자만) |
| `POST /api/notes/{id}/helpful` | — | `{helpful_count}` |
| `GET /api/me/collection` | — | 연 장소, 연 날짜, 내가 쓴 쪽지 |
| `POST /api/admin/notes/{id}/hide` | — | `{ok:true}` (is_admin 확인) |

실패 이유 `reason`: `too_far`, `low_accuracy`, `wrong_qr`(정답 장소 id 포함), `bad_code`, `rate_limited`

QR에 담는 값: `https://도메인/place/{장소id}?qr={qr_code}` — 폰 기본 카메라로 찍어도 바로 그 책상이 열린다. 화면은 주소의 `?qr=`를 읽은 뒤 주소창에서 지운다.

잠금 판정: 하버사인 거리. 쓰기 토큰 = PyJWT로 {place_id, user_id, exp=30분} 서명.
해제 시도: 사용자당 1분 10회 제한.
좌표는 요청 본문으로만 보내고 로그에 남기지 않는다.

## 9. 보안 체크리스트

- [ ] 모든 비밀값은 Render·Vercel 환경변수에. `.env`는 `.gitignore`, `.env.example`만 커밋
- [ ] Vite `VITE_` 환경변수에 비밀 넣지 않기 (화면 코드에 그대로 노출됨)
- [ ] Neon 연결은 `sslmode=require`, 앱 전용 DB 계정(읽기·쓰기만, DROP 권한 없음)
- [ ] 운영 모드에서 오류 상세 노출 금지, 설정값 print 금지
- [ ] 입력값 Pydantic 검증(길이·형식), 금칙어 필터(비방 표현 포함, `content`·`hint` 모두)
- [ ] 쪽지 삭제는 작성자·관리자만, 도움됐어요는 연 장소 쪽지만
- [ ] 잠긴 쪽지 응답에 `content` 키 자체가 없는지 확인
- [ ] 제출 전: gitleaks 🆕로 저장소 검사, `https://도메인/.env` 접근 불가 확인,
      개발자 도구 소스에서 비밀 문자열 검색, 아이디 칸에 `' OR '1'='1` 넣어 로그인 실패 확인 (결과 캡처 → PPT)
- [ ] 백업: Neon 복구 기능 + 주기적 `pg_dump`

남는 한계(심사 때 인정하고 대책 설명): GPS 위조, QR 사진 공유(주기적 교체), 초대 코드 유출(횟수·만료·교체),
남의 아이디로 일부러 5번 틀려 잠그기(잠금 10분으로 짧게, 대회 규모에선 허용).

## 10. 일정 (하루 약 4시간)

| 날짜 | 할 일 |
|---|---|
| 10/11 (일) | 선배·동기에게 장소별 팁 + 에타 시간표 캡처 요청 / 장소 10곳 좌표(서로 50m 이상) / **네이버 클라우드 Maps 신청·Client ID** / Neon 생성·SQLModel 테이블(`hint` 칼럼 포함) / FastAPI 뼈대 + `GET /api/places` / React 지도·책상 카드 정적 화면 |
| 10/12 (월) **생존선** | unlock 판정 + notes 조회(잠김/열림 분리, 뒷면 정보 힌트 포함) / Render·Vercel 배포, rewrites, 도메인 / 위치 받기 → 해제 → 뒤집기 / 서버 깨우기 기본형 / 관리자 시딩 / 캠퍼스 2곳 실제 테스트 |
| 10/13 (화) | 회원가입·로그인(초대 코드+위치) / QR 스캔+수동 코드, QR 인쇄 / 쓰기(토큰, 붙이기 애니메이션, 시간 되면 "뒷면 한마디") / 쪽지 삭제 / 서버 깨우기 완성(apiFetch 재시도) |
| 10/14 (수) | 확대·도움됐어요·수강 팁 / 캠퍼스 10곳 순회·반경 조정·QR 부착 / 쪽지 30개 시딩, 동기 3~5명 사용 / 시연 영상 촬영 / PPT 초안 |
| 10/15 (목) | 영상 편집 / PPT·README 완성 / 보안 체크리스트 / `v1.0-submit` 태그 / 제출 |

자르는 순서: 근처 알림 → 도감 → 시간표 직접 입력 → 덧붙이기 → 뒷면 한마디(hint) → 도움됐어요 → GPS (QR만 남아도 컨셉 유지)

시연 영상 대체 콘티 (기능이 잘렸을 때):
- 1:10 덧붙이기·세대 표시 → **새 쪽지 쓰기 → "착" 붙기**
- 1:32 도감 스탬프 → **지도에서 연 장소 마커에 체크 표시**
- 1:22 개발자 도구 장면은 유지: "잠긴 응답에는 작성자가 공개한 한마디뿐, 본문은 없음"

개발 팁: 크롬 개발자 도구 Sensors로 위치를 바꿔 집에서 해제 테스트. 폰 오류는 `chrome://inspect`로 확인.

## 11. 남은 확인 사항

- 네이버 지도 무료 이용량(대표 계정 여부) 콘솔에서 확인
- 50m 안으로 붙은 장소 유무, 캠퍼스 중심 좌표·가입 허용 반경
- 대회 심사 기준·배점, 시연 영상 길이 제한, 제출 마감 **시각**
- 쓰기 가능 시간 30분 유지 여부
- 학과 목록과 초대 코드 배포 담당(학생회·과대)
