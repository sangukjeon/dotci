// 가짜 서버 (화면 확인용). 10/12~13에 진짜 API(api.js)로 하나씩 바꾸고, 다 바꾸면 이 파일을 지운다.
//
// 진짜 서버 규칙(CLAUDE.md 2장 규칙 8, 8장)을 똑같이 흉내 낸다:
//  - 잠긴 쪽지 응답에는 content 키가 아예 없다.
//  - 본 쪽지(created_at <= last_seen_at)만 본문을 준다.
//  - 쓰기는 해제 후 30분 안에만 (관리자는 언제나).
//
// 집에서 실패 화면 보기: 주소 끝에 ?mock=far (거리 멂) / ?mock=blur (위치 흐림)
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
  'w13-tower', 'w16-union', 'w17-media', 'dorm-cheongun1',
]
const MOCK_CODES = Object.fromEntries(
  PLACE_IDS.map((id, i) => [id, { qr: `MOCKQR${i + 1}`, manual: String(100001 + i) }]),
)

const AUTHORS = {
  a4: { id: 'a4', nickname: '열람실지박령', grade: 4, department: '컴퓨터공학과' },
  a3: { id: 'a3', nickname: '삼학년', grade: 3, department: '전자공학과' },
  a2: { id: 'a2', nickname: '학식러버', grade: 2, department: '경영학과' },
  a1: { id: 'a1', nickname: '새내기', grade: 1, department: '컴퓨터공학과' },
  admin: { id: 'admin', nickname: '선배의 흔적', grade: 4, department: '운영진' },
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
  ],
  unlocks: {}, // place_id → { first_unlocked_at, last_seen_at, write_until }
  helpfuls: new Set(), // note_id
  lastWriteAt: 0,
}

// ---------- 로그인 (이 브라우저에만 기억) ----------

const USER_KEY = 'seonbae-mock-user'
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

export async function login({ username, password }) {
  await delay()
  if (!username || !password || password.length < 8) throw fail(401, 'bad_credentials')
  // 목업: 아이디가 admin으로 시작하면 관리자
  currentUser = {
    id: `u-${username}`,
    username,
    nickname: username,
    grade: 2,
    department: '컴퓨터공학과',
    is_admin: username.startsWith('admin'),
  }
  saveUser(currentUser)
  return currentUser
}

export async function checkInvite(code) {
  await delay(250)
  const department = MOCK_INVITES[code?.trim().toUpperCase()]
  if (!department) throw fail(400, 'bad_invite')
  return { department }
}

export async function signup({ username, password, nickname, grade, invite_code, location }) {
  await delay()
  const department = MOCK_INVITES[invite_code?.trim().toUpperCase()]
  if (!department) throw fail(400, 'bad_invite')
  if (mockMode() === 'far' && location?.method === 'gps') throw fail(400, 'off_campus')
  if (location?.method === 'qr' && !findPlaceByCode(location.code)) throw fail(400, 'bad_code')
  currentUser = { id: `u-${username}`, username, nickname, grade, department, is_admin: false }
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
  return state.notes.filter((n) => n.place_id === placeId)
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
