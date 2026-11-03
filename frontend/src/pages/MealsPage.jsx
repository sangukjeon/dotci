import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { UtensilsCrossed, WifiOff } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { cafeteriasOf, dateLabel, kstDate, loadDay, loadWeek } from '../meals.js'
import './MealsPage.css'

// 오늘의 학식: 날짜 → 식당 → 코너별 메뉴
export default function MealsPage() {
  const [params, setParams] = useSearchParams()
  const today = kstDate()
  const date = params.get('d') || today
  const [dates, setDates] = useState([today])
  const [day, setDay] = useState(undefined) // undefined: 불러오는 중, null: 정보 없음
  const [error, setError] = useState(false)

  useEffect(() => {
    loadWeek()
      .then((list) => setDates(list.includes(today) || list.length === 0 ? list : [...list, today].sort()))
      .catch(() => {})
  }, [today])

  useEffect(() => {
    let alive = true
    setDay(undefined)
    setError(false)
    loadDay(date)
      .then((d) => alive && setDay(d))
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [date])

  const names = cafeteriasOf(day)
  const picked = names.includes(params.get('c')) ? params.get('c') : names[0]
  const select = (key, value) => {
    const next = new URLSearchParams(params)
    next.set(key, value)
    if (key === 'd') next.delete('c')
    setParams(next, { replace: true })
  }

  return (
    <main className="page">
      <PageHeader title="오늘의 학식" />

      <section className="page__intro">
        <p className="page__h1">오늘 뭐 먹지?</p>
        <div className="chips meals__dates" role="group" aria-label="날짜">
          {dates.map((d) => (
            <button key={d} type="button" className="chip" aria-pressed={d === date} onClick={() => select('d', d)}>
              {d === today ? '오늘' : dateLabel(d)}
            </button>
          ))}
        </div>
      </section>

      <section className="page__section">
        {error ? (
          <Empty icon={WifiOff} title="식단을 불러오지 못했어요" body="인터넷 연결을 확인하고 잠시 뒤에 다시 열어 주세요." />
        ) : day === undefined ? (
          <div className="meals__skeleton" aria-busy="true" aria-label="식단을 불러오는 중" />
        ) : names.length === 0 ? (
          <Empty icon={UtensilsCrossed} title="이날은 식단 정보가 없어요" body="주말·공휴일이거나 아직 식단이 올라오지 않았어요." />
        ) : (
          <>
            <div className="chips" role="group" aria-label="식당">
              {names.map((name) => (
                <button key={name} type="button" className="chip" aria-pressed={name === picked} onClick={() => select('c', name)}>
                  {name}
                </button>
              ))}
            </div>
            <ul className="list-plain meals__corners">
              {Object.entries(day[picked]).map(([corner, menu]) => (
                <li key={corner} className="card meals__corner">
                  <h2 className="meals__corner-name">{corner}</h2>
                  <p className="meals__menu">{menu.join(' · ')}</p>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="meals__source">
          출처: 우송대학교 홈페이지 학생식당 안내 (wsu-meal-api로 수집) · {dateLabel(date)}
        </p>
      </section>
    </main>
  )
}

function Empty({ icon: Icon, title, body }) {
  return (
    <div className="meals__empty">
      <Icon size={24} aria-hidden="true" />
      <p className="meals__empty-title">{title}</p>
      <p className="meals__empty-body">{body}</p>
    </div>
  )
}
