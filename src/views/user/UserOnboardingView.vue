<template>
  <div class="onboarding-page page-shell">
    <section class="onboarding-hero">
      <div>
        <div class="eyebrow">
          <RouteIcon :size="16" />
          新手引导
        </div>
        <h1>先建立一个轻量求职目标</h1>
        <p>
          按“简历证据、岗位描述、匹配画像、今日任务”4 步推进。下面的偏好设置只用于校准训练方向；
          缺少简历或岗位描述时只提示下一步，不生成缺少依据的诊断结果。
        </p>
      </div>
      <div class="hero-actions">
        <el-button @click="router.push('/dashboard')">先看今日计划</el-button>
        <el-button type="primary" :loading="realProgressLoading" @click="router.push(realPrimaryAction.path)">
          {{ realPrimaryAction.label }}
          <ChevronRight :size="16" />
        </el-button>
      </div>
    </section>

    <section class="real-progress-panel" v-loading="realProgressLoading">
      <div class="real-progress-head">
        <div>
          <span>真实 4 步闭环</span>
          <h2>按当前资料判断下一步，不用重新猜入口</h2>
          <p>这里只读取简历、岗位描述、成功匹配画像和今日任务；失败或生成中的报告不会被当成训练证据。</p>
        </div>
        <div class="real-progress-head__action">
          <el-tag effect="plain">{{ realReadinessText }}</el-tag>
          <el-button size="small" :loading="realProgressLoading" @click="loadRealProgress(true)">刷新</el-button>
        </div>
      </div>
      <el-alert
        v-if="realProgressError"
        class="real-progress-alert"
        type="warning"
        :closable="false"
        :title="realProgressError"
        show-icon
      />
      <div class="real-journey-grid">
        <button
          v-for="step in realJourneySteps"
          :key="step.key"
          class="real-journey-card"
          :class="{ ready: step.ready }"
          type="button"
          @click="router.push(step.path)"
        >
          <span class="real-journey-card__index">{{ step.order }}</span>
          <component :is="step.icon" :size="20" />
          <strong>{{ step.title }}</strong>
          <small>{{ step.desc }}</small>
          <em>{{ step.status }}</em>
        </button>
      </div>
      <div class="real-next-action">
        <div>
          <span>推荐下一步</span>
          <strong>{{ realPrimaryAction.title }}</strong>
          <p>{{ realPrimaryAction.desc }}</p>
        </div>
        <el-button type="primary" @click="router.push(realPrimaryAction.path)">
          {{ realPrimaryAction.label }}
        </el-button>
      </div>
    </section>

    <div class="onboarding-layout">
      <aside class="guide-rail">
        <div class="rail-head">
          <h2>可选偏好微调</h2>
          <p>不计入上方 4 步闭环；只用于记录训练偏好，不替代简历、岗位描述或匹配画像。</p>
        </div>
        <button
          v-for="(step, index) in steps"
          :key="step.key"
          class="step-item"
          :class="{ active: currentStepIndex === index, done: index < currentStepIndex }"
          type="button"
          @click="currentStepIndex = index"
        >
          <span>{{ index + 1 }}</span>
          <div>
            <strong>{{ step.title }}</strong>
            <small>{{ step.desc }}</small>
          </div>
        </button>
      </aside>

      <section class="setup-panel">
        <div class="panel-head">
          <div>
            <span>偏好项 {{ currentStepIndex + 1 }} / {{ steps.length }}</span>
            <h2>{{ currentStep.title }}</h2>
            <p>{{ currentStep.desc }}</p>
          </div>
          <el-tag effect="plain">{{ readinessText }}</el-tag>
        </div>

        <div v-if="currentStep.key === 'path'" class="choice-grid">
          <button
            v-for="item in pathOptions"
            :key="item.key"
            class="choice-card"
            :class="{ selected: selectedPath === item.key }"
            type="button"
            @click="selectedPath = item.key"
          >
            <component :is="item.icon" :size="20" />
            <strong>{{ item.title }}</strong>
            <span>{{ item.desc }}</span>
          </button>
        </div>

        <div v-else-if="currentStep.key === 'target'" class="choice-grid">
          <button
            v-for="item in targetOptions"
            :key="item"
            class="choice-card compact"
            :class="{ selected: selectedTarget === item }"
            type="button"
            @click="selectedTarget = item"
          >
            <Target :size="19" />
            <strong>{{ item }}</strong>
            <span>后续训练会按这个方向组织面试深度和题目重点。</span>
          </button>
        </div>

        <div v-else-if="currentStep.key === 'experience'" class="form-grid">
          <label class="field-block">
            <span>工作年限</span>
            <el-select v-model="experienceLevel" placeholder="选择年限">
              <el-option v-for="item in experienceOptions" :key="item" :label="item" :value="item" />
            </el-select>
          </label>
          <label class="field-block">
            <span>最近面试时间</span>
            <el-select v-model="interviewWindow" placeholder="选择时间">
              <el-option v-for="item in interviewWindowOptions" :key="item" :label="item" :value="item" />
            </el-select>
          </label>
          <div class="coach-note">
            <Lightbulb :size="18" />
            <p>{{ experienceHint }}</p>
          </div>
        </div>

        <div v-else-if="currentStep.key === 'stack'" class="tech-grid">
          <button
            v-for="item in techOptions"
            :key="item"
            class="tech-chip"
            :class="{ selected: selectedTechStack.includes(item) }"
            type="button"
            @click="toggleTech(item)"
          >
            {{ item }}
          </button>
        </div>

        <div v-else-if="currentStep.key === 'resume'" class="action-card">
          <FileText :size="30" />
          <div>
            <h3>补一份简历，推荐才会更准</h3>
            <p>去简历页新建或上传后，首页和面试创建页会使用这份简历作为训练依据。</p>
          </div>
          <div class="action-card__buttons">
            <el-button type="primary" @click="router.push('/resumes/create')">新建简历</el-button>
            <el-button @click="router.push('/resumes')">查看简历与岗位</el-button>
          </div>
        </div>

        <div v-else-if="currentStep.key === 'jd'" class="action-card">
          <ClipboardList :size="30" />
          <div>
            <h3>把岗位描述放到岗位目标里分析</h3>
            <p>已有岗位描述时，建议先建岗位目标再做题库推荐和模拟面试；没有岗位描述时也可以先按岗位方向体验。</p>
          </div>
          <div class="action-card__buttons">
            <el-button type="primary" @click="router.push('/job-targets/create')">新建岗位目标</el-button>
            <el-button @click="router.push('/job-targets')">查看岗位目标</el-button>
          </div>
        </div>

        <div v-else class="finish-panel">
          <div class="finish-main">
            <CheckCircle :size="34" />
            <div>
              <h3>可以进入第一轮准备了</h3>
              <p>{{ finalHint }}</p>
            </div>
          </div>
          <div class="summary-list">
            <article v-for="item in readinessItems" :key="item.label" :class="{ done: item.done }">
              <span>{{ item.done ? '已选择' : '待补充' }}</span>
              <strong>{{ item.label }}</strong>
              <p>{{ item.value }}</p>
            </article>
          </div>
        </div>

        <div class="step-actions">
          <el-button :disabled="currentStepIndex === 0" @click="goPrev">上一步</el-button>
          <el-button v-if="!isLastStep" type="primary" @click="goNext">
            下一步
            <ChevronRight :size="16" />
          </el-button>
          <el-button v-else type="primary" @click="router.push(realPrimaryAction.path)">
            {{ realPrimaryAction.label }}
          </el-button>
          <el-button text @click="router.push('/dashboard')">跳过引导</el-button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  CheckCircle,
  ChevronRight,
  ClipboardList,
  FileText,
  Gauge,
  Lightbulb,
  MessageSquare,
  Sparkles,
  Route as RouteIcon,
  Target
} from 'lucide-vue-next'
import { computed, onMounted, ref, type Component } from 'vue'
import { useRouter } from 'vue-router'

import {
  fetchCachedDashboardOverview,
  fetchCachedLatestDailyPlan,
  fetchCachedTodayAgentTasks,
  fetchCachedV3DashboardOverview
} from '@/composables/useUserHomeDataCache'
import type { AgentTaskVO, DailyPlanVO } from '@/types/agent'
import type { UserDashboardOverviewVO, V3DashboardOverviewVO } from '@/types/dashboard'
import { getErrorMessage } from '@/utils/error'
import { formatLocalDate } from '@/utils/format'

interface StepItem {
  key: string
  title: string
  desc: string
}

interface ChoiceItem {
  key: string
  title: string
  desc: string
  icon: Component
}

interface RealJourneyStep {
  key: string
  order: number
  title: string
  desc: string
  status: string
  path: string
  icon: Component
  ready: boolean
}

interface RealPrimaryAction {
  title: string
  desc: string
  label: string
  path: string
}

const router = useRouter()

const steps: StepItem[] = [
  { key: 'path', title: '选择路径', desc: '先决定从哪里开始准备' },
  { key: 'target', title: '目标岗位', desc: '确定面试训练方向' },
  { key: 'experience', title: '经验年限', desc: '校准题目深度和表达要求' },
  { key: 'stack', title: '技术栈', desc: '选择本轮重点突破项' },
  { key: 'resume', title: '简历材料', desc: '引导到简历页面' },
  { key: 'jd', title: '岗位描述', desc: '引导到岗位目标页面' },
  { key: 'finish', title: '进入训练', desc: '给出下一步动作' }
]

const pathOptions: ChoiceItem[] = [
  {
    key: 'full',
    title: '完整诊断',
    desc: '先补简历和岗位描述，再生成更准确的今日计划。',
    icon: Gauge
  },
  {
    key: 'plan',
    title: '先看今日计划',
    desc: '用已有资料进入首页，缺资料时显示明确待补充项。',
    icon: Target
  },
  {
    key: 'interview',
    title: '只做模拟面试',
    desc: '跳过长流程，直接进入可追问的面试训练。',
    icon: MessageSquare
  },
  {
    key: 'jd',
    title: '只有岗位描述',
    desc: '先建立岗位目标，再做匹配、题库和面试训练。',
    icon: ClipboardList
  }
]

const targetOptions = ['Java 后端', 'Java 实习生', '中级 Java', 'Spring Cloud 后端']
const experienceOptions = ['应届 / 实习', '1-3 年', '3-5 年', '5 年以上']
const interviewWindowOptions = ['一周内', '两周内', '一个月内', '暂未确定']
const techOptions = ['Java 并发', 'Spring Cloud', 'MySQL', 'Redis', 'RocketMQ', 'Elasticsearch']

const currentStepIndex = ref(0)
const selectedPath = ref('plan')
const selectedTarget = ref('Java 后端')
const experienceLevel = ref('1-3 年')
const interviewWindow = ref('两周内')
const selectedTechStack = ref<string[]>(['Java 并发', 'Spring Cloud', 'MySQL', 'Redis'])
const overview = ref<UserDashboardOverviewVO | null>(null)
const v3Overview = ref<V3DashboardOverviewVO | null>(null)
const dailyPlan = ref<DailyPlanVO | null>(null)
const agentTasks = ref<AgentTaskVO[]>([])
const realProgressLoading = ref(false)
const realProgressError = ref('')

const currentStep = computed(() => steps[currentStepIndex.value])
const isLastStep = computed(() => currentStepIndex.value === steps.length - 1)
const readinessText = computed(() => `${Math.min(currentStepIndex.value + 1, steps.length)} 个偏好项已浏览`)
const hasResume = computed(() => Boolean(overview.value?.resumeCount))
const hasTargetJob = computed(() => Boolean(v3Overview.value?.currentTargetJob?.targetJobId || v3Overview.value?.currentTargetJob?.id))
const latestMatchStatus = computed(() => String(v3Overview.value?.latestMatch?.status || '').toUpperCase())
const hasSuccessfulMatchSignal = computed(() => Boolean(
  latestMatchStatus.value === 'SUCCESS' &&
  (v3Overview.value?.latestMatch?.matchReportId || v3Overview.value?.latestMatch?.reportId)
))
const hasResumeOptimizeSignal = computed(() => Boolean(!v3Overview.value?.latestMatch && overview.value?.recentResumeOptimize))
const hasMatchSignal = computed(() => hasSuccessfulMatchSignal.value || hasResumeOptimizeSignal.value)
const hasTodayPlan = computed(() => Boolean(agentTasks.value.length || dailyPlan.value?.tasks?.length || overview.value?.todayTaskCount))
const realReadyCount = computed(() => realJourneySteps.value.filter((step) => step.ready).length)
const realReadinessText = computed(() => `${realReadyCount.value} / ${realJourneySteps.value.length} 已接入`)

const realJourneySteps = computed<RealJourneyStep[]>(() => [
  {
    key: 'resume',
    order: 1,
    title: '简历证据',
    desc: hasResume.value ? `已有 ${overview.value?.resumeCount || 0} 份简历` : '先创建或上传一份简历',
    status: hasResume.value ? '已接入' : '待补充',
    path: '/resumes',
    icon: FileText,
    ready: hasResume.value
  },
  {
    key: 'target',
    order: 2,
    title: '岗位描述',
    desc: hasTargetJob.value ? targetJobSummary.value : '建立岗位目标，后续匹配和题库会更准',
    status: hasTargetJob.value ? '已接入' : '建议补充',
    path: '/job-targets',
    icon: ClipboardList,
    ready: hasTargetJob.value
  },
  {
    key: 'match',
    order: 3,
    title: '匹配画像',
    desc: hasMatchSignal.value ? matchSummary.value : '用简历和岗位识别优势、风险和关键词缺口',
    status: hasMatchSignal.value ? '可继续' : '待分析',
    path: hasMatchSignal.value ? '/resume-match' : '/resume-match',
    icon: Target,
    ready: hasMatchSignal.value
  },
  {
    key: 'today',
    order: 4,
    title: '今日任务',
    desc: hasTodayPlan.value ? '已有可继续推进的今日任务' : '生成今天最该做的 3 个动作',
    status: hasTodayPlan.value ? '可继续' : '待生成',
    path: hasTodayPlan.value ? '/agent/tasks' : '/agent/today',
    icon: Sparkles,
    ready: hasTodayPlan.value
  }
])

const targetJobSummary = computed(() => {
  const job = v3Overview.value?.currentTargetJob
  if (!job) return '岗位目标已接入'
  return [job.jobTitle, job.companyName, job.jobLevel].filter(Boolean).join(' · ') || '岗位目标已接入'
})

const matchSummary = computed(() => {
  const match = v3Overview.value?.latestMatch
  if (latestMatchStatus.value === 'FAILED') return '上次匹配失败，请先重新生成报告'
  if (match && latestMatchStatus.value !== 'SUCCESS') return '匹配报告仍在生成中，完成后会补充到训练建议里'
  if (match?.overallScore != null) return `最近匹配 ${match.overallScore} 分，可继续做推荐训练`
  if (match?.summary) return match.summary
  if (overview.value?.recentResumeOptimize) return '已有简历优化记录，可继续匹配画像'
  return '已有匹配信号'
})

const realPrimaryAction = computed<RealPrimaryAction>(() => {
  if (!hasResume.value) {
    return {
      title: '先补一份简历',
      desc: '简历是岗位匹配、题库推荐和面试追问的证据来源。没有简历时先给通用建议，并提示你补齐关键资料。',
      label: '补充简历',
      path: '/resumes'
    }
  }

  if (!hasTargetJob.value) {
    return {
      title: '补一个目标岗位',
      desc: '有了岗位目标后，简历匹配、推荐题和模拟面试才能围绕同一个方向推进。',
      label: '新建岗位目标',
      path: '/job-targets/create'
    }
  }

  if (!hasMatchSignal.value) {
    return {
      title: '先做一次简历岗位匹配',
      desc: '匹配报告会把简历证据、岗位要求和关键词缺口串起来，后续训练才不会散。',
      label: '生成匹配画像',
      path: '/resume-match'
    }
  }

  if (!hasTodayPlan.value) {
    return {
      title: '生成今天的训练任务',
      desc: '已有资料和反馈后，再生成今日任务，推荐会更像教练安排，而不是普通功能菜单。',
      label: '生成今日计划',
      path: '/agent/today'
    }
  }

  return {
    title: '继续今天的第一项任务',
    desc: '今日任务已经生成，先完成一个动作，再提交反馈让下一轮推荐更准。',
    label: '进入任务中心',
    path: '/agent/tasks'
  }
})

const experienceHint = computed(() => {
  if (experienceLevel.value.includes('应届')) return '应届或实习岗位更需要项目表述、基础知识和实习经历可信度。'
  if (experienceLevel.value.includes('5')) return '高年限面试会更关注架构边界、团队协作、性能治理和复盘能力。'
  return '1-5 年社招用户需要同时证明基础扎实、项目贡献明确、线上问题处理可靠。'
})

const finalHint = computed(() => {
  if (selectedPath.value === 'full') return '建议先补简历和岗位描述，再回到今日计划生成更可信的训练路径。'
  if (selectedPath.value === 'interview') return '可以先创建一次模拟面试，面试报告会继续推动题库和学习计划。'
  if (selectedPath.value === 'jd') return '先把岗位描述放到岗位目标里，后续题库推荐和简历匹配会更贴近目标岗位。'
  return '先进入今日计划，系统会按已有资料展示下一步；缺资料时会提示补充。'
})

const readinessItems = computed(() => [
  { label: '准备路径', value: pathOptions.find((item) => item.key === selectedPath.value)?.title || '-', done: true },
  { label: '目标岗位', value: selectedTarget.value, done: Boolean(selectedTarget.value) },
  { label: '经验年限', value: `${experienceLevel.value} · ${interviewWindow.value}`, done: Boolean(experienceLevel.value) },
  { label: '重点技术栈', value: selectedTechStack.value.join('、') || '未选择', done: selectedTechStack.value.length > 0 },
  { label: '简历材料', value: '需要在简历页创建或上传', done: false },
  { label: '岗位描述', value: '需要在岗位目标页创建并分析', done: false }
])

const goNext = () => {
  currentStepIndex.value = Math.min(currentStepIndex.value + 1, steps.length - 1)
}

const goPrev = () => {
  currentStepIndex.value = Math.max(currentStepIndex.value - 1, 0)
}

const toggleTech = (item: string) => {
  if (selectedTechStack.value.includes(item)) {
    selectedTechStack.value = selectedTechStack.value.filter((tech) => tech !== item)
    return
  }
  selectedTechStack.value = [...selectedTechStack.value, item]
}

const loadRealProgress = async (force = false) => {
  realProgressLoading.value = true
  realProgressError.value = ''
  try {
    const [overviewResult, v3OverviewResult, dailyPlanResult, todayTasksResult] = await Promise.allSettled([
      fetchCachedDashboardOverview(force),
      fetchCachedV3DashboardOverview(force),
      fetchCachedLatestDailyPlan(formatLocalDate(), force),
      fetchCachedTodayAgentTasks(formatLocalDate(), force)
    ])

    if (overviewResult.status === 'fulfilled') {
      overview.value = overviewResult.value
    }
    if (v3OverviewResult.status === 'fulfilled') {
      v3Overview.value = v3OverviewResult.value
    }
    if (dailyPlanResult.status === 'fulfilled') {
      dailyPlan.value = dailyPlanResult.value
    }
    if (todayTasksResult.status === 'fulfilled') {
      agentTasks.value = todayTasksResult.value.tasks || []
    }
    const firstFailure = [overviewResult, v3OverviewResult, dailyPlanResult, todayTasksResult]
      .find((item): item is PromiseRejectedResult => item.status === 'rejected')
    if (firstFailure) {
      realProgressError.value = getErrorMessage(firstFailure.reason, '部分真实进度暂时不可用，已保留可执行入口。')
    }
  } finally {
    realProgressLoading.value = false
  }
}

onMounted(() => {
  loadRealProgress(false)
})
</script>

<style scoped lang="scss">
.onboarding-page {
  display: grid;
  gap: 20px;
}

.onboarding-hero,
.real-progress-panel,
.guide-rail,
.setup-panel {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: var(--app-shadow);
}

.onboarding-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 28px;

  h1 {
    margin: 12px 0 10px;
    color: var(--app-text);
    font-size: 40px;
    line-height: 1.1;
  }

  p {
    max-width: 760px;
    margin: 0;
    color: var(--app-text-muted);
    font-size: 16px;
    line-height: 1.75;
  }
}

.eyebrow,
.hero-actions,
.step-actions,
.action-card__buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.eyebrow {
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
}

.hero-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.real-progress-panel {
  display: grid;
  gap: 16px;
  padding: 20px;
}

.real-progress-head,
.real-next-action {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.real-progress-head {
  span {
    color: #2563eb;
    font-size: 12px;
    font-weight: 800;
  }

  h2 {
    margin: 8px 0;
    font-size: 22px;
  }

  p {
    margin: 0;
    color: var(--app-text-muted);
    line-height: 1.65;
  }
}

.real-progress-head__action {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.real-progress-alert {
  margin: 0;
}

.real-journey-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.real-journey-card {
  position: relative;
  display: grid;
  gap: 9px;
  min-height: 160px;
  padding: 16px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  color: var(--app-text);
  font: inherit;
  text-align: left;
  cursor: pointer;

  svg {
    color: #2563eb;
  }

  strong,
  small,
  em {
    position: relative;
    z-index: 1;
  }

  strong {
    font-size: 16px;
  }

  small {
    color: var(--app-text-muted);
    line-height: 1.55;
  }

  em {
    align-self: end;
    color: #475569;
    font-size: 12px;
    font-style: normal;
    font-weight: 800;
  }

  &:hover,
  &.ready {
    border-color: #bfdbfe;
    background: #eff6ff;
  }

  &.ready {
    em {
      color: #15803d;
    }
  }
}

.real-journey-card__index {
  position: absolute;
  right: 12px;
  top: 10px;
  color: rgba(37, 99, 235, 0.12);
  font-size: 46px;
  font-weight: 900;
  line-height: 1;
}

.real-next-action {
  align-items: center;
  padding: 16px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;

  span {
    display: block;
    color: #2563eb;
    font-size: 12px;
    font-weight: 800;
  }

  strong {
    display: block;
    margin-top: 6px;
    font-size: 18px;
  }

  p {
    margin: 6px 0 0;
    color: #475569;
    line-height: 1.6;
  }
}

.onboarding-layout {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 18px;
}

.guide-rail {
  align-self: start;
  padding: 18px;
}

.rail-head {
  margin-bottom: 14px;

  h2 {
    margin: 0 0 8px;
    font-size: 18px;
  }

  p {
    margin: 0;
    color: var(--app-text-muted);
    font-size: 13px;
    line-height: 1.6;
  }
}

.step-item {
  display: flex;
  width: 100%;
  gap: 10px;
  padding: 11px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--app-text);
  font: inherit;
  text-align: left;
  cursor: pointer;

  & + & {
    margin-top: 6px;
  }

  > span {
    display: inline-flex;
    flex: 0 0 28px;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: #f1f5f9;
    color: #64748b;
    font-size: 12px;
    font-weight: 800;
  }

  strong,
  small {
    display: block;
  }

  strong {
    font-size: 14px;
  }

  small {
    margin-top: 4px;
    color: var(--app-text-muted);
    line-height: 1.45;
  }

  &.active,
  &:hover {
    border-color: #bfdbfe;
    background: #eff6ff;

    > span {
      background: #2563eb;
      color: #ffffff;
    }
  }

  &.done > span {
    background: #dcfce7;
    color: #15803d;
  }
}

.setup-panel {
  min-height: 520px;
  padding: 22px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;

  span {
    color: #2563eb;
    font-size: 12px;
    font-weight: 800;
  }

  h2 {
    margin: 8px 0;
    font-size: 24px;
  }

  p {
    margin: 0;
    color: var(--app-text-muted);
  }
}

.choice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.choice-card {
  display: grid;
  gap: 10px;
  min-height: 154px;
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: #f8fafc;
  color: var(--app-text);
  font: inherit;
  text-align: left;
  cursor: pointer;

  svg {
    color: #2563eb;
  }

  strong {
    font-size: 17px;
  }

  span {
    color: var(--app-text-muted);
    line-height: 1.6;
  }

  &.compact {
    min-height: 136px;
  }

  &.selected,
  &:hover {
    border-color: #93c5fd;
    background: #eff6ff;
  }
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.field-block {
  display: grid;
  gap: 8px;

  span {
    color: var(--app-text);
    font-weight: 700;
  }
}

.coach-note {
  display: flex;
  grid-column: 1 / -1;
  gap: 10px;
  padding: 14px;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  background: #fff7ed;
  color: #9a3412;

  p {
    margin: 0;
    line-height: 1.7;
  }
}

.tech-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tech-chip {
  min-height: 42px;
  padding: 0 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: #ffffff;
  color: #334155;
  font: inherit;
  font-weight: 700;
  cursor: pointer;

  &.selected,
  &:hover {
    border-color: #93c5fd;
    background: #eff6ff;
    color: #1d4ed8;
  }
}

.action-card,
.finish-panel {
  display: grid;
  gap: 18px;
  padding: 22px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: #f8fafc;

  svg {
    color: #2563eb;
  }

  h3 {
    margin: 0 0 8px;
    font-size: 21px;
  }

  p {
    margin: 0;
    color: var(--app-text-muted);
    line-height: 1.7;
  }
}

.finish-main {
  display: flex;
  gap: 12px;
}

.summary-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  article {
    padding: 14px;
    border: 1px solid var(--app-border);
    border-radius: 8px;
    background: #ffffff;

    &.done {
      border-color: #bbf7d0;
      background: #f0fdf4;
    }
  }

  span {
    color: #2563eb;
    font-size: 12px;
    font-weight: 800;
  }

  strong,
  p {
    display: block;
    margin: 0;
  }

  strong {
    margin-top: 8px;
  }

  p {
    margin-top: 6px;
    color: var(--app-text-muted);
  }
}

.step-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  margin-top: 22px;
}

@media (max-width: 980px) {
  .real-journey-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .onboarding-layout,
  .choice-grid,
  .form-grid,
  .summary-list {
    grid-template-columns: 1fr;
  }

  .guide-rail {
    position: static;
  }
}

@media (max-width: 720px) {
  .onboarding-hero,
  .real-progress-head,
  .real-next-action,
  .panel-head,
  .finish-main {
    flex-direction: column;
  }

  .onboarding-hero,
  .real-progress-panel,
  .setup-panel {
    padding: 18px;
  }

  .real-progress-head__action {
    justify-content: space-between;
    width: 100%;
  }

  .real-journey-grid {
    grid-template-columns: 1fr;
  }

  .real-journey-card {
    min-height: 132px;
  }

  .onboarding-hero h1 {
    font-size: 30px;
  }

  .hero-actions,
  .step-actions {
    justify-content: flex-start;
  }
}
</style>
