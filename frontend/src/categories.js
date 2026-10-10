import { BookOpen, Lightbulb, Pencil, TriangleAlert, Utensils } from 'lucide-react'

// 카테고리별 이름·색·아이콘 (DESIGN.md 1장, CLAUDE.md 7장)
export const CATEGORIES = {
  tip: { label: '꿀팁', front: 'var(--note-tip)', back: 'var(--note-tip-back)', Icon: Lightbulb },
  study: { label: '공부', front: 'var(--note-study)', back: 'var(--note-study-back)', Icon: BookOpen },
  food: { label: '맛집', front: 'var(--note-food)', back: 'var(--note-food-back)', Icon: Utensils },
  warn: { label: '주의', front: 'var(--note-warn)', back: 'var(--note-warn-back)', Icon: TriangleAlert },
  class: { label: '수업', front: 'var(--note-class)', back: 'var(--note-class-back)', Icon: Pencil },
}

export const CATEGORY_KEYS = Object.keys(CATEGORIES)
