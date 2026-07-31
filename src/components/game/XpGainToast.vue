<template>
  <div class="xp-toast-layer" aria-live="polite">
    <transition-group name="xp-toast">
      <div
        v-for="item in visible"
        :key="item.id"
        class="xp-toast"
        :class="{ 'xp-toast--big': item.grant.xp >= 100 }"
      >
        <span class="xp-toast__icon">{{ item.grant.xp >= 100 ? '🏆' : '◆' }}</span>
        <b>+{{ item.grant.xp }} XP</b>
        <span class="xp-toast__label">{{ item.grant.label }}</span>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

import { useGameProfileStore } from '@/features/game-profile'
import type { XpGrant } from '@/features/game-profile'

interface VisibleGrant {
  id: number
  grant: XpGrant
}

const HOLD_MS = 1500

const gameProfile = useGameProfileStore()
const visible = ref<VisibleGrant[]>([])
let nextId = 0
const timers = new Set<ReturnType<typeof window.setTimeout>>()

watch(
  () => gameProfile.lastGrant,
  (grant) => {
    if (!grant) return
    const item: VisibleGrant = { id: ++nextId, grant }
    visible.value = [...visible.value.slice(-2), item]
    const timer = window.setTimeout(() => {
      visible.value = visible.value.filter((entry) => entry.id !== item.id)
      timers.delete(timer)
    }, HOLD_MS + 400)
    timers.add(timer)
    gameProfile.clearLastGrant()
  }
)

onBeforeUnmount(() => {
  timers.forEach((timer) => window.clearTimeout(timer))
  timers.clear()
})
</script>

<style scoped lang="scss">
.xp-toast-layer {
  position: fixed;
  top: 74px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.xp-toast {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  border-radius: 999px;
  background: rgba(21, 33, 27, 0.92);
  border: 1.5px solid rgba(163, 230, 53, 0.55);
  box-shadow: 0 6px 20px rgba(21, 33, 27, 0.35), 0 0 14px rgba(163, 230, 53, 0.25);
  color: #eaffd0;
  font-size: 13px;

  b {
    font-size: 14px;
    font-weight: 900;
    color: #a3e635;
  }

  &__icon {
    font-size: 13px;
  }

  &__label {
    font-size: 12px;
    color: rgba(234, 255, 208, 0.75);
  }

  &--big {
    border-color: rgba(247, 185, 85, 0.65);
    box-shadow: 0 6px 20px rgba(21, 33, 27, 0.35), 0 0 16px rgba(247, 185, 85, 0.35);

    b {
      color: #f7b955;
    }
  }
}

/* 克制动效：200ms 入场、250ms 离场 */
.xp-toast-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.xp-toast-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.xp-toast-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.92);
}

.xp-toast-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
}

@media (max-width: 720px) {
  .xp-toast-layer {
    top: 64px;
    width: max-content;
    max-width: calc(100vw - 32px);
  }
}
</style>
