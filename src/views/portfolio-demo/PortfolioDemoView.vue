<template>
  <div class="portfolio-demo page-shell">
    <section class="workbench content-card">
      <div class="workbench-main">
        <div class="workbench-copy">
          <p class="eyebrow">Portfolio rehearsal</p>
          <h1>作品集排练工作台</h1>
          <p>{{ activeRoute.summary }}</p>
        </div>

        <div class="timer-panel" :class="{ 'is-running': timerRunning }">
          <span>当前路线</span>
          <strong>{{ activeRoute.label }}</strong>
          <em>{{ formattedElapsed }} / {{ activeRoute.durationLabel }}</em>
        </div>
      </div>

      <div class="route-tabs" role="tablist" aria-label="排练路线">
        <button
          v-for="route in rehearsalRoutes"
          :key="route.key"
          type="button"
          :class="{ active: route.key === activeRouteKey }"
          role="tab"
          :aria-selected="route.key === activeRouteKey"
          @click="selectRoute(route.key)"
        >
          <span>{{ route.label }}</span>
          <small>{{ route.durationLabel }}</small>
        </button>
      </div>

      <div class="action-row">
        <el-button type="primary" :icon="timerRunning ? Pause : Play" @click="toggleTimer">
          {{ timerRunning ? '暂停排练' : '开始排练' }}
        </el-button>
        <el-button :icon="Check" @click="markCurrentNode">标记当前节点</el-button>
        <el-button :icon="ArrowRight" @click="nextNode">下一个节点</el-button>
        <el-button :icon="ExternalLink" @click="openCurrentNode">打开当前页面</el-button>
        <el-button :icon="RotateCcw" @click="resetRoute">重置本路线</el-button>
      </div>

      <div class="progress-strip" aria-label="路线进度">
        <button
          v-for="(node, index) in activeRoute.nodes"
          :key="node.id"
          type="button"
          :class="{
            done: completedNodeIds.has(node.id),
            current: index === activeNodeIndex
          }"
          @click="activeNodeIndex = index"
        >
          <span>{{ index + 1 }}</span>
          <small>{{ node.page }}</small>
        </button>
      </div>
    </section>

    <section class="route-overview">
      <article class="content-card focus-card">
        <div class="section-head">
          <div>
            <p class="eyebrow">Now rehearsing</p>
            <h2>{{ currentNode.title }}</h2>
          </div>
          <el-tag effect="plain">{{ currentNode.timebox }}</el-tag>
        </div>

        <div class="node-meta">
          <div>
            <span>页面节点</span>
            <strong>{{ currentNode.page }}</strong>
          </div>
          <div>
            <span>跳转路径</span>
            <strong>{{ currentNode.route }}</strong>
          </div>
        </div>

        <div class="talk-grid">
          <div>
            <h3>讲述重点</h3>
            <ul>
              <li v-for="point in currentNode.talkingPoints" :key="point">{{ point }}</li>
            </ul>
          </div>
          <div>
            <h3>风险提示</h3>
            <ul>
              <li v-for="risk in currentNode.risks" :key="risk">{{ risk }}</li>
            </ul>
          </div>
        </div>
      </article>

      <aside class="content-card guardrail-card">
        <div class="section-head compact">
          <div>
            <p class="eyebrow">Guardrails</p>
            <h2>排练边界</h2>
          </div>
          <el-tag type="warning" effect="plain">只读前端</el-tag>
        </div>
        <ul>
          <li v-for="item in guardrails" :key="item">{{ item }}</li>
        </ul>
      </aside>
    </section>

    <section class="content-card route-board">
      <div class="section-head">
        <div>
          <p class="eyebrow">Route script</p>
          <h2>{{ activeRoute.label }}节点清单</h2>
        </div>
        <span class="coverage">{{ completedCount }}/{{ activeRoute.nodes.length }} 已覆盖</span>
      </div>

      <div class="node-grid">
        <article
          v-for="(node, index) in activeRoute.nodes"
          :key="node.id"
          class="node-card"
          :class="{
            done: completedNodeIds.has(node.id),
            current: index === activeNodeIndex
          }"
        >
          <button type="button" class="node-title" @click="activeNodeIndex = index">
            <span>{{ index + 1 }}</span>
            <strong>{{ node.page }}</strong>
          </button>
          <p>{{ node.title }}</p>
          <div>
            <h3>讲述重点</h3>
            <ul>
              <li v-for="point in node.talkingPoints" :key="point">{{ point }}</li>
            </ul>
          </div>
          <div>
            <h3>风险提示</h3>
            <ul>
              <li v-for="risk in node.risks" :key="risk">{{ risk }}</li>
            </ul>
          </div>
        </article>
      </div>
    </section>

    <section class="content-card health-board">
      <div class="section-head">
        <div>
          <p class="eyebrow">静态健康检查</p>
          <h2>演示健康检查</h2>
          <p>仅静态核对路由、菜单、adapter、demoFlag 和 TraceCockpit 脱敏摘要信号；不连接后端业务服务，不能代表运行时健康。</p>
        </div>
        <div class="status-summary">
          <strong>{{ statusLabel(healthReport.summary.status) }}</strong>
          <span>
            {{ healthReport.summary.pass }} 通过 /
            {{ healthReport.summary.attention }} 需关注 /
            {{ healthReport.summary.unknown }} 不可确认 /
            {{ healthReport.summary.notConnected }} 未接入
          </span>
        </div>
      </div>

      <div class="health-grid">
        <article v-for="check in visibleHealthChecks" :key="check.key" class="health-card">
          <div class="card-line">
            <strong>{{ check.title }}</strong>
            <el-tag :type="statusTagType(check.status)" effect="plain">{{ statusLabel(check.status) }}</el-tag>
          </div>
          <p>{{ check.summary }}</p>
          <ul>
            <li v-for="signalItem in check.signals.slice(0, 3)" :key="`${check.key}-${signalItem.label}`">
              {{ signalItem.label }}：{{ signalItem.value }}
            </li>
          </ul>
        </article>
      </div>
    </section>

    <section class="content-card prompt-board">
      <div class="section-head">
        <div>
          <p class="eyebrow">Speaker cards</p>
          <h2>提词卡与讲述材料</h2>
          <p>只讲脱敏摘要、状态和工程边界；待发布后人工验收项不会被包装成已上线效果。</p>
        </div>
      </div>

      <div class="prompt-grid">
        <article v-for="card in portfolioRehearsalPromptCards" :key="card.id" class="prompt-card">
          <div class="card-line">
            <strong>{{ card.question }}</strong>
            <el-tag effect="plain">{{ card.statusLabel }}</el-tag>
          </div>
          <ol>
            <li v-for="frame in card.answerFrame" :key="frame">{{ frame }}</li>
          </ol>
          <p><b>必须提到：</b>{{ card.mustMention.join(' / ') }}</p>
          <p><b>避免提到：</b>{{ card.avoidMentioning.join(' / ') }}</p>
        </article>
      </div>
    </section>

    <section class="content-card acceptance-board">
      <div class="section-head">
        <div>
          <p class="eyebrow">Phase 5.5 handoff</p>
          <h2>V5 非人工验收收口矩阵</h2>
          <p>{{ portfolioRehearsalAcceptanceMatrix.acceptanceBoundary }}</p>
        </div>
        <div class="status-summary">
          <strong>{{ acceptanceCapabilityCount }} 项能力</strong>
          <span>覆盖 V5 五阶段，静态收口与发布后人工验收分离</span>
        </div>
      </div>

      <div class="acceptance-grid">
        <article v-for="stage in portfolioRehearsalAcceptanceMatrix.stages" :key="stage.stageKey" class="acceptance-card">
          <span class="stage-index">阶段 {{ stage.stageNumber }}</span>
          <h3>{{ stage.title }}</h3>
          <p>{{ stage.acceptanceGoal }}</p>
          <div class="priority-row">
            <el-tag v-for="capability in stage.capabilities" :key="capability.id" effect="plain">
              {{ capability.priority }}：{{ capability.title }}
            </el-tag>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowRight, Check, ExternalLink, Pause, Play, RotateCcw } from 'lucide-vue-next'

import {
  requiredOpsDemoSteps,
  requiredUserDemoSteps,
  resolvePortfolioDemoRoute
} from '@/features/portfolio-demo'
import { portfolioRehearsalAcceptanceMatrix } from '@/features/portfolio-rehearsal-acceptance'
import { buildPortfolioRehearsalHealthReport } from '@/features/portfolio-rehearsal-health'
import { portfolioRehearsalPromptCards } from '@/features/portfolio-rehearsal-prompts'
import type { PortfolioRehearsalHealthStatus } from '@/types/portfolioRehearsal'

type RouteKey = 'quick' | 'deep' | 'technical'

interface RehearsalNode {
  id: string
  page: string
  title: string
  route: string
  timebox: string
  talkingPoints: string[]
  risks: string[]
}

interface RehearsalRoute {
  key: RouteKey
  label: string
  durationSeconds: number
  durationLabel: string
  summary: string
  nodes: RehearsalNode[]
}

const userStepTitle = (key: string, fallback: string) =>
  requiredUserDemoSteps.find((step) => step.key === key)?.title || fallback

const opsStepTitle = (key: string, fallback: string) =>
  requiredOpsDemoSteps.find((step) => step.key === key)?.title || fallback

const rehearsalRoutes: RehearsalRoute[] = [
  {
    key: 'quick',
    label: '5 分钟快速演示',
    durationSeconds: 300,
    durationLabel: '5:00',
    summary: '用最短路径讲清用户如何从岗位目标进入投递包、投递漏斗、训练复盘和下一步行动。',
    nodes: [
      {
        id: 'quick-target-job',
        page: userStepTitle('target-job', '目标岗位'),
        title: '用岗位目标建立演示上下文',
        route: '/job-targets?demoFlag=true',
        timebox: '30 秒',
        talkingPoints: ['说明岗位目标如何约束后续匹配、训练和复盘。', '强调页面只展示脱敏样例，不展开简历原文。'],
        risks: ['不要承诺岗位匹配结果一定准确。', '不要展示真实候选人身份信息。']
      },
      {
        id: 'quick-jd-match',
        page: userStepTitle('jd-match', 'JD 匹配报告'),
        title: '把 JD 差距转成可执行训练线索',
        route: '/resume-match?demoFlag=true',
        timebox: '35 秒',
        talkingPoints: ['讲清匹配分、能力差距和证据建议如何驱动下一步。', '只讲结构化摘要，不打开简历全文。'],
        risks: ['避免把分数解释成录用概率。', '样本不足时要提示需要人工复核。']
      },
      {
        id: 'quick-application-package',
        page: userStepTitle('application-package', '岗位投递包'),
        title: '把 JD、简历和项目证据聚合成投递准备包',
        route: '/application-packages/preview?demoFlag=true',
        timebox: '40 秒',
        talkingPoints: ['说明投递包只做准备聚合和 readiness 判断。', '强调创建投递记录需要用户确认，不自动投递真实岗位。'],
        risks: ['不要把投递包讲成自动投递工具。', '缺数据时按补简历、补证据或训练行动降级。']
      },
      {
        id: 'quick-application-funnel',
        page: userStepTitle('application-funnel', '投递漏斗'),
        title: '把准备动作落到投递记录和跟进状态',
        route: '/applications?demoFlag=true',
        timebox: '35 秒',
        talkingPoints: ['展示状态、待跟进和逾期提醒如何形成行动。', '强调跟进信只生成草稿或记录，不自动发送。'],
        risks: ['不要承诺自动联系公司或自动发送邮件。', '真实数据和演示数据要分开讲。']
      },
      {
        id: 'quick-project-evidence',
        page: userStepTitle('project-evidence', '项目证据'),
        title: '用项目证据支撑简历和面试表达',
        route: '/project-evidence?demoFlag=true',
        timebox: '30 秒',
        talkingPoints: ['展示项目、技术点、STAR 线索的组织方式。', '强调证据引用来自用户确认后的结构化片段。'],
        risks: ['不要朗读项目原文或内部业务细节。', '对未验证经历只按待确认处理。']
      },
      {
        id: 'quick-interview',
        page: userStepTitle('interview-training', '面试训练室'),
        title: '从推荐问题进入训练',
        route: '/interviews/create?demoFlag=true',
        timebox: '40 秒',
        talkingPoints: ['说明问题来源于岗位差距和项目证据。', '讲训练入口和复盘闭环，不展示回答原文。'],
        risks: ['不要触发真实 AI 面试。', '不要展示用户逐字回答。']
      },
      {
        id: 'quick-review',
        page: userStepTitle('job-experiment-review', '求职实验复盘'),
        title: '把一次求职实验复盘成下一步行动',
        route: '/job-experiments?demoFlag=true',
        timebox: '50 秒',
        talkingPoints: ['连接面试报告、能力图谱、实验结论和 Agent 今日任务。', '用行动项收束，让观众看到闭环价值。'],
        risks: ['复盘建议是辅助决策，不替代求职判断。', '不要展示长期记忆全文或知识库正文。']
      },
      {
        id: 'quick-agent-today',
        page: userStepTitle('agent-today', 'Agent 今日与本周计划'),
        title: '收束到今日、本周和下一轮实验行动',
        route: '/agent/today?demoFlag=true',
        timebox: '35 秒',
        talkingPoints: ['说明每条行动都有来源、可信度和跳转入口。', '强调 Agent 是教练建议，不替用户自动决策。'],
        risks: ['不要承诺跨天计划已经全自动最优。', '低置信建议只讲成复核行动。']
      }
    ]
  },
  {
    key: 'deep',
    label: '10 分钟深讲',
    durationSeconds: 600,
    durationLabel: '10:00',
    summary: '从用户闭环深入到证据链、知识库、长期记忆和管理侧工程治理。',
    nodes: [
      {
        id: 'deep-loop',
        page: '作品集演示模式',
        title: '先给出产品闭环总览',
        route: '/portfolio-demo',
        timebox: '70 秒',
        talkingPoints: ['从目标、证据、训练、复盘、行动五段解释产品主线。', '说明本页是排练入口，不依赖真实服务。'],
        risks: ['不要把预览能力讲成已完整上线。', '不要在总览页展示任何原始输入材料。']
      },
      {
        id: 'deep-experiment',
        page: userStepTitle('job-experiment-review', '求职实验复盘'),
        title: '展开求职实验台的复盘模型',
        route: '/job-experiments?demoFlag=true',
        timebox: '100 秒',
        talkingPoints: ['讲实验目标、样本、结果和下一轮策略。', '突出建议需要证据和置信度边界。'],
        risks: ['样本少时不能做强结论。', '不要暴露具体面试回答原文。']
      },
      {
        id: 'deep-ability',
        page: userStepTitle('ability-map', '能力图谱'),
        title: '用能力图谱解释成长趋势',
        route: '/ability-map?demoFlag=true',
        timebox: '90 秒',
        talkingPoints: ['展示技能维度、证据数量和训练状态之间的关系。', '说明图谱服务于下一步学习计划。'],
        risks: ['能力标签不是最终评价。', '缺数据维度要明确标记为待补充。']
      },
      {
        id: 'deep-knowledge',
        page: '个人知识库',
        title: '说明知识沉淀如何支撑推荐',
        route: '/knowledge?demoFlag=true',
        timebox: '90 秒',
        talkingPoints: ['只讲资料分类、引用来源和可控性。', '强调知识库正文不在作品集排练中展开。'],
        risks: ['不要展示知识库正文。', '不要把检索命中解释成事实正确。']
      },
      {
        id: 'deep-memory',
        page: '长期记忆',
        title: '讲长期记忆的启停和边界',
        route: '/agent/memory?demoFlag=true',
        timebox: '90 秒',
        talkingPoints: ['说明记忆如何影响建议个性化。', '强调用户可见、可停用、可删除。'],
        risks: ['不要展示长期记忆全文。', '不要承诺记忆永远准确或自动更新。']
      },
      {
        id: 'deep-ops',
        page: opsStepTitle('agent-runs', 'Agent 运行记录'),
        title: '收束到管理侧工程治理',
        route: '/admin/agent/runs?demoFlag=true',
        timebox: '160 秒',
        talkingPoints: ['讲运行记录、任务状态、指标和回归如何支撑可维护 AI。', '突出工程化能力而非模型炫技。'],
        risks: ['不要展示 raw Prompt 或模型响应。', '管理侧权限不足时回到本页讲截图式口径。']
      }
    ]
  },
  {
    key: 'technical',
    label: '技术追问路线',
    durationSeconds: 480,
    durationLabel: '8:00',
    summary: '面向架构、隐私、AI 治理、异步任务和质量门禁的技术追问应答脚本。',
    nodes: [
      {
        id: 'tech-boundary',
        page: '作品集演示模式',
        title: '先回答演示模式如何隔离真实数据',
        route: '/portfolio-demo',
        timebox: '70 秒',
        talkingPoints: ['说明 demoFlag、只读前端排练和脱敏样例的边界。', '讲哪些内容明确不展示。'],
        risks: ['不要声称本页会写入演示数据。', '不要展示简历、回答、知识库或记忆全文。']
      },
      {
        id: 'tech-agent-today',
        page: userStepTitle('agent-today', 'Agent 今日任务'),
        title: '解释 Agent 建议如何落到可执行任务',
        route: '/agent/today?demoFlag=true',
        timebox: '80 秒',
        talkingPoints: ['讲建议来源、反馈状态和人工确认。', '说明任务是建议编排，不是自动替用户决策。'],
        risks: ['不要触发真实 AI 调用。', '不要展示模型完整生成内容。']
      },
      {
        id: 'tech-runs',
        page: opsStepTitle('agent-runs', 'Agent 运行记录'),
        title: '追问 Agent 运行链路时讲 trace 与状态',
        route: '/admin/agent/runs?demoFlag=true',
        timebox: '80 秒',
        talkingPoints: ['讲一次生成任务的状态流转、失败原因和可观测字段。', '强调日志是摘要化、权限化查看。'],
        risks: ['不要展示模型响应全文。', '不要在无权限环境里强行进入管理页。']
      },
      {
        id: 'tech-prompts',
        page: opsStepTitle('prompt-template', 'Prompt 模板'),
        title: '追问 Prompt 治理时讲模板和回归',
        route: '/admin/ai/prompts?demoFlag=true',
        timebox: '90 秒',
        talkingPoints: ['讲模板版本、变量边界、回归用例和发布前检查。', '把 Prompt 当工程配置治理，不展示 raw Prompt。'],
        risks: ['不要展示 raw Prompt。', '不要把回归通过解释成效果永远稳定。']
      },
      {
        id: 'tech-async',
        page: opsStepTitle('async-tasks', '异步任务中心'),
        title: '追问稳定性时讲异步任务与补偿',
        route: '/admin/async-tasks?demoFlag=true',
        timebox: '80 秒',
        talkingPoints: ['讲任务状态、重试、死信和人工处理入口。', '说明长耗时 AI 工作如何避免阻塞主流程。'],
        risks: ['不要承诺所有失败都能自动恢复。', '不要暴露内部错误堆栈。']
      },
      {
        id: 'tech-metrics',
        page: opsStepTitle('metrics-dictionary', '指标字典'),
        title: '追问效果评估时讲指标字典和看板',
        route: '/admin/analytics/metrics?demoFlag=true',
        timebox: '80 秒',
        talkingPoints: ['讲指标口径、数据来源、质量门禁和运营看板关系。', '把效果评估落到可复盘指标。'],
        risks: ['不要展示真实用户指标明细。', '指标异常要按待排查处理。']
      }
    ]
  }
]

const guardrails = [
  '本页不发起接口请求，不调用模型，只做前端排练状态。',
  '只展示脱敏摘要和讲述口径，不展示 raw Prompt、模型响应或原始个人材料。',
  '跳转路径统一通过 demoFlag=true 和路由安全解析，无法进入时回落提示。',
  '管理侧页面可能受权限影响，排练时可以停留在本页讲节点口径。'
]

const router = useRouter()
const activeRouteKey = ref<RouteKey>('quick')
const activeNodeIndex = ref(0)
const completedNodeIds = ref(new Set<string>())
const elapsedSeconds = ref(0)
const timerRunning = ref(false)
let timerId: number | undefined

const activeRoute = computed(
  () => rehearsalRoutes.find((route) => route.key === activeRouteKey.value) || rehearsalRoutes[0]
)
const currentNode = computed(() => activeRoute.value.nodes[activeNodeIndex.value] || activeRoute.value.nodes[0])
const completedCount = computed(
  () => activeRoute.value.nodes.filter((node) => completedNodeIds.value.has(node.id)).length
)
const formattedElapsed = computed(() => {
  const minutes = Math.floor(elapsedSeconds.value / 60)
  const seconds = elapsedSeconds.value % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
})

const healthReport = buildPortfolioRehearsalHealthReport()
const visibleHealthChecks = computed(() =>
  healthReport.checks.filter((check) =>
    [
      'route:/portfolio-demo',
      'menu:user-portfolio-demo',
      'api-adapter:portfolio-demo',
      'demo-data:storyline',
      'trace-cockpit:entry',
      'trace-cockpit:safe-summary'
    ].includes(check.key)
  )
)
const acceptanceCapabilityCount = computed(() =>
  portfolioRehearsalAcceptanceMatrix.stages.reduce((sum, stage) => sum + stage.capabilities.length, 0)
)

const statusLabel = (status: PortfolioRehearsalHealthStatus) => {
  if (status === 'PASS') return '通过'
  if (status === 'ATTENTION') return '需关注'
  if (status === 'UNKNOWN') return '不可确认'
  return '未接入'
}

const statusTagType = (status: PortfolioRehearsalHealthStatus) => {
  if (status === 'PASS') return 'success'
  if (status === 'ATTENTION') return 'warning'
  if (status === 'NOT_CONNECTED') return 'danger'
  return 'info'
}

const stopTimer = () => {
  if (timerId) window.clearInterval(timerId)
  timerId = undefined
  timerRunning.value = false
}

const toggleTimer = () => {
  if (timerRunning.value) {
    stopTimer()
    return
  }

  timerRunning.value = true
  timerId = window.setInterval(() => {
    elapsedSeconds.value += 1
    if (elapsedSeconds.value >= activeRoute.value.durationSeconds) stopTimer()
  }, 1000)
}

const selectRoute = (key: RouteKey) => {
  activeRouteKey.value = key
  activeNodeIndex.value = 0
  elapsedSeconds.value = 0
  stopTimer()
}

const markCurrentNode = () => {
  completedNodeIds.value = new Set(completedNodeIds.value).add(currentNode.value.id)
}

const nextNode = () => {
  markCurrentNode()
  activeNodeIndex.value = Math.min(activeNodeIndex.value + 1, activeRoute.value.nodes.length - 1)
}

const resetRoute = () => {
  const routeNodeIds = new Set(activeRoute.value.nodes.map((node) => node.id))
  completedNodeIds.value = new Set([...completedNodeIds.value].filter((id) => !routeNodeIds.has(id)))
  activeNodeIndex.value = 0
  elapsedSeconds.value = 0
  stopTimer()
}

const openCurrentNode = () => {
  const resolved = resolvePortfolioDemoRoute(currentNode.value.route)
  if (resolved.unavailableReason) ElMessage.warning(resolved.unavailableReason)
  router.push(resolved.path)
}

onBeforeUnmount(stopTimer)
</script>

<style scoped lang="scss">
.portfolio-demo {
  gap: 18px;
}

.workbench,
.focus-card,
.guardrail-card,
.route-board,
.health-board,
.prompt-board,
.acceptance-board {
  padding: 18px;
}

.workbench {
  display: grid;
  gap: 18px;
  border-color: rgba(45, 212, 191, 0.32);
  background:
    linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(19, 36, 45, 0.78)),
    var(--app-surface);
}

.workbench-main,
.section-head,
.action-row,
.node-meta,
.route-overview {
  display: flex;
  gap: 14px;
}

.workbench-main,
.section-head {
  align-items: flex-start;
  justify-content: space-between;
}

.workbench-copy {
  min-width: 0;
}

.eyebrow {
  margin: 0 0 6px;
  color: #5eead4;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1,
h2,
h3,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 8px;
  font-size: 30px;
}

h2 {
  margin-bottom: 4px;
  font-size: 20px;
}

h3 {
  margin-bottom: 8px;
  font-size: 14px;
}

.workbench-copy p:last-child,
.section-head p,
.node-card p,
.timer-panel span,
.node-meta span,
.route-tabs small,
.progress-strip small,
.guardrail-card li,
.talk-grid li,
.node-card li {
  color: var(--app-text-muted);
}

.timer-panel {
  display: grid;
  gap: 4px;
  min-width: 172px;
  padding: 14px;
  border: 1px solid rgba(251, 191, 36, 0.36);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.34);
}

.timer-panel strong {
  color: var(--app-text);
}

.timer-panel em {
  color: #fbbf24;
  font-size: 22px;
  font-style: normal;
  font-weight: 800;
}

.timer-panel.is-running {
  border-color: rgba(52, 211, 153, 0.48);
}

.route-tabs,
.progress-strip,
.node-grid,
.talk-grid,
.health-grid,
.prompt-grid,
.acceptance-grid {
  display: grid;
  gap: 12px;
}

.route-tabs {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.route-tabs button,
.progress-strip button,
.node-title {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.24);
  color: var(--app-text);
  cursor: pointer;
  text-align: left;
}

.route-tabs button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 54px;
  padding: 12px;
}

.route-tabs button.active,
.progress-strip button.current,
.node-card.current {
  border-color: #5eead4;
  box-shadow: 0 0 0 1px rgba(94, 234, 212, 0.22);
}

.action-row {
  align-items: center;
  flex-wrap: wrap;
}

.progress-strip {
  grid-template-columns: repeat(auto-fit, minmax(126px, 1fr));
}

.progress-strip button {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  align-items: center;
  min-height: 52px;
  padding: 10px;
}

.progress-strip span,
.node-title span {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.18);
  color: #cbd5e1;
  font-weight: 800;
}

.progress-strip button.done span,
.node-card.done .node-title span {
  background: rgba(52, 211, 153, 0.22);
  color: #86efac;
}

.route-overview {
  align-items: stretch;
}

.focus-card {
  flex: 1 1 auto;
}

.guardrail-card {
  flex: 0 0 320px;
}

.section-head.compact {
  margin-bottom: 8px;
}

.node-meta {
  margin: 14px 0;
}

.node-meta > div {
  flex: 1;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.28);
}

.node-meta span,
.node-meta strong {
  display: block;
}

.node-meta strong {
  margin-top: 4px;
  overflow-wrap: anywhere;
}

.talk-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

ul {
  margin: 0;
  padding-left: 18px;
}

li + li {
  margin-top: 6px;
}

.coverage {
  color: #fbbf24;
  font-weight: 800;
}

.node-grid {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.health-grid,
.prompt-grid,
.acceptance-grid {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.node-card,
.health-card,
.prompt-card,
.acceptance-card {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.22);
}

.node-card {
  min-height: 320px;
}

.node-card.done {
  border-color: rgba(52, 211, 153, 0.42);
}

.node-title {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 48px;
  padding: 8px;
}

.status-summary {
  display: grid;
  gap: 4px;
  min-width: 220px;
  color: var(--app-text-muted);
  text-align: right;
}

.status-summary strong {
  color: #5eead4;
  font-size: 20px;
}

.card-line {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.card-line strong {
  min-width: 0;
  overflow-wrap: anywhere;
}

.prompt-card ol {
  margin: 0;
  padding-left: 20px;
}

.stage-index {
  color: #fbbf24;
  font-weight: 800;
}

.priority-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 920px) {
  .workbench-main,
  .section-head,
  .route-overview,
  .node-meta {
    flex-direction: column;
  }

  .timer-panel,
  .guardrail-card {
    width: 100%;
    min-width: 0;
    flex-basis: auto;
  }

  .route-tabs,
  .talk-grid {
    grid-template-columns: 1fr;
  }

  .status-summary {
    min-width: 0;
    text-align: left;
  }
}
</style>
