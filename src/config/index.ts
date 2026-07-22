const enableV4Preview = import.meta.env.VITE_ENABLE_V4_PREVIEW === 'true'
const enableV4ExperimentalRoutes = import.meta.env.VITE_ENABLE_V4_EXPERIMENTS === 'true'
const enableV4GrowthPreview = import.meta.env.VITE_ENABLE_V4_GROWTH !== 'false'
const enableV4KnowledgePreview = import.meta.env.VITE_ENABLE_V4_KNOWLEDGE === 'true'
const enableV4AdaptivePlan = import.meta.env.VITE_ENABLE_V4_ADAPTIVE_PLAN === 'true'
const enableAdminTraceCockpit = import.meta.env.VITE_ENABLE_ADMIN_TRACE_COCKPIT === 'true'
const enableV6WeeklyReport = import.meta.env.VITE_ENABLE_V6_WEEKLY_REPORT === 'true'
const enableV6WeeklyReportAi = import.meta.env.VITE_ENABLE_V6_WEEKLY_REPORT_AI === 'true'
const enableV6WeeklyReportPlanDraft = import.meta.env.VITE_ENABLE_V6_WEEKLY_REPORT_PLAN_DRAFT === 'true'
const weeklyReportPlanPreviewCapabilityAvailable = false
const enableV7ExternalPlanSource = import.meta.env.VITE_ENABLE_V7_EXTERNAL_PLAN_SOURCE === 'true'
const enableV7CampaignWorkspace = import.meta.env.VITE_ENABLE_V7_CAMPAIGN_WORKSPACE === 'true'
const enableV7RealInterview = import.meta.env.VITE_ENABLE_V7_REAL_INTERVIEW === 'true'
const enableV7Offer = import.meta.env.VITE_ENABLE_V7_OFFER === 'true'
const enableV7ContactActivity = import.meta.env.VITE_ENABLE_V7_CONTACT_ACTIVITY === 'true'
const enableV7Research = import.meta.env.VITE_ENABLE_V7_RESEARCH === 'true'
const enableV7CampaignReview = import.meta.env.VITE_ENABLE_V7_CAMPAIGN_REVIEW === 'true'
const enableV8CampaignCockpit = import.meta.env.VITE_ENABLE_V8_CAMPAIGN_COCKPIT === 'true'
const enableV8CampaignPulse = import.meta.env.VITE_ENABLE_V8_CAMPAIGN_PULSE === 'true'
const enableV8CampaignPlan = import.meta.env.VITE_ENABLE_V8_CAMPAIGN_PLAN === 'true'
const enableV8CampaignPortfolio = import.meta.env.VITE_ENABLE_V8_CAMPAIGN_PORTFOLIO === 'true'
const enableV8CampaignExport = import.meta.env.VITE_ENABLE_V8_CAMPAIGN_EXPORT === 'true'

export const appConfig = {
  title: import.meta.env.VITE_APP_TITLE || 'CodeCoachAI',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  requestTimeout: 60000,
  enableV4Preview,
  enableV4ExperimentalRoutes,
  enableV4PreviewAccess: enableV4Preview || enableV4GrowthPreview || enableV4ExperimentalRoutes,
  enableV4GrowthPreview: enableV4GrowthPreview || enableV4ExperimentalRoutes,
  enableV4KnowledgePreview: (enableV4Preview && enableV4KnowledgePreview) || enableV4ExperimentalRoutes,
  enableV4AdaptivePlan,
  enableAdminTraceCockpit: enableAdminTraceCockpit || enableV4ExperimentalRoutes,
  enableV6WeeklyReport: enableV6WeeklyReport || enableV4ExperimentalRoutes,
  enableV6WeeklyReportAi: (enableV6WeeklyReport && enableV6WeeklyReportAi) || enableV4ExperimentalRoutes,
  enableV6WeeklyReportPlanDraft:
    enableV6WeeklyReport && enableV6WeeklyReportPlanDraft && weeklyReportPlanPreviewCapabilityAvailable,
  enableV7ExternalPlanSource,
  enableV7CampaignWorkspace,
  enableV7RealInterview,
  enableV7Offer,
  enableV7ContactActivity,
  enableV7Research,
  enableV7CampaignReview,
  enableV8CampaignCockpit,
  enableV8CampaignPulse,
  enableV8CampaignPlan,
  enableV8CampaignPortfolio,
  enableV8CampaignExport,
  demoReadOnly: import.meta.env.VITE_DEMO_READ_ONLY === 'true',
  demoUsername: import.meta.env.VITE_DEMO_USERNAME || '',
  demoPassword: import.meta.env.VITE_DEMO_PASSWORD || ''
}
