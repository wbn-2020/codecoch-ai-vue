import { config } from '@vue/test-utils'

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
