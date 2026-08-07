const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, 'data', 'user_management.db');

// 确保data目录存在
const fs = require('fs');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// 启用WAL模式提高性能
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 密码哈希函数
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// 数据库迁移函数
function migrateDatabase() {
  const getTableColumns = (tableName) => {
    try {
      const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
      return columns.map(col => col.name);
    } catch {
      return [];
    }
  };

  const addColumnIfNotExists = (tableName, columnName, columnDef) => {
    const columns = getTableColumns(tableName);
    if (!columns.includes(columnName)) {
      try {
        db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
        console.log(`✓ 迁移：添加 ${tableName}.${columnName}`);
      } catch (error) {
        console.log(`⚠ 跳过 ${tableName}.${columnName}: ${error.message}`);
      }
    }
  };

  // 迁移 users 表
  addColumnIfNotExists('users', 'custom_fields', "TEXT DEFAULT '{}'");

  // 迁移 orders 表
  addColumnIfNotExists('orders', 'custom_fields', "TEXT DEFAULT '{}'");

  // 迁移 settings 表
  addColumnIfNotExists('settings', 'company_name', "TEXT DEFAULT '用户管理系统'");
  addColumnIfNotExists('settings', 'contact_email', "TEXT DEFAULT ''");
  addColumnIfNotExists('settings', 'contact_phone', "TEXT DEFAULT ''");

  // 迁移 field_configs 表
  addColumnIfNotExists('field_configs', 'is_system', 'INTEGER DEFAULT 0');

  // 迁移 users 表 - 添加自定义字段列
  addColumnIfNotExists('users', 'company', "TEXT DEFAULT ''");
  addColumnIfNotExists('users', 'position', "TEXT DEFAULT ''");
  addColumnIfNotExists('users', 'wechat', "TEXT DEFAULT ''");
  addColumnIfNotExists('users', 'vip_level', "TEXT DEFAULT ''");

  // 迁移 orders 表 - 添加自定义字段列
  addColumnIfNotExists('orders', 'channel', "TEXT DEFAULT ''");
  addColumnIfNotExists('orders', 'payment_method', "TEXT DEFAULT ''");
  addColumnIfNotExists('orders', 'invoice_no', "TEXT DEFAULT ''");
  addColumnIfNotExists('orders', 'discount', "REAL DEFAULT 0");
}

// 执行迁移
migrateDatabase();

// 创建表（如果不存在）
// 创建用户表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    gender TEXT DEFAULT '未知',
    id_card TEXT,
    address TEXT,
    source TEXT,
    remark TEXT,
    custom_fields TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  )
`);

// 创建订单表
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    order_no TEXT NOT NULL,
    product_name TEXT NOT NULL,
    amount REAL NOT NULL,
    order_time TEXT NOT NULL,
    expire_time TEXT NOT NULL,
    status TEXT DEFAULT '进行中',
    custom_fields TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// 创建设置表
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY,
    reminder_days INTEGER DEFAULT 3,
    company_name TEXT DEFAULT '用户管理系统',
    contact_email TEXT DEFAULT '',
    contact_phone TEXT DEFAULT ''
  )
`);

// 创建字段配置表
db.exec(`
  CREATE TABLE IF NOT EXISTS field_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_type TEXT NOT NULL,
    field_key TEXT NOT NULL,
    field_label TEXT NOT NULL,
    field_type TEXT DEFAULT 'text',
    is_required INTEGER DEFAULT 0,
    is_system INTEGER DEFAULT 0,
    placeholder TEXT DEFAULT '',
    options TEXT DEFAULT '[]',
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    UNIQUE(target_type, field_key)
  )
`);

// 创建管理员账号表
db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  )
`);

// 创建操作日志表
db.exec(`
  CREATE TABLE IF NOT EXISTS operation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    target_id INTEGER,
    target_name TEXT,
    detail TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  )
`);

// 创建日志索引
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_logs_username ON operation_logs(username);
  CREATE INDEX IF NOT EXISTS idx_logs_module ON operation_logs(module);
  CREATE INDEX IF NOT EXISTS idx_logs_created_at ON operation_logs(created_at);
`);

// 初始化默认管理员账号 (admin/admin123)
const adminExists = db.prepare('SELECT id FROM admin_users WHERE username = ?').get('admin');
if (!adminExists) {
  db.prepare('INSERT INTO admin_users (username, password) VALUES (?, ?)').run('admin', hashPassword('admin123'));
  console.log('✓ 初始化默认管理员账号：admin / admin123');
}

// 初始化设置
const settingExists = db.prepare('SELECT id FROM settings WHERE id = 1').get();
if (!settingExists) {
  db.prepare('INSERT INTO settings (id, reminder_days, company_name) VALUES (1, 3, ?)').run('用户管理系统');
}

// 初始化默认字段配置
const userFieldsExist = db.prepare("SELECT COUNT(*) as count FROM field_configs WHERE target_type = 'user'").get();
if (userFieldsExist.count === 0) {
  const insertField = db.prepare(`
    INSERT INTO field_configs (target_type, field_key, field_label, field_type, is_required, is_system, placeholder, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  // 用户系统字段（is_system=1，不可删除）- 只保留最基本的
  insertField.run('user', 'user_name', '用户姓名', 'text', 1, 1, '请输入用户姓名', 1);
  
  // 用户自定义字段
  insertField.run('user', 'phone', '手机号', 'text', 0, 0, '请输入手机号', 2);
  insertField.run('user', 'email', '邮箱', 'text', 0, 0, '请输入邮箱', 3);
  insertField.run('user', 'gender', '性别', 'select', 0, 0, '请选择性别', JSON.stringify(['男', '女', '未知']), 4);
  insertField.run('user', 'company', '公司名称', 'text', 0, 0, '请输入公司名称', 5);
  insertField.run('user', 'position', '职位', 'text', 0, 0, '请输入职位', 6);
  insertField.run('user', 'wechat', '微信号', 'text', 0, 0, '请输入微信号', 7);
  insertField.run('user', 'address', '地址', 'text', 0, 0, '请输入地址', 8);
  insertField.run('user', 'vip_level', 'VIP等级', 'select', 0, 0, '请选择VIP等级', JSON.stringify(['普通', '银卡', '金卡', '钻石']), 9);
  insertField.run('user', 'source', '来源渠道', 'select', 0, 0, '请选择来源渠道', JSON.stringify(['线上', '线下', '推荐', '其他']), 10);
  insertField.run('user', 'remark', '备注', 'textarea', 0, 0, '请输入备注', 11);
  
  // 订单系统字段（is_system=1，不可删除）- 核心业务字段
  insertField.run('order', 'order_no', '订单号', 'text', 1, 1, '请输入订单号', 1);
  insertField.run('order', 'user_id', '用户', 'select', 1, 1, '请选择用户', 2);
  insertField.run('order', 'product_name', '产品名称', 'text', 1, 1, '请输入产品名称', 3);
  insertField.run('order', 'amount', '订单金额', 'number', 1, 1, '请输入订单金额', 4);
  insertField.run('order', 'order_time', '下单时间', 'date', 1, 1, '请选择下单时间', 5);
  insertField.run('order', 'expire_time', '到期时间', 'date', 1, 1, '请选择到期时间', 6);
  insertField.run('order', 'status', '状态', 'select', 1, 1, '请选择状态', JSON.stringify(['进行中', '已到期', '已完成']), 7);
  
  // 订单自定义字段
  insertField.run('order', 'channel', '销售渠道', 'select', 0, 0, '请选择销售渠道', JSON.stringify(['官网', 'APP', '小程序', '第三方']), 10);
  insertField.run('order', 'payment_method', '支付方式', 'select', 0, 0, '请选择支付方式', JSON.stringify(['微信支付', '支付宝', '银行卡', '现金']), 11);
  insertField.run('order', 'invoice_no', '发票号', 'text', 0, 0, '请输入发票号', 12);
  insertField.run('order', 'discount', '折扣', 'number', 0, 0, '请输入折扣', 13);
} else {
  // 确保系统预设字段存在（处理旧数据库升级情况）
  const insertField = db.prepare(`
    INSERT OR IGNORE INTO field_configs (target_type, field_key, field_label, field_type, is_required, is_system, placeholder, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  // 用户系统字段
  insertField.run('user', 'user_name', '用户姓名', 'text', 1, 1, '请输入用户姓名', 1);
  
  // 订单系统字段
  insertField.run('order', 'order_no', '订单号', 'text', 1, 1, '请输入订单号', 1);
  insertField.run('order', 'user_id', '用户', 'select', 1, 1, '请选择用户', 2);
  insertField.run('order', 'product_name', '产品名称', 'text', 1, 1, '请输入产品名称', 3);
  insertField.run('order', 'amount', '订单金额', 'number', 1, 1, '请输入订单金额', 4);
  insertField.run('order', 'order_time', '下单时间', 'date', 1, 1, '请选择下单时间', 5);
  insertField.run('order', 'expire_time', '到期时间', 'date', 1, 1, '请选择到期时间', 6);
  insertField.run('order', 'status', '状态', 'select', 1, 1, '请选择状态', 7);
}

module.exports = db;
module.exports.hashPassword = hashPassword;
