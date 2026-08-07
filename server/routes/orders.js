const express = require('express');
const router = express.Router();
const db = require('../db');
const { logOperation } = require('./logs');

// 获取所有订单（带用户信息）
router.get('/', (req, res) => {
  try {
    const { keyword, phone, orderNo, status, startDate, endDate, minAmount, maxAmount } = req.query;
    
    let sql = `
      SELECT o.*, u.user_name, u.phone as user_phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
    `;
    
    const conditions = [];
    const params = [];

    if (keyword) {
      conditions.push('(u.user_name LIKE ? OR o.order_no LIKE ? OR o.product_name LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    if (phone) {
      conditions.push('u.phone LIKE ?');
      params.push(`%${phone}%`);
    }

    if (orderNo) {
      conditions.push('o.order_no LIKE ?');
      params.push(`%${orderNo}%`);
    }

    if (status) {
      conditions.push('o.status = ?');
      params.push(status);
    }

    if (startDate) {
      conditions.push('o.order_time >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('o.order_time <= ?');
      params.push(endDate + ' 23:59:59');
    }

    if (minAmount !== undefined) {
      conditions.push('o.amount >= ?');
      params.push(Number(minAmount));
    }

    if (maxAmount !== undefined) {
      conditions.push('o.amount <= ?');
      params.push(Number(maxAmount));
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY o.created_at DESC';

    const orders = db.prepare(sql).all(...params);
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取单个订单
router.get('/:id', (req, res) => {
  try {
    const order = db.prepare(`
      SELECT o.*, u.user_name, u.phone as user_phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `).get(req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建订单（支持动态字段）
router.post('/', (req, res) => {
  try {
    const { userId, orderNo, productName, amount, orderTime, expireTime, channel, paymentMethod, invoiceNo, discount, customFields } = req.body;

    if (!userId || !orderNo || !productName || amount === undefined || !orderTime || !expireTime) {
      return res.status(400).json({ success: false, message: '必填字段缺失' });
    }

    // 计算状态
    const now = new Date();
    const expireDate = new Date(expireTime);
    const status = expireDate < now ? '已到期' : '进行中';

    const result = db.prepare(`
      INSERT INTO orders (user_id, order_no, product_name, amount, order_time, expire_time, status, channel, payment_method, invoice_no, discount, custom_fields)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId, 
      orderNo, 
      productName, 
      amount, 
      orderTime, 
      expireTime, 
      status,
      channel || null,
      paymentMethod || null,
      invoiceNo || null,
      discount || 0,
      JSON.stringify(customFields || {})
    );

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
    logOperation(req.body.username || 'system', '订单管理', '新增订单', order.id, orderNo, `产品: ${productName}, 金额: ${amount}`, req.ip);
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新订单（支持动态字段）
router.put('/:id', (req, res) => {
  try {
    const { userId, orderNo, productName, amount, orderTime, expireTime, status, channel, paymentMethod, invoiceNo, discount, customFields } = req.body;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // 如果没有指定status，根据expireTime计算
    let newStatus = status;
    if (!newStatus && expireTime) {
      const expireDate = new Date(expireTime);
      newStatus = expireDate < new Date() ? '已到期' : '进行中';
    }

    db.prepare(`
      UPDATE orders SET 
        user_id = COALESCE(?, user_id),
        order_no = COALESCE(?, order_no),
        product_name = COALESCE(?, product_name),
        amount = COALESCE(?, amount),
        order_time = COALESCE(?, order_time),
        expire_time = COALESCE(?, expire_time),
        status = COALESCE(?, status),
        channel = ?,
        payment_method = ?,
        invoice_no = ?,
        discount = ?,
        custom_fields = COALESCE(?, custom_fields),
        updated_at = ?
      WHERE id = ?
    `).run(
      userId, 
      orderNo, 
      productName, 
      amount, 
      orderTime, 
      expireTime, 
      newStatus,
      channel || null,
      paymentMethod || null,
      invoiceNo || null,
      discount || 0,
      customFields ? JSON.stringify(customFields) : null,
      now, 
      req.params.id
    );

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    logOperation(req.body.username || 'system', '订单管理', '更新订单', order.id, order.order_no, null, req.ip);
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除订单
router.delete('/:id', (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
    if (order) {
      logOperation(req.query.username || 'system', '订单管理', '删除订单', order.id, order.order_no, null, req.ip);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 批量更新订单状态（刷新过期状态）
router.post('/refresh-status', (req, res) => {
  try {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    db.prepare(`
      UPDATE orders SET status = '已到期', updated_at = ?
      WHERE status = '进行中' AND expire_time < ?
    `).run(now, now);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 批量导入订单
router.post('/batch', (req, res) => {
  try {
    const { orders } = req.body;

    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ success: false, message: '订单数据为空' });
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const insertOrder = db.prepare(`
      INSERT INTO orders (user_id, order_no, product_name, amount, order_time, expire_time, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((items) => {
      for (const item of items) {
        const expireDate = new Date(item.expireTime);
        const status = expireDate < new Date() ? '已到期' : '进行中';
        insertOrder.run(item.userId, item.orderNo, item.productName, item.amount, item.orderTime, item.expireTime, status);
      }
    });

    insertMany(orders);
    res.json({ success: true, count: orders.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
