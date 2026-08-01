<template>
  <div class="arena arena-iv">
    <div class="arena-iv__page">
      <!-- 页头 -->
      <div class="arena-between arena-iv__head">
        <div>
          <div class="arena-iv__kicker">面试 · 副本大厅</div>
          <h1 class="arena-h1 arena-iv__title">选一个副本，开练 ⚔️</h1>
          <p class="arena-p" style="margin-top: 6px; max-width: 620px">
            系统会基于当前简历、目标岗位和已核验资料给出推荐；缺少资料时会明确提示，并退回轻量技术面。
          </p>
        </div>
        <div class="arena-row" style="flex-wrap: wrap">
          <button class="arena-btn arena-btn--sec" style="padding: 9px 14px; font-size: 12.5px" @click="router.push('/dashboard')">返回今日计划</button>
          <button class="arena-btn arena-btn--sec" style="padding: 9px 14px; font-size: 12.5px" @click="router.push('/resumes')">进入简历中心</button>
          <button class="arena-btn arena-btn--sec" style="padding: 9px 14px; font-size: 12.5px" @click="router.push('/interviews/history')">面试历史</button>
        </div>
      </div>

      <!-- 推荐计划保留为辅助入口，首屏先让用户完成副本选择。 -->
      <details class="arena-card arena-iv__boss">
        <summary>推荐副本与依据</summary>
        <div class="arena-iv__boss-main">
          <div class="arena-row" style="gap: 8px; flex-wrap: wrap">
            <span class="arena-chip arena-chip--grn-solid">👑 Boss 副本 · 推荐</span>
            <span class="arena-chip" :class="quickTrustChipClass">{{ quickRecommendationTrustLabel }}</span>
            <span class="arena-chip" :class="voicePreflightReady ? 'arena-chip--grn' : 'arena-chip--mut'">
              {{ voicePreflightReady ? '语音设备已预检' : '语音可选' }}
            </span>
            <span class="arena-xp-tag">通关 +200 XP</span>
          </div>
          <h2 class="arena-h2" style="margin-top: 13px">{{ quickInterviewTitle }}</h2>
          <p class="arena-p" style="margin-top: 8px">{{ quickInterviewDesc }}</p>

          <div class="arena-iv__plan-grid">
            <article v-for="item in quickPlanItems" :key="item.label">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <p>{{ item.desc }}</p>
            </article>
          </div>

          <div class="arena-iv__context-grid">
            <article v-for="item in quickStartItems" :key="item.label">
              <component :is="item.icon" :size="15" />
              <div>
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </article>
          </div>

          <div v-if="isApplicationContextFlow || applicationPackageContext" class="arena-iv__app-context">
            <div class="arena-between" style="flex-wrap: wrap">
              <div>
                <span class="arena-tiny">{{ applicationContextTitle }}</span>
                <b style="display: block; font-size: 13px; margin-top: 2px">{{ jdContextText }}</b>
              </div>
              <span class="arena-chip" :class="applicationPackageContext?.readinessLevel === 'READY' ? 'arena-chip--grn' : 'arena-chip--amber'">
                {{ applicationPackageReadinessText }}
              </span>
            </div>
            <p class="arena-tiny" style="margin-top: 8px">文本模拟面试是本次主链路；语音只作为后续可降级预览，不会阻塞当前创建。</p>
            <div class="arena-iv__app-grid">
              <article v-for="item in applicationContextItems" :key="item.label" :class="{ 'is-missing': item.missing }">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </article>
            </div>
          </div>

          <ul class="arena-iv__reasons">
            <li v-for="item in quickRecommendation.reasons" :key="item">{{ item }}</li>
          </ul>

          <details class="arena-iv__trust">
            <summary>推荐依据与可信边界</summary>
            <p>{{ quickRecommendationBoundaryText }}</p>
            <div class="arena-iv__trust-grid">
              <article v-for="item in quickContextTrustItems" :key="item.label" :class="{ 'is-missing': item.missing }">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </article>
            </div>
          </details>
        </div>

        <div class="arena-iv__boss-actions">
          <div v-if="quickStartNotice" class="arena-iv__warn">⚠ {{ quickStartNotice }}</div>
          <div v-if="routeContextNotice" class="arena-iv__warn">⚠ {{ routeContextNotice }}</div>
          <button
            class="arena-btn arena-btn--pri"
            style="padding: 14px 26px; width: 100%"
            :disabled="creating || resumeLoading || matchReportVerifyLoading"
            @click="handleQuickCreate"
          >
            {{ creating ? '创建中…' : '⚔ 开始推荐面试' }}
          </button>
          <button class="arena-btn arena-btn--sec" style="padding: 11px 16px; font-size: 13px; width: 100%" :disabled="creating || resumeLoading || matchReportVerifyLoading" @click="applyQuickRecommendation">
            ✦ 使用推荐并微调
          </button>
          <button class="arena-btn arena-btn--sec" style="padding: 11px 16px; font-size: 13px; width: 100%" @click="scrollToConfig">
            查看可选微调
          </button>
          <button class="arena-btn arena-btn--txt" style="width: 100%" @click="voiceDeviceCheckVisible = true">
            🎙 语音设备预检
          </button>
        </div>
      </details>

      <div class="arena-iv__grid">
        <div class="arena-col">
          <!-- 副本选择 -->
          <div class="arena-card arena-iv__panel">
            <div class="arena-between">
              <div>
                <div class="arena-iv__kicker" style="color: var(--arena-vio)">第 1 步 · 选副本</div>
                <div class="arena-h3" style="margin-top: 4px">今晚打哪个副本？</div>
              </div>
              <span class="arena-tiny">完成任意一场 +200 XP</span>
            </div>
            <div class="arena-iv__dungeons">
              <button
                v-for="item in primaryModeCards"
                :key="item.key"
                type="button"
                class="arena-iv__dungeon"
                :class="{ 'is-active': selectedModeKey === item.key, 'is-recommended': recommendedModeKey === item.key }"
                @click="selectDungeon(item)"
              >
                <div class="arena-between">
                  <span class="arena-iv__dungeon-icon"><component :is="item.icon" :size="17" /></span>
                  <span v-if="recommendedModeKey === item.key" class="arena-chip arena-chip--grn-solid">推荐副本</span>
                  <span v-else-if="selectedModeKey === item.key" class="arena-chip arena-chip--amber">当前副本</span>
                </div>
                <b>{{ item.title }}</b>
                <small>{{ item.desc }}</small>
                <div class="arena-row" style="gap: 6px; flex-wrap: wrap">
                  <span class="arena-chip arena-chip--mut">{{ item.badge }}</span>
                  <span class="arena-tiny" style="color: var(--arena-amber); font-weight: 800">{{ modeStars(item) }}</span>
                  <span class="arena-tiny">{{ item.defaults?.questionCount || 8 }} 题</span>
                </div>
              </button>
            </div>

            <div class="arena-iv__selection-summary">
              <div>
                <span class="arena-chip arena-chip--grn">当前副本</span>
                <b>{{ selectedModeTitle }}</b>
                <p>{{ selectedModeDesc }}</p>
                <p class="arena-tiny">上下文：{{ selectedResumeName }} · {{ form.targetPosition || '通用岗位' }}</p>
              </div>
              <div class="arena-iv__selection-actions">
                <button
                  class="arena-btn arena-btn--pri"
                  type="button"
                  :disabled="creating || resumeLoading || matchReportVerifyLoading"
                  @click="handleCreate"
                >
                  {{ creating ? '创建中…' : '⚔ 开始面试' }}
                </button>
                <button class="arena-btn arena-btn--sec" type="button" @click="toggleConfigExpanded">
                  微调
                </button>
              </div>
            </div>

            <details class="arena-iv__advanced-modes" :open="showAdvancedModes">
              <summary>
                <span>更多训练方式</span>
                <small>压力追问、HR 行为和行业场景</small>
              </summary>
              <div class="arena-iv__dungeons arena-iv__dungeons--advanced">
                <button
                  v-for="item in advancedModeCards"
                  :key="item.key"
                  type="button"
                  class="arena-iv__dungeon"
                  :class="{ 'is-active': selectedModeKey === item.key, 'is-recommended': recommendedModeKey === item.key }"
                  @click="selectDungeon(item)"
                >
                  <div class="arena-between">
                    <span class="arena-iv__dungeon-icon"><component :is="item.icon" :size="17" /></span>
                    <span v-if="recommendedModeKey === item.key" class="arena-chip arena-chip--grn-solid">推荐副本</span>
                    <span v-else-if="selectedModeKey === item.key" class="arena-chip arena-chip--amber">当前副本</span>
                  </div>
                  <b>{{ item.title }}</b>
                  <small>{{ item.desc }}</small>
                  <div class="arena-row" style="gap: 6px; flex-wrap: wrap">
                    <span class="arena-chip arena-chip--mut">{{ item.badge }}</span>
                    <span class="arena-tiny" style="color: var(--arena-amber); font-weight: 800">{{ modeStars(item) }}</span>
                    <span class="arena-tiny">{{ item.defaults?.questionCount || 8 }} 题</span>
                  </div>
                </button>
              </div>
            </details>
          </div>

          <!-- 可选微调 -->
          <div ref="configPanelRef" class="arena-card arena-iv__panel">
            <div class="arena-between" style="flex-wrap: wrap">
              <div>
                <div class="arena-iv__kicker" style="color: var(--arena-amber)">可选微调</div>
                <div class="arena-h3" style="margin-top: 4px">默认按推荐计划开始，想换配置再展开</div>
              </div>
              <button class="arena-btn arena-btn--sec" style="padding: 9px 15px; font-size: 12.5px" @click="toggleConfigExpanded">
                {{ configExpanded ? '收起微调' : '展开微调' }}
              </button>
            </div>

            <div v-if="!configExpanded" class="arena-iv__collapsed">
              <b style="font-size: 13.5px">{{ quickInterviewTitle }}</b>
              <p class="arena-tiny" style="margin-top: 4px">{{ quickInterviewDesc }}</p>
              <div class="arena-iv__context-grid" style="margin-top: 12px">
                <article v-for="item in quickStartItems" :key="item.label">
                  <component :is="item.icon" :size="15" />
                  <div>
                    <span>{{ item.label }}</span>
                    <strong>{{ item.value }}</strong>
                  </div>
                </article>
              </div>
            </div>

            <template v-else>
              <el-form ref="formRef" class="arena-iv__form" :model="form" :rules="rules" label-position="top">
                <div class="arena-iv__form-section">
                  <div class="arena-iv__form-title"><span>01</span>面试目标</div>
                  <div class="arena-iv__form-grid">
                    <el-form-item label="面试名称">
                      <el-input v-model.trim="form.interviewName" placeholder="可选，例如：Java 微服务中级模拟面试" />
                    </el-form-item>
                    <el-form-item label="目标岗位" prop="targetPosition">
                      <el-select v-model="form.targetPosition" :teleported="false" style="width: 100%">
                        <el-option v-for="item in targetPositionOptions" :key="item.value" :label="item.label" :value="item.value" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="经验年限" prop="experienceLevel">
                      <el-select v-model="form.experienceLevel" :teleported="false" style="width: 100%">
                        <el-option v-for="item in experienceLevelOptions" :key="item.value" :label="item.label" :value="item.value" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="难度等级" prop="difficulty">
                      <el-select v-model="form.difficulty" :teleported="false" style="width: 100%">
                        <el-option v-for="item in difficultyOptions" :key="item.value" :label="item.label" :value="item.value" />
                      </el-select>
                    </el-form-item>
                  </div>
                </div>

                <div class="arena-iv__form-section">
                  <div class="arena-iv__form-title"><span>02</span>训练节奏</div>
                  <div class="arena-iv__form-grid">
                    <el-form-item label="行业方向" prop="industryDirection">
                      <el-select v-model="form.industryDirection" :teleported="false" style="width: 100%">
                        <el-option v-for="item in industryDirectionOptions" :key="item.value" :label="item.label" :value="item.value" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="面试官风格" prop="interviewerStyle">
                      <el-select v-model="form.interviewerStyle" :teleported="false" style="width: 100%">
                        <el-option v-for="item in interviewerStyleOptions" :key="item.value" :label="item.label" :value="item.value" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="面试模式">
                      <el-select v-model="form.practiceMode" :teleported="false" style="width: 100%">
                        <el-option v-for="item in interviewPracticeModeOptions" :key="item.value" :label="item.label" :value="item.value" />
                      </el-select>
                      <div class="arena-tiny" style="margin-top: 5px">正式模式：面试结束后统一生成报告；练习模式：每题后可查看详细点评。</div>
                    </el-form-item>
                    <el-form-item label="题目数量">
                      <el-input-number v-model="form.questionCount" :min="1" :max="20" />
                    </el-form-item>
                  </div>
                </div>

                <div v-if="isIndustryMode" class="arena-iv__form-section">
                  <div class="arena-iv__form-title"><span>03</span>行业模板</div>
                  <el-form-item label="行业场景模板" prop="industryTemplateId">
                    <el-select
                      v-model="form.industryTemplateId"
                      v-loading="industryTemplateLoading"
                      :teleported="false"
                      placeholder="请选择行业场景模板"
                      style="width: 100%"
                    >
                      <el-option
                        v-for="template in industryTemplates"
                        :key="template.industryTemplateId"
                        :label="template.industryName"
                        :value="template.industryTemplateId"
                      />
                    </el-select>
                    <div v-if="industryTemplateError" class="arena-tiny" style="color: var(--arena-red); margin-top: 5px">
                      {{ industryTemplateError }}
                    </div>
                    <div v-else-if="!industryTemplateLoading && !industryTemplates.length" class="arena-tiny" style="margin-top: 5px">
                      暂无可用行业模板，可以先选择技术八股、项目深挖或综合模拟。
                    </div>
                  </el-form-item>

                  <article v-if="selectedIndustryTemplate" class="arena-iv__tpl-preview">
                    <div class="arena-between">
                      <div>
                        <b style="font-size: 13px">{{ selectedIndustryTemplate.industryName }}</b>
                        <p class="arena-tiny" style="margin-top: 3px">{{ selectedIndustryTemplate.description || '暂无行业说明' }}</p>
                      </div>
                      <span class="arena-chip arena-chip--vio">{{ selectedIndustryTemplate.industryCode || '行业模板' }}</span>
                    </div>
                    <div class="arena-row" style="gap: 6px; flex-wrap: wrap; margin-top: 10px">
                      <span v-for="item in templateHighlights" :key="item" class="arena-chip arena-chip--mut">{{ item }}</span>
                    </div>
                  </article>
                </div>

                <div class="arena-iv__form-section">
                  <div class="arena-iv__form-title"><span>{{ isIndustryMode ? '04' : '03' }}</span>简历上下文</div>
                  <div class="arena-iv__resume-switch">
                    <div>
                      <b style="font-size: 13px">基于简历生成追问</b>
                      <p class="arena-tiny" style="margin-top: 3px">项目深挖和综合模拟建议选择简历，方便围绕你的真实经历追问。</p>
                    </div>
                    <el-switch v-model="useResume" />
                  </div>
                  <el-form-item v-if="useResume || isJobTargetFlow" label="选择简历" prop="resumeId">
                    <el-select
                      v-model="form.resumeId"
                      filterable
                      :teleported="false"
                      placeholder="请选择简历"
                      style="width: 100%"
                      v-loading="resumeLoading"
                    >
                      <el-option
                        v-for="resume in resumes"
                        :key="resume.id"
                        :label="resume.isDefault === 1 ? `${resume.resumeName}（默认）` : resume.resumeName"
                        :value="resume.id"
                      />
                    </el-select>
                    <div v-if="resumeLoadError" class="arena-iv__warn" style="margin-top: 6px">
                      <span>{{ resumeLoadError }}</span>
                      <button class="arena-btn arena-btn--txt" :disabled="resumeLoading" @click="fetchResumes">重试</button>
                    </div>
                    <div v-else-if="!resumeLoading && !resumes.length" class="arena-tiny" style="margin-top: 5px">
                      暂无可选简历，请先进入简历中心创建后再开启简历上下文。
                    </div>
                  </el-form-item>
                </div>

                <div v-if="resumeRequired" class="arena-iv__warn">⚠ 当前面试模式建议选择简历，便于进行项目深挖和综合追问。</div>
                <div v-if="isJobTargetFlow && !quickResumeId" class="arena-iv__warn">
                  ⚠ 目标岗位推荐缺少可用简历时会先降级为轻量技术面；也可以先进入简历中心创建简历后再回来。
                </div>
                <div v-if="routeContextNotice" class="arena-iv__warn">⚠ {{ routeContextNotice }}</div>

                <div class="arena-row" style="margin-top: 16px; flex-wrap: wrap">
                  <button class="arena-btn arena-btn--pri" style="padding: 13px 24px" :disabled="creating" @click="handleCreate">
                    {{ creating ? '创建中…' : '⚔ 按当前计划开始' }}
                  </button>
                  <button class="arena-btn arena-btn--sec" style="padding: 12px 18px; font-size: 13px" :disabled="creating" @click="applyQuickRecommendation">
                    恢复推荐计划
                  </button>
                </div>
              </el-form>

              <div class="arena-iv__form-section" style="margin-top: 18px">
                <InterviewScenarioSelector
                  v-model="selectedScenario"
                  :mode-key="selectedModeKey"
                />
              </div>
            </template>
          </div>
        </div>

        <!-- 右栏 -->
        <div class="arena-col">
          <div class="arena-card arena-iv__panel">
            <div class="arena-h3">本轮闯关流程</div>
            <div class="arena-iv__wizard">
              <article v-for="(step, index) in wizardSteps" :key="step.title" :class="{ 'is-active': index === 0 }">
                <span>{{ index + 1 }}</span>
                <div>
                  <b>{{ step.title }}</b>
                  <p>{{ step.desc }}</p>
                </div>
              </article>
            </div>
          </div>

          <div class="arena-card arena-iv__panel">
            <div class="arena-h3">计划摘要</div>
            <div class="arena-iv__summary">
              <div>
                <span>训练模式</span>
                <strong>{{ selectedModeTitle }}</strong>
              </div>
              <div>
                <span>目标岗位</span>
                <strong>{{ form.targetPosition || '-' }}</strong>
              </div>
              <div>
                <span>行业方向</span>
                <strong>{{ selectedIndustryTemplate?.industryName || optionLabel(industryDirectionOptions, form.industryDirection) }}</strong>
              </div>
              <div v-if="isIndustryMode">
                <span>行业模板</span>
                <strong>{{ selectedIndustryTemplate?.industryName || '未选择' }}</strong>
              </div>
              <div>
                <span>难度 / 题量</span>
                <strong>{{ optionLabel(difficultyOptions, form.difficulty) }} · {{ form.questionCount }} 题</strong>
              </div>
              <div>
                <span>简历上下文</span>
                <strong>{{ selectedResumeName }}</strong>
              </div>
            </div>
          </div>

          <div class="arena-card arena-iv__panel arena-iv__tip">
            <div class="arena-row" style="gap: 8px">
              <span style="font-size: 16px">⚡</span>
              <b style="font-size: 13px">本轮重点</b>
            </div>
            <p class="arena-tiny" style="margin-top: 8px; line-height: 1.6">{{ selectedModeTip }}</p>
          </div>
        </div>
      </div>

      <InterviewVoiceDeviceCheck
        v-model="voiceDeviceCheckVisible"
        @ready="handleVoicePreflightReady"
        @fallback="handleVoiceTextFallback"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { BrainCircuit, BriefcaseBusiness, Files, Sparkles, Target, Zap } from 'lucide-vue-next'
import { computed, nextTick, onMounted, reactive, ref, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getApplicationPackageApi, previewApplicationPackageApi } from '@/api/applicationPackage'
import { createInterviewApi, createInterviewByJobTargetApi, getIndustryTemplatesApi } from '@/api/interview'
import {
  bindInterviewScenarioApi,
  createInterviewByJobTargetWithScenarioApi,
  createInterviewWithScenarioApi
} from '@/api/interviewVoiceProduct'
import { getCurrentJobTargetApi, getJobTargetDetailApi } from '@/api/jobTarget'
import { getLatestResumeJobMatchReportApi, getResumeJobMatchReportDetailApi } from '@/api/resumeJobMatch'
import { getResumesApi } from '@/api/resume'
import {
  difficultyOptions,
  experienceLevelOptions,
  industryDirectionOptions,
  INTERVIEW_MODE,
  interviewerStyleOptions,
  interviewPracticeModeOptions,
  targetPositionOptions
} from '@/constants/enums'
import { buildInterviewCreatePayload } from '@/features/interview-create'
import { saveInterviewVoiceProductContext } from '@/features/interview-voice-product'
import { useGameProfileStore } from '@/features/game-profile'
import { useAuthStore } from '@/stores/auth'
import type {
  InterviewScenarioBindingVO,
  InterviewScenarioSummary
} from '@/types/interviewVoiceProduct'
import InterviewScenarioSelector from '@/views/interview/components/InterviewScenarioSelector.vue'
import InterviewVoiceDeviceCheck from '@/views/interview/components/InterviewVoiceDeviceCheck.vue'
import type { JobApplicationPackageVO } from '@/types/applicationPackage'
import type {
  IndustryTemplateVO,
  InterviewCreateByJobTargetDTO,
  InterviewCreateDTO
} from '@/types/interview'
import type { ResumeJobMatchReportDetailVO } from '@/types/resumeJobMatch'
import type { ResumeVO } from '@/types/resume'
import type { SelectOption } from '@/types/common'
import { getErrorMessage } from '@/utils/error'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const gameProfile = useGameProfileStore()
const formRef = ref<FormInstance>()
const configPanelRef = ref<HTMLElement>()
const configExpanded = ref(false)
const voiceDeviceCheckVisible = ref(false)
const voicePreflightReady = ref(false)
const selectedScenario = ref<InterviewScenarioSummary | null>(null)
const creating = ref(false)
const resumeLoading = ref(false)
const resumeLoadError = ref('')
const matchReportVerifyLoading = ref(false)
const matchReportVerifyMessage = ref('')
const routeContextWarning = ref('')
const applicationPackageLoading = ref(false)
const applicationPackageWarning = ref('')
const applicationPackageContext = ref<JobApplicationPackageVO | null>(null)
const industryTemplateLoading = ref(false)
const industryTemplateError = ref('')
const useResume = ref(true)
const resumes = ref<ResumeVO[]>([])
const industryTemplates = ref<IndustryTemplateVO[]>([])
const selectedModeKey = ref('technical')
const sourceTargetJobId = ref<number>()
const fallbackTargetJobId = ref<number>()
const verifiedMatchReport = ref<ResumeJobMatchReportDetailVO | null>(null)
let industryTemplatesPromise: Promise<void> | null = null

interface ModeCard {
  key: string
  title: string
  desc: string
  badge: string
  value: string
  icon: Component
  industry?: boolean
  forceResume?: boolean
  defaults?: Partial<InterviewCreateDTO>
}

const form = reactive<InterviewCreateDTO>({
  interviewName: '',
  interviewMode: INTERVIEW_MODE.TECHNICAL_BASIC,
  targetPosition: 'Java 后端开发',
  experienceLevel: '3_YEARS',
  industryTemplateId: undefined,
  industryDirection: 'GENERAL',
  difficulty: 'MEDIUM',
  interviewerStyle: 'NORMAL',
  practiceMode: 'FORMAL',
  resumeId: undefined,
  applicationId: undefined,
  applicationPackageId: undefined,
  targetJobId: undefined,
  jdAnalysisId: undefined,
  resumeVersionId: undefined,
  matchReportId: undefined,
  projectEvidenceIds: undefined,
  questionCount: 8
})

const modeCards: ModeCard[] = [
  {
    key: 'resume',
    title: '简历押题',
    desc: '先围绕简历和岗位描述生成最可能被问到的问题。',
    badge: '推荐',
    value: INTERVIEW_MODE.PROJECT_DEEP_DIVE,
    icon: Files,
    forceResume: true,
    defaults: {
      interviewerStyle: 'PROJECT_DEEP_DIVE',
      questionCount: 6
    }
  },
  {
    key: 'project',
    title: '项目深挖',
    desc: '追问项目背景、难点、取舍、指标和事故复盘。',
    badge: '项目',
    value: INTERVIEW_MODE.PROJECT_DEEP_DIVE,
    icon: BriefcaseBusiness,
    forceResume: true,
    defaults: {
      interviewerStyle: 'PROJECT_DEEP_DIVE',
      questionCount: 6
    }
  },
  {
    key: 'technical',
    title: '技术面',
    desc: '围绕 Java 基础、JVM、并发、Spring 体系展开。',
    badge: '基础盘',
    value: INTERVIEW_MODE.TECHNICAL_BASIC,
    icon: BrainCircuit,
    defaults: {
      interviewerStyle: 'NORMAL',
      questionCount: 8
    }
  },
  {
    key: 'full',
    title: '全真模拟',
    desc: '按正式节奏覆盖技术、项目和岗位场景，完成一场完整面试。',
    badge: 'Boss 战',
    value: INTERVIEW_MODE.COMPREHENSIVE,
    icon: Target,
    forceResume: true,
    defaults: {
      difficulty: 'HARD',
      interviewerStyle: 'NORMAL',
      practiceMode: 'FORMAL',
      questionCount: 8
    }
  },
  {
    key: 'system',
    title: '系统设计',
    desc: '训练限流、缓存、库存、搜索、链路治理等方案设计。',
    badge: '方案',
    value: INTERVIEW_MODE.COMPREHENSIVE,
    icon: Target,
    forceResume: true,
    defaults: {
      difficulty: 'HARD',
      interviewerStyle: 'ARCHITECTURE',
      questionCount: 5
    }
  },
  {
    key: 'hr',
    title: 'HR 行为面',
    desc: '练自我介绍、动机、冲突处理、离职原因和职业规划。',
    badge: '表达',
    value: INTERVIEW_MODE.COMPREHENSIVE,
    icon: Sparkles,
    defaults: {
      difficulty: 'MEDIUM',
      interviewerStyle: 'GUIDING',
      questionCount: 6
    }
  },
  {
    key: 'pressure',
    title: '压力追问',
    desc: '模拟连续追问和质疑，训练边界澄清与稳定表达。',
    badge: '压测',
    value: INTERVIEW_MODE.COMPREHENSIVE,
    icon: Zap,
    forceResume: true,
    defaults: {
      difficulty: 'HARD',
      interviewerStyle: 'STRICT',
      practiceMode: 'PRACTICE',
      questionCount: 6
    }
  },
  {
    key: 'industry',
    title: '行业场景',
    desc: '选择行业模板，生成更贴近业务场景的追问。',
    badge: '场景模板',
    value: INTERVIEW_MODE.COMPREHENSIVE,
    industry: true,
    icon: BriefcaseBusiness,
    forceResume: true,
    defaults: {
      interviewerStyle: 'PROJECT_DEEP_DIVE',
      questionCount: 8
    }
  }
]

const primaryModeKeys = new Set(['technical', 'project', 'resume', 'full'])
const primaryModeCards = computed(() => modeCards.filter((item) => primaryModeKeys.has(item.key)))
const advancedModeCards = computed(() => modeCards.filter((item) => !primaryModeKeys.has(item.key)))
const showAdvancedModes = computed(() => !primaryModeKeys.has(selectedModeKey.value))

const isIndustryMode = computed(() => selectedModeKey.value === 'industry')

const selectedIndustryTemplate = computed(() =>
  industryTemplates.value.find((item) => item.industryTemplateId === form.industryTemplateId)
)

const templateHighlights = computed(() => {
  const template = selectedIndustryTemplate.value
  if (!template) return []
  return [
    ...parseTemplateItems(template.targetPositions),
    ...parseTemplateItems(template.coreBusinessScenarios),
    ...parseTemplateItems(template.keyTechnicalPoints)
  ].slice(0, 8)
})

const resumeRequired = computed(() =>
  ['resume', 'project', 'system', 'pressure', 'industry'].includes(selectedModeKey.value)
)

const isJobTargetFlow = computed(() => {
  const source = getQueryString('source')?.toLowerCase()
  return Boolean(
    sourceTargetJobId.value ||
    getQueryNumber('targetJobId') ||
    source === 'job-target' ||
    source === 'v3'
  )
})

const rules = computed<FormRules<InterviewCreateDTO>>(() => ({
  interviewMode: [{ required: true, message: '请选择面试模式', trigger: 'change' }],
  targetPosition: [{ required: true, message: '请选择目标岗位', trigger: 'change' }],
  experienceLevel: [{ required: true, message: '请选择经验年限', trigger: 'change' }],
  industryDirection: [{ required: true, message: '请选择行业方向', trigger: 'change' }],
  industryTemplateId: isIndustryMode.value ? [{ required: true, message: '请选择行业模板', trigger: 'change' }] : [],
  difficulty: [{ required: true, message: '请选择难度等级', trigger: 'change' }],
  interviewerStyle: [{ required: true, message: '请选择面试官风格', trigger: 'change' }],
  resumeId: resumeRequired.value || useResume.value ? [{ required: true, message: '请选择简历', trigger: 'change' }] : []
}))

const selectedResumeName = computed(() => {
  if (!useResume.value) return '不使用简历'
  return resumes.value.find((item) => item.id === form.resumeId)?.resumeName || '未选择'
})

const selectedModeDesc = computed(() => modeCards.find((item) => item.key === selectedModeKey.value)?.desc || '当前模式')
const selectedModeTitle = computed(() => modeCards.find((item) => item.key === selectedModeKey.value)?.title || '当前模式')
const defaultResumeId = computed(() =>
  form.resumeId ||
  resumes.value.find((item) => item.isDefault === 1)?.id ||
  resumes.value[0]?.id
)
const quickResumeId = computed(() => {
  const resumeId = defaultResumeId.value
  if (!resumeId || resumeLoadError.value) return undefined
  return resumes.value.some((item) => Number(item.id) === Number(resumeId)) ? resumeId : undefined
})
const quickResumeName = computed(() => {
  const resumeId = quickResumeId.value
  if (!resumeId) return '无简历，轻量技术面'
  return resumes.value.find((item) => item.id === resumeId)?.resumeName || '已选择简历'
})
const interviewModeTitleMap: Record<string, string> = {
  [INTERVIEW_MODE.TECHNICAL_BASIC]: '技术基础',
  [INTERVIEW_MODE.PROJECT_DEEP_DIVE]: '项目深挖',
  [INTERVIEW_MODE.COMPREHENSIVE]: '综合模拟'
}
const selectedModeTitleForPayload = (payload: Pick<InterviewCreateDTO, 'interviewMode'>) =>
  interviewModeTitleMap[payload.interviewMode || ''] || '推荐面试'
const quickTargetJobId = computed(() =>
  sourceTargetJobId.value ||
  getQueryNumber('targetJobId') ||
  fallbackTargetJobId.value
)
const quickMatchReportId = computed(() => getQueryNumber('matchReportId'))
const isTrustedMatchReport = (report?: ResumeJobMatchReportDetailVO | null) => {
  const hasSchemaWarningCount = report?.schemaWarningCount != null
  const warningCount = Number(report?.schemaWarningCount ?? 0)
  const hasSchemaWarnings =
    warningCount > 0 ||
    (Array.isArray(report?.schemaWarnings) && report.schemaWarnings.length > 0)
  return String(report?.status || '').toUpperCase() === 'SUCCESS' &&
    !report?.fallback &&
    String(report?.trustStatus || '').toUpperCase() === 'VERIFIED' &&
    hasSchemaWarningCount &&
    !hasSchemaWarnings
}

const matchReportEvidence = computed(() => {
  const matchReportId = quickMatchReportId.value
  if (!matchReportId) {
    return {
      verified: false,
      reportId: undefined,
      reason: '匹配报告不足：不会引用失败或缺失报告作证据',
      value: '未使用失败/缺失报告',
      boundary: '没有可信匹配报告时，不会把失败、缺失或待复核报告当成押题依据。'
    }
  }
  if (matchReportVerifyLoading.value) {
    return {
      verified: false,
      reportId: matchReportId,
      reason: '正在核验匹配报告，核验完成前不会作为面试推荐依据使用',
      value: '匹配报告正在核验',
      boundary: '匹配报告正在核验中，系统会先按已有资料生成普通推荐，避免误用失败报告。'
    }
  }
  if (matchReportVerifyMessage.value) {
    return {
      verified: false,
      reportId: matchReportId,
      reason: matchReportVerifyMessage.value,
      value: '匹配报告未通过核验',
      boundary: '当前匹配报告没有通过成功状态或上下文核验，不会进入本轮推荐依据。'
    }
  }
  const report = verifiedMatchReport.value
  if (!report || String(report.status || '').toUpperCase() !== 'SUCCESS') {
    return {
      verified: false,
      reportId: matchReportId,
      reason: '匹配报告尚未确认成功，不会作为押题依据',
      value: '匹配报告未确认成功',
      boundary: '只有生成成功、证据已核验且属于当前简历和岗位的匹配报告，才会作为推荐面试的可信依据。'
    }
  }
  if (!isTrustedMatchReport(report)) {
    return {
      verified: false,
      reportId: matchReportId,
      reason: '匹配报告已生成但证据待复核，不会作为推荐面试依据',
      value: '匹配报告证据待复核',
      boundary: '只有证据已核验、没有资料依据不足或内容待复核提示的匹配报告，才会作为推荐面试依据。'
    }
  }
  const resumeId = defaultResumeId.value
  const targetJobId = quickTargetJobId.value
  if (!resumeId || !targetJobId) {
    return {
      verified: false,
      reportId: matchReportId,
      reason: '匹配报告已成功，但当前简历或目标岗位资料不足，暂不作为面试推荐依据',
      value: '可信报告待绑定上下文',
      boundary: '可信报告还需要和当前简历、目标岗位对齐后才会作为押题依据。'
    }
  }
  if (Number(report.resumeId) !== Number(resumeId) || Number(report.targetJobId) !== Number(targetJobId)) {
    return {
      verified: false,
      reportId: matchReportId,
      reason: '匹配报告与当前简历或目标岗位不一致，本轮按普通推荐处理',
      value: '匹配报告上下文不一致',
      boundary: '匹配报告和当前简历/岗位不一致时，不会把它混入本轮面试证据。'
    }
  }
  return {
    verified: true,
    reportId: report.reportId || matchReportId,
    reason: '来自可信匹配报告',
    value: '可信匹配报告已绑定',
    boundary: '将使用可信匹配报告、当前简历和目标岗位作为追问依据；提交前请确认岗位描述仍是本轮目标。'
  }
})
const quickRecommendation = computed(() => {
  const resumeId = quickResumeId.value
  const targetJobId = quickTargetJobId.value
  const matchReport = matchReportEvidence.value
  const applicationContext = applicationContextSnapshot.value
  const hasJobContext = Boolean(targetJobId)
  const hasMatchContext = matchReport.verified
  const mode = resumeId ? INTERVIEW_MODE.PROJECT_DEEP_DIVE : INTERVIEW_MODE.TECHNICAL_BASIC
  const questionCount = hasMatchContext ? 8 : resumeId ? 6 : 5
  const difficulty = hasMatchContext ? 'HARD' : resumeId ? 'MEDIUM' : 'EASY'
  const interviewerStyle = hasMatchContext ? 'STRICT' : resumeId ? 'PROJECT_DEEP_DIVE' : 'NORMAL'
  const title = hasMatchContext
    ? '岗位匹配押题 8 题'
    : resumeId
      ? '简历押题 6 题'
      : '轻量技术面 5 题'
  const desc = hasMatchContext
    ? '将使用当前岗位、默认简历和可信匹配报告，优先追问高风险短板。'
    : resumeId && hasJobContext
      ? '将使用当前简历和目标岗位，直接进入项目深挖面试。'
      : resumeId
        ? '将使用默认简历，先围绕项目经历做一轮高命中追问。'
        : '暂时没有简历也能开始，先用 Java 技术基础题保持训练节奏。'
  const reasons = [
    resumeId ? `来自简历：${quickResumeName.value}` : '资料不足：未绑定简历，本轮使用通用练习配置',
    hasJobContext ? `来自目标岗位：${form.targetPosition || '当前目标岗位'}` : '目标岗位不足：按 Java 后端通用方向开练',
    isApplicationContextFlow.value ? `${applicationContextTitle.value}：文本模拟面试是本次主链路，语音仅作为后续可降级预览` : '文本模拟面试为主链路',
    matchReport.reason,
    `推荐强度：${optionLabel(difficultyOptions, difficulty)} · ${questionCount} 题 · ${optionLabel(interviewerStyleOptions, interviewerStyle)}`
  ]
  return {
    title,
    desc,
    reasons,
    payload: {
      interviewName: hasMatchContext ? '一键推荐岗位匹配押题面试' : resumeId ? '一键推荐简历押题面试' : '一键轻量技术面试',
      interviewMode: mode,
      targetPosition: form.targetPosition || 'Java 后端开发',
      experienceLevel: form.experienceLevel || '3_YEARS',
      industryDirection: form.industryDirection || 'GENERAL',
      difficulty,
      interviewerStyle,
      practiceMode: 'PRACTICE',
      questionCount,
      resumeId,
      applicationId: applicationContext.applicationId,
      applicationPackageId: applicationContext.applicationPackageId,
      targetJobId: applicationContext.targetJobId,
      jdAnalysisId: applicationContext.jdAnalysisId,
      resumeVersionId: applicationContext.resumeVersionId,
      matchReportId: applicationContext.matchReportId,
      projectEvidenceIds: applicationContext.projectEvidenceIds,
      basedOnResume: Boolean(resumeId),
      recommendationSource: hasMatchContext ? 'MATCH_REPORT' : resumeId ? 'DEFAULT_RESUME' : 'LIGHTWEIGHT',
      recommendationReason: reasons.join('；')
    } as InterviewCreateDTO
  }
})
const quickInterviewTitle = computed(() => quickRecommendation.value.title)
const quickInterviewDesc = computed(() => quickRecommendation.value.desc)
const quickRecommendationTrustLabel = computed(() => {
  if (quickRecommendation.value.payload.recommendationSource === 'MATCH_REPORT') return '可信依据'
  if (quickRecommendation.value.payload.recommendationSource === 'DEFAULT_RESUME') return '依据较完整'
  return '基础推荐'
})
const quickRecommendationTrustType = computed<'success' | 'warning' | 'info'>(() => {
  if (quickRecommendation.value.payload.recommendationSource === 'MATCH_REPORT') return 'success'
  if (quickRecommendation.value.payload.recommendationSource === 'DEFAULT_RESUME') return 'info'
  return 'warning'
})
const quickTrustChipClass = computed(() => {
  const type = quickRecommendationTrustType.value
  if (type === 'success') return 'arena-chip--grn'
  if (type === 'info') return 'arena-chip--vio'
  return 'arena-chip--amber'
})
const quickRecommendationBoundaryText = computed(() => {
  if (quickRecommendation.value.payload.recommendationSource === 'MATCH_REPORT') {
    return matchReportEvidence.value.boundary
  }
  if (quickRecommendation.value.payload.recommendationSource === 'DEFAULT_RESUME') {
    return matchReportEvidence.value.boundary
  }
  return '当前资料不足，只生成轻量技术面；不会把不确定资料当作简历、岗位或匹配报告证据。'
})
const quickContextTrustItems = computed(() => {
  const payload = quickRecommendation.value.payload
  return [
    {
      label: '简历证据',
      value: payload.resumeId ? quickResumeName.value : '未绑定，使用通用练习配置',
      missing: !payload.resumeId
    },
    {
      label: '目标岗位',
      value: quickTargetJobId.value ? form.targetPosition || '当前目标岗位' : '通用 Java 后端方向',
      missing: !quickTargetJobId.value
    },
    {
      label: '匹配报告',
      value: matchReportEvidence.value.value,
      missing: payload.recommendationSource !== 'MATCH_REPORT'
    }
  ]
})
const quickStartItems = computed(() => [
  { label: '简历上下文', value: quickResumeName.value, icon: Files },
  { label: '目标岗位', value: form.targetPosition || 'Java 后端开发', icon: Target },
  { label: '进入来源', value: isApplicationContextFlow.value ? applicationContextTitle.value : '面试中心', icon: BriefcaseBusiness },
  { label: '面试强度', value: `${selectedModeTitleForPayload(quickRecommendation.value.payload)} · ${quickRecommendation.value.payload.questionCount} 题`, icon: Zap }
])
const quickPlanItems = computed(() => {
  const payload = quickRecommendation.value.payload
  return [
    {
      label: '训练目标',
      value: selectedModeTitleForPayload(payload),
      desc: payload.resumeId ? '围绕真实经历和目标岗位追问' : '先用通用技术面保持练习节奏'
    },
    {
      label: '节奏安排',
      value: `${payload.questionCount} 题 · ${optionLabel(difficultyOptions, payload.difficulty)}`,
      desc: payload.practiceMode === 'PRACTICE' ? '练习模式，便于及时复盘' : '正式模式，结束后统一生成报告'
    },
    {
      label: '依据边界',
      value: quickRecommendationTrustLabel.value,
      desc: payload.recommendationSource === 'MATCH_REPORT' ? '使用已核验报告，不混入失败证据' : '资料不足处会降级为基础推荐'
    }
  ]
})
const quickStartNotice = computed(() => {
  if (resumeLoadError.value) return '简历列表暂时不可用，可先进入轻量技术面试。'
  if (isJobTargetFlow.value && !quickTargetJobId.value && !quickResumeId.value) return '简历和目标岗位资料暂时不足，本轮会降级为轻量技术面；可补全简历和岗位目标后再重试。'
  if (isJobTargetFlow.value && !quickTargetJobId.value) return '目标岗位暂时不可用，本轮会降级为普通面试；可稍后到岗位目标页补全后再重试。'
  if (!quickResumeId.value) return '还没有可用简历，系统会先创建轻量技术面试。'
  return ''
})
const routeContextNotice = computed(() =>
  routeContextWarning.value || applicationPackageWarning.value || (!matchReportVerifyLoading.value ? matchReportVerifyMessage.value : '')
)
const buildQuickPayload = (): InterviewCreateDTO => ({ ...quickRecommendation.value.payload })
const selectedModeTip = computed(() => {
  const map: Record<string, string> = {
    resume: '适合面试前 1-2 天，用简历和目标岗位描述做一次高命中押题。',
    project: '回答时必须补业务背景、个人职责、指标、取舍和复盘，不只讲技术名词。',
    technical: '适合日常基本功训练，答完后重点复盘不会展开的知识点。',
    system: '适合中高级岗位，重点看方案边界、容量估算、降级和可观测性。',
    hr: '适合终面或主管面前准备，把经历讲得稳定、具体、可信。',
    pressure: '适合模拟连续质疑，训练先澄清问题边界再回答。',
    industry: '选择行业模板后，会更关注该场景下的业务理解、技术取舍和项目表达。'
  }
  return map[selectedModeKey.value] || selectedModeDesc.value
})
const wizardSteps = computed(() => [
  { title: '选择场景', desc: selectedModeTitle.value },
  { title: '绑定简历', desc: selectedResumeName.value },
  { title: '对齐岗位', desc: form.targetPosition || '未选择目标岗位' },
  { title: '设置强度', desc: `${optionLabel(difficultyOptions, form.difficulty)} · ${form.questionCount} 题` },
  { title: '开始训练', desc: '创建后直接进入面试房间' }
])

// ---- 副本卡片展示 ----
const recommendedModeKey = computed(() => {
  const payload = quickRecommendation.value.payload
  const mode = modeCards.find((item) => item.value === payload.interviewMode && item.forceResume === Boolean(payload.resumeId))
    || modeCards.find((item) => item.value === payload.interviewMode)
  return mode?.key || 'technical'
})

const modeStars = (item: ModeCard) => {
  const difficulty = item.defaults?.difficulty
  if (difficulty === 'HARD') return '★★★'
  if (difficulty === 'EASY') return '★☆☆'
  return '★★☆'
}

const selectDungeon = (item: ModeCard) => {
  selectMode(item)
  // Industry mode needs an extra template before it can start; other dungeons stay at the start action.
  if (item.industry) {
    void scrollToConfig()
  }
}

const optionLabel = (options: SelectOption[], value?: string) => {
  return options.find((item) => item.value === value)?.label || (value ? '选项待确认' : '-')
}

const getQueryString = (name: string) => {
  const value = route.query[name]
  return Array.isArray(value) ? value[0] : value
}

const getQueryNumber = (name: string) => {
  const value = Number(getQueryString(name))
  return Number.isFinite(value) && value > 0 ? value : undefined
}

const getQueryNumberList = (name: string) => {
  const value = getQueryString(name)
  if (!value) return []
  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0)
}

const isPersistedApplicationPackageId = (value?: string | number | null) => {
  const id = String(value || '').trim()
  return Boolean(id && !id.startsWith('preview:') && id !== 'preview-degraded')
}

const applicationSource = computed(() => getQueryString('source')?.toLowerCase() || '')
const isApplicationContextFlow = computed(() =>
  ['application-package', 'application'].includes(applicationSource.value)
)
const routeProjectEvidenceIds = computed(() => getQueryNumberList('projectEvidenceIds'))
const contextProjectEvidenceIds = computed(() => {
  const pack = applicationPackageContext.value
  const ids =
    pack?.interviewContext?.projectEvidenceIds ||
    pack?.interviewPreparation?.projectEvidenceIds ||
    pack?.projectEvidenceIds ||
    routeProjectEvidenceIds.value
  return Array.from(new Set((ids || []).filter((item) => Number.isFinite(Number(item)) && Number(item) > 0).map(Number)))
})
const applicationContextSnapshot = computed(() => {
  const pack = applicationPackageContext.value
  const rawQueryApplicationPackageId = getQueryString('applicationPackageId')
  const queryApplicationPackageId = rawQueryApplicationPackageId == null ? undefined : String(rawQueryApplicationPackageId)
  const packApplicationPackageId = pack?.id == null ? undefined : String(pack.id)
  return {
    source: applicationSource.value,
    applicationId: getQueryNumber('applicationId') || pack?.jobApplicationId,
    applicationPackageId: isPersistedApplicationPackageId(queryApplicationPackageId)
      ? queryApplicationPackageId
      : isPersistedApplicationPackageId(packApplicationPackageId)
        ? packApplicationPackageId
        : undefined,
    targetJobId: pack?.interviewContext?.targetJobId || pack?.interviewPreparation?.targetJobId || getQueryNumber('targetJobId') || pack?.targetJobId,
    jdAnalysisId: getQueryNumber('jdAnalysisId') || pack?.jdAnalysisId || pack?.job?.jdAnalysisId,
    resumeVersionId:
      pack?.interviewContext?.resumeVersionId ||
      pack?.interviewPreparation?.resumeVersionId ||
      getQueryNumber('resumeVersionId') ||
      pack?.recommendedResumeVersionId ||
      pack?.recommendedResume?.resumeVersionId,
    matchReportId:
      pack?.interviewContext?.matchReportId ||
      pack?.interviewPreparation?.matchReportId ||
      getQueryNumber('matchReportId') ||
      pack?.matchReportId ||
      pack?.matchResult?.matchReportId ||
      pack?.matchSummary?.matchReportId,
    projectEvidenceIds: contextProjectEvidenceIds.value
  }
})
const applicationContextTitle = computed(() => {
  const source = applicationContextSnapshot.value.source
  if (source === 'application-package') return '投递包上下文'
  if (source === 'application') return '投递记录上下文'
  return '岗位上下文'
})
const readinessLabelMap: Record<string, string> = {
  READY: '已准备好',
  NEEDS_RESUME: '待补简历',
  NEEDS_EVIDENCE: '待补项目证据',
  NEEDS_TRAINING: '建议先练面试',
  BLOCKED: '暂不可投递'
}
const applicationPackageReadinessText = computed(() => {
  if (applicationPackageLoading.value) return '正在读取投递包准备度'
  const level = String(applicationPackageContext.value?.readinessLevel || '').toUpperCase()
  if (!level) return '未取得准备度，按已知岗位字段创建'
  return readinessLabelMap[level] || level
})
const recommendedResumeContextText = computed(() => {
  const resume = applicationPackageContext.value?.recommendedResume
  if (resume?.resumeTitle || resume?.resumeVersionName || resume?.versionName) {
    return [resume.resumeTitle, resume.resumeVersionName || resume.versionName].filter(Boolean).join(' · ')
  }
  const resumeVersionId = applicationContextSnapshot.value.resumeVersionId
  return resumeVersionId ? `推荐简历版本 #${resumeVersionId}` : '缺少推荐简历，创建时使用默认简历或降级轻量技术面'
})
const projectEvidenceGapText = computed(() => {
  const coverage = applicationPackageContext.value?.projectEvidenceCoverage
  const insufficientCount = coverage?.insufficientRequirements?.length || 0
  const suggestedCount = coverage?.suggestedFields?.length || 0
  if (insufficientCount) return `${insufficientCount} 个 JD 要求项目证据不足`
  if (suggestedCount) return `${suggestedCount} 个证据字段建议补充`
  if (contextProjectEvidenceIds.value.length) return `已带入 ${contextProjectEvidenceIds.value.length} 项项目证据`
  return '未带入项目证据，面试会先按岗位/JD 和简历追问'
})
const jdContextText = computed(() => {
  const pack = applicationPackageContext.value
  const jobTitle = pack?.job?.jobTitle || pack?.jobTitle || form.targetPosition
  const companyName = pack?.job?.companyName || pack?.companyName
  const jdAnalysisId = applicationContextSnapshot.value.jdAnalysisId
  const title = [companyName, jobTitle].filter(Boolean).join(' · ')
  return title || (jdAnalysisId ? `岗位描述分析 #${jdAnalysisId}` : '未取得岗位描述详情，按目标岗位名称降级')
})
const applicationContextItems = computed(() => {
  const context = applicationContextSnapshot.value
  return [
    { label: '岗位/JD', value: jdContextText.value, missing: !context.targetJobId && !context.jdAnalysisId },
    { label: '投递包 readiness', value: applicationPackageReadinessText.value, missing: !applicationPackageContext.value?.readinessLevel },
    { label: '推荐简历', value: recommendedResumeContextText.value, missing: !context.resumeVersionId },
    { label: '项目证据缺口', value: projectEvidenceGapText.value, missing: !context.projectEvidenceIds.length }
  ]
})

const loadCurrentTargetForInterview = async (failureMessage: string) => {
  try {
    const currentTarget = await getCurrentJobTargetApi()
    routeContextWarning.value = ''
    return currentTarget
  } catch (error) {
    routeContextWarning.value = getErrorMessage(error, failureMessage)
    return null
  }
}

const loadLatestVerifiedMatchReportId = async (resumeId: number, targetJobId: number, resumeVersionId?: number) => {
  try {
    const latestMatch = await getLatestResumeJobMatchReportApi(resumeId, targetJobId, resumeVersionId)
    if (isTrustedMatchReport(latestMatch)) {
      return latestMatch?.reportId
    }
    if (latestMatch?.reportId) {
      const status = String(latestMatch.status || '').toUpperCase()
      routeContextWarning.value = status === 'SUCCESS'
        ? '最近匹配报告证据待复核，不会作为本轮面试推荐依据。'
        : '最近匹配报告尚未成功生成，不会作为本轮面试推荐依据。'
    }
    return undefined
  } catch (error) {
    routeContextWarning.value = getErrorMessage(error, '最新简历匹配报告暂时无法读取，本轮面试会继续创建，但不会附带不可核验的匹配报告证据。')
    return undefined
  }
}

const verifyRouteMatchReport = async () => {
  const matchReportId = quickMatchReportId.value
  verifiedMatchReport.value = null
  matchReportVerifyMessage.value = ''
  if (!matchReportId) return

  matchReportVerifyLoading.value = true
  try {
    const report = await getResumeJobMatchReportDetailApi(matchReportId)
    const status = String(report.status || '').toUpperCase()
    if (status !== 'SUCCESS') {
      matchReportVerifyMessage.value = status === 'FAILED'
        ? '匹配报告生成失败，不会作为推荐面试依据'
        : '匹配报告尚未成功生成，不会作为推荐面试依据'
      return
    }
    if (!isTrustedMatchReport(report)) {
      matchReportVerifyMessage.value = '匹配报告已生成但证据待复核，不会作为推荐面试依据'
      return
    }
    verifiedMatchReport.value = report
  } catch (error) {
    matchReportVerifyMessage.value = getErrorMessage(error, '匹配报告暂时无法核验，推荐面试不会把它作为可信依据。')
  } finally {
    matchReportVerifyLoading.value = false
  }
}

const parseTemplateItems = (value?: string) => {
  if (!value) return []
  const trimmed = value.trim()
  if (!trimmed) return []
  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean)
    }
  } catch {
    // fall back to plain text splitting below
  }
  return trimmed
    .split(/[,\n;；、，]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

const applyIndustryTemplate = (template?: IndustryTemplateVO) => {
  if (!template) return
  form.industryTemplateId = template.industryTemplateId
  form.industryDirection = template.industryCode || template.industryName || form.industryDirection
}

const selectMode = (item: ModeCard) => {
  selectedModeKey.value = item.key
  form.interviewMode = item.value
  if (item.defaults) {
    Object.assign(form, item.defaults)
  }
  if (item.forceResume) {
    useResume.value = true
  }
  if ('industry' in item && item.industry) {
    if (!industryTemplates.value.length) {
      void fetchIndustryTemplates()
    } else {
      applyIndustryTemplate(selectedIndustryTemplate.value || industryTemplates.value[0])
    }
    return
  }
  form.industryTemplateId = undefined
}

const scrollToConfig = async () => {
  configExpanded.value = true
  await nextTick()
  configPanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const toggleConfigExpanded = () => {
  configExpanded.value = !configExpanded.value
  if (configExpanded.value) {
    void scrollToConfig()
  }
}

watch(
  resumeRequired,
  (required) => {
    if (required) {
      useResume.value = true
    }
  },
  { immediate: true }
)

watch(useResume, (enabled) => {
  if (!enabled) {
    form.resumeId = undefined
  } else if (!form.resumeId) {
    form.resumeId = resumes.value.find((item) => item.isDefault === 1)?.id || resumes.value[0]?.id
  }
})

watch(
  () => form.industryTemplateId,
  (id) => {
    if (!isIndustryMode.value || !id) return
    const template = selectedIndustryTemplate.value
    if (template) {
      form.industryDirection = template.industryCode || template.industryName || form.industryDirection
    }
  }
)

const fetchResumes = async () => {
  resumeLoading.value = true
  resumeLoadError.value = ''
  try {
    const result = await getResumesApi({ pageNo: 1, pageSize: 50 })
    resumes.value = result.records || []
    const queryResumeId = getQueryNumber('resumeId')
    form.resumeId =
      (queryResumeId && resumes.value.some((item) => item.id === queryResumeId) ? queryResumeId : undefined) ||
      resumes.value.find((item) => item.isDefault === 1)?.id ||
      resumes.value[0]?.id
    if (!form.resumeId && !resumeRequired.value) {
      useResume.value = false
    }
  } catch (error) {
    resumes.value = []
    form.resumeId = undefined
    if (!resumeRequired.value) {
      useResume.value = false
    }
    resumeLoadError.value = getErrorMessage(error, '简历列表暂时加载失败，请重试后再选择简历上下文。')
  } finally {
    resumeLoading.value = false
  }
}

const fetchIndustryTemplates = (force = false) => {
  if (!force && industryTemplates.value.length) return Promise.resolve()
  if (!force && industryTemplatesPromise) return industryTemplatesPromise

  industryTemplateLoading.value = true
  industryTemplateError.value = ''

  industryTemplatesPromise = getIndustryTemplatesApi()
    .then((result) => {
      industryTemplates.value = result || []
      if (isIndustryMode.value && !form.industryTemplateId) {
        applyIndustryTemplate(industryTemplates.value[0])
      }
    })
    .catch(() => {
      industryTemplates.value = []
      industryTemplateError.value = '行业模板暂时加载失败，可以先使用其他面试模式。'
    })
    .finally(() => {
      industryTemplateLoading.value = false
      industryTemplatesPromise = null
    })

  return industryTemplatesPromise
}

const loadApplicationPackageContext = async () => {
  const applicationPackageId = getQueryString('applicationPackageId')
  const params = {
    targetJobId: getQueryNumber('targetJobId'),
    jdAnalysisId: getQueryNumber('jdAnalysisId'),
    resumeVersionId: getQueryNumber('resumeVersionId'),
    matchReportId: getQueryNumber('matchReportId'),
    projectEvidenceIds: routeProjectEvidenceIds.value
  }
  const shouldPreview =
    isPersistedApplicationPackageId(applicationPackageId) ||
    isApplicationContextFlow.value ||
    Boolean(
      params.targetJobId ||
      params.jdAnalysisId ||
      params.resumeVersionId ||
      params.matchReportId ||
      params.projectEvidenceIds.length
    )
  if (!shouldPreview) return

  applicationPackageLoading.value = true
  applicationPackageWarning.value = ''
  try {
    applicationPackageContext.value = isPersistedApplicationPackageId(applicationPackageId)
      ? await getApplicationPackageApi(applicationPackageId as string)
      : await previewApplicationPackageApi(params)
  } catch (error) {
    applicationPackageContext.value = null
    applicationPackageWarning.value = getErrorMessage(error, '投递包上下文暂时无法读取，本轮会用路由中可确认的岗位/JD、简历和匹配报告字段降级创建文本面试。')
  } finally {
    applicationPackageLoading.value = false
  }
}

const applyRouteContext = async () => {
  const source = getQueryString('source')?.toLowerCase()
  const isV3Source = source === 'job-target' || source === 'v3'
  const hasApplicationSource = source === 'application-package' || source === 'application'
  const context = applicationContextSnapshot.value
  let targetJobId = context.targetJobId
  const resumeId = getQueryNumber('resumeId')
  const skillProfileId = getQueryNumber('skillProfileId')
  const matchReportId = context.matchReportId

  form.applicationId = context.applicationId
  form.applicationPackageId = context.applicationPackageId
  form.targetJobId = context.targetJobId
  form.jdAnalysisId = context.jdAnalysisId
  form.resumeVersionId = context.resumeVersionId
  form.matchReportId = context.matchReportId
  form.projectEvidenceIds = context.projectEvidenceIds

  if (resumeId) {
    useResume.value = true
    form.resumeId = resumeId
  }

  if (!targetJobId) {
    const currentTarget = await loadCurrentTargetForInterview('当前主目标岗位暂时无法读取，可继续手动配置面试；系统不会把缺失岗位当成推荐依据。')
    targetJobId = currentTarget?.id
    if (targetJobId) fallbackTargetJobId.value = targetJobId
  }
  if (!targetJobId) return

  if (isV3Source || hasApplicationSource || source === 'job-target') {
    const resumeMode = modeCards.find((item) => item.key === 'resume')
    if (resumeMode) {
      selectMode(resumeMode)
    } else {
      selectedModeKey.value = 'resume'
      form.interviewMode = INTERVIEW_MODE.PROJECT_DEEP_DIVE
    }
  }
  if (isV3Source || hasApplicationSource || context.targetJobId) {
    sourceTargetJobId.value = targetJobId
  }

  if (targetJobId) {
    try {
      const targetJob = await getJobTargetDetailApi(targetJobId)
      form.targetPosition = applicationPackageContext.value?.job?.jobTitle || applicationPackageContext.value?.jobTitle || targetJob.jobTitle || form.targetPosition
      form.interviewName =
        form.interviewName || `${form.targetPosition || targetJob.jobTitle || '目标岗位'}文本模拟面试`
    } catch (error) {
      ElMessage.warning(getErrorMessage(error, '目标岗位信息加载失败，将使用当前面试配置创建。'))
    }
  }

  if (!targetJobId && (applicationPackageContext.value?.job?.jobTitle || applicationPackageContext.value?.jobTitle)) {
    form.targetPosition = applicationPackageContext.value?.job?.jobTitle || applicationPackageContext.value?.jobTitle || form.targetPosition
  }

  if (skillProfileId || matchReportId || hasApplicationSource) {
    form.interviewName = form.interviewName || '目标岗位文本模拟面试'
  }
}

const createStandardInterview = (payload: InterviewCreateDTO) => {
  const scenarioVersionId = selectedScenario.value?.scenarioVersionId
  return scenarioVersionId
    ? createInterviewWithScenarioApi({ ...payload, scenarioVersionId })
    : createInterviewApi(payload)
}

const createJobTargetInterview = (
  payload: InterviewCreateByJobTargetDTO
) => {
  const scenarioVersionId = selectedScenario.value?.scenarioVersionId
  return scenarioVersionId
    ? createInterviewByJobTargetWithScenarioApi({ ...payload, scenarioVersionId })
    : createInterviewByJobTargetApi(payload)
}

const createInterviewWithRouteContext = async (payload: InterviewCreateDTO) => {
  const context = applicationContextSnapshot.value
  const targetJobId = sourceTargetJobId.value || context.targetJobId || getQueryNumber('targetJobId') || fallbackTargetJobId.value
  const source = getQueryString('source')?.toLowerCase()
  const hasJobTargetIntent =
    source === 'job-target' ||
    source === 'v3' ||
    source === 'application-package' ||
    source === 'application' ||
    Boolean(sourceTargetJobId.value || context.targetJobId || getQueryNumber('targetJobId'))
  const contextualPayload: InterviewCreateDTO = {
    ...payload,
    applicationId: context.applicationId ?? payload.applicationId,
    applicationPackageId: context.applicationPackageId ?? payload.applicationPackageId,
    targetJobId: targetJobId ?? payload.targetJobId,
    jdAnalysisId: context.jdAnalysisId ?? payload.jdAnalysisId,
    resumeVersionId: context.resumeVersionId ?? payload.resumeVersionId,
    matchReportId: context.matchReportId ?? payload.matchReportId,
    projectEvidenceIds: context.projectEvidenceIds.length ? context.projectEvidenceIds : payload.projectEvidenceIds
  }

  if (!contextualPayload.resumeId) {
    if (hasJobTargetIntent) {
      routeContextWarning.value = '当前没有可用简历，已改用轻量技术面创建；可先创建简历后再使用岗位推荐面试。'
    }
    return createStandardInterview(contextualPayload)
  }

  if (!targetJobId) {
    if (hasJobTargetIntent) {
      routeContextWarning.value = '目标岗位信息暂时不可用，已改用普通面试创建；可稍后到岗位目标页补全后再重试。'
    }
    return createStandardInterview(contextualPayload)
  }

  let resumeId = contextualPayload.resumeId
  if (!resumeId) {
    resumeId = resumes.value.find((item) => item.isDefault === 1)?.id || resumes.value[0]?.id
  }

  let matchReportId = matchReportEvidence.value.verified ? matchReportEvidence.value.reportId : undefined
  if (!matchReportId && resumeId && targetJobId) {
    matchReportId = await loadLatestVerifiedMatchReportId(resumeId, targetJobId, contextualPayload.resumeVersionId)
  }

  if (!resumeId || !targetJobId) {
    return createStandardInterview({
      ...contextualPayload,
      resumeId: undefined,
      basedOnResume: false
    })
  }

  return createJobTargetInterview({
    ...contextualPayload,
    resumeId,
    targetJobId,
    skillProfileId: getQueryNumber('skillProfileId'),
    matchReportId
  })
}

const resolveCreatedInterviewId = (result: unknown) => {
  const session = result as { interviewId?: number | string; id?: number | string; sessionId?: number | string }
  const value = Number(session?.interviewId || session?.id || session?.sessionId || 0)
  return Number.isFinite(value) && value > 0 ? value : 0
}

const bindSelectedScenario = async (sessionId: number, result: unknown) => {
  const scenario = selectedScenario.value
  let binding: InterviewScenarioBindingVO | undefined
  let bindingStatus: 'BOUND' | 'PENDING' | 'NONE' = scenario ? 'PENDING' : 'NONE'
  let bindingMessage = scenario
    ? '已保存所选剧本上下文，等待服务端绑定确认。'
    : '本轮未选择版本化剧本。'
  const created = result as {
    scenarioVersionId?: number | string
    rubricVersionId?: number | string
    scenarioCode?: string
  }
  const createdScenarioVersionId = Number(created.scenarioVersionId || 0)
  const createdRubricVersionId = Number(created.rubricVersionId || scenario?.rubricVersionId || 0)

  if (createdScenarioVersionId > 0) {
    binding = {
      bindingId: 0,
      sessionId,
      scenarioVersionId: createdScenarioVersionId,
      rubricVersionId: createdRubricVersionId,
      bindingSource: 'CREATE_TRANSACTION'
    }
    bindingStatus = 'BOUND'
    bindingMessage = `主创建事务已锁定剧本 ${created.scenarioCode || `#${createdScenarioVersionId}`} 与量表版本 #${createdRubricVersionId}。`
  } else if (scenario) {
    try {
      binding = await bindInterviewScenarioApi(sessionId, {
        scenarioVersionId: scenario.scenarioVersionId,
        bindingSource: 'USER_SELECTED'
      }, {
        silentError: true
      })
      bindingStatus = 'BOUND'
      bindingMessage = `已绑定剧本 v${scenario.versionNo} 与量表版本 #${binding.rubricVersionId}。`
    } catch (error) {
      bindingMessage = getErrorMessage(
        error,
        '面试已创建，但剧本绑定接口暂时不可用。房间会保留“待绑定”状态，不会把本地选择显示为已绑定。'
      )
      ElMessage.warning(bindingMessage)
    }
  }

  saveInterviewVoiceProductContext({
    sessionId,
    voicePreflightReady: voicePreflightReady.value,
    scenario: scenario || undefined,
    scenarioBindingStatus: bindingStatus,
    scenarioBinding: binding,
    bindingMessage,
    savedAt: new Date().toISOString()
  })

  return {
    bindingStatus,
    binding
  }
}

const enterCreatedInterviewRoom = async (result: unknown) => {
  const createdInterviewId = resolveCreatedInterviewId(result)
  if (!createdInterviewId) {
    throw new Error('面试已创建，但没有返回可进入的面试房间编号。请从面试历史进入最近一次面试。')
  }
  const scenarioResult = await bindSelectedScenario(createdInterviewId, result)
  const query: Record<string, string> = {}
  if (selectedScenario.value) {
    query.scenarioVersionId = String(selectedScenario.value.scenarioVersionId)
    query.scenarioBinding = scenarioResult.bindingStatus.toLowerCase()
  }
  if (voicePreflightReady.value) {
    query.voicePreflight = 'ready'
  }
  await router.push({
    path: `/interviews/room/${createdInterviewId}`,
    query
  })
  return scenarioResult.bindingStatus
}

const handleCreate = async () => {
  if (!formRef.value) return
  if (isIndustryMode.value && !industryTemplates.value.length && !industryTemplateLoading.value) {
    await fetchIndustryTemplates()
  }
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  if (isIndustryMode.value && !form.industryTemplateId) {
    ElMessage.warning('请选择行业模板后再开始面试')
    return
  }
  if ((resumeRequired.value || useResume.value) && !form.resumeId) {
    ElMessage.warning(useResume.value
      ? '请先选择简历；也可以关闭简历上下文后改用轻量技术面。'
      : '项目深挖或综合模拟面试需要先选择简历。')
    return
  }

  creating.value = true
  try {
    const payload = buildInterviewCreatePayload({
      form,
      isIndustryMode: isIndustryMode.value,
      useResume: useResume.value && Boolean(form.resumeId),
      isJobTargetFlow: isJobTargetFlow.value,
      selectedIndustryTemplate: selectedIndustryTemplate.value
    })
    const result = await createInterviewWithRouteContext(payload)
    const scenarioBindingStatus = await enterCreatedInterviewRoom(result)
    ElMessage.success(
      scenarioBindingStatus === 'BOUND'
        ? '面试与版本化剧本已绑定，正在进入 AI 面试训练室'
        : scenarioBindingStatus === 'PENDING'
          ? '面试已创建，剧本绑定状态待确认'
          : '面试已创建，正在进入 AI 面试训练室'
    )
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '面试创建失败。请重试，或关闭简历上下文后先创建轻量技术面。'))
  } finally {
    creating.value = false
  }
}

const applyQuickRecommendation = () => {
  const payload = buildQuickPayload()
  const mode = modeCards.find((item) => item.value === payload.interviewMode && item.forceResume === Boolean(payload.resumeId))
    || modeCards.find((item) => item.value === payload.interviewMode)
  if (mode) {
    selectedModeKey.value = mode.key
  }
  form.interviewName = payload.interviewName
  form.interviewMode = payload.interviewMode
  form.targetPosition = payload.targetPosition
  form.experienceLevel = payload.experienceLevel
  form.industryDirection = payload.industryDirection
  form.difficulty = payload.difficulty
  form.interviewerStyle = payload.interviewerStyle
  form.practiceMode = payload.practiceMode
  form.questionCount = payload.questionCount
  form.resumeId = payload.resumeId
  useResume.value = Boolean(payload.resumeId)
  ElMessage.success('已使用推荐计划，可直接开始或继续微调')
  void scrollToConfig()
}

const handleQuickCreate = async () => {
  if (resumeLoading.value || matchReportVerifyLoading.value) return
  creating.value = true
  try {
    const payload = buildQuickPayload()

    const result = await createInterviewWithRouteContext(payload)
    const scenarioBindingStatus = await enterCreatedInterviewRoom(result)
    ElMessage.success(
      scenarioBindingStatus === 'BOUND'
        ? '已创建推荐面试并锁定剧本版本，正在进入训练室'
        : payload.resumeId
          ? '已创建推荐面试，正在进入训练室'
          : '已创建轻量技术面，正在进入训练室'
    )
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '推荐面试创建失败。请重试、先创建简历，或展开微调后改用轻量技术面。'))
  } finally {
    creating.value = false
  }
}

const handleVoicePreflightReady = () => {
  voicePreflightReady.value = true
  ElMessage.success('语音设备预检通过，进入房间后仍可随时切换文本回答。')
}

const handleVoiceTextFallback = () => {
  voicePreflightReady.value = false
  ElMessage.info('已保留文本回答模式，语音能力不会阻塞本轮面试。')
}

onMounted(async () => {
  gameProfile.hydrate(authStore.userInfo?.id)
  await fetchResumes()
  await loadApplicationPackageContext()
  await applyRouteContext()
  await verifyRouteMatchReport()
})
</script>

<style scoped lang="scss">
.arena-iv {
  min-height: calc(100vh - 64px);
  margin: -14px -24px -28px;

  &__page {
    max-width: 1060px;
    margin: 0 auto;
    padding: 28px 34px 42px;
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
  }

  &__head {
    order: 1;
    flex-wrap: wrap;
    gap: 12px;

    > .arena-row {
      display: none;
    }
  }

  &__kicker {
    font-size: 12.5px;
    font-weight: 800;
    color: var(--arena-grn-d);
  }

  &__title {
    margin-top: 5px;
  }

  &__boss {
    order: 3;
    display: block;
    margin-top: 14px;
    padding: 0;
    overflow: hidden;

    > summary {
      display: flex;
      align-items: center;
      min-height: 46px;
      padding: 0 16px;
      color: var(--arena-sub);
      cursor: pointer;
      font-size: 12.5px;
      font-weight: 800;
      list-style: none;
    }

    > summary::-webkit-details-marker {
      display: none;
    }

    &[open] {
      display: grid;
      grid-template-columns: minmax(0, 1.6fr) minmax(220px, 1fr);
      gap: 18px;
      padding: 16px;

      > summary {
        grid-column: 1 / -1;
        min-height: 0;
        padding: 0;
        color: var(--arena-grn-d);
      }
    }
  }

  &__boss-main {
    min-width: 0;
  }

  &__boss-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px;
    border: 1.5px dashed var(--arena-line);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.7);
  }

  &__warn {
    padding: 9px 12px;
    border-radius: 11px;
    background: var(--arena-amber-soft);
    color: var(--arena-amber);
    font-size: 12px;
    font-weight: 600;
    line-height: 1.55;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__plan-grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;

    article {
      padding: 11px 13px;
      border: 1.5px solid var(--arena-line2);
      border-radius: 12px;
      background: #fff;

      span {
        font-size: 10.5px;
        font-weight: 800;
        color: var(--arena-mut);
      }

      strong {
        display: block;
        margin-top: 3px;
        font-size: 13px;
      }

      p {
        margin: 4px 0 0;
        font-size: 11px;
        color: var(--arena-sub);
        line-height: 1.5;
      }
    }
  }

  &__context-grid {
    margin-top: 12px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;

    article {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 9px 12px;
      border-radius: 11px;
      background: #f8faf8;
      border: 1px solid var(--arena-line2);
      color: var(--arena-grn-d);

      span {
        font-size: 10.5px;
        font-weight: 800;
        color: var(--arena-mut);
      }

      strong {
        display: block;
        font-size: 12px;
        color: var(--arena-ink);
      }
    }
  }

  &__app-context {
    margin-top: 12px;
    padding: 13px 15px;
    border-radius: 13px;
    border: 1.5px solid var(--arena-line2);
    background: #f8faf8;
  }

  &__app-grid {
    margin-top: 10px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;

    article {
      padding: 8px 11px;
      border-radius: 10px;
      background: #fff;
      border: 1px solid var(--arena-line2);

      span {
        font-size: 10.5px;
        font-weight: 800;
        color: var(--arena-mut);
      }

      strong {
        display: block;
        margin-top: 2px;
        font-size: 12px;
      }

      &.is-missing strong {
        color: var(--arena-amber);
      }
    }
  }

  &__reasons {
    margin: 12px 0 0;
    padding-left: 18px;
    font-size: 12px;
    color: var(--arena-sub);
    line-height: 1.7;
  }

  &__trust {
    margin-top: 12px;
    padding: 11px 14px;
    border-radius: 12px;
    border: 1.5px dashed var(--arena-line);
    font-size: 12px;

    summary {
      cursor: pointer;
      font-weight: 800;
      color: var(--arena-sub);
    }

    p {
      margin: 9px 0 0;
      color: var(--arena-sub);
      line-height: 1.6;
    }
  }

  &__trust-grid {
    margin-top: 10px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;

    article {
      padding: 8px 10px;
      border-radius: 10px;
      background: #f8faf8;

      span {
        font-size: 10.5px;
        font-weight: 800;
        color: var(--arena-mut);
      }

      strong {
        display: block;
        margin-top: 2px;
        font-size: 11.5px;
      }

      &.is-missing strong {
        color: var(--arena-amber);
      }
    }
  }

  &__grid {
    order: 2;
    margin-top: 20px;
    display: grid;
    grid-template-columns: minmax(0, 760px);
    justify-content: center;
    gap: 14px;
    align-items: start;

    > .arena-col:last-child {
      display: none;
    }
  }

  &__panel {
    padding: 20px 22px;
  }

  &__dungeons {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 11px;
  }

  &__advanced-modes {
    margin-top: 14px;

    summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 2px 0;
      color: var(--arena-sub);
      cursor: pointer;
      list-style: none;

      &::-webkit-details-marker {
        display: none;
      }

      span {
        color: var(--arena-ink);
        font-size: 12.5px;
        font-weight: 800;
      }

      small {
        color: var(--arena-mut);
        font-size: 11px;
      }
    }
  }

  &__dungeons--advanced {
    padding-top: 2px;
  }

  &__dungeon {
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding: 14px 15px;
    border: 2px solid var(--arena-line);
    border-radius: 15px;
    background: #fff;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;

    &:hover {
      transform: translateY(-2px);
      border-color: var(--arena-grn);
      box-shadow: 0 6px 16px rgba(23, 178, 106, 0.1);
    }

    &.is-active {
      border-color: var(--arena-grn);
      background: linear-gradient(135deg, #f0fbf4, #ffffff 75%);
    }

    &.is-recommended {
      border-color: #b9e7cd;
    }

    b {
      font-size: 13.5px;
    }

    small {
      font-size: 11.5px;
      color: var(--arena-sub);
      line-height: 1.5;
    }
  }

  &__selection-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: 16px;
    padding: 15px 16px;
    border: 1.5px solid #b9e7cd;
    border-radius: 16px;
    background: #f0fbf4;

    > div:first-child {
      display: grid;
      gap: 5px;
      min-width: 0;
    }

    b {
      color: var(--arena-ink);
      font-size: 14px;
      font-weight: 900;
    }

    p {
      margin: 0;
      color: var(--arena-sub);
      font-size: 12px;
      line-height: 1.5;
    }
  }

  &__selection-actions {
    display: flex;
    flex: none;
    gap: 10px;

    .arena-btn {
      min-height: 42px;
      padding: 0 18px;
    }
  }

  &__dungeon-icon {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--arena-grn-soft);
    color: var(--arena-grn-d);
  }

  &__collapsed {
    margin-top: 14px;
    padding: 14px 16px;
    border-radius: 13px;
    border: 1.5px dashed var(--arena-line);
  }

  &__form {
    margin-top: 14px;
  }

  &__form-section {
    padding: 14px 0 4px;
    border-top: 1.5px dashed var(--arena-line);

    &:first-child {
      border-top: 0;
      padding-top: 4px;
    }
  }

  &__form-title {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 12px;
    font-size: 13px;
    font-weight: 900;

    span {
      width: 24px;
      height: 24px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      background: var(--arena-grn-soft);
      color: var(--arena-grn-d);
    }
  }

  &__form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    column-gap: 14px;
  }

  &__resume-switch {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 12px 14px;
    border-radius: 12px;
    background: #f8faf8;
    border: 1px solid var(--arena-line2);
    margin-bottom: 12px;
  }

  &__tpl-preview {
    padding: 13px 15px;
    border-radius: 13px;
    border: 1.5px solid var(--arena-line2);
    background: #f8faf8;
    margin-bottom: 14px;
  }

  &__wizard {
    margin-top: 13px;
    display: flex;
    flex-direction: column;
    gap: 9px;

    article {
      display: flex;
      align-items: flex-start;
      gap: 11px;
      padding: 10px 12px;
      border-radius: 12px;
      border: 1.5px solid var(--arena-line2);

      &.is-active {
        border-color: #b9e7cd;
        background: linear-gradient(135deg, #f0fbf4, #ffffff 75%);
      }

      > span {
        flex: none;
        width: 24px;
        height: 24px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 900;
        background: var(--arena-grn-soft);
        color: var(--arena-grn-d);
      }

      b {
        font-size: 12.5px;
      }

      p {
        margin: 2px 0 0;
        font-size: 11px;
        color: var(--arena-sub);
      }
    }
  }

  &__summary {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 9px;

    > div {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      font-size: 12px;

      span {
        color: var(--arena-mut);
        font-weight: 600;
      }

      strong {
        text-align: right;
        font-size: 12px;
      }
    }
  }

  &__tip {
    background: linear-gradient(150deg, #fff, #fff7ec);
    border-color: #f3ddc0;
  }
}

@media (max-width: 720px) {
  .arena-iv {
    margin: -12px -12px 0;

    &__page {
      padding: 18px 14px 26px;
    }

    &__boss,
    &__grid,
    &__dungeons,
    &__plan-grid,
    &__context-grid,
    &__app-grid,
    &__trust-grid,
    &__form-grid {
      grid-template-columns: 1fr;
    }

    &__selection-summary,
    &__selection-actions {
      width: 100%;
    }

    &__selection-summary {
      align-items: stretch;
      flex-direction: column;
    }

    &__selection-actions .arena-btn {
      flex: 1;
    }
  }
}
</style>
