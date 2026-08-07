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
              :class="{
                'is-unavailable': item.enabled === false,
                'has-enter-link': item.path === '/ability-map' && item.enabled !== false
              }"
              :data-tool-path="item.path"
              type="button"
              :disabled="item.enabled === false"
              :title="item.enabled === false ? `${item.title}暂未开放` : undefined"
              :aria-label="item.enabled === false ? `${item.title}，暂未开放` : `${item.title}，${item.description}`"
              @click="openTool(item)"
            >
              <span class="arena-tools__icon" :class="`is-${group.key}`">
                <span aria-hidden="true">{{ item.icon }}</span>
              </span>
              <span class="arena-tools__copy">
                <strong>{{ item.title }}</strong>
                <small>{{ item.enabled === false ? '暂未开放' : item.description }}</small>
              </span>
              <span
                class="arena-tools__arrow"
                :class="{ 'is-enter': item.path === '/ability-map' && item.enabled !== false }"
                aria-hidden="true"
              >
                <template v-if="item.enabled === false">暂未开放</template>
                <template v-else-if="item.path === '/ability-map'">
                  <span class="arena-tools__enter">进入 ›</span>
                </template>
                <template v-else>›</template>
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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
      { title: '投递管理', description: '1 条推进中 · 无逾期', path: '/applications', icon: '📮' },
      { title: '求职日历', description: '跨投递的安排与提醒', path: '/career-calendar', icon: '📅' }
    ]
  },
  {
    key: 'assets',
    title: '资产',
    icon: '🎒',
    items: [
      { title: '项目证据库', description: '沉淀可追问的项目素材', path: '/project-evidence', icon: '🗂' },
      { title: '投递包', description: '组合简历、材料与导出', path: '/application-packages', icon: '📦' },
      {
        title: '个人知识库',
        description: appConfig.enableV4KnowledgePreview ? '私域资料与引用来源' : '当前环境暂未开放',
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
      { title: '能力图谱', description: '技能树 · 已点亮 9/14', path: '/ability-map', icon: '🌳' },
      {
        title: '求职周报',
        description: '本周事实、变化与下一步',
        path: '/agent/weekly-reports',
        icon: '📊',
        enabled: appConfig.enableV6WeeklyReport
      },
      { title: '训练分析', description: '正确率与个人趋势', path: '/analytics/personal', icon: '📉' }
    ]
  },
  {
    key: 'other',
    title: '其他',
    icon: '⚙️',
    items: [
      { title: '求职实验台', description: '策略分组与复盘', path: '/job-experiments', icon: '🧪' },
      { title: '作品集演示', description: '可展示的项目成果', path: '/portfolio-demo', icon: '🖼' },
      { title: '新手引导', description: '重走一遍上手路线', path: '/onboarding', icon: '🧭' }
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
  if (item.enabled === false) return

  void router.push(item.path)
}
</script>

<style scoped lang="scss">
.arena-tools {
  min-width: 0;
}

.arena-tools__page {
  width: min(100%, 760px);
  margin: 0 auto;
  // The prototype's 760px page width includes the 34px desktop page inset.
  // Keep the content column aligned with the other Direction D screens.
  padding: 28px 34px 42px;
}

.arena-tools__head {
  display: grid;
  gap: 8px;
  margin-bottom: 0;
}

.arena-tools__grid {
  display: grid;
  gap: 0;
}

.arena-tools__group-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 18px 2px 10px;
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
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;
  min-height: 62px;
  padding: 13px 16px;
  border: 1.5px solid var(--arena-line);
  border-radius: var(--arena-radius-card);
  background: var(--arena-card);
  box-shadow: var(--arena-shadow-card);
  color: var(--arena-ink);
  font: inherit;
  cursor: pointer;
  text-align: left;
  appearance: none;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;

  &:hover {
    border-color: var(--arena-grn);
    background: var(--arena-grn-soft);
    box-shadow: var(--arena-shadow-hover);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--arena-grn);
    outline-offset: 2px;
  }

  &.is-unavailable {
    cursor: not-allowed;
    background: var(--arena-card);
    pointer-events: none;

    .arena-tools__icon {
      filter: none;
      opacity: 1;
    }

    .arena-tools__copy strong {
      color: var(--arena-ink);
    }

    .arena-tools__arrow {
      color: var(--arena-sub);
    }

    .arena-tools__copy small {
      color: var(--user-warning-text);
    }

    &:hover,
    &:focus-visible,
    &:active {
      border-color: var(--arena-line);
      background: var(--arena-card);
      box-shadow: var(--arena-shadow-card);
      transform: none;
      outline: 0;
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
  font-size: 16px;
  line-height: 1;
  white-space: nowrap;

  &.is-enter {
    color: var(--arena-grn-d);
    font-size: 13px;
    font-weight: 800;
  }
}

.arena-tools__enter {
  color: var(--arena-grn-d);
  font-size: 13px;
  font-weight: 800;
}

@media (max-width: 720px) {
  .arena-tools__page {
    width: 100%;
    padding: 18px 14px 8px;
  }

  .arena-tools__head {
    margin-bottom: 20px;
  }

  .arena-tools__row {
    min-height: 64px;
    padding: 12px 14px;
  }
}
</style>
