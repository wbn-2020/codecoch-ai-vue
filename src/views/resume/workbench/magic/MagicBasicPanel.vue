<template>
  <div class="magic-basic">
    <!-- 布局 -->
    <div class="magic-basic__block">
      <h2 class="magic-basic__heading">布局</h2>
      <div class="magic-basic__align">
        <button
          v-for="layout in layouts"
          :key="layout.value"
          type="button"
          class="magic-align-btn"
          :class="{ 'is-active': layoutValue === layout.value }"
          :title="layout.tooltip"
          @click="emit('layout-change', layout.value)"
        >
          <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <template v-if="layout.value === 'LEFT'">
              <circle cx="15" cy="24" r="6" fill="currentColor" />
              <rect x="27" y="21" width="15" height="2" fill="currentColor" />
              <rect x="27" y="25" width="12" height="2" fill="currentColor" />
              <rect x="27" y="29" width="13" height="2" fill="currentColor" />
            </template>
            <template v-else-if="layout.value === 'CENTER'">
              <circle cx="24" cy="15" r="6" fill="currentColor" />
              <rect x="16.5" y="27" width="15" height="2" fill="currentColor" />
              <rect x="18" y="31" width="12" height="2" fill="currentColor" />
              <rect x="17" y="35" width="14" height="2" fill="currentColor" />
            </template>
            <template v-else>
              <circle cx="33" cy="24" r="6" fill="currentColor" />
              <rect x="6" y="21" width="15" height="2" fill="currentColor" />
              <rect x="9" y="25" width="12" height="2" fill="currentColor" />
              <rect x="8" y="29" width="13" height="2" fill="currentColor" />
            </template>
          </svg>
        </button>
      </div>
    </div>

    <!-- 资料 -->
    <div class="magic-basic__block">
      <h2 class="magic-basic__heading">资料</h2>
      <div class="magic-avatar-card">
        <div class="magic-avatar-card__row">
          <span class="magic-avatar-card__label">
            <ImageIcon :size="15" />
            头像
          </span>
          <div class="magic-avatar-card__actions">
            <select
              class="magic-avatar-card__shape"
              :value="avatar.shape"
              aria-label="头像形状"
              @change="handleShapeChange"
            >
              <option value="SQUARE">方形</option>
              <option value="ROUNDED">圆角</option>
              <option value="CIRCLE">圆形</option>
            </select>
            <button
              type="button"
              class="magic-icon-btn"
              :aria-label="avatar.visible ? '隐藏头像' : '显示头像'"
              @click="emit('update-avatar', { visible: !avatar.visible })"
            >
              <Eye v-if="avatar.visible" :size="15" class="is-on" />
              <EyeOff v-else :size="15" />
            </button>
          </div>
        </div>
        <div class="magic-avatar-card__body">
          <div
            v-if="avatar.url && avatar.visible"
            class="magic-avatar-card__preview"
            :class="`is-${avatar.shape.toLowerCase()}`"
          >
            <img :src="avatar.url" alt="头像预览">
          </div>
          <div v-else class="magic-avatar-card__preview is-empty">
            <UserRound :size="22" />
          </div>
          <div class="magic-avatar-card__form">
            <input
              v-model.trim="avatarUrlDraft"
              class="magic-input"
              placeholder="粘贴头像图片链接，或上传本地图片"
              aria-label="头像地址"
              @change="commitAvatarUrl"
            >
            <div class="magic-avatar-card__hint">
              <label class="magic-avatar-card__upload">
                <Upload :size="13" />
                上传图片
                <input
                  type="file"
                  accept="image/*"
                  @change="handleUpload"
                >
              </label>
              <span>支持方形图，建议 200×200 以上；本地图片会在浏览器内压缩后保存。</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 基础字段 -->
    <div class="magic-basic__block">
      <h3 class="magic-basic__subheading">基础字段</h3>
      <div class="magic-fields">
        <div
          v-for="field in basicRows"
          :key="field.key"
          class="magic-field-row"
          :class="{ 'is-muted': !field.visible }"
        >
          <span class="magic-field-row__grip magic-field-row__grip--spacer" />
          <span class="magic-field-row__icon">
            <component :is="field.icon" :size="15" />
          </span>
          <span class="magic-field-row__label">{{ field.label }}</span>
          <input
            class="magic-input magic-field-row__input"
            :value="field.value"
            :placeholder="`请输入${field.label}`"
            :aria-label="field.label"
            @input="handleBasicValue(field.key, $event)"
          >
          <button
            type="button"
            class="magic-icon-btn"
            :aria-label="field.visible ? '隐藏字段' : '显示字段'"
            @click="handleToggleField(field.key, !field.visible)"
          >
            <Eye v-if="field.visible" :size="15" class="is-on" />
            <EyeOff v-else :size="15" />
          </button>
        </div>
      </div>
    </div>

    <!-- 自定义字段 -->
    <div class="magic-basic__block">
      <h3 class="magic-basic__subheading">自定义字段</h3>
      <div class="magic-fields">
        <div
          v-for="(contact, index) in customContacts"
          :key="contact.id"
          class="magic-field-row magic-field-row--custom"
          :class="{ 'is-muted': contact.visible === false, 'is-drag-over': dragOverIndex === index && dragFromIndex !== index }"
          :draggable="true"
          @dragstart="handleDragStart(index, $event)"
          @dragover.prevent="dragOverIndex = index"
          @dragleave="dragOverIndex = null"
          @drop.prevent="handleDrop(index)"
          @dragend="resetDrag"
        >
          <span class="magic-field-row__grip">
            <GripVertical :size="15" />
          </span>
          <el-popover trigger="click" :width="232" placement="bottom-start">
            <template #reference>
              <button type="button" class="magic-icon-btn" aria-label="选择图标">
                <component :is="iconFor(contact.iconKey)" :size="15" />
              </button>
            </template>
            <div class="magic-icon-grid">
              <button
                v-for="[key, icon] in iconEntries"
                :key="key"
                type="button"
                :class="{ 'is-active': contact.iconKey === key }"
                @click="emit('update-contact', contact.id, { iconKey: key })"
              >
                <component :is="icon" :size="16" />
              </button>
            </div>
          </el-popover>
          <input
            class="magic-input magic-field-row__label-input"
            :value="contact.label"
            placeholder="标签"
            aria-label="字段标签"
            @input="emit('update-contact', contact.id, { label: ($event.target as HTMLInputElement).value })"
          >
          <input
            class="magic-input magic-field-row__input"
            :value="contact.value"
            placeholder="内容"
            aria-label="字段内容"
            @input="emit('update-contact', contact.id, { value: ($event.target as HTMLInputElement).value })"
          >
          <label class="magic-field-row__show-label">
            <button
              type="button"
              class="magic-switch"
              :class="{ 'is-on': contact.showLabel === true }"
              :aria-pressed="contact.showLabel === true"
              aria-label="显示标签"
              @click="emit('update-contact', contact.id, { showLabel: !(contact.showLabel === true) })"
            ><i /></button>
            <span>显示标签</span>
          </label>
          <button
            type="button"
            class="magic-icon-btn"
            :aria-label="contact.visible === false ? '显示字段' : '隐藏字段'"
            @click="emit('update-contact', contact.id, { visible: contact.visible === false })"
          >
            <Eye v-if="contact.visible !== false" :size="15" class="is-on" />
            <EyeOff v-else :size="15" />
          </button>
          <button
            type="button"
            class="magic-icon-btn magic-icon-btn--danger"
            aria-label="删除字段"
            @click="emit('remove-contact', contact.id)"
          >
            <Trash2 :size="15" />
          </button>
        </div>

        <button type="button" class="magic-basic__add" @click="emit('add-contact')">
          <CirclePlus :size="15" />
          添加自定义字段
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Briefcase,
  Calendar,
  Circle,
  CirclePlus,
  Eye,
  EyeOff,
  Globe,
  GraduationCap,
  GripVertical,
  Image as ImageIcon,
  Link as LinkIcon,
  Mail,
  MapPin,
  Phone,
  Trash2,
  Upload,
  User,
  UserRound
} from 'lucide-vue-next'
import { computed, ref, watch, type Component } from 'vue'
import type { ResumeContactItem } from '@/features/resume-workbench/document'
import type { ResumeContactIconKey } from '@/features/resume-template/schema'

export interface MagicAvatarConfig {
  url: string
  visible: boolean
  shape: 'SQUARE' | 'ROUNDED' | 'CIRCLE'
}

const props = withDefaults(defineProps<{
  name: string
  headline: string
  phone: string
  email: string
  phoneVisible?: boolean
  emailVisible?: boolean
  phoneIcon?: string
  emailIcon?: string
  customContacts: ResumeContactItem[]
  avatar: MagicAvatarConfig
  layoutValue: 'LEFT' | 'CENTER' | 'RIGHT'
}>(), {
  phoneVisible: true,
  emailVisible: true,
  phoneIcon: 'phone',
  emailIcon: 'mail'
})

const emit = defineEmits<{
  'update:name': [value: string]
  'update:headline': [value: string]
  'update:phone': [value: string]
  'update:email': [value: string]
  'toggle-field': [key: 'phone' | 'email', visible: boolean]
  'layout-change': [layout: 'LEFT' | 'CENTER' | 'RIGHT']
  'add-contact': []
  'update-contact': [id: string, patch: Partial<Omit<ResumeContactItem, 'id'>>]
  'remove-contact': [id: string]
  'reorder-contacts': [ids: string[]]
  'update-avatar': [patch: Partial<MagicAvatarConfig>]
}>()

const layouts: Array<{ value: 'LEFT' | 'CENTER' | 'RIGHT'; tooltip: string }> = [
  { value: 'LEFT', tooltip: '左对齐' },
  { value: 'CENTER', tooltip: '居中' },
  { value: 'RIGHT', tooltip: '右对齐' }
]

const iconMap: Record<ResumeContactIconKey, Component> = {
  phone: Phone,
  mail: Mail,
  user: User,
  briefcase: Briefcase,
  'graduation-cap': GraduationCap,
  circle: Circle,
  url: LinkIcon,
  location: MapPin
}

const iconEntries = Object.entries(iconMap) as Array<[ResumeContactIconKey, Component]>

const iconFor = (iconKey: string) => iconMap[(iconKey as ResumeContactIconKey)] || Circle

const basicRows = computed<Array<{ key: 'name' | 'headline' | 'phone' | 'email'; label: string; icon: Component; value: string; visible: boolean }>>(() => [
  { key: 'name', label: '姓名', icon: User, value: props.name, visible: true },
  { key: 'headline', label: '职位', icon: Briefcase, value: props.headline, visible: true },
  {
    key: 'phone',
    label: '电话',
    icon: iconFor(props.phoneIcon),
    value: props.phone,
    visible: props.phoneVisible
  },
  {
    key: 'email',
    label: '邮箱',
    icon: iconFor(props.emailIcon),
    value: props.email,
    visible: props.emailVisible
  }
])

const handleToggleField = (
  key: 'name' | 'headline' | 'phone' | 'email',
  visible: boolean
) => {
  if (key === 'phone' || key === 'email') emit('toggle-field', key, visible)
}

const handleBasicValue = (
  key: 'name' | 'headline' | 'phone' | 'email',
  event: Event
) => {
  const value = (event.target as HTMLInputElement).value
  if (key === 'name') emit('update:name', value)
  else if (key === 'headline') emit('update:headline', value)
  else if (key === 'phone') emit('update:phone', value)
  else emit('update:email', value)
}

const customContacts = computed(() => props.customContacts)

/* ---- 头像 ---- */
const avatarUrlDraft = ref(props.avatar.url)
watch(() => props.avatar.url, (value) => {
  avatarUrlDraft.value = value
})

const commitAvatarUrl = () => {
  emit('update-avatar', { url: avatarUrlDraft.value })
}

const handleShapeChange = (event: Event) => {
  emit('update-avatar', {
    shape: (event.target as HTMLSelectElement).value as MagicAvatarConfig['shape']
  })
}

const MAX_AVATAR_BYTES = 220 * 1024

const handleUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const raw = String(reader.result || '')
    if (raw.length <= MAX_AVATAR_BYTES) {
      avatarUrlDraft.value = raw
      emit('update-avatar', { url: raw })
      return
    }
    const image = new Image()
    image.onload = () => {
      const scale = Math.min(1, Math.sqrt(MAX_AVATAR_BYTES / raw.length))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      const context = canvas.getContext('2d')
      if (!context) return
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      const compressed = canvas.toDataURL('image/jpeg', 0.82)
      avatarUrlDraft.value = compressed
      emit('update-avatar', { url: compressed })
    }
    image.src = raw
  }
  reader.readAsDataURL(file)
}

/* ---- 自定义字段拖拽排序 ---- */
let dragFromIndex: number | null = null
const dragOverIndex = ref<number | null>(null)

const handleDragStart = (index: number, event: DragEvent) => {
  dragFromIndex = index
  event.dataTransfer?.setData('text/plain', String(index))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

const handleDrop = (index: number) => {
  const from = dragFromIndex
  resetDrag()
  if (from === null || from === index) return
  const ids = customContacts.value.map((contact) => contact.id)
  const [moved] = ids.splice(from, 1)
  ids.splice(index, 0, moved)
  emit('reorder-contacts', ids)
}

const resetDrag = () => {
  dragFromIndex = null
  dragOverIndex.value = null
}
</script>

<style scoped lang="scss">
.magic-basic {
  display: flex;
  flex-direction: column;
  gap: 26px;
  padding: 22px;
}

.magic-basic__block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.magic-basic__heading {
  margin: 0;
  color: #111827;
  font-size: 17px;
  font-weight: 500;
}

.magic-basic__subheading {
  margin: 0;
  padding: 0 2px;
  color: #111827;
  font-size: 14.5px;
  font-weight: 600;
}

/* ---- 布局选择器（1:1 magic AlignSelector） ---- */
.magic-basic__align {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.magic-align-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
  border: 2px solid transparent;
  border-radius: 12px;
  background: rgba(243, 244, 246, 0.55);
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.18s ease;

  &:hover {
    background: #f3f4f6;
    color: #374151;
    transform: scale(1.02);
  }

  &.is-active {
    border-color: var(--el-color-primary, #0047ab);
    background: rgba(0, 71, 171, 0.05);
    color: var(--el-color-primary, #0047ab);
    box-shadow: 0 0 0 2px #ffffff, 0 0 0 3.5px var(--el-color-primary, #0047ab);
  }
}

/* ---- 头像卡 ---- */
.magic-avatar-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
}

.magic-avatar-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.magic-avatar-card__label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #111827;
  font-size: 13.5px;
  font-weight: 600;
}

.magic-avatar-card__actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.magic-avatar-card__shape {
  padding: 4px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 7px;
  background: #ffffff;
  color: #374151;
  font-size: 12.5px;
  outline: none;
}

.magic-avatar-card__body {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.magic-avatar-card__preview {
  flex: 0 0 auto;
  width: 76px;
  height: 76px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  background: #f9fafb;

  &.is-square { border-radius: 2px; }
  &.is-rounded { border-radius: 8px; }
  &.is-circle { border-radius: 999px; }

  &.is-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #c0c6d0;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.magic-avatar-card__form {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.magic-avatar-card__hint {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #9ca3af;
  font-size: 12px;
}

.magic-avatar-card__upload {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 7px;
  background: #ffffff;
  color: #374151;
  cursor: pointer;
  font-size: 12.5px;
  white-space: nowrap;

  &:hover { background: #f9fafb; }

  input { display: none; }
}

/* ---- 字段行 ---- */
.magic-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.magic-field-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  transition: border-color 0.18s ease, opacity 0.18s ease;

  &:hover { border-color: rgba(0, 71, 171, 0.28); }

  &.is-muted { opacity: 0.6; }

  &.is-drag-over {
    border-top: 2px solid var(--el-color-primary, #0047ab);
  }
}

.magic-field-row__grip {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  color: #9ca3af;
  cursor: grab;

  &:active { cursor: grabbing; }

  &--spacer { cursor: default; width: 15px; }
}

.magic-field-row__icon {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid #e5e7eb;
  border-radius: 7px;
  color: #6b7280;
}

.magic-field-row__label {
  flex: 0 0 62px;
  color: #111827;
  font-size: 13px;
  font-weight: 500;
}

.magic-field-row__label-input {
  flex: 0 0 96px;
}

.magic-field-row__input {
  flex: 1;
  min-width: 0;
}

.magic-field-row__show-label {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  color: #6b7280;
  font-size: 12px;
  white-space: nowrap;
}

.magic-input {
  height: 32px;
  padding: 0 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #111827;
  font-size: 13px;
  outline: none;
  transition: border-color 0.18s ease;

  &::placeholder { color: #b3bac4; }

  &:focus { border-color: var(--el-color-primary, #0047ab); }
}

.magic-icon-btn {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;

  &:hover { background: #f3f4f6; color: #111827; }

  .is-on { color: var(--el-color-primary, #0047ab); }

  &--danger {
    color: #f87171;

    &:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
  }
}

.magic-icon-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;

  button {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 34px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #ffffff;
    color: #6b7280;
    cursor: pointer;

    &:hover { background: #f3f4f6; color: #111827; }

    &.is-active {
      border-color: var(--el-color-primary, #0047ab);
      color: var(--el-color-primary, #0047ab);
      background: rgba(0, 71, 171, 0.05);
    }
  }
}

.magic-basic__add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  margin-top: 2px;
  padding: 10px;
  border: 0;
  border-radius: 10px;
  background: var(--el-color-primary, #0047ab);
  color: #ffffff;
  cursor: pointer;
  font-size: 13.5px;
  font-weight: 500;
  transition: background 0.18s ease;

  &:hover { background: #003a8c; }
}

/* ---- 开关 ---- */
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
