import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

// 하위 화면 공통 상단 바: 뒤로 가기 + 제목
export default function PageHeader({ title, back = '/' }) {
  return (
    <header className="top-bar">
      <Link to={back} className="icon-btn pressable" aria-label="뒤로 가기">
        <ChevronLeft size={26} aria-hidden="true" />
      </Link>
      <h1 className="page-title">{title}</h1>
    </header>
  )
}
