import {
  Activity,
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarCheck2,
  FileText,
  Files,
  FolderKanban,
  GraduationCap,
  History,
  Library,
  Map,
  MessageSquare,
  PackageCheck,
  Rocket,
  Search,
  Target,
  TrendingUp,
  UserRoundSearch
} from 'lucide-vue-next'
import type { Component } from 'vue'

import { appConfig } from '@/config'
import { isV4PreviewAccessEnabled } from '@/features/route-safety'

/**
 * P0 六项主导航（今日/求职/资料/面试/训练/准备度）。
 *
 * 兼容策略：历史 8 个 group key（today/prepare/matching/train/interview/
 * progress/resources/growth）继续保留——30+ 个视图通过 useUserModuleTabs('<key>')
 * 读取所在组的页内标签，物理组不能改名或删除。收敛通过 PRIMARY_NAVIGATION_KEYS
 * 完成：UserSidebar/UserAppShell 只渲染 primary 组；非 primary 组（prepare/
 * matching 已并入 resources/progress 的 primary 展示）退化为页内 module tabs
 * 的逻辑组，主导航不再出现。
 *
 * 已按 P0 决策从主导航移除的入口（路由保留，页内/命令面板也不再暴露）：
 * AI 任务中心（异常态入口）、新手引导（onboarding 流程页）、简历版本（preview）、
 * 收藏复习（训练内筛选）、每日任务（学习计划内）、训练统计/排行榜、协作练习、
 * 求职日志、求职周报、求职实验台、投递包（并入求职详情）、证据使用、
 * 个人知识库、作品集演示、项目经历（并入我的项目）、记录与工具、
 * 训练分析、成长档案、长期记忆。
 */
export type UserNavigationGroupKey =
  | 'today'
  | 'prepare'
  | 'matching'
  | 'train'
  | 'interview'
  | 'progress'
  | 'resources'
  | 'growth'

export type UserNavigationFeatureFlag =
  | 'v4Preview'
  | 'v4Growth'
  | 'v4Knowledge'
  | 'v6WeeklyReport'
  | 'v9EvidenceLearning'

export interface UserNavigationRoute {
  name?: string | symbol | null
  path: string
}

export interface UserNavigationFeatureState {
  v4Preview: boolean
  v4Growth: boolean
  v4Knowledge: boolean
  v6WeeklyReport: boolean
  v9EvidenceLearning: boolean
}

export interface UserNavigationMatcher {
  routeNames?: string[]
  exactPaths?: string[]
  prefixes?: string[]
}

export interface UserNavigationItem extends UserNavigationMatcher {
  key: string
  label: string
  description: string
  path: string
  icon: Component
  featureFlag?: UserNavigationFeatureFlag
}

export interface UserNavigationGroup {
  key: UserNavigationGroupKey
  label: string
  mobileLabel: string
  description: string
  path: string
  icon: Component
  compactOverflow?: boolean
  items: UserNavigationItem[]
}

/** 六项一级导航的展示顺序与命名（P0 产品口径） */
export const PRIMARY_NAVIGATION_KEYS: UserNavigationGroupKey[] = [
  'today',
  'progress',
  'resources',
  'interview',
  'train',
  'growth'
]

export const mobilePrimaryNavigationKeys: UserNavigationGroupKey[] = [
  'today',
  'progress',
  'train'
]

export const userNavigationGroups: UserNavigationGroup[] = [
  {
    key: 'today',
    label: '今日',
    mobileLabel: '今日',
    description: '今日任务、待办和下一步行动',
    path: '/dashboard',
    icon: Target,
    items: [
      {
        key: 'today-overview',
        label: '今日总览',
        description: '查看今日任务、完成记录和下一步行动',
        path: '/dashboard',
        icon: Target,
        routeNames: ['Dashboard'],
        exactPaths: ['/dashboard']
      },
      {
        key: 'today-plan',
        label: '今日任务',
        description: '查看优先级、提醒和执行计划',
        path: '/agent/today',
        icon: CalendarCheck2,
        routeNames: ['AgentToday', 'AgentRunDetail'],
        exactPaths: ['/agent/today', '/agent/runs'],
        prefixes: ['/agent/runs']
      }
    ]
  },
  {
    key: 'progress',
    label: '求职',
    mobileLabel: '求职',
    description: '岗位、JD 差距分析、投递状态和求职日历',
    path: '/job-targets',
    icon: BriefcaseBusiness,
    items: [
      {
        key: 'job-targets',
        label: '岗位目标',
        description: '维护目标岗位和 JD 要求',
        path: '/job-targets',
        icon: Target,
        routeNames: ['JobTargets', 'JobTargetCreate', 'JobTargetEdit', 'JobTargetAnalysis'],
        exactPaths: ['/job-targets'],
        prefixes: ['/job-targets']
      },
      {
        key: 'resume-match',
        label: 'JD 匹配',
        description: '比较岗位要求与简历证据',
        path: '/resume-match',
        icon: Search,
        routeNames: ['ResumeMatch', 'ResumeMatchDetail'],
        exactPaths: ['/resume-match'],
        prefixes: ['/resume-match', '/resume-job-match']
      },
      {
        key: 'applications',
        label: '投递管理',
        description: '维护投递阶段、跟进时间和结果',
        path: '/applications',
        icon: BriefcaseBusiness,
        routeNames: ['JobApplications', 'ApplicationWorkspace', 'CampaignCockpit'],
        exactPaths: ['/applications'],
        prefixes: ['/applications', '/career-campaigns']
      },
      {
        key: 'career-calendar',
        label: '求职日历',
        description: '查看面试安排、跟进提醒和事件准备',
        path: '/career-calendar',
        icon: CalendarCheck2,
        routeNames: ['CareerCalendar'],
        exactPaths: ['/career-calendar']
      }
    ]
  },
  {
    key: 'resources',
    label: '资料',
    mobileLabel: '资料',
    description: '简历、我的项目和项目资料',
    path: '/resumes',
    icon: FolderKanban,
    items: [
      {
        key: 'resume-workbench',
        label: '简历工作台',
        description: '导入、编辑和优化求职简历',
        path: '/resumes/workbench',
        icon: FileText,
        routeNames: ['ResumeWorkbench', 'ResumeCreate', 'ResumeEdit'],
        exactPaths: ['/resumes/workbench', '/resumes/create'],
        prefixes: ['/resumes/']
      },
      {
        key: 'resume-management',
        label: '简历管理',
        description: '管理简历版本和已有文档',
        path: '/resumes/manage',
        icon: Files,
        routeNames: ['ResumeList'],
        exactPaths: ['/resumes/manage']
      },
      {
        key: 'project-evidence',
        label: '我的项目',
        description: '沉淀项目事实和可复用能力证据',
        path: '/project-evidence',
        icon: FolderKanban,
        routeNames: [
          'ProjectEvidenceList',
          'ProjectEvidenceCreate',
          'ProjectEvidenceDetail',
          'ProjectEvidenceEdit'
        ],
        exactPaths: ['/project-evidence'],
        prefixes: ['/project-evidence']
      }
    ]
  },
  {
    key: 'interview',
    label: '面试',
    mobileLabel: '面试',
    description: '创建面试、面试记录、报告和复练',
    path: '/interviews/create',
    icon: MessageSquare,
    items: [
      {
        key: 'interview-create',
        label: '开始面试',
        description: '选择面试类型并开始模拟训练',
        path: '/interviews/create',
        icon: MessageSquare,
        routeNames: ['InterviewCreate'],
        exactPaths: ['/interviews/create']
      },
      {
        key: 'interview-history',
        label: '面试记录',
        description: '查看报告、复练和多轮比较',
        path: '/interviews/history',
        icon: History,
        routeNames: [
          'InterviewHistory',
          'InterviewComparison',
          'InterviewDetail',
          'InterviewReport',
          'InterviewRoom'
        ],
        exactPaths: ['/interviews/history'],
        prefixes: ['/interviews']
      }
    ]
  },
  {
    key: 'train',
    label: '训练',
    mobileLabel: '训练',
    description: '推荐训练、专项训练、题库、错题和学习计划',
    path: '/questions/recommendations',
    icon: BookOpenCheck,
    items: [
      {
        key: 'question-recommendations',
        label: '推荐训练',
        description: '按当前目标开始今日推荐题组',
        path: '/questions/recommendations',
        icon: Rocket,
        routeNames: ['QuestionRecommendations'],
        exactPaths: ['/questions/recommendations']
      },
      {
        key: 'question-practice',
        label: '专项训练',
        description: '按主题连续练习并即时复盘',
        path: '/questions/practice',
        icon: BookOpenCheck,
        routeNames: ['QuestionPractice'],
        exactPaths: ['/questions/practice']
      },
      {
        key: 'question-library',
        label: '题库浏览',
        description: '查找题目并进入训练工作区',
        path: '/questions',
        icon: Library,
        routeNames: ['QuestionList', 'QuestionDetail'],
        exactPaths: ['/questions'],
        prefixes: ['/questions']
      },
      {
        key: 'wrong-questions',
        label: '错题复盘',
        description: '集中回顾薄弱题目和错误原因',
        path: '/questions/wrong-records',
        icon: History,
        routeNames: ['WrongQuestions'],
        exactPaths: ['/questions/wrong-records']
      },
      {
        key: 'study-plans',
        label: '学习计划',
        description: '安排短板学习与阶段性任务',
        path: '/study-plans',
        icon: GraduationCap,
        routeNames: ['StudyPlans', 'StudyPlansFromGap'],
        exactPaths: ['/study-plans'],
        prefixes: ['/study-plans']
      }
    ]
  },
  {
    key: 'growth',
    label: '准备度',
    mobileLabel: '准备度',
    description: '岗位差距、能力状态、项目掌握和下一步建议',
    path: '/ability-map',
    icon: TrendingUp,
    compactOverflow: true,
    items: [
      {
        key: 'ability-map',
        label: '能力图谱',
        description: '查看当前技能结构和能力分布',
        path: '/ability-map',
        icon: Map,
        routeNames: ['AbilityMap'],
        exactPaths: ['/ability-map']
      },
      {
        key: 'skill-profile',
        label: '能力画像',
        description: '查看岗位能力与个人技能画像',
        path: '/skill-profile',
        icon: UserRoundSearch,
        routeNames: ['SkillProfile'],
        exactPaths: ['/skill-profile']
      },
      {
        key: 'weakness-analysis',
        label: '薄弱点分析',
        description: '定位知识和训练中的能力缺口',
        path: '/weakness-analysis',
        icon: Activity,
        routeNames: ['WeaknessAnalysis'],
        exactPaths: ['/weakness-analysis']
      }
    ]
  },
  {
    key: 'prepare',
    label: '简历准备',
    mobileLabel: '简历',
    description: '历史简历逻辑组：主导航入口并入资料，页内标签保留',
    path: '/resumes',
    icon: FileText,
    items: [
      {
        key: 'resume-workbench',
        label: '简历工作台',
        description: '创建、编辑和优化求职简历',
        path: '/resumes/workbench',
        icon: FileText,
        routeNames: ['ResumeWorkbench', 'ResumeCreate', 'ResumeEdit'],
        exactPaths: ['/resumes/workbench', '/resumes/create'],
        prefixes: ['/resumes/']
      },
      {
        key: 'resume-management',
        label: '简历管理',
        description: '管理简历版本和已有文档',
        path: '/resumes/manage',
        icon: Files,
        routeNames: ['ResumeList'],
        exactPaths: ['/resumes/manage']
      }
    ]
  },
  {
    key: 'matching',
    label: '岗位匹配',
    mobileLabel: '匹配',
    description: '历史岗位逻辑组：主导航入口并入求职，页内标签保留',
    path: '/job-targets',
    icon: Search,
    items: [
      {
        key: 'job-targets',
        label: '岗位目标',
        description: '维护目标岗位和 JD 要求',
        path: '/job-targets',
        icon: Target,
        routeNames: ['JobTargets', 'JobTargetCreate', 'JobTargetEdit', 'JobTargetAnalysis'],
        exactPaths: ['/job-targets'],
        prefixes: ['/job-targets']
      },
      {
        key: 'resume-match',
        label: 'JD 匹配',
        description: '比较岗位要求与简历证据',
        path: '/resume-match',
        icon: Search,
        routeNames: ['ResumeMatch', 'ResumeMatchDetail'],
        exactPaths: ['/resume-match'],
        prefixes: ['/resume-match', '/resume-job-match']
      },
      {
        key: 'application-packages',
        label: '投递包',
        description: '组合简历、材料和导出文件',
        path: '/application-packages',
        icon: PackageCheck,
        routeNames: ['ApplicationPackageList', 'ApplicationPackagePreview', 'ApplicationPackageDetail'],
        exactPaths: ['/application-packages'],
        prefixes: ['/application-packages']
      }
    ]
  }
]

export const getUserNavigationFeatureState = (): UserNavigationFeatureState => ({
  v4Preview: isV4PreviewAccessEnabled(),
  v4Growth: appConfig.enableV4GrowthPreview,
  v4Knowledge: appConfig.enableV4KnowledgePreview,
  v6WeeklyReport: appConfig.enableV6WeeklyReport,
  v9EvidenceLearning: appConfig.enableV9EvidenceLearning
})

export const isUserNavigationItemVisible = (
  item: UserNavigationItem,
  featureState: UserNavigationFeatureState = getUserNavigationFeatureState()
) => !item.featureFlag || featureState[item.featureFlag]

/**
 * 主导航可见组：六项 P0 入口。
 * prepare/matching 是历史逻辑组，只服务 useUserModuleTabs 页内标签，
 * 不再出现在侧边栏/移动导航（已并入求职、资料两组的 primary 展示）。
 */
export const getVisibleUserNavigationGroups = (
  featureState: UserNavigationFeatureState = getUserNavigationFeatureState()
): UserNavigationGroup[] =>
  userNavigationGroups
    .filter((group) => PRIMARY_NAVIGATION_KEYS.includes(group.key))
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => isUserNavigationItemVisible(item, featureState))
    }))
    .filter((group) => group.items.length > 0)

/** module tabs 等页内能力仍需要读取全部逻辑组（含非 primary 的 prepare/matching） */
export const getAllUserNavigationGroups = (
  featureState: UserNavigationFeatureState = getUserNavigationFeatureState()
): UserNavigationGroup[] =>
  userNavigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => isUserNavigationItemVisible(item, featureState))
    }))
    .filter((group) => group.items.length > 0)

interface MatcherScore {
  priority: number
  specificity: number
}

const getMatcherScore = (
  matcher: UserNavigationMatcher,
  route: UserNavigationRoute
): MatcherScore | null => {
  const routeName = route.name == null ? '' : String(route.name)
  if (routeName && matcher.routeNames?.includes(routeName)) {
    return { priority: 3, specificity: routeName.length }
  }

  if (matcher.exactPaths?.includes(route.path)) {
    return { priority: 2, specificity: route.path.length }
  }

  const longestPrefix = (matcher.prefixes || [])
    .filter((prefix) => route.path === prefix || route.path.startsWith(`${prefix}/`))
    .sort((left, right) => right.length - left.length)[0]

  return longestPrefix
    ? { priority: 1, specificity: longestPrefix.length }
    : null
}

const isBetterScore = (candidate: MatcherScore, current: MatcherScore | null) =>
  !current
  || candidate.priority > current.priority
  || (candidate.priority === current.priority && candidate.specificity > current.specificity)

export const resolveUserNavigationItem = (
  route: UserNavigationRoute,
  groups: UserNavigationGroup[] = userNavigationGroups
): { group: UserNavigationGroup; item: UserNavigationItem } | null => {
  let resolved: { group: UserNavigationGroup; item: UserNavigationItem } | null = null
  let resolvedScore: MatcherScore | null = null

  groups.forEach((group) => {
    group.items.forEach((item) => {
      const score = getMatcherScore(item, route)
      if (score && isBetterScore(score, resolvedScore)) {
        resolved = { group, item }
        resolvedScore = score
      }
    })
  })

  return resolved
}

export const resolveUserNavigationGroup = (
  route: UserNavigationRoute,
  groups: UserNavigationGroup[] = userNavigationGroups
) => resolveUserNavigationItem(route, groups)?.group || null

export const isUserNavigationItemActive = (
  item: UserNavigationItem,
  route: UserNavigationRoute
) => getMatcherScore(item, route) !== null
