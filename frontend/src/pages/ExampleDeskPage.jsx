import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, LayoutGroup } from 'motion/react'
import { ChevronLeft, CircleCheck, Info, Lock, MapPin } from 'lucide-react'
import { useToast } from '../toast.jsx'
import Desk from '../components/Desk.jsx'
import NoteModal from '../components/NoteModal.jsx'
import './DeskPage.css'

// 서버가 깨어나는 동안 둘러보는 예시 책상 (로그인·서버 없이 화면 안에서만 동작)
// 쪽지는 화면 확인용 예시이고 실제 선배 팁이 아니다.
const NOW = new Date().toISOString()
const EXAMPLE_NOTES = [
  { id: 'ex1', category: 'tip', author_grade: 4, helpful_count: 12, hint: '창가 명당', content: '9시 전에 오면 창가 자리 거의 다 비어 있어요', author_nickname: '열람실지박령', author_department: '컴퓨터공학과' },
  { id: 'ex2', category: 'study', author_grade: 3, helpful_count: 8, hint: '콘센트 명당', content: '콘센트는 창가 세 번째 자리만 돼요. 나머지는 고장', author_nickname: '삼학년', author_department: '전자공학과' },
  { id: 'ex3', category: 'class', author_grade: 3, helpful_count: 5, course_name: '자료구조', content: '앞자리 앉으면 교수님이 출석 대신 얼굴로 기억해요', author_nickname: '삼학년', author_department: '전자공학과' },
  { id: 'ex4', category: 'food', author_grade: 2, helpful_count: 3, hint: '시험기간 필수', content: '1층 자판기 옆 컵라면이 제일 싸요', author_nickname: '학식러버', author_department: '경영학과' },
  { id: 'ex5', category: 'warn', author_grade: 4, helpful_count: 21, hint: '문 조심', content: '뒷문 닫힐 때 소리 엄청 커요. 살살 닫아 주세요', author_nickname: '열람실지박령', author_department: '컴퓨터공학과' },
  { id: 'ex6', category: 'tip', author_grade: 2, helpful_count: 0, content: '사물함은 학기 첫 주에 신청해야 남아요', author_nickname: '학식러버', author_department: '경영학과' },
].map((n) => ({ course_name: null, hint: null, is_official: false, is_mine: false, liked_by_me: false, created_at: NOW, ...n }))

// 잠긴 면에는 본문을 넣지 않는다 (실제 서버와 같은 모양)
const lockedView = (n) => ({
  id: n.id,
  category: n.category,
  author_grade: n.author_grade,
  helpful_count: n.helpful_count,
  course_name: n.course_name,
  hint: n.hint,
  is_official: n.is_official,
  created_at: n.created_at,
  locked: true,
})

export default function ExampleDeskPage({ waking }) {
  const toast = useToast()
  const [unlocked, setUnlocked] = useState(false)
  const [notes, setNotes] = useState(() => EXAMPLE_NOTES.map(lockedView))
  const [openNote, setOpenNote] = useState(null)

  const arrive = () => {
    setNotes(EXAMPLE_NOTES.map((n) => ({ ...n, locked: false })))
    setUnlocked(true)
    toast('도착했어요', { success: true })
  }

  const openCard = (note) => {
    if (note.locked) {
      toast('도착하면 열려요')
      return
    }
    setOpenNote(note)
  }

  // 예시라 서버에 보내지 않고 화면에서만 바꾼다
  const onHelpful = async () => {
    const liked = openNote.liked_by_me
    const patch = { liked_by_me: !liked, helpful_count: openNote.helpful_count + (liked ? -1 : 1) }
    setNotes((list) => list.map((n) => (n.id === openNote.id ? { ...n, ...patch } : n)))
    setOpenNote((n) => ({ ...n, ...patch }))
  }

  return (
    <main className="desk-page">
      <header className="top-bar">
        <Link to="/" className="icon-btn pressable" aria-label="처음 화면으로">
          <ChevronLeft size={26} aria-hidden="true" />
        </Link>
      </header>

      <section className="desk-page__head">
        <p className="desk-page__building">예시 책상 · W1 우송도서관</p>
        <h1 className="desk-page__name">우송도서관</h1>
        {unlocked ? (
          <span className="tag" style={{ background: 'var(--success-weak)', color: 'var(--success)' }}>
            <CircleCheck size={14} aria-hidden="true" /> 열었어요
          </span>
        ) : (
          <span className="tag" style={{ background: 'var(--bg)', color: 'var(--text-2)' }}>
            <Lock size={14} aria-hidden="true" />
            <span>
              쪽지 <b>{notes.length}</b>개 잠김
            </span>
          </span>
        )}
      </section>

      <LayoutGroup>
        <Desk notes={notes} newIds={unlocked ? notes.map((n) => n.id) : []} onOpen={openCard} />
        <AnimatePresence>
          {openNote && (
            <NoteModal key={openNote.id} note={openNote} onClose={() => setOpenNote(null)} onHelpful={onHelpful} />
          )}
        </AnimatePresence>
      </LayoutGroup>

      <div className="bottom-plate">
        <div className="banner banner--info desk-page__banner" role="status">
          <Info size={18} aria-hidden="true" />
          <span>
            {waking
              ? '서버를 깨우는 동안 둘러보는 예시 책상이에요. 쪽지는 화면 확인용 예시예요.'
              : '서버가 준비됐어요! 이제 진짜 DOTCI를 시작해 보세요.'}
          </span>
        </div>
        {!waking && (
          <Link to="/" className="btn-main">
            진짜 DOTCI 시작하기
          </Link>
        )}
        {!unlocked && (
          <button className={waking ? 'btn-main' : 'text-btn'} type="button" onClick={arrive}>
            <MapPin size={20} aria-hidden="true" /> 도착했다고 치고 열어 보기
          </button>
        )}
        {unlocked && waking && <p className="field__help">예시 쪽지를 눌러 읽어 보세요.</p>}
      </div>
    </main>
  )
}
