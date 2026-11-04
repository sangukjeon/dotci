import { useState } from 'react'
import { Info } from 'lucide-react'
import Sheet from './Sheet.jsx'
import { CATEGORIES, CATEGORY_KEYS } from '../categories.js'
import * as server from '../server.js'
import './WriteSheet.css'

const MIN = 10
const MAX = 200
const HINT_MAX = 15

const ERRORS = {
  write_expired: '쓸 수 있는 시간(30분)이 지났어요.\n다시 도착 확인을 해 주세요.',
  length: `${MIN}~${MAX}자로 남겨 주세요.`,
  hint_length: `뒷면 한마디는 ${HINT_MAX}자까지예요.`,
  too_fast: '1분 뒤에 다시 남길 수 있어요.',
}

// 흔적 남기기: 아래에서 올라오는 쓰기 시트
export default function WriteSheet({ placeId, placeName, onClose, onWritten }) {
  const [category, setCategory] = useState(null)
  const [courseName, setCourseName] = useState('')
  const [content, setContent] = useState('')
  const [hint, setHint] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const length = content.trim().length

  const submit = async (e) => {
    e.preventDefault()
    if (!category) return setError('어떤 쪽지인지 골라 주세요.')
    if (length < MIN) return setError(`${MIN}자 이상 남겨 주세요.`)
    setBusy(true)
    setError('')
    try {
      const note = await server.writeNote(placeId, { category, content, course_name: courseName, hint })
      onWritten(note)
    } catch (err) {
      setError(
        err.code === 'banned_word'
          ? `"${err.word}" 같은 표현은 남길 수 없어요.\n다른 말로 바꿔 주세요.`
          : (ERRORS[err.code] ?? '저장하지 못했어요.\n잠시 후 다시 시도해 주세요.'),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title="흔적 남기기" onClose={onClose} labelId="write-title">
      <form onSubmit={submit} noValidate className="write">
        <p className="write__where">{placeName}에 붙여요</p>

        <div className="field">
          <span className="field__label" id="cat-label">
            어떤 쪽지인가요?
          </span>
          <div className="chips" role="group" aria-labelledby="cat-label">
            {CATEGORY_KEYS.map((key) => {
              const c = CATEGORIES[key]
              const on = category === key
              return (
                <button
                  type="button"
                  key={key}
                  className="chip"
                  aria-pressed={on}
                  onClick={() => setCategory(key)}
                  style={on ? { background: c.bg, borderColor: c.icon, color: c.text } : undefined}
                >
                  <c.Icon size={16} aria-hidden="true" style={{ color: c.icon }} /> {c.label}
                </button>
              )
            })}
          </div>
        </div>

        {category === 'class' && (
          <>
            <div className="banner banner--info" style={{ marginBottom: 'var(--sp-4)' }}>
              <Info size={18} aria-hidden="true" />
              <span>자리·출석·과제처럼 수업 듣는 데 도움 되는 팁을 남겨 주세요.{'\n'}교수님 평가는 남기지 않아요.</span>
            </div>
            <label className="field">
              <span className="field__label">과목명 (선택)</span>
              <input className="input" value={courseName} onChange={(e) => setCourseName(e.target.value)} maxLength={40} placeholder="자료구조" />
            </label>
          </>
        )}

        <label className="field">
          <span className="field__label">남길 말</span>
          <textarea
            className="textarea"
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX))}
            placeholder="다음 후배가 이 자리에서 알면 좋을 한 가지"
            rows={4}
          />
          <span className={length > 0 && length < MIN ? 'write__count write__count--short' : 'write__count'}>
            {length}/{MAX}
          </span>
        </label>

        <label className="field">
          <span className="field__label">뒷면 한마디 (선택)</span>
          <input
            className="input"
            value={hint}
            onChange={(e) => setHint(e.target.value.slice(0, HINT_MAX))}
            placeholder="시험기간 필수"
          />
          <span className="field__help">잠겨 있을 때 카드 뒷면에 보이는 말이에요.{'\n'}궁금하게 만들어 보세요.</span>
        </label>

        {error && (
          <p className="field__error" role="alert">
            {error}
          </p>
        )}

        <button className="btn-main write__submit" type="submit" disabled={busy}>
          {busy ? '붙이는 중...' : '붙이기'}
        </button>
      </form>
    </Sheet>
  )
}
