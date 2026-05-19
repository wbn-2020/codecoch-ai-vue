import { ref, shallowRef, type Ref, type ShallowRef } from 'vue'

export interface UseRequestCacheOptions<T> {
  /** 缓存有效期（ms），默认 60000（1 分钟） */
  ttl?: number
  /** 初始值 */
  initialValue?: T
  /** 缓存 key（用于多实例区分），默认使用函数引用 */
  cacheKey?: string
}

interface CacheEntry<T> {
  data: T
  timestamp: number
}

// 全局缓存 Map，跨组件共享
const globalCache = new Map<string, CacheEntry<unknown>>()

/**
 * useRequestCache - 请求缓存 composable
 *
 * 对同一个 API 请求在 TTL 内复用缓存结果，避免重复请求。
 * 适用于：分类列表、标签列表、配置项等变化频率低的数据。
 *
 * 用法：
 * ```ts
 * const { data, loading, error, execute, invalidate } = useRequestCache(
 *   'question-categories',
 *   () => getCategoriesApi(),
 *   { ttl: 120000 }
 * )
 *
 * // 组件挂载时自动请求（如果缓存过期）
 * onMounted(() => execute())
 *
 * // 手动刷新（忽略缓存）
 * invalidate()
 * await execute()
 * ```
 */
export const useRequestCache = <T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: UseRequestCacheOptions<T> = {}
): {
  data: ShallowRef<T | undefined>
  loading: Ref<boolean>
  error: Ref<string>
  execute: (force?: boolean) => Promise<T | undefined>
  invalidate: () => void
} => {
  const { ttl = 60000, initialValue } = options

  const data = shallowRef<T | undefined>(initialValue) as ShallowRef<T | undefined>
  const loading = ref(false)
  const error = ref('')

  const isCacheValid = (): boolean => {
    const entry = globalCache.get(cacheKey)
    if (!entry) return false
    return Date.now() - entry.timestamp < ttl
  }

  const getCachedData = (): T | undefined => {
    const entry = globalCache.get(cacheKey)
    return entry ? (entry.data as T) : undefined
  }

  const setCache = (value: T) => {
    globalCache.set(cacheKey, { data: value, timestamp: Date.now() })
  }

  const invalidate = () => {
    globalCache.delete(cacheKey)
  }

  const execute = async (force = false): Promise<T | undefined> => {
    // 如果缓存有效且非强制刷新，直接返回缓存
    if (!force && isCacheValid()) {
      const cached = getCachedData()
      if (cached !== undefined) {
        data.value = cached
        return cached
      }
    }

    loading.value = true
    error.value = ''

    try {
      const result = await fetcher()
      data.value = result
      setCache(result)
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : '请求失败'
      return undefined
    } finally {
      loading.value = false
    }
  }

  return {
    data,
    loading,
    error,
    execute,
    invalidate
  }
}

/**
 * 清除所有全局缓存（用于退出登录时）
 */
export const clearAllRequestCache = () => {
  globalCache.clear()
}
