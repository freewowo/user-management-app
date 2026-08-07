const express = require('express');
const router = express.Router();
const db = require('../db');

// 获取所有字段配置
router.get('/', (req, res) => {
  try {
    const { targetType } = req.query;
    let sql = 'SELECT * FROM field_configs';
    const params = [];

    if (targetType) {
      sql += ' WHERE target_type = ?';
      params.push(targetType);
    }

    sql += ' ORDER BY sort_order ASC';
    const fields = db.prepare(sql).all(...params);
    res.json({ success: true, data: fields });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建字段配置
router.post('/', (req, res) => {
  try {
    const { targetType, fieldKey, fieldLabel, fieldType, isRequired, placeholder, options, sortOrder } = req.body;

    if (!targetType || !fieldKey || !fieldLabel) {
      return res.status(400).json({ success: false, message: '必填字段缺失' });
    }

    // 检查是否已存在
    const exists = db.prepare('SELECT id FROM field_configs WHERE target_type = ? AND field_key = ?').get(targetType, fieldKey);
    if (exists) {
      return res.status(400).json({ success: false, message: '字段已存在' });
    }

    const result = db.prepare(`
      INSERT INTO field_configs (target_type, field_key, field_label, field_type, is_required, placeholder, options, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      targetType,
      fieldKey,
      fieldLabel,
      fieldType || 'text',
      isRequired ? 1 : 0,
      placeholder || '',
      JSON.stringify(options || []),
      sortOrder || 0
    );

    const field = db.prepare('SELECT * FROM field_configs WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, data: field });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新字段配置
router.put('/:id', (req, res) => {
  try {
    const { fieldLabel, fieldType, isRequired, placeholder, options, sortOrder, isActive } = req.body;

    db.prepare(`
      UPDATE field_configs SET 
        field_label = COALESCE(?, field_label),
        field_type = COALESCE(?, field_type),
        is_required = COALESCE(?, is_required),
        placeholder = COALESCE(?, placeholder),
        options = COALESCE(?, options),
        sort_order = COALESCE(?, sort_order),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(
      fieldLabel,
      fieldType,
      isRequired !== undefined ? (isRequired ? 1 : 0) : null,
      placeholder,
      options ? JSON.stringify(options) : null,
      sortOrder,
      isActive !== undefined ? (isActive ? 1 : 0) : null,
      req.params.id
    );

    const field = db.prepare('SELECT * FROM field_configs WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: field });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除字段配置
router.delete('/:id', (req, res) => {
  try {
    const field = db.prepare('SELECT * FROM field_configs WHERE id = ?').get(req.params.id);
    if (field && field.is_system) {
      return res.status(400).json({ success: false, message: '系统预设字段不能删除' });
    }
    db.prepare('DELETE FROM field_configs WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 批量更新排序
router.post('/sort', (req, res) => {
  try {
    const { items } = req.body;
    const updateSort = db.prepare('UPDATE field_configs SET sort_order = ? WHERE id = ?');
    
    const updateMany = db.transaction((items) => {
      for (const item of items) {
        updateSort.run(item.sortOrder, item.id);
      }
    });

    updateMany(items);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
