import { defineStore } from 'pinia'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

const TAGS_KEY = 'codecoachai-visited-tags'
const MAX_TAGS_PER_SCOPE = 12

export type TagScope = 'user' | 'admin'

export interface VisitedTag {
  title: string
  path: string
  fullPath: string
  name?: string
  affix?: boolean
  scope: TagScope
}

const userHomeTag: VisitedTag = {
  title: '工作台',
  path: '/dashboard',
  fullPath: '/dashboard',
  name: 'Dashboard',
  affix: true,
  scope: 'user'
}

const adminHomeTag: VisitedTag = {
  title: '管理首页',
  path: '/admin',
  fullPath: '/admin',
  name: 'AdminDashboard',
  affix: true,
  scope: 'admin'
}

const HOME_TAGS: VisitedTag[] = [userHomeTag, adminHomeTag]

/**
 * 根据路由路径推断作用域。
 * 路径以 /admin 开头 → 管理端；否则 → 用户端。
 */
export const resolveTagScope = (path: string): TagScope => {
  return path.startsWith('/admin') ? 'admin' : 'user'
}

/**
 * 根据作用域获取默认首页 affix 标签。
 */
export const getHomeTag = (scope: TagScope): VisitedTag => {
  return scope === 'admin' ? adminHomeTag : userHomeTag
}

const ensureAffix = (tags: VisitedTag[]): VisitedTag[] => {
  // 保证 user / admin 两个 affix 始终存在，且 affix 永远排在最前
  const withoutAffix = tags.filter(
    (tag) => !HOME_TAGS.some((home) => home.path === tag.path)
  )
  return [...HOME_TAGS, ...withoutAffix]
}

const readTags = (): VisitedTag[] => {
  const raw = localStorage.getItem(TAGS_KEY)
  if (!raw) return ensureAffix([])
  try {
    const parsed = JSON.parse(raw) as Partial<VisitedTag>[]
    const tags: VisitedTag[] = Array.isArray(parsed)
      ? parsed
          .filter((item) => item && item.path)
          .map((item) => ({
            title: String(item.title || item.path),
            path: String(item.path),
            fullPath: String(item.fullPath || item.path),
            name: item.name ? String(item.name) : undefined,
            affix: Boolean(item.affix),
            // 兼容旧数据（没有 scope 的认为是 admin）
            scope: (item.scope as TagScope) || resolveTagScope(String(item.path))
          }))
      : []
    return ensureAffix(tags)
  } catch {
    return ensureAffix([])
  }
}

interface TagsState {
  visitedTags: VisitedTag[]
}

export const useTagsViewStore = defineStore('tagsView', {
  state: (): TagsState => ({
    visitedTags: readTags()
  }),

  getters: {
    /** 按作用域过滤的标签列表 */
    tagsByScope: (state) => {
      return (scope: TagScope) => state.visitedTags.filter((tag) => tag.scope === scope)
    }
  },

  actions: {
    persist() {
      localStorage.setItem(TAGS_KEY, JSON.stringify(this.visitedTags))
    },

    addVisitedView(route: RouteLocationNormalizedLoaded) {
      if (route.meta?.hidden) return
      if (!route.path || route.path === '/') return

      // 公共页面（登录 / 注册 / 错误页）不进 Tab
      if (route.meta?.public) return

      const scope = resolveTagScope(route.path)
      const tag: VisitedTag = {
        title: String(route.meta?.title || route.name || route.path),
        path: route.path,
        fullPath: route.fullPath,
        name: route.name ? String(route.name) : undefined,
        affix: Boolean(route.meta?.affix),
        scope
      }

      const exists = this.visitedTags.find((item) => item.path === tag.path)
      if (exists) {
        exists.fullPath = tag.fullPath
        exists.title = tag.title
        exists.scope = scope
      } else {
        this.visitedTags.push(tag)
      }

      // 按 scope 单独裁剪长度，避免一端撑爆另一端
      const removable = this.visitedTags.filter(
        (item) => !item.affix && item.scope === scope
      )
      while (removable.length > MAX_TAGS_PER_SCOPE - 1) {
        const removed = removable.shift()
        if (removed) {
          this.visitedTags = this.visitedTags.filter((item) => item.path !== removed.path)
        }
      }

      this.visitedTags = ensureAffix(this.visitedTags)
      this.persist()
    },

    closeTag(path: string) {
      this.visitedTags = this.visitedTags.filter(
        (tag) => tag.affix || tag.path !== path
      )
      this.persist()
    },

    closeOtherTags(path: string) {
      const target = this.visitedTags.find((tag) => tag.path === path)
      const scope = target?.scope
      this.visitedTags = this.visitedTags.filter(
        (tag) => tag.affix || tag.path === path || (scope ? tag.scope !== scope : false)
      )
      this.persist()
    },

    /**
     * 清空指定作用域（不传则全部清空），affix 标签始终保留。
     */
    clearVisitedViews(scope?: TagScope) {
      if (scope) {
        this.visitedTags = this.visitedTags.filter(
          (tag) => tag.affix || tag.scope !== scope
        )
      } else {
        this.visitedTags = [...HOME_TAGS]
      }
      this.persist()
    }
  }
})
