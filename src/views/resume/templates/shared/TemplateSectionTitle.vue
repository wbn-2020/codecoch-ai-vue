<template>
  <div class="template-section-title" :class="`template-section-title--${tone}`">
    <h3>{{ title }}</h3>
    <span aria-hidden="true"></span>
  </div>
</template>

<script setup lang="ts">
const { tone = 'rule' } = defineProps<{
  title: string
  tone?: 'rule' | 'band' | 'classic' | 'twocol' | 'timeline' | 'minimal' | 'serif'
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

/* 全局规则 body.is-user-layout-active .jobcoach-layout :is(h1,h2,h3,…)
   会渗透到简历预览，把标题强制成 --user-text（近黑）。
   简历区标题必须锁定为各自的设计色，故关键色值使用 !important。 */

h3 {
  flex: 0 0 auto;
  margin: 0;
  color: var(--template-accent-strong) !important;
  font-size: calc(13px * var(--template-font-scale, 1));
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.35;
}

/* rule（默认）：强调色标题 + 强调色细分隔线（现代简历主流处理） */
span {
  flex: 1 1 auto;
  height: 1px;
  background: color-mix(in srgb, var(--template-accent) 42%, white);
}

/* band（对标原型 banner）：实底强调色 + 白字 */
.template-section-title--band h3 {
  padding: 4px 10px;
  background: var(--template-accent);
  color: #fff !important;
}
.template-section-title--band span {
  display: none;
}

/* classic（对标原型 classic / twocol）：左侧强调色竖条 + 强调色标题 */
.template-section-title--classic {
  display: block;
}
.template-section-title--classic h3 {
  border-left: 3px solid var(--template-accent);
  padding-left: 9px;
  width: 100%;
}
.template-section-title--classic span {
  display: none;
}

/* twocol（对标原型 twocol）：左侧 4px 强调色竖条 + 字距 + 强调色标题 */
.template-section-title--twocol {
  display: block;
}
.template-section-title--twocol h3 {
  border-left: 4px solid var(--template-accent);
  padding-left: 8px;
  letter-spacing: 0.5px;
  width: 100%;
}
.template-section-title--twocol span {
  display: none;
}

/* timeline（对标原型 timeline）：大写 + 字距 + 强调色下边框 */
.template-section-title--timeline {
  display: block;
}
.template-section-title--timeline h3 {
  text-transform: uppercase;
  letter-spacing: 1.5px;
  font-size: calc(13px * var(--template-font-scale, 1));
  padding-bottom: 4px;
  border-bottom: 2px solid var(--template-accent);
  width: 100%;
}
.template-section-title--timeline span {
  display: none;
}

/* minimal（对标原型 minimal）：中性细下边框，无强调色 */
.template-section-title--minimal {
  display: block;
  margin: 0 0 8px;
}
.template-section-title--minimal h3 {
  color: var(--template-ink) !important;
  font-weight: 600;
  padding-bottom: 4px;
  border-bottom: 1px solid #ddd;
  width: 100%;
}
.template-section-title--minimal span {
  display: none;
}

/* serif（对标原型 hybrid 画报风）：衬线中性标题 + 细下边框 */
.template-section-title--serif {
  display: block;
}
.template-section-title--serif h3 {
  color: var(--template-ink) !important;
  font-family: var(--font-serif, Georgia, "Times New Roman", serif);
  font-size: calc(16px * var(--template-font-scale, 1));
  font-weight: 600;
  letter-spacing: 0.01em;
  padding-bottom: 5px;
  border-bottom: 1px solid color-mix(in srgb, var(--template-ink) 13%, white);
  width: 100%;
}
.template-section-title--serif span {
  display: none;
}
</style>
