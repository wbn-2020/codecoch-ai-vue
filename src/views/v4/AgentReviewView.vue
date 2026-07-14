<template>
  <div class="page-shell agent-review-page">
    <section class="review-header">
      <div>
        <div class="review-eyebrow">Agent daily review</div>
        <h1>多日闭环复盘</h1>
        <p>先展示任务事实，再说明限制、偏移、调整和下一步。样本不足或降级来源只作为弱调整信号。</p>
      </div>
      <div class="review-actions">
        <el-date-picker v-model="date" type="date" value-format="YYYY-MM-DD" :clearable="false" />
        <el-button type="primary" :loading="generating" @click="generate">生成复盘</el-button>
        <el-button :loading="loading" @click="load">刷新</el-button>
      </div>
    </section>

    <section class="review-metrics">
      <article>
        <span>最近复盘</span>
        <strong>{{ reviews.length }}</strong>
      </article>
      <article>
        <span>最新任务完成</span>
        <strong>{{ latest?.doneCount ?? 0 }}</strong>
      </article>
      <article>
        <span>跳过反馈</span>
        <strong>{{ latest?.skippedCount ?? 0 }}</strong>
      </article>
      <article>
        <span>下一步</span>
        <strong>{{ latestNextActionCount }}</strong>
      </article>
    </section>

    <section class="content-card">
      <div class="content-card__body" v-loading="loading">
        <AppState v-if="errorMessage && !loading" type="error" title="每日复盘加载失败" :description="errorMessage">
          <div class="empty-actions">
            <el-button type="primary" :loading="loading" @click="load">重新加载</el-button>
            <el-button @click="goTodayPlan">去今日任务</el-button>
          </div>
        </AppState>

        <AppState
          v-else-if="!reviewCards.length && !loading"
          type="empty"
          title="还没有每日复盘"
          description="完成或跳过今日任务后再生成复盘；没有复盘时，今日计划和任务中心仍可作为降级入口。"
        >
          <div class="empty-actions">
            <el-button type="primary" :loading="generating" @click="generate">生成今日复盘</el-button>
            <el-button @click="goTodayPlan">去今日任务</el-button>
            <el-button @click="router.push('/agent/tasks')">查看任务中心</el-button>
          </div>
        </AppState>

        <div v-else class="review-list">
          <article v-for="card in reviewCards" :key="card.review.id" class="review-row">
            <div class="review-row__head">
              <div>
                <span>{{ card.review.reviewDate || card.review.createdAt || '未标记日期' }}</span>
                <h2>{{ card.review.summary || '每日复盘' }}</h2>
              </div>
              <div class="review-tags">
                <el-tag effect="plain">{{ card.review.completionRate ?? 0 }}%</el-tag>
                <el-tag v-if="card.review.fallback" type="warning" effect="plain">降级复盘</el-tag>
                <el-tag v-if="card.review.confidenceLevel" type="info" effect="plain">{{ card.review.confidenceLevel }}</el-tag>
              </div>
            </div>

            <div class="review-sections">
              <section v-for="section in card.sections" :key="section.key">
                <h3>{{ section.title }}</h3>
                <ul>
                  <li v-for="item in section.items" :key="item">{{ item }}</li>
                </ul>
              </section>
            </div>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { generateAgentReviewApi, getAgentReviewsApi, type AgentReviewVO } from '@/api/v4'
import AppState from '@/components/common/AppState.vue'
import { buildReviewSections } from '@/features/agent-loop/agentLoopAdapter'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage } from '@/utils/error'
import { formatLocalDate } from '@/utils/format'

const today = formatLocalDate()
const router = useRouter()
const date = ref(today)
const loading = ref(false)
const generating = ref(false)
const reviews = ref<AgentReviewVO[]>([])
const errorMessage = ref('')

const latest = computed(() => reviews.value[0])
const latestNextActionCount = computed(() => latest.value?.nextActions?.length || 0)

const reviewCards = computed(() =>
  reviews.value.map((review) => {
    const sections = buildReviewSections(review)
    return {
      review,
      sections: [
        { key: 'facts', title: '事实', items: sections.facts },
        { key: 'limits', title: '限制', items: sections.limits },
        { key: 'drifts', title: '偏移', items: sections.drifts },
        { key: 'adjustments', title: '调整', items: sections.adjustments },
        { key: 'next', title: '下一步', items: sections.nextActions }
      ]
    }
  })
)

const load = async () => {
  loading.value = true
  try {
    reviews.value = await getAgentReviewsApi()
    errorMessage.value = ''
  } catch (error) {
    reviews.value = []
    errorMessage.value = getErrorMessage(error, '每日复盘暂时加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

const generate = async () => {
  if (loading.value || generating.value) return
  const confirmed = await confirmDangerActionPreview({
    title: '生成每日复盘预览',
    action: '生成或刷新指定日期的每日复盘',
    target: `复盘日期：${date.value || today}`,
    impact: '系统会读取当天任务完成、跳过和剩余情况，并写入一条可追踪复盘；低样本只会形成弱调整信号。',
    rollback: '如果复盘不准确，可以补充或修正当天任务后重新生成；已采纳的行动建议不会自动撤回。',
    audit: '复盘记录保留日期、任务计数、完成率和下一步动作，便于后续追踪。',
    tips: ['建议先确认当天任务状态已经同步。', '如果只是查看历史复盘，请使用刷新按钮。'],
    confirmButtonText: '确认生成复盘'
  })
  if (!confirmed) return
  generating.value = true
  try {
    await generateAgentReviewApi({ date: date.value })
    ElMessage.success('复盘已生成')
    await load()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '每日复盘生成失败，请稍后重试。'))
  } finally {
    generating.value = false
  }
}

const goTodayPlan = () => router.push('/agent/today')

onMounted(load)
</script>

<style scoped lang="scss">
.agent-review-page {
  display: grid;
  gap: 16px;
}

.review-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.58);
}

.review-header h1 {
  margin: 8px 0 0;
  font-size: 26px;
  letter-spacing: 0;
}

.review-header p {
  max-width: 720px;
  margin: 10px 0 0;
  color: var(--app-text-muted);
  line-height: 1.7;
}

.review-eyebrow {
  color: #2563eb;
  font-size: 13px;
  font-weight: 800;
}

.review-actions,
.empty-actions,
.review-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.review-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.42);
}

.review-metrics article {
  padding: 12px 14px;
  border-right: 1px solid var(--app-border);
  background: transparent;

  &:last-child {
    border-right: 0;
  }
}

.review-metrics span {
  color: var(--app-text-muted);
  font-size: 13px;
}

.review-metrics strong {
  display: block;
  margin-top: 8px;
  color: var(--app-text);
  font-size: 24px;
}

.review-list {
  display: grid;
  gap: 14px;
}

.review-row {
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.42);
}

.review-row__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.review-row__head span {
  color: var(--app-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.review-row__head h2 {
  margin: 6px 0 0;
  color: var(--app-text);
  font-size: 18px;
  line-height: 1.45;
}

.review-sections {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.review-sections section {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.28);
}

.review-sections h3 {
  margin: 0 0 8px;
  color: var(--app-text);
  font-size: 13px;
}

.review-sections ul {
  display: grid;
  gap: 6px;
  margin: 0;
  padding-left: 16px;
}

.review-sections li {
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

@media (max-width: 1100px) {
  .review-sections {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .review-header,
  .review-row__head {
    align-items: flex-start;
    flex-direction: column;
  }

  .review-metrics,
  .review-sections {
    grid-template-columns: 1fr;
  }

  .review-metrics article {
    border-right: 0;
    border-bottom: 1px solid var(--app-border);
  }

  .review-metrics article:last-child {
    border-bottom: 0;
  }
}
</style>
