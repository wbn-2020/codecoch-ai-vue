<template>
  <div class="page-shell pending-integration-page">
    <section class="pending-hero cc-glass--ai">
      <div>
        <div class="pending-eyebrow">
          <PlugZap :size="16" />
          <span>{{ eyebrow }}</span>
        </div>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
      </div>
      <el-tag type="warning" effect="plain">未联调</el-tag>
    </section>

    <section class="content-card cc-glass">
      <div class="content-card__body pending-grid">
        <AppState
          type="api-pending"
          title="接口待确认"
          description="当前页面只保留入口和契约说明，不展示未联调的列表、表单或危险操作。"
        />

        <div class="pending-contract">
          <h2>计划接口</h2>
          <ul>
            <li v-for="item in apiItems" :key="item">
              <code>{{ item }}</code>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section v-if="safeLinks.length" class="content-card cc-glass">
      <div class="content-card__body">
        <h2>可用入口</h2>
        <div class="pending-actions">
          <el-button
            v-for="link in safeLinks"
            :key="link.label"
            :type="link.type || 'default'"
            @click="router.push(link.to)"
          >
            {{ link.label }}
          </el-button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { PlugZap } from 'lucide-vue-next'
import type { RouteLocationRaw } from 'vue-router'
import { useRouter } from 'vue-router'

import AppState from '@/components/common/AppState.vue'

withDefaults(
  defineProps<{
    title: string
    description: string
    eyebrow?: string
    apiItems?: string[]
    safeLinks?: Array<{ label: string; to: RouteLocationRaw; type?: 'primary' | 'success' | 'warning' | 'danger' | 'info' }>
  }>(),
  {
    eyebrow: 'Pending Integration',
    apiItems: () => [],
    safeLinks: () => []
  }
)

const router = useRouter()
</script>

<style scoped lang="scss">
.pending-integration-page {
  gap: 20px;
}

.pending-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 28px;
  border-radius: var(--cc-radius-xl);

  h1 {
    margin: 14px 0 0;
    color: var(--app-text);
    font-size: 30px;
  }

  p {
    max-width: 760px;
    margin: 10px 0 0;
    color: var(--app-text-muted);
    line-height: 1.7;
  }
}

.pending-eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--cc-ai-cyan);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.pending-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 420px);
  gap: 18px;
}

.pending-contract {
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.34);

  h2 {
    margin: 0 0 12px;
    font-size: 16px;
  }

  ul {
    display: grid;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  code {
    display: block;
    overflow-wrap: anywhere;
    padding: 10px 12px;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.62);
    color: #bfdbfe;
  }
}

.pending-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

@media (max-width: 860px) {
  .pending-hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .pending-grid {
    grid-template-columns: 1fr;
  }
}
</style>
