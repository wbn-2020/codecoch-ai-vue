<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">面试报告</h1>
        <p class="page-subtitle">展示总分、阶段得分、知识薄弱点、复习建议和完整问答明细。</p>
      </div>
      <div class="header-actions">
        <el-button @click="router.push('/interviews/history')">返回历史</el-button>
        <el-button v-if="interviewId" @click="router.push(`/interviews/${interviewId}`)">面试详情</el-button>
      </div>
    </div>

    <section class="content-card" v-loading="loading">
      <div v-if="report" class="content-card__body">
        <div class="report-hero">
          <div>
            <div class="score">{{ report.totalScore ?? 0 }}</div>
            <p>综合得分</p>
          </div>
          <StatusTag :status="report.reportStatus" />
        </div>

        <el-alert
          v-if="report.reportStatus === 'FAILED'"
          class="report-alert"
          type="error"
          show-icon
          :closable="false"
          :title="report.failedReason || '报告生成失败，可点击重试。'"
        />

        <div v-if="report.reportStatus === 'FAILED'" class="retry-row">
          <el-button type="primary" :loading="retrying" @click="handleRetry">重试生成报告</el-button>
        </div>

        <ReportChart :stages="report.stageReports" />

        <div class="report-grid">
          <section class="report-section">
            <h2>AI 总结</h2>
            <MarkdownPreview :content="report.summary || '暂无总结'" />
          </section>
          <section class="report-section">
            <h2>回答亮点</h2>
            <MarkdownPreview :content="report.strengths || '暂无亮点'" />
          </section>
          <section class="report-section">
            <h2>主要问题</h2>
            <MarkdownPreview :content="report.weaknesses || '暂无问题'" />
          </section>
          <section class="report-section">
            <h2>复习建议</h2>
            <MarkdownPreview :content="report.suggestions || '暂无建议'" />
          </section>
          <section class="report-section">
            <h2>薄弱知识点</h2>
            <MarkdownPreview :content="report.weakKnowledgePoints || '暂无薄弱知识点'" />
          </section>
          <section class="report-section">
            <h2>项目表达问题</h2>
            <MarkdownPreview :content="report.projectExpressionProblems || '暂无项目表达问题'" />
          </section>
        </div>
      </div>
      <el-empty v-else-if="!loading" description="报告暂不可用，可能仍在生成中" />
    </section>

    <section v-if="report?.stageReports?.length" class="content-card">
      <div class="content-card__body">
        <h2 class="section-title">阶段得分</h2>
        <el-table :data="report.stageReports" row-key="stageId">
          <el-table-column prop="stageName" label="阶段" min-width="160" />
          <el-table-column prop="stageType" label="类型" min-width="140" />
          <el-table-column prop="score" label="得分" width="90" />
          <el-table-column prop="summary" label="总结" min-width="220" show-overflow-tooltip />
          <el-table-column prop="weaknesses" label="短板" min-width="220" show-overflow-tooltip />
          <el-table-column prop="suggestions" label="建议" min-width="220" show-overflow-tooltip />
        </el-table>
      </div>
    </section>

    <section v-if="report?.messages?.length" class="content-card">
      <div class="content-card__body">
        <h2 class="section-title">完整问答明细</h2>
        <div class="message-list">
          <article v-for="message in report.messages" :key="message.messageId" class="message-item">
            <div class="message-item__head">
              <strong>{{ message.role }}</strong>
              <span>{{ message.score ?? '-' }} 分</span>
            </div>
            <MarkdownPreview :content="message.questionContent || message.content" />
            <p v-if="message.userAnswer"><strong>回答：</strong>{{ message.userAnswer }}</p>
            <p v-if="message.aiComment"><strong>点评：</strong>{{ message.aiComment }}</p>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getInterviewReportApi, retryInterviewReportApi } from '@/api/interview'
import MarkdownPreview from '@/components/common/MarkdownPreview.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import ReportChart from '@/components/report/ReportChart.vue'
import type { InterviewReportVO } from '@/types/interview'
import { getRouteNumberParam } from '@/utils/route'

const route = useRoute()
const router = useRouter()
const interviewId = getRouteNumberParam(route.params.id as string)
const loading = ref(false)
const retrying = ref(false)
const report = ref<InterviewReportVO | null>(null)

const fetchReport = async () => {
  if (!interviewId) return
  loading.value = true
  try {
    report.value = await getInterviewReportApi(interviewId)
  } finally {
    loading.value = false
  }
}

const handleRetry = async () => {
  if (!interviewId) return
  retrying.value = true
  try {
    await retryInterviewReportApi(interviewId)
    ElMessage.success('已提交报告重试任务')
    await fetchReport()
  } finally {
    retrying.value = false
  }
}

onMounted(fetchReport)
</script>

<style scoped lang="scss">
.header-actions {
  display: flex;
  gap: 10px;
}

.report-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.score {
  color: var(--app-primary);
  font-size: 44px;
  font-weight: 800;
  line-height: 1;
}

.report-alert,
.retry-row {
  margin-bottom: 16px;
}

.report-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.report-section {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface-soft);

  h2 {
    margin: 0 0 10px;
    font-size: 17px;
  }
}

.section-title {
  margin: 0 0 16px;
  font-size: 18px;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.message-item {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface-soft);

  p {
    color: var(--app-text-muted);
    line-height: 1.7;
  }
}

.message-item__head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

@media (max-width: 860px) {
  .report-grid {
    grid-template-columns: 1fr;
  }
}
</style>
