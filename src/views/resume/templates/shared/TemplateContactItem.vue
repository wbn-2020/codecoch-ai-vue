<template>
  <span class="template-contact-item document-contact__item">
    <component
      v-if="model?.iconMode !== 'HIDDEN'"
      :is="icon"
      :size="14"
      :stroke-width="1.8"
      aria-hidden="true"
    />
    <span v-if="contact.showLabel || showLabel" class="template-contact-item__label">
      {{ contact.label }}
    </span>
    <span class="template-contact-item__value">{{ contact.value }}</span>
  </span>
</template>

<script setup lang="ts">
import {
  BriefcaseBusiness,
  Circle,
  GraduationCap,
  Mail,
  Phone,
  UserRound
} from 'lucide-vue-next'
import { computed } from 'vue'

import type {
  ResumeContactModel,
  ResumeRenderModel
} from '@/features/resume-template/schema'

const props = withDefaults(defineProps<{
  contact: ResumeContactModel
  model?: ResumeRenderModel
  showLabel?: boolean
}>(), {
  model: undefined,
  showLabel: false
})

const icon = computed(() => ({
  phone: Phone,
  mail: Mail,
  user: UserRound,
  briefcase: BriefcaseBusiness,
  'graduation-cap': GraduationCap,
  circle: Circle
}[props.contact.iconKey] || Circle))
</script>

<style scoped>
.template-contact-item {
  display: inline-flex;
  min-width: 0;
  align-items: flex-start;
  gap: 6px;
  color: var(--template-muted);
  font-size: calc(10.5px * var(--template-font-scale, 1));
  line-height: 1.45;
}

.template-contact-item :deep(svg) {
  flex: 0 0 auto;
  margin-top: 2px;
  color: var(--template-accent-strong);
}

.template-contact-item__label {
  color: var(--template-accent-strong);
  font-weight: 700;
}

.template-contact-item__value {
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>
