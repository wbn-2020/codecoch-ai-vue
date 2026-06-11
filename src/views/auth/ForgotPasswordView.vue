<template>
  <main class="auth-page">
    <section class="auth-card">
      <div class="auth-card__intro">
        <div class="auth-card__brand">CodeCoachAI</div>
        <h1>找回密码</h1>
        <p>输入注册邮箱后，我们会发送一次性重置链接。链接短时间内有效，没收到时请先检查垃圾邮件。</p>
      </div>

      <el-alert
        v-if="sent"
        type="success"
        show-icon
        :closable="false"
        title="重置链接已发送"
        :description="successMessage"
        class="sent-alert"
      />

      <el-alert
        v-if="errorMessage"
        type="error"
        show-icon
        :closable="false"
        :title="errorMessage"
        class="sent-alert"
      />

      <p v-if="!sent" class="auth-tip">
        为了保护账号安全，无论邮箱是否存在，系统都会返回统一受理结果。
      </p>

      <el-form
        v-if="!sent"
        ref="formRef"
        class="auth-form"
        :model="form"
        :rules="rules"
        label-position="top"
        @keyup.enter="handleSubmit"
      >
        <el-form-item label="邮箱地址" prop="email">
          <el-input
            v-model.trim="form.email"
            size="large"
            placeholder="请输入注册邮箱"
            type="email"
          />
        </el-form-item>
        <el-button
          class="auth-form__submit"
          type="primary"
          size="large"
          :loading="loading"
          @click="handleSubmit"
        >
          {{ resendSeconds > 0 ? `${resendSeconds} 秒后可重发` : '发送重置链接' }}
        </el-button>
      </el-form>

      <el-button
        v-if="sent"
        class="auth-form__submit"
        type="primary"
        size="large"
        :disabled="resendSeconds > 0"
        @click="sent = false"
      >
        {{ resendSeconds > 0 ? `${resendSeconds} 秒后可重发` : '重新发送' }}
      </el-button>

      <div class="auth-card__footer">
        <span>想起密码了？</span>
        <el-button link type="primary" @click="router.push('/login')">返回登录</el-button>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { onBeforeUnmount, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { forgotPasswordApi, type ForgotPasswordDTO } from '@/api/auth'
import { getErrorMessage as normalizeErrorMessage } from '@/utils/error'

const router = useRouter()
const formRef = ref<FormInstance>()
const loading = ref(false)
const sent = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const resendSeconds = ref(0)
let countdownTimer: number | undefined

const form = reactive<ForgotPasswordDTO>({
  email: ''
})

const rules: FormRules<ForgotPasswordDTO> = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
  ]
}

const getAuthErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object') {
    const payload = error as { message?: string; response?: { data?: { message?: string } } }
    const message = payload.response?.data?.message || payload.message || ''
    if (message.toLowerCase().includes('frequent') || message.includes('频繁')) {
      return '请求过于频繁，请稍后再试。'
    }
    if (message.toLowerCase().includes('network')) {
      return '网络连接异常，请确认服务是否可用后重试。'
    }
    return normalizeErrorMessage(error, fallback)
  }
  return fallback
}

const startCountdown = (seconds = 60) => {
  if (countdownTimer) {
    window.clearInterval(countdownTimer)
  }
  resendSeconds.value = seconds
  countdownTimer = window.setInterval(() => {
    resendSeconds.value = Math.max(0, resendSeconds.value - 1)
    if (resendSeconds.value <= 0 && countdownTimer) {
      window.clearInterval(countdownTimer)
      countdownTimer = undefined
    }
  }, 1000)
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    errorMessage.value = ''
    successMessage.value = ''
    try {
      const result = await forgotPasswordApi(form)
      sent.value = true
      successMessage.value =
        result.message ||
        `如果 ${form.email} 已绑定账号，请检查收件箱或垃圾邮件，并在链接过期前完成密码重置。`
      startCountdown(60)
      ElMessage.success('重置链接已发送，请查收邮箱')
    } catch (error: unknown) {
      errorMessage.value = getAuthErrorMessage(error, '重置链接发送失败，请稍后重试')
    } finally {
      loading.value = false
    }
  })
}

onBeforeUnmount(() => {
  if (countdownTimer) {
    window.clearInterval(countdownTimer)
  }
})
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
  margin-top: 18px;
}

.auth-form__submit {
  width: 100%;
  margin-top: 6px;
}

.auth-tip {
  margin: 20px 0 0;
  color: var(--app-text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.sent-alert {
  margin-top: 24px;
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
</style>
