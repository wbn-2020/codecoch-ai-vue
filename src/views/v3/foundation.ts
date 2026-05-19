import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

export type AppStateType = 'loading' | 'empty' | 'error' | 'disabled' | 'api-pending'

export interface V3FoundationAction {
  label: string
  to: RouteLocationRaw
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default'
  disabled?: boolean
}

export interface V3FoundationShellProps {
  title: string
  eyebrow: string
  description: string
  statusLabel: string
  apiItems: string[]
  scopeItems: string[]
  actions?: V3FoundationAction[]
  icon?: Component
  stateType?: AppStateType
  stateTitle?: string
  stateDescription?: string
}
