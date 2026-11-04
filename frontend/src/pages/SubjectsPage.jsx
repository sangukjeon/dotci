import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, CircleCheck, Lock, Search } from 'lucide-react'
import { getPlaces } from '../api.js'
import PageHeader from '../components/PageHeader.jsx'
import * as server from '../server.js'
import './SubjectsPage.css'
import Sentences from '../components/Sentences.jsx'

// 과목별 수강 팁: 과목을 고르면 "팁이 있는 장소"만 보여 준다. 내용은 그 장소에 가야 열린다.
// 별점·교수 평가는 없다 (CLAUDE.md F10).
export default function SubjectsPage() {
  const [subjects, setSubjects] = useState(null)
  const [places, setPlaces] = useState([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    server.listSubjects().then(setSubjects)
    getPlaces().then(setPlaces).catch(() => setPlaces([]))
  }, [])

  const placeOf = (id) => places.find((p) => p.id === id)
  const q = query.trim()
  const filtered = (subjects ?? []).filter((s) => !q || s.course_name.includes(q))
  const current = filtered.find((s) => s.course_name === selected) ?? (q ? filtered[0] : null)

  return (
    <main className="page">
      <PageHeader title="과목별 수강 팁" />
      <section className="page__intro">
        <p className="page__h1">이 과목, 어디에 팁이 있을까요?</p>
        <p className="page__lead"><Sentences>선배들이 남긴 자리·출석·과제 팁이 있는 장소를 알려 줘요.{'\n'}내용은 그 장소에 가야 열려요.</Sentences></p>
        <label className="subj__search">
          <Search size={18} aria-hidden="true" />
          <input
            className="subj__input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelected(null)
            }}
            placeholder="과목명 검색 (예: 자료구조)"
            aria-label="과목명 검색"
          />
        </label>
      </section>

      <section className="page__section">
        <div className="chips" role="group" aria-label="과목">
          {filtered.map((s) => (
            <button
              key={s.course_name}
              type="button"
              className="chip"
              aria-pressed={current?.course_name === s.course_name}
              onClick={() => setSelected(s.course_name)}
            >
              {s.course_name} <span className="subj__count">{s.note_count}</span>
            </button>
          ))}
          {subjects && filtered.length === 0 && <p className="subj__empty"><Sentences>아직 "{q}" 팁이 없어요.{'\n'}첫 팁을 남겨 주세요.</Sentences></p>}
        </div>
      </section>

      {current && (
        <section className="page__section">
          <h2 className="subj__h2">
            <b>{current.course_name}</b> 팁이 있는 곳
          </h2>
          <ul className="list-plain subj__places">
            {current.places.map((cp) => {
              const p = placeOf(cp.place_id)
              return (
                <li key={cp.place_id}>
                  <Link to={`/place/${cp.place_id}`} className="subj__place pressable">
                    {cp.unlocked ? (
                      <CircleCheck size={20} color="var(--success)" aria-label="열어 본 장소" />
                    ) : (
                      <Lock size={20} color="var(--text-3)" aria-label="잠긴 장소" />
                    )}
                    <span className="subj__place-body">
                      <span className="subj__place-name">{p?.name ?? cp.place_id}</span>
                      <span className="subj__place-meta">
                        {p?.building} · 수업 팁 <b>{cp.count}</b>장
                      </span>
                    </span>
                    <ChevronRight size={20} color="var(--text-3)" aria-hidden="true" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}
      {!current && subjects && filtered.length > 0 && <p className="subj__pick">과목을 골라 주세요</p>}
    </main>
  )
}
