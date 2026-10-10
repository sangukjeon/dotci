import { Link } from 'react-router-dom'
import { ChevronRight, CircleCheck } from 'lucide-react'
import './PlaceList.css'

// 지도를 못 쓰거나(키 없음) 목록이 편한 사람을 위한 장소 목록
export default function PlaceList({ places }) {
  return (
    <ul className="place-list">
      {places.map((p) => (
        <li key={p.id}>
          <Link to={`/place/${p.id}`} className="place-list__row pressable">
            <span className="place-list__text">
              <span className="place-list__name">
                {p.name}
                {p.unlocked && <CircleCheck size={16} color="var(--success)" aria-label="열어 본 장소" />}
              </span>
              <span className="place-list__meta">
                {p.building} · 쪽지 <b>{p.note_count}</b>
              </span>
            </span>
            <ChevronRight size={20} color="var(--text-3)" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
