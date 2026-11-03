import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { CameraOff, ChevronLeft, Keyboard } from 'lucide-react'
import * as server from '../server.js'
import './ScanPage.css'

const READER_ID = 'qr-reader'

// QR 안의 글자에서 코드만 꺼낸다.
// 인쇄한 QR은 "https://도메인/place/장소?qr=코드" 주소라서, 폰 기본 카메라로 찍어도 바로 열린다.
function parseScanned(text) {
  try {
    const url = new URL(text)
    const code = url.searchParams.get('qr')
    const placeId = url.pathname.match(/^\/place\/([^/]+)/)?.[1]
    if (code) return { code, placeId }
  } catch {
    /* 주소가 아니면 글자 그대로 코드 */
  }
  return { code: text.trim(), placeId: null }
}

export default function ScanPage() {
  const navigate = useNavigate()
  const from = useLocation().state // 책상에서 왔으면 { placeId, placeName }
  const [cameraError, setCameraError] = useState(false)
  const [manual, setManual] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const handled = useRef(false)

  // 코드를 받으면 장소 책상으로 이동해서 그곳에서 해제한다 (뒤집히는 모습이 보이도록)
  const go = async ({ code, placeId }) => {
    if (handled.current) return
    handled.current = true
    setBusy(true)
    setError('')
    try {
      const target = from?.placeId ?? placeId ?? (await server.resolveCode(code)).place_id
      navigate(`/place/${target}`, { replace: true, state: { qrCode: code } })
    } catch {
      handled.current = false
      setError('어느 장소의 코드인지 찾지 못했어요. 다시 확인해 주세요.')
      setBusy(false)
    }
  }
  const goRef = useRef(go)
  goRef.current = go

  useEffect(() => {
    if (manual) return
    const scanner = new Html5Qrcode(READER_ID, { verbose: false })
    let started = false
    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
        (text) => goRef.current(parseScanned(text)),
        () => {},
      )
      .then(() => {
        started = true
      })
      .catch(() => {
        setCameraError(true)
        setManual(true)
      })
    return () => {
      if (started) scanner.stop().then(() => scanner.clear()).catch(() => {})
    }
  }, [manual])

  const submitCode = (e) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(code)) return setError('숫자 6자리를 넣어 주세요.')
    go({ code, placeId: null })
  }

  return (
    <main className="scan">
      <header className="top-bar">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="뒤로 가기">
          <ChevronLeft size={26} aria-hidden="true" />
        </button>
        <h1 className="scan__title">{from?.placeName ? `${from.placeName} QR` : 'QR 찍기'}</h1>
      </header>

      {!manual ? (
        <>
          <div className="scan__camera">
            <div id={READER_ID} className="scan__reader" />
            <div className="scan__frame" aria-hidden="true" />
          </div>
          <p className="scan__help">장소에 붙은 QR을 네모 안에 맞춰 주세요</p>
          {error && (
            <p className="field__error scan__error" role="alert">
              {error}
            </p>
          )}
          <button className="text-btn scan__switch" onClick={() => setManual(true)}>
            <Keyboard size={18} aria-hidden="true" /> 코드 직접 입력
          </button>
        </>
      ) : (
        <form className="scan__manual" onSubmit={submitCode} noValidate>
          {cameraError && (
            <div className="banner banner--info" style={{ marginBottom: 'var(--sp-4)' }}>
              <CameraOff size={18} aria-hidden="true" />
              <span>카메라를 쓸 수 없어요. QR 아래 적힌 숫자 6자리로 열 수 있어요.</span>
            </div>
          )}
          <label className="field">
            <span className="field__label">장소 코드 6자리</span>
            <input
              className="input scan__code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              autoFocus
            />
            <span className="field__help">QR 아래에 작게 적혀 있어요</span>
          </label>
          {error && (
            <p className="field__error" role="alert">
              {error}
            </p>
          )}
          {!cameraError && (
            <button type="button" className="text-btn" onClick={() => { setError(''); setManual(false) }}>
              카메라로 찍기
            </button>
          )}
          <div className="bottom-plate">
            <button className="btn-main" type="submit" disabled={busy || code.length !== 6}>
              {busy ? '확인 중...' : '열기'}
            </button>
          </div>
        </form>
      )}

      {!from && (
        <p className="scan__foot">
          QR이 없는 곳이면 <Link to="/">지도</Link>에서 장소를 골라 도착 확인을 해 주세요
        </p>
      )}
    </main>
  )
}
