import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import './WakeOverlay.css'


// 기다리는 동안 4초마다 바뀌는 한 줄
const STEPS = [
  '걸레에 물 묻히는 중…',
  '선배가 남긴 지우개 가루 털어내는 중…',
  '책상 위 커피 자국 박박 문지르는 중…',
  '삐뚤어진 의자 줄 맞추는 중…',
  '자고 있던 쪽지들 깨우는 중…',
  '마지막으로 한 번 더 광내는 중…',
]
const STEP_MS = 4000
// 게이지: 실제 남은 시간은 알 수 없으니 처음엔 빠르게, 갈수록 천천히 95%까지만 오른다
const GAUGE_SPEED_S = 18

// 서버가 깨어나는 동안 덮는 화면: 걸레가 책상을 쓱쓱 닦는다
export default function WakeOverlay({ show, done }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="wake"
          role="alert"
          aria-busy={!done}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="wake__desk" aria-hidden="true">
            <span className="wake__cloth" />
            <span className="wake__shine" />
          </div>
          <Progress done={done} />
          {!done && (
            <Link className="text-btn wake__demo" to="/example">
              기다리는 동안 예시 책상 열어 보기
            </Link>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Progress({ done }) {
  const [sec, setSec] = useState(0)
  useEffect(() => {
    if (done) return
    const id = setInterval(() => setSec((s) => s + 0.25), 250)
    return () => clearInterval(id)
  }, [done])

  const percent = done ? 100 : Math.floor(95 * (1 - Math.exp(-sec / GAUGE_SPEED_S)))
  const step = STEPS[Math.min(Math.floor((sec * 1000) / STEP_MS), STEPS.length - 1)]

  return (
    <>
      <p className="wake__title">{done ? '반짝반짝, 책상 준비 끝!' : '선배 책상 청소 중이에요'}</p>
      <p className="wake__body">
        {done ? '쪽지들이 기다리고 있어요.' : `잠든 서버를 깨우고 있어요. ${step}`}
      </p>
      <div
        className="wake__gauge"
        role="progressbar"
        aria-label="서버 깨우기 진행률"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span className={done ? 'wake__bar wake__bar--done' : 'wake__bar'} style={{ width: `${percent}%` }} />
      </div>
      <p className="wake__percent">{percent}%</p>
    </>
  )
}
