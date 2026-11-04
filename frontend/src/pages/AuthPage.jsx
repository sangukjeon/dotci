import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'motion/react'
import { ChevronLeft, ChevronRight, CircleCheck, MapPin, QrCode } from 'lucide-react'
import { GUEST_HOME, useAuth } from '../auth.jsx'
import { BOOTH_CODE, checkInvite, checkPassword, GUEST_ENABLED } from '../server.js'
import { getPosition } from '../geo.js'
import { DOCS } from '../legal.js'
import Sheet from '../components/Sheet.jsx'
import LegalDoc from '../components/LegalDoc.jsx'
import PasswordStrength from '../components/PasswordStrength.jsx'
import { askPushPermission, enablePush, markPushAsked } from '../push.js'
import { LegalLinks } from './LegalPage.jsx'
import './AuthPage.css'

// 가입 동의 항목: 모두 필수. doc이 있으면 '보기'로 전문을 연다.
const AGREEMENTS = [
  { key: 'terms', label: '이용약관 동의', doc: 'terms' },
  { key: 'consent', label: '개인정보 수집·이용 동의', doc: 'consent' },
  { key: 'age', label: '만 14세 이상이에요' },
  { key: 'push', label: '공지 알림 받기', doc: 'push', optional: true },
]
const REQUIRED = AGREEMENTS.filter((a) => !a.optional)

const LOGIN_ERRORS = {
  bad_credentials: '아이디 또는 비밀번호를 확인해 주세요.',
  locked: '5번 틀려서 잠겼어요. 10분 뒤에 다시 시도해 주세요.',
}
const SIGNUP_ERRORS = {
  bad_invite: '초대 코드를 확인해 주세요. 학과 대표에게 받은 코드를 넣어요.',
  off_campus: '위치가 캠퍼스 밖으로 잡혔어요. 근처 장소의 QR 아래 6자리 코드로 확인해 주세요.',
  low_accuracy: '위치가 흐리게 잡혔어요(노트북은 자주 그래요). 근처 장소의 QR 아래 6자리 코드로 확인해 주세요.',
  bad_code: '장소 코드를 확인해 주세요.',
  bad_request: '입력한 값을 확인해 주세요. 아이디는 영문·숫자 3~20자, 비밀번호는 8자 이상이에요.',
  username_taken: '이미 쓰고 있는 아이디예요.',
}

export default function AuthPage() {
  const { user, guestLogin } = useAuth()
  const location = useLocation()
  const [tab, setTab] = useState('login')
  const [guestBusy, setGuestBusy] = useState(false)
  const goTo = location.state?.from || '/'

  // 관람객은 부스 책상으로 가서 바로 열린다 (부스 QR을 찍은 것과 같음)
  if (user?.is_guest) return <Navigate to={GUEST_HOME} replace state={{ qrCode: BOOTH_CODE }} />
  if (user) return <Navigate to={goTo} replace />

  const startGuest = async () => {
    setGuestBusy(true)
    try {
      await guestLogin()
    } finally {
      setGuestBusy(false)
    }
  }

  return (
    <main className="auth">
      <header className="auth__hero">
        <h1 className="auth__logo">
          DOTCI<span className="auth__dot" aria-hidden="true" />
        </h1>
        <p className="auth__tagline">점 하나, 이야기 하나.</p>
        {GUEST_ENABLED && (
          <button className="auth__guest pressable" onClick={startGuest} disabled={guestBusy}>
            전시회에서 오셨나요? 로그인 없이 체험하기 <ChevronRight size={16} aria-hidden="true" />
          </button>
        )}
      </header>

      <div className="auth__panel">
        <div className="auth__tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'login'} className="auth__tab" onClick={() => setTab('login')}>
            로그인
          </button>
          <button role="tab" aria-selected={tab === 'signup'} className="auth__tab" onClick={() => setTab('signup')}>
            가입
          </button>
        </div>

        {tab === 'login' ? <LoginForm goTo={goTo} /> : <SignupForm goTo={goTo} />}
      </div>
    </main>
  )
}

function LoginForm({ goTo }) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!form.username || !form.password) return setError('아이디와 비밀번호를 입력해 주세요.')
    setBusy(true)
    setError('')
    try {
      await login(form)
      navigate(goTo, { replace: true })
    } catch (err) {
      const base = LOGIN_ERRORS[err.code] ?? '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.'
      setError(err.remaining && err.remaining <= 3 ? `${base} ${err.remaining}번 더 틀리면 10분 동안 잠겨요.` : base)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="auth__form" onSubmit={submit} noValidate>
      <label className="field">
        <span className="field__label">아이디</span>
        <input
          className="input"
          autoComplete="username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          placeholder="woosong24"
        />
      </label>
      <label className="field">
        <span className="field__label">비밀번호</span>
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
      </label>
      {error && <p className="field__error" role="alert">{error}</p>}
      <p className="field__help">로그인은 어디서나 돼요. 쪽지는 그 장소에 가야 열려요.</p>
      <div className="auth__legal">
        <LegalLinks />
      </div>

      <div className="bottom-plate">
        <button className="btn-main" type="submit" disabled={busy}>
          {busy ? '확인 중...' : '로그인'}
        </button>
      </div>
    </form>
  )
}

const GRADES = [1, 2, 3, 4]

// 서버가 알려 주는 "너무 쉬운 비밀번호" 이유
const WEAK_PASSWORD = {
  common: '너무 흔한 비밀번호예요. 유출 목록에 자주 나오는 값이라 다른 걸로 정해 주세요.',
  has_username: '비밀번호에 아이디가 들어 있어요. 다른 걸로 정해 주세요.',
  repeated: '같은 글자만 반복돼요. 다른 걸로 정해 주세요.',
  sequence: '1234·qwerty처럼 차례대로 누른 비밀번호예요. 다른 걸로 정해 주세요.',
}

function SignupForm({ goTo }) {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ username: '', password: '', grade: null, invite_code: '' })
  const [department, setDepartment] = useState('')
  const [location, setLocation] = useState(null) // {method:'gps', lat, lng, accuracy} | {method:'qr', code}
  const [manualCode, setManualCode] = useState('')
  const [agreed, setAgreed] = useState({}) // { terms: true, consent: true, age: true }
  const [reading, setReading] = useState(null) // 보고 있는 약관 'terms' | 'consent'
  const agreeAll = AGREEMENTS.every((a) => agreed[a.key]) // "전체 동의" 체크 표시 (선택 포함)
  const requiredOk = REQUIRED.every((a) => agreed[a.key])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const nextFromStep1 = async (e) => {
    e.preventDefault()
    if (!/^[a-z0-9_]{4,20}$/.test(form.username)) return setError('아이디는 영어 소문자·숫자·_ 4~20자로 만들어요.')
    if (form.password.length < 8) return setError('비밀번호는 8자 이상이에요.')
    if (!form.grade) return setError('학년을 골라 주세요.')
    setBusy(true)
    setError('')
    try {
      const { ok, reason } = await checkPassword(form.username, form.password)
      if (!ok) return setError(WEAK_PASSWORD[reason] ?? '다른 비밀번호로 정해 주세요.')
      setStep(2)
    } catch {
      setError('연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  const nextFromStep2 = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { department } = await checkInvite(form.invite_code)
      setDepartment(department)
      setStep(3)
    } catch (err) {
      setError(SIGNUP_ERRORS[err.code] ?? '코드를 확인하지 못했어요.')
    } finally {
      setBusy(false)
    }
  }

  const checkGps = async () => {
    setError('')
    setBusy(true)
    try {
      const pos = await getPosition()
      setLocation({ method: 'gps', ...pos })
    } catch (err) {
      setError(err.code === 'denied' ? '위치 권한이 없어요. 아래 장소 코드로 확인해 주세요.' : '위치를 받지 못했어요. 장소 코드로 확인해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    const loc = location ?? (manualCode.length === 6 ? { method: 'qr', code: manualCode } : null)
    if (!loc) return setError('학교에 있는지 확인해 주세요.')
    if (!requiredOk) return setError('필수 항목에 모두 동의해 주세요.')
    // 공지 알림에 동의했으면 "가입하기"를 누른 이 순간 브라우저 허용 창을 띄운다.
    // (아이폰 등은 버튼을 누른 직후에만 허용 창을 띄울 수 있어서, 가입 요청을 기다리기 전에 부른다)
    const permission = agreed.push ? askPushPermission() : null
    if (!agreed.push) markPushAsked()
    setBusy(true)
    setError('')
    try {
      await signup({ ...form, location: loc })
      if (permission) permission.then((p) => p === 'granted' && enablePush().catch(() => {}))
      navigate(goTo, { replace: true })
    } catch (err) {
      // 위치 확인에 실패하면 받은 위치를 버려서, 다시 시도하거나 장소 코드를 넣을 수 있게 한다
      if (err.code === 'off_campus' || err.code === 'low_accuracy' || err.code === 'bad_code') setLocation(null)
      if (err.code === 'weak_password') {
        setStep(1)
        return setError(WEAK_PASSWORD[err.reason] ?? '다른 비밀번호로 정해 주세요.')
      }
      setError(SIGNUP_ERRORS[err.code] ?? '가입하지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth__form">
      <div className="auth__steps" aria-label={`가입 ${step}/3단계`}>
        {step > 1 && (
          <button className="icon-btn" onClick={() => { setError(''); setStep(step - 1) }} aria-label="이전 단계">
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
        )}
        <span className="auth__step-text">
          <b>{step}</b> / 3 · {['기본 정보', '학과 초대 코드', '학교에 있어요'][step - 1]}
        </span>
      </div>

      {step === 1 && (
        <form onSubmit={nextFromStep1} noValidate>
          <label className="field">
            <span className="field__label">아이디</span>
            <input className="input" autoComplete="username" value={form.username} onChange={set('username')} placeholder="woosong24" />
            <span className="field__help">영어 소문자·숫자·_ 4~20자</span>
          </label>
          <label className="field">
            <span className="field__label">비밀번호</span>
            <input className="input" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />
            {form.password ? (
              <PasswordStrength password={form.password} username={form.username} />
            ) : (
              <span className="field__help">8자 이상, 다른 사이트에서 쓰지 않는 비밀번호</span>
            )}
          </label>
          <div className="field">
            <span className="field__label" id="grade-label">학년</span>
            <div className="chips" role="group" aria-labelledby="grade-label">
              {GRADES.map((g) => (
                <button type="button" key={g} className="chip" aria-pressed={form.grade === g} onClick={() => setForm({ ...form, grade: g })}>
                  {g}학년
                </button>
              ))}
            </div>
          </div>
          <p className="field__help">쪽지에 보이는 이름은 "조용한 다람쥐 42"처럼 자동으로 지어져요.</p>
          {error && <p className="field__error" role="alert">{error}</p>}
          <div className="bottom-plate">
            <button className="btn-main" type="submit" disabled={busy}>
              {busy ? '확인 중...' : '다음'}
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={nextFromStep2} noValidate>
          <label className="field">
            <span className="field__label">학과 초대 코드</span>
            <input
              className="input"
              value={form.invite_code}
              onChange={set('invite_code')}
              placeholder="학과 대표에게 받은 코드"
              autoCapitalize="characters"
            />
            <span className="field__help">학과 대표(과대·학생회)에게 받은 코드예요. 학과는 코드로 정해져요.</span>
          </label>
          {error && <p className="field__error" role="alert">{error}</p>}
          <div className="bottom-plate">
            <button className="btn-main" type="submit" disabled={busy || !form.invite_code}>
              {busy ? '확인 중...' : '코드 확인'}
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={submit} noValidate>
          <div className="banner banner--info" style={{ marginBottom: 'var(--sp-4)' }}>
            <CircleCheck size={18} aria-hidden="true" />
            <span>
              <b>{department}</b>(으)로 가입해요
            </span>
          </div>

          <p className="field__label">학교에 있는지 확인할게요</p>
          <p className="field__help" style={{ marginBottom: 'var(--sp-3)' }}>
            캠퍼스 안에서만 가입할 수 있어요. 위치는 확인에만 쓰고 저장하지 않아요.
          </p>

          {location ? (
            <div className="auth__ok">
              <CircleCheck size={20} aria-hidden="true" /> 위치를 받았어요
            </div>
          ) : (
            <button type="button" className="btn-sub auth__wide" onClick={checkGps} disabled={busy}>
              <MapPin size={20} aria-hidden="true" /> {busy ? '위치 받는 중...' : '위치로 확인하기'}
            </button>
          )}

          {!location && (
            <label className="field" style={{ marginTop: 'var(--sp-4)' }}>
              <span className="field__label">
                <QrCode size={16} aria-hidden="true" style={{ verticalAlign: '-3px' }} /> 또는 장소 코드 6자리
              </span>
              <input
                className="input"
                inputMode="numeric"
                maxLength={6}
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ''))}
                placeholder="QR 아래 적힌 숫자"
              />
            </label>
          )}

          <div className="auth__consent">
            <label className="auth__check auth__check--all">
              <input
                type="checkbox"
                checked={agreeAll}
                onChange={(e) => setAgreed(Object.fromEntries(AGREEMENTS.map((x) => [x.key, e.target.checked])))}
              />
              전체 동의
            </label>
            <ul className="auth__agree-list">
              {AGREEMENTS.map((x) => (
                <li key={x.key} className="auth__agree-row">
                  <label className="auth__check">
                    <input
                      type="checkbox"
                      checked={Boolean(agreed[x.key])}
                      onChange={(e) => setAgreed({ ...agreed, [x.key]: e.target.checked })}
                    />
                    <span>
                      {x.optional ? (
                        <b className="auth__optional">[선택]</b>
                      ) : (
                        <b className="auth__required">[필수]</b>
                      )}{' '}
                      {x.label}
                    </span>
                  </label>
                  {x.doc && (
                    <button type="button" className="text-btn auth__view" onClick={() => setReading(x.doc)}>
                      보기
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <p className="field__help">
              실명·학번·전화번호·이메일은 받지 않고, 위치는 확인할 때만 쓰고 저장하지 않아요. 자세한 내용은{' '}
              <button type="button" className="auth__inline-link" onClick={() => setReading('privacy')}>
                개인정보처리방침
              </button>
              에 있어요.
            </p>
          </div>

          {error && <p className="field__error" role="alert">{error}</p>}
          <div className="bottom-plate">
            <button className="btn-main" type="submit" disabled={busy}>
              {busy ? '가입 중...' : '가입하기'}
            </button>
          </div>
        </form>
      )}

      <AnimatePresence>
        {reading && (
          <Sheet title={DOCS[reading].title} onClose={() => setReading(null)} labelId="legal-sheet-title">
            <LegalDoc doc={reading} />
          </Sheet>
        )}
      </AnimatePresence>
    </div>
  )
}
