import type { FileInfoVO } from '@/types/file'

export interface AdminFileParsePresentation {
  status: string
  failed: boolean
  confirmationLabel: string
}

export const presentAdminFileParseState = (
  row?: FileInfoVO | null
): AdminFileParsePresentation => {
  const status = String(row?.parseStatus || '').trim().toUpperCase()
  if (status === 'SUCCESS') {
    return {
      status,
      failed: false,
      confirmationLabel: row?.analysisConfirmed === true ? '已确认' : '状态数据异常'
    }
  }
  if (status === 'WAIT_CONFIRM') {
    return {
      status,
      failed: false,
      confirmationLabel: row?.analysisConfirmed === false ? '待用户确认' : '状态数据异常'
    }
  }
  return {
    status,
    failed: status === 'FAILED',
    confirmationLabel: '当前状态不适用'
  }
}
