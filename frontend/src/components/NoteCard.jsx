import { motion } from 'motion/react'
import { BadgeCheck, Heart, Lock } from 'lucide-react'
import { CATEGORIES } from '../categories.js'
import './NoteCard.css'

const FLIP_STEP_MS = 120

// 쪽지 카드 한 장. note는 서버가 보낸 모양 그대로.
// - note.locked 이면 잠긴 면: 카테고리 연한 색 + 아이콘 + 뒷면 힌트 (본문은 애초에 없음)
// - 열리면 흰 면으로 뒤집힌다. flipOrder 순서대로 120ms씩 늦게.
// - entering 이면 방금 쓴 쪽지: 아래에서 날아와 붙는다.
export default function NoteCard({ note, isNew = false, flipOrder = 0, entering = false, onClick }) {
  const cat = CATEGORIES[note.category] ?? CATEGORIES.tip
  const open = !note.locked
  const { Icon } = cat

  // 잠긴 면의 제목: 작성자 한마디 > 과목명 > 카테고리 이름
  const lockedTitle = note.hint ? `“${note.hint}”` : note.course_name || cat.label

  const label = open
    ? `${cat.label} 쪽지, ${note.author_grade}학년: ${note.content}`
    : `잠긴 쪽지, ${cat.label}, ${lockedTitle}, ${note.author_grade}학년, 도움 ${note.helpful_count}명`

  return (
    <motion.button
      type="button"
      layoutId={`note-${note.id}`}
      className="ncard"
      aria-label={label}
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      initial={entering ? { y: 320, scale: 1.12, opacity: 0 } : false}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      transition={entering ? { type: 'spring', stiffness: 400, damping: 25 } : { duration: 0.1 }}
    >
      <span
        className={open ? 'ncard__inner ncard__inner--open' : 'ncard__inner'}
        style={{ transitionDelay: `${flipOrder * FLIP_STEP_MS}ms` }}
      >
        {/* 잠긴 면 */}
        <span className="ncard__face ncard__locked" style={{ background: cat.bg }} aria-hidden="true">
          <span className="ncard__icon" style={{ color: cat.icon }}>
            <Icon size={18} strokeWidth={2.2} />
          </span>
          <Lock className="ncard__lock" size={14} />
          <span className="ncard__bottom">
            <span className="ncard__title">{lockedTitle}</span>
            <span className="ncard__meta">
              {note.author_grade}학년 · 도움 <b>{note.helpful_count}</b>
            </span>
          </span>
        </span>

        {/* 열린 면 */}
        <span className="ncard__face ncard__open" aria-hidden="true">
          <span className="ncard__top">
            <span className="ncard__chip" style={{ background: cat.bg, color: cat.text }}>
              {note.course_name ? `${cat.label} · ${note.course_name}` : cat.label}
            </span>
            {note.is_official && <BadgeCheck className="ncard__official" size={16} aria-label="공식" />}
          </span>
          {isNew && <span className="ncard__new">NEW</span>}
          <span className="ncard__text">{open ? note.content : ''}</span>
          <span className="ncard__meta">
            {note.author_grade}학년 ·{' '}
            <Heart size={12} className={note.liked_by_me ? 'ncard__heart ncard__heart--on' : 'ncard__heart'} />{' '}
            <b>{note.helpful_count}</b>
          </span>
        </span>
      </span>
    </motion.button>
  )
}
