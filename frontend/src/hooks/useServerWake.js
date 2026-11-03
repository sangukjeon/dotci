import { useEffect, useRef, useState } from 'react'
import { IS_DEMO } from '../demo.js'

const RETRY_MS = 3000
const KEEP_AWAKE_MS = 10 * 60_000
const SHOW_LOADING_AFTER_MS = 1500
const REQUEST_TIMEOUT_MS = 10_000
const DONE_HOLD_MS = 900 // 다 깨면 게이지 100%를 잠깐 보여 주고 닫는다

// Render 무료 서버 깨우기 (CLAUDE.md 6장)
// - 앱을 열면 /api/health 를 성공할 때까지 3초 간격으로 부른다.
// - 1.5초 넘게 걸릴 때만 waking=true ("책상 닦는 중" 표시)
// - 화면이 보이는 동안만 10분마다, 다른 앱에서 돌아오면 즉시 다시 깨운다.
// - 응답 없이 10초가 지나면 그 요청은 끊고 다시 시도한다.
// - cancel(): 안내 화면만 닫고, 깨우기는 뒤에서 계속한다.
export function useServerWake() {
  const [waking, setWaking] = useState(false)
  const [done, setDone] = useState(false)
  const running = useRef(false)
  const dismissed = useRef(false)

  useEffect(() => {
    if (IS_DEMO) return // 체험판에는 깨울 서버가 없다
    let cancelled = false

    async function wake() {
      if (running.current) return
      running.current = true
      dismissed.current = false
      setDone(false)
      const slow = setTimeout(
        () => !cancelled && !dismissed.current && setWaking(true),
        SHOW_LOADING_AFTER_MS,
      )
      for (;;) {
        try {
          const res = await fetch('/api/health', {
            cache: 'no-store',
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          })
          if (res.ok) break
        } catch {
          /* 아직 자는 중이거나 10초 동안 응답 없음 */
        }
        if (cancelled) break
        await new Promise((r) => setTimeout(r, RETRY_MS))
      }
      clearTimeout(slow)
      if (cancelled) return
      setDone(true)
      await new Promise((r) => setTimeout(r, DONE_HOLD_MS))
      running.current = false
      if (!cancelled) setWaking(false)
    }

    wake()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') wake()
    }, KEEP_AWAKE_MS)
    const onVisible = () => document.visibilityState === 'visible' && wake()
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      running.current = false // 개발 모드(StrictMode)에서 효과가 두 번 돌아도 다시 깨울 수 있게
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  function cancel() {
    dismissed.current = true
    setWaking(false)
  }

  return { waking, done, cancel }
}
