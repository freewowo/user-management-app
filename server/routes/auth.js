const express = require('express');
const router = express.Router();
const db = require('../db');
const { hashPassword } = require('../db');
const { logOperation } = require('./logs');

// 存储验证码（生产环境应使用Redis）
const captchaStore = new Map();

// 生成算术验证码
router.get('/captcha', (req, res) => {
  try {
    const num1 = Math.floor(Math.random() * 20) + 1;
    const num2 = Math.floor(Math.random() * 20) + 1;
    const operators = ['+', '-', '×'];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    
    let answer;
    let question;
    
    switch (operator) {
      case '+':
        answer = num1 + num2;
        question = `${num1} + ${num2}`;
        break;
      case '-':
        // 确保结果为正数
        const [a, b] = num1 >= num2 ? [num1, num2] : [num2, num1];
        answer = a - b;
        question = `${a} - ${b}`;
        break;
      case '×':
        const n1 = Math.floor(Math.random() * 10) + 1;
        const n2 = Math.floor(Math.random() * 10) + 1;
        answer = n1 * n2;
        question = `${n1} × ${n2}`;
        break;
    }

    // 生成唯一ID
    const captchaId = `captcha_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 存储验证码，5分钟过期
    captchaStore.set(captchaId, {
      answer: answer,
      expires: Date.now() + 5 * 60 * 1000
    });

    // 清理过期验证码
    for (const [key, value] of captchaStore.entries()) {
      if (value.expires < Date.now()) {
        captchaStore.delete(key);
      }
    }

    res.json({
      success: true,
      data: {
        captchaId,
        question: `${question} = ?`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 登录
router.post('/login', (req, res) => {
  try {
    const { username, password, captchaId, captchaAnswer } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    if (!captchaId || captchaAnswer === undefined) {
      return res.status(400).json({ success: false, message: '请提供验证码' });
    }

    // 验证码校验
    const captchaData = captchaStore.get(captchaId);
    if (!captchaData) {
      return res.status(400).json({ success: false, message: '验证码已过期，请重新获取' });
    }

    if (captchaData.expires < Date.now()) {
      captchaStore.delete(captchaId);
      return res.status(400).json({ success: false, message: '验证码已过期，请重新获取' });
    }

    if (parseInt(captchaAnswer) !== captchaData.answer) {
      return res.status(400).json({ success: false, message: '验证码错误' });
    }

    // 验证通过后删除验证码
    captchaStore.delete(captchaId);

    // 查询用户
    const admin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
    if (!admin) {
      logOperation(username, '认证', '登录失败', null, username, '用户名不存在', req.ip);
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    // 验证密码
    if (hashPassword(password) !== admin.password) {
      logOperation(username, '认证', '登录失败', admin.id, username, '密码错误', req.ip);
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    logOperation(username, '认证', '登录成功', admin.id, username, null, req.ip);
    res.json({
      success: true,
      data: {
        id: admin.id,
        username: admin.username,
        message: '登录成功'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 修改密码
router.post('/change-password', (req, res) => {
  try {
    const { username, oldPassword, newPassword } = req.body;

    if (!username || !oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: '请填写完整信息' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: '新密码长度不能少于6位' });
    }

    // 查询用户
    const admin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
    if (!admin) {
      return res.status(401).json({ success: false, message: '用户不存在' });
    }

    // 验证旧密码
    if (hashPassword(oldPassword) !== admin.password) {
      return res.status(401).json({ success: false, message: '原密码错误' });
    }

    // 更新密码
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    db.prepare('UPDATE admin_users SET password = ?, updated_at = ? WHERE id = ?')
      .run(hashPassword(newPassword), now, admin.id);

    logOperation(username, '认证', '修改密码', admin.id, username, null, req.ip);
    res.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
