<template>
  <div class="arena arena-tools records-tools-page page-shell">
    <div class="arena-tools__page">
      <header class="arena-tools__head">
        <h1 class="arena-h1">背包与仓库 <span aria-hidden="true">🧰</span></h1>
        <p class="arena-p">主线闯关之外的能力，都收在这里。</p>
      </header>

      <div class="arena-tools__grid">
        <section
          v-for="group in visibleGroups"
          :key="group.key"
          class="arena-tools__group"
          :aria-labelledby="`tools-group-${group.key}`"
        >
          <h2 :id="`tools-group-${group.key}`" class="arena-tools__group-title">
            <span class="arena-tools__group-symbol" aria-hidden="true">{{ group.icon }}</span>
            {{ group.title }}
          </h2>

          <div class="arena-tools__rows">
            <button
              v-for="item in group.items"
              :key="item.path"
              class="arena-tools__row"
              :class="{ 'is-unavailable': item.enabled === false }"
              type="button"
              :aria-disabled="item.enabled === false"
              :title="item.enabled === false ? `${item.title}暂未开放` : undefined"
              @click="openTool(item)"
            >
              <span class="arena-tools__icon" :class="`is-${group.key}`">
                <span aria-hidden="true">{{ item.icon }}</span>
              </span>
              <span class="arena-tools__copy">
                <strong>{{ item.title }}</strong>
                <small>{{ item.enabled === false ? '暂未开放' : item.description }}</small>
              </span>
              <span v-if="item.path === '/ability-map'" class="arena-tools__enter">进入</span>
              <LockKeyhole
                v-else-if="item.enabled === false"
                class="arena-tools__arrow"
                :size="16"
                aria-label="暂未开放"
              />
              <ChevronRight v-else class="arena-tools__arrow" :size="18" aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { ChevronRight, LockKeyhole } from 'lucide-vue-next'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { appConfig } from '@/config'

interface ToolItem {
  title: string
  description: string
  path: string
  icon: string
  enabled?: boolean
}

interface ToolGroup {
  key: 'progress' | 'assets' | 'growth' | 'other'
  title: string
  icon: string
  items: ToolItem[]
}

const router = useRouter()

const groups: ToolGroup[] = [
  {
    key: 'progress',
    title: '进度',
    icon: '📈',
    items: [
      { title: '投递管理', description: '推进中的机会、跟进和材料状态。', path: '/applications', icon: '📮' },
      { title: '求职日历', description: '跨投递的安排与提醒。', path: '/career-calendar', icon: '📅' }
    ]
  },
  {
    key: 'assets',
    title: '资产',
    icon: '🎒',
    items: [
      { title: '项目证据库', description: '沉淀可追问的项目素材。', path: '/project-evidence', icon: '🗂' },
      { title: '投递包', description: '组合简历、材料与导出。', path: '/application-packages', icon: '📦' },
      {
        title: '个人知识库',
        description: '私域资料与引用来源。',
        path: '/knowledge',
        icon: '📚',
        enabled: appConfig.enableV4KnowledgePreview
      }
    ]
  },
  {
    key: 'growth',
    title: '成长',
    icon: '🌱',
    items: [
      { title: '能力图谱', description: '技能树、战力和下一项高价值训练。', path: '/ability-map', icon: '🌳' },
      {
        title: '求职周报',
        description: '本周事实、变化与下一步。',
        path: '/agent/weekly-reports',
        icon: '📊',
        enabled: appConfig.enableV6WeeklyReport
      },
      { title: '训练分析', description: '正确率与个人趋势。', path: '/analytics/personal', icon: '📉' }
    ]
  },
  {
    key: 'other',
    title: '其他',
    icon: '⚙️',
    items: [
      { title: '求职实验台', description: '策略分组与复盘。', path: '/job-experiments', icon: '🧪' },
      { title: '作品集演示', description: '可展示的项目成果。', path: '/portfolio-demo', icon: '🖼' },
      { title: '新手引导', description: '重走一遍上手路线。', path: '/onboarding', icon: '🧭' }
    ]
  }
]

const visibleGroups = computed(() =>
  groups
    .map((group) => ({
      ...group,
      items: group.items
    }))
    .filter((group) => group.items.length > 0)
)

function openTool(item: ToolItem) {
  if (item.enabled === false) {
    ElMessage.info(`${item.title}暂未开放`)
    return
  }
  void router.push(item.path)
}
</script>

<style scoped lang="scss">
.arena-tools {
  min-width: 0;
}

.arena-tools__page {
  width: min(100%, 1060px);
  margin: 0 auto;
  padding: 2px 0 42px;
}

.arena-tools__head {
  display: grid;
  gap: 8px;
  margin-bottom: 24px;
}

.arena-tools__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 26px 22px;
  align-items: start;
}

.arena-tools__group-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 2px 10px;
  color: var(--arena-mut);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 1px;
}

.arena-tools__group-symbol {
  font-size: 14px;
  line-height: 1;
}

.arena-tools__rows {
  display: grid;
  gap: 14px;
}

.arena-tools__row {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) 20px;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;
  padding: 13px 16px;
  border: 1.5px solid var(--arena-line);
  border-radius: 20px;
  background: var(--arena-card);
  color: var(--arena-ink);
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    transform 0.15s ease;

  &:hover {
    border-color: var(--arena-grn);
    background: var(--arena-grn-soft);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--arena-grn);
    outline-offset: 2px;
  }

  &.is-unavailable {
    cursor: not-allowed;
    opacity: 0.62;

    &:hover {
      transform: none;
      border-color: var(--arena-line);
      background: var(--arena-card);
    }
  }
}

.arena-tools__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: var(--arena-grn-soft);
  font-size: 17px;

  &.is-assets {
    color: var(--arena-vio);
    background: var(--arena-vio-soft);
  }

  &.is-growth {
    color: var(--arena-amber);
    background: var(--arena-amber-soft);
  }

  &.is-other {
    background: var(--arena-line2);
  }
}

.arena-tools__copy {
  display: grid;
  min-width: 0;
  gap: 3px;

  strong {
    color: var(--arena-ink);
    font-size: 13.5px;
    line-height: 1.35;
  }

  small {
    color: var(--arena-mut);
    font-size: 11.5px;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }
}

.arena-tools__arrow {
  color: var(--arena-mut);
}

.arena-tools__enter {
  color: var(--arena-grn-d);
  font-size: 12px;
  font-weight: 900;
}

@media (max-width: 720px) {
  .arena-tools__page {
    width: 100%;
    padding: 14px 0 8px;
  }

  .arena-tools__head {
    margin-bottom: 20px;
  }

  .arena-tools__grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .arena-tools__row {
    min-height: 64px;
    padding: 12px 14px;
  }
}
</style>
