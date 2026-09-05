import { afterEach, describe, expect, it } from 'vitest'

import {
  PRODUCT_THEME_POLICY,
  applyProductTheme,
  clearProductTheme
} from '@/config/themePolicy'

describe('product theme policy', () => {
  afterEach(() => {
    delete document.documentElement.dataset.ccTheme
    document.documentElement.style.removeProperty('color-scheme')
  })

  it('uses an explicit fixed high-contrast theme for each workspace', () => {
    expect(PRODUCT_THEME_POLICY.followsSystemPreference).toBe(false)
    expect(PRODUCT_THEME_POLICY.user).toEqual({
      id: 'user-light',
      colorScheme: 'light'
    })
    expect(PRODUCT_THEME_POLICY.admin).toEqual({
      id: 'admin-dark',
      colorScheme: 'dark'
    })
  })

  it('applies and clears only the active workspace theme', () => {
    applyProductTheme('user')
    expect(document.documentElement.dataset.ccTheme).toBe('user-light')
    expect(document.documentElement.style.colorScheme).toBe('light')

    clearProductTheme('admin')
    expect(document.documentElement.dataset.ccTheme).toBe('user-light')

    clearProductTheme('user')
    expect(document.documentElement.dataset.ccTheme).toBeUndefined()
    expect(document.documentElement.style.colorScheme).toBe('')
  })
})
