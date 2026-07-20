<template>
  <el-dialog
    :model-value="visible"
    :title="editingEventId ? '编辑日历事件' : '新建日历事件'"
    width="660px"
    @update:model-value="(value: boolean) => emit('update:visible', value)"
  >
    <el-form label-position="top">
      <div class="two-column">
        <el-form-item label="事件类型">
          <el-select v-model="form.eventType">
            <el-option v-for="item in eventTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联投递">
          <el-select v-model="form.applicationId" clearable filterable placeholder="可选">
            <el-option
              v-for="application in applications"
              :key="application.id"
              :value="application.id"
              :label="applicationLabel(application)"
            />
          </el-select>
        </el-form-item>
      </div>
      <el-form-item label="标题">
        <el-input v-model.trim="form.title" maxlength="120" />
      </el-form-item>
      <div class="two-column">
        <el-form-item label="开始时间">
          <el-date-picker
            v-model="form.startsAt"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker
            v-model="form.endsAt"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss"
          />
        </el-form-item>
      </div>
      <div class="two-column compact-row">
        <el-form-item label="状态">
          <el-select v-model="form.status">
            <el-option label="已确认" value="CONFIRMED" />
            <el-option label="暂定" value="TENTATIVE" />
            <el-option label="已完成" value="COMPLETED" />
            <el-option label="已取消" value="CANCELLED" />
          </el-select>
        </el-form-item>
        <el-form-item label="全天事件">
          <el-switch v-model="form.allDay" />
        </el-form-item>
      </div>
      <el-form-item label="地点">
        <el-input v-model.trim="form.location" maxlength="160" />
      </el-form-item>
      <el-form-item label="说明">
        <el-input v-model.trim="form.description" type="textarea" :rows="3" maxlength="600" show-word-limit />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button
        v-if="editingEventId"
        type="danger"
        plain
        :loading="deleting"
        @click="emit('delete')"
      >
        删除
      </el-button>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="emit('save')">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { JobApplicationVO } from '@/api/v4'
import type { CareerCalendarEventSave } from '@/types/careerGrowth'

defineProps<{
  visible: boolean
  form: CareerCalendarEventSave
  editingEventId?: number
  applications: JobApplicationVO[]
  saving: boolean
  deleting: boolean
}>()

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void
  (event: 'save'): void
  (event: 'delete'): void
}>()

const eventTypeOptions = [
  { label: '投递', value: 'APPLICATION' },
  { label: '跟进', value: 'FOLLOW_UP' },
  { label: '面试', value: 'INTERVIEW' },
  { label: '感谢信', value: 'THANK_YOU' },
  { label: 'Offer 截止', value: 'OFFER_DEADLINE' },
  { label: '复盘', value: 'REVIEW' }
]

const applicationLabel = (item: JobApplicationVO) =>
  `${item.companyName || '未填写公司'} · ${item.jobTitle || '未填写岗位'}`
</script>

<style scoped lang="scss">
.two-column {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.compact-row {
  align-items: end;
}

:deep(.el-select),
:deep(.el-date-editor) {
  width: 100%;
}

@media (max-width: 620px) {
  .two-column {
    grid-template-columns: 1fr;
  }
}
</style>
