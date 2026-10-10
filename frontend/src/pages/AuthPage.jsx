import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, CircleCheck, MapPin, QrCode } from 'lucide-react'
import { useAuth } from '../auth.jsx'
import { checkInvite } from '../mock/server.js'
import { getPosition } from '../geo.js'
import './AuthPage.css'

const LOGIN_ERRORS = {
  bad_credentials: '아이디 또는 비밀번호를 확인해 주세요.',
  locked: '5번 틀려서 잠겼어요. 10분 뒤에 다시 시도해 주세요.',
}
const SIGNUP_ERRORS = {
  bad_invite: '초대 코드를 확인해 주세요. 학과 대표에게 받은 코드를 넣어요.',
  off_campus: '학교 안에서만 가입할 수 있어요. 캠퍼스에 와서 다시 시도해 주세요.',
  bad_code: '장소 코드를 확인해 주세요.',
  username_taken: '이미 쓰고 있는 아이디예요.',
}

export default function AuthPage() {
  const { user } = useAuth()
  const location = useLocation()
  const [tab, setTab] = useState('login')
  const goTo = location.state?.from || '/'

  if (user) return <Navigate to={goTo} replace />

  return (
    <main className="auth">
      <div className="auth__brand">
        <p className="auth__logo">선배의 흔적</p>
        <p className="auth__tagline">검색하지 마세요, 도착하세요.</p>
      </div>

      <div className="auth__tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'login'} className="auth__tab" onClick={() => setTab('login')}>
          로그인
        </button>
        <button role="tab" aria-selected={tab === 'signup'} className="auth__tab" onClick={() => setTab('signup')}>
          가입
        </button>
      </div>

      {tab === 'login' ? <LoginForm goTo={goTo} /> : <SignupForm goTo={goTo} />}
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
      setError(LOGIN_ERRORS[err.code] ?? '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.')
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

      <div className="bottom-plate">
        <button className="btn-main" type="submit" disabled={busy}>
          {busy ? '확인 중...' : '로그인'}
        </button>
      </div>
    </form>
  )
}

const GRADES = [1, 2, 3, 4]

function SignupForm({ goTo }) {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ username: '', password: '', nickname: '', grade: null, invite_code: '' })
  const [department, setDepartment] = useState('')
  const [location, setLocation] = useState(null) // {method:'gps', lat, lng, accuracy} | {method:'qr', code}
  const [manualCode, setManualCode] = useState('')
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const nextFromStep1 = (e) => {
    e.preventDefault()
    if (!/^[a-z0-9_]{4,20}$/.test(form.username)) return setError('아이디는 영어 소문자·숫자·_ 4~20자로 만들어요.')
    if (form.password.length < 8) return setError('비밀번호는 8자 이상이에요.')
    if (form.nickname.trim().length < 2 || form.nickname.trim().length > 12) return setError('닉네임은 2~12자예요.')
    if (!form.grade) return setError('학년을 골라 주세요.')
    setError('')
    setStep(2)
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
    if (!agree) return setError('수집 항목 안내에 동의해 주세요.')
    setBusy(true)
    setError('')
    try {
      await signup({ ...form, nickname: form.nickname.trim(), location: loc })
      navigate(goTo, { replace: true })
    } catch (err) {
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
            <span className="field__help">8자 이상</span>
          </label>
          <label className="field">
            <span className="field__label">닉네임</span>
            <input className="input" value={form.nickname} onChange={set('nickname')} placeholder="열람실지박령" maxLength={12} />
            <span className="field__help">쪽지에 이름 대신 보여요. 실명은 쓰지 마세요.</span>
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
          {error && <p className="field__error" role="alert">{error}</p>}
          <div className="bottom-plate">
            <button className="btn-main" type="submit">다음</button>
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
              placeholder="CSE-2026"
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
            <p className="field__label">수집하는 정보</p>
            <ul>
              <li>아이디, 닉네임, 학년, 학과(초대 코드로 정해짐)</li>
              <li>실명·학번·전화번호·이메일은 받지 않아요</li>
              <li>위치는 확인할 때만 쓰고 저장하지 않아요</li>
              <li>탈퇴하면 계정과 기록을 모두 지워요</li>
            </ul>
            <label className="auth__check">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              위 내용을 확인했고 동의해요
            </label>
          </div>

          {error && <p className="field__error" role="alert">{error}</p>}
          <div className="bottom-plate">
            <button className="btn-main" type="submit" disabled={busy}>
              {busy ? '가입 중...' : '가입하기'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
