import { useEffect, useRef, useState } from 'react'
import { loadNaverMaps, onNaverAuthFailure } from '../naverMap.js'
import './NaverMap.css'

// 마커 안에 넣는 아이콘(고정 SVG). 장소 이름 같은 사용자 데이터는 textContent로만 넣는다.
const PIN_SVG =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/></svg>'
const CHECK_SVG =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'

function markerElement(place, selected) {
  const el = document.createElement('div')
  el.className = ['nmarker', place.unlocked && 'nmarker--open', selected && 'nmarker--selected']
    .filter(Boolean)
    .join(' ')

  const dot = document.createElement('div')
  dot.className = 'nmarker__dot'
  dot.innerHTML = place.unlocked ? CHECK_SVG : PIN_SVG
  el.appendChild(dot)

  if (place.note_count > 0) {
    const badge = document.createElement('span')
    badge.className = 'nmarker__badge'
    badge.textContent = place.note_count > 99 ? '99+' : String(place.note_count)
    el.appendChild(badge)
  }

  const label = document.createElement('span')
  label.className = 'nmarker__label'
  label.textContent = place.name
  el.appendChild(label)
  return el
}

function centerOf(places) {
  const lat = places.reduce((s, p) => s + p.lat, 0) / places.length
  const lng = places.reduce((s, p) => s + p.lng, 0) / places.length
  return { lat, lng }
}

// 네이버 지도 + 장소 마커 + (있으면) 내 위치 점
export default function NaverMap({ places, selectedId, onSelect, myPos, onError }) {
  const boxRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const myMarkerRef = useRef(null)
  const [ready, setReady] = useState(false)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  // 지도 만들기 (한 번)
  useEffect(() => {
    let cancelled = false
    onNaverAuthFailure(() => onError?.('auth'))
    loadNaverMaps()
      .then((maps) => {
        if (cancelled || mapRef.current) return
        const c = places.length ? centerOf(places) : { lat: 37.5665, lng: 126.978 }
        const map = new maps.Map(boxRef.current, {
          center: new maps.LatLng(c.lat, c.lng),
          zoom: 17,
          minZoom: 14,
          scaleControl: false,
          mapDataControl: false,
          logoControlOptions: { position: maps.Position.BOTTOM_LEFT },
        })
        maps.Event.addListener(map, 'click', () => onSelectRef.current?.(null))
        mapRef.current = map
        setReady(true)
      })
      .catch((e) => onError?.(e.message))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 장소 마커 그리기 (장소 목록이나 선택이 바뀔 때마다)
  useEffect(() => {
    const maps = window.naver?.maps
    const map = mapRef.current
    if (!maps || !map) return
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = places.map((p) => {
      const marker = new maps.Marker({
        map,
        position: new maps.LatLng(p.lat, p.lng),
        title: p.name,
        zIndex: p.id === selectedId ? 100 : 10,
        icon: { content: markerElement(p, p.id === selectedId), anchor: new maps.Point(18, 18) },
      })
      maps.Event.addListener(marker, 'click', () => onSelectRef.current?.(p.id))
      return marker
    })
    if (selectedId) {
      const p = places.find((x) => x.id === selectedId)
      if (p) map.panTo(new maps.LatLng(p.lat, p.lng))
    }
  }, [places, selectedId, ready])

  // 내 위치 점 (화면에만 그린다. 서버로 보내지 않는다)
  useEffect(() => {
    const maps = window.naver?.maps
    const map = mapRef.current
    if (!maps || !map || !myPos) return
    const pos = new maps.LatLng(myPos.lat, myPos.lng)
    if (!myMarkerRef.current) {
      const el = document.createElement('div')
      el.className = 'nmarker-me'
      myMarkerRef.current = new maps.Marker({
        map,
        position: pos,
        zIndex: 200,
        icon: { content: el, anchor: new maps.Point(10, 10) },
      })
    } else {
      myMarkerRef.current.setPosition(pos)
    }
    map.panTo(pos)
  }, [myPos, ready])

  return <div ref={boxRef} className="naver-map" role="application" aria-label="캠퍼스 지도" />
}
