import { useSyncExternalStore } from 'react'

// 브라우저가 인터넷에 연결돼 있는지 (와이파이·데이터가 꺼지면 false)
function subscribe(callback) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

export function useOnline() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  )
}
