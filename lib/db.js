const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function testConnection() {
  try {
    const [rows] = await db.query('SELECT 1');
    console.log('DB 연결 성공');
  } catch (err) {
    console.error('DB 연결 실패:', err);
    process.exit(1); // 연결 실패 시 앱 종료 옵션
  }
}

testConnection();

module.exports = db;
