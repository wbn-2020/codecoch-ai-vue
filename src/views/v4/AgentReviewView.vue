<template>
  <div class="page-shell v4-review-page">
    <section class="v4-page-header">
      <div><div class="v4-eyebrow">每日复盘</div><h1>智能教练每日复盘</h1><p>根据当天训练任务完成、跳过和剩余情况生成可追踪复盘。</p></div>
      <div class="v4-actions"><el-date-picker v-model="date" type="date" value-format="YYYY-MM-DD" :clearable="false" /><el-button type="primary" :loading="loading" @click="generate">生成复盘</el-button><el-button :loading="loading" @click="load">刷新</el-button></div>
    </section>
    <section class="v4-grid"><article class="v4-card"><span>最近复盘数</span><strong>{{ reviews.length }}</strong></article><article class="v4-card"><span>最新准备度</span><strong>{{ latest?.readinessScore ?? 0 }}</strong></article><article class="v4-card"><span>最新完成率</span><strong>{{ latest?.completionRate ?? 0 }}%</strong></article></section>
    <section class="content-card"><div class="content-card__body v4-list" v-loading="loading"><article v-for="item in reviews" :key="item.id" class="v4-row"><div class="v4-row-head"><div><strong>{{ item.reviewDate }}</strong><p class="muted">{{ item.summary }}</p></div><el-tag type="success" effect="plain">{{ item.readinessScore }}</el-tag></div><ul><li v-for="action in item.nextActions" :key="action">{{ action }}</li></ul></article><AppState v-if="errorMessage && !loading" type="error" title="每日复盘加载失败" :description="errorMessage"><div class="empty-actions"><el-button type="primary" :loading="loading" @click="load">重新加载</el-button><el-button @click="goTodayPlan">去今日任务</el-button></div></AppState><AppState v-else-if="!reviews.length && !loading" type="empty" title="还没有每日复盘" description="完成或跳过今日任务后，复盘会更准确；也可以先按当前日期生成一版，作为今天下一步行动的起点。"><div class="empty-actions"><el-button type="primary" :loading="loading" @click="generate">生成今日复盘</el-button><el-button @click="goTodayPlan">去今日任务</el-button></div></AppState></div></section>
  </div>
</template>
<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { generateAgentReviewApi, getAgentReviewsApi, type AgentReviewVO } from '@/api/v4'
import AppState from '@/components/common/AppState.vue'
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
    impact: '系统会读取当天训练任务完成、跳过和剩余情况，并写入一条可追踪复盘；后续今日任务、成长画像和训练建议可能引用这次复盘结果。',
    rollback: '如果复盘内容不准确，可以在补充或修正当天任务后重新生成；已被用户采纳的行动建议不会自动撤回。',
    audit: '复盘记录会保留日期、准备度、完成率和下一步行动，便于后续追踪。',
    tips: ['建议先确认当天任务状态已经同步。', '如果只是查看历史复盘，请使用刷新按钮。'],
    confirmButtonText: '确认生成复盘'
  })
  if (!confirmed) return
  generating.value = true
  loading.value = true
  try {
    await generateAgentReviewApi({ date: date.value })
    ElMessage.success('复盘已生成')
    await load()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '每日复盘生成失败，请稍后重试。'))
  } finally {
    generating.value = false
    loading.value = false
  }
}
const goTodayPlan = () => router.push('/agent/today')
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
.empty-actions { display:flex; flex-wrap:wrap; gap:10px; margin-top:14px; }
@media (max-width:900px){ .v4-page-header{align-items:flex-start; flex-direction:column;} .v4-grid{grid-template-columns:1fr;} }
</style>
