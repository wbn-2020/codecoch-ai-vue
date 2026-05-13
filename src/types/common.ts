export type RoleCode = 'USER' | 'ADMIN' | string

export type UserStatus = 0 | 1

export interface SelectOption<T = string | number> {
  label: string
  value: T
}
