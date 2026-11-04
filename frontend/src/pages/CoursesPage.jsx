import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check, ChevronRight, Lock, MapPin, Route } from 'lucide-react'
import { getPlaces } from '../api.js'
import PageHeader from '../components/PageHeader.jsx'
import * as server from '../server.js'
import './CoursesPage.css'

// 멘토링 코스 목록: 학생회·멘토가 만든 "정해진 순서대로 도는 장소 묶음"
export function CoursesPage() {
  const [courses, setCourses] = useState(null)

  useEffect(() => {
    server.listCourses().then(setCourses)
  }, [])

  return (
    <main className="page">
      <PageHeader title="멘토링 코스" />
      <section className="page__intro">
        <p className="page__h1">선배가 짜 준 캠퍼스 코스</p>
        <p className="page__lead">순서대로 장소를 열면 다음 장소의 힌트가 열려요.</p>
      </section>

      <ul className="list-plain page__section course-list">
        {(courses ?? []).map((c) => (
          <li key={c.id}>
            <Link to={`/courses/${c.id}`} className="course-card pressable">
              <span className="course-card__icon">
                <Route size={22} aria-hidden="true" />
              </span>
              <span className="course-card__body">
                <span className="course-card__title">{c.title}</span>
                <span className="course-card__meta">
                  {c.summary}
                  {'\n'}<span className="course-card__by">{c.by}</span>
                </span>
                <span className="course-card__bar" aria-label={`${c.total}곳 중 ${c.done}곳 열었어요`}>
                  <span style={{ width: `${(c.done / c.total) * 100}%` }} />
                </span>
              </span>
              <span className="course-card__count">
                <b>{c.done}</b>/{c.total}
              </span>
              <ChevronRight size={20} color="var(--text-3)" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}

// 코스 상세: 단계별 진행. 앞 단계를 열어야 다음 단계 힌트가 보인다.
export function CourseDetailPage() {
  const { id } = useParams()
  const [course, setCourse] = useState(null)
  const [places, setPlaces] = useState([])

  useEffect(() => {
    server.getCourse(id).then(setCourse, () => setCourse(false))
    getPlaces().then(setPlaces).catch(() => setPlaces([]))
  }, [id])

  const placeOf = (pid) => places.find((p) => p.id === pid)

  if (course === false)
    return (
      <main className="page">
        <PageHeader title="멘토링 코스" back="/courses" />
        <p className="page__section">찾을 수 없는 코스예요.</p>
      </main>
    )

  return (
    <main className="page">
      <PageHeader title="멘토링 코스" back="/courses" />
      {course && (
        <>
          <section className="page__intro">
            <p className="page__h1">{course.title}</p>
            <p className="page__lead">
              {course.by} · {course.total}곳 중 <b>{course.done}</b>곳 열었어요
            </p>
            {course.done === course.total && <p className="course__done">코스를 모두 마쳤어요.{'\n'}이제 다음 후배를 위한 흔적을 남겨 주세요.</p>}
          </section>

          <ol className="list-plain page__section steps">
            {course.steps.map((s, i) => {
              const p = placeOf(s.place_id)
              const state = s.done ? 'done' : s.current ? 'current' : 'locked'
              return (
                <li key={s.place_id} className={`step step--${state}`}>
                  <span className="step__dot" aria-hidden="true">
                    {s.done ? <Check size={16} strokeWidth={3} /> : state === 'locked' ? <Lock size={14} /> : i + 1}
                  </span>
                  <div className="step__body">
                    <p className="step__title">
                      {i + 1}. {state === 'locked' ? '아직 비밀이에요' : (p?.name ?? s.place_id)}
                    </p>
                    <p className="step__hint">{s.hint ?? '앞 단계를 열면 어디인지 보여요'}</p>
                    {state === 'current' && p && (
                      <Link to={`/place/${p.id}`} className="btn-sub step__go">
                        <MapPin size={18} aria-hidden="true" /> 이 장소로 가기
                      </Link>
                    )}
                    {state === 'done' && <p className="step__status">열었어요</p>}
                  </div>
                </li>
              )
            })}
          </ol>
        </>
      )}
    </main>
  )
}
