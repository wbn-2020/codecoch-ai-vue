<template>
  <div class="page-shell v4-review-page">
    <section class="v4-page-header">
      <div><div class="v4-eyebrow">V4 Review</div><h1>Agent 每日复盘</h1><p>根据当天 Agent 任务完成、跳过和剩余情况生成可追踪复盘。</p></div>
      <div class="v4-actions"><el-date-picker v-model="date" type="date" value-format="YYYY-MM-DD" :clearable="false" /><el-button type="primary" :loading="loading" @click="generate">生成复盘</el-button><el-button :loading="loading" @click="load">刷新</el-button></div>
    </section>
    <section class="v4-grid"><article class="v4-card"><span>最近复盘数</span><strong>{{ reviews.length }}</strong></article><article class="v4-card"><span>最新准备度</span><strong>{{ latest?.readinessScore ?? 0 }}</strong></article><article class="v4-card"><span>最新完成率</span><strong>{{ latest?.completionRate ?? 0 }}%</strong></article></section>
    <section class="content-card"><div class="content-card__body v4-list" v-loading="loading"><article v-for="item in reviews" :key="item.id" class="v4-row"><div class="v4-row-head"><div><strong>{{ item.reviewDate }}</strong><p class="muted">{{ item.summary }}</p></div><el-tag type="success" effect="plain">{{ item.readinessScore }}</el-tag></div><ul><li v-for="action in item.nextActions" :key="action">{{ action }}</li></ul></article><el-empty v-if="!reviews.length && !loading" description="暂无复盘记录" /></div></section>
  </div>
</template>
<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { generateAgentReviewApi, getAgentReviewsApi, type AgentReviewVO } from '@/api/v4'
import { formatLocalDate } from '@/utils/format'
const today = formatLocalDate()
const date = ref(today)
const loading = ref(false)
const reviews = ref<AgentReviewVO[]>([])
const latest = computed(() => reviews.value[0])
const load = async () => { loading.value = true; try { reviews.value = await getAgentReviewsApi() } finally { loading.value = false } }
const generate = async () => { loading.value = true; try { await generateAgentReviewApi({ date: date.value }); ElMessage.success('复盘已生成'); await load() } finally { loading.value = false } }
onMounted(load)
</script><style scoped lang="scss">
.v4-page-header { display:flex; align-items:flex-end; justify-content:space-between; gap:16px; padding:24px; border:1px solid var(--app-border); border-radius:var(--app-radius); background:linear-gradient(135deg, rgba(59,130,246,.14), rgba(34,197,94,.08)), var(--app-surface); box-shadow:var(--app-shadow); }
.v4-page-header h1 { margin:8px 0 0; font-size:28px; }
.v4-page-header p, .muted { color:var(--app-text-muted); line-height:1.7; }
.v4-eyebrow { color:#93c5fd; font-size:13px; font-weight:700; }
.v4-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
.v4-card { padding:16px; border:1px solid var(--app-border); border-radius:10px; background:rgba(15,23,42,.58); }
.v4-card strong { display:block; margin-top:8px; font-size:24px; }
.v4-list { display:grid; gap:12px; }
.v4-row { padding:14px; border:1px solid var(--app-border); border-radius:10px; background:rgba(15,23,42,.52); }
.v4-row-head { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
.v4-actions { display:flex; flex-wrap:wrap; gap:10px; align-items:center; }
@media (max-width:900px){ .v4-page-header{align-items:flex-start; flex-direction:column;} .v4-grid{grid-template-columns:1fr;} }
</style>
