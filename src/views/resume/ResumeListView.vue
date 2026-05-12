<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">简历管理</h1>
        <p class="page-subtitle">维护用于模拟面试的简历资料和项目经历。V1 仅支持手动录入，不做文件上传解析。</p>
      </div>
      <el-button type="primary" @click="router.push('/resumes/create')">新建简历</el-button>
    </div>

    <section class="content-card">
      <div class="content-card__body">
        <div class="toolbar">
          <el-form :model="query" inline>
            <el-form-item label="关键词">
              <el-input v-model.trim="query.keyword" clearable placeholder="简历名称 / 求职方向" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSearch">查询</el-button>
              <el-button @click="handleReset">重置</el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>

      <div class="resume-list" v-loading="loading">
        <el-empty v-if="!loading && resumes.length === 0" description="暂无简历，先创建一份用于模拟面试" />
        <article v-for="item in resumes" v-else :key="item.id" class="resume-item">
          <div class="resume-item__main">
            <div class="resume-title">
              <span>{{ item.resumeName }}</span>
              <el-tag v-if="item.isDefault === 1" type="success" effect="plain">默认</el-tag>
              <StatusTag :status="item.status" />
            </div>
            <p class="resume-meta">
              {{ item.targetPosition || '未填写求职方向' }} · 项目经历 {{ item.projectCount || 0 }} 个 ·
              更新于 {{ formatDateTime(item.updatedAt || item.createdAt) }}
            </p>
            <p class="resume-skills">{{ item.skills || '暂无技能栈摘要' }}</p>
          </div>
          <div class="resume-actions">
            <el-button @click="router.push(`/resumes/${item.id}/edit`)">编辑</el-button>
            <el-button :disabled="item.isDefault === 1" @click="handleSetDefault(item)">设为默认</el-button>
            <el-button type="danger" plain @click="handleDelete(item)">删除</el-button>
          </div>
        </article>
      </div>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="query.pageNo"
          v-model:page-size="query.pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :page-sizes="[10, 20, 50]"
          @change="fetchResumes"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { deleteResumeApi, getResumesApi, setDefaultResumeApi } from '@/api/resume'
import StatusTag from '@/components/common/StatusTag.vue'
import type { ResumeQueryDTO, ResumeVO } from '@/types/resume'
import { formatDateTime } from '@/utils/format'

const router = useRouter()
const loading = ref(false)
const resumes = ref<ResumeVO[]>([])
const total = ref(0)

const query = reactive<ResumeQueryDTO>({
  keyword: '',
  pageNo: 1,
  pageSize: 10
})

const fetchResumes = async () => {
  loading.value = true
  try {
    const result = await getResumesApi(query)
    resumes.value = result.records || []
    total.value = result.total || 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  query.pageNo = 1
  fetchResumes()
}

const handleReset = () => {
  Object.assign(query, {
    keyword: '',
    pageNo: 1,
    pageSize: 10
  })
  fetchResumes()
}

const handleSetDefault = async (row: ResumeVO) => {
  await setDefaultResumeApi(row.id)
  ElMessage.success('默认简历已更新')
  await fetchResumes()
}

const handleDelete = async (row: ResumeVO) => {
  await ElMessageBox.confirm(`确认删除简历 ${row.resumeName}？历史面试会继续使用已保存快照。`, '删除确认', {
    type: 'warning'
  })
  await deleteResumeApi(row.id)
  ElMessage.success('简历已删除')
  await fetchResumes()
}

onMounted(fetchResumes)
</script>

<style scoped lang="scss">
.resume-list {
  min-height: 260px;
  border-top: 1px solid var(--app-border);
}

.resume-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 20px;
  border-bottom: 1px solid var(--app-border);
}

.resume-item__main {
  min-width: 0;
}

.resume-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 17px;
  font-weight: 700;
}

.resume-meta,
.resume-skills {
  margin: 8px 0 0;
  color: var(--app-text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.resume-skills {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resume-actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
}

@media (max-width: 780px) {
  .resume-item {
    align-items: flex-start;
    flex-direction: column;
  }

  .resume-actions {
    flex-wrap: wrap;
  }
}
</style>
