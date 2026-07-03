<template>
  <div class="records-tools-page page-shell">
    <section class="tools-hero">
      <div>
        <div class="eyebrow">
          <History :size="16" />
          记录与工具
        </div>
        <h1>回看准备轨迹，拿走可直接使用的面试材料</h1>
        <p>
          历史记录不再占用主导航；需要复盘时，从这里进入面试、学习计划、通知和分析。
          数据加载异常时会保留当前页面，并提示你稍后重试或回到对应功能继续处理。
        </p>
      </div>
      <div class="hero-actions">
        <el-button @click="router.push('/onboarding')">重新梳理目标</el-button>
        <el-button type="primary" @click="router.push('/interviews/history')">
          面试历史
          <ChevronRight :size="16" />
        </el-button>
      </div>
    </section>

    <section class="quick-grid">
      <button
        v-for="link in quickLinks"
        :key="link.path"
        class="quick-card"
        type="button"
        @click="router.push(link.path)"
      >
        <component :is="link.icon" :size="20" />
        <strong>{{ link.title }}</strong>
        <span>{{ link.desc }}</span>
      </button>
    </section>

    <div class="records-layout">
      <section class="timeline-panel">
        <div class="section-head">
          <div>
            <h2>最近记录</h2>
            <p>只展示你已经产生的面试和训练记录，方便回看下一步。</p>
          </div>
          <el-button :loading="recordsLoading" @click="loadRecords">刷新</el-button>
        </div>

        <el-alert
          v-if="recordsError"
          class="records-alert"
          type="warning"
          :closable="false"
          show-icon
          :title="recordsError"
        />

        <div v-loading="recordsLoading" class="timeline-body">
          <AppState
            v-if="!timelineEntries.length && !recordsLoading"
            type="empty"
            title="暂无可展示记录"
            description="完成一次模拟面试或生成学习计划后，这里会出现复盘入口。"
          >
            <el-button type="primary" @click="router.push('/interviews/create')">创建模拟面试</el-button>
            <el-button @click="router.push('/study-plans')">查看学习计划</el-button>
          </AppState>

          <article v-for="entry in timelineEntries" :key="entry.id" class="timeline-item">
            <span class="timeline-dot" :class="entry.tone" />
            <div>
              <div class="timeline-meta">
                <span>{{ entry.type }}</span>
                <small>{{ formatTime(entry.time) }}</small>
              </div>
              <h3>{{ entry.title }}</h3>
              <p>{{ entry.desc }}</p>
              <el-button link type="primary" @click="router.push(entry.path)">查看详情</el-button>
            </div>
          </article>
        </div>
      </section>

      <aside class="precheck-panel">
        <div class="section-head compact">
          <div>
            <h2>面试前 30 分钟</h2>
            <p>{{ precheckProgressText }}</p>
          </div>
        </div>
        <el-progress class="precheck-progress" :percentage="precheckProgressPercent" :show-text="false" />
        <div class="checklist">
          <label
            v-for="item in preInterviewChecklist"
            :key="item.key"
            :class="{ checked: precheckState[item.key] }"
          >
            <input v-model="precheckState[item.key]" type="checkbox">
            <span>{{ item.label }}</span>
          </label>
        </div>
        <div class="precheck-actions">
          <el-button type="primary" plain @click="router.push('/interviews/create')">热身面试</el-button>
          <el-button plain @click="router.push('/questions/wrong-records')">错题热身</el-button>
          <el-button link type="primary" @click="resetPrecheck">重置清单</el-button>
        </div>
      </aside>
    </div>

    <section class="toolbox-section">
      <div class="section-head">
        <div>
          <h2>面试工具箱</h2>
          <p>这些是可复用的准备材料，不会混入个人历史记录。</p>
        </div>
      </div>

      <div class="toolbox-layout">
        <div class="tool-card-list">
          <button
            v-for="tool in toolTemplates"
            :key="tool.key"
            class="tool-card"
            :class="{ active: activeToolKey === tool.key }"
            type="button"
            @click="activeToolKey = tool.key"
          >
            <component :is="tool.icon" :size="20" />
            <strong>{{ tool.title }}</strong>
            <span>{{ tool.desc }}</span>
          </button>
        </div>

        <article class="template-preview">
          <span>{{ activeTool.kicker }}</span>
          <h3>{{ activeTool.title }}</h3>
          <ol>
            <li v-for="item in activeTool.items" :key="item">{{ item }}</li>
          </ol>
          <div class="template-actions">
            <el-button v-if="activeTool.path" type="primary" @click="router.push(activeTool.path)">
              {{ activeTool.actionLabel }}
            </el-button>
            <el-button @click="router.push('/questions/recommendations')">去题库训练</el-button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  BarChart3,
  Bell,
  BookOpenCheck,
  CalendarCheck,
  ChevronRight,
  ClipboardCheck,
  FileClock,
  History,
  ListChecks,
  MessageSquare,
  Route as RouteIcon,
  Sparkles
} from 'lucide-vue-next'
import { computed, onMounted, reactive, ref, watch, type Component } from 'vue'
import { useRouter } from 'vue-router'

import { getInterviewsApi } from '@/api/interview'
import { getStudyPlansApi } from '@/api/studyPlan'
import AppState from '@/components/common/AppState.vue'
import type { InterviewListVO } from '@/types/interview'
import type { StudyPlanListVO } from '@/types/studyPlan'
import { getErrorMessage } from '@/utils/error'

interface QuickLink {
  title: string
  desc: string
  path: string
  icon: Component
}

interface TimelineEntry {
  id: string
  type: string
  title: string
  desc: string
  time?: string
  path: string
  tone: 'blue' | 'green'
}

interface ToolTemplate {
  key: string
  kicker: string
  title: string
  desc: string
  icon: Component
  items: string[]
  path?: string
  actionLabel?: string
}

const router = useRouter()
const PRECHECK_STORAGE_KEY = 'codecoachai:pre-interview-checklist:v1'

const recordsLoading = ref(false)
const recordsError = ref('')
const timelineEntries = ref<TimelineEntry[]>([])
const activeToolKey = ref('precheck')
const precheckState = reactive<Record<string, boolean>>({})

const quickLinks: QuickLink[] = [
  { title: '训练分析', desc: '查看训练任务、趋势和技能分布。', path: '/analytics/personal', icon: BarChart3 },
  { title: '每日任务', desc: '继续今天的学习计划和打卡。', path: '/daily-tasks', icon: CalendarCheck },
  { title: '学习计划', desc: '从面试报告或能力缺口生成计划。', path: '/study-plans', icon: RouteIcon },
  { title: '通知中心', desc: '查看系统提醒和任务结果。', path: '/notifications', icon: Bell },
  { title: '薄弱点分析', desc: '复盘错题、面试和训练短板。', path: '/weakness-analysis', icon: Sparkles },
  { title: '面试历史', desc: '进入面试详情、房间和报告。', path: '/interviews/history', icon: MessageSquare }
]

const preInterviewChecklist = [
  { key: 'resume', label: '确认今天使用的简历版本和项目经历说法' },
  { key: 'jd', label: '打开目标岗位描述，标出 3 个最高风险关键词' },
  { key: 'intro', label: '准备 90 秒自我介绍和 2 个项目亮点' },
  { key: 'weakness', label: '复习最近错题、收藏题和面试报告短板' },
  { key: 'environment', label: '检查摄像头、麦克风、网络和代码环境' }
]

const toolTemplates: ToolTemplate[] = [
  {
    key: 'precheck',
    kicker: '清单',
    title: '面试前检查清单',
    desc: '30 分钟内确认材料、表达和环境。',
    icon: ClipboardCheck,
    path: '/interviews/create',
    actionLabel: '创建热身面试',
    items: preInterviewChecklist.map((item) => item.label)
  },
  {
    key: 'roadmap',
    kicker: '路线',
    title: 'Java 面试准备路线',
    desc: '把基础、框架、数据库和项目串成路线。',
    icon: RouteIcon,
    path: '/questions/recommendations',
    actionLabel: '生成推荐题',
    items: [
      'Java 基础：集合、并发、JVM、异常、IO 和泛型',
      'Spring 体系：IOC、AOP、事务、MVC、Boot 自动配置',
      '数据库：索引、事务、锁、慢 SQL、分库分表和执行计划',
      '缓存与消息：Redis 缓存一致性、MQ 幂等、顺序和重试',
      '项目深挖：背景、指标、瓶颈、方案、结果和复盘'
    ]
  },
  {
    key: 'project',
    kicker: '模板',
    title: '项目表达模板',
    desc: '避免只讲“参与开发”，改成证据链。',
    icon: ListChecks,
    path: '/projects',
    actionLabel: '整理项目经历',
    items: [
      '背景：业务目标、用户规模、核心链路和约束条件',
      '问题：性能、稳定性、成本、协作或交付上的具体矛盾',
      '方案：关键技术选型、落地步骤、风险应对和验证方式',
      '结果：量化指标、线上变化、事故减少或效率提升',
      '复盘：替代方案、遗留问题、下一次会怎么做'
    ]
  },
  {
    key: 'selfIntro',
    kicker: '话术',
    title: '90 秒自我介绍',
    desc: '主管面和 HR 面都能复用的开场。',
    icon: FileClock,
    path: '/interviews/create',
    actionLabel: '练一轮 HR 面',
    items: [
      '第一句说明年限、方向和主要技术栈',
      '用一个代表项目说明你解决过什么业务问题',
      '补一个最有含金量的技术难点或性能指标',
      '连接目标岗位：为什么你的经验能匹配这份岗位描述',
      '收束到求职目标，不展开无关经历'
    ]
  },
  {
    key: 'hr',
    kicker: 'HR 面',
    title: 'HR 面常见问题',
    desc: '把敏感问题准备成稳定答案。',
    icon: BookOpenCheck,
    path: '/interviews/create',
    actionLabel: '模拟 HR 面',
    items: [
      '离职原因：讲客观变化和成长诉求，不抱怨前团队',
      '期望薪资：给区间、依据和可协商条件',
      '职业规划：连接岗位职责、技术深度和业务理解',
      '冲突处理：用具体情境、行动和结果回答',
      '压力问题：先确认边界，再说明处理方式和复盘'
    ]
  }
]

const activeTool = computed(() => toolTemplates.find((item) => item.key === activeToolKey.value) || toolTemplates[0])
const checkedPrecheckCount = computed(() =>
  preInterviewChecklist.filter((item) => precheckState[item.key]).length
)
const precheckProgressPercent = computed(() =>
  Math.round((checkedPrecheckCount.value / preInterviewChecklist.length) * 100)
)
const precheckProgressText = computed(() => {
  if (checkedPrecheckCount.value === 0) return '适合面试前快速确认材料和环境。'
  if (checkedPrecheckCount.value === preInterviewChecklist.length) return '清单已完成，可以直接热身一轮。'
  return `已完成 ${checkedPrecheckCount.value}/${preInterviewChecklist.length}，继续补齐风险项。`
})

const readStoredPrecheck = () => {
  try {
    const raw = window.localStorage.getItem(PRECHECK_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) as Record<string, boolean> : {}
    preInterviewChecklist.forEach((item) => {
      precheckState[item.key] = Boolean(parsed[item.key])
    })
  } catch {
    preInterviewChecklist.forEach((item) => {
      precheckState[item.key] = false
    })
  }
}

const resetPrecheck = () => {
  preInterviewChecklist.forEach((item) => {
    precheckState[item.key] = false
  })
}

watch(precheckState, (value) => {
  try {
    window.localStorage.setItem(PRECHECK_STORAGE_KEY, JSON.stringify(value))
  } catch {
    // localStorage 不可用时只保留当前会话状态。
  }
}, { deep: true })

const isReportSuccess = (status?: string) => ['GENERATED', 'COMPLETED', 'SUCCESS'].includes(String(status || '').toUpperCase())

const interviewToEntry = (item: InterviewListVO): TimelineEntry => {
  const id = Number(item.interviewId)
  const score = isReportSuccess(item.reportStatus) && Number(item.totalScore) > 0 ? `总分 ${item.totalScore}` : '报告待查看'
  return {
    id: `interview-${id}`,
    type: '模拟面试',
    title: item.interviewName || item.targetPosition || '未命名面试',
    desc: [item.targetPosition, item.interviewMode, score].filter(Boolean).join(' · '),
    time: item.finishedAt || item.startedAt || item.createdAt,
    path: isReportSuccess(item.reportStatus) ? `/interviews/${id}/report` : `/interviews/${id}`,
    tone: 'blue'
  }
}

const studyPlanToEntry = (item: StudyPlanListVO): TimelineEntry => ({
  id: `study-plan-${item.id}`,
  type: '学习计划',
  title: item.planTitle || item.targetPosition || '未命名学习计划',
  desc: [
    item.targetPosition,
    item.planStatus,
    typeof item.progressPercent === 'number' ? `进度 ${item.progressPercent}%` : ''
  ].filter(Boolean).join(' · '),
  time: item.updatedAt || item.createdAt,
  path: `/study-plans?planId=${item.id}`,
  tone: 'green'
})

const timeValue = (value?: string) => {
  const time = Date.parse(value || '')
  return Number.isFinite(time) ? time : 0
}

const sortByTimeDesc = (items: TimelineEntry[]) =>
  [...items].sort((a, b) => timeValue(b.time) - timeValue(a.time))

const formatTime = (value?: string) => {
  if (!value) return '时间未知'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const loadRecords = async () => {
  recordsLoading.value = true
  recordsError.value = ''
  const errors: string[] = []
  const entries: TimelineEntry[] = []

  const [interviewResult, studyPlanResult] = await Promise.allSettled([
    getInterviewsApi({ pageNo: 1, pageSize: 5 }),
    getStudyPlansApi({ pageNo: 1, pageSize: 5 })
  ])

  if (interviewResult.status === 'fulfilled') {
    entries.push(...(interviewResult.value.records || []).map(interviewToEntry))
  } else {
    errors.push(getErrorMessage(interviewResult.reason, '面试记录暂时不可用'))
  }

  if (studyPlanResult.status === 'fulfilled') {
    entries.push(...(studyPlanResult.value.records || []).map(studyPlanToEntry))
  } else {
    errors.push(getErrorMessage(studyPlanResult.reason, '学习计划暂时不可用'))
  }

  timelineEntries.value = sortByTimeDesc(entries).slice(0, 8)
  recordsError.value = errors.join('；')
  recordsLoading.value = false
}

onMounted(() => {
  readStoredPrecheck()
  loadRecords()
})
</script>

<style scoped lang="scss">
.records-tools-page {
  display: grid;
  gap: 20px;
}

.tools-hero,
.quick-card,
.timeline-panel,
.precheck-panel,
.toolbox-section,
.template-preview {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: var(--app-shadow);
}

.tools-hero {
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
    max-width: 780px;
    margin: 0;
    color: var(--app-text-muted);
    font-size: 16px;
    line-height: 1.75;
  }
}

.eyebrow,
.hero-actions,
.section-head,
.timeline-meta,
.template-actions {
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

.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.quick-card,
.tool-card {
  display: grid;
  gap: 10px;
  padding: 16px;
  color: var(--app-text);
  font: inherit;
  text-align: left;
  cursor: pointer;

  svg {
    color: #2563eb;
  }

  strong {
    font-size: 16px;
  }

  span {
    color: var(--app-text-muted);
    line-height: 1.55;
  }

  &:hover {
    border-color: #93c5fd;
    background: #eff6ff;
  }
}

.quick-card,
.tool-card {
  border: 1px solid var(--app-border);
}

.records-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 18px;
}

.timeline-panel,
.precheck-panel,
.toolbox-section {
  padding: 20px;
}

.section-head {
  justify-content: space-between;
  margin-bottom: 16px;

  h2 {
    margin: 0 0 8px;
    font-size: 20px;
  }

  p {
    margin: 0;
    color: var(--app-text-muted);
    line-height: 1.6;
  }

  &.compact {
    align-items: flex-start;
  }
}

.records-alert {
  margin-bottom: 14px;
}

.timeline-body {
  min-height: 240px;
}

.timeline-item {
  position: relative;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 12px;
  padding: 14px 0;
  border-top: 1px solid var(--app-border);

  h3 {
    margin: 8px 0 6px;
    color: var(--app-text);
    font-size: 17px;
  }

  p {
    margin: 0 0 6px;
    color: var(--app-text-muted);
    line-height: 1.6;
  }
}

.timeline-dot {
  width: 10px;
  height: 10px;
  margin-top: 7px;
  border-radius: 999px;
  background: #2563eb;

  &.green {
    background: #16a34a;
  }
}

.timeline-meta {
  flex-wrap: wrap;

  span {
    color: #2563eb;
    font-size: 12px;
    font-weight: 800;
  }

  small {
    color: var(--app-text-muted);
  }
}

.precheck-panel {
  align-self: start;
}

.precheck-progress {
  margin: -4px 0 14px;
}

.checklist {
  display: grid;
  gap: 10px;
  margin-bottom: 16px;

  label {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 10px;
    border: 1px solid var(--app-border);
    border-radius: 8px;
    background: #f8fafc;
    color: var(--app-text);
    line-height: 1.55;

    &.checked {
      border-color: rgba(22, 163, 74, 0.26);
      background: #f0fdf4;
      color: #166534;
    }
  }

  input {
    margin-top: 4px;
    accent-color: #2563eb;
  }
}

.precheck-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.toolbox-layout {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 16px;
}

.tool-card-list {
  display: grid;
  gap: 10px;
}

.tool-card {
  border-radius: 8px;
  background: #f8fafc;

  &.active {
    border-color: #93c5fd;
    background: #eff6ff;
  }
}

.template-preview {
  padding: 22px;
  box-shadow: none;

  > span {
    color: #2563eb;
    font-size: 12px;
    font-weight: 800;
  }

  h3 {
    margin: 8px 0 14px;
    font-size: 24px;
  }

  ol {
    display: grid;
    gap: 10px;
    margin: 0;
    padding-left: 20px;
    color: var(--app-text);
    line-height: 1.7;
  }
}

.template-actions {
  flex-wrap: wrap;
  margin-top: 18px;
}

@media (max-width: 1060px) {
  .quick-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .records-layout,
  .toolbox-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .tools-hero,
  .section-head {
    flex-direction: column;
  }

  .tools-hero {
    padding: 18px;
  }

  .tools-hero h1 {
    font-size: 30px;
  }

  .quick-grid {
    grid-template-columns: 1fr;
  }

  .hero-actions,
  .template-actions,
  .precheck-actions {
    justify-content: flex-start;
  }
}
</style>
