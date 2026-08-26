import { computed, ref } from 'vue'

export const useResumeHistory = (limit = 30) => {
  const snapshots = ref<string[]>([])
  const cursor = ref(-1)

  const push = (snapshot: string) => {
    if (!snapshot || snapshots.value[cursor.value] === snapshot) return
    const next = snapshots.value.slice(0, cursor.value + 1)
    next.push(snapshot)
    snapshots.value = next.slice(-Math.max(2, limit))
    cursor.value = snapshots.value.length - 1
  }

  const reset = (snapshot?: string) => {
    snapshots.value = snapshot ? [snapshot] : []
    cursor.value = snapshot ? 0 : -1
  }

  const undo = () => {
    if (cursor.value <= 0) return undefined
    cursor.value -= 1
    return snapshots.value[cursor.value]
  }

  const redo = () => {
    if (cursor.value < 0 || cursor.value >= snapshots.value.length - 1) return undefined
    cursor.value += 1
    return snapshots.value[cursor.value]
  }

  return {
    canUndo: computed(() => cursor.value > 0),
    canRedo: computed(() => cursor.value >= 0 && cursor.value < snapshots.value.length - 1),
    push,
    reset,
    undo,
    redo
  }
}
