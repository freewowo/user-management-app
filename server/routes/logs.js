const express = require('express');
const router = express.Router();
const db = require('../db');

// 记录日志的辅助函数
function logOperation(username, module, action, targetId, targetName, detail, ipAddress) {
  try {
    db.prepare(`
      INSERT INTO operation_logs (username, module, action, target_id, target_name, detail, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(username, module, action, targetId || null, targetName || null, detail || null, ipAddress || null);
  } catch (error) {
    console.error('记录日志失败:', error);
  }
}

// 获取日志列表
router.get('/', (req, res) => {
  try {
    const { username, module, action, startDate, endDate, keyword, page = 1, pageSize = 20 } = req.query;
    
    let sql = 'SELECT * FROM operation_logs';
    let countSql = 'SELECT COUNT(*) as total FROM operation_logs';
    const conditions = [];
    const params = [];

    if (username) {
      conditions.push('username = ?');
      params.push(username);
    }

    if (module) {
      conditions.push('module = ?');
      params.push(module);
    }

    if (action) {
      conditions.push('action = ?');
      params.push(action);
    }

    if (startDate) {
      conditions.push('created_at >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('created_at <= ?');
      params.push(endDate + ' 23:59:59');
    }

    if (keyword) {
      conditions.push('(target_name LIKE ? OR detail LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      sql += whereClause;
      countSql += whereClause;
    }

    // 获取总数
    const total = db.prepare(countSql).get(...params).total;

    // 分页查询
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    
    const logs = db.prepare(sql).all(...params, parseInt(pageSize), offset);

    res.json({
      success: true,
      data: {
        list: logs,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取操作类型统计
router.get('/stats', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT module, action, COUNT(*) as count 
      FROM operation_logs 
      GROUP BY module, action 
      ORDER BY count DESC
    `).all();

    const recentStats = db.prepare(`
      SELECT 
        COUNT(*) as totalToday,
        SUM(CASE WHEN created_at >= datetime('now', 'localtime', '-1 hour') THEN 1 ELSE 0 END) as lastHour
      FROM operation_logs 
      WHERE created_at >= datetime('now', 'localtime', 'start of day')
    `).get();

    res.json({ success: true, data: { stats, recentStats } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 清空日志
router.delete('/clear', (req, res) => {
  try {
    const { beforeDate } = req.query;
    
    if (beforeDate) {
      db.prepare('DELETE FROM operation_logs WHERE created_at < ?').run(beforeDate);
    } else {
      db.prepare('DELETE FROM operation_logs').run();
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
module.exports.logOperation = logOperation;
