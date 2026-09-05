/**
 * 用户端主题（皮肤）预设。
 *
 * 每个预设只声明一小组「种子色」，其余派生色（tint / border / 渐变 / 阴影）
 * 由 buildThemeCss() 统一推导，保证任意色系下对比度与层次一致。
 */

export type ThemeScheme = 'light' | 'dark'

export interface ThemePresetTokens {
  /** 品牌主色 */
  brand: string
  /** 主色 hover / 强调态 */
  brandStrong: string
  /** 主色浅底（用于 active / 徽标底） */
  brandSoft: string
  /** 页面画布底色 */
  canvas: string
  /** 卡片 / 面板表面 */
  surface: string
  /** 下沉块（表格头、禁用底、muted） */
  sunken: string
  /** 主文本 */
  ink: string
  /** 次级文本 */
  sub: string
  /** 弱化文本 */
  mut: string
  /** 常规描边 */
  line: string
  /** 强调描边 */
  lineStrong: string
  success: string
  successSoft: string
  warning: string
  warningSoft: string
  danger: string
  dangerSoft: string
  /** AI / 教练相关强调色 */
  ai: string
  aiSoft: string
  info: string
  infoSoft: string
  /** 基础圆角（px），派生 sm/md/lg */
  radius: number
}

export interface ThemePreset {
  id: string
  label: string
  hint: string
  scheme: ThemeScheme
  /** 切换器里的预览色块 */
  swatch: [string, string, string]
  tokens: ThemePresetTokens
}

export const themePresets: ThemePreset[] = [
  {
    id: 'sage',
    label: '鼠尾草绿',
    hint: '清透暖白 + 亮鼠尾草，默认推荐',
    scheme: 'light',
    swatch: ['#fafaf8', '#1d8a75', '#171a19'],
    tokens: {
      brand: '#1d8a75',
      brandStrong: '#146b59',
      brandSoft: '#e8f6f2',
      canvas: '#fafaf8',
      surface: '#ffffff',
      sunken: '#f4f3ef',
      ink: '#171a19',
      sub: '#5c5852',
      mut: '#78736b',
      line: '#e9e7e2',
      lineStrong: '#d4d1cb',
      success: '#2a8a66',
      successSoft: '#e9f6f1',
      warning: '#c47a0f',
      warningSoft: '#fef7ea',
      danger: '#c44444',
      dangerSoft: '#fdf0f0',
      ai: '#7b64a8',
      aiSoft: '#f4f0fa',
      info: '#3d7a9e',
      infoSoft: '#eaf5fa',
      radius: 12
    }
  },
  {
    id: 'ink',
    label: '墨玉深绿',
    hint: '低饱和暖中性 + 深墨绿，沉稳克制',
    scheme: 'light',
    swatch: ['#f6f6f4', '#1f6f5c', '#1a1917'],
    tokens: {
      brand: '#1f6f5c',
      brandStrong: '#17493d',
      brandSoft: '#eaf2ef',
      canvas: '#f6f6f4',
      surface: '#ffffff',
      sunken: '#f0efeb',
      ink: '#1a1917',
      sub: '#57534e',
      mut: '#6e6963',
      line: '#e3e0da',
      lineStrong: '#c9c4bb',
      success: '#2e7d5b',
      successSoft: '#eaf3ee',
      warning: '#b4690e',
      warningSoft: '#fdf3e3',
      danger: '#b03a3a',
      dangerSoft: '#fbeeee',
      ai: '#6f5c93',
      aiSoft: '#f1edf7',
      info: '#3a6b8c',
      infoSoft: '#eaf1f6',
      radius: 10
    }
  },
  {
    id: 'ocean',
    label: '海雾蓝',
    hint: '冷静偏冷的蓝灰，专业感强',
    scheme: 'light',
    swatch: ['#f7f9fc', '#2563eb', '#0f172a'],
    tokens: {
      brand: '#2563eb',
      brandStrong: '#1d4ed8',
      brandSoft: '#eaf1ff',
      canvas: '#f7f9fc',
      surface: '#ffffff',
      sunken: '#f1f5f9',
      ink: '#0f172a',
      sub: '#3f4b5c',
      mut: '#667386',
      line: '#dde2e9',
      lineStrong: '#c7cfda',
      success: '#0f766e',
      successSoft: '#e6f5f3',
      warning: '#b45309',
      warningSoft: '#fdf3e3',
      danger: '#b91c1c',
      dangerSoft: '#fdeced',
      ai: '#6d28d9',
      aiSoft: '#f0ebfd',
      info: '#0369a1',
      infoSoft: '#e5f2fb',
      radius: 12
    }
  },
  {
    id: 'amber',
    label: '暖阳陶土',
    hint: '暖米底 + 陶土橙，亲和有活力',
    scheme: 'light',
    swatch: ['#fdf9f5', '#c0562f', '#1f1a17'],
    tokens: {
      brand: '#c0562f',
      brandStrong: '#9a4423',
      brandSoft: '#fbeee7',
      canvas: '#fdf9f5',
      surface: '#ffffff',
      sunken: '#f6efe7',
      ink: '#1f1a17',
      sub: '#5c4f45',
      mut: '#7d6f63',
      line: '#ece2d6',
      lineStrong: '#d8c8b6',
      success: '#3f7d52',
      successSoft: '#ecf5ee',
      warning: '#a8620a',
      warningSoft: '#fcf1de',
      danger: '#b23b32',
      dangerSoft: '#fbeeee',
      ai: '#8a5a3b',
      aiSoft: '#f6ece4',
      info: '#2f6f7d',
      infoSoft: '#e9f3f5',
      radius: 14
    }
  },
  {
    id: 'lilac',
    label: '雾霭紫',
    hint: '柔和紫调，安静不张扬',
    scheme: 'light',
    swatch: ['#faf8fd', '#7c5cd6', '#1b1725'],
    tokens: {
      brand: '#7c5cd6',
      brandStrong: '#6444bd',
      brandSoft: '#f1ecfb',
      canvas: '#faf8fd',
      surface: '#ffffff',
      sunken: '#f3eff9',
      ink: '#1b1725',
      sub: '#544a68',
      mut: '#736a86',
      line: '#e8e2f2',
      lineStrong: '#d2c8e6',
      success: '#3d8a63',
      successSoft: '#ebf5ef',
      warning: '#b06a12',
      warningSoft: '#fcf2e5',
      danger: '#b84b4b',
      dangerSoft: '#fbeeee',
      ai: '#8b5cf6',
      aiSoft: '#f2ecfd',
      info: '#4a6fa8',
      infoSoft: '#ecf1f9',
      radius: 14
    }
  },
  {
    id: 'midnight',
    label: '午夜青',
    hint: '深色皮肤，夜间使用更舒服',
    scheme: 'dark',
    swatch: ['#0b1220', '#2dd4bf', '#e8eef7'],
    tokens: {
      brand: '#2dd4bf',
      brandStrong: '#14b8a6',
      brandSoft: '#123f3a',
      canvas: '#0b1220',
      surface: '#131c2e',
      sunken: '#1b2436',
      ink: '#e8eef7',
      sub: '#b3c0d4',
      mut: '#8797ad',
      line: '#27334a',
      lineStrong: '#3a4964',
      success: '#34d399',
      successSoft: '#12332a',
      warning: '#fbbf24',
      warningSoft: '#33280f',
      danger: '#f87171',
      dangerSoft: '#38191b',
      ai: '#a78bfa',
      aiSoft: '#241f3d',
      info: '#60a5fa',
      infoSoft: '#16233a',
      radius: 12
    }
  },
  {
    id: 'graphite',
    label: '石墨蓝',
    hint: '深色中性 + 冷蓝，低干扰',
    scheme: 'dark',
    swatch: ['#111827', '#60a5fa', '#e5e9f0'],
    tokens: {
      brand: '#60a5fa',
      brandStrong: '#3b82f6',
      brandSoft: '#152642',
      canvas: '#111827',
      surface: '#1b2430',
      sunken: '#243040',
      ink: '#e5e9f0',
      sub: '#b0bac9',
      mut: '#8794a6',
      line: '#2c3849',
      lineStrong: '#3f4d61',
      success: '#4ade80',
      successSoft: '#15301f',
      warning: '#fcd34d',
      warningSoft: '#332a12',
      danger: '#f87171',
      dangerSoft: '#38191b',
      ai: '#c4b5fd',
      aiSoft: '#262040',
      info: '#7dd3fc',
      infoSoft: '#13293a',
      radius: 10
    }
  }
]

export const defaultThemePresetId = 'ink'

export const findThemePreset = (id: string | null | undefined): ThemePreset =>
  themePresets.find((preset) => preset.id === id) ??
  themePresets.find((preset) => preset.id === defaultThemePresetId) ??
  themePresets[0]
