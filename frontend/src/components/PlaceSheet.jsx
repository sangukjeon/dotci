import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { CircleCheck, Lock, X } from 'lucide-react'
import { CATEGORIES, CATEGORY_KEYS } from '../categories.js'
import './PlaceSheet.css'

// 지도에서 마커를 누르면 아래에서 올라오는 장소 카드
export default function PlaceSheet({ place, onClose }) {
  const cats = CATEGORY_KEYS.filter((c) => place.category_counts?.[c] > 0)

  return (
    <motion.section
      className="place-sheet"
      role="dialog"
      aria-labelledby="place-sheet-title"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ duration: 0.24, ease: [0.42, 0, 0.58, 1] }}
    >
      <div className="place-sheet__handle" aria-hidden="true" />
      <button className="icon-btn place-sheet__close" onClick={onClose} aria-label="닫기">
        <X size={22} aria-hidden="true" />
      </button>

      <p className="place-sheet__building">{place.building}</p>
      <h2 id="place-sheet-title" className="place-sheet__name">
        {place.name}
      </h2>
      {place.intro && <p className="place-sheet__intro">{place.intro}</p>}

      <div className="place-sheet__tags">
        {place.unlocked ? (
          <span className="tag" style={{ background: 'var(--success-weak)', color: 'var(--success)' }}>
            <CircleCheck size={14} aria-hidden="true" /> 열어 본 장소
          </span>
        ) : place.note_count > 0 ? (
          <span className="tag" style={{ background: 'var(--bg)', color: 'var(--text-2)' }}>
            <Lock size={14} aria-hidden="true" />
            <span>
              쪽지 <b>{place.note_count}</b>개 잠김
            </span>
          </span>
        ) : (
          <span className="tag" style={{ background: 'var(--bg)', color: 'var(--text-2)' }}>
            아직 쪽지가 없어요
          </span>
        )}
        {cats.map((c) => (
          <span key={c} className="tag" style={{ background: CATEGORIES[c].bg, color: CATEGORIES[c].text }}>
            {CATEGORIES[c].label} {place.category_counts[c]}
          </span>
        ))}
      </div>

      <Link to={`/place/${place.id}`} className="btn-main">
        책상 열기
      </Link>
    </motion.section>
  )
}
