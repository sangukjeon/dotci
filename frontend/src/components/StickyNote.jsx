import { CATEGORIES } from '../categories.js'
import './StickyNote.css'

const FLIP_STEP_MS = 150

// 포스트잇 한 장.
// - content가 없으면(서버가 안 보냄) 뒷면: 색 + 아이콘 + 뒷면 힌트
// - content가 있으면 앞면으로 뒤집힌다. flipOrder 순서대로 150ms씩 늦게 뒤집혀 "하나씩 휙휙".
export default function StickyNote({ note, content, flipOrder = 0 }) {
  const cat = CATEGORIES[note.category] ?? CATEGORIES.tip
  const open = typeof content === 'string'
  const { Icon } = cat

  const backLines = [
    note.hint && `“${note.hint}”`,
    note.course_name,
    note.author_grade && `${note.author_grade}학년`,
  ].filter(Boolean)

  const label = open
    ? `${cat.label} 쪽지: ${content}`
    : `잠긴 쪽지, ${cat.label}, ${backLines.join(', ')}, 도움받은 사람 ${note.helpful_count}명`

  return (
    <button
      type="button"
      className="note pressable"
      style={{ left: `${note.pos_x}%`, top: `${note.pos_y}%`, '--rot': `${note.rotation}deg` }}
      aria-label={label}
    >
      <span
        className={open ? 'note__card note__card--open' : 'note__card'}
        style={{ transitionDelay: `${flipOrder * FLIP_STEP_MS}ms` }}
      >
        <span className="note__face note__back" style={{ background: cat.back }} aria-hidden="true">
          <Icon size={22} strokeWidth={2} />
          {backLines.map((line) => (
            <span key={line} className="note__hint">
              {line}
            </span>
          ))}
          {note.helpful_count > 0 && (
            <span className="note__hint">
              도움 <b>{note.helpful_count}</b>
            </span>
          )}
        </span>
        <span className="note__face note__front" style={{ background: cat.front }} aria-hidden="true">
          {/* 책상 위에서는 4줄까지만, 전체는 확대 화면(10/14)에서 */}
          <span className="note__text">{open ? content : ''}</span>
        </span>
      </span>
    </button>
  )
}
