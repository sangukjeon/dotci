import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Heart, QrCode, Users } from 'lucide-react'
import { CATEGORIES } from '../categories.js'
import * as server from '../mock/server.js' // TODO(11/5): GET /api/display/booth (몇 초마다 새로 고침)
import './DisplayPage.css'

const ADD_EVERY_MS = 6000
const MAX_CARDS = 12

// 전시 부스 모니터용 큰 화면 (로그인 없이 열림). 가로 화면 기준.
export default function DisplayPage() {
  const [notes, setNotes] = useState([])
  const [ranking, setRanking] = useState([])
  const [joined, setJoined] = useState(37)

  useEffect(() => {
    server.displayFeed().then((list) => setNotes([...list].reverse()))
    server.departmentRanking().then(setRanking)
    // 목업: 관람객이 쪽지를 남기는 것처럼 몇 초마다 하나씩 붙인다
    const t = setInterval(() => {
      const note = server.addVisitorNote()
      setNotes((list) => [note, ...list].slice(0, MAX_CARDS))
      setJoined((n) => n + 1)
    }, ADD_EVERY_MS)
    return () => clearInterval(t)
  }, [])

  const top = ranking[0]?.score ?? 1

  return (
    <main className="display">
      <header className="display__head">
        <div>
          <p className="display__logo">
            DOTCI<span className="brand-dot" aria-hidden="true" />
          </p>
          <p className="display__slogan">점 하나, 이야기 하나.</p>
        </div>
        <p className="display__line">지금 이 방에도 책상이 있어요</p>
        <p className="display__joined">
          <Users size={22} aria-hidden="true" /> 오늘 <b>{joined}</b>명 참여
        </p>
      </header>

      <div className="display__body">
        <section className="display__desk" aria-label="전시 부스 방명록">
          <AnimatePresence initial={false}>
            {notes.map((n) => {
              const c = CATEGORIES[n.category] ?? CATEGORIES.tip
              return (
                <motion.article
                  key={n.id}
                  layout
                  className="display__note"
                  initial={{ y: 120, scale: 1.15, opacity: 0 }}
                  animate={{ y: 0, scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <span className="ncard__chip" style={{ background: c.bg, color: c.text }}>
                    {c.label}
                  </span>
                  <p className="display__text">{n.content}</p>
                  <p className="display__author">{n.author_nickname}</p>
                </motion.article>
              )
            })}
          </AnimatePresence>
        </section>

        <aside className="display__side">
          <div className="display__qr">
            <div className="display__qr-box" aria-label="부스 QR 코드 자리">
              <QrCode size={96} strokeWidth={1.4} aria-hidden="true" />
            </div>
            <ol className="display__steps">
              <li>폰 카메라로 QR을 찍어요</li>
              <li>책상이 열리면 선배들의 쪽지를 읽어요</li>
              <li>한 줄 방명록을 남기면 이 화면에 붙어요</li>
            </ol>
          </div>

          <div className="display__rank">
            <p className="display__rank-title">학과 대항전</p>
            <ol className="list-plain">
              {ranking.slice(0, 5).map((r, i) => (
                <li key={r.department} className="display__rank-row">
                  <span className="display__rank-no">{i + 1}</span>
                  <span className="display__rank-name">{r.department}</span>
                  <span className="display__rank-bar" aria-hidden="true">
                    <span style={{ width: `${(r.score / top) * 100}%` }} />
                  </span>
                  <span className="display__rank-score">
                    <Heart size={16} aria-hidden="true" /> {r.score}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </main>
  )
}
