<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">个人资料</h1>
        <p class="page-subtitle">查看当前账号基础信息，并维护昵称、头像和邮箱。</p>
      </div>
    </div>

    <section class="content-card">
      <div class="content-card__body profile-layout" v-loading="loading">
        <div class="profile-summary">
          <div class="avatar-wrapper">
            <el-avatar :size="72" :src="form.avatarUrl || ''">{{ avatarText }}</el-avatar>
            <label class="avatar-upload-btn" title="上传头像">
              <Camera :size="14" />
              <input
                ref="avatarInputRef"
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                class="sr-only"
                @change="handleAvatarChange"
              />
            </label>
          </div>
          <strong>{{ form.username || '-' }}</strong>
          <span>{{ rolesText }}</span>
          <el-tag v-if="uploadingAvatar" type="info" size="small">上传中...</el-tag>
        </div>

        <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
          <el-form-item label="用户名">
            <el-input v-model="form.username" disabled />
          </el-form-item>
          <el-form-item label="昵称" prop="nickname">
            <el-input v-model.trim="form.nickname" maxlength="50" show-word-limit />
          </el-form-item>
          <el-form-item label="头像地址" prop="avatarUrl">
            <el-input v-model.trim="form.avatarUrl" maxlength="255" placeholder="上传头像或粘贴图片 URL" />
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
import { Camera } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'

import { getUserProfileApi, updateUserProfileApi, uploadAvatarApi } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import type { UserProfileUpdateDTO, UserProfileVO } from '@/types/user'

const authStore = useAuthStore()
const formRef = ref<FormInstance>()
const avatarInputRef = ref<HTMLInputElement>()
const loading = ref(false)
const saving = ref(false)
const uploadingAvatar = ref(false)

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

const handleAvatarChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (file.size > 2 * 1024 * 1024) {
    ElMessage.warning('头像文件不能超过 2MB')
    return
  }
  const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    ElMessage.warning('仅支持 PNG、JPG、GIF 或 WebP 图片')
    return
  }

  uploadingAvatar.value = true
  try {
    const result = await uploadAvatarApi(file)
    form.avatarUrl = result.url
    ElMessage.success('头像已上传，请保存资料后生效')
  } catch {
    ElMessage.error('头像上传失败')
  } finally {
    uploadingAvatar.value = false
    if (avatarInputRef.value) {
      avatarInputRef.value.value = ''
    }
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

.avatar-wrapper {
  position: relative;
}

.avatar-upload-btn {
  position: absolute;
  right: -4px;
  bottom: -4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 2px solid var(--app-surface);
  border-radius: 50%;
  background: var(--cc-primary);
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #6366f1;
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 760px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }
}
</style>
