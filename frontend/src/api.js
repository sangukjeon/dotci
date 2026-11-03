// 서버 호출은 모두 이 파일을 거친다.
// 화면과 서버가 같은 주소(/api)를 쓰므로 쿠키가 자동으로 함께 간다. (CLAUDE.md 3장)

import { DEMO_PLACES, IS_DEMO } from './demo.js'

const RETRY_INTERVAL_MS = 3000
const RETRY_MAX_MS = 60000

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Render 무료 서버가 잠들어 있으면 502/503이나 네트워크 오류가 난다.
// 이때는 3초 간격으로 최대 약 1분 다시 시도한다. (CLAUDE.md 6장)
// TODO(10/13): 1.5초 넘게 걸리면 "책상 닦는 중" 표시
export async function apiFetch(path, options = {}) {
  const started = Date.now()
  for (;;) {
    let res
    try {
      res = await fetch(path, {
        credentials: 'same-origin',
        headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined,
      })
    } catch (err) {
      if (Date.now() - started > RETRY_MAX_MS) throw err
      await sleep(RETRY_INTERVAL_MS)
      continue
    }
    if ((res.status === 502 || res.status === 503) && Date.now() - started <= RETRY_MAX_MS) {
      await sleep(RETRY_INTERVAL_MS)
      continue
    }
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      const error = new Error(data?.detail || `요청 실패 (${res.status})`)
      error.status = res.status
      error.data = data
      throw error
    }
    return data
  }
}

export const getPlaces = () =>
  IS_DEMO ? Promise.resolve(DEMO_PLACES.map((p) => ({ ...p }))) : apiFetch('/api/places')
