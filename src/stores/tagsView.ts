import { defineStore } from 'pinia'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

const TAGS_KEY = 'codecoachai-visited-tags'
const MAX_TAGS_PER_SCOPE = 12

const TAG_TITLE_MAP: Record<string, string> = {
  '/dashboard': '工作台',
  '/dashboard/v3': 'V3 驾驶舱',
  '/profile': '个人资料',
  '/password': '修改密码',
  '/notifications': '通知中心',
  '/questions': '题库',
  '/questions/practice': '刷题练习',
  '/questions/wrong-records': '错题本',
  '/questions/favorites': '收藏题目',
  '/questions/recommendations': '推荐题目',
  '/job-targets': '岗位目标',
  '/resumes': '简历中心',
  '/resume-match': '简历匹配',
  '/skill-profile': '能力画像',
  '/study-plans': '学习计划',
  '/daily-tasks': '每日任务',
  '/knowledge': '知识库',
  '/agent/today': '今日 Agent',
  '/agent/tasks': 'Agent 任务',
  '/admin/dashboard': '管理首页',
  '/admin/files': '文件治理',
  '/admin/users': '用户管理',
  '/admin/roles': '角色管理',
  '/admin/questions': '题目管理',
  '/admin/ai/questions/generate': 'AI 题目生成',
  '/admin/question-reviews': '题目审核',
  '/admin/question-duplicate-reviews': '题目去重审核',
  '/admin/question-relations': '题目关系',
  '/admin/question-categories': '分类管理',
  '/admin/question-tags': '标签管理',
  '/admin/question-groups': '问题组管理',
  '/admin/industry-templates': '行业模板',
  '/admin/ai/prompts': 'Prompt 模板',
  '/admin/ai/logs': 'AI 调用日志',
  '/admin/ai/models': 'AI 模型配置',
  '/admin/analytics/agent': 'Agent 效果分析',
  '/admin/analytics/ai': 'AI Ops 看板',
  '/admin/ops/overview': '运维监控',
  '/admin/analytics/metrics': '指标字典',
  '/admin/analytics/jobs': '聚合任务',
  '/admin/ai/prompt-regression': 'Prompt 回归',
  '/admin/menus': '菜单权限',
  '/admin/notices': '通知管理',
  '/admin/operation-logs': '操作日志',
  '/admin/login-logs': '登录日志',
  '/admin/slow-sql-logs': '慢 SQL 查询',
  '/admin/interviews': '面试记录',
  '/admin/interview-reports': '面试报告',
  '/admin/agent/runs': 'Agent 运行',
  '/admin/agent/tasks': 'Agent 任务',
  '/admin/async-tasks': '任务中心',
  '/admin/system/configs': '系统配置'
}

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
  path: '/admin/dashboard',
  fullPath: '/admin/dashboard',
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

const resolveTagTitle = (path: string, fallback?: unknown) => {
  return TAG_TITLE_MAP[path] || String(fallback || path)
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
            title: resolveTagTitle(String(item.path), item.title),
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
        title: resolveTagTitle(route.path, route.meta?.title || route.name || route.path),
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

    closeLeftTags(path: string) {
      const target = this.visitedTags.find((tag) => tag.path === path)
      const scope = target?.scope
      if (!scope) return
      const scopeTags = this.visitedTags.filter((tag) => tag.scope === scope)
      const targetIndex = scopeTags.findIndex((tag) => tag.path === path)
      const closePaths = new Set(
        scopeTags
          .slice(0, Math.max(0, targetIndex))
          .filter((tag) => !tag.affix)
          .map((tag) => tag.path)
      )
      this.visitedTags = this.visitedTags.filter((tag) => !closePaths.has(tag.path))
      this.persist()
    },

    closeRightTags(path: string) {
      const target = this.visitedTags.find((tag) => tag.path === path)
      const scope = target?.scope
      if (!scope) return
      const scopeTags = this.visitedTags.filter((tag) => tag.scope === scope)
      const targetIndex = scopeTags.findIndex((tag) => tag.path === path)
      const closePaths = new Set(
        scopeTags
          .slice(targetIndex + 1)
          .filter((tag) => !tag.affix)
          .map((tag) => tag.path)
      )
      this.visitedTags = this.visitedTags.filter((tag) => !closePaths.has(tag.path))
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
