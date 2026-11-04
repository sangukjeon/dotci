// DOTCI 서비스 워커
// 1) 인터넷이 없을 때 "연결이 끊겼어요" 페이지를 보여 준다.
// 2) 푸시 알림(관리자 공지, 내 쪽지 반응)을 받아 폰 알림으로 띄우고, 누르면 해당 화면을 연다.
// - 화면 파일·API 응답은 저장(캐시)하지 않는다 → 옛 화면이 남는 문제가 생기지 않는다.
// - 페이지 이동(주소창 입력, 새로고침)이 네트워크 오류로 실패할 때만 offline.html을 대신 보여 준다.
const CACHE = 'dotci-offline-v1'
const OFFLINE_URL = new URL('offline.html', self.registration.scope).href

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' }))))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return // 그림·스크립트·API는 건드리지 않는다
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)))
})

// ---------- 푸시 알림 (공지 + 내 쪽지 반응) ----------

const ICON = new URL('icons/icon-192.png', self.registration.scope).href
const BADGE = new URL('icons/badge-96.png', self.registration.scope).href

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data?.text() }
  }
  const title = data.title || 'DOTCI'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: ICON,
      badge: BADGE,
      tag: data.tag || 'dotci', // 같은 종류(공지끼리, 같은 쪽지끼리)는 최신 것 하나만 남긴다
      renotify: true,
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  // 앱 안 주소만 연다 (서버도 "/"로 시작하는 주소만 받지만 한 번 더 확인)
  const path = String(event.notification.data?.url || '/')
  const safe = path.startsWith('/') && !path.startsWith('//') ? path.slice(1) : ''
  const target = new URL(safe, self.registration.scope).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const open = wins.find((w) => w.url.startsWith(self.registration.scope))
      if (open) return open.focus().then((w) => w.navigate(target))
      return self.clients.openWindow(target)
    }),
  )
})
