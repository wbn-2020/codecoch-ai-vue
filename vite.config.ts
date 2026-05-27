import { fileURLToPath, URL } from 'node:url'
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'

const createAssetVersionPlugin = (version: string) => {
  const versionSuffix = `?v=${version}`

  const appendVersion = (value: string) => (value.includes('?') ? value : `${value}${versionSuffix}`)

  const processFile = (filePath: string) => {
    const source = readFileSync(filePath, 'utf-8')
    const isHtml = filePath.endsWith('.html')
    const updated = source
      .replace(/((?:src|href)=["']\/assets\/[^"']+\.(?:js|css))(["'])/g, (_, pathPart, quote) => {
        return isHtml ? `${appendVersion(pathPart)}${quote}` : `${pathPart}${quote}`
      })
      .replace(/(from\s*["']\.\/[^"']+\.js)(["'])/g, (_, pathPart, quote) => {
        return `${appendVersion(pathPart)}${quote}`
      })
      .replace(/(import\(\s*["']\.\/[^"']+\.js)(["']\s*\))/g, (_, pathPart, suffix) => {
        return `${appendVersion(pathPart)}${suffix}`
      })
      .replace(/(assets\/[^"']+\.js)(?!\?v=)/g, (assetPath) => appendVersion(assetPath))

    if (updated !== source) {
      writeFileSync(filePath, updated, 'utf-8')
    }
  }

  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const filePath = join(dir, name)
      const stats = statSync(filePath)
      if (stats.isDirectory()) {
        walk(filePath)
      } else if (/\.(html|js)$/.test(name)) {
        processFile(filePath)
      }
    }
  }

  return {
    name: 'codecoachai-asset-version',
    closeBundle() {
      walk('dist')
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const buildVersion = env.VITE_BUILD_VERSION || new Date().toISOString().replace(/\D/g, '').slice(0, 14)
  const gatewayTarget =
    env.VITE_DEV_PROXY_TARGET ||
    env.VITE_API_PROXY_TARGET ||
    env.VITE_GATEWAY_URL ||
    'http://localhost:8080'

  return {
    plugins: [vue(), tailwindcss(), createAssetVersionPlugin(buildVersion)],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vue: ['vue', 'vue-router', 'pinia'],
            elementPlus: ['element-plus', '@element-plus/icons-vue'],
            charts: ['echarts'],
            markdown: ['markdown-it'],
            icons: ['lucide-vue-next'],
            axios: ['axios']
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: gatewayTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    }
  }
})
