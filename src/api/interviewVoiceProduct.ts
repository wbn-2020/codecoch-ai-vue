import request from '@/utils/request'
import type {
  InterviewCreateByJobTargetDTO,
  InterviewCreateDTO,
  InterviewSessionVO
} from '@/types/interview'
import type {
  InterviewScenarioBindingCreateDTO,
  InterviewScenarioBindingVO,
  InterviewScenarioVersionVO,
  InterviewStreamingAsrChunkDTO,
  InterviewStreamingAsrSessionCreateDTO,
  InterviewStreamingAsrSessionVO,
  InterviewTtsTaskCreateDTO,
  InterviewTtsTaskVO,
  InterviewVoiceDeliveryAnalysisCreateDTO,
  InterviewVoiceDeliveryAnalysisVO,
  InterviewVoiceDeviceCheckCreateDTO,
  InterviewVoiceDeviceCheckVO
} from '@/types/interviewVoiceProduct'

export interface InterviewVoiceProductRequestOptions {
  signal?: AbortSignal
  silentError?: boolean
}

export interface InterviewScenarioCreateResult extends InterviewSessionVO {
  id?: number
  sessionId?: number
  title?: string
  mode?: string
  stages?: InterviewSessionVO['stageList']
  scenarioVersionId?: number
  rubricVersionId?: number
  scenarioCode?: string
}

type InterviewCreateWithScenarioDTO =
  (InterviewCreateDTO | InterviewCreateByJobTargetDTO)
  & { scenarioVersionId: number }

const toScenarioCreatePayload = (data: InterviewCreateWithScenarioDTO) => ({
  interviewMode: data.interviewMode,
  resumeId: data.resumeId,
  title: data.interviewName,
  maxQuestionCount: data.questionCount,
  targetPosition: data.targetPosition,
  experienceLevel: data.experienceLevel,
  industryTemplateId: data.industryTemplateId,
  industryDirection: data.industryDirection,
  difficulty: data.difficulty,
  interviewerStyle: data.interviewerStyle,
  practiceMode: data.practiceMode,
  scenarioVersionId: data.scenarioVersionId,
  recommendationSource: data.recommendationSource,
  recommendationReason: data.recommendationReason,
  applicationId: data.applicationId,
  applicationPackageId: data.applicationPackageId,
  targetJobId: data.targetJobId,
  jdAnalysisId: data.jdAnalysisId,
  resumeVersionId: data.resumeVersionId,
  matchReportId: data.matchReportId,
  basedOnResume: data.basedOnResume ?? Boolean(data.resumeId),
  trainingScene: data.trainingScene,
  targetSkillDomain: data.targetSkillDomain,
  targetSkillCodes: data.targetSkillCodes,
  targetLevel: data.targetLevel,
  projectEvidenceIds: data.projectEvidenceIds,
  followUpIntensity: data.followUpIntensity,
  ...('skillProfileId' in data ? { skillProfileId: data.skillProfileId } : {})
})

const normalizeScenarioCreateResult = (result: InterviewScenarioCreateResult) => ({
  ...result,
  interviewId: result.interviewId || result.id || result.sessionId,
  interviewName: result.interviewName || result.title,
  interviewMode: result.interviewMode || result.mode,
  stageList: result.stageList || result.stages || []
})

export const createInterviewWithScenarioApi = (data: InterviewCreateWithScenarioDTO) =>
  request.post<InterviewScenarioCreateResult, InterviewScenarioCreateResult>(
    '/interviews',
    toScenarioCreatePayload(data)
  ).then(normalizeScenarioCreateResult)

export const createInterviewByJobTargetWithScenarioApi = (
  data: InterviewCreateWithScenarioDTO
) =>
  request.post<InterviewScenarioCreateResult, InterviewScenarioCreateResult>(
    '/interviews/create-by-job-target',
    toScenarioCreatePayload(data)
  ).then(normalizeScenarioCreateResult)

export const getCurrentInterviewScenarioApi = (
  scenarioCode: string,
  options?: InterviewVoiceProductRequestOptions
) =>
  request.get<InterviewScenarioVersionVO, InterviewScenarioVersionVO>('/interview-scenarios/current', {
    params: { scenarioCode },
    signal: options?.signal,
    silentError: options?.silentError
  })

export const bindInterviewScenarioApi = (
  sessionId: number,
  data: InterviewScenarioBindingCreateDTO,
  options?: InterviewVoiceProductRequestOptions
) =>
  request.post<InterviewScenarioBindingVO, InterviewScenarioBindingVO>(
    `/interview-scenarios/sessions/${sessionId}/binding`,
    data,
    {
      signal: options?.signal,
      silentError: options?.silentError
    }
  )

export const getInterviewScenarioBindingApi = (
  sessionId: number,
  options?: InterviewVoiceProductRequestOptions
) =>
  request.get<InterviewScenarioBindingVO, InterviewScenarioBindingVO>(
    `/interview-scenarios/sessions/${sessionId}/binding`,
    {
      signal: options?.signal,
      silentError: options?.silentError
    }
  )

export const createInterviewTtsTaskApi = (
  data: InterviewTtsTaskCreateDTO,
  options?: InterviewVoiceProductRequestOptions
) =>
  request.post<InterviewTtsTaskVO, InterviewTtsTaskVO>('/interview-tts/tasks', data, {
    signal: options?.signal,
    silentError: options?.silentError
  })

export const getInterviewTtsTaskApi = (
  taskId: string,
  options?: InterviewVoiceProductRequestOptions
) =>
  request.get<InterviewTtsTaskVO, InterviewTtsTaskVO>(`/interview-tts/tasks/${taskId}`, {
    signal: options?.signal,
    silentError: options?.silentError
  })

export const cancelInterviewTtsTaskApi = (
  taskId: string,
  options?: InterviewVoiceProductRequestOptions
) =>
  request.delete<InterviewTtsTaskVO, InterviewTtsTaskVO>(`/interview-tts/tasks/${taskId}`, {
    signal: options?.signal,
    silentError: options?.silentError
  })

export const openInterviewStreamingAsrApi = (
  data: InterviewStreamingAsrSessionCreateDTO,
  options?: InterviewVoiceProductRequestOptions
) =>
  request.post<InterviewStreamingAsrSessionVO, InterviewStreamingAsrSessionVO>(
    '/interview-streaming-asr/sessions',
    data,
    {
      signal: options?.signal,
      silentError: options?.silentError
    }
  )

export const sendInterviewStreamingAsrChunkApi = (
  sessionId: string,
  data: InterviewStreamingAsrChunkDTO,
  options?: InterviewVoiceProductRequestOptions
) =>
  request.post<InterviewStreamingAsrSessionVO, InterviewStreamingAsrSessionVO>(
    `/interview-streaming-asr/sessions/${sessionId}/chunks`,
    data,
    {
      signal: options?.signal,
      silentError: options?.silentError
    }
  )

export const completeInterviewStreamingAsrApi = (
  sessionId: string,
  options?: InterviewVoiceProductRequestOptions
) =>
  request.post<InterviewStreamingAsrSessionVO, InterviewStreamingAsrSessionVO>(
    `/interview-streaming-asr/sessions/${sessionId}/complete`,
    undefined,
    {
      signal: options?.signal,
      silentError: options?.silentError
    }
  )

export const getInterviewStreamingAsrApi = (
  sessionId: string,
  options?: InterviewVoiceProductRequestOptions
) =>
  request.get<InterviewStreamingAsrSessionVO, InterviewStreamingAsrSessionVO>(
    `/interview-streaming-asr/sessions/${sessionId}`,
    {
      signal: options?.signal,
      silentError: options?.silentError
    }
  )

export const cancelInterviewStreamingAsrApi = (
  sessionId: string,
  options?: InterviewVoiceProductRequestOptions
) =>
  request.delete<InterviewStreamingAsrSessionVO, InterviewStreamingAsrSessionVO>(
    `/interview-streaming-asr/sessions/${sessionId}`,
    {
      signal: options?.signal,
      silentError: options?.silentError
    }
  )

export const createInterviewVoiceDeliveryAnalysisApi = (
  sessionId: number,
  data: InterviewVoiceDeliveryAnalysisCreateDTO,
  options?: InterviewVoiceProductRequestOptions
) =>
  request.post<InterviewVoiceDeliveryAnalysisVO, InterviewVoiceDeliveryAnalysisVO>(
    `/interviews/${sessionId}/voice-delivery/analyses`,
    data,
    {
      signal: options?.signal,
      silentError: options?.silentError
    }
  )

export const createInterviewVoiceDeviceCheckApi = (
  sessionId: number,
  data: InterviewVoiceDeviceCheckCreateDTO,
  options?: InterviewVoiceProductRequestOptions
) =>
  request.post<InterviewVoiceDeviceCheckVO, InterviewVoiceDeviceCheckVO>(
    `/interviews/${sessionId}/voice-delivery/device-checks`,
    data,
    {
      signal: options?.signal,
      silentError: options?.silentError
    }
  )

export const getInterviewVoiceDeliveryAnalysisApi = (
  sessionId: number,
  analysisId: number,
  options?: InterviewVoiceProductRequestOptions
) =>
  request.get<InterviewVoiceDeliveryAnalysisVO, InterviewVoiceDeliveryAnalysisVO>(
    `/interviews/${sessionId}/voice-delivery/analyses/${analysisId}`,
    {
      signal: options?.signal,
      silentError: options?.silentError
    }
  )

export const cancelInterviewVoiceDeliveryAnalysisApi = (
  sessionId: number,
  analysisId: number,
  options?: InterviewVoiceProductRequestOptions
) =>
  request.delete<InterviewVoiceDeliveryAnalysisVO, InterviewVoiceDeliveryAnalysisVO>(
    `/interviews/${sessionId}/voice-delivery/analyses/${analysisId}`,
    {
      signal: options?.signal,
      silentError: options?.silentError
    }
  )
