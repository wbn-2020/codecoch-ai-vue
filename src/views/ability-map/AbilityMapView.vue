<template>
  <div class="ability-map page-shell" v-loading="loading">
    <section class="growth-hero">
      <div class="growth-hero__main">
        <div class="eyebrow">
          <Map :size="16" />
          Java 后端成长地图
        </div>
        <h1>能力图谱</h1>
        <p>
          把训练记录、能力状态和证据沉淀放到同一张地图里，先看哪些能力已经可用，再决定下一组题练什么。
        </p>
        <div class="hero-actions">
          <el-button @click="router.push('/project-evidence')">
            <FolderOpen :size="16" />
            补项目证据
          </el-button>
          <el-button type="primary" @click="startDomainTraining(activeDomain)">
            <Play :size="16" />
            开始专项训练
          </el-button>
        </div>
      </div>

      <aside class="next-training-card" :class="{ 'is-muted': !abilityMap.hasTrainingData }">
        <div class="next-training-card__label">
          <Target :size="16" />
          下一组训练建议
        </div>
        <h2>{{ nextTrainingTitle }}</h2>
        <p>{{ nextTrainingDescription }}</p>
        <div class="next-training-card__meta">
          <span>
            <BookOpenCheck :size="15" />
            {{ nextTrainingMeta }}
          </span>
          <span>
            <ShieldCheck :size="15" />
            {{ trainingTrustText }}
          </span>
        </div>
        <el-button type="primary" size="large" @click="startRecommendedTraining">
          {{ nextTrainingActionLabel }}
          <ArrowRight :size="16" />
        </el-button>
      </aside>
    </section>

    <section class="signal-grid" aria-label="能力图谱总览">
      <article class="signal-card">
        <span>已评估能力点</span>
        <strong>{{ abilityMap.assessedSkillCount }}/{{ abilityMap.totalSkillCount }}</strong>
        <em>{{ assessedRatioText }}</em>
      </article>
      <article class="signal-card signal-card--weak">
        <span>薄弱项</span>
        <strong>{{ abilityMap.hasTrainingData ? abilityMap.weakSkillCount : '未评估' }}</strong>
        <em>{{ weakSignalText }}</em>
      </article>
      <article class="signal-card signal-card--usable">
        <span>强项/可用项</span>
        <strong>{{ abilityMap.hasTrainingData ? usableSkills.length : '未评估' }}</strong>
        <em>{{ usableSignalText }}</em>
      </article>
      <article class="signal-card">
        <span>证据</span>
        <strong>{{ totalEvidenceCount }}</strong>
        <em>{{ totalEvidenceCount ? '来自训练评估记录' : '等待训练沉淀' }}</em>
      </article>
    </section>

    <el-alert
      v-if="!loading && !abilityMap.hasTrainingData"
      class="honesty-alert"
      type="info"
      :closable="false"
      show-icon
      title="暂无训练评估数据：当前只展示能力点目录，不生成强项、薄弱项或训练结论。"
    />

    <section v-if="loadError" class="load-error-card">
      <div>
        <AlertTriangle :size="18" />
        <strong>能力图谱暂时加载失败</strong>
        <p>{{ loadError }}</p>
      </div>
      <el-button type="primary" plain :loading="loading" @click="fetchAbilityMap">重试</el-button>
    </section>

    <section v-else-if="!abilityMap.domains.length && !loading" class="empty-map-card">
      <CircleHelp :size="28" />
      <h2>还没有能力点目录</h2>
      <p>完成一次题库训练或模拟面试后，这里会逐步形成能力图谱。</p>
      <el-button type="primary" @click="router.push('/questions/practice')">先做一组训练</el-button>
    </section>

    <section v-else class="map-workspace">
      <aside class="domain-rail">
        <div class="section-title">
          <span>能力域</span>
          <em>{{ abilityMap.domains.length }} 个方向</em>
        </div>
        <button
          v-for="domain in abilityMap.domains"
          :key="domain.domainCode"
          class="domain-item"
          :class="{ active: domain.domainCode === activeDomainCode }"
          type="button"
          @click="activeDomainCode = domain.domainCode"
        >
          <span>{{ domain.domainName || domain.domainCode || '未命名能力域' }}</span>
          <strong>{{ domain.assessedCount }}/{{ domain.totalCount }}</strong>
          <small>{{ domainWeakText(domain) }}</small>
        </button>
      </aside>

      <main class="domain-panel">
        <header class="domain-panel__head">
          <div>
            <span>当前能力域</span>
            <h2>{{ activeDomainName }}</h2>
            <p>{{ activeDomainSummary }}</p>
          </div>
          <el-button plain type="primary" @click="startDomainTraining(activeDomain)">
            <Play :size="15" />
            训练本域
          </el-button>
        </header>

        <div class="domain-map-strip">
          <article v-for="item in domainMilestones" :key="item.label" :class="['milestone', item.tone]">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <em>{{ item.hint }}</em>
          </article>
        </div>

        <div v-if="activeDomain?.skills?.length" class="skill-grid">
          <article
            v-for="skill in activeDomain.skills"
            :key="skill.code"
            class="skill-card"
            :class="skillCardClass(skill)"
          >
            <div class="skill-card__head">
              <div>
                <strong>{{ skill.name || skill.code || '未命名能力点' }}</strong>
                <span>{{ skill.domainName || activeDomainName }}</span>
              </div>
              <el-tag effect="plain" :type="statusTagType(skill.status)">
                {{ honestStatusLabel(skill) }}
              </el-tag>
            </div>

            <p>{{ skillSummary(skill) }}</p>

            <div class="skill-evidence-row">
              <span>
                <BookOpenCheck :size="14" />
                证据 {{ skill.evidenceCount || 0 }}
              </span>
              <span>
                <Clock3 :size="14" />
                {{ formatDate(skill.lastEvaluatedAt) }}
              </span>
              <span>
                <ShieldCheck :size="14" />
                {{ confidenceText(skill) }}
              </span>
            </div>

            <el-button class="skill-action" :type="skill.status === 'WEAK' ? 'primary' : 'default'" plain @click="startSkillTraining(skill)">
              <Play :size="14" />
              训练这个能力点
            </el-button>
          </article>
        </div>
        <el-empty v-else description="当前能力域还没有能力点" />
      </main>

      <aside class="insight-panel">
        <section class="insight-card">
          <div class="section-title">
            <span>优先薄弱项</span>
            <em>{{ abilityMap.hasTrainingData ? `${weakSkills.length} 项` : '未评估' }}</em>
          </div>
          <div v-if="abilityMap.hasTrainingData && weakSkills.length" class="priority-list">
            <button
              v-for="skill in weakSkills.slice(0, 3)"
              :key="skill.code"
              type="button"
              class="priority-item"
              @click="startSkillTraining(skill)"
            >
              <span>{{ skill.name || skill.code }}</span>
              <small>{{ skill.evidenceCount || 0 }} 条证据 · {{ confidenceText(skill) }}</small>
            </button>
          </div>
          <p v-else class="insight-muted">{{ weakPanelEmptyText }}</p>
        </section>

        <section class="insight-card">
          <div class="section-title">
            <span>已可用能力</span>
            <em>{{ abilityMap.hasTrainingData ? `${usableSkills.length} 项` : '未评估' }}</em>
          </div>
          <div v-if="abilityMap.hasTrainingData && usableSkills.length" class="chip-list">
            <span v-for="skill in usableSkills.slice(0, 8)" :key="skill.code">{{ skill.name || skill.code }}</span>
          </div>
          <p v-else class="insight-muted">{{ usablePanelEmptyText }}</p>
        </section>

        <section class="insight-card">
          <div class="section-title">
            <span>训练路径</span>
            <em>下一步</em>
          </div>
          <ol class="training-path">
            <li v-for="item in trainingPath" :key="item.title">
              <CheckCircle2 :size="15" />
              <div>
                <strong>{{ item.title }}</strong>
                <span>{{ item.desc }}</span>
              </div>
            </li>
          </ol>
        </section>
      </aside>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  CircleHelp,
  Clock3,
  FolderOpen,
  Map,
  Play,
  ShieldCheck,
  Target
} from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { getAbilityMapApi } from '@/api/abilityMap'
import { normalizeAbilityMap, statusLabel, statusTagType } from '@/features/ability-map'
import type { AbilityDomainVO, AbilityMapVO, AbilitySkillNodeVO } from '@/types/abilityMap'
import { getErrorMessage } from '@/utils/error'

const router = useRouter()
const loading = ref(false)
const loadError = ref('')
const activeDomainCode = ref('')
const abilityMap = ref<AbilityMapVO>(normalizeAbilityMap())

const activeDomain = computed(() =>
  abilityMap.value.domains.find((domain) => domain.domainCode === activeDomainCode.value) ||
  abilityMap.value.domains[0]
)

const activeDomainName = computed(() => activeDomain.value?.domainName || activeDomain.value?.domainCode || '能力点')
const allSkills = computed(() => abilityMap.value.domains.flatMap((domain) => domain.skills || []))
const weakSkills = computed(() => abilityMap.value.hasTrainingData ? allSkills.value.filter((skill) => skill.status === 'WEAK') : [])
const usableSkills = computed(() =>
  abilityMap.value.hasTrainingData
    ? allSkills.value.filter((skill) => ['COMPETENT', 'STRONG'].includes(String(skill.status)))
    : []
)
const totalEvidenceCount = computed(() => allSkills.value.reduce((total, skill) => total + (skill.evidenceCount || 0), 0))
const assessedRatioText = computed(() => {
  if (!abilityMap.value.totalSkillCount) return '等待能力目录'
  const ratio = Math.round((abilityMap.value.assessedSkillCount / abilityMap.value.totalSkillCount) * 100)
  return `${ratio}% 已有训练记录`
})
const weakSignalText = computed(() => {
  if (!abilityMap.value.hasTrainingData) return '训练后再判断'
  if (weakSkills.value.length) return '建议优先专项训练'
  return '暂无薄弱结论'
})
const usableSignalText = computed(() => {
  if (!abilityMap.value.hasTrainingData) return '训练后再判断'
  if (usableSkills.value.length) return '可用于面试表达'
  return '继续积累证据'
})
const activeDomainSummary = computed(() => {
  const domain = activeDomain.value
  if (!domain) return '完成训练后，这里会展示能力点状态、证据和下一步。'
  if (!abilityMap.value.hasTrainingData) return `${domain.totalCount || domain.skills.length} 个能力点尚未形成训练评估。`
  return `${domain.assessedCount || 0} 个已评估，${domain.weakCount || 0} 个薄弱项，优先从证据最少或状态薄弱的能力开始。`
})
const activeDomainUsableSkills = computed(() =>
  abilityMap.value.hasTrainingData
    ? (activeDomain.value?.skills || []).filter((skill) => ['COMPETENT', 'STRONG'].includes(String(skill.status)))
    : []
)
const domainMilestones = computed(() => [
  {
    label: '已评估',
    value: `${activeDomain.value?.assessedCount || 0}/${activeDomain.value?.totalCount || activeDomain.value?.skills.length || 0}`,
    hint: abilityMap.value.hasTrainingData ? '有训练记录' : '尚未形成结论',
    tone: 'tone-info'
  },
  {
    label: '薄弱',
    value: abilityMap.value.hasTrainingData ? String(activeDomain.value?.weakCount || 0) : '未评估',
    hint: abilityMap.value.hasTrainingData ? '可直接训练' : '不生成判断',
    tone: 'tone-danger'
  },
  {
    label: '可用',
    value: abilityMap.value.hasTrainingData ? String(activeDomainUsableSkills.value.length) : '未评估',
    hint: abilityMap.value.hasTrainingData ? '面试可调用' : '等待证据',
    tone: 'tone-success'
  }
])
const recommendedSkill = computed(() => {
  if (abilityMap.value.hasTrainingData && weakSkills.value.length) return weakSkills.value[0]
  return activeDomain.value?.skills?.[0] || allSkills.value[0]
})
const nextTrainingTitle = computed(() => {
  if (!allSkills.value.length) return '先建立能力目录'
  if (!abilityMap.value.hasTrainingData) return '先完成一次专项训练，建立评估证据'
  if (recommendedSkill.value && weakSkills.value.length) return `优先训练：${recommendedSkill.value.name || recommendedSkill.value.code}`
  return '保持专项训练，补齐证据链'
})
const nextTrainingDescription = computed(() => {
  if (!allSkills.value.length) return '当前没有可训练的能力点，请先进入题库完成一组基础训练。'
  if (!abilityMap.value.hasTrainingData) return '目前没有训练数据，页面不会推断强弱。先围绕当前能力域做题，让图谱有真实证据。'
  if (recommendedSkill.value && weakSkills.value.length) {
    return recommendedSkill.value.summary || recommendedSkill.value.description || '这个能力点已被评估为薄弱，建议用专项题组补齐概念、方案和项目表达。'
  }
  return '当前没有明确薄弱项，建议继续训练证据较少的能力点，避免把“未评估”误当作“已掌握”。'
})
const nextTrainingMeta = computed(() => {
  if (!recommendedSkill.value) return '通用训练'
  return `${recommendedSkill.value.evidenceCount || 0} 条证据 · ${formatDate(recommendedSkill.value.lastEvaluatedAt)}`
})
const trainingTrustText = computed(() => {
  if (!abilityMap.value.hasTrainingData) return '暂无强弱结论'
  return recommendedSkill.value ? confidenceText(recommendedSkill.value) : '可信度待确认'
})
const nextTrainingActionLabel = computed(() => abilityMap.value.hasTrainingData && weakSkills.value.length ? '训练薄弱项' : '开始训练')
const weakPanelEmptyText = computed(() => abilityMap.value.hasTrainingData ? '当前没有薄弱项结论，继续训练证据较少的能力点。' : '暂无训练评估数据，不能判断薄弱项。')
const usablePanelEmptyText = computed(() => abilityMap.value.hasTrainingData ? '暂时没有可标记为强项或合格的能力点。' : '暂无训练评估数据，不能判断强项。')
const trainingPath = computed(() => {
  if (!abilityMap.value.hasTrainingData) {
    return [
      { title: '完成一组专项题', desc: '先让能力点产生真实训练记录。' },
      { title: '查看评估证据', desc: '用证据数、最后评估和可信度判断下一步。' },
      { title: '回到图谱复盘', desc: '再决定薄弱项训练或面试巩固。' }
    ]
  }
  return [
    { title: weakSkills.value.length ? '先补薄弱项' : '继续补证据', desc: weakSkills.value.length ? '从薄弱能力点进入专项练习。' : '优先练证据少的能力点。' },
    { title: '沉淀项目说法', desc: '把训练暴露的问题补到项目证据里。' },
    { title: '进入模拟面试', desc: '用可用能力完成下一轮表达巩固。' }
  ]
})

const fetchAbilityMap = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const result = await getAbilityMapApi()
    abilityMap.value = normalizeAbilityMap(result)
    activeDomainCode.value = activeDomainCode.value || abilityMap.value.domains[0]?.domainCode || ''
  } catch (error) {
    loadError.value = getErrorMessage(error, '能力图谱暂时加载失败')
  } finally {
    loading.value = false
  }
}

const domainWeakText = (domain: AbilityDomainVO) => {
  if (!abilityMap.value.hasTrainingData) return '未评估'
  if (domain.weakCount) return `${domain.weakCount} 个薄弱项`
  return '暂无薄弱项'
}

const honestStatusLabel = (skill: AbilitySkillNodeVO) => {
  if (!abilityMap.value.hasTrainingData || skill.status === 'UNASSESSED') return '未评估'
  return statusLabel(skill.status)
}

const skillSummary = (skill: AbilitySkillNodeVO) => {
  if (!abilityMap.value.hasTrainingData || skill.status === 'UNASSESSED') {
    return skill.description || '尚未产生训练评估，当前只作为能力点目录展示。'
  }
  return skill.summary || skill.description || '已有训练记录，但暂无摘要。建议继续用专项训练补齐证据。'
}

const confidenceText = (skill: AbilitySkillNodeVO) => {
  if (!abilityMap.value.hasTrainingData || !skill.evidenceCount) return '待训练验证'
  const labels: Record<string, string> = {
    UNKNOWN: '可信度待确认',
    LOW: '可信度低',
    MEDIUM: '可信度中',
    HIGH: '可信度高'
  }
  return labels[String(skill.confidence || 'UNKNOWN')] || String(skill.confidence || '可信度待确认')
}

const formatDate = (value?: string) => {
  if (!value) return '未评估'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit'
  })
}

const skillCardClass = (skill: AbilitySkillNodeVO) => {
  if (!abilityMap.value.hasTrainingData || skill.status === 'UNASSESSED') return 'is-unassessed'
  return `is-${String(skill.status).toLowerCase()}`
}

const practiceQueryForSkill = (skill?: AbilitySkillNodeVO) => {
  const keyword = skill?.name || skill?.code || activeDomainName.value
  return {
    mode: 'category',
    keyword,
    skillName: keyword,
    sourceType: 'SKILL_PROFILE',
    trustStatus: abilityMap.value.hasTrainingData && (skill?.evidenceCount || 0) > 0 ? 'VERIFIED' : 'PARTIAL'
  }
}

const startDomainTraining = (domain?: AbilityDomainVO) => {
  const keyword = domain?.domainName || domain?.domainCode || activeDomainName.value
  router.push({
    path: '/questions/practice',
    query: {
      mode: 'category',
      keyword,
      skillName: keyword,
      sourceType: 'SKILL_PROFILE',
      trustStatus: abilityMap.value.hasTrainingData ? 'PARTIAL' : 'FALLBACK'
    }
  })
}

const startSkillTraining = (skill: AbilitySkillNodeVO) => {
  router.push({
    path: '/questions/practice',
    query: practiceQueryForSkill(skill)
  })
}

const startRecommendedTraining = () => {
  if (recommendedSkill.value) {
    startSkillTraining(recommendedSkill.value)
    return
  }
  router.push('/questions/practice')
}

onMounted(fetchAbilityMap)
</script>

<style scoped lang="scss">
.ability-map {
  color: var(--app-text);
}

.growth-hero,
.signal-card,
.domain-rail,
.domain-panel,
.insight-card,
.load-error-card,
.empty-map-card {
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: var(--app-shadow);
}

.growth-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 390px;
  gap: 18px;
  padding: 24px;
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(22, 163, 74, 0.08)),
    #ffffff;
}

.growth-hero__main {
  min-width: 0;

  h1 {
    margin: 10px 0 0;
    color: var(--app-text);
    font-size: 32px;
    line-height: 1.18;
  }

  p {
    max-width: 760px;
    margin: 12px 0 0;
    color: var(--app-text-muted);
    line-height: 1.7;
  }
}

.eyebrow,
.hero-actions,
.next-training-card__label,
.next-training-card__meta,
.section-title,
.skill-evidence-row,
.load-error-card > div,
.training-path li {
  display: flex;
  align-items: center;
  gap: 8px;
}

.eyebrow {
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.hero-actions {
  flex-wrap: wrap;
  margin-top: 22px;
}

.next-training-card {
  display: grid;
  align-content: start;
  gap: 14px;
  padding: 20px;
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
  background: #fff7ed;

  h2,
  p {
    margin: 0;
  }

  h2 {
    color: var(--app-text);
    font-size: 22px;
    line-height: 1.35;
  }

  p {
    color: #475569;
    line-height: 1.7;
  }

  &.is-muted {
    border-color: rgba(37, 99, 235, 0.22);
    background: #eff6ff;
  }
}

.next-training-card__label {
  color: #c2410c;
  font-size: 13px;
  font-weight: 800;
}

.next-training-card__meta {
  flex-wrap: wrap;

  span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #64748b;
    font-size: 12px;
  }
}

.signal-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.signal-card {
  padding: 18px;

  span,
  em,
  strong {
    display: block;
  }

  span {
    color: var(--app-text-muted);
    font-size: 13px;
  }

  strong {
    margin-top: 8px;
    color: var(--app-text);
    font-size: 28px;
    line-height: 1.1;
  }

  em {
    margin-top: 8px;
    color: #64748b;
    font-style: normal;
    font-size: 12px;
  }
}

.signal-card--weak {
  border-color: rgba(239, 68, 68, 0.2);
  background: #fff7f7;
}

.signal-card--usable {
  border-color: rgba(22, 163, 74, 0.2);
  background: #f0fdf4;
}

.honesty-alert {
  margin-top: -2px;
}

.load-error-card,
.empty-map-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 20px;
}

.load-error-card {
  color: #991b1b;
  background: #fef2f2;

  p {
    margin: 4px 0 0;
    color: #7f1d1d;
  }
}

.empty-map-card {
  flex-direction: column;
  justify-content: center;
  min-height: 280px;
  text-align: center;

  h2,
  p {
    margin: 0;
  }

  p {
    color: var(--app-text-muted);
  }
}

.map-workspace {
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr) 320px;
  gap: 16px;
  align-items: start;
}

.domain-rail,
.domain-panel,
.insight-panel {
  min-width: 0;
}

.domain-rail {
  display: grid;
  gap: 8px;
  padding: 12px;
}

.section-title {
  justify-content: space-between;
  gap: 12px;

  span {
    color: var(--app-text);
    font-size: 14px;
    font-weight: 800;
  }

  em {
    color: var(--app-text-muted);
    font-style: normal;
    font-size: 12px;
  }
}

.domain-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px 10px;
  width: 100%;
  padding: 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--app-text);
  cursor: pointer;
  text-align: left;

  span,
  small {
    overflow-wrap: anywhere;
  }

  strong {
    color: #2563eb;
    font-size: 13px;
  }

  small {
    grid-column: 1 / -1;
    color: var(--app-text-muted);
    font-size: 12px;
  }

  &.active,
  &:hover {
    border-color: rgba(37, 99, 235, 0.36);
    background: #eff6ff;
  }
}

.domain-panel {
  padding: 18px;
}

.domain-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;

  span {
    color: #2563eb;
    font-size: 12px;
    font-weight: 800;
  }

  h2,
  p {
    margin: 0;
  }

  h2 {
    margin-top: 4px;
    font-size: 22px;
  }

  p {
    margin-top: 8px;
    color: var(--app-text-muted);
    line-height: 1.6;
  }
}

.domain-map-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.milestone {
  min-width: 0;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;

  span,
  strong,
  em {
    display: block;
  }

  span,
  em {
    color: var(--app-text-muted);
    font-size: 12px;
  }

  strong {
    margin-top: 6px;
    color: var(--app-text);
    font-size: 22px;
  }

  em {
    margin-top: 4px;
    font-style: normal;
  }
}

.tone-danger {
  border-color: rgba(239, 68, 68, 0.2);
  background: #fff7f7;
}

.tone-success {
  border-color: rgba(22, 163, 74, 0.2);
  background: #f0fdf4;
}

.skill-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.skill-card {
  display: flex;
  min-width: 0;
  min-height: 230px;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;

  p {
    flex: 1;
    margin: 0;
    color: var(--app-text-muted);
    line-height: 1.65;
    overflow-wrap: anywhere;
  }
}

.skill-card.is-weak {
  border-color: rgba(239, 68, 68, 0.24);
  background: #fff7f7;
}

.skill-card.is-strong,
.skill-card.is-competent {
  border-color: rgba(22, 163, 74, 0.22);
  background: #f8fffb;
}

.skill-card.is-unassessed {
  background: #f8fafc;
}

.skill-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  > div {
    min-width: 0;
  }

  strong,
  span {
    display: block;
    overflow-wrap: anywhere;
  }

  strong {
    color: var(--app-text);
    font-size: 16px;
  }

  span {
    margin-top: 4px;
    color: var(--app-text-muted);
    font-size: 12px;
  }
}

.skill-evidence-row {
  flex-wrap: wrap;
  gap: 8px 10px;

  span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: #64748b;
    font-size: 12px;
  }
}

.skill-action {
  align-self: flex-start;
}

.insight-panel {
  display: grid;
  gap: 12px;
}

.insight-card {
  display: grid;
  gap: 12px;
  padding: 16px;
}

.priority-list {
  display: grid;
  gap: 8px;
}

.priority-item {
  display: grid;
  gap: 4px;
  width: 100%;
  padding: 10px;
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  background: #fff7f7;
  color: var(--app-text);
  cursor: pointer;
  text-align: left;

  span,
  small {
    overflow-wrap: anywhere;
  }

  span {
    font-weight: 800;
  }

  small {
    color: var(--app-text-muted);
    font-size: 12px;
  }
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  span {
    max-width: 100%;
    padding: 6px 9px;
    border-radius: 8px;
    background: #dcfce7;
    color: #166534;
    font-size: 12px;
    overflow-wrap: anywhere;
  }
}

.insight-muted {
  margin: 0;
  color: var(--app-text-muted);
  line-height: 1.6;
}

.training-path {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    align-items: flex-start;
  }

  svg {
    flex: 0 0 auto;
    margin-top: 2px;
    color: #16a34a;
  }

  strong,
  span {
    display: block;
  }

  strong {
    color: var(--app-text);
    font-size: 13px;
  }

  span {
    margin-top: 3px;
    color: var(--app-text-muted);
    font-size: 12px;
    line-height: 1.5;
  }
}

@media (max-width: 1180px) {
  .growth-hero,
  .map-workspace {
    grid-template-columns: 1fr;
  }

  .domain-rail {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .domain-rail .section-title {
    grid-column: 1 / -1;
  }
}

@media (max-width: 860px) {
  .signal-grid,
  .skill-grid,
  .domain-map-strip {
    grid-template-columns: 1fr;
  }

  .domain-panel__head,
  .load-error-card {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 640px) {
  .growth-hero {
    padding: 18px;
  }

  .growth-hero__main h1 {
    font-size: 28px;
  }

  .domain-rail {
    grid-template-columns: 1fr;
  }

  .next-training-card,
  .domain-panel,
  .insight-card {
    padding: 14px;
  }
}
</style>
