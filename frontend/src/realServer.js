// 진짜 서버(FastAPI) 호출. 함수 이름과 돌려주는 모양은 mock/server.js와 똑같이 맞췄다.
// 그래서 화면 코드는 server.js 하나만 불러 쓰고, 체험판이면 가짜, 아니면 진짜가 연결된다.

import { apiFetch } from './api.js'

// 서버 실패 응답 {"detail": {"code": "...", ...}} 을 화면이 쓰던 err.code 모양으로 바꾼다.
async function call(path, options) {
  try {
    return await apiFetch(path, options)
  } catch (err) {
    const detail = err.data?.detail
    if (detail && typeof detail === 'object' && !Array.isArray(detail)) Object.assign(err, detail)
    err.code ??= err.status ? 'error' : 'network'
    throw err
  }
}

const post = (path, body) => call(path, { method: 'POST', body: body ?? {} })

// ---------- 로그인 ----------

export const me = () => call('/api/auth/me')
export const login = ({ username, password }) => post('/api/auth/login', { username, password })
export const checkInvite = (code) => post('/api/auth/invite', { code })
export const checkPassword = (username, password) => post('/api/auth/password-check', { username, password })
export const signup = (form) => post('/api/auth/signup', form)
export async function logout() {
  await post('/api/auth/logout')
  writeTokens.clear()
}
export async function withdraw() {
  await call('/api/auth/me', { method: 'DELETE' })
  writeTokens.clear()
}

// 게스트(관람객) 모드는 아직 서버에 없다. 화면에서 버튼을 숨긴다.
export async function guestLogin() {
  const err = new Error('not_supported')
  err.code = 'not_supported'
  throw err
}

// ---------- 쓰기 토큰 ----------
// 잠금 해제에 성공하면 서버가 "30분 동안 이 장소에 쓸 수 있다"는 토큰을 준다.
// 새로고침해도 이어지게 이 탭(sessionStorage)에만 둔다. 토큰은 내 계정·이 장소에만 통해서 남이 써도 소용없다.

const TOKENS_KEY = 'dotci-write-tokens'
const writeTokens = {
  all() {
    try {
      return JSON.parse(sessionStorage.getItem(TOKENS_KEY)) ?? {}
    } catch {
      return {}
    }
  },
  get(placeId) {
    const t = this.all()[placeId]
    return t && t.until > Date.now() ? t : null
  },
  set(placeId, token, until) {
    try {
      sessionStorage.setItem(TOKENS_KEY, JSON.stringify({ ...this.all(), [placeId]: { token, until } }))
    } catch {
      /* 저장 못 해도 이번 화면에서는 아래 memory로 동작 */
    }
    memory[placeId] = { token, until }
  },
  clear() {
    try {
      sessionStorage.removeItem(TOKENS_KEY)
    } catch {
      /* 무시 */
    }
    for (const k of Object.keys(memory)) delete memory[k]
  },
}
const memory = {}
const tokenFor = (placeId) => writeTokens.get(placeId) ?? (memory[placeId]?.until > Date.now() ? memory[placeId] : null)

// ---------- 장소·쪽지 ----------

// 진짜 서버의 /api/places는 쪽지 수·연 장소를 이미 담아 보내므로 덧붙일 것이 없다.
export const withMockPlaces = (list) => list
export const placeSummary = () => ({})

export async function listNotes(placeId) {
  const data = await call(`/api/places/${encodeURIComponent(placeId)}/notes`)
  return { ...data, write_until: data.unlocked ? (tokenFor(placeId)?.until ?? null) : null }
}

export async function unlock(placeId, body) {
  const result = await post(`/api/places/${encodeURIComponent(placeId)}/unlock`, body)
  if (result.unlocked) writeTokens.set(placeId, result.write_token, result.write_until)
  return result
}

export const resolveCode = (code) => post('/api/codes/resolve', { code })

export function writeNote(placeId, { category, content, course_name, hint }) {
  return post(`/api/places/${encodeURIComponent(placeId)}/notes`, {
    category,
    content,
    course_name: course_name || null,
    hint: hint || null,
    write_token: tokenFor(placeId)?.token ?? null,
    // 서버가 깨는 동안 재시도해도 한 번만 저장되게 (CLAUDE.md 6장)
    client_request_id: crypto.randomUUID(),
  })
}

export const addHelpful = (noteId) => post(`/api/notes/${noteId}/helpful`)
export const removeHelpful = (noteId) => call(`/api/notes/${noteId}/helpful`, { method: 'DELETE' })
export const deleteNote = (noteId) => call(`/api/notes/${noteId}`, { method: 'DELETE' })

// ---------- 관리자 ----------

export const hideNote = (noteId) => post(`/api/admin/notes/${noteId}/hide`)
export const unhideNote = (noteId) => post(`/api/admin/notes/${noteId}/unhide`)
export const adminListNotes = (placeId) => call(`/api/admin/places/${encodeURIComponent(placeId)}/notes`)

// ---------- 도감 ----------

export const collection = () => call('/api/me/collection')

// ---------- 공지 푸시 알림 ----------

export const pushKey = () => call('/api/push/key')
export const pushSubscribe = (subscription) => post('/api/push/subscribe', subscription)
export const pushUnsubscribe = (endpoint) => post('/api/push/unsubscribe', { endpoint })
export const sendAnnouncement = ({ title, body, url }) => post('/api/admin/announcements', { title, body, url })
export const listAnnouncements = () => call('/api/admin/announcements')
export const deleteAnnouncement = (id) => call(`/api/admin/announcements/${id}`, { method: 'DELETE' })
