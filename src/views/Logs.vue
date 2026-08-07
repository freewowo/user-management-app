<template>
  <div class="logs-page">
    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="操作人">
          <el-input v-model="filterForm.username" placeholder="用户名" clearable style="width: 120px" />
        </el-form-item>
        <el-form-item label="模块">
          <el-select v-model="filterForm.module" placeholder="全部" clearable style="width: 120px">
            <el-option label="认证" value="认证" />
            <el-option label="用户管理" value="用户管理" />
            <el-option label="订单管理" value="订单管理" />
            <el-option label="系统管理" value="系统管理" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作">
          <el-select v-model="filterForm.action" placeholder="全部" clearable style="width: 120px">
            <el-option label="登录成功" value="登录成功" />
            <el-option label="登录失败" value="登录失败" />
            <el-option label="新增用户" value="新增用户" />
            <el-option label="更新用户" value="更新用户" />
            <el-option label="删除用户" value="删除用户" />
            <el-option label="新增订单" value="新增订单" />
            <el-option label="更新订单" value="更新订单" />
            <el-option label="删除订单" value="删除订单" />
            <el-option label="修改密码" value="修改密码" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filterForm.keyword" placeholder="搜索目标/详情" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleFilter">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-row :gutter="20">
      <el-col :span="18">
        <el-card class="table-card">
          <template #header>
            <div class="card-header">
              <span>操作日志</span>
              <div class="header-actions">
                <el-button type="danger" plain size="small" @click="handleClearLogs">
                  <el-icon><Delete /></el-icon>清空日志
                </el-button>
              </div>
            </div>
          </template>

          <el-table :data="logs" stripe style="width: 100%" v-loading="loading">
            <el-table-column prop="createdAt" label="时间" width="170" />
            <el-table-column prop="username" label="操作人" width="100" />
            <el-table-column prop="module" label="模块" width="100">
              <template #default="{ row }">
                <el-tag :type="getModuleType(row.module)" size="small">{{ row.module }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="action" label="操作" width="110">
              <template #default="{ row }">
                <el-tag :type="getActionType(row.action)" size="small">{{ row.action }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="targetName" label="目标" width="150" show-overflow-tooltip />
            <el-table-column prop="detail" label="详情" show-overflow-tooltip />
            <el-table-column prop="ipAddress" label="IP地址" width="130" />
          </el-table>

          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="[20, 50, 100, 200]"
              :total="total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="loadLogs"
              @current-change="loadLogs"
            />
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stats-card">
          <template #header>
            <div class="card-header">
              <span>统计信息</span>
            </div>
          </template>
          <div class="stats-content" v-loading="statsLoading">
            <div class="stat-item">
              <span class="stat-label">今日操作</span>
              <span class="stat-value">{{ stats.recentStats?.totalToday || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">最近1小时</span>
              <span class="stat-value">{{ stats.recentStats?.lastHour || 0 }}</span>
            </div>
          </div>
          <div class="module-stats">
            <h4>操作分布</h4>
            <div v-for="item in stats.stats" :key="`${item.module}-${item.action}`" class="module-stat-item">
              <span class="module-name">{{ item.module }}</span>
              <span class="action-name">{{ item.action }}</span>
              <span class="count">{{ item.count }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { logApi } from '@/api'

const loading = ref(false)
const statsLoading = ref(false)
const logs = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const stats = ref<any>({})

const filterForm = reactive({
  username: '',
  module: '',
  action: '',
  dateRange: null as [string, string] | null,
  keyword: ''
})

const getModuleType = (module: string) => {
  const map: Record<string, string> = {
    '认证': 'danger',
    '用户管理': 'primary',
    '订单管理': 'success',
    '系统管理': 'warning'
  }
  return map[module] || 'info'
}

const getActionType = (action: string) => {
  if (action.includes('成功')) return 'success'
  if (action.includes('失败')) return 'danger'
  if (action.includes('删除')) return 'danger'
  if (action.includes('新增')) return 'primary'
  return 'info'
}

const loadLogs = async () => {
  loading.value = true
  try {
    const params = {
      username: filterForm.username || undefined,
      module: filterForm.module || undefined,
      action: filterForm.action || undefined,
      startDate: filterForm.dateRange?.[0] || undefined,
      endDate: filterForm.dateRange?.[1] || undefined,
      keyword: filterForm.keyword || undefined,
      page: currentPage.value,
      pageSize: pageSize.value
    }
    const result = await logApi.getList(params)
    logs.value = result.list
    total.value = result.total
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  statsLoading.value = true
  try {
    stats.value = await logApi.getStats()
  } finally {
    statsLoading.value = false
  }
}

const handleFilter = () => {
  currentPage.value = 1
  loadLogs()
}

const resetFilter = () => {
  filterForm.username = ''
  filterForm.module = ''
  filterForm.action = ''
  filterForm.dateRange = null
  filterForm.keyword = ''
  currentPage.value = 1
  loadLogs()
}

const handleClearLogs = async () => {
  try {
    await ElMessageBox.confirm('确定要清空所有日志吗？此操作不可恢复！', '清空日志', {
      confirmButtonText: '确定清空',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await logApi.clear()
    ElMessage.success('日志已清空')
    loadLogs()
    loadStats()
  } catch {
    // 取消操作
  }
}

onMounted(() => {
  loadLogs()
  loadStats()
})
</script>

<style scoped>
.logs-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-card {
  margin-bottom: 0;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.filter-form .el-form-item {
  margin-bottom: 0;
}

.table-card {
  margin-bottom: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.stats-card {
  height: 100%;
}

.stats-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 6px;
}

.stat-label {
  color: #666;
  font-size: 14px;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #409eff;
}

.module-stats h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.module-stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  font-size: 13px;
  border-bottom: 1px dashed #f0f0f0;
}

.module-stat-item:last-child {
  border-bottom: none;
}

.module-name {
  color: #409eff;
}

.action-name {
  color: #666;
  flex: 1;
}

.count {
  font-weight: 600;
  color: #333;
}
</style>
