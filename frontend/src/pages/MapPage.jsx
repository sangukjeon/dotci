import { useEffect, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { List, LocateFixed, Map as MapIcon, QrCode } from 'lucide-react'
import { getPlaces } from '../api.js'
import NaverMap from '../components/NaverMap.jsx'
import PlaceList from '../components/PlaceList.jsx'
import PlaceSheet from '../components/PlaceSheet.jsx'
import { NAVER_CLIENT_ID } from '../naverMap.js'
import './MapPage.css'

const MAP_ERRORS = {
  no_key: '지도 키가 아직 없어요. frontend/.env에 VITE_NAVER_MAP_CLIENT_ID를 넣어 주세요.',
  auth: '지도 키를 확인해 주세요. 네이버 클라우드 콘솔에 이 주소가 등록되어 있어야 해요.',
  load_failed: '지도를 불러오지 못했어요. 목록으로 볼 수 있어요.',
}

export default function MapPage() {
  const [places, setPlaces] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [view, setView] = useState(NAVER_CLIENT_ID ? 'map' : 'list')
  const [mapError, setMapError] = useState(NAVER_CLIENT_ID ? null : 'no_key')
  const [myPos, setMyPos] = useState(null)

  const load = () =>
    getPlaces()
      .then(setPlaces)
      .catch(() => setLoadError(true))

  useEffect(() => {
    load()
  }, [])

  const retry = () => {
    setLoadError(false)
    load()
  }

  const handleMapError = (code) => {
    setMapError(code)
    setView('list')
  }

  // 내 위치는 지도에 점으로만 그린다. 서버로 보내지 않는다.
  const locate = () => {
    navigator.geolocation?.getCurrentPosition(
      (p) => setMyPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const selected = places?.find((p) => p.id === selectedId)

  if (loadError) {
    return (
      <main className="map-page map-page--center">
        <p>장소를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
        <button className="btn-sub pressable" onClick={retry}>
          다시 시도
        </button>
      </main>
    )
  }

  return (
    <main className="map-page">
      <h1 className="sr-only">선배의 흔적 캠퍼스 지도</h1>

      {view === 'map' && places && (
        <NaverMap
          places={places}
          selectedId={selectedId}
          onSelect={setSelectedId}
          myPos={myPos}
          onError={handleMapError}
        />
      )}

      {view === 'list' && (
        <div className="map-page__list">
          <p className="map-page__brand">선배의 흔적</p>
          {mapError && <p className="map-page__notice">{MAP_ERRORS[mapError]}</p>}
          <PlaceList places={places ?? []} />
        </div>
      )}

      {view === 'map' && (
        <>
          <div className="map-page__brand-pill">선배의 흔적</div>
          <button className="map-page__fab map-page__fab--locate pressable" onClick={locate} aria-label="내 위치 보기">
            <LocateFixed size={22} aria-hidden="true" />
          </button>
        </>
      )}

      <AnimatePresence>
        {view === 'map' && selected && (
          <PlaceSheet key={selected.id} place={selected} onClose={() => setSelectedId(null)} />
        )}
      </AnimatePresence>

      {!selected && (
        <div className="map-page__actions">
          {/* QR 스캔 화면은 10/13 */}
          <button className="btn-sub map-page__action" disabled>
            <QrCode size={20} aria-hidden="true" /> QR 찍기
          </button>
          {mapError ? null : view === 'map' ? (
            <button className="btn-sub map-page__action pressable" onClick={() => setView('list')}>
              <List size={20} aria-hidden="true" /> 목록
            </button>
          ) : (
            <button className="btn-sub map-page__action pressable" onClick={() => setView('map')}>
              <MapIcon size={20} aria-hidden="true" /> 지도
            </button>
          )}
        </div>
      )}
    </main>
  )
}
