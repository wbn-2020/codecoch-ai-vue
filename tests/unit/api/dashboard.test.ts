import { afterEach, describe, expect, it, vi } from 'vitest'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('@/utils/request', () => ({
  default: { get }
}))

import { getAdminDashboardOverviewApi } from '@/api/dashboard'

describe('admin dashboard api', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('coalesces concurrent overview reads and allows a later refresh after completion', async () => {
    let resolveRequest: (value: { summaryCards: Array<never> }) => void = () => undefined
    get.mockReturnValueOnce(new Promise((resolve) => {
      resolveRequest = resolve
    }))

    const layoutRequest = getAdminDashboardOverviewApi({ silentError: true })
    const pageRequest = getAdminDashboardOverviewApi()

    expect(pageRequest).toBe(layoutRequest)
    expect(get).toHaveBeenCalledTimes(1)

    resolveRequest({ summaryCards: [] })
    await expect(layoutRequest).resolves.toMatchObject({ summaryCards: [] })

    get.mockResolvedValueOnce({ summaryCards: [] })
    await getAdminDashboardOverviewApi()
    expect(get).toHaveBeenCalledTimes(2)
  })
})
