import { getLatestDailyPlanApi, getTodayAgentTasksApi } from '@/api/agent'
import { getUserDashboardOverviewApi, getV3DashboardOverviewApi } from '@/api/dashboard'
import { getWrongQuestionsApi } from '@/api/question'
import {
  fetchRequestCache,
  invalidateRequestCache,
  invalidateRequestCacheByPrefix
} from '@/composables/useRequestCache'
import type { AgentTodayTaskVO, DailyPlanVO } from '@/types/agent'
import type { PageResult } from '@/types/api'
import type { UserDashboardOverviewVO } from '@/types/dashboard'
import type { V3DashboardOverviewVO } from '@/types/dashboard'
import type { WrongQuestionVO } from '@/types/question'

const PREFIX = 'user-home:'
const OVERVIEW_KEY = `${PREFIX}overview`
const V3_OVERVIEW_KEY = `${PREFIX}v3-overview`
const WRONG_QUESTIONS_KEY = `${PREFIX}wrong-questions:latest`
const DAILY_PLAN_PREFIX = `${PREFIX}daily-plan:`
const TODAY_TASKS_PREFIX = `${PREFIX}today-tasks:`

const TTL = {
  overview: 30000,
  v3Overview: 30000,
  dailyPlan: 20000,
  todayTasks: 15000,
  wrongQuestions: 60000
}

const withCache = async <T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>,
  force = false
): Promise<T> => {
  return fetchRequestCache(key, ttl, fetcher, force)
}

const invalidateRequestCachePrefix = (prefix: string) => {
  invalidateRequestCacheByPrefix(prefix)
}

const scopedDateKey = (prefix: string, date: string, targetJobId?: number) =>
  `${prefix}${date}:target:${targetJobId || 'current'}`

export const fetchCachedDashboardOverview = (force = false): Promise<UserDashboardOverviewVO> =>
  withCache(OVERVIEW_KEY, TTL.overview, getUserDashboardOverviewApi, force)

export const fetchCachedV3DashboardOverview = (force = false): Promise<V3DashboardOverviewVO> =>
  withCache(V3_OVERVIEW_KEY, TTL.v3Overview, () => getV3DashboardOverviewApi({ silentError: true }), force)

export const fetchCachedLatestDailyPlan = (
  date: string,
  force = false,
  targetJobId?: number
): Promise<DailyPlanVO> =>
  withCache(
    scopedDateKey(DAILY_PLAN_PREFIX, date, targetJobId),
    TTL.dailyPlan,
    () => getLatestDailyPlanApi({ date, targetJobId }),
    force
  )

export const fetchCachedTodayAgentTasks = (
  date: string,
  force = false,
  targetJobId?: number
): Promise<AgentTodayTaskVO> =>
  withCache(
    scopedDateKey(TODAY_TASKS_PREFIX, date, targetJobId),
    TTL.todayTasks,
    () => getTodayAgentTasksApi({ date, targetJobId }),
    force
  )

export const fetchCachedWrongQuestions = (force = false): Promise<PageResult<WrongQuestionVO>> =>
  withCache(
    WRONG_QUESTIONS_KEY,
    TTL.wrongQuestions,
    () => getWrongQuestionsApi({ pageNum: 1, pageSize: 5 }, { silentError: true }),
    force
  )

export const invalidateUserHomeOverviewCache = () => {
  invalidateRequestCache(OVERVIEW_KEY)
  invalidateRequestCache(V3_OVERVIEW_KEY)
}

export const invalidateUserHomeDailyPlanCache = (date?: string, targetJobId?: number) => {
  if (date) {
    if (targetJobId) {
      invalidateRequestCache(scopedDateKey(DAILY_PLAN_PREFIX, date, targetJobId))
      return
    }
    invalidateRequestCachePrefix(`${DAILY_PLAN_PREFIX}${date}:`)
    return
  }
  invalidateRequestCachePrefix(DAILY_PLAN_PREFIX)
}

export const invalidateUserHomeTodayTasksCache = (date?: string, targetJobId?: number) => {
  if (date) {
    if (targetJobId) {
      invalidateRequestCache(scopedDateKey(TODAY_TASKS_PREFIX, date, targetJobId))
      return
    }
    invalidateRequestCachePrefix(`${TODAY_TASKS_PREFIX}${date}:`)
    return
  }
  invalidateRequestCachePrefix(TODAY_TASKS_PREFIX)
}

export const invalidateUserHomeWrongQuestionsCache = () => {
  invalidateRequestCache(WRONG_QUESTIONS_KEY)
}

export const invalidateUserHomeTrainingCaches = (date?: string, targetJobId?: number) => {
  invalidateUserHomeOverviewCache()
  invalidateUserHomeDailyPlanCache(date, targetJobId)
  invalidateUserHomeTodayTasksCache(date, targetJobId)
}
