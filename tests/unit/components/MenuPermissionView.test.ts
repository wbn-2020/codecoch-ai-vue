import { flushPromises, mount } from '@vue/test-utils'
import { computed, defineComponent, h, nextTick, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const adminGovernanceApi = vi.hoisted(() => ({
  getAdminMenusApi: vi.fn(),
  getAdminRoleMenusApi: vi.fn(),
  grantAdminRoleMenusApi: vi.fn()
}))
const getAdminRolesApi = vi.hoisted(() => vi.fn())
const confirmDangerActionPreview = vi.hoisted(() => vi.fn())
const treeSetCalls: number[][] = []

vi.mock('@/api/adminGovernance', () => adminGovernanceApi)
vi.mock('@/api/user', () => ({ getAdminRolesApi }))
vi.mock('@/utils/dangerAction', () => ({ confirmDangerActionPreview }))
vi.mock('@/utils/idempotency', () => ({
  createOperationIdempotencyKey: () => 'permission-test-key'
}))
vi.mock('@/composables/useAdminMobileReadonly', () => ({
  useAdminMobileReadonly: () => ({
    guardAdminMobileWrite: () => true,
    isAdminMobileReadonly: computed(() => false),
    mobileReadonlyTitle: () => undefined
  })
}))

import MenuPermissionView from '@/views/admin/MenuPermissionView.vue'

const menus = [
  {
    id: 1,
    menuName: 'Question governance',
    path: '/admin/questions',
    type: 'MENU',
    children: [
      {
        id: 2,
        menuName: 'Question reviews',
        path: '/admin/question-reviews',
        type: 'MENU',
        children: []
      },
      {
        id: 3,
        menuName: 'Duplicate reviews',
        path: '/admin/question-duplicate-reviews',
        type: 'MENU',
        children: []
      }
    ]
  }
]

const TreeStub = defineComponent({
  emits: ['check'],
  setup(_, { emit, expose }) {
    const checked = ref<number[]>([])
    const halfChecked = ref<number[]>([])
    const leafIds = computed(() => checked.value.filter((id) => id === 2 || id === 3))

    const applyLeaves = (ids: number[]) => {
      const leaves = Array.from(new Set(ids.filter((id) => id === 2 || id === 3))).sort()
      if (leaves.length === 2) {
        checked.value = [1, 2, 3]
        halfChecked.value = []
      } else {
        checked.value = leaves
        halfChecked.value = leaves.length ? [1] : []
      }
    }

    const setCheckedKeys = (ids: Array<string | number>) => {
      const normalized = ids.map(Number).sort((a, b) => a - b)
      treeSetCalls.push(normalized)
      if (normalized.includes(1)) {
        checked.value = [1, 2, 3]
        halfChecked.value = []
        return
      }
      applyLeaves(normalized)
    }

    const toggleLeaf = async (id: number) => {
      const nextLeaves = leafIds.value.includes(id)
        ? leafIds.value.filter((item) => item !== id)
        : [...leafIds.value, id]
      applyLeaves(nextLeaves)
      await nextTick()
      emit('check')
    }

    expose({
      getCheckedKeys: () => [...checked.value],
      getHalfCheckedKeys: () => [...halfChecked.value],
      setCheckedKeys
    })

    return () => h('section', { 'data-test': 'tree-state' }, [
      h('span', { 'data-test': 'checked-keys' }, checked.value.join(',')),
      h('span', { 'data-test': 'half-checked-keys' }, halfChecked.value.join(',')),
      h('button', { 'data-test': 'toggle-2', onClick: () => toggleLeaf(2) }, 'toggle 2'),
      h('button', { 'data-test': 'toggle-3', onClick: () => toggleLeaf(3) }, 'toggle 3')
    ])
  }
})

const ButtonStub = defineComponent({
  emits: ['click'],
  setup(_, { emit, slots }) {
    return () => h('button', { onClick: () => emit('click') }, slots.default?.())
  }
})

const AppStateStub = defineComponent({
  setup(_, { slots }) {
    return () => h('section', slots.default?.())
  }
})

const mountView = () => mount(MenuPermissionView, {
  global: {
    config: {
      warnHandler: () => undefined
    },
    directives: {
      loading: () => undefined,
      permission: () => undefined
    },
    stubs: {
      AppState: AppStateStub,
      ElButton: ButtonStub,
      ElTree: TreeStub,
      ElTag: {
        template: '<span><slot /></span>'
      }
    }
  }
})

const buttonByText = (wrapper: ReturnType<typeof mountView>, text: string) =>
  wrapper.findAll('button').find((button) => button.text().includes(text))

describe('MenuPermissionView grant tree semantics', () => {
  beforeEach(() => {
    treeSetCalls.length = 0
    getAdminRolesApi.mockResolvedValue([
      { roleId: 10, roleCode: 'ADMIN', roleName: 'Admin' }
    ])
    adminGovernanceApi.getAdminMenusApi.mockResolvedValue(menus)
    adminGovernanceApi.getAdminRoleMenusApi.mockResolvedValue([1, 2])
    adminGovernanceApi.grantAdminRoleMenusApi.mockResolvedValue(undefined)
    confirmDangerActionPreview.mockResolvedValue(true)
  })

  it('hydrates a half-selected parent plus one leaf without expanding the full branch', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(treeSetCalls.at(-1)).toEqual([2])
    expect(wrapper.get('[data-test="checked-keys"]').text()).toBe('2')
    expect(wrapper.get('[data-test="half-checked-keys"]').text()).toBe('1')
    expect(wrapper.text()).toContain('当前授权与已保存状态一致')
  })

  it('keeps edit and undo aligned with the original half-selected grant', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('[data-test="toggle-3"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-test="checked-keys"]').text()).toBe('1,2,3')
    expect(wrapper.text()).toContain('新增 1 项，移除 0 项')

    await buttonByText(wrapper, '取消更改')?.trigger('click')
    await flushPromises()

    expect(treeSetCalls.at(-1)).toEqual([2])
    expect(wrapper.get('[data-test="checked-keys"]').text()).toBe('2')
    expect(wrapper.get('[data-test="half-checked-keys"]').text()).toBe('1')
    expect(wrapper.text()).toContain('当前授权与已保存状态一致')
  })

  it('saves semantic half-parent keys and restores the same draft after remount', async () => {
    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('[data-test="toggle-2"]').trigger('click')
    await wrapper.get('[data-test="toggle-3"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-test="checked-keys"]').text()).toBe('3')
    expect(wrapper.get('[data-test="half-checked-keys"]').text()).toBe('1')

    await buttonByText(wrapper, '保存授权')?.trigger('click')
    await flushPromises()

    expect(adminGovernanceApi.grantAdminRoleMenusApi).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ menuIds: [1, 3] })
    )

    wrapper.unmount()
    adminGovernanceApi.getAdminRoleMenusApi.mockResolvedValue([1, 3])
    const refreshed = mountView()
    await flushPromises()

    expect(treeSetCalls.at(-1)).toEqual([3])
    expect(refreshed.get('[data-test="checked-keys"]').text()).toBe('3')
    expect(refreshed.get('[data-test="half-checked-keys"]').text()).toBe('1')
    expect(refreshed.text()).toContain('当前授权与已保存状态一致')
  })
})
