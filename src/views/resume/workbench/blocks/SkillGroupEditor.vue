<template>
  <div class="skill-group-editor">
    <section
      v-for="(group, groupIndex) in groups"
      :key="group.id"
      class="skill-group-editor__group"
    >
      <header class="skill-group-editor__head">
        <input
          class="skill-group-editor__label"
          :value="group.label"
          :disabled="disabled"
          placeholder="分组名称"
          :aria-label="`第 ${groupIndex + 1} 组名称`"
          @input="rename(group.id, $event)"
        />
        <div class="skill-group-editor__actions">
          <button
            type="button"
            :disabled="disabled || groupIndex === 0"
            :aria-label="`上移分组 ${groupIndex + 1}`"
            @click="move(group.id, -1)"
          >&#8593;</button>
          <button
            type="button"
            :disabled="disabled || groupIndex === groups.length - 1"
            :aria-label="`下移分组 ${groupIndex + 1}`"
            @click="move(group.id, 1)"
          >&#8595;</button>
          <button
            type="button"
            class="is-danger"
            :disabled="disabled"
            :aria-label="`删除分组 ${groupIndex + 1}`"
            @click="removeGroup(group.id)"
          >&#215;</button>
        </div>
      </header>

      <ul class="skill-group-editor__chips">
        <li v-for="(item, itemIndex) in group.items" :key="`${group.id}-${itemIndex}`">
          <input
            class="skill-group-editor__chip"
            :value="item"
            :disabled="disabled"
            :aria-label="`技能 ${item}`"
            @input="renameItem(group.id, itemIndex, $event)"
          />
          <button
            type="button"
            class="skill-group-editor__clear"
            :disabled="disabled"
            :aria-label="`移除 ${item}`"
            @click="removeItem(group.id, itemIndex)"
          >&#215;</button>
        </li>
        <li v-if="!group.items.length" class="skill-group-editor__empty">还没有技能</li>
      </ul>

      <input
        class="skill-group-editor__add"
        :disabled="disabled"
        placeholder="输入技能后按回车添加，逗号可一次输入多个"
        :aria-label="`向分组 ${groupIndex + 1} 添加技能`"
        @keydown.enter.prevent="commit(group.id, $event)"
        @blur="commit(group.id, $event)"
      />
    </section>

    <p v-if="!groups.length" class="skill-group-editor__empty">还没有技能分组。</p>
    <button type="button" class="skill-group-editor__new" :disabled="disabled" @click="addGroup">添加分组</button>
  </div>
</template>

<script setup lang="ts">
import { nextDocumentId } from '@/features/resume-workbench/document-migrator'
import type { ResumeSkillGroupItem } from '@/features/resume-workbench/document'

const props = withDefaults(defineProps<{ groups: ResumeSkillGroupItem[]; disabled?: boolean }>(), {
  disabled: false
})

const emit = defineEmits<{ 'update:groups': [groups: ResumeSkillGroupItem[]] }>()

const SPLIT = new RegExp('[,，、;；' + String.fromCharCode(10) + ']')

const write = (groups: ResumeSkillGroupItem[]) => emit('update:groups',
  groups.map((group) => ({ ...group, items: [...group.items] })))

const locate = (id: string) => props.groups.findIndex((group) => group.id === id)

const rename = (id: string, event: Event) => {
  const index = locate(id)
  if (index < 0) return
  const value = (event.target as HTMLInputElement).value
  write(props.groups.map((group, at) => (at === index ? { ...group, label: value } : group)))
}

const renameItem = (id: string, itemIndex: number, event: Event) => {
  const index = locate(id)
  if (index < 0) return
  const value = (event.target as HTMLInputElement).value
  const group = props.groups[index]
  const items = group.items.map((item, at) => (at === itemIndex ? value : item))
  write(props.groups.map((current, at) => (at === index ? { ...current, items } : current)))
}

const commit = (id: string, event: Event) => {
  const input = event.target as HTMLInputElement
  const values = input.value.split(SPLIT).map((value) => value.trim()).filter(Boolean)
  if (!values.length) return
  const index = locate(id)
  if (index < 0) return
  const group = props.groups[index]
  const known = new Set(group.items.map((item) => item.toLocaleLowerCase()))
  const items = [...group.items]
  values.forEach((value) => {
    if (known.has(value.toLocaleLowerCase())) return
    known.add(value.toLocaleLowerCase())
    items.push(value)
  })
  write(props.groups.map((current, at) => (at === index ? { ...current, items } : current)))
  input.value = ''
}

const removeItem = (id: string, itemIndex: number) => {
  const index = locate(id)
  if (index < 0) return
  const group = props.groups[index]
  write(props.groups.map((current, at) => (
    at === index ? { ...current, items: current.items.filter((_, position) => position !== itemIndex) } : current
  )))
}

const move = (id: string, delta: number) => {
  const from = locate(id)
  const to = from + delta
  if (from < 0 || to < 0 || to >= props.groups.length) return
  const next = [...props.groups]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  write(next)
}

const addGroup = () => write([...props.groups, { id: nextDocumentId('grp'), label: '', items: [] }])

const removeGroup = (id: string) => write(props.groups.filter((group) => group.id !== id))
</script>

<style scoped lang="scss">
.skill-group-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;

  &__group {
    padding: 10px 12px;
    border: 1px solid var(--user-border);
    border-radius: var(--user-radius-md);
    background: var(--user-surface);
  }

  &__head {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__label {
    flex: 1;
    min-width: 0;
    padding: 3px 6px;
    border: 1px solid transparent;
    border-radius: var(--user-radius-sm);
    background: transparent;
    color: var(--user-text);
    font: inherit;
    font-size: 13px;
    font-weight: 600;

    &:hover:not(:disabled),
    &:focus-visible {
      border-color: var(--user-border);
      background: var(--user-control-bg);
    }
  }

  &__actions {
    display: flex;
    gap: 2px;

    button {
      width: 24px;
      height: 24px;
      border: 1px solid transparent;
      border-radius: var(--user-radius-sm);
      background: transparent;
      color: var(--user-text-secondary);
      font-size: 13px;
      cursor: pointer;

      &:hover:not(:disabled) {
        border-color: var(--user-border);
        background: var(--user-surface-muted);
      }

      &:disabled {
        color: var(--user-text-subtle);
        cursor: not-allowed;
      }

      &.is-danger:hover:not(:disabled) {
        border-color: var(--user-danger-border);
        background: var(--user-danger-soft);
        color: var(--user-danger-text);
      }
    }
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 8px 0 0;
    padding: 0;
    list-style: none;

    li {
      display: flex;
      align-items: center;
      border: 1px solid var(--user-border);
      border-radius: 999px;
      background: var(--user-surface-muted);
    }
  }

  &__chip {
    width: auto;
    max-width: 168px;
    padding: 3px 0 3px 9px;
    border: 0;
    background: transparent;
    color: var(--user-text);
    font: inherit;
    font-size: 12.5px;

    &:focus-visible {
      outline: 2px solid var(--user-primary);
      outline-offset: -2px;
      border-radius: 999px;
    }
  }

  &__clear {
    padding: 0 8px 0 2px;
    border: 0;
    background: transparent;
    color: var(--user-text-muted);
    font-size: 13px;
    line-height: 1;
    cursor: pointer;

    &:hover:not(:disabled) {
      color: var(--user-danger-text);
    }
  }

  &__add {
    width: 100%;
    margin-top: 8px;
    padding: 5px 8px;
    border: 1px dashed var(--user-border);
    border-radius: var(--user-radius-sm);
    background: transparent;
    color: var(--user-text);
    font: inherit;
    font-size: 12.5px;

    &:hover:not(:disabled),
    &:focus-visible {
      border-color: var(--user-primary);
    }

    &::placeholder {
      color: var(--user-text-subtle);
    }
  }

  &__empty {
    margin: 0;
    color: var(--user-text-subtle);
    font-size: 12.5px;
    list-style: none;
  }

  &__new {
    align-self: flex-start;
    padding: 4px 10px;
    border: 1px dashed var(--user-border);
    border-radius: var(--user-radius-sm);
    background: transparent;
    color: var(--user-text-secondary);
    font-size: 12.5px;
    cursor: pointer;

    &:hover:not(:disabled) {
      border-color: var(--user-primary);
      color: var(--user-primary);
    }
  }
}
</style>
