import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import './WakeOverlay.css'

// 서버 없이 도는 체험판 (기다리기 싫은 사람용)
const DEMO_URL = 'https://sangukjeon.github.io/dotci/'

// 서버가 깨어나는 동안 덮는 화면: 걸레가 책상을 쓱쓱 닦는다
export default function WakeOverlay({ show, onCancel }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="wake"
          role="alert"
          aria-busy="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="wake__desk" aria-hidden="true">
            <span className="wake__cloth" />
            <span className="wake__shine" />
          </div>
          <p className="wake__title">책상을 닦는 중이에요</p>
          <p className="wake__body">잠들어 있던 서버를 깨우고 있어요. 길면 1분쯤 걸려요.</p>
          <Elapsed />
          <div className="wake__actions">
            <button type="button" className="text-btn" onClick={onCancel}>
              기다리지 않고 닫기
            </button>
            <a className="text-btn wake__demo" href={DEMO_URL}>
              체험판 둘러보기
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// 화면이 뜬 뒤 몇 초 지났는지 (기다리는 사람이 멈춘 게 아님을 알 수 있게)
function Elapsed() {
  const [sec, setSec] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setSec((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])
  return <p className="wake__elapsed">{sec}초째 기다리는 중</p>
}
