const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取设置
router.get('/', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新设置
router.put('/', (req, res) => {
  try {
    const { reminderDays } = req.body;
    db.prepare('UPDATE settings SET reminder_days = ? WHERE id = 1').run(reminderDays || 3);
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
