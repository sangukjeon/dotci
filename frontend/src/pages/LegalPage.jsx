import { Link } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import PageHeader from '../components/PageHeader.jsx'
import LegalDoc from '../components/LegalDoc.jsx'
import { DOCS } from '../legal.js'

// /terms, /privacy, /consent — 로그인 없이 누구나 볼 수 있다
export default function LegalPage({ doc }) {
  const { user } = useAuth()
  return (
    <main className="page">
      <PageHeader title={DOCS[doc].title} back={user ? '/' : '/login'} />
      <section className="page__section">
        <LegalDoc doc={doc} />
      </section>
      <LegalLinks />
    </main>
  )
}

// full: 내 정보처럼 세 가지를 모두 보여 줄 때 (수집·이용 동의 포함)
export function LegalLinks({ full = false }) {
  return (
    <nav className="legal-links" aria-label="약관">
      <Link to="/terms">이용약관</Link>
      <span aria-hidden="true">·</span>
      <Link to="/privacy">
        <b>개인정보처리방침</b>
      </Link>
      {full && (
        <>
          <span aria-hidden="true">·</span>
          <Link to="/consent">개인정보 수집·이용 동의</Link>
        </>
      )}
    </nav>
  )
}
