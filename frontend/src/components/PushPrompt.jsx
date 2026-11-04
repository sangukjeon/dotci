import { useEffect, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { BellRing } from 'lucide-react'
import Sheet from './Sheet.jsx'
import { enablePush, markPushAsked, pushAsked, pushState } from '../push.js'
import { useToast } from '../toast.jsx'
import './MeSheet.css'

const SHOW_AFTER_MS = 1500 // 지도가 뜬 뒤 잠깐 있다가 묻는다

// 처음 앱을 열었을 때 딱 한 번 "알림 받을래요?"를 묻는다.
// 브라우저 허용 창은 사용자가 "알림 받기"를 누른 뒤에만 띄운다 (갑자기 뜨면 거절하기 쉽고, 아이폰은 막는다).
export default function PushPrompt() {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (pushAsked()) return
    let alive = true
    const timer = setTimeout(async () => {
      const state = await pushState()
      if (alive && state === 'off') setOpen(true)
    }, SHOW_AFTER_MS)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [])

  const later = () => {
    markPushAsked()
    setOpen(false)
  }

  const accept = async () => {
    setBusy(true)
    try {
      const result = await enablePush()
      if (result === 'on') toast('알림을 켰어요', { success: true })
      else if (result === 'denied') toast('알림이 차단됐어요. 나중에 브라우저 설정에서 바꿀 수 있어요')
    } catch {
      toast('알림을 켜지 못했어요. 내 정보에서 다시 켤 수 있어요')
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <Sheet title="알림 받을래요?" onClose={later} labelId="push-prompt-title">
          <div className="push-prompt">
            <span className="push-prompt__icon" aria-hidden="true">
              <BellRing size={28} />
            </span>
            <p className="push-prompt__body">
              <b>내 쪽지가 도움됐을 때</b>, 그리고 축제·이벤트 같은 <b>공지</b>를 폰 알림으로 알려 드려요.{'\n'}광고는 보내지 않아요.
            </p>
            <p className="push-prompt__help">내 정보 → 알림에서 언제든 끄고 켤 수 있어요.</p>
            <div className="push-prompt__actions">
              <button type="button" className="btn-sub" onClick={later} disabled={busy}>
                나중에
              </button>
              <button type="button" className="btn-main" onClick={accept} disabled={busy}>
                {busy ? '켜는 중…' : '알림 받기'}
              </button>
            </div>
          </div>
        </Sheet>
      )}
    </AnimatePresence>
  )
}
