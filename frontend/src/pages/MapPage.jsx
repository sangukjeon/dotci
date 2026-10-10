import { useEffect, useState } from 'react'
import { QrCode, Stamp } from 'lucide-react'
import { getPlaces } from '../api.js'
import CampusMap from '../components/CampusMap.jsx'
import './MapPage.css'

export default function MapPage() {
  const [places, setPlaces] = useState(null)
  const [error, setError] = useState(false)

  const load = () =>
    getPlaces()
      .then(setPlaces)
      .catch(() => setError(true))

  useEffect(() => {
    load()
  }, [])

  const retry = () => {
    setError(false)
    load()
  }

  return (
    <main className="screen map-page">
      <h1 className="map-title">선배의 흔적</h1>

      {error ? (
        <div className="map-error">
          <p>책상을 정리 중이에요. 잠시 후 다시 시도해 주세요.</p>
          <button className="btn-sub pressable" onClick={retry}>
            다시 시도
          </button>
        </div>
      ) : (
        <CampusMap places={places ?? []} loading={places === null} />
      )}

      <div className="map-actions">
        {/* QR 스캔(10/13)과 도감(시간 되면)은 아직 화면이 없다 */}
        <button className="btn-sub pressable" disabled aria-disabled="true">
          <QrCode size={20} aria-hidden="true" /> QR 찍기
        </button>
        <button className="btn-sub pressable" disabled aria-disabled="true">
          <Stamp size={20} aria-hidden="true" /> 도감
        </button>
      </div>
    </main>
  )
}
