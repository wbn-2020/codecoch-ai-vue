<template>
  <main class="auth-page">
    <section class="auth-card">
      <div class="auth-card__intro">
        <div class="auth-card__brand">CodeCoachAI</div>
        <h1>登录账号</h1>
        <p>登录后查看今日求职任务、简历匹配建议和薄弱点练习，继续推进你的面试准备。</p>
      </div>

      <el-alert
        v-if="errorMessage"
        class="auth-alert"
        type="error"
        show-icon
        :closable="false"
        title="登录失败"
        :description="errorMessage"
      />

      <el-form
        ref="formRef"
        class="auth-form"
        :model="form"
        :rules="rules"
        label-position="top"
        @keyup.enter="handleSubmit"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model.trim="form.username" size="large" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            size="large"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
        <el-button class="auth-form__submit" type="primary" size="large" :loading="loading" @click="handleSubmit">
          登录
        </el-button>
        <el-button
          v-if="hasDemoAccount"
          class="auth-form__demo"
          size="large"
          :disabled="loading"
          @click="fillDemoAccount"
        >
          使用演示账号
        </el-button>
      </el-form>

      <div class="auth-card__footer">
        <span>还没有账号？</span>
        <el-button link type="primary" @click="router.push('/register')">去注册</el-button>
        <span class="footer-divider"></span>
        <el-button link type="primary" @click="router.push('/forgot-password')">忘记密码</el-button>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import type { LoginDTO } from '@/types/auth'
import { appConfig } from '@/config'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const formRef = ref<FormInstance>()
const loading = ref(false)
const errorMessage = ref('')
const hasDemoAccount = Boolean(appConfig.demoUsername && appConfig.demoPassword)

const form = reactive<LoginDTO>({
  username: '',
  password: ''
})

const rules: FormRules<LoginDTO> = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' }
  ]
}

const getLoginErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object') {
    const payload = error as {
      code?: number
      message?: string
      response?: { status?: number; data?: { message?: string } }
    }
    const message = payload.response?.data?.message || payload.message || ''
    if (payload.response?.status === 0 || message.includes('Network')) {
      return '网络连接异常，请确认后端服务是否可用后重试。'
    }
    if (payload.response?.status && payload.response.status >= 500) {
      return '认证服务暂时不可用，请稍后重试。'
    }
    if (message.includes('密码') || message.toLowerCase().includes('password')) {
      return '用户名或密码不正确，请检查后重新输入。'
    }
    if (message.includes('用户') || message.toLowerCase().includes('user')) {
      return '账号不存在或不可用，请确认用户名是否正确。'
    }
    return message || '登录失败，请检查账号状态后重试。'
  }
  return '登录失败，请检查账号状态后重试。'
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    errorMessage.value = ''
    try {
      await authStore.login(form, { silentError: true })
      ElMessage.success('登录成功')
      const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
      await router.replace(redirect || '/dashboard')
    } catch (error) {
      errorMessage.value = getLoginErrorMessage(error)
    } finally {
      loading.value = false
    }
  })
}

const fillDemoAccount = () => {
  form.username = appConfig.demoUsername
  form.password = appConfig.demoPassword
  errorMessage.value = ''
}

watch(
  () => [form.username, form.password],
  () => {
    if (errorMessage.value) errorMessage.value = ''
  }
)
</script>

<style scoped lang="scss">
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background:
    linear-gradient(135deg, rgb(37 99 235 / 10%), transparent 42%),
    linear-gradient(315deg, rgb(15 118 110 / 10%), transparent 38%),
    var(--app-bg);
}

.auth-card {
  width: min(100%, 420px);
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
  box-shadow: var(--app-shadow);
  padding: 32px;
}

.auth-card__brand {
  color: var(--app-primary);
  font-size: 14px;
  font-weight: 700;
}

.auth-card__intro {
  h1 {
    margin: 12px 0 8px;
    font-size: 28px;
  }

  p {
    margin: 0;
    color: var(--app-text-muted);
    line-height: 1.6;
  }
}

.auth-form {
  margin-top: 24px;
}

.auth-alert {
  margin-top: 22px;
}

.auth-form__submit {
  width: 100%;
  margin-top: 6px;
}

.auth-form__demo {
  width: 100%;
  margin-top: 10px;
}

.auth-card__footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: 22px;
  color: var(--app-text-muted);
  font-size: 14px;
}

.footer-divider {
  width: 1px;
  height: 14px;
  margin: 0 6px;
  background: var(--app-border);
}
</style>
