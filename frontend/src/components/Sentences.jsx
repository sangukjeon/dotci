import { Children, Fragment, isValidElement } from 'react'

// 문장 단위로 줄을 바꾸는 글자 묶음.
// 문구 안의 '\n'을 "문장 경계"로 보고, 각 문장을 한 덩어리(inline-block)로 감싼다.
//  - 한 줄에 다 들어가면 → 그대로 한 줄
//  - 넘치면 → 문장 중간이 아니라 문장이 끝나는 곳에서 다음 줄로
// 예) <Sentences>{'초대 코드를 확인해 주세요.\n학과 대표에게 받은 코드를 넣어요.'}</Sentences>
//     <Sentences>알림을 켠 <b>3명</b>에게 보내요.{'\n'}보낸 뒤에는 취소할 수 없어요.</Sentences>
export default function Sentences({ children }) {
  const groups = [[]]
  Children.toArray(children).forEach((child) => {
    if (typeof child === 'string' || typeof child === 'number') {
      String(child)
        .split('\n')
        .forEach((part, i) => {
          if (i > 0) groups.push([])
          if (part) groups[groups.length - 1].push(part)
        })
    } else if (isValidElement(child) || child != null) {
      groups[groups.length - 1].push(child)
    }
  })
  const filled = groups.filter((g) => g.length > 0)
  if (filled.length <= 1) return <>{children}</>
  return filled.map((g, i) => (
    <Fragment key={i}>
      {i > 0 && ' '}
      <span className="sentence">{g}</span>
    </Fragment>
  ))
}
