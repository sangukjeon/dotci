import { useEffect, useState } from 'react'
import { Heart, Trophy } from 'lucide-react'
import { useAuth } from '../auth.jsx'
import PageHeader from '../components/PageHeader.jsx'
import * as server from '../server.js'
import './RankingPage.css'

// 학과 대항전: 학과별로 "받은 도움됐어요" 합계. 쪽지 개수가 아니라서 의미 없는 쪽지 남발을 막는다.
export default function RankingPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState(null)

  useEffect(() => {
    server.departmentRanking().then(setRows)
  }, [])

  const top = rows?.[0]?.score ?? 1
  const mine = rows?.findIndex((r) => r.department === user?.department) ?? -1

  return (
    <main className="page">
      <PageHeader title="학과 대항전" />

      <section className="page__intro">
        <p className="page__h1">어느 학과가 가장 도움을 줬을까요?</p>
        <p className="page__lead">학과 사람들이 남긴 쪽지가 받은 도움됐어요를 모두 더해요.{'\n'}쪽지 수가 아니라 도움이 된 만큼 올라가요.</p>
        {mine >= 0 && (
          <p className="rank__mine">
            우리 학과 <b>{user.department}</b>는 지금 <b>{mine + 1}위</b>예요
          </p>
        )}
      </section>

      <ol className="rank list-plain page__section">
        {(rows ?? []).map((r, i) => (
          <li key={r.department} className={r.department === user?.department ? 'rank__row rank__row--mine' : 'rank__row'}>
            <span className={`rank__place rank__place--${i + 1}`}>
              {i < 3 ? <Trophy size={18} aria-hidden="true" /> : null}
              <span>{i + 1}</span>
            </span>
            <span className="rank__body">
              <span className="rank__name">{r.department}</span>
              <span className="rank__bar" aria-hidden="true">
                <span style={{ width: `${(r.score / top) * 100}%` }} />
              </span>
              <span className="rank__meta">쪽지 남긴 사람 {r.writers}명</span>
            </span>
            <span className="rank__score" aria-label={`도움됐어요 ${r.score}개`}>
              <Heart size={14} aria-hidden="true" /> {r.score}
            </span>
          </li>
        ))}
      </ol>
      <p className="rank__note">점수는 매일 새벽에 다시 계산해요 · 전시 부스 화면에도 나와요</p>
    </main>
  )
}
