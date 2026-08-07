const express = require('express');
const router = express.Router();
const db = require('../db');
const path = require('path');
const fs = require('fs');

// 获取系统设置
router.get('/settings', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新系统设置
router.put('/settings', (req, res) => {
  try {
    const { reminderDays, companyName, contactEmail, contactPhone } = req.body;
    db.prepare(`
      UPDATE settings SET 
        reminder_days = COALESCE(?, reminder_days),
        company_name = COALESCE(?, company_name),
        contact_email = COALESCE(?, contact_email),
        contact_phone = COALESCE(?, contact_phone)
      WHERE id = 1
    `).run(reminderDays, companyName, contactEmail, contactPhone);
    
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 备份数据
router.post('/backup', (req, res) => {
  try {
    const users = db.prepare('SELECT * FROM users').all();
    const orders = db.prepare('SELECT * FROM orders').all();
    const settings = db.prepare('SELECT * FROM settings').all();
    const fieldConfigs = db.prepare('SELECT * FROM field_configs').all();

    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {
        users,
        orders,
        settings,
        fieldConfigs
      }
    };

    const backupDir = path.join(__dirname, '..', 'data', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const filename = `backup_${Date.now()}.json`;
    const filepath = path.join(backupDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));

    res.json({ 
      success: true, 
      data: {
        filename,
        filepath,
        recordCount: {
          users: users.length,
          orders: orders.length,
          settings: settings.length,
          fieldConfigs: fieldConfigs.length
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取备份列表
router.get('/backups', (req, res) => {
  try {
    const backupDir = path.join(__dirname, '..', 'data', 'backups');
    if (!fs.existsSync(backupDir)) {
      return res.json({ success: true, data: [] });
    }

    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const filepath = path.join(backupDir, f);
        const stats = fs.statSync(filepath);
        const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
        return {
          filename: f,
          timestamp: content.timestamp,
          size: stats.size,
          recordCount: content.data ? {
            users: content.data.users?.length || 0,
            orders: content.data.orders?.length || 0
          } : null
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({ success: true, data: files });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 恢复数据
router.post('/restore', (req, res) => {
  try {
    const { filename } = req.body;
    
    const backupDir = path.join(__dirname, '..', 'data', 'backups');
    const filepath = path.join(backupDir, filename);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ success: false, message: '备份文件不存在' });
    }

    const backupData = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    
    if (!backupData.data) {
      return res.status(400).json({ success: false, message: '备份文件格式错误' });
    }

    // 开始恢复事务
    const restoreAll = db.transaction(() => {
      // 清空现有数据
      db.exec('DELETE FROM orders');
      db.exec('DELETE FROM users');
      db.exec('DELETE FROM settings');
      db.exec('DELETE FROM field_configs');

      // 恢复用户
      if (backupData.data.users && backupData.data.users.length > 0) {
        const insertUser = db.prepare(`
          INSERT INTO users (id, user_name, phone, email, gender, id_card, address, source, remark, custom_fields, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const user of backupData.data.users) {
          insertUser.run(
            user.id, user.user_name, user.phone, user.email, user.gender,
            user.id_card, user.address, user.source, user.remark,
            user.custom_fields || '{}', user.created_at, user.updated_at
          );
        }
      }

      // 恢复订单
      if (backupData.data.orders && backupData.data.orders.length > 0) {
        const insertOrder = db.prepare(`
          INSERT INTO orders (id, user_id, order_no, product_name, amount, order_time, expire_time, status, custom_fields, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const order of backupData.data.orders) {
          insertOrder.run(
            order.id, order.user_id, order.order_no, order.product_name,
            order.amount, order.order_time, order.expire_time, order.status,
            order.custom_fields || '{}', order.created_at, order.updated_at
          );
        }
      }

      // 恢复设置
      if (backupData.data.settings && backupData.data.settings.length > 0) {
        const insertSetting = db.prepare(`
          INSERT INTO settings (id, reminder_days, company_name, contact_email, contact_phone)
          VALUES (?, ?, ?, ?, ?)
        `);
        for (const setting of backupData.data.settings) {
          insertSetting.run(
            setting.id, setting.reminder_days, setting.company_name,
            setting.contact_email, setting.contact_phone
          );
        }
      }

      // 恢复字段配置
      if (backupData.data.fieldConfigs && backupData.data.fieldConfigs.length > 0) {
        const insertField = db.prepare(`
          INSERT INTO field_configs (id, target_type, field_key, field_label, field_type, is_required, placeholder, options, sort_order, is_active, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const field of backupData.data.fieldConfigs) {
          insertField.run(
            field.id, field.target_type, field.field_key, field.field_label,
            field.field_type, field.is_required, field.placeholder,
            field.options, field.sort_order, field.is_active, field.created_at
          );
        }
      }
    });

    restoreAll();

    res.json({
      success: true,
      data: {
        users: backupData.data.users?.length || 0,
        orders: backupData.data.orders?.length || 0,
        settings: backupData.data.settings?.length || 0,
        fieldConfigs: backupData.data.fieldConfigs?.length || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除备份
router.delete('/backups/:filename', (req, res) => {
  try {
    const backupDir = path.join(__dirname, '..', 'data', 'backups');
    const filepath = path.join(backupDir, req.params.filename);
    
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取系统统计
router.get('/stats', (req, res) => {
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
    const totalAmount = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM orders').get().total;
    const fieldCount = db.prepare('SELECT COUNT(*) as count FROM field_configs').get().count;
    
    const dbPath = path.join(__dirname, '..', 'data', 'user_management.db');
    const dbStats = fs.statSync(dbPath);

    res.json({
      success: true,
      data: {
        userCount,
        orderCount,
        totalAmount,
        fieldCount,
        dbSize: dbStats.size,
        dbPath
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
