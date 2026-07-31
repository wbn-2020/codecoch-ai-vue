<template>
  <div class="interview-panel">
    <div class="interview-panel__actions">
      <el-button v-if="!process?.id" type="primary" :disabled="disabled" @click="openCreateProcess">
        创建真实面试流程
      </el-button>
      <el-button v-else :disabled="disabled" @click="openRoundDialog">添加面试轮次</el-button>
    </div>

    <el-dialog v-model="createProcessVisible" title="创建真实面试流程" width="480px">
      <el-alert
        type="info"
        show-icon
        :closable="false"
        title="只记录真实招聘面试"
        description="这里记录真实的招聘方面试进程，与模拟面试相互独立，不会混用。"
      />
      <template #footer>
        <el-button @click="createProcessVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitCreateProcess">创建流程</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="roundVisible" title="添加面试轮次" width="560px">
      <el-form label-position="top" class="interview-form">
        <el-form-item label="轮次类型">
          <el-select v-model="roundForm.roundType" style="width: 100%">
            <el-option v-for="type in ROUND_TYPES" :key="type" :label="roundTypeLabel(type)" :value="type" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="roundForm.title" maxlength="120" placeholder="例如 一面 · 技术" />
        </el-form-item>
        <el-form-item label="时区">
          <el-input v-model="roundForm.timezone" placeholder="例如 Asia/Shanghai" />
        </el-form-item>
        <div class="interview-form__grid">
          <el-form-item label="开始时间">
            <el-date-picker
              v-model="roundForm.scheduledStartsAt"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ss"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="结束时间">
            <el-date-picker
              v-model="roundForm.scheduledEndsAt"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ss"
              style="width: 100%"
            />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="roundVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" :disabled="!roundForm.roundType || !roundForm.title" @click="submitRound">
          保存轮次
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="editVisible" title="编辑面试轮次" width="520px">
      <el-form label-position="top" class="interview-form">
        <el-form-item label="标题">
          <el-input v-model="editForm.title" maxlength="120" />
        </el-form-item>
        <el-form-item label="结果小结">
          <el-input v-model="editForm.resultSummary" type="textarea" :rows="3" maxlength="2000" show-word-limit />
        </el-form-item>
        <el-form-item label="下一步">
          <el-input v-model="editForm.nextStep" type="textarea" :rows="2" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" :disabled="!editForm.title" @click="submitEdit">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="transitionVisible" title="变更轮次状态" width="460px">
      <el-form label-position="top" class="interview-form">
        <el-form-item label="目标状态">
          <el-select v-model="transitionForm.targetStatus" style="width: 100%">
            <el-option
              v-for="status in transitionTargets"
              :key="status"
              :label="roundStatusLabel(status)"
              :value="status"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="transitionVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" :disabled="!transitionForm.targetStatus" @click="submitTransition">
          确认变更
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="rescheduleVisible" title="改期" width="520px">
      <el-form label-position="top" class="interview-form">
        <div class="interview-form__grid">
          <el-form-item label="新开始时间">
            <el-date-picker
              v-model="rescheduleForm.scheduledStartsAt"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ss"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="新结束时间">
            <el-date-picker
              v-model="rescheduleForm.scheduledEndsAt"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ss"
              style="width: 100%"
            />
          </el-form-item>
        </div>
        <el-form-item label="时区">
          <el-input v-model="rescheduleForm.timezone" placeholder="例如 Asia/Shanghai" />
        </el-form-item>
        <el-form-item label="改期原因">
          <el-input v-model="rescheduleForm.reason" type="textarea" :rows="2" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rescheduleVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="!rescheduleForm.scheduledStartsAt || !rescheduleForm.scheduledEndsAt || !rescheduleForm.timezone"
          @click="submitReschedule"
        >
          确认改期
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="linkVisible" title="关联日历事件" width="460px">
      <el-alert
        type="info"
        show-icon
        :closable="false"
        title="关联已有日历事件"
        description="填写已在求职日历中创建的事件编号，将其与本轮面试关联。"
      />
      <el-form label-position="top" class="interview-form">
        <el-form-item label="日历事件编号">
          <el-input-number v-model="linkForm.calendarEventId" :min="1" controls-position="right" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="linkVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" :disabled="!linkForm.calendarEventId" @click="submitLink">
          关联
        </el-button>
      </template>
    </el-dialog>

    <div v-if="rounds.length" class="interview-panel__rows">
      <div v-for="round in rounds" :key="String(round.id)" class="interview-panel__row">
        <div>
          <strong>{{ round.title || roundTypeLabel(round.roundType) }}</strong>
          <span>{{ roundStatusLabel(round.status) }} · {{ round.scheduledAt || '时间待确认' }}</span>
        </div>
        <span class="interview-panel__row-actions">
          <el-button link type="primary" :disabled="disabled" @click="openEditDialog(round)">编辑</el-button>
          <el-button
            v-if="transitionTargetsFor(round.status).length"
            link
            type="primary"
            :disabled="disabled"
            @click="openTransitionDialog(round)"
          >
            状态变更
          </el-button>
          <el-button link type="primary" :disabled="disabled" @click="openRescheduleDialog(round)">改期</el-button>
          <el-button link type="primary" :disabled="disabled" @click="openLinkDialog(round)">关联日历</el-button>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, reactive, ref } from 'vue'

import {
  createInterviewProcessV7Api,
  createInterviewRoundV7Api,
  updateInterviewRoundV7Api,
  transitionInterviewRoundV7Api,
  rescheduleInterviewRoundV7Api,
  linkInterviewRoundCalendarV7Api
} from '@/api/v7Career'
import type { InterviewProcessVO, InterviewRoundVO } from '@/types/v7/career'
import { createOperationIdempotencyKey } from '@/utils/idempotency'
import { getErrorMessage } from '@/utils/error'

const props = withDefaults(defineProps<{
  applicationId: number
  process?: InterviewProcessVO | null
  disabled?: boolean
}>(), {
  process: null,
  disabled: false
})

const emit = defineEmits<{ refresh: [] }>()

// Mirrors the backend ROUND_TYPES and TRANSITIONS (CareerInterviewServiceImpl).
const ROUND_TYPES = ['PHONE_SCREEN', 'TECHNICAL', 'BEHAVIORAL', 'ONSITE', 'FINAL', 'OTHER']
const TRANSITIONS: Record<string, string[]> = {
  PLANNED: ['SCHEDULED'],
  SCHEDULED: ['PREPARING', 'CANCELLED', 'RESCHEDULED'],
  PREPARING: ['COMPLETED', 'CANCELLED'],
  RESCHEDULED: ['SCHEDULED']
}

const submitting = ref(false)

const rounds = computed(() => props.process?.rounds || [])

const createProcessVisible = ref(false)

const roundVisible = ref(false)
const roundForm = reactive<{
  roundType: string
  title: string
  timezone: string
  scheduledStartsAt?: string
  scheduledEndsAt?: string
}>({ roundType: 'PHONE_SCREEN', title: '', timezone: '' })

const editVisible = ref(false)
const editRoundId = ref<number | null>(null)
const editLockVersion = ref<number | null>(null)
const editForm = reactive<{ title: string; resultSummary: string; nextStep: string }>({
  title: '',
  resultSummary: '',
  nextStep: ''
})

const transitionVisible = ref(false)
const transitionRoundId = ref<number | null>(null)
const transitionLockVersion = ref<number | null>(null)
const transitionForm = reactive<{ targetStatus: string }>({ targetStatus: '' })

const rescheduleVisible = ref(false)
const rescheduleRoundId = ref<number | null>(null)
const rescheduleLockVersion = ref<number | null>(null)
const rescheduleForm = reactive<{
  scheduledStartsAt?: string
  scheduledEndsAt?: string
  timezone: string
  reason: string
}>({ timezone: '', reason: '' })

const linkVisible = ref(false)
const linkRoundId = ref<number | null>(null)
const linkLockVersion = ref<number | null>(null)
const linkForm = reactive<{ calendarEventId?: number }>({})

const transitionTargetsFor = (status?: string) => TRANSITIONS[String(status || '').toUpperCase()] || []
const transitionTargets = computed(() => {
  const round = rounds.value.find((item) => Number(item.id) === transitionRoundId.value)
  return transitionTargetsFor(round?.status)
})

const roundTypeLabel = (value?: string) => ({
  PHONE_SCREEN: '电话初筛',
  TECHNICAL: '技术面',
  BEHAVIORAL: '行为面',
  ONSITE: '现场面',
  FINAL: '终面',
  OTHER: '其他'
}[String(value || '').toUpperCase()] || '面试轮次')

const roundStatusLabel = (value?: string) => ({
  PLANNED: '待安排',
  SCHEDULED: '已安排',
  PREPARING: '准备中',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  RESCHEDULED: '已改期'
}[String(value || '').toUpperCase()] || '状态待确认')

const lockVersionOf = (round: InterviewRoundVO) =>
  Number.isSafeInteger(round.lockVersion) ? Number(round.lockVersion) : null

const openCreateProcess = () => {
  createProcessVisible.value = true
}

const submitCreateProcess = async () => {
  if (submitting.value) return
  submitting.value = true
  try {
    await createInterviewProcessV7Api(props.applicationId, {
      idempotencyKey: createOperationIdempotencyKey(`interview-process:${props.applicationId}`)
    })
    ElMessage.success('真实面试流程已创建。')
    createProcessVisible.value = false
    emit('refresh')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '面试流程创建失败，请稍后重试。'))
  } finally {
    submitting.value = false
  }
}

const openRoundDialog = () => {
  Object.assign(roundForm, { roundType: 'PHONE_SCREEN', title: '', timezone: '', scheduledStartsAt: undefined, scheduledEndsAt: undefined })
  roundVisible.value = true
}

const submitRound = async () => {
  if (submitting.value || props.process?.id == null || !roundForm.roundType || !roundForm.title.trim()) return
  submitting.value = true
  try {
    await createInterviewRoundV7Api(Number(props.process.id), {
      roundType: roundForm.roundType,
      title: roundForm.title.trim(),
      timezone: roundForm.timezone.trim() || undefined,
      scheduledStartsAt: roundForm.scheduledStartsAt || undefined,
      scheduledEndsAt: roundForm.scheduledEndsAt || undefined,
      idempotencyKey: createOperationIdempotencyKey(`interview-round:${props.process.id}`)
    })
    ElMessage.success('面试轮次已添加。')
    roundVisible.value = false
    emit('refresh')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '面试轮次保存失败，请稍后重试。'))
  } finally {
    submitting.value = false
  }
}

const openEditDialog = (round: InterviewRoundVO) => {
  editRoundId.value = Number(round.id)
  editLockVersion.value = lockVersionOf(round)
  editForm.title = round.title || ''
  editForm.resultSummary = round.resultSummary || ''
  editForm.nextStep = round.nextStep || ''
  editVisible.value = true
}

const submitEdit = async () => {
  if (submitting.value || editRoundId.value == null || !editForm.title.trim()) return
  if (editLockVersion.value == null) {
    ElMessage.warning('轮次版本信息缺失，请刷新后重试。')
    return
  }
  submitting.value = true
  try {
    await updateInterviewRoundV7Api(editRoundId.value, {
      title: editForm.title.trim(),
      resultSummary: editForm.resultSummary.trim() || undefined,
      nextStep: editForm.nextStep.trim() || undefined,
      expectedLockVersion: editLockVersion.value,
      idempotencyKey: createOperationIdempotencyKey(`interview-round-update:${editRoundId.value}:${editLockVersion.value}`)
    })
    ElMessage.success('面试轮次已更新。')
    editVisible.value = false
    emit('refresh')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '面试轮次更新失败，请稍后重试。'))
  } finally {
    submitting.value = false
  }
}

const openTransitionDialog = (round: InterviewRoundVO) => {
  transitionRoundId.value = Number(round.id)
  transitionLockVersion.value = lockVersionOf(round)
  transitionForm.targetStatus = transitionTargetsFor(round.status)[0] || ''
  transitionVisible.value = true
}

const submitTransition = async () => {
  if (submitting.value || transitionRoundId.value == null || !transitionForm.targetStatus) return
  if (transitionLockVersion.value == null) {
    ElMessage.warning('轮次版本信息缺失，请刷新后重试。')
    return
  }
  submitting.value = true
  try {
    await transitionInterviewRoundV7Api(transitionRoundId.value, {
      targetStatus: transitionForm.targetStatus,
      expectedLockVersion: transitionLockVersion.value,
      idempotencyKey: createOperationIdempotencyKey(
        `interview-round-transition:${transitionRoundId.value}:${transitionForm.targetStatus}`
      )
    })
    ElMessage.success('轮次状态已变更。')
    transitionVisible.value = false
    emit('refresh')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '轮次状态变更失败，原状态未被覆盖。'))
  } finally {
    submitting.value = false
  }
}

const openRescheduleDialog = (round: InterviewRoundVO) => {
  rescheduleRoundId.value = Number(round.id)
  rescheduleLockVersion.value = lockVersionOf(round)
  rescheduleForm.scheduledStartsAt = undefined
  rescheduleForm.scheduledEndsAt = undefined
  rescheduleForm.timezone = round.timezone || ''
  rescheduleForm.reason = ''
  rescheduleVisible.value = true
}

const submitReschedule = async () => {
  if (
    submitting.value ||
    rescheduleRoundId.value == null ||
    !rescheduleForm.scheduledStartsAt ||
    !rescheduleForm.scheduledEndsAt ||
    !rescheduleForm.timezone.trim()
  ) {
    return
  }
  if (rescheduleLockVersion.value == null) {
    ElMessage.warning('轮次版本信息缺失，请刷新后重试。')
    return
  }
  submitting.value = true
  try {
    await rescheduleInterviewRoundV7Api(rescheduleRoundId.value, {
      scheduledStartsAt: rescheduleForm.scheduledStartsAt,
      scheduledEndsAt: rescheduleForm.scheduledEndsAt,
      timezone: rescheduleForm.timezone.trim(),
      expectedLockVersion: rescheduleLockVersion.value,
      idempotencyKey: createOperationIdempotencyKey(`interview-round-reschedule:${rescheduleRoundId.value}`),
      reason: rescheduleForm.reason.trim() || undefined
    })
    ElMessage.success('轮次已改期。')
    rescheduleVisible.value = false
    emit('refresh')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '轮次改期失败，请稍后重试。'))
  } finally {
    submitting.value = false
  }
}

const openLinkDialog = (round: InterviewRoundVO) => {
  linkRoundId.value = Number(round.id)
  linkLockVersion.value = lockVersionOf(round)
  linkForm.calendarEventId = round.calendarEventId || undefined
  linkVisible.value = true
}

const submitLink = async () => {
  if (submitting.value || linkRoundId.value == null || !linkForm.calendarEventId) return
  if (linkLockVersion.value == null) {
    ElMessage.warning('轮次版本信息缺失，请刷新后重试。')
    return
  }
  submitting.value = true
  try {
    await linkInterviewRoundCalendarV7Api(linkRoundId.value, {
      calendarEventId: linkForm.calendarEventId,
      expectedLockVersion: linkLockVersion.value,
      idempotencyKey: createOperationIdempotencyKey(`interview-round-link:${linkRoundId.value}:${linkForm.calendarEventId}`)
    })
    ElMessage.success('已关联日历事件。')
    linkVisible.value = false
    emit('refresh')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '关联日历事件失败，请稍后重试。'))
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.interview-panel {
  display: grid;
  gap: 14px;
}

.interview-panel__actions {
  display: flex;
  gap: 12px;
}

.interview-panel__rows {
  display: grid;
  gap: 8px;
}

.interview-panel__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
}

.interview-panel__row-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.interview-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
</style>
