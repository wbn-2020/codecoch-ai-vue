<template>
  <div class="arena arena-tools records-tools-page page-shell">
    <div class="arena-tools__page">
      <header class="arena-tools__head">
        <h1 class="arena-h1">背包与仓库</h1>
        <p class="arena-p">主线闯关之外的能力，都收在这里。</p>
      </header>

      <section
        v-for="group in visibleGroups"
        :key="group.key"
        class="arena-tools__group"
        :aria-labelledby="`tools-group-${group.key}`"
      >
        <h2 :id="`tools-group-${group.key}`" class="arena-tools__group-title">
          <component :is="group.icon" :size="16" aria-hidden="true" />
          {{ group.title }}
        </h2>

        <div class="arena-tools__rows">
          <button
            v-for="item in group.items"
            :key="item.path"
            class="arena-tools__row"
            type="button"
            @click="router.push(item.path)"
          >
            <span class="arena-tools__icon" :class="`is-${group.key}`">
              <component :is="item.icon" :size="18" aria-hidden="true" />
            </span>
            <span class="arena-tools__copy">
              <strong>{{ item.title }}</strong>
              <small>{{ item.description }}</small>
            </span>
            <span v-if="item.path === '/ability-map'" class="arena-tools__enter">进入</span>
            <ChevronRight v-else class="arena-tools__arrow" :size="18" aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FolderKanban,
  GraduationCap,
  Library,
  PackageCheck,
  Presentation,
  Sparkles,
  TrendingUp,
  Wrench
} from 'lucide-vue-next'
import type { Component } from 'vue'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { appConfig } from '@/config'

interface ToolItem {
  title: string
  description: string
  path: string
  icon: Component
  enabled?: boolean
}

interface ToolGroup {
  key: 'progress' | 'assets' | 'growth' | 'other'
  title: string
  icon: Component
  items: ToolItem[]
}

const router = useRouter()

const groups: ToolGroup[] = [
  {
    key: 'progress',
    title: '进度',
    icon: TrendingUp,
    items: [
      { title: '投递管理', description: '推进中的机会、跟进和材料状态。', path: '/applications', icon: BriefcaseBusiness },
      { title: '求职日历', description: '跨投递的安排与提醒。', path: '/career-calendar', icon: CalendarDays }
    ]
  },
  {
    key: 'assets',
    title: '资产',
    icon: FolderKanban,
    items: [
      { title: '项目证据库', description: '沉淀可追问的项目素材。', path: '/project-evidence', icon: FolderKanban },
      { title: '投递包', description: '组合简历、材料与导出。', path: '/application-packages', icon: PackageCheck },
      {
        title: '个人知识库',
        description: '私域资料与引用来源。',
        path: '/knowledge',
        icon: Library,
        enabled: appConfig.enableV4KnowledgePreview
      }
    ]
  },
  {
    key: 'growth',
    title: '成长',
    icon: Sparkles,
    items: [
      { title: '能力图谱', description: '技能树、战力和下一项高价值训练。', path: '/ability-map', icon: Sparkles },
      {
        title: '求职周报',
        description: '本周事实、变化与下一步。',
        path: '/agent/weekly-reports',
        icon: ClipboardList,
        enabled: appConfig.enableV6WeeklyReport
      },
      { title: '训练分析', description: '正确率与个人趋势。', path: '/analytics/personal', icon: BarChart3 }
    ]
  },
  {
    key: 'other',
    title: '其他',
    icon: Wrench,
    items: [
      { title: '求职实验台', description: '策略分组与复盘。', path: '/job-experiments', icon: Wrench },
      { title: '作品集演示', description: '可展示的项目成果。', path: '/portfolio-demo', icon: Presentation },
      { title: '新手引导', description: '重走一遍上手路线。', path: '/onboarding', icon: GraduationCap }
    ]
  }
]

const visibleGroups = computed(() =>
  groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.enabled !== false)
    }))
    .filter((group) => group.items.length > 0)
)
</script>

<style scoped lang="scss">
.arena-tools {
  min-width: 0;
}

.arena-tools__page {
  width: min(100%, 760px);
  margin: 0 auto;
  padding: 2px 0 30px;
}

.arena-tools__head {
  display: grid;
  gap: 8px;
  margin-bottom: 24px;
}

.arena-tools__group + .arena-tools__group {
  margin-top: 24px;
}

.arena-tools__group-title {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 2px 10px;
  color: var(--arena-mut);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 1px;
}

.arena-tools__rows {
  display: grid;
  gap: 10px;
}

.arena-tools__row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 20px;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;
  padding: 13px 16px;
  border: 1.5px solid var(--arena-line);
  border-radius: 16px;
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
}

.arena-tools__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  color: var(--arena-grn-d);
  background: var(--arena-grn-soft);

  &.is-assets {
    color: var(--arena-vio);
    background: var(--arena-vio-soft);
  }

  &.is-growth {
    color: var(--arena-amber);
    background: var(--arena-amber-soft);
  }

  &.is-other {
    color: var(--arena-sub);
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
    padding-bottom: 8px;
  }

  .arena-tools__head {
    margin-bottom: 20px;
  }

  .arena-tools__group + .arena-tools__group {
    margin-top: 20px;
  }

  .arena-tools__row {
    min-height: 64px;
    padding: 12px 14px;
  }
}
</style>
