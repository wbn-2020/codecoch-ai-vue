import { computed, shallowRef } from 'vue'

import {
  fromResumeDocument,
  mergeFlatEdit,
  toResumeDocument,
  type LegacyProjection,
  type LegacyResumeScalars
} from '@/features/resume-workbench/document-migrator'
import { normalizeResumeDocument } from '@/features/resume-workbench/document-normalizer'
import { applyAnchorReplacement } from '@/features/resume-workbench/document-anchor'
import {
  addBlock,
  addCustomSection,
  addEntryItem,
  moveEntryItem,
  moveSection,
  removeEntryItem,
  removeSection,
  renameSection,
  toggleSectionVisible,
  updateBlockText
} from '@/features/resume-workbench/section-ops'
import type { ResumeBlock, ResumeDocumentV2 } from '@/features/resume-workbench/document'
import type { ResumeDetailVO, ResumeProjectVO } from '@/types/resume'
import type { ResumePresentationConfig } from '@/types/resumePresentation'

const HISTORY_LIMIT = 50

const scalarsOf = (detail?: ResumeDetailVO | null): LegacyResumeScalars => ({
  resumeName: detail?.resumeName,
  realName: detail?.realName,
  email: detail?.email,
  phone: detail?.phone,
  targetPosition: detail?.targetPosition,
  summary: detail?.summary,
  skills: detail?.skills,
  skillStack: detail?.skillStack,
  workSummary: detail?.workSummary,
  workExperience: detail?.workExperience,
  education: detail?.education,
  educationExperience: detail?.educationExperience
})

const projectsOf = (detail?: ResumeDetailVO | null): ResumeProjectVO[] => detail?.projects || []

export interface ResumeDocumentBridgeContext {
  /**
   * 项目行由独立接口持久化，扁平写回时要用「当下」的项目集合重建项目分区；
   * 用载入时的快照重建会让用户刚新增的项目从文档里消失。
   */
  projects?: () => ResumeProjectVO[]
  presentation?: () => ResumePresentationConfig | null | undefined
}

/**
 * 文档 v2 是简历工作台的唯一真相：读取时优先用服务器返回的文档，缺失时由扁平列合成；
 * 所有编辑都以不可变方式替换文档并进入撤销栈。派生的 legacy 投影让既有表单与导出继续可用。
 */
export const useResumeDocument = (context: ResumeDocumentBridgeContext = {}) => {
  const sourceDetail = shallowRef<ResumeDetailVO | null>(null)
  const currentProjects = (): ResumeProjectVO[] => context.projects?.() ?? projectsOf(sourceDetail.value)
  const currentPresentation = () => context.presentation?.() ?? sourceDetail.value?.presentationConfig

  const hydrate = (source?: ResumeDetailVO | null): ResumeDocumentV2 => {
    sourceDetail.value = source || null
    return normalizeResumeDocument(source?.document)
      || toResumeDocument(scalarsOf(source), projectsOf(source), source?.presentationConfig)
  }

  const current = shallowRef<ResumeDocumentV2>(hydrate(null))
  const past = shallowRef<ResumeDocumentV2[]>([])
  const future = shallowRef<ResumeDocumentV2[]>([])

  const commit = (next: ResumeDocumentV2) => {
    if (next === current.value) return
    past.value = [...past.value, current.value].slice(-HISTORY_LIMIT)
    future.value = []
    current.value = next
  }

  const legacy = computed<LegacyProjection>(() => fromResumeDocument(current.value))

  return {
    document: computed(() => current.value),
    legacy,
    projects: computed(() => legacy.value.projects),
    canUndo: computed(() => past.value.length > 0),
    canRedo: computed(() => future.value.length > 0),

    hydrate(source?: ResumeDetailVO | null) {
      past.value = []
      future.value = []
      current.value = hydrate(source)
    },

    replace(next: ResumeDocumentV2 | null | undefined) {
      const normalized = normalizeResumeDocument(next)
      if (normalized) commit(normalized)
    },

    /** 扁平文本编辑（旧表单路径）：重建内置分区内容，保留自定义分区与顺序。 */
    syncLegacy(patch: Partial<LegacyResumeScalars>, projects: ResumeProjectVO[] = currentProjects()) {
      const base: LegacyResumeScalars = {
        realName: legacy.value.realName,
        email: legacy.value.email,
        phone: legacy.value.phone,
        targetPosition: legacy.value.targetPosition,
        summary: legacy.value.summary,
        skillStack: legacy.value.skillStack,
        workExperience: legacy.value.workExperience,
        educationExperience: legacy.value.educationExperience
      }
      commit(mergeFlatEdit(current.value, { ...base, ...patch }, projects, currentPresentation()))
    },

    /** AI 建议按身份锚点整段替换，重排后依然命中同一块内容。 */
    applyAnchor(path: string, replacement: string) {
      commit(applyAnchorReplacement(current.value, path, replacement))
    },

    moveSection: (sectionId: string, toIndex: number) => commit(moveSection(current.value, sectionId, toIndex)),
    toggleSectionVisible: (sectionId: string) => commit(toggleSectionVisible(current.value, sectionId)),
    renameSection: (sectionId: string, title: string) => commit(renameSection(current.value, sectionId, title)),
    addCustomSection: (options: { variant: 'text' | 'entry'; title?: string; at?: number }) =>
      commit(addCustomSection(current.value, options)),
    removeSection: (sectionId: string) => commit(removeSection(current.value, sectionId)),
    addBlock: (sectionId: string, block?: Omit<ResumeBlock, 'id'>) =>
      commit(addBlock(current.value, sectionId, block)),
    updateBlockText: (sectionId: string, blockId: string, text: string) =>
      commit(updateBlockText(current.value, sectionId, blockId, text)),
    addEntryItem: (sectionId: string) => commit(addEntryItem(current.value, sectionId)),
    removeEntryItem: (sectionId: string, itemId: string) => commit(removeEntryItem(current.value, sectionId, itemId)),
    moveEntryItem: (sectionId: string, itemId: string, delta: number) =>
      commit(moveEntryItem(current.value, sectionId, itemId, delta)),

    undo() {
      const previous = past.value[past.value.length - 1]
      if (!previous) return
      past.value = past.value.slice(0, -1)
      future.value = [...future.value, current.value]
      current.value = previous
    },

    redo() {
      const next = future.value[future.value.length - 1]
      if (!next) return
      future.value = future.value.slice(0, -1)
      past.value = [...past.value, current.value]
      current.value = next
    },

    /** 保存载荷：文档为准，扁平列同步写出，兼容尚未升级的读取方。 */
    payload(): LegacyResumeScalars & { document: ResumeDocumentV2 } {
      return {
        ...scalarsOf(sourceDetail.value),
        realName: legacy.value.realName,
        email: legacy.value.email,
        phone: legacy.value.phone,
        targetPosition: legacy.value.targetPosition,
        summary: legacy.value.summary,
        skillStack: legacy.value.skillStack,
        workExperience: legacy.value.workExperience,
        educationExperience: legacy.value.educationExperience,
        document: current.value
      }
    }
  }
}

export type ResumeDocumentBridge = ReturnType<typeof useResumeDocument>
