<template>
  <div class="dashboard">
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-title">总用户数</div>
              <div class="stat-value">{{ stats.totalUsers }}</div>
            </div>
            <el-icon class="stat-icon users-icon"><User /></el-icon>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-title">总订单数</div>
              <div class="stat-value">{{ stats.totalOrders }}</div>
            </div>
            <el-icon class="stat-icon orders-icon"><Document /></el-icon>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-title">进行中</div>
              <div class="stat-value">{{ stats.ongoingOrders }}</div>
            </div>
            <el-icon class="stat-icon ongoing-icon"><Clock /></el-icon>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card warning-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-title">即将到期</div>
              <div class="stat-value">{{ stats.expiringOrders }}</div>
            </div>
            <el-icon class="stat-icon warning-icon"><WarningFilled /></el-icon>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="sales-row">
      <el-col :span="8">
        <el-card class="sales-card">
          <template #header>
            <div class="card-header">
              <span>销售统计</span>
            </div>
          </template>
          <div class="sales-content">
            <div class="sales-item">
              <div class="sales-label">当月销售额</div>
              <div class="sales-value current-month">¥{{ currentMonthSales.toFixed(2) }}</div>
            </div>
            <div class="sales-item">
              <div class="sales-label">上月销售额</div>
              <div class="sales-value last-month">¥{{ lastMonthSales.toFixed(2) }}</div>
            </div>
            <div class="sales-item">
              <div class="sales-label">环比增长</div>
              <div class="sales-value" :class="salesGrowth >= 0 ? 'growth-positive' : 'growth-negative'">
                {{ salesGrowth >= 0 ? '+' : '' }}{{ salesGrowth.toFixed(1) }}%
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="16">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>近12个月销售趋势</span>
            </div>
          </template>
          <div class="chart-container">
            <div class="chart-y-axis">
              <span v-for="label in yAxisLabels" :key="label">{{ label }}</span>
            </div>
            <div class="chart-area">
              <div class="chart-bars">
                <div
                  v-for="(item, index) in monthlySales"
                  :key="index"
                  class="chart-bar-wrapper"
                >
                  <div
                    class="chart-bar"
                    :style="{ height: getBarHeight(item.amount) + '%' }"
                    :title="`${item.month}: ¥${item.amount.toFixed(2)}`"
                  ></div>
                  <div class="chart-bar-label">{{ item.month.slice(-2) }}月</div>
                </div>
              </div>
              <div class="chart-line">
                <svg class="line-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <polyline
                    :points="linePoints"
                    fill="none"
                    stroke="#409eff"
                    stroke-width="0.5"
                  />
                </svg>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="content-row">
      <el-col :span="16">
        <el-card class="table-card">
          <template #header>
            <div class="card-header">
              <span>近期订单</span>
              <el-button type="primary" link @click="$router.push('/orders')">查看全部</el-button>
            </div>
          </template>
          <el-table :data="recentOrders" stripe style="width: 100%">
            <el-table-column prop="orderNo" label="订单号" width="160" />
            <el-table-column prop="userName" label="用户" width="100" />
            <el-table-column prop="productName" label="产品" show-overflow-tooltip />
            <el-table-column prop="amount" label="金额" width="100" align="right">
              <template #default="{ row }">
                <span class="amount">¥{{ row.amount.toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="expireTime" label="到期时间" width="120" />
            <el-table-column label="剩余天数" width="100">
              <template #default="{ row }">
                <el-tag :type="getRemainDaysTag(row.expireTime)">
                  {{ getRemainDaysText(row.expireTime) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="reminder-card">
          <template #header>
            <div class="card-header">
              <span>到期提醒</span>
              <el-badge :value="expiringOrders.length" :hidden="expiringOrders.length === 0">
                <el-icon><Bell /></el-icon>
              </el-badge>
            </div>
          </template>
          <div v-if="expiringOrders.length === 0" class="empty-reminder">
            <el-empty description="暂无即将到期订单" :image-size="80" />
          </div>
          <div v-else class="reminder-list">
            <div v-for="order in expiringOrders" :key="order.id" class="reminder-item">
              <div class="reminder-info">
                <div class="user-name">{{ order.userName }}</div>
                <div class="product-name">{{ order.productName }}</div>
                <div class="expire-time">
                  <el-tag :type="getRemainDaysTag(order.expireTime)" size="small">
                    剩余 {{ getRemainDays(order.expireTime) }} 天
                  </el-tag>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { User, Document, Clock, WarningFilled, Bell } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { useUserStore, useOrderStore } from '@/stores'

const userStore = useUserStore()
const orderStore = useOrderStore()

const stats = computed(() => ({
  totalUsers: userStore.totalUsers,
  ...orderStore.getStats
}))

// 计算当月和上月销售额
const currentMonthSales = computed(() => {
  const currentMonth = dayjs().format('YYYY-MM')
  return orderStore.orders
    .filter(o => o.orderTime.startsWith(currentMonth))
    .reduce((sum, o) => sum + o.amount, 0)
})

const lastMonthSales = computed(() => {
  const lastMonth = dayjs().subtract(1, 'month').format('YYYY-MM')
  return orderStore.orders
    .filter(o => o.orderTime.startsWith(lastMonth))
    .reduce((sum, o) => sum + o.amount, 0)
})

const salesGrowth = computed(() => {
  if (lastMonthSales.value === 0) return currentMonthSales.value > 0 ? 100 : 0
  return ((currentMonthSales.value - lastMonthSales.value) / lastMonthSales.value) * 100
})

// 近12个月销售数据
const monthlySales = computed(() => {
  const months: { month: string; amount: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const month = dayjs().subtract(i, 'month').format('YYYY-MM')
    const amount = orderStore.orders
      .filter(o => o.orderTime.startsWith(month))
      .reduce((sum, o) => sum + o.amount, 0)
    months.push({ month, amount })
  }
  return months
})

const maxMonthlySales = computed(() => {
  return Math.max(...monthlySales.value.map(m => m.amount), 1)
})

const yAxisLabels = computed(() => {
  const max = maxMonthlySales.value
  return [
    `¥${(max).toFixed(0)}`,
    `¥${(max * 0.75).toFixed(0)}`,
    `¥${(max * 0.5).toFixed(0)}`,
    `¥${(max * 0.25).toFixed(0)}`,
    '¥0'
  ]
})

const getBarHeight = (amount: number) => {
  return (amount / maxMonthlySales.value) * 100
}

const linePoints = computed(() => {
  const points: string[] = []
  const total = monthlySales.value.length
  monthlySales.value.forEach((item, index) => {
    const x = (index / (total - 1)) * 100
    const y = 100 - (item.amount / maxMonthlySales.value) * 100
    points.push(`${x},${y}`)
  })
  return points.join(' ')
})

const recentOrders = computed(() => {
  return [...orderStore.orders]
    .sort((a, b) => dayjs(b.createdAt).diff(dayjs(a.createdAt)))
    .slice(0, 8)
})

const expiringOrders = computed(() => orderStore.getExpiringOrders)

const getRemainDays = (expireTime: string) => {
  return dayjs(expireTime).diff(dayjs(), 'day')
}

const getRemainDaysText = (expireTime: string) => {
  const days = getRemainDays(expireTime)
  if (days < 0) return '已过期'
  if (days === 0) return '今天到期'
  return `${days}天`
}

const getRemainDaysTag = (expireTime: string) => {
  const days = getRemainDays(expireTime)
  if (days < 0) return 'info'
  if (days <= 1) return 'danger'
  if (days <= 3) return 'warning'
  return 'success'
}

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    '进行中': 'primary',
    '已到期': 'danger',
    '已完成': 'success'
  }
  return map[status] || 'info'
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
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stats-row,
.sales-row,
.content-row {
  margin-bottom: 0;
}

.stat-card {
  height: 100px;
}

.stat-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-info {
  flex: 1;
}

.stat-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #333;
}

.stat-icon {
  font-size: 48px;
  opacity: 0.2;
}

.users-icon {
  color: #409eff;
}

.orders-icon {
  color: #67c23a;
}

.ongoing-icon {
  color: #909399;
}

.warning-icon {
  color: #e6a23c;
}

.warning-card .stat-value {
  color: #e6a23c;
}

.sales-card {
  height: 100%;
}

.sales-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sales-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sales-label {
  color: #666;
  font-size: 14px;
}

.sales-value {
  font-size: 18px;
  font-weight: 600;
}

.sales-value.current-month {
  color: #409eff;
}

.sales-value.last-month {
  color: #909399;
}

.sales-value.growth-positive {
  color: #67c23a;
}

.sales-value.growth-negative {
  color: #f56c6c;
}

.chart-card {
  height: 100%;
}

.chart-container {
  display: flex;
  height: 280px;
  padding: 10px 0;
}

.chart-y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 60px;
  font-size: 12px;
  color: #999;
  text-align: right;
  padding-right: 10px;
}

.chart-area {
  flex: 1;
  position: relative;
  border-left: 1px solid #eee;
  border-bottom: 1px solid #eee;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  height: 100%;
  padding: 0 4px;
}

.chart-bar-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
}

.chart-bar {
  width: 80%;
  background: linear-gradient(180deg, #409eff 0%, #79bbff 100%);
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  transition: height 0.3s ease;
  cursor: pointer;
}

.chart-bar:hover {
  background: linear-gradient(180deg, #337ecc 0%, #409eff 100%);
}

.chart-bar-label {
  font-size: 11px;
  color: #999;
  margin-top: 8px;
  white-space: nowrap;
}

.chart-line {
  position: absolute;
  top: 0;
  left: 4px;
  right: 4px;
  bottom: 0;
  pointer-events: none;
}

.line-svg {
  width: 100%;
  height: 100%;
}

.table-card,
.reminder-card {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
}

.amount {
  color: #f56c6c;
  font-weight: 500;
}

.reminder-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.reminder-item {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  border-left: 3px solid #e6a23c;
}

.reminder-info .user-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.reminder-info .product-name {
  color: #666;
  font-size: 14px;
  margin-bottom: 4px;
}

.reminder-info .expire-time {
  display: flex;
  align-items: center;
  gap: 8px;
}

.empty-reminder {
  padding: 20px 0;
}
</style>
