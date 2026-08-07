<template>
  <div class="system-page">
    <el-row :gutter="20">
      <el-col :span="8">
        <el-card class="password-card">
          <template #header>
            <div class="card-header">
              <span>修改密码</span>
            </div>
          </template>
          <el-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" label-width="80px">
            <el-form-item label="用户名">
              <el-input :value="username" disabled />
            </el-form-item>
            <el-form-item label="原密码" prop="oldPassword">
              <el-input v-model="passwordForm.oldPassword" type="password" placeholder="请输入原密码" show-password />
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword">
              <el-input v-model="passwordForm.newPassword" type="password" placeholder="请输入新密码（至少6位）" show-password />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input v-model="passwordForm.confirmPassword" type="password" placeholder="请再次输入新密码" show-password />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleChangePassword" :loading="changingPassword">修改密码</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="settings-card">
          <template #header>
            <div class="card-header">
              <span>系统设置</span>
            </div>
          </template>
          <el-form ref="settingsFormRef" :model="settingsForm" :rules="settingsRules" label-width="100px">
            <el-form-item label="系统名称" prop="companyName">
              <el-input v-model="settingsForm.companyName" placeholder="请输入系统名称" />
            </el-form-item>
            <el-form-item label="提前提醒" prop="reminderDays">
              <el-input-number v-model="settingsForm.reminderDays" :min="1" :max="30" />
              <span style="margin-left: 8px">天</span>
            </el-form-item>
            <el-form-item label="联系邮箱">
              <el-input v-model="settingsForm.contactEmail" placeholder="请输入联系邮箱" />
            </el-form-item>
            <el-form-item label="联系电话">
              <el-input v-model="settingsForm.contactPhone" placeholder="请输入联系电话" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSaveSettings" :loading="saving">保存设置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="stats-card">
          <template #header>
            <div class="card-header">
              <span>系统统计</span>
            </div>
          </template>
          <div class="stats-content" v-loading="statsLoading">
            <div class="stat-item">
              <span class="stat-label">用户总数</span>
              <span class="stat-value">{{ systemStats.userCount || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">订单总数</span>
              <span class="stat-value">{{ systemStats.orderCount || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">销售总额</span>
              <span class="stat-value amount">¥{{ (systemStats.totalAmount || 0).toFixed(2) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">自定义字段</span>
              <span class="stat-value">{{ systemStats.fieldCount || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">数据库大小</span>
              <span class="stat-value">{{ formatSize(systemStats.dbSize || 0) }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="backup-card">
      <template #header>
        <div class="card-header">
          <span>数据备份与恢复</span>
          <el-button type="primary" @click="handleBackup" :loading="backingUp">
            <el-icon><Download /></el-icon>立即备份
          </el-button>
        </div>
      </template>

      <el-table :data="backups" stripe style="width: 100%" v-loading="backupsLoading">
        <el-table-column prop="filename" label="备份文件" min-width="200" />
        <el-table-column prop="timestamp" label="备份时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.timestamp) }}
          </template>
        </el-table-column>
        <el-table-column label="数据量" width="150">
          <template #default="{ row }">
            <span v-if="row.recordCount">
              用户: {{ row.recordCount.users }} | 订单: {{ row.recordCount.orders }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="文件大小" width="100">
          <template #default="{ row }">
            {{ formatSize(row.size) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleRestore(row)">恢复</el-button>
            <el-button type="danger" link size="small" @click="handleDeleteBackup(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Download } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import dayjs from 'dayjs'
import { systemApi, authApi } from '@/api'

const username = computed(() => localStorage.getItem('username') || 'admin')

// 修改密码相关
const passwordFormRef = ref<FormInstance>()
const changingPassword = ref(false)
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const validateConfirmPassword = (rule: any, value: string, callback: any) => {
  if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const passwordRules: FormRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

// 系统设置相关
const settingsFormRef = ref<FormInstance>()
const saving = ref(false)
const statsLoading = ref(false)
const backingUp = ref(false)
const backupsLoading = ref(false)

const settingsForm = reactive({
  companyName: '',
  reminderDays: 3,
  contactEmail: '',
  contactPhone: ''
})

const settingsRules: FormRules = {
  companyName: [{ required: true, message: '请输入系统名称', trigger: 'blur' }],
  reminderDays: [{ required: true, message: '请设置提醒天数', trigger: 'blur' }]
}

const systemStats = ref<any>({})
const backups = ref<any[]>([])

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

const formatTime = (timestamp: string) => {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')
}

const handleChangePassword = async () => {
  if (!passwordFormRef.value) return
  await passwordFormRef.value.validate(async (valid) => {
    if (valid) {
      changingPassword.value = true
      try {
        await authApi.changePassword({
          username: username.value,
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword
        })
        ElMessage.success('密码修改成功')
        passwordForm.oldPassword = ''
        passwordForm.newPassword = ''
        passwordForm.confirmPassword = ''
        passwordFormRef.value?.resetFields()
      } catch (error: any) {
        ElMessage.error(error.message || '修改失败')
      } finally {
        changingPassword.value = false
      }
    }
  })
}

const loadSettings = async () => {
  try {
    const settings = await systemApi.getSettings()
    settingsForm.companyName = settings.companyName || ''
    settingsForm.reminderDays = settings.reminderDays || 3
    settingsForm.contactEmail = settings.contactEmail || ''
    settingsForm.contactPhone = settings.contactPhone || ''
  } catch (error: any) {
    ElMessage.error(error.message || '加载设置失败')
  }
}

const loadStats = async () => {
  statsLoading.value = true
  try {
    systemStats.value = await systemApi.getStats()
  } finally {
    statsLoading.value = false
  }
}

const loadBackups = async () => {
  backupsLoading.value = true
  try {
    backups.value = await systemApi.getBackups()
  } finally {
    backupsLoading.value = false
  }
}

const handleSaveSettings = async () => {
  if (!settingsFormRef.value) return
  await settingsFormRef.value.validate(async (valid) => {
    if (valid) {
      saving.value = true
      try {
        await systemApi.updateSettings(settingsForm)
        ElMessage.success('设置保存成功')
      } catch (error: any) {
        ElMessage.error(error.message || '保存失败')
      } finally {
        saving.value = false
      }
    }
  })
}

const handleBackup = async () => {
  try {
    await ElMessageBox.confirm('确定要备份所有数据吗？', '提示', {
      confirmButtonText: '确定备份',
      cancelButtonText: '取消',
      type: 'info'
    })
    backingUp.value = true
    const result = await systemApi.backup()
    ElMessage.success(`备份成功：用户 ${result.recordCount.users} 条，订单 ${result.recordCount.orders} 条`)
    loadBackups()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '备份失败')
    }
  } finally {
    backingUp.value = false
  }
}

const handleRestore = async (backup: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要恢复到 ${formatTime(backup.timestamp)} 的备份吗？\n\n注意：当前数据将被覆盖！`,
      '恢复数据',
      {
        confirmButtonText: '确定恢复',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const result = await systemApi.restore(backup.filename)
    ElMessage.success(`恢复成功：用户 ${result.users} 条，订单 ${result.orders} 条`)
    loadSettings()
    loadStats()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '恢复失败')
    }
  }
}

const handleDeleteBackup = async (backup: any) => {
  try {
    await ElMessageBox.confirm(`确定要删除备份文件 ${backup.filename} 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await systemApi.deleteBackup(backup.filename)
    ElMessage.success('删除成功')
    loadBackups()
  } catch {
    // 取消删除
  }
}

onMounted(() => {
  loadSettings()
  loadStats()
  loadBackups()
})
</script>

<style scoped>
.system-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.password-card,
.settings-card,
.stats-card,
.backup-card {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
}

.stats-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
}

.stat-label {
  color: #666;
  font-size: 14px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.stat-value.amount {
  color: #f56c6c;
}
</style>
