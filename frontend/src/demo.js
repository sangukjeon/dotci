// 체험판 모드 (서버 없이 화면만 배포할 때). 빌드할 때 VITE_DEMO=1 이면 켜진다.
// - 장소 목록을 서버 대신 아래 값에서 꺼내 쓴다. (backend/seed.py와 같은 값)
// - 서버 깨우기(/api/health)를 건너뛴다.
// 쪽지·로그인·도착 확인은 원래부터 목업(mock/server.js)이라 그대로 동작한다.

export const IS_DEMO = import.meta.env.VITE_DEMO === '1'

const CATEGORIES = ['tip', 'study', 'food', 'warn', 'class']
const zeroCounts = () => Object.fromEntries(CATEGORIES.map((c) => [c, 0]))

// (id, 이름, 건물, 위도, 경도, 소개) — 우송대학교 서캠퍼스. 좌표 출처: OpenStreetMap (ODbL)
const PLACES = [
  ['dorm-cheongun1', '청운1숙(남)', '청운1숙 기숙사', 36.337859, 127.447622, '기숙사 생활 팁'],
  ['w1-library', '우송도서관', 'W1 우송도서관', 36.338101, 127.446411, '공부 자리·열람실 팁'],
  ['w11-gym', '서캠 체육관', 'W11 체육관', 36.335832, 127.443296, '체육 수업·운동 팁'],
  ['w13-tower', '우송타워', 'W13 우송타워', 36.3356, 127.444313, '강의실·휴게 공간 팁'],
  ['w16-union', '학생회관', 'W16 학생회관', 36.336068, 127.444977, '식당·동아리 팁'],
  ['w17-media', '미디어융합관', 'W17 미디어융합관', 36.33581, 127.445564, '전공 강의실 팁'],
  ['w4-railway', '철도물류관', 'W4 철도물류관', 36.338765, 127.445733, '전공 강의실 팁'],
  ['w6-liberal', '교양교육원', 'W6 교양관', 36.337563, 127.445734, '교양 수업 팁'],
  ['w7-admin', '우송관', 'W7 우송관', 36.337102, 127.445092, '학사·행정 처리 팁'],
]

// GET /api/places 응답과 같은 모양
export const DEMO_PLACES = PLACES.map(([id, name, building, lat, lng, intro]) => ({
  id, name, building, lat, lng, intro,
  note_count: 0,
  category_counts: zeroCounts(),
  unlocked: false,
}))
