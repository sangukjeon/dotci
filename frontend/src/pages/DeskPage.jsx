import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, LayoutGroup } from 'motion/react'
import { ChevronLeft, CircleCheck, Info, Lock, MapPin, MapPinOff, PenLine, QrCode, Sparkles, TriangleAlert, WifiOff } from 'lucide-react'
import { getPlaces } from '../api.js'
import { getPosition } from '../geo.js'
import { useAuth } from '../auth.jsx'
import { useToast } from '../toast.jsx'
import Desk, { DeskSkeleton } from '../components/Desk.jsx'
import NoteModal from '../components/NoteModal.jsx'
import WriteSheet from '../components/WriteSheet.jsx'
import * as server from '../server.js'
import './DeskPage.css'

// 실패 이유 → 안내 문구 (CLAUDE.md 8장 reason)
function bannerFor(result) {
  switch (result.reason) {
    case 'too_far':
      return { tone: 'warn', text: `아직 ${result.distance_m}m 남았어요.\n조금 더 가까이 와 주세요.` }
    case 'low_accuracy':
    case 'timeout':
    case 'unavailable':
      return { tone: 'warn', text: '위치가 흐릿해요.\n창가나 밖으로 나가거나 QR을 찍어 주세요.', qr: true }
    case 'denied':
    case 'unsupported':
      return { tone: 'info', text: '위치 권한이 꺼져 있어요.\n위치 없이도 QR로 열 수 있어요.', qr: true }
    case 'bad_code':
      return { tone: 'warn', text: '코드를 다시 확인해 주세요.', qr: true }
    case 'rate_limited':
      return { tone: 'warn', text: '잠시 뒤에 다시 시도해 주세요.' }
    case 'network':
      return { tone: 'warn', text: '연결이 끊겼어요.\n인터넷을 확인하고 다시 눌러 주세요.' }
    default:
      return { tone: 'warn', text: '확인하지 못했어요.\n잠시 후 다시 시도해 주세요.' }
  }
}

export default function DeskPage() {
  const { id } = useParams()
  const { user, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const routeState = useLocation().state
  const [searchParams, setSearchParams] = useSearchParams()

  const [place, setPlace] = useState(null)
  const [data, setData] = useState(null) // { notes, unlocked, write_until }
  const [newIds, setNewIds] = useState([])
  const [status, setStatus] = useState('idle') // idle | locating | judging
  const [banner, setBanner] = useState(null)
  const [openNote, setOpenNote] = useState(null)
  const [writing, setWriting] = useState(false)
  const [enteringId, setEnteringId] = useState(null)
  const [loadError, setLoadError] = useState(null) // null | 'network' | 'notfound'
  const [, tick] = useState(0)
  const startedQr = useRef(false)

  // 장소 정보와 쪽지를 함께 불러온다. 없는 장소면 notfound, 연결 문제면 network.
  const load = useCallback(() => {
    setLoadError(null)
    setData(null)
    Promise.all([getPlaces().then(server.withMockPlaces), server.listNotes(id)])
      .then(([list, notes]) => {
        const found = list.find((p) => p.id === id)
        if (!found) return setLoadError('notfound')
        setPlace(found)
        setData(notes)
      })
      .catch(() => setLoadError('network'))
  }, [id])

  useEffect(() => {
    setPlace(null)
    load()
    setNewIds([])
    setBanner(null)
    setEnteringId(null)
    startedQr.current = false // 다른 장소로 옮겨 왔으면 그 장소의 QR 코드도 처리
  }, [load])

  // 쓰기 가능 시간이 지나면 버튼이 바뀌도록 30초마다 다시 그린다
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  const applyUnlock = useCallback(
    (result) => {
      if (result.unlocked) {
        setData({ notes: result.notes, unlocked: true, write_until: result.write_until })
        setNewIds(result.new_ids)
        setBanner(null)
        if (!result.first_time && result.new_ids.length === 0) toast('그사이 새 흔적은 없어요')
        else toast('도착했어요', { success: true })
      } else if (result.reason === 'wrong_qr') {
        toast('다른 장소의 QR이에요. 그 책상으로 갈게요')
        navigate(`/place/${result.place_id}`, { replace: true, state: { qrCode: result.code } })
      } else {
        setBanner(bannerFor(result))
      }
    },
    [navigate, toast],
  )

  const unlockWithGps = async () => {
    setBanner(null)
    setStatus('locating')
    let pos
    try {
      pos = await getPosition()
    } catch (err) {
      setStatus('idle')
      setBanner(bannerFor({ reason: err.code }))
      return
    }
    setStatus('judging')
    try {
      applyUnlock(await server.unlock(id, { method: 'gps', ...pos }))
    } catch {
      setBanner(bannerFor({ reason: 'network' }))
    } finally {
      setStatus('idle')
    }
  }

  const unlockWithCode = useCallback(
    async (code) => {
      setStatus('judging')
      try {
        const result = await server.unlock(id, { method: 'qr', code })
        applyUnlock({ ...result, code })
      } catch {
        setBanner(bannerFor({ reason: 'network' }))
      } finally {
        setStatus('idle')
      }
    },
    [id, applyUnlock],
  )

  // QR로 들어온 경우: 스캔 화면에서 넘긴 코드, 또는 폰 카메라로 찍은 주소의 ?qr=
  useEffect(() => {
    if (!data || startedQr.current) return
    const code = routeState?.qrCode || searchParams.get('qr')
    if (!code) return
    startedQr.current = true
    if (searchParams.get('qr')) setSearchParams({}, { replace: true }) // 주소창에서 코드 지우기
    unlockWithCode(code)
  }, [data, routeState, searchParams, setSearchParams, unlockWithCode])

  const updateNote = (noteId, patch) => {
    setData((d) => ({ ...d, notes: d.notes.map((n) => (n.id === noteId ? { ...n, ...patch } : n)) }))
    setOpenNote((n) => (n && n.id === noteId ? { ...n, ...patch } : n))
  }

  // 도움됐어요: 한 번 누르면 켜지고, 다시 누르면 취소
  const onHelpful = async () => {
    const liked = openNote.liked_by_me
    const { helpful_count } = liked ? await server.removeHelpful(openNote.id) : await server.addHelpful(openNote.id)
    updateNote(openNote.id, { helpful_count, liked_by_me: !liked })
    if (liked) toast('도움됐어요를 취소했어요')
  }
  const onDelete = async () => {
    await server.deleteNote(openNote.id)
    setData((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== openNote.id) }))
    setOpenNote(null)
    toast('쪽지를 지웠어요')
  }
  const onReported = (result) => {
    if (result.hidden) {
      setData((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== openNote.id) }))
      setOpenNote(null)
      toast('신고가 3건 모여 쪽지를 숨겼어요')
    } else {
      toast('신고했어요. 3건이 모이면 자동으로 숨겨져요')
    }
  }
  const onHide = async () => {
    await server.hideNote(openNote.id)
    setData((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== openNote.id) }))
    setOpenNote(null)
    toast('쪽지를 숨겼어요')
  }
  const onWritten = (note) => {
    setWriting(false)
    setData((d) => ({ ...d, unlocked: true, notes: [...d.notes, note] }))
    setEnteringId(note.id)
    toast('흔적을 남겼어요', { success: true })
  }

  const openCard = (note) => {
    if (note.locked) {
      toast('도착하면 열려요')
      return
    }
    setOpenNote(note)
  }

  const notes = data?.notes ?? []
  const unlocked = Boolean(data?.unlocked)
  const canWrite = user?.is_admin || (unlocked && data?.write_until > Date.now())
  const busy = status !== 'idle'
  const busyText = status === 'locating' ? '위치 확인 중...' : '확인 중...'

  if (loadError) {
    return (
      <main className="desk-page">
        <header className="top-bar">
          <Link to="/" className="icon-btn pressable" aria-label="지도로 돌아가기">
            <ChevronLeft size={26} aria-hidden="true" />
          </Link>
        </header>
        <div className="desk-page__state" role="alert">
          <span className="desk-page__state-icon">
            {loadError === 'notfound' ? <MapPinOff size={24} aria-hidden="true" /> : <WifiOff size={24} aria-hidden="true" />}
          </span>
          <p className="desk-page__state-title">
            {loadError === 'notfound' ? '찾을 수 없는 장소예요' : '책상을 불러오지 못했어요'}
          </p>
          <p className="desk-page__state-body">
            {loadError === 'notfound' ? '주소가 바뀌었거나 없어진 장소예요.\n지도에서 다시 골라 주세요.' : '인터넷 연결을 확인하고 다시 시도해 주세요.'}
          </p>
          {loadError === 'notfound' ? (
            <Link to="/" className="btn-sub">
              지도로 가기
            </Link>
          ) : (
            <button className="btn-sub pressable" onClick={load}>
              다시 시도
            </button>
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="desk-page">
      <header className="top-bar">
        {user?.is_guest ? (
          <>
            <span className="desk-page__guest-tag">관람객 체험 중 · {user.nickname}</span>
            <button className="text-btn desk-page__guest-end" onClick={logout}>
              체험 끝내기
            </button>
          </>
        ) : (
          <Link to="/" className="icon-btn pressable" aria-label="지도로 돌아가기">
            <ChevronLeft size={26} aria-hidden="true" />
          </Link>
        )}
      </header>

      <section className="desk-page__head">
        <p className="desk-page__building">{place?.building || ' '}</p>
        <h1 className="desk-page__name">{place?.name || ' '}</h1>
        <StatusTag notes={notes} unlocked={unlocked} newCount={newIds.length} loading={!data} />
      </section>

      <LayoutGroup>
        {data ? <Desk notes={notes} newIds={newIds} enteringId={enteringId} onOpen={openCard} /> : <DeskSkeleton />}
        <AnimatePresence>
          {openNote && (
            <NoteModal
              key={openNote.id}
              note={openNote}
              onClose={() => setOpenNote(null)}
              onHelpful={onHelpful}
              onDelete={onDelete}
              onHide={onHide}
              onReported={onReported}
            />
          )}
        </AnimatePresence>
      </LayoutGroup>

      <div className="bottom-plate">
        {banner && (
          <div className={`banner banner--${banner.tone} desk-page__banner`} role="alert">
            {banner.tone === 'warn' ? <TriangleAlert size={18} aria-hidden="true" /> : <Info size={18} aria-hidden="true" />}
            <span>{banner.text}</span>
          </div>
        )}

        {canWrite ? (
          <button className="btn-main" type="button" onClick={() => setWriting(true)}>
            <PenLine size={20} aria-hidden="true" /> 흔적 남기기
          </button>
        ) : (
          <>
            <button className="btn-main" type="button" onClick={unlockWithGps} disabled={busy || !data}>
              <MapPin size={20} aria-hidden="true" />
              {busy ? busyText : unlocked ? '다시 도착 확인하기' : '도착 확인하기'}
            </button>
            <Link
              to="/scan"
              state={{ placeId: id, placeName: place?.name }}
              className={banner?.qr ? 'text-btn desk-page__qr desk-page__qr--strong' : 'text-btn desk-page__qr'}
            >
              <QrCode size={18} aria-hidden="true" /> QR이나 코드로 열기
            </Link>
          </>
        )}
        {unlocked && !canWrite && <p className="desk-page__note">쪽지를 남기려면 다시 도착 확인이 필요해요</p>}
      </div>

      <AnimatePresence>
        {writing && (
          <WriteSheet placeId={id} placeName={place?.name} onClose={() => setWriting(false)} onWritten={onWritten} />
        )}
      </AnimatePresence>
    </main>
  )
}

function StatusTag({ notes, unlocked, newCount, loading }) {
  if (loading) return <span className="tag desk-page__tag-skeleton" aria-hidden="true" />
  if (unlocked && newCount > 0)
    return (
      <span className="tag" style={{ background: 'var(--cat-food-bg)', color: 'var(--cat-food-text)' }}>
        <Sparkles size={14} aria-hidden="true" />
        <span>
          새 쪽지 <b>{newCount}</b>장
        </span>
      </span>
    )
  if (unlocked)
    return (
      <span className="tag" style={{ background: 'var(--success-weak)', color: 'var(--success)' }}>
        <CircleCheck size={14} aria-hidden="true" /> 열었어요
      </span>
    )
  if (notes.length === 0)
    return (
      <span className="tag" style={{ background: 'var(--bg)', color: 'var(--text-2)' }}>
        아직 쪽지가 없어요
      </span>
    )
  return (
    <span className="tag" style={{ background: 'var(--bg)', color: 'var(--text-2)' }}>
      <Lock size={14} aria-hidden="true" />
      <span>
        쪽지 <b>{notes.length}</b>개 잠김
      </span>
    </span>
  )
}
