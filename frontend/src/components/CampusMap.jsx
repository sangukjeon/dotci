import Pin from './Pin.jsx'
import './CampusMap.css'

// 책상 위에 비스듬히 펼친 캠퍼스 지도.
// 지도 일러스트가 준비되면 public/campus-map.png 에 넣고 MAP_IMAGE를 바꾼다.
const MAP_IMAGE = null // 예: '/campus-map.png'

export default function CampusMap({ places, loading }) {
  return (
    <div className="campus-map" aria-busy={loading}>
      <div className="campus-map__paper">
        {MAP_IMAGE ? (
          <img className="campus-map__img" src={MAP_IMAGE} alt="" />
        ) : (
          <PlaceholderDrawing />
        )}
        {places.map((p) => (
          <Pin key={p.id} place={p} />
        ))}
      </div>
    </div>
  )
}

// 지도 이미지가 없을 때 쓰는 임시 그림 (건물 블록과 길)
function PlaceholderDrawing() {
  return (
    <svg className="campus-map__img" viewBox="0 0 100 133" preserveAspectRatio="none" aria-hidden="true">
      <rect x="0" y="0" width="100" height="133" fill="#F4EDDC" />
      <path d="M50 133 V70 H8 M50 70 H92 M50 70 V20 H20 M50 20 H85" stroke="#E6DAC0" strokeWidth="5" fill="none" />
      <g fill="#E2D5B8">
        <rect x="22" y="22" width="18" height="14" rx="1" />
        <rect x="56" y="62" width="16" height="14" rx="1" />
        <rect x="12" y="76" width="16" height="12" rx="1" />
        <rect x="64" y="56" width="14" height="10" rx="1" />
        <rect x="72" y="32" width="14" height="12" rx="1" />
        <rect x="70" y="8" width="16" height="12" rx="1" />
        <rect x="5" y="44" width="14" height="14" rx="1" />
        <rect x="8" y="100" width="16" height="14" rx="1" />
      </g>
    </svg>
  )
}
