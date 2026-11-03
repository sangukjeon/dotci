// 학식 정보: wsu-meal-api (학교 홈페이지 식단을 하루 네 번 JSON으로 저장해 두는 공개 API)
// https://github.com/sangukjeon/wsu-meal-api
// DOTCI 서버를 거치지 않아서, 서버가 잠들어 있어도 바로 보인다.

const BASE = 'https://sangukjeon.github.io/wsu-meal-api/api'

// 서캠퍼스 식당을 앞에. 목록에 없는 식당은 뒤에 이름순으로 붙는다.
const CAFETERIA_ORDER = ['학생식당(서캠)', '청운숙기숙사', '국제기숙사', '학생식당(동캠)', '기숙사(동캠)']

// 지도 장소 → 그 장소에서 바로 보여 줄 식당
export const PLACE_CAFETERIA = {
  'w16-union': '학생식당(서캠)',
  'dorm-cheongun1': '청운숙기숙사',
}

const days = new Map() // 'YYYY-MM-DD' → { 식당: { 코너: [메뉴] } } 또는 null
let weekLoaded = null

// 한국 시간 기준 날짜 문자열
export function kstDate(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86_400_000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(d)
}

async function getJson(path) {
  const res = await fetch(`${BASE}/${path}`, { cache: 'no-cache' })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`meal api ${res.status}`)
  return res.json()
}

// 이번 주(월~일) 식단. 날짜 목록과 함께 돌려준다.
export async function loadWeek() {
  weekLoaded ??= getJson('week.json').then((week) => {
    for (const [date, data] of Object.entries(week?.data ?? {})) days.set(date, data)
    return week
  })
  try {
    const week = await weekLoaded
    return Object.keys(week?.data ?? {}).sort()
  } catch (err) {
    weekLoaded = null // 다음에 다시 시도
    throw err
  }
}

// 하루치 식단. 주간 파일에 없으면(월요일 새벽 등) 날짜 파일을 따로 읽는다.
export async function loadDay(date) {
  if (!days.has(date)) {
    await loadWeek().catch(() => {})
  }
  if (!days.has(date)) {
    const file = await getJson(`date/${date}.json`)
    days.set(date, file?.data ?? null)
  }
  return days.get(date)
}

// 운영하는 식당만, 서캠 먼저
export function cafeteriasOf(day) {
  const names = Object.keys(day ?? {}).filter((name) => day[name] && Object.keys(day[name]).length > 0)
  const rank = (name) => {
    const i = CAFETERIA_ORDER.indexOf(name)
    return i === -1 ? CAFETERIA_ORDER.length : i
  }
  return names.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

// '2026-11-03' → '11/3 (화)'
export function dateLabel(date) {
  const [y, m, d] = date.split('-').map(Number)
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return `${m}/${d} (${WEEKDAYS[day]})`
}
