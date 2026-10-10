import { Route, Routes } from 'react-router-dom'
import MapPage from './pages/MapPage.jsx'
import DeskPage from './pages/DeskPage.jsx'

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/place/:id" element={<DeskPage />} />
      </Routes>
    </div>
  )
}
