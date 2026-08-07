<template>
  <div class="users-page">
    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="关键词">
          <el-input v-model="filterForm.keyword" placeholder="姓名/手机号" clearable @clear="handleFilter" @keyup.enter="handleFilter" />
        </el-form-item>
        <template v-for="field in activeFields" :key="field.fieldKey">
          <el-form-item v-if="field.fieldType === 'select'" :label="field.fieldLabel">
            <el-select v-model="filterForm[getFieldDataKey(field.fieldKey)]" placeholder="全部" clearable style="width: 120px" @change="handleFilter">
              <el-option v-for="opt in parseOptions(field.options)" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </el-form-item>
        </template>
        <el-form-item>
          <el-button type="primary" @click="handleFilter">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>用户列表</span>
          <div class="header-actions">
            <el-button type="primary" @click="handleAdd">
              <el-icon><Plus /></el-icon>新增用户
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="userStore.users" stripe style="width: 100%" v-loading="userStore.loading">
        <template v-for="field in activeFields" :key="field.fieldKey">
          <el-table-column :prop="getFieldDataKey(field.fieldKey)" :label="field.fieldLabel" :show-overflow-tooltip="field.fieldType !== 'select'" :width="getColumnWidth(field)">
            <template #default="{ row }" v-if="field.fieldType === 'select'">
              <el-tag :type="field.fieldKey === 'status' ? getStatusType(row[getFieldDataKey(field.fieldKey)]) : 'info'" size="small">
                {{ row[getFieldDataKey(field.fieldKey)] || '-' }}
              </el-tag>
            </template>
            <template #default="{ row }" v-else-if="field.fieldType === 'number'">
              {{ row[getFieldDataKey(field.fieldKey)] || '-' }}
            </template>
            <template #default="{ row }" v-else>
              {{ row[getFieldDataKey(field.fieldKey)] || '-' }}
            </template>
          </el-table-column>
        </template>
        <el-table-column prop="createdAt" label="创建时间" width="170" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="info" link size="small" @click="handleView(row)">详情</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="700px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <template v-for="field in activeFields" :key="field.fieldKey">
          <el-form-item :label="field.fieldLabel" :prop="getFieldDataKey(field.fieldKey)" :rules="field.isRequired ? [{ required: true, message: `请输入${field.fieldLabel}`, trigger: 'blur' }] : []">
            <el-input v-if="field.fieldType === 'text'" v-model="form[getFieldDataKey(field.fieldKey)]" :placeholder="field.placeholder" />
            <el-input v-else-if="field.fieldType === 'textarea'" v-model="form[getFieldDataKey(field.fieldKey)]" type="textarea" :rows="3" :placeholder="field.placeholder" />
            <el-input-number v-else-if="field.fieldType === 'number'" v-model="form[getFieldDataKey(field.fieldKey)]" :placeholder="field.placeholder" style="width: 100%" />
            <el-date-picker v-else-if="field.fieldType === 'date'" v-model="form[getFieldDataKey(field.fieldKey)]" type="date" :placeholder="field.placeholder" style="width: 100%" value-format="YYYY-MM-DD" />
            <el-select v-else-if="field.fieldType === 'select'" v-model="form[getFieldDataKey(field.fieldKey)]" :placeholder="field.placeholder" style="width: 100%">
              <el-option v-for="opt in parseOptions(field.options)" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="用户详情" width="700px" destroy-on-close>
      <div v-if="currentUser" class="user-detail">
        <el-descriptions :column="2" border>
          <template v-for="field in activeFields" :key="field.fieldKey">
            <el-descriptions-item :label="field.fieldLabel">{{ currentUser[getFieldDataKey(field.fieldKey)] || '-' }}</el-descriptions-item>
          </template>
          <el-descriptions-item label="创建时间">{{ currentUser.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ currentUser.updatedAt }}</el-descriptions-item>
        </el-descriptions>

        <div class="user-orders">
          <h4>关联订单</h4>
          <el-table :data="currentUserOrders" stripe style="width: 100%">
            <el-table-column prop="orderNo" label="订单号" width="140" />
            <el-table-column prop="productName" label="产品" show-overflow-tooltip />
            <el-table-column prop="amount" label="金额" width="100">
              <template #default="{ row }">¥{{ row.amount.toFixed(2) }}</template>
            </el-table-column>
            <el-table-column prop="orderTime" label="下单时间" width="120" />
            <el-table-column prop="expireTime" label="到期时间" width="120" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { useUserStore, useOrderStore } from '@/stores'
import { fieldApi } from '@/api'
import type { User } from '@/types'

const userStore = useUserStore()
const orderStore = useOrderStore()

interface FieldConfig {
  id: number
  targetType: string
  fieldKey: string
  fieldLabel: string
  fieldType: string
  isRequired: number
  isSystem: number
  placeholder: string
  options: string
  sortOrder: number
  isActive: number
}

const activeFields = ref<FieldConfig[]>([])
const loading = ref(false)

const filterForm = reactive<Record<string, any>>({
  keyword: '',
  source: ''
})

const dialogVisible = ref(false)
const detailVisible = ref(false)
const dialogTitle = ref('新增用户')
const currentUser = ref<User | null>(null)
const formRef = ref<FormInstance>()
const submitting = ref(false)

const form = reactive<Record<string, any>>({})

const rules: Record<string, any> = {
  userName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }]
}

const currentUserOrders = computed(() => {
  if (!currentUser.value) return []
  return orderStore.orders.filter(o => o.userId === currentUser.value!.id)
})

const parseOptions = (optionsStr: string) => {
  try {
    return JSON.parse(optionsStr)
  } catch {
    return []
  }
}

const snakeToCamel = (str: string) => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

const getFieldDataKey = (fieldKey: string) => {
  return snakeToCamel(fieldKey)
}

const getColumnWidth = (field: FieldConfig) => {
  if (field.fieldType === 'select') return 120
  if (field.fieldType === 'number') return 100
  if (field.fieldType === 'date') return 120
  if (field.fieldType === 'textarea') return 200
  return 150
}

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    '进行中': 'primary',
    '已到期': 'danger',
    '已完成': 'success'
  }
  return map[status] || 'info'
}

const loadFields = async () => {
  loading.value = true
  try {
    activeFields.value = await fieldApi.getList('user')
    activeFields.value = activeFields.value.filter(f => f.isActive)
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  activeFields.value.forEach(field => {
    const dataKey = getFieldDataKey(field.fieldKey)
    if (field.fieldType === 'number') {
      form[dataKey] = 0
    } else {
      form[dataKey] = ''
    }
  })
}

const handleAdd = () => {
  resetForm()
  dialogTitle.value = '新增用户'
  dialogVisible.value = true
}

const handleEdit = (user: User) => {
  resetForm()
  activeFields.value.forEach(field => {
    const dataKey = getFieldDataKey(field.fieldKey)
    form[dataKey] = (user as any)[dataKey] || ''
  })
  form.id = user.id
  dialogTitle.value = '编辑用户'
  dialogVisible.value = true
}

const handleView = (user: User) => {
  currentUser.value = user
  detailVisible.value = true
}

const handleDelete = async (user: User) => {
  try {
    await ElMessageBox.confirm(`确定要删除用户"${user.userName}"吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await userStore.deleteUser(user.id)
    ElMessage.success('删除成功')
  } catch {
    // 取消删除
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        const data: Record<string, any> = {}
        activeFields.value.forEach(field => {
          const dataKey = getFieldDataKey(field.fieldKey)
          data[dataKey] = form[dataKey]
        })

        if (form.id) {
          await userStore.updateUser(form.id, data)
          ElMessage.success('更新成功')
        } else {
          await userStore.addUser(data)
          ElMessage.success('添加成功')
        }
        dialogVisible.value = false
      } catch (error: any) {
        ElMessage.error(error.message || '操作失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

const handleFilter = async () => {
  await userStore.fetchUsers({
    keyword: filterForm.keyword || undefined,
    source: filterForm.source || undefined
  })
}

const resetFilter = async () => {
  filterForm.keyword = ''
  filterForm.source = ''
  activeFields.value.forEach(field => {
    const dataKey = getFieldDataKey(field.fieldKey)
    if (filterForm[dataKey] !== undefined) {
      filterForm[dataKey] = ''
    }
  })
  await userStore.fetchUsers()
}

onMounted(async () => {
  await loadFields()
  await userStore.fetchUsers()
  await orderStore.fetchOrders()
})
</script>

<style scoped>
.users-page {
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

.user-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.user-orders h4 {
  margin: 0 0 12px 0;
  font-weight: 500;
  color: #333;
}
</style>
