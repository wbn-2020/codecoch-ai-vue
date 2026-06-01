<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">个人资料</h1>
        <p class="page-subtitle">查看当前账号基础信息，并维护昵称、头像和邮箱。</p>
      </div>
    </div>

    <AppState v-if="loadError && !hasProfileData" type="error" title="个人资料加载失败" :description="loadError">
      <el-button type="primary" :loading="loading" @click="fetchProfile">重新加载</el-button>
    </AppState>

    <section v-else class="content-card">
      <el-alert
        v-if="loadError"
        class="profile-alert"
        type="warning"
        show-icon
        :closable="false"
        title="当前展示的是本地账号信息，完整资料暂时加载失败。"
        :description="loadError"
      >
        <template #default>
          <el-button text type="primary" :loading="loading" @click="fetchProfile">重试</el-button>
        </template>
      </el-alert>
      <div class="content-card__body profile-layout" v-loading="loading">
        <div class="profile-summary">
          <div class="avatar-wrapper">
            <el-avatar :size="72" :src="form.avatarUrl || ''">{{ avatarText }}</el-avatar>
          </div>
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
            <el-input v-model.trim="form.avatarUrl" maxlength="500" placeholder="请输入图片 URL" />
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

import { getUserProfileApi, updateAvatarApi, updateUserProfileApi } from '@/api/user'
import AppState from '@/components/common/AppState.vue'
import { useAuthStore } from '@/stores/auth'
import type { UserProfileUpdateDTO, UserProfileVO } from '@/types/user'
import { getErrorMessage } from '@/utils/error'

const authStore = useAuthStore()
const formRef = ref<FormInstance>()
const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const originalAvatarUrl = ref('')

const form = reactive<UserProfileVO>({
  username: '',
  nickname: '',
  avatarUrl: '',
  email: '',
  roles: []
})

const rules: FormRules<UserProfileUpdateDTO> = {
  avatarUrl: [
    {
      type: 'url',
      message: '请输入有效的头像 URL',
      trigger: 'blur'
    }
  ],
  email: [{ type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }]
}

const avatarText = computed(() => (form.nickname || form.username || 'U').slice(0, 1).toUpperCase())
const rolesText = computed(() => form.roles?.join(' / ') || 'USER')
const hasProfileData = computed(() => Boolean(form.username || form.nickname || authStore.userInfo?.username))

const assignForm = (data: UserProfileVO) => {
  Object.assign(form, {
    username: data.username || '',
    nickname: data.nickname || '',
    avatarUrl: data.avatarUrl || '',
    email: data.email || '',
    roles: data.roles || []
  })
  originalAvatarUrl.value = data.avatarUrl || ''
}

const fetchProfile = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const data = await getUserProfileApi()
    assignForm(data)
  } catch (error) {
    if (authStore.userInfo) {
      assignForm({
        username: authStore.userInfo.username || '',
        nickname: authStore.userInfo.nickname,
        avatarUrl: authStore.userInfo.avatarUrl,
        email: authStore.userInfo.email,
        roles: authStore.roles
      })
    }
    loadError.value = getErrorMessage(error, '暂时无法读取完整个人资料，请稍后重试。')
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
      if (form.avatarUrl && form.avatarUrl !== originalAvatarUrl.value) {
        await updateAvatarApi(form.avatarUrl || '')
      }
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

.profile-alert {
  margin: 0 20px;
  transform: translateY(16px);
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

.avatar-wrapper {
  position: relative;
}

@media (max-width: 760px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }
}
</style>
