<template>
  <section class="content-card skill-editor">
    <div class="panel-head">
      <div>
        <p class="panel-kicker">Skill Evidence</p>
        <h3>能力证据</h3>
      </div>
      <el-button type="primary" @click="openDialog()">新增证据</el-button>
    </div>

    <div class="skill-list">
      <article v-for="item in items" :key="item.id" class="skill-item">
        <div class="skill-title">
          <strong>{{ item.skillName }}</strong>
          <div class="skill-tags">
            <el-tag :type="getStrengthTone(item.strengthLevel)" effect="dark">{{ item.strengthLevel || 'MEDIUM' }}</el-tag>
            <el-tag v-if="item.confirmed === false" type="warning" effect="plain">未确认</el-tag>
          </div>
        </div>
        <p>{{ item.evidenceText || '暂无证据描述' }}</p>
        <div class="skill-meta">
          <span>{{ item.skillCategory || '未分类' }}</span>
          <span>{{ item.jdKeyword || '未关联 JD 关键词' }}</span>
        </div>
        <div v-if="item.riskPoints" class="risk">{{ item.riskPoints }}</div>
        <div class="item-actions">
          <el-button size="small" @click="openDialog(item)">编辑</el-button>
          <el-button size="small" type="danger" plain @click="handleDelete(item)">删除</el-button>
        </div>
      </article>
      <AppState v-if="items.length === 0" type="empty" title="暂无能力证据" description="先手动补充这个项目能证明的技能和面试风险。" />
    </div>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑能力证据' : '新增能力证据'" width="640px">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="form-grid">
          <el-form-item label="能力名称" prop="skillName">
            <el-input v-model.trim="form.skillName" placeholder="例如：Redis 缓存设计" />
          </el-form-item>
          <el-form-item label="证明力度">
            <el-select v-model="form.strengthLevel">
              <el-option label="强" value="STRONG" />
              <el-option label="中" value="MEDIUM" />
              <el-option label="弱" value="WEAK" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="能力分类">
          <el-input v-model.trim="form.skillCategory" placeholder="后端 / 架构 / 性能 / 协作" />
        </el-form-item>
        <el-form-item label="证据描述">
          <el-input v-model="form.evidenceText" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="关联 JD 关键词">
          <el-input v-model.trim="form.jdKeyword" placeholder="Redis, 高并发, 性能优化" />
        </el-form-item>
        <el-form-item label="面试风险 / 追问点">
          <el-input v-model="form.riskPoints" type="textarea" :rows="3" />
        </el-form-item>
        <el-checkbox v-model="form.confirmed">已确认这是我的真实项目事实</el-checkbox>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { reactive, ref } from 'vue'

import {
  addProjectSkillEvidenceApi,
  deleteProjectSkillEvidenceApi,
  updateProjectSkillEvidenceApi
} from '@/api/projectEvidence'
import AppState from '@/components/common/AppState.vue'
import { getStrengthTone } from '@/features/project-evidence'
import type { ProjectSkillEvidenceDTO, ProjectSkillEvidenceVO } from '@/types/projectEvidence'
import { getErrorMessage } from '@/utils/error'

const props = defineProps<{
  projectId: number
  items: ProjectSkillEvidenceVO[]
}>()

const emit = defineEmits<{
  refresh: []
}>()

const formRef = ref<FormInstance>()
const dialogVisible = ref(false)
const saving = ref(false)
const editing = ref<ProjectSkillEvidenceVO | null>(null)
const form = reactive<ProjectSkillEvidenceDTO>({
  skillName: '',
  skillCategory: '',
  evidenceText: '',
  strengthLevel: 'MEDIUM',
  jdKeyword: '',
  riskPoints: '',
  sourceType: 'MANUAL',
  confirmed: true
})

const rules: FormRules = {
  skillName: [{ required: true, message: '请输入能力名称', trigger: 'blur' }]
}

const resetForm = () => {
  Object.assign(form, {
    skillName: '',
    skillCategory: '',
    evidenceText: '',
    strengthLevel: 'MEDIUM',
    jdKeyword: '',
    riskPoints: '',
    sourceType: 'MANUAL',
    confirmed: true
  })
}

const openDialog = (item?: ProjectSkillEvidenceVO) => {
  editing.value = item || null
  resetForm()
  if (item) {
    Object.assign(form, {
      skillName: item.skillName,
      skillCategory: item.skillCategory || '',
      evidenceText: item.evidenceText || '',
      strengthLevel: item.strengthLevel || 'MEDIUM',
      jdKeyword: item.jdKeyword || '',
      riskPoints: item.riskPoints || '',
      sourceType: item.sourceType || 'MANUAL',
      confirmed: item.confirmed !== false
    })
  }
  dialogVisible.value = true
}

const handleSave = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    if (editing.value) {
      await updateProjectSkillEvidenceApi(props.projectId, editing.value.id, form)
    } else {
      await addProjectSkillEvidenceApi(props.projectId, form)
    }
    ElMessage.success('能力证据已保存')
    dialogVisible.value = false
    emit('refresh')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '能力证据保存失败，请稍后重试'))
  } finally {
    saving.value = false
  }
}

const handleDelete = async (item: ProjectSkillEvidenceVO) => {
  await ElMessageBox.confirm(`确认删除能力证据「${item.skillName}」？`, '删除确认', { type: 'warning' })
  await deleteProjectSkillEvidenceApi(props.projectId, item.id)
  ElMessage.success('能力证据已删除')
  emit('refresh')
}
</script>

<style scoped lang="scss">
.skill-editor {
  padding: 18px;
}

.panel-head,
.skill-title,
.skill-meta,
.item-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.panel-head,
.skill-title {
  justify-content: space-between;
}

.panel-kicker {
  margin: 0 0 4px;
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

h3 {
  margin: 0;
}

.skill-list {
  display: grid;
  gap: 12px;
}

.skill-item {
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.45);
}

.skill-item p,
.skill-meta,
.risk {
  color: var(--app-text-muted);
  line-height: 1.7;
}

.skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.skill-meta {
  flex-wrap: wrap;
  font-size: 12px;
}

.risk {
  margin-top: 8px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(245, 158, 11, 0.08);
}

.item-actions {
  justify-content: flex-end;
  margin-top: 10px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 12px;
}

@media (max-width: 680px) {
  .panel-head,
  .skill-title,
  .form-grid {
    align-items: flex-start;
    grid-template-columns: 1fr;
    flex-direction: column;
  }
}
</style>
