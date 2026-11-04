import { DOCS, EFFECTIVE_DATE } from '../legal.js'
import './LegalDoc.css'

// 약관 본문 (legal.js의 문단·목록을 그대로 글자로 그린다)
export default function LegalDoc({ doc }) {
  const { sections } = DOCS[doc]
  return (
    <div className="legal">
      <p className="legal__date">시행일 {EFFECTIVE_DATE}</p>
      {sections.map((s, i) => (
        <section key={i} className="legal__section">
          {s.h && <h2 className="legal__h">{s.h}</h2>}
          {s.body.map((b, j) =>
            typeof b === 'string' ? (
              <p key={j} className="legal__p">
                {b}
              </p>
            ) : (
              <ul key={j} className="legal__list">
                {b.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          )}
        </section>
      ))}
    </div>
  )
}
