export const appConfig = {
  title: import.meta.env.VITE_APP_TITLE || 'CodeCoachAI',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  requestTimeout: 15000
}
