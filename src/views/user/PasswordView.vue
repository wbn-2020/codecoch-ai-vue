<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">修改密码</h1>
        <p class="page-subtitle">提交旧密码和新密码。后端如注销当前会话，前端会按失效响应回到登录页。</p>
      </div>
    </div>

    <section class="content-card password-card">
      <div class="content-card__body">
        <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
          <el-form-item label="旧密码" prop="oldPassword">
            <el-input v-model="form.oldPassword" type="password" show-password />
          </el-form-item>
          <el-form-item label="新密码" prop="newPassword">
            <el-input v-model="form.newPassword" type="password" show-password />
          </el-form-item>
          <el-form-item label="确认新密码" prop="confirmPassword">
            <el-input v-model="form.confirmPassword" type="password" show-password />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="handleSubmit">保存新密码</el-button>
          </el-form-item>
        </el-form>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { reactive, ref } from 'vue'

import { updatePasswordApi } from '@/api/user'
import type { PasswordUpdateDTO } from '@/types/user'

const formRef = ref<FormInstance>()
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

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    try {
      await updatePasswordApi(form)
      ElMessage.success('密码已修改，请根据后端会话策略继续使用或重新登录')
      formRef.value?.resetFields()
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped lang="scss">
.password-card {
  max-width: 620px;
}
</style>
