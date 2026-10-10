import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BadgeCheck, EyeOff, Flag, Heart, Trash2, X } from 'lucide-react'
import { CATEGORIES, gradeLabel } from '../categories.js'
import { useAuth } from '../auth.jsx'
import { REPORT_REASONS, reportedByMe, reportNote } from '../mock/server.js' // TODO(11/5): POST /api/notes/{id}/report
import './NoteModal.css'

function timeAgo(iso) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

// 열린 쪽지를 누르면 제자리에서 커지는 확대 화면 (카드와 같은 layoutId)
export default function NoteModal({ note, onClose, onHelpful, onDelete, onHide, onReported }) {
  const { user } = useAuth()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [reason, setReason] = useState(null)
  const [reported, setReported] = useState(() => reportedByMe(note.id))
  const cat = CATEGORIES[note.category] ?? CATEGORIES.tip
  const liked = note.liked_by_me

  const run = (fn) => async () => {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="nmodal" role="dialog" aria-modal="true" aria-label={`${cat.label} 쪽지`}>
      <motion.div
        className="nmodal__dim"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.article layoutId={`note-${note.id}`} className="nmodal__card" transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
        <header className="nmodal__head">
          <span className="ncard__chip nmodal__chip" style={{ background: cat.bg, color: cat.text }}>
            {note.course_name ? `${cat.label} · ${note.course_name}` : cat.label}
          </span>
          {note.is_official && (
            <span className="tag" style={{ background: 'var(--primary-weak)', color: 'var(--primary-strong)' }}>
              <BadgeCheck size={14} aria-hidden="true" /> 공식
            </span>
          )}
          <button className="icon-btn nmodal__close" onClick={onClose} aria-label="닫기">
            <X size={22} aria-hidden="true" />
          </button>
        </header>

        <p className="nmodal__text">{note.content}</p>

        <p className="nmodal__author">
          {note.author_nickname} · {gradeLabel(note.author_grade)} · {note.author_department} · {timeAgo(note.created_at)}
        </p>

        <div className="nmodal__actions">
          <button
            className={liked ? 'nmodal__heart nmodal__heart--on' : 'nmodal__heart'}
            onClick={run(onHelpful)}
            disabled={busy || liked || note.is_mine}
            aria-pressed={liked}
          >
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                key={liked ? 'on' : 'off'}
                className="nmodal__heart-icon"
                initial={liked ? { scale: 2, rotate: -15, opacity: 0 } : false}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ duration: 0.25 }}
              >
                <Heart size={20} aria-hidden="true" />
              </motion.span>
            </AnimatePresence>
            {note.is_mine ? '내 쪽지' : '도움됐어요'}
            <b>{note.helpful_count}</b>
          </button>

          {note.is_mine &&
            (confirmDelete ? (
              <button className="nmodal__danger" onClick={run(onDelete)} disabled={busy}>
                정말 지울까요? 지우기
              </button>
            ) : (
              <button className="icon-btn nmodal__sub" onClick={() => setConfirmDelete(true)} aria-label="내 쪽지 지우기">
                <Trash2 size={20} aria-hidden="true" />
              </button>
            ))}
          {!note.is_mine && !user?.is_admin && (
            <button
              className="icon-btn nmodal__sub"
              onClick={() => setReporting(!reporting)}
              disabled={reported}
              aria-label={reported ? '이미 신고한 쪽지' : '이 쪽지 신고하기'}
              aria-expanded={reporting}
            >
              <Flag size={20} aria-hidden="true" />
            </button>
          )}
          {user?.is_admin && !note.is_mine && (
            <button className="icon-btn nmodal__sub" onClick={run(onHide)} disabled={busy} aria-label="이 쪽지 숨기기 (관리자)">
              <EyeOff size={20} aria-hidden="true" />
            </button>
          )}
        </div>

        {reporting && !reported && (
          <div className="nmodal__report">
            <p className="field__label">어떤 문제가 있나요?</p>
            <div className="chips" role="group" aria-label="신고 이유">
              {REPORT_REASONS.map((r) => (
                <button key={r} type="button" className="chip" aria-pressed={reason === r} onClick={() => setReason(r)}>
                  {r}
                </button>
              ))}
            </div>
            <p className="field__help">신고는 익명이에요. 3건이 모이면 쪽지가 자동으로 숨겨지고 관리자가 확인해요.</p>
            <button
              className="nmodal__danger nmodal__report-btn"
              disabled={!reason || busy}
              onClick={run(async () => {
                const result = await reportNote(note.id, reason)
                setReported(true)
                setReporting(false)
                onReported?.(result)
              })}
            >
              신고하기
            </button>
          </div>
        )}
      </motion.article>
    </div>
  )
}
