<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ detail?.interviewName || '面试详情' }}</h1>
        <p class="page-subtitle">查看面试配置、阶段列表和完整问答记录。</p>
      </div>
      <div class="header-actions">
        <el-button @click="router.push('/interviews/history')">返回历史</el-button>
        <el-button v-if="detail" type="primary" @click="router.push(`/interviews/${detail.interviewId}/report`)">
          查看报告
        </el-button>
      </div>
    </div>

    <section class="content-card" v-loading="loading">
      <div v-if="detail" class="content-card__body">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="面试模式">{{ detail.interviewMode }}</el-descriptions-item>
          <el-descriptions-item label="目标岗位">{{ detail.targetPosition || '-' }}</el-descriptions-item>
          <el-descriptions-item label="经验年限">{{ detail.experienceLevel || '-' }}</el-descriptions-item>
          <el-descriptions-item label="行业方向">{{ detail.industryDirection || '-' }}</el-descriptions-item>
          <el-descriptions-item label="难度">{{ detail.difficulty || '-' }}</el-descriptions-item>
          <el-descriptions-item label="面试官风格">{{ detail.interviewerStyle || '-' }}</el-descriptions-item>
          <el-descriptions-item label="面试状态"><StatusTag :status="detail.status" /></el-descriptions-item>
          <el-descriptions-item label="报告状态"><StatusTag :status="detail.reportStatus" /></el-descriptions-item>
        </el-descriptions>
      </div>
      <el-empty v-else-if="!loading" description="未找到面试详情" />
    </section>

    <section v-if="detail?.resumeSnapshot" class="content-card">
      <div class="content-card__body">
        <h2 class="section-title">简历快照</h2>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="简历名称">{{ detail.resumeSnapshot.resumeName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="求职方向">{{ detail.resumeSnapshot.targetPosition || '-' }}</el-descriptions-item>
          <el-descriptions-item label="技能栈">{{ detail.resumeSnapshot.skills || '-' }}</el-descriptions-item>
          <el-descriptions-item label="工作摘要">{{ detail.resumeSnapshot.workSummary || '-' }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </section>

    <section class="content-card">
      <div class="content-card__body">
        <h2 class="section-title">阶段列表</h2>
        <el-table :data="detail?.stages || []" row-key="stageId">
          <el-table-column prop="stageName" label="阶段" min-width="160" />
          <el-table-column prop="stageType" label="类型" min-width="140" />
          <el-table-column prop="expectedQuestionCount" label="预期题数" width="110" />
          <el-table-column prop="actualQuestionCount" label="实际题数" width="110" />
          <el-table-column prop="stageScore" label="得分" width="90" />
          <el-table-column label="状态" width="120">
            <template #default="{ row }"><StatusTag :status="row.status" /></template>
          </el-table-column>
        </el-table>
      </div>
    </section>

    <section class="content-card">
      <div class="content-card__body">
        <h2 class="section-title">问答记录</h2>
        <el-empty v-if="!detail?.messages?.length" description="暂无问答记录" />
        <div v-else class="message-list">
          <article v-for="message in detail.messages" :key="message.messageId" class="message-item">
            <div class="message-item__head">
              <div>
                <strong>{{ message.role }}</strong>
                <el-tag v-if="message.isFollowUp" size="small" type="warning" effect="plain">追问</el-tag>
              </div>
              <span>{{ message.score ?? '-' }} 分</span>
            </div>
            <MarkdownPreview :content="message.questionContent || message.content" />
            <el-divider v-if="message.userAnswer || message.aiComment" />
            <p v-if="message.userAnswer"><strong>回答：</strong>{{ message.userAnswer }}</p>
            <p v-if="message.aiComment"><strong>点评：</strong>{{ message.aiComment }}</p>
            <p v-if="message.followUpReason"><strong>追问原因：</strong>{{ message.followUpReason }}</p>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getInterviewDetailApi } from '@/api/interview'
import MarkdownPreview from '@/components/common/MarkdownPreview.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import type { InterviewDetailVO } from '@/types/interview'
import { getRouteNumberParam } from '@/utils/route'

const route = useRoute()
const router = useRouter()
const interviewId = getRouteNumberParam(route.params.id as string)
const loading = ref(false)
const detail = ref<InterviewDetailVO | null>(null)

const fetchDetail = async () => {
  if (!interviewId) return
  loading.value = true
  try {
    detail.value = await getInterviewDetailApi(interviewId)
  } finally {
    loading.value = false
  }
}

onMounted(fetchDetail)
</script>

<style scoped lang="scss">
.header-actions {
  display: flex;
  gap: 10px;
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
    margin: 8px 0 0;
    color: var(--app-text-muted);
    line-height: 1.7;
  }
}

.message-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;

  div {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}
</style>
