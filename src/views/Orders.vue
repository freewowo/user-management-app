<template>
  <div class="orders-page">
    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="关键词">
          <el-input v-model="filterForm.keyword" placeholder="用户/订单号/产品" clearable @clear="handleFilter" @keyup.enter="handleFilter" />
        </el-form-item>
        <template v-for="field in activeFields" :key="field.fieldKey">
          <el-form-item v-if="field.fieldType === 'select'" :label="field.fieldLabel">
            <el-select v-model="filterForm[getFieldDataKey(field.fieldKey)]" placeholder="全部" clearable style="width: 120px" @change="handleFilter">
              <el-option v-for="opt in parseOptions(field.options)" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </el-form-item>
          <el-form-item v-else-if="field.fieldType === 'number'" :label="field.fieldLabel">
            <el-input-number v-model="filterForm[`min_${getFieldDataKey(field.fieldKey)}`]" :min="0" :precision="2" placeholder="最小" style="width: 100px" />
            <span style="margin: 0 4px">-</span>
            <el-input-number v-model="filterForm[`max_${getFieldDataKey(field.fieldKey)}`]" :min="0" :precision="2" placeholder="最大" style="width: 100px" />
          </el-form-item>
        </template>
        <el-form-item label="下单时间">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            @change="handleFilter"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleFilter">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <span>订单列表</span>
            <el-tag type="info" size="small">共 {{ filteredOrders.length }} 条</el-tag>
            <el-tag type="success" size="small">合计 ¥{{ totalAmount.toFixed(2) }}</el-tag>
          </div>
          <div class="header-actions">
            <el-button type="success" @click="handleExport">
              <el-icon><Download /></el-icon>导出
            </el-button>
            <el-button type="primary" @click="handleAdd">
              <el-icon><Plus /></el-icon>新增订单
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="paginatedOrders"
        stripe
        style="width: 100%"
        v-loading="orderStore.loading"
        @sort-change="handleSortChange"
      >
        <template v-for="field in activeFields" :key="field.fieldKey">
          <el-table-column 
            :prop="getFieldDataKey(field.fieldKey)" 
            :label="field.fieldLabel" 
            :show-overflow-tooltip="field.fieldType !== 'select'" 
            :width="getColumnWidth(field)"
            sortable="custom"
          >
            <template #default="{ row }" v-if="field.fieldType === 'select'">
              <el-tag :type="field.fieldKey === 'status' ? getStatusType(row[getFieldDataKey(field.fieldKey)]) : 'info'" size="small">
                {{ row[getFieldDataKey(field.fieldKey)] || '-' }}
              </el-tag>
            </template>
            <template #default="{ row }" v-else-if="field.fieldType === 'number' && field.fieldKey === 'amount'">
              <span class="amount">¥{{ (row[getFieldDataKey(field.fieldKey)] || 0).toFixed(2) }}</span>
            </template>
            <template #default="{ row }" v-else-if="field.fieldType === 'number'">
              {{ row[getFieldDataKey(field.fieldKey)] || '-' }}
            </template>
            <template #default="{ row }" v-else>
              {{ row[getFieldDataKey(field.fieldKey)] || '-' }}
            </template>
          </el-table-column>
        </template>
        <el-table-column label="剩余天数" width="110" align="center" sortable="custom" :sort-method="sortByRemainDays">
          <template #default="{ row }">
            <el-tag :type="getRemainDaysTag(row.expireTime)">
              {{ getRemainDaysText(row.expireTime) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="warning" link size="small" @click="handleComplete(row)" v-if="row.status !== '已完成'">完成</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="filteredOrders.length"
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="700px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <template v-for="field in activeFields" :key="field.fieldKey">
          <el-form-item :label="field.fieldLabel" :prop="getFieldDataKey(field.fieldKey)" :rules="field.isRequired ? [{ required: true, message: `请选择${field.fieldLabel}`, trigger: field.fieldType === 'select' ? 'change' : 'blur' }] : []">
            <template v-if="field.fieldKey === 'user_id'">
              <el-select v-model="form.userId" placeholder="请选择用户" filterable style="width: 100%">
                <el-option
                  v-for="user in userStore.users"
                  :key="user.id"
                  :label="`${user.userName} (${user.phone})`"
                  :value="user.id"
                />
              </el-select>
            </template>
            <template v-else-if="field.fieldType === 'text'">
              <el-input v-model="form[getFieldDataKey(field.fieldKey)]" :placeholder="field.placeholder" />
            </template>
            <template v-else-if="field.fieldType === 'textarea'">
              <el-input v-model="form[getFieldDataKey(field.fieldKey)]" type="textarea" :rows="3" :placeholder="field.placeholder" />
            </template>
            <template v-else-if="field.fieldType === 'number'">
              <el-input-number v-model="form[getFieldDataKey(field.fieldKey)]" :min="0" :precision="2" style="width: 100%" />
            </template>
            <template v-else-if="field.fieldType === 'date'">
              <el-date-picker
                v-model="form[getFieldDataKey(field.fieldKey)]"
                type="datetime"
                :placeholder="field.placeholder"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />
            </template>
            <template v-else-if="field.fieldType === 'select'">
              <el-select v-model="form[getFieldDataKey(field.fieldKey)]" :placeholder="field.placeholder" style="width: 100%">
                <el-option v-for="opt in parseOptions(field.options)" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </template>
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { Plus, Download } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance } from 'element-plus'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { useUserStore, useOrderStore } from '@/stores'
import { fieldApi } from '@/api'
import type { OrderWithUser } from '@/types'

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
  dateRange: null as [string, string] | null
})

const dialogVisible = ref(false)
const dialogTitle = ref('新增订单')
const formRef = ref<FormInstance>()
const currentPage = ref(1)
const pageSize = ref(10)
const submitting = ref(false)

const sortState = reactive({
  prop: '',
  order: '' as '' | 'ascending' | 'descending'
})

const form = reactive<Record<string, any>>({})

const rules: Record<string, any> = {
  userId: [{ required: true, message: '请选择用户', trigger: 'change' }],
  orderNo: [{ required: true, message: '请输入订单号', trigger: 'blur' }],
  productName: [{ required: true, message: '请输入产品名称', trigger: 'blur' }],
  amount: [{ required: true, message: '请输入订单金额', trigger: 'blur' }],
  orderTime: [{ required: true, message: '请选择下单时间', trigger: 'change' }],
  expireTime: [{ required: true, message: '请选择到期时间', trigger: 'change' }]
}

const filteredOrders = computed(() => {
  let result = [...orderStore.orders]

  if (filterForm.keyword) {
    const kw = filterForm.keyword.toLowerCase()
    result = result.filter(o =>
      (o.userName || '').toLowerCase().includes(kw) ||
      o.orderNo.toLowerCase().includes(kw) ||
      o.productName.toLowerCase().includes(kw)
    )
  }

  if (filterForm.dateRange) {
    const [start, end] = filterForm.dateRange
    result = result.filter(o =>
      dayjs(o.orderTime).isAfter(dayjs(start).subtract(1, 'day')) &&
      dayjs(o.orderTime).isBefore(dayjs(end).add(1, 'day'))
    )
  }

  activeFields.value.forEach(field => {
    const dataKey = getFieldDataKey(field.fieldKey)
    if (field.fieldType === 'select' && filterForm[dataKey]) {
      result = result.filter(o => o[dataKey] === filterForm[dataKey])
    }
    if (field.fieldType === 'number') {
      const minKey = `min_${dataKey}`
      const maxKey = `max_${dataKey}`
      if (filterForm[minKey] !== undefined) {
        result = result.filter(o => (o[dataKey] || 0) >= filterForm[minKey])
      }
      if (filterForm[maxKey] !== undefined) {
        result = result.filter(o => (o[dataKey] || 0) <= filterForm[maxKey])
      }
    }
  })

  if (sortState.prop && sortState.order) {
    result.sort((a: any, b: any) => {
      let aVal = sortState.prop === 'remainDays' ? dayjs(a.expireTime).diff(dayjs(), 'day') : a[sortState.prop]
      let bVal = sortState.prop === 'remainDays' ? dayjs(b.expireTime).diff(dayjs(), 'day') : b[sortState.prop]

      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()

      if (sortState.order === 'ascending') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })
  }

  return result
})

const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredOrders.value.slice(start, end)
})

const totalAmount = computed(() => {
  return filteredOrders.value.reduce((sum, order) => sum + (order.amount || 0), 0)
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
  if (field.fieldType === 'date') return 160
  if (field.fieldType === 'textarea') return 200
  return 150
}

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

const sortByRemainDays = (a: OrderWithUser, b: OrderWithUser) => {
  const daysA = dayjs(a.expireTime).diff(dayjs(), 'day')
  const daysB = dayjs(b.expireTime).diff(dayjs(), 'day')
  return daysA - daysB
}

const handleSortChange = ({ prop, order }: { prop: string; order: string }) => {
  sortState.prop = prop
  sortState.order = order as '' | 'ascending' | 'descending'
}

const loadFields = async () => {
  loading.value = true
  try {
    activeFields.value = await fieldApi.getList('order')
    activeFields.value = activeFields.value.filter(f => f.isActive)
  } finally {
    loading.value = false
  }
}

const generateOrderNo = () => {
  return 'ORD' + dayjs().format('YYYYMMDDHHmmss') + Math.floor(Math.random() * 1000)
}

const resetForm = () => {
  activeFields.value.forEach(field => {
    const dataKey = getFieldDataKey(field.fieldKey)
    if (field.fieldType === 'number') {
      form[dataKey] = 0
    } else if (field.fieldKey === 'order_no') {
      form[dataKey] = generateOrderNo()
    } else if (field.fieldKey === 'order_time') {
      form[dataKey] = dayjs().format('YYYY-MM-DD HH:mm:ss')
    } else if (field.fieldKey === 'expire_time') {
      form[dataKey] = dayjs().add(1, 'year').format('YYYY-MM-DD HH:mm:ss')
    } else {
      form[dataKey] = ''
    }
  })
}

const handleAdd = () => {
  resetForm()
  dialogTitle.value = '新增订单'
  dialogVisible.value = true
}

const handleEdit = (order: OrderWithUser) => {
  resetForm()
  activeFields.value.forEach(field => {
    const dataKey = getFieldDataKey(field.fieldKey)
    form[dataKey] = (order as any)[dataKey] || ''
  })
  form.id = order.id
  dialogTitle.value = '编辑订单'
  dialogVisible.value = true
}

const handleComplete = async (order: OrderWithUser) => {
  try {
    await ElMessageBox.confirm(`确定要将订单"${order.orderNo}"标记为已完成吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    })
    await orderStore.updateOrder(order.id, { status: '已完成' })
    ElMessage.success('操作成功')
  } catch {
    // 取消操作
  }
}

const handleDelete = async (order: OrderWithUser) => {
  try {
    await ElMessageBox.confirm(`确定要删除订单"${order.orderNo}"吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await orderStore.deleteOrder(order.id)
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
          await orderStore.updateOrder(form.id, data)
          ElMessage.success('更新成功')
        } else {
          await orderStore.addOrder(data)
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

const handleExport = () => {
  const exportData: Record<string, any>[] = []
  filteredOrders.value.forEach(order => {
    const row: Record<string, any> = {}
    activeFields.value.forEach(field => {
      const dataKey = getFieldDataKey(field.fieldKey)
      row[field.fieldLabel] = order[dataKey] || ''
    })
    row['剩余天数'] = getRemainDays(order.expireTime)
    exportData.push(row)
  })

  const ws = XLSX.utils.json_to_sheet(exportData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '订单数据')
  XLSX.writeFile(wb, `订单导出_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`)
  ElMessage.success('导出成功')
}

const handleFilter = () => {
  currentPage.value = 1
}

const resetFilter = () => {
  filterForm.keyword = ''
  filterForm.dateRange = null
  activeFields.value.forEach(field => {
    const dataKey = getFieldDataKey(field.fieldKey)
    filterForm[dataKey] = ''
    filterForm[`min_${dataKey}`] = undefined
    filterForm[`max_${dataKey}`] = undefined
  })
  currentPage.value = 1
}

onMounted(async () => {
  await loadFields()
  await Promise.all([
    userStore.fetchUsers(),
    orderStore.fetchOrders()
  ])
})
</script>

<style scoped>
.orders-page {
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

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.amount {
  color: #f56c6c;
  font-weight: 500;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
