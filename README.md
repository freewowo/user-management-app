# 用户信息管理系统

一个用于管理和追踪用户订单信息的Web应用，支持动态字段配置、数据导入导出、操作日志等功能。

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Vue 3 + TypeScript | 3.5.x |
| UI组件库 | Element Plus | 2.14.x |
| 状态管理 | Pinia | 4.x |
| 路由 | Vue Router | 4.x |
| 构建工具 | Vite | 8.x |
| 后端框架 | Express | 5.x |
| 数据库 | SQLite (better-sqlite3) | 13.x |
| 日期处理 | dayjs | 1.x |
| Excel处理 | xlsx | 0.18.x |

## 功能特性

- **用户管理**：支持动态字段渲染、多条件筛选、CRUD操作
- **订单管理**：支持多条件筛选、表头排序、汇总金额显示、导出Excel
- **数据导入**：支持Excel/CSV格式，数据预览和校验
- **字段管理**：系统预设+自定义字段，支持文本、数字、日期、下拉选择等类型
- **系统管理**：系统设置、数据备份/恢复、操作日志
- **登录认证**：算术验证码，登录状态持久化
- **首页仪表盘**：统计卡片、销售趋势图、到期提醒

## 快速开始

### 安装依赖

```bash
cd user-management
npm install
cd server && npm install && cd ..
```

### 启动开发环境

```bash
# 前后端同时启动（推荐）
npm run dev:all

# 或分别启动
npm run dev:server    # 后端 (端口3000)
npm run dev           # 前端 (端口5173)
```

### 生产构建

```bash
npm run build
```

### 数据初始化

```bash
# 生成测试数据
cd server && node seed.js

# 重置数据库
cd server && node reset-db.js
```

## 默认账号

- 用户名：`admin`
- 密码：`admin123`

## 项目结构

```
user-management/
├── server/                    # 后端服务
│   ├── index.js              # Express入口
│   ├── db.js                 # SQLite数据库初始化
│   ├── seed.js               # 测试数据生成
│   ├── reset-db.js           # 数据库重置
│   ├── data/                 # 数据库文件
│   └── routes/               # API路由
├── src/                       # 前端代码
│   ├── api/                  # API调用层
│   ├── stores/               # Pinia状态管理
│   ├── router/               # 路由配置
│   ├── types/                # TypeScript类型
│   ├── layouts/              # 布局组件
│   └── views/                # 页面组件
├── package.json
└── vite.config.ts
```

## API接口

| 模块 | 路径 | 说明 |
|------|------|------|
| 认证 | `/api/auth` | 登录、验证码、改密 |
| 用户 | `/api/users` | 用户CRUD |
| 订单 | `/api/orders` | 订单CRUD、批量导入 |
| 字段 | `/api/fields` | 字段配置管理 |
| 系统 | `/api/system` | 设置、备份、统计 |
| 日志 | `/api/logs` | 操作日志 |

## 局域网访问

系统默认监听所有网卡，局域网内其他设备可通过以下地址访问：
- 前端：`http://你的IP:5173`
- 后端：`http://你的IP:3000`

## 注意事项

- 数据库文件位于 `server/data/user_management.db`
- 备份文件存储在 `server/data/backups/` 目录
- 密码使用SHA256哈希存储
- 系统启动时会自动检测并添加缺失的数据库字段