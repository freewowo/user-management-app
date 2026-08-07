<template>
  <el-container class="layout-container">
    <el-aside :width="isCollapse ? '64px' : '220px'" class="aside">
      <div class="logo">
        <span v-if="!isCollapse">用户管理系统</span>
        <span v-else>UM</span>
      </div>
      <el-menu
        :default-active="currentRoute"
        :collapse="isCollapse"
        router
        class="menu"
      >
        <el-menu-item index="/">
          <el-icon><HomeFilled /></el-icon>
          <template #title>首页</template>
        </el-menu-item>
        <el-menu-item index="/users">
          <el-icon><User /></el-icon>
          <template #title>用户管理</template>
        </el-menu-item>
        <el-menu-item index="/orders">
          <el-icon><Document /></el-icon>
          <template #title>订单管理</template>
        </el-menu-item>
        <el-menu-item index="/import">
          <el-icon><Upload /></el-icon>
          <template #title>导入导出</template>
        </el-menu-item>
        <el-menu-item index="/fields">
          <el-icon><Setting /></el-icon>
          <template #title>字段管理</template>
        </el-menu-item>
        <el-menu-item index="/system">
          <el-icon><Tools /></el-icon>
          <template #title>系统管理</template>
        </el-menu-item>
        <el-menu-item index="/logs">
          <el-icon><Notebook /></el-icon>
          <template #title>操作日志</template>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="isCollapse = !isCollapse">
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
          <span class="page-title">{{ currentTitle }}</span>
        </div>
        <div class="header-right">
          <el-badge :value="expiringCount" :hidden="expiringCount === 0" class="reminder-badge">
            <el-button :icon="Bell" circle @click="showReminders = true" />
          </el-badge>
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-icon><User /></el-icon>
              <span>{{ username }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="system">系统管理</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>

  <el-drawer v-model="showReminders" title="到期提醒" size="400px">
    <div v-if="expiringOrders.length === 0" class="empty-reminder">
      <el-empty description="暂无即将到期的订单" />
    </div>
    <div v-else class="reminder-list">
      <div v-for="order in expiringOrders" :key="order.id" class="reminder-item">
        <div class="reminder-info">
          <div class="user-name">{{ order.userName }}</div>
          <div class="product-name">{{ order.productName }}</div>
          <div class="expire-time">
            到期时间：{{ order.expireTime }}
            <el-tag :type="getRemainDaysTag(order.expireTime)" size="small">
              剩余 {{ getRemainDays(order.expireTime) }} 天
            </el-tag>
          </div>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { HomeFilled, User, Document, Upload, Setting, Tools, Bell, Fold, Expand, Notebook } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { useUserStore, useOrderStore } from '@/stores'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const orderStore = useOrderStore()

const isCollapse = ref(false)
const showReminders = ref(false)
const username = computed(() => localStorage.getItem('username') || 'admin')

const currentRoute = computed(() => route.path)
const currentTitle = computed(() => route.meta.title as string)

const expiringOrders = computed(() => orderStore.getExpiringOrders)
const expiringCount = computed(() => expiringOrders.value.length)

const getRemainDays = (expireTime: string) => {
  return dayjs(expireTime).diff(dayjs(), 'day')
}

const getRemainDaysTag = (expireTime: string) => {
  const days = getRemainDays(expireTime)
  if (days <= 1) return 'danger'
  if (days <= 3) return 'warning'
  return 'success'
}

const handleCommand = (command: string) => {
  if (command === 'logout') {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('username')
    router.push('/login')
  } else if (command === 'system') {
    router.push('/system')
  }
}

onMounted(async () => {
  await Promise.all([
    userStore.fetchUsers(),
    orderStore.fetchOrders(),
    orderStore.fetchSettings()
  ])
})
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.aside {
  background-color: #001529;
  transition: width 0.3s;
  overflow: hidden;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid #0d2137;
}

.menu {
  border-right: none;
  background-color: #001529;
}

.menu:not(.el-menu--collapse) {
  width: 220px;
}

.el-menu {
  --el-menu-bg-color: #001529;
  --el-menu-text-color: #ffffffa6;
  --el-menu-active-color: #fff;
}

.el-menu-item:hover {
  background-color: rgba(24, 144, 255, 0.3) !important;
}

.el-menu-item.is-active {
  background-color: #1890ff !important;
  color: #fff !important;
}

.el-menu-item.is-active .el-icon {
  color: #fff !important;
}

.header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: #333;
}

.page-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.main {
  background: #f0f2f5;
  padding: 20px;
}

.reminder-badge {
  margin-right: 10px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: #333;
  font-size: 14px;
}

.user-info:hover {
  color: #409eff;
}

.reminder-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reminder-item {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  border-left: 3px solid #e6a23c;
}

.reminder-item .user-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.reminder-item .product-name {
  color: #666;
  font-size: 14px;
  margin-bottom: 4px;
}

.reminder-item .expire-time {
  font-size: 12px;
  color: #999;
  display: flex;
  align-items: center;
  gap: 8px;
}

.empty-reminder {
  padding: 40px 0;
}
</style>
