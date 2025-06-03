var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const cors = require('cors');

const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}

const dbPath = path.join(dbDir, 'sqlite.db');
var db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('無法開啟資料庫:', err.message);
  } else {
    console.log('成功連接到 SQLite 資料庫');
    db.run(`CREATE TABLE IF NOT EXISTS history_price (
      id INTEGER PRIMARY KEY,
      year INTEGER,
      month INTEGER,
      date INTEGER,
      price INTEGER
    )`, (err) => {
      if (err) {
        console.error('建立 table 發生錯誤:', err.message);
      } else {
        db.get('SELECT COUNT(*) as count FROM history_price', (err, row) => {
          if (err) {
            console.error('查詢 table 發生錯誤:', err.message);
          } else if (row.count === 0) {
            const stmt = db.prepare('INSERT INTO history_price (id, year, month, date, price) VALUES (?, ?, ?, ?, ?)');
            const data = [
              [1, 2017, 7, 13, 410],
              [2, 2020, 12, 17, 429],
              [3, 2023, 1, 3, 429],
              [4, 2023, 5, 25, 429],
              [5, 2023, 6, 16, 465],
              [6, 2023, 6, 21, 410],
              [7, 2023, 8, 15, 465],
              [8, 2023, 9, 6, 449],
              [9, 2023, 10, 30, 465],
              [10, 2024, 3, 8, 449],
              [11, 2024, 3, 19, 465],
              [12, 2024, 8, 2, 459],
            ];
            for (const row of data) {
              stmt.run(row);
            }
            stmt.finalize();
            console.log('已插入預設歷史價格資料');
          }
        });
      }
    });
  }
});

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// 顯示所有歷史價格資料
app.get('/api/price', (req, res) => {
  db.all('SELECT * FROM history_price', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 以 GET 查詢某年所有價格
app.get('/api', (req, res) => {
  const year = req.query.year;
  if (!year) {
    return res.status(400).json({ error: '請提供 year 參數' });
  }
  db.all('SELECT * FROM history_price WHERE year = ?', [year], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 以 POST 查詢某年所有價格
app.post('/api', (req, res) => {
  const year = req.body.year;
  if (!year) {
    return res.status(400).json({ error: '請提供 year 參數' });
  }
  db.all('SELECT * FROM history_price WHERE year = ?', [year], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// 新增插入資料的 API
app.post('/api/insert', (req, res) => {
  const { year, month, date, price } = req.body;
  if (!year || !month || !date || !price) {
    return res.status(400).send('請完整填寫 year, month, date, price');
  }
  db.run(
    'INSERT INTO history_price (year, month, date, price) VALUES (?, ?, ?, ?)',
    [year, month, date, price],
    function (err) {
      if (err) {
        return res.status(500).send('新增失敗: ' + err.message);
      }
      res.send('新增成功！ID: ' + this.lastID);
    }
  );
});

app.set('port', 3002);

const server = app.listen(3002, () => {
  console.log('伺服器已啟動，埠號 3002');
});

module.exports = app;
