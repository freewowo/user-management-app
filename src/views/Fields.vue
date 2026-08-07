<template>
  <div class="fields-page">
    <el-card class="filter-card">
      <el-form :inline="true" class="filter-form">
        <el-form-item label="目标类型">
          <el-select v-model="currentType" style="width: 150px" @change="loadFields">
            <el-option label="用户字段" value="user" />
            <el-option label="订单字段" value="order" />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>{{ currentType === 'user' ? '用户' : '订单' }}自定义字段</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>新增字段
          </el-button>
        </div>
      </template>

      <el-table :data="fields" stripe style="width: 100%" v-loading="loading">
        <el-table-column prop="fieldLabel" label="字段名称" width="150" />
        <el-table-column prop="fieldKey" label="字段标识" width="150" />
        <el-table-column prop="fieldType" label="字段类型" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ getTypeLabel(row.fieldType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isRequired" label="必填" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isRequired ? 'danger' : 'info'" size="small">
              {{ row.isRequired ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="placeholder" label="占位提示" show-overflow-tooltip />
        <el-table-column prop="options" label="选项" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.fieldType === 'select' && row.options">
              {{ parseOptions(row.options).join(', ') }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="80" align="center" />
        <el-table-column prop="isSystem" label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isSystem ? 'warning' : 'info'" size="small">
              {{ row.isSystem ? '系统预设' : '自定义' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isActive" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-switch v-model="row.isActive" :active-value="1" :inactive-value="0" 
              :disabled="row.isSystem" @change="handleToggleActive(row)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button v-if="!row.isSystem" type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="目标类型" prop="targetType">
          <el-select v-model="form.targetType" style="width: 100%" :disabled="!!form.id">
            <el-option label="用户字段" value="user" />
            <el-option label="订单字段" value="order" />
          </el-select>
        </el-form-item>
        <el-form-item label="字段标识" prop="fieldKey">
          <el-input v-model="form.fieldKey" placeholder="请输入英文标识（如：company）" :disabled="!!form.id" />
        </el-form-item>
        <el-form-item label="字段名称" prop="fieldLabel">
          <el-input v-model="form.fieldLabel" placeholder="请输入字段显示名称" />
        </el-form-item>
        <el-form-item label="字段类型" prop="fieldType">
          <el-select v-model="form.fieldType" style="width: 100%">
            <el-option label="文本" value="text" />
            <el-option label="数字" value="number" />
            <el-option label="日期" value="date" />
            <el-option label="下拉选择" value="select" />
            <el-option label="多行文本" value="textarea" />
          </el-select>
        </el-form-item>
        <el-form-item label="选项配置" v-if="form.fieldType === 'select'">
          <div class="options-input">
            <div v-for="(option, index) in form.options" :key="index" class="option-item">
              <el-input v-model="form.options[index]" placeholder="选项值" style="flex: 1" />
              <el-button type="danger" :icon="Delete" circle size="small" @click="removeOption(index)" />
            </div>
            <el-button type="primary" link @click="addOption">
              <el-icon><Plus /></el-icon>添加选项
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="必填" prop="isRequired">
          <el-switch v-model="form.isRequired" />
        </el-form-item>
        <el-form-item label="占位提示" prop="placeholder">
          <el-input v-model="form.placeholder" placeholder="请输入占位提示文字" />
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="form.sortOrder" :min="0" :max="999" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { fieldApi } from '@/api'

interface FieldConfig {
  id: number
  targetType: string
  fieldKey: string
  fieldLabel: string
  fieldType: string
  isRequired: number
  placeholder: string
  options: string
  sortOrder: number
  isActive: number
}

const loading = ref(false)
const submitting = ref(false)
const currentType = ref('user')
const fields = ref<FieldConfig[]>([])
const dialogVisible = ref(false)
const dialogTitle = ref('新增字段')
const formRef = ref<FormInstance>()

const form = reactive({
  id: 0,
  targetType: 'user',
  fieldKey: '',
  fieldLabel: '',
  fieldType: 'text',
  isRequired: false,
  placeholder: '',
  options: [] as string[],
  sortOrder: 0
})

const rules: FormRules = {
  targetType: [{ required: true, message: '请选择目标类型', trigger: 'change' }],
  fieldKey: [
    { required: true, message: '请输入字段标识', trigger: 'blur' },
    { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '字段标识只能包含字母、数字和下划线', trigger: 'blur' }
  ],
  fieldLabel: [{ required: true, message: '请输入字段名称', trigger: 'blur' }],
  fieldType: [{ required: true, message: '请选择字段类型', trigger: 'change' }]
}

const getTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    text: '文本',
    number: '数字',
    date: '日期',
    select: '下拉选择',
    textarea: '多行文本'
  }
  return map[type] || type
}

const parseOptions = (optionsStr: string) => {
  try {
    return JSON.parse(optionsStr)
  } catch {
    return []
  }
}

const loadFields = async () => {
  loading.value = true
  try {
    fields.value = await fieldApi.getList(currentType.value)
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  form.id = 0
  form.targetType = currentType.value
  form.fieldKey = ''
  form.fieldLabel = ''
  form.fieldType = 'text'
  form.isRequired = false
  form.placeholder = ''
  form.options = []
  form.sortOrder = 0
}

const handleAdd = () => {
  resetForm()
  dialogTitle.value = '新增字段'
  dialogVisible.value = true
}

const handleEdit = (field: FieldConfig) => {
  form.id = field.id
  form.targetType = field.targetType
  form.fieldKey = field.fieldKey
  form.fieldLabel = field.fieldLabel
  form.fieldType = field.fieldType
  form.isRequired = !!field.isRequired
  form.placeholder = field.placeholder
  form.options = parseOptions(field.options)
  form.sortOrder = field.sortOrder
  dialogTitle.value = '编辑字段'
  dialogVisible.value = true
}

const handleDelete = async (field: FieldConfig) => {
  try {
    await ElMessageBox.confirm(`确定要删除字段"${field.fieldLabel}"吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await fieldApi.delete(field.id)
    ElMessage.success('删除成功')
    loadFields()
  } catch {
    // 取消删除
  }
}

const handleToggleActive = async (field: FieldConfig) => {
  try {
    await fieldApi.update(field.id, { isActive: field.isActive })
    ElMessage.success('状态更新成功')
  } catch {
    field.isActive = field.isActive ? 0 : 1
  }
}

const addOption = () => {
  form.options.push('')
}

const removeOption = (index: number) => {
  form.options.splice(index, 1)
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        const data = {
          targetType: form.targetType,
          fieldKey: form.fieldKey,
          fieldLabel: form.fieldLabel,
          fieldType: form.fieldType,
          isRequired: form.isRequired,
          placeholder: form.placeholder,
          options: form.fieldType === 'select' ? form.options.filter(o => o) : [],
          sortOrder: form.sortOrder
        }

        if (form.id) {
          await fieldApi.update(form.id, data)
          ElMessage.success('更新成功')
        } else {
          await fieldApi.create(data)
          ElMessage.success('添加成功')
        }
        dialogVisible.value = false
        loadFields()
      } catch (error: any) {
        ElMessage.error(error.message || '操作失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

onMounted(() => {
  loadFields()
})
</script>

<style scoped>
.fields-page {
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

.options-input {
  width: 100%;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
</style>
