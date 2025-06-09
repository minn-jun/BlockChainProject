const db = require('./lib/db');

db.query('SELECT * FROM users LIMIT 1', (err, results) => {
  if (err) {
    console.error('쿼리 실패:', err);
  } else if (results.length === 0) {
    console.log('쿼리 성공, 하지만 데이터가 없습니다.');
  } else {
    console.log('쿼리 성공, 결과:', results);
  }

  db.end();
});
