<template>
  <ResumeJobHubView v-if="!hubError" :key="hubRetryKey" />

  <div v-else class="resume-entry-safe">
    <section class="safe-hero">
      <div>
        <div class="safe-kicker">
          <FileText :size="16" />
          简历实验室
        </div>
        <h1>先继续推进简历实验</h1>
        <p>
          当前实验室总览没有加载成功，可能是部分接口或资料状态暂时不可用。你仍然可以先创建简历、补目标岗位描述、整理项目证据，或直接进入匹配实验台。
        </p>
      </div>
      <el-button text :loading="retrying" @click="retryHub">
        <RefreshCw :size="16" />
        重试实验室总览
      </el-button>
    </section>

    <section class="safe-actions">
      <button
        v-for="item in actionItems"
        :key="item.path"
        class="safe-action"
        type="button"
        @click="router.push(item.path)"
      >
        <span class="safe-action__icon">
          <component :is="item.icon" :size="20" />
        </span>
        <strong>{{ item.title }}</strong>
        <small>{{ item.desc }}</small>
        <ArrowRight :size="15" />
      </button>
    </section>

    <section class="safe-note">
      <AppState
        type="error"
        title="实验室总览暂时不可用"
        :description="hubError"
      >
        <div class="safe-note__actions">
          <el-button type="primary" @click="router.push('/resumes/create')">创建简历</el-button>
          <el-button @click="router.push('/resume-match')">进入 JD 匹配</el-button>
          <el-button @click="router.push('/dashboard')">回到今日计划</el-button>
        </div>
      </AppState>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ArrowRight, Briefcase, FileText, GitCompareArrows, Plus, RefreshCw } from 'lucide-vue-next'
import { defineAsyncComponent, nextTick, onErrorCaptured, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppState from '@/components/common/AppState.vue'
import { getErrorMessage } from '@/utils/error'

const router = useRouter()
const hubError = ref('')
const hubRetryKey = ref(0)
const retrying = ref(false)

const ResumeJobHubView = defineAsyncComponent({
  loader: () => import('./ResumeJobHubView.vue'),
  onError(error, retry, fail, attempts) {
    if (attempts <= 1) {
      retry()
      return
    }
    hubError.value = getErrorMessage(error, '简历实验室总览暂时无法加载，请先使用下方入口继续完成简历、岗位和项目证据准备。')
    fail()
  }
})

const actionItems = [
  {
    title: '进入简历清单',
    desc: '查看、编辑或设为默认简历，不需要等待总览恢复。',
    path: '/resumes/manage',
    icon: FileText
  },
  {
    title: '创建简历',
    desc: '先补一份可用于 JD 匹配和面试追问的简历。',
    path: '/resumes/create',
    icon: Plus
  },
  {
    title: '补目标岗位',
    desc: '粘贴岗位描述，让后续训练有明确岗位上下文。',
    path: '/job-targets',
    icon: Briefcase
  },
  {
    title: '发起岗位匹配',
    desc: '用真实简历和 JD 生成匹配报告，不伪造成熟结论。',
    path: '/resume-match',
    icon: GitCompareArrows
  }
]

const retryHub = async () => {
  retrying.value = true
  hubError.value = ''
  hubRetryKey.value += 1
  await nextTick()
  retrying.value = false
}

onErrorCaptured((error) => {
  hubError.value = getErrorMessage(error, '简历实验室总览暂时无法加载，请先使用下方入口继续完成简历、岗位和项目证据准备。')
  return false
})
</script>

<style scoped lang="scss">
.resume-entry-safe {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.safe-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 28px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
  box-shadow: var(--app-shadow);
}

.safe-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  color: var(--app-primary);
  font-size: 13px;
  font-weight: 700;
}

.safe-hero h1 {
  margin: 0;
  color: var(--app-text);
  font-size: 28px;
  line-height: 1.25;
}

.safe-hero p {
  max-width: 760px;
  margin: 12px 0 0;
  color: var(--app-text-muted);
  line-height: 1.7;
}

.safe-actions {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.safe-action {
  position: relative;
  display: flex;
  min-height: 152px;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.safe-action:hover {
  border-color: var(--app-primary);
  box-shadow: var(--app-shadow);
  transform: translateY(-1px);
}

.safe-action__icon {
  display: inline-flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--app-primary-soft);
  color: var(--app-primary);
}

.safe-action strong {
  color: var(--app-text);
  font-size: 16px;
}

.safe-action small {
  flex: 1;
  color: var(--app-text-muted);
  font-size: 13px;
  line-height: 1.55;
}

.safe-action > svg:last-child {
  color: var(--app-text-muted);
}

.safe-note {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
  padding: 18px;
}

.safe-note__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

@media (max-width: 960px) {
  .safe-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .safe-hero {
    flex-direction: column;
    padding: 20px;
  }

  .safe-hero h1 {
    font-size: 22px;
  }

  .safe-actions {
    grid-template-columns: 1fr;
  }
}
</style>
