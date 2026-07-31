<template>
  <section class="cockpit-section profile-form" aria-labelledby="operating-profile-title">
    <header class="cockpit-section__header">
      <div>
        <span class="section-kicker">经营配置</span>
        <h2 id="operating-profile-title">本周期的工作边界</h2>
        <p>配置容量和关注范围，驾驶舱只据此解释偏差，不替你决定是否投递。</p>
      </div>
      <el-tag effect="plain" :type="draft.configured ? 'success' : 'info'">
        {{ draft.configured ? '已配置' : '使用保守默认值' }}
      </el-tag>
    </header>

    <el-alert
      v-if="error"
      type="warning"
      show-icon
      :closable="false"
      title="经营配置暂时不可用"
      :description="error"
    />

    <form class="profile-form__body" @submit.prevent="submit">
      <div class="profile-form__grid">
        <label class="profile-field">
          <span>每周目标投递</span>
          <el-input-number v-model="draft.weeklyApplicationTarget" :min="1" :max="100" controls-position="right" />
        </label>
        <label class="profile-field">
          <span>每周可用时间（分钟）</span>
          <el-input-number v-model="draft.weeklyTimeBudgetMinutes" :min="1" :max="10080" controls-position="right" />
        </label>
        <label class="profile-field">
          <span>活跃机会上限</span>
          <el-input-number v-model="draft.maxActiveOpportunities" :min="1" :max="100" controls-position="right" />
        </label>
        <label class="profile-field">
          <span>停滞判断（天）</span>
          <el-input-number v-model="draft.staleAfterDays" :min="1" :max="365" controls-position="right" />
        </label>
        <label class="profile-field">
          <span>默认跟进间隔（天）</span>
          <el-input-number v-model="draft.defaultFollowUpDays" :min="1" :max="90" controls-position="right" />
        </label>
        <label class="profile-field">
          <span>时区</span>
          <el-input v-model="draft.timezone" placeholder="例如 Asia/Shanghai" />
        </label>
      </div>

      <div class="profile-form__grid profile-form__grid--wide">
        <label class="profile-field">
          <span>关注岗位</span>
          <el-input v-model="focusRolesText" placeholder="用逗号分隔，例如 Java、后端、平台工程" />
        </label>
        <label class="profile-field">
          <span>关注地点</span>
          <el-input v-model="focusLocationsText" placeholder="用逗号分隔，例如 上海、远程" />
        </label>
        <label class="profile-field">
          <span>关注渠道</span>
          <el-input v-model="focusChannelsText" placeholder="用逗号分隔，例如 内推、官网" />
        </label>
      </div>

      <div class="profile-form__actions">
        <span class="muted">更新后会刷新本周期的容量和行动解释。</span>
        <el-button type="primary" native-type="submit" :loading="saving" :disabled="disabled">
          保存配置
        </el-button>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'

import type { CampaignOperatingProfile, CampaignOperatingProfileUpdateDTO } from '@/types/v8/campaign'

const props = withDefaults(defineProps<{
  modelValue: CampaignOperatingProfile
  saving?: boolean
  disabled?: boolean
  error?: string
}>(), {
  saving: false,
  disabled: false,
  error: ''
})

const emit = defineEmits<{
  save: [value: CampaignOperatingProfileUpdateDTO]
}>()

const draft = reactive<CampaignOperatingProfile>({ ...props.modelValue })
const focusRolesText = ref(props.modelValue.focusRoles.join(', '))
const focusLocationsText = ref(props.modelValue.focusLocations.join(', '))
const focusChannelsText = ref(props.modelValue.focusChannels.join(', '))

const splitList = (value: string) =>
  Array.from(new Set(value.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean))).slice(0, 20)

watch(() => props.modelValue, (value) => {
  Object.assign(draft, value)
  focusRolesText.value = value.focusRoles.join(', ')
  focusLocationsText.value = value.focusLocations.join(', ')
  focusChannelsText.value = value.focusChannels.join(', ')
}, { deep: true })

const submit = () => {
  emit('save', {
    weeklyApplicationTarget: Number(draft.weeklyApplicationTarget) || 0,
    weeklyTimeBudgetMinutes: Number(draft.weeklyTimeBudgetMinutes) || 0,
    maxActiveOpportunities: Number(draft.maxActiveOpportunities) || 0,
    staleAfterDays: Number(draft.staleAfterDays) || 1,
    defaultFollowUpDays: Number(draft.defaultFollowUpDays) || 1,
    focusRoles: splitList(focusRolesText.value),
    focusLocations: splitList(focusLocationsText.value),
    focusChannels: splitList(focusChannelsText.value),
    timezone: draft.timezone.trim(),
    expectedLockVersion: draft.lockVersion,
    // Stable per logical save (campaignId + lockVersion): a timeout retry reuses the same key so the
    // backend dedupes it instead of failing on the lock version. lockVersion advances after a
    // successful save, so the next genuine edit gets a fresh key. Mirrors CareerCampaignPanel.
    idempotencyKey: `campaign-profile:${draft.campaignId}:${draft.lockVersion || 0}`
  })
}
</script>

<style scoped lang="scss">
.cockpit-section {
  display: grid;
  gap: 16px;
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface, #151c27);
}

.cockpit-section__header,
.profile-form__actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.cockpit-section__header h2 {
  margin: 4px 0 0;
  color: var(--app-text);
  font-size: 18px;
}

.cockpit-section__header p {
  max-width: 68ch;
  margin: 6px 0 0;
  color: var(--app-text-muted);
  line-height: 1.6;
}

.section-kicker {
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
}

.profile-form__body {
  display: grid;
  gap: 16px;
}

.profile-form__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.profile-form__grid--wide {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.profile-field {
  display: grid;
  gap: 6px;
  min-width: 0;
  color: var(--app-text-muted);
  font-size: 13px;
}

.profile-field :deep(.el-input-number),
.profile-field :deep(.el-input) {
  width: 100%;
}

.profile-form__actions {
  align-items: center;
}

.muted {
  color: var(--app-text-muted);
  font-size: 13px;
}

@media (max-width: 760px) {
  .profile-form__grid,
  .profile-form__grid--wide {
    grid-template-columns: 1fr;
  }

  .cockpit-section__header,
  .profile-form__actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
