var express = require('express');
var router = express.Router();
const dbModule = require('../db');
const db = dbModule.db;

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

// 新增價格記錄
router.post('/api/records', function(req, res) {
  const { year, month, date, price } = req.body;
  db.run(
    'INSERT INTO history_price (year, month, date, price) VALUES (?, ?, ?, ?)',
    [year, month, date, price],
    function(err) {
      if (err) return res.status(500).send('新增失敗');
      res.send('新增成功');
    }
  );
});

// 修改價格記錄
router.put('/api/records/:id', function(req, res) {
  const { year, month, date, price } = req.body;
  db.run(
    'UPDATE history_price SET year=?, month=?, date=?, price=? WHERE id=?',
    [year, month, date, price, req.params.id],
    function(err) {
      if (err) return res.status(500).send('更新失敗');
      res.send('更新成功');
    }
  );
});

// 刪除價格記錄
router.delete('/api/records/:id', function(req, res) {
  const id = parseInt(req.params.id, 10);
  console.log('實際操作的資料庫路徑:', dbModule.dbPath);
  db.run(
      'DELETE FROM history_price WHERE id=?',
      [id],
      function(err) {
        if (err) return res.status(500).send('刪除失敗');
        if (this.changes === 0) {
          return res.status(404).send('找不到該資料');
        }
        res.send('刪除成功');
      }
  );
});

// 取得所有價格記錄
router.get('/api/price', function(req, res) {
  db.all('SELECT * FROM history_price ORDER BY id', [], function(err, rows) {
    if (err) return res.status(500).send('查詢失敗');
    res.json(rows);
  });
});
module.exports = router;
