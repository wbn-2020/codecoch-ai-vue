<template>
  <RouterView v-slot="{ Component }">
    <Suspense>
      <component :is="Component" />
      <template #fallback>
        <main class="app-route-loading">
          <section class="app-route-loading__panel">
            <span class="app-route-loading__mark">C</span>
            <strong>CodeCoachAI 正在加载</strong>
            <p>正在确认登录状态和页面资源...</p>
          </section>
        </main>
      </template>
    </Suspense>
  </RouterView>
</template>

<style scoped lang="scss">
.app-route-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background:
    linear-gradient(135deg, rgb(37 99 235 / 10%), transparent 42%),
    linear-gradient(315deg, rgb(15 118 110 / 10%), transparent 38%),
    var(--app-bg);
}

.app-route-loading__panel {
  display: grid;
  justify-items: center;
  gap: 10px;
  width: min(100%, 360px);
  padding: 32px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
  box-shadow: var(--app-shadow);
  text-align: center;

  strong {
    font-size: 18px;
  }

  p {
    margin: 0;
    color: var(--app-text-muted);
    font-size: 14px;
  }
}

.app-route-loading__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--app-primary);
  color: #fff;
  font-weight: 700;
}
</style>
