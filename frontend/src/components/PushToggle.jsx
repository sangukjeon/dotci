import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { disablePush, enablePush, pushState } from '../push.js'
import { useToast } from '../toast.jsx'

// 상태별 안내 (스위치 아래 작은 글씨)
const HELP = {
  'ios-install': '아이폰은 사파리 공유 버튼 → "홈 화면에 추가" 후 그 앱에서 켤 수 있어요.',
  unsupported: '이 브라우저는 알림을 지원하지 않아요.',
  denied: '알림이 차단돼 있어요.\n브라우저 설정에서 DOTCI 알림을 허용해 주세요.',
  'server-off': '지금은 알림을 준비 중이에요.',
  off: '공지와 내 쪽지 반응을 폰 알림으로 받아요.',
  on: '공지와 내 쪽지 반응을 알려 드릴게요.',
}

// "내 정보" 시트의 알림 스위치 (공지 + 내 쪽지 반응을 한 번에)
export default function PushToggle() {
  const toast = useToast()
  const [state, setState] = useState('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    pushState().then((s) => alive && setState(s))
    return () => {
      alive = false
    }
  }, [])

  const canToggle = state === 'on' || state === 'off'
  const showHelp = !['loading', 'on', 'off'].includes(state)
  const toggle = async () => {
    setBusy(true)
    try {
      const next = state === 'on' ? await disablePush() : await enablePush()
      setState(next)
      if (next === 'on') toast('알림을 켰어요', { success: true })
      else if (state === 'on') toast('알림을 껐어요')
    } catch {
      toast('알림 설정을 바꾸지 못했어요. 잠시 뒤 다시 해 주세요')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="me__push">
      <div className="me__row me__push-row">
        <Bell size={20} aria-hidden="true" />
        <span id="push-label">알림</span>
        <button
          type="button"
          role="switch"
          className="switch"
          aria-checked={state === 'on'}
          aria-labelledby="push-label"
          aria-describedby={showHelp ? 'push-help' : undefined}
          disabled={!canToggle || busy}
          onClick={toggle}
        >
          <span className="switch__thumb" />
        </button>
      </div>
      {/* 켜져 있거나 꺼져 있을 때는 설명 없이 깔끔하게, 켤 수 없는 이유가 있을 때만 안내 */}
      {showHelp && (
        <p id="push-help" className="me__push-help">
          {HELP[state]}
        </p>
      )}
    </div>
  )
}
