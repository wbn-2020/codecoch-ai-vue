<template>
  <section class="resume-presentation-settings" aria-labelledby="resume-presentation-settings-title">
    <header class="resume-presentation-settings__header">
      <div>
        <p class="resume-presentation-settings__eyebrow">阶段二 · 展示设置</p>
        <h2 id="resume-presentation-settings-title">简历展示设置</h2>
        <p class="resume-presentation-settings__description">
          调整版式参数，预览会即时同步。
        </p>
      </div>
      <Settings2 :size="18" aria-hidden="true" />
    </header>

    <div class="resume-presentation-settings__body">
      <section class="settings-section" aria-labelledby="template-settings-title">
        <div class="settings-section__heading">
          <div>
            <h3 id="template-settings-title">
              <LayoutTemplate :size="15" aria-hidden="true" />
              模板
            </h3>
            <p>选择模板和当前模板版本。</p>
          </div>
        </div>

        <div class="settings-grid settings-grid--template">
          <el-form-item label="模板版本">
            <el-select
              :model-value="modelValue.templateCode"
              :disabled="disabled"
              aria-label="模板"
              style="width: 100%"
              @update:model-value="updateTemplateCode"
            >
              <el-option
                v-for="template in templates"
                :key="template.code"
                :label="`${template.name} · ${template.shortLabel}`"
                :value="template.code"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="版本号">
            <div class="template-version-readonly" aria-label="当前模板版本">
              <strong>v{{ activeTemplateVersion }}</strong>
              <span>由已注册模板决定</span>
            </div>
          </el-form-item>
        </div>
      </section>

      <section class="settings-section" aria-labelledby="type-settings-title">
        <div class="settings-section__heading">
          <div>
            <h3 id="type-settings-title">
              <Palette :size="15" aria-hidden="true" />
              视觉
            </h3>
            <p>控制强调色和简历正文的阅读密度。</p>
          </div>
        </div>

        <div class="settings-control">
          <span class="settings-control__label">强调色</span>
          <div class="accent-options" role="radiogroup" aria-label="强调色">
            <button
              v-for="accent in accentOptions"
              :key="accent.value"
              type="button"
              class="accent-option"
              :class="[`is-${accent.value}`, { 'is-active': modelValue.accentColor === accent.value }]"
              :aria-label="accent.label"
              :aria-checked="modelValue.accentColor === accent.value"
              :disabled="disabled"
              role="radio"
              @click="updateAccent(accent.value)"
            >
              <span class="accent-option__swatch" aria-hidden="true"></span>
              <span>{{ accent.label }}</span>
            </button>
          </div>
        </div>

        <div class="settings-grid">
          <el-form-item label="字体">
            <el-select
              :model-value="modelValue.fontFamily"
              :disabled="disabled"
              aria-label="字体"
              style="width: 100%"
              @update:model-value="updateFontFamily"
            >
              <el-option
                v-for="font in fontOptions"
                :key="font"
                :label="font"
                :value="font"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="字号缩放">
            <el-input-number
              :model-value="modelValue.fontScale"
              :disabled="disabled"
              :min="0.86"
              :max="1.18"
              :step="0.01"
              :precision="2"
              controls-position="right"
              aria-label="字号缩放"
              style="width: 100%"
              @update:model-value="updateFontScale"
            />
          </el-form-item>
          <el-form-item label="行高">
            <el-input-number
              :model-value="modelValue.lineHeight"
              :disabled="disabled"
              :min="1"
              :max="1.6"
              :step="0.05"
              :precision="2"
              controls-position="right"
              aria-label="行高"
              style="width: 100%"
              @update:model-value="updateLineHeight"
            />
          </el-form-item>
        </div>
      </section>

      <section class="settings-section" aria-labelledby="layout-settings-title">
        <div class="settings-section__heading">
          <div>
            <h3 id="layout-settings-title">
              <Rows3 :size="15" aria-hidden="true" />
              页面布局
            </h3>
            <p>微调区块之间的留白和页面边界。</p>
          </div>
        </div>

        <div class="settings-grid">
          <el-form-item label="区块间距">
            <el-input-number
              :model-value="modelValue.sectionSpacing"
              :disabled="disabled"
              :min="0.7"
              :max="1.6"
              :step="0.1"
              :precision="1"
              controls-position="right"
              aria-label="区块间距"
              style="width: 100%"
              @update:model-value="updateSectionSpacing"
            />
          </el-form-item>
          <el-form-item label="页边距（pt）">
            <el-input-number
              :model-value="modelValue.pageMarginPt"
              :disabled="disabled"
              :min="24"
              :max="72"
              :step="1"
              :precision="0"
              controls-position="right"
              aria-label="页边距"
              style="width: 100%"
              @update:model-value="updatePageMargin"
            />
          </el-form-item>
        </div>
      </section>

      <section class="settings-section" aria-labelledby="basic-settings-title">
        <div class="settings-section__heading">
          <div>
            <h3 id="basic-settings-title">
              <AlignCenter :size="15" aria-hidden="true" />
              基本信息
            </h3>
            <p>控制姓名、岗位和联系方式在简历顶部的对齐与展示顺序。</p>
          </div>
        </div>

        <div class="settings-control">
          <span class="settings-control__label">信息对齐</span>
          <div class="alignment-options" role="radiogroup" aria-label="基本信息对齐">
            <button
              v-for="layout in basicLayoutOptions"
              :key="layout.value"
              type="button"
              class="alignment-option"
              :class="{ 'is-active': modelValue.basicLayout === layout.value }"
              :aria-label="layout.label"
              :aria-checked="modelValue.basicLayout === layout.value"
              :disabled="disabled"
              role="radio"
              @click="updateBasicLayout(layout.value)"
            >
              <component :is="layout.icon" :size="15" aria-hidden="true" />
              <span>{{ layout.label }}</span>
            </button>
          </div>
        </div>

        <div class="settings-control">
          <span class="settings-control__label">字段顺序、显隐与图标</span>
          <div class="basic-field-list" aria-label="基本信息字段设置">
            <div
              v-for="(field, index) in orderedBasicFields"
              :key="field"
              class="basic-field-list__item"
              :class="{ 'is-hidden': modelValue.basicFieldVisibility[field] === false }"
            >
              <div class="basic-field-list__identity">
                <GripVertical :size="15" aria-hidden="true" />
                <span>{{ basicFieldLabels[field] }}</span>
              </div>
              <div class="basic-field-list__actions">
                <el-tooltip content="上移" placement="top">
                  <el-button
                    :disabled="disabled || index === 0"
                    circle
                    text
                    :aria-label="`上移${basicFieldLabels[field]}`"
                    @click="moveBasicField(index, -1)"
                  >
                    <ArrowUp :size="14" aria-hidden="true" />
                  </el-button>
                </el-tooltip>
                <el-tooltip content="下移" placement="top">
                  <el-button
                    :disabled="disabled || index === orderedBasicFields.length - 1"
                    circle
                    text
                    :aria-label="`下移${basicFieldLabels[field]}`"
                    @click="moveBasicField(index, 1)"
                  >
                    <ArrowDown :size="14" aria-hidden="true" />
                  </el-button>
                </el-tooltip>
                <el-select
                  :model-value="modelValue.basicFieldIcons[field]"
                  :disabled="disabled || modelValue.iconMode === 'HIDDEN'"
                  :aria-label="`${basicFieldLabels[field]}图标`"
                  class="basic-field-list__icon"
                  @update:model-value="updateBasicFieldIcon(field, $event)"
                >
                  <el-option
                    v-for="icon in iconOptions"
                    :key="icon.value"
                    :label="icon.label"
                    :value="icon.value"
                  />
                </el-select>
                <el-checkbox
                  :model-value="modelValue.basicFieldVisibility[field] !== false"
                  :disabled="disabled"
                  :aria-label="`${basicFieldLabels[field]}显示`"
                  @update:model-value="toggleBasicField(field, $event)"
                >
                  显示
                </el-checkbox>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-control">
          <span class="settings-control__label">联系方式显示方式</span>
          <div class="icon-mode-options" role="radiogroup" aria-label="联系方式显示方式">
            <button
              v-for="mode in iconModeOptions"
              :key="mode.value"
              type="button"
              class="icon-mode-option"
              :class="{ 'is-active': modelValue.iconMode === mode.value }"
              :aria-label="mode.label"
              :aria-checked="modelValue.iconMode === mode.value"
              :disabled="disabled"
              role="radio"
              @click="updateIconMode(mode.value)"
            >
              <span>{{ mode.label }}</span>
              <small>{{ mode.description }}</small>
            </button>
          </div>
        </div>

        <div class="settings-switch-row">
          <div>
            <strong>自动压缩到一页</strong>
            <p>仅调整预览排版密度，不改变原始内容。</p>
          </div>
          <el-checkbox
            :model-value="modelValue.autoOnePage"
            :disabled="disabled"
            aria-label="自动压缩到一页"
            @update:model-value="updateAutoOnePage"
          >
            启用
          </el-checkbox>
        </div>
      </section>

      <section class="settings-section" aria-labelledby="avatar-settings-title">
        <div class="settings-section__heading">
          <div>
            <h3 id="avatar-settings-title">
              <ImageOff :size="15" aria-hidden="true" />
              照片
            </h3>
            <p>照片上传与持久化尚未接入当前简历数据契约。</p>
          </div>
        </div>
        <div class="settings-unavailable" role="status">
          <strong>暂未开放</strong>
          <span>当前不会伪造照片内容，也不会把照片设置写入可用导出结果。</span>
        </div>
      </section>

      <section class="settings-section" aria-labelledby="section-settings-title">
        <div class="settings-section__heading">
          <div>
            <h3 id="section-settings-title">
              <ListOrdered :size="15" aria-hidden="true" />
              区块顺序与显示
            </h3>
            <p>调整区块顺序，或隐藏暂时不需要的内容。</p>
          </div>
        </div>

        <div class="section-list" aria-label="简历区块顺序">
          <div
            v-for="(section, index) in orderedSections"
            :key="section"
            class="section-list__item"
            :class="{ 'is-hidden': modelValue.hiddenSections.includes(section) }"
          >
            <div class="section-list__identity">
              <GripVertical :size="15" aria-hidden="true" />
              <span>{{ sectionLabels[section] }}</span>
              <el-tag v-if="modelValue.hiddenSections.includes(section)" size="small" type="info">
                已隐藏
              </el-tag>
            </div>
            <div class="section-list__actions">
              <el-tooltip content="上移" placement="top">
                <el-button
                  :disabled="disabled || index === 0"
                  circle
                  text
                  :aria-label="`上移${sectionLabels[section]}`"
                  @click="moveSection(index, -1)"
                >
                  <ArrowUp :size="15" aria-hidden="true" />
                </el-button>
              </el-tooltip>
              <el-tooltip content="下移" placement="top">
                <el-button
                  :disabled="disabled || index === orderedSections.length - 1"
                  circle
                  text
                  :aria-label="`下移${sectionLabels[section]}`"
                  @click="moveSection(index, 1)"
                >
                  <ArrowDown :size="15" aria-hidden="true" />
                </el-button>
              </el-tooltip>
              <el-checkbox
                :model-value="!modelValue.hiddenSections.includes(section)"
                :disabled="disabled"
                :aria-label="`${sectionLabels[section]}显示`"
                @update:model-value="toggleSection(section, $event)"
              >
                显示
              </el-checkbox>
            </div>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  GripVertical,
  ImageOff,
  LayoutTemplate,
  ListOrdered,
  Palette,
  Rows3,
  Settings2
} from 'lucide-vue-next'

import {
  normalizeResumePresentation,
  RESUME_PRESENTATION_FONTS,
  RESUME_PRESENTATION_SECTIONS
} from '@/features/resume-presentation'
import {
  resumeTemplateOptions,
  resumeTemplateSectionOrder,
  type ResumeAccent,
  type ResumeTemplateOption
} from '@/features/resume-document'
import type { ResumeAtsTemplateVO } from '@/types/resumeDelivery'
import type {
  ResumePresentationConfig,
  ResumePresentationFont,
  ResumePresentationSection
} from '@/types/resumePresentation'

const props = withDefaults(defineProps<{
  modelValue: ResumePresentationConfig
  templates?: ResumeTemplateOption[]
  templateRegistry?: ResumeAtsTemplateVO[]
  disabled?: boolean
}>(), {
  templates: () => resumeTemplateOptions,
  templateRegistry: () => [],
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: ResumePresentationConfig]
  change: [value: ResumePresentationConfig, field: string]
}>()

const sectionLabels: Record<ResumePresentationSection, string> = {
  summary: '个人摘要',
  skills: '技能栈',
  experience: '工作经历',
  projects: '项目经历',
  education: '教育经历'
}

type BasicField = ResumePresentationConfig['basicFieldOrder'][number]
type BasicLayout = ResumePresentationConfig['basicLayout']
type IconMode = ResumePresentationConfig['iconMode']

const basicFieldLabels: Record<BasicField, string> = {
  realName: '姓名',
  targetPosition: '目标岗位',
  email: '邮箱',
  phone: '电话'
}

const basicLayoutOptions = [
  { value: 'LEFT' as const, label: '左对齐', icon: AlignLeft },
  { value: 'CENTER' as const, label: '居中', icon: AlignCenter },
  { value: 'RIGHT' as const, label: '右对齐', icon: AlignRight }
]

const iconModeOptions = [
  { value: 'ICON' as const, label: '图标', description: '只显示图标与内容' },
  { value: 'TEXT' as const, label: '图标 + 标签', description: '适合信息较多时识别' },
  { value: 'HIDDEN' as const, label: '纯文字', description: '隐藏联系方式图标' }
]

const iconOptions = [
  { value: 'user', label: '人物' },
  { value: 'briefcase', label: '岗位' },
  { value: 'mail', label: '邮箱' },
  { value: 'phone', label: '电话' },
  { value: 'graduation-cap', label: '教育' },
  { value: 'circle', label: '圆点' }
]

const accentOptions: Array<{ value: ResumeAccent; label: string }> = [
  { value: 'default', label: '默认黑' },
  { value: 'blue', label: '蓝色' },
  { value: 'green', label: '绿色' },
  { value: 'purple', label: '紫色' },
  { value: 'orange', label: '橙色' },
  { value: 'red', label: '红色' },
  { value: 'slate', label: '石板灰' },
  { value: 'black', label: '纯黑' }
]

const fontOptions = [...RESUME_PRESENTATION_FONTS]

const orderedSections = computed(() => {
  const configured = props.modelValue.sectionOrder.filter((section) =>
    RESUME_PRESENTATION_SECTIONS.includes(section)
  )
  return Array.from(new Set([...configured, ...RESUME_PRESENTATION_SECTIONS]))
})

const activeTemplateVersion = computed(() => {
  const versions = props.templateRegistry
    .filter((template) =>
      template.templateCode === props.modelValue.templateCode
      && (!template.status || template.status === 'ACTIVE')
    )
    .map((template) => Number(template.templateVersion))
    .filter((version) => Number.isFinite(version) && version > 0)
  return versions.length
    ? Math.max(...versions)
    : Math.max(1, Math.floor(Number(props.modelValue.templateVersion) || 1))
})

const orderedBasicFields = computed<BasicField[]>(() => {
  const configured = props.modelValue.basicFieldOrder.filter((field): field is BasicField =>
    Object.prototype.hasOwnProperty.call(basicFieldLabels, field)
  )
  return Array.from(new Set([
    ...configured,
    ...Object.keys(basicFieldLabels) as BasicField[]
  ]))
})

const updateConfig = (
  field: string,
  patch: Partial<ResumePresentationConfig>,
  overrideKey?: keyof NonNullable<ResumePresentationConfig['overrides']>
) => {
  const overrides = overrideKey
    ? { ...props.modelValue.overrides, [overrideKey]: true }
    : props.modelValue.overrides
  const next = normalizeResumePresentation({
    ...props.modelValue,
    ...patch,
    overrides
  })
  emit('update:modelValue', next)
  emit('change', next, field)
}

const updateTemplateCode = (templateCode: ResumeTemplateOption['code']) => {
  const template = props.templates.find((item) => item.code === templateCode)
  const registeredVersions = props.templateRegistry
    .filter((item) =>
      item.templateCode === templateCode
      && (!item.status || item.status === 'ACTIVE')
    )
    .map((item) => Number(item.templateVersion))
    .filter((version) => Number.isFinite(version) && version > 0)
  const next = normalizeResumePresentation({
    ...props.modelValue,
    templateCode,
    templateVersion: Math.max(
      1,
      ...registeredVersions,
      template ? 1 : Math.floor(Number(props.modelValue.templateVersion) || 1)
    )
  })
  if (!next.overrides?.sectionOrder) {
    next.sectionOrder = resumeTemplateSectionOrder(templateCode)
  }
  emit('update:modelValue', next)
  emit('change', next, 'templateCode')
}

const updateAccent = (accentColor: ResumeAccent) => {
  updateConfig('accentColor', { accentColor })
}

const updateFontFamily = (fontFamily: ResumePresentationFont) => {
  updateConfig('fontFamily', { fontFamily }, 'fontFamily')
}

const updateFontScale = (fontScale: number | null) => {
  if (fontScale == null) return
  updateConfig('fontScale', { fontScale }, 'fontScale')
}

const updateLineHeight = (lineHeight: number | null) => {
  if (lineHeight == null) return
  updateConfig('lineHeight', { lineHeight }, 'lineHeight')
}

const updateSectionSpacing = (sectionSpacing: number | null) => {
  if (sectionSpacing == null) return
  updateConfig('sectionSpacing', { sectionSpacing }, 'sectionSpacing')
}

const updatePageMargin = (pageMarginPt: number | null) => {
  if (pageMarginPt == null) return
  updateConfig('pageMarginPt', { pageMarginPt }, 'pageMarginPt')
}

const updateBasicLayout = (basicLayout: BasicLayout) => {
  updateConfig('basicLayout', { basicLayout }, 'basicLayout')
}

const updateBasicFieldIcon = (field: BasicField, icon: string) => {
  updateConfig('basicFieldIcons', {
    basicFieldIcons: {
      ...props.modelValue.basicFieldIcons,
      [field]: icon
    }
  }, 'basicFieldIcons')
}

const moveBasicField = (index: number, delta: -1 | 1) => {
  const nextOrder = [...orderedBasicFields.value]
  const nextIndex = index + delta
  if (nextIndex < 0 || nextIndex >= nextOrder.length) return
  const [field] = nextOrder.splice(index, 1)
  nextOrder.splice(nextIndex, 0, field)
  updateConfig('basicFieldOrder', { basicFieldOrder: nextOrder }, 'basicFieldOrder')
}

const toggleBasicField = (field: BasicField, visible: boolean) => {
  updateConfig('basicFieldVisibility', {
    basicFieldVisibility: {
      ...props.modelValue.basicFieldVisibility,
      [field]: visible
    }
  }, 'basicFieldVisibility')
}

const updateIconMode = (iconMode: IconMode) => {
  updateConfig('iconMode', { iconMode }, 'iconMode')
}

const updateAutoOnePage = (autoOnePage: boolean) => {
  updateConfig('autoOnePage', { autoOnePage }, 'autoOnePage')
}

const moveSection = (index: number, delta: -1 | 1) => {
  const nextOrder = [...orderedSections.value]
  const nextIndex = index + delta
  if (nextIndex < 0 || nextIndex >= nextOrder.length) return
  const [section] = nextOrder.splice(index, 1)
  nextOrder.splice(nextIndex, 0, section)
  updateConfig('sectionOrder', { sectionOrder: nextOrder }, 'sectionOrder')
}

const toggleSection = (section: ResumePresentationSection, visible: boolean) => {
  const hiddenSections = visible
    ? props.modelValue.hiddenSections.filter((item) => item !== section)
    : Array.from(new Set([...props.modelValue.hiddenSections, section]))
  updateConfig('hiddenSections', { hiddenSections }, 'hiddenSections')
}
</script>

<style scoped lang="scss">
.resume-presentation-settings {
  --settings-surface: #ffffff;
  --settings-text: #17211b;
  --settings-muted: #64736a;
  --settings-border: #d8e1da;
  --settings-primary: #1f8f5f;
  --settings-primary-soft: #e8f6ee;
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--settings-border);
  border-radius: 8px;
  background: var(--settings-surface);
  color: var(--settings-text);
}

.resume-presentation-settings__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 18px 14px;
  border-bottom: 1px solid var(--settings-border);

  > svg {
    flex: 0 0 auto;
    color: var(--settings-primary);
  }

  h2,
  p {
    margin: 0;
  }

  h2 {
    margin-top: 3px;
    font-size: 17px;
    line-height: 1.3;
  }
}

.resume-presentation-settings__eyebrow {
  color: var(--settings-primary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.resume-presentation-settings__description,
.settings-section__heading p {
  margin-top: 5px !important;
  color: var(--settings-muted);
  font-size: 12px;
  line-height: 1.5;
}

.resume-presentation-settings__body {
  display: grid;
  gap: 0;
}

.settings-section {
  padding: 17px 18px;
  border-bottom: 1px solid var(--settings-border);

  &:last-child {
    border-bottom: 0;
  }
}

.settings-section__heading {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;

  h3 {
    display: flex;
    align-items: center;
    gap: 7px;
    margin: 0;
    font-size: 13px;
    line-height: 1.35;
  }

  h3 svg {
    color: var(--settings-primary);
  }

  p {
    margin-bottom: 0;
  }
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  :deep(.el-form-item) {
    min-width: 0;
    margin-bottom: 0;
  }

  :deep(.el-form-item__label) {
    color: var(--settings-muted);
    font-size: 11px;
    line-height: 1.4;
  }

  :deep(.el-input-number),
  :deep(.el-select) {
    width: 100%;
  }
}

.settings-grid--template {
  grid-template-columns: minmax(0, 1.4fr) minmax(100px, 0.6fr);
}

.template-version-readonly {
  display: grid;
  gap: 3px;
  min-height: 32px;
  align-content: center;
  padding: 4px 10px;
  border: 1px solid var(--settings-border);
  border-radius: 6px;
  background: #f5f8f5;
  color: var(--settings-text);

  strong {
    font-size: 13px;
  }

  span {
    color: var(--settings-muted);
    font-size: 10px;
  }
}

.settings-control {
  display: grid;
  gap: 9px;
  margin-bottom: 14px;
}

.settings-control__label {
  color: var(--settings-muted);
  font-size: 11px;
}

.alignment-options,
.icon-mode-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
}

.alignment-option,
.icon-mode-option {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  min-height: 38px;
  padding: 7px 8px;
  border: 1px solid var(--settings-border);
  border-radius: 6px;
  background: #fbfdfb;
  color: var(--settings-muted);
  font: inherit;
  font-size: 11px;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    border-color: var(--settings-primary);
    outline: 0;
  }

  &.is-active {
    border-color: var(--settings-primary);
    background: var(--settings-primary-soft);
    color: var(--settings-text);
    font-weight: 650;
  }
}

.icon-mode-option {
  display: grid;
  justify-items: start;
  justify-content: stretch;
  gap: 2px;
  text-align: left;

  small {
    color: var(--settings-muted);
    font-size: 10px;
    font-weight: 400;
    line-height: 1.35;
  }
}

.basic-field-list {
  display: grid;
  gap: 7px;
}

.basic-field-list__item,
.settings-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
  padding: 8px 9px;
  border: 1px solid var(--settings-border);
  border-radius: 6px;
  background: #fbfdfb;

  &.is-hidden {
    background: #f5f7f5;
    color: var(--settings-muted);
  }
}

.basic-field-list__identity {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  font-size: 12px;
  font-weight: 650;

  > svg {
    flex: 0 0 auto;
    color: var(--settings-muted);
  }
}

.basic-field-list__actions {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 2px;

  :deep(.el-checkbox) {
    margin-left: 3px;
  }
}

.basic-field-list__icon {
  width: 88px;
}

.settings-switch-row {
  margin-top: 14px;

  strong,
  p {
    margin: 0;
  }

  strong {
    font-size: 12px;
  }

  p {
    margin-top: 3px;
    color: var(--settings-muted);
    font-size: 10px;
    line-height: 1.4;
  }
}

.settings-unavailable {
  display: grid;
  gap: 3px;
  padding: 10px 11px;
  border: 1px dashed var(--settings-border);
  border-radius: 6px;
  background: #f8faf8;
  color: var(--settings-muted);
  font-size: 11px;
  line-height: 1.45;

  strong {
    color: var(--settings-text);
    font-size: 12px;
  }
}

.accent-options {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 7px;
}

.accent-option {
  display: grid;
  justify-items: center;
  gap: 5px;
  min-width: 0;
  padding: 7px 4px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--settings-muted);
  font: inherit;
  font-size: 10px;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    border-color: var(--settings-border);
    outline: 0;
  }

  &.is-active {
    border-color: var(--settings-primary);
    background: var(--settings-primary-soft);
    color: var(--settings-text);
    font-weight: 650;
  }
}

.accent-option__swatch {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(23, 33, 27, 0.12);
}

.accent-option.is-default .accent-option__swatch { background: #1b1b18; }
.accent-option.is-blue .accent-option__swatch { background: #3b82f6; }
.accent-option.is-green .accent-option__swatch { background: #10b981; }
.accent-option.is-purple .accent-option__swatch { background: #8b5cf6; }
.accent-option.is-orange .accent-option__swatch { background: #f97316; }
.accent-option.is-red .accent-option__swatch { background: #ef4444; }
.accent-option.is-slate .accent-option__swatch { background: #475569; }
.accent-option.is-black .accent-option__swatch { background: #000000; }

.section-list {
  display: grid;
  gap: 7px;
}

.section-list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
  padding: 8px 9px;
  border: 1px solid var(--settings-border);
  border-radius: 6px;
  background: #fbfdfb;

  &.is-hidden {
    background: #f5f7f5;
    color: var(--settings-muted);
  }
}

.section-list__identity,
.section-list__actions {
  display: flex;
  align-items: center;
  min-width: 0;
}

.section-list__identity {
  gap: 7px;
  font-size: 12px;
  font-weight: 650;

  > svg {
    flex: 0 0 auto;
    color: var(--settings-muted);
  }
}

.section-list__actions {
  flex: 0 0 auto;
  gap: 2px;

  :deep(.el-checkbox) {
    margin-left: 3px;
  }
}

@media (max-width: 520px) {
  .settings-grid,
  .settings-grid--template {
    grid-template-columns: 1fr;
  }

  .accent-options {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .alignment-options,
  .icon-mode-options {
    grid-template-columns: 1fr;
  }

  .basic-field-list__item {
    align-items: flex-start;
  }

  .basic-field-list__actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .section-list__item {
    align-items: flex-start;
  }

  .section-list__actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }
}
</style>
