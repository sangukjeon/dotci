import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CircleCheck } from 'lucide-react'
import './PlaceList.css'

const PAGE_SIZE = 7

// 지도를 못 쓰거나(키 없음) 목록이 편한 사람을 위한 장소 목록. 길게 내리지 않고 7곳씩 페이지로 넘긴다.
export default function PlaceList({ places }) {
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(places.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1) // 장소 수가 줄어도 빈 페이지가 안 되게
  const shown = places.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)

  return (
    <>
      <ul className="place-list">
        {shown.map((p) => (
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

      {pages > 1 && (
        <nav className="pager" aria-label="장소 목록 페이지">
          <button
            type="button"
            className="pager__arrow pressable"
            onClick={() => setPage(current - 1)}
            disabled={current === 0}
            aria-label="이전 페이지"
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              className="pager__num pressable"
              aria-current={i === current ? 'page' : undefined}
              aria-label={`${i + 1}페이지`}
              onClick={() => setPage(i)}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            className="pager__arrow pressable"
            onClick={() => setPage(current + 1)}
            disabled={current === pages - 1}
            aria-label="다음 페이지"
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </nav>
      )}
    </>
  )
}
