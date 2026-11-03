import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { CATEGORIES, CATEGORY_KEYS } from '../categories.js'
import * as server from '../server.js'
import './AdminStats.css'

// 숫자로 증명하기: 실사용 기록을 PPT에 옮길 수 있게 보여 주는 관리자 통계
export default function AdminStats({ places }) {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (places.length) server.adminStats(places).then(setStats)
  }, [places])

  if (!stats) return <p className="astats__loading">통계를 불러오는 중...</p>

  const maxOpens = stats.by_place[0]?.opens ?? 1
  const maxCat = Math.max(1, ...Object.values(stats.by_category))
  const placeName = (id) => places.find((p) => p.id === id)?.name ?? id

  return (
    <div className="astats">
      <div className="astats__metrics">
        <Metric label="가입한 사람" value={stats.users} unit="명" />
        <Metric label="남은 쪽지" value={stats.notes} unit="장" sub={`공식 ${stats.official}장`} />
        <Metric label="책상 열린 횟수" value={stats.opens_total} unit="번" />
        <Metric label="받은 도움됐어요" value={stats.helpful_total} unit="개" />
      </div>

      <section className="card astats__card">
        <h2 className="astats__h2">장소별 열린 횟수</h2>
        <ul className="list-plain">
          {stats.by_place.map((p) => (
            <li key={p.place_id} className="astats__bar-row">
              <span className="astats__bar-label">{p.name}</span>
              <span className="astats__bar" aria-hidden="true">
                <span style={{ width: `${(p.opens / maxOpens) * 100}%` }} />
              </span>
              <span className="astats__bar-value">{p.opens}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card astats__card">
        <h2 className="astats__h2">카테고리 분포</h2>
        <ul className="list-plain">
          {CATEGORY_KEYS.map((key) => {
            const c = CATEGORIES[key]
            const n = stats.by_category[key] ?? 0
            return (
              <li key={key} className="astats__bar-row">
                <span className="astats__bar-label">{c.label}</span>
                <span className="astats__bar" aria-hidden="true">
                  <span style={{ width: `${(n / maxCat) * 100}%`, background: c.icon }} />
                </span>
                <span className="astats__bar-value">{n}</span>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="card astats__card">
        <h2 className="astats__h2">가장 도움이 된 쪽지</h2>
        <ol className="list-plain astats__top">
          {stats.top_notes.map((n, i) => (
            <li key={n.id}>
              <span className="astats__top-no">{i + 1}</span>
              <span className="astats__top-body">
                <span className="astats__top-text">{n.content}</span>
                <span className="astats__top-meta">
                  {placeName(n.place_id)} · {CATEGORIES[n.category]?.label}
                </span>
              </span>
              <span className="astats__top-score">
                <Heart size={14} aria-hidden="true" /> {n.helpful_count}
              </span>
            </li>
          ))}
        </ol>
      </section>
      <p className="astats__note">열린 횟수·가입 수는 실사용 전이라 예시 숫자예요</p>
    </div>
  )
}

function Metric({ label, value, unit, sub }) {
  return (
    <div className="astats__metric">
      <span className="astats__metric-label">{label}</span>
      <span className="astats__metric-value">
        <b>{value}</b>
        {unit}
      </span>
      {sub && <span className="astats__metric-sub">{sub}</span>}
    </div>
  )
}
