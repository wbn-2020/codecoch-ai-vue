export const storage = {
  get<T>(key: string, fallback: T | null = null): T | null {
    const rawValue = localStorage.getItem(key)

    if (!rawValue) {
      return fallback
    }

    try {
      return JSON.parse(rawValue) as T
    } catch {
      return rawValue as T
    }
  },

  set<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value))
  },

  remove(key: string): void {
    localStorage.removeItem(key)
  }
}
