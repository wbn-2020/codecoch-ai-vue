<template>
  <div class="weakness-page page-shell">
    <section class="weakness-hero">
      <div class="hero-copy">
        <p class="hero-kicker">
          <Target :size="16" />
          薄弱点分析
        </p>
        <h1 class="page-title">把错题和薄弱分类变成今日训练重点</h1>
        <p class="page-subtitle">
          这里根据你的刷题结果展示薄弱分类。你可以据此选择专项练习或错题重刷，尽快把短板收窄。
        </p>
      </div>

      <div class="hero-actions">
        <el-button :loading="loading" @click="loadData">
          <RefreshCw :size="16" />
          刷新
        </el-button>
        <el-button type="primary" @click="router.push('/questions/practice')">
          <Dumbbell :size="16" />
          去专项练习
        </el-button>
      </div>
    </section>

    <AppState v-if="error" type="error" title="薄弱点加载失败" :description="error">
      <el-button type="primary" @click="loadData">重试</el-button>
    </AppState>

    <template v-else>
      <section class="metric-grid">
        <article class="metric-card">
          <span>已答题</span>
          <strong>{{ analysis?.totalAnswered ?? 0 }}</strong>
          <p>用于统计薄弱点的真实答题数量。</p>
        </article>
        <article class="metric-card">
          <span>正确率</span>
          <strong>{{ analysis?.correctRate ?? 0 }}%</strong>
          <p>当前训练阶段的整体正确率。</p>
        </article>
        <article class="metric-card">
          <span>薄弱分类</span>
          <strong>{{ weakCategories.length }}</strong>
          <p>建议今天优先处理这些分类。</p>
        </article>
      </section>

      <section class="content-card weakness-panel" v-loading="loading">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">薄弱分类</p>
              <h2>优先处理这些方向</h2>
            </div>
            <el-tag v-if="analysis?.weakDifficulties?.length" effect="plain">
              相关难点 {{ analysis.weakDifficulties.length }} 项
            </el-tag>
          </div>

          <AppState
            v-if="!weakCategories.length"
            type="empty"
            title="暂无足够薄弱点数据"
            description="需要先积累一定答题记录，才能统计分类错误率。可以先做一组通用训练，或回到错题记录补齐样本。"
          >
            <el-button type="primary" @click="router.push('/questions/practice')">先做一组通用训练</el-button>
            <el-button @click="router.push('/questions/wrong-records')">查看错题记录</el-button>
          </AppState>

          <div v-else class="category-grid">
            <article v-for="item in weakCategories" :key="item.categoryId" class="category-card">
              <div class="category-card__head">
                <div>
                  <span>{{ categoryEvidenceText(item) }}</span>
                  <h3>错误率 {{ item.wrongRate }}%</h3>
                </div>
                <el-progress
                  type="circle"
                  :width="72"
                  :percentage="Number(item.wrongRate || 0)"
                  color="#f97316"
                />
              </div>
              <p>{{ categoryDisplayName(item) }}累计 {{ item.totalCount }} 题，答错 {{ item.wrongCount }} 题。</p>
              <div class="card-actions">
                <el-button size="small" type="primary" plain @click="router.push(`/questions/practice?categoryId=${item.categoryId}`)">
                  专项练习
                </el-button>
                <el-button size="small" plain @click="router.push('/questions/wrong-records')">
                  错题重刷
                </el-button>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section class="content-card weakness-panel">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">高频难点</p>
              <h2>今天先从这些题型开始</h2>
            </div>
          </div>

          <div v-if="weakDifficulties.length" class="difficulty-list">
            <span v-for="item in weakDifficulties" :key="item">{{ item }}</span>
          </div>
          <AppState
            v-else
            type="empty"
            title="暂无高频难点标签"
            description="当薄弱难点积累出来后，这里会作为专项练习入口参考。"
          />
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Dumbbell, RefreshCw, Target } from 'lucide-vue-next'

import { getWeaknessAnalysisApi, type WeaknessAnalysisVO } from '@/api/questionStudy'
import AppState from '@/components/common/AppState.vue'
import { getErrorMessage } from '@/utils/error'

const router = useRouter()
const loading = ref(false)
const error = ref('')
const analysis = ref<WeaknessAnalysisVO>()

const weakCategories = computed(() => analysis.value?.weakCategories || [])
const weakDifficulties = computed(() => analysis.value?.weakDifficulties || [])

type WeakCategory = WeaknessAnalysisVO['weakCategories'][number]

const categoryDisplayName = (item: WeakCategory) => item.categoryName || (item.categoryId ? `题目分类 ${item.categoryId}` : '未分类题目')

const categoryEvidenceText = (item: WeakCategory) => {
  const name = categoryDisplayName(item)
  return item.categoryId ? `${name} · 来自答题记录` : `${name} · 来自未分类答题记录`
}

const normalizeWeaknessError = (err: unknown) => {
  const message = getErrorMessage(err, '薄弱点暂时加载失败，请稍后重试。')
  if (/未登录|unauthorized|401/i.test(message)) {
    return '登录状态已失效，请重新登录后再试。'
  }
  if ((message.includes('接口') && message.includes('请求失败')) || /network/i.test(message)) {
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
.weakness-page {
  gap: 20px;
}

.weakness-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
}

.hero-copy {
  min-width: 0;
}

.hero-kicker,
.section-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.metric-card,
.category-card {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
  box-shadow: var(--app-shadow);
}

.metric-card span,
.category-card span {
  color: var(--app-text-muted);
  font-size: 12px;
}

.metric-card strong {
  display: block;
  margin-top: 6px;
  font-size: 26px;
}

.metric-card p,
.category-card p {
  margin: 8px 0 0;
  color: var(--app-text-muted);
  line-height: 1.6;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.section-head h2 {
  margin: 5px 0 0;
  color: var(--app-text);
  font-size: 18px;
  line-height: 1.3;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}

.category-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.category-card h3 {
  margin: 4px 0 0;
  font-size: 20px;
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.difficulty-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  span {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 0 10px;
    border: 1px solid var(--app-border);
    border-radius: 999px;
    background: var(--app-surface-soft);
    color: var(--app-text);
    font-size: 13px;
  }
}

@media (max-width: 720px) {
  .weakness-hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .metric-grid {
    grid-template-columns: 1fr;
  }

  .section-head {
    display: grid;
    justify-content: stretch;
  }

  .hero-actions,
  .card-actions {
    width: 100%;
  }

  .hero-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .hero-actions :deep(.el-button) {
    width: 100%;
  }
}
</style>
