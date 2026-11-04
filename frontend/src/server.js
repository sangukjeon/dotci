// 화면이 부르는 서버 함수는 모두 여기서 가져간다.
//  - 체험판(VITE_DEMO=1): 브라우저 안의 가짜 서버(mock/server.js)
//  - 그 밖: 진짜 서버(realServer.js). 아직 서버에 없는 확장 기능
//    (학과 대항전, 멘토링 코스, 과목별 팁, 신고, 통계, 전시 화면)은 가짜 서버 그대로 쓴다.

import { IS_DEMO } from './demo.js'
import * as mock from './mock/server.js'
import * as real from './realServer.js'

const server = IS_DEMO ? mock : { ...mock, ...real }

export const {
  // 로그인
  me, login, checkInvite, checkPassword, signup, logout, withdraw, guestLogin,
  // 장소·쪽지
  withMockPlaces, placeSummary, listNotes, unlock, resolveCode, writeNote, addHelpful, removeHelpful, deleteNote,
  // 관리자·도감
  hideNote, unhideNote, adminListNotes, collection,
  // 공지 푸시 알림
  pushKey, pushSubscribe, pushUnsubscribe, sendAnnouncement, listAnnouncements, deleteAnnouncement,
  // 아직 목업인 확장 기능
  BOOTH_CODE, REPORT_REASONS, reportNote, reportedByMe, reportCount, departmentRanking, adminStats,
  listCourses, getCourse, listSubjects, nearbyHint, isCompleteMock, displayFeed, addVisitorNote,
} = server

// 게스트 모드는 체험판에서만 (진짜 서버에는 아직 없음)
export const GUEST_ENABLED = IS_DEMO
