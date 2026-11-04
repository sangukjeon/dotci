import { useCallback, useEffect, useState } from 'react'
import { Megaphone, Trash2 } from 'lucide-react'
import { deleteAnnouncement, listAnnouncements, sendAnnouncement } from '../server.js'
import { useToast } from '../toast.jsx'
import Sentences from './Sentences.jsx'

const TITLE_MAX = 40
const BODY_MAX = 120

const ERRORS = {
  banned_word: '쓸 수 없는 낱말이 들어 있어요.',
  bad_url: '연결 주소는 /place/w16-union 처럼 "/"로 시작하는 앱 안 주소만 돼요.',
  push_disabled: '서버에 알림 키가 설정되지 않았어요. (VAPID 환경변수 확인)',
}

const timeLabel = (iso) =>
  new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })

// 관리자 "공지" 탭: 알림을 켠 모든 사람에게 폰 알림 보내기
export default function AdminAnnounce() {
  const toast = useToast()
  const [form, setForm] = useState({ title: '', body: '', url: '/' })
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState({ subscribers: 0, items: [] })
  const [removing, setRemoving] = useState(null) // 지울지 묻고 있는 공지 id

  const load = useCallback(() => {
    listAnnouncements().then(setHistory).catch(() => {})
  }, [])
  useEffect(load, [load])

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const ready = form.title.trim() && form.body.trim()

  const send = async () => {
    setBusy(true)
    setError('')
    try {
      const r = await sendAnnouncement({ ...form, url: form.url.trim() || '/' })
      toast(`${r.sent}명에게 공지를 보냈어요`, { success: true })
      setForm({ title: '', body: '', url: '/' })
      load()
    } catch (err) {
      setError(ERRORS[err.code] ?? '보내지 못했어요.\n잠시 뒤 다시 해 주세요.')
    } finally {
      setBusy(false)
      setConfirming(false)
    }
  }

  const remove = async (id) => {
    try {
      await deleteAnnouncement(id)
      toast('공지 기록을 지웠어요')
      load()
    } catch {
      toast('지우지 못했어요. 잠시 뒤 다시 해 주세요')
    } finally {
      setRemoving(null)
    }
  }

  return (
    <section className="announce">
      <p className="announce__lead">
        <Sentences>
          알림을 켠 <b>{history.subscribers}명</b>에게 폰 알림으로 보내요.{'\n'}보낸 뒤에는 취소할 수 없어요.
        </Sentences>
      </p>

      <div className="announce__card">
      <label className="field">
        <span className="announce__label-row">
          <span className="field__label">제목</span>
          <span className="announce__count">
            {form.title.length}/{TITLE_MAX}
          </span>
        </span>
        <input className="input" value={form.title} maxLength={TITLE_MAX} onChange={set('title')} placeholder="예: 축제 주간 쪽지 이벤트" />
      </label>
      <label className="field">
        <span className="announce__label-row">
          <span className="field__label">내용</span>
          <span className="announce__count">
            {form.body.length}/{BODY_MAX}
          </span>
        </span>
        <textarea
          className="textarea"
          rows={3}
          value={form.body}
          maxLength={BODY_MAX}
          onChange={set('body')}
          placeholder="예: 학생회관 책상에 축제 꿀팁 쪽지가 열렸어요. 들러 보세요!"
        />
      </label>
      <label className="field">
        <span className="field__label">알림을 누르면 열 화면</span>
        <input className="input" value={form.url} onChange={set('url')} placeholder="/" />
        <span className="field__help">
          <Sentences>
            "/"는 지도예요.{'\n'}예: /place/w16-union (학생회관 책상), /meals (학식)
          </Sentences>
        </span>
      </label>
      </div>

      {error && (
        <p className="field__error" role="alert">
          <Sentences>{error}</Sentences>
        </p>
      )}

      {confirming ? (
        <div className="announce__confirm">
          <p>
            <b>{history.subscribers}명</b>에게 지금 보낼까요?
          </p>
          <div className="announce__confirm-actions">
            <button type="button" className="btn-sub" onClick={() => setConfirming(false)} disabled={busy}>
              취소
            </button>
            <button type="button" className="btn-main" onClick={send} disabled={busy}>
              {busy ? '보내는 중…' : '보내기'}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn-main" onClick={() => setConfirming(true)} disabled={!ready}>
          <Megaphone size={20} aria-hidden="true" /> 공지 보내기
        </button>
      )}

      <h2 className="announce__h">보낸 공지</h2>
      <ul className="announce__list">
        {history.items.map((a) => (
          <li key={a.id} className="announce__item">
            <div className="announce__item-main">
              <span className="announce__item-title">{a.title}</span>
              <span className="announce__item-body">{a.body}</span>
              <span className="announce__item-meta">
                {timeLabel(a.created_at)} · {a.sent}명에게 보냄 · {a.url}
              </span>
              {removing === a.id && (
                <div className="announce__remove">
                  <p><Sentences>기록만 지워져요.{'\n'}이미 폰에 간 알림은 그대로예요.</Sentences></p>
                  <div className="announce__remove-actions">
                    <button type="button" className="btn-sub" onClick={() => setRemoving(null)}>
                      취소
                    </button>
                    <button type="button" className="announce__remove-btn" onClick={() => remove(a.id)}>
                      지우기
                    </button>
                  </div>
                </div>
              )}
            </div>
            {removing !== a.id && (
              <button
                type="button"
                className="icon-btn announce__trash"
                onClick={() => setRemoving(a.id)}
                aria-label={`"${a.title}" 공지 기록 지우기`}
              >
                <Trash2 size={18} aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
        {history.items.length === 0 && <li className="announce__empty">아직 보낸 공지가 없어요</li>}
      </ul>
    </section>
  )
}
