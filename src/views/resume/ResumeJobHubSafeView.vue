<template>
  <ResumeJobHubView v-if="!hubError" :key="hubRetryKey" />

  <div v-else class="resume-entry-safe">
    <section class="safe-hero">
      <div>
        <div class="safe-kicker">
          <FileText :size="16" />
          简历与岗位
        </div>
        <h1>先把简历和目标岗位补起来</h1>
        <p>
          简历与岗位页暂时打不开，但你仍然可以继续完成新用户第一步：管理简历、创建简历、补岗位描述或发起岗位匹配。
        </p>
      </div>
      <el-button text :loading="retrying" @click="retryHub">
        <RefreshCw :size="16" />
        重试简历与岗位页
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
        title="简历与岗位暂时打不开"
        :description="hubError"
      >
        <div class="safe-note__actions">
          <el-button type="primary" @click="router.push('/resumes/manage')">进入简历清单</el-button>
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
    hubError.value = getErrorMessage(error, '简历与岗位页暂时无法加载，请先使用下方入口继续完成简历和岗位准备。')
    fail()
  }
})

const actionItems = [
  {
    title: '进入简历清单',
    desc: '查看、编辑或设为默认简历。',
    path: '/resumes/manage',
    icon: FileText
  },
  {
    title: '创建简历',
    desc: '先补一份可用于匹配的简历。',
    path: '/resumes/create',
    icon: Plus
  },
  {
    title: '补目标岗位',
    desc: '粘贴岗位描述，生成后续训练依据。',
    path: '/job-targets',
    icon: Briefcase
  },
  {
    title: '发起岗位匹配',
    desc: '用简历和岗位描述生成匹配报告。',
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
  hubError.value = getErrorMessage(error, '简历与岗位页暂时无法加载，请先使用下方入口继续完成简历和岗位准备。')
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
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-color);
}

.safe-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 700;
}

.safe-hero h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: 28px;
  line-height: 1.25;
}

.safe-hero p {
  max-width: 760px;
  margin: 12px 0 0;
  color: var(--text-secondary);
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
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-color);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.safe-action:hover {
  border-color: var(--primary-color);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.safe-action__icon {
  display: inline-flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(37, 99, 235, 0.1);
  color: var(--primary-color);
}

.safe-action strong {
  color: var(--text-primary);
  font-size: 16px;
}

.safe-action small {
  flex: 1;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.55;
}

.safe-action > svg:last-child {
  color: var(--text-secondary);
}

.safe-note {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface-color);
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
