// 네이버 지도 스크립트 불러오기 (NAVER Cloud Maps, Web Dynamic Map).
// Client ID는 비밀키가 아니다. 콘솔에 등록한 주소(localhost, 내 도메인)에서만 동작한다.

export const NAVER_CLIENT_ID = import.meta.env.VITE_NAVER_MAP_CLIENT_ID || ''

let loading = null

export function loadNaverMaps() {
  if (window.naver?.maps) return Promise.resolve(window.naver.maps)
  if (!NAVER_CLIENT_ID) return Promise.reject(new Error('no_key'))
  if (loading) return loading

  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(NAVER_CLIENT_ID)}`
    script.async = true
    script.onload = () => resolve(window.naver.maps)
    script.onerror = () => {
      loading = null
      reject(new Error('load_failed'))
    }
    document.head.appendChild(script)
  })
  return loading
}

// 키가 틀렸거나 주소가 등록되지 않았을 때 네이버 스크립트가 부르는 함수
export function onNaverAuthFailure(callback) {
  window.navermap_authFailure = callback
}
