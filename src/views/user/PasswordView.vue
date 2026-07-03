<template>
  <div class="page-shell security-page">
    <section class="security-hero">
      <div class="hero-copy">
        <p class="hero-kicker">
          <KeyRound :size="16" />
          账户安全
        </p>
        <h1 class="page-title">修改密码</h1>
        <p class="page-subtitle">
          提交旧密码和新密码。若安全策略要求重新登录，系统会在会话失效时回到登录页。
        </p>
      </div>

      <div class="hero-actions">
        <el-button @click="router.push('/profile')">
          <UserRound :size="16" />
          返回资料页
        </el-button>
        <el-button type="primary" @click="scrollToForm">
          <PencilLine :size="16" />
          立即修改
        </el-button>
      </div>
    </section>

    <section class="security-grid">
      <article class="content-card security-tips">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">修改建议</p>
              <h2>让密码更新更顺手</h2>
            </div>
          </div>

          <ul>
            <li>建议使用不少于 8 位的密码，并同时包含字母和数字。</li>
            <li>密码修改后，若当前会话失效，请按登录页提示重新登录。</li>
            <li>不要把密码写成与用户名或昵称过于接近的形式。</li>
          </ul>
        </div>
      </article>

      <article ref="formAnchor" class="content-card security-form-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">安全设置</p>
              <h2>输入旧密码和新密码</h2>
            </div>
          </div>

          <el-alert
            class="security-alert"
            type="warning"
            :closable="false"
            show-icon
            title="提交后如果当前会话失效，下一次需要身份确认时会自动引导你重新登录。"
          />

          <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
            <el-form-item label="旧密码" prop="oldPassword">
              <el-input v-model="form.oldPassword" type="password" show-password placeholder="请输入当前密码" />
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword">
              <el-input v-model="form.newPassword" type="password" show-password placeholder="请输入新密码" />
            </el-form-item>
            <el-form-item label="确认新密码" prop="confirmPassword">
              <el-input v-model="form.confirmPassword" type="password" show-password placeholder="再次输入新密码" />
            </el-form-item>
            <div class="form-actions">
              <el-button :disabled="loading" @click="resetForm">清空重填</el-button>
              <el-button type="primary" :loading="loading" @click="handleSubmit">保存新密码</el-button>
            </div>
          </el-form>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { KeyRound, PencilLine, UserRound } from 'lucide-vue-next'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { updatePasswordApi } from '@/api/user'
import { getErrorMessage } from '@/utils/error'
import type { PasswordUpdateDTO } from '@/types/user'

const router = useRouter()
const formRef = ref<FormInstance>()
const formAnchor = ref<HTMLElement | null>(null)
const loading = ref(false)

const form = reactive<PasswordUpdateDTO>({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const validateConfirmPassword = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (!value) {
    callback(new Error('请再次输入新密码'))
    return
  }

  if (value !== form.newPassword) {
    callback(new Error('两次输入的新密码不一致'))
    return
  }

  callback()
}

const rules: FormRules<PasswordUpdateDTO> = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 32, message: '新密码长度为 6-32 位', trigger: 'blur' }
  ],
  confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }]
}

const resetForm = () => {
  formRef.value?.resetFields()
}

const scrollToForm = () => {
  formAnchor.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  loading.value = true
  try {
    await updatePasswordApi(form)
    ElMessage.success('密码已修改，请根据页面提示继续使用或重新登录')
    formRef.value?.resetFields()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '密码修改失败，请稍后重试。'))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.security-page {
  gap: 20px;
}

.security-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  padding: 24px 0 8px;
}

.hero-copy {
  min-width: 0;
}

.hero-kicker,
.section-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.security-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  gap: 18px;
}

.section-head {
  margin-bottom: 14px;
}

.section-head h2 {
  margin: 5px 0 0;
  color: var(--app-text);
  font-size: 18px;
  line-height: 1.3;
}

.security-tips ul {
  display: grid;
  gap: 12px;
  margin: 16px 0 0;
  padding-left: 18px;
  color: var(--app-text-muted);
  line-height: 1.7;
}

.security-form-card {
  min-width: 0;
}

.security-alert {
  margin-bottom: 16px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

@media (max-width: 960px) {
  .security-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .security-hero {
    align-items: flex-start;
    flex-direction: column;
    padding-top: 4px;
  }

  .hero-actions,
  .form-actions {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr;
  }

  .hero-actions :deep(.el-button),
  .form-actions :deep(.el-button) {
    width: 100%;
  }

  .section-head {
    display: grid;
    justify-content: stretch;
  }
}
</style>
