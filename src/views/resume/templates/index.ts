import type { Component } from 'vue'

import {
  ClassicTemplateRenderer,
  CLASSIC_RENDERER_KEY
} from './classic'
import {
  LeftRightTemplateRenderer,
  LEFT_RIGHT_RENDERER_KEY
} from './left-right'
import {
  ModernTemplateRenderer,
  MODERN_RENDERER_KEY
} from './modern'
import {
  EditorialTemplateRenderer,
  EDITORIAL_RENDERER_KEY
} from './editorial'
import {
  TimelineTemplateRenderer,
  TIMELINE_RENDERER_KEY
} from './timeline'
import {
  MinimalistTemplateRenderer,
  MINIMALIST_RENDERER_KEY
} from './minimalist'
import {
  ElegantTemplateRenderer,
  ELEGANT_RENDERER_KEY
} from './elegant'
import {
  CreativeTemplateRenderer,
  CREATIVE_RENDERER_KEY
} from './creative'
import {
  SwissTemplateRenderer,
  SWISS_RENDERER_KEY
} from './swiss'
import {
  ProjectTemplateRenderer,
  PROJECT_RENDERER_KEY
} from './project'
import {
  StreakTemplateRenderer,
  STREAK_RENDERER_KEY
} from './streak'

export {
  ClassicTemplateRenderer,
  CLASSIC_RENDERER_KEY,
  LeftRightTemplateRenderer,
  LEFT_RIGHT_RENDERER_KEY,
  ModernTemplateRenderer,
  MODERN_RENDERER_KEY,
  EditorialTemplateRenderer,
  EDITORIAL_RENDERER_KEY,
  TimelineTemplateRenderer,
  TIMELINE_RENDERER_KEY,
  MinimalistTemplateRenderer,
  MINIMALIST_RENDERER_KEY,
  ElegantTemplateRenderer,
  ELEGANT_RENDERER_KEY,
  CreativeTemplateRenderer,
  CREATIVE_RENDERER_KEY,
  SwissTemplateRenderer,
  SWISS_RENDERER_KEY,
  ProjectTemplateRenderer,
  PROJECT_RENDERER_KEY,
  StreakTemplateRenderer,
  STREAK_RENDERER_KEY
}

export const resumeRendererComponents: Record<string, Component> = {
  [CLASSIC_RENDERER_KEY]: ClassicTemplateRenderer,
  [MODERN_RENDERER_KEY]: ModernTemplateRenderer,
  [LEFT_RIGHT_RENDERER_KEY]: LeftRightTemplateRenderer,
  [EDITORIAL_RENDERER_KEY]: EditorialTemplateRenderer,
  [TIMELINE_RENDERER_KEY]: TimelineTemplateRenderer,
  [MINIMALIST_RENDERER_KEY]: MinimalistTemplateRenderer,
  [ELEGANT_RENDERER_KEY]: ElegantTemplateRenderer,
  [CREATIVE_RENDERER_KEY]: CreativeTemplateRenderer,
  [SWISS_RENDERER_KEY]: SwissTemplateRenderer,
  [PROJECT_RENDERER_KEY]: ProjectTemplateRenderer,
  [STREAK_RENDERER_KEY]: StreakTemplateRenderer
}

export const getResumeRendererComponent = (
  rendererKey?: string
): Component | undefined => {
  if (!rendererKey) return undefined
  return resumeRendererComponents[rendererKey]
    || (rendererKey.endsWith('/preview')
      ? resumeRendererComponents[rendererKey.slice(0, -'/preview'.length)]
      : undefined)
}
