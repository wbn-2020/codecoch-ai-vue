<template>
  <div class="v3-foundation-page">
    <section class="v3-hero">
      <div class="v3-hero__copy">
        <div class="v3-eyebrow">
          <component :is="icon" :size="16" />
          <span>{{ eyebrow }}</span>
        </div>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
        <div v-if="actions.length" class="v3-hero__actions">
          <el-button
            v-for="action in actions"
            :key="action.label"
            :type="action.type || 'default'"
            :disabled="action.disabled"
            @click="go(action.to)"
          >
            {{ action.label }}
          </el-button>
        </div>
      </div>
      <div class="v3-hero__panel">
        <span class="v3-status-pill">{{ statusLabel }}</span>
        <strong>V3 前端基础骨架</strong>
        <p>本页提供真实路由入口和联调状态说明，不展示演示业务结果。</p>
      </div>
    </section>

    <div class="v3-grid">
      <section class="v3-section">
        <div class="v3-section__head">
          <span>数据契约</span>
          <el-tag effect="plain" type="success">真实数据</el-tag>
        </div>
        <ul class="v3-api-list">
          <li v-for="item in apiItems" :key="item">
            <code>{{ item }}</code>
          </li>
        </ul>
      </section>

      <section class="v3-section">
        <div class="v3-section__head">
          <span>当前范围</span>
          <el-tag effect="plain" type="warning">待实现业务区块</el-tag>
        </div>
        <ul class="v3-scope-list">
          <li v-for="item in scopeItems" :key="item">{{ item }}</li>
        </ul>
      </section>
    </div>

    <AppState
      :type="stateType"
      :title="stateTitle"
      :description="stateDescription"
    />
  </div>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { useRouter } from 'vue-router'
import { Boxes } from 'lucide-vue-next'

import AppState from '@/components/common/AppState.vue'
import type { V3FoundationShellProps } from '../foundation'

const router = useRouter()

withDefaults(
  defineProps<V3FoundationShellProps>(),
  {
    actions: () => [],
    icon: Boxes,
    stateType: 'api-pending'
  }
)

const go = (to: RouteLocationRaw) => {
  router.push(to)
}
</script>

<style scoped lang="scss">
.v3-foundation-page {
  display: grid;
  gap: 20px;
}

.v3-hero,
.v3-section {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.76);
  box-shadow: var(--app-shadow);
}

.v3-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 22px;
  padding: 26px;
}

.v3-hero__copy {
  min-width: 0;

  h1 {
    margin: 10px 0;
    color: var(--app-text);
    font-size: 30px;
    line-height: 1.2;
  }

  p {
    max-width: 760px;
    margin: 0;
    color: var(--app-text-muted);
    line-height: 1.8;
  }
}

.v3-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--cc-ai-cyan);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.v3-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 22px;
}

.v3-hero__panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.42);

  strong {
    color: var(--app-text);
    font-size: 18px;
  }

  p {
    margin: 0;
    color: var(--app-text-muted);
    line-height: 1.7;
  }
}

.v3-status-pill {
  width: fit-content;
  padding: 5px 10px;
  border: 1px solid rgba(129, 140, 248, 0.38);
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.14);
  color: var(--cc-primary-hover);
  font-size: 12px;
}

.v3-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.v3-section {
  padding: 20px;
}

.v3-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  color: var(--app-text);
  font-weight: 700;
}

.v3-api-list,
.v3-scope-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.v3-api-list code {
  display: block;
  overflow-wrap: anywhere;
  padding: 10px 12px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.48);
  color: #bfdbfe;
}

.v3-scope-list li {
  position: relative;
  padding-left: 18px;
  color: var(--app-text-muted);
  line-height: 1.7;
}

.v3-scope-list li::before {
  position: absolute;
  top: 0.72em;
  left: 0;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--cc-ai-cyan);
  content: '';
}

@media (max-width: 980px) {
  .v3-hero,
  .v3-grid {
    grid-template-columns: 1fr;
  }
}
</style>
