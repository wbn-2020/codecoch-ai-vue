<template>
  <main class="auth-page">
    <section class="auth-card">
      <div class="auth-card__intro">
        <div class="auth-card__brand">CodeCoachAI</div>
        <h1>重置密码</h1>
        <p>设置你的新密码，完成后将自动跳转到登录页。</p>
      </div>

      <el-alert
        v-if="!token"
        type="error"
        show-icon
        :closable="false"
        title="无效的重置链接"
        description="缺少重置令牌参数，请从邮箱中的链接重新进入。"
        class="token-alert"
      />

      <el-alert
        v-if="success"
        type="success"
        show-icon
        :closable="false"
        title="密码重置成功"
        :description="successMessage"
        class="token-alert"
      />

      <el-alert
        v-if="errorMessage"
        type="error"
        show-icon
        :closable="false"
        :title="errorMessage"
        class="token-alert"
      />

      <el-form
        v-if="token && !success"
        ref="formRef"
        class="auth-form"
        :model="form"
        :rules="rules"
        label-position="top"
        @keyup.enter="handleSubmit"
      >
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="form.newPassword"
            size="large"
            type="password"
            placeholder="请输入新密码（至少 6 位）"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            size="large"
            type="password"
            placeholder="请再次输入新密码"
            show-password
          />
        </el-form-item>
        <el-button
          class="auth-form__submit"
          type="primary"
          size="large"
          :loading="loading"
          @click="handleSubmit"
        >
          重置密码
        </el-button>
      </el-form>

      <div class="auth-card__footer">
        <el-button link type="primary" @click="router.push('/login')">返回登录</el-button>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { resetPasswordApi, type ResetPasswordDTO } from '@/api/auth'
import { getErrorMessage as normalizeErrorMessage } from '@/utils/error'

const router = useRouter()
const route = useRoute()
const formRef = ref<FormInstance>()
const loading = ref(false)
const success = ref(false)
const successMessage = ref('新密码已生效，即将跳转到登录页...')
const errorMessage = ref('')

const token = computed(() => {
  const t = route.query.token
  return typeof t === 'string' ? t : ''
})

const form = reactive({
  newPassword: '',
  confirmPassword: ''
})

const validateConfirm = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (value !== form.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules: FormRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' }
  ]
}

const handleSubmit = async () => {
  if (!formRef.value || !token.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    errorMessage.value = ''
    try {
      const data: ResetPasswordDTO = {
        token: token.value,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword
      }
      const result = await resetPasswordApi(data)
      success.value = true
      successMessage.value = result.message || '新密码已生效，即将跳转到登录页...'
      ElMessage.success('密码重置成功，即将跳转登录页')
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (error: unknown) {
      errorMessage.value = normalizeErrorMessage(error, '密码重置失败，请确认链接是否有效')
    } finally {
      loading.value = false
    }
  })
}
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
  margin-top: 28px;
}

.auth-form__submit {
  width: 100%;
  margin-top: 6px;
}

.token-alert {
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
