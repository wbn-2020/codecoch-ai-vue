<template>
  <div class="offer-panel">
    <div class="offer-panel__actions">
      <el-button type="primary" :disabled="disabled" @click="openCreateOffer">录入 Offer</el-button>
      <el-button
        v-if="campaignId && offers.length"
        :disabled="disabled"
        @click="openDecisionDialog"
      >
        Offer 决策比较
      </el-button>
    </div>

    <el-dialog v-model="createVisible" title="录入 Offer" width="520px">
      <el-alert
        type="info"
        show-icon
        :closable="false"
        title="只记录 Offer 事实"
        description="系统只保存你录入的 Offer 版本与截止时间，不会替你接受、拒绝或协商。"
      />
      <el-form label-position="top" class="offer-form">
        <el-form-item label="初始状态">
          <el-select v-model="createForm.status" style="width: 100%">
            <el-option label="草稿" value="DRAFT" />
            <el-option label="已收到" value="RECEIVED" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitCreateOffer">保存 Offer</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="versionVisible" title="新增 Offer 版本" width="560px">
      <el-form label-position="top" class="offer-form">
        <el-form-item label="币种">
          <el-input v-model="versionForm.currency" maxlength="8" placeholder="例如 CNY、USD" />
        </el-form-item>
        <div class="offer-form__grid">
          <el-form-item label="年度基本薪资">
            <el-input-number v-model="versionForm.annualBaseSalary" :min="0" :max="100000000" controls-position="right" />
          </el-form-item>
          <el-form-item label="年度奖金">
            <el-input-number v-model="versionForm.annualBonus" :min="0" :max="100000000" controls-position="right" />
          </el-form-item>
          <el-form-item label="签字费">
            <el-input-number v-model="versionForm.signOnBonus" :min="0" :max="100000000" controls-position="right" />
          </el-form-item>
          <el-form-item label="年度股权价值">
            <el-input-number v-model="versionForm.annualEquityValue" :min="0" :max="100000000" controls-position="right" />
          </el-form-item>
          <el-form-item label="其他年度报酬">
            <el-input-number v-model="versionForm.otherAnnualCompensation" :min="0" :max="100000000" controls-position="right" />
          </el-form-item>
          <el-form-item label="带薪假期（天）">
            <el-input-number v-model="versionForm.paidLeaveDays" :min="0" :max="365" controls-position="right" />
          </el-form-item>
        </div>
        <el-form-item label="工作地点">
          <el-input v-model="versionForm.location" maxlength="255" />
        </el-form-item>
        <el-form-item label="工作模式">
          <el-select v-model="versionForm.workMode" clearable style="width: 100%">
            <el-option label="现场" value="ONSITE" />
            <el-option label="远程" value="REMOTE" />
            <el-option label="混合" value="HYBRID" />
          </el-select>
        </el-form-item>
        <div class="offer-form__grid">
          <el-form-item label="入职日期">
            <el-date-picker v-model="versionForm.startDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </el-form-item>
          <el-form-item label="决定截止时间">
            <el-date-picker
              v-model="versionForm.decisionDeadline"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ss"
              style="width: 100%"
            />
          </el-form-item>
        </div>
        <el-form-item label="备注">
          <el-input v-model="versionForm.note" type="textarea" :rows="2" maxlength="2000" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="versionVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitVersion">保存版本</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="transitionVisible" title="变更 Offer 状态" width="480px">
      <el-alert
        v-if="transitionIsFinal"
        type="warning"
        show-icon
        :closable="false"
        title="这是终态变更"
        description="终态需要你显式确认，确认后该 Offer 不能再新增版本。"
      />
      <el-form label-position="top" class="offer-form">
        <el-form-item label="目标状态">
          <el-select v-model="transitionForm.targetStatus" style="width: 100%">
            <el-option
              v-for="status in transitionTargets"
              :key="status"
              :label="offerStatusLabel(status)"
              :value="status"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="transitionVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="!transitionForm.targetStatus"
          @click="submitTransition"
        >
          确认变更
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="decisionVisible" title="Offer 决策比较" width="640px">
      <el-alert
        type="info"
        show-icon
        :closable="false"
        title="规则比较，不替你决定"
        description="比较只在同币种且金额足够时给出规则提示，最终接受、拒绝或协商仍由你确认。"
      />
      <el-form label-position="top" class="offer-form">
        <el-form-item label="比较币种（可选）">
          <el-input v-model="decisionForm.comparisonCurrency" maxlength="8" placeholder="留空则用各 Offer 原币种" />
        </el-form-item>
      </el-form>
      <el-button :loading="previewing" @click="runPreview">生成比较</el-button>

      <div v-if="decisionPreview" class="offer-decision">
        <el-alert
          v-if="decisionPreview.snapshot?.fallback"
          type="warning"
          show-icon
          :closable="false"
          title="本次比较使用规则降级结果"
        />
        <p class="muted">
          比较币种：{{ decisionPreview.snapshot?.comparisonCurrency || '各自原币种' }}
          · {{ decisionPreview.snapshot?.comparable ? '可比较' : '暂不可比较' }}
        </p>
        <ul class="offer-decision__items">
          <li v-for="item in decisionPreview.items || []" :key="String(item.id ?? item.offerId)">
            <span>Offer #{{ item.offerId }}</span>
            <span>{{ item.rankNo ? `第 ${item.rankNo} 位` : '未排名' }}</span>
            <span>{{ item.comparableAnnualValue ?? '金额待确认' }}</span>
          </li>
        </ul>

        <el-form label-position="top" class="offer-form">
          <el-form-item label="选择要确认的 Offer">
            <el-select v-model="decisionForm.selectedOfferId" style="width: 100%">
              <el-option
                v-for="offer in offers"
                :key="String(offer.id)"
                :label="offerOptionLabel(offer)"
                :value="Number(offer.id)"
              />
            </el-select>
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="decisionVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="confirming"
          :disabled="!decisionPreview || !decisionForm.selectedOfferId"
          @click="submitDecisionConfirm"
        >
          确认所选 Offer
        </el-button>
      </template>
    </el-dialog>

    <div v-if="offers.length" class="offer-panel__rows">
      <div v-for="offer in offers" :key="String(offer.id)" class="offer-panel__row">
        <span>{{ offerOptionLabel(offer) }}</span>
        <span class="offer-panel__row-actions">
          <el-button link type="primary" :disabled="disabled" @click="openVersionDialog(offer)">新增版本</el-button>
          <el-button
            v-if="transitionTargetsFor(offer.status).length"
            link
            type="primary"
            :disabled="disabled"
            @click="openTransitionDialog(offer)"
          >
            状态变更
          </el-button>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, reactive, ref } from 'vue'

import {
  createOfferV7Api,
  createOfferVersionV7Api,
  transitionOfferV7Api,
  previewOfferDecisionV7Api,
  confirmOfferDecisionV7Api
} from '@/api/v7Career'
import type {
  CareerOfferVO,
  CareerOfferDecisionVO,
  CareerOfferVersionCreateDTO
} from '@/types/v7/career'
import { createOperationIdempotencyKey, createStableOperationIdempotencyKey } from '@/utils/idempotency'
import { getErrorMessage } from '@/utils/error'

const props = withDefaults(defineProps<{
  applicationId: number
  campaignId?: number | null
  offers: CareerOfferVO[]
  disabled?: boolean
}>(), {
  campaignId: null,
  disabled: false
})

const emit = defineEmits<{ refresh: [] }>()

// Mirrors the backend TRANSITIONS map (CareerOfferServiceImpl); FINAL states need explicit confirmation.
const TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['RECEIVED', 'WITHDRAWN'],
  RECEIVED: ['NEGOTIATING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN'],
  NEGOTIATING: ['ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN']
}
const FINAL_STATUSES = new Set(['ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN'])

const submitting = ref(false)
const previewing = ref(false)
const confirming = ref(false)

const createVisible = ref(false)
const createForm = reactive<{ status: string }>({ status: 'RECEIVED' })

const versionVisible = ref(false)
const versionOfferId = ref<number | null>(null)
const versionForm = reactive<CareerOfferVersionCreateDTO>({})

const transitionVisible = ref(false)
const transitionOfferId = ref<number | null>(null)
const transitionForm = reactive<{ targetStatus: string }>({ targetStatus: '' })

const decisionVisible = ref(false)
const decisionPreview = ref<CareerOfferDecisionVO | null>(null)
const decisionForm = reactive<{ comparisonCurrency: string; selectedOfferId: number | null }>({
  comparisonCurrency: '',
  selectedOfferId: null
})

const transitionTargetsFor = (status?: string) => TRANSITIONS[String(status || '').toUpperCase()] || []
const transitionTargets = computed(() => transitionTargetsFor(currentTransitionStatus.value))
const currentTransitionStatus = computed(() => {
  const offer = props.offers.find((item) => Number(item.id) === transitionOfferId.value)
  return offer?.status
})
const transitionIsFinal = computed(() => FINAL_STATUSES.has(transitionForm.targetStatus))

const offerStatusLabel = (value?: string) => ({
  DRAFT: '草稿',
  RECEIVED: '已收到',
  NEGOTIATING: '协商中',
  ACCEPTED: '已接受',
  DECLINED: '已谢绝',
  EXPIRED: '已过期',
  WITHDRAWN: '已撤回'
}[String(value || '').toUpperCase()] || '状态待确认')

const offerOptionLabel = (offer: CareerOfferVO) => {
  const name = offer.title || offer.companyName || `Offer #${offer.id}`
  return `${name} · ${offerStatusLabel(offer.status)}`
}

const openCreateOffer = () => {
  createForm.status = 'RECEIVED'
  createVisible.value = true
}

const submitCreateOffer = async () => {
  if (submitting.value) return
  submitting.value = true
  try {
    await createOfferV7Api(
      props.applicationId,
      { applicationId: props.applicationId, status: createForm.status },
      createOperationIdempotencyKey(`offer-create:${props.applicationId}`)
    )
    ElMessage.success('Offer 已录入。')
    createVisible.value = false
    emit('refresh')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, 'Offer 录入失败，请稍后重试。'))
  } finally {
    submitting.value = false
  }
}

const openVersionDialog = (offer: CareerOfferVO) => {
  versionOfferId.value = Number(offer.id)
  Object.assign(versionForm, {
    currency: '',
    annualBaseSalary: undefined,
    annualBonus: undefined,
    signOnBonus: undefined,
    annualEquityValue: undefined,
    otherAnnualCompensation: undefined,
    paidLeaveDays: undefined,
    location: '',
    workMode: undefined,
    startDate: undefined,
    decisionDeadline: undefined,
    note: ''
  })
  versionVisible.value = true
}

const submitVersion = async () => {
  if (submitting.value || versionOfferId.value == null) return
  submitting.value = true
  try {
    const payload: CareerOfferVersionCreateDTO = {
      currency: versionForm.currency?.trim() || undefined,
      annualBaseSalary: versionForm.annualBaseSalary,
      annualBonus: versionForm.annualBonus,
      signOnBonus: versionForm.signOnBonus,
      annualEquityValue: versionForm.annualEquityValue,
      otherAnnualCompensation: versionForm.otherAnnualCompensation,
      paidLeaveDays: versionForm.paidLeaveDays,
      location: versionForm.location?.trim() || undefined,
      workMode: versionForm.workMode || undefined,
      startDate: versionForm.startDate || undefined,
      decisionDeadline: versionForm.decisionDeadline || undefined,
      note: versionForm.note?.trim() || undefined
    }
    await createOfferVersionV7Api(
      versionOfferId.value,
      payload,
      createOperationIdempotencyKey(`offer-version:${versionOfferId.value}`)
    )
    ElMessage.success('Offer 版本已保存。')
    versionVisible.value = false
    emit('refresh')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, 'Offer 版本保存失败，请稍后重试。'))
  } finally {
    submitting.value = false
  }
}

const openTransitionDialog = (offer: CareerOfferVO) => {
  transitionOfferId.value = Number(offer.id)
  transitionForm.targetStatus = transitionTargetsFor(offer.status)[0] || ''
  transitionVisible.value = true
}

const submitTransition = async () => {
  if (submitting.value || transitionOfferId.value == null || !transitionForm.targetStatus) return
  // Set the guard before awaiting the confirm dialog so a double-click cannot slip a second
  // submit past the entry check while the dialog is open.
  submitting.value = true
  if (transitionIsFinal.value) {
    try {
      await ElMessageBox.confirm(
        `确认将 Offer 变更为“${offerStatusLabel(transitionForm.targetStatus)}”？这是终态，确认后不能再新增版本。`,
        '确认终态变更',
        { type: 'warning', confirmButtonText: '确认', cancelButtonText: '取消' }
      )
    } catch {
      submitting.value = false
      return
    }
  }
  try {
    await transitionOfferV7Api(
      transitionOfferId.value,
      { targetStatus: transitionForm.targetStatus, userConfirmed: true },
      createOperationIdempotencyKey(`offer-transition:${transitionOfferId.value}:${transitionForm.targetStatus}`)
    )
    ElMessage.success('Offer 状态已变更。')
    transitionVisible.value = false
    emit('refresh')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, 'Offer 状态变更失败，原状态未被覆盖。'))
  } finally {
    submitting.value = false
  }
}

const openDecisionDialog = () => {
  decisionPreview.value = null
  decisionForm.comparisonCurrency = ''
  decisionForm.selectedOfferId = null
  decisionVisible.value = true
}

const runPreview = async () => {
  if (previewing.value || !props.campaignId) return
  previewing.value = true
  try {
    decisionPreview.value = await previewOfferDecisionV7Api(
      props.campaignId,
      { comparisonCurrency: decisionForm.comparisonCurrency?.trim() || undefined },
      createOperationIdempotencyKey(`offer-decision-preview:${props.campaignId}`)
    )
  } catch (error) {
    ElMessage.error(getErrorMessage(error, 'Offer 比较生成失败，请稍后重试。'))
  } finally {
    previewing.value = false
  }
}

const submitDecisionConfirm = async () => {
  if (confirming.value || !props.campaignId || !decisionPreview.value?.id || !decisionForm.selectedOfferId) return
  // Set the guard before awaiting the confirm dialog so a double-click cannot slip a second
  // confirm past the entry check while the dialog is open.
  confirming.value = true
  try {
    await ElMessageBox.confirm(
      '确认选择该 Offer？这只记录你的决定，不会自动联系招聘方。',
      '确认 Offer 决策',
      { type: 'warning', confirmButtonText: '确认', cancelButtonText: '取消' }
    )
  } catch {
    confirming.value = false
    return
  }
  try {
    const decisionId = Number(decisionPreview.value.id)
    await confirmOfferDecisionV7Api(
      props.campaignId,
      decisionId,
      {
        selectedOfferId: decisionForm.selectedOfferId,
        userConfirmed: true,
        expectedLockVersion: decisionPreview.value.lockVersion
      },
      createStableOperationIdempotencyKey(
        `offer-decision-confirm:${decisionId}`,
        decisionPreview.value.lockVersion ?? 0
      )
    )
    ElMessage.success('Offer 决策已确认。')
    decisionVisible.value = false
    emit('refresh')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, 'Offer 决策确认失败，当前记录未改变。'))
  } finally {
    confirming.value = false
  }
}
</script>

<style scoped lang="scss">
.offer-panel {
  display: grid;
  gap: 14px;
}

.offer-panel__actions {
  display: flex;
  gap: 12px;
}

.offer-panel__rows {
  display: grid;
  gap: 8px;
}

.offer-panel__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
}

.offer-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.offer-decision {
  margin-top: 12px;
  display: grid;
  gap: 10px;
}

.offer-decision__items {
  display: grid;
  gap: 6px;
  padding-left: 16px;
}

.offer-decision__items li {
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.muted {
  color: var(--app-text-secondary, #8a94a6);
}
</style>
