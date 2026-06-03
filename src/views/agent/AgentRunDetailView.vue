<template>
  <div class="page-shell agent-run-page">
    <section class="page-header">
      <div>
        <h1 class="page-title">Agent 运行详情</h1>
        <p class="page-subtitle">查看本次计划生成的状态、摘要、关注能力和任务产物。</p>
      </div>
      <el-button @click="router.back()">返回</el-button>
    </section>

    <AppState v-if="errorMessage" type="error" title="运行详情加载失败" :description="errorMessage">
      <el-button type="primary" @click="fetchDetail">重试</el-button>
    </AppState>

    <template v-else>
      <section v-loading="loading" class="content-card">
        <div class="content-card__body">
          <AppState v-if="!loading && !detail" type="empty" title="未找到运行记录" description="该运行不存在，或当前账号没有访问权限。" />
          <template v-else-if="detail">
            <div class="run-head">
              <div>
                <div class="run-id">Run #{{ detail.id }}</div>
                <h2>{{ detail.targetJobTitle || '今日训练计划' }}</h2>
              </div>
              <StatusTag :status="detail.status" :map="runStatusMap" />
            </div>

            <div class="run-metrics">
              <article><span>触发方式</span><strong>{{ triggerMap[detail.triggerType || ''] || detail.triggerType || '--' }}</strong></article>
              <article><span>耗时</span><strong>{{ detail.durationMs ?? '--' }} ms</strong></article>
              <article><span>计划日期</span><strong>{{ detail.planDate || '--' }}</strong></article>
              <article><span>目标岗位 ID</span><strong>{{ detail.targetJobId ?? '--' }}</strong></article>
            </div>

            <el-descriptions :column="2" border class="run-desc">
              <el-descriptions-item label="Agent 类型">{{ detail.agentType || '--' }}</el-descriptions-item>
              <el-descriptions-item label="运行日期">{{ detail.planDate || '--' }}</el-descriptions-item>
              <el-descriptions-item label="开始时间">{{ detail.startedAt || '--' }}</el-descriptions-item>
              <el-descriptions-item label="结束时间">{{ detail.finishedAt || '--' }}</el-descriptions-item>
              <el-descriptions-item label="错误码">{{ detail.errorCode || '--' }}</el-descriptions-item>
              <el-descriptions-item label="错误信息">{{ detail.errorMessage || '--' }}</el-descriptions-item>
            </el-descriptions>
          </template>
        </div>
      </section>

      <section v-if="detail" class="content-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">Summary</p>
              <h2>本次计划摘要</h2>
            </div>
          </div>
          <p class="summary-text">{{ detail.summary || summaryFallback }}</p>
          <div v-if="detail.focusSkills?.length" class="skill-tags">
            <el-tag v-for="skill in detail.focusSkills" :key="skill.code || skill.name" effect="plain">
              {{ skill.name || skill.code }}
            </el-tag>
          </div>
        </div>
      </section>

      <section v-if="detail" class="content-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">Tasks</p>
              <h2>生成任务</h2>
            </div>
          </div>
          <div class="table-card embedded-table">
            <el-table :data="detail.tasks || []" row-key="id">
              <el-table-column prop="title" label="任务" min-width="240" show-overflow-tooltip />
              <el-table-column prop="taskType" label="类型" width="150" />
              <el-table-column prop="priority" label="优先级" width="100" />
              <el-table-column label="耗时" width="90">
                <template #default="{ row }">{{ row.estimatedMinutes ?? '--' }}m</template>
              </el-table-column>
              <el-table-column label="状态" width="110">
                <template #default="{ row }"><StatusTag :status="row.status" :map="taskStatusMap" /></template>
              </el-table-column>
              <el-table-column prop="dueDate" label="日期" width="120" />
              <template #empty>
                <AppState type="empty" title="本次运行没有任务产物" description="后端未返回 tasks，或本次运行未生成任务。" />
              </template>
            </el-table>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getAgentRunDetailApi } from '@/api/agent'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import type { AgentRunDetailVO } from '@/types/agent'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const errorMessage = ref('')
const detail = ref<AgentRunDetailVO>()

const runStatusMap = {
  PENDING: '等待中',
  RUNNING: '运行中',
  SUCCESS: '成功',
  FAILED: '失败',
  CANCELED: '取消'
}

const taskStatusMap = {
  TODO: '待完成',
  DOING: '进行中',
  DONE: '已完成',
  SKIPPED: '已跳过',
  EXPIRED: '已过期'
}

const triggerMap: Record<string, string> = {
  MANUAL: '手动触发',
  AUTO: '自动触发'
}

const summaryFallback = '本次运行暂未返回摘要。你仍可以查看下方生成任务，按优先级完成后系统会更新后续计划。'

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || '接口请求失败')
  }
  return '接口请求失败'
}

const fetchDetail = async () => {
  const id = Number(route.params.id)
  if (!Number.isFinite(id) || id <= 0) {
    errorMessage.value = '运行 ID 不合法'
    return
  }

  loading.value = true
  errorMessage.value = ''
  try {
    detail.value = await getAgentRunDetailApi(id)
  } catch (error) {
    detail.value = undefined
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

onMounted(fetchDetail)
</script>

<style scoped lang="scss">
.run-head,
.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.run-id,
.section-kicker {
  color: var(--app-text-muted);
  font-size: 13px;
}

.run-head h2,
.section-head h2 {
  margin: 6px 0 0;
}

.run-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 20px 0;
}

.run-metrics article {
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.56);
}

.run-metrics span {
  color: var(--app-text-muted);
  font-size: 12px;
}

.run-metrics strong {
  display: block;
  overflow: hidden;
  margin-top: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-text {
  margin: 14px 0 0;
  color: var(--app-text);
  line-height: 1.7;
}

.skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.embedded-table {
  margin-top: 16px;
  border-right: 0;
  border-left: 0;
  border-radius: 0;
  box-shadow: none;
}

@media (max-width: 900px) {
  .run-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
