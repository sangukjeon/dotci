import { PenLine } from 'lucide-react'
import NoteCard from './NoteCard.jsx'
import './Desk.css'

const MAX_ON_DESK = 12

// 장소 책상: 쪽지 카드 2열. 도움됐어요 많은 순으로 최대 12장.
export default function Desk({ notes, contents, newIds = [] }) {
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

  const shown = [...notes].sort((a, b) => b.helpful_count - a.helpful_count).slice(0, MAX_ON_DESK)

  return (
    <div className="desk">
      {shown.map((n, i) => (
        <NoteCard key={n.id} note={n} content={contents[n.id]} isNew={newIds.includes(n.id)} flipOrder={i} />
      ))}
      {notes.length > MAX_ON_DESK && (
        <p className="desk__more">쪽지 {notes.length - MAX_ON_DESK}장 더 있어요</p>
      )}
    </div>
  )
}
