import { computed, reactive, ref, watch } from 'vue'

export type AdminTableSize = 'large' | 'default' | 'small'

export interface AdminTableColumnOption<K extends string = string> {
  key: K
  label: string
  required?: boolean
  defaultVisible?: boolean
}

interface StoredAdminTableView<K extends string> {
  size?: AdminTableSize
  visibleColumns?: Partial<Record<K, boolean>>
}

const validTableSizes = new Set<AdminTableSize>(['large', 'default', 'small'])

export const adminTableSizeOptions: Array<{ label: string; value: AdminTableSize }> = [
  { label: '宽松', value: 'large' },
  { label: '标准', value: 'default' },
  { label: '紧凑', value: 'small' }
]

export const useAdminTableView = <K extends string>(
  storageKey: string,
  columns: readonly AdminTableColumnOption<K>[]
) => {
  const tableSize = ref<AdminTableSize>('default')
  const visibleColumns = reactive({} as Record<K, boolean>) as Record<K, boolean>
  const storageId = `codecoachai:${storageKey}:table-view`

  const applyDefaultColumns = () => {
    columns.forEach((item) => {
      visibleColumns[item.key] = item.required ? true : item.defaultVisible !== false
    })
  }

  const readStoredView = (): StoredAdminTableView<K> | null => {
    if (typeof window === 'undefined') return null
    try {
      const raw = window.localStorage.getItem(storageId)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  const persistView = () => {
    if (typeof window === 'undefined') return
    try {
      const payload: StoredAdminTableView<K> = {
        size: tableSize.value,
        visibleColumns: { ...(visibleColumns as Record<K, boolean>) }
      }
      window.localStorage.setItem(storageId, JSON.stringify(payload))
    } catch {
      // Ignore storage failures so admin tables still render in private or restricted modes.
    }
  }

  applyDefaultColumns()

  const storedView = readStoredView()
  if (storedView?.size && validTableSizes.has(storedView.size)) {
    tableSize.value = storedView.size
  }
  if (storedView?.visibleColumns) {
    columns.forEach((item) => {
      const storedValue = storedView.visibleColumns?.[item.key]
      if (!item.required && typeof storedValue === 'boolean') {
        visibleColumns[item.key] = storedValue
      }
    })
  }

  const isColumnVisible = (key: K) => visibleColumns[key] !== false
  const visibleColumnCount = computed(() => columns.filter((item) => isColumnVisible(item.key)).length)

  const resetTableView = () => {
    tableSize.value = 'default'
    applyDefaultColumns()
    persistView()
  }

  watch(tableSize, persistView)
  watch(visibleColumns, persistView, { deep: true })

  return {
    tableSize,
    tableSizeOptions: adminTableSizeOptions,
    columnOptions: columns,
    visibleColumns,
    visibleColumnCount,
    isColumnVisible,
    resetTableView
  }
}
