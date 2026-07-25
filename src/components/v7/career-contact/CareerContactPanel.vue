<template>
  <div class="contact-panel">
    <div class="contact-panel__actions">
      <el-button type="primary" :disabled="disabled" @click="openContactDialog()">新增联系人</el-button>
      <el-button :disabled="disabled" @click="openActivityDialog">记录活动</el-button>
    </div>

    <el-dialog v-model="contactVisible" :title="contactForm.id ? '编辑联系人' : '新增联系人'" width="520px">
      <el-alert
        type="info"
        show-icon
        :closable="false"
        title="只保存遮罩信息"
        description="首期只保存显示名、角色、渠道和遮罩提示，不保存完整联系方式。"
      />
      <el-form label-position="top" class="contact-form">
        <el-form-item label="显示名">
          <el-input v-model="contactForm.displayName" maxlength="120" />
        </el-form-item>
        <el-form-item label="角色">
          <el-input v-model="contactForm.roleType" maxlength="80" placeholder="例如 HR、技术面试官" />
        </el-form-item>
        <el-form-item label="渠道">
          <el-input v-model="contactForm.channelType" maxlength="80" placeholder="例如 内推、邮件" />
        </el-form-item>
        <el-form-item label="遮罩提示">
          <el-input v-model="contactForm.maskedContactHint" maxlength="120" placeholder="例如 尾号 1234" />
        </el-form-item>
        <el-form-item label="关系摘要">
          <el-input v-model="contactForm.relationshipSummary" type="textarea" :rows="2" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="contactVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" :disabled="!contactForm.displayName.trim()" @click="submitContact">
          保存联系人
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="activityVisible" title="记录活动" width="520px">
      <el-alert
        type="info"
        show-icon
        :closable="false"
        title="只记录不发送"
        description="这里只记录已发生的沟通活动，不提供任何发送接口。"
      />
      <el-form label-position="top" class="contact-form">
        <el-form-item label="关联联系人（可选）">
          <el-select v-model="activityForm.contactId" clearable style="width: 100%">
            <el-option
              v-for="contact in contacts"
              :key="String(contact.id)"
              :label="contact.displayName || '未命名联系人'"
              :value="Number(contact.id)"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="活动类型">
          <el-input v-model="activityForm.activityType" maxlength="80" placeholder="例如 电话、邮件、面谈" />
        </el-form-item>
        <el-form-item label="主题">
          <el-input v-model="activityForm.subject" maxlength="200" />
        </el-form-item>
        <el-form-item label="摘要">
          <el-input v-model="activityForm.summary" type="textarea" :rows="3" maxlength="2000" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="activityVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="!activityForm.activityType.trim() || !activityForm.subject.trim() || !activityForm.summary.trim()"
          @click="submitActivity"
        >
          保存活动
        </el-button>
      </template>
    </el-dialog>

    <div v-if="contacts.length" class="contact-panel__rows">
      <div v-for="contact in contacts" :key="String(contact.id)" class="contact-panel__row">
        <div>
          <strong>{{ contact.displayName || '未命名联系人' }}</strong>
          <span>{{ contact.role || contact.roleType || '角色待确认' }} · {{ contact.channelType || '渠道待确认' }}</span>
        </div>
        <span class="contact-panel__row-actions">
          <el-button link type="primary" :disabled="disabled" @click="openContactDialog(contact)">编辑</el-button>
          <el-button link type="danger" :disabled="disabled" @click="deleteContact(contact)">删除</el-button>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { reactive, ref } from 'vue'

import {
  createContactV7Api,
  updateContactV7Api,
  deleteContactV7Api,
  createActivityV7Api
} from '@/api/v7Career'
import type { CareerContactVO } from '@/types/v7/career'
import { createOperationIdempotencyKey } from '@/utils/idempotency'
import { getErrorMessage } from '@/utils/error'

const props = withDefaults(defineProps<{
  applicationId: number
  contacts: CareerContactVO[]
  disabled?: boolean
}>(), {
  disabled: false
})

const emit = defineEmits<{ refresh: [] }>()

const submitting = ref(false)

const contactVisible = ref(false)
const contactForm = reactive<{
  id: number | null
  displayName: string
  roleType: string
  channelType: string
  maskedContactHint: string
  relationshipSummary: string
}>({
  id: null,
  displayName: '',
  roleType: '',
  channelType: '',
  maskedContactHint: '',
  relationshipSummary: ''
})

const activityVisible = ref(false)
const activityForm = reactive<{
  contactId: number | null
  activityType: string
  subject: string
  summary: string
}>({
  contactId: null,
  activityType: '',
  subject: '',
  summary: ''
})

const openContactDialog = (contact?: CareerContactVO) => {
  contactForm.id = contact ? Number(contact.id) : null
  contactForm.displayName = contact?.displayName || ''
  contactForm.roleType = contact?.roleType || contact?.role || ''
  contactForm.channelType = contact?.channelType || ''
  contactForm.maskedContactHint = contact?.maskedContactHint || ''
  contactForm.relationshipSummary = contact?.relationshipSummary || ''
  contactVisible.value = true
}

const submitContact = async () => {
  if (submitting.value || !contactForm.displayName.trim()) return
  submitting.value = true
  try {
    const payload = {
      displayName: contactForm.displayName.trim(),
      roleType: contactForm.roleType?.trim() || undefined,
      channelType: contactForm.channelType?.trim() || undefined,
      maskedContactHint: contactForm.maskedContactHint?.trim() || undefined,
      relationshipSummary: contactForm.relationshipSummary?.trim() || undefined
    }
    if (contactForm.id == null) {
      await createContactV7Api(props.applicationId, payload)
    } else {
      await updateContactV7Api(contactForm.id, payload)
    }
    ElMessage.success('联系人已保存。')
    contactVisible.value = false
    emit('refresh')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '联系人保存失败，请稍后重试。'))
  } finally {
    submitting.value = false
  }
}

const deleteContact = async (contact: CareerContactVO) => {
  try {
    await ElMessageBox.confirm(
      `确认删除联系人“${contact.displayName || '未命名联系人'}”？该操作不可撤销。`,
      '确认删除联系人',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  try {
    await deleteContactV7Api(Number(contact.id))
    ElMessage.success('联系人已删除。')
    emit('refresh')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '联系人删除失败，请稍后重试。'))
  }
}

const openActivityDialog = () => {
  activityForm.contactId = null
  activityForm.activityType = ''
  activityForm.subject = ''
  activityForm.summary = ''
  activityVisible.value = true
}

const submitActivity = async () => {
  if (
    submitting.value ||
    !activityForm.activityType.trim() ||
    !activityForm.subject.trim() ||
    !activityForm.summary.trim()
  ) {
    return
  }
  submitting.value = true
  try {
    await createActivityV7Api(props.applicationId, {
      contactId: activityForm.contactId ?? undefined,
      activityType: activityForm.activityType.trim(),
      subject: activityForm.subject.trim(),
      summary: activityForm.summary.trim(),
      idempotencyKey: createOperationIdempotencyKey(`career-activity:${props.applicationId}`)
    })
    ElMessage.success('活动已记录。')
    activityVisible.value = false
    emit('refresh')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '活动记录失败，请稍后重试。'))
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.contact-panel {
  display: grid;
  gap: 14px;
}

.contact-panel__actions {
  display: flex;
  gap: 12px;
}

.contact-panel__rows {
  display: grid;
  gap: 8px;
}

.contact-panel__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
}
</style>
