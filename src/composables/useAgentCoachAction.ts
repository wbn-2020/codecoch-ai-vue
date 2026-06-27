import { computed, ref } from 'vue'

import { performAgentCoachActionApi } from '@/api/agent'
import type { AgentCoachActionType, AgentCoachActionVO, AgentTaskVO } from '@/types/agent'
import { getErrorMessage } from '@/utils/error'
import { createOperationIdempotencyKey } from '@/utils/idempotency'
import request from '@/utils/request'

export const useAgentCoachAction = (sourcePage: string, defaultNextPath: string) => {
  const coachDialogVisible = ref(false)
  const coachDialogLoading = ref(false)
  const coachDialogError = ref('')
  const coachDialogCanceled = ref(false)
  const coachDialogTask = ref<AgentTaskVO>()
  const coachActionResult = ref<AgentCoachActionVO>()
  const coachActionController = ref<AbortController>()

  const coachNextActionPath = computed(() => {
    const task = coachDialogTask.value
    if (!task) return defaultNextPath
    if (task.actionUrl) return task.actionUrl
    const runId = task.agentRunId ?? task.runId
    return runId ? `/agent/runs/${runId}` : defaultNextPath
  })

  const getTaskRunId = (task?: AgentTaskVO) => task?.agentRunId ?? task?.runId ?? null

  const trackCoachMetric = (
    eventCode: string,
    task: AgentTaskVO | undefined,
    metadata: Record<string, unknown> = {},
    targetPath?: string
  ) => {
    if (!task?.id) return
    void request.post('/agent/metrics/events', {
      eventCode,
      taskId: task.id,
      runId: getTaskRunId(task) ?? undefined,
      planDate: task.dueDate,
      targetPath,
      sourcePage,
      metadata
    }, {
      silentError: true
    }).catch(() => undefined)
  }

  const openCoachAction = async (task: AgentTaskVO, actionType: AgentCoachActionType) => {
    if (coachDialogLoading.value) return
    const requestId = createOperationIdempotencyKey(`r3-coach-${actionType.toLowerCase()}`)
    const idempotencyKey = createOperationIdempotencyKey(`r3-coach-${task.id}`)
    coachActionController.value = new AbortController()
    coachDialogTask.value = task
    coachActionResult.value = undefined
    coachDialogError.value = ''
    coachDialogCanceled.value = false
    coachDialogVisible.value = true
    coachDialogLoading.value = true
    trackCoachMetric('ai_coach_action_started', task, { actionType, requestId, idempotencyKey })
    try {
      coachActionResult.value = await performAgentCoachActionApi({
        taskId: task.id,
        actionType,
        requestId,
        idempotencyKey
      }, {
        signal: coachActionController.value.signal,
        silentError: true
      })
      trackCoachMetric('ai_coach_action_succeeded', task, {
        actionType,
        requestId: coachActionResult.value.requestId || requestId,
        traceId: coachActionResult.value.traceId,
        resultSource: coachActionResult.value.resultSource,
        aiCallLogId: coachActionResult.value.aiCallLogId,
        latencyMs: coachActionResult.value.latencyMs,
        estimatedCost: coachActionResult.value.estimatedCost
      })
    } catch (error) {
      if (coachActionController.value?.signal.aborted) {
        coachDialogCanceled.value = true
        trackCoachMetric('ai_coach_action_canceled', task, { actionType, requestId, idempotencyKey })
      } else {
        coachDialogError.value = getErrorMessage(error)
        trackCoachMetric('ai_coach_action_failed', task, {
          actionType,
          requestId,
          idempotencyKey,
          failureReason: coachDialogError.value
        })
      }
    } finally {
      coachDialogLoading.value = false
      coachActionController.value = undefined
    }
  }

  const cancelCoachAction = () => {
    if (!coachDialogLoading.value) return
    coachActionController.value?.abort()
  }

  const trackCoachNextAction = () => {
    const result = coachActionResult.value
    const task = coachDialogTask.value
    trackCoachMetric('ai_coach_next_action_clicked', task, {
      actionType: result?.actionType,
      requestId: result?.requestId,
      traceId: result?.traceId,
      resultSource: result?.resultSource
    }, coachNextActionPath.value)
  }

  return {
    coachDialogVisible,
    coachDialogLoading,
    coachDialogError,
    coachDialogCanceled,
    coachDialogTask,
    coachActionResult,
    coachNextActionPath,
    openCoachAction,
    cancelCoachAction,
    trackCoachNextAction
  }
}
