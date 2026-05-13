<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">个人资料</h1>
        <p class="page-subtitle">查看当前账号基础信息，并维护昵称、头像地址和邮箱。</p>
      </div>
    </div>

    <section class="content-card">
      <div class="content-card__body profile-layout" v-loading="loading">
        <div class="profile-summary">
          <el-avatar :size="72" :src="form.avatarUrl || ''">{{ avatarText }}</el-avatar>
          <strong>{{ form.username || '-' }}</strong>
          <span>{{ rolesText }}</span>
        </div>

        <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
          <el-form-item label="用户名">
            <el-input v-model="form.username" disabled />
          </el-form-item>
          <el-form-item label="昵称" prop="nickname">
            <el-input v-model.trim="form.nickname" maxlength="50" show-word-limit />
          </el-form-item>
          <el-form-item label="头像地址" prop="avatarUrl">
            <el-input v-model.trim="form.avatarUrl" maxlength="255" />
          </el-form-item>
          <el-form-item label="邮箱" prop="email">
            <el-input v-model.trim="form.email" maxlength="100" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="saving" @click="handleSave">保存资料</el-button>
          </el-form-item>
        </el-form>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'

import { getUserProfileApi, updateUserProfileApi } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import type { UserProfileUpdateDTO, UserProfileVO } from '@/types/user'

const authStore = useAuthStore()
const formRef = ref<FormInstance>()
const loading = ref(false)
const saving = ref(false)

const form = reactive<UserProfileVO>({
  username: '',
  nickname: '',
  avatarUrl: '',
  email: '',
  roles: []
})

const rules: FormRules<UserProfileUpdateDTO> = {
  email: [{ type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }]
}

const avatarText = computed(() => (form.nickname || form.username || 'U').slice(0, 1).toUpperCase())
const rolesText = computed(() => form.roles?.join(' / ') || 'USER')

const assignForm = (data: UserProfileVO) => {
  Object.assign(form, {
    username: data.username || '',
    nickname: data.nickname || '',
    avatarUrl: data.avatarUrl || '',
    email: data.email || '',
    roles: data.roles || []
  })
}

const fetchProfile = async () => {
  loading.value = true
  try {
    const data = await getUserProfileApi()
    assignForm(data)
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    saving.value = true
    try {
      const data = await updateUserProfileApi({
        nickname: form.nickname,
        avatarUrl: form.avatarUrl || undefined,
        email: form.email || undefined
      })
      assignForm(data)
      if (authStore.userInfo) {
        authStore.setUserInfo({
          ...authStore.userInfo,
          nickname: data.nickname,
          avatarUrl: data.avatarUrl,
          email: data.email
        })
      }
      ElMessage.success('资料已保存')
    } finally {
      saving.value = false
    }
  })
}

onMounted(fetchProfile)
</script>

<style scoped lang="scss">
.profile-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 520px);
  gap: 28px;
  align-items: start;
}

.profile-summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 22px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface-soft);

  span {
    color: var(--app-text-muted);
    font-size: 13px;
  }
}

@media (max-width: 760px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }
}
</style>
