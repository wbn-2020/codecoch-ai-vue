export type ProductThemeScope = 'user' | 'admin'

export const PRODUCT_THEME_POLICY = {
  followsSystemPreference: false,
  user: {
    id: 'user-light',
    colorScheme: 'light'
  },
  admin: {
    id: 'admin-dark',
    colorScheme: 'dark'
  }
} as const

export const applyProductTheme = (scope: ProductThemeScope) => {
  const policy = PRODUCT_THEME_POLICY[scope]
  document.documentElement.dataset.ccTheme = policy.id
  document.documentElement.style.colorScheme = policy.colorScheme
}

export const clearProductTheme = (scope: ProductThemeScope) => {
  const policy = PRODUCT_THEME_POLICY[scope]
  if (document.documentElement.dataset.ccTheme !== policy.id) return
  delete document.documentElement.dataset.ccTheme
  document.documentElement.style.removeProperty('color-scheme')
}
