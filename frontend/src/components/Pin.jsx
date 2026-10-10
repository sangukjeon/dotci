import { Link } from 'react-router-dom'
import { CircleCheck, MapPin } from 'lucide-react'
import { CATEGORIES, CATEGORY_KEYS } from '../categories.js'
import './Pin.css'

// 지도 위 압정 핀: 장소 이름 + 쪽지 개수 + 카테고리 색 점. 내용은 보여 주지 않는다.
export default function Pin({ place }) {
  const dots = CATEGORY_KEYS.filter((c) => place.category_counts?.[c] > 0)
  const Icon = place.unlocked ? CircleCheck : MapPin
  const label = `${place.name}, 쪽지 ${place.note_count}개${place.unlocked ? ', 열어 본 장소' : ''}`

  return (
    <Link
      to={`/place/${place.id}`}
      className="pin pressable"
      style={{ left: `${place.map_x}%`, top: `${place.map_y}%` }}
      aria-label={label}
    >
      <Icon className={place.unlocked ? 'pin__icon pin__icon--ok' : 'pin__icon'} size={24} aria-hidden="true" />
      <span className="pin__tag" aria-hidden="true">
        {place.name} <b>{place.note_count}</b>
      </span>
      {dots.length > 0 && (
        <span className="pin__dots" aria-hidden="true">
          {dots.map((c) => (
            <span key={c} style={{ background: CATEGORIES[c].front }} />
          ))}
        </span>
      )}
    </Link>
  )
}
