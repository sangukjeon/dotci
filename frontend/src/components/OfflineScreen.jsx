import { useState } from 'react'
import { Link } from 'react-router-dom'
import { WifiOff } from 'lucide-react'
import './OfflineScreen.css'

// 와이파이·데이터가 끊겼을 때 화면 전체를 덮는 안내. 다시 연결되면 저절로 사라진다.
export default function OfflineScreen() {
  const [checking, setChecking] = useState(false)

  const retry = () => {
    setChecking(true)
    // 브라우저가 이미 연결됐다고 알고 있으면 새로고침, 아니면 잠깐 확인하는 척만
    if (navigator.onLine) window.location.reload()
    else setTimeout(() => setChecking(false), 1200)
  }

  return (
    <div className="offline" role="alertdialog" aria-modal="true" aria-labelledby="offline-title" aria-describedby="offline-body">
      <div className="offline__icon" aria-hidden="true">
        <WifiOff size={36} />
        <span className="offline__ping" />
      </div>
      <h1 id="offline-title" className="offline__title">
        인터넷 연결이 끊겼어요
      </h1>
      <p id="offline-body" className="offline__body">
        와이파이나 모바일 데이터를 확인해 주세요.
        <br />
        다시 연결되면 이 화면은 저절로 닫혀요.
      </p>
      <button type="button" className="btn-main offline__btn" onClick={retry} disabled={checking}>
        {checking ? '확인하는 중…' : '다시 시도'}
      </button>
      <Link to="/example" className="offline__link">
        기다리는 동안 예시 책상 보기
      </Link>
    </div>
  )
}
