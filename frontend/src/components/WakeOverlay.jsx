import { AnimatePresence, motion } from 'motion/react'
import './WakeOverlay.css'

// 서버가 깨어나는 동안 덮는 화면: 걸레가 책상을 쓱쓱 닦는다
export default function WakeOverlay({ show }) {
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
          <p className="wake__body">잠들어 있던 서버를 깨우고 있어요. 길면 30초쯤 걸려요.</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
