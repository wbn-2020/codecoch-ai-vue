<template>
  <div class="research-panel">
    <div class="research-panel__actions">
      <el-button type="primary" :disabled="disabled" @click="openSourceDialog">新增调研来源</el-button>
      <el-button v-if="sources.length" :disabled="disabled" :loading="generating" @click="generateSnapshot">
        生成调研快照
      </el-button>
    </div>

    <el-dialog v-model="sourceVisible" title="新增调研来源" width="560px">
      <el-alert
        type="info"
        show-icon
        :closable="false"
        title="只登记你提供的来源"
        description="登记 JD、官方链接或你已获得的材料，系统不做无限制网页抓取。"
      />
      <el-form label-position="top" class="research-form">
        <el-form-item label="来源类型">
          <el-select v-model="sourceForm.sourceType" style="width: 100%">
            <el-option v-for="type in SOURCE_TYPES" :key="type.value" :label="type.label" :value="type.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="sourceForm.title" maxlength="200" placeholder="例如 官方 JD、团队博客" />
        </el-form-item>
        <el-form-item label="官方链接（可选）">
          <el-input v-model="sourceForm.officialUrl" maxlength="500" placeholder="https://" />
        </el-form-item>
        <el-form-item label="内容">
          <el-input
            v-model="sourceForm.content"
            type="textarea"
            :rows="5"
            maxlength="20000"
            show-word-limit
            placeholder="粘贴来源正文或你的整理"
          />
        </el-form-item>
        <el-form-item label="内容摘要（可选）">
          <el-input v-model="sourceForm.contentSummary" type="textarea" :rows="2" maxlength="2000" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="sourceVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="!sourceForm.sourceType || !sourceForm.title.trim() || !sourceForm.content.trim()"
          @click="submitSource"
        >
          保存来源
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="versionVisible" title="新增来源版本" width="560px">
      <el-form label-position="top" class="research-form">
        <el-form-item label="内容">
          <el-input
            v-model="versionForm.content"
            type="textarea"
            :rows="5"
            maxlength="20000"
            show-word-limit
            placeholder="粘贴更新后的来源正文"
          />
        </el-form-item>
        <el-form-item label="内容摘要（可选）">
          <el-input v-model="versionForm.contentSummary" type="textarea" :rows="2" maxlength="2000" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="versionVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" :disabled="!versionForm.content.trim()" @click="submitVersion">
          保存版本
        </el-button>
      </template>
    </el-dialog>

    <div v-if="sources.length" class="research-panel__rows">
      <div v-for="source in sources" :key="String(source.id)" class="research-panel__row">
        <div>
          <strong>{{ source.title || sourceTypeLabel(source.sourceType) }}</strong>
          <span>{{ sourceTypeLabel(source.sourceType) }} · {{ source.active === false ? '已停用' : '生效中' }}</span>
        </div>
        <span class="research-panel__row-actions">
          <el-button link type="primary" :disabled="disabled" @click="openVersionDialog(source)">新增版本</el-button>
          <el-button
            v-if="source.active !== false"
            link
            type="primary"
            :disabled="disabled"
            @click="deactivate(source)"
          >
            停用
          </el-button>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { reactive, ref } from 'vue'

import {
  createResearchSourceV7Api,
  addResearchSourceVersionV7Api,
  deactivateResearchSourceV7Api,
  generateResearchSnapshotV7Api
} from '@/api/v7Career'
import type { CareerResearchSourceVO, CareerResearchSourceCreateDTO } from '@/types/v7/career'
import { createOperationIdempotencyKey } from '@/utils/idempotency'
import { getErrorMessage } from '@/utils/error'

const props = withDefaults(defineProps<{
  applicationId: number
  sources: CareerResearchSourceVO[]
  disabled?: boolean
}>(), {
  disabled: false
})

const emit = defineEmits<{ refresh: [] }>()

const SOURCE_TYPES = [
  { value: 'JOB_DESCRIPTION', label: '职位描述' },
  { value: 'OFFICIAL_SITE', label: '官方站点' },
  { value: 'NEWS', label: '新闻报道' },
  { value: 'PERSONAL_NOTE', label: '个人整理' },
  { value: 'OTHER', label: '其他' }
]

const submitting = ref(false)
const generating = ref(false)

const sourceVisible = ref(false)
const sourceForm = reactive<CareerResearchSourceCreateDTO>({
  sourceType: 'JOB_DESCRIPTION',
  title: '',
  officialUrl: '',
  content: '',
  contentSummary: ''
})

const versionVisible = ref(false)
const versionSourceId = ref<number | null>(null)
const versionForm = reactive<{ content: string; contentSummary: string }>({ content: '', contentSummary: '' })

const sourceTypeLabel = (value?: string) =>
  SOURCE_TYPES.find((type) => type.value === String(value || '').toUpperCase())?.label || '来源'

const openSourceDialog = () => {
  Object.assign(sourceForm, {
    sourceType: 'JOB_DESCRIPTION',
    title: '',
    officialUrl: '',
    content: '',
    contentSummary: ''
  })
  sourceVisible.value = true
}

const submitSource = async () => {
  if (submitting.value) return
  submitting.value = true
  try {
    await createResearchSourceV7Api(props.applicationId, {
      sourceType: sourceForm.sourceType,
      title: sourceForm.title.trim(),
      officialUrl: sourceForm.officialUrl?.trim() || undefined,
      content: sourceForm.content.trim(),
      contentSummary: sourceForm.contentSummary?.trim() || undefined
    })
    ElMessage.success('调研来源已登记。')
    sourceVisible.value = false
    emit('refresh')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '调研来源登记失败，请稍后重试。'))
  } finally {
    submitting.value = false
  }
}

const openVersionDialog = (source: CareerResearchSourceVO) => {
  versionSourceId.value = Number(source.id)
  versionForm.content = ''
  versionForm.contentSummary = ''
  versionVisible.value = true
}

const submitVersion = async () => {
  if (submitting.value || versionSourceId.value == null) return
  submitting.value = true
  try {
    await addResearchSourceVersionV7Api(versionSourceId.value, {
      content: versionForm.content.trim(),
      contentSummary: versionForm.contentSummary?.trim() || undefined
    })
    ElMessage.success('来源版本已保存。')
    versionVisible.value = false
    emit('refresh')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '来源版本保存失败，请稍后重试。'))
  } finally {
    submitting.value = false
  }
}

const deactivate = async (source: CareerResearchSourceVO) => {
  try {
    await ElMessageBox.confirm(
      `确认停用来源“${source.title || sourceTypeLabel(source.sourceType)}”？停用后不再参与新的调研快照。`,
      '确认停用来源',
      { type: 'warning', confirmButtonText: '停用', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  try {
    await deactivateResearchSourceV7Api(Number(source.id))
    ElMessage.success('来源已停用。')
    emit('refresh')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '来源停用失败，请稍后重试。'))
  }
}

const generateSnapshot = async () => {
  if (generating.value) return
  generating.value = true
  try {
    await generateResearchSnapshotV7Api(props.applicationId, {
      idempotencyKey: createOperationIdempotencyKey(`research-snapshot:${props.applicationId}`)
    })
    ElMessage.success('调研快照已生成。')
    emit('refresh')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '调研快照生成失败，请稍后重试。'))
  } finally {
    generating.value = false
  }
}
</script>

<style scoped lang="scss">
.research-panel {
  display: grid;
  gap: 14px;
}

.research-panel__actions {
  display: flex;
  gap: 12px;
}

.research-panel__rows {
  display: grid;
  gap: 8px;
}

.research-panel__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
}
</style>
