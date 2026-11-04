import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Clock, UtensilsCrossed, WifiOff } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { cafeteriasOf, dateLabel, dateParts, kstDate, kstHour, loadDay, loadWeek } from '../meals.js'
import './MealsPage.css'
import Sentences from '../components/Sentences.jsx'

// 지금 시간에 맞는 끼니 코너 (조식·중식·석식이 있는 식당만)
function nowCorner(corners) {
  const hour = kstHour()
  const want = hour < 10 ? '조식' : hour < 14 ? '중식' : '석식'
  return corners.includes(want) ? want : null
}

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
  const corners = picked ? Object.entries(day[picked]) : []
  const current = date === today ? nowCorner(corners.map(([c]) => c)) : null

  return (
    <main className="page">
      <PageHeader title="오늘의 학식" />

      <section className="page__intro meals__intro">
        <p className="page__h1">오늘 뭐 먹지?</p>
        <p className="page__lead">실제 메뉴와 다를 수 있어요.</p>
        <div className="meals__dates" role="group" aria-label="날짜">
          {dates.map((d) => {
            const { weekday, dayOfMonth } = dateParts(d)
            return (
              <button
                key={d}
                type="button"
                className={d === today ? 'meals__date meals__date--today' : 'meals__date'}
                aria-pressed={d === date}
                aria-label={d === today ? `오늘 ${dateLabel(d)}` : dateLabel(d)}
                onClick={() => select('d', d)}
              >
                <span className="meals__date-week">{d === today ? '오늘' : weekday}</span>
                <span className="meals__date-num">{dayOfMonth}</span>
              </button>
            )
          })}
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
            <div className="meals__tabs" role="tablist" aria-label="식당">
              {names.map((name) => (
                <button
                  key={name}
                  type="button"
                  role="tab"
                  className="meals__tab"
                  aria-selected={name === picked}
                  onClick={() => select('c', name)}
                >
                  {name}
                </button>
              ))}
            </div>
            <ul className="list-plain meals__corners">
              {corners.map(([corner, menu]) => {
                const [main, ...sides] = menu
                const now = corner === current
                return (
                  <li key={corner} className={now ? 'meals__corner meals__corner--now' : 'meals__corner'}>
                    <p className="meals__corner-head">
                      <span className="meals__corner-name">{corner}</span>
                      {now && (
                        <span className="meals__now">
                          <Clock size={12} aria-hidden="true" /> 지금
                        </span>
                      )}
                    </p>
                    <p className="meals__main">{main}</p>
                    {sides.length > 0 && (
                      <ul className="list-plain meals__sides">
                        {sides.map((item, i) => (
                          <li key={`${i}-${item}`}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          </>
        )}
        <p className="meals__source">
          <Sentences>
            출처: 우송대학교 홈페이지 학생식당 안내 (wsu-meal-api로 수집) ·{'\n'}{dateLabel(date)}
          </Sentences>
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
