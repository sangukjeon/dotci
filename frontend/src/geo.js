// 브라우저에서 현재 위치 한 번 받기 (Geolocation API)
// 좌표는 서버 판정 요청 본문으로만 보내고, 화면이나 저장소에 남기지 않는다.

const TIMEOUT_MS = 10_000

export function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(Object.assign(new Error('unsupported'), { code: 'unsupported' }))
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: Math.round(p.coords.accuracy),
        }),
      (err) => {
        const code = err.code === err.PERMISSION_DENIED ? 'denied' : err.code === err.TIMEOUT ? 'timeout' : 'unavailable'
        reject(Object.assign(new Error(code), { code }))
      },
      { enableHighAccuracy: true, timeout: TIMEOUT_MS, maximumAge: 0 },
    )
  })
}
