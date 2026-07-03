<template>
  <div class="job-experiment-detail page-shell" v-loading="loading">
    <section class="page-hero" v-if="detail">
      <div>
        <p class="hero-kicker">求职实验</p>
        <h1>{{ detail.title }}</h1>
        <p>{{ detail.goal || detail.targetDirection || '暂无实验摘要' }}</p>
      </div>
      <div class="hero-actions">
        <el-tag v-if="detail.demoFlag" type="warning">演示数据</el-tag>
        <el-button @click="router.push('/job-experiments')">返回</el-button>
        <el-button @click="router.push(`/job-experiments/${detail.id}/edit`)">编辑</el-button>
        <el-button type="danger" plain :loading="deleting" @click="removeExperiment">删除</el-button>
        <el-button type="primary" @click="router.push(`/job-experiments/${detail.id}/review`)">复盘</el-button>
      </div>
    </section>

    <section class="metrics-grid" v-if="detail?.metrics">
      <article class="content-card metric"><strong>{{ detail.metrics.applicationCount }}</strong><span>投递数</span></article>
      <article class="content-card metric"><strong>{{ detail.metrics.interviewInviteCount }}</strong><span>邀约数</span></article>
      <article class="content-card metric"><strong>{{ detail.metrics.interviewCompletedCount }}</strong><span>完成面试</span></article>
      <article class="content-card metric"><strong>{{ confidenceLabel(detail.metrics.confidenceLevel) }}</strong><span>样本置信度</span></article>
    </section>

    <el-alert
      v-if="detail?.metrics?.sampleWarning"
      type="warning"
      :closable="false"
      :title="detail.metrics.sampleWarning"
    />

    <section class="content-card section" v-if="detail?.strategy">
      <div class="section-head">
        <h2>{{ detail.strategy.title }}</h2>
        <el-tag :type="detail.strategy.sampleInsufficient ? 'warning' : 'success'">{{ confidenceLabel(detail.strategy.confidenceLevel) }}</el-tag>
      </div>
      <p>{{ detail.strategy.content }}</p>
      <div class="evidence-list">
        <el-tag v-for="source in detail.strategy.evidenceSources" :key="`${source.sourceType}-${source.sourceId}`" effect="plain">
          {{ source.sourceType }} #{{ source.sourceId }}
        </el-tag>
      </div>
      <el-button type="primary" plain @click="goSafe(detail.strategy.actionUrl || '/agent/today')">Agent 下一步任务</el-button>
    </section>

    <section class="content-card section" v-if="detail">
      <div class="section-head">
        <h2>关联证据</h2>
        <el-button size="small" @click="relationDialog = true">添加关联</el-button>
      </div>
      <el-table :data="detail.relations" border>
        <el-table-column prop="relationType" label="类型" width="180" />
        <el-table-column prop="relationId" label="ID" width="100" />
        <el-table-column prop="relationSummary" label="摘要" />
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button link type="danger" @click="removeRelation(row.id)">移除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog v-model="relationDialog" title="添加关联证据" width="520px">
      <el-form label-position="top">
        <el-form-item label="类型">
          <el-select v-model="relationForm.relationType">
            <el-option v-for="type in jobExperimentRelationOptions" :key="type.value" :label="type.label" :value="type.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="业务 ID">
          <el-input-number v-model="relationForm.relationId" :min="1" />
        </el-form-item>
        <el-form-item label="安全摘要">
          <el-input v-model="relationForm.relationSummary" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="relationDialog = false">取消</el-button>
        <el-button type="primary" @click="addRelation">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

import {
  addJobExperimentRelationApi,
  deleteJobExperimentApi,
  deleteJobExperimentRelationApi,
  getJobExperimentDetailApi
} from '@/api/jobExperiment'
import { confidenceLabel, jobExperimentRelationOptions } from '@/features/job-experiment'
import { resolveAppRoutePath, defaultUserKnownPaths } from '@/features/route-safety'
import type { JobSearchExperimentDetailVO, JobSearchExperimentRelationSaveDTO } from '@/types/jobExperiment'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const deleting = ref(false)
const detail = ref<JobSearchExperimentDetailVO>()
const relationDialog = ref(false)
const relationForm = reactive<JobSearchExperimentRelationSaveDTO>({
  relationType: 'JOB_APPLICATION',
  relationId: 1,
  relationSummary: ''
})

const id = () => Number(route.params.id)

const load = async () => {
  loading.value = true
  try {
    detail.value = await getJobExperimentDetailApi(id())
  } finally {
    loading.value = false
  }
}

const addRelation = async () => {
  await addJobExperimentRelationApi(id(), relationForm)
  relationDialog.value = false
  load()
}

const removeRelation = async (relationId: number) => {
  await deleteJobExperimentRelationApi(id(), relationId)
  load()
}

const removeExperiment = async () => {
  try {
    await ElMessageBox.confirm('确定删除这个求职实验吗？关联证据和复盘记录将不再可见。', '删除求职实验', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  deleting.value = true
  try {
    await deleteJobExperimentApi(id())
    ElMessage.success('实验已删除')
    router.push('/job-experiments')
  } finally {
    deleting.value = false
  }
}

const goSafe = (path: string) => {
  router.push(resolveAppRoutePath(path, { knownPaths: defaultUserKnownPaths }).path)
}

onMounted(load)
</script>

<style scoped lang="scss">
.page-hero,
.hero-actions,
.section-head,
.evidence-list {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-hero {
  justify-content: space-between;
  padding: 26px;
  border: 1px solid var(--app-border);
  border-radius: var(--cc-radius-xl);
  background: rgba(15, 23, 42, 0.72);
}

.hero-kicker {
  margin: 0;
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

h1 {
  margin: 6px 0;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.metric {
  padding: 18px;
}

.metric strong {
  display: block;
  font-size: 26px;
}

.metric span,
.page-hero p {
  color: var(--app-text-muted);
}

.section {
  padding: 18px;
}

.section-head {
  justify-content: space-between;
  margin-bottom: 12px;
}

.evidence-list {
  flex-wrap: wrap;
  margin: 12px 0;
}
</style>
