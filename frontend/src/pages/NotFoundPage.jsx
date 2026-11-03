import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { MapPinOff } from 'lucide-react'
import './NotFoundPage.css'

// 없는 주소로 들어왔을 때 (로그인 없이도 보인다)
export default function NotFoundPage() {
  return (
    <main className="notfound">
      <motion.div
        className="notfound__desk"
        aria-hidden="true"
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <MapPinOff size={36} />
        <span className="notfound__dust" />
      </motion.div>
      <p className="notfound__code">404</p>
      <h1 className="notfound__title">여긴 아직 아무도 다녀가지 않았어요</h1>
      <p className="notfound__body">
        주소가 잘못됐거나 사라진 페이지예요.
        <br />
        선배들의 쪽지는 지도 위 장소에서 기다리고 있어요.
      </p>
      <Link to="/" className="btn-main notfound__btn">
        지도로 돌아가기
      </Link>
    </main>
  )
}
