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

const readHashToken = (hash: string) => {
  if (!hash) return ''

  const normalizedHash = hash.startsWith('#') ? hash.slice(1) : hash
  if (!normalizedHash) return ''

  const directParams = new URLSearchParams(normalizedHash)
  const directToken = directParams.get('token')
  if (directToken) {
    return directToken
  }

  const queryIndex = normalizedHash.indexOf('?')
  if (queryIndex >= 0) {
    const nestedParams = new URLSearchParams(normalizedHash.slice(queryIndex + 1))
    return nestedParams.get('token') || ''
  }

  return ''
}

const token = computed(() => {
  const t = route.query.token
  if (typeof t === 'string' && t) {
    return t
  }

  return readHashToken(route.hash)
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
@use './auth-workspace';
</style>
