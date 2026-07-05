const enableV4Preview = import.meta.env.VITE_ENABLE_V4_PREVIEW === 'true'
const enableV4ExperimentalRoutes = import.meta.env.VITE_ENABLE_V4_EXPERIMENTS === 'true'
const enableV4GrowthPreview = import.meta.env.VITE_ENABLE_V4_GROWTH === 'true'
const enableV4KnowledgePreview = import.meta.env.VITE_ENABLE_V4_KNOWLEDGE === 'true'

export const appConfig = {
  title: import.meta.env.VITE_APP_TITLE || 'CodeCoachAI',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  requestTimeout: 60000,
  enableV4Preview,
  enableV4ExperimentalRoutes,
  enableV4PreviewAccess: enableV4Preview || enableV4ExperimentalRoutes,
  enableV4GrowthPreview: (enableV4Preview && enableV4GrowthPreview) || enableV4ExperimentalRoutes,
  enableV4KnowledgePreview: (enableV4Preview && enableV4KnowledgePreview) || enableV4ExperimentalRoutes,
  demoReadOnly: import.meta.env.VITE_DEMO_READ_ONLY === 'true',
  demoUsername: import.meta.env.VITE_DEMO_USERNAME || '',
  demoPassword: import.meta.env.VITE_DEMO_PASSWORD || ''
}
