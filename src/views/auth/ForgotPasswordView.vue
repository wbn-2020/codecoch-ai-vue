<template>
  <main class="auth-page">
    <section class="auth-card">
      <div class="auth-card__intro">
        <div class="auth-card__brand">CodeCoachAI</div>
        <h1>找回密码</h1>
        <p>输入注册时使用的邮箱地址，我们将发送密码重置链接到你的邮箱。</p>
      </div>

      <el-alert
        v-if="sent"
        type="success"
        show-icon
        :closable="false"
        title="重置链接已发送"
        :description="`请检查 ${form.email} 的收件箱（含垃圾邮件），点击链接完成密码重置。`"
        class="sent-alert"
      />

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
          发送重置链接
        </el-button>
      </el-form>

      <el-button
        v-if="sent"
        class="auth-form__submit"
        type="primary"
        size="large"
        @click="sent = false"
      >
        重新发送
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
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { forgotPasswordApi, type ForgotPasswordDTO } from '@/api/auth'

const router = useRouter()
const formRef = ref<FormInstance>()
const loading = ref(false)
const sent = ref(false)

const form = reactive<ForgotPasswordDTO>({
  email: ''
})

const rules: FormRules<ForgotPasswordDTO> = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
  ]
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    try {
      await forgotPasswordApi(form)
      sent.value = true
      ElMessage.success('重置链接已发送，请查收邮箱')
    } catch (error: unknown) {
      // 接口可能返回"邮箱不存在"等错误，由全局拦截器处理
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
