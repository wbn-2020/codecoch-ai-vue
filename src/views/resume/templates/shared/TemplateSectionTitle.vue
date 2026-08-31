<template>
  <div class="template-section-title" :class="`template-section-title--${tone}`">
    <h3>{{ title }}</h3>
    <span aria-hidden="true"></span>
  </div>
</template>

<script setup lang="ts">
const { tone = 'rule' } = defineProps<{
  title: string
  tone?: 'rule' | 'band'
}>()
</script>

<style scoped>
.template-section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 10px;
  break-after: avoid;
}

h3 {
  flex: 0 0 auto;
  margin: 0;
  color: var(--template-accent-strong);
  font-size: calc(13px * var(--template-font-scale, 1));
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.35;
}

span {
  flex: 1 1 auto;
  height: 1px;
  background: color-mix(in srgb, var(--template-accent) 45%, white);
}

.template-section-title--band h3 {
  padding: 4px 10px;
  background: var(--template-accent);
  color: #fff;
}
</style>
