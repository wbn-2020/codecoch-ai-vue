<template>
  <div class="weakness-page page-shell">
    <section class="page-hero">
      <div>
        <div class="eyebrow">Weakness Analysis</div>
        <h1>薄弱知识点分析</h1>
        <p>基于真实刷题记录统计正确率和高错题分类，不使用前端假数据。</p>
      </div>
      <div class="hero-actions">
        <el-button :loading="loading" @click="loadData">刷新</el-button>
        <el-button type="primary" @click="router.push('/questions/practice')">去练习</el-button>
      </div>
    </section>

    <AppState v-if="error" type="error" title="薄弱点加载失败" :description="error">
      <el-button type="primary" @click="loadData">重试</el-button>
    </AppState>

    <div v-else v-loading="loading" class="weakness-layout">
      <section class="content-card">
        <div class="content-card__body">
          <div class="metric-grid">
            <div class="metric"><span>已答题</span><strong>{{ analysis?.totalAnswered ?? 0 }}</strong></div>
            <div class="metric"><span>正确率</span><strong>{{ analysis?.correctRate ?? 0 }}%</strong></div>
            <div class="metric"><span>薄弱分类</span><strong>{{ weakCategories.length }}</strong></div>
          </div>

          <AppState
            v-if="!weakCategories.length"
            type="empty"
            title="暂无足够薄弱点数据"
            description="后端至少需要一定答题记录才能统计分类错误率。"
          />

          <div v-else class="category-list">
            <article v-for="item in weakCategories" :key="item.categoryId" class="category-card">
              <div class="category-card__head">
                <div>
                  <span>分类 #{{ item.categoryId }}</span>
                  <h3>错误率 {{ item.wrongRate }}%</h3>
                </div>
                <el-progress type="circle" :width="68" :percentage="Number(item.wrongRate || 0)" color="#f97316" />
              </div>
              <p>累计 {{ item.totalCount }} 题，答错 {{ item.wrongCount }} 题。</p>
              <div class="card-actions">
                <el-button size="small" type="primary" plain @click="router.push(`/questions/practice?categoryId=${item.categoryId}`)">专项练习</el-button>
                <el-button size="small" plain @click="router.push('/questions/wrong-records')">错题重刷</el-button>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { getWeaknessAnalysisApi, type WeaknessAnalysisVO } from '@/api/questionStudy'
import AppState from '@/components/common/AppState.vue'
import { getErrorMessage } from '@/utils/error'

const router = useRouter()
const loading = ref(false)
const error = ref('')
const analysis = ref<WeaknessAnalysisVO>()

const weakCategories = computed(() => analysis.value?.weakCategories || [])

const normalizeWeaknessError = (err: unknown) => {
  const message = getErrorMessage(err, '薄弱点暂时加载失败，请稍后重试。')
  if (/未登录|unauthorized|401/i.test(message)) {
    return '登录状态已失效，请重新登录后再试。'
  }
  if (/接口请求失败|network/i.test(message)) {
    return '薄弱点暂时加载失败，请稍后重试。'
  }
  return message
}

const loadData = async () => {
  loading.value = true
  error.value = ''
  try {
    analysis.value = await getWeaknessAnalysisApi()
  } catch (err) {
    error.value = normalizeWeaknessError(err)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped lang="scss">
.page-hero,
.hero-actions,
.category-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.page-hero {
  margin-bottom: 18px;
}

.eyebrow {
  margin-bottom: 6px;
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.page-hero h1,
.category-card h3 {
  margin: 0;
}

.page-hero p,
.category-card p,
.category-card span {
  color: var(--app-text-muted);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.metric,
.category-card {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.5);
}

.metric span {
  display: block;
  color: var(--app-text-muted);
}

.metric strong {
  display: block;
  margin-top: 6px;
  font-size: 26px;
}

.category-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}

.card-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

@media (max-width: 760px) {
  .page-hero,
  .hero-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .metric-grid {
    grid-template-columns: 1fr;
  }
}
</style>
