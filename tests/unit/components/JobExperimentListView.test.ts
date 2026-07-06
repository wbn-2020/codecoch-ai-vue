import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getJobExperimentsApi } from '@/api/jobExperiment'
import JobExperimentListView from '@/views/job-experiment/JobExperimentListView.vue'

const routerPush = vi.hoisted(() => vi.fn())
const routeQuery = vi.hoisted(() => ({ demoFlag: 'true' as string | undefined }))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: routeQuery }),
  useRouter: () => ({ push: routerPush })
}))

vi.mock('@/api/jobExperiment', () => ({
  getJobExperimentsApi: vi.fn()
}))

const componentStubs = {
  AppState: {
    template: '<section class="app-state-stub"><slot /></section>'
  },
  'el-alert': true,
  'el-button': {
    template: '<button class="el-button-stub" @click="$emit(\'click\', $event)"><slot /></button>'
  },
  'el-input': true,
  'el-option': true,
  'el-select': true,
  'el-tag': {
    template: '<span class="el-tag-stub"><slot /></span>'
  }
}

const mountList = async () => {
  const wrapper = mount(JobExperimentListView, {
    global: {
      directives: {
        loading: {}
      },
      stubs: componentStubs
    }
  })
  await flushPromises()
  return wrapper
}

describe('JobExperimentListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeQuery.demoFlag = 'true'
    vi.mocked(getJobExperimentsApi).mockResolvedValue({
      records: [],
      total: 0,
      pageNo: 1,
      pageSize: 20
    })
  })

  it('uses route demoFlag as list filter for portfolio demo fallback', async () => {
    await mountList()

    expect(getJobExperimentsApi).toHaveBeenCalledWith(expect.objectContaining({
      demoFlag: true,
      pageNo: 1,
      pageSize: 20
    }))
  })

  it('keeps demoFlag when opening a demo experiment from the list', async () => {
    vi.mocked(getJobExperimentsApi).mockResolvedValue({
      records: [{
        id: 9,
        title: 'Demo experiment',
        status: 'RUNNING',
        demoFlag: 1
      }],
      total: 1,
      pageNo: 1,
      pageSize: 20
    })

    const wrapper = await mountList()
    const buttons = wrapper.findAll('button')
    await buttons.find((button) => button.text() === '查看')?.trigger('click')
    await buttons.find((button) => button.text() === '复盘')?.trigger('click')

    expect(routerPush).toHaveBeenCalledWith('/job-experiments/9?demoFlag=true')
    expect(routerPush).toHaveBeenCalledWith('/job-experiments/9/review?demoFlag=true')
  })
})
