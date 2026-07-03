import { readFile } from 'node:fs/promises'
import path from 'node:path'

const frontendRoot = process.cwd()

const homeFile = path.join(frontendRoot, 'src/views/user/JobCoachHomeView.vue')
const onboardingFile = path.join(frontendRoot, 'src/views/user/UserOnboardingView.vue')
const cacheFile = path.join(frontendRoot, 'src/composables/useUserHomeDataCache.ts')
const agentApiFile = path.join(frontendRoot, 'src/api/agent.ts')

const [home, onboarding, cache, agentApi] = await Promise.all([
  readFile(homeFile, 'utf8'),
  readFile(onboardingFile, 'utf8'),
  readFile(cacheFile, 'utf8'),
  readFile(agentApiFile, 'utf8')
])

const failures = []
const expect = (condition, message) => {
  if (!condition) failures.push(message)
}

expect(cache.includes('fetchCachedV3DashboardOverview'), 'Home/onboarding cache should expose V3 dashboard overview for real target-job state')
expect(agentApi.includes("targetJobId' | 'date'"), 'Agent latest-plan API should accept targetJobId/date scope')

expect(home.includes('fetchCachedV3DashboardOverview'), 'JobCoachHome should read V3 overview for current target job')
expect(home.includes('V3DashboardOverviewVO'), 'JobCoachHome should type the V3 overview state')
expect(home.includes('const v3Overview = ref<V3DashboardOverviewVO | null>(null)'), 'JobCoachHome should store V3 overview state')
expect(home.includes('const currentTargetJob = computed'), 'JobCoachHome should derive current target job from V3 overview')
expect(home.includes('const currentTargetJobId = computed'), 'JobCoachHome should derive current target job id')
expect(home.includes('const hasTargetJobSignal = computed(() => Boolean(currentTargetJobId.value))'), 'Target job readiness must be based on real current target job id')
expect(!home.includes("const hasTargetJobSignal = computed(() => Boolean(dailyPlan.value?.targetJobTitle || overview.value?.recentInterview?.title))"), 'Target job readiness must not rely on daily plan title or recent interview title')
expect(home.includes('fetchCachedLatestDailyPlan(formatLocalDate(), shouldForceRefresh(force), currentTargetJobId.value)'), 'Home latest plan fetch should use current target-job scope')
expect(home.includes('fetchCachedTodayAgentTasks(formatLocalDate(), shouldForceRefresh(force), currentTargetJobId.value)'), 'Home today tasks fetch should use current target-job scope')
expect(home.includes('targetJobId: currentTargetJobId.value || undefined'), 'Home generate plan action should pass targetJobId when known')
expect(home.includes('fetchV3Overview(false)'), 'Home should load V3 overview on mount')
expect(home.includes('fetchV3Overview(true, true)'), 'Home should refresh V3 overview after plan/task mutation')
expect(home.includes("if (!hasTargetJobSignal.value) return '先设定目标岗位后，今日计划会更可信。'"), 'Empty task copy should guide missing target job before plan generation')

expect(onboarding.includes('fetchCachedV3DashboardOverview'), 'Onboarding should read V3 overview for first-day loop')
expect(onboarding.includes('realJourneySteps'), 'Onboarding should expose real journey steps')
expect(onboarding.includes('realPrimaryAction'), 'Onboarding should derive the next real action')
expect(onboarding.includes('hasTargetJob'), 'Onboarding should gate progress by target job')
expect(onboarding.includes('hasTodayPlan'), 'Onboarding should include first daily plan readiness')

if (failures.length) {
  console.error(`Phase 7 first-day onboarding checks failed: ${failures.length}`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Phase 7 first-day onboarding checks passed.')
