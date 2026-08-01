<template>
  <div class="arena arena-prepare">
    <div class="arena-prepare__page">
      <!-- 页头：标题 + 资料接入环 -->
      <div class="arena-between arena-prepare__head">
        <div>
          <div class="arena-prepare__kicker">
            准备线 · 第 {{ Math.min(mainDoneCount + 1, 3) }} 关进行中 · 已完成 {{ mainDoneCount }}/3
          </div>
          <h1 class="arena-h1 arena-prepare__title">装备你的求职背包 🎒</h1>
          <p class="arena-p" style="margin-top: 8px">三关装备齐，训练题才会贴着你的项目和目标岗位走。</p>
        </div>
        <div class="arena-card arena-prepare__readiness">
          <div
            class="arena-ring"
            :style="{
              width: '56px',
              height: '56px',
              background: `conic-gradient(var(--arena-grn) 0 ${readinessProgressPercent}%, var(--arena-line) ${readinessProgressPercent}% 100%)`
            }"
          >
            <div class="arena-ring__hole" style="width: 44px; height: 44px">
              <b style="font-size: 14px; line-height: 1">{{ readinessProgressText }}</b>
              <span class="arena-tiny" style="font-size: 8px; font-weight: 800">接入</span>
            </div>
          </div>
          <div>
            <div style="font-size: 12px; font-weight: 800">实验资料接入</div>
            <div class="arena-tiny" style="margin-top: 2px">{{ readinessHint }}</div>
          </div>
        </div>
      </div>
      <div class="arena-prepare__progress" aria-label="准备主线进度">
        <i
          v-for="node in mainNodes"
          :key="node.key"
          :class="{ 'is-done': node.state === 'done', 'is-current': node.state === 'current' || node.state === 'running' }"
        ></i>
      </div>

      <!-- 加载骨架 -->
      <div v-if="loading" class="arena-col" style="margin-top: 22px">
        <div v-for="i in 3" :key="i" class="arena-card arena-prepare__skeleton"></div>
      </div>

      <template v-else>
        <!-- 部分数据警告 -->
        <div v-if="partialLoadWarning" class="arena-prepare__warn">
          <span>⚠</span>
          <span>{{ partialLoadWarning }}</span>
          <button class="arena-btn arena-btn--txt" @click="loadAll">刷新</button>
        </div>

        <div class="arena-prepare__workspace">
          <!-- 闯关地图 -->
          <div class="arena-prepare__map">
          <div class="arena-prepare__track">
            <template v-for="(node, idx) in mainNodes" :key="node.key">
              <div v-if="idx > 0" class="arena-prepare__link" :class="{ 'is-done': mainNodes[idx - 1].state === 'done' }"></div>
              <button type="button" class="arena-prepare__node" :class="`is-${node.state}`" @click="node.action">
                <span class="arena-prepare__badge">
                  <template v-if="node.state === 'done'">✓</template>
                  <template v-else-if="node.state === 'failed'">✗</template>
                  <template v-else-if="node.state === 'running'">⏳</template>
                  <template v-else-if="node.state === 'locked'">🔒</template>
                  <template v-else>⚡</template>
                </span>
                <span class="arena-prepare__node-body">
                  <span class="arena-row" style="gap: 8px; flex-wrap: wrap">
                    <b>{{ node.title }}</b>
                    <span v-if="node.state === 'current'" class="arena-chip arena-chip--amber">当前关</span>
                    <span v-else-if="node.state === 'done'" class="arena-chip arena-chip--grn">已通关</span>
                    <span v-else-if="node.state === 'failed'" class="arena-chip arena-chip--red">挑战失败</span>
                    <span v-else-if="node.state === 'running'" class="arena-chip arena-chip--vio">生成中</span>
                    <span v-else class="arena-chip arena-chip--mut">未解锁</span>
                    <span class="arena-xp-tag">+{{ node.xp }} XP</span>
                  </span>
                  <small>{{ node.desc }}</small>
                  <span class="arena-prepare__node-cta">{{ node.cta }} →</span>
                </span>
              </button>
            </template>
          </div>

            <aside class="arena-card arena-prepare__coach">
              <div class="arena-row" style="gap: 8px">
                <span class="arena-chip arena-chip--vio">✦ AI</span>
                <b>教练提示</b>
              </div>
              <p>
                {{ currentTarget
                  ? '岗位已接入。贴上完整 JD 后，我会帮你提取关键词并生成匹配报告。'
                  : '先把目标岗位接进来，后续训练和模拟面试才会有明确的岗位上下文。' }}
              </p>
            </aside>

            <!-- 支线 -->
            <details class="arena-prepare__side">
              <summary>更多准备动作</summary>
              <div class="arena-prepare__side-grid">
                <button
                  v-for="side in sideNodes"
                  :key="side.key"
                  type="button"
                  class="arena-prepare__side-card"
                  :class="{ 'is-done': side.done }"
                  @click="router.push(side.path)"
                >
                  <span class="arena-between">
                    <span class="arena-chip" :class="side.done ? 'arena-chip--grn' : 'arena-chip--line'">{{ side.done ? '✓ 已完成' : '支线' }}</span>
                    <span class="arena-xp-tag">+{{ side.xp }} XP</span>
                  </span>
                  <b>{{ side.title }}</b>
                  <small>{{ side.desc }}</small>
                </button>
              </div>
            </details>
          </div>

          <!-- 当前关：在准备流内完成目标岗位和 JD 接入，避免用户被跳回旧岗位工作台。 -->
          <section class="arena-card arena-prepare__jd-card" aria-labelledby="prepare-jd-title">
          <div class="arena-prepare__jd-head">
            <div>
              <div class="arena-row" style="gap: 8px; flex-wrap: wrap">
                <span class="arena-chip arena-chip--amber">第 2 关 · 当前补给</span>
                <span class="arena-xp-tag">+60 XP</span>
                <span class="arena-tiny">{{ currentTarget ? parseStatusLabel(currentTarget.parseStatus) : '等待岗位描述' }}</span>
              </div>
              <h2 id="prepare-jd-title" class="arena-h2" style="margin-top: 10px">贴上你的目标岗位 JD</h2>
              <p class="arena-p" style="margin-top: 6px">
                把招聘描述贴进来，系统会提取岗位关键词，再用你的简历生成匹配报告。
              </p>
            </div>
            <div class="arena-prepare__jd-lock" aria-hidden="true">🧭</div>
          </div>

          <div class="arena-prepare__jd-grid">
            <div>
              <div class="arena-prepare__jd-fields">
                <label>
                  <span>目标岗位</span>
                  <input
                    v-model.trim="jdTitleDraft"
                    type="text"
                    maxlength="80"
                    placeholder="例如：高级 Java 后端工程师"
                    :disabled="jdSaving"
                  />
                </label>
                <label>
                  <span>公司（可选）</span>
                  <input
                    v-model.trim="jdCompanyDraft"
                    type="text"
                    maxlength="80"
                    placeholder="例如：华辰数智"
                    :disabled="jdSaving"
                  />
                </label>
              </div>
              <label class="arena-prepare__jd-textarea">
                <span>岗位 JD 原文</span>
                <textarea
                  v-model="jdDraft"
                  rows="7"
                  maxlength="12000"
                  placeholder="粘贴岗位职责、任职要求、技术栈和加分项。"
                  :disabled="jdSaving"
                />
              </label>
              <div class="arena-prepare__jd-actions">
                <button class="arena-btn arena-btn--pri" type="button" :disabled="jdSaving || !jdReady" @click="saveTargetAndParse">
                  {{ jdSaving ? '正在保存并解析…' : '⚔ 保存并解析 JD' }}
                </button>
                <button class="arena-btn arena-btn--sec" type="button" :disabled="!canMatch || jdSaving" @click="goMatchAction">
                  去生成匹配 →
                </button>
              </div>
              <p v-if="jdFeedback" class="arena-prepare__jd-feedback" role="status">{{ jdFeedback }}</p>
            </div>

            <aside class="arena-prepare__jd-tip">
              <span class="arena-chip arena-chip--vio">✦ AI 教练提示</span>
              <strong>{{ currentTarget ? '岗位描述可以继续更新' : '先把岗位上下文接进来' }}</strong>
              <p>
                {{ currentTarget
                  ? '保存新 JD 后会重新触发岗位解析，旧匹配报告不会被冒充成新结果。'
                  : '岗位描述、简历和项目证据会共同决定后续推荐题与模拟面试。' }}
              </p>
              <span class="arena-tiny">建议至少粘贴完整的职责和任职要求。</span>
            </aside>
          </div>
          </section>
        </div>

        <div class="arena-prepare__grid">
          <div class="arena-col">
            <!-- 关键词覆盖 = 技能解锁 -->
            <div class="arena-card arena-prepare__panel">
              <div class="arena-between">
                <div>
                  <div class="arena-prepare__kicker" style="color: var(--arena-vio)">岗位关键词覆盖</div>
                  <div class="arena-h3" style="margin-top: 4px">哪些技能已解锁，哪些还灰着</div>
                </div>
                <button class="arena-btn arena-btn--txt" :disabled="!latestMatch" @click="goMatchAction">报告详情 →</button>
              </div>

              <div v-if="keywordCoverage.length" class="arena-prepare__skills">
                <div v-for="item in keywordCoverage" :key="item.name" class="arena-prepare__skill" :class="`is-${skillState(item.status)}`">
                  <span class="arena-prepare__skill-icon">
                    <template v-if="skillState(item.status) === 'done'">✓</template>
                    <template v-else-if="skillState(item.status) === 'half'">◐</template>
                    <template v-else>🔒</template>
                  </span>
                  <div style="flex: 1; min-width: 0">
                    <div class="arena-row" style="gap: 8px; flex-wrap: wrap">
                      <b style="font-size: 13px">{{ item.name }}</b>
                      <span class="arena-chip" :class="skillChipClass(item.status)">{{ coverageLabel(item.status) }}</span>
                    </div>
                    <p class="arena-tiny" style="margin-top: 4px; line-height: 1.55">{{ item.evidence }}</p>
                  </div>
                  <b class="arena-prepare__skill-score">{{ item.scoreText }}</b>
                </div>
              </div>
              <div v-else class="arena-prepare__empty">
                <b>还没有岗位关键词覆盖结果</b>
                <p class="arena-p">完成岗位分析和简历匹配后，这里会显示已覆盖、部分覆盖和缺失关键词。</p>
                <button class="arena-btn arena-btn--pri" style="padding: 11px 20px" :disabled="!canMatch" @click="goMatchAction">
                  ⚔ 去生成匹配报告
                </button>
              </div>
            </div>

            <!-- 风险与训练入口 -->
            <div class="arena-card arena-prepare__panel">
              <div class="arena-between">
                <div>
                  <div class="arena-prepare__kicker" style="color: var(--arena-amber)">风险与训练入口</div>
                  <div class="arena-h3" style="margin-top: 4px">把岗位缺口变成下一步练习</div>
                </div>
                <button class="arena-btn arena-btn--txt" @click="router.push('/questions/recommendations')">查看推荐题 →</button>
              </div>
              <div class="arena-prepare__risk-grid">
                <div v-for="risk in riskItems" :key="risk.title" class="arena-prepare__risk">
                  <span class="arena-chip arena-chip--mut">{{ risk.source }}</span>
                  <b style="margin-top: 8px; font-size: 13px">{{ risk.title }}</b>
                  <p class="arena-tiny" style="margin-top: 4px; line-height: 1.55">{{ risk.desc }}</p>
                  <button class="arena-btn arena-btn--txt" style="padding: 2px 0" @click="router.push(risk.path)">{{ risk.cta }} →</button>
                </div>
              </div>
            </div>

            <!-- 项目证据 -->
            <div class="arena-card arena-prepare__panel">
              <div class="arena-between">
                <div>
                  <div class="arena-prepare__kicker">项目证据</div>
                  <div class="arena-h3" style="margin-top: 4px">把项目经历改成可追问的弹药</div>
                </div>
                <button class="arena-btn arena-btn--txt" @click="router.push('/project-evidence')">打开证据库 →</button>
              </div>
              <div v-if="projectCards.length" class="arena-col" style="gap: 10px">
                <div v-for="project in projectCards" :key="project.key" class="arena-prepare__project">
                  <div class="arena-between">
                    <b style="font-size: 13.5px">{{ project.name }}</b>
                    <button class="arena-btn arena-btn--txt" style="padding: 2px 0" @click="router.push('/interviews/create')">
                      用这个项目做模拟追问 →
                    </button>
                  </div>
                  <p class="arena-tiny" style="margin-top: 5px; line-height: 1.55">{{ project.summary }}</p>
                  <div class="arena-row" style="gap: 6px; flex-wrap: wrap; margin-top: 8px">
                    <span v-for="tag in project.tags" :key="tag" class="arena-chip arena-chip--grn">{{ tag }}</span>
                  </div>
                </div>
              </div>
              <div v-else class="arena-prepare__empty">
                <b>还没有可用于追问的项目</b>
                <p class="arena-p">在简历中补充项目背景、技术决策和结果指标后，面试房间和题目训练才能引用真实证据。</p>
                <button class="arena-btn arena-btn--sec" style="padding: 10px 18px; font-size: 13px" @click="router.push('/project-evidence')">
                  进入项目证据库
                </button>
              </div>
            </div>
          </div>

          <!-- 右栏 -->
          <div class="arena-col">
            <!-- 下一步行动 -->
            <div class="arena-card arena-prepare__panel arena-prepare__next">
              <div class="arena-row" style="gap: 8px">
                <span class="arena-chip arena-chip--grn-solid">推荐下一步</span>
              </div>
              <div class="arena-h2" style="margin-top: 12px">{{ nextStep.title }}</div>
              <p class="arena-p" style="margin-top: 8px">{{ nextStep.desc }}</p>
              <button class="arena-btn arena-btn--pri" style="padding: 13px 24px; margin-top: 16px; width: 100%" @click="router.push(nextStep.path)">
                ⚔ {{ nextStep.cta }}
              </button>
              <button class="arena-btn arena-btn--txt" style="margin-top: 8px; width: 100%" :disabled="loading || secondaryLoading" @click="loadAll">
                {{ secondaryLoading ? '正在补齐匹配与证据…' : '刷新数据' }}
              </button>
            </div>

            <!-- 简历快照 -->
            <div class="arena-card arena-prepare__panel">
              <div class="arena-between">
                <div class="arena-h3">当前主简历</div>
                <span class="arena-chip" :class="defaultResume ? 'arena-chip--grn' : 'arena-chip--mut'">
                  {{ defaultResume ? '已接入' : '待创建' }}
                </span>
              </div>
              <div v-if="defaultResume" class="arena-prepare__snapshot">
                <ResumeDocumentPreview
                  :draft="resumeSnapshotDraft"
                  template-code="ATS_SINGLE_COLUMN"
                  accent="ocean"
                  density="compact"
                />
              </div>
              <div v-else class="arena-prepare__snapshot-empty">
                <span style="font-size: 26px">📄</span>
                <b>第一份专业简历从这里开始</b>
                <p class="arena-tiny" style="line-height: 1.55">补齐姓名、岗位、技能与经历后，这里会显示真实成品缩略图。</p>
              </div>
              <b style="margin-top: 12px; font-size: 13.5px">{{ defaultResumeTitle }}</b>
              <p class="arena-tiny" style="margin-top: 3px; line-height: 1.55">{{ resumeSummary }}</p>
              <button class="arena-btn arena-btn--sec" style="padding: 10px 16px; font-size: 13px; margin-top: 12px; width: 100%" @click="goResumeAction">
                {{ defaultResume ? '进入简历工作台' : '创建第一份简历' }} →
              </button>
            </div>

            <!-- 目标岗位 -->
            <div class="arena-card arena-prepare__panel">
              <div class="arena-between">
                <div class="arena-h3">目标岗位</div>
                <span class="arena-chip" :class="targetChipClass">{{ parseStatusLabel(currentTarget?.parseStatus) }}</span>
              </div>
              <b style="margin-top: 10px; font-size: 14px">{{ currentTarget?.jobTitle || '还没有目标岗位' }}</b>
              <p class="arena-tiny" style="margin-top: 5px; line-height: 1.55">{{ targetSummary }}</p>
              <button class="arena-btn arena-btn--sec" style="padding: 10px 16px; font-size: 13px; margin-top: 12px; width: 100%" @click="goTargetAction">
                {{ currentTarget ? '查看岗位分析' : '添加目标岗位' }} →
              </button>
            </div>

            <!-- 匹配状态 -->
            <div class="arena-card arena-prepare__panel">
              <div class="arena-between">
                <div class="arena-h3">JD 匹配状态</div>
                <span class="arena-chip" :class="hasSuccessfulMatch ? 'arena-chip--grn' : 'arena-chip--mut'">
                  {{ hasSuccessfulMatch ? '已出报告' : matchStatusLabel(latestMatch?.status) || (canMatch ? '待生成' : '缺资料') }}
                </span>
              </div>
              <div class="arena-prepare__match-score">{{ matchScoreText }}</div>
              <p class="arena-tiny" style="margin-top: 6px; line-height: 1.55">{{ matchSummary }}</p>
              <button class="arena-btn arena-btn--sec" style="padding: 10px 16px; font-size: 13px; margin-top: 12px; width: 100%" :disabled="!canMatch" @click="goMatchAction">
                {{ latestMatch ? '查看 JD 匹配报告' : '生成 JD 匹配报告' }} →
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  createJobTargetApi,
  getCurrentJobTargetApi,
  getJobTargetsApi,
  parseJobDescriptionApi,
  updateJobTargetApi
} from '@/api/jobTarget'
import { getResumeDetailApi, getResumesApi } from '@/api/resume'
import { getLatestResumeJobMatchReportApi } from '@/api/resumeJobMatch'
import { getSkillProfileOverviewApi } from '@/api/skillProfile'
import { useGameProfileStore } from '@/features/game-profile'
import { useAuthStore } from '@/stores/auth'
import type { JobDescriptionAnalysisVO, TargetJobSaveDTO, TargetJobVO } from '@/types/jobTarget'
import type { ResumeDetailVO, ResumeVO } from '@/types/resume'
import type { ResumeJobMatchDetailItemVO, ResumeJobMatchReportDetailVO } from '@/types/resumeJobMatch'
import type { SkillProfileOverviewVO } from '@/types/skillProfile'
import { getErrorMessage } from '@/utils/error'
import { formatDateTime } from '@/utils/format'
import ResumeDocumentPreview from '@/views/resume/components/ResumeDocumentPreview.vue'

type UnknownRecord = Record<string, unknown>

interface KeywordCoverageItem {
  name: string
  status: string
  evidence: string
  score?: number
  scoreText: string
}

interface ProjectCard {
  key: string
  name: string
  summary: string
  tags: string[]
}

type NodeState = 'done' | 'current' | 'locked' | 'running' | 'failed'

interface MapNode {
  key: string
  title: string
  desc: string
  cta: string
  xp: number
  state: NodeState
  action: () => void
}

const router = useRouter()
const authStore = useAuthStore()
const gameProfile = useGameProfileStore()

const loading = ref(false)
const secondaryLoading = ref(false)
const partialLoadWarning = ref('')
const resumes = ref<ResumeVO[]>([])
const targets = ref<TargetJobVO[]>([])
const defaultResume = ref<ResumeVO | null>(null)
const resumeDetail = ref<ResumeDetailVO | null>(null)
const currentTarget = ref<TargetJobVO | null>(null)
const latestMatch = ref<ResumeJobMatchReportDetailVO | null>(null)
const skillOverview = ref<SkillProfileOverviewVO | null>(null)
const jdTitleDraft = ref('')
const jdCompanyDraft = ref('')
const jdDraft = ref('')
const jdSaving = ref(false)
const jdFeedback = ref('')

const parseMaybeJson = (value: unknown): unknown => {
  if (typeof value !== 'string') return value
  const text = value.trim()
  if (!text || !/^[\[{]/.test(text)) return value
  try {
    return JSON.parse(text) as unknown
  } catch {
    return value
  }
}

const pickText = (source: UnknownRecord, keys: string[], fallback = '') => {
  for (const key of keys) {
    const value = parseMaybeJson(source[key])
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number') return String(value)
  }
  return fallback
}

const toTextList = (value: unknown): string[] => {
  const parsed = parseMaybeJson(value)
  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => {
        if (typeof item === 'string') return item.trim()
        if (item && typeof item === 'object') {
          const record = item as UnknownRecord
          return pickText(record, ['skillName', 'name', 'title', 'keyword', 'summary', 'description'])
        }
        return ''
      })
      .filter(Boolean)
  }
  if (parsed && typeof parsed === 'object') {
    return Object.values(parsed as UnknownRecord)
      .flatMap((item) => toTextList(item))
      .filter(Boolean)
  }
  if (typeof parsed === 'string') {
    return parsed
      .split(/\r?\n|[；;、,，]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

const firstItems = (value: unknown, count = 3) => toTextList(value).slice(0, count)

const toPositiveId = (value: unknown): number | null => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null
}

const getResumeEditPath = () => {
  const resumeId = toPositiveId(defaultResume.value?.id)
  return resumeId ? `/resumes/${resumeId}/edit` : '/resumes/create'
}

const getTargetAnalysisPath = () => {
  const targetId = toPositiveId(currentTarget.value?.id)
  return targetId ? `/job-targets/${targetId}/analysis` : '/job-targets/create'
}

const getMatchReportPath = () => {
  const reportId = toPositiveId(latestMatch.value?.reportId)
  return reportId ? `/resume-match/${reportId}` : '/resume-match'
}

const jdReady = computed(() => jdTitleDraft.value.trim().length >= 2 && jdDraft.value.trim().length >= 20)
const canMatch = computed(() => Boolean(toPositiveId(defaultResume.value?.id) && toPositiveId(currentTarget.value?.id)))
const hasSuccessfulMatch = computed(() => latestMatch.value?.status === 'SUCCESS')
const evidenceLoading = computed(() => secondaryLoading.value && canMatch.value && !latestMatch.value)
const matchRunning = computed(() => {
  const status = latestMatch.value?.status
  return status === 'RUNNING' || status === 'PROCESSING' || status === 'PENDING'
})

const defaultResumeTitle = computed(() =>
  defaultResume.value?.resumeName || defaultResume.value?.title || '还没有可用简历'
)

const resumeSnapshotDraft = computed(() => ({
  resumeName: defaultResume.value?.resumeName,
  realName: resumeDetail.value?.realName || defaultResume.value?.realName,
  targetPosition: currentTarget.value?.jobTitle
    || resumeDetail.value?.targetPosition
    || defaultResume.value?.targetPosition,
  phone: resumeDetail.value?.phone,
  email: resumeDetail.value?.email,
  summary: resumeDetail.value?.summary || defaultResume.value?.summary,
  skillStack: resumeDetail.value?.skillStack
    || resumeDetail.value?.skills
    || defaultResume.value?.skillStack
    || defaultResume.value?.skills,
  workExperience: resumeDetail.value?.workExperience || defaultResume.value?.workExperience,
  educationExperience: resumeDetail.value?.educationExperience
    || resumeDetail.value?.education
    || defaultResume.value?.educationExperience,
  projects: resumeDetail.value?.projects || []
}))

const resumeSummary = computed(() => {
  if (!defaultResume.value) return '先创建或上传一份简历，后续匹配和今日计划才有真实依据。'
  const parts = [
    defaultResume.value.targetPosition || '目标岗位待补充',
    defaultResume.value.projectCount != null ? `${defaultResume.value.projectCount} 个项目` : '',
    defaultResume.value.updatedAt ? `更新于 ${formatDateTime(defaultResume.value.updatedAt)}` : ''
  ].filter(Boolean)
  return parts.join(' · ')
})

const targetSummary = computed(() => {
  if (!currentTarget.value) return '创建目标岗位并粘贴岗位描述后，系统才能提取关键词、风险和面试关注点。'
  return currentTarget.value.analysisSummary ||
    `${currentTarget.value.companyName || '目标公司待补充'} · ${currentTarget.value.jobLevel || '年限要求待补充'}`
})

const matchScoreText = computed(() => {
  if (evidenceLoading.value) return '读取中'
  if (!latestMatch.value) return canMatch.value ? '待匹配' : '缺资料'
  if (latestMatch.value.status === 'FAILED') return '生成失败'
  if (latestMatch.value.status !== 'SUCCESS') return matchStatusLabel(latestMatch.value.status) || '处理中'
  return latestMatch.value.overallScore != null ? `${latestMatch.value.overallScore}` : '已完成'
})

const summarizeRiskItems = (items: unknown, limit = 2) => toTextList(items).slice(0, limit)

const friendlyMatchFailure = (message?: string | null) => {
  const text = `${message || ''}`.trim()
  if (!text) return '上次匹配报告没有成功生成，请进入详情重新生成后再继续训练。'
  if (/JD|JSON|schema|内容结构|格式|exception|error|failed|parse|deserialize|serialize/i.test(text)) {
    return '上次匹配报告没有形成可信结果，系统已保留处理线索。建议重新生成，或先补齐简历项目证据和岗位描述。'
  }
  if (/岗位|简历|资料|证据|描述/.test(text) && text.length <= 80) return text
  return '上次匹配报告没有成功生成，请进入详情查看处理建议并重新生成。'
}

const matchSummary = computed(() => {
  if (!canMatch.value) return '需要同时有简历和当前目标岗位描述，才能生成岗位匹配报告。'
  if (evidenceLoading.value) return '正在读取最近匹配报告和能力画像，基础入口已经可以继续使用。'
  if (!latestMatch.value) return '还没有最新匹配报告，建议先生成一次，再进入题库或模拟面试。'
  if (latestMatch.value.status === 'FAILED') {
    return friendlyMatchFailure(latestMatch.value.errorMessage)
  }
  if (!hasSuccessfulMatch.value) return '匹配报告还在生成中，请等待完成后再把结论用于训练。'
  const strengths = summarizeRiskItems(latestMatch.value.strengths, 2)
  const gaps = summarizeRiskItems(latestMatch.value.gaps, 2)
  const parts = [
    latestMatch.value.summary || latestMatch.value.errorMessage || '',
    strengths.length ? `优势：${strengths.join('、')}` : '',
    gaps.length ? `缺口：${gaps.join('、')}` : ''
  ].filter(Boolean)
  return parts.join(' · ') || '匹配报告已生成，可查看优势、风险和下一步训练。'
})

const readinessSignals = computed(() => [
  Boolean(defaultResume.value),
  Boolean(resumeDetail.value?.projects?.length),
  Boolean(currentTarget.value),
  currentTarget.value?.parseStatus === 'PARSED',
  hasSuccessfulMatch.value,
  Boolean((skillOverview.value?.topGaps || []).length)
])
const readinessReadyCount = computed(() => readinessSignals.value.filter(Boolean).length)
const readinessProgressPercent = computed(() => Math.round((readinessReadyCount.value / readinessSignals.value.length) * 100))
const readinessProgressText = computed(() => `${readinessReadyCount.value}/${readinessSignals.value.length}`)

const readinessHint = computed(() => {
  if (!defaultResume.value) return '先补简历，后续匹配才有依据。'
  if (!currentTarget.value) return '再补一个目标岗位和岗位描述。'
  if (evidenceLoading.value) return '正在补齐最近匹配报告和项目证据。'
  if (!latestMatch.value) return '简历和岗位已具备，下一步生成匹配报告。'
  if (latestMatch.value.status === 'FAILED') return '上次匹配失败，建议先重新生成报告。'
  if (hasSuccessfulMatch.value) return '已有可信匹配依据，可以进入训练。'
  return '匹配报告还未完成，先不要把训练结论当作依据。'
})

const nextStep = computed(() => {
  if (!defaultResume.value) {
    return {
      title: '先补简历',
      desc: '没有简历时不展示诊断分，也不会生成缺少依据的项目证据。',
      cta: '创建简历',
      path: '/resumes/create'
    }
  }
  if (!currentTarget.value) {
    return {
      title: '补目标岗位',
      desc: '目标岗位会决定关键词、追问深度和面试模式。',
      cta: '创建岗位目标',
      path: '/job-targets/create'
    }
  }
  if (evidenceLoading.value) {
    return {
      title: '读取最近报告',
      desc: '先把最近匹配、项目证据和能力画像补齐，避免误把旧状态当作训练依据。',
      cta: '进入匹配中心',
      path: '/resume-match'
    }
  }
  if (!latestMatch.value) {
    return {
      title: '生成匹配报告',
      desc: '把岗位风险、简历证据和能力缺口一次性对齐。',
      cta: '发起匹配',
      path: '/resume-match'
    }
  }
  if (latestMatch.value.status === 'FAILED') {
    return {
      title: '重新生成 JD 匹配报告',
      desc: '上次报告没有成功，先恢复匹配结果再进入推荐题和岗位面试。',
      cta: '查看失败原因',
      path: getMatchReportPath()
    }
  }
  if (!hasSuccessfulMatch.value) {
    return {
      title: '等待匹配完成',
      desc: '报告未成功前不把推荐题和面试训练标成已具备依据，避免误导训练方向。',
      cta: '查看匹配进度',
      path: getMatchReportPath()
    }
  }
  if (!projectCards.value.length) {
    return {
      title: '补项目证据',
      desc: '报告已经生成，但当前简历还缺少可复盘项目，建议先补项目背景、技术决策和结果指标。',
      cta: '补项目经历',
      path: '/project-evidence'
    }
  }
  return {
    title: '进入模拟面试',
    desc: '用这份简历、目标岗位和项目证据进入岗位模拟面试，验证表达是否站得住。',
    cta: '开始模拟面试',
    path: '/interviews/create'
  }
})

// ---- 闯关地图 ----
const goResumeAction = () => {
  router.push(getResumeEditPath())
}

const goTargetAction = () => {
  router.push(getTargetAnalysisPath())
}

const syncJdDraft = () => {
  jdTitleDraft.value = currentTarget.value?.jobTitle || ''
  jdCompanyDraft.value = currentTarget.value?.companyName || ''
  jdDraft.value = currentTarget.value?.jdText || ''
}

const invalidateTargetDependentEvidence = () => {
  // 目标岗位的 JD 一旦更新，旧报告与技能画像就不再是当前岗位上下文的证据。
  // 同时让尚未结束的延迟加载失效，避免它把旧报告重新写回页面。
  loadRunId += 1
  clearEvidenceLoadTimer()
  secondaryLoading.value = false
  latestMatch.value = null
  skillOverview.value = null
}

const saveTargetAndParse = async () => {
  if (jdSaving.value || !jdReady.value) {
    jdFeedback.value = '请填写岗位名称，并粘贴至少 20 个字符的岗位描述。'
    return
  }

  jdSaving.value = true
  jdFeedback.value = ''
  const payload: TargetJobSaveDTO = {
    jobTitle: jdTitleDraft.value.trim(),
    companyName: jdCompanyDraft.value.trim() || undefined,
    jobLevel: currentTarget.value?.jobLevel || undefined,
    jdText: jdDraft.value.trim(),
    jdSource: currentTarget.value?.jdSource || 'ARENA_PREPARE'
  }

  try {
    const saved = currentTarget.value?.id
      ? await updateJobTargetApi(currentTarget.value.id, payload)
      : await createJobTargetApi(payload)
    currentTarget.value = saved
    invalidateTargetDependentEvidence()
    targets.value = [
      saved,
      ...targets.value.filter((target) => target.id !== saved.id)
    ]

    try {
      const analysis = await parseJobDescriptionApi(saved.id, { forceRefresh: true })
      currentTarget.value = {
        ...saved,
        parseStatus: analysis?.parseStatus || 'PARSED',
        analysisSummary: analysis?.summary || saved.analysisSummary,
        requiredSkills: analysis?.requiredSkills || saved.requiredSkills,
        interviewFocusPoints: analysis?.interviewFocusPoints || saved.interviewFocusPoints
      }
      jdFeedback.value = 'JD 已保存并完成解析，可以继续生成匹配报告。'
    } catch (error) {
      jdFeedback.value = `JD 已保存，但岗位解析暂未完成：${getErrorMessage(error, '请稍后重试。')}`
    }

    gameProfile.grantXpOnce('jd_paste', `target:${saved.id}:jd`)
  } catch (error) {
    jdFeedback.value = getErrorMessage(error, 'JD 保存失败，请检查网络后重试。')
  } finally {
    jdSaving.value = false
  }
}

const goMatchAction = () => {
  const reportId = toPositiveId(latestMatch.value?.reportId)
  const resumeId = toPositiveId(latestMatch.value?.resumeId ?? defaultResume.value?.id)
  const targetJobId = toPositiveId(latestMatch.value?.targetJobId ?? currentTarget.value?.id)
  const query = {
    ...(resumeId ? { resumeId } : {}),
    ...(targetJobId ? { targetJobId } : {})
  }

  if (reportId) {
    router.push({
      path: `/resume-match/${reportId}`,
      query
    })
    return
  }

  router.push({
    path: '/resume-match',
    query: {
      ...query,
      new: 1
    }
  })
}

const resumeNodeState = computed<NodeState>(() => (defaultResume.value ? 'done' : 'current'))
const targetNodeState = computed<NodeState>(() => {
  if (!defaultResume.value) return 'locked'
  if (currentTarget.value?.parseStatus === 'PARSED') return 'done'
  return 'current'
})
const matchNodeState = computed<NodeState>(() => {
  if (hasSuccessfulMatch.value) return 'done'
  if (latestMatch.value?.status === 'FAILED') return 'failed'
  if (matchRunning.value || evidenceLoading.value) return 'running'
  if (!canMatch.value) return 'locked'
  return 'current'
})

const mainNodes = computed<MapNode[]>(() => [
  {
    key: 'resume',
    title: '第 1 关 · 做出能匹配的简历',
    desc: defaultResume.value ? `${defaultResumeTitle.value} · 已就位` : '8 分钟创建第一份简历，解锁 JD 精准匹配',
    cta: defaultResume.value ? '进入简历工作台' : '创建简历',
    xp: 150,
    state: resumeNodeState.value,
    action: goResumeAction
  },
  {
    key: 'target',
    title: '第 2 关 · 锁定目标岗位',
    desc: currentTarget.value
      ? `${currentTarget.value.jobTitle || '目标岗位'} · ${parseStatusLabel(currentTarget.value.parseStatus)}`
      : '粘贴岗位 JD，题目和面试都贴着你的目标走',
    cta: currentTarget.value ? '查看岗位分析' : '添加目标岗位',
    xp: 60,
    state: targetNodeState.value,
    action: goTargetAction
  },
  {
    key: 'match',
    title: '第 3 关 · 生成 JD 匹配报告',
    desc: hasSuccessfulMatch.value
      ? `匹配分 ${matchScoreText.value} · 缺口已转成训练弹药`
      : latestMatch.value?.status === 'FAILED'
        ? '上次生成失败，重新挑战这一关'
        : matchNodeState.value === 'running'
          ? '报告生成中，稍等片刻'
          : '对齐岗位风险、简历证据和能力缺口',
    cta: hasSuccessfulMatch.value ? '查看匹配报告' : latestMatch.value?.status === 'FAILED' ? '重新挑战' : '发起匹配',
    xp: 120,
    state: matchNodeState.value,
    action: goMatchAction
  }
])

const mainDoneCount = computed(() => mainNodes.value.filter((node) => node.state === 'done').length)

const sideNodes = computed(() => [
  {
    key: 'evidence',
    title: '项目证据库',
    desc: projectCards.value.length ? `${projectCards.value.length} 个项目可复习，面试追问有弹药` : '补项目指标和技术决策',
    xp: 40,
    done: projectCards.value.length > 0,
    path: '/project-evidence'
  },
  {
    key: 'train',
    title: '回流今日训练',
    desc: hasSuccessfulMatch.value ? '匹配已就绪，今日三关按缺口排好了' : '需要先通关第 3 关匹配',
    xp: 90,
    done: hasSuccessfulMatch.value,
    path: '/dashboard'
  }
])

// ---- 关键词覆盖（技能解锁面板） ----
const toKeywordCoverage = (item: ResumeJobMatchDetailItemVO): KeywordCoverageItem => {
  const score = item.score
  const rawLevel = `${item.matchLevel || item.dimension || ''}`
  const status = rawLevel.includes('缺') || (score != null && score < 50)
    ? '缺失'
    : score != null && score < 75
      ? '部分覆盖'
      : '已覆盖'

  return {
    name: item.skillName || item.dimension || '能力关键词',
    status,
    evidence: item.evidence || item.gapDescription || item.suggestion || '暂无证据摘要',
    score,
    scoreText: score == null ? '--' : `${score}`
  }
}

const keywordCoverage = computed<KeywordCoverageItem[]>(() => {
  const details = hasSuccessfulMatch.value ? latestMatch.value?.details || [] : []
  if (details.length) return details.slice(0, 8).map(toKeywordCoverage)

  const analysis = currentTarget.value as (TargetJobVO & Partial<JobDescriptionAnalysisVO>) | null
  const fallbackKeywords = [
    ...firstItems(analysis?.requiredSkills, 4),
    ...firstItems(analysis?.interviewFocusPoints, 4)
  ]
  return [...new Set(fallbackKeywords)].slice(0, 6).map((name) => ({
    name,
    status: '待匹配',
    evidence: '已有岗位关键词，但还没有简历匹配证据。',
    scoreText: '--'
  }))
})

const skillState = (status: string) => {
  if (status === '已覆盖') return 'done'
  if (status === '部分覆盖') return 'half'
  return 'locked'
}

const skillChipClass = (status: string) => {
  if (status === '已覆盖') return 'arena-chip--grn'
  if (status === '部分覆盖') return 'arena-chip--amber'
  if (status === '缺失') return 'arena-chip--red'
  return 'arena-chip--mut'
}

const coverageLabel = (status?: string) => {
  if (status === '已覆盖' || status === '部分覆盖' || status === '缺失' || status === '待匹配') return status
  return '覆盖状态待确认'
}

// ---- 项目证据 ----
const projectCards = computed<ProjectCard[]>(() => {
  const projects = resumeDetail.value?.projects || []
  return projects.slice(0, 4).map((project, index) => {
    const tags = [
      ...toTextList(project.techStack).slice(0, 3),
      project.optimizationResult || project.optimizationResults ? '结果指标' : '',
      project.technicalChallenges || project.technicalDifficulties ? '技术难点' : ''
    ].filter(Boolean)

    return {
      key: String(project.projectId || project.id || index),
      name: project.projectName || `项目经历 ${index + 1}`,
      summary: project.technicalChallenges ||
        project.technicalDifficulties ||
        project.optimizationResult ||
        project.optimizationResults ||
        project.coreFeatures ||
        project.projectBackground ||
        project.description ||
        '建议补充业务背景、技术决策、结果指标和可复盘点。',
      tags: tags.length ? [...new Set(tags)].slice(0, 4) : ['待补技术栈']
    }
  })
})

// ---- 风险卡 ----
const riskItems = computed(() => {
  const matchGaps = hasSuccessfulMatch.value ? summarizeRiskItems(latestMatch.value?.gaps, 2) : []
  const skillGaps = hasSuccessfulMatch.value ? (skillOverview.value?.topGaps || [])
    .map((gap) => gap.skillName || gap.gapDescription || '')
    .filter(Boolean)
    .slice(0, 2) : []
  const strengths = hasSuccessfulMatch.value ? summarizeRiskItems(latestMatch.value?.strengths, 2) : []
  const risks = [...matchGaps, ...skillGaps]

  if (risks.length || strengths.length) {
    return [
      {
        source: '优势',
        title: strengths[0] || '当前简历已有可用证据',
        desc: strengths[1] || '把现有强项先保住，再向缺口靠近。',
        cta: '强化优势',
        path: '/questions/recommendations'
      },
      {
        source: '风险',
        title: risks[0] || '还没有显式风险项',
        desc: risks[1] || '把岗位风险转成推荐题和模拟面试追问。',
        cta: '去训练',
        path: '/questions/recommendations'
      },
      {
        source: '缺口',
        title: skillGaps[0] || '完善技能画像',
        desc: skillGaps[1] || '补齐项目证据后，覆盖率会更真实。',
        cta: '补简历',
        path: getResumeEditPath()
      },
      {
        source: '下一步训练',
        title: currentTarget.value ? '用岗位要求牵引训练' : '先补目标岗位',
        desc: currentTarget.value ? '把风险项转成今天就能做的训练动作。' : '先选一个目标岗位，训练动作才有锚点。',
        cta: currentTarget.value ? '查看推荐题' : '创建岗位',
        path: currentTarget.value ? '/questions/recommendations' : '/job-targets/create'
      }
    ]
  }

  return [
    {
      source: '简历证据',
      title: defaultResume.value ? '补项目指标和技术决策' : '先创建可解析简历',
      desc: defaultResume.value ? '项目经历需要能回答“为什么这么做、结果如何证明”。' : '没有简历时，项目技能卡会先保持空白，补充资料后再生成。',
      cta: defaultResume.value ? '编辑简历' : '创建简历',
      path: getResumeEditPath()
    },
    {
      source: '岗位上下文',
      title: currentTarget.value ? '生成岗位匹配报告' : '补充目标岗位描述',
      desc: currentTarget.value ? '让系统从真实岗位描述中提取训练优先级。' : '岗位描述是推荐题和模拟面试模式的主要依据。',
      cta: currentTarget.value ? '发起匹配' : '创建岗位',
      path: currentTarget.value ? '/resume-match' : '/job-targets/create'
    },
    {
      source: '训练动作',
      title: hasSuccessfulMatch.value ? '把缺口转成训练计划' : '先生成岗位匹配报告',
      desc: hasSuccessfulMatch.value ? '优先处理最影响面试表达的短板。' : '报告成功后才会把风险、优势和下一步训练作为依据。',
      cta: hasSuccessfulMatch.value ? '去训练' : '去匹配',
      path: hasSuccessfulMatch.value ? '/questions/recommendations' : '/resume-match'
    },
    {
      source: '项目卡片',
      title: projectCards.value.length ? '复盘项目证据' : '补项目经历',
      desc: projectCards.value.length ? '把项目背景、技术决策和结果指标补齐。' : '项目卡会帮助你把简历改成可追问证据。',
      cta: '打开证据库',
      path: '/project-evidence'
    }
  ]
})

// ---- 状态文案 ----
const parseStatusLabel = (status?: string) => {
  if (status === 'PARSED') return '岗位已分析'
  if (status === 'PARSING') return '解析中'
  if (status === 'FAILED') return '解析失败'
  if (!currentTarget.value) return '缺岗位'
  return '待解析'
}

const targetChipClass = computed(() => {
  const status = currentTarget.value?.parseStatus
  if (status === 'PARSED') return 'arena-chip--grn'
  if (status === 'PARSING') return 'arena-chip--amber'
  if (status === 'FAILED') return 'arena-chip--red'
  return 'arena-chip--mut'
})

const matchStatusLabel = (status?: string) => {
  if (status === 'SUCCESS') return '已完成'
  if (status === 'FAILED') return '生成失败'
  if (status === 'RUNNING') return '生成中'
  if (status === 'PROCESSING') return '生成中'
  if (status === 'PENDING') return '排队中'
  return ''
}

// ---- 数据加载（沿用旧 Hub 的分阶段加载） ----
const isFulfilled = <T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> =>
  result.status === 'fulfilled'

let loadRunId = 0
let evidenceLoadTimer: ReturnType<typeof window.setTimeout> | null = null

const clearEvidenceLoadTimer = () => {
  if (evidenceLoadTimer != null) {
    window.clearTimeout(evidenceLoadTimer)
    evidenceLoadTimer = null
  }
}

const loadEvidenceData = async (runId: number, baseWarnings: string[]) => {
  const warnings = [...baseWarnings]
  const resume = defaultResume.value
  const target = currentTarget.value
  const resumeId = toPositiveId(resume?.id)
  const targetId = toPositiveId(target?.id)

  try {
    const [detailResult, matchResult, overviewResult] = await Promise.allSettled([
      resumeId
        ? getResumeDetailApi(resumeId)
        : Promise.resolve(null),
      resumeId && targetId
        ? getLatestResumeJobMatchReportApi(resumeId, targetId)
        : Promise.resolve(null),
      targetId
        ? getSkillProfileOverviewApi(targetId)
        : Promise.resolve(null)
    ])

    if (runId !== loadRunId) return

    if (isFulfilled(detailResult)) {
      resumeDetail.value = detailResult.value
    } else {
      warnings.push(getErrorMessage(detailResult.reason, '简历详情读取失败，项目证据暂时不可用'))
    }

    if (isFulfilled(matchResult)) {
      latestMatch.value = matchResult.value
    } else {
      warnings.push(getErrorMessage(matchResult.reason, '最新匹配报告读取失败，暂不把匹配结果作为训练依据'))
    }

    if (isFulfilled(overviewResult)) {
      skillOverview.value = overviewResult.value
    } else {
      warnings.push(getErrorMessage(overviewResult.reason, '能力画像读取失败，训练缺口暂时不可用'))
    }
  } catch (error) {
    if (runId === loadRunId) {
      warnings.push(getErrorMessage(error, '匹配报告和项目证据暂时不可用，基础入口已保留。'))
    }
  } finally {
    if (runId === loadRunId) {
      secondaryLoading.value = false
      partialLoadWarning.value = warnings.filter(Boolean).join('；')
    }
  }
}

const deferEvidenceLoad = (runId: number, baseWarnings: string[]) => {
  clearEvidenceLoadTimer()
  if (!defaultResume.value && !currentTarget.value) {
    secondaryLoading.value = false
    partialLoadWarning.value = baseWarnings.filter(Boolean).join('；')
    return
  }
  secondaryLoading.value = true
  evidenceLoadTimer = window.setTimeout(() => {
    evidenceLoadTimer = null
    void loadEvidenceData(runId, baseWarnings)
  }, 160)
}

const loadAll = async () => {
  const runId = ++loadRunId
  clearEvidenceLoadTimer()
  loading.value = true
  secondaryLoading.value = false
  partialLoadWarning.value = ''
  latestMatch.value = null
  skillOverview.value = null
  resumeDetail.value = null

  let warnings: string[] = []
  try {
    const [resumeResult, targetResult, currentResult] = await Promise.allSettled([
      getResumesApi({ pageNo: 1, pageSize: 50 }),
      getJobTargetsApi({}),
      getCurrentJobTargetApi()
    ])

    if (isFulfilled(resumeResult)) {
      resumes.value = Array.isArray(resumeResult.value.records) ? resumeResult.value.records : []
    } else {
      resumes.value = []
      warnings.push(getErrorMessage(resumeResult.reason, '简历列表读取失败'))
    }

    if (isFulfilled(targetResult)) {
      targets.value = Array.isArray(targetResult.value) ? targetResult.value : []
    } else {
      targets.value = []
      warnings.push(getErrorMessage(targetResult.reason, '岗位目标读取失败'))
    }

    defaultResume.value = resumes.value.find((item) => item.isDefault === 1) || resumes.value[0] || null
    if (!isFulfilled(currentResult)) {
      warnings.push(getErrorMessage(currentResult.reason, '当前岗位读取失败，已先使用岗位列表中的信息'))
    }
    currentTarget.value = (isFulfilled(currentResult) ? currentResult.value : null) ||
      targets.value.find((item) => item.currentFlag === 1) ||
      targets.value[0] ||
      null
    syncJdDraft()

    partialLoadWarning.value = warnings.filter(Boolean).join('；')
  } catch (error) {
    resumes.value = []
    targets.value = []
    defaultResume.value = null
    currentTarget.value = null
    warnings = [getErrorMessage(error, '基础数据暂时不可用，已保留创建简历、JD 匹配和项目证据入口。')]
    partialLoadWarning.value = warnings.join('；')
  } finally {
    if (runId === loadRunId) {
      loading.value = false
      deferEvidenceLoad(runId, warnings)
    }
  }
}

onMounted(() => {
  gameProfile.hydrate(authStore.userInfo?.id)
  void loadAll()
})

onBeforeUnmount(() => {
  loadRunId += 1
  clearEvidenceLoadTimer()
})
</script>

<style scoped lang="scss">
.arena-prepare {
  min-height: calc(100vh - 64px);
  margin: -14px -24px -28px;

  &__page {
    max-width: 1060px;
    margin: 0 auto;
    padding: 28px 34px 42px;
    position: relative;
    z-index: 1;
  }

  &__head {
    flex-wrap: wrap;
  }

  &__kicker {
    font-size: 12.5px;
    font-weight: 800;
    color: var(--arena-grn-d);
  }

  &__title {
    margin-top: 5px;
  }

  &__readiness {
    display: none;
    align-items: center;
    gap: 14px;
    padding: 12px 18px;
    max-width: 340px;
  }

  &__progress {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    margin-top: 16px;

    i {
      display: block;
      height: 6px;
      border-radius: 999px;
      background: var(--arena-line);

      &.is-done {
        background: var(--arena-grn);
      }

      &.is-current {
        background: linear-gradient(90deg, var(--arena-grn), var(--arena-lime));
      }
    }
  }

  &__warn {
    margin-top: 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 16px;
    border-radius: 14px;
    background: var(--arena-amber-soft);
    color: var(--arena-amber);
    font-size: 12.5px;
    font-weight: 600;
  }

  &__workspace {
    margin-top: 20px;
    display: grid;
    grid-template-columns: minmax(280px, 405px) minmax(0, 1fr);
    gap: 20px;
    align-items: start;
  }

  &__map {
    min-width: 0;
  }

  &__jd-card {
    padding: 22px 24px;
    border: 1.5px solid #b9e7cd;
    background: linear-gradient(135deg, #f0fbf4, #ffffff 72%);
  }

  &__jd-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
  }

  &__jd-lock {
    display: inline-flex;
    flex: none;
    width: 46px;
    height: 46px;
    align-items: center;
    justify-content: center;
    border-radius: 14px;
    background: var(--arena-amber-soft);
    font-size: 22px;
  }

  &__jd-grid {
    display: block;
    margin-top: 18px;
  }

  &__jd-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  &__jd-fields label,
  &__jd-textarea {
    display: flex;
    flex-direction: column;
    gap: 6px;

    > span {
      color: var(--arena-sub);
      font-size: 12px;
      font-weight: 800;
    }

    input,
    textarea {
      width: 100%;
      box-sizing: border-box;
      border: 1.5px solid var(--arena-line);
      border-radius: 13px;
      outline: 0;
      background: #fff;
      color: var(--arena-ink);
      font: inherit;
      line-height: 1.55;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;

      &:focus {
        border-color: var(--arena-grn);
        box-shadow: 0 0 0 3px var(--arena-grn-soft);
      }

      &:disabled {
        cursor: wait;
        opacity: 0.7;
      }
    }

    input {
      min-height: 42px;
      padding: 0 12px;
    }
  }

  &__jd-textarea {
    margin-top: 12px;

    textarea {
      min-height: 168px;
      padding: 11px 12px;
      resize: vertical;
    }
  }

  &__jd-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 14px;
  }

  &__jd-feedback {
    margin: 10px 0 0;
    color: var(--arena-sub);
    font-size: 12px;
    line-height: 1.55;
  }

  &__jd-tip {
    display: none;
    flex-direction: column;
    align-items: flex-start;
    gap: 9px;
    padding: 16px;
    border: 1.5px solid #d7ccff;
    border-radius: 16px;
    background: linear-gradient(150deg, var(--arena-vio-soft), #fff 76%);

    strong {
      font-size: 14px;
    }

    p {
      margin: 0;
      color: var(--arena-sub);
      font-size: 12px;
      line-height: 1.65;
    }
  }

  &__track {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__link {
    flex: none;
    width: 4px;
    height: 18px;
    border-radius: 99px;
    background: var(--arena-line);
    margin: 0 0 0 32px;

    &.is-done {
      background: linear-gradient(90deg, var(--arena-grn), var(--arena-lime));
    }
  }

  &__node {
    min-width: 0;
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 14px;
    border: 2px solid var(--arena-line);
    border-radius: 16px;
    background: #fff;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;

    &:hover {
      transform: translateY(-2px);
      border-color: var(--arena-grn);
      box-shadow: 0 6px 16px rgba(23, 178, 106, 0.12);
    }

    &.is-done {
      border-color: #b9e7cd;
      background: linear-gradient(135deg, #f0fbf4, #ffffff 75%);
    }

    &.is-current {
      border-color: var(--arena-amber);
      box-shadow: 0 0 0 3px var(--arena-amber-soft);
    }

    &.is-locked {
      cursor: pointer;
      background: #fafbfa;
    }

    &.is-failed {
      border-color: var(--arena-red);
    }
  }

  &__badge {
    flex: none;
    width: 40px;
    height: 40px;
    border-radius: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 900;
    background: var(--arena-line);
    color: var(--arena-mut);

    .is-done & {
      background: var(--arena-grn);
      color: #fff;
    }

    .is-current & {
      background: var(--arena-amber);
      color: #fff;
      animation: arenaPulse 1.6s ease-in-out infinite;
    }

    .is-failed & {
      background: var(--arena-red);
      color: #fff;
    }

    .is-running & {
      background: var(--arena-vio-soft);
    }
  }

  &__node-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;

    b {
      font-size: 13.5px;
    }

    small {
      color: var(--arena-sub);
      font-size: 12px;
      line-height: 1.5;
    }
  }

  &__node-cta {
    font-size: 12.5px;
    font-weight: 800;
    color: var(--arena-grn-d);
  }

  &__side {
    margin-top: 14px;

    summary {
      color: var(--arena-sub);
      cursor: pointer;
      font-size: 12px;
      font-weight: 800;
      list-style: none;

      &::-webkit-details-marker {
        display: none;
      }
    }
  }

  &__coach {
    display: grid;
    gap: 8px;
    margin-top: 14px;
    padding: 15px 16px;
    border-color: #d7ccff;
    background: var(--arena-vio-soft);

    p {
      margin: 0;
      color: var(--arena-sub);
      font-size: 11.5px;
      line-height: 1.6;
    }
  }

  &__side-grid {
    margin-top: 10px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  &__side-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 13px 16px;
    border: 1.5px dashed var(--arena-line);
    border-radius: 14px;
    background: #fff;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.15s;

    &:hover {
      border-color: var(--arena-grn);
    }

    &.is-done {
      border-style: solid;
      border-color: #b9e7cd;
    }

    b {
      font-size: 13px;
    }

    small {
      color: var(--arena-sub);
      font-size: 11.5px;
      line-height: 1.5;
    }
  }

  &__grid {
    margin-top: 20px;
    display: grid;
    grid-template-columns: 1.55fr 1fr;
    gap: 20px;
  }

  &__panel {
    padding: 20px 22px;
  }

  &__next {
    background: linear-gradient(135deg, #f0fbf4, #ffffff 70%);
    border-color: #b9e7cd;
  }

  &__skills {
    margin-top: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__skill {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 14px;
    border: 1.5px solid var(--arena-line2);
    border-radius: 13px;

    &.is-done {
      border-color: #d5efe0;
      background: #fbfefc;
    }

    &.is-locked {
      background: #fafbfa;
    }
  }

  &__skill-icon {
    flex: none;
    width: 28px;
    height: 28px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 900;
    background: var(--arena-line);
    color: var(--arena-mut);

    .is-done & {
      background: var(--arena-grn-soft);
      color: var(--arena-grn-d);
    }

    .is-half & {
      background: var(--arena-amber-soft);
      color: var(--arena-amber);
    }
  }

  &__skill-score {
    flex: none;
    font-size: 15px;
    color: var(--arena-sub);
  }

  &__risk-grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  &__risk {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 13px 15px;
    border: 1.5px solid var(--arena-line2);
    border-radius: 13px;
  }

  &__project {
    padding: 13px 15px;
    border: 1.5px solid var(--arena-line2);
    border-radius: 13px;
  }

  &__snapshot {
    margin-top: 12px;
    border: 1.5px solid var(--arena-line2);
    border-radius: 12px;
    overflow: hidden;
    max-height: 260px;
  }

  &__snapshot-empty {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 22px 14px;
    border: 1.5px dashed var(--arena-line);
    border-radius: 12px;
    text-align: center;

    b {
      font-size: 13px;
    }
  }

  &__match-score {
    margin-top: 10px;
    font-size: 30px;
    font-weight: 900;
    letter-spacing: -0.5px;
    background: linear-gradient(100deg, var(--arena-grn), var(--arena-lime));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  &__empty {
    margin-top: 14px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 18px;
    border: 1.5px dashed var(--arena-line);
    border-radius: 13px;

    b {
      font-size: 13.5px;
    }
  }

  &__skeleton {
    height: 120px;
    background: linear-gradient(90deg, #fff, #f4f7f4, #fff);
    background-size: 200% 100%;
    animation: arenaShimmer 1.4s infinite;
  }
}

@keyframes arenaPulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 var(--arena-amber-soft);
  }
  50% {
    box-shadow: 0 0 0 6px var(--arena-amber-soft);
  }
}

@keyframes arenaShimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

  @media (max-width: 720px) {
  .arena-prepare {
    margin: -12px -12px 0;

    &__page {
      padding: 18px 14px 26px;
    }

    &__track {
      flex-direction: column;
      gap: 10px;
    }

    &__link {
      width: 4px;
      height: 18px;
      margin: 0 0 0 32px;
    }

    &__workspace,
    &__grid,
    &__side-grid,
    &__risk-grid,
    &__jd-grid,
    &__jd-fields {
      grid-template-columns: 1fr;
    }

    &__jd-card {
      padding: 18px;
    }

    &__jd-head {
      gap: 12px;
    }

    &__jd-lock {
      display: none;
    }
  }
}
</style>
