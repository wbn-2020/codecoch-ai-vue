<template>
  <main class="arena login-page">
    <header class="login-brand">
      <div class="login-brand__logo">
        <span class="login-brand__cube">C</span>
        <span>CodeCoachAI</span>
      </div>
      <div class="login-brand__aside">
        新用户？<button class="login-link" type="button" @click="router.push('/register')">免费开始</button>
      </div>
    </header>

    <div class="login-grid">
      <section class="login-hero">
        <span class="arena-chip arena-chip--amber">围绕目标岗位，系统完成每一步准备</span>
        <h1 class="login-hero__title">
          有条理地准备<br />
          <span class="login-hero__accent">每一场面试</span>
        </h1>
        <p class="arena-p login-hero__sub">
          每天投入一点时间，整理简历、匹配岗位、专项训练并完成模拟面试。
        </p>

        <div class="arena-card login-hero__power" aria-label="示例成长面板预览">
          <div
            class="arena-ring"
            style="width: 64px; height: 64px; background: conic-gradient(var(--arena-grn) 0 68%, var(--arena-line) 68% 100%)"
          >
            <div class="arena-ring__hole" style="width: 50px; height: 50px">
              <b style="font-size: 16px; line-height: 1">68</b>
              <span class="arena-tiny" style="font-size: 8.5px; font-weight: 700">准备度</span>
            </div>
          </div>
          <div>
            <div class="arena-row" style="gap: 7px">
              <b style="font-size: 14px">示例 · 求职准备进行中</b>
              <span class="arena-chip arena-chip--amber" style="font-size: 10px">已完成 6 项</span>
            </div>
            <div class="arena-xpbar" style="margin-top: 6px; width: 180px"><i style="width: 70%"></i></div>
            <div class="arena-tiny" style="margin-top: 5px">登录后查看你的真实准备进度</div>
          </div>
        </div>
      </section>

      <section class="arena-card login-card">
        <h2 class="login-card__title">登录继续准备</h2>
        <p class="arena-p login-card__sub">从今天的重点任务开始，持续推进求职计划。</p>

        <el-alert
          v-if="errorMessage"
          class="login-alert"
          :type="alertType"
          show-icon
          :closable="false"
          :title="alertTitle"
          :description="errorMessage"
        />

        <el-form
          ref="formRef"
          class="login-form"
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
            class="login-submit"
            type="primary"
            size="large"
            :loading="loading"
            :disabled="loading"
            @click="handleSubmit"
          >
            进入工作台
          </el-button>
          <el-button
            v-if="hasDemoAccount"
            class="login-demo"
            size="large"
            :disabled="loading"
            @click="fillDemoAccount"
          >
            填入演示账号
          </el-button>
        </el-form>

        <div class="login-card__footer">
          <el-button link class="login-link" @click="router.push('/register')">去注册</el-button>
          <span class="login-card__divider"></span>
          <el-button link class="login-link" @click="router.push('/forgot-password')">忘记密码</el-button>
        </div>
      </section>
    </div>
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
import { getUserDashboardOverviewApi } from '@/api/dashboard'
import { appConfig } from '@/config'
import { needsUserOnboarding } from '@/features/login-entry'
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

const getDefaultPostLoginRoute = async (): Promise<RouteLocationRaw> => {
  if (authStore.canAccessAdmin) {
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

  try {
    const overview = await getUserDashboardOverviewApi()
    return needsUserOnboarding(overview) ? '/onboarding' : '/dashboard'
  } catch {
    return '/dashboard'
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
      const targetRoute = redirect || await getDefaultPostLoginRoute()
      await router.replace(targetRoute)
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
.login-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(920px 520px at 88% -12%, rgba(163, 230, 53, 0.18), transparent 60%),
    radial-gradient(760px 500px at -8% 105%, rgba(23, 178, 106, 0.13), transparent 58%),
    #f5f7f4;
}

.login-brand {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 36px;
}
.login-brand__logo {
  display: flex;
  align-items: center;
  gap: 9px;
  font-weight: 900;
  font-size: 16px;
  letter-spacing: -0.3px;
}
.login-brand__cube {
  width: 32px;
  height: 32px;
  border-radius: 11px;
  background: linear-gradient(135deg, var(--arena-grn), var(--arena-lime));
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  box-shadow: 0 4px 0 var(--arena-grn-d);
}
.login-brand__aside {
  font-size: 12.5px;
  color: var(--arena-sub);
}

.login-link {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--arena-grn-d);
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

.login-grid {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  padding: 48px 40px 60px;
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 50px;
  align-items: center;
}

.login-hero__title {
  margin: 18px 0 0;
  font-size: 44px;
  line-height: 1.12;
  font-weight: 900;
  letter-spacing: -0.6px;
}
.login-hero__accent {
  color: var(--arena-grn);
}
.login-hero__sub {
  margin-top: 16px;
  max-width: 360px;
}
.login-hero__power {
  margin-top: 30px;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  max-width: 360px;
}

.login-card {
  padding: 32px 30px;
}
.login-card__title {
  margin: 0;
  font-size: 21px;
  font-weight: 900;
  letter-spacing: -0.4px;
}
.login-card__sub {
  margin-top: 5px;
  font-size: 13px;
}
.login-alert {
  margin-top: 16px;
}
.login-form {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
}

.login-form :deep(.el-form-item__label) {
  font-size: 12px;
  font-weight: 800;
  color: var(--arena-sub);
  padding-bottom: 6px !important;
}
.login-form :deep(.el-input__wrapper) {
  border-radius: 13px;
  border: 2px solid var(--arena-line);
  background: #fff;
  box-shadow: none;
  padding: 4px 14px;
  transition: border-color 0.15s;
}
.login-form :deep(.el-input__wrapper.is-focus) {
  border-color: var(--arena-grn);
  background: #fff;
  box-shadow: none;
}
.login-form :deep(.el-input__wrapper:hover) {
  border-color: var(--arena-grn);
  box-shadow: none;
}
.login-form :deep(.el-input__inner) {
  font-weight: 600;
  color: var(--arena-ink);
}
.login-form :deep(.el-input__inner::placeholder) {
  color: var(--arena-mut);
}
.login-form :deep(.el-input__prefix),
.login-form :deep(.el-input__suffix) {
  color: var(--arena-mut);
}

.login-submit {
  margin-top: 6px;
  width: 100%;
  padding: 22px 14px;
  font-size: 15px;
  font-weight: 800;
  border: 0;
  border-radius: 14px;
  background: var(--arena-grn);
  box-shadow: 0 4px 0 var(--arena-grn-d);
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}
.login-submit:hover,
.login-submit:focus {
  background: var(--arena-grn);
  transform: translateY(-1px);
  box-shadow: 0 5px 0 var(--arena-grn-d);
}
.login-submit:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 var(--arena-grn-d);
}

.login-demo {
  width: 100%;
  margin: 12px 0 0;
  padding: 20px 14px;
  font-size: 13.5px;
  font-weight: 800;
  color: var(--arena-grn-d);
  border: 2px solid var(--arena-line);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 3px 0 var(--arena-line);
}
.login-demo:hover,
.login-demo:focus {
  color: var(--arena-grn-d);
  border-color: var(--arena-grn);
  background: #fff;
}
.login-demo + .el-button {
  margin-left: 0;
}

.login-card__footer {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 12px;
}
.login-card__divider {
  width: 1px;
  height: 12px;
  background: var(--arena-line);
}

@media (max-width: 860px) {
  .login-grid {
    grid-template-columns: 1fr;
    gap: 26px;
    padding: 20px 20px 40px;
  }
  .login-brand {
    padding: 16px 20px;
  }
  .login-hero__title {
    font-size: 32px;
  }
  .login-hero__power {
    max-width: none;
  }
}
</style>
