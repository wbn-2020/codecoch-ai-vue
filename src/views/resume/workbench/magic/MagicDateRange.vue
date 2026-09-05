<template>
  <div class="magic-date-range">
    <el-date-picker
      class="magic-date-range__picker"
      :model-value="start"
      type="month"
      format="YYYY/MM"
      value-format="YYYY/MM"
      placeholder="开始时间"
      aria-label="开始时间"
      :clearable="false"
      @update:model-value="handleStart"
    />
    <span class="magic-date-range__sep">-</span>
    <el-date-picker
      class="magic-date-range__picker"
      :model-value="end"
      type="month"
      format="YYYY/MM"
      value-format="YYYY/MM"
      placeholder="结束时间"
      aria-label="结束时间"
      :clearable="false"
      :disabled="isPresent"
      @update:model-value="handleEnd"
    />
    <label class="magic-date-range__present">
      <button
        type="button"
        class="magic-switch"
        :class="{ 'is-on': isPresent }"
        :aria-pressed="isPresent"
        aria-label="至今"
        @click="togglePresent"
      ><i /></button>
      <span>至今</span>
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: string
}>(), {
  modelValue: ''
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const SEPARATORS = /\s*(?:-|–|—)\s*/

const parts = computed(() => {
  const raw = props.modelValue || ''
  const [start = '', end = ''] = raw.split(SEPARATORS)
  return { start: start.trim(), end: end.trim() }
})

const start = computed(() => (/^\d{4}\/\d{2}$/.test(parts.value.start) ? parts.value.start : ''))
const end = computed(() => {
  const value = parts.value.end
  if (/^\d{4}\/\d{2}$/.test(value)) return value
  return ''
})

const isPresent = computed(() => parts.value.end.includes('至今') || parts.value.end.includes('Present'))

const commit = (nextStart: string, nextEnd: string) => {
  const value = [nextStart, nextEnd].filter(Boolean).join(' - ')
  emit('update:modelValue', value)
}

const handleStart = (value: string | null) => {
  commit(value || '', isPresent.value ? '至今' : parts.value.end)
}

const handleEnd = (value: string | null) => {
  commit(parts.value.start, value || '')
}

const togglePresent = () => {
  commit(parts.value.start, isPresent.value ? '' : '至今')
}
</script>

<style scoped lang="scss">
.magic-date-range {
  display: flex;
  align-items: center;
  gap: 8px;
}

.magic-date-range__picker {
  flex: 1;
  min-width: 0;

  :deep(.el-input__wrapper) {
    border-radius: 8px;
  }
}

.magic-date-range__sep {
  flex: 0 0 auto;
  color: #9ca3af;
}

.magic-date-range__present {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  color: #6b7280;
  font-size: 12px;
  white-space: nowrap;
}

.magic-switch {
  position: relative;
  width: 34px;
  height: 19px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: #d1d5db;
  cursor: pointer;
  transition: background 0.18s ease;

  i {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 15px;
    height: 15px;
    border-radius: 999px;
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    transition: transform 0.18s ease;
  }

  &.is-on {
    background: var(--el-color-primary, #0047ab);

    i { transform: translateX(15px); }
  }
}
</style>
