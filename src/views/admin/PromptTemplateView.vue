<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <MessageSquareCode :size="16" />
          <span>提示词治理</span>
        </div>
        <h1 class="admin-hero__title">提示词模板治理</h1>
        <p class="admin-hero__desc">
          维护面试提问、答案评分、动态追问和报告生成模板，
          提示词内容支持版本化管理，可在测试面板验证效果后再发布。
        </p>
      </div>
      <el-button v-permission="'admin:ai:prompt:write'" type="primary" :disabled="isAdminMobileReadonly" :title="mobileReadonlyTitle()" @click="openDialog()">
        <Plus :size="16" />
        新增模板
      </el-button>
    </section>

    <div class="admin-insight-grid">
      <article class="admin-insight-card">
        <span>模板总数</span>
        <strong>{{ total }}</strong>
        <small>当前模板总数</small>
      </article>
      <article class="admin-insight-card">
        <span>当前页启用</span>
        <strong>{{ enabledCount }}</strong>
        <small>仅统计当前页记录</small>
      </article>
      <article class="admin-insight-card">
        <span>场景类型</span>
        <strong>{{ sceneCount }}</strong>
        <small>仅统计当前页记录</small>
      </article>
      <article class="admin-insight-card">
        <span>版本治理</span>
        <strong>闭环已接入</strong>
        <small>版本切换、测试和发布状态</small>
      </article>
    </div>

    <section class="admin-panel">
      <div class="admin-panel__header admin-panel__header--toolbar">
        <div>
          <h2>模板列表</h2>
          <p>搜索、启停、新增、编辑和删除提示词模板。</p>
        </div>
        <div class="table-view-tools">
          <el-segmented v-model="tableSize" :options="tableSizeOptions" />
          <el-dropdown trigger="click" :hide-on-click="false">
            <el-button plain>列配置</el-button>
            <template #dropdown>
              <el-dropdown-menu class="column-config-menu">
                <el-dropdown-item v-for="item in columnOptions" :key="item.key">
                  <el-checkbox v-model="visibleColumns[item.key]" :disabled="item.required">
                    {{ item.label }}
                  </el-checkbox>
                </el-dropdown-item>
                <el-dropdown-item divided>
                  <el-button link type="primary" @click.stop="resetTableView">恢复默认视图</el-button>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <div class="admin-filter-bar">
        <el-form :model="query" inline>
          <el-form-item label="关键词">
            <el-input v-model.trim="query.keyword" clearable placeholder="名称 / 编码" />
          </el-form-item>
          <el-form-item label="场景类型">
            <el-select v-model="query.scene" clearable placeholder="全部类型" style="width: 220px">
              <el-option v-for="item in sceneOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="query.status" clearable placeholder="全部" style="width: 120px">
              <el-option label="启用" :value="1" />
              <el-option label="禁用" :value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="table-card admin-table-card">
        <el-table v-loading="loading" :data="prompts" row-key="id" :size="tableSize">
          <template #empty>
            <AppState v-if="promptError" type="error" title="提示词模板加载失败" :description="promptError">
              <el-button type="primary" :loading="loading" @click="fetchPrompts">重新加载</el-button>
            </AppState>
            <AppState v-else type="empty" :title="promptEmptyTitle" :description="promptEmptyDescription">
              <el-button v-if="hasPromptFilters" type="primary" @click="handleReset">清空筛选</el-button>
              <el-button v-else v-permission="'admin:ai:prompt:write'" type="primary" :disabled="isAdminMobileReadonly" :title="mobileReadonlyTitle()" @click="openDialog()">新增模板</el-button>
            </AppState>
          </template>
          <el-table-column v-if="isColumnVisible('promptName')" prop="promptName" label="模板名称" min-width="180" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('templateCode')" prop="templateCode" label="模板编码" min-width="220" show-overflow-tooltip />
          <el-table-column v-if="isColumnVisible('scene')" label="场景类型" min-width="210">
            <template #default="{ row }">
              <el-tag type="primary" effect="plain">{{ getSceneLabel(row.promptType || row.scene) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('version')" label="版本" width="100">
            <template #default="{ row }">{{ row.version || '版本待确认' }}</template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('status')" label="状态" width="100">
            <template #default="{ row }"><StatusTag :status="row.status" /></template>
          </el-table-column>
          <el-table-column v-if="isColumnVisible('updatedAt')" label="更新时间" min-width="170">
            <template #default="{ row }">{{ row.updatedAt || row.updateTime || '-' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="320" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openVersionDrawer(row)">版本管理</el-button>
              <el-button v-permission="'admin:ai:prompt:write'" link type="primary" :disabled="isAdminMobileReadonly" :title="mobileReadonlyTitle()" @click="openDialog(row)">编辑</el-button>
              <el-button link type="primary" @click="openTemplateCallLogs(row)">AI 运行记录</el-button>
              <el-button v-permission="'admin:ai:prompt:write'" link type="warning" :disabled="isAdminMobileReadonly" :title="mobileReadonlyTitle()" @click="handleStatus(row)">
                {{ row.status === 1 ? '禁用' : '启用' }}
              </el-button>
              <el-button v-permission="'admin:ai:prompt:write'" link type="danger" :disabled="isAdminMobileReadonly" :title="mobileReadonlyTitle()" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="query.pageNo"
          v-model:page-size="query.pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :page-sizes="[10, 20, 50]"
          @change="fetchPrompts"
        />
      </div>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑提示词模板' : '新增提示词模板'" width="820px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="112px">
        <el-form-item label="模板名称" prop="name">
          <el-input v-model.trim="form.name" />
        </el-form-item>
        <el-form-item label="模板类型" prop="scene">
          <el-select v-model="form.scene" style="width: 100%">
            <el-option v-for="item in sceneOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="模板内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="9"
            :readonly="Boolean(editingId)"
            :placeholder="editingId ? '提示词内容请通过版本管理新增版本修改' : '请输入模板内容'"
          />
          <div v-if="editingId" class="field-note">
            提示词内容请通过版本管理新增版本修改，本次保存只更新名称、类型、描述和状态。
          </div>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button v-permission="'admin:ai:prompt:write'" type="primary" :loading="saving" :disabled="isAdminMobileReadonly" :title="mobileReadonlyTitle()" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="versionDrawerVisible" size="880px" destroy-on-close class="version-drawer">
      <template #header>
        <div class="drawer-head">
          <div>
            <p>提示词版本管理</p>
            <h2>{{ currentPrompt?.promptName || currentPrompt?.name || '版本管理' }}</h2>
          </div>
          <el-tag effect="plain">{{ getSceneLabel(currentPrompt?.promptType || currentPrompt?.scene || '') }}</el-tag>
        </div>
      </template>

      <section class="version-create-panel">
        <div class="version-section-head">
          <div>
            <h3>创建新版本</h3>
            <p>提示词内容变更通过版本管理提交，创建后可在下方激活为当前生效版本。</p>
          </div>
        </div>
        <el-form ref="versionFormRef" :model="versionForm" :rules="versionRules" label-position="top">
          <div class="version-form-grid">
            <el-form-item label="版本号" prop="versionCode">
              <el-input v-model.trim="versionForm.versionCode" placeholder="例如：v2" />
            </el-form-item>
            <el-form-item label="版本名称">
              <el-input v-model.trim="versionForm.versionName" placeholder="例如：强化项目追问" />
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="versionForm.status" style="width: 100%">
                <el-option label="草稿" value="DRAFT" />
                <el-option label="停用" value="INACTIVE" />
              </el-select>
            </el-form-item>
          </div>
          <el-form-item label="提示词内容" prop="content">
            <el-input v-model="versionForm.content" type="textarea" :rows="7" placeholder="请输入新版本提示词内容" />
          </el-form-item>
          <el-form-item label="变更说明">
            <el-input v-model="versionForm.changeLog" type="textarea" :rows="2" placeholder="可选：说明本次版本调整原因" />
          </el-form-item>
          <div class="version-actions">
            <el-button @click="resetVersionForm">重置</el-button>
            <el-button
              v-permission="'admin:ai:prompt:write'"
              type="primary"
              :loading="versionSaving"
              :disabled="isAdminMobileReadonly"
              :title="mobileReadonlyTitle()"
              @click="handleCreateVersion"
            >
              创建版本
            </el-button>
          </div>
        </el-form>
      </section>

      <section class="version-list-panel">
        <div class="version-section-head">
          <div>
            <h3>版本列表</h3>
            <p>展示真实版本状态；发布范围、差异和测试结果只在已有记录时呈现。</p>
          </div>
          <div class="version-toolbar">
            <div class="table-view-tools">
              <el-segmented v-model="versionTableSize" :options="versionTableSizeOptions" />
              <el-dropdown trigger="click" :hide-on-click="false">
                <el-button plain>列配置</el-button>
                <template #dropdown>
                  <el-dropdown-menu class="column-config-menu">
                    <el-dropdown-item v-for="item in versionColumnOptions" :key="item.key">
                      <el-checkbox v-model="versionVisibleColumns[item.key]" :disabled="item.required">
                        {{ item.label }}
                      </el-checkbox>
                    </el-dropdown-item>
                    <el-dropdown-item divided>
                      <el-button link type="primary" @click.stop="resetVersionTableView">恢复默认视图</el-button>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
            <el-button v-if="currentPrompt" @click="openTemplateCallLogs(currentPrompt)">模板运行记录</el-button>
            <el-button :loading="versionLoading" @click="fetchVersions">刷新</el-button>
          </div>
        </div>

        <el-table v-loading="versionLoading" :data="versions" row-key="id" :size="versionTableSize">
          <el-table-column type="expand">
            <template #default="{ row }">
              <div class="version-content-preview">
                <strong>提示词内容预览</strong>
                <pre>{{ row.content || '暂无内容' }}</pre>
              </div>
            </template>
          </el-table-column>
          <el-table-column v-if="isVersionColumnVisible('versionCode')" prop="versionCode" label="版本号" width="110" />
          <el-table-column v-if="isVersionColumnVisible('versionName')" prop="versionName" label="版本名称" min-width="140" show-overflow-tooltip />
          <el-table-column v-if="isVersionColumnVisible('status')" label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="versionStatusType(row.status)" effect="plain">{{ versionStatusText(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="isVersionColumnVisible('active')" label="激活" width="90">
            <template #default="{ row }">
              <el-tag v-if="row.isActive === 1" type="success" effect="plain">已激活</el-tag>
              <span v-else class="muted-text">-</span>
            </template>
          </el-table-column>
          <el-table-column v-if="isVersionColumnVisible('changeLog')" label="变更说明" min-width="180">
            <template #default="{ row }">
              <span class="field-two-line">{{ row.changeLog || '暂无变更说明' }}</span>
            </template>
          </el-table-column>
          <el-table-column v-if="isVersionColumnVisible('updatedAt')" label="更新时间" width="170">
            <template #default="{ row }">{{ row.updatedAt || row.createdAt || '-' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="300" fixed="right">
            <template #default="{ row }">
              <el-button v-permission="'admin:ai:prompt:test'" link type="primary" @click="openTestDialog(row)">测试</el-button>
              <el-button
                v-if="canActivateVersion(row)"
                v-permission="'admin:ai:prompt:publish'"
                link
                type="primary"
                :disabled="isAdminMobileReadonly"
                :title="mobileReadonlyTitle()"
                @click="handleActivateVersion(row)"
              >
                激活
              </el-button>
              <el-button
                v-if="canRollbackVersion(row)"
                v-permission="'admin:ai:prompt:publish'"
                link
                type="primary"
                :disabled="isAdminMobileReadonly"
                :title="mobileReadonlyTitle()"
                @click="handleRollbackVersion(row)"
              >
                回滚
              </el-button>
              <el-button v-else-if="isVersionActive(row)" link disabled title="当前已是激活版本">回滚</el-button>
              <el-button
                v-if="canDisableVersion(row)"
                v-permission="'admin:ai:prompt:publish'"
                link
                type="warning"
                :disabled="isAdminMobileReadonly"
                :title="mobileReadonlyTitle()"
                @click="handleDisableVersion(row)"
              >
                禁用
              </el-button>
              <el-button link type="primary" @click="openVersionCallLogs(row)">运行记录</el-button>
            </template>
          </el-table-column>
        </el-table>

        <AppState
          v-if="!versionLoading && !versions.length"
          class="prompt-secondary-empty"
          :type="versionError ? 'error' : 'empty'"
          :title="versionError ? '版本记录加载失败' : '暂无版本记录'"
          :description="versionEmptyDescription"
        >
          <el-button v-if="versionError" type="primary" @click="fetchVersions">重试</el-button>
          <span v-else class="empty-action-hint">可使用上方表单创建第一个版本</span>
        </AppState>
        <div v-if="versionPagination.total > versionPagination.pageSize" class="pagination-wrap">
          <el-pagination
            v-model:current-page="versionQuery.pageNo"
            v-model:page-size="versionQuery.pageSize"
            background
            layout="total, prev, pager, next"
            :total="versionPagination.total"
            @change="fetchVersions"
          />
        </div>
      </section>
    </el-drawer>

    <el-dialog v-model="testDialogVisible" title="提示词版本测试" width="920px" destroy-on-close class="prompt-test-dialog">
      <section class="test-version-card">
        <div>
          <span>当前版本</span>
          <strong>{{ testingVersion?.versionCode || '-' }}</strong>
        </div>
        <div>
          <span>版本名称</span>
          <strong>{{ testingVersion?.versionName || '-' }}</strong>
        </div>
        <div>
          <span>状态</span>
          <el-tag v-if="testingVersion" :type="versionStatusType(testingVersion.status)" effect="plain">
            {{ versionStatusText(testingVersion.status) }}
          </el-tag>
          <strong v-else>-</strong>
        </div>
      </section>

      <el-alert
        class="test-mode-alert"
        type="warning"
        show-icon
        :closable="false"
      title="可选择仅预览渲染结果，或发起一次 AI 测试并记录调用明细。"
      />

      <el-form label-position="top">
        <el-form-item label="输入变量">
          <el-input v-model="testInputJson" type="textarea" :rows="8" placeholder='例如：{"position":"Java 后端工程师"}' />
        </el-form-item>
        <el-form-item label="是否调用 AI">
          <el-switch v-model="testCallAi" active-text="调用 AI" inactive-text="仅预览" />
        </el-form-item>
      </el-form>

      <section v-if="testResult" class="test-result-panel">
        <div class="version-section-head">
          <div>
            <h3>测试结果</h3>
            <p>展示渲染内容、AI 响应和 AI 运行记录状态。</p>
          </div>
        </div>
        <div class="test-result-grid">
          <article>
            <span>AI 运行记录</span>
            <strong>{{ testResult.aiCallLogId ? '已记录，可追踪' : '暂无运行记录' }}</strong>
          </article>
          <article>
            <span>执行模式</span>
            <strong>{{ formatExecutionMode(testResult.mockMode) }}</strong>
          </article>
        </div>
        <el-collapse v-if="testResult.aiCallLogId" class="prompt-log-diagnostics">
          <el-collapse-item title="技术诊断（运行定位，按需展开）" name="test-call-log">
            <div class="prompt-log-diagnostic-list">
              <span>AI 运行记录 {{ testResult.aiCallLogId }}</span>
            </div>
          </el-collapse-item>
        </el-collapse>
        <div class="version-content-preview">
          <div class="version-content-preview__head">
            <strong>渲染内容预览</strong>
            <el-button
              v-if="testResult.renderedPrompt"
              text
              type="primary"
              @click="revealPromptTestContent('renderedPrompt')"
            >
              {{ renderedPromptVisible ? '隐藏完整内容' : '查看完整内容' }}
            </el-button>
          </div>
          <p v-if="testResult.renderedPrompt && !renderedPromptVisible" class="sensitive-preview-hint">
            已生成渲染内容，共 {{ testResult.renderedPrompt.length }} 字符。完整内容可能包含提示词变量和测试输入，查看会先进行敏感访问确认。
          </p>
          <pre v-else>{{ testResult.renderedPrompt || '暂无渲染结果' }}</pre>
        </div>
        <div class="version-content-preview">
          <div class="version-content-preview__head">
            <strong>AI 响应</strong>
            <el-button
              v-if="testResult.aiResponse"
              text
              type="primary"
              @click="revealPromptTestContent('aiResponse')"
            >
              {{ aiResponseVisible ? '隐藏完整内容' : '查看完整内容' }}
            </el-button>
          </div>
          <p v-if="testResult.aiResponse && !aiResponseVisible" class="sensitive-preview-hint">
            已返回 AI 响应，共 {{ testResult.aiResponse.length }} 字符。完整内容可能包含测试输入和模型输出细节，查看会先进行敏感访问确认。
          </p>
          <pre v-else>{{ testResult.aiResponse || '未调用 AI 或暂无 AI 响应' }}</pre>
        </div>
        <div class="version-content-preview">
          <strong>输入变量</strong>
          <pre>{{ formatJson(testResult.inputVariables || {}) }}</pre>
        </div>
      </section>

      <template #footer>
        <el-button @click="testDialogVisible = false">关闭</el-button>
        <el-button
          v-permission="'admin:ai:prompt:test'"
          type="primary"
          :loading="testLoading"
          :disabled="isAdminMobileReadonly && testCallAi"
          :title="testCallAi ? mobileReadonlyTitle() : undefined"
          @click="handleTestVersion"
        >
          执行测试
        </el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="callLogDrawerVisible" size="1080px" destroy-on-close class="call-log-drawer">
      <template #header>
        <div class="drawer-head">
          <div>
            <p>提示词 AI 运行记录</p>
            <h2>{{ callLogTitle }}</h2>
          </div>
          <el-tag effect="plain">{{ callLogScope === 'template' ? '模板' : '版本' }}</el-tag>
        </div>
      </template>

      <section class="version-list-panel">
        <div class="version-section-head">
          <div>
            <h3>AI 运行记录</h3>
            <p>用于判断模板在真实 AI 场景中的运行状态；技术编号默认折叠。</p>
          </div>
          <div class="table-view-tools">
            <el-segmented v-model="callLogTableSize" :options="callLogTableSizeOptions" />
            <el-dropdown trigger="click" :hide-on-click="false">
              <el-button plain>列配置</el-button>
              <template #dropdown>
                <el-dropdown-menu class="column-config-menu">
                  <el-dropdown-item v-for="item in callLogColumnOptions" :key="item.key">
                    <el-checkbox v-model="callLogVisibleColumns[item.key]" :disabled="item.required">
                      {{ item.label }}
                    </el-checkbox>
                  </el-dropdown-item>
                  <el-dropdown-item divided>
                    <el-button link type="primary" @click.stop="resetCallLogTableView">恢复默认视图</el-button>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
        <el-form :model="callLogQuery" inline class="call-log-filter">
          <el-form-item label="调用结果">
            <el-select v-model="callLogQuery.success" clearable placeholder="全部" style="width: 130px">
              <el-option label="成功" :value="true" />
              <el-option label="失败" :value="false" />
            </el-select>
          </el-form-item>
          <el-form-item label="场景">
            <el-select v-model="callLogQuery.scene" clearable placeholder="全部场景" style="width: 240px">
              <el-option v-for="item in sceneOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleCallLogSearch">查询</el-button>
            <el-button @click="handleCallLogReset">重置</el-button>
          </el-form-item>
        </el-form>

        <el-table v-loading="callLogLoading" :data="callLogs" row-key="id" :size="callLogTableSize">
          <el-table-column v-if="isCallLogColumnVisible('scene')" label="场景" min-width="190" show-overflow-tooltip>
            <template #default="{ row }">{{ getSceneLabel(row.scene || row.callType) }}</template>
          </el-table-column>
          <el-table-column v-if="isCallLogColumnVisible('businessId')" label="关联业务" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">{{ formatCallLogBusiness(row) }}</template>
          </el-table-column>
          <el-table-column v-if="isCallLogColumnVisible('modelName')" prop="modelName" label="模型" min-width="150" show-overflow-tooltip />
          <el-table-column v-if="isCallLogColumnVisible('success')" label="结果" width="100">
            <template #default="{ row }">
              <el-tag :type="isCallLogSuccess(row) ? 'success' : 'danger'" effect="plain">
                {{ isCallLogSuccess(row) ? '成功' : '失败' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="isCallLogColumnVisible('promptVersion')" prop="promptVersion" label="提示词版本" min-width="130" show-overflow-tooltip />
          <el-table-column v-if="isCallLogColumnVisible('tokens')" label="调用消耗" min-width="170">
            <template #default="{ row }">{{ formatCallConsumption(row) }}</template>
          </el-table-column>
          <el-table-column v-if="isCallLogColumnVisible('cost')" label="耗时" width="110">
            <template #default="{ row }">{{ row.costTimeMs ?? row.duration ?? row.elapsedMs ?? row.latencyMs ?? '-' }}</template>
          </el-table-column>
          <el-table-column v-if="isCallLogColumnVisible('errorMessage')" label="错误信息" min-width="190">
            <template #default="{ row }">
              <span class="field-two-line">{{ row.errorMessage || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column v-if="isCallLogColumnVisible('createdAt')" prop="createdAt" label="创建时间" min-width="170" show-overflow-tooltip />
        </el-table>
        <el-collapse v-if="callLogsHaveDiagnostics" class="prompt-log-diagnostics">
          <el-collapse-item title="技术诊断（运行编号/模板版本定位，按需展开）" name="call-log-diagnostics">
            <div class="prompt-log-diagnostic-list">
              <span v-for="(row, index) in callLogs" :key="`prompt-log-diagnostic-${row.id || index}`">
                {{ formatCallLogDiagnostics(row, index) }}
              </span>
            </div>
          </el-collapse-item>
        </el-collapse>
        <AppState
          v-if="!callLogLoading && !callLogs.length"
          class="prompt-secondary-empty"
          :type="callLogError ? 'error' : 'empty'"
          :title="callLogError ? '运行记录加载失败' : '暂无运行记录'"
          :description="callLogEmptyDescription"
        >
          <el-button v-if="callLogError" type="primary" @click="fetchCallLogs">重试</el-button>
          <template v-else>
            <el-button v-if="hasCallLogFilters" type="primary" @click="handleCallLogReset">清空筛选</el-button>
            <el-button @click="fetchCallLogs">刷新</el-button>
          </template>
        </AppState>
        <div class="pagination-wrap">
          <el-pagination
            v-model:current-page="callLogQuery.pageNo"
            v-model:page-size="callLogQuery.pageSize"
            background
            layout="total, sizes, prev, pager, next"
            :total="callLogTotal"
            :page-sizes="[10, 20, 50]"
            @change="fetchCallLogs"
          />
        </div>
      </section>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MessageSquareCode, Plus } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'

import {
  activatePromptTemplateVersionApi,
  createAdminAiPromptApi,
  createPromptTemplateVersionApi,
  deleteAdminAiPromptApi,
  getAdminAiPromptsApi,
  getPromptTemplateCallLogsApi,
  getPromptTemplateVersionCallLogsApi,
  getPromptTemplateVersionsApi,
  disablePromptTemplateVersionApi,
  rollbackPromptTemplateVersionApi,
  testPromptTemplateVersionApi,
  updateAdminAiPromptApi,
  updateAdminAiPromptStatusApi
} from '@/api/aiAdmin'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { useAdminTableView } from '@/composables/useAdminTableView'
import { AI_SCENE } from '@/constants/enums'
import type {
  AiScene,
  AiCallLogVO,
  CreatePromptTemplateVersionDTO,
  PromptCallLogQueryDTO,
  PromptTemplateDTO,
  PromptTemplateQueryDTO,
  PromptTemplateVersionQuery,
  PromptTemplateVersionVO,
  PromptTemplateVO,
  TestPromptTemplateVersionVO
} from '@/types/ai'
import { useAdminMobileReadonly } from '@/composables/useAdminMobileReadonly'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage } from '@/utils/error'

const sceneOptions = [
  { label: '八股文提问模板', value: AI_SCENE.INTERVIEW_QUESTION_GENERATE },
  { label: '项目深挖提问模板', value: AI_SCENE.PROJECT_DEEP_DIVE_QUESTION },
  { label: '回答评分模板', value: AI_SCENE.INTERVIEW_ANSWER_EVALUATE },
  { label: '动态追问模板', value: AI_SCENE.INTERVIEW_FOLLOW_UP_GENERATE },
  { label: '面试报告生成模板', value: AI_SCENE.INTERVIEW_REPORT_GENERATE }
]

const loading = ref(false)
const saving = ref(false)
const promptError = ref('')
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const prompts = ref<PromptTemplateVO[]>([])
const total = ref(0)
const versionDrawerVisible = ref(false)
const versionLoading = ref(false)
const versionError = ref('')
const versionSaving = ref(false)
const versionFormRef = ref<FormInstance>()
const currentPrompt = ref<PromptTemplateVO | null>(null)
const versions = ref<PromptTemplateVersionVO[]>([])
const testDialogVisible = ref(false)
const testLoading = ref(false)
const testingVersion = ref<PromptTemplateVersionVO | null>(null)
const testInputJson = ref('{}')
const testCallAi = ref(false)
const testResult = ref<TestPromptTemplateVersionVO | null>(null)
const renderedPromptVisible = ref(false)
const aiResponseVisible = ref(false)
const callLogDrawerVisible = ref(false)
const callLogLoading = ref(false)
const callLogError = ref('')
const callLogScope = ref<'template' | 'version'>('template')
const callLogTargetId = ref<number | null>(null)
const callLogTitle = ref('')
const callLogs = ref<AiCallLogVO[]>([])
const { guardAdminMobileWrite, isAdminMobileReadonly, mobileReadonlyTitle } = useAdminMobileReadonly()
const callLogTotal = ref(0)

type PromptColumnKey = 'promptName' | 'templateCode' | 'scene' | 'version' | 'status' | 'updatedAt'
type VersionColumnKey = 'versionCode' | 'versionName' | 'status' | 'active' | 'changeLog' | 'updatedAt'
type CallLogColumnKey =
  | 'scene'
  | 'businessId'
  | 'modelName'
  | 'success'
  | 'promptVersion'
  | 'tokens'
  | 'cost'
  | 'errorMessage'
  | 'createdAt'

const {
  tableSize,
  tableSizeOptions,
  columnOptions,
  visibleColumns,
  isColumnVisible,
  resetTableView
} = useAdminTableView<PromptColumnKey>('admin:prompt-template', [
  { key: 'promptName', label: '模板名称', required: true },
  { key: 'templateCode', label: '模板编码' },
  { key: 'scene', label: '场景类型', required: true },
  { key: 'version', label: '版本' },
  { key: 'status', label: '状态', required: true },
  { key: 'updatedAt', label: '更新时间' }
])

const {
  tableSize: versionTableSize,
  tableSizeOptions: versionTableSizeOptions,
  columnOptions: versionColumnOptions,
  visibleColumns: versionVisibleColumns,
  isColumnVisible: isVersionColumnVisible,
  resetTableView: resetVersionTableView
} = useAdminTableView<VersionColumnKey>('admin:prompt-template:versions', [
  { key: 'versionCode', label: '版本号', required: true },
  { key: 'versionName', label: '版本名称' },
  { key: 'status', label: '状态', required: true },
  { key: 'active', label: '激活' },
  { key: 'changeLog', label: '变更说明' },
  { key: 'updatedAt', label: '更新时间' }
])

const {
  tableSize: callLogTableSize,
  tableSizeOptions: callLogTableSizeOptions,
  columnOptions: callLogColumnOptions,
  visibleColumns: callLogVisibleColumns,
  isColumnVisible: isCallLogColumnVisible,
  resetTableView: resetCallLogTableView
} = useAdminTableView<CallLogColumnKey>('admin:prompt-template:call-logs', [
  { key: 'scene', label: '场景', required: true },
  { key: 'businessId', label: '关联业务' },
  { key: 'modelName', label: '模型' },
  { key: 'success', label: '结果', required: true },
  { key: 'promptVersion', label: '提示词版本' },
  { key: 'tokens', label: '调用消耗' },
  { key: 'cost', label: '耗时' },
  { key: 'errorMessage', label: '错误信息' },
  { key: 'createdAt', label: '创建时间' }
])

const query = reactive<PromptTemplateQueryDTO>({
  keyword: '',
  scene: '',
  status: '',
  pageNo: 1,
  pageSize: 10
})

const form = reactive<PromptTemplateDTO>({
  scene: AI_SCENE.INTERVIEW_QUESTION_GENERATE,
  name: '',
  content: '',
  status: 1,
  description: ''
})

const versionQuery = reactive<PromptTemplateVersionQuery>({
  status: '',
  isActive: '',
  pageNo: 1,
  pageSize: 10
})

const versionPagination = reactive({
  total: 0,
  pageSize: 10
})

const versionForm = reactive<CreatePromptTemplateVersionDTO>({
  versionCode: '',
  versionName: '',
  content: '',
  status: 'DRAFT',
  changeLog: ''
})

const callLogQuery = reactive<PromptCallLogQueryDTO>({
  success: '',
  scene: '',
  pageNo: 1,
  pageSize: 10
})

const rules = computed<FormRules<PromptTemplateDTO>>(() => ({
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  scene: [{ required: true, message: '请选择模板类型', trigger: 'change' }],
  content: editingId.value ? [] : [{ required: true, message: '请输入模板内容', trigger: 'blur' }]
}))

const versionRules: FormRules<CreatePromptTemplateVersionDTO> = {
  versionCode: [{ required: true, message: '请输入版本号', trigger: 'blur' }],
  content: [{ required: true, message: '请输入提示词内容', trigger: 'blur' }]
}

const enabledCount = computed(() => prompts.value.filter((item) => item.status === 1).length)
const sceneCount = computed(() => new Set(prompts.value.map((item) => item.promptType || item.scene).filter(Boolean)).size)
const hasPromptFilters = computed(() => Boolean(query.keyword || query.scene || query.status !== ''))
const promptEmptyTitle = computed(() =>
  hasPromptFilters.value ? '当前筛选没有提示词模板' : '暂无提示词模板'
)
const promptEmptyDescription = computed(() =>
  hasPromptFilters.value
    ? '当前筛选条件下没有提示词模板。可以清空关键词、场景类型或状态筛选后重新查看，避免把筛选空误判为模板丢失。'
    : '提示词模板为空会影响面试提问、评分、追问和报告生成。请先新增模板，再通过版本测试确认效果。'
)
const hasVersionFilters = computed(() => Boolean(versionQuery.status || versionQuery.isActive !== ''))
const versionEmptyDescription = computed(() => {
  if (versionError.value) return versionError.value
  if (hasVersionFilters.value) return '没有匹配当前筛选条件的版本记录，可清空状态或激活筛选后重试。'
  return '当前模板还没有版本记录。请先创建新版本，避免管理员误以为模板数据丢失。'
})
const hasCallLogFilters = computed(() => Boolean(callLogQuery.success !== '' || callLogQuery.scene))
const callLogsHaveDiagnostics = computed(() =>
  callLogs.value.some((row) => row.id || row.promptTemplateId || row.promptTemplateVersionId || row.traceId || row.businessId)
)
const callLogEmptyDescription = computed(() => {
  if (callLogError.value) return callLogError.value
  if (hasCallLogFilters.value) return '没有匹配当前筛选条件的运行记录，可清空结果或场景筛选后再查。'
  return callLogScope.value === 'version'
    ? '当前版本暂无运行记录；也可能是历史日志未写入提示词版本字段，可刷新或查看模板级运行记录。'
    : '当前模板暂无运行记录；如果近期确实运行过提示词调用，请到 AI 运行记录页按场景或追踪号进一步排查。'
})

const getSceneLabel = (value?: AiScene | '') => sceneOptions.find((item) => item.value === value)?.label || (value ? '场景待确认' : '-')

const fetchPrompts = async () => {
  loading.value = true
  promptError.value = ''
  try {
    const result = await getAdminAiPromptsApi(query)
    prompts.value = result.records || []
    total.value = result.total || 0
  } catch (error) {
    prompts.value = []
    total.value = 0
    promptError.value = getErrorMessage(error, '提示词模板列表暂时加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

const resetVersionForm = () => {
  Object.assign(versionForm, {
    versionCode: '',
    versionName: '',
    content: '',
    status: 'DRAFT',
    changeLog: ''
  })
  versionFormRef.value?.clearValidate()
}

const resetVersionList = () => {
  versions.value = []
  versionPagination.total = 0
  versionError.value = ''
}

const fetchVersions = async () => {
  if (!currentPrompt.value?.id) return
  versionLoading.value = true
  versionError.value = ''
  try {
    const result = await getPromptTemplateVersionsApi(currentPrompt.value.id, versionQuery)
    versions.value = result.records || []
    versionPagination.total = result.total || 0
    versionPagination.pageSize = result.pageSize || versionQuery.pageSize || 10
  } catch (error) {
    versions.value = []
    versionPagination.total = 0
    versionError.value = getErrorMessage(error, '版本记录暂时加载失败，请稍后重试。')
  } finally {
    versionLoading.value = false
  }
}

const applyPrompt = (prompt?: PromptTemplateVO) => {
  Object.assign(form, {
    name: prompt?.promptName || prompt?.name || '',
    scene: prompt?.promptType || prompt?.scene || AI_SCENE.INTERVIEW_QUESTION_GENERATE,
    content: prompt?.templateContent || prompt?.content || '',
    status: prompt?.status ?? 1,
    description: prompt?.description || ''
  })
}

const openDialog = (row?: PromptTemplateVO) => {
  editingId.value = row?.id || null
  applyPrompt(row)
  dialogVisible.value = true
}

const openVersionDrawer = async (row: PromptTemplateVO) => {
  currentPrompt.value = row
  versionQuery.pageNo = 1
  resetVersionForm()
  resetVersionList()
  versionDrawerVisible.value = true
  await fetchVersions()
}

const resetCallLogQuery = () => {
  Object.assign(callLogQuery, {
    success: '',
    scene: '',
    pageNo: 1,
    pageSize: 10
  })
}

const resetCallLogList = () => {
  callLogs.value = []
  callLogTotal.value = 0
  callLogError.value = ''
}

const fetchCallLogs = async () => {
  if (!callLogTargetId.value) return
  callLogLoading.value = true
  callLogError.value = ''
  try {
    const api =
      callLogScope.value === 'template'
        ? getPromptTemplateCallLogsApi
        : getPromptTemplateVersionCallLogsApi
    const result = await api(callLogTargetId.value, callLogQuery)
    callLogs.value = result.records || []
    callLogTotal.value = result.total || 0
  } catch (error) {
    callLogs.value = []
    callLogTotal.value = 0
    callLogError.value = getErrorMessage(error, '运行记录查询失败，不影响提示词版本管理主功能。')
    ElMessage.error(callLogError.value)
  } finally {
    callLogLoading.value = false
  }
}

const openTemplateCallLogs = async (row: PromptTemplateVO) => {
  callLogScope.value = 'template'
  callLogTargetId.value = row.id
  callLogTitle.value = `${row.promptName || row.name || '提示词模板'} AI 运行记录`
  resetCallLogQuery()
  resetCallLogList()
  callLogDrawerVisible.value = true
  await fetchCallLogs()
}

const openVersionCallLogs = async (row: PromptTemplateVersionVO) => {
  callLogScope.value = 'version'
  callLogTargetId.value = row.id
  callLogTitle.value = `${row.versionCode || '当前版本'} AI 运行记录`
  resetCallLogQuery()
  resetCallLogList()
  callLogDrawerVisible.value = true
  await fetchCallLogs()
}

const handleCallLogSearch = () => {
  callLogQuery.pageNo = 1
  fetchCallLogs()
}

const handleCallLogReset = () => {
  resetCallLogQuery()
  fetchCallLogs()
}

const handleSave = async () => {
  if (!guardAdminMobileWrite()) return
  if (!formRef.value) return
  await formRef.value.validate()
  const actionLabel = editingId.value ? '更新提示词模板' : '新增提示词模板'
  const confirmed = await confirmDangerActionPreview({
    title: `${actionLabel}预览`,
    action: `${actionLabel}「${form.name}」`,
    target: `模板编码：${form.scene || '-'}；场景：${getSceneLabel(form.scene)}；状态：${form.status === 1 ? '启用' : '停用'}`,
    impact: '模板保存后会影响面试提问、评分、追问、报告生成或其它使用该场景的 AI 能力。',
    rollback: editingId.value
      ? '可再次编辑模板基础信息；已产生的 AI 调用和历史版本不会自动回到修改前。'
      : '如新增错误，可在确认没有业务依赖后停用或删除该模板。',
    audit: '模板保存会记录操作人、模板编码、场景和时间，便于追踪提示词治理变更。',
    tips: [
      `初始内容长度：${form.content?.length || 0} 字符`,
      '确认模板编码和场景不会与现有模板混淆。',
      '确认内容不包含真实用户敏感信息或临时调试字段。'
    ],
    confirmButtonText: '确认保存'
  })
  if (!confirmed) return
  saving.value = true
  try {
    if (editingId.value) {
      await updateAdminAiPromptApi(editingId.value, form)
    } else {
      await createAdminAiPromptApi(form)
    }
    ElMessage.success('提示词模板已保存')
    dialogVisible.value = false
    await fetchPrompts()
  } finally {
    saving.value = false
  }
}

const handleCreateVersion = async () => {
  if (!guardAdminMobileWrite()) return
  if (!versionFormRef.value || !currentPrompt.value?.id) return
  await versionFormRef.value.validate()
  const confirmed = await confirmDangerActionPreview({
    title: '创建提示词版本预览',
    action: `为「${displayPromptName(currentPrompt.value)}」创建版本「${versionForm.versionCode}」`,
    target: `模板：${displayPromptName(currentPrompt.value)}；场景：${getSceneLabel(currentPrompt.value.promptType || currentPrompt.value.scene || '')}；状态：${versionForm.status || 'DRAFT'}`,
    impact: '新版本会进入提示词版本列表，后续测试、激活或回滚都可能基于该内容执行。',
    rollback: '创建后不能自动撤销；如内容不合适，可继续编辑下一版、禁用版本或保留为草稿不激活。',
    audit: '版本创建会记录操作人、模板、版本号和时间，便于追踪提示词内容变更。',
    tips: [
      `版本内容长度：${versionForm.content?.length || 0} 字符`,
      versionForm.changeLog ? `变更说明：${versionForm.changeLog.slice(0, 80)}` : '建议填写变更说明，方便后续复核。',
      '确认版本内容不包含真实用户敏感信息或一次性调试内容。'
    ],
    confirmButtonText: '确认创建版本'
  })
  if (!confirmed) return
  versionSaving.value = true
  try {
    await createPromptTemplateVersionApi(currentPrompt.value.id, {
      versionCode: versionForm.versionCode,
      versionName: versionForm.versionName || undefined,
      content: versionForm.content,
      status: versionForm.status || 'DRAFT',
      changeLog: versionForm.changeLog || undefined
    })
    ElMessage.success('提示词版本已创建')
    resetVersionForm()
    await fetchVersions()
  } finally {
    versionSaving.value = false
  }
}

const openTestDialog = (row: PromptTemplateVersionVO) => {
  testingVersion.value = row
  testInputJson.value = '{}'
  testCallAi.value = false
  testResult.value = null
  renderedPromptVisible.value = false
  aiResponseVisible.value = false
  testDialogVisible.value = true
}

const revealPromptTestContent = async (kind: 'renderedPrompt' | 'aiResponse') => {
  const visibleRef = kind === 'renderedPrompt' ? renderedPromptVisible : aiResponseVisible
  if (visibleRef.value) {
    visibleRef.value = false
    return
  }
  const contentLabel = kind === 'renderedPrompt' ? '渲染内容' : 'AI 响应'
  const confirmed = await confirmDangerActionPreview({
    title: `${contentLabel}敏感访问预览`,
    action: `查看提示词测试${contentLabel}完整内容`,
    target: testingVersion.value ? promptVersionTarget(testingVersion.value) : '当前提示词测试结果',
    impact: `${contentLabel}可能包含提示词变量、测试输入、模型输出细节或敏感样例，查看后需要按敏感信息处理规范使用。`,
    rollback: '查看行为无法撤销；如果发现输入包含真实用户敏感信息，应按内部审计和清理流程处理。',
    audit: '本次前端确认会保留操作上下文，后续如进入后端敏感查看接口也会写入访问审计。',
    tips: ['仅在排查提示词质量或测试结果异常时查看。', '不要把完整内容复制到第三方工具或无权限渠道。'],
    confirmButtonText: '确认查看'
  })
  if (confirmed) visibleRef.value = true
}

const parseInputVariables = () => {
  let parsed: unknown
  try {
    parsed = JSON.parse(testInputJson.value || '{}')
  } catch {
    ElMessage.error('请输入合法的对象格式，例如 {"position":"Java 后端工程师"}')
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    ElMessage.error('输入变量只接受对象结构')
    return null
  }
  const entries = Object.entries(parsed)
  if (entries.some(([, value]) => typeof value !== 'string')) {
    ElMessage.error('输入变量的变量值必须是字符串')
    return null
  }
  return Object.fromEntries(entries) as Record<string, string>
}

const handleTestVersion = async () => {
  if (!testingVersion.value?.id) return
  const inputVariables = parseInputVariables()
  if (!inputVariables) return
  if (testCallAi.value) {
    if (!guardAdminMobileWrite()) return
    const confirmed = await confirmDangerActionPreview({
      title: '提示词版本 AI 测试预览',
      action: `调用 AI 测试版本「${testingVersion.value.versionCode}」`,
      target: `${promptVersionTarget(testingVersion.value)}；变量数量：${Object.keys(inputVariables).length}`,
      impact: '本次测试可能实际请求 AI 模型，产生运行记录、消耗统计、费用统计和敏感输入输出记录。',
      rollback: 'AI 请求、费用统计和运行记录提交后不能直接撤销；如变量包含敏感信息，需要按 AI 记录审计流程处理。',
      audit: '测试调用会记录模板、版本、变量摘要、AI 运行记录、操作人和时间，便于排查提示词质量。',
      tips: ['确认输入变量不包含真实用户敏感信息。', '若只想检查模板渲染，请关闭“调用 AI”。'],
      confirmButtonText: '确认调用 AI 测试'
    })
    if (!confirmed) return
  }
  testLoading.value = true
  try {
    testResult.value = await testPromptTemplateVersionApi(testingVersion.value.id, {
      inputVariables,
      callAi: testCallAi.value
    })
    renderedPromptVisible.value = false
    aiResponseVisible.value = false
    ElMessage.success('提示词版本测试完成')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '测试失败，请稍后重试。'))
  } finally {
    testLoading.value = false
  }
}

const isVersionActive = (row: PromptTemplateVersionVO) => row.isActive === 1 || row.status === 'ACTIVE'

const canActivateVersion = (row: PromptTemplateVersionVO) => !isVersionActive(row)

const canDisableVersion = (row: PromptTemplateVersionVO) => !isVersionActive(row) && row.status !== 'DISABLED'

const canRollbackVersion = (row: PromptTemplateVersionVO) => !isVersionActive(row) && row.status !== 'DISABLED'

const displayPromptName = (row?: PromptTemplateVO | null) => row?.promptName || row?.name || row?.templateCode || '提示词模板'

const promptVersionTarget = (row: PromptTemplateVersionVO) => {
  const templateName = displayPromptName(currentPrompt.value)
  return `模板：${templateName}；版本：${row.versionCode || row.versionName || '未命名版本'}；场景：${row.scene || currentPrompt.value?.promptType || '-'}`
}

const confirmPromptVersionAction = async (
  row: PromptTemplateVersionVO,
  actionLabel: string,
  impact: string,
  confirmButtonText: string
) =>
  confirmDangerActionPreview({
    title: `${actionLabel}提示词版本预览`,
    action: `${actionLabel}版本「${row.versionCode}」`,
    target: promptVersionTarget(row),
    impact,
    rollback: '可通过再次激活其它版本恢复生效版本，但已产生的 AI 调用结果不会自动回到变更前。',
    audit: '提示词版本操作会记录操作人、模板、版本、变更说明和时间，便于回溯 AI 输出质量变化。',
    tips: ['确认该版本已在测试面板验证过变量和输出效果。', '确认变更说明能解释本次上线、回滚或禁用原因。'],
    confirmButtonText
  })

const handleActivateVersion = async (row: PromptTemplateVersionVO) => {
  if (!guardAdminMobileWrite()) return
  const confirmed = await confirmPromptVersionAction(
    row,
    '激活',
    '该版本会成为当前生效版本，后续相关 AI 场景会使用该提示词生成内容。',
    '确认激活'
  )
  if (!confirmed) return
  let changeLog: string | undefined
  try {
    const { value } = await ElMessageBox.prompt('可选：填写激活说明', `激活版本 ${row.versionCode}`, {
      confirmButtonText: '激活',
      cancelButtonText: '取消',
      inputPlaceholder: '例如：上线优化后的提示词'
    })
    changeLog = value || undefined
  } catch {
    return
  }
  try {
    await activatePromptTemplateVersionApi(row.id, { changeLog })
    ElMessage.success('提示词版本已激活')
    await fetchVersions()
    await fetchPrompts()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '激活失败，请稍后重试。'))
  }
}

const handleRollbackVersion = async (row: PromptTemplateVersionVO) => {
  if (!guardAdminMobileWrite()) return
  if (isVersionActive(row)) {
    ElMessage.warning('当前已是激活版本')
    return
  }
  if (row.status === 'DISABLED') {
    ElMessage.warning('已禁用版本不能回滚')
    return
  }
  const confirmed = await confirmPromptVersionAction(
    row,
    '回滚',
    '回滚等价于激活该历史版本，会切换当前生效版本，后续 AI 输出会回到该版本逻辑。',
    '确认回滚'
  )
  if (!confirmed) return
  let changeLog: string | undefined
  try {
    const { value } = await ElMessageBox.prompt(
      '回滚等价于激活该历史版本，会切换当前生效版本。可选填写回滚原因。',
      `回滚版本 ${row.versionCode}`,
      {
        confirmButtonText: '确认回滚',
        cancelButtonText: '取消',
        inputPlaceholder: '例如：恢复线上稳定提示词'
      }
    )
    changeLog = value || undefined
  } catch {
    return
  }
  try {
    await rollbackPromptTemplateVersionApi(row.id, { changeLog })
    ElMessage.success('提示词版本已回滚')
    await fetchVersions()
    await fetchPrompts()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '回滚失败，请稍后重试。'))
  }
}

const handleDisableVersion = async (row: PromptTemplateVersionVO) => {
  if (!guardAdminMobileWrite()) return
  if (isVersionActive(row)) {
    ElMessage.warning('当前激活版本不能直接禁用')
    return
  }
  const confirmed = await confirmPromptVersionAction(
    row,
    '禁用',
    '该版本会退出可选版本范围，后续不能直接激活或回滚到该版本。',
    '确认禁用'
  )
  if (!confirmed) return
  let changeLog: string | undefined
  try {
    const { value } = await ElMessageBox.prompt('可选：填写禁用说明', `禁用版本 ${row.versionCode}`, {
      confirmButtonText: '禁用',
      cancelButtonText: '取消',
      inputPlaceholder: '例如：版本内容过期'
    })
    changeLog = value || undefined
  } catch {
    return
  }
  try {
    await disablePromptTemplateVersionApi(row.id, { changeLog })
    ElMessage.success('提示词版本已禁用')
    await fetchVersions()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '禁用失败，请稍后重试。'))
  }
}

const handleStatus = async (row: PromptTemplateVO) => {
  if (!guardAdminMobileWrite()) return
  const nextStatus = row.status === 1 ? 0 : 1
  const actionLabel = nextStatus === 1 ? '启用' : '禁用'
  const confirmed = await confirmDangerActionPreview({
    title: `${actionLabel}提示词模板预览`,
    action: `${actionLabel}模板「${displayPromptName(row)}」`,
    target: `模板：${displayPromptName(row)}；模板编码：${row.templateCode || '-'}；场景：${row.promptType || row.scene || '-'}`,
    impact:
      nextStatus === 1
        ? '该模板会重新进入可用范围，后续相关 AI 场景可以继续使用该模板。'
        : '该模板会退出可用范围，依赖该模板的 AI 场景可能改用备用模板或暂时不可用。',
    rollback: `可在提示词模板治理页再次${nextStatus === 1 ? '禁用' : '启用'}该模板；已产生的 AI 输出不会自动回到变更前。`,
    audit: '模板启停会记录操作人、模板、目标状态和时间，便于追踪 AI 输出异常。',
    tips: ['确认当前模板不是相关场景的唯一可用模板。', '确认已评估对面试提问、评分、追问或报告生成的影响。'],
    confirmButtonText: `确认${actionLabel}`
  })
  if (!confirmed) return
  try {
    await updateAdminAiPromptStatusApi(row.id, nextStatus)
    ElMessage.success(nextStatus === 1 ? '提示词模板已启用' : '提示词模板已禁用')
    await fetchPrompts()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, `${actionLabel}提示词模板失败，请确认权限或稍后重试。`))
  }
}

const handleDelete = async (row: PromptTemplateVO) => {
  if (!guardAdminMobileWrite()) return
  const confirmed = await confirmDangerActionPreview({
    title: '删除提示词模板预览',
    action: `删除模板「${displayPromptName(row)}」`,
    target: `模板：${displayPromptName(row)}；模板编码：${row.templateCode || '-'}；场景：${row.promptType || row.scene || '-'}`,
    impact: '该模板会从治理列表中移除，关联版本、调用排障和 AI 场景配置可能受到影响。',
    rollback: '删除后无法直接恢复该模板；误删后需要重新创建模板、版本和变量配置。',
    audit: '删除模板会记录操作人、模板、模板编码和时间，便于审计。',
    tips: ['确认该模板没有正在被线上 AI 场景使用。', '确认已保留必要的提示词内容和版本信息。'],
    confirmButtonText: '确认删除'
  })
  if (!confirmed) return
  try {
    await deleteAdminAiPromptApi(row.id)
    ElMessage.success('提示词模板已删除')
    await fetchPrompts()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '提示词模板删除失败，请确认没有线上版本依赖后重试。'))
  }
}

const handleSearch = () => {
  query.pageNo = 1
  fetchPrompts()
}

const handleReset = () => {
  Object.assign(query, {
    keyword: '',
    scene: '',
    status: '',
    pageNo: 1,
    pageSize: 10
  })
  fetchPrompts()
}

const versionStatusText = (status?: string) => {
  const value = String(status || '').toUpperCase()
  const map: Record<string, string> = {
    DRAFT: '草稿',
    ACTIVE: '已激活',
    INACTIVE: '未激活',
    DISABLED: '已禁用'
  }
  return map[value] || (status ? '状态待确认' : '-')
}

const versionStatusType = (status?: string) => {
  const value = String(status || '').toUpperCase()
  if (value === 'ACTIVE') return 'success'
  if (value === 'DISABLED') return 'danger'
  if (value === 'DRAFT') return 'warning'
  return 'info'
}

const formatJson = (value: unknown) => JSON.stringify(value, null, 2)

const formatExecutionMode = (value?: boolean) => {
  if (typeof value !== 'boolean') return '-'
  return value ? '真实调用' : '仅渲染'
}

const isCallLogSuccess = (row: AiCallLogVO) => {
  if (typeof row.status === 'number') return row.status === 1
  return ['SUCCESS', 'SUCCEEDED', 'true', '1'].includes(String(row.status).toUpperCase())
}

const formatCallLogBusiness = (row: AiCallLogVO) => {
  if (row.businessId) return '有关联业务'
  const trace = row.traceIdShort || row.shortTraceId
  if (trace) return '可用追踪号定位'
  return '无关联业务'
}

const formatCallLogDiagnostics = (row: AiCallLogVO, index: number) => {
  const trace = row.traceIdShort || row.shortTraceId || row.traceId || '-'
  return `运行 ${index + 1}：运行记录 ${row.id || '-'}，模板 ${row.promptTemplateId || '-'}，版本 ${row.promptTemplateVersionId || '-'}，追踪号 ${trace}，关联业务 ${row.businessId || '-'}`
}

const formatCallConsumption = (row: AiCallLogVO) => {
  const prompt = row.promptTokens ?? row.inputTokens ?? '-'
  const completion = row.completionTokens ?? row.outputTokens ?? '-'
  const totalTokens = row.totalTokens ?? '-'
  return `输入 ${prompt} / 输出 ${completion} / 总计 ${totalTokens}`
}

onMounted(fetchPrompts)
</script>

<style scoped lang="scss">
.field-note {
  margin-top: 8px;
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
}

.table-view-tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

:global(.column-config-menu) {
  min-width: 168px;
  padding: 6px;
}

:global(.column-config-menu .el-checkbox) {
  width: 100%;
}

.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  p {
    margin: 0 0 6px;
    color: var(--app-text-muted);
    font-size: 12px;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  h2 {
    margin: 0;
    color: var(--app-text-primary);
    font-size: 20px;
    font-weight: 700;
  }
}

.version-create-panel,
.version-list-panel,
.test-result-panel {
  margin-bottom: 18px;
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.72);
}

.version-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;

  h3 {
    margin: 0 0 6px;
    color: var(--app-text-primary);
    font-size: 16px;
    font-weight: 700;
  }

  p {
    margin: 0;
    color: var(--app-text-muted);
    font-size: 13px;
    line-height: 1.6;
  }
}

.version-form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.version-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.version-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.call-log-filter {
  margin-bottom: 16px;
}

.prompt-secondary-empty {
  margin: 16px 0;
}

.prompt-secondary-empty :deep(.app-state__content) {
  display: grid;
  gap: 10px;
}

.prompt-log-diagnostics {
  margin-top: 12px;
}

.prompt-log-diagnostic-list {
  display: grid;
  gap: 8px;
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.prompt-log-diagnostic-list span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.empty-action-hint {
  color: var(--app-text-muted);
  font-size: 13px;
}

.field-two-line {
  display: -webkit-box;
  overflow: hidden;
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.45;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.version-content-preview {
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.68);

  strong {
    display: block;
    margin-bottom: 10px;
    color: var(--app-text-primary);
    font-size: 13px;
  }

  .version-content-preview__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;

    strong {
      margin-bottom: 0;
    }
  }

  .sensitive-preview-hint {
    margin: 0;
    color: var(--app-text-muted);
    font-size: 12px;
    line-height: 1.7;
  }

  pre {
    max-height: 260px;
    margin: 0;
    overflow: auto;
    color: var(--app-text-secondary);
    font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
    font-size: 12px;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
  }
}

.muted-text {
  color: var(--app-text-muted);
  font-size: 12px;
}

.test-version-card,
.test-result-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;

  div,
  article {
    padding: 14px;
    border: 1px solid var(--app-border);
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.72);
  }

  span {
    display: block;
    margin-bottom: 6px;
    color: var(--app-text-muted);
    font-size: 12px;
  }

  strong {
    color: var(--app-text-primary);
    font-size: 14px;
  }
}

.test-result-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.test-mode-alert {
  margin-bottom: 16px;
}

@media (max-width: 760px) {
  .table-view-tools {
    justify-content: flex-start;
    width: 100%;
  }

  .version-form-grid,
  .test-version-card,
  .test-result-grid {
    grid-template-columns: 1fr;
  }

  .version-section-head,
  .version-toolbar {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
