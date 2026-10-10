import { BookOpen, Lightbulb, Pencil, TriangleAlert, Utensils } from 'lucide-react'

// 카테고리별 이름·색·아이콘 (DESIGN.md 1장)
const cat = (key, label, Icon) => ({
  label,
  Icon,
  bg: `var(--cat-${key}-bg)`,
  icon: `var(--cat-${key}-icon)`,
  text: `var(--cat-${key}-text)`,
})

export const CATEGORIES = {
  tip: cat('tip', '꿀팁', Lightbulb),
  study: cat('study', '공부', BookOpen),
  food: cat('food', '맛집', Utensils),
  warn: cat('warn', '주의', TriangleAlert),
  class: cat('class', '수업', Pencil),
}

export const CATEGORY_KEYS = Object.keys(CATEGORIES)
