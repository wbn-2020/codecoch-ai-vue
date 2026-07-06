<template>
  <div class="resume-editor page-shell">
    <section class="editor-hero">
      <div>
        <div class="hero-kicker">
          <FilePenLine :size="16" />
          AI 简历实验室
        </div>
        <h1>{{ isEdit ? '打磨 Offer 简历' : '创建可验证简历' }}</h1>
        <p>左侧沉淀真实经历，中间同步生成白纸预览，右侧把完整度、JD 匹配、项目证据和缺口建议放在同一个工作台里。</p>
        <div class="hero-status">
          <span>{{ form.resumeName || '未命名简历' }}</span>
          <span>{{ form.targetPosition || '待补目标岗位' }}</span>
          <span>{{ completion }}% 已填写</span>
        </div>
      </div>
      <div class="hero-actions">
        <el-button @click="router.push('/resumes')">
          <ArrowLeft :size="16" />
          返回简历实验室
        </el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">
          <Save :size="16" />
          保存简历
        </el-button>
      </div>
    </section>

    <div class="workspace-tabs" role="tablist" aria-label="移动端简历工作区">
      <button
        type="button"
        :class="{ active: mobileWorkspaceTab === 'edit' }"
        @click="mobileWorkspaceTab = 'edit'"
      >
        编辑
      </button>
      <button
        type="button"
        :class="{ active: mobileWorkspaceTab === 'preview' }"
        @click="mobileWorkspaceTab = 'preview'"
      >
        预览
      </button>
      <button
        type="button"
        :class="{ active: mobileWorkspaceTab === 'advice' }"
        @click="mobileWorkspaceTab = 'advice'"
      >
        AI 建议
      </button>
    </div>

    <section class="live-feedback-strip">
      <article v-for="item in liveFeedbackItems" :key="item.title" :class="item.tone">
        <span>{{ item.label }}</span>
        <strong>{{ item.title }}</strong>
        <p>{{ item.desc }}</p>
      </article>
    </section>

    <div :class="['editor-workspace', `is-mobile-${mobileWorkspaceTab}`]">
      <main class="editor-column editor-main mobile-pane-edit">
        <section class="content-card side-panel ai-writing-card">
          <div class="panel-kicker">
            <Sparkles :size="15" />
            AI 写作
          </div>
          <h3>先锁定事实，再让表达更像简历</h3>
          <p>这里不替你编造经历，只把当前缺口转成可执行的写作动作。</p>
          <div class="prompt-list">
            <button
              v-for="prompt in aiWritingPrompts"
              :key="prompt.target"
              type="button"
              class="prompt-card"
              @click="focusSection(prompt.target)"
            >
              <span>{{ prompt.label }}</span>
              <strong>{{ prompt.title }}</strong>
              <small>{{ prompt.desc }}</small>
            </button>
          </div>
        </section>

        <section class="content-card side-panel section-nav-card">
          <div class="panel-kicker">
            <Layers3 :size="15" />
            分区导航
          </div>
          <div class="section-nav">
            <button
              v-for="item in sectionNavItems"
              :key="item.id"
              type="button"
              :class="{ done: item.done }"
              @click="focusSection(item.id)"
            >
              <CheckCircle2 v-if="item.done" :size="15" />
              <Circle v-else :size="15" />
              {{ item.label }}
            </button>
          </div>
        </section>

        <section class="content-card editor-section edit-card" v-loading="loading">
          <div class="section-heading">
            <div class="section-icon">
              <UserRound :size="18" />
            </div>
            <div>
              <h2>结构化编辑</h2>
              <p>先把真实信息写扎实，右侧预览会同步展示当前内容。</p>
            </div>
          </div>

          <el-form ref="formRef" class="resume-form" :model="form" :rules="rules" label-position="top">
            <div id="resume-basic" class="editor-block">
              <div class="block-head">
                <span>基本信息</span>
                <el-tag size="small" :type="form.resumeName && form.realName ? 'success' : 'warning'" effect="plain">
                  {{ form.resumeName && form.realName ? '可识别' : '待补充' }}
                </el-tag>
              </div>
            <div class="form-grid">
              <el-form-item label="简历名称" prop="resumeName">
                <el-input v-model.trim="form.resumeName" placeholder="例如：Java 后端 3 年经验简历" />
              </el-form-item>
              <el-form-item label="真实姓名">
                <el-input v-model.trim="form.realName" placeholder="请输入姓名" />
              </el-form-item>
              <el-form-item label="邮箱">
                <el-input v-model.trim="form.email" placeholder="用于补充联系方式" />
              </el-form-item>
              <el-form-item label="手机号">
                <el-input v-model.trim="form.phone" placeholder="用于补充联系方式" />
              </el-form-item>
            </div>
            </div>

            <div id="resume-target" class="editor-block">
              <div class="block-head">
                <span>求职目标</span>
                <el-tag size="small" :type="form.targetPosition ? 'success' : 'warning'" effect="plain">
                  {{ form.targetPosition ? '已明确' : '待填写' }}
                </el-tag>
            </div>
            <div class="form-grid">
              <el-form-item label="求职方向">
                <el-input v-model.trim="form.targetPosition" placeholder="例如：Java 微服务开发" />
              </el-form-item>
              <el-form-item label="默认简历">
                <div class="switch-line">
                  <el-switch v-model="form.isDefault" :active-value="1" :inactive-value="0" />
                  <span>保存后会更新你的默认简历</span>
                </div>
              </el-form-item>
            </div>
            </div>

            <div id="resume-summary" class="editor-block">
              <div class="block-head">
                <span>个人摘要</span>
                <el-tag size="small" :type="form.summary ? 'success' : 'info'" effect="plain">
                  {{ form.summary ? '已填写' : '可继续补充' }}
                </el-tag>
              </div>
            <el-form-item label="个人摘要">
              <el-input
                v-model="form.summary"
                type="textarea"
                :rows="4"
                placeholder="简要说明工作背景、优势方向、项目类型和求职重点"
              />
            </el-form-item>
            </div>

            <div id="resume-skills" class="editor-block">
              <div class="block-head">
                <span>技能关键词</span>
                <el-tag size="small" :type="skillTags.length ? 'success' : 'warning'" effect="plain">
                  {{ skillTags.length ? `${skillTags.length} 个关键词` : '待填写' }}
                </el-tag>
            </div>
            <el-form-item label="核心技术栈" prop="skills">
              <el-input
                v-model="form.skills"
                type="textarea"
                :rows="4"
                placeholder="Spring Boot、MySQL、Redis、MQ、Spring Cloud、Vue..."
              />
            </el-form-item>
            </div>

            <div id="resume-experience" class="editor-block">
              <div class="block-head">
                <span>经历与教育</span>
                <el-tag size="small" :type="form.workSummary || form.education ? 'success' : 'info'" effect="plain">
                  {{ form.workSummary || form.education ? '已填写' : '可继续补充' }}
                </el-tag>
            </div>
            <el-form-item label="工作经历 / 工作摘要">
              <el-input
                v-model="form.workSummary"
                type="textarea"
                :rows="5"
                placeholder="描述公司类型、负责系统、业务规模、核心职责和结果"
              />
            </el-form-item>
            <el-form-item label="教育经历">
              <el-input
                v-model="form.education"
                type="textarea"
                :rows="3"
                placeholder="学校、专业、学历、时间范围等"
              />
            </el-form-item>
            </div>
          </el-form>

          <div class="form-actions">
            <el-button @click="router.push('/resumes')">取消</el-button>
            <el-button type="primary" :loading="saving" @click="handleSave">保存简历</el-button>
          </div>
        </section>

        <section id="resume-projects" class="content-card editor-section project-section">
          <div class="section-heading project-header">
            <div class="section-heading__left">
              <div class="section-icon">
                <Layers3 :size="18" />
              </div>
              <div>
                <h2>项目经历</h2>
                <p>{{ isEdit ? '把背景、职责、难点和结果写成可证明的经历，后续可沉淀为项目证据。' : '创建简历时可先补项目草稿，保存后会自动挂到这份简历下。' }}</p>
              </div>
            </div>
            <el-button type="primary" @click="openProjectDialog()">
              <Plus :size="16" />
              {{ isEdit ? '新增项目' : '添加项目草稿' }}
            </el-button>
          </div>

          <div class="project-list">
            <div v-if="projects.length === 0" class="project-empty">
              <FolderOpen :size="30" />
              <h3>暂无项目经历</h3>
              <p>{{ isEdit ? '项目经历会帮助面试创建页构建更完整的简历上下文。' : '建议至少补一个能讲清背景、职责、技术难点和结果的项目。' }}</p>
            </div>
            <article v-for="project in projects" v-else :key="project.projectId" class="project-card">
              <div class="project-card__main">
                <div class="project-card__top">
                  <h3>{{ project.projectName }}</h3>
                  <span>{{ project.projectTime || project.projectPeriod || '未填写项目时间' }}</span>
                </div>
                <p class="project-meta">{{ project.techStack || '未填写技术栈' }}</p>
                <p class="project-desc">{{ project.projectBackground || project.description || '暂无项目背景' }}</p>
              </div>
              <div class="project-actions">
                <el-button type="primary" plain @click="openProjectEvidenceCreate(project)">补项目证据</el-button>
                <el-button @click="openProjectDialog(project)">编辑</el-button>
                <el-button type="danger" plain @click="handleDeleteProject(project)">删除</el-button>
              </div>
            </article>
          </div>
        </section>
      </main>

      <section class="preview-column content-card mobile-pane-preview">
        <div class="preview-toolbar">
          <div>
            <h2>A4 简历预览</h2>
            <p>基于当前表单字段实时渲染，不代表最终 PDF 样式。</p>
          </div>
          <el-tag effect="plain">{{ isEdit ? '编辑中' : '草稿' }}</el-tag>
        </div>
        <div class="resume-paper-wrap">
          <article class="resume-paper">
            <header class="paper-header">
              <h2>{{ previewName }}</h2>
              <p v-if="form.targetPosition">{{ form.targetPosition }}</p>
              <div v-if="contactItems.length" class="paper-contact">
                <span v-for="item in contactItems" :key="item">{{ item }}</span>
              </div>
            </header>

            <section v-if="form.summary" class="paper-section">
              <h3>个人摘要</h3>
              <p>{{ form.summary }}</p>
            </section>

            <section v-if="form.education" class="paper-section">
              <h3>教育经历</h3>
              <p>{{ form.education }}</p>
            </section>

            <section v-if="form.workSummary" class="paper-section">
              <h3>工作经历</h3>
              <p>{{ form.workSummary }}</p>
            </section>

            <section v-if="skillTags.length" class="paper-section">
              <h3>技术栈</h3>
              <div class="paper-tags">
                <span v-for="tag in skillTags" :key="tag">{{ tag }}</span>
              </div>
            </section>

            <section v-if="projects.length" class="paper-section">
              <h3>项目经历</h3>
              <article v-for="project in projects" :key="project.projectId" class="paper-project">
                <div class="paper-project__head">
                  <strong>{{ project.projectName || '未命名项目' }}</strong>
                  <span>{{ project.projectTime || project.projectPeriod }}</span>
                </div>
                <p v-if="project.role || project.responsibility">{{ project.role || project.responsibility }}</p>
                <p v-if="project.techStack" class="paper-muted">{{ project.techStack }}</p>
                <ul>
                  <li v-if="project.projectBackground || project.description">
                    {{ project.projectBackground || project.description }}
                  </li>
                  <li v-if="project.technicalChallenges || project.technicalDifficulties">
                    {{ project.technicalChallenges || project.technicalDifficulties }}
                  </li>
                  <li v-if="project.optimizationResult || project.optimizationResults">
                    {{ project.optimizationResult || project.optimizationResults }}
                  </li>
                </ul>
              </article>
            </section>

            <div v-if="!hasPreviewContent" class="paper-empty">
              <FolderOpen :size="30" />
              <strong>白纸已经准备好</strong>
              <span>先补充姓名、目标岗位、技术栈或项目经历，预览会在这里同步生成。</span>
            </div>
          </article>
        </div>
      </section>

      <aside class="editor-column editor-aside mobile-pane-advice">
        <section class="content-card side-panel readiness-panel">
          <div class="completion-head">
            <span>简历完整度</span>
            <strong>{{ completion }}%</strong>
          </div>
          <el-progress :percentage="completion" :stroke-width="10" :show-text="false" />
          <p>仅基于当前表单真实填写项计算，不代表 AI 评分。</p>
          <div class="completion-list">
            <span v-for="item in completionItems" :key="item.label" :class="{ done: item.done }">
              <CheckCircle2 v-if="item.done" :size="15" />
              <Circle v-else :size="15" />
              {{ item.label }}
            </span>
          </div>
        </section>

        <section class="content-card side-panel jd-match-panel">
          <div class="completion-head">
            <span>JD 匹配准备度</span>
            <strong>{{ jdMatchReadiness }}%</strong>
          </div>
          <el-progress :percentage="jdMatchReadiness" :stroke-width="10" :show-text="false" />
          <p>用于判断当前简历是否适合进入 JD 匹配，不替代正式匹配报告。</p>
          <div class="diagnostic-list">
            <span v-for="item in jdMatchItems" :key="item.label" :class="{ done: item.done }">
              <CheckCircle2 v-if="item.done" :size="15" />
              <Circle v-else :size="15" />
              {{ item.label }}
            </span>
          </div>
        </section>

        <section class="content-card side-panel evidence-panel">
          <h3>项目证据</h3>
          <p>项目是否能支撑岗位能力，先看数量、结果和技能映射。</p>
          <div class="evidence-list">
            <div v-for="item in projectEvidenceItems" :key="item.label" :class="{ done: item.done }">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
          <el-button class="full-button" @click="router.push('/project-evidence')">
            <Layers3 :size="16" />
            打开项目证据库
          </el-button>
        </section>

        <section class="content-card side-panel gap-panel">
          <h3>缺口建议</h3>
          <div class="gap-list">
            <article v-for="item in gapSuggestionItems" :key="item.title">
              <strong>{{ item.title }}</strong>
              <p>{{ item.desc }}</p>
            </article>
          </div>
        </section>

        <section v-if="isEdit && resumeId" class="content-card side-panel ai-panel">
          <h3>AI 优化建议</h3>
          <p>基于已保存简历生成建议。建议需要人工复核，应用时会创建草稿，不会覆盖当前简历。</p>
          <el-form class="optimize-form" :model="optimizeForm" label-position="top">
            <el-form-item label="目标岗位">
              <el-input v-model.trim="optimizeForm.targetPosition" placeholder="默认使用当前求职方向" />
            </el-form-item>
            <el-form-item label="工作年限">
              <el-input-number v-model="optimizeForm.experienceYears" :min="0" :max="30" />
            </el-form-item>
            <el-form-item label="行业方向">
              <el-input v-model.trim="optimizeForm.industryDirection" placeholder="例如：电商 / 金融支付 / SaaS" />
            </el-form-item>
          </el-form>
          <el-button class="full-button" type="primary" :loading="optimizing" @click="handleOptimizeResume">
            <Sparkles :size="16" />
            生成建议
          </el-button>

          <div v-if="!optimizeRecords.length && !optimizeSseMessage" class="ai-empty">
            暂无 AI 建议记录。保存简历后可生成一次优化建议。
          </div>

          <div v-if="optimizeSseEvents.length || optimizeSseMessage" class="sse-progress">
            <div class="sse-progress__head">
              <span>建议生成进度</span>
              <el-tag size="small" effect="plain">{{ optimizeSseStatus }}</el-tag>
            </div>
            <p>{{ optimizeSseMessage || '等待建议进度返回。' }}</p>
            <p class="sse-progress__hint">{{ optimizeRecoveryHint }}</p>
            <div class="sse-progress__list">
              <span v-for="(event, index) in optimizeSseEvents" :key="`${event.type}-${index}`">
                {{ event.stage || optimizeSseTypeLabel(event.type) }} · {{ event.message }}
              </span>
            </div>
            <el-button
              v-if="optimizeTask"
              class="sse-progress__action"
              text
              type="primary"
              @click="goOptimizeTaskCenter(optimizeTask)"
            >
              查看生成进度
            </el-button>
            <el-button
              v-if="showOptimizeRefreshAction"
              class="sse-progress__action"
              text
              type="primary"
              :loading="optimizeRecordsRefreshing"
              @click="refreshOptimizeRecords"
            >
              刷新最近记录
            </el-button>
          </div>

          <div class="optimize-records">
            <div class="capability-item">
              <span>最近建议</span>
              <el-tag :type="latestOptimizeRecord?.optimizeStatus === 'FAILED' ? 'danger' : latestOptimizeRecord ? 'success' : 'info'" effect="plain">
                {{ optimizeStatusText(latestOptimizeRecord?.optimizeStatus) }}
              </el-tag>
            </div>
            <button
              v-for="record in optimizeRecords"
              :key="record.optimizeRecordId"
              class="record-row"
              type="button"
              @click="openOptimizeDetail(record.optimizeRecordId)"
            >
              <span>建议记录 {{ record.optimizeRecordId }} · {{ optimizeStatusText(record.optimizeStatus) }}</span>
              <small>{{ formatDateTime(record.createdAt || record.updatedAt) }}</small>
            </button>
          </div>

          <div v-if="optimizeDetail" class="optimize-result">
          <el-alert
            type="info"
            :closable="false"
            show-icon
              title="建议仅供复核"
              description="这里只展示字段建议、改写方向和风险提示；没有返回分数时不会补造分数。"
          />
            <div v-if="optimizeDetail.overallScore !== undefined && optimizeDetail.overallScore !== null" class="score-line">
              <span>综合评分</span>
              <strong>{{ optimizeDetail.overallScore }}</strong>
            </div>
          <p>{{ optimizeDetailSummary }}</p>
          <div v-if="optimizeSuggestions.length" class="rewrite-toolbar">
            <span>已选择 {{ selectedOptimizeSuggestionIndexes.length }} / {{ optimizeSuggestions.length }} 个字段建议</span>
            <el-button text size="small" @click="selectAllOptimizeSuggestions">全选</el-button>
            <el-button text size="small" @click="selectedOptimizeSuggestionIndexes = []">清空</el-button>
          </div>
          <div v-if="optimizeSuggestions.length" class="rewrite-list">
            <article v-for="(item, index) in optimizeSuggestions" :key="index">
              <div class="rewrite-head">
                <el-checkbox v-model="selectedOptimizeSuggestionIndexes" :label="index">
                  {{ getOptimizeSuggestionFieldName(item, index) }}
                </el-checkbox>
                <el-tag v-if="item.fabricationRisk" type="warning" effect="plain">需核实真实性</el-tag>
              </div>
              <div class="rewrite-diff">
                <div>
                  <span>字段</span>
                  <p>{{ getOptimizeSuggestionFieldName(item, index) }}</p>
                </div>
                <div>
                  <span>改写建议</span>
                  <p>{{ item.after || item.reason || '暂未返回改写建议' }}</p>
                </div>
              </div>
              <p v-if="item.reason" class="rewrite-reason">{{ item.reason }}</p>
            </article>
          </div>
            <div v-else class="ai-empty">
              这条记录暂未返回可应用的字段建议，可刷新最近记录或补充目标岗位后重新生成。
            </div>
            <el-tooltip :content="applyOptimizeDisabledReason" placement="top" :disabled="canApplyOptimizeResult">
              <el-button
                class="full-button"
                type="primary"
                :disabled="!canApplyOptimizeResult"
                :loading="applyingOptimize"
                @click="handleApplyOptimizeResult"
              >
                <GitCompareArrows :size="16" />
                应用建议 · 新建草稿
              </el-button>
            </el-tooltip>
          </div>
        </section>

        <section v-else class="content-card side-panel ai-panel ai-locked-panel">
          <h3>AI 优化建议</h3>
          <p>先保存简历，系统才能基于稳定版本生成建议。建议应用时会创建草稿，不会覆盖当前编辑内容。</p>
          <div class="ai-empty">
            当前是未保存草稿。保存后可生成一次 AI 润色建议，并在这里查看记录。
          </div>
        </section>

        <section class="content-card side-panel">
          <h3>闭环动作</h3>
          <p>保存后可以把项目补成证据，也可以进入面试训练验证简历表达。</p>
          <el-button class="full-button" @click="router.push('/interviews/create')">
            <MessagesSquare :size="16" />
            进入模拟面试
          </el-button>
        </section>

        <section class="content-card side-panel">
          <h3>填写建议</h3>
          <ul>
            <li>技术栈尽量按语言、框架、中间件、数据库分组。</li>
            <li>项目经历建议写清背景、职责、难点和可量化结果。</li>
            <li>个人摘要保持真实，不写无法在面试中展开的内容。</li>
          </ul>
        </section>
      </aside>
    </div>

    <el-dialog
      v-model="projectDialogVisible"
      :title="editingProjectId ? '编辑项目经历' : '新增项目经历'"
      width="760px"
      class="resume-project-dialog"
    >
      <ResumeProjectForm ref="projectFormRef" :model-value="editingProject || undefined" />
      <template #footer>
        <el-button @click="projectDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="projectSaving" @click="handleSaveProject">保存项目</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  FilePenLine,
  FolderOpen,
  GitCompareArrows,
  Layers3,
  MessagesSquare,
  Plus,
  Save,
  Sparkles,
  UserRound
} from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  applyResumeOptimizeResultApi,
  createResumeApi,
  createResumeProjectApi,
  deleteResumeProjectApi,
  getResumeOptimizeRecordsApi,
  getResumeOptimizeResultApi,
  getResumeDetailApi,
  optimizeResumeApi,
  setDefaultResumeApi,
  updateResumeApi,
  updateResumeProjectApi
} from '@/api/resume'
import ResumeProjectForm from '@/components/resume/ResumeProjectForm.vue'
import type {
  ResumeCreateDTO,
  ResumeDetailVO,
  ResumeOptimizeDetailVO,
  ResumeOptimizeRecordVO,
  ResumeOptimizeRequestDTO,
  ResumeOptimizeSubmitVO,
  ResumeRewriteSuggestion,
  ResumeProjectDTO,
  ResumeProjectVO
} from '@/types/resume'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage, toFriendlyMessage } from '@/utils/error'
import { getRouteNumberParam } from '@/utils/route'
import { formatDateTime } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const resumeId = computed(() => getRouteNumberParam(route.params.id as string))
const isEdit = computed(() => Boolean(resumeId.value))
const routeTargetJobId = computed(() => {
  const rawValue = Array.isArray(route.query.targetJobId) ? route.query.targetJobId[0] : route.query.targetJobId
  const value = Number(rawValue)
  return Number.isFinite(value) && value > 0 ? value : undefined
})

const loading = ref(false)
const saving = ref(false)
const projectSaving = ref(false)
const optimizing = ref(false)
const applyingOptimize = ref(false)
const formRef = ref<FormInstance>()
const projectFormRef = ref<InstanceType<typeof ResumeProjectForm>>()
const projectDialogVisible = ref(false)
const editingProjectId = ref<number | null>(null)
const editingProject = ref<ResumeProjectVO | null>(null)
const projects = ref<ResumeProjectVO[]>([])
const optimizeRecords = ref<ResumeOptimizeRecordVO[]>([])
const optimizeDetail = ref<ResumeOptimizeDetailVO | null>(null)
const selectedOptimizeSuggestionIndexes = ref<number[]>([])
const optimizeSseEvents = ref<Array<{ type: string; stage?: string; message: string }>>([])
const optimizeSseMessage = ref('')
const optimizeSseStatus = ref('未开始')
const optimizeTask = ref<ResumeOptimizeSubmitVO | null>(null)
const optimizeRecordsRefreshing = ref(false)
const mobileWorkspaceTab = ref<'edit' | 'preview' | 'advice'>('edit')

const form = reactive<ResumeCreateDTO>({
  resumeName: '',
  realName: '',
  email: '',
  phone: '',
  targetPosition: '',
  summary: '',
  skills: '',
  workSummary: '',
  education: '',
  isDefault: 0
})

const optimizeForm = reactive<ResumeOptimizeRequestDTO>({
  targetPosition: '',
  experienceYears: undefined,
  industryDirection: ''
})

const rules: FormRules<ResumeCreateDTO> = {
  resumeName: [{ required: true, message: '请输入简历名称', trigger: 'blur' }],
  skills: [{ required: true, message: '请输入技术栈', trigger: 'blur' }]
}

const completionItems = computed(() => [
  { label: '简历名称', done: Boolean(form.resumeName?.trim()) },
  { label: '求职方向', done: Boolean(form.targetPosition?.trim()) },
  { label: '技术栈', done: Boolean(form.skills?.trim()) },
  { label: '个人摘要', done: Boolean(form.summary?.trim()) },
  { label: '工作经历', done: Boolean(form.workSummary?.trim()) },
  { label: '教育经历', done: Boolean(form.education?.trim()) },
  { label: '项目经历', done: projects.value.length > 0 }
])

const completion = computed(() => {
  const done = completionItems.value.filter((item) => item.done).length
  return Math.round((done / completionItems.value.length) * 100)
})

const sectionNavItems = computed(() => [
  { id: 'resume-basic', label: '基本信息', done: Boolean(form.resumeName?.trim() && form.realName?.trim()) },
  { id: 'resume-target', label: '求职目标', done: Boolean(form.targetPosition?.trim()) },
  { id: 'resume-summary', label: '个人摘要', done: Boolean(form.summary?.trim()) },
  { id: 'resume-skills', label: '技能关键词', done: Boolean(form.skills?.trim()) },
  { id: 'resume-experience', label: '经历与教育', done: Boolean(form.workSummary?.trim() || form.education?.trim()) },
  { id: 'resume-projects', label: '项目经历', done: projects.value.length > 0 }
])

const previewName = computed(() => form.realName || form.resumeName || '未命名简历')

const splitTextTags = (value?: string) =>
  (value || '')
    .split(/[，,、\n/|]+/)
    .map((item) => item.trim())
    .filter(Boolean)

const skillTags = computed(() => splitTextTags(form.skills).slice(0, 18))

const contactItems = computed(() =>
  [form.phone, form.email]
    .map((item) => item?.trim())
    .filter((item): item is string => Boolean(item))
)

const hasPreviewContent = computed(() =>
  Boolean(
    form.realName ||
    form.resumeName ||
    form.targetPosition ||
    form.summary ||
    form.education ||
    form.workSummary ||
    skillTags.value.length ||
    projects.value.length
  )
)

const projectsWithResult = computed(() =>
  projects.value.filter((project) => Boolean(project.optimizationResult || project.optimizationResults)).length
)

const aiWritingPrompts = computed(() => [
  {
    target: 'resume-summary',
    label: '摘要',
    title: form.summary ? '把摘要压到 3 句话' : '先写 30 秒自我介绍',
    desc: '背景、主技术栈、能证明的业务结果各保留一句。'
  },
  {
    target: 'resume-skills',
    label: '技能',
    title: skillTags.value.length >= 6 ? '按岗位优先级排序' : '补齐核心技能簇',
    desc: '语言、框架、中间件、数据库、工程实践分组展示。'
  },
  {
    target: 'resume-projects',
    label: '证据',
    title: projects.value.length ? '给项目补结果指标' : '添加最能被追问的项目',
    desc: '每段项目至少包含背景、职责、难点、方案和结果。'
  }
])

const jdMatchItems = computed(() => [
  { label: '目标岗位', done: Boolean(routeTargetJobId.value || form.targetPosition?.trim()) },
  { label: '关键词密度', done: skillTags.value.length >= 6 },
  { label: '项目支撑', done: projects.value.length > 0 },
  { label: '结果指标', done: projectsWithResult.value > 0 }
])

const jdMatchReadiness = computed(() => {
  const done = jdMatchItems.value.filter((item) => item.done).length
  return Math.round((done / jdMatchItems.value.length) * 100)
})

const projectEvidenceItems = computed(() => [
  {
    label: '项目数量',
    value: projects.value.length ? `${projects.value.length} 段` : '待补充',
    done: projects.value.length > 0
  },
  {
    label: '结果指标',
    value: projectsWithResult.value ? `${projectsWithResult.value} 段已写结果` : '缺少量化结果',
    done: projectsWithResult.value > 0
  },
  {
    label: '技术栈映射',
    value: skillTags.value.length ? `${skillTags.value.length} 个关键词` : '待提取',
    done: skillTags.value.length > 0
  }
])

const gapSuggestionItems = computed(() => {
  const items = [
    !form.targetPosition?.trim()
      ? { title: '先明确目标岗位', desc: '没有岗位锚点时，摘要和技能排序容易发散。' }
      : null,
    skillTags.value.length < 6
      ? { title: '补齐可检索关键词', desc: '至少覆盖语言、框架、数据库、中间件和工程实践。' }
      : null,
    !form.summary?.trim()
      ? { title: '补一段个人摘要', desc: '用真实经历概括方向，不写无法展开的形容词。' }
      : null,
    !form.workSummary?.trim()
      ? { title: '补工作经历上下文', desc: '说明负责系统、业务规模、职责边界和结果。' }
      : null,
    !projects.value.length
      ? { title: '补项目证据', desc: '至少准备一段可被面试追问的完整项目。' }
      : null,
    projects.value.length > 0 && projectsWithResult.value === 0
      ? { title: '给项目加结果', desc: '用性能、效率、稳定性、成本或业务指标承接方案。' }
      : null
  ].filter((item): item is { title: string; desc: string } => Boolean(item))

  return items.length
    ? items.slice(0, 4)
    : [{ title: '进入投递前复核', desc: '当前结构已比较完整，建议结合具体 JD 再做关键词取舍。' }]
})

const focusSection = (sectionId: string) => {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const liveFeedbackItems = computed(() => [
  {
    label: '实时预览',
    title: hasPreviewContent.value ? '右侧 A4 已同步当前填写内容' : '先写姓名、岗位或项目，右侧会生成纸张预览',
    desc: hasPreviewContent.value ? '预览只来自当前真实字段，不会补造经历。' : '不需要等保存，编辑区改动会直接反映到预览。',
    tone: hasPreviewContent.value ? 'is-good' : 'is-waiting'
  },
  {
    label: '项目证据',
    title: projects.value.length ? `${projects.value.length} 段项目经历可继续打磨` : '还缺一段可追问的项目经历',
    desc: projectsWithResult.value
      ? `${projectsWithResult.value} 段项目已经写到结果指标，后续可沉淀为证据。`
      : '建议补上背景、职责、技术难点和量化结果，面试追问才有真实依据。',
    tone: projectsWithResult.value ? 'is-good' : 'is-warning'
  },
  {
    label: 'AI 润色',
    title: latestOptimizeRecord.value ? `最近建议：${optimizeStatusText(latestOptimizeRecord.value.optimizeStatus)}` : '保存后可生成 AI 润色建议',
    desc: latestOptimizeRecord.value ? '建议需要你人工复核，应用时会创建新草稿。' : 'AI 建议不会覆盖当前简历，用于对照和筛选可采纳改写。',
    tone: latestOptimizeRecord.value ? 'is-good' : 'is-waiting'
  }
])

const latestOptimizeRecord = computed(() => optimizeRecords.value[0])

const optimizeSuggestions = computed(() => optimizeDetail.value?.rewriteSuggestions || [])

const optimizeDetailSummary = computed(() => {
  const raw = optimizeDetail.value?.overallComment || optimizeDetail.value?.errorMessage
  return raw ? toFriendlyMessage(raw, '建议结果暂不可用，请稍后重试。') : '暂未返回整体评价。'
})

const showOptimizeRefreshAction = computed(() => Boolean(optimizeSseMessage.value) && !optimizing.value)

const showOptimizeTaskCenterAction = computed(() => Boolean(optimizeTask.value))

const optimizeRecoveryHint = computed(() => {
  if (showOptimizeTaskCenterAction.value) {
    return '建议已在后台生成，可以离开本页，完成后再刷新最近记录查看结果。'
  }
  if (optimizing.value) {
    return '建议生成可能需要一点时间。你可以停留等待，也可以稍后回到本页，从最近记录继续查看结果。'
  }
  if (latestOptimizeRecord.value) {
    return '最近建议记录已保留，可打开记录查看结果或失败原因。'
  }
  return '如果刚才离开或网络中断，可以刷新最近记录；仍没有结果时再重新生成建议。'
})

const hasOptimizeAsyncReceipt = (result: ResumeOptimizeSubmitVO) =>
  Boolean(result.asyncMessageId || result.asyncTraceId || result.asyncBizId || result.asyncSendStatus)

const buildOptimizeTaskCenterQuery = (task: ResumeOptimizeSubmitVO) => {
  const query: Record<string, string> = {
    bizType: task.asyncBizType || 'resume.optimize',
    bizId: task.asyncBizId || String(task.optimizeRecordId)
  }
  if (task.asyncMessageId) query.messageId = task.asyncMessageId
  if (task.asyncTraceId) query.traceId = task.asyncTraceId
  return query
}

const goOptimizeTaskCenter = (task: ResumeOptimizeSubmitVO) => {
  router.push({ path: '/agent/tasks', query: buildOptimizeTaskCenterQuery(task) })
}

const canApplyOptimizeResult = computed(() =>
  optimizeDetail.value?.optimizeStatus === 'SUCCESS' && selectedOptimizeSuggestionIndexes.value.length > 0
)

const applyOptimizeDisabledReason = computed(() => {
  if (!optimizeDetail.value) return '请选择一条优化记录'
  if (optimizeDetail.value.optimizeStatus !== 'SUCCESS') return '仅成功的优化记录可应用'
  if (!selectedOptimizeSuggestionIndexes.value.length) return '请至少选择一个字段建议'
  return ''
})

const getOptimizeSuggestionFieldName = (item: ResumeRewriteSuggestion, index: number) =>
  item.fieldName || item.fieldKey || item.projectName || item.section || `建议 ${index + 1}`

const getOptimizeSuggestionFieldKey = (item: ResumeRewriteSuggestion) =>
  item.fieldKey || item.section || item.fieldName || (item.projectName ? 'project' : undefined)

const toProjectDraft = (payload: ResumeProjectDTO, projectId: number): ResumeProjectVO => ({
  ...payload,
  id: projectId,
  projectId,
  projectTime: payload.projectTime || payload.projectPeriod || '',
  projectPeriod: payload.projectPeriod || payload.projectTime || '',
  projectBackground: payload.projectBackground || payload.description || '',
  description: payload.description || payload.projectBackground || '',
  responsibility: payload.responsibility || payload.role || '',
  role: payload.role || payload.responsibility || '',
  technicalChallenges: payload.technicalChallenges || payload.technicalDifficulties || '',
  technicalDifficulties: payload.technicalDifficulties || payload.technicalChallenges || '',
  optimizationResult: payload.optimizationResult || payload.optimizationResults || '',
  optimizationResults: payload.optimizationResults || payload.optimizationResult || '',
  sort: payload.sort ?? payload.sortOrder ?? 0,
  sortOrder: payload.sortOrder ?? payload.sort ?? 0
})

const persistDraftProjects = async (createdResumeId: number) => {
  const draftProjects = projects.value.filter((project) => project.projectId < 0)
  if (!draftProjects.length) return

  let failedCount = 0
  for (const project of draftProjects) {
    try {
      await createResumeProjectApi(createdResumeId, project)
    } catch {
      failedCount++
    }
  }

  if (failedCount) {
    ElMessage.warning(`简历已创建，${failedCount} 条项目草稿保存失败，请在编辑页补充。`)
  }
}

const selectAllOptimizeSuggestions = () => {
  selectedOptimizeSuggestionIndexes.value = optimizeSuggestions.value.map((_, index) => index)
}

const getSelectedOptimizeSuggestions = () =>
  selectedOptimizeSuggestionIndexes.value
    .filter((index) => index >= 0 && index < optimizeSuggestions.value.length)
    .map((index) => ({
      index,
      item: optimizeSuggestions.value[index]
    }))

const applyDetail = (detail: ResumeDetailVO) => {
  Object.assign(form, {
    resumeName: detail.resumeName,
    realName: detail.realName || '',
    email: detail.email || '',
    phone: detail.phone || '',
    targetPosition: detail.targetPosition || '',
    summary: detail.summary || '',
    skills: detail.skills || detail.skillStack || '',
    workSummary: detail.workSummary || detail.workExperience || '',
    education: detail.education || detail.educationExperience || '',
    isDefault: detail.isDefault
  })
  if (!optimizeForm.targetPosition) {
    optimizeForm.targetPosition = detail.targetPosition || ''
  }
  projects.value = detail.projects || []
}

const fetchDetail = async () => {
  if (!resumeId.value) return
  loading.value = true
  try {
    applyDetail(await getResumeDetailApi(resumeId.value))
    await fetchOptimizeRecords()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '简历详情加载失败，请返回我的简历重试。'))
  } finally {
    loading.value = false
  }
}

const optimizeStatusText = (status?: string) => {
  const map: Record<string, string> = {
    PROCESSING: '建议生成中',
    SUCCESS: '建议已生成',
    FAILED: '建议生成失败'
  }
  return status ? map[status] || '状态待确认' : '暂无记录'
}

const fetchOptimizeRecords = async () => {
  if (!resumeId.value) return
  try {
    optimizeRecords.value = await getResumeOptimizeRecordsApi(resumeId.value)
    if (!optimizeDetail.value && optimizeRecords.value[0]) {
      optimizeDetail.value = await getResumeOptimizeResultApi(optimizeRecords.value[0].optimizeRecordId)
      selectedOptimizeSuggestionIndexes.value = optimizeSuggestions.value.map((_, index) => index)
    }
  } catch {
    optimizeRecords.value = []
  }
}

const openOptimizeDetail = async (recordId: number) => {
  optimizeDetail.value = await getResumeOptimizeResultApi(recordId)
  selectedOptimizeSuggestionIndexes.value = optimizeSuggestions.value.map((_, index) => index)
}

const refreshOptimizeRecords = async () => {
  optimizeRecordsRefreshing.value = true
  try {
    await fetchOptimizeRecords()
    if (latestOptimizeRecord.value) {
      ElMessage.success('最近记录已刷新')
    } else {
      ElMessage.info('暂未发现新的建议记录')
    }
  } finally {
    optimizeRecordsRefreshing.value = false
  }
}

const buildOptimizePayload = (): ResumeOptimizeRequestDTO => ({
  targetJobId: routeTargetJobId.value,
  targetPosition: optimizeForm.targetPosition || form.targetPosition,
  experienceYears: optimizeForm.experienceYears,
  industryDirection: optimizeForm.industryDirection,
  selectedProjectIds: projects.value.map((project) => project.projectId).filter(Boolean)
})

const runSyncOptimizeFallback = async () => {
  if (!resumeId.value) return
  optimizeSseStatus.value = '普通生成'
  optimizeSseMessage.value = '生成进度暂时不可用，系统会继续生成建议，稍后可刷新最近记录查看。'
  const result = await optimizeResumeApi(resumeId.value, buildOptimizePayload())
  if (hasOptimizeAsyncReceipt(result)) {
    optimizeTask.value = result
    optimizeSseStatus.value = '已提交'
    optimizeSseMessage.value = '建议已开始生成，可稍后刷新最近记录查看结果。'
    optimizeSseEvents.value = [{
      type: 'task',
      stage: '生成进度',
      message: '建议已开始生成'
    }]
    ElMessage.success('建议已开始生成')
    await fetchOptimizeRecords()
    return
  }
  if (result.optimizeStatus === 'FAILED') {
    ElMessage.error(toFriendlyMessage(result.errorMessage, '生成建议失败，请稍后重试'))
  } else {
    ElMessage.success('建议已生成')
  }
  await fetchOptimizeRecords()
  if (result.optimizeRecordId) {
    await openOptimizeDetail(result.optimizeRecordId)
  }
}

const optimizeSseTypeLabel = (type?: string) => {
  const map: Record<string, string> = {
    start: '建议开始',
    delta: '建议生成中',
    metadata: '状态更新',
    progress: '生成进度',
    result: '建议结果',
    done: '建议完成',
    error: '生成失败'
  }
  return type ? map[type] || '状态更新' : '状态更新'
}

const handleOptimizeResume = async () => {
  if (!resumeId.value || optimizing.value) return
  optimizing.value = true
  optimizeSseEvents.value = []
  optimizeSseMessage.value = '正在启动建议生成进度。'
  optimizeSseStatus.value = '启动中'
  optimizeTask.value = null

  try {
    await runSyncOptimizeFallback()
  } catch (error) {
    optimizeSseStatus.value = '提交失败'
    optimizeSseMessage.value = getErrorMessage(error, '建议任务提交失败，可以刷新最近记录，或稍后重新生成。')
    ElMessage.error(optimizeSseMessage.value)
  } finally {
    optimizing.value = false
  }
}

const showApplyResultMessage = async (message?: string, warnings?: string[], newResumeId?: number) => {
  const warningText = warnings?.length ? `\n\n注意事项：\n${warnings.map((item) => `- ${item}`).join('\n')}` : ''
  const draftText = newResumeId ? '\n\n建议草稿已创建，稍后会自动打开编辑页。' : ''
  await ElMessageBox.alert(
    `${message || '已创建建议草稿，可继续编辑后再用于投递或匹配。'}${warningText}${draftText}`,
    '应用建议',
    { type: warnings?.length ? 'warning' : 'success' }
  )
}

const handleApplyOptimizeResult = async () => {
  if (!optimizeDetail.value || !canApplyOptimizeResult.value) {
    ElMessage.warning(applyOptimizeDisabledReason.value || '仅成功的优化记录可应用')
    return
  }
  const selectedSuggestions = getSelectedOptimizeSuggestions()
  const selectedFields = selectedSuggestions
    .map(({ item }) => getOptimizeSuggestionFieldKey(item))
    .filter((field): field is string => Boolean(field))
  const confirmed = await confirmDangerActionPreview({
    title: '应用建议',
    action: '应用选中的 AI 建议并创建建议草稿',
    target: `${form.resumeName || '当前简历'}，${selectedSuggestions.length} 个字段建议`,
    impact: '会创建一份新的建议草稿，不会覆盖当前正在编辑的简历；草稿内容仍需要你人工检查后再用于投递或匹配。',
    rollback: '当前简历不会被修改；如果草稿不合适，可以继续编辑原简历或删除草稿。',
    audit: '优化记录、选中字段和建议草稿记录会保留。',
    tips: ['确认建议没有夸大经历或编造项目结果。', '确认需要先创建草稿再继续人工编辑。'],
    confirmButtonText: '创建草稿'
  })
  if (!confirmed) return
  applyingOptimize.value = true
  try {
    const result = await applyResumeOptimizeResultApi(optimizeDetail.value.optimizeRecordId, {
      applyMode: 'CREATE_DRAFT',
      selectedSuggestionIndexes: selectedSuggestions.map(({ index }) => index),
      selectedFields
    })
    await showApplyResultMessage(result.message, result.warnings, result.newResumeId)
    if (result.newResumeId) {
      await router.push(`/resumes/${result.newResumeId}/edit`)
    } else {
      await fetchDetail()
    }
  } finally {
    applyingOptimize.value = false
  }
}

const handleSave = async () => {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  saving.value = true
  try {
    if (resumeId.value) {
      await updateResumeApi(resumeId.value, form)
      if (form.isDefault === 1) {
        await setDefaultResumeApi(resumeId.value)
      }
      ElMessage.success('简历已保存')
      await fetchDetail()
    } else {
      const created = await createResumeApi(form)
      await persistDraftProjects(created.id)
      if (form.isDefault === 1) {
        await setDefaultResumeApi(created.id)
      }
      ElMessage.success('简历已创建')
      await router.replace(`/resumes/${created.id}/edit`)
    }
  } finally {
    saving.value = false
  }
}

const openProjectDialog = (project?: ResumeProjectVO) => {
  editingProjectId.value = project?.projectId || null
  editingProject.value = project || null
  projectDialogVisible.value = true
}

const openProjectEvidenceCreate = (project: ResumeProjectVO) => {
  if (!resumeId.value || !project.projectId) return
  router.push({
    path: '/project-evidence/create',
    query: {
      sourceResumeId: String(resumeId.value),
      sourceResumeProjectId: String(project.projectId)
    }
  })
}

const handleSaveProject = async () => {
  if (!projectFormRef.value) return
  const payload = (await projectFormRef.value.validate().catch(() => false)) as ResumeProjectDTO | false
  if (!payload) return
  projectSaving.value = true
  try {
    const projectPayload = { ...payload }
    if (!resumeId.value) {
      const projectId = editingProjectId.value || -Date.now()
      const draftProject = toProjectDraft(projectPayload, projectId)
      if (editingProjectId.value) {
        projects.value = projects.value.map((project) => project.projectId === editingProjectId.value ? draftProject : project)
      } else {
        projects.value = [...projects.value, draftProject]
      }
      ElMessage.success('项目草稿已加入，保存简历后会一起创建')
      projectDialogVisible.value = false
      editingProjectId.value = null
      editingProject.value = null
      return
    }
    if (editingProjectId.value) {
      await updateResumeProjectApi(resumeId.value, editingProjectId.value, projectPayload)
    } else {
      await createResumeProjectApi(resumeId.value, projectPayload)
    }
    ElMessage.success('项目经历已保存')
    projectDialogVisible.value = false
    editingProjectId.value = null
    editingProject.value = null
    await fetchDetail()
  } catch (err) {
    ElMessage.error(getErrorMessage(err, '项目经历保存失败，请检查必填项后重试'))
  } finally {
    projectSaving.value = false
  }
}

const handleDeleteProject = async (project: ResumeProjectVO) => {
  if (!resumeId.value) {
    projects.value = projects.value.filter((item) => item.projectId !== project.projectId)
    ElMessage.success('项目草稿已移除')
    return
  }
  const confirmed = await confirmDangerActionPreview({
    title: '删除项目经历',
    action: '删除该简历中的项目经历',
    target: project.projectName || '项目经历',
    impact: '该项目经历会从当前简历中移除，后续简历匹配、面试追问和推荐任务将不再把它作为证据。',
    rollback: '系统不会自动恢复已删除项目；如误删，需要重新录入项目经历。',
    audit: '删除操作会记录当前账号、简历和项目经历。',
    tips: ['确认这段项目经历不再用于证明目标岗位能力。', '确认删除后仍有足够项目证据支撑简历。'],
    confirmButtonText: '确认删除'
  })
  if (!confirmed) return
  await deleteResumeProjectApi(resumeId.value, project.projectId)
  ElMessage.success('项目经历已删除')
  await fetchDetail()
}

onMounted(fetchDetail)
</script>

<style scoped lang="scss">
.resume-editor {
  --resume-bg: #0f172a;
  --resume-surface: rgba(255, 255, 255, 0.94);
  --resume-surface-soft: #f8fafc;
  --resume-border: rgba(148, 163, 184, 0.24);
  --resume-border-strong: rgba(37, 99, 235, 0.32);
  --resume-text: #101828;
  --resume-muted: #667085;
  --resume-subtle: #98a2b3;
  --resume-primary: #2563eb;
  --resume-ai: #a78bfa;
  --resume-success: #16a34a;
  --resume-warning: #d97706;
  --resume-danger: #dc2626;
  gap: 20px;
  min-height: 100%;
  padding: 24px;
  color: var(--resume-text);
  background:
    radial-gradient(circle at 8% 0%, rgba(37, 99, 235, 0.18), transparent 28%),
    radial-gradient(circle at 96% 10%, rgba(20, 184, 166, 0.14), transparent 26%),
    linear-gradient(180deg, #f6f8fc 0%, #eef4ff 42%, #f7f9fc 100%);
}

.editor-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 24px;
  border: 1px solid rgba(37, 99, 235, 0.14);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(16, 24, 40, 0.96), rgba(30, 64, 175, 0.92)),
    #101828;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.14);

  h1 {
    margin: 12px 0 0;
    color: #ffffff;
    font-size: 30px;
    letter-spacing: 0;
  }

  p {
    max-width: 680px;
    margin: 10px 0 0;
    color: rgba(255, 255, 255, 0.76);
    line-height: 1.7;
  }
}

.hero-kicker,
.hero-actions,
.hero-status,
.workspace-tabs,
.section-heading,
.section-heading__left,
.section-icon,
.block-head,
.switch-line,
.form-actions,
.project-card,
.project-card__top,
.project-actions,
.completion-head,
.completion-list span,
.capability-item,
.preview-toolbar,
.paper-contact,
.paper-project__head,
.full-button {
  display: flex;
  align-items: center;
}

.hero-kicker {
  gap: 8px;
  color: #bfdbfe;
  font-size: 12px;
  font-weight: 700;
}

.hero-status {
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;

  span {
    padding: 6px 10px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
    color: #e0f2fe;
    font-size: 12px;
    font-weight: 700;
  }
}

.hero-actions {
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.workspace-tabs {
  display: none;
  gap: 6px;
  overflow-x: auto;
  padding: 6px;
  border: 1px solid var(--resume-border);
  border-radius: 8px;
  background: #ffffff;

  button {
    flex: 1 0 auto;
    min-width: 74px;
    padding: 8px 10px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--resume-muted);
    font-size: 13px;
    text-align: center;
    cursor: pointer;

    &.active {
      background: var(--resume-primary);
      color: #ffffff;
      font-weight: 700;
    }
  }
}

.live-feedback-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 14px 0;

  article {
    min-width: 0;
    padding: 14px;
    border: 1px solid var(--resume-border);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.82);

    &.is-good {
      border-color: rgba(22, 163, 74, 0.18);
      background: linear-gradient(180deg, #f0fdf4, #ffffff);
    }

    &.is-warning {
      border-color: rgba(245, 158, 11, 0.24);
      background: linear-gradient(180deg, #fffbeb, #ffffff);
    }

    &.is-waiting {
      border-color: rgba(37, 99, 235, 0.16);
      background: linear-gradient(180deg, #eff6ff, #ffffff);
    }
  }

  span,
  strong,
  p {
    display: block;
    overflow-wrap: anywhere;
  }

  span {
    color: var(--resume-primary);
    font-size: 12px;
    font-weight: 700;
  }

  strong {
    margin-top: 6px;
    color: var(--resume-text);
    line-height: 1.45;
  }

  p {
    margin: 6px 0 0;
    color: var(--resume-muted);
    font-size: 13px;
    line-height: 1.55;
  }
}

.editor-workspace {
  display: grid;
  grid-template-columns: minmax(340px, 430px) minmax(480px, 1fr) minmax(300px, 350px);
  gap: 16px;
  align-items: start;
  margin-top: 16px;
}

.editor-column,
.editor-aside {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}

.editor-aside {
  position: sticky;
  top: 84px;
}

.editor-section {
  padding: 22px;
}

.content-card,
.preview-column,
.side-panel {
  border: 1px solid var(--resume-border);
  border-radius: 8px;
  background: var(--resume-surface);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.07);
}

.panel-kicker {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  color: var(--resume-primary);
  font-size: 12px;
  font-weight: 800;
}

.ai-writing-card {
  border-color: rgba(124, 58, 237, 0.2);
  background:
    linear-gradient(180deg, rgba(124, 58, 237, 0.1), rgba(255, 255, 255, 0) 56%),
    #ffffff;
}

.prompt-list,
.section-nav,
.diagnostic-list,
.evidence-list,
.gap-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.prompt-card,
.section-nav button {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--resume-border);
  border-radius: 8px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
}

.prompt-card {
  display: grid;
  gap: 5px;
  padding: 12px;

  span {
    color: #7c3aed;
    font-size: 12px;
    font-weight: 800;
  }

  strong {
    color: var(--resume-text);
    line-height: 1.45;
  }

  small {
    color: var(--resume-muted);
    line-height: 1.55;
  }
}

.section-nav {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.section-nav button,
.diagnostic-list span {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  padding: 10px;
  color: var(--resume-muted);
  font-size: 12px;
  font-weight: 700;

  &.done {
    color: var(--resume-success);
    background: #f0fdf4;
  }
}

.section-heading {
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;

  h2 {
    margin: 0;
    color: var(--resume-text);
    font-size: 19px;
  }

  p {
    margin: 7px 0 0;
    color: var(--resume-muted);
    font-size: 13px;
    line-height: 1.6;
  }
}

.section-heading.compact {
  margin-bottom: 16px;
}

.section-heading__left {
  align-items: flex-start;
  gap: 12px;
}

.section-icon {
  flex: 0 0 auto;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(37, 99, 235, 0.18);
  border-radius: 12px;
  background: #eff6ff;
  color: var(--resume-primary);
}

.resume-form {
  :deep(.el-form-item) {
    margin-bottom: 18px;
  }
}

.editor-block {
  padding: 16px;
  border: 1px solid var(--resume-border);
  border-radius: 8px;
  background: var(--resume-surface-soft);
  scroll-margin-top: 92px;

  & + .editor-block {
    margin-top: 14px;
  }
}

.block-head {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;

  span {
    color: #344054;
    font-size: 14px;
    font-weight: 800;
  }
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.section-divider {
  height: 1px;
  margin: 8px 0 22px;
  background: rgba(148, 163, 184, 0.14);
}

.switch-line {
  min-height: 32px;
  gap: 10px;
  color: var(--resume-muted);
  font-size: 13px;
}

.form-actions {
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
}

.project-header {
  justify-content: space-between;
}

.project-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.project-empty {
  padding: 42px 20px;
  border: 1px dashed var(--resume-border-strong);
  border-radius: 8px;
  color: var(--resume-muted);
  text-align: center;
  background:
    linear-gradient(180deg, rgba(37, 99, 235, 0.06), rgba(255, 255, 255, 0.92)),
    #ffffff;

  h3 {
    margin: 14px 0 0;
    color: var(--resume-text);
    font-size: 18px;
  }

  p {
    margin: 8px 0 0;
  }
}

.project-card {
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--resume-border);
  border-radius: 8px;
  background: #ffffff;
}

.project-card__main {
  min-width: 0;
  overflow-wrap: anywhere;
}

.project-card__top {
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  h3 {
    margin: 0;
    color: var(--resume-text);
    font-size: 16px;
  }

  span {
    flex: 0 0 auto;
    color: var(--resume-muted);
    font-size: 12px;
  }
}

.project-meta,
.project-desc {
  margin: 8px 0 0;
  color: var(--resume-muted);
  font-size: 13px;
  line-height: 1.6;
}

.project-desc {
  color: #344054;
}

.project-actions {
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 8px;
}

.preview-column {
  min-width: 0;
  padding: 16px;
  position: sticky;
  top: 84px;
  background:
    radial-gradient(circle at 50% 0%, rgba(96, 165, 250, 0.18), transparent 34%),
    linear-gradient(180deg, #111827 0%, #0f172a 100%);
  border-color: rgba(148, 163, 184, 0.22);
}

.preview-toolbar {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;

  h2 {
    margin: 0;
    color: #ffffff;
    font-size: 18px;
  }

  p {
    margin: 6px 0 0;
    color: rgba(226, 232, 240, 0.72);
    font-size: 12px;
  }
}

.resume-paper-wrap {
  position: relative;
  display: flex;
  justify-content: center;
  min-height: 760px;
  padding: 28px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background:
    linear-gradient(90deg, rgba(148, 163, 184, 0.09) 1px, transparent 1px),
    linear-gradient(rgba(148, 163, 184, 0.09) 1px, transparent 1px),
    #0b1120;
  background-size: 28px 28px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.resume-paper {
  width: min(100%, 680px);
  min-height: 880px;
  aspect-ratio: 210 / 297;
  padding: 46px 52px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.38),
    0 0 34px rgba(56, 189, 248, 0.2),
    0 28px 70px rgba(0, 0, 0, 0.46);
  color: #111827;
  overflow: hidden;
}

.resume-paper,
.resume-paper :deep(*) {
  color: #111827 !important;
}

.paper-header {
  padding-bottom: 18px;
  border-bottom: 2px solid #111827;

  h2 {
    margin: 0;
    color: #111827;
    font-size: 30px;
    letter-spacing: 0;
  }

  p {
    margin: 8px 0 0;
    color: #1f2937;
    font-size: 14px;
    font-weight: 700;
  }
}

.paper-contact {
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-top: 12px;
  color: #4b5563;
  font-size: 12px;
}

.paper-section {
  margin-top: 20px;

  h3 {
    margin: 0 0 10px;
    padding-bottom: 5px;
    border-bottom: 1px solid #111827;
    color: #111827;
    font-size: 15px;
  }

  p,
  li {
    color: #374151;
    font-size: 12px;
    line-height: 1.72;
    white-space: pre-wrap;
  }

  ul {
    margin: 8px 0 0;
    padding-left: 18px;
  }
}

.paper-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  span {
    padding: 4px 8px;
    border-radius: 6px;
    background: #ecfdf3;
    color: #027a48;
    font-size: 12px;
    font-weight: 700;
  }
}

.paper-project {
  & + .paper-project {
    margin-top: 16px;
  }
}

.paper-project__head {
  justify-content: space-between;
  gap: 12px;

  strong {
    color: #111827;
    font-size: 13px;
  }

  span {
    flex: 0 0 auto;
    color: #667085;
    font-size: 12px;
  }
}

.paper-muted {
  color: #667085 !important;
}

.paper-empty {
  display: grid;
  justify-items: center;
  gap: 8px;
  margin-top: 42px;
  padding: 28px;
  border: 1px dashed #cfd6e4;
  border-radius: 8px;
  background: #f8fafc;
  color: #667085;
  font-size: 13px;
  line-height: 1.7;
  text-align: center;

  strong {
    color: #101828;
    font-size: 16px;
  }

  span {
    max-width: 320px;
  }
}

.side-panel {
  padding: 18px;

  h3 {
    margin: 0 0 10px;
    color: var(--resume-text);
    font-size: 16px;
  }

  p {
    margin: 10px 0 0;
    color: var(--resume-muted);
    font-size: 13px;
    line-height: 1.7;
  }

  ul {
    margin: 10px 0 0;
    padding-left: 18px;
    color: var(--resume-muted);
    font-size: 13px;
    line-height: 1.8;
  }
}

.completion-head {
  justify-content: space-between;
  margin-bottom: 12px;

  span {
    color: var(--resume-muted);
    font-size: 13px;
  }

  strong {
    color: var(--resume-primary);
    font-size: 24px;
  }
}

.completion-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  margin-top: 16px;

  span {
    gap: 6px;
    color: var(--resume-muted);
    font-size: 12px;
  }

  .done {
    color: var(--resume-success);
  }
}

.diagnostic-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.diagnostic-list span {
  border: 1px solid var(--resume-border);
  border-radius: 8px;
  background: #f8fafc;
}

.jd-match-panel {
  border-color: rgba(37, 99, 235, 0.2);
}

.evidence-panel {
  border-color: rgba(20, 184, 166, 0.22);
}

.evidence-list div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--resume-border);

  &:last-child {
    border-bottom: 0;
  }

  span {
    color: var(--resume-muted);
    font-size: 12px;
  }

  strong {
    color: var(--resume-text);
    font-size: 13px;
    text-align: right;
  }

  &.done strong {
    color: var(--resume-success);
  }
}

.gap-panel {
  border-color: rgba(217, 119, 6, 0.22);
  background:
    linear-gradient(180deg, rgba(245, 158, 11, 0.08), rgba(255, 255, 255, 0) 56%),
    #ffffff;
}

.gap-list article {
  padding: 12px;
  border: 1px solid rgba(245, 158, 11, 0.18);
  border-radius: 8px;
  background: #fffbeb;

  strong {
    display: block;
    color: #92400e;
    font-size: 13px;
    line-height: 1.45;
  }

  p {
    margin: 6px 0 0;
    color: #78350f;
    font-size: 12px;
    line-height: 1.6;
  }
}

.capability-item {
  justify-content: space-between;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--resume-border);
  color: #344054;
  font-size: 13px;

  &:last-of-type {
    border-bottom: 0;
  }
}

.full-button {
  justify-content: center;
  width: 100%;
  margin-top: 14px;
  gap: 8px;
}

.ai-panel {
  border-color: rgba(124, 58, 237, 0.2);
  background:
    linear-gradient(180deg, rgba(124, 58, 237, 0.08), rgba(255, 255, 255, 0)),
    #ffffff;
}

.ai-locked-panel {
  background:
    linear-gradient(180deg, rgba(124, 58, 237, 0.08), rgba(255, 255, 255, 0) 58%),
    #ffffff;
}

.optimize-form {
  margin-top: 14px;

  :deep(.el-form-item) {
    margin-bottom: 12px;
  }

  :deep(.el-input-number) {
    width: 100%;
  }
}

.optimize-records {
  margin-top: 16px;
  border-top: 1px solid var(--resume-border);
}

.ai-empty {
  margin-top: 14px;
  padding: 12px;
  border: 1px dashed var(--resume-border-strong);
  border-radius: 10px;
  color: var(--resume-muted);
  font-size: 12px;
  line-height: 1.6;
}

.sse-progress {
  margin-top: 14px;
  padding: 12px;
  border: 1px solid rgba(124, 58, 237, 0.2);
  border-radius: 12px;
  background: #f5f3ff;

  p {
    margin: 8px 0 0;
    color: #4b5563;
    font-size: 12px;
    line-height: 1.6;
  }
}

.sse-progress__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #5b21b6;
  font-size: 13px;
  font-weight: 700;
}

.sse-progress__hint {
  color: #6d28d9;
}

.sse-progress__action {
  margin-top: 8px;
  padding-left: 0;
}

.sse-progress__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;

  span {
    color: var(--resume-muted);
    font-size: 12px;
    line-height: 1.5;
  }
}

.record-row {
  display: block;
  width: 100%;
  padding: 10px 0;
  border: 0;
  border-bottom: 1px solid var(--resume-border);
  background: transparent;
  color: var(--resume-text);
  text-align: left;
  cursor: pointer;

  span,
  small {
    display: block;
  }

  span {
    color: #344054;
    font-size: 13px;
  }

  small {
    margin-top: 4px;
    color: var(--resume-muted);
  }
}

.optimize-result {
  margin-top: 14px;
  padding: 14px;
  border: 1px solid rgba(124, 58, 237, 0.18);
  border-radius: 14px;
  background: #ffffff;

  > p {
    margin: 10px 0 0;
    color: #344054;
  }
}

.score-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  span {
    color: var(--resume-muted);
    font-size: 13px;
  }

  strong {
    color: var(--resume-ai);
    font-size: 26px;
  }
}

.rewrite-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;

  article {
    padding: 10px;
    border: 1px solid var(--resume-border);
    border-radius: 10px;
    background: var(--resume-surface-soft);
  }

  span {
    color: #344054;
    font-size: 12px;
    font-weight: 700;
  }

  p {
    margin: 6px 0 0;
    color: var(--resume-muted);
    font-size: 12px;
    line-height: 1.6;
  }
}

.rewrite-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  color: var(--resume-muted);
  font-size: 12px;
}

.rewrite-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  :deep(.el-checkbox__label) {
    color: #344054;
    font-weight: 700;
  }
}

.rewrite-diff {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 10px;

  div {
    min-width: 0;
    padding: 10px;
    border: 1px solid var(--resume-border);
    border-radius: 8px;
    background: #ffffff;
  }
}

.rewrite-reason {
  color: #344054 !important;
}

@media (max-width: 1320px) {
  .editor-workspace {
    grid-template-columns: minmax(0, 1fr) minmax(360px, 0.95fr);
  }

  .editor-aside {
    position: static;
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1020px) {
  .editor-workspace {
    grid-template-columns: 1fr;
  }

  .preview-column {
    position: static;
  }

  .editor-aside {
    display: flex;
  }

  .live-feedback-strip {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .resume-editor {
    padding: 12px;
  }

  .workspace-tabs {
    display: flex;
    position: sticky;
    top: 0;
    z-index: 5;
  }

  .editor-workspace {
    display: block;
  }

  .mobile-pane-edit,
  .mobile-pane-preview,
  .mobile-pane-advice {
    display: none;
  }

  .is-mobile-edit .mobile-pane-edit,
  .is-mobile-advice .mobile-pane-advice {
    display: flex;
  }

  .is-mobile-preview .mobile-pane-preview {
    display: block;
  }

  .editor-hero,
  .project-header,
  .project-card,
  .project-card__top,
  .preview-toolbar,
  .paper-project__head {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero-actions {
    justify-content: flex-start;
  }

  .form-grid,
  .completion-list,
  .diagnostic-list,
  .section-nav,
  .rewrite-diff {
    grid-template-columns: 1fr;
  }

  .editor-section,
  .preview-column,
  .side-panel {
    padding: 16px;
  }

  .resume-paper-wrap {
    min-height: auto;
    padding: 10px;
  }

  .resume-paper {
    min-height: 620px;
    padding: 28px 22px;
  }

  .paper-header h2 {
    font-size: 24px;
  }

  .project-actions,
  .hero-actions {
    width: 100%;

    .el-button {
      flex: 1 1 140px;
      margin-left: 0;
    }
  }

  .resume-project-dialog {
    :deep(.el-dialog) {
      width: calc(100vw - 24px) !important;
      max-width: none;
    }
  }
}
</style>
