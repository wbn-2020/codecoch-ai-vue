import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
    // Some request-contract tests intentionally replace Axios' process-wide
    // default adapter. Keep files serialized so those tests cannot leak
    // adapter state into component tests running in another file.
    fileParallelism: false
  }
})
