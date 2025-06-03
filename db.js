const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// 啟動時自動重建 db 資料夾與資料庫
const dbDir = path.join(__dirname, 'db');
const dbPath = path.join(dbDir, 'sqlite.db');

// 若 db 資料夾已存在則刪除（包含資料庫檔案）
if (fs.existsSync(dbDir)) {
  fs.rmSync(dbDir, { recursive: true, force: true });
}
// 重新建立 db 資料夾
fs.mkdirSync(dbDir);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('無法開啟資料庫:', err.message);
  } else {
    console.log('成功連接到 SQLite 資料庫');
  }
});

// 建立 history_price table（若不存在）
db.serialize(() => {
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
      // 檢查是否已有資料，若無則插入預設資料
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
});

module.exports = db;

