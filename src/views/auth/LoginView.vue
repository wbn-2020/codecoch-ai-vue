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
        :type="alertType"
        show-icon
        :closable="false"
        :title="alertTitle"
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
        <el-button
          class="auth-form__submit"
          type="primary"
          size="large"
          :loading="loading"
          :disabled="loading"
          @click="handleSubmit"
        >
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
import type { RouteLocationRaw } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'

import { firstAccessibleAdminPath } from '@/router/adminAccess'
import { useAuthStore } from '@/stores/auth'
import type { LoginDTO } from '@/types/auth'
import { appConfig } from '@/config'
import { getErrorMessage as normalizeErrorMessage } from '@/utils/error'
import { sanitizeLocalRedirectPath } from '@/utils/routeSecurity'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const formRef = ref<FormInstance>()
const loading = ref(false)
const errorMessage = ref('')
const alertTitle = ref('登录失败')
const alertType = ref<'error' | 'warning'>('error')
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

const trimAuthErrorPrefix = (message: string) =>
  message.replace(/^(登录失败|认证失败|请求失败)[，,：:\s]*/u, '').trim() || message

const getLoginErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object') {
    const payload = error as {
      code?: number
      message?: string
      response?: { status?: number; data?: { message?: string } }
    }
    const message = payload.response?.data?.message || payload.message || ''
    if (payload.response?.status === 0 || message.includes('Network')) {
      return '网络连接异常，请确认服务是否可用后重试。'
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
    return trimAuthErrorPrefix(normalizeErrorMessage(error, '请检查账号状态后重试。'))
  }
  return '请检查账号状态后重试。'
}

const getPostLoginNavigationErrorMessage = (error: unknown) => {
  if (import.meta.env.DEV) {
    const message = error instanceof Error ? error.message : String(error || '')
    console.error('[auth] post-login navigation failed', message)
  }
  return '登录已成功，但目标页面加载失败。请刷新页面或从侧边栏重新进入；若持续出现，请联系管理员。'
}

const clearError = () => {
  errorMessage.value = ''
  alertTitle.value = '登录失败'
  alertType.value = 'error'
}

const syncRouteReasonNotice = () => {
  if (String(route.query.reason || '') !== 'logout-required-for-password-reset') return

  alertTitle.value = '请先切换目标账号'
  alertType.value = 'warning'
  errorMessage.value = '检测到密码重置链接。为避免当前登录账号与重置目标账号混淆，请先重新登录目标账号，再从邮件中重新打开重置链接。'
}

const getDefaultPostLoginRoute = (): RouteLocationRaw => {
  if (!authStore.canAccessAdmin) return '/dashboard'
  const adminPath = firstAccessibleAdminPath(authStore)
  if (adminPath) return adminPath
  return {
    path: '/403',
    query: {
      reason: 'noAdminMenu',
      target: '/admin',
      title: '管理后台'
    }
  }
}

const handleSubmit = async () => {
  if (loading.value) return
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid || loading.value) return

    loading.value = true
    clearError()
    try {
      await authStore.login(form, { silentError: true })
    } catch (error) {
      alertTitle.value = '登录失败'
      alertType.value = 'error'
      errorMessage.value = getLoginErrorMessage(error)
      loading.value = false
      return
    }

    try {
      ElMessage.success('登录成功')
      const redirect = sanitizeLocalRedirectPath(route.query.redirect)
      await router.replace(redirect || getDefaultPostLoginRoute())
    } catch (error) {
      alertTitle.value = '登录后页面加载失败'
      alertType.value = 'warning'
      errorMessage.value = getPostLoginNavigationErrorMessage(error)
      ElMessage.warning(errorMessage.value)
    } finally {
      loading.value = false
    }
  })
}

const fillDemoAccount = () => {
  form.username = appConfig.demoUsername
  form.password = appConfig.demoPassword
  clearError()
}

syncRouteReasonNotice()

watch(
  () => [form.username, form.password],
  () => {
    if (errorMessage.value) clearError()
  }
)

watch(
  () => route.query.reason,
  () => {
    syncRouteReasonNotice()
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
