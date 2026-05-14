import { defineStore } from 'pinia'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

const TAGS_KEY = 'codecoachai-visited-tags'
const MAX_TAGS = 12

export interface VisitedTag {
  title: string
  path: string
  fullPath: string
  name?: string
  affix?: boolean
}

const adminHomeTag: VisitedTag = {
  title: '管理首页',
  path: '/admin',
  fullPath: '/admin',
  name: 'AdminDashboard',
  affix: true
}

const readTags = (): VisitedTag[] => {
  const raw = localStorage.getItem(TAGS_KEY)
  if (!raw) return [adminHomeTag]
  try {
    const parsed = JSON.parse(raw) as VisitedTag[]
    const tags = Array.isArray(parsed) ? parsed : []
    return [adminHomeTag, ...tags.filter((tag) => tag.path !== adminHomeTag.path)]
  } catch {
    return [adminHomeTag]
  }
}

export const useTagsViewStore = defineStore('tagsView', {
  state: () => ({
    visitedTags: readTags()
  }),

  actions: {
    persist() {
      localStorage.setItem(TAGS_KEY, JSON.stringify(this.visitedTags))
    },

    addVisitedView(route: RouteLocationNormalizedLoaded) {
      if (!route.path.startsWith('/admin')) return
      if (route.meta.hidden) return

      const tag: VisitedTag = {
        title: String(route.meta.title || route.name || route.path),
        path: route.path,
        fullPath: route.fullPath,
        name: route.name ? String(route.name) : undefined,
        affix: Boolean(route.meta.affix)
      }

      const exists = this.visitedTags.find((item) => item.path === tag.path)
      if (exists) {
        exists.fullPath = tag.fullPath
        exists.title = tag.title
      } else {
        this.visitedTags.push(tag)
      }

      const removable = this.visitedTags.filter((item) => !item.affix)
      while (removable.length > MAX_TAGS - 1) {
        const removed = removable.shift()
        this.visitedTags = this.visitedTags.filter((item) => item.path !== removed?.path)
      }

      this.persist()
    },

    closeTag(path: string) {
      this.visitedTags = this.visitedTags.filter((tag) => tag.affix || tag.path !== path)
      this.persist()
    },

    closeOtherTags(path: string) {
      this.visitedTags = this.visitedTags.filter((tag) => tag.affix || tag.path === path)
      this.persist()
    },

    clearVisitedViews() {
      this.visitedTags = [adminHomeTag]
      this.persist()
    }
  }
})
