import {
  Activity,
  BarChart3,
  BookOpenCheck,
  Brain,
  BriefcaseBusiness,
  CalendarCheck2,
  ClipboardCheck,
  Compass,
  FileText,
  Files,
  FlaskConical,
  FolderKanban,
  GraduationCap,
  History,
  Library,
  Map,
  MessageSquare,
  PackageCheck,
  Rocket,
  Search,
  Sparkles,
  Swords,
  Target,
  TrendingUp,
  Trophy,
  UserRoundSearch,
  Wrench
} from 'lucide-vue-next'
import type { Component } from 'vue'

import { appConfig } from '@/config'
import { isV4PreviewAccessEnabled } from '@/features/route-safety'

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

export const userNavigationGroups: UserNavigationGroup[] = [
  {
    key: 'today',
    label: '今日',
    mobileLabel: '今日',
    description: '今日任务、安排和下一步行动',
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
      },
      {
        key: 'agent-tasks',
        label: 'AI 任务中心',
        description: '跟踪生成任务、执行状态和反馈',
        path: '/agent/tasks',
        icon: ClipboardCheck,
        routeNames: ['AgentTasks'],
        exactPaths: ['/agent/tasks']
      },
      {
        key: 'onboarding',
        label: '新手引导',
        description: '补充基础资料并完成首次设置',
        path: '/onboarding',
        icon: Compass,
        routeNames: ['UserOnboarding'],
        exactPaths: ['/onboarding']
      }
    ]
  },
  {
    key: 'prepare',
    label: '简历准备',
    mobileLabel: '简历',
    description: '创建、维护和优化求职简历',
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
      },
      {
        key: 'resume-versions',
        label: '简历版本',
        description: '查看和恢复历史简历版本',
        path: '/resume-versions',
        icon: History,
        featureFlag: 'v4Preview',
        routeNames: ['ResumeVersions', 'ResumeVersionsByResume'],
        exactPaths: ['/resume-versions']
      },
    ]
  },
  {
    key: 'matching',
    label: '岗位匹配',
    mobileLabel: '匹配',
    description: '目标岗位、岗位要求分析和投递材料',
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
  },
  {
    key: 'train',
    label: '面试训练',
    mobileLabel: '训练',
    description: '题目练习、学习计划和能力补强',
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
        key: 'favorite-questions',
        label: '收藏复习',
        description: '快速返回已收藏的重点题目',
        path: '/questions/favorites',
        icon: Trophy,
        routeNames: ['FavoriteQuestions'],
        exactPaths: ['/questions/favorites']
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
      },
      {
        key: 'daily-tasks',
        label: '每日任务',
        description: '执行学习计划中的日常任务',
        path: '/daily-tasks',
        icon: CalendarCheck2,
        routeNames: ['DailyTasks'],
        exactPaths: ['/daily-tasks']
      },
      {
        key: 'weakness-analysis',
        label: '薄弱点分析',
        description: '定位知识和训练中的能力缺口',
        path: '/weakness-analysis',
        icon: Activity,
        routeNames: ['WeaknessAnalysis'],
        exactPaths: ['/weakness-analysis']
      },
      {
        key: 'arena-leaderboard',
        label: '训练统计',
        description: '查看练习记录和训练表现',
        path: '/arena/leaderboard',
        icon: Trophy,
        routeNames: ['ArenaLeaderboard'],
        exactPaths: ['/arena/leaderboard']
      },
      {
        key: 'arena-battle',
        label: '协作练习',
        description: '进入双人答题练习',
        path: '/arena/battle',
        icon: Swords,
        routeNames: ['ArenaBattle'],
        exactPaths: ['/arena/battle']
      }
    ]
  },
  {
    key: 'interview',
    label: '模拟面试',
    mobileLabel: '面试',
    description: '模拟面试、报告和复盘记录',
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
        label: '面试复盘',
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
    key: 'progress',
    label: '投递管理',
    mobileLabel: '投递',
    description: '投递推进、求职日历和行动复盘',
    path: '/applications',
    icon: BriefcaseBusiness,
    items: [
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
        description: '查看安排、提醒和事件准备',
        path: '/career-calendar',
        icon: CalendarCheck2,
        routeNames: ['CareerCalendar'],
        exactPaths: ['/career-calendar']
      },
      {
        key: 'agent-reviews',
        label: '求职日志',
        description: '回顾行动完成情况和关键反馈',
        path: '/agent/reviews',
        icon: ClipboardCheck,
        featureFlag: 'v4Growth',
        routeNames: ['AgentReviews'],
        exactPaths: ['/agent/reviews']
      },
      {
        key: 'weekly-reports',
        label: '求职周报',
        description: '查看本周事实、变化和下一步行动',
        path: '/agent/weekly-reports',
        icon: BarChart3,
        featureFlag: 'v6WeeklyReport',
        routeNames: ['AgentWeeklyReports'],
        exactPaths: ['/agent/weekly-reports']
      },
      {
        key: 'job-experiments',
        label: '求职实验台',
        description: '管理实验策略、执行过程和复盘结果',
        path: '/job-experiments',
        icon: FlaskConical,
        routeNames: [
          'JobExperiments',
          'JobExperimentCreate',
          'JobExperimentEdit',
          'JobExperimentReview',
          'JobExperimentDetail'
        ],
        exactPaths: ['/job-experiments'],
        prefixes: ['/job-experiments']
      }
    ]
  },
  {
    key: 'resources',
    label: '求职资料',
    mobileLabel: '资料',
    description: '项目证据、个人资料和求职资产',
    path: '/project-evidence',
    icon: FolderKanban,
    compactOverflow: true,
    items: [
      {
        key: 'project-evidence',
        label: '项目证据库',
        description: '沉淀项目素材和可复用能力证据',
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
      },
      {
        key: 'evidence-assets',
        label: '证据使用',
        description: '回看证据使用、结果反馈和观察',
        path: '/evidence-assets',
        icon: ClipboardCheck,
        featureFlag: 'v9EvidenceLearning',
        routeNames: ['EvidenceAssets'],
        exactPaths: ['/evidence-assets']
      },
      {
        key: 'knowledge',
        label: '个人知识库',
        description: '管理可供 AI 使用的个人资料',
        path: '/knowledge',
        icon: Library,
        featureFlag: 'v4Knowledge',
        routeNames: ['PersonalKnowledgeBase'],
        exactPaths: ['/knowledge']
      },
      {
        key: 'portfolio-demo',
        label: '作品集演示',
        description: '整理可展示的项目与成果',
        path: '/portfolio-demo',
        icon: Sparkles,
        routeNames: ['PortfolioDemo'],
        exactPaths: ['/portfolio-demo']
      },
      {
        key: 'projects',
        label: '项目经历',
        description: '维护简历和面试可用的项目经历',
        path: '/projects',
        icon: PackageCheck,
        routeNames: ['ProjectExperience'],
        exactPaths: ['/projects']
      },
      {
        key: 'tools',
        label: '记录与工具',
        description: '访问兼容保留的工具目录',
        path: '/tools',
        icon: Wrench,
        routeNames: ['RecordsTools'],
        exactPaths: ['/tools']
      }
    ]
  },
  {
    key: 'growth',
    label: '成长分析',
    mobileLabel: '成长',
    description: '能力画像、训练分析和长期趋势',
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
        key: 'personal-analytics',
        label: '训练分析',
        description: '查看训练效果和个人趋势',
        path: '/analytics/personal',
        icon: BarChart3,
        routeNames: ['PersonalAnalytics'],
        exactPaths: ['/analytics/personal']
      },
      {
        key: 'growth-profile',
        label: '成长档案',
        description: '查看能力、就绪度和长期变化',
        path: '/growth/profile',
        icon: TrendingUp,
        featureFlag: 'v4Growth',
        routeNames: ['GrowthProfile', 'GrowthSkillsTrend', 'GrowthReadinessTrend'],
        exactPaths: ['/growth/profile'],
        prefixes: ['/growth']
      },
      {
        key: 'agent-memory',
        label: '长期记忆',
        description: '管理 AI 教练使用的长期上下文',
        path: '/agent/memory',
        icon: Brain,
        featureFlag: 'v4Growth',
        routeNames: ['AgentMemory'],
        exactPaths: ['/agent/memory']
      }
    ]
  }
]

export const mobilePrimaryNavigationKeys: UserNavigationGroupKey[] = [
  'today',
  'prepare',
  'train',
  'progress'
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

export const getVisibleUserNavigationGroups = (
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
