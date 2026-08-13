<template>
  <div class="project-evidence-detail page-shell" v-loading="loading">
    <section v-if="detail" class="detail-hero">
      <div class="hero-copy">
        <p class="hero-kicker">项目证据</p>
        <h1>{{ detail.title }}</h1>
        <p>{{ detail.role || '未填写角色' }} / {{ detail.techStack || '未填写技术栈' }}</p>
      </div>
      <div class="hero-actions">
        <el-button @click="router.push('/project-evidence')">
          <ArrowLeft :size="16" />
          返回列表
        </el-button>
        <el-button
          v-if="appConfig.enableV9EvidenceLearning"
          data-testid="project-evidence-usages"
          @click="openEvidenceUsages"
        >
          <ClipboardCheck :size="16" />
          查看使用与结果
        </el-button>
      </div>
    </section>

    <div v-if="detail" class="detail-layout">
      <main class="detail-main">
        <section class="content-card fact-card">
          <div class="section-head">
            <div>
              <p class="section-kicker">事实底稿</p>
              <h2>项目事实</h2>
            </div>
            <div class="section-actions">
              <el-tag effect="plain">{{ summarizeSourceState(detail) }}</el-tag>
              <el-tooltip content="编辑项目事实" placement="top">
                <el-button circle @click="router.push(`/project-evidence/${detail.id}/edit`)">
                  <Edit3 :size="16" />
                </el-button>
              </el-tooltip>
            </div>
          </div>
          <dl class="fact-grid">
            <div>
              <dt>项目时间</dt>
              <dd>{{ [detail.startDate, detail.endDate].filter(Boolean).join(' - ') || '未填写' }}</dd>
            </div>
            <div>
              <dt>技术栈</dt>
              <dd>{{ detail.techStack || '未填写' }}</dd>
            </div>
            <div>
              <dt>业务背景</dt>
              <dd>{{ detail.background || '未填写' }}</dd>
            </div>
            <div>
              <dt>我的职责</dt>
              <dd>{{ detail.responsibility || '未填写' }}</dd>
            </div>
            <div>
              <dt>核心难点</dt>
              <dd>{{ detail.difficulty || '未填写' }}</dd>
            </div>
            <div>
              <dt>解决方案</dt>
              <dd>{{ detail.solution || '未填写' }}</dd>
            </div>
            <div>
              <dt>量化结果</dt>
              <dd>{{ detail.result || '未填写' }}</dd>
            </div>
            <div>
              <dt>复盘沉淀</dt>
              <dd>{{ detail.reflection || '未填写' }}</dd>
            </div>
          </dl>
        </section>
      </main>

      <aside class="detail-aside">
        <ProjectCompletenessPanel
          :score="detail.completenessScore"
          :status="detail.completenessStatus"
          :missing-fields="detail.missingFields"
        />

        <section class="content-card evidence-summary">
          <div class="section-head">
            <div>
              <p class="section-kicker">能力映射</p>
              <h2>能力证据摘要</h2>
            </div>
            <el-tag effect="plain">{{ skillEvidences.length }} 条</el-tag>
          </div>
          <div v-if="skillEvidences.length" class="skill-summary-list">
            <div v-for="item in summarySkillEvidences" :key="item.id" class="skill-summary-item">
              <strong>{{ item.skillName }}</strong>
              <span>{{ item.skillCategory || '未分类' }}</span>
            </div>
          </div>
          <p v-else class="summary-empty">尚未沉淀可核验的能力证据。</p>
          <p v-if="remainingSkillEvidenceCount" class="summary-more">
            另有 {{ remainingSkillEvidenceCount }} 条能力证据
          </p>
        </section>

        <section class="content-card next-step-card">
          <p class="section-kicker">推荐动作</p>
          <h2>{{ nextStep.title }}</h2>
          <p>{{ nextStep.description }}</p>
          <el-button class="full-button" type="primary" @click="handleNextStep">
            {{ nextStep.actionLabel }}
            <ArrowRight :size="16" />
          </el-button>
        </section>
      </aside>
    </div>

    <section
      v-if="detail && (activePreparationTab || openedPreparationTabs.length)"
      v-show="activePreparationTab"
      class="preparation-area"
    >
      <div class="preparation-head">
        <div>
          <p class="section-kicker">按需准备</p>
          <h2>面试与岗位匹配</h2>
        </div>
        <el-button text @click="activePreparationTab = null">收起</el-button>
      </div>
      <el-tabs v-model="activePreparationTab" class="preparation-tabs" stretch>
        <el-tab-pane label="能力证据" name="skills">
          <SkillEvidenceEditor
            v-if="openedPreparationTabs.includes('skills')"
            :project-id="detail.id"
            :items="skillEvidences"
            @refresh="fetchDetail"
          />
        </el-tab-pane>
        <el-tab-pane label="面试讲述" name="story">
          <ProjectStoryGenerationPanel
            v-if="openedPreparationTabs.includes('story')"
            :project-id="detail.id"
            :target-job-id="detail.targetJobId"
          />
        </el-tab-pane>
        <el-tab-pane label="JD 覆盖" name="coverage">
          <ProjectJdCoveragePanel
            v-if="openedPreparationTabs.includes('coverage')"
            :project-id="detail.id"
            :default-target-job-id="detail.targetJobId"
          />
        </el-tab-pane>
      </el-tabs>
    </section>

    <AppState v-else-if="!loading" type="empty" title="项目证据不存在" description="该证据可能已被删除，或当前账号无权访问。">
      <div class="state-actions">
        <el-button type="primary" @click="router.push('/project-evidence')">返回项目证据库</el-button>
      </div>
    </AppState>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, ArrowRight, ClipboardCheck, Edit3 } from 'lucide-vue-next'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getProjectEvidenceDetailApi } from '@/api/projectEvidence'
import AppState from '@/components/common/AppState.vue'
import ProjectCompletenessPanel from '@/components/project-evidence/ProjectCompletenessPanel.vue'
import ProjectJdCoveragePanel from '@/components/project-evidence/ProjectJdCoveragePanel.vue'
import ProjectStoryGenerationPanel from '@/components/project-evidence/ProjectStoryGenerationPanel.vue'
import SkillEvidenceEditor from '@/components/project-evidence/SkillEvidenceEditor.vue'
import { appConfig } from '@/config'
import { summarizeSourceState } from '@/features/project-evidence'
import type { ProjectEvidenceDetailVO } from '@/types/projectEvidence'
import { getRouteNumberParam } from '@/utils/route'

type PreparationTab = 'skills' | 'story' | 'coverage'

interface NextStep {
  title: string
  description: string
  actionLabel: string
  action: 'edit' | 'tab'
  tab?: PreparationTab
}

const route = useRoute()
const router = useRouter()
const projectId = computed(() => getRouteNumberParam(route.params.id as string))
const loading = ref(false)
const detail = ref<ProjectEvidenceDetailVO | null>(null)
const activePreparationTab = ref<PreparationTab | null>(null)
const openedPreparationTabs = ref<PreparationTab[]>([])
const skillEvidences = computed(() => detail.value?.skillEvidences || [])
const summarySkillEvidences = computed(() => skillEvidences.value.slice(0, 3))
const remainingSkillEvidenceCount = computed(() => Math.max(0, skillEvidences.value.length - summarySkillEvidences.value.length))
const nextStep = computed<NextStep>(() => {
  const current = detail.value
  if (!current) {
    return {
      title: '补齐项目事实',
      description: '先补充可验证的项目事实，再沉淀能力证据。',
      actionLabel: '编辑项目事实',
      action: 'edit'
    }
  }

  if ((current.missingFields?.length || 0) > 0 || (current.completenessScore ?? 0) < 100) {
    return {
      title: '补齐项目事实',
      description: '完整的背景、贡献和结果，是后续生成讲述与岗位匹配的依据。',
      actionLabel: '编辑项目事实',
      action: 'edit'
    }
  }

  if (skillEvidences.value.length === 0) {
    return {
      title: '补充能力证据',
      description: '把项目中的真实做法、强度和风险点沉淀为可追问的能力证据。',
      actionLabel: '管理能力证据',
      action: 'tab',
      tab: 'skills'
    }
  }

  return {
    title: '生成面试讲述',
    description: '基于已确认的项目事实和能力证据，生成可继续打磨的面试表达。',
    actionLabel: '进入面试讲述',
    action: 'tab',
    tab: 'story'
  }
})
let detailRequestGeneration = 0

const openPreparationTab = (tab: PreparationTab) => {
  if (!openedPreparationTabs.value.includes(tab)) {
    openedPreparationTabs.value.push(tab)
  }
  activePreparationTab.value = tab
}

const handleNextStep = () => {
  if (nextStep.value.action === 'edit') {
    void router.push(`/project-evidence/${detail.value?.id}/edit`)
    return
  }
  if (nextStep.value.tab) openPreparationTab(nextStep.value.tab)
}

const openEvidenceUsages = () => {
  if (!detail.value) return
  void router.push({
    path: '/evidence-assets',
    query: {
      tab: 'usages',
      assetType: 'PROJECT_EVIDENCE',
      assetId: String(detail.value.id)
    }
  })
}

const fetchDetail = async () => {
  const id = projectId.value
  const requestGeneration = ++detailRequestGeneration
  if (!id) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const nextDetail = await getProjectEvidenceDetailApi(id)
    if (requestGeneration === detailRequestGeneration) {
      detail.value = nextDetail
    }
  } catch {
    if (requestGeneration === detailRequestGeneration) {
      detail.value = null
    }
  } finally {
    if (requestGeneration === detailRequestGeneration) {
      loading.value = false
    }
  }
}

watch(
  activePreparationTab,
  (tab) => {
    if (tab && !openedPreparationTabs.value.includes(tab)) {
      openedPreparationTabs.value.push(tab)
    }
  }
)

watch(
  projectId,
  () => {
    detail.value = null
    activePreparationTab.value = null
    openedPreparationTabs.value = []
    void fetchDetail()
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  detailRequestGeneration += 1
})
</script>

<style scoped lang="scss">
.project-evidence-detail,
.detail-main,
.detail-aside,
.preparation-area {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.project-evidence-detail {
  color: var(--user-text);
}

.detail-hero,
.hero-actions,
.section-head,
.section-actions,
.full-button,
.preparation-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-hero {
  justify-content: space-between;
  padding: 22px 24px;
  border: 1.5px solid var(--user-primary-border);
  border-radius: var(--arena-radius-card);
  background: var(--user-surface-tint);
  box-shadow: var(--arena-shadow-card);
}

.hero-copy,
.detail-main,
.detail-aside,
.preparation-area {
  min-width: 0;
}

.detail-hero h1,
.detail-hero p,
.section-head h2,
.next-step-card h2,
.preparation-head h2 {
  margin: 0;
}

.detail-hero h1 {
  margin-top: 6px;
  color: var(--arena-ink);
  font-size: 26px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.detail-hero p:last-child,
.next-step-card > p:last-of-type {
  margin: 8px 0 0;
  color: var(--arena-sub);
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.hero-kicker,
.section-kicker {
  margin: 0 0 4px;
  color: var(--arena-grn-d);
  font-size: 12px;
  font-weight: 700;
}

.hero-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 320px);
  gap: 14px;
  align-items: start;
}

.detail-aside {
  position: sticky;
  top: 84px;
}

.detail-aside :deep(.completeness-panel .panel-kicker) {
  display: none;
}

.fact-card,
.evidence-summary,
.next-step-card {
  padding: 18px;
  border: 1.5px solid var(--arena-line);
  border-radius: var(--arena-radius-card);
  background: var(--arena-card);
  box-shadow: var(--arena-shadow-card);
}

.section-head,
.preparation-head {
  justify-content: space-between;
  margin-bottom: 14px;
}

.section-head h2,
.next-step-card h2,
.preparation-head h2 {
  font-size: 18px;
  line-height: 1.4;
}

.section-actions {
  flex: 0 0 auto;
}

.fact-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--arena-line);
  border-radius: 12px;
}

.fact-grid div {
  min-width: 0;
  padding: 12px;
  background: var(--user-surface-muted);
}

.fact-grid div:nth-child(even) {
  border-left: 1px solid var(--arena-line);
}

.fact-grid div:nth-child(n + 3) {
  border-top: 1px solid var(--arena-line);
}

.fact-grid dt {
  color: var(--user-text-secondary);
  font-size: 12px;
}

.fact-grid dd {
  margin: 7px 0 0;
  color: var(--user-text);
  line-height: 1.65;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.skill-summary-list {
  display: grid;
  gap: 8px;
}

.skill-summary-item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--user-border);
}

.skill-summary-item strong,
.skill-summary-item span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.skill-summary-item span,
.summary-empty,
.summary-more {
  color: var(--user-text-secondary);
  font-size: 13px;
  line-height: 1.55;
}

.summary-empty,
.summary-more {
  margin: 0;
}

.summary-more {
  margin-top: 10px;
}

.next-step-card {
  border-color: var(--user-primary-border);
  background: var(--user-surface-tint);
}

.next-step-card > .section-kicker {
  color: var(--arena-grn-d);
}

.full-button {
  justify-content: center;
  width: 100%;
  margin-top: 14px;
}

.preparation-area {
  padding: 18px;
  border: 1.5px solid var(--arena-line);
  border-radius: var(--arena-radius-card);
  background: var(--arena-card);
  box-shadow: var(--arena-shadow-card);
}

.preparation-head {
  margin-bottom: 0;
}

.preparation-tabs :deep(.el-tabs__nav-wrap) {
  overflow-x: auto;
}

.preparation-tabs :deep(.el-tabs__nav) {
  min-width: max-content;
}

.preparation-tabs :deep(.el-tabs__content) {
  min-width: 0;
}

.state-actions {
  margin-top: 12px;
}

@media (max-width: 1020px) {
  .detail-layout {
    grid-template-columns: 1fr;
  }

  .detail-aside {
    position: static;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .detail-hero,
  .hero-actions,
  .section-head,
  .preparation-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero-actions {
    width: 100%;
  }

  .section-actions {
    width: 100%;
    justify-content: space-between;
  }

  .detail-aside,
  .fact-grid {
    grid-template-columns: 1fr;
  }

  .fact-grid div:nth-child(even) {
    border-left: 0;
  }

  .fact-grid div + div {
    border-top: 1px solid var(--user-border);
  }

  .skill-summary-item {
    align-items: flex-start;
    flex-direction: column;
    gap: 3px;
  }
}
</style>
