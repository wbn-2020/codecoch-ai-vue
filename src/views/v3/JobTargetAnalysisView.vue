<template>
  <div class="job-analysis-page page-shell">
    <section class="analysis-hero">
      <div>
        <div class="hero-kicker">
          <ScanSearch :size="16" />
          JD Analysis
        </div>
        <h1>{{ target?.jobTitle || 'JD 解析 / 分析结果' }}</h1>
        <p>{{ targetSubtitle }}</p>
      </div>
      <div class="hero-actions">
        <el-button @click="router.push('/job-targets')">
          <ArrowLeft :size="16" />
          返回列表
        </el-button>
        <el-button v-if="targetId" @click="router.push(`/job-targets/${targetId}/edit`)">
          <Pencil :size="16" />
          编辑岗位
        </el-button>
        <el-button v-if="targetId" type="primary" @click="goResumeMatch">
          <Files :size="16" />
          进入简历匹配
        </el-button>
      </div>
    </section>

    <section class="analysis-layout">
      <aside class="content-card side-panel">
        <div class="content-card__body">
          <h2>岗位上下文</h2>
          <div class="info-list">
            <div>
              <span>公司</span>
              <strong>{{ target?.companyName || '--' }}</strong>
            </div>
            <div>
              <span>级别 / 经验</span>
              <strong>{{ target?.jobLevel || '--' }}</strong>
            </div>
            <div>
              <span>JD 来源</span>
              <strong>{{ target?.jdSource || '--' }}</strong>
            </div>
            <div>
              <span>当前主目标</span>
              <strong>{{ target?.currentFlag === 1 ? '是' : '否' }}</strong>
            </div>
            <div>
              <span>解析状态</span>
              <JobTargetStatusTag :status="target?.parseStatus || analysis?.parseStatus" />
            </div>
            <div>
              <span>更新时间</span>
              <strong>{{ formatDateTime(target?.updatedAt || analysis?.updatedAt) }}</strong>
            </div>
          </div>

          <div class="parse-actions">
            <el-button
              type="primary"
              :loading="parsing"
              :disabled="loading || !target || target.parseStatus === 'PARSING'"
              @click="handleParse"
            >
              <Sparkles :size="16" />
              {{ analysis ? '重新解析 JD' : '触发 JD 解析' }}
            </el-button>
            <el-button :loading="loading" @click="loadAll">
              <RefreshCw :size="16" />
              刷新结果
            </el-button>
          </div>

          <el-alert
            v-if="target?.parseErrorMessage || analysis?.parseErrorMessage"
            class="side-alert"
            type="error"
            :closable="false"
            show-icon
            title="后端解析失败"
            :description="target?.parseErrorMessage || analysis?.parseErrorMessage"
          />
        </div>
      </aside>

      <main class="content-card main-panel">
        <div v-if="loading" class="state-wrap">
          <AppState type="loading" title="正在读取 JD 分析结果" description="通过 GET /job-targets/{id} 与 GET /job-targets/{id}/analysis 查询真实数据。" />
        </div>

        <div v-else-if="loadError" class="state-wrap">
          <AppState type="error" title="JD 分析加载失败" :description="loadError">
            <el-button type="primary" @click="loadAll">重新加载</el-button>
          </AppState>
        </div>

        <div v-else-if="!target" class="state-wrap">
          <AppState type="error" title="岗位目标不存在" description="当前路由没有可用岗位目标，请返回列表重新选择。" />
        </div>

        <div v-else class="content-card__body analysis-workspace">
          <section class="jd-preview">
            <div class="section-head">
              <div>
                <h2>JD 原文</h2>
                <p>展示保存到后端的真实 JD 原文，解析请求会基于这段内容发起。</p>
              </div>
              <JobTargetStatusTag :status="target.parseStatus" />
            </div>
            <pre v-if="target.jdText">{{ target.jdText }}</pre>
            <AppState
              v-else
              type="empty"
              title="JD 原文为空"
              description="请先编辑岗位目标补充 JD 原文，再触发后端解析。"
            >
              <el-button type="primary" @click="router.push(`/job-targets/${target.id}/edit`)">编辑岗位目标</el-button>
            </AppState>
          </section>

          <section>
            <div class="section-head">
              <div>
                <h2>结构化解析结果</h2>
                <p>职责、技能、关键词、经验要求均来自 `GET /job-targets/{id}/analysis`。</p>
              </div>
              <el-button
                :loading="parsing"
                :disabled="!target.jdText || target.parseStatus === 'PARSING'"
                @click="handleParse"
              >
                <Sparkles :size="16" />
                {{ analysis ? '重新解析' : '解析 JD' }}
              </el-button>
            </div>

            <AppState
              v-if="!analysis"
              type="empty"
              title="暂无 JD 解析结果"
              description="后端还没有返回解析结果，可以在当前页面触发真实 REST 解析接口。"
            >
              <el-button type="primary" :loading="parsing" :disabled="!target.jdText" @click="handleParse">触发解析</el-button>
            </AppState>

            <JobTargetAnalysisPanel v-else :analysis="analysis" />
          </section>
        </div>
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Files, Pencil, RefreshCw, ScanSearch, Sparkles } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  getJobDescriptionAnalysisApi,
  getJobTargetDetailApi,
  parseJobDescriptionApi
} from '@/api/jobTarget'
import AppState from '@/components/common/AppState.vue'
import type { JobDescriptionAnalysisVO, TargetJobVO } from '@/types/jobTarget'
import { formatDateTime } from '@/utils/format'

import JobTargetAnalysisPanel from './components/JobTargetAnalysisPanel.vue'
import JobTargetStatusTag from './components/JobTargetStatusTag.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const parsing = ref(false)
const loadError = ref('')
const target = ref<TargetJobVO | null>(null)
const analysis = ref<JobDescriptionAnalysisVO | null>(null)

const targetId = computed(() => {
  const raw = route.params.id
  const id = Number(Array.isArray(raw) ? raw[0] : raw)
  return Number.isFinite(id) && id > 0 ? id : null
})

const targetSubtitle = computed(() => {
  if (!target.value) return '读取岗位详情后展示 JD 原文、解析状态和结构化分析结果。'
  return `${target.value.companyName || '--'} · ${target.value.jobLevel || '--'}`
})

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return fallback
}

const loadAll = async () => {
  if (!targetId.value) {
    loadError.value = '路由参数 id 无效。'
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    const [detail, result] = await Promise.all([
      getJobTargetDetailApi(targetId.value),
      getJobDescriptionAnalysisApi(targetId.value)
    ])
    target.value = detail
    analysis.value = result || null
  } catch (error) {
    target.value = null
    analysis.value = null
    loadError.value = getErrorMessage(error, 'JD 分析接口请求失败，请确认后端服务和登录态。')
  } finally {
    loading.value = false
  }
}

const handleParse = async () => {
  if (!target.value) return
  if (!target.value.jdText) {
    ElMessage.warning('请先编辑岗位目标补充 JD 原文。')
    return
  }
  const forceRefresh = Boolean(analysis.value || target.value.parseStatus === 'PARSED')
  if (forceRefresh) {
    try {
      await ElMessageBox.confirm('确认重新解析当前 JD？后端会请求 AI 解析并刷新最新结果。', '重新解析 JD', {
        type: 'warning',
        confirmButtonText: '重新解析',
        cancelButtonText: '取消'
      })
    } catch {
      return
    }
  }
  parsing.value = true
  try {
    analysis.value = await parseJobDescriptionApi(target.value.id, { forceRefresh })
    ElMessage.success(analysis.value.parseStatus === 'FAILED' ? 'JD 解析已返回失败状态' : 'JD 解析已完成')
    await loadAll()
  } finally {
    parsing.value = false
  }
}

const goResumeMatch = () => {
  if (!targetId.value) return
  router.push({
    path: '/resume-match',
    query: {
      targetJobId: String(targetId.value)
    }
  })
}

watch(
  () => route.params.id,
  () => {
    loadAll()
  }
)

onMounted(loadAll)
</script>

<style scoped lang="scss">
.job-analysis-page {
  gap: 20px;
}

.analysis-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  padding: 26px;
  border: 1px solid rgba(129, 140, 248, 0.28);
  border-radius: var(--cc-radius-xl);
  background:
    linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(6, 182, 212, 0.07)),
    rgba(15, 23, 42, 0.78);
  box-shadow: var(--app-shadow);
}

.hero-kicker,
.hero-actions,
.parse-actions,
.section-head {
  display: flex;
  align-items: center;
}

.hero-kicker {
  gap: 8px;
  color: var(--cc-ai-cyan);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.analysis-hero h1 {
  margin: 14px 0 0;
  font-size: 32px;
}

.analysis-hero p {
  margin: 10px 0 0;
  color: var(--app-text-muted);
  line-height: 1.7;
}

.hero-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.analysis-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 18px;
}

.side-panel,
.main-panel {
  min-width: 0;
}

.side-panel {
  align-self: start;

  h2 {
    margin: 0 0 14px;
    font-size: 19px;
  }
}

.info-list {
  display: grid;
  gap: 10px;

  div {
    padding: 12px;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 10px;
    background: rgba(2, 6, 23, 0.3);
  }

  span,
  strong {
    display: block;
  }

  span {
    color: var(--app-text-muted);
    font-size: 12px;
  }

  strong {
    margin-top: 6px;
    overflow-wrap: anywhere;
    color: #dbeafe;
    font-size: 13px;
  }
}

.parse-actions {
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.side-alert {
  margin-top: 16px;
}

.state-wrap {
  padding: 20px;
}

.analysis-workspace {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.section-head {
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;

  h2 {
    margin: 0;
    font-size: 20px;
  }

  p {
    margin: 8px 0 0;
    color: var(--app-text-muted);
    font-size: 13px;
    line-height: 1.6;
  }
}

.jd-preview pre {
  max-height: 320px;
  margin: 0;
  padding: 16px;
  overflow: auto;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 12px;
  background: rgba(2, 6, 23, 0.42);
  color: #cbd5e1;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
}

@media (max-width: 980px) {
  .analysis-hero,
  .analysis-layout {
    grid-template-columns: 1fr;
  }

  .analysis-hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero-actions,
  .section-head {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
