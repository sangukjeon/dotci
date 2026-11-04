import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Award, Check, ChevronLeft, Download } from 'lucide-react'
import { useAuth } from '../auth.jsx'
import { useToast } from '../toast.jsx'
import { getPlaces } from '../api.js'
import { CATEGORIES } from '../categories.js'
import * as server from '../server.js'
import './CollectionPage.css'

const shortDate = (iso) => {
  const d = new Date(iso)
  return `${d.getMonth() + 1}.${d.getDate()}`
}

// 내 도감: 연 장소 스탬프 판 + 내가 남긴 쪽지
export default function CollectionPage() {
  const [places, setPlaces] = useState([])
  const [data, setData] = useState(null)
  const { user } = useAuth()
  const toast = useToast()

  useEffect(() => {
    getPlaces().then(setPlaces).catch(() => setPlaces([]))
    server.collection().then(setData)
  }, [])

  // ?mock=complete 이면 전부 연 것처럼 (수료증 확인용)
  const opened = server.isCompleteMock()
    ? new Map(places.map((p, i) => [p.id, new Date(Date.now() - (places.length - i) * 86_400_000).toISOString()]))
    : new Map((data?.unlocked ?? []).map((u) => [u.place_id, u.first_unlocked_at]))
  const total = places.length
  const done = places.filter((p) => opened.has(p.id)).length
  const placeName = (id) => places.find((p) => p.id === id)?.name ?? id

  return (
    <main className="coll">
      <header className="top-bar">
        <Link to="/" className="icon-btn pressable" aria-label="지도로 돌아가기">
          <ChevronLeft size={26} aria-hidden="true" />
        </Link>
        <h1 className="coll__title">내 도감</h1>
      </header>

      <section className="coll__summary">
        <p className="coll__count">
          <b>{done}</b> / {total}곳
        </p>
        <div className="coll__bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
          <span style={{ width: total ? `${(done / total) * 100}%` : 0 }} />
        </div>
        {total > 0 && done === total ? (
          <div className="cert" role="img" aria-label={`캠퍼스 수료증, ${user?.nickname}, ${total}곳 완주`}>
            <p className="cert__logo">
              DOTCI<span className="brand-dot" aria-hidden="true" />
            </p>
            <p className="cert__title">캠퍼스 수료증</p>
            <p className="cert__name">{user?.nickname}</p>
            <p className="cert__meta">
              {user?.department} · 우송대학교 서캠퍼스 {total}곳 완주
            </p>
            <div className="cert__dots" aria-hidden="true">
              {places.map((p) => (
                <span key={p.id} />
              ))}
            </div>
            <p className="cert__date">{new Date().toLocaleDateString('ko-KR')}</p>
            <Award className="cert__badge" size={28} aria-hidden="true" />
          </div>
        ) : (
          <p className="coll__help">장소에 도착해서 책상을 열면 도장이 찍혀요</p>
        )}
      </section>

      {total > 0 && done === total && (
        <div className="cert__actions">
          <button className="btn-sub" onClick={() => toast('이미지 저장은 준비 중이에요')}>
            <Download size={18} aria-hidden="true" /> 이미지로 저장
          </button>
        </div>
      )}

      <ul className="coll__grid">
        {places.map((p) => {
          const at = opened.get(p.id)
          return (
            <li key={p.id}>
              <Link to={`/place/${p.id}`} className={at ? 'stamp stamp--on' : 'stamp'} aria-label={`${p.name}${at ? `, ${shortDate(at)}에 열었어요` : ', 아직 안 열었어요'}`}>
                <span className="stamp__mark" aria-hidden="true">
                  {at ? <Check size={22} strokeWidth={3} /> : null}
                </span>
                <span className="stamp__name">{p.name}</span>
                <span className="stamp__date">{at ? shortDate(at) : '·'}</span>
              </Link>
            </li>
          )
        })}
      </ul>

      <section className="coll__notes">
        <h2 className="coll__h2">내가 남긴 흔적</h2>
        {data?.my_notes.length ? (
          <ul className="coll__list">
            {data.my_notes.map((n) => {
              const c = CATEGORIES[n.category] ?? CATEGORIES.tip
              return (
                <li key={n.id}>
                  <Link to={`/place/${n.place_id}`} className="coll__note">
                    <span className="ncard__chip" style={{ background: c.bg, color: c.text }}>
                      {c.label}
                    </span>
                    <span className="coll__note-text">{n.content}</span>
                    <span className="coll__note-meta">
                      {placeName(n.place_id)} · {shortDate(n.created_at)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="coll__empty">아직 남긴 흔적이 없어요.{'\n'}장소를 열고 30분 안에 남길 수 있어요.</p>
        )}
      </section>
    </main>
  )
}
