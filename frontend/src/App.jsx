import { Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, RequireAuth } from './auth.jsx'
import { OfflineNotice, ToastProvider } from './toast.jsx'
import { useServerWake } from './hooks/useServerWake.js'
import WakeOverlay from './components/WakeOverlay.jsx'
import AuthPage from './pages/AuthPage.jsx'
import MapPage from './pages/MapPage.jsx'
import DeskPage from './pages/DeskPage.jsx'
import ScanPage from './pages/ScanPage.jsx'
import CollectionPage from './pages/CollectionPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import RankingPage from './pages/RankingPage.jsx'
import { CourseDetailPage, CoursesPage } from './pages/CoursesPage.jsx'
import SubjectsPage from './pages/SubjectsPage.jsx'
import DisplayPage from './pages/DisplayPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import ExampleDeskPage from './pages/ExampleDeskPage.jsx'
import MealsPage from './pages/MealsPage.jsx'

const EXAMPLE_PATH = '/example'

export default function App() {
  const { waking, done } = useServerWake()
  // 예시 책상을 보는 동안에는 깨우기 화면으로 덮지 않는다 (깨우기는 뒤에서 계속)
  const onExample = useLocation().pathname === EXAMPLE_PATH

  return (
    <AuthProvider>
      <ToastProvider>
        <div className="app">
          <Routes>
            <Route path="/login" element={<AuthPage />} />
            <Route path="/" element={<RequireAuth><MapPage /></RequireAuth>} />
            <Route path="/place/:id" element={<RequireAuth><DeskPage /></RequireAuth>} />
            <Route path="/scan" element={<RequireAuth><ScanPage /></RequireAuth>} />
            <Route path="/me" element={<RequireAuth><CollectionPage /></RequireAuth>} />
            <Route path="/admin" element={<RequireAuth admin><AdminPage /></RequireAuth>} />
            <Route path="/ranking" element={<RequireAuth><RankingPage /></RequireAuth>} />
            <Route path="/courses" element={<RequireAuth><CoursesPage /></RequireAuth>} />
            <Route path="/courses/:id" element={<RequireAuth><CourseDetailPage /></RequireAuth>} />
            <Route path="/meals" element={<RequireAuth><MealsPage /></RequireAuth>} />
            <Route path="/subjects" element={<RequireAuth><SubjectsPage /></RequireAuth>} />
            {/* 전시 부스 모니터: 로그인 없이 */}
            <Route path="/display" element={<DisplayPage />} />
            {/* 서버 깨우는 동안 둘러보는 예시 책상: 로그인·서버 없이 */}
            <Route path={EXAMPLE_PATH} element={<ExampleDeskPage waking={waking} />} />
            {/* 없는 주소: 404 화면 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
        <WakeOverlay show={waking && !onExample} done={done} />
        <OfflineNotice />
      </ToastProvider>
    </AuthProvider>
  )
}
