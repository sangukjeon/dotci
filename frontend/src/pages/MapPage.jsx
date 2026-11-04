import { useEffect, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { Link } from 'react-router-dom'
import { BellRing, List, LocateFixed, Map as MapIcon, QrCode, UserRound, X } from 'lucide-react'
import { getPlaces } from '../api.js'
import { useAuth } from '../auth.jsx'
import MeSheet from '../components/MeSheet.jsx'
import PushPrompt from '../components/PushPrompt.jsx'
import { nearbyHint, placeSummary } from '../server.js'
import NaverMap from '../components/NaverMap.jsx'
import PlaceList from '../components/PlaceList.jsx'
import PlaceSheet from '../components/PlaceSheet.jsx'
import { IS_DEMO } from '../demo.js'
import { NAVER_CLIENT_ID } from '../naverMap.js'
import './MapPage.css'

const MAP_ERRORS = {
  no_key: IS_DEMO
    ? '체험판은 지도 대신 목록으로 보여요.\n장소를 눌러 책상을 열어 보세요.'
    : '지도 키가 아직 없어요. frontend/.env에 VITE_NAVER_MAP_CLIENT_ID를 넣어 주세요.',
  auth: '지도 키를 확인해 주세요.\n네이버 클라우드 콘솔에 이 주소가 등록되어 있어야 해요.',
  load_failed: '지도를 불러오지 못했어요.\n목록으로 볼 수 있어요.',
}

export default function MapPage() {
  const [places, setPlaces] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [view, setView] = useState(NAVER_CLIENT_ID ? 'map' : 'list')
  const [mapError, setMapError] = useState(NAVER_CLIENT_ID ? null : 'no_key')
  const [myPos, setMyPos] = useState(null)
  const [showMe, setShowMe] = useState(false)
  const [nearbyClosed, setNearbyClosed] = useState(false)
  const { user } = useAuth()

  const load = () =>
    getPlaces()
      .then((list) => setPlaces(list.map((p) => ({ ...p, ...placeSummary(p.id) }))))
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
  // TODO(시간 되면): watchPosition으로 내 위치를 따라가며 화면에서만 계산 (서버로 안 보냄)
  const nearby = !nearbyClosed && places ? nearbyHint(places) : null

  if (loadError) {
    return (
      <main className="map-page map-page--center">
        <p>장소를 불러오지 못했어요.{'\n'}잠시 후 다시 시도해 주세요.</p>
        <button className="btn-sub pressable" onClick={retry}>
          다시 시도
        </button>
      </main>
    )
  }

  return (
    <main className="map-page">
      <h1 className="sr-only">DOTCI 캠퍼스 지도</h1>

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
          <div className="map-page__list-head">
            <p className="map-page__brand">
              DOTCI<span className="brand-dot" aria-hidden="true" />
            </p>
            <MeButton user={user} onClick={() => setShowMe(true)} />
          </div>
          {mapError && <p className="map-page__notice">{MAP_ERRORS[mapError]}</p>}
          <PlaceList places={places ?? []} />
        </div>
      )}

      {view === 'map' && (
        <>
          <div className="map-page__brand-pill">
            DOTCI<span className="brand-dot" aria-hidden="true" />
          </div>
          {nearby && (
            <div className="map-page__nearby" role="status">
              <BellRing size={20} aria-hidden="true" />
              <button className="map-page__nearby-main" onClick={() => setSelectedId(nearby.place.id)}>
                <b>{nearby.place.name}</b>
                <span>
                  {nearby.distance_m}m 앞에 아직 안 연 책상이 있어요 · 쪽지 {nearby.place.note_count}장
                </span>
              </button>
              <button className="icon-btn map-page__nearby-close" onClick={() => setNearbyClosed(true)} aria-label="알림 닫기">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          )}
          <div className="map-page__me">
            <MeButton user={user} onClick={() => setShowMe(true)} />
          </div>
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
          <Link to="/scan" className="btn-sub map-page__action pressable">
            <QrCode size={20} aria-hidden="true" /> QR 찍기
          </Link>
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

      <AnimatePresence>{showMe && <MeSheet onClose={() => setShowMe(false)} />}</AnimatePresence>
      {/* 처음 한 번만: 알림 받을지 묻기 */}
      <PushPrompt />
    </main>
  )
}

function MeButton({ user, onClick }) {
  return (
    <button className="map-page__me-btn pressable" onClick={onClick} aria-label={`내 정보: ${user?.nickname ?? ''}`}>
      <UserRound size={20} aria-hidden="true" />
    </button>
  )
}
