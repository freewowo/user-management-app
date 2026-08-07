<template>
  <div class="import-export-page">
    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="数据导出" name="export">
        <div class="export-section">
          <el-card class="export-card">
            <template #header>
              <div class="card-header">
                <span>用户数据导出</span>
              </div>
            </template>
            <div class="export-content">
              <p>导出所有用户信息，包含基本信息和自定义字段</p>
              <div class="export-info">
                <el-tag type="info">当前用户数：{{ userCount }}</el-tag>
              </div>
              <el-button type="primary" @click="handleExportUsers" :loading="exportingUsers">
                <el-icon><Download /></el-icon>导出用户数据
              </el-button>
            </div>
          </el-card>

          <el-card class="export-card">
            <template #header>
              <div class="card-header">
                <span>订单数据导出</span>
              </div>
            </template>
            <div class="export-content">
              <p>导出所有订单信息，包含关联用户名和自定义字段</p>
              <div class="export-filters">
                <el-select v-model="orderExportFilter.status" placeholder="订单状态" clearable style="width: 150px">
                  <el-option label="进行中" value="进行中" />
                  <el-option label="已到期" value="已到期" />
                  <el-option label="已完成" value="已完成" />
                </el-select>
                <el-date-picker
                  v-model="orderExportFilter.dateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  value-format="YYYY-MM-DD"
                  style="width: 280px"
                />
              </div>
              <div class="export-info">
                <el-tag type="info">符合条件订单数：{{ filteredOrderCount }}</el-tag>
              </div>
              <el-button type="success" @click="handleExportOrders" :loading="exportingOrders">
                <el-icon><Download /></el-icon>导出订单数据
              </el-button>
            </div>
          </el-card>

          <el-card class="export-card">
            <template #header>
              <div class="card-header">
                <span>全部数据导出</span>
              </div>
            </template>
            <div class="export-content">
              <p>导出所有用户和订单数据，合并为一个Excel文件（多个Sheet）</p>
              <el-button type="warning" @click="handleExportAll" :loading="exportingAll">
                <el-icon><Download /></el-icon>导出全部数据
              </el-button>
            </div>
          </el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane label="用户导入" name="importUser">
        <div class="import-section">
          <el-card class="import-card">
            <template #header>
              <div class="card-header">
                <span>用户数据导入</span>
                <el-button type="primary" link @click="downloadUserTemplate">
                  <el-icon><Download /></el-icon>下载模板
                </el-button>
              </div>
            </template>
            <el-upload
              ref="userUploadRef"
              class="upload-area"
              drag
              :auto-upload="false"
              :limit="1"
              accept=".xlsx,.xls,.csv"
              :on-change="handleUserFileChange"
              :on-exceed="handleExceed"
            >
              <el-icon class="el-icon--upload"><Upload /></el-icon>
              <div class="el-upload__text">
                将文件拖到此处，或<em>点击上传</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  支持 .xlsx, .xls, .csv 格式文件
                </div>
              </template>
            </el-upload>

            <div class="action-buttons" v-if="userPreviewData.length > 0">
              <el-button @click="clearUserData">清除数据</el-button>
              <el-button type="primary" @click="handleImportUsers" :loading="importingUsers">
                导入 {{ userPreviewData.length }} 条用户数据
              </el-button>
            </div>
          </el-card>

          <el-card v-if="userPreviewData.length > 0" class="preview-card">
            <template #header>
              <div class="card-header">
                <span>数据预览</span>
                <el-tag :type="userValidationErrors.length > 0 ? 'danger' : 'success'">
                  {{ userValidationErrors.length > 0 ? `${userValidationErrors.length} 个错误` : '数据校验通过' }}
                </el-tag>
              </div>
            </template>

            <div v-if="userValidationErrors.length > 0" class="error-list">
              <el-alert
                v-for="(error, index) in userValidationErrors"
                :key="index"
                :title="error"
                type="error"
                show-icon
                :closable="false"
                class="error-item"
              />
            </div>

            <el-table :data="userPreviewData" stripe style="width: 100%" max-height="400">
              <el-table-column prop="userName" label="姓名" width="100" />
              <el-table-column prop="phone" label="手机号" width="130" />
              <el-table-column prop="email" label="邮箱" show-overflow-tooltip />
              <el-table-column prop="gender" label="性别" width="60" />
              <el-table-column prop="source" label="来源" width="80" />
              <el-table-column prop="remark" label="备注" show-overflow-tooltip />
            </el-table>
          </el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane label="订单导入" name="importOrder">
        <div class="import-section">
          <el-card class="import-card">
            <template #header>
              <div class="card-header">
                <span>订单数据导入</span>
                <el-button type="primary" link @click="downloadOrderTemplate">
                  <el-icon><Download /></el-icon>下载模板
                </el-button>
              </div>
            </template>
            <el-upload
              ref="orderUploadRef"
              class="upload-area"
              drag
              :auto-upload="false"
              :limit="1"
              accept=".xlsx,.xls,.csv"
              :on-change="handleOrderFileChange"
              :on-exceed="handleExceed"
            >
              <el-icon class="el-icon--upload"><Upload /></el-icon>
              <div class="el-upload__text">
                将文件拖到此处，或<em>点击上传</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  支持 .xlsx, .xls, .csv 格式文件，手机号需匹配已有用户
                </div>
              </template>
            </el-upload>

            <div class="action-buttons" v-if="orderPreviewData.length > 0">
              <el-button @click="clearOrderData">清除数据</el-button>
              <el-button type="primary" @click="handleImportOrders" :loading="importingOrders">
                导入 {{ orderPreviewData.length }} 条订单数据
              </el-button>
            </div>
          </el-card>

          <el-card v-if="orderPreviewData.length > 0" class="preview-card">
            <template #header>
              <div class="card-header">
                <span>数据预览</span>
                <el-tag :type="orderValidationErrors.length > 0 ? 'danger' : 'success'">
                  {{ orderValidationErrors.length > 0 ? `${orderValidationErrors.length} 个错误` : '数据校验通过' }}
                </el-tag>
              </div>
            </template>

            <div v-if="orderValidationErrors.length > 0" class="error-list">
              <el-alert
                v-for="(error, index) in orderValidationErrors"
                :key="index"
                :title="error"
                type="error"
                show-icon
                :closable="false"
                class="error-item"
              />
            </div>

            <el-table :data="orderPreviewData" stripe style="width: 100%" max-height="400">
              <el-table-column prop="userName" label="用户名" width="100" />
              <el-table-column prop="phone" label="手机号" width="130" />
              <el-table-column prop="productName" label="产品名称" show-overflow-tooltip />
              <el-table-column prop="amount" label="金额" width="80" />
              <el-table-column prop="orderTime" label="下单时间" width="110" />
              <el-table-column prop="expireTime" label="到期时间" width="110" />
            </el-table>
          </el-card>
        </div>
      </el-tab-pane>

      <el-tab-pane label="导入说明" name="help">
        <div class="help-section">
          <el-card>
            <template #header>
              <div class="card-header">
                <span>导入说明</span>
              </div>
            </template>
            <div class="help-content">
              <h4>用户导入字段</h4>
              <el-table :data="userTemplateFields" stripe style="width: 100%">
                <el-table-column prop="field" label="字段" width="120" />
                <el-table-column prop="required" label="是否必填" width="100">
                  <template #default="{ row }">
                    <el-tag :type="row.required === '是' ? 'danger' : 'info'" size="small">
                      {{ row.required }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="format" label="格式/说明" />
              </el-table>

              <h4>订单导入字段</h4>
              <el-table :data="orderTemplateFields" stripe style="width: 100%">
                <el-table-column prop="field" label="字段" width="120" />
                <el-table-column prop="required" label="是否必填" width="100">
                  <template #default="{ row }">
                    <el-tag :type="row.required === '是' ? 'danger' : 'info'" size="small">
                      {{ row.required }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="format" label="格式/说明" />
              </el-table>

              <h4>注意事项</h4>
              <ul class="tips-list">
                <li>请先下载对应的导入模板，按照模板格式填写数据</li>
                <li>用户姓名为必填项，手机号为选填项</li>
                <li>如填写手机号，必须为有效的11位手机号码，且不能重复</li>
                <li>订单导入时通过手机号匹配用户，手机号必须已存在于系统中</li>
                <li>金额必须为数字，支持小数</li>
                <li>日期格式为 YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss</li>
                <li>导出的文件可直接作为导入模板使用</li>
              </ul>
            </div>
          </el-card>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Download, Upload } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadInstance, UploadFile } from 'element-plus'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import { userApi, orderApi } from '@/api'
import { useUserStore, useOrderStore } from '@/stores'

const userStore = useUserStore()
const orderStore = useOrderStore()

const activeTab = ref('export')

// 导出相关
const exportingUsers = ref(false)
const exportingOrders = ref(false)
const exportingAll = ref(false)
const userCount = computed(() => userStore.users.length)
const orderExportFilter = reactive({
  status: '',
  dateRange: null as [string, string] | null
})

const filteredOrderCount = computed(() => {
  let result = [...orderStore.orders]
  if (orderExportFilter.status) {
    result = result.filter(o => o.status === orderExportFilter.status)
  }
  if (orderExportFilter.dateRange) {
    const [start, end] = orderExportFilter.dateRange
    result = result.filter(o =>
      dayjs(o.orderTime).isAfter(dayjs(start).subtract(1, 'day')) &&
      dayjs(o.orderTime).isBefore(dayjs(end).add(1, 'day'))
    )
  }
  return result.length
})

// 用户导入相关
const userUploadRef = ref<UploadInstance>()
const userPreviewData = ref<any[]>([])
const importingUsers = ref(false)

// 订单导入相关
const orderUploadRef = ref<UploadInstance>()
const orderPreviewData = ref<any[]>([])
const importingOrders = ref(false)

const userTemplateFields = [
  { field: '用户姓名', required: '是', format: '文本' },
  { field: '手机号', required: '否', format: '11位手机号码（选填，填写时需唯一）' },
  { field: '邮箱', required: '否', format: '有效邮箱格式' },
  { field: '性别', required: '否', format: '男/女' },
  { field: '身份证号', required: '否', format: '18位身份证号' },
  { field: '地址', required: '否', format: '文本' },
  { field: '来源渠道', required: '否', format: '线上/线下/推荐/其他' },
  { field: '备注', required: '否', format: '文本' }
]

const orderTemplateFields = [
  { field: '用户手机号', required: '是', format: '必须为系统中已有用户的手机号' },
  { field: '产品名称', required: '是', format: '文本' },
  { field: '订单金额', required: '是', format: '数字' },
  { field: '下单时间', required: '是', format: 'YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss' },
  { field: '到期时间', required: '是', format: 'YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss' }
]

const userValidationErrors = computed(() => {
  const errors: string[] = []
  const phones = new Set<string>()

  userPreviewData.value.forEach((row, index) => {
    const rowNum = index + 1

    if (!row.userName) {
      errors.push(`第 ${rowNum} 行：用户姓名不能为空`)
    }

    if (row.phone && !/^1[3-9]\d{9}$/.test(row.phone)) {
      errors.push(`第 ${rowNum} 行：手机号格式不正确`)
    } else if (row.phone && phones.has(row.phone)) {
      errors.push(`第 ${rowNum} 行：手机号重复`)
    } else if (row.phone) {
      phones.add(row.phone)
    }
  })

  return errors
})

const orderValidationErrors = computed(() => {
  const errors: string[] = []
  const existingPhones = new Set(userStore.users.map(u => u.phone))

  orderPreviewData.value.forEach((row, index) => {
    const rowNum = index + 1

    if (!row.phone) {
      errors.push(`第 ${rowNum} 行：用户手机号不能为空`)
    } else if (!existingPhones.has(row.phone)) {
      errors.push(`第 ${rowNum} 行：手机号 ${row.phone} 不存在于系统中`)
    }

    if (!row.productName) {
      errors.push(`第 ${rowNum} 行：产品名称不能为空`)
    }

    if (!row.amount || isNaN(Number(row.amount))) {
      errors.push(`第 ${rowNum} 行：订单金额必须为数字`)
    }

    if (!row.orderTime) {
      errors.push(`第 ${rowNum} 行：下单时间不能为空`)
    } else if (!dayjs(row.orderTime).isValid()) {
      errors.push(`第 ${rowNum} 行：下单时间格式不正确`)
    }

    if (!row.expireTime) {
      errors.push(`第 ${rowNum} 行：到期时间不能为空`)
    } else if (!dayjs(row.expireTime).isValid()) {
      errors.push(`第 ${rowNum} 行：到期时间格式不正确`)
    }
  })

  return errors
})

// 导出功能
const handleExportUsers = async () => {
  exportingUsers.value = true
  try {
    const users = await userApi.getList()
    const exportData = users.map((u: any) => ({
      '用户姓名': u.userName,
      '手机号': u.phone || '',
      '邮箱': u.email || '',
      '性别': u.gender || '',
      '身份证号': u.idCard || '',
      '地址': u.address || '',
      '来源渠道': u.source || '',
      '备注': u.remark || '',
      '创建时间': u.createdAt
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '用户数据')
    XLSX.writeFile(wb, `用户数据_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`)
    ElMessage.success('导出成功')
  } catch (error: any) {
    ElMessage.error(error.message || '导出失败')
  } finally {
    exportingUsers.value = false
  }
}

const handleExportOrders = async () => {
  exportingOrders.value = true
  try {
    const orders = await orderStore.orders
    let exportOrders = [...orders]

    if (orderExportFilter.status) {
      exportOrders = exportOrders.filter(o => o.status === orderExportFilter.status)
    }
    if (orderExportFilter.dateRange) {
      const [start, end] = orderExportFilter.dateRange
      exportOrders = exportOrders.filter(o =>
        dayjs(o.orderTime).isAfter(dayjs(start).subtract(1, 'day')) &&
        dayjs(o.orderTime).isBefore(dayjs(end).add(1, 'day'))
      )
    }

    const exportData = exportOrders.map(o => ({
      '订单号': o.orderNo,
      '用户名': o.userName || '',
      '手机号': o.phone || '',
      '产品名称': o.productName,
      '金额': o.amount,
      '下单时间': o.orderTime,
      '到期时间': o.expireTime,
      '剩余天数': dayjs(o.expireTime).diff(dayjs(), 'day'),
      '状态': o.status
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '订单数据')
    XLSX.writeFile(wb, `订单数据_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`)
    ElMessage.success('导出成功')
  } catch (error: any) {
    ElMessage.error(error.message || '导出失败')
  } finally {
    exportingOrders.value = false
  }
}

const handleExportAll = async () => {
  exportingAll.value = true
  try {
    const users = await userApi.getList()
    const orders = await orderStore.orders

    const userData = users.map((u: any) => ({
      '用户姓名': u.userName,
      '手机号': u.phone || '',
      '邮箱': u.email || '',
      '性别': u.gender || '',
      '身份证号': u.idCard || '',
      '地址': u.address || '',
      '来源渠道': u.source || '',
      '备注': u.remark || '',
      '创建时间': u.createdAt
    }))

    const orderData = orders.map(o => ({
      '订单号': o.orderNo,
      '用户名': o.userName || '',
      '手机号': o.phone || '',
      '产品名称': o.productName,
      '金额': o.amount,
      '下单时间': o.orderTime,
      '到期时间': o.expireTime,
      '状态': o.status
    }))

    const wb = XLSX.utils.book_new()
    const userWs = XLSX.utils.json_to_sheet(userData)
    const orderWs = XLSX.utils.json_to_sheet(orderData)
    XLSX.utils.book_append_sheet(wb, userWs, '用户数据')
    XLSX.utils.book_append_sheet(wb, orderWs, '订单数据')
    XLSX.writeFile(wb, `全部数据_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`)
    ElMessage.success('导出成功')
  } catch (error: any) {
    ElMessage.error(error.message || '导出失败')
  } finally {
    exportingAll.value = false
  }
}

// 模板下载
const downloadUserTemplate = () => {
  const headers = ['用户姓名', '手机号', '邮箱', '性别', '身份证号', '地址', '来源渠道', '备注']
  const exampleData = [
    ['张三', '13800138000', 'zhangsan@example.com', '男', '110101199001011234', '北京市朝阳区', '线上', 'VIP客户'],
    ['李四', '13900139000', 'lisi@example.com', '女', '310101199205051234', '上海市浦东新区', '线下', '']
  ]

  const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleData])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '用户导入模板')
  XLSX.writeFile(wb, '用户导入模板.xlsx')
  ElMessage.success('模板下载成功')
}

const downloadOrderTemplate = () => {
  const headers = ['用户手机号', '产品名称', '订单金额', '下单时间', '到期时间']
  const exampleData = [
    ['13800138000', '年度VIP会员', 299, '2024-01-15', '2025-01-15'],
    ['13900139000', '季度VIP会员', 99, '2024-02-20', '2024-05-20']
  ]

  const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleData])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '订单导入模板')
  XLSX.writeFile(wb, '订单导入模板.xlsx')
  ElMessage.success('模板下载成功')
}

// 文件处理
const handleExceed = () => {
  ElMessage.warning('只能上传一个文件，请先清除已选文件')
}

const handleUserFileChange = (file: UploadFile) => {
  if (!file.raw) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(firstSheet)

      const mappedData = jsonData.map((row: any) => ({
        userName: row['用户姓名'] || '',
        phone: String(row['手机号'] || ''),
        email: row['邮箱'] || '',
        gender: row['性别'] || '',
        idCard: row['身份证号'] || '',
        address: row['地址'] || '',
        source: row['来源渠道'] || '',
        remark: row['备注'] || ''
      }))

      if (mappedData.length > 500) {
        ElMessage.warning('单次最多导入 500 条数据')
        return
      }

      userPreviewData.value = mappedData
      ElMessage.success(`成功读取 ${mappedData.length} 条数据`)
    } catch (error) {
      ElMessage.error('文件解析失败，请检查文件格式')
    }
  }
  reader.readAsArrayBuffer(file.raw)
}

const handleOrderFileChange = (file: UploadFile) => {
  if (!file.raw) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(firstSheet)

      const mappedData = jsonData.map((row: any) => ({
        phone: String(row['用户手机号'] || ''),
        productName: row['产品名称'] || '',
        amount: row['订单金额'] || 0,
        orderTime: row['下单时间'] || '',
        expireTime: row['到期时间'] || ''
      }))

      if (mappedData.length > 500) {
        ElMessage.warning('单次最多导入 500 条数据')
        return
      }

      orderPreviewData.value = mappedData
      ElMessage.success(`成功读取 ${mappedData.length} 条数据`)
    } catch (error) {
      ElMessage.error('文件解析失败，请检查文件格式')
    }
  }
  reader.readAsArrayBuffer(file.raw)
}

const clearUserData = () => {
  userPreviewData.value = []
  userUploadRef.value?.clearFiles()
}

const clearOrderData = () => {
  orderPreviewData.value = []
  orderUploadRef.value?.clearFiles()
}

const handleImportUsers = async () => {
  if (userValidationErrors.value.length > 0) {
    ElMessage.error('请先修正数据错误')
    return
  }

  try {
    await ElMessageBox.confirm(`确定要导入 ${userPreviewData.value.length} 条用户数据吗？`, '提示', {
      confirmButtonText: '确定导入',
      cancelButtonText: '取消',
      type: 'info'
    })

    importingUsers.value = true

    const existingUsers = await userApi.getList()
    const existingPhones = new Set(existingUsers.map((u: any) => u.phone).filter(Boolean))

    let createdCount = 0
    let skippedCount = 0

    for (const row of userPreviewData.value) {
      if (row.phone && existingPhones.has(row.phone)) {
        skippedCount++
        continue
      }

      await userApi.create({
        userName: row.userName,
        phone: row.phone,
        email: row.email,
        gender: (row.gender as '男' | '女') || '未知',
        idCard: row.idCard,
        address: row.address,
        source: row.source,
        remark: row.remark
      })

      if (row.phone) {
        existingPhones.add(row.phone)
      }
      createdCount++
    }

    await userStore.fetchUsers()
    ElMessage.success(`导入完成：新增 ${createdCount} 个用户，跳过 ${skippedCount} 个重复`)
    clearUserData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '导入失败')
    }
  } finally {
    importingUsers.value = false
  }
}

const handleImportOrders = async () => {
  if (orderValidationErrors.value.length > 0) {
    ElMessage.error('请先修正数据错误')
    return
  }

  try {
    await ElMessageBox.confirm(`确定要导入 ${orderPreviewData.value.length} 条订单数据吗？`, '提示', {
      confirmButtonText: '确定导入',
      cancelButtonText: '取消',
      type: 'info'
    })

    importingOrders.value = true

    const users = await userApi.getList()
    const phoneUserMap = new Map(users.map((u: any) => [u.phone, u.id]))

    const ordersToImport = orderPreviewData.value.map(row => ({
      userId: phoneUserMap.get(row.phone)!,
      orderNo: 'IMP' + dayjs().format('YYYYMMDDHHmmss') + Math.floor(Math.random() * 1000),
      productName: row.productName,
      amount: Number(row.amount),
      orderTime: dayjs(row.orderTime).format('YYYY-MM-DD HH:mm:ss'),
      expireTime: dayjs(row.expireTime).format('YYYY-MM-DD HH:mm:ss')
    }))

    await orderApi.batchImport(ordersToImport)
    await orderStore.fetchOrders()

    ElMessage.success(`成功导入 ${ordersToImport.length} 条订单`)
    clearOrderData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '导入失败')
    }
  } finally {
    importingOrders.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    userStore.fetchUsers(),
    orderStore.fetchOrders()
  ])
})
</script>

<style scoped>
.import-export-page {
  height: 100%;
}

.import-export-page :deep(.el-tabs__content) {
  padding: 20px;
}

.export-section,
.import-section,
.help-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 20px;
}

.export-card,
.import-card {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
}

.export-content,
.import-card :deep(.el-upload-dragger) {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.export-content p {
  color: #666;
  font-size: 14px;
  margin: 0;
}

.export-info {
  display: flex;
  gap: 8px;
}

.export-filters {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.upload-area {
  width: 100%;
}

.upload-area :deep(.el-upload-dragger) {
  width: 100%;
  padding: 40px 0;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
}

.preview-card {
  grid-column: 1 / -1;
}

.error-list {
  margin-bottom: 16px;
}

.error-item {
  margin-bottom: 8px;
}

.help-content h4 {
  margin: 20px 0 12px 0;
  font-weight: 500;
  color: #333;
}

.help-content h4:first-child {
  margin-top: 0;
}

.tips-list {
  margin: 0;
  padding-left: 20px;
  color: #666;
  line-height: 1.8;
}
</style>
