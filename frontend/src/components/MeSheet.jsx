import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, LogOut, ShieldCheck, Stamp } from 'lucide-react'
import Sheet from './Sheet.jsx'
import { useAuth } from '../auth.jsx'
import './MeSheet.css'

// 지도 오른쪽 위 "내 정보" 버튼을 누르면 올라오는 시트
export default function MeSheet({ onClose }) {
  const { user, logout, withdraw } = useAuth()
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  const doWithdraw = async () => {
    setBusy(true)
    await withdraw()
  }

  return (
    <Sheet title="내 정보" onClose={onClose} labelId="me-title">
      <div className="me__profile">
        <span className="me__avatar" aria-hidden="true">
          {user.nickname.slice(0, 1)}
        </span>
        <div>
          <p className="me__name">{user.nickname}</p>
          <p className="me__meta">
            {user.grade}학년 · {user.department}
          </p>
        </div>
      </div>

      <ul className="me__menu">
        <li>
          <Link to="/me" className="me__row">
            <Stamp size={20} aria-hidden="true" /> 내 도감 <ChevronRight className="me__chev" size={18} aria-hidden="true" />
          </Link>
        </li>
        {user.is_admin && (
          <li>
            <Link to="/admin" className="me__row">
              <ShieldCheck size={20} aria-hidden="true" /> 관리자 화면 <ChevronRight className="me__chev" size={18} aria-hidden="true" />
            </Link>
          </li>
        )}
        <li>
          <button className="me__row" onClick={logout}>
            <LogOut size={20} aria-hidden="true" /> 로그아웃
          </button>
        </li>
      </ul>

      {confirm ? (
        <div className="me__danger-box">
          <p>탈퇴하면 계정과 남긴 쪽지, 연 장소 기록이 모두 지워져요. 되돌릴 수 없어요.</p>
          <div className="me__danger-actions">
            <button className="btn-sub" onClick={() => setConfirm(false)}>
              취소
            </button>
            <button className="me__danger" onClick={doWithdraw} disabled={busy}>
              {busy ? '지우는 중...' : '탈퇴하기'}
            </button>
          </div>
        </div>
      ) : (
        <button className="me__withdraw" onClick={() => setConfirm(true)}>
          탈퇴하기
        </button>
      )}
    </Sheet>
  )
}
