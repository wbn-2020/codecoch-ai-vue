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
    // Collect both the dedicated test tree and co-located src tests. The src/**
    // tests were historically orphaned (never run), which let their expectations
    // silently drift from the code; keeping them in the default run prevents that.
    include: ['tests/unit/**/*.test.ts', 'src/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
    // Some request-contract tests intentionally replace Axios' process-wide
    // default adapter. Keep files serialized so those tests cannot leak
    // adapter state into component tests running in another file.
    fileParallelism: false
  }
})
