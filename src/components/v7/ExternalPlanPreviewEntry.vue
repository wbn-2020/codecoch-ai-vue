<template>
  <div class="external-plan-entry">
    <el-tooltip :content="disabledReason" placement="top" :disabled="!disabled && intents.length > 0">
      <span>
        <el-button
          type="primary"
          plain
          :loading="loading"
          :disabled="disabled || !intents.length"
          :title="disabledReason"
          :data-testid="testId"
          @click="openPreview"
        >
          <ListPlus :size="15" />
          {{ buttonLabel }}
        </el-button>
      </span>
    </el-tooltip>

    <PlanChangePreviewDialog
      v-if="enabled"
      v-model="dialogVisible"
      :preview="preview"
      :loading="loading"
      :confirming="confirming"
      @back="dialogVisible = false"
      @refresh="refreshPreview"
      @confirm="confirmPreview"
    />
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, ref } from 'vue'
import { ListPlus } from 'lucide-vue-next'

import { appConfig } from '@/config'
import PlanChangePreviewDialog from '@/components/agent-review/PlanChangePreviewDialog.vue'
import {
  confirmExternalPlanPreviewV7Api,
  createExternalPlanPreviewV7Api,
  getExternalPlanPreviewV7Api
} from '@/api/v7Career'
import type { AgentPlanChangePreviewVO } from '@/types/agentPlanChange'
import type { V7ExternalPlanIntent, V7ExternalPlanPreviewDTO, V7ExternalPlanPreviewVO } from '@/types/v7/career'
import { getErrorMessage } from '@/utils/error'

const props = withDefaults(defineProps<{
  sourceType: string
  sourceId?: number | string
  sourceVersion?: number
  sourceContextHash?: string
  targetJobId?: number
  targetDate?: string
  intents: V7ExternalPlanIntent[]
  createPreview?: (idempotencyKey: string) => Promise<V7ExternalPlanPreviewVO>
  capabilityAvailable?: boolean
  buttonLabel?: string
  testId?: string
  unavailableReason?: string
}>(), {
  capabilityAvailable: true,
  buttonLabel: '进入计划差异预览',
  testId: 'v7-external-plan-preview',
  unavailableReason: '计划来源能力暂未开放'
})

const enabled = computed(() => appConfig.enableV7ExternalPlanSource)
const payloadReady = computed(() =>
  Boolean(props.sourceId && props.sourceContextHash && props.intents.length)
)
const disabled = computed(() => !enabled.value || !props.capabilityAvailable || !payloadReady.value)
const disabledReason = computed(() =>
  !payloadReady.value
    ? '来源快照尚未准备完成'
    : disabled.value ? props.unavailableReason : '请先准备至少一个行动项'
)
const dialogVisible = ref(false)
const loading = ref(false)
const confirming = ref(false)
const preview = ref<AgentPlanChangePreviewVO | null>(null)

const idempotencyKey = computed(() =>
  `v7-external:${props.sourceType}:${props.sourceId || 'new'}:${props.sourceVersion || 1}:${props.targetDate || 'auto'}`
)

const buildPayload = (): V7ExternalPlanPreviewDTO => ({
  sourceType: props.sourceType,
  sourceId: props.sourceId,
  sourceVersion: props.sourceVersion || 1,
  sourceContextHash: props.sourceContextHash,
  targetJobId: props.targetJobId,
  targetDate: props.targetDate,
  intents: props.intents,
  idempotencyKey: idempotencyKey.value
})

const toPlanPreview = (value: V7ExternalPlanPreviewVO): AgentPlanChangePreviewVO => ({
  ...value,
  changeSetId: value.changeSetId,
  status: value.status,
  items: (value.items || []) as unknown as AgentPlanChangePreviewVO['items'],
  summary: value.summary as AgentPlanChangePreviewVO['summary']
})

const loadPreview = async (create: boolean) => {
  loading.value = true
  try {
    const result = create
      ? props.createPreview
        ? await props.createPreview(idempotencyKey.value)
        : await createExternalPlanPreviewV7Api(buildPayload())
      : preview.value?.changeSetId
        ? await getExternalPlanPreviewV7Api(preview.value.changeSetId)
        : await createExternalPlanPreviewV7Api(buildPayload())
    preview.value = toPlanPreview(result)
    dialogVisible.value = true
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '计划差异预览暂时不可用，请稍后重试。'))
  } finally {
    loading.value = false
  }
}

const openPreview = () => {
  if (!payloadReady.value || disabled.value || loading.value) return
  void loadPreview(true)
}

const refreshPreview = () => {
  void loadPreview(Boolean(preview.value?.status === 'STALE' || !preview.value?.changeSetId))
}

const confirmPreview = async (acknowledgedWarningCodes: string[]) => {
  if (!preview.value?.changeSetId || confirming.value) return
  confirming.value = true
  try {
    const result = await confirmExternalPlanPreviewV7Api(preview.value.changeSetId, {
      previewVersion: preview.value.previewVersion,
      previewHash: preview.value.previewHash,
      acknowledgedWarningCodes,
      idempotencyKey: `${idempotencyKey.value}:confirm`
    })
    const refreshed = await getExternalPlanPreviewV7Api(preview.value.changeSetId)
    preview.value = toPlanPreview(refreshed)
    ElMessage.success(result.status === 'PARTIALLY_APPLIED'
      ? '计划已部分应用，请查看未完成项。'
      : '计划变更已确认，系统将按结果回读。')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '计划确认失败，原计划未被自动改写。'))
  } finally {
    confirming.value = false
  }
}
</script>

<style scoped lang="scss">
.external-plan-entry {
  display: inline-flex;
}

.external-plan-entry :deep(.el-button) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>
