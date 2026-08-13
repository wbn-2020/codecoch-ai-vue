<template>
  <main class="arena arena-auth auth-page">
    <section class="auth-card">
      <div class="auth-card__intro">
        <div class="auth-card__brand">CodeCoachAI</div>
        <h1>创建账号</h1>
        <p>创建你的求职训练账号，用来保存简历、面试记录、练习进度和每日任务。</p>
      </div>

      <el-alert
        v-if="errorMessage"
        class="auth-alert"
        type="error"
        show-icon
        :closable="false"
        title="注册失败"
        :description="errorMessage"
      />

      <el-form ref="formRef" class="auth-form" :model="form" :rules="rules" label-position="top">
        <el-form-item label="用户名" prop="username">
          <el-input v-model.trim="form.username" size="large" placeholder="4-32 位用户名" />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model.trim="form.nickname" size="large" placeholder="可选" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model.trim="form.email" size="large" placeholder="可选" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" size="large" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="form.confirmPassword" size="large" type="password" show-password />
        </el-form-item>
        <el-button class="auth-form__submit" type="primary" size="large" :loading="loading" @click="handleSubmit">
          注册
        </el-button>
      </el-form>

      <div class="auth-card__footer">
        <span>已有账号？</span>
        <el-button link type="primary" @click="router.push('/login')">去登录</el-button>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import type { RegisterDTO } from '@/types/auth'
import { getErrorMessage as normalizeErrorMessage } from '@/utils/error'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref<FormInstance>()
const loading = ref(false)
const errorMessage = ref('')

const form = reactive<RegisterDTO>({
  username: '',
  nickname: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const validateConfirmPassword = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (!value) {
    callback(new Error('请再次输入密码'))
    return
  }

  if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'))
    return
  }

  callback()
}

const rules: FormRules<RegisterDTO> = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 4, max: 32, message: '用户名长度为 4-32 位', trigger: 'blur' }
  ],
  email: [{ type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 32, message: '密码长度为 6-32 位', trigger: 'blur' }
  ],
  confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }]
}

const trimAuthErrorPrefix = (message: string) =>
  message.replace(/^(注册失败|请求失败)[，,：:\s]*/u, '').trim() || message

const getRegisterErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object') {
    const payload = error as { message?: string; response?: { data?: { message?: string } } }
    const message = payload.response?.data?.message || payload.message || ''
    if (message.includes('用户名') || message.toLowerCase().includes('username')) {
      return '该用户名暂时不可用，请换一个用户名后重试。'
    }
    if (message.includes('邮箱') || message.toLowerCase().includes('email')) {
      return '该邮箱格式或状态不符合要求，请检查后重试。'
    }
    return trimAuthErrorPrefix(normalizeErrorMessage(error, '请稍后重试，或更换用户名后再试。'))
  }
  return '请稍后重试，或更换用户名后再试。'
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    errorMessage.value = ''
    try {
      await authStore.register(form, { silentError: true })
      ElMessage.success('注册成功，请登录')
      await router.replace('/login')
    } catch (error) {
      errorMessage.value = getRegisterErrorMessage(error)
    } finally {
      loading.value = false
    }
  })
}

watch(
  () => ({ ...form }),
  () => {
    if (errorMessage.value) errorMessage.value = ''
  }
)
</script>

<style scoped lang="scss">
@use './auth-workspace';
</style>
