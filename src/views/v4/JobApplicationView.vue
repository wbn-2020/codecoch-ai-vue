<template>
  <div class="page-shell v4-application-page">
    <section class="v4-page-header">
      <div>
        <div class="v4-eyebrow">V4 Application</div>
        <h1>Job-search progress</h1>
        <p>Track saved jobs, applications, interview stages, follow-ups, and structured application events.</p>
      </div>
      <div class="v4-actions">
        <el-select v-model="status" clearable placeholder="All status" style="width: 180px" @change="load">
          <el-option v-for="item in statuses" :key="item" :label="item" :value="item" />
        </el-select>
        <el-button type="primary" @click="openCreate">New application</el-button>
        <el-button :loading="loading" @click="load">Refresh</el-button>
      </div>
    </section>

    <AppState v-if="errorMessage" type="error" title="Applications failed to load" :description="errorMessage">
      <el-button type="primary" @click="load">Retry</el-button>
    </AppState>

    <section v-else class="content-card">
      <div class="content-card__body v4-list" v-loading="loading">
        <article v-for="item in applications" :key="item.id" class="v4-row">
          <div class="v4-row-head">
            <div>
              <strong>{{ item.companyName || '--' }} · {{ item.jobTitle || '--' }}</strong>
              <p class="muted">
                {{ item.source || 'CUSTOM' }} · applied {{ item.appliedAt || '--' }} · follow-up {{ item.nextFollowUpAt || '--' }}
              </p>
              <p class="muted">{{ item.note || '--' }}</p>
            </div>
            <div class="v4-actions">
              <el-tag>{{ item.status || '--' }}</el-tag>
              <el-button link type="primary" @click="openEvents(item)">Events</el-button>
              <el-button link type="primary" @click="openEdit(item)">Edit</el-button>
            </div>
          </div>
        </article>
        <el-empty v-if="!applications.length && !loading" description="No job-search progress records" />
      </div>
    </section>

    <el-dialog v-model="dialogVisible" title="Job-search progress" width="620px">
      <el-form label-position="top">
        <el-form-item label="Company">
          <el-input v-model.trim="form.companyName" />
        </el-form-item>
        <el-form-item label="Job title">
          <el-input v-model.trim="form.jobTitle" />
        </el-form-item>
        <el-form-item label="Status">
          <el-select v-model="form.status" style="width: 100%">
            <el-option v-for="item in statuses" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="Source">
          <el-input v-model.trim="form.source" placeholder="BOSS / LinkedIn / Referral / CUSTOM" />
        </el-form-item>
        <el-form-item label="Resume version ID">
          <el-input-number v-model="form.resumeVersionId" :min="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="Next follow-up time">
          <el-date-picker v-model="form.nextFollowUpAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="Note">
          <el-input v-model="form.note" type="textarea" :rows="3" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">Cancel</el-button>
        <el-button type="primary" :loading="saving" @click="save">Save</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="eventsVisible" title="Application events" size="560px">
      <div class="drawer-actions">
        <el-button type="primary" @click="openEventCreate">New event</el-button>
        <el-button :loading="eventsLoading" @click="loadEvents">Refresh</el-button>
      </div>
      <div class="event-list" v-loading="eventsLoading">
        <article v-for="item in events" :key="item.id" class="event-row">
          <div class="event-row__head">
            <strong>{{ item.eventType || '--' }}</strong>
            <span>{{ item.eventTime || '--' }}</span>
          </div>
          <p>{{ item.summary || '--' }}</p>
          <pre v-if="item.reviewJson || item.review">{{ item.reviewJson || JSON.stringify(item.review, null, 2) }}</pre>
        </article>
        <el-empty v-if="!events.length && !eventsLoading" description="No events for this application" />
      </div>
    </el-drawer>

    <el-dialog v-model="eventDialogVisible" title="New application event" width="560px">
      <el-form label-position="top">
        <el-form-item label="Event type">
          <el-input v-model.trim="eventForm.eventType" placeholder="FOLLOW_UP / INTERVIEW / OFFER / NOTE" />
        </el-form-item>
        <el-form-item label="Event time">
          <el-date-picker v-model="eventForm.eventTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="Summary">
          <el-input v-model="eventForm.summary" type="textarea" :rows="3" maxlength="500" show-word-limit />
        </el-form-item>
        <el-form-item label="Review JSON">
          <el-input v-model="eventForm.reviewJson" type="textarea" :rows="4" placeholder='{"score":80}' />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="eventDialogVisible = false">Cancel</el-button>
        <el-button type="primary" :loading="saving" @click="createEvent">Save event</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'

import {
  createApplicationApi,
  createApplicationEventApi,
  getApplicationEventsApi,
  getApplicationsApi,
  updateApplicationApi,
  type JobApplicationEventVO,
  type JobApplicationVO
} from '@/api/v4'
import AppState from '@/components/common/AppState.vue'
import { formatLocalDateTime } from '@/utils/format'

const statuses = ['SAVED', 'PREPARING', 'APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED', 'CLOSED']
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const status = ref('')
const dialogVisible = ref(false)
const editingId = ref<number>()
const applications = ref<JobApplicationVO[]>([])
const eventsVisible = ref(false)
const eventsLoading = ref(false)
const eventDialogVisible = ref(false)
const selectedApplication = ref<JobApplicationVO>()
const events = ref<JobApplicationEventVO[]>([])

const form = reactive<Partial<JobApplicationVO>>({
  status: 'SAVED',
  jobTitle: '',
  companyName: '',
  source: 'CUSTOM',
  note: ''
})

const eventForm = reactive<Partial<JobApplicationEventVO>>({
  eventType: 'NOTE',
  eventTime: '',
  summary: '',
  reviewJson: ''
})

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || 'API request failed')
  }
  return 'API request failed'
}

const load = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    applications.value = await getApplicationsApi({ status: status.value || undefined })
  } catch (error) {
    applications.value = []
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  editingId.value = undefined
  Object.assign(form, {
    status: 'SAVED',
    jobTitle: '',
    companyName: '',
    source: 'CUSTOM',
    note: '',
    resumeVersionId: undefined,
    nextFollowUpAt: ''
  })
  dialogVisible.value = true
}

const openEdit = (item: JobApplicationVO) => {
  editingId.value = item.id
  Object.assign(form, item)
  dialogVisible.value = true
}

const save = async () => {
  saving.value = true
  try {
    if (editingId.value) {
      await updateApplicationApi(editingId.value, form)
    } else {
      await createApplicationApi(form)
    }
    dialogVisible.value = false
    ElMessage.success('Saved')
    await load()
  } finally {
    saving.value = false
  }
}

const openEvents = async (item: JobApplicationVO) => {
  selectedApplication.value = item
  eventsVisible.value = true
  await loadEvents()
}

const loadEvents = async () => {
  if (!selectedApplication.value) return
  eventsLoading.value = true
  try {
    events.value = await getApplicationEventsApi(selectedApplication.value.id)
  } finally {
    eventsLoading.value = false
  }
}

const openEventCreate = () => {
  Object.assign(eventForm, {
    eventType: 'NOTE',
    eventTime: formatLocalDateTime(),
    summary: '',
    reviewJson: ''
  })
  eventDialogVisible.value = true
}

const createEvent = async () => {
  if (!selectedApplication.value) return
  saving.value = true
  try {
    await createApplicationEventApi(selectedApplication.value.id, {
      eventType: eventForm.eventType,
      eventTime: eventForm.eventTime,
      summary: eventForm.summary,
      reviewJson: eventForm.reviewJson || undefined
    })
    eventDialogVisible.value = false
    ElMessage.success('Event saved')
    await loadEvents()
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
.v4-page-header,
.v4-row-head,
.v4-actions,
.drawer-actions,
.event-row__head {
  display: flex;
  gap: 16px;
}

.v4-page-header {
  align-items: flex-end;
  justify-content: space-between;
  padding: 24px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.14), rgba(34, 197, 94, 0.08)), var(--app-surface);
  box-shadow: var(--app-shadow);
}

.v4-page-header h1 {
  margin: 8px 0 0;
  font-size: 28px;
}

.v4-page-header p,
.muted,
.event-row p,
.event-row span {
  color: var(--app-text-muted);
  line-height: 1.7;
}

.v4-eyebrow {
  color: #93c5fd;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}

.v4-actions,
.drawer-actions {
  flex-wrap: wrap;
  align-items: center;
}

.v4-list,
.event-list {
  display: grid;
  gap: 12px;
}

.v4-row,
.event-row {
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.58);
}

.v4-row-head,
.event-row__head {
  align-items: flex-start;
  justify-content: space-between;
}

.drawer-actions {
  margin-bottom: 16px;
}

.event-row p {
  margin: 8px 0 0;
}

.event-row pre {
  overflow: auto;
  max-height: 180px;
  margin: 10px 0 0;
  padding: 10px;
  border-radius: 8px;
  background: #020617;
  color: #dbeafe;
  white-space: pre-wrap;
}

@media (max-width: 900px) {
  .v4-page-header,
  .v4-row-head,
  .event-row__head {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
