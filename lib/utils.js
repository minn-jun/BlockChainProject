const moment = require('moment-timezone');

// 로그인 상태 확인
exports.isLoggedIn = (req, res, next) => {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ success: false, message: '로그인 필요' });
  }
};

// 직위 체크
exports.hasRole = (allowedRoles) => {
  return (req, res, next) => {
    if (
      req.session &&
      req.session.role &&
      allowedRoles.includes(req.session.role)
    ) {
      next();
    } else {
      res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
  };
};

// 학생 본인 혹은 교수인지 확인
exports.isSelfOrProfessor = (req, res, next) => {
  const requestedStudentId = parseInt(req.params.studentId, 10);
  const sessionUserId = req.session.userId;
  const userRole = req.session.role;

  if (userRole === 'professor' || userRole === 'admin') {
    return next(); // 교수나 관리자면 허용
  }

  if (userRole === 'student' && requestedStudentId === sessionUserId) {
    return next(); // 학생이고 자신의 정보면 허용
  }

  return res.status(403).json({ success: false, message: '권한이 없습니다.' });
};

exports.formatAttendanceTimes = (logs) => {
  if (!Array.isArray(logs)) return []; // 안전장치

  return logs.map((log) => {
    const formatted = {
      ...log,
      attendance_time: moment(log.attendance_time)
        .tz('Asia/Seoul')
        .format('YYYY-MM-DD HH:mm:ss'),
    };

    if (log.verified_at) {
      formatted.verified_at = moment(log.verified_at)
        .tz('Asia/Seoul')
        .format('YYYY-MM-DD HH:mm:ss');
    }

    return formatted;
  });
};
