// 가짜 서버 (화면 확인용). 10/12~13에 진짜 API(api.js)로 하나씩 바꾸고, 다 바꾸면 이 파일을 지운다.
//
// 진짜 서버 규칙(CLAUDE.md 2장 규칙 8, 8장)을 똑같이 흉내 낸다:
//  - 잠긴 쪽지 응답에는 content 키가 아예 없다.
//  - 본 쪽지(created_at <= last_seen_at)만 본문을 준다.
//  - 쓰기는 해제 후 30분 안에만 (관리자는 언제나).
//
// 집에서 실패 화면 보기: 주소 끝에 ?mock=far (거리 멂) / ?mock=blur (위치 흐림) / ?mock=offline (연결 끊김)
// 그 밖에: ?mock=near (지도 근처 알림) / ?mock=complete (도감 다 채운 상태, 수료증)
// 데이터는 새로고침하면 처음으로 돌아간다. 로그인만 이 브라우저에 기억한다.

const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms))
const nowIso = () => new Date().toISOString()
const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString()

const WRITE_WINDOW_MS = 30 * 60_000
const WRITE_COOLDOWN_MS = 60_000
const BANNED_WORDS = ['광고', '바보', '멍청']

// 초대 코드 → 학과 (진짜 값은 서버 DB에만)
const MOCK_INVITES = { 'CSE-2026': '컴퓨터공학과', 'EE-2026': '전자공학과', 'BIZ-2026': '경영학과' }

// 장소별 QR 값과 6자리 코드 (진짜 값은 서버 DB에만, 화면에 절대 오지 않음)
const PLACE_IDS = [
  'w1-library', 'w4-railway', 'w6-liberal', 'w7-admin', 'w11-gym',
  'w13-tower', 'w16-union', 'w17-media', 'dorm-cheongun1', 'booth',
  // 11/4 추가 (부스 코드가 바뀌지 않게 뒤에 붙임)
  'field', 'w2-intl', 'w3-intldorm', 'w5-health', 'w8-kinder', 'w9-jeongnye', 'w10-welfare', 'w12-sica', 'w14-culinary', 'w15-food', 'w18-art', 'w19-endicott',
]

// 전시 부스 (11/5 확장). 진짜 DB에는 아직 없어서 목업에서만 장소 목록에 덧붙인다.
export const BOOTH = {
  id: 'booth',
  name: '전시 부스',
  building: '2026 창의융합 전시회',
  lat: 36.33716,
  lng: 127.44536,
  intro: '관람객 방명록',
  is_booth: true,
}
export const withMockPlaces = (list) => [...list, BOOTH]
const MOCK_CODES = Object.fromEntries(
  PLACE_IDS.map((id, i) => [id, { qr: `MOCKQR${i + 1}`, manual: String(100001 + i) }]),
)

const AUTHORS = {
  a4: { id: 'a4', nickname: '열람실지박령', grade: 4, department: '컴퓨터공학과' },
  a3: { id: 'a3', nickname: '삼학년', grade: 3, department: '전자공학과' },
  a2: { id: 'a2', nickname: '학식러버', grade: 2, department: '경영학과' },
  a1: { id: 'a1', nickname: '새내기', grade: 1, department: '컴퓨터공학과' },
  admin: { id: 'admin', nickname: 'DOTCI', grade: 4, department: '운영진' },
  visitor: { id: 'visitor', nickname: '반짝이는 펭귄 31', grade: null, department: '관람객' },
}

// 화면 확인용 예시 쪽지 (실제 선배 팁이 아님)
const seedNote = (id, place_id, category, author, content, extra = {}) => ({
  id, place_id, category, content,
  author_id: author.id, author,
  hint: null, course_name: null, helpful_count: 0,
  is_official: author.id === 'admin', is_hidden: false,
  created_at: minutesAgo(60 * 24 * (20 - id)),
  ...extra,
})

const state = {
  nextId: 100,
  notes: [
    seedNote(1, 'w1-library', 'tip', AUTHORS.a4, '9시 전에 오면 창가 자리 거의 다 비어 있어요', { helpful_count: 12 }),
    seedNote(2, 'w1-library', 'study', AUTHORS.a3, '콘센트는 창가 세 번째 자리만 돼요. 나머지는 고장', { helpful_count: 8, hint: '콘센트 명당' }),
    seedNote(3, 'w1-library', 'food', AUTHORS.a2, '1층 자판기 옆 컵라면이 제일 싸요', { helpful_count: 3, hint: '시험기간 필수' }),
    seedNote(4, 'w1-library', 'class', AUTHORS.a3, '앞자리 앉으면 교수님이 출석 대신 얼굴로 기억해요', { helpful_count: 5, course_name: '자료구조' }),
    seedNote(5, 'w1-library', 'tip', AUTHORS.a2, '사물함은 학기 첫 주에 신청해야 남아요'),
    seedNote(6, 'w1-library', 'warn', AUTHORS.a4, '뒷문 닫힐 때 소리 엄청 커요. 살살 닫아 주세요', { helpful_count: 21, hint: '문 조심' }),
    seedNote(7, 'w1-library', 'study', AUTHORS.a1, '조용한 자리는 안쪽 구석 책장 뒤', { helpful_count: 1 }),
    seedNote(11, 'w16-union', 'food', AUTHORS.a3, '수요일은 돈가스 나와서 11시 반 전에 가야 해요', { helpful_count: 9, hint: '수요일 특식' }),
    seedNote(12, 'w16-union', 'warn', AUTHORS.a2, '12시 10분부터 줄이 계단까지 가요', { helpful_count: 4 }),
    seedNote(13, 'w6-liberal', 'class', AUTHORS.admin, '교양 수업 첫 주에는 강의실이 자주 바뀌니 공지를 꼭 확인하세요', { course_name: '대학생활과진로' }),
    seedNote(14, 'w4-railway', 'class', AUTHORS.a4, '과제는 매주 목요일 자정 마감, 늦으면 감점이 커요', { helpful_count: 7, course_name: '자료구조' }),
    seedNote(15, 'w13-tower', 'class', AUTHORS.a3, '중간고사는 실습 위주라 코드를 직접 쳐 보는 게 좋아요', { helpful_count: 6, course_name: '자료구조' }),
    seedNote(16, 'w13-tower', 'class', AUTHORS.a2, '팀플 조는 첫 주에 정해지니 출석 꼭 하세요', { helpful_count: 3, course_name: '경영학원론' }),
    seedNote(17, 'w7-admin', 'class', AUTHORS.a4, '수강 정정은 개강 첫 주 금요일까지예요', { helpful_count: 10, course_name: '대학생활과진로' }),
    seedNote(20, 'booth', 'tip', AUTHORS.visitor, '전시 보고 갑니다. 우리 학교에도 있으면 좋겠어요', { helpful_count: 2 }),
    seedNote(21, 'booth', 'study', AUTHORS.a1, '신입생 때 이거 있었으면 길 안 헤맸을 듯', { helpful_count: 5 }),
    // "더 보기" 확인용: 미디어융합관에 14장 (화면 확인 전용 예시)
    ...Array.from({ length: 14 }, (_, i) =>
      seedNote(30 + i, 'w17-media', ['tip', 'study', 'food', 'warn', 'class'][i % 5], [AUTHORS.a1, AUTHORS.a2, AUTHORS.a3, AUTHORS.a4][i % 4], `더 보기 확인용 예시 쪽지 ${i + 1}번이에요`, { helpful_count: 14 - i }),
    ),
  ],
  unlocks: {}, // place_id → { first_unlocked_at, last_seen_at, write_until }
  reports: { 3: 2 }, // note_id → 신고 수 (3이 되면 자동 숨김)
  myReports: new Set(),
  helpfuls: new Set(), // note_id
  lastWriteAt: 0,
}

// ---------- 닉네임 (진짜 서버의 backend/app/nicknames.py 와 같은 방식) ----------

const ADJECTIVES = ['조용한', '부지런한', '느긋한', '용감한', '다정한', '씩씩한', '엉뚱한', '꼼꼼한', '명랑한', '차분한', '든든한', '반짝이는', '졸린', '배고픈', '호기심많은', '수줍은']
const ANIMALS = ['다람쥐', '고양이', '강아지', '토끼', '부엉이', '펭귄', '수달', '고슴도치', '판다', '여우', '햄스터', '참새', '거북이', '코알라', '두더지', '알파카']
const pick = (list) => list[Math.floor(Math.random() * list.length)]
function randomNickname() {
  const name = `${pick(ADJECTIVES)} ${pick(ANIMALS)} ${10 + Math.floor(Math.random() * 90)}`
  return name.length <= 12 ? name : name.split(' ').slice(1).join(' ')
}

// ---------- 로그인 (이 브라우저에만 기억) ----------

const USER_KEY = 'dotci-mock-user'
function loadUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY))
  } catch {
    return null
  }
}
function saveUser(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  } catch {
    /* 저장 못 해도 이번 화면에서는 동작 */
  }
}
let currentUser = loadUser()

function fail(status, code, extra = {}) {
  const err = new Error(code)
  err.status = status
  err.code = code
  Object.assign(err, extra)
  return err
}

export async function me() {
  await delay(150)
  if (!currentUser) throw fail(401, 'not_logged_in')
  return currentUser
}

// 목업 로그인 규칙: 아이디마다 처음 쓴 비밀번호를 기억하고, 다르면 실패. 5번 실패하면 10분 잠금.
const LOCK_AFTER = 5
const LOCK_MS = 10 * 60_000
const mockAccounts = {} // username → { password, failed, lockedUntil }

export async function login({ username, password }) {
  await delay()
  if (!username || !password || password.length < 8) throw fail(401, 'bad_credentials')
  const acc = (mockAccounts[username] ??= { password, failed: 0, lockedUntil: 0 })
  if (Date.now() < acc.lockedUntil) throw fail(423, 'locked')
  if (acc.password !== password) {
    acc.failed += 1
    if (acc.failed >= LOCK_AFTER) {
      acc.failed = 0
      acc.lockedUntil = Date.now() + LOCK_MS
      throw fail(423, 'locked')
    }
    throw fail(401, 'bad_credentials', { remaining: LOCK_AFTER - acc.failed })
  }
  acc.failed = 0
  // 목업: 아이디가 admin으로 시작하면 관리자
  currentUser = {
    id: `u-${username}`,
    username,
    nickname: randomNickname(),
    grade: 2,
    department: '컴퓨터공학과',
    is_admin: username.startsWith('admin'),
  }
  saveUser(currentUser)
  return currentUser
}

// 목업은 비밀번호를 검사하지 않는다 (흔한 비밀번호 목록은 진짜 서버에만 있음)
export async function checkPassword() {
  return { ok: true, reason: null }
}

export async function checkInvite(code) {
  await delay(250)
  const department = MOCK_INVITES[code?.trim().toUpperCase()]
  if (!department) throw fail(400, 'bad_invite')
  return { department }
}

export async function signup({ username, password, grade, invite_code, location }) {
  await delay()
  const department = MOCK_INVITES[invite_code?.trim().toUpperCase()]
  if (!department) throw fail(400, 'bad_invite')
  if (mockMode() === 'far' && location?.method === 'gps') throw fail(400, 'off_campus')
  if (location?.method === 'qr' && !findPlaceByCode(location.code)) throw fail(400, 'bad_code')
  currentUser = { id: `u-${username}`, username, nickname: randomNickname(), grade, department, is_admin: false }
  saveUser(currentUser)
  void password
  return currentUser
}

export async function logout() {
  await delay(150)
  currentUser = null
  saveUser(null)
}

export async function withdraw() {
  await delay()
  state.notes = state.notes.filter((n) => n.author_id !== currentUser?.id)
  state.unlocks = {}
  state.helpfuls.clear()
  currentUser = null
  saveUser(null)
}

// ---------- 장소·쪽지 ----------

function mockMode() {
  return new URLSearchParams(window.location.search).get('mock')
}

function findPlaceByCode(code) {
  const c = String(code ?? '').trim()
  return Object.keys(MOCK_CODES).find((id) => MOCK_CODES[id].qr === c || MOCK_CODES[id].manual === c) ?? null
}

// 서버가 보내는 쪽지 모양. 본 쪽지만 본문을 넣는다.
function shapeNote(note) {
  const u = state.unlocks[note.place_id]
  const seen = u && note.created_at <= u.last_seen_at
  const base = {
    id: note.id,
    category: note.category,
    author_grade: note.author.grade,
    helpful_count: note.helpful_count,
    course_name: note.course_name,
    hint: note.hint,
    is_official: note.is_official,
    created_at: note.created_at,
  }
  if (!seen) return { ...base, locked: true }
  return {
    ...base,
    locked: false,
    content: note.content,
    author_nickname: note.author.nickname,
    author_department: note.author.department,
    is_mine: note.author_id === currentUser?.id,
    liked_by_me: state.helpfuls.has(note.id),
  }
}

const visibleNotes = (placeId) => state.notes.filter((n) => n.place_id === placeId && !n.is_hidden)

// 지도에 보여 줄 장소별 요약 (진짜 /api/places 결과에 덧붙인다)
export function placeSummary(placeId) {
  const notes = visibleNotes(placeId)
  const category_counts = {}
  for (const n of notes) category_counts[n.category] = (category_counts[n.category] ?? 0) + 1
  return { note_count: notes.length, category_counts, unlocked: Boolean(state.unlocks[placeId]) }
}

export async function listNotes(placeId) {
  await delay(250)
  if (mockMode() === 'offline') throw fail(0, 'network')
  const u = state.unlocks[placeId]
  return {
    notes: visibleNotes(placeId).map(shapeNote),
    unlocked: Boolean(u),
    write_until: u?.write_until ?? null,
  }
}

// 잠금 해제. method: 'gps' | 'qr'
export async function unlock(placeId, body) {
  await delay(600)
  const mode = mockMode()
  if (mode === 'offline') throw fail(0, 'network')
  if (body.method === 'gps') {
    if (mode === 'blur') return { unlocked: false, reason: 'low_accuracy', distance_m: null }
    if (mode === 'far') return { unlocked: false, reason: 'too_far', distance_m: 120 }
  } else {
    const owner = findPlaceByCode(body.code)
    if (!owner) return { unlocked: false, reason: 'bad_code' }
    if (owner !== placeId) return { unlocked: false, reason: 'wrong_qr', place_id: owner }
  }

  const prev = state.unlocks[placeId]
  const now = nowIso()
  const new_ids = visibleNotes(placeId)
    .filter((n) => !prev || n.created_at > prev.last_seen_at)
    .map((n) => n.id)
  state.unlocks[placeId] = {
    first_unlocked_at: prev?.first_unlocked_at ?? now,
    last_seen_at: now,
    write_until: Date.now() + WRITE_WINDOW_MS,
  }
  return {
    unlocked: true,
    notes: visibleNotes(placeId).map(shapeNote),
    new_ids: prev ? new_ids : [],
    first_time: !prev,
    write_until: state.unlocks[placeId].write_until,
  }
}

// QR 스캔 화면(지도에서 바로 들어온 경우): 코드가 어느 장소 것인지만 알려 준다.
// 해제는 그 장소 책상에서 한다. TODO: 서버에 POST /api/codes/resolve 추가 필요 (CLAUDE.md 8장에 없음)
export async function resolveCode(code) {
  await delay(300)
  const placeId = findPlaceByCode(code)
  if (!placeId) throw fail(404, 'bad_code')
  return { place_id: placeId }
}

export async function writeNote(placeId, { category, content, course_name, hint }) {
  await delay(500)
  const isAdmin = currentUser?.is_admin
  const u = state.unlocks[placeId]
  if (!isAdmin && (!u || Date.now() > u.write_until)) throw fail(403, 'write_expired')
  const text = (content ?? '').trim()
  if (text.length < 10 || text.length > 200) throw fail(400, 'length')
  if ((hint ?? '').length > 15) throw fail(400, 'hint_length')
  const banned = BANNED_WORDS.find((w) => text.includes(w) || (hint ?? '').includes(w))
  if (banned) throw fail(400, 'banned_word', { word: banned })
  if (!isAdmin && Date.now() - state.lastWriteAt < WRITE_COOLDOWN_MS) throw fail(429, 'too_fast')

  const author = {
    id: currentUser.id,
    nickname: currentUser.nickname,
    grade: currentUser.grade,
    department: currentUser.department,
  }
  const note = {
    id: state.nextId++,
    place_id: placeId,
    category,
    content: text,
    author_id: author.id,
    author,
    hint: hint?.trim() || null,
    course_name: category === 'class' ? course_name?.trim() || null : null,
    helpful_count: 0,
    is_official: Boolean(isAdmin),
    is_hidden: false,
    created_at: nowIso(),
  }
  state.notes.push(note)
  state.lastWriteAt = Date.now()
  // 쓴 사람은 자기 쪽지를 바로 본다
  state.unlocks[placeId] = {
    first_unlocked_at: u?.first_unlocked_at ?? note.created_at,
    write_until: u?.write_until ?? Date.now() + WRITE_WINDOW_MS,
    last_seen_at: note.created_at,
  }
  return shapeNote(note)
}

export async function addHelpful(noteId) {
  await delay(250)
  const note = state.notes.find((n) => n.id === noteId)
  if (!note) throw fail(404, 'not_found')
  if (note.author_id === currentUser?.id) throw fail(400, 'own_note')
  if (!state.unlocks[note.place_id]) throw fail(403, 'locked')
  if (!state.helpfuls.has(noteId)) {
    state.helpfuls.add(noteId)
    note.helpful_count += 1
  }
  return { helpful_count: note.helpful_count }
}

export async function removeHelpful(noteId) {
  await delay(250)
  const note = state.notes.find((n) => n.id === noteId)
  if (!note) throw fail(404, 'not_found')
  if (state.helpfuls.delete(noteId)) note.helpful_count = Math.max(0, note.helpful_count - 1)
  return { helpful_count: note.helpful_count }
}

export async function deleteNote(noteId) {
  await delay()
  const note = state.notes.find((n) => n.id === noteId)
  if (!note) throw fail(404, 'not_found')
  if (note.author_id !== currentUser?.id && !currentUser?.is_admin) throw fail(403, 'forbidden')
  state.notes = state.notes.filter((n) => n.id !== noteId)
  return { ok: true }
}

export async function hideNote(noteId) {
  await delay()
  if (!currentUser?.is_admin) throw fail(403, 'forbidden')
  const note = state.notes.find((n) => n.id === noteId)
  if (note) note.is_hidden = true
  return { ok: true }
}

// 관리자 화면용: 숨긴 것까지 전부
export async function adminListNotes(placeId) {
  await delay(250)
  if (!currentUser?.is_admin) throw fail(403, 'forbidden')
  return state.notes.filter((n) => n.place_id === placeId).map((n) => ({ ...n, report_count: reportCount(n.id) }))
}

export async function unhideNote(noteId) {
  await delay()
  const note = state.notes.find((n) => n.id === noteId)
  if (note) note.is_hidden = false
  return { ok: true }
}

export async function collection() {
  await delay(250)
  return {
    unlocked: Object.entries(state.unlocks).map(([place_id, u]) => ({
      place_id,
      first_unlocked_at: u.first_unlocked_at,
    })),
    my_notes: state.notes
      .filter((n) => n.author_id === currentUser?.id)
      .map((n) => ({ id: n.id, place_id: n.place_id, category: n.category, content: n.content, created_at: n.created_at })),
  }
}

// ---------- 게스트 모드 (전시 부스 체험, 11/5) ----------

export async function guestLogin() {
  await delay()
  currentUser = {
    id: `guest-${Date.now()}`,
    username: 'guest',
    nickname: randomNickname(),
    grade: null,
    department: '관람객',
    is_admin: false,
    is_guest: true,
  }
  saveUser(currentUser)
  return currentUser
}
export const BOOTH_CODE = MOCK_CODES.booth.qr // 부스에 세워 둘 QR (목업)

// ---------- 신고 (3건이면 자동 숨김, 11/5) ----------

export const REPORT_REASONS = ['욕설·비방', '광고·홍보', '틀린 정보', '개인정보 노출', '기타']
const AUTO_HIDE_AT = 3

// detail: '기타'를 고른 사람이 적은 사유 (선택, 100자 이하)
export async function reportNote(noteId, reason, detail = '') {
  await delay()
  if (state.myReports.has(noteId)) throw fail(409, 'already_reported')
  state.myReports.add(noteId)
  state.reports[noteId] = (state.reports[noteId] ?? 0) + 1
  const note = state.notes.find((n) => n.id === noteId)
  const hidden = state.reports[noteId] >= AUTO_HIDE_AT
  if (note && hidden) note.is_hidden = true
  void reason, detail
  return { report_count: state.reports[noteId], hidden }
}
export const reportCount = (noteId) => state.reports[noteId] ?? 0
export const reportedByMe = (noteId) => state.myReports.has(noteId)

// ---------- 학과 대항전 (받은 도움됐어요 합계, 11/5) ----------

// 화면 확인용 기본 점수 + 예시 쪽지에서 받은 도움됐어요
const BASE_SCORES = { 컴퓨터공학과: 132, 전자공학과: 118, 경영학과: 97, 건축공학과: 64, 호텔외식조리학과: 51 }

export async function departmentRanking() {
  await delay(250)
  const scores = { ...BASE_SCORES }
  for (const n of state.notes) {
    const d = n.author.department
    if (d in scores) scores[d] += n.helpful_count
  }
  return Object.entries(scores)
    .map(([department, score]) => ({ department, score, writers: Math.round(score / 9) }))
    .sort((a, b) => b.score - a.score)
}

// ---------- 숫자로 증명하기 (관리자 통계) ----------

export async function adminStats(places) {
  await delay(300)
  if (!currentUser?.is_admin) throw fail(403, 'forbidden')
  const visible = state.notes.filter((n) => !n.is_hidden)
  const byCategory = {}
  for (const n of visible) byCategory[n.category] = (byCategory[n.category] ?? 0) + 1
  // 장소별 열람 수는 아직 기록이 없어 화면 확인용 숫자
  const OPENS = [86, 64, 58, 41, 37, 29, 22, 15, 9, 4]
  const byPlace = places.map((p, i) => ({ place_id: p.id, name: p.name, opens: OPENS[i % OPENS.length] }))
  byPlace.sort((a, b) => b.opens - a.opens)
  return {
    users: 23,
    notes: visible.length,
    official: visible.filter((n) => n.is_official).length,
    opens_total: byPlace.reduce((s, o) => s + o.opens, 0),
    helpful_total: visible.reduce((s, n) => s + n.helpful_count, 0),
    by_category: byCategory,
    by_place: byPlace,
    top_notes: [...visible]
      .sort((a, b) => b.helpful_count - a.helpful_count)
      .slice(0, 3)
      .map((n) => ({ id: n.id, content: n.content, category: n.category, helpful_count: n.helpful_count, place_id: n.place_id })),
  }
}

// ---------- 멘토링 코스 (11/5) ----------

const COURSES = [
  {
    id: 'first-week',
    title: '신입생 첫 주 코스',
    by: '컴퓨터공학과 학생회',
    summary: '입학 첫 주에 꼭 가 봐야 할 다섯 곳',
    steps: [
      { place_id: 'w7-admin', hint: '학사 행정은 여기서. 수강 정정 마감부터 확인해요' },
      { place_id: 'w6-liberal', hint: '교양 수업이 몰려 있는 곳. 강의실 번호 읽는 법을 알려 줄게요' },
      { place_id: 'w1-library', hint: '시험기간 전에 미리 자리 잡는 법' },
      { place_id: 'w16-union', hint: '점심 줄 피하는 시간대가 있어요' },
      { place_id: 'dorm-cheongun1', hint: '기숙사 생활 첫 주 꿀팁' },
    ],
  },
  {
    id: 'exam',
    title: '시험기간 생존 코스',
    by: 'DOTCI 운영진',
    summary: '공부 자리와 끼니를 한 번에',
    steps: [
      { place_id: 'w1-library', hint: '콘센트 되는 자리부터' },
      { place_id: 'w13-tower', hint: '도서관이 꽉 찼을 때 갈 곳' },
      { place_id: 'w16-union', hint: '늦게까지 여는 곳' },
    ],
  },
]

const courseProgress = (steps) => ({
  done: steps.filter((s) => state.unlocks[s.place_id]).length,
  total: steps.length,
})

export async function listCourses() {
  await delay(200)
  return COURSES.map(({ steps, ...c }) => ({ ...c, ...courseProgress(steps) }))
}

// 앞 단계를 열어야 다음 단계 힌트가 보인다
export async function getCourse(id) {
  await delay(200)
  const course = COURSES.find((c) => c.id === id)
  if (!course) throw fail(404, 'not_found')
  let reachable = true
  const steps = course.steps.map((s) => {
    const done = Boolean(state.unlocks[s.place_id])
    const visible = done || reachable
    if (!done) reachable = false
    return { place_id: s.place_id, done, current: visible && !done, hint: visible ? s.hint : null }
  })
  return { ...course, steps, ...courseProgress(course.steps) }
}

// ---------- 과목별 모아보기 (수강 팁, 내용은 보내지 않음) ----------

export async function listSubjects() {
  await delay(200)
  const map = {}
  for (const n of state.notes) {
    if (n.category !== 'class' || !n.course_name || n.is_hidden) continue
    const s = (map[n.course_name] ??= { course_name: n.course_name, places: {} })
    s.places[n.place_id] = (s.places[n.place_id] ?? 0) + 1
  }
  return Object.values(map)
    .map((s) => ({
      course_name: s.course_name,
      note_count: Object.values(s.places).reduce((a, b) => a + b, 0),
      places: Object.entries(s.places).map(([place_id, count]) => ({ place_id, count, unlocked: Boolean(state.unlocks[place_id]) })),
    }))
    .sort((a, b) => b.note_count - a.note_count)
}

// ---------- 근처 알림 (앱이 열려 있을 때만) ----------

// 진짜로는 watchPosition으로 내 위치를 따라가며 화면 안에서만 계산한다(서버로 안 보냄).
// 목업은 ?mock=near 일 때 안 연 장소 하나를 골라 준다.
export function nearbyHint(places) {
  if (mockMode() !== 'near') return null
  const candidates = places.filter((p) => !p.unlocked && !p.is_booth)
  const target = candidates.find((p) => p.note_count > 0) ?? candidates[0]
  return target ? { place: target, distance_m: 30 } : null
}

// 도감 수료증 확인용 (?mock=complete)
export const isCompleteMock = () => mockMode() === 'complete'

// ---------- 전시 큰 화면 (부스 모니터, 11/5) ----------

// 부스 방명록은 부스에 설치한 화면 자체에 보여 주는 것이라 본문까지 보낸다.
export async function displayFeed() {
  await delay(200)
  return state.notes
    .filter((n) => n.place_id === 'booth' && !n.is_hidden)
    .map((n) => ({ id: n.id, category: n.category, content: n.content, author_nickname: n.author.nickname, created_at: n.created_at }))
}

// 화면 확인용: 관람객이 방명록을 남긴 것처럼 몇 초마다 하나씩 추가
const VISITOR_LINES = [
  '길치라서 이런 거 진짜 필요했어요',
  '우리 과 대표한테 알려 줄게요',
  '선배 쪽지 뒤집히는 거 너무 귀여워요',
  '학식 줄 피하는 팁 저도 남기고 싶어요',
  '신입생 OT 때 쓰면 좋겠어요',
  '지도 위에 쪽지 개수 보이는 게 좋네요',
]
let visitorIndex = 0
export function addVisitorNote() {
  const line = VISITOR_LINES[visitorIndex++ % VISITOR_LINES.length]
  const note = {
    id: state.nextId++,
    place_id: 'booth',
    category: ['tip', 'study', 'food', 'warn', 'class'][visitorIndex % 5],
    content: line,
    author_id: 'visitor',
    author: { ...AUTHORS.visitor, nickname: randomNickname() },
    hint: null,
    course_name: null,
    helpful_count: 0,
    is_official: false,
    is_hidden: false,
    created_at: nowIso(),
  }
  state.notes.push(note)
  return { id: note.id, category: note.category, content: note.content, author_nickname: note.author.nickname, created_at: note.created_at }
}
