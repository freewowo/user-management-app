const express = require('express');
const router = express.Router();
const db = require('../db');
const { logOperation } = require('./logs');

// 获取所有用户
router.get('/', (req, res) => {
  try {
    const { keyword, source } = req.query;
    let sql = 'SELECT * FROM users';
    const conditions = [];
    const params = [];

    if (keyword) {
      conditions.push('(user_name LIKE ? OR phone LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (source) {
      conditions.push('source = ?');
      params.push(source);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY created_at DESC';

    const users = db.prepare(sql).all(...params);
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取单个用户
router.get('/:id', (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建用户（支持动态字段）
router.post('/', (req, res) => {
  try {
    const { userName, phone, email, gender, idCard, address, source, remark, company, position, wechat, vipLevel, customFields } = req.body;

    if (!userName) {
      return res.status(400).json({ success: false, message: '姓名必填' });
    }

    const result = db.prepare(`
      INSERT INTO users (user_name, phone, email, gender, id_card, address, source, remark, company, position, wechat, vip_level, custom_fields)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userName, 
      phone, 
      email || null, 
      gender || '未知', 
      idCard || null, 
      address || null, 
      source || null, 
      remark || null,
      company || null,
      position || null,
      wechat || null,
      vipLevel || null,
      JSON.stringify(customFields || {})
    );

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    logOperation(req.query.username || 'system', '用户管理', '新增用户', user.id, userName, null, req.ip);
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新用户（支持动态字段）
router.put('/:id', (req, res) => {
  try {
    const { userName, phone, email, gender, idCard, address, source, remark, company, position, wechat, vipLevel, customFields } = req.body;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    db.prepare(`
      UPDATE users SET 
        user_name = COALESCE(?, user_name),
        phone = COALESCE(?, phone),
        email = ?,
        gender = ?,
        id_card = ?,
        address = ?,
        source = ?,
        remark = ?,
        company = ?,
        position = ?,
        wechat = ?,
        vip_level = ?,
        custom_fields = COALESCE(?, custom_fields),
        updated_at = ?
      WHERE id = ?
    `).run(
      userName, 
      phone, 
      email || null, 
      gender || '未知', 
      idCard || null, 
      address || null, 
      source || null, 
      remark || null,
      company || null,
      position || null,
      wechat || null,
      vipLevel || null,
      customFields ? JSON.stringify(customFields) : null,
      now, 
      req.params.id
    );

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    logOperation(req.query.username || 'system', '用户管理', '更新用户', user.id, user.user_name, null, req.ip);
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除用户
router.delete('/:id', (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    if (user) {
      logOperation(req.query.username || 'system', '用户管理', '删除用户', user.id, user.user_name, null, req.ip);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取用户订单数
router.get('/:id/orders/count', (req, res) => {
  try {
    const result = db.prepare('SELECT COUNT(*) as count FROM orders WHERE user_id = ?').get(req.params.id);
    res.json({ success: true, data: result.count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
