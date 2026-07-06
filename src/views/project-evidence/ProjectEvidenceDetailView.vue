<template>
  <div class="project-evidence-detail page-shell" v-loading="loading">
    <section v-if="detail" class="detail-hero">
      <div>
        <p class="hero-kicker">项目证据</p>
        <h1>{{ detail.title }}</h1>
        <p>{{ detail.role || '未填写角色' }} / {{ detail.techStack || '未填写技术栈' }}</p>
      </div>
      <div class="hero-actions">
        <el-button @click="router.push('/project-evidence')">
          <ArrowLeft :size="16" />
          返回列表
        </el-button>
        <el-button type="primary" @click="router.push(`/project-evidence/${detail.id}/edit`)">
          <Edit3 :size="16" />
          编辑证据
        </el-button>
      </div>
    </section>

    <div v-if="detail" class="detail-layout">
      <main class="detail-main">
        <section class="content-card fact-card">
          <div class="section-head">
            <h2>项目事实</h2>
            <el-tag effect="plain">{{ summarizeSourceState(detail) }}</el-tag>
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

        <SkillEvidenceEditor :project-id="detail.id" :items="detail.skillEvidences || []" @refresh="fetchDetail" />
        <ProjectStoryGenerationPanel :project-id="detail.id" :target-job-id="detail.targetJobId" />
        <ProjectJdCoveragePanel :project-id="detail.id" :default-target-job-id="detail.targetJobId" />
      </main>

      <aside class="detail-aside">
        <ProjectCompletenessPanel
          :score="detail.completenessScore"
          :status="detail.completenessStatus"
          :missing-fields="detail.missingFields"
        />
        <section class="content-card action-card">
          <h3>项目证据</h3>
          <p>保持项目事实、能力证据、生成讲述和 JD 覆盖一致，让这个项目可用于简历和面试。</p>
          <el-button class="full-button" type="primary" plain @click="router.push(`/project-evidence/${detail.id}/edit`)">
            补充项目事实
          </el-button>
        </section>
      </aside>
    </div>

    <AppState v-else-if="!loading" type="empty" title="项目证据不存在" description="该证据可能已被删除，或当前账号无权访问。">
      <div class="state-actions">
        <el-button type="primary" @click="router.push('/project-evidence')">返回项目证据库</el-button>
      </div>
    </AppState>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Edit3 } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getProjectEvidenceDetailApi } from '@/api/projectEvidence'
import AppState from '@/components/common/AppState.vue'
import ProjectCompletenessPanel from '@/components/project-evidence/ProjectCompletenessPanel.vue'
import ProjectJdCoveragePanel from '@/components/project-evidence/ProjectJdCoveragePanel.vue'
import ProjectStoryGenerationPanel from '@/components/project-evidence/ProjectStoryGenerationPanel.vue'
import SkillEvidenceEditor from '@/components/project-evidence/SkillEvidenceEditor.vue'
import { summarizeSourceState } from '@/features/project-evidence'
import type { ProjectEvidenceDetailVO } from '@/types/projectEvidence'
import { getRouteNumberParam } from '@/utils/route'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const detail = ref<ProjectEvidenceDetailVO | null>(null)

const fetchDetail = async () => {
  const id = getRouteNumberParam(route.params.id as string)
  if (!id) return
  loading.value = true
  try {
    detail.value = await getProjectEvidenceDetailApi(id)
  } finally {
    loading.value = false
  }
}

onMounted(fetchDetail)
</script>

<style scoped lang="scss">
.project-evidence-detail {
  gap: 18px;
}

.detail-hero,
.hero-actions,
.section-head,
.full-button {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-hero {
  justify-content: space-between;
  padding: 26px;
  border: 1px solid var(--app-border);
  border-radius: var(--cc-radius-xl);
  background: rgba(15, 23, 42, 0.72);

  h1 {
    margin: 6px 0 0;
    font-size: 30px;
  }

  p:last-child {
    margin: 8px 0 0;
    color: var(--app-text-muted);
  }
}

.hero-kicker {
  margin: 0;
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.hero-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  align-items: start;
}

.detail-main,
.detail-aside {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.detail-aside {
  position: sticky;
  top: 84px;
}

.fact-card,
.action-card {
  padding: 18px;
}

.section-head {
  justify-content: space-between;
  margin-bottom: 14px;

  h2 {
    margin: 0;
    font-size: 20px;
  }
}

.fact-grid {
  display: grid;
  gap: 12px;
  margin: 0;

  div {
    padding: 13px;
    border: 1px solid rgba(148, 163, 184, 0.12);
    border-radius: 8px;
    background: rgba(2, 6, 23, 0.24);
  }

  dt {
    color: var(--app-text-muted);
    font-size: 12px;
  }

  dd {
    margin: 7px 0 0;
    color: #dbeafe;
    line-height: 1.7;
    white-space: pre-wrap;
  }
}

.action-card {
  h3 {
    margin: 0;
  }

  p {
    margin: 10px 0 0;
    color: var(--app-text-muted);
    line-height: 1.7;
  }
}

.full-button {
  justify-content: center;
  width: 100%;
  margin-top: 14px;
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
  }
}

@media (max-width: 760px) {
  .detail-hero {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
