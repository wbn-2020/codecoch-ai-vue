import { defineStore } from 'pinia'

const SIDEBAR_KEY = 'codecoachai-sidebar-collapsed'

interface AppState {
  sidebarCollapsed: boolean
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    sidebarCollapsed: localStorage.getItem(SIDEBAR_KEY) === 'true'
  }),

  actions: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
      localStorage.setItem(SIDEBAR_KEY, String(this.sidebarCollapsed))
    },

    setSidebarCollapsed(value: boolean) {
      this.sidebarCollapsed = value
      localStorage.setItem(SIDEBAR_KEY, String(value))
    }
  }
})
