import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { UtensilsCrossed } from 'lucide-react'
import { kstDate, loadDay } from '../meals.js'
import '../pages/MealsPage.css'

const MAX_ROWS = 3

// 식당이 있는 장소 카드 안에 오늘 메뉴를 짧게 (코너마다 한 줄)
export default function MealPeek({ cafeteria }) {
  const [menu, setMenu] = useState(null)

  useEffect(() => {
    let alive = true
    loadDay(kstDate())
      .then((day) => alive && setMenu(day?.[cafeteria] ?? null))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [cafeteria])

  if (!menu) return null // 식단이 없거나 못 불러오면 조용히 안 보여 준다
  const rows = Object.entries(menu).slice(0, MAX_ROWS)

  return (
    <Link to={`/meals?c=${encodeURIComponent(cafeteria)}`} className="meal-peek pressable">
      <span className="meal-peek__head">
        <UtensilsCrossed size={14} aria-hidden="true" /> 오늘의 학식
        <span className="meal-peek__more">전체 보기</span>
      </span>
      {rows.map(([corner, items]) => (
        <span key={corner} className="meal-peek__row">
          <b>{corner}</b>
          {items.join(', ')}
        </span>
      ))}
    </Link>
  )
}
