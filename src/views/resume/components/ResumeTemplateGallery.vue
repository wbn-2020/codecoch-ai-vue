<template>
  <el-dialog
    :model-value="modelValue"
    class="resume-template-gallery-dialog"
    width="min(1080px, 94vw)"
    align-center
    append-to-body
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #header>
      <div class="resume-template-gallery__header">
        <div>
          <h2>选择简历模板</h2>
          <p>模板只改变版式，不会修改已经填写的简历内容。</p>
        </div>
        <span>{{ unlockedCount }}/{{ templates.length }} 可用</span>
      </div>
    </template>

    <div class="resume-template-gallery">
      <div class="resume-template-gallery__grid" role="radiogroup" aria-label="选择简历模板">
        <button
          v-for="template in templates"
          :key="template.code"
          type="button"
          role="radio"
          :aria-checked="pendingCode === template.code"
          :aria-disabled="!isUnlocked(template)"
          :tabindex="pendingCode === template.code ? 0 : -1"
          :class="{ 'is-active': pendingCode === template.code, 'is-locked': !isUnlocked(template) }"
          :disabled="!isUnlocked(template)"
          @click="emit('select', template.code)"
          @keydown="moveSelection($event, template.code)"
        >
          <span class="resume-template-gallery__preview" :class="`is-${template.className}`">
            <i></i><i></i><i></i><i></i>
          </span>
          <span class="resume-template-gallery__copy">
            <span class="resume-template-gallery__title">
              <strong>{{ template.name }}</strong>
              <CheckCircle2 v-if="pendingCode === template.code" :size="17" aria-label="已选择" />
              <LockKeyhole v-else-if="!isUnlocked(template)" :size="16" aria-label="未解锁" />
            </span>
            <small>{{ template.description }}</small>
            <dl>
              <div>
                <dt>岗位</dt>
                <dd>{{ template.roleFit }}</dd>
              </div>
              <div>
                <dt>页数</dt>
                <dd>{{ template.pageTendency }}</dd>
              </div>
              <div>
                <dt>ATS</dt>
                <dd>{{ template.atsRiskLabel }}</dd>
              </div>
              <div>
                <dt>版式</dt>
                <dd>{{ template.typographyLayout }}</dd>
              </div>
            </dl>
          </span>
        </button>
      </div>

      <aside class="resume-template-gallery__settings">
        <div>
          <span>强调色</span>
          <div class="resume-template-gallery__swatches" role="radiogroup" aria-label="选择简历强调色">
            <button
              v-for="option in accentOptions"
              :key="option.value"
              type="button"
              role="radio"
              :aria-label="option.label"
              :aria-checked="accent === option.value"
              :class="[`is-${option.value}`, { 'is-active': accent === option.value }]"
              @click="emit('accent-change', option.value)"
            ></button>
          </div>
        </div>
        <div class="resume-template-gallery__zoom">
          <span>预览缩放</span>
          <div>
            <button type="button" aria-label="缩小预览" :disabled="zoom <= 0.72" @click="emit('zoom-change', -0.08)">
              <Minus :size="15" aria-hidden="true" />
            </button>
            <strong>{{ Math.round(zoom * 100) }}%</strong>
            <button type="button" aria-label="放大预览" :disabled="zoom >= 1.12" @click="emit('zoom-change', 0.08)">
              <Plus :size="15" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>
    </div>

    <template #footer>
      <div class="resume-template-gallery__footer">
        <el-button @click="emit('cancel')">取消</el-button>
        <el-button type="primary" @click="emit('confirm')">应用模板</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick } from 'vue'
import { CheckCircle2, LockKeyhole, Minus, Plus } from 'lucide-vue-next'

import type {
  ResumeAccent,
  ResumeTemplateCode,
  ResumeTemplateOption
} from '@/features/resume-document'

const props = defineProps<{
  modelValue: boolean
  templates: ResumeTemplateOption[]
  pendingCode: ResumeTemplateCode
  accent: ResumeAccent
  accentOptions: Array<{ value: ResumeAccent; label: string }>
  zoom: number
  isUnlocked: (template: ResumeTemplateOption) => boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  select: [code: ResumeTemplateCode]
  'accent-change': [accent: ResumeAccent]
  'zoom-change': [delta: number]
  cancel: []
  confirm: []
}>()

const unlockedTemplates = computed(() => props.templates.filter((template) => props.isUnlocked(template)))
const unlockedCount = computed(() => unlockedTemplates.value.length)

const moveSelection = (event: KeyboardEvent, currentCode: ResumeTemplateCode) => {
  const codes = unlockedTemplates.value.map((template) => template.code)
  const currentIndex = codes.indexOf(currentCode)
  if (currentIndex < 0) return

  let nextIndex = currentIndex
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    nextIndex = (currentIndex + 1) % codes.length
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    nextIndex = (currentIndex - 1 + codes.length) % codes.length
  } else if (event.key === 'Home') {
    nextIndex = 0
  } else if (event.key === 'End') {
    nextIndex = codes.length - 1
  } else {
    return
  }

  event.preventDefault()
  emit('select', codes[nextIndex])
  void nextTick(() => {
    const buttons = event.currentTarget instanceof HTMLElement
      ? Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || [])
      : []
    buttons[nextIndex]?.focus()
  })
}
</script>

<style scoped lang="scss">
:global(.resume-template-gallery-dialog) {
  --user-surface: #ffffff;
  --user-text: #17211b;
  --user-text-muted: #5f6f65;
  --user-border: #d8e1da;
  --user-primary: #1f8f5f;
  --user-primary-soft: #e8f6ee;
  --user-success: #16734c;
  --user-success-soft: #e8f6ee;
  --el-color-primary: #1f8f5f;
  --el-bg-color: #ffffff;
  --el-fill-color-blank: #ffffff;
  --el-border-color: #d8e1da;
  --el-text-color-primary: #17211b;
  --el-text-color-regular: #44534a;
}

.resume-template-gallery__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;

  h2,
  p {
    margin: 0;
  }

  h2 {
    color: var(--user-text);
    font-size: 18px;
  }

  p {
    margin-top: 5px;
    color: var(--user-text-muted);
    font-size: 12px;
  }

  > span {
    padding: 5px 8px;
    border-radius: 999px;
    background: var(--user-success-soft);
    color: var(--user-success);
    font-size: 11px;
    font-weight: 700;
  }
}

.resume-template-gallery {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 210px;
  gap: 18px;
}

.resume-template-gallery__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.resume-template-gallery__grid > button {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);
  color: var(--user-text);
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    border-color: var(--user-primary);
    outline: 0;
  }

  &.is-active {
    border-color: var(--user-primary);
    background: var(--user-primary-soft);
  }

  &.is-locked {
    cursor: not-allowed;
    opacity: 0.58;
  }
}

.resume-template-gallery__preview {
  display: grid;
  align-content: start;
  gap: 5px;
  aspect-ratio: 0.707;
  padding: 12px 9px;
  border: 1px solid #d9dee7;
  background: #fff;
  box-shadow: 0 5px 8px rgba(39, 50, 68, 0.1);

  i {
    display: block;
    height: 4px;
    background: #b9c2cf;
  }

  i:first-child {
    width: 58%;
    height: 7px;
    background: #2563eb;
  }

  i:nth-child(2) {
    width: 82%;
  }

  i:nth-child(3) {
    width: 70%;
  }

  &.is-ats i:first-child {
    width: 72%;
    background: #334155;
  }

  &.is-modern i:first-child {
    background: #0f766e;
  }

  &.is-classic i:first-child {
    background: #7f1d1d;
  }
}

.resume-template-gallery__copy {
  min-width: 0;

  > small {
    display: block;
    margin-top: 5px;
    color: var(--user-text-muted);
    font-size: 11px;
    line-height: 1.5;
  }

  dl {
    display: grid;
    gap: 4px;
    margin: 10px 0 0;
  }

  dl div {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 5px;
    font-size: 10.5px;
  }

  dt {
    color: var(--user-text-muted);
  }

  dd {
    min-width: 0;
    margin: 0;
    overflow-wrap: anywhere;
  }
}

.resume-template-gallery__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--user-text);
  font-size: 13px;

  svg {
    flex: 0 0 auto;
    color: var(--user-primary);
  }
}

.resume-template-gallery__settings {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 14px;
  border-left: 1px solid var(--user-border);
  color: var(--user-text);

  > div {
    display: grid;
    gap: 9px;
  }

  > div > span {
    color: var(--user-text-muted);
    font-size: 11px;
    font-weight: 650;
  }
}

.resume-template-gallery__swatches {
  display: flex;
  gap: 8px;

  button {
    width: 27px;
    height: 27px;
    padding: 0;
    border: 3px solid var(--user-surface);
    border-radius: 50%;
    box-shadow: 0 0 0 1px var(--user-border);
    cursor: pointer;

    &.is-ocean {
      background: #2563eb;
    }

    &.is-teal {
      background: #0b7669;
    }

    &.is-graphite {
      background: #334155;
    }

    &.is-berry {
      background: #9f3155;
    }

    &.is-active {
      box-shadow: 0 0 0 2px var(--user-primary);
    }
  }
}

.resume-template-gallery__zoom > div {
  display: grid;
  grid-template-columns: 32px minmax(54px, 1fr) 32px;
  align-items: center;
  border: 1px solid var(--user-border);
  border-radius: 6px;
  overflow: hidden;

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    padding: 0;
    border: 0;
    background: var(--user-surface);
    color: var(--user-text);
    cursor: pointer;
  }

  strong {
    font-size: 11px;
    text-align: center;
  }
}

.resume-template-gallery__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 760px) {
  .resume-template-gallery {
    grid-template-columns: 1fr;
  }

  .resume-template-gallery__grid {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
  }

  .resume-template-gallery__grid > button {
    flex: 0 0 min(290px, 82vw);
    scroll-snap-align: start;
  }

  .resume-template-gallery__settings {
    border-top: 1px solid var(--user-border);
    border-left: 0;
  }
}
</style>
