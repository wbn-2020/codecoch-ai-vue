<template>
  <div class="ability-map page-shell" v-loading="loading">
    <section class="map-head">
      <div>
        <div class="eyebrow">
          <Map :size="16" />
          Java Backend
        </div>
        <h1>能力地图</h1>
        <p>围绕 Java 后端面试能力点查看训练状态和证据积累。</p>
      </div>
      <div class="head-actions">
        <el-button @click="router.push('/project-evidence')">
          <FolderOpen :size="16" />
          项目素材
        </el-button>
        <el-button type="primary" @click="startDomainTraining(activeDomain?.domainCode)">
          <Play :size="16" />
          开始专项训练
        </el-button>
      </div>
    </section>

    <section class="stats-grid">
      <article>
        <span>能力点</span>
        <strong>{{ abilityMap.totalSkillCount }}</strong>
      </article>
      <article>
        <span>已评估</span>
        <strong>{{ abilityMap.assessedSkillCount }}</strong>
      </article>
      <article>
        <span>薄弱</span>
        <strong>{{ abilityMap.weakSkillCount }}</strong>
      </article>
      <article>
        <span>强项</span>
        <strong>{{ abilityMap.strongSkillCount }}</strong>
      </article>
    </section>

    <el-alert
      v-if="!loading && !abilityMap.hasTrainingData"
      class="empty-alert"
      type="info"
      :closable="false"
      show-icon
      title="暂无训练评估数据，当前页面只展示能力点目录，不生成强弱结论。"
    />

    <div v-if="loadError" class="load-error">
      <span>{{ loadError }}</span>
      <el-button link type="primary" :loading="loading" @click="fetchAbilityMap">重试</el-button>
    </div>

    <div v-else class="map-grid">
      <aside class="domain-list">
        <button
          v-for="domain in abilityMap.domains"
          :key="domain.domainCode"
          class="domain-item"
          :class="{ active: domain.domainCode === activeDomainCode }"
          type="button"
          @click="activeDomainCode = domain.domainCode"
        >
          <span>{{ domain.domainName }}</span>
          <em>{{ domain.assessedCount }}/{{ domain.totalCount }}</em>
        </button>
      </aside>

      <section class="skill-panel">
        <div class="panel-head">
          <div>
            <h2>{{ activeDomain?.domainName || '能力点' }}</h2>
            <p>{{ activeDomain?.assessedCount || 0 }} 个已评估，{{ activeDomain?.weakCount || 0 }} 个薄弱。</p>
          </div>
          <el-button plain type="primary" @click="startDomainTraining(activeDomain?.domainCode)">
            <Play :size="15" />
            训练本域
          </el-button>
        </div>

        <div v-if="activeDomain?.skills?.length" class="skill-grid">
          <article v-for="skill in activeDomain.skills" :key="skill.code" class="skill-card">
            <div class="skill-card__head">
              <div>
                <strong>{{ skill.name }}</strong>
                <span>{{ skill.code }}</span>
              </div>
              <el-tag effect="plain" :type="statusTagType(skill.status)">{{ statusLabel(skill.status) }}</el-tag>
            </div>
            <p>{{ skill.summary || skill.description || '暂无训练数据，等待专项训练后补充画像。' }}</p>
            <div class="skill-meta">
              <span>证据 {{ skill.evidenceCount || 0 }}</span>
              <span>{{ skill.confidence || 'UNKNOWN' }}</span>
              <span>{{ skill.lastEvaluatedAt || '未评估' }}</span>
            </div>
            <el-button class="skill-action" type="primary" plain @click="startSkillTraining(skill)">
              <Play :size="14" />
              训练
            </el-button>
          </article>
        </div>
        <el-empty v-else description="暂无能力点" />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FolderOpen, Map, Play } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { getAbilityMapApi } from '@/api/abilityMap'
import { statusLabel, statusTagType } from '@/features/ability-map'
import type { AbilityMapVO, AbilitySkillNodeVO } from '@/types/abilityMap'
import { getErrorMessage } from '@/utils/error'

const router = useRouter()
const loading = ref(false)
const loadError = ref('')
const activeDomainCode = ref('')
const abilityMap = ref<AbilityMapVO>({
  totalSkillCount: 0,
  assessedSkillCount: 0,
  weakSkillCount: 0,
  strongSkillCount: 0,
  hasTrainingData: false,
  domains: []
})

const activeDomain = computed(() =>
  abilityMap.value.domains.find((domain) => domain.domainCode === activeDomainCode.value) ||
  abilityMap.value.domains[0]
)

const fetchAbilityMap = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const result = await getAbilityMapApi()
    abilityMap.value = result
    activeDomainCode.value = activeDomainCode.value || result.domains[0]?.domainCode || ''
  } catch (error) {
    loadError.value = getErrorMessage(error, '能力地图暂时加载失败')
  } finally {
    loading.value = false
  }
}

const startDomainTraining = (domainCode?: string) => {
  router.push({
    path: '/interviews/create',
    query: {
      trainingScene: 'JAVA_SPECIALTY',
      targetSkillDomain: domainCode || activeDomain.value?.domainCode || ''
    }
  })
}

const startSkillTraining = (skill: AbilitySkillNodeVO) => {
  router.push({
    path: '/interviews/create',
    query: {
      trainingScene: 'JAVA_SPECIALTY',
      targetSkillDomain: skill.domainCode,
      targetSkillCodes: skill.code
    }
  })
}

onMounted(fetchAbilityMap)
</script>

<style scoped lang="scss">
.ability-map {
  color: var(--app-text);
}

.map-head,
.stats-grid article,
.domain-list,
.skill-panel,
.skill-card {
  border: 1px solid var(--app-border);
  border-radius: var(--cc-radius-xl);
  background: rgba(15, 23, 42, 0.74);
  box-shadow: var(--app-shadow);
}

.map-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 24px;

  h1 {
    margin: 8px 0;
    font-size: 28px;
  }

  p {
    margin: 0;
    color: var(--app-text-muted);
  }
}

.eyebrow,
.head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.eyebrow {
  color: var(--cc-ai-cyan);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.head-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;

  article {
    padding: 18px;
  }

  span {
    color: var(--app-text-muted);
  }

  strong {
    display: block;
    margin-top: 6px;
    font-size: 26px;
  }
}

.empty-alert,
.load-error {
  margin-top: 2px;
}

.load-error {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #fca5a5;
}

.map-grid {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 16px;
}

.domain-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-self: start;
  padding: 12px;
}

.domain-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 42px;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--app-text);
  cursor: pointer;
  text-align: left;

  em {
    color: var(--app-text-muted);
    font-style: normal;
    font-size: 12px;
  }

  &.active,
  &:hover {
    border-color: rgba(129, 140, 248, 0.52);
    background: rgba(99, 102, 241, 0.14);
  }
}

.skill-panel {
  padding: 18px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;

  h2 {
    margin: 0;
    font-size: 18px;
  }

  p {
    margin: 6px 0 0;
    color: var(--app-text-muted);
    font-size: 13px;
  }
}

.skill-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.skill-card {
  display: flex;
  min-height: 188px;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: rgba(2, 6, 23, 0.32);

  p {
    flex: 1;
    margin: 0;
    color: var(--app-text-muted);
    line-height: 1.6;
  }
}

.skill-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  strong,
  span {
    display: block;
  }

  span {
    margin-top: 4px;
    color: var(--app-text-muted);
    font-size: 12px;
  }
}

.skill-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--app-text-muted);
  font-size: 12px;
}

.skill-action {
  align-self: flex-end;
}

@media (max-width: 980px) {
  .map-grid,
  .skill-grid,
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .map-head {
    flex-direction: column;
  }
}
</style>
