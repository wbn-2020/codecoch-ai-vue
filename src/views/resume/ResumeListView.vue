<template>
  <div class="resume-center page-shell">
    <section class="resume-hero">
      <div class="hero-copy">
        <div class="hero-kicker">
          <FileText :size="16" />
          Resume Intelligence Hub
        </div>
        <h1>简历中心</h1>
        <p>管理求职简历、沉淀项目经历、驱动 AI 面试追问与优化建议。</p>
        <div class="hero-actions">
          <el-button type="primary" size="large" @click="router.push('/resumes/create')">
            <Plus :size="17" />
            新增简历
          </el-button>
          <el-tooltip content="当前前端未提供真实上传 API，入口仅做 V2 能力标注" placement="top">
            <el-button size="large" disabled>
              <UploadCloud :size="17" />
              上传简历
              <span class="button-badge">待接入</span>
            </el-button>
          </el-tooltip>
          <el-button size="large" text @click="router.push('/dashboard')">
            <ArrowLeft :size="17" />
            返回工作台
          </el-button>
        </div>
      </div>

      <div class="hero-panel">
        <div class="panel-line">
          <span>V1 数据源</span>
          <strong>真实简历 CRUD</strong>
        </div>
        <div class="panel-line">
          <span>V2 上传解析</span>
          <strong class="is-muted">待接入</strong>
        </div>
        <div class="panel-line">
          <span>AI 优化</span>
          <strong class="is-muted">待接入</strong>
        </div>
      </div>
    </section>

    <section class="metric-grid resume-metrics">
      <article class="metric-card">
        <div class="metric-card__label">简历总数</div>
        <div class="metric-card__value">{{ total }}</div>
        <p>来自 `/resumes` 真实列表接口</p>
      </article>
      <article class="metric-card">
        <div class="metric-card__label">最近更新时间</div>
        <div class="metric-card__value is-date">{{ latestUpdatedAt }}</div>
        <p>基于当前页真实记录计算</p>
      </article>
      <article class="metric-card">
        <div class="metric-card__label">已解析数量</div>
        <div class="metric-card__value is-muted">--</div>
        <p>当前前端无解析状态字段</p>
      </article>
      <article class="metric-card">
        <div class="metric-card__label">AI 优化状态</div>
        <div class="metric-card__value is-muted">待接入</div>
        <p>当前前端无优化记录接口</p>
      </article>
    </section>

    <section class="content-card resume-workspace">
      <div class="content-card__body workspace-toolbar">
        <div>
          <h2>求职资料库</h2>
          <p>以卡片方式维护简历、项目经历和面试上下文，保留现有真实接口。</p>
        </div>
        <el-form class="search-form" :model="query" inline>
          <el-form-item label="关键词">
            <el-input
              v-model.trim="query.keyword"
              clearable
              placeholder="简历名称 / 求职方向"
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <Search :size="15" />
              </template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-alert
        v-if="loadError"
        class="resume-alert"
        type="error"
        :closable="false"
        show-icon
        title="简历列表加载失败"
        :description="loadError"
      />

      <div class="resume-list" v-loading="loading">
        <div v-if="!loading && !loadError && resumes.length === 0" class="empty-state">
          <div class="empty-icon">
            <FilePlus2 :size="32" />
          </div>
          <h3>还没有可用于面试训练的简历</h3>
          <p>先创建一份结构化简历，后续创建面试时可以作为真实上下文使用。</p>
          <div class="empty-actions">
            <el-button type="primary" @click="router.push('/resumes/create')">新增简历</el-button>
            <el-tooltip content="当前无真实上传 API，不能伪造解析结果" placement="top">
              <el-button disabled>上传简历 · 待接入</el-button>
            </el-tooltip>
          </div>
        </div>

        <div v-else-if="!loadError" class="resume-card-grid">
          <article v-for="item in resumes" :key="item.id" class="resume-card">
            <div class="resume-card__header">
              <div class="resume-title-block">
                <div class="resume-icon">
                  <BriefcaseBusiness :size="20" />
                </div>
                <div>
                  <h3>{{ item.resumeName || item.title || '未命名简历' }}</h3>
                  <p>{{ item.targetPosition || '未填写求职方向' }}</p>
                </div>
              </div>
              <div class="resume-tags">
                <el-tag v-if="item.isDefault === 1" type="success" effect="plain">默认</el-tag>
                <StatusTag :status="item.status" />
              </div>
            </div>

            <div class="resume-card__meta">
              <span>
                <Clock3 :size="14" />
                {{ formatDateTime(item.updatedAt || item.createdAt) }}
              </span>
              <span>
                <Layers3 :size="14" />
                项目经历 {{ item.projectCount || 0 }} 个
              </span>
              <span>
                <TimerReset :size="14" />
                工作年限 --
              </span>
            </div>

            <p class="resume-summary">{{ item.summary || item.workExperience || '暂无简历摘要，请在编辑页补充个人优势、项目背景和求职目标。' }}</p>

            <div class="skill-stack">
              <template v-if="splitSkills(item.skills || item.skillStack).length">
                <span v-for="skill in splitSkills(item.skills || item.skillStack).slice(0, 8)" :key="skill">
                  {{ skill }}
                </span>
              </template>
              <span v-else class="is-placeholder">暂未填写技术栈</span>
            </div>

            <div class="resume-card__status">
              <div>
                <span>解析状态</span>
                <strong>待接入</strong>
              </div>
              <div>
                <span>AI 优化</span>
                <strong>待接入</strong>
              </div>
            </div>

            <div class="resume-card__actions">
              <el-button type="primary" plain @click="router.push(`/resumes/${item.id}/edit`)">
                <Eye :size="15" />
                查看 / 编辑
              </el-button>
              <el-button @click="router.push('/interviews/create')">
                <MessagesSquare :size="15" />
                创建面试
              </el-button>
              <el-tooltip content="当前前端未提供真实 AI 优化 API" placement="top">
                <el-button disabled>
                  <Sparkles :size="15" />
                  AI 优化
                </el-button>
              </el-tooltip>
              <el-tooltip content="当前前端未提供真实上传 API" placement="top">
                <el-button disabled>
                  <UploadCloud :size="15" />
                  上传新版
                </el-button>
              </el-tooltip>
              <el-dropdown trigger="click">
                <el-button text>
                  <MoreHorizontal :size="16" />
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item :disabled="item.isDefault === 1" @click="handleSetDefault(item)">
                      设为默认
                    </el-dropdown-item>
                    <el-dropdown-item divided @click="handleDelete(item)">
                      删除简历
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </article>
        </div>
      </div>

      <div v-if="!loadError && total > 0" class="pagination-wrap">
        <el-pagination
          v-model:current-page="query.pageNo"
          v-model:page-size="query.pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :page-sizes="[10, 20, 50]"
          @change="fetchResumes"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  BriefcaseBusiness,
  Clock3,
  Eye,
  FilePlus2,
  FileText,
  Layers3,
  MessagesSquare,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  TimerReset,
  UploadCloud
} from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { deleteResumeApi, getResumesApi, setDefaultResumeApi } from '@/api/resume'
import StatusTag from '@/components/common/StatusTag.vue'
import type { ResumeQueryDTO, ResumeVO } from '@/types/resume'
import { formatDateTime } from '@/utils/format'

const router = useRouter()
const loading = ref(false)
const loadError = ref('')
const resumes = ref<ResumeVO[]>([])
const total = ref(0)

const query = reactive<ResumeQueryDTO>({
  keyword: '',
  pageNo: 1,
  pageSize: 10
})

const latestUpdatedAt = computed(() => {
  const sortedDates = resumes.value
    .map((item) => item.updatedAt || item.createdAt)
    .filter(Boolean)
    .sort()
  const latest = sortedDates[sortedDates.length - 1]
  return latest ? formatDateTime(latest) : '--'
})

const splitSkills = (value?: string) => {
  if (!value) return []
  return value
    .split(/[,\n;；、，]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

const fetchResumes = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const result = await getResumesApi(query)
    resumes.value = result.records || []
    total.value = result.total || 0
  } catch (error) {
    resumes.value = []
    total.value = 0
    loadError.value = error instanceof Error ? error.message : '请稍后重试，或确认后端简历服务是否可用。'
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  query.pageNo = 1
  fetchResumes()
}

const handleReset = () => {
  Object.assign(query, {
    keyword: '',
    pageNo: 1,
    pageSize: 10
  })
  fetchResumes()
}

const handleSetDefault = async (row: ResumeVO) => {
  await setDefaultResumeApi(row.id)
  ElMessage.success('默认简历已更新')
  await fetchResumes()
}

const handleDelete = async (row: ResumeVO) => {
  await ElMessageBox.confirm(`确认删除简历「${row.resumeName}」？历史面试会继续使用已保存快照。`, '删除确认', {
    type: 'warning'
  })
  await deleteResumeApi(row.id)
  ElMessage.success('简历已删除')
  await fetchResumes()
}

onMounted(fetchResumes)
</script>

<style scoped lang="scss">
.resume-center {
  gap: 20px;
}

.resume-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  padding: 28px;
  border: 1px solid rgba(129, 140, 248, 0.28);
  border-radius: var(--cc-radius-xl);
  background:
    linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(6, 182, 212, 0.08)),
    rgba(15, 23, 42, 0.78);
  box-shadow: var(--app-shadow);
  backdrop-filter: blur(18px);
}

.hero-kicker,
.hero-actions,
.panel-line,
.resume-card__meta span,
.resume-card__actions,
.empty-actions {
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

.hero-copy {
  h1 {
    margin: 14px 0 0;
    font-size: 34px;
    line-height: 1.2;
  }

  p {
    max-width: 680px;
    margin: 12px 0 0;
    color: var(--app-text-muted);
    line-height: 1.8;
  }
}

.hero-actions {
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 22px;
}

.button-badge {
  margin-left: 6px;
  color: var(--cc-warning);
  font-size: 12px;
}

.hero-panel {
  align-self: stretch;
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: rgba(2, 6, 23, 0.42);
}

.panel-line {
  justify-content: space-between;
  gap: 12px;
  padding: 13px 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);

  &:last-child {
    border-bottom: 0;
  }

  span {
    color: var(--app-text-muted);
    font-size: 13px;
  }

  strong {
    font-size: 14px;
  }
}

.is-muted {
  color: var(--app-text-muted);
}

.resume-metrics {
  .metric-card {
    p {
      margin: 10px 0 0;
      color: var(--app-text-muted);
      font-size: 12px;
    }
  }

  .metric-card__value.is-date {
    font-size: 16px;
    line-height: 1.5;
  }
}

.resume-workspace {
  overflow: hidden;
}

.workspace-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;

  h2 {
    margin: 0;
    font-size: 20px;
  }

  p {
    margin: 8px 0 0;
    color: var(--app-text-muted);
    font-size: 13px;
  }
}

.search-form {
  display: flex;
  justify-content: flex-end;
}

.resume-alert {
  margin: 0 20px 16px;
}

.resume-list {
  min-height: 280px;
  padding: 0 20px 20px;
  border-top: 1px solid var(--app-border);
}

.resume-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  padding-top: 20px;
}

.resume-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: var(--app-radius);
  background: rgba(15, 23, 42, 0.66);
  transition:
    border-color 0.2s ease,
    transform 0.2s ease,
    background 0.2s ease;

  &:hover {
    border-color: rgba(129, 140, 248, 0.42);
    background: rgba(15, 23, 42, 0.86);
    transform: translateY(-2px);
  }
}

.resume-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.resume-title-block {
  display: flex;
  min-width: 0;
  gap: 12px;

  h3 {
    margin: 0;
    overflow: hidden;
    color: #f8fafc;
    font-size: 18px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  p {
    margin: 6px 0 0;
    color: var(--app-text-muted);
    font-size: 13px;
  }
}

.resume-icon,
.empty-icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(129, 140, 248, 0.28);
  background: rgba(99, 102, 241, 0.16);
  color: #c4b5fd;
}

.resume-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
}

.resume-tags {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.resume-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  span {
    gap: 6px;
    color: var(--app-text-muted);
    font-size: 12px;
  }
}

.resume-summary {
  display: -webkit-box;
  min-height: 44px;
  margin: 0;
  overflow: hidden;
  color: #cbd5e1;
  font-size: 13px;
  line-height: 1.7;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.skill-stack {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  span {
    padding: 5px 9px;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 999px;
    background: rgba(2, 6, 23, 0.28);
    color: #cbd5e1;
    font-size: 12px;
  }

  .is-placeholder {
    color: var(--app-text-muted);
  }
}

.resume-card__status {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  div {
    padding: 10px 12px;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 10px;
    background: rgba(2, 6, 23, 0.28);
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
    margin-top: 4px;
    color: var(--cc-warning);
    font-size: 13px;
  }
}

.resume-card__actions {
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 2px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  padding: 32px 20px;
  text-align: center;

  h3 {
    margin: 18px 0 0;
    font-size: 20px;
  }

  p {
    max-width: 520px;
    margin: 10px 0 0;
    color: var(--app-text-muted);
    line-height: 1.7;
  }
}

.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 18px;
}

.empty-actions {
  gap: 10px;
  margin-top: 20px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 0 20px 20px;
}

@media (max-width: 1080px) {
  .resume-hero,
  .resume-card-grid {
    grid-template-columns: 1fr;
  }

  .workspace-toolbar {
    flex-direction: column;
  }

  .search-form {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .resume-hero {
    padding: 22px;
  }

  .hero-copy h1 {
    font-size: 28px;
  }

  .resume-card__header {
    flex-direction: column;
  }

  .resume-tags {
    justify-content: flex-start;
  }

  .resume-card__status {
    grid-template-columns: 1fr;
  }
}
</style>
