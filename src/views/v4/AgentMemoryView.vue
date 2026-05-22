<template>
  <div class="page-shell v4-memory-page">
    <section class="v4-page-header"><div><div class="v4-eyebrow">V4 Memory</div><h1>长期记忆管理</h1><p>查看、添加、禁用或删除 Agent 记住的偏好与弱项。</p></div><div class="v4-actions"><el-button type="primary" @click="dialogVisible = true">新增记忆</el-button><el-button :loading="loading" @click="load">刷新</el-button></div></section>
    <section class="content-card"><div class="content-card__body v4-list" v-loading="loading"><article v-for="item in memories" :key="item.id" class="v4-row"><div class="v4-row-head"><div><strong>{{ item.memoryType }}</strong><p class="muted">{{ item.content }}</p><small class="muted">{{ item.sourceType || 'MANUAL' }} · confidence {{ item.confidence ?? 0 }}</small></div><div class="v4-actions"><el-tag :type="item.enabled ? 'success' : 'info'">{{ item.enabled ? '启用' : '禁用' }}</el-tag><el-button link type="primary" @click="toggle(item)">{{ item.enabled ? '禁用' : '启用' }}</el-button><el-button link type="danger" @click="remove(item.id)">删除</el-button></div></div></article><el-empty v-if="!memories.length && !loading" description="暂无长期记忆" /></div></section>
    <el-dialog v-model="dialogVisible" title="新增记忆" width="520px"><el-form label-position="top"><el-form-item label="类型"><el-input v-model="form.memoryType" placeholder="USER_NOTE / WEAKNESS / PREFERENCE" /></el-form-item><el-form-item label="内容"><el-input v-model="form.content" type="textarea" :rows="4" /></el-form-item></el-form><template #footer><el-button @click="dialogVisible=false">取消</el-button><el-button type="primary" @click="create">保存</el-button></template></el-dialog>
  </div>
</template>
<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'
import { createAgentMemoryApi, deleteAgentMemoryApi, disableAgentMemoryApi, enableAgentMemoryApi, getAgentMemoriesApi, type AgentMemoryVO } from '@/api/v4'
const loading = ref(false)
const dialogVisible = ref(false)
const memories = ref<AgentMemoryVO[]>([])
const form = reactive({ memoryType: 'USER_NOTE', content: '' })
const load = async () => { loading.value = true; try { const page = await getAgentMemoriesApi({ pageNo: 1, pageSize: 50 }); memories.value = page.records || [] } finally { loading.value = false } }
const create = async () => { await createAgentMemoryApi(form); dialogVisible.value = false; form.content = ''; ElMessage.success('记忆已保存'); await load() }
const toggle = async (item: AgentMemoryVO) => { item.enabled ? await disableAgentMemoryApi(item.id) : await enableAgentMemoryApi(item.id); await load() }
const remove = async (id: number) => { await ElMessageBox.confirm('确认删除这条记忆？', '删除确认'); await deleteAgentMemoryApi(id); await load() }
onMounted(load)
</script><style scoped lang="scss">
.v4-page-header { display:flex; align-items:flex-end; justify-content:space-between; gap:16px; padding:24px; border:1px solid var(--app-border); border-radius:var(--app-radius); background:linear-gradient(135deg, rgba(59,130,246,.14), rgba(34,197,94,.08)), var(--app-surface); box-shadow:var(--app-shadow); }
.v4-page-header h1 { margin:8px 0 0; font-size:28px; }
.v4-page-header p, .muted { color:var(--app-text-muted); line-height:1.7; }
.v4-eyebrow { color:#93c5fd; font-size:13px; font-weight:700; }
.v4-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
.v4-card { padding:16px; border:1px solid var(--app-border); border-radius:10px; background:rgba(15,23,42,.58); }
.v4-card strong { display:block; margin-top:8px; font-size:24px; }
.v4-list { display:grid; gap:12px; }
.v4-row { padding:14px; border:1px solid var(--app-border); border-radius:10px; background:rgba(15,23,42,.52); }
.v4-row-head { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
.v4-actions { display:flex; flex-wrap:wrap; gap:10px; align-items:center; }
@media (max-width:900px){ .v4-page-header{align-items:flex-start; flex-direction:column;} .v4-grid{grid-template-columns:1fr;} }
</style>
