const db = require('../lib/db');
const { formatAttendanceTimes } = require('../lib/utils');
const { ethers } = require('ethers');
const moment = require('moment-timezone');

// 스마트컨트랙트 설정
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const contractJson = require('../abi/Attendance.json');
const ABI = contractJson.abi;
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

// 출석 세션 시작
exports.startAttendanceSession = async (req, res) => {
  const { courseId } = req.params;
  const pId = req.session.userId;

  try {
    await db.query(
      `INSERT INTO attendance_sessions (course_id, lecture_date, started_at, created_by) VALUES (?, CURDATE(), NOW(), ?)`,
      [courseId, pId]
    );
    res.json({ success: true, message: '출석 세션 시작됨' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '출석 세션 시작 실패' });
  }
};

// 출석 세션 종료
exports.endAttendanceSession = async (req, res) => {
  const { courseId } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT session_id FROM attendance_sessions WHERE course_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1`,
      [courseId]
    );

    if (rows.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: '진행 중인 세션이 없습니다' });
    }

    await db.query(
      `UPDATE attendance_sessions SET ended_at = NOW() WHERE session_id = ?`,
      [rows[0].session_id]
    );

    res.json({ success: true, message: '출석 세션 종료됨' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '출석 세션 종료 실패' });
  }
};

// 출석 제출 API
exports.submitAttendance = async (req, res) => {
  const { studentId, attendance_time, wallet_address, signed_data } = req.body;
  const courseId = req.params.courseId;

  let time;
  if (attendance_time) {
    if (attendance_time.endsWith('Z') || attendance_time.includes('T')) {
      // ISO8601 (UTC or local) → KST로 변환
      time = moment(attendance_time).tz('Asia/Seoul');
    } else {
      // 그냥 날짜 문자열이면 (KST 기준 입력)
      time = moment(attendance_time, 'YYYY-MM-DD HH:mm:ss');
    }
  } else {
    time = moment().tz('Asia/Seoul');
  }

  const mysqlDatetime = time.format('YYYY-MM-DD HH:mm:ss');

  if (!studentId || !courseId || !wallet_address || !signed_data) {
    return res.status(400).json({ success: false, message: '필수 항목 누락' });
  }

  try {
    // DB에 등록된 student의 wallet_address 확인
    const [studentRows] = await db.query(
      `SELECT wallet_address FROM users WHERE user_id = ?`,
      [studentId]
    );

    if (studentRows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: '학생 정보를 찾을 수 없습니다.' });
    }

    const registeredAddress = studentRows[0].wallet_address.toLowerCase();
    if (wallet_address.toLowerCase() !== registeredAddress) {
      return res.status(403).json({
        success: false,
        message: '등록된 지갑 주소와 일치하지 않습니다.',
      });
    }

    // 서명 검증: reconstruct message
    // const message = `${studentId}-${courseId}-${mysqlDatetime}`;
    // console.log(message);
    // const recoveredAddress = ethers
    //   .verifyMessage(message, signed_data)
    //   .toLowerCase();

    // if (recoveredAddress !== wallet_address.toLowerCase()) {
    //   return res
    //     .status(403)
    //     .json({ success: false, message: '서명 검증 실패' });
    // }

    // 출석 세션 조회
    const [sessions] = await db.query(
      `SELECT * FROM attendance_sessions
       WHERE course_id = ?
       ORDER BY started_at DESC`,
      [courseId]
    );

    const timeMoment = moment(mysqlDatetime, 'YYYY-MM-DD HH:mm:ss');

    const validSession = sessions.find((session) => {
      const start = moment(session.started_at).tz('Asia/Seoul');
      const end = session.ended_at
        ? moment(session.ended_at).tz('Asia/Seoul')
        : moment().tz('Asia/Seoul');

      return timeMoment.isSameOrAfter(start) && timeMoment.isSameOrBefore(end);
    });

    if (!validSession) {
      return res.status(403).json({
        success: false,
        message: '현재 출석 가능한 세션이 없습니다.',
      });
    }

    // 중복 출석 방지
    const [existing] = await db.query(
      `SELECT * FROM attendance_logs WHERE student_id = ? AND course_id = ? AND session_id = ?`,
      [studentId, courseId, validSession.session_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: '이미 출석이 제출되었습니다.',
      });
    }

    // 출석 로그 기록
    const [result] = await db.query(
      `INSERT INTO attendance_logs 
        (student_id, wallet_address, signed_data, course_id, session_id, attendance_time, is_time_valid, is_valid, chain_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, false, false)`,
      [
        studentId,
        wallet_address,
        signed_data,
        courseId,
        validSession.session_id,
        mysqlDatetime,
        true,
      ]
    );

    res.json({
      success: true,
      logId: result.insertId,
      isTimeValid: true,
      message: '출석이 정상적으로 기록되었습니다.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// 과목 전체 출석 로그 조회 API
exports.getCourseAttendance = async (req, res) => {
  const { courseId } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT a.log_id, a.student_id, a.wallet_address, a.signed_data,
              u.name AS studentName, a.attendance_time, a.tx_hash,
              a.is_valid, a.is_time_valid
       FROM attendance_logs a
       JOIN users u ON a.student_id = u.user_id
       WHERE a.course_id = ?
       ORDER BY a.attendance_time DESC`,
      [courseId]
    );

    res.json(formatAttendanceTimes(rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// 특정 학생 출석 로그 조회 API
exports.getStudentAttendance = async (req, res) => {
  const { courseId, studentId } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT log_id, wallet_address, signed_data, attendance_time,
              tx_hash, is_valid, is_time_valid
       FROM attendance_logs
       WHERE course_id = ? AND student_id = ?
       ORDER BY attendance_time DESC`,
      [courseId, studentId]
    );

    res.json(formatAttendanceTimes(rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// 검증되지 않은 출석 로그 목록 (교수 확인용)
exports.getUnverifiedLogs = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT al.log_id, al.wallet_address, al.signed_data,
              u.name as student_name, al.attendance_time,
              al.tx_hash, al.is_time_valid
       FROM attendance_logs al
       JOIN users u ON al.student_id = u.user_id
       WHERE al.course_id = ? AND al.is_valid = false`,
      [req.params.courseId]
    );

    res.json(formatAttendanceTimes(rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

// 출석 검증 + 블록체인 기록 API (교수용)
exports.verifySessionAttendance = async (req, res) => {
  const { courseId } = req.params;

  try {
    // 최근 종료된 출석 세션 조회
    const [sessions] = await db.query(
      `SELECT * FROM attendance_sessions
       WHERE course_id = ? AND ended_at IS NOT NULL
       ORDER BY ended_at DESC LIMIT 1`,
      [courseId]
    );

    const session = sessions[0];
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: '출석 세션이 없습니다.' });
    }

    // 해당 세션 시간 내 미검증 출석 로그 조회
    const [logs] = await db.query(
      `SELECT * FROM attendance_logs
       WHERE course_id = ? AND is_valid = false`,
      [courseId]
    );

    if (logs.length === 0) {
      return res.json({
        success: true,
        message: '검증할 출석 로그가 없습니다.',
      });
    }

    const start = moment(session.started_at).tz('Asia/Seoul');
    const end = moment(session.ended_at).tz('Asia/Seoul');

    const validLogs = logs.filter((log) => {
      const att = moment(log.attendance_time).tz('Asia/Seoul');
      return att.isBetween(start, end, null, '[]');
    });

    if (validLogs.length === 0) {
      return res.json({
        success: true,
        message: '검증할 출석 로그가 없습니다.',
      });
    }

    const results = [];

    for (const log of logs) {
      const tx = await contract.markAttendance(
        log.course_id,
        `log:${log.log_id}`
      );

      await db.query(
        `UPDATE attendance_logs
         SET is_valid = true, tx_hash = ?, chain_verified = true, verified_at = NOW()
         WHERE log_id = ?`,
        [tx.hash, log.log_id]
      );

      results.push({ logId: log.log_id, txHash: tx.hash });
    }

    res.json({ success: true, verifiedLogs: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '출석 검증 실패' });
  }
};
