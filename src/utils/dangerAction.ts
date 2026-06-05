import { ElMessageBox } from 'element-plus'
import { h, type VNode } from 'vue'

export interface DangerActionPreviewOptions {
  title: string
  action: string
  target?: string
  impact: string
  rollback?: string
  audit?: string
  tips?: string[]
  confirmButtonText?: string
  cancelButtonText?: string
}

const previewRow = (label: string, value: string) =>
  h('li', { class: 'danger-action-preview__row' }, [
    h('strong', `${label}：`),
    h('span', value)
  ])

const buildPreviewMessage = (options: DangerActionPreviewOptions) => {
  const rows: VNode[] = [
    previewRow('操作', options.action),
    previewRow('影响范围', options.target || '按后端接口参数和当前筛选条件执行'),
    previewRow('影响说明', options.impact),
    previewRow('回滚/恢复', options.rollback || '无法由前端自动回滚，需结合操作日志和业务数据人工恢复'),
    previewRow('审计记录', options.audit || '提交后会进入后端操作日志或任务日志，可按操作人、时间和任务编号追踪')
  ]

  const children: VNode[] = [
    h('p', { class: 'danger-action-preview__intro' }, '执行前请确认以下预览信息，避免误触发批量或高成本操作。'),
    h('ul', { class: 'danger-action-preview__list' }, rows)
  ]

  if (options.tips?.length) {
    children.push(
      h('div', { class: 'danger-action-preview__tips' }, [
        h('strong', '执行前检查：'),
        h('ul', options.tips.map((item) => h('li', item)))
      ])
    )
  }

  return h('div', { class: 'danger-action-preview' }, children)
}

export const confirmDangerActionPreview = async (options: DangerActionPreviewOptions) => {
  try {
    await ElMessageBox.confirm(buildPreviewMessage(options), options.title, {
      type: 'warning',
      confirmButtonText: options.confirmButtonText || '确认执行',
      cancelButtonText: options.cancelButtonText || '取消'
    })
    return true
  } catch {
    return false
  }
}
