import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import '@/styles/tailwind.css'
import '@/styles/index.scss'
import '@/styles/element-dark.scss'

import ElementPlus from 'element-plus'
import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { permission } from './directives/permission'
import router from './router'

document.documentElement.classList.add('dark')

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

app.directive('permission', permission)

app.mount('#app')
