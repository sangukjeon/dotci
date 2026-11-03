import { Navigate, Route, Routes } from 'react-router-dom'
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

export default function App() {
  const { waking, done, cancel } = useServerWake()

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
            <Route path="/subjects" element={<RequireAuth><SubjectsPage /></RequireAuth>} />
            {/* 전시 부스 모니터: 로그인 없이 */}
            <Route path="/display" element={<DisplayPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <WakeOverlay show={waking} done={done} onCancel={cancel} />
        <OfflineNotice />
      </ToastProvider>
    </AuthProvider>
  )
}
