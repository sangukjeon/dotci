// 🆕 공지 푸시 알림 켜기·끄기 (웹 푸시)
// 1) 서버 공개키를 받아 2) 브라우저에 "알림 구독"을 만들고 3) 그 구독을 서버에 저장한다.
// 알림이 오면 public/sw.js(서비스 워커)가 받아서 폰 알림으로 띄운다.

import { pushKey, pushSubscribe, pushUnsubscribe } from './server.js'

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent)
const isInstalled = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true

// 지금 이 기기에서 알림을 켤 수 있는지, 이미 켜져 있는지
// 돌려주는 state: 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on' | 'server-off'
export async function pushState() {
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (!supported) return isIOS() && !isInstalled() ? 'ios-install' : 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const { public_key } = await pushKey().catch(() => ({ public_key: null }))
  if (!public_key) return 'server-off'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub ? 'on' : 'off'
}

// 서버가 준 공개키(base64url 글자)를 브라우저가 원하는 바이트 배열로 바꾼다
function keyBytes(base64url) {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4)
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

// "처음 한 번 물어보기"를 이미 했는지 (이 브라우저에만 저장)
const ASKED_KEY = 'dotci:push-asked'
export function pushAsked() {
  try {
    return localStorage.getItem(ASKED_KEY) === '1'
  } catch {
    return true // 저장소를 못 쓰면 매번 묻지 않도록 이미 물은 것으로 친다
  }
}
export function markPushAsked() {
  try {
    localStorage.setItem(ASKED_KEY, '1')
  } catch {
    /* 저장 못 해도 괜찮다 */
  }
}

// 브라우저 알림 허용 창만 띄운다. 버튼을 누른 직후(같은 클릭 안에서) 불러야 아이폰에서도 뜬다.
export function askPushPermission() {
  markPushAsked()
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return Promise.resolve('unsupported')
  }
  if (Notification.permission !== 'default') return Promise.resolve(Notification.permission)
  return Notification.requestPermission()
}

export async function enablePush() {
  markPushAsked()
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off'
  const { public_key } = await pushKey()
  if (!public_key) return 'server-off'
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(public_key) })
  }
  await pushSubscribe(sub.toJSON())
  return 'on'
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    await pushUnsubscribe(sub.endpoint).catch(() => {})
    await sub.unsubscribe()
  }
  return 'off'
}
