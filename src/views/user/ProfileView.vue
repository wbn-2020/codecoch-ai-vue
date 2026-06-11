<template>
  <div class="page-shell profile-page">
    <section class="profile-hero">
      <div class="hero-copy">
        <p class="hero-kicker">
          <UserRound :size="16" />
          个人中心
        </p>
        <h1 class="page-title">个人资料</h1>
        <p class="page-subtitle">
          维护头像、昵称和邮箱，顶部导航、通知和训练记录会保持一致。
        </p>
      </div>

      <div class="hero-actions">
        <el-button :loading="loading" @click="loadProfile">
          <RefreshCw :size="16" />
          重新加载
        </el-button>
        <el-button type="primary" @click="scrollToEditor">
          <PencilLine :size="16" />
          编辑资料
        </el-button>
      </div>
    </section>

    <AppState
      v-if="errorMessage"
      type="error"
      title="个人资料暂时加载失败"
      :description="errorMessage"
    >
      <el-button type="primary" :loading="loading" @click="loadProfile">重试</el-button>
    </AppState>

    <AppState
      v-else-if="loading && !profile"
      type="loading"
      title="正在加载个人资料"
      description="正在同步当前账户信息，请稍候。"
    />

    <section v-else class="profile-grid">
      <article class="content-card profile-summary">
        <div class="content-card__body">
          <div class="summary-head">
            <el-avatar :size="72" :src="currentAvatarUrl || ''">
              {{ avatarText }}
            </el-avatar>
            <div class="summary-title">
              <p class="summary-label">当前账户</p>
              <h2>{{ displayName }}</h2>
              <span>@{{ username }}</span>
            </div>
            <el-tag :type="accountStatusTagType" effect="plain">{{ accountStatusLabel }}</el-tag>
          </div>

          <dl class="summary-list">
            <div>
              <dt>账户记录</dt>
              <dd>{{ profile?.userId || profile?.id || '-' }}</dd>
            </div>
            <div>
              <dt>邮箱</dt>
              <dd>{{ profile?.email || '未设置' }}</dd>
            </div>
            <div>
              <dt>角色</dt>
              <dd class="role-list">
                <el-tag v-for="role in roleLabels" :key="role" size="small" effect="plain">
                  {{ role }}
                </el-tag>
              </dd>
            </div>
            <div>
              <dt>创建时间</dt>
              <dd>{{ formatDateTime(profile?.createdAt) }}</dd>
            </div>
          </dl>

          <div class="summary-actions">
            <el-button @click="goPassword">
              <KeyRound :size="16" />
              修改密码
            </el-button>
            <el-button type="primary" @click="scrollToEditor">
              <PencilLine :size="16" />
              立即编辑
            </el-button>
          </div>
        </div>
      </article>

      <article ref="editorRef" class="content-card profile-editor">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">资料编辑</p>
              <h2>昵称、邮箱和头像</h2>
            </div>
            <el-button text @click="resetForm">
              <RefreshCw :size="15" />
              恢复当前值
            </el-button>
          </div>

          <el-alert
            class="editor-note"
            type="info"
            :closable="false"
            show-icon
            title="头像链接会直接作为展示地址，不会上传本地文件。"
          />

          <div class="avatar-editor">
            <el-avatar :size="60" :src="avatarPreview || ''">
              {{ avatarText }}
            </el-avatar>
            <div class="avatar-editor__field">
              <el-input
                v-model="avatarUrlDraft"
                placeholder="请输入头像链接"
                clearable
              />
              <p>支持可访问的图片链接，保存后会同步到顶部导航和个人中心。</p>
            </div>
            <el-button
              :loading="avatarSaving"
              :disabled="!avatarDirty"
              @click="handleSaveAvatar"
            >
              应用头像
            </el-button>
          </div>

          <el-form
            ref="formRef"
            class="profile-form"
            :model="form"
            :rules="rules"
            label-position="top"
          >
            <el-form-item label="昵称" prop="nickname">
              <el-input v-model="form.nickname" maxlength="30" show-word-limit placeholder="输入你希望展示的昵称" />
            </el-form-item>

            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" placeholder="输入邮箱地址" clearable />
            </el-form-item>

            <div class="form-actions">
              <el-button :disabled="saving" @click="resetForm">取消修改</el-button>
              <el-button type="primary" :loading="saving" @click="handleSaveProfile">
                保存资料
              </el-button>
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
import {
  KeyRound,
  PencilLine,
  RefreshCw,
  UserRound
} from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { updateAvatarApi } from '@/api/user'
import AppState from '@/components/common/AppState.vue'
import { getStatusType, formatDateTime } from '@/utils/format'
import { getErrorMessage } from '@/utils/error'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import type { UserProfileUpdateDTO, UserProfileVO } from '@/types/user'

const router = useRouter()
const authStore = useAuthStore()
const userStore = useUserStore()

const formRef = ref<FormInstance>()
const editorRef = ref<HTMLElement | null>(null)
const loading = ref(false)
const saving = ref(false)
const avatarSaving = ref(false)
const errorMessage = ref('')
const profile = ref<UserProfileVO | null>(null)
const avatarUrlDraft = ref('')

const form = reactive<UserProfileUpdateDTO>({
  nickname: '',
  email: ''
})

const avatarText = computed(() => {
  const source = profile.value?.nickname || profile.value?.username || authStore.userInfo?.nickname || authStore.userInfo?.username || '用户'
  return source.slice(0, 1).toUpperCase()
})

const displayName = computed(() => profile.value?.nickname || profile.value?.username || authStore.userInfo?.nickname || authStore.userInfo?.username || '用户')
const username = computed(() => profile.value?.username || authStore.userInfo?.username || '-')
const currentAvatarUrl = computed(() => avatarUrlDraft.value.trim() || profile.value?.avatarUrl || authStore.userInfo?.avatarUrl || '')
const avatarPreview = computed(() => currentAvatarUrl.value)
const avatarDirty = computed(() => avatarUrlDraft.value.trim() !== (profile.value?.avatarUrl || '').trim())
const accountStatusLabel = computed(() => {
  if (profile.value?.status === 1) return '启用中'
  if (profile.value?.status === 0) return '已停用'
  return '未同步'
})
const accountStatusTagType = computed(() => getStatusType(profile.value?.status))
const roleLabels = computed(() => {
  const roles = profile.value?.roles || authStore.userInfo?.roles || []
  if (!roles.length) return ['普通用户']

  return roles.map((role) => {
    if (role === 'ADMIN') return '管理员'
    if (role === 'USER') return '普通用户'
    return role
  })
})

const rules: FormRules<UserProfileUpdateDTO> = {
  nickname: [{ max: 30, message: '昵称长度不能超过 30 个字符', trigger: 'blur' }],
  email: [{ type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }]
}

const syncFormFromProfile = (source: UserProfileVO | null) => {
  form.nickname = source?.nickname || ''
  form.email = source?.email || ''
  avatarUrlDraft.value = source?.avatarUrl || ''
}

const syncAuthUser = (source: UserProfileVO) => {
  const current = authStore.userInfo
  authStore.setUserInfo({
    id: source.id ?? current?.id,
    userId: source.userId ?? current?.userId,
    username: source.username || current?.username || '',
    nickname: source.nickname ?? current?.nickname,
    avatarUrl: source.avatarUrl ?? current?.avatarUrl ?? null,
    email: source.email ?? current?.email,
    roles: source.roles?.length ? source.roles : current?.roles || [],
    permissions: current?.permissions || []
  })
}

const loadProfile = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await userStore.fetchProfile()
    profile.value = result
    syncFormFromProfile(result)
    syncAuthUser(result)
  } catch (error) {
    profile.value = null
    errorMessage.value = getErrorMessage(error, '个人资料暂时加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  syncFormFromProfile(profile.value)
  formRef.value?.clearValidate()
}

const scrollToEditor = () => {
  editorRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const handleSaveAvatar = async () => {
  const nextAvatar = avatarUrlDraft.value.trim()
  if (!nextAvatar) {
    ElMessage.warning('请先输入头像链接')
    return
  }

  if (nextAvatar === (profile.value?.avatarUrl || '').trim()) {
    ElMessage.info('头像链接没有变化')
    return
  }

  avatarSaving.value = true
  try {
    await updateAvatarApi(nextAvatar)
    await loadProfile()
    ElMessage.success('头像已更新')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '头像更新失败，请稍后重试。'))
  } finally {
    avatarSaving.value = false
  }
}

const handleSaveProfile = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    const updated = await userStore.updateProfile({
      nickname: form.nickname,
      email: form.email
    })
    profile.value = updated
    syncFormFromProfile(updated)
    syncAuthUser(updated)
    ElMessage.success('个人资料已更新')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '资料保存失败，请稍后重试。'))
  } finally {
    saving.value = false
  }
}

const goPassword = async () => {
  await router.push('/password')
}

onMounted(() => {
  loadProfile()
})
</script>

<style scoped lang="scss">
.profile-page {
  gap: 20px;
}

.profile-hero {
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
.section-kicker,
.summary-label {
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

.profile-grid {
  display: grid;
  grid-template-columns: minmax(280px, 0.85fr) minmax(0, 1.15fr);
  gap: 18px;
}

.profile-summary,
.profile-editor {
  min-width: 0;
}

.summary-head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.summary-title {
  min-width: 0;

  h2 {
    margin: 4px 0 0;
    color: var(--app-text);
    font-size: 22px;
    line-height: 1.3;
  }

  span {
    display: block;
    margin-top: 5px;
    color: var(--app-text-muted);
    font-size: 13px;
  }
}

.summary-list {
  display: grid;
  gap: 14px;
  margin: 20px 0 0;

  div {
    display: grid;
    gap: 4px;
  }

  dt {
    color: var(--app-text-muted);
    font-size: 12px;
  }

  dd {
    margin: 0;
    color: var(--app-text);
    font-size: 14px;
    font-weight: 600;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
}

.role-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.summary-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.section-head h2 {
  margin: 5px 0 0;
  color: var(--app-text);
  font-size: 18px;
  line-height: 1.3;
}

.editor-note {
  margin-bottom: 16px;
}

.avatar-editor {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface-soft);
}

.avatar-editor__field {
  min-width: 0;

  p {
    margin: 8px 0 0;
    color: var(--app-text-muted);
    font-size: 12px;
    line-height: 1.6;
  }
}

.profile-form {
  margin-top: 18px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

@media (max-width: 960px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .profile-hero {
    align-items: flex-start;
    flex-direction: column;
    padding-top: 4px;
  }

  .avatar-editor {
    grid-template-columns: 1fr;
    justify-items: start;
  }

  .form-actions,
  .summary-actions,
  .hero-actions {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr;
  }

  .form-actions :deep(.el-button),
  .summary-actions :deep(.el-button),
  .hero-actions :deep(.el-button) {
    width: 100%;
  }

  .section-head {
    display: grid;
    justify-content: stretch;
  }
}
</style>
