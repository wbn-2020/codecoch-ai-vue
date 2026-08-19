<template>
  <div class="resume-workbench-entry" role="status" aria-live="polite">
    <p v-if="loading">正在打开简历工作台…</p>
    <div v-else class="resume-workbench-entry__error">
      <p>{{ errorMessage }}</p>
      <button type="button" @click="openWorkbench">重试</button>
      <button type="button" @click="router.replace('/resumes/create')">新建简历</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { getResumesApi } from '@/api/resume'
import { getErrorMessage } from '@/utils/error'

const router = useRouter()
const loading = ref(true)
const errorMessage = ref('')

const openWorkbench = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const page = await getResumesApi({ pageNo: 1, pageSize: 100 })
    const resume = page.records.find((item) => item.isDefault === 1) ?? page.records[0]
    await router.replace(resume ? `/resumes/${resume.id}/edit` : '/resumes/create')
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '简历工作台暂时无法打开，请重试或新建简历。')
  } finally {
    loading.value = false
  }
}

onMounted(openWorkbench)
</script>

<style scoped>
.resume-workbench-entry {
  display: grid;
  min-height: 240px;
  place-items: center;
  padding: 24px;
}

.resume-workbench-entry__error {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
</style>
