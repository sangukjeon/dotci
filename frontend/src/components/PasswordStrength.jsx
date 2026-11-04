import './PasswordStrength.css'

// 키보드·숫자를 차례대로 누른 것 (서버 passwords.py와 같은 규칙)
const SEQUENCES = ['0123456789', '9876543210', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm']

const LEVELS = [
  { label: '너무 짧아요', tone: 'bad' },
  { label: '약함', tone: 'bad' },
  { label: '보통', tone: 'warn' },
  { label: '강함', tone: 'good' },
  { label: '아주 강함', tone: 'great' },
]

// 화면에서만 보는 "대략적인" 강도. 최종 판단(흔한 비밀번호 목록 등)은 서버가 한다.
function passwordStrength(password, username = '') {
  const pw = password.toLowerCase()
  if (password.length < 8) return { level: 0, tip: `${8 - password.length}자 더 입력해 주세요.` }
  if (username.length >= 3 && pw.includes(username.toLowerCase())) return { level: 1, tip: '아이디가 들어 있어요.' }
  if (new Set(pw).size <= 2) return { level: 1, tip: '같은 글자만 반복돼요.' }
  if (SEQUENCES.some((s) => s.includes(pw))) return { level: 1, tip: '차례대로 누른 글자예요.' }

  const kinds = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length
  const points = kinds + (password.length >= 12 ? 1 : 0) + (password.length >= 16 ? 1 : 0)
  const level = Math.min(4, Math.max(1, points))

  let tip = '좋아요! 다른 사이트와 다른 비밀번호면 더 안전해요.'
  if (level < 4) {
    if (password.length < 12) tip = '12자 이상으로 늘리면 더 강해져요.'
    else if (kinds < 3) tip = '대문자·숫자·기호를 섞으면 더 강해져요.'
  }
  return { level, tip }
}

export default function PasswordStrength({ password, username }) {
  if (!password) return null
  const { level, tip } = passwordStrength(password, username)
  const { label, tone } = LEVELS[level]

  return (
    <div className={`pw-strength pw-strength--${tone}`}>
      <div className="pw-strength__bars" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`pw-strength__bar${i <= level ? ' is-on' : ''}`} />
        ))}
      </div>
      <p className="pw-strength__text" aria-live="polite">
        <b>비밀번호 강도: {label}</b> · {tip}
      </p>
    </div>
  )
}
