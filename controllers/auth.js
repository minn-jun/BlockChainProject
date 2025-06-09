const bcrypt = require('bcrypt');
const db = require('../lib/db');

// 회원가입
const registerUser = async (req, res, role) => {
  const { loginid, password, name, email, walletAddress } = req.body;

  if (!loginid || !password || !name || !walletAddress) {
    return res.status(400).json({ success: false, message: '필수 값 누락' });
  }

  try {
    const [existing] = await db.query(
      'SELECT user_id FROM users WHERE loginid = ? OR wallet_address = ?',
      [loginid, walletAddress || '']
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: '이미 존재하는 로그인 ID 또는 지갑 주소',
      });
    }

    const hashedPw = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO users (loginid, hashed_pw, name, role, email, wallet_address) VALUES (?, ?, ?, ?, ?, ?)',
      [loginid, hashedPw, name, role, email || null, walletAddress || null]
    );

    res.json({
      success: true,
      message: `${role} 회원가입 완료`,
      userId: result.insertId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// 학생 회원가입
exports.registerStudent = (req, res) => registerUser(req, res, 'student');

// 교수 회원가입
exports.registerProfessor = (req, res) => registerUser(req, res, 'professor');

// 관리자 회원가입
exports.registerAdmin = (req, res) => registerUser(req, res, 'admin');

// 로그인
exports.login = async (req, res) => {
  const { loginid, password } = req.body;

  if (!loginid || !password) {
    return res
      .status(400)
      .json({ success: false, message: '로그인 ID와 비밀번호 필요' });
  }

  try {
    const [users] = await db.query(
      'SELECT user_id, hashed_pw, role FROM users WHERE loginid = ?',
      [loginid]
    );

    const user = users[0];
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: '존재하지 않는 사용자입니다.' });
    }

    const match = await bcrypt.compare(password, user.hashed_pw);
    if (!match) {
      return res
        .status(401)
        .json({ success: false, message: '비밀번호 불일치' });
    }

    req.session.userId = user.user_id;
    req.session.role = user.role;

    res.json({
      success: true,
      message: '로그인 성공',
      userId: user.user_id,
      role: user.role,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
};

// 로그아웃
exports.logout = (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: '로그아웃 완료' });
};
