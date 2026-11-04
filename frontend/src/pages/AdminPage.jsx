import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import { BadgeCheck, ChevronLeft, Eye, EyeOff, Flag, PenLine } from 'lucide-react'
import { getPlaces } from '../api.js'
import { CATEGORIES } from '../categories.js'
import { useToast } from '../toast.jsx'
import WriteSheet from '../components/WriteSheet.jsx'
import AdminStats from '../components/AdminStats.jsx'
import AdminAnnounce from '../components/AdminAnnounce.jsx'
import * as server from '../server.js'
import './AdminPage.css'

// 관리자: 장소를 골라 어디서나 공식 쪽지 쓰기, 쪽지 숨기기·되살리기
export default function AdminPage() {
  const toast = useToast()
  const [places, setPlaces] = useState([])
  const [placeId, setPlaceId] = useState('')
  const [notes, setNotes] = useState([])
  const [writing, setWriting] = useState(false)
  const [tab, setTab] = useState('notes') // notes | stats | announce

  useEffect(() => {
    getPlaces()
      .then(server.withMockPlaces)
      .then((list) => {
        setPlaces(list)
        setPlaceId((cur) => cur || list[0]?.id || '')
      })
      .catch(() => setPlaces([]))
  }, [])

  const load = useCallback(() => {
    if (placeId) server.adminListNotes(placeId).then(setNotes)
  }, [placeId])
  useEffect(load, [load])

  const toggleHidden = async (note) => {
    await (note.is_hidden ? server.unhideNote(note.id) : server.hideNote(note.id))
    toast(note.is_hidden ? '다시 보이게 했어요' : '숨겼어요')
    load()
  }

  const place = places.find((p) => p.id === placeId)
  const visible = notes.filter((n) => !n.is_hidden).length

  return (
    <main className="admin">
      <header className="top-bar">
        <Link to="/" className="icon-btn pressable" aria-label="지도로 돌아가기">
          <ChevronLeft size={26} aria-hidden="true" />
        </Link>
        <h1 className="admin__title">관리자</h1>
      </header>

      <div className="admin__tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'notes'} className="admin__tab" onClick={() => setTab('notes')}>
          쪽지 관리
        </button>
        <button role="tab" aria-selected={tab === 'stats'} className="admin__tab" onClick={() => setTab('stats')}>
          통계
        </button>
        <button role="tab" aria-selected={tab === 'announce'} className="admin__tab" onClick={() => setTab('announce')}>
          공지
        </button>
      </div>

      {tab === 'announce' ? (
        <AdminAnnounce />
      ) : tab === 'stats' ? (
        <AdminStats places={places.filter((p) => !p.is_booth)} />
      ) : (
      <>

      <section className="admin__head">
        <label className="field" style={{ marginBottom: 0 }}>
          <span className="field__label">장소</span>
          <select className="input" value={placeId} onChange={(e) => setPlaceId(e.target.value)}>
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.building})
              </option>
            ))}
          </select>
        </label>
        <p className="admin__stat">
          보이는 쪽지 <b>{visible}</b> · 숨긴 쪽지 <b>{notes.length - visible}</b>
          {visible < 3 && <span className="admin__warn"> · 3장 이상 채워 주세요</span>}
        </p>
      </section>

      <ul className="admin__list">
        {notes.map((n) => {
          const c = CATEGORIES[n.category] ?? CATEGORIES.tip
          return (
            <li key={n.id} className={n.is_hidden ? 'admin__row admin__row--hidden' : 'admin__row'}>
              <div className="admin__row-main">
                <span className="admin__row-top">
                  <span className="ncard__chip" style={{ background: c.bg, color: c.text }}>
                    {c.label}
                  </span>
                  {n.is_official && <BadgeCheck size={16} color="var(--primary)" aria-label="공식" />}
                  {n.is_hidden && <span className="admin__hidden-tag">숨김</span>}
                  {n.report_count > 0 && (
                    <span className="admin__report-tag">
                      <Flag size={12} aria-hidden="true" /> 신고 {n.report_count}
                      {n.report_count >= 3 ? ' · 자동 숨김' : ''}
                    </span>
                  )}
                </span>
                <span className="admin__text">{n.content}</span>
                <span className="admin__meta">
                  {n.author.nickname} · {n.author.grade}학년 · 도움 {n.helpful_count}
                </span>
              </div>
              <button
                className="icon-btn admin__toggle"
                onClick={() => toggleHidden(n)}
                aria-label={n.is_hidden ? '다시 보이게 하기' : '숨기기'}
              >
                {n.is_hidden ? <Eye size={20} aria-hidden="true" /> : <EyeOff size={20} aria-hidden="true" />}
              </button>
            </li>
          )
        })}
        {notes.length === 0 && <li className="admin__empty">이 장소에는 아직 쪽지가 없어요</li>}
      </ul>

      <div className="bottom-plate">
        <button className="btn-main" onClick={() => setWriting(true)} disabled={!placeId}>
          <PenLine size={20} aria-hidden="true" /> 공식 쪽지 쓰기
        </button>
      </div>
      </>
      )}

      <AnimatePresence>
        {writing && (
          <WriteSheet
            placeId={placeId}
            placeName={place?.name}
            onClose={() => setWriting(false)}
            onWritten={() => {
              setWriting(false)
              toast('공식 쪽지를 붙였어요', { success: true })
              load()
            }}
          />
        )}
      </AnimatePresence>
    </main>
  )
}
