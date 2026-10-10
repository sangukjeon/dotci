// 10/11 정적 화면용 가짜 데이터. 10/12에 /api/places/{id}/notes, /unlock 이 생기면 지운다.
//
// 서버 규칙(CLAUDE.md 2장 규칙 8)을 흉내 낸다:
//  - MOCK_LOCKED_NOTES: 잠긴 상태 응답. content 키가 아예 없다.
//  - MOCK_CONTENTS: 해제에 성공했을 때만 서버가 보내 줄 본문.

export const MOCK_LOCKED_NOTES = {
  'lib-3f': [
    { id: 1, category: 'tip', author_grade: 4, helpful_count: 12, course_name: null, hint: null },
    { id: 2, category: 'study', author_grade: 3, helpful_count: 8, course_name: null, hint: '콘센트 명당' },
    { id: 3, category: 'food', author_grade: 2, helpful_count: 3, course_name: null, hint: '시험기간 필수' },
    { id: 4, category: 'class', author_grade: 3, helpful_count: 5, course_name: '자료구조', hint: null },
    { id: 5, category: 'tip', author_grade: 2, helpful_count: 0, course_name: null, hint: null },
    { id: 6, category: 'warn', author_grade: 4, helpful_count: 21, course_name: null, hint: '문 조심' },
    { id: 7, category: 'study', author_grade: 1, helpful_count: 1, course_name: null, hint: null },
  ],
  cafeteria: [
    { id: 11, category: 'food', author_grade: 3, helpful_count: 9, course_name: null, hint: '수요일 특식' },
    { id: 12, category: 'warn', author_grade: 2, helpful_count: 4, course_name: null, hint: null },
  ],
}

export const MOCK_CONTENTS = {
  1: '9시 전에 오면 창가 자리 거의 다 비어 있어요',
  2: '콘센트는 창가 세 번째 자리만 돼요. 나머지는 고장',
  3: '1층 자판기 옆 컵라면이 제일 싸요',
  4: '앞자리 앉으면 교수님이 출석 대신 얼굴로 기억해요',
  5: '사물함은 학기 첫 주에 신청해야 남아요',
  6: '뒷문 닫힐 때 소리 엄청 커요. 살살 닫아 주세요',
  7: '조용한 자리는 안쪽 구석 책장 뒤',
  11: '수요일은 돈가스 나와서 11시 반 전에 가야 해요',
  12: '12시 10분부터 줄이 계단까지 가요',
}
