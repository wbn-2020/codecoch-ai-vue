import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import '@/styles/tailwind.css'
import '@/styles/index.scss'
import '@/styles/element-dark.scss'

import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { initAppTheme } from '@/features/theme/useTheme'
import { permission } from './directives/permission'
import router from './router'

// 在挂载前注入皮肤变量，避免首屏闪现默认配色
initAppTheme()

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })

app.directive('permission', permission)

app.mount('#app')
