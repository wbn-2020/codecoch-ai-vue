export type ReadinessStepKey =
  | 'target-job'
  | 'jd-analysis'
  | 'resume'
  | 'match-report'
  | 'skill-profile'
  | 'agent-plan'

export type ReadinessStepStatus = 'done' | 'current' | 'blocked'

export type ReadinessSource = 'full' | 'dashboard-partial' | 'agent-execution'

export type ReadinessRoute =
  | string
  | {
      path: string
      query?: Record<string, string | number | undefined>
    }

export interface ReadinessStep {
  key: ReadinessStepKey
  order: number
  title: string
  description: string
  status: ReadinessStepStatus
  done: boolean
  path: ReadinessRoute
  actionLabel: string
  reason: string
}

export interface NextAction {
  title: string
  description: string
  reason: string
  path: ReadinessRoute
  label: string
  tone: 'primary' | 'success' | 'warning' | 'info'
}

export interface ReadinessResult {
  source: ReadinessSource
  sourceNotice?: string
  steps: ReadinessStep[]
  doneCount: number
  totalCount: number
  completionPercent: number
  nextAction: NextAction
}

export interface AgentTaskEvidence {
  sourceLabel: string
  skillLabel: string
  bizLabel: string
  reason: string
  safePath: string
  actionLabel: string
  unavailableReason?: string
}

export interface ActionResolverOptions {
  enableV4Preview: boolean
  knownPaths?: string[]
}
