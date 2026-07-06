export type PortfolioRehearsalPriority = 'MVP' | 'P1' | 'P2'

export type PortfolioRehearsalConfirmationMode =
  | 'STATIC_CONFIRMABLE'
  | 'FINAL_RUNTIME_CONFIRMATION'

export type PortfolioRehearsalRawSensitivePolicy = 'NO_RAW_SENSITIVE_CONTENT'

export interface PortfolioRehearsalAcceptanceCheck {
  id: string
  title: string
  description: string
  mode: PortfolioRehearsalConfirmationMode
}

export interface PortfolioRehearsalAcceptanceCapability {
  id: string
  priority: PortfolioRehearsalPriority
  title: string
  userValue: string
  staticConfirmations: PortfolioRehearsalAcceptanceCheck[]
  runtimeConfirmations: PortfolioRehearsalAcceptanceCheck[]
  demoEvidence: string[]
  rawSensitivePolicy: PortfolioRehearsalRawSensitivePolicy
}

export interface PortfolioRehearsalAcceptanceStage {
  stageNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7
  stageKey: string
  title: string
  acceptanceGoal: string
  capabilities: PortfolioRehearsalAcceptanceCapability[]
}

export interface PortfolioRehearsalAcceptanceMatrix {
  matrixKey: string
  version: string
  title: string
  scope: string
  acceptanceBoundary: string
  exclusions: string[]
  rawSensitivePolicy: PortfolioRehearsalRawSensitivePolicy
  stages: PortfolioRehearsalAcceptanceStage[]
}

export interface PortfolioRehearsalStaticSelfCheck {
  fileBoundary: string[]
  noServiceStarted: boolean
  noUnitTestAddedOrRun: boolean
  noRealAiCall: boolean
  noBrowserE2E: boolean
  noRawSensitiveContent: boolean
  coversStages: Array<PortfolioRehearsalAcceptanceStage['stageNumber']>
  coversPriorities: PortfolioRehearsalPriority[]
  separatesStaticAndRuntimeConfirmation: boolean
}

export type PortfolioRehearsalHealthStatus = 'PASS' | 'ATTENTION' | 'UNKNOWN' | 'NOT_CONNECTED'

export type PortfolioRehearsalHealthCategory =
  | 'ROUTE'
  | 'MENU'
  | 'API_ADAPTER'
  | 'DEMO_DATA'
  | 'TRACE_COCKPIT'
  | 'PRIVACY'

export interface PortfolioRehearsalHealthSignal {
  label: string
  value: string
  status?: PortfolioRehearsalHealthStatus
}

export interface PortfolioRehearsalHealthCheck {
  key: string
  title: string
  category: PortfolioRehearsalHealthCategory
  status: PortfolioRehearsalHealthStatus
  summary: string
  signals: PortfolioRehearsalHealthSignal[]
  path?: string
  required?: boolean
}

export interface PortfolioRehearsalHealthSummary {
  status: PortfolioRehearsalHealthStatus
  total: number
  pass: number
  attention: number
  unknown: number
  notConnected: number
}

export interface PortfolioRehearsalHealthReport {
  summary: PortfolioRehearsalHealthSummary
  checks: PortfolioRehearsalHealthCheck[]
}

export type PortfolioRehearsalTalkStatus =
  | 'READY_FOR_DEMO'
  | 'ACCEPTANCE_REQUIRED'
  | 'BOUNDARY_ONLY'
  | 'DEMO_FALLBACK'

export type PortfolioRehearsalAudience = 'INTERVIEWER' | 'REVIEWER' | 'SELF_CHECK'

export interface PortfolioRehearsalDisclosureRule {
  id: string
  title: string
  description: string
  protectedContent: string[]
}

export interface PortfolioRehearsalTalkTrack {
  id: string
  title: string
  audience: PortfolioRehearsalAudience
  status: PortfolioRehearsalTalkStatus
  statusLabel: string
  openingLine: string
  keyPoints: string[]
  evidenceAnchors: string[]
  trustBoundary: string
  fallbackLine?: string
}

export interface PortfolioRehearsalPromptCard {
  id: string
  question: string
  status: PortfolioRehearsalTalkStatus
  statusLabel: string
  answerFrame: string[]
  mustMention: string[]
  avoidMentioning: string[]
  demoCue: string
}

export interface PortfolioRehearsalCapabilityMap {
  id: string
  capability: string
  status: PortfolioRehearsalTalkStatus
  statusLabel: string
  mappedFeatures: string[]
  proofSignals: string[]
  limits: string[]
}
