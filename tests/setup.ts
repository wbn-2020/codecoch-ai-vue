import { config } from '@vue/test-utils'
import axios, { AxiosError, type AxiosAdapter } from 'axios'

const rejectUnexpectedUnitTestNetwork: AxiosAdapter = (requestConfig) => {
  const method = String(requestConfig.method || 'GET').toUpperCase()
  const url = String(requestConfig.url || '(missing URL)')
  return Promise.reject(new AxiosError(
    `Unexpected unit-test network request: ${method} ${url}`,
    AxiosError.ERR_NOT_SUPPORT,
    requestConfig
  ))
}

// Unit tests must mock their transport boundary explicitly. This keeps
// accidental requests observable without opening sockets to localhost.
axios.defaults.adapter = rejectUnexpectedUnitTestNetwork

config.global.stubs = {
  'el-icon': {
    template: '<i class="el-icon-stub"><slot /></i>'
  },
  'el-button': {
    template: '<button class="el-button-stub"><slot /></button>'
  },
  transition: false,
  teleport: true
}
