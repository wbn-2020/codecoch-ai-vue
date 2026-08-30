<template>
  <div class="arena arena-tools records-tools-page page-shell">
    <ModuleTabs :items="moduleTabs" />

    <div class="arena-tools__page">
      <header class="arena-tools__head">
        <div>
          <h1 class="arena-h1">求职资料与工具</h1>
          <p class="arena-p">先查看最近产物、处理中事项和异常，再进入对应工具继续处理。</p>
        </div>
        <button class="arena-tools__refresh" type="button" :disabled="summaryLoading" @click="loadSummary">
          <RefreshCw :size="16" :class="{ 'is-spinning': summaryLoading }" />
          <span>刷新摘要</span>
        </button>
      </header>

      <section class="arena-tools__operations" aria-labelledby="records-operations-title">
        <div class="arena-tools__operations-head">
          <div>
            <span>当前工作</span>
            <h2 id="records-operations-title">需要你关注的资料状态</h2>
          </div>
          <small v-if="summaryUpdatedAt">更新于 {{ summaryUpdatedAt }}</small>
        </div>

        <div v-if="summaryLoading && !summaryLoaded" class="arena-tools__summary-state" aria-live="polite">
          <LoaderCircle :size="18" class="is-spinning" />
          正在汇总最近产物和任务状态
        </div>
        <div v-else-if="summaryError" class="arena-tools__summary-state is-error" role="alert">
          <div>
            <strong>摘要暂时不可用</strong>
            <p>{{ summaryError }}</p>
          </div>
          <button type="button" @click="loadSummary">重试</button>
        </div>
        <div v-else class="arena-tools__summary-grid">
          <article class="arena-tools__summary-item">
            <span>最近产物</span>
            <template v-if="latestPackage">
              <strong>{{ latestPackage.companyName || '未命名公司' }} · {{ latestPackage.jobTitle || '未命名岗位' }}</strong>
              <small>{{ formatDateTime(latestPackage.refreshedAt || latestPackage.updatedAt || latestPackage.createdAt) }}</small>
              <button type="button" @click="openPath(`/application-packages/${latestPackage.id}`)">查看投递包</button>
            </template>
            <template v-else>
              <strong>还没有投递包</strong>
              <small>从目标岗位创建投递包后，最近产物会显示在这里。</small>
              <button type="button" @click="openPath('/application-packages')">创建投递包</button>
            </template>
          </article>

          <article class="arena-tools__summary-item">
            <span>处理中</span>
            <strong>{{ pendingTasks.length }} 项</strong>
            <small>{{ pendingTaskDescription }}</small>
            <button type="button" @click="openPath('/agent/tasks')">查看任务中心</button>
          </article>

          <article class="arena-tools__summary-item" :class="{ 'has-error': failedTasks.length > 0 }">
            <span>异常状态</span>
            <strong>{{ failedTasks.length ? `${failedTasks.length} 项待处理` : '暂无异常' }}</strong>
            <small>{{ failedTaskDescription }}</small>
            <button type="button" @click="openPath('/agent/tasks')">
              {{ failedTasks.length ? '处理异常' : '查看任务记录' }}
            </button>
          </article>
        </div>

        <div v-if="!summaryLoading && !summaryError" class="arena-tools__next-action">
          <div>
            <span>建议下一步</span>
            <strong>{{ nextAction.title }}</strong>
            <p>{{ nextAction.description }}</p>
          </div>
          <button type="button" @click="openPath(nextAction.path)">{{ nextAction.label }}</button>
        </div>
      </section>

      <div class="arena-tools__grid">
        <section
          v-for="group in visibleGroups"
          :key="group.key"
          class="arena-tools__group"
          :aria-labelledby="`tools-group-${group.key}`"
        >
          <h2 :id="`tools-group-${group.key}`" class="arena-tools__group-title">
            <component :is="group.icon" class="arena-tools__group-symbol" :size="15" aria-hidden="true" />
            {{ group.title }}
          </h2>

          <div class="arena-tools__rows">
            <button
              v-for="item in group.items"
              :key="item.path"
              class="arena-tools__row"
              :class="{
                'is-unavailable': item.enabled === false,
                'has-enter-link': item.path === '/ability-map' && item.enabled !== false
              }"
              :data-tool-path="item.path"
              type="button"
              :disabled="item.enabled === false"
              :title="item.enabled === false ? `${item.title}暂未开放` : undefined"
              :aria-label="item.enabled === false ? `${item.title}，暂未开放` : `${item.title}，${item.description}`"
              @click="openTool(item)"
            >
              <span class="arena-tools__icon" :class="`is-${group.key}`">
                <component :is="item.icon" :size="18" stroke-width="1.9" aria-hidden="true" />
              </span>
              <span class="arena-tools__copy">
                <strong>{{ item.title }}</strong>
                <small>{{ item.enabled === false ? '暂未开放' : item.description }}</small>
              </span>
              <span
                class="arena-tools__arrow"
                :class="{ 'is-enter': item.path === '/ability-map' && item.enabled !== false }"
                aria-hidden="true"
              >
                <template v-if="item.enabled === false">暂未开放</template>
                <template v-else-if="item.path === '/ability-map'">
                  <span class="arena-tools__enter">进入 ›</span>
                </template>
                <template v-else>›</template>
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, type Component } from 'vue'
import { useRouter } from 'vue-router'
import {
  BarChart3,
  BookOpenText,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardCheck,
  FileArchive,
  FlaskConical,
  FolderKanban,
  Map,
  Presentation,
  RefreshCw,
  Settings,
  Target,
  TreePine,
  LoaderCircle
} from 'lucide-vue-next'

import { getApplicationPackagesApi } from '@/api/applicationPackage'
import { getUserAsyncTasksApi } from '@/api/task'
import { appConfig } from '@/config'
import ModuleTabs from '@/components/user-ui/ModuleTabs.vue'
import { useUserModuleTabs } from '@/composables/useUserModuleTabs'
import type { JobApplicationPackageListItemVO } from '@/types/applicationPackage'
import type { AsyncTaskVO } from '@/types/asyncTask'
import { getErrorMessage } from '@/utils/error'
import { formatDateTime } from '@/utils/format'

interface ToolItem {
  title: string
  description: string
  path: string
  icon: Component
  enabled?: boolean
}

interface ToolGroup {
  key: 'today' | 'assets' | 'analysis' | 'settings'
  title: string
  icon: Component
  items: ToolItem[]
}

const router = useRouter()
const moduleTabs = useUserModuleTabs('resources')
const summaryLoading = ref(false)
const summaryLoaded = ref(false)
const summaryError = ref('')
const summaryUpdatedAt = ref('')
const recentPackages = ref<JobApplicationPackageListItemVO[]>([])
const recentTasks = ref<AsyncTaskVO[]>([])

const pendingStatuses = new Set(['PENDING', 'PROCESSING', 'RUNNING', 'RETRY_WAIT', 'SENT'])
const failedStatuses = new Set(['FAILED', 'DEAD', 'DEAD_LETTER', 'CANCELLED'])
const taskStatus = (task: AsyncTaskVO) => String(task.status || '').toUpperCase()
const pendingTasks = computed(() => recentTasks.value.filter((task) => pendingStatuses.has(taskStatus(task))))
const failedTasks = computed(() => recentTasks.value.filter((task) => failedStatuses.has(taskStatus(task))))
const latestPackage = computed(() => recentPackages.value[0])
const taskLabel = (task?: AsyncTaskVO) => {
  if (!task) return ''
  const labels: Record<string, string> = {
    RESUME_PARSE: '简历解析',
    RESUME_JOB_MATCH: '岗位匹配',
    INTERVIEW_REPORT: '面试报告',
    QUESTION_RECOMMENDATION: '推荐题生成',
    AGENT_DAILY_PLAN: '今日计划'
  }
  return labels[String(task.bizType || '').toUpperCase()] || '后台任务'
}
const pendingTaskDescription = computed(() => pendingTasks.value.length
  ? `最近一项：${taskLabel(pendingTasks.value[0])}，完成后可在任务中心查看结果。`
  : '当前没有排队或执行中的后台任务。')
const failedTaskDescription = computed(() => failedTasks.value.length
  ? `${taskLabel(failedTasks.value[0])}未完成，请查看失败原因后决定是否重试。`
  : '最近任务中没有失败、死信或取消记录。')
const nextAction = computed(() => {
  if (failedTasks.value.length) {
    return {
      title: '先处理未完成任务',
      description: '避免重复提交相同操作，先在任务中心确认失败原因和可重试条件。',
      label: '查看异常任务',
      path: '/agent/tasks'
    }
  }
  if (pendingTasks.value.length) {
    return {
      title: '等待当前任务完成',
      description: '任务仍在处理，可以到任务中心查看最新状态，不需要重复提交。',
      label: '查看处理进度',
      path: '/agent/tasks'
    }
  }
  if (latestPackage.value) {
    return {
      title: '继续维护最近投递包',
      description: '检查材料完整度、匹配结论和下一步投递动作。',
      label: '打开最近产物',
      path: `/application-packages/${latestPackage.value.id}`
    }
  }
  return {
    title: '创建第一份投递包',
    description: '把目标岗位、简历版本和项目证据组合成可执行的投递材料。',
    label: '进入投递包',
    path: '/application-packages'
  }
})

const groups: ToolGroup[] = [
  {
    key: 'today',
    title: '今天要做',
    icon: ClipboardCheck,
    items: [
      { title: '今日任务', description: '查看今天的安排与完成进度', path: '/agent/today', icon: ClipboardCheck },
      { title: '投递管理', description: '跟进岗位、事件与提醒', path: '/applications', icon: BriefcaseBusiness },
      { title: '求职日历', description: '跨投递的安排与提醒', path: '/career-calendar', icon: CalendarDays }
    ]
  },
  {
    key: 'assets',
    title: '资料资产',
    icon: FolderKanban,
    items: [
      { title: '项目证据库', description: '沉淀可追问的项目素材', path: '/project-evidence', icon: FolderKanban },
      { title: '投递包', description: '组合简历、材料与导出', path: '/application-packages', icon: FileArchive },
      {
        title: '个人知识库',
        description: appConfig.enableV4KnowledgePreview ? '私域资料与引用来源' : '当前环境暂未开放',
        path: '/knowledge',
        icon: BookOpenText,
        enabled: appConfig.enableV4KnowledgePreview
      }
    ]
  },
  {
    key: 'analysis',
    title: '分析复盘',
    icon: BarChart3,
    items: [
      { title: '能力图谱', description: '查看能力结构与待补充项', path: '/ability-map', icon: TreePine },
      {
        title: '求职周报',
        description: '本周事实、变化与下一步',
        path: '/agent/weekly-reports',
        icon: BarChart3,
        enabled: appConfig.enableV6WeeklyReport
      },
      { title: '训练分析', description: '正确率与个人趋势', path: '/analytics/personal', icon: Target }
    ]
  },
  {
    key: 'settings',
    title: '设置',
    icon: Settings,
    items: [
      { title: '求职实验台', description: '策略分组与复盘', path: '/job-experiments', icon: FlaskConical },
      { title: '作品集演示', description: '可展示的项目成果', path: '/portfolio-demo', icon: Presentation },
      { title: '新手引导', description: '重走一遍上手路线', path: '/onboarding', icon: Map }
    ]
  }
]

const visibleGroups = computed(() =>
  groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.enabled !== false)
    }))
    .filter((group) => group.items.length > 0)
)

function openTool(item: ToolItem) {
  if (item.enabled === false) return

  void router.push(item.path)
}

const openPath = (path: string) => {
  void router.push(path)
}

const loadSummary = async () => {
  summaryLoading.value = true
  summaryError.value = ''
  try {
    const [packages, tasks] = await Promise.all([
      getApplicationPackagesApi({ pageNo: 1, pageSize: 3 }),
      getUserAsyncTasksApi({ pageNo: 1, pageSize: 8 })
    ])
    recentPackages.value = packages.records
    recentTasks.value = tasks.records
    summaryUpdatedAt.value = formatDateTime(new Date().toISOString())
    summaryLoaded.value = true
  } catch (error) {
    summaryError.value = getErrorMessage(error, '最近资料状态加载失败，请稍后重试。')
  } finally {
    summaryLoading.value = false
  }
}

onMounted(loadSummary)
</script>

<style scoped lang="scss">
.arena-tools {
  min-width: 0;
}

.arena-tools__page {
  width: min(100%, 1180px);
  margin: 0 auto;
  // The prototype's 760px page width includes the 34px desktop page inset.
  // Keep the content column aligned with the other Direction D screens.
  padding: 28px 34px 42px;
}

.arena-tools__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 0;
}

.arena-tools__refresh,
.arena-tools__summary-state button,
.arena-tools__summary-item button,
.arena-tools__next-action button {
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--arena-grn-d);
  font: inherit;
  font-weight: 600;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--arena-grn);
    outline-offset: 2px;
  }
}

.arena-tools__refresh {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 7px;
  min-height: 36px;
  padding: 0 10px;
  border: 1px solid var(--arena-line);
  background: var(--arena-card);
}

.is-spinning {
  animation: records-tools-spin 0.9s linear infinite;
}

.arena-tools__operations {
  margin-top: 22px;
  padding: 18px 0;
  border-top: 1px solid var(--arena-line);
  border-bottom: 1px solid var(--arena-line);
}

.arena-tools__operations-head,
.arena-tools__next-action {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.arena-tools__operations-head {
  span,
  small {
    color: var(--arena-mut);
    font-size: 12px;
  }

  h2 {
    margin: 5px 0 0;
    color: var(--arena-ink);
    font-size: 18px;
  }
}

.arena-tools__summary-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr) minmax(0, 0.8fr);
  margin-top: 16px;
  border-top: 1px solid var(--arena-line);
  border-bottom: 1px solid var(--arena-line);
}

.arena-tools__summary-item {
  display: grid;
  align-content: start;
  gap: 7px;
  min-width: 0;
  padding: 16px;

  & + & {
    border-left: 1px solid var(--arena-line);
  }

  > span,
  > small {
    color: var(--arena-mut);
    font-size: 12px;
  }

  > strong {
    color: var(--arena-ink);
    line-height: 1.45;
    overflow-wrap: anywhere;
  }

  > small {
    min-height: 36px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  > button {
    justify-self: start;
    padding: 0;
  }

  &.has-error > strong,
  &.has-error > button {
    color: var(--user-danger-text);
  }
}

.arena-tools__summary-state {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  padding: 16px;
  background: var(--arena-card);
  color: var(--arena-sub);

  &.is-error {
    justify-content: space-between;
    border-left: 3px solid var(--user-danger-text);

    strong,
    p {
      display: block;
      margin: 0;
    }

    p {
      margin-top: 4px;
      color: var(--arena-mut);
    }
  }
}

.arena-tools__next-action {
  align-items: center;
  padding-top: 16px;

  span,
  p {
    color: var(--arena-mut);
  }

  span {
    font-size: 12px;
  }

  strong {
    display: block;
    margin-top: 4px;
    color: var(--arena-ink);
  }

  p {
    margin: 4px 0 0;
    line-height: 1.5;
  }

  > button {
    flex: 0 0 auto;
    min-height: 36px;
    padding: 0 12px;
    border: 1px solid var(--arena-grn);
    background: var(--arena-grn-soft);
  }
}

.arena-tools__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 28px;
}

.arena-tools__group-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 18px 2px 10px;
  color: var(--arena-mut);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1px;
}

.arena-tools__group-symbol {
  flex: 0 0 auto;
}

.arena-tools__rows {
  display: grid;
  gap: 14px;
}

.arena-tools__row {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;
  min-height: 62px;
  padding: 13px 16px;
  border: 1.5px solid var(--arena-line);
  border-radius: var(--arena-radius-card);
  background: var(--arena-card);
  box-shadow: var(--arena-shadow-card);
  color: var(--arena-ink);
  font: inherit;
  cursor: pointer;
  text-align: left;
  appearance: none;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;

  &:hover {
    border-color: var(--arena-grn);
    background: var(--arena-grn-soft);
    box-shadow: var(--arena-shadow-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--arena-grn);
    outline-offset: 2px;
  }

  &.is-unavailable {
    cursor: not-allowed;
    background: var(--arena-card);
    pointer-events: none;

    .arena-tools__icon {
      filter: none;
      opacity: 1;
    }

    .arena-tools__copy strong {
      color: var(--arena-ink);
    }

    .arena-tools__arrow {
      color: var(--arena-sub);
    }

    .arena-tools__copy small {
      color: var(--user-warning-text);
    }

    &:hover,
    &:focus-visible,
    &:active {
      border-color: var(--arena-line);
      background: var(--arena-card);
      box-shadow: var(--arena-shadow-card);
      transform: none;
      outline: 0;
    }
  }
}

.arena-tools__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: var(--arena-grn-soft);
  font-size: 17px;

  &.is-assets {
    color: var(--arena-vio);
    background: var(--arena-vio-soft);
  }

  &.is-analysis {
    color: var(--arena-amber);
    background: var(--arena-amber-soft);
  }

  &.is-settings {
    background: var(--arena-line2);
  }
}

.arena-tools__copy {
  display: grid;
  min-width: 0;
  gap: 3px;

  strong {
    color: var(--arena-ink);
    font-size: 13.5px;
    line-height: 1.35;
  }

  small {
    color: var(--arena-mut);
    font-size: 11.5px;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }
}

.arena-tools__arrow {
  color: var(--arena-mut);
  font-size: 16px;
  line-height: 1;
  white-space: nowrap;

  &.is-enter {
    color: var(--arena-grn-d);
    font-size: 13px;
    font-weight: 600;
  }
}

.arena-tools__enter {
  color: var(--arena-grn-d);
  font-size: 13px;
  font-weight: 600;
}

@media (max-width: 720px) {
  .arena-tools__page {
    width: 100%;
    padding: 18px 14px 8px;
  }

  .arena-tools__head {
    align-items: stretch;
    flex-direction: column;
    margin-bottom: 20px;
  }

  .arena-tools__refresh {
    align-self: flex-start;
  }

  .arena-tools__summary-grid,
  .arena-tools__grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .arena-tools__summary-item + .arena-tools__summary-item {
    border-top: 1px solid var(--arena-line);
    border-left: 0;
  }

  .arena-tools__operations-head,
  .arena-tools__next-action,
  .arena-tools__summary-state.is-error {
    align-items: stretch;
    flex-direction: column;
  }

  .arena-tools__next-action > button {
    align-self: flex-start;
  }

  .arena-tools__row {
    min-height: 64px;
    padding: 12px 14px;
  }
}

@keyframes records-tools-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
