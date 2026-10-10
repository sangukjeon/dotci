import { motion } from 'motion/react'
import { X } from 'lucide-react'
import './Sheet.css'

// 뒤를 어둡게 덮고 아래에서 올라오는 시트. <AnimatePresence> 안에서 쓴다.
export default function Sheet({ title, onClose, children, labelId = 'sheet-title' }) {
  return (
    <>
      <motion.div
        className="sheet-dim"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />
      <motion.section
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.24, ease: [0.42, 0, 0.58, 1] }}
      >
        <div className="sheet__handle" aria-hidden="true" />
        <header className="sheet__head">
          <h2 id={labelId} className="sheet__title">
            {title}
          </h2>
          <button className="icon-btn" onClick={onClose} aria-label="닫기">
            <X size={22} aria-hidden="true" />
          </button>
        </header>
        <div className="sheet__body">{children}</div>
      </motion.section>
    </>
  )
}
