<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h2>用户管理系统</h2>
        <p>请登录以继续</p>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="0" class="login-form">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" :prefix-icon="User" size="large" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" :prefix-icon="Lock" size="large" show-password @keyup.enter="handleLogin" />
        </el-form-item>
        <el-form-item prop="captchaAnswer">
          <div class="captcha-row">
            <el-input v-model="form.captchaAnswer" placeholder="请输入验证码" :prefix-icon="Key" size="large" @keyup.enter="handleLogin" />
            <div class="captcha-box" @click="refreshCaptcha">
              <span class="captcha-text">{{ captchaQuestion || '点击获取验证码' }}</span>
            </div>
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" class="login-btn" @click="handleLogin" :loading="loading">
            登 录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock, Key } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { authApi } from '@/api'

const router = useRouter()
const formRef = ref<FormInstance>()
const loading = ref(false)
const captchaQuestion = ref('')
const captchaId = ref('')

const form = reactive({
  username: '',
  password: '',
  captchaAnswer: ''
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  captchaAnswer: [{ required: true, message: '请输入验证码', trigger: 'blur' }]
}

const refreshCaptcha = async () => {
  try {
    const data = await authApi.getCaptcha()
    captchaId.value = data.captchaId
    captchaQuestion.value = data.question
    form.captchaAnswer = ''
  } catch (error: any) {
    ElMessage.error(error.message || '获取验证码失败')
  }
}

const handleLogin = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        await authApi.login({
          username: form.username,
          password: form.password,
          captchaId: captchaId.value,
          captchaAnswer: parseInt(form.captchaAnswer)
        })
        
        // 保存登录状态
        localStorage.setItem('isLoggedIn', 'true')
        localStorage.setItem('username', form.username)
        
        ElMessage.success('登录成功')
        router.push('/')
      } catch (error: any) {
        ElMessage.error(error.message || '登录失败')
        refreshCaptcha()
      } finally {
        loading.value = false
      }
    }
  })
}

onMounted(() => {
  // 如果已登录，直接跳转
  if (localStorage.getItem('isLoggedIn') === 'true') {
    router.push('/')
  }
  refreshCaptcha()
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 400px;
  padding: 40px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #333;
}

.login-header p {
  margin: 0;
  color: #999;
  font-size: 14px;
}

.login-form {
  width: 100%;
}

.captcha-row {
  display: flex;
  gap: 12px;
  width: 100%;
}

.captcha-row .el-input {
  flex: 1;
}

.captcha-box {
  height: 40px;
  padding: 0 16px;
  background: #f5f5f5;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  min-width: 150px;
}

.captcha-box:hover {
  border-color: #409eff;
}

.captcha-text {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  letter-spacing: 2px;
}

.login-btn {
  width: 100%;
}
</style>
