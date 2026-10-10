import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, CircleCheck, Lock, MapPin, PenLine } from 'lucide-react'
import { getPlaces } from '../api.js'
import Desk from '../components/Desk.jsx'
import { MOCK_CONTENTS, MOCK_LOCKED_NOTES } from '../mock.js'
import './DeskPage.css'

export default function DeskPage() {
  const { id } = useParams()
  const [place, setPlace] = useState(null)
  // 쪽지 id → 본문. 비어 있으면 모두 잠김. (해제 응답으로만 채운다)
  const [contents, setContents] = useState({})

  useEffect(() => {
    getPlaces()
      .then((list) => setPlace(list.find((p) => p.id === id) ?? null))
      .catch(() => setPlace(null))
  }, [id])

  // TODO(10/12): GET /api/places/{id}/notes 로 교체
  const notes = MOCK_LOCKED_NOTES[id] ?? []
  const unlocked = Object.keys(contents).length > 0

  // TODO(10/12): 위치를 받아 POST /api/places/{id}/unlock 호출. 지금은 "서버가 본문을 보내 준" 상황을 흉내 낸다.
  const mockUnlock = () => {
    const received = {}
    for (const n of notes) received[n.id] = MOCK_CONTENTS[n.id] ?? ''
    setContents(received)
  }

  return (
    <main className="desk-page">
      <header className="top-bar">
        <Link to="/" className="icon-btn pressable" aria-label="지도로 돌아가기">
          <ChevronLeft size={26} aria-hidden="true" />
        </Link>
      </header>

      <section className="desk-page__head">
        <p className="desk-page__building">{place?.building ?? ''}</p>
        <h1 className="desk-page__name">{place?.name ?? ''}</h1>
        {unlocked ? (
          <span className="tag" style={{ background: 'var(--success-weak)', color: 'var(--success)' }}>
            <CircleCheck size={14} aria-hidden="true" /> 열었어요
          </span>
        ) : notes.length > 0 ? (
          <span className="tag" style={{ background: 'var(--bg)', color: 'var(--text-2)' }}>
            <Lock size={14} aria-hidden="true" />
            <span>
              쪽지 <b>{notes.length}</b>개 잠김
            </span>
          </span>
        ) : (
          <span className="tag" style={{ background: 'var(--bg)', color: 'var(--text-2)' }}>
            아직 쪽지가 없어요
          </span>
        )}
      </section>

      <Desk notes={notes} contents={contents} />

      <div className="bottom-plate">
        {unlocked ? (
          <button className="btn-main" type="button">
            <PenLine size={20} aria-hidden="true" /> 흔적 남기기
          </button>
        ) : (
          <button className="btn-main" type="button" onClick={mockUnlock}>
            <MapPin size={20} aria-hidden="true" /> 도착 확인하기
          </button>
        )}
      </div>
    </main>
  )
}
