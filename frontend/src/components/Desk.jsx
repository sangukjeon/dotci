import { useState } from 'react'
import { ChevronDown, ChevronUp, PenLine } from 'lucide-react'
import NoteCard from './NoteCard.jsx'
import './Desk.css'

const MAX_ON_DESK = 12

// 장소 책상: 쪽지 카드 2열. 도움됐어요 많은 순 → 최신순으로 처음엔 12장까지, 나머지는 "더 보기"로 펼친다.
export default function Desk({ notes, newIds = [], enteringId = null, onOpen }) {
  const [expanded, setExpanded] = useState(false)

  if (notes.length === 0) {
    return (
      <div className="desk-empty">
        <span className="desk-empty__icon">
          <PenLine size={24} aria-hidden="true" />
        </span>
        <p className="desk-empty__title">아직 남겨진 흔적이 없어요</p>
        <p className="desk-empty__body">첫 흔적의 주인공이 되어 보세요</p>
      </div>
    )
  }

  const sorted = [...notes].sort(
    (a, b) => b.helpful_count - a.helpful_count || b.created_at.localeCompare(a.created_at),
  )
  // 방금 쓴 쪽지는 접혀 있어도 보이게 맨 앞에
  if (enteringId) sorted.sort((a, b) => (b.id === enteringId) - (a.id === enteringId))
  const hidden = sorted.length - MAX_ON_DESK
  const shown = expanded ? sorted : sorted.slice(0, MAX_ON_DESK)

  return (
    <div className="desk">
      {shown.map((n, i) => (
        <NoteCard
          key={n.id}
          note={n}
          isNew={newIds.includes(n.id)}
          flipOrder={i}
          entering={n.id === enteringId}
          onClick={() => onOpen?.(n)}
        />
      ))}
      {hidden > 0 && (
        <button className="desk__more pressable" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
          {expanded ? (
            <>
              접기 <ChevronUp size={18} aria-hidden="true" />
            </>
          ) : (
            <>
              쪽지 <b>{hidden}</b>장 더 보기 <ChevronDown size={18} aria-hidden="true" />
            </>
          )}
        </button>
      )}
    </div>
  )
}

// 불러오는 동안 보여 주는 회색 카드 자리
export function DeskSkeleton() {
  return (
    <div className="desk" aria-busy="true" aria-label="쪽지를 불러오는 중">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="desk__skeleton" aria-hidden="true" />
      ))}
    </div>
  )
}
