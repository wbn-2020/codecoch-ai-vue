import { onBeforeUnmount, watch, type MaybeRefOrGetter, toValue } from 'vue'

let lockCount = 0
let previousOverflow = ''
let previousPaddingRight = ''

const lockDocument = () => {
  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow
    previousPaddingRight = document.body.style.paddingRight

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`
  }

  lockCount += 1
}

const unlockDocument = () => {
  if (lockCount === 0) return

  lockCount -= 1
  if (lockCount > 0) return

  document.body.style.overflow = previousOverflow
  document.body.style.paddingRight = previousPaddingRight
}

export const useDocumentScrollLock = (active: MaybeRefOrGetter<boolean>) => {
  let ownsLock = false

  const stop = watch(
    () => Boolean(toValue(active)),
    (shouldLock) => {
      if (shouldLock && !ownsLock) {
        lockDocument()
        ownsLock = true
        return
      }

      if (!shouldLock && ownsLock) {
        unlockDocument()
        ownsLock = false
      }
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    stop()
    if (!ownsLock) return
    unlockDocument()
    ownsLock = false
  })
}
