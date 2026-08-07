const db = require('./db');
const dayjs = require('dayjs');

// 清空现有数据
db.exec('DELETE FROM orders');
db.exec('DELETE FROM users');

// 生成用户数据
const users = [
  { userName: '张三', phone: '13800138001', email: 'zhangsan@example.com', gender: '男', idCard: '110101199001011234', address: '北京市朝阳区建国路88号', source: '线上', remark: 'VIP客户' },
  { userName: '李四', phone: '13900139002', email: 'lisi@example.com', gender: '女', idCard: '310101199205051234', address: '上海市浦东新区陆家嘴金融中心', source: '线下', remark: '重要客户' },
  { userName: '王五', phone: '13700137003', email: 'wangwu@example.com', gender: '男', idCard: '440101198812151234', address: '广州市天河区珠江新城华夏路', source: '推荐', remark: '老客户推荐' },
  { userName: '赵六', phone: '13600136004', email: 'zhaoliu@example.com', gender: '女', idCard: '440301199508201234', address: '深圳市南山区科技园南区', source: '线上', remark: '' },
  { userName: '钱七', phone: '13500135005', email: 'qianqi@example.com', gender: '男', idCard: '330102198903221234', address: '杭州市西湖区文三路478号', source: '线下', remark: '企业客户' },
  { userName: '孙八', phone: '13400134006', email: 'sunba@example.com', gender: '女', idCard: '510101199211081234', address: '成都市武侯区天府大道中段', source: '线上', remark: '' },
  { userName: '周九', phone: '13300133007', email: 'zhoujiu@example.com', gender: '男', idCard: '420101198706251234', address: '武汉市洪山区光谷大道77号', source: '推荐', remark: '长期合作' },
  { userName: '吴十', phone: '13200132008', email: 'wushi@example.com', gender: '女', idCard: '320101199304121234', address: '南京市鼓楼区新街口中山东路', source: '线上', remark: '' },
  { userName: '郑十一', phone: '13100131009', email: 'zheng11@example.com', gender: '男', idCard: '500101198810301234', address: '重庆市渝中区解放碑民权路', source: '线下', remark: '待跟进' },
  { userName: '冯十二', phone: '13000130010', email: 'feng12@example.com', gender: '女', idCard: '610101199507181234', address: '西安市雁塔区高新路25号', source: '其他', remark: '新客户' },
  { userName: '陈十三', phone: '15800158011', email: 'chen13@example.com', gender: '男', idCard: '320501199001251234', address: '苏州市工业园区星湖街328号', source: '线上', remark: '' },
  { userName: '褚十四', phone: '15900159012', email: 'chu14@example.com', gender: '女', idCard: '120101199112031234', address: '天津市滨海新区中心商务区', source: '线下', remark: '大客户' },
  { userName: '卫十五', phone: '15700157013', email: 'wei15@example.com', gender: '男', idCard: '430101198908281234', address: '长沙市岳麓区麓谷街道', source: '推荐', remark: '' },
  { userName: '蒋十六', phone: '15600156014', email: 'jiang16@example.com', gender: '女', idCard: '410101199306151234', address: '郑州市金水区经三路66号', source: '线上', remark: '' },
  { userName: '沈十七', phone: '15500155015', email: 'shen17@example.com', gender: '男', idCard: '370201198809221234', address: '青岛市市南区香港中路76号', source: '其他', remark: '待跟进' },
  { userName: '韩十八', phone: '18800188016', email: 'han18@example.com', gender: '女', idCard: '330201199402081234', address: '宁波市海曙区天一广场', source: '线上', remark: '' },
  { userName: '杨十九', phone: '18900189017', email: 'yang19@example.com', gender: '男', idCard: '441901198712051234', address: '东莞市南城区鸿福路', source: '线下', remark: '老客户' },
  { userName: '朱二十', phone: '18700187018', email: 'zhu20@example.com', gender: '女', idCard: '440601199208171234', address: '佛山市禅城区祖庙路', source: '推荐', remark: '合作伙伴推荐' },
  { userName: '秦二一', phone: '18600186019', email: 'qin21@example.com', gender: '男', idCard: '340101199103291234', address: '合肥市蜀山区望江西路', source: '线上', remark: '' },
  { userName: '许二二', phone: '18500185020', email: 'xu22@example.com', gender: '女', idCard: '350201199501111234', address: '厦门市思明区中山路', source: '其他', remark: '首次购买' }
];

const insertUser = db.prepare(`
  INSERT INTO users (user_name, phone, email, gender, id_card, address, source, remark)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const userIds = [];
for (const user of users) {
  const result = insertUser.run(user.userName, user.phone, user.email, user.gender, user.idCard, user.address, user.source, user.remark);
  userIds.push(result.lastInsertRowid);
}

// 生成订单数据
const products = [
  { name: '年度VIP会员', basePrice: 299 },
  { name: '季度VIP会员', basePrice: 99 },
  { name: '月度VIP会员', basePrice: 39 },
  { name: '企业版年度订阅', basePrice: 1999 },
  { name: '企业版季度订阅', basePrice: 599 },
  { name: '专业版年度订阅', basePrice: 699 },
  { name: '专业版月度订阅', basePrice: 79 },
  { name: '基础版年度订阅', basePrice: 199 },
  { name: '数据备份服务包', basePrice: 49 },
  { name: '技术支持服务包', basePrice: 99 }
];

const insertOrder = db.prepare(`
  INSERT INTO orders (user_id, order_no, product_name, amount, order_time, expire_time, status)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

let orderIndex = 1;
const now = dayjs();

for (const userId of userIds) {
  const orderCount = Math.floor(Math.random() * 3) + 1;
  
  for (let i = 0; i < orderCount; i++) {
    const product = products[Math.floor(Math.random() * products.length)];
    const priceVariation = Math.floor(Math.random() * 50) - 25;
    const amount = product.basePrice + priceVariation;
    
    const daysAgo = Math.floor(Math.random() * 365);
    const orderTime = now.subtract(daysAgo, 'day').hour(10).minute(0).second(0);
    
    let expireMonths;
    if (product.name.includes('年度') || product.name.includes('年费')) {
      expireMonths = 12;
    } else if (product.name.includes('季度') || product.name.includes('季费')) {
      expireMonths = 3;
    } else {
      expireMonths = 1;
    }
    const expireTime = orderTime.add(expireMonths, 'month');
    
    let status;
    if (expireTime.isBefore(now)) {
      status = '已到期';
    } else if (daysAgo > 30 && Math.random() > 0.7) {
      status = '已完成';
    } else {
      status = '进行中';
    }
    
    const orderNo = `ORD${orderTime.format('YYYYMMDD')}${String(orderIndex).padStart(4, '0')}`;
    
    insertOrder.run(
      userId,
      orderNo,
      product.name,
      amount,
      orderTime.format('YYYY-MM-DD HH:mm:ss'),
      expireTime.format('YYYY-MM-DD HH:mm:ss'),
      status
    );
    
    orderIndex++;
  }
}

console.log(`✓ 成功插入 ${users.length} 个用户`);
console.log(`✓ 成功插入 ${orderIndex - 1} 个订单`);
console.log('✓ 测试数据生成完成！');
