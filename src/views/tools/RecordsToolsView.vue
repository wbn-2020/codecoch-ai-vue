<template>
  <div class="arena arena-tools records-tools-page page-shell">
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

    <section class="tool-groups" aria-label="工具分组">
      <section v-for="group in quickGroups" :key="group.key" class="tool-group">
        <div class="tool-group__head">
          <div>
            <span>{{ group.kicker }}</span>
            <h2>{{ group.title }}</h2>
          </div>
          <p>{{ group.desc }}</p>
        </div>
        <div class="quick-grid">
          <button
            v-for="link in group.links"
            :key="link.path"
            class="quick-card"
            type="button"
            @click="router.push(link.path)"
          >
            <component :is="link.icon" :size="20" />
            <strong>{{ link.title }}</strong>
            <span>{{ link.desc }}</span>
          </button>
        </div>
      </section>
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
              <el-button
                class="timeline-detail-button"
                link
                type="primary"
                @click="router.push(entry.path)"
              >
                查看详情
                <ChevronRight :size="14" />
              </el-button>
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
  group: 'progress' | 'assets' | 'growth' | 'other'
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
  { group: 'progress', title: '今日任务', desc: '继续今天的训练计划和打卡。', path: '/agent/today', icon: CalendarCheck },
  { group: 'progress', title: '训练分析', desc: '查看训练趋势和技能分布。', path: '/analytics/personal', icon: BarChart3 },
  { group: 'progress', title: '学习计划', desc: '从面试报告或能力缺口继续推进。', path: '/study-plans', icon: RouteIcon },
  { group: 'assets', title: '简历工坊', desc: '编辑简历、模板和可交付版本。', path: '/resumes', icon: FileClock },
  { group: 'assets', title: '项目证据库', desc: '沉淀可追问、可验证的项目事实。', path: '/project-evidence', icon: ListChecks },
  { group: 'assets', title: '投递管理', desc: '跟踪岗位机会和投递材料。', path: '/applications', icon: RouteIcon },
  { group: 'growth', title: '能力图谱', desc: '查看技能树和下一组高价值训练。', path: '/ability-map', icon: Sparkles },
  { group: 'growth', title: '错题复盘', desc: '把不稳定的题变成下一轮训练。', path: '/questions/wrong-records', icon: BookOpenCheck },
  { group: 'growth', title: '面试历史', desc: '进入面试详情、房间和报告。', path: '/interviews/history', icon: MessageSquare },
  { group: 'other', title: '求职日历', desc: '安排面试、跟进和准备节点。', path: '/career-calendar', icon: CalendarCheck },
  { group: 'other', title: '通知中心', desc: '查看系统提醒和任务结果。', path: '/notifications', icon: Bell },
  { group: 'other', title: '薄弱点分析', desc: '汇总错题、面试和训练短板。', path: '/weakness-analysis', icon: History }
]

const quickGroups = computed(() => [
  {
    key: 'progress',
    kicker: '进度',
    title: '继续成长',
    desc: '今天要推进的训练与计划。',
    links: quickLinks.filter((item) => item.group === 'progress')
  },
  {
    key: 'assets',
    kicker: '资产',
    title: '我的材料',
    desc: '简历、项目和投递上下文。',
    links: quickLinks.filter((item) => item.group === 'assets')
  },
  {
    key: 'growth',
    kicker: '成长',
    title: '复盘与能力',
    desc: '把练习结果沉淀成下一步。',
    links: quickLinks.filter((item) => item.group === 'growth')
  },
  {
    key: 'other',
    kicker: '其他',
    title: '辅助工具',
    desc: '日历、通知和问题诊断。',
    links: quickLinks.filter((item) => item.group === 'other')
  }
])

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
  min-width: 0;
  gap: 16px;
}

.tools-hero,
.quick-card,
.timeline-panel,
.precheck-panel,
.toolbox-section,
.template-preview {
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);
  box-shadow: none;
}

.tools-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px;

  h1 {
    margin: 12px 0 10px;
    color: var(--user-text);
    font-size: 24px;
    line-height: 1.3;
  }

  p {
    max-width: 780px;
    margin: 0;
    color: var(--user-text-muted);
    font-size: 14px;
    line-height: 1.6;
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
  color: var(--user-primary);
  font-size: 12px;
  font-weight: 800;
}

.hero-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.quick-grid {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-card,
.tool-card {
  display: grid;
  min-width: 0;
  gap: 10px;
  padding: 14px;
  color: var(--user-text);
  font: inherit;
  text-align: left;
  cursor: pointer;

  svg {
    color: var(--user-primary);
  }

  strong {
    font-size: 16px;
  }

  span {
    color: var(--user-text-muted);
    line-height: 1.55;
  }

  &:hover {
    border-color: var(--user-primary-border);
    background: var(--user-primary-faint);
  }
}

.quick-card {
  flex: 1 1 240px;
}

.quick-card,
.tool-card {
  border: 1px solid var(--user-border);
}

.records-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 310px);
  gap: 16px;
}

.timeline-panel,
.precheck-panel,
.toolbox-section {
  padding: 16px;
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
    color: var(--user-text-muted);
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
  min-height: 0;
}

.timeline-item {
  position: relative;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 12px;
  padding: 14px 0;
  border-top: 1px solid var(--user-border);

  h3 {
    margin: 8px 0 6px;
    color: var(--user-text);
    font-size: 17px;
  }

  p {
    margin: 0 0 6px;
    color: var(--user-text-muted);
    line-height: 1.6;
  }
}

.timeline-detail-button {
  min-height: 28px;
  padding-block: 4px;
}

.timeline-dot {
  width: 10px;
  height: 10px;
  margin-top: 7px;
  border-radius: 999px;
  background: var(--user-primary);

  &.green {
    background: var(--user-success);
  }
}

.timeline-meta {
  flex-wrap: wrap;

  span {
    color: var(--user-primary);
    font-size: 12px;
    font-weight: 800;
  }

  small {
    color: var(--user-text-muted);
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
    border: 1px solid var(--user-border);
    border-radius: 8px;
    background: var(--user-surface-muted);
    color: var(--user-text);
    line-height: 1.55;

    &.checked {
      border-color: var(--user-success-border);
      background: var(--user-success-soft);
      color: var(--user-success);
    }
  }

  input {
    margin-top: 4px;
    accent-color: var(--user-primary);
  }
}

.precheck-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.toolbox-layout {
  display: grid;
  grid-template-columns: minmax(260px, 300px) minmax(0, 1fr);
  gap: 16px;
}

.tool-card-list {
  display: grid;
  gap: 10px;
}

.tool-card {
  border-radius: 8px;
  background: var(--user-surface-muted);

  &.active {
    border-color: var(--user-primary-border);
    background: var(--user-primary-faint);
  }
}

.template-preview {
  padding: 22px;
  box-shadow: none;

  > span {
    color: var(--user-primary);
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
    color: var(--user-text);
    line-height: 1.7;
  }
}

.template-actions {
  flex-wrap: wrap;
  margin-top: 18px;
}

@media (max-width: 1060px) {
  .quick-grid {
    display: flex;
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
    font-size: 22px;
  }

  .quick-grid {
    display: flex;
  }

  .hero-actions,
  .template-actions,
  .precheck-actions {
    justify-content: flex-start;
  }
}

// 方向 D · 工具背包。历史记录仍保留，但从“运营工作台”收口为轻量工具入口。
.arena-tools {
  width: min(1060px, 100%);
  margin: 0 auto;
  padding: 28px 24px 46px;
  gap: 16px;

  .tools-hero,
  .quick-card,
  .timeline-panel,
  .precheck-panel,
  .toolbox-section,
  .template-preview {
    border: 1.5px solid var(--arena-line);
    border-radius: var(--arena-radius-card);
    background: #ffffff;
    box-shadow: 0 2px 4px rgba(21, 33, 27, 0.04);
  }

  .tools-hero {
    border-color: #b9e7cd;
    background: linear-gradient(135deg, #f0fbf4, #ffffff 72%);
    padding: 22px;

    h1 {
      font-size: 28px;
      font-weight: 900;
    }
  }

  .eyebrow,
  .timeline-meta span,
  .template-preview > span {
    color: var(--arena-grn-d);
  }

  .quick-grid {
    gap: 12px;
  }

  .tool-groups {
    display: grid;
    gap: 14px;
  }

  .tool-group {
    padding: 18px;
    border: 1.5px solid var(--arena-line);
    border-radius: var(--arena-radius-card);
    background: rgba(255, 255, 255, 0.82);
  }

  .tool-group__head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;

    span {
      color: var(--arena-amber);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
    }

    h2 {
      margin: 4px 0 0;
      color: var(--arena-ink);
      font-size: 18px;
      font-weight: 900;
    }

    p {
      max-width: 360px;
      margin: 0;
      color: var(--arena-sub);
      font-size: 12px;
      line-height: 1.55;
      text-align: right;
    }
  }

  .quick-card,
  .tool-card {
    border: 1.5px solid var(--arena-line);
    border-radius: 14px;
    background: #ffffff;
    transition: transform 0.15s ease, border-color 0.15s ease;

    &:hover,
    &.active {
      border-color: var(--arena-grn);
      background: linear-gradient(135deg, var(--arena-grn-soft), #ffffff 80%);
      transform: translateY(-1px);
    }

    svg {
      color: var(--arena-grn);
    }
  }

  .timeline-panel,
  .precheck-panel,
  .toolbox-section {
    padding: 18px;
  }

  .timeline-item {
    border-color: var(--arena-line);
  }

  .timeline-dot {
    background: var(--arena-amber);

    &.green {
      background: var(--arena-grn);
    }
  }

  .checklist label {
    border: 1.5px solid var(--arena-line);
    border-radius: 13px;
    background: #f8faf8;

    &.checked {
      border-color: #b9e7cd;
      background: #f5fcf7;
      color: var(--arena-grn-d);
    }
  }

  .template-preview {
    background: linear-gradient(180deg, #ffffff, #f8faf8);
  }

  :deep(.el-progress-bar__outer) {
    background: var(--arena-line);
  }

  :deep(.el-progress-bar__inner) {
    background: linear-gradient(90deg, var(--arena-grn), var(--arena-lime));
  }

  :deep(.el-button--primary) {
    border-color: var(--arena-grn);
    background: var(--arena-grn);
    box-shadow: 0 4px 0 var(--arena-grn-d);
    font-weight: 800;
  }
}

@media (max-width: 720px) {
  .arena-tools {
    padding: 16px 14px calc(28px + var(--user-mobile-nav-height, 0px));

    .tools-hero {
      padding: 18px;
    }

    .tool-group {
      padding: 14px;
    }

    .tool-group__head {
      align-items: flex-start;
      flex-direction: column;

      p {
        max-width: none;
        text-align: left;
      }
    }
  }
}
</style>
