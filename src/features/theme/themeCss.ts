/**
 * 把主题预设编译成真实的 CSS 变量表。
 *
 * 关键点：变量必须落在与 src/styles/*.scss 中「完全相同」的选择器上，
 * 且本文件生成的 <style> 会追加到 <head> 末尾 —— 选择器特异度相同、
 * 位置更靠后，因此能稳定覆盖内置的默认（v21）配色，而不需要 !important。
 */

import type { ThemePreset, ThemePresetTokens } from './presets'

const clampByte = (value: number) => Math.max(0, Math.min(255, Math.round(value)))

const hexToRgb = (hex: string) => {
  const raw = hex.replace('#', '').trim()
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw
  const num = Number.parseInt(full, 16)
  if (Number.isNaN(num)) return { r: 0, g: 0, b: 0 }
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

const rgba = (hex: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** amount > 0 混白，amount < 0 混黑 */
const shade = (hex: string, amount: number) => {
  const { r, g, b } = hexToRgb(hex)
  const target = amount > 0 ? 255 : 0
  const p = Math.abs(amount)
  const mix = (channel: number) => clampByte(channel + (target - channel) * p)
  return `#${[mix(r), mix(g), mix(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

interface ElTokensInput {
  t: ThemePresetTokens
  dark: boolean
  radiusMd: string
}

/** Element Plus 变量表（四个作用域共用，避免散落重复） */
const buildElTokens = ({ t, dark, radiusMd }: ElTokensInput): string => {
  const subtle = dark ? shade(t.canvas, 0.08) : shade(t.canvas, -0.03)
  const light3 = shade(t.brand, dark ? -0.1 : 0.3)
  const light5 = shade(t.brand, dark ? -0.2 : 0.5)
  const light7 = shade(t.brand, dark ? -0.3 : 0.7)
  const light8 = shade(t.brand, dark ? -0.4 : 0.8)
  const dark2 = shade(t.brand, dark ? 0.12 : -0.2)

  return `
  --el-bg-color: ${t.surface};
  --el-bg-color-page: ${t.canvas};
  --el-bg-color-overlay: ${t.surface};
  --el-fill-color: ${t.sunken};
  --el-fill-color-blank: ${t.surface};
  --el-fill-color-light: ${t.sunken};
  --el-fill-color-lighter: ${t.canvas};
  --el-fill-color-extra-light: ${shade(t.canvas, dark ? -0.02 : 0.35)};
  --el-fill-color-dark: ${t.line};
  --el-fill-color-darker: ${t.lineStrong};
  --el-mask-color: ${rgba(t.ink, dark ? 0.6 : 0.42)};
  --el-mask-color-extra-light: ${rgba(t.ink, dark ? 0.4 : 0.24)};
  --el-border-color: ${t.line};
  --el-border-color-light: ${t.line};
  --el-border-color-lighter: ${subtle};
  --el-border-color-extra-light: ${t.sunken};
  --el-border-color-dark: ${t.lineStrong};
  --el-border-color-darker: ${shade(t.mut, dark ? -0.1 : 0.25)};
  --el-border-radius-base: ${radiusMd};
  --el-border-radius-small: ${radiusMd};
  --el-text-color-primary: ${t.ink};
  --el-text-color-regular: ${t.sub};
  --el-text-color-secondary: ${t.mut};
  --el-text-color-placeholder: ${shade(t.mut, dark ? -0.15 : 0.2)};
  --el-text-color-disabled: ${shade(t.mut, dark ? -0.2 : 0.28)};
  --el-disabled-bg-color: ${t.sunken};
  --el-disabled-text-color: ${shade(t.mut, dark ? -0.2 : 0.28)};
  --el-disabled-border-color: ${t.line};
  --el-color-primary: ${t.brand};
  --el-color-primary-dark-2: ${dark2};
  --el-color-primary-light-3: ${light3};
  --el-color-primary-light-5: ${light5};
  --el-color-primary-light-7: ${light7};
  --el-color-primary-light-8: ${light8};
  --el-color-primary-light-9: ${t.brandSoft};
  --el-color-success: ${t.success};
  --el-color-success-dark-2: ${shade(t.success, dark ? 0.15 : -0.18)};
  --el-color-success-light-9: ${t.successSoft};
  --el-color-warning: ${t.warning};
  --el-color-warning-dark-2: ${shade(t.warning, dark ? 0.15 : -0.18)};
  --el-color-warning-light-9: ${t.warningSoft};
  --el-color-danger: ${t.danger};
  --el-color-danger-dark-2: ${shade(t.danger, dark ? 0.15 : -0.18)};
  --el-color-danger-light-9: ${t.dangerSoft};
  --el-color-error: ${t.danger};
  --el-color-error-dark-2: ${shade(t.danger, dark ? 0.15 : -0.18)};
  --el-color-error-light-9: ${t.dangerSoft};
  --el-color-info: ${t.info};
  --el-color-info-light-9: ${t.infoSoft};`
}

export const buildThemeCss = (preset: ThemePreset): string => {
  const t = preset.tokens
  const dark = preset.scheme === 'dark'
  const radiusSm = `${Math.max(4, t.radius - 4)}px`
  const radiusMd = `${t.radius}px`
  const radiusLg = `${t.radius + 4}px`
  const radiusXl = `${t.radius + 10}px`
  const contrast = dark ? '#0b1220' : '#ffffff'
  const subtleLine = dark ? shade(t.canvas, 0.08) : shade(t.canvas, -0.03)

  const shadowBase = dark ? '0, 0, 0' : (() => {
    const { r, g, b } = hexToRgb(t.ink)
    return `${r}, ${g}, ${b}`
  })()
  const shadow = (y: number, blur: number, alpha: number, spread = 0) =>
    `0 ${y}px ${blur}px ${spread ? `${spread}px ` : ''}rgba(${shadowBase}, ${alpha})`

  const shadows = `
  --user-shadow-xs: ${shadow(1, 2, dark ? 0.4 : 0.03)}, ${shadow(1, 1, dark ? 0.3 : 0.02)};
  --user-shadow-sm: ${shadow(2, 6, dark ? 0.42 : 0.04)}, ${shadow(12, 24, dark ? 0.5 : 0.08, -8)};
  --user-shadow-md: ${shadow(8, 16, dark ? 0.46 : 0.06, -4)}, ${shadow(28, 56, dark ? 0.55 : 0.12, -16)};
  --user-shadow-lg: ${shadow(12, 28, dark ? 0.5 : 0.08, -6)}, ${shadow(36, 72, dark ? 0.6 : 0.14, -18)};`

  const gradAccent = `linear-gradient(135deg, ${shade(t.brand, 0.18)} 0%, ${t.brand} 55%, ${t.brandStrong} 100%)`
  const gradHero = dark
    ? `radial-gradient(120% 120% at 0% 0%, ${shade(t.surface, 0.06)} 0%, ${t.canvas} 45%, ${shade(t.brandSoft, -0.35)} 100%)`
    : `radial-gradient(120% 120% at 0% 0%, #ffffff 0%, ${shade(t.canvas, -0.02)} 45%, ${t.brandSoft} 100%)`

  const userTokens = `
  color-scheme: ${dark ? 'dark' : 'light'};

  --user-canvas: ${t.canvas};
  --user-surface-sunken: ${t.sunken};
  --user-bg: ${t.canvas};
  --user-bg-soft: ${t.sunken};
  --user-bg-panel: ${t.surface};
  --user-sidebar-bg: ${t.surface};
  --user-surface: ${t.surface};
  --user-surface-muted: ${t.sunken};
  --user-surface-raised: ${t.surface};
  --user-surface-tint: ${t.brandSoft};
  --user-border: ${t.line};
  --user-border-strong: ${t.lineStrong};
  --user-border-subtle: ${subtleLine};

  --user-text: ${t.ink};
  --user-text-secondary: ${t.sub};
  --user-text-muted: ${t.mut};
  --user-text-subtle: ${shade(t.mut, dark ? -0.12 : 0.28)};

  --user-primary: ${t.brand};
  --user-primary-hover: ${t.brandStrong};
  --user-primary-active: ${shade(t.brand, dark ? 0.16 : -0.3)};
  --user-primary-contrast: ${contrast};
  --user-primary-soft: ${t.brandSoft};
  --user-primary-faint: ${rgba(t.brand, dark ? 0.16 : 0.08)};
  --user-primary-border: ${rgba(t.brand, dark ? 0.45 : 0.28)};
  --user-accent-ring: ${rgba(t.brand, dark ? 0.4 : 0.22)};
  --user-ai: ${t.ai};
  --user-ai-soft: ${t.aiSoft};
  --user-cyan: ${t.info};
  --user-cyan-soft: ${t.infoSoft};

  --user-success: ${t.success};
  --user-success-text: ${t.success};
  --user-success-hover: ${shade(t.success, dark ? 0.15 : -0.15)};
  --user-success-soft: ${t.successSoft};
  --user-success-border: ${rgba(t.success, dark ? 0.45 : 0.32)};
  --user-warning: ${t.warning};
  --user-warning-text: ${shade(t.warning, dark ? 0.2 : -0.18)};
  --user-warning-soft: ${t.warningSoft};
  --user-danger: ${t.danger};
  --user-danger-text: ${t.danger};
  --user-danger-hover: ${shade(t.danger, dark ? 0.15 : -0.15)};
  --user-danger-soft: ${t.dangerSoft};
  --user-danger-border: ${rgba(t.danger, dark ? 0.45 : 0.3)};
  --user-disabled: ${shade(t.mut, dark ? -0.2 : 0.28)};
  --user-disabled-bg: ${t.sunken};
  --user-control-bg: ${t.surface};
  --user-control-bg-muted: ${t.sunken};
  --user-state-bg: ${t.sunken};
  --user-state-border: ${t.lineStrong};
  --user-state-error-bg: ${t.dangerSoft};
  --user-state-warning-bg: ${t.warningSoft};
  --user-state-success-bg: ${t.successSoft};

  --user-radius-sm: ${radiusSm};
  --user-radius-md: ${radiusMd};
  --user-radius-lg: ${radiusLg};
  --user-radius-xl: ${radiusXl};
  --user-radius-full: 999px;${shadows}`

  const arenaTokens = `
  --arena-canvas: ${t.canvas};
  --arena-sunken: ${t.sunken};
  --arena-bg: ${t.canvas};
  --arena-card: ${t.surface};
  --arena-ink: ${t.ink};
  --arena-sub: ${t.sub};
  --arena-mut: ${t.mut};
  --arena-line: ${t.line};
  --arena-line2: ${subtleLine};
  --arena-line-strong: ${t.lineStrong};
  --arena-grn: ${t.brand};
  --arena-grn-d: ${shade(t.brand, dark ? 0.2 : -0.3)};
  --arena-action: ${t.brand};
  --arena-action-hover: ${t.brandStrong};
  --arena-action-active: ${shade(t.brand, dark ? 0.16 : -0.35)};
  --arena-action-shadow: ${shade(t.brand, dark ? 0.16 : -0.35)};
  --arena-grn-soft: ${t.brandSoft};
  --arena-lime: ${shade(t.brand, dark ? 0.14 : 0.1)};
  --arena-amber: ${t.warning};
  --arena-amber-soft: ${t.warningSoft};
  --arena-vio: ${t.ai};
  --arena-vio-soft: ${t.aiSoft};
  --arena-red: ${t.danger};
  --arena-red-soft: ${t.dangerSoft};
  --arena-info: ${t.info};
  --arena-info-soft: ${t.infoSoft};
  --arena-success: ${t.success};
  --arena-success-soft: ${t.successSoft};
  --arena-grad-accent: ${gradAccent};
  --arena-grad-hero: ${gradHero};
  --arena-radius-btn: ${radiusMd};
  --arena-radius-card: ${radiusLg};
  --arena-radius-inp: ${radiusMd};
  --arena-shadow-subtle: ${shadow(1, 2, dark ? 0.35 : 0.03)};
  --arena-shadow-card: ${shadow(2, 6, dark ? 0.42 : 0.04)}, ${shadow(12, 24, dark ? 0.5 : 0.08, -8)};
  --arena-shadow-card-hover: ${shadow(8, 16, dark ? 0.46 : 0.06, -4)}, ${shadow(28, 56, dark ? 0.55 : 0.12, -16)};
  --arena-shadow-hover: ${shadow(10, 22, dark ? 0.5 : 0.07, -6)};`

  // 四个作用域与内置样式表一一对应；额外加 html 前缀抬升一层特异度，
  // 这样即使样式表加载顺序变化，皮肤也一定优先于内置默认配色。
  return `
html .jobcoach-layout.is-user-redesign,
html .jobcoach-layout.is-user-redesign .arena {${userTokens}
${buildElTokens({ t, dark, radiusMd })}
}
html .arena,
html .jobcoach-layout.is-user-redesign {${arenaTokens}
${buildElTokens({ t, dark, radiusMd })}
}
html body.user-overlay-theme {
  color-scheme: ${dark ? 'dark' : 'light'};${buildElTokens({ t, dark, radiusMd })}
}
body[data-app-theme] {
  --app-skin-canvas: ${t.canvas};
  --app-skin-surface: ${t.surface};
  --app-skin-brand: ${t.brand};
  --app-skin-brand-soft: ${t.brandSoft};
  --app-skin-ink: ${t.ink};
  --app-skin-line: ${t.line};
  --app-skin-radius: ${radiusMd};
  --app-skin-gradient: ${gradAccent};
}
`
}
