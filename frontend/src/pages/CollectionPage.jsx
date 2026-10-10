import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Award, Check, ChevronLeft } from 'lucide-react'
import { getPlaces } from '../api.js'
import { CATEGORIES } from '../categories.js'
import * as server from '../mock/server.js' // TODO: GET /api/me/collection
import './CollectionPage.css'

const shortDate = (iso) => {
  const d = new Date(iso)
  return `${d.getMonth() + 1}.${d.getDate()}`
}

// 내 도감: 연 장소 스탬프 판 + 내가 남긴 쪽지
export default function CollectionPage() {
  const [places, setPlaces] = useState([])
  const [data, setData] = useState(null)

  useEffect(() => {
    getPlaces().then(setPlaces).catch(() => setPlaces([]))
    server.collection().then(setData)
  }, [])

  const opened = new Map((data?.unlocked ?? []).map((u) => [u.place_id, u.first_unlocked_at]))
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
          <div className="banner banner--info coll__done">
            <Award size={18} aria-hidden="true" />
            <span>캠퍼스를 모두 돌아봤어요. 이제 다음 후배를 위한 흔적을 남겨 주세요.</span>
          </div>
        ) : (
          <p className="coll__help">장소에 도착해서 책상을 열면 도장이 찍혀요</p>
        )}
      </section>

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
          <p className="coll__empty">아직 남긴 흔적이 없어요. 장소를 열고 30분 안에 남길 수 있어요.</p>
        )}
      </section>
    </main>
  )
}
