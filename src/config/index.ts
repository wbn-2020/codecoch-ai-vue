export const appConfig = {
  title: import.meta.env.VITE_APP_TITLE || 'CodeCoachAI',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  requestTimeout: 60000,
  enableV4Preview: import.meta.env.VITE_ENABLE_V4_PREVIEW === 'true',
  enableV4ExperimentalRoutes: import.meta.env.VITE_ENABLE_V4_EXPERIMENTS === 'true',
  demoReadOnly: import.meta.env.VITE_DEMO_READ_ONLY === 'true',
  demoUsername: import.meta.env.VITE_DEMO_USERNAME || '',
  demoPassword: import.meta.env.VITE_DEMO_PASSWORD || ''
}
