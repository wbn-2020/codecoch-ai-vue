<template>
  <div class="portfolio-demo page-shell">
    <section class="rehearsal-hero content-card">
      <div class="hero-copy">
        <p class="eyebrow">演示线 · 收口前排练</p>
        <h1>作品集排练工作台</h1>
        <p class="hero-summary">{{ activeRoute.summary }}</p>

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
      </div>

      <div class="route-status">
        <div class="progress-dial" :style="{ '--progress-angle': `${routeProgress * 3.6}deg` }">
          <span>{{ completedCount }}/{{ activeRoute.nodes.length }}</span>
        </div>
        <div class="route-status-copy">
          <span class="section-label">本轮完成度</span>
          <strong>{{ activeBeatIndex + 1 }}/5 段</strong>
          <small>完成后进入排练复盘</small>
        </div>
      </div>
    </section>

    <section class="route-progress content-card">
      <div class="progress-head">
        <div>
          <p class="section-label">路线节拍</p>
          <h2>{{ activeRoute.label }}</h2>
        </div>
        <span class="coverage">{{ completedCount }}/{{ activeRoute.nodes.length }} 已覆盖</span>
      </div>

      <div class="progress-track" aria-hidden="true">
        <span :style="{ transform: `scaleX(${routeProgress / 100})` }"></span>
      </div>

      <div class="beat-strip" role="tablist" aria-label="五段演示节拍">
        <button
          v-for="(beat, index) in routeBeats"
          :key="beat.key"
          type="button"
          role="tab"
          :aria-selected="activeBeatIndex === index"
          :class="{ 'is-current': activeBeatIndex === index, 'is-complete': beat.isComplete }"
          @click="selectNode(beat.startIndex)"
        >
          <span class="beat-number">{{ beat.isComplete ? '✓' : index + 1 }}</span>
          <span>
            <strong>{{ beat.label }}</strong>
            <small>{{ beat.summary }}</small>
          </span>
        </button>
      </div>
    </section>

    <section class="current-layout">
      <article class="current-card content-card">
        <div class="current-head">
          <div>
            <p class="section-label">当前讲述 · 第 {{ activeBeatIndex + 1 }} 段</p>
            <h2>{{ currentNode.title }}</h2>
          </div>
          <el-tag effect="plain">{{ currentNode.timebox }}</el-tag>
        </div>

        <div class="current-context">
          <div><span>页面节点</span><strong>{{ currentNode.page }}</strong></div>
          <div><span>讲述时长</span><strong>{{ formattedElapsed }} / {{ activeRoute.durationLabel }}</strong></div>
        </div>

        <p class="current-summary">{{ currentNode.talkingPoints[0] }}</p>

        <div class="talk-grid">
          <div class="talk-block">
            <h3>讲述重点</h3>
            <ul>
              <li v-for="point in currentNode.talkingPoints" :key="point">{{ point }}</li>
            </ul>
          </div>
          <div class="talk-block risk-block">
            <h3>风险提示</h3>
            <ul>
              <li v-for="risk in currentNode.risks" :key="risk">{{ risk }}</li>
            </ul>
          </div>
        </div>

        <div class="action-row">
          <el-button type="primary" :icon="timerRunning ? Pause : Play" @click="toggleTimer">
            {{ timerRunning ? '暂停排练' : '开始排练' }}
          </el-button>
          <el-button :icon="Check" @click="markCurrentNode">标记当前节点</el-button>
          <el-button class="utility-button" :icon="ArrowRight" title="下一个节点" aria-label="下一个节点" @click="nextNode" />
          <el-button class="utility-button" :icon="ExternalLink" title="打开当前页面" aria-label="打开当前页面" @click="openCurrentNode" />
          <el-button class="utility-button" :icon="RotateCcw" title="重置本路线" aria-label="重置本路线" @click="resetRoute" />
        </div>
      </article>

      <aside class="guardrail-card content-card">
        <div class="card-heading">
          <div>
            <p class="section-label">排练护栏</p>
            <h2>只讲可确认事实</h2>
          </div>
          <el-tag type="warning" effect="plain">只读前端</el-tag>
        </div>
        <ul class="guardrail-list">
          <li v-for="item in guardrails.slice(0, 3)" :key="item">
            <span class="guardrail-check">✓</span>
            <span>{{ item }}</span>
          </li>
        </ul>
        <p class="guardrail-note">不确定的内容保留“待人工确认”，不在排练中包装成已上线效果。</p>
      </aside>
    </section>

    <section class="cue-card content-card">
      <div class="card-heading">
        <div>
          <p class="section-label">精简提词</p>
          <h2>这一段只记住三件事</h2>
        </div>
        <button class="text-button" type="button" @click="openDetails('prompts')">查看完整材料 <span aria-hidden="true">→</span></button>
      </div>
      <div class="cue-grid">
        <div class="cue-item">
          <span class="cue-index">01</span>
          <div><strong>页面入口</strong><p>{{ currentNode.page }}</p></div>
        </div>
        <div class="cue-item">
          <span class="cue-index">02</span>
          <div><strong>一句讲法</strong><p>{{ currentNode.talkingPoints[0] }}</p></div>
        </div>
        <div class="cue-item">
          <span class="cue-index">03</span>
          <div><strong>一句边界</strong><p>{{ currentNode.risks[0] }}</p></div>
        </div>
      </div>
    </section>

    <section v-if="detailsOpen" class="details-panel content-card" aria-live="polite">
      <div class="details-heading">
        <div>
          <p class="section-label">按需展开</p>
          <h2>排练辅助材料</h2>
          <p>完整节点、健康检查和验收材料只在需要时打开，不占用首屏讲述空间。</p>
        </div>
        <el-button text @click="detailsOpen = false">收起</el-button>
      </div>

      <div class="detail-tabs" role="tablist" aria-label="排练辅助材料">
        <button type="button" :class="{ active: detailsPanel === 'prompts' }" @click="setDetailsPanel('prompts')">
          <el-icon><FileText /></el-icon>
          完整提词与节点
        </button>
        <button type="button" :class="{ active: detailsPanel === 'health' }" @click="setDetailsPanel('health')">
          <el-icon><CircleCheck /></el-icon>
          静态健康检查
        </button>
        <button type="button" :class="{ active: detailsPanel === 'acceptance' }" @click="setDetailsPanel('acceptance')">
          <el-icon><ListChecks /></el-icon>
          验收矩阵
        </button>
      </div>

      <div v-if="detailsPanel === 'prompts'" class="detail-content">
        <div class="detail-intro">
          <div>
            <p class="section-label">完整提词与节点</p>
            <h3>{{ activeRoute.label }}完整讲述材料</h3>
          </div>
          <span class="coverage">{{ completedCount }}/{{ activeRoute.nodes.length }} 已覆盖</span>
        </div>

        <div class="detail-node-list">
          <button
            v-for="(node, index) in activeRoute.nodes"
            :key="node.id"
            type="button"
            :class="{ current: index === activeNodeIndex, done: completedNodeIds.has(node.id) }"
            @click="selectNode(index)"
          >
            <span>{{ completedNodeIds.has(node.id) ? '✓' : index + 1 }}</span>
            <span><strong>{{ node.page }}</strong><small>{{ node.title }}</small></span>
            <em>{{ node.timebox }}</em>
          </button>
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
      </div>

      <div v-else-if="detailsPanel === 'health'" class="detail-content">
        <div class="detail-intro">
          <div>
            <p class="section-label">静态健康检查</p>
            <h3>演示健康检查</h3>
            <p>仅核对路由、菜单、adapter、demoFlag 和 TraceCockpit 脱敏摘要信号；不连接后端业务服务。</p>
          </div>
          <div class="status-summary">
            <strong>{{ statusLabel(healthReport.summary.status) }}</strong>
            <span>{{ healthReport.summary.pass }} 通过 / {{ healthReport.summary.attention }} 需关注 / {{ healthReport.summary.unknown }} 不可确认 / {{ healthReport.summary.notConnected }} 未接入</span>
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
      </div>

      <div v-else class="detail-content">
        <div class="detail-intro">
          <div>
            <p class="section-label">Phase 5.5 handoff</p>
            <h3>V5 非人工验收收口矩阵</h3>
            <p>{{ portfolioRehearsalAcceptanceMatrix.acceptanceBoundary }}</p>
          </div>
          <div class="status-summary">
            <strong>{{ acceptanceCapabilityCount }} 项能力</strong>
            <span>静态收口与发布后人工验收分离</span>
          </div>
        </div>
        <div class="acceptance-grid">
          <article v-for="stage in portfolioRehearsalAcceptanceMatrix.stages" :key="stage.stageKey" class="acceptance-card">
            <span class="stage-index">阶段 {{ stage.stageNumber }}</span>
            <h3>{{ stage.title }}</h3>
            <p>{{ stage.acceptanceGoal }}</p>
            <div class="priority-row">
              <el-tag v-for="capability in stage.capabilities" :key="capability.id">
                {{ capability.priority }}：{{ capability.title }}
              </el-tag>
            </div>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowRight, Check, CircleCheck, ExternalLink, FileText, ListChecks, Pause, Play, RotateCcw } from 'lucide-vue-next'

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
  beats: RehearsalBeatConfig[]
  nodes: RehearsalNode[]
}

type DetailPanel = 'prompts' | 'health' | 'acceptance'

interface RehearsalBeatConfig {
  label: string
  summary: string
  startIndex: number
  endIndex: number
}

interface RehearsalBeat {
  key: string
  label: string
  summary: string
  startIndex: number
  endIndex: number
  isComplete: boolean
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
    beats: [
      { label: '岗位目标', summary: '建立上下文', startIndex: 0, endIndex: 0 },
      { label: 'JD 匹配', summary: '看清差距', startIndex: 1, endIndex: 1 },
      { label: '投递准备', summary: '形成投递闭环', startIndex: 2, endIndex: 3 },
      { label: '证据与训练', summary: '支撑面试表达', startIndex: 4, endIndex: 5 },
      { label: '复盘与行动', summary: '收束下一步', startIndex: 6, endIndex: 7 }
    ],
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
        title: '把 JD、简历和项目证据聚合成岗位投递包',
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
    beats: [
      { label: '产品闭环', summary: '从目标到行动', startIndex: 0, endIndex: 0 },
      { label: '实验复盘', summary: '解释策略迭代', startIndex: 1, endIndex: 1 },
      { label: '能力与知识', summary: '说明成长依据', startIndex: 2, endIndex: 3 },
      { label: '记忆治理', summary: '明确可控边界', startIndex: 4, endIndex: 4 },
      { label: '工程治理', summary: '收束可维护性', startIndex: 5, endIndex: 5 }
    ],
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
    beats: [
      { label: '演示边界', summary: '隔离真实数据', startIndex: 0, endIndex: 0 },
      { label: 'Agent 建议', summary: '落到人工确认', startIndex: 1, endIndex: 1 },
      { label: '运行链路', summary: '追踪状态与 trace', startIndex: 2, endIndex: 2 },
      { label: 'Prompt 治理', summary: '版本与回归门禁', startIndex: 3, endIndex: 3 },
      { label: '异步与指标', summary: '稳定性与效果评估', startIndex: 4, endIndex: 5 }
    ],
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
  '当前页面未接入会话持久化，不发起接口请求，不调用模型，状态仅保存在页面内。',
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
const detailsOpen = ref(false)
const detailsPanel = ref<DetailPanel>('prompts')
let timerId: number | undefined

const activeRoute = computed(
  () => rehearsalRoutes.find((route) => route.key === activeRouteKey.value) || rehearsalRoutes[0]
)
const currentNode = computed(() => activeRoute.value.nodes[activeNodeIndex.value] || activeRoute.value.nodes[0])
const completedCount = computed(
  () => activeRoute.value.nodes.filter((node) => completedNodeIds.value.has(node.id)).length
)
const routeProgress = computed(() => {
  const nodeCount = activeRoute.value.nodes.length
  if (!nodeCount) return 0
  return Math.round((completedCount.value / nodeCount) * 100)
})
const routeBeats = computed<RehearsalBeat[]>(() => {
  const nodes = activeRoute.value.nodes
  if (!nodes.length) return []

  return activeRoute.value.beats.map((range, index) => ({
    key: `${activeRouteKey.value}-${index}`,
    ...range,
    isComplete: nodes
      .slice(range.startIndex, range.endIndex + 1)
      .every((node) => completedNodeIds.value.has(node.id))
  }))
})
const activeBeatIndex = computed(() =>
  Math.max(
    routeBeats.value.findIndex(
      (beat) => activeNodeIndex.value >= beat.startIndex && activeNodeIndex.value <= beat.endIndex
    ),
    0
  )
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

const setDetailsPanel = (panel: DetailPanel) => {
  detailsPanel.value = panel
  detailsOpen.value = true
}

const openDetails = (panel: DetailPanel) => {
  setDetailsPanel(panel)
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

const selectNode = (index: number) => {
  activeNodeIndex.value = index
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

onBeforeUnmount(() => {
  stopTimer()
})
</script>

<style scoped lang="scss">
.portfolio-demo {
  gap: 14px;
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
  gap: 14px;
  border-color: var(--user-border);
  background: var(--user-surface);
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
  color: var(--pd-green-deep, var(--user-primary));
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
  background: var(--pd-surface-soft, var(--user-surface-muted));
}

.timer-panel strong {
  color: var(--app-text);
}

.timer-panel em {
  color: var(--pd-amber, var(--user-warning));
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
  background: var(--pd-surface, var(--user-surface));
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
  border-color: var(--pd-green, var(--user-primary));
  box-shadow: 0 0 0 1px var(--pd-green-soft, var(--user-primary-faint));
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
  background: var(--pd-surface-soft, var(--user-surface-muted));
  color: var(--pd-sub, var(--user-text-secondary));
  font-weight: 800;
}

.progress-strip button.done span,
.node-card.done .node-title span {
  background: var(--pd-green-soft, var(--user-success-soft));
  color: var(--pd-green-deep, var(--user-success));
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
  background: var(--pd-surface-soft, var(--user-surface-muted));
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
  color: var(--pd-amber, var(--user-warning));
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
  background: var(--pd-surface, var(--user-surface));
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
  color: var(--pd-green-deep, var(--user-primary));
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
  color: var(--pd-amber, var(--user-warning));
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

/* Direction D presentation layer. Keep the existing session and route script above intact. */
.portfolio-demo {
  --pd-bg: #f5f7f4;
  --pd-surface: #ffffff;
  --pd-surface-soft: #f0f4f1;
  --pd-ink: #15211b;
  --pd-sub: #5f6e66;
  --pd-muted: #5f6e66;
  --pd-line: #dce6df;
  --pd-line-strong: #c5d5ca;
  --pd-green: #17b26a;
  --pd-green-deep: #0e9f5d;
  --pd-green-soft: #e3f7ed;
  --pd-lime: #a3e635;
  --pd-amber: #f79009;
  --pd-amber-soft: #fff3dd;
  --pd-violet: #7c5cfc;
  --pd-violet-soft: #eeeaFF;
  display: grid;
  min-height: calc(100vh - 64px);
  margin: -14px -24px -28px;
  padding: 30px max(24px, calc((100vw - 1120px) / 2)) 48px;
  gap: 16px;
  overflow: clip;
  background: var(--pd-bg);
  color: var(--pd-ink);
  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
}

.portfolio-demo *,
.portfolio-demo *::before,
.portfolio-demo *::after {
  box-sizing: border-box;
}

.portfolio-demo .content-card {
  border: 1px solid var(--pd-line);
  border-radius: 14px;
  background: var(--pd-surface);
  box-shadow: 0 2px 5px rgba(21, 33, 27, 0.05);
  color: var(--pd-ink);
}

.portfolio-demo h1,
.portfolio-demo h2,
.portfolio-demo h3,
.portfolio-demo p {
  margin-top: 0;
}

.portfolio-demo h1 {
  margin-bottom: 8px;
  color: var(--pd-ink);
  font-size: 28px;
  line-height: 1.22;
}

.portfolio-demo h2 {
  margin-bottom: 4px;
  color: var(--pd-ink);
  font-size: 19px;
  line-height: 1.35;
}

.portfolio-demo h3 {
  margin-bottom: 8px;
  color: var(--pd-ink);
  font-size: 13px;
  line-height: 1.4;
}

.portfolio-demo .eyebrow {
  margin-bottom: 6px;
  color: var(--pd-green-deep);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: none;
}

.portfolio-demo .section-label {
  margin: 0 0 5px;
  color: var(--pd-muted);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.6px;
}

.portfolio-demo .hero-summary,
.portfolio-demo .details-heading p,
.portfolio-demo .detail-intro p {
  max-width: 680px;
  margin-bottom: 0;
  color: var(--pd-sub);
  font-size: 13px;
  line-height: 1.6;
}

.portfolio-demo .rehearsal-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 214px;
  align-items: stretch;
  gap: 20px;
  padding: 22px;
  border-color: #b9e7cd;
  background: var(--pd-surface-soft);
}

.portfolio-demo .hero-copy {
  min-width: 0;
}

.portfolio-demo .route-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 18px;
}

.portfolio-demo .route-tabs button {
  display: flex;
  min-width: 0;
  min-height: 52px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid var(--pd-line);
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--pd-surface);
  color: var(--pd-ink);
  font-size: 13px;
  font-weight: 850;
  text-align: left;
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
}

.portfolio-demo .route-tabs button:hover {
  border-color: var(--pd-green);
  transform: translateY(-1px);
}

.portfolio-demo .route-tabs button.active {
  border-color: var(--pd-green);
  background: var(--pd-green-soft);
  color: var(--pd-green-deep);
}

.portfolio-demo .route-tabs small {
  color: var(--pd-muted);
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

.portfolio-demo .route-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--pd-line);
  border-radius: 12px;
  background: var(--pd-surface);
}

.portfolio-demo .progress-dial {
  display: grid;
  width: 78px;
  height: 78px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: conic-gradient(var(--pd-green) 0 var(--progress-angle, 0deg), var(--pd-line) var(--progress-angle, 0deg) 360deg);
}

.portfolio-demo .progress-dial span {
  display: grid;
  width: 61px;
  height: 61px;
  place-items: center;
  border-radius: 50%;
  background: var(--pd-surface);
  color: var(--pd-ink);
  font-size: 16px;
  font-weight: 900;
}

.portfolio-demo .route-status-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.portfolio-demo .route-status-copy strong {
  font-size: 17px;
}

.portfolio-demo .route-status-copy small {
  color: var(--pd-muted);
  font-size: 11px;
  line-height: 1.45;
}

.portfolio-demo .route-progress {
  padding: 18px 20px 20px;
}

.portfolio-demo .progress-head,
.portfolio-demo .current-head,
.portfolio-demo .card-heading,
.portfolio-demo .details-heading,
.portfolio-demo .detail-intro,
.portfolio-demo .card-line {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.portfolio-demo .progress-head {
  align-items: center;
}

.portfolio-demo .coverage {
  color: var(--pd-green-deep);
  font-size: 12px;
  font-weight: 900;
  white-space: nowrap;
}

.portfolio-demo .progress-track {
  height: 7px;
  margin: 14px 0;
  overflow: hidden;
  border-radius: 99px;
  background: var(--pd-line);
}

.portfolio-demo .progress-track span {
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  border-radius: inherit;
  background: var(--pd-green);
  transform-origin: left center;
  transition: transform 180ms ease;
}

.portfolio-demo .beat-strip {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.portfolio-demo .beat-strip button {
  display: grid;
  grid-template-columns: 27px minmax(0, 1fr);
  align-items: start;
  gap: 8px;
  min-width: 0;
  min-height: 62px;
  border: 1px solid var(--pd-line);
  border-radius: 10px;
  padding: 10px;
  background: var(--pd-surface);
  color: var(--pd-sub);
  text-align: left;
  transition: border-color 160ms ease, background 160ms ease;
}

.portfolio-demo .beat-strip button:hover {
  border-color: var(--pd-green);
}

.portfolio-demo .beat-strip button.is-current {
  border-color: var(--pd-green);
  background: var(--pd-green-soft);
  color: var(--pd-green-deep);
}

.portfolio-demo .beat-strip button.is-complete .beat-number {
  background: var(--pd-green);
  color: #fff;
}

.portfolio-demo .beat-number {
  display: grid;
  width: 27px;
  height: 27px;
  place-items: center;
  border-radius: 9px;
  background: var(--pd-surface-soft);
  color: var(--pd-sub);
  font-size: 12px;
  font-weight: 900;
}

.portfolio-demo .beat-strip strong,
.portfolio-demo .beat-strip small {
  display: block;
}

.portfolio-demo .beat-strip strong {
  overflow-wrap: anywhere;
  color: inherit;
  font-size: 12px;
  line-height: 1.35;
}

.portfolio-demo .beat-strip small {
  margin-top: 4px;
  color: var(--pd-muted);
  font-size: 11px;
  line-height: 1.3;
}

.portfolio-demo .current-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
  gap: 16px;
}

.portfolio-demo .current-card,
.portfolio-demo .guardrail-card,
.portfolio-demo .cue-card,
.portfolio-demo .details-panel {
  padding: 20px;
}

.portfolio-demo .current-head {
  align-items: center;
}

.portfolio-demo .current-head h2 {
  max-width: 620px;
}

.portfolio-demo .current-context {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 16px 0;
}

.portfolio-demo .current-context > div {
  min-width: 0;
  padding: 12px;
  border-radius: 10px;
  background: var(--pd-surface-soft);
}

.portfolio-demo .current-context span,
.portfolio-demo .current-context strong {
  display: block;
}

.portfolio-demo .current-context span {
  color: var(--pd-muted);
  font-size: 11px;
  font-weight: 800;
}

.portfolio-demo .current-context strong {
  margin-top: 4px;
  overflow-wrap: anywhere;
  color: var(--pd-ink);
  font-size: 13px;
}

.portfolio-demo .current-summary {
  margin-bottom: 14px;
  color: var(--pd-sub);
  font-size: 13px;
  line-height: 1.6;
}

.portfolio-demo .talk-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.portfolio-demo .talk-block {
  min-width: 0;
  padding: 13px;
  border-radius: 10px;
  background: #f7fbf8;
}

.portfolio-demo .risk-block {
  background: var(--pd-amber-soft);
}

.portfolio-demo ul,
.portfolio-demo ol {
  margin: 0;
  padding-left: 18px;
}

.portfolio-demo li {
  color: var(--pd-sub);
  font-size: 12px;
  line-height: 1.55;
}

.portfolio-demo li + li {
  margin-top: 7px;
}

.portfolio-demo .action-row {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
  margin-top: 18px;
}

.portfolio-demo .utility-button {
  width: 40px;
  min-width: 40px;
  padding: 0;
}

.portfolio-demo .guardrail-card {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.portfolio-demo .guardrail-list {
  display: grid;
  gap: 11px;
  margin: 15px 0 0;
  padding: 0;
  list-style: none;
}

.portfolio-demo .guardrail-list li {
  display: flex;
  gap: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--pd-line);
  list-style: none;
}

.portfolio-demo .guardrail-list li:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.portfolio-demo .guardrail-check {
  display: grid;
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 7px;
  background: var(--pd-green-soft);
  color: var(--pd-green-deep);
  font-size: 11px;
  font-weight: 900;
}

.portfolio-demo .guardrail-note {
  margin-top: auto;
  padding-top: 16px;
  color: var(--pd-muted);
  font-size: 11px;
  line-height: 1.55;
}

.portfolio-demo .cue-card {
  padding: 18px 20px;
}

.portfolio-demo .cue-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
  margin-top: 14px;
}

.portfolio-demo .cue-item {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  align-items: start;
  gap: 8px;
  min-width: 0;
  padding: 11px;
  border: 1px solid var(--pd-line);
  border-radius: 10px;
  background: var(--pd-surface);
}

.portfolio-demo .cue-index {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 9px;
  background: var(--pd-green-soft);
  color: var(--pd-green-deep);
  font-size: 10px;
  font-weight: 900;
}

.portfolio-demo .cue-item strong,
.portfolio-demo .cue-item p {
  display: block;
}

.portfolio-demo .cue-item strong {
  font-size: 12px;
}

.portfolio-demo .cue-item p {
  margin-top: 4px;
  overflow-wrap: anywhere;
  color: var(--pd-sub);
  font-size: 11px;
  line-height: 1.45;
}

.portfolio-demo .text-button {
  border: 0;
  background: transparent;
  color: var(--pd-green-deep);
  font-size: 12px;
  font-weight: 900;
}

.portfolio-demo .details-panel {
  border-color: var(--pd-line-strong);
}

.portfolio-demo .details-heading {
  align-items: flex-start;
}

.portfolio-demo .detail-tabs {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
  margin: 18px 0;
}

.portfolio-demo .detail-tabs button {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--pd-line);
  border-radius: 9px;
  padding: 0 11px;
  background: var(--pd-surface);
  color: var(--pd-sub);
  font-size: 12px;
  font-weight: 850;
}

.portfolio-demo .detail-tabs button.active {
  border-color: var(--pd-green);
  background: var(--pd-green-soft);
  color: var(--pd-green-deep);
}

.portfolio-demo .detail-content {
  min-width: 0;
}

.portfolio-demo .detail-node-list {
  display: grid;
  gap: 7px;
  margin: 12px 0 18px;
}

.portfolio-demo .detail-node-list button {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  min-width: 0;
  border: 1px solid var(--pd-line);
  border-radius: 9px;
  padding: 9px 10px;
  background: var(--pd-surface);
  color: var(--pd-sub);
  text-align: left;
}

.portfolio-demo .detail-node-list button.current {
  border-color: var(--pd-green);
  background: var(--pd-green-soft);
}

.portfolio-demo .detail-node-list button.done > span:first-child {
  background: var(--pd-green);
  color: #fff;
}

.portfolio-demo .detail-node-list button > span:first-child {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 9px;
  background: var(--pd-surface-soft);
  color: var(--pd-sub);
  font-size: 11px;
  font-weight: 900;
}

.portfolio-demo .detail-node-list strong,
.portfolio-demo .detail-node-list small {
  display: block;
}

.portfolio-demo .detail-node-list strong {
  color: var(--pd-ink);
  font-size: 12px;
}

.portfolio-demo .detail-node-list small {
  margin-top: 2px;
  color: var(--pd-sub);
  font-size: 11px;
  line-height: 1.35;
}

.portfolio-demo .detail-node-list em {
  color: var(--pd-muted);
  font-size: 11px;
  font-style: normal;
  white-space: nowrap;
}

.portfolio-demo .prompt-grid,
.portfolio-demo .health-grid,
.portfolio-demo .acceptance-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 10px;
}

.portfolio-demo .prompt-card,
.portfolio-demo .health-card,
.portfolio-demo .acceptance-card {
  display: grid;
  gap: 10px;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--pd-line);
  border-radius: 10px;
  background: var(--pd-surface-soft);
}

.portfolio-demo .prompt-card p,
.portfolio-demo .health-card p,
.portfolio-demo .acceptance-card p {
  margin: 0;
  color: var(--pd-sub);
  font-size: 12px;
  line-height: 1.55;
}

.portfolio-demo .prompt-card ol {
  margin: 0;
}

.portfolio-demo .prompt-card li,
.portfolio-demo .health-card li {
  font-size: 11px;
}

.portfolio-demo .status-summary {
  display: grid;
  gap: 4px;
  min-width: 220px;
  text-align: right;
}

.portfolio-demo .status-summary strong {
  color: var(--pd-green-deep);
  font-size: 20px;
}

.portfolio-demo .status-summary span {
  color: var(--pd-sub);
  font-size: 11px;
  line-height: 1.45;
}

.portfolio-demo .stage-index {
  color: var(--pd-amber);
  font-size: 12px;
  font-weight: 900;
}

.portfolio-demo .priority-row {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}

.portfolio-demo :deep(.el-button) {
  min-height: 40px;
  border-radius: 10px;
  font-weight: 850;
}

.portfolio-demo :deep(.el-button--primary) {
  border-color: var(--pd-green);
  background: var(--pd-green);
  box-shadow: 0 3px 0 var(--pd-green-deep);
}

.portfolio-demo :deep(.el-button--primary:hover),
.portfolio-demo :deep(.el-button--primary:focus-visible) {
  border-color: var(--pd-green-deep);
  background: var(--pd-green-deep);
}

.portfolio-demo :deep(.el-button:not(.el-button--primary):not(.is-text)) {
  border-color: var(--pd-line-strong);
  background: var(--pd-surface);
  color: var(--pd-green-deep);
}

.portfolio-demo :deep(.el-button.is-text) {
  color: var(--pd-green-deep);
}

.portfolio-demo :deep(.el-tag) {
  border-radius: 999px;
  font-weight: 850;
}

@media (max-width: 920px) {
  .portfolio-demo .rehearsal-hero,
  .portfolio-demo .current-layout {
    grid-template-columns: 1fr;
  }

  .portfolio-demo .route-status {
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .portfolio-demo {
    min-height: calc(100vh - 58px);
    margin: 0;
    padding: 18px 14px 32px;
    gap: 12px;
  }

  .portfolio-demo h1 {
    font-size: 22px;
  }

  .portfolio-demo h2 {
    font-size: 17px;
  }

  .portfolio-demo .rehearsal-hero,
  .portfolio-demo .current-card,
  .portfolio-demo .guardrail-card,
  .portfolio-demo .cue-card,
  .portfolio-demo .details-panel {
    padding: 16px;
  }

  .portfolio-demo .route-tabs {
    display: flex;
    overflow-x: auto;
    margin-right: 0;
    padding-bottom: 3px;
    scrollbar-width: none;
  }

  .portfolio-demo .route-tabs button {
    min-width: 145px;
    flex: 0 0 145px;
  }

  .portfolio-demo .route-status {
    justify-content: flex-start;
  }

  .portfolio-demo .beat-strip {
    display: flex;
    overflow-x: auto;
    margin-right: 0;
    padding-bottom: 3px;
    scrollbar-width: none;
  }

  .portfolio-demo .beat-strip button {
    min-width: 142px;
    flex: 0 0 142px;
  }

  .portfolio-demo .current-head,
  .portfolio-demo .card-heading,
  .portfolio-demo .details-heading,
  .portfolio-demo .detail-intro {
    display: block;
  }

  .portfolio-demo .current-head .el-tag,
  .portfolio-demo .card-heading .text-button,
  .portfolio-demo .details-heading .el-button,
  .portfolio-demo .detail-intro .status-summary {
    margin-top: 10px;
  }

  .portfolio-demo .current-context,
  .portfolio-demo .talk-grid,
  .portfolio-demo .cue-grid {
    grid-template-columns: 1fr;
  }

  .portfolio-demo .action-row {
    align-items: stretch;
  }

  .portfolio-demo .action-row :deep(.el-button:not(.utility-button)) {
    flex: 1 1 148px;
  }

  .portfolio-demo .utility-button {
    flex: 0 0 40px;
  }

  .portfolio-demo .details-heading .el-button {
    width: 100%;
  }

  .portfolio-demo .detail-tabs {
    display: grid;
    grid-template-columns: 1fr;
  }

  .portfolio-demo .detail-tabs button {
    justify-content: flex-start;
  }

  .portfolio-demo .detail-node-list button {
    grid-template-columns: 28px minmax(0, 1fr);
  }

  .portfolio-demo .detail-node-list em {
    display: none;
  }

  .portfolio-demo .prompt-grid,
  .portfolio-demo .health-grid,
  .portfolio-demo .acceptance-grid {
    grid-template-columns: 1fr;
  }

  .portfolio-demo .status-summary {
    min-width: 0;
    text-align: left;
  }
}

@media (prefers-reduced-motion: reduce) {
  .portfolio-demo *,
  .portfolio-demo *::before,
  .portfolio-demo *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
</style>
