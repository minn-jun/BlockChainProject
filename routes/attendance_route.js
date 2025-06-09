const express = require('express');
const router = express.Router();
const { isLoggedIn, hasRole, isSelfOrProfessor } = require('../lib/utils');
const attendance = require('../controllers/attendance');

// 로그인 필수
router.use(isLoggedIn);

// 출석 세션 시작
router.post(
  '/session/:courseId/start',
  hasRole(['professor']),
  attendance.startAttendanceSession
);

// 출석 세션 종료
router.post(
  '/session/:courseId/end',
  hasRole(['professor']),
  attendance.endAttendanceSession
);

// 학생만 출석 제출
router.post(
  '/submit/:courseId',
  hasRole(['student']),
  attendance.submitAttendance
);

// 교수만 미검증 출석 조회
router.get(
  '/unverified/:courseId',
  hasRole(['professor']),
  attendance.getUnverifiedLogs
);

// 교수만 출석 검증
router.post(
  '/verify/:courseId',
  hasRole(['professor']),
  attendance.verifySessionAttendance
);

// 학생·교수 모두 과목별 출석 조회
router.get(
  '/:courseId',
  hasRole(['student', 'professor']),
  attendance.getCourseAttendance
);

// 교수 또는 본인만 개별 출석 조회
router.get(
  '/:courseId/:studentId',
  isSelfOrProfessor,
  attendance.getStudentAttendance
);

module.exports = router;
