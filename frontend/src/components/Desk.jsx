import StickyNote from './StickyNote.jsx'
import './Desk.css'

const MAX_ON_DESK = 12

// 장소 책상: 3열 × 4행 칸 위에 포스트잇을 올린다. 위치·기울기는 서버가 정한 값을 그대로 쓴다.
export default function Desk({ notes, contents }) {
  if (notes.length === 0) {
    return (
      <div className="desk">
        <div className="desk__empty">첫 흔적의 주인공이 되어 보세요</div>
      </div>
    )
  }

  // 12개가 넘으면 도움됐어요 순으로 12개만 (나머지는 "서랍 열기" — 10/14)
  const shown = [...notes].sort((a, b) => b.helpful_count - a.helpful_count).slice(0, MAX_ON_DESK)
  // 뒤집히는 순서: 위에서 아래, 왼쪽에서 오른쪽
  const order = [...shown].sort((a, b) => a.pos_y - b.pos_y || a.pos_x - b.pos_x).map((n) => n.id)

  return (
    <div className="desk">
      {shown.map((n) => (
        <StickyNote key={n.id} note={n} content={contents[n.id]} flipOrder={order.indexOf(n.id)} />
      ))}
    </div>
  )
}
