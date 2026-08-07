const db = require('./db');
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

console.log('开始重置数据库...');

// 清空数据
db.exec('DELETE FROM operation_logs');
db.exec('DELETE FROM orders');
db.exec('DELETE FROM users');
db.exec('DELETE FROM field_configs');
db.exec('DELETE FROM settings');
db.exec('DELETE FROM admin_users');
db.exec("DELETE FROM sqlite_sequence WHERE name IN ('operation_logs', 'orders', 'users', 'field_configs')");
console.log('已清空所有数据');

// 重新初始化管理员账号
db.prepare('INSERT INTO admin_users (username, password) VALUES (?, ?)').run('admin', hashPassword('admin123'));
console.log('已创建管理员账号: admin / admin123');

// 重新初始化设置
db.prepare('INSERT INTO settings (id, reminder_days, company_name) VALUES (1, 3, ?)').run('用户管理系统');
console.log('已初始化系统设置');

// 重新初始化字段配置
const insertField = db.prepare(`
  INSERT INTO field_configs (target_type, field_key, field_label, field_type, is_required, is_system, placeholder, options, sort_order)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// 用户系统字段（只保留用户姓名）
insertField.run('user', 'user_name', '用户姓名', 'text', 1, 1, '请输入用户姓名', '[]', 1);

// 用户自定义字段
insertField.run('user', 'phone', '手机号', 'text', 0, 0, '请输入手机号', '[]', 2);
insertField.run('user', 'email', '邮箱', 'text', 0, 0, '请输入邮箱', '[]', 3);
insertField.run('user', 'gender', '性别', 'select', 0, 0, '请选择性别', JSON.stringify(['男', '女', '未知']), 4);
insertField.run('user', 'company', '公司名称', 'text', 0, 0, '请输入公司名称', '[]', 5);
insertField.run('user', 'position', '职位', 'text', 0, 0, '请输入职位', '[]', 6);
insertField.run('user', 'wechat', '微信号', 'text', 0, 0, '请输入微信号', '[]', 7);
insertField.run('user', 'address', '地址', 'text', 0, 0, '请输入地址', '[]', 8);
insertField.run('user', 'vip_level', 'VIP等级', 'select', 0, 0, '请选择VIP等级', JSON.stringify(['普通', '银卡', '金卡', '钻石']), 9);
insertField.run('user', 'source', '来源渠道', 'select', 0, 0, '请选择来源渠道', JSON.stringify(['线上', '线下', '推荐', '其他']), 10);
insertField.run('user', 'remark', '备注', 'textarea', 0, 0, '请输入备注', '[]', 11);
console.log('已初始化用户字段配置');

// 订单系统字段（核心业务字段）
insertField.run('order', 'order_no', '订单号', 'text', 1, 1, '请输入订单号', '[]', 1);
insertField.run('order', 'user_id', '用户', 'select', 1, 1, '请选择用户', '[]', 2);
insertField.run('order', 'product_name', '产品名称', 'text', 1, 1, '请输入产品名称', '[]', 3);
insertField.run('order', 'amount', '订单金额', 'number', 1, 1, '请输入订单金额', '[]', 4);
insertField.run('order', 'order_time', '下单时间', 'date', 1, 1, '请选择下单时间', '[]', 5);
insertField.run('order', 'expire_time', '到期时间', 'date', 1, 1, '请选择到期时间', '[]', 6);
insertField.run('order', 'status', '状态', 'select', 1, 1, '请选择状态', JSON.stringify(['进行中', '已到期', '已完成']), 7);

// 订单自定义字段
insertField.run('order', 'channel', '销售渠道', 'select', 0, 0, '请选择销售渠道', JSON.stringify(['官网', 'APP', '小程序', '第三方']), 10);
insertField.run('order', 'payment_method', '支付方式', 'select', 0, 0, '请选择支付方式', JSON.stringify(['微信支付', '支付宝', '银行卡', '现金']), 11);
insertField.run('order', 'invoice_no', '发票号', 'text', 0, 0, '请输入发票号', '[]', 12);
insertField.run('order', 'discount', '折扣', 'number', 0, 0, '请输入折扣', '[]', 13);
console.log('已初始化订单字段配置');

// 生成测试用户
const insertUser = db.prepare(`
  INSERT INTO users (user_name, phone, email, gender, id_card, address, source, remark, company, position, wechat, vip_level)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const surnames = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗'];
const names = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '洋', '艳', '勇', '军', '杰', '娟', '涛', '明', '超', '秀兰', '霞'];
const companies = ['阿里巴巴', '腾讯', '百度', '字节跳动', '京东', '美团', '滴滴', '网易', '小米', '华为', '中兴', '联想', '海尔', '格力', '美的'];
const positions = ['工程师', '产品经理', '设计师', '运营', '销售', '市场', '财务', '人事', '总监', '经理', '主管', '专员', '实习生', '顾问', '架构师'];
const sources = ['线上', '线下', '推荐', '其他'];
const genders = ['男', '女', '未知'];
const vipLevels = ['普通', '银卡', '金卡', '钻石'];
const addresses = ['北京市朝阳区建国路88号', '上海市浦东新区陆家嘴环路1000号', '广州市天河区体育西路101号', '深圳市南山区科技园南区', '杭州市西湖区文三路90号', '成都市武侯区天府大道', '武汉市江汉区建设大道', '南京市鼓楼区中山路', '重庆市渝中区解放碑', '西安市雁塔区高新路'];
const remarks = ['VIP客户', '重要客户', '长期合作', '新客户', '待跟进', '已签约', '已付款', '已完成', '待回访', ''];

const users = [];
for (let i = 0; i < 20; i++) {
  const surname = surnames[Math.floor(Math.random() * surnames.length)];
  const name = names[Math.floor(Math.random() * names.length)];
  const userName = surname + name;
  const phone = '138' + String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
  const email = userName.toLowerCase() + Math.floor(Math.random() * 100) + '@example.com';
  const gender = genders[Math.floor(Math.random() * genders.length)];
  const idCard = String(Math.floor(Math.random() * 100000000000000000)).padStart(18, '1');
  const address = addresses[Math.floor(Math.random() * addresses.length)];
  const source = sources[Math.floor(Math.random() * sources.length)];
  const remark = remarks[Math.floor(Math.random() * remarks.length)];
  const company = companies[Math.floor(Math.random() * companies.length)];
  const position = positions[Math.floor(Math.random() * positions.length)];
  const wechat = 'wx_' + userName.toLowerCase() + Math.floor(Math.random() * 1000);
  const vipLevel = vipLevels[Math.floor(Math.random() * vipLevels.length)];
  
  insertUser.run(userName, phone, email, gender, idCard, address, source, remark, company, position, wechat, vipLevel);
  users.push({ id: i + 1, userName, phone });
}
console.log('已创建 ' + users.length + ' 个测试用户');

// 生成测试订单
const insertOrder = db.prepare(`
  INSERT INTO orders (user_id, order_no, product_name, amount, order_time, expire_time, status, channel, payment_method, invoice_no, discount)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const products = [
  { name: '企业版年费', price: 9999 },
  { name: '专业版季度费', price: 2999 },
  { name: '基础版月费', price: 99 },
  { name: '高级定制服务', price: 19999 },
  { name: '数据迁移服务', price: 4999 },
  { name: '培训服务', price: 2999 },
  { name: '技术支持包', price: 1999 },
  { name: '云存储服务', price: 599 },
  { name: 'API调用包', price: 199 },
  { name: '企业邮箱', price: 299 }
];
const channels = ['官网', 'APP', '小程序', '第三方'];
const paymentMethods = ['微信支付', '支付宝', '银行卡', '现金'];

let orderCount = 0;
for (let i = 0; i < 35; i++) {
  const userId = Math.floor(Math.random() * users.length) + 1;
  const orderNo = 'ORD' + String(20260807000000 + i).padStart(14, '0') + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  const product = products[Math.floor(Math.random() * products.length)];
  const amount = product.price * (0.8 + Math.random() * 0.4);
  
  const now = new Date();
  const orderDaysAgo = Math.floor(Math.random() * 90);
  const orderDate = new Date(now.getTime() - orderDaysAgo * 24 * 60 * 60 * 1000);
  const orderTime = orderDate.toISOString().slice(0, 19).replace('T', ' ');
  
  const expireDays = Math.floor(Math.random() * 365) + 30;
  const expireDate = new Date(orderDate.getTime() + expireDays * 24 * 60 * 60 * 1000);
  const expireTime = expireDate.toISOString().slice(0, 19).replace('T', ' ');
  
  let status;
  if (expireDate < now) {
    status = Math.random() > 0.3 ? '已完成' : '已到期';
  } else {
    status = '进行中';
  }
  
  const channel = channels[Math.floor(Math.random() * channels.length)];
  const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
  const invoiceNo = Math.random() > 0.5 ? 'INV' + String(20260000 + i) : '';
  const discount = Math.random() > 0.7 ? Math.floor(Math.random() * 30 + 70) / 10 : 1;
  
  insertOrder.run(userId, orderNo, product.name, Math.round(amount * 100) / 100, orderTime, expireTime, status, channel, paymentMethod, invoiceNo, discount);
  orderCount++;
}
console.log('已创建 ' + orderCount + ' 个测试订单');

console.log('\n========================================');
console.log('数据库重置完成！');
console.log('  - 管理员账号: admin / admin123');
console.log('  - 测试用户: ' + users.length + ' 个');
console.log('  - 测试订单: ' + orderCount + ' 个');
console.log('  - 用户系统字段: 仅用户姓名');
console.log('  - 订单系统字段: 7个核心字段');
console.log('  - 其他字段: 均为自定义字段');
console.log('========================================');
