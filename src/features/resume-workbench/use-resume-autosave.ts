import { onScopeDispose, ref } from 'vue'

export interface ResumeAutosaveOptions {
  /** Debounce window before the draft write starts. */
  delay?: number
  /** Checked when the timer fires; a false result skips this round silently. */
  enabled?: () => boolean
  /** The draft write itself. It owns its own error reporting. */
  run: () => Promise<unknown> | unknown
}

export type ResumeAutosaveStatus = 'idle' | 'pending' | 'saving'

/**
 * Debounced draft writing for the resume workbench. It never creates a stable version - that stays
 * an explicit action - and it stays quiet while a manual save is running or the document is clean.
 */
export const useResumeAutosave = (options: ResumeAutosaveOptions) => {
  const delay = options.delay ?? 1200
  const status = ref<ResumeAutosaveStatus>('idle')
  let timer: ReturnType<typeof setTimeout> | null = null

  const clearTimer = () => {
    if (timer === null) return
    clearTimeout(timer)
    timer = null
  }

  const flush = async () => {
    clearTimer()
    if (status.value === 'saving' || options.enabled?.() === false) return false
    status.value = 'saving'
    try {
      await options.run()
      return true
    } finally {
      status.value = 'idle'
    }
  }

  const schedule = () => {
    if (status.value === 'saving') return
    clearTimer()
    status.value = 'pending'
    timer = setTimeout(() => {
      timer = null
      void flush()
    }, delay)
  }

  const cancel = () => {
    clearTimer()
    status.value = 'idle'
  }

  onScopeDispose(clearTimer)

  return { status, schedule, flush, cancel }
}
