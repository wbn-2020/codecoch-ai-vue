<template>
  <div class="page-shell admin-console-page ops-page">
    <section class="admin-hero ops-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <Monitor :size="16" />
          <span>运维观测中心</span>
        </div>
        <h1 class="admin-hero__title">运维监控</h1>
        <p class="admin-hero__desc">
          聚合 AI 运行、智能教练生成运行、系统状态和失败分布。已接入服务健康探测；QPS、TPS、CPU、内存和缓存命中率会在监控指标可用后自动替换。
        </p>
      </div>
      <div class="admin-hero__actions">
        <el-segmented v-model="rangeDays" :options="rangeOptions" @change="loadPage" />
        <el-button :icon="RefreshCw" :loading="loading" @click="loadPage">刷新</el-button>
      </div>
    </section>

    <AppState v-if="errorMessage" type="error" title="运维数据加载失败" :description="errorMessage">
      <el-button type="primary" @click="loadPage">重试</el-button>
    </AppState>

    <template v-else>
      <AppState
        v-if="partialErrors.length"
        class="admin-diagnostic-state"
        type="disabled"
        title="部分运维数据未返回"
        :description="partialErrorDescription"
      >
        <div class="diagnostic-actions">
          <el-button type="primary" @click="loadPage">重新加载</el-button>
          <el-button @click="goAdminPath('/admin/ai/logs')">查看 AI 运行记录</el-button>
          <el-button @click="goAdminPath('/admin/analytics/jobs')">查看聚合任务</el-button>
        </div>
      </AppState>

      <section class="ops-card-grid" v-loading="loading">
        <article v-for="group in metricGroups" :key="group.key" class="ops-card">
          <div class="ops-card__head">
            <span class="ops-card__icon" :class="group.tone">
              <component :is="group.icon" :size="22" />
            </span>
            <div>
              <h2>{{ group.title }}</h2>
              <p>{{ group.subtitle }}</p>
            </div>
          </div>
          <div class="ops-mini-grid">
            <div v-for="metric in group.metrics" :key="metric.label" class="ops-mini">
              <span>{{ metric.label }}</span>
              <strong>{{ metric.value }}</strong>
              <small>{{ metric.hint }}</small>
            </div>
          </div>
        </article>
      </section>

      <section class="ops-main-grid">
        <article class="ops-panel ops-panel--wide">
          <div class="ops-panel__head">
            <div>
              <h2>QPS / RPM / TPM 趋势</h2>
              <p>按天聚合 AI 运行、失败和智能教练生成运行数据</p>
            </div>
            <el-tag effect="plain">近 {{ rangeDays }} 天</el-tag>
          </div>
          <div v-if="trendPoints.length" ref="trendChartRef" class="ops-chart" />
          <AppState
            v-else-if="!loading"
            class="ops-empty-state"
            :type="trendEmptyType"
            :title="trendEmptyTitle"
            :description="trendEmptyDescription"
          >
            <el-button type="primary" @click="loadPage">重新加载</el-button>
            <el-button @click="goAdminPath('/admin/ai/logs')">查看 AI 运行记录</el-button>
            <el-button @click="goAdminPath('/admin/agent/runs')">查看生成运行</el-button>
          </AppState>
        </article>

        <article class="ops-panel">
          <div class="ops-panel__head">
            <div>
              <h2>模型 / 失败统计</h2>
              <p>当前失败原因聚合</p>
            </div>
          </div>
          <div class="ops-model-list">
            <div v-for="item in failurePoints" :key="item.name" class="ops-model-row">
              <div>
                <strong>{{ translateFailureReason(item.name) }}</strong>
                <span>{{ item.value }} 次失败</span>
              </div>
              <el-progress :percentage="failurePercent(item.value)" :stroke-width="8" :show-text="false" />
            </div>
            <AppState
              v-if="!failurePoints.length && !loading"
              class="ops-empty-state"
              :type="failureEmptyType"
              :title="failureEmptyTitle"
              :description="failureEmptyDescription"
            >
              <el-button type="primary" @click="goAdminPath('/admin/ai/logs?status=FAILED')">查看失败记录</el-button>
              <el-button @click="loadPage">刷新聚合</el-button>
            </AppState>
          </div>
        </article>
      </section>

      <section class="ops-main-grid">
        <article class="ops-panel">
          <div class="ops-panel__head">
            <div>
              <h2>服务健康</h2>
              <p>来自管理驾驶舱系统状态</p>
            </div>
          </div>
          <div class="ops-service-list">
            <div v-for="item in services" :key="item.serviceName" class="ops-service-row">
              <span :class="`ops-dot ops-dot--${statusTone(item.status)}`"></span>
              <div>
                <strong>{{ serviceLabel(item.serviceName) }}</strong>
                <small>{{ serviceReasonLabel(item) }}</small>
              </div>
              <em :class="`status-${statusTone(item.status)}`">{{ statusText(item.status) }}</em>
            </div>
            <div v-for="item in vectorCollections" :key="item.collectionName" class="ops-service-row">
              <span :class="`ops-dot ops-dot--${vectorTone(item)}`"></span>
              <div>
                <strong>{{ vectorCollectionLabel(item.collectionName) }}</strong>
                <small>{{ vectorCollectionHint(item) }}</small>
              </div>
              <em :class="`status-${vectorTone(item)}`">{{ vectorCollectionStatus(item) }}</em>
            </div>
            <div class="ops-service-row">
              <span :class="`ops-dot ops-dot--${vectorDeleteOutboxTone}`"></span>
              <div>
                <strong>索引删除补偿</strong>
                <small>{{ vectorDeleteOutboxHint }}</small>
              </div>
              <em :class="`status-${vectorDeleteOutboxTone}`">{{ vectorDeleteOutboxStatus }}</em>
            </div>
            <AppState
              v-if="!hasServiceHealthRows && !loading"
              class="ops-empty-state"
              :type="serviceHealthEmptyType"
              :title="serviceHealthEmptyTitle"
              :description="serviceHealthEmptyDescription"
            >
              <el-button type="primary" @click="loadPage">重新加载</el-button>
              <el-button @click="goAdminPath('/admin/dashboard')">运营首页</el-button>
            </AppState>
          </div>
        </article>

        <article class="ops-panel">
          <div class="ops-panel__head">
            <div>
              <h2>最近聚合任务</h2>
              <p>聚合任务最近执行情况</p>
            </div>
          </div>
          <div class="ops-job-list">
            <div v-for="job in jobs" :key="job.id" class="ops-job-row">
              <div>
                <strong>{{ translateJobName(job.jobName || job.jobCode || `任务编号 ${job.id}`) }}</strong>
                <small>{{ job.statDate || job.createdAt || '--' }}</small>
              </div>
              <el-tag :type="job.status === 'SUCCESS' ? 'success' : job.status === 'FAILED' ? 'danger' : 'warning'" effect="plain">
                {{ jobStatusLabel(job.status) }}
              </el-tag>
            </div>
            <AppState
              v-if="!jobs.length && !loading"
              class="ops-empty-state"
              :type="jobEmptyType"
              :title="jobEmptyTitle"
              :description="jobEmptyDescription"
            >
              <el-button type="primary" @click="goAdminPath('/admin/analytics/jobs')">查看聚合任务</el-button>
              <el-button @click="loadPage">刷新</el-button>
            </AppState>
          </div>
        </article>
      </section>


      <section class="ops-main-grid vector-admin-grid">
        <article class="ops-panel ops-panel--wide vector-admin-panel">
          <div class="ops-panel__head">
            <div>
              <h2>语义索引控制台</h2>
              <p>展示语义检索集合、业务索引状态计数，以及题目去重和个人知识库的索引运行情况。</p>
            </div>
            <el-button :icon="RefreshCw" :loading="loading" @click="loadPage">刷新</el-button>
          </div>
          <div class="vector-index-grid">
            <div v-for="item in mysqlIndexCards" :key="item.key" class="vector-index-card">
              <div class="vector-index-card__head">
                <span>{{ item.title }}</span>
                <strong>{{ item.total }}</strong>
              </div>
              <small>{{ item.subtitle }}</small>
              <div class="vector-status-list">
                <span v-for="status in item.statusCounts" :key="`${item.key}-${status.status}`">
                  {{ vectorStatusLabel(status.status) }} {{ status.count || 0 }}
                </span>
              </div>
              <em v-if="item.errorMessage">{{ item.errorMessage }}</em>
            </div>
          </div>
          <div class="vector-runtime-grid">
            <div class="vector-index-card">
              <div class="vector-index-card__head">
                <span>运行配置</span>
                <strong>{{ vectorRuntimeLabel }}</strong>
              </div>
              <small>{{ vectorRuntimeHint }}</small>
              <div class="vector-status-list">
                <span>默认上限 {{ vectorHealth?.config?.defaultLimit || '--' }}</span>
                <span>问答阈值 {{ formatThreshold(vectorHealth?.config?.knowledgeAskMinScore) }}</span>
                <span>近重阈值 {{ formatThreshold(vectorHealth?.config?.knowledgeNearDuplicateThreshold) }}</span>
              </div>
            </div>
            <div class="vector-index-card">
              <div class="vector-index-card__head">
                <span>索引生成指标</span>
                <strong>{{ compact(vectorHealth?.embeddingMetrics?.callCount) }}</strong>
              </div>
              <small>{{ embeddingMetricHint }}</small>
              <div class="vector-status-list">
                <span>失败 {{ vectorHealth?.embeddingMetrics?.failedCount || 0 }}</span>
                <span>平均 {{ formatMs(vectorHealth?.embeddingMetrics?.averageElapsedMs) }}</span>
                <span>消耗 {{ compact(vectorHealth?.embeddingMetrics?.totalTokens) }}</span>
              </div>
              <em v-if="vectorHealth?.embeddingMetrics?.errorMessage">{{ vectorHealth.embeddingMetrics.errorMessage }}</em>
            </div>
          </div>
          <el-alert
            class="vector-state-alert"
            :type="vectorStateBanner.type"
            :closable="false"
            show-icon
          >
            <template #title>{{ vectorStateBanner.title }}</template>
            <template #default>
              <div>{{ vectorStateBanner.description }}</div>
            </template>
          </el-alert>
        </article>

        <article class="ops-panel vector-admin-panel">
          <div class="ops-panel__head">
            <div>
              <h2>索引高风险操作</h2>
              <p>重建、重试和删除补偿不会随普通刷新自动执行，提交前必须确认影响范围。</p>
            </div>
          </div>
          <div class="vector-action-list">
            <div class="vector-action-group">
              <span class="vector-action-group__label">题目语义索引</span>
              <el-button
                v-permission="'admin:question:embedding:rebuild'"
                type="warning"
                plain
                :icon="RefreshCw"
                :loading="rebuildingQuestionVectors"
                :disabled="isAdminMobileReadonly"
                :title="mobileReadonlyTitle()"
                @click="handleRebuildQuestionVectors"
              >
                重建题目索引
              </el-button>
              <el-button
                v-permission="'admin:question:embedding:rebuild'"
                type="warning"
                plain
                :icon="RefreshCw"
                :loading="retryingQuestionVectors"
                :disabled="isAdminMobileReadonly"
                :title="mobileReadonlyTitle()"
                @click="handleRetryQuestionVectors"
              >
                重试题目失败
              </el-button>
            </div>
            <div class="vector-action-group vector-action-group--risk">
              <span class="vector-action-group__label">知识库与删除补偿</span>
              <el-button
                v-permission="'admin:analytics:ai'"
                type="warning"
                plain
                :icon="RefreshCw"
                :loading="rebuildingKnowledgeVectors"
                :disabled="isAdminMobileReadonly"
                :title="mobileReadonlyTitle()"
                @click="handleRebuildKnowledgeVectors"
              >
                重建知识库索引
              </el-button>
              <el-button
                v-permission="'admin:analytics:ai'"
                type="warning"
                plain
                :icon="RefreshCw"
                :loading="retryingKnowledgeVectors"
                :disabled="isAdminMobileReadonly"
                :title="mobileReadonlyTitle()"
                @click="handleRetryKnowledgeVectors"
              >
                重试知识库失败
              </el-button>
              <el-button
                v-permission="'admin:analytics:ai'"
                type="danger"
                plain
                :icon="RefreshCw"
                :loading="retryingVectorDeletes"
                :disabled="isAdminMobileReadonly"
                :title="mobileReadonlyTitle()"
                @click="handleRetryVectorDeletes"
              >
                重试索引删除补偿
              </el-button>
            </div>
          </div>
          <div v-if="lastVectorAction" class="vector-action-result">
            <strong>{{ lastVectorAction.title }}</strong>
            <span>{{ lastVectorAction.summary }}</span>
            <small v-if="lastVectorAction.detail">{{ lastVectorAction.detail }}</small>
            <el-button
              v-if="lastVectorAction.vectorJobId"
              link
              type="primary"
              :icon="ExternalLink"
              @click="openLastVectorJob"
            >
              查看索引任务编号 {{ lastVectorAction.vectorJobId }}
            </el-button>
          </div>
        </article>
      </section>

      <section class="ops-main-grid vector-failure-grid">
        <article class="ops-panel ops-panel--wide vector-failure-panel">
          <div class="ops-panel__head vector-failure-head">
            <div>
              <h2>索引失败明细</h2>
              <p>展示题目去重、个人知识库索引和删除补偿最近的失败记录。</p>
            </div>
            <div class="vector-failure-tools">
              <el-segmented v-model="vectorFailureStatus" :options="vectorFailureStatusOptions" @change="loadVectorFailures" />
              <el-select v-model="vectorFailureLimit" style="width: 108px" @change="loadVectorFailures">
                <el-option :value="25" label="25 条" />
                <el-option :value="50" label="50 条" />
                <el-option :value="100" label="100 条" />
              </el-select>
              <el-segmented v-model="vectorFailureTableSize" :options="vectorFailureTableSizeOptions" />
              <el-dropdown trigger="click" :hide-on-click="false">
                <el-button plain>题目列配置</el-button>
                <template #dropdown>
                  <el-dropdown-menu class="column-config-menu">
                    <el-dropdown-item v-for="item in questionFailureColumnOptions" :key="item.key">
                      <el-checkbox v-model="questionFailureVisibleColumns[item.key]" :disabled="item.required">
                        {{ item.label }}
                      </el-checkbox>
                    </el-dropdown-item>
                    <el-dropdown-item divided>
                      <el-button link type="primary" @click.stop="resetQuestionFailureTableView">恢复默认视图</el-button>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-dropdown trigger="click" :hide-on-click="false">
                <el-button plain>知识列配置</el-button>
                <template #dropdown>
                  <el-dropdown-menu class="column-config-menu">
                    <el-dropdown-item v-for="item in knowledgeFailureColumnOptions" :key="item.key">
                      <el-checkbox v-model="knowledgeFailureVisibleColumns[item.key]" :disabled="item.required">
                        {{ item.label }}
                      </el-checkbox>
                    </el-dropdown-item>
                    <el-dropdown-item divided>
                      <el-button link type="primary" @click.stop="resetKnowledgeFailureTableView">恢复默认视图</el-button>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-dropdown trigger="click" :hide-on-click="false">
                <el-button plain>补偿列配置</el-button>
                <template #dropdown>
                  <el-dropdown-menu class="column-config-menu">
                    <el-dropdown-item v-for="item in deleteOutboxFailureColumnOptions" :key="item.key">
                      <el-checkbox v-model="deleteOutboxFailureVisibleColumns[item.key]" :disabled="item.required">
                        {{ item.label }}
                      </el-checkbox>
                    </el-dropdown-item>
                    <el-dropdown-item divided>
                      <el-button link type="primary" @click.stop="resetDeleteOutboxFailureTableView">恢复默认视图</el-button>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-button :icon="RefreshCw" :loading="vectorFailureLoading" @click="loadVectorFailures">刷新明细</el-button>
            </div>
          </div>

          <div class="vector-failure-summary">
            <div class="vector-failure-summary__item">
              <span>题目失败</span>
              <strong>{{ vectorFailureCounts.question }}</strong>
            </div>
            <div class="vector-failure-summary__item">
              <span>知识库失败</span>
              <strong>{{ vectorFailureCounts.knowledge }}</strong>
            </div>
            <div class="vector-failure-summary__item">
              <span>删除补偿</span>
              <strong>{{ vectorFailureCounts.deleteOutbox }}</strong>
            </div>
            <div class="vector-failure-summary__item">
              <span>生成时间</span>
              <strong>{{ vectorFailures?.generatedAt || '--' }}</strong>
            </div>
          </div>

          <el-alert
            v-if="vectorFailures?.errors?.length"
            class="vector-failure-alert"
            type="warning"
            :closable="false"
            show-icon
          >
            <template #title>
              {{ vectorFailures.errors.slice(0, 3).join('；') }}
            </template>
          </el-alert>

          <el-tabs v-model="vectorFailureTab" class="vector-failure-tabs" v-loading="vectorFailureLoading">
            <el-tab-pane :label="`题目语义索引 ${vectorFailureCounts.question}`" name="question">
              <el-table :data="vectorFailures?.questionFailures || []" class="ops-table" :size="vectorFailureTableSize">
                <el-table-column v-if="isQuestionFailureColumnVisible('questionId')" label="题目编号" prop="questionId" min-width="110" />
                <el-table-column v-if="isQuestionFailureColumnVisible('status')" label="状态" min-width="96">
                  <template #default="{ row }">
                    <el-tag :type="vectorFailureStatusType(row.indexStatus)" effect="plain">{{ vectorStatusLabel(row.indexStatus) }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column v-if="isQuestionFailureColumnVisible('model')" label="模型 / 维度" min-width="160">
                  <template #default="{ row }">
                    <span>{{ vectorModelHint(row.embeddingModel, row.embeddingDimension) }}</span>
                  </template>
                </el-table-column>
                <el-table-column v-if="isQuestionFailureColumnVisible('updatedAt')" label="更新时间" prop="updatedAt" min-width="170" />
                <el-table-column v-if="isQuestionFailureColumnVisible('error')" label="错误" min-width="260">
                  <template #default="{ row }">
                    <el-tooltip v-if="row.lastError" :content="row.lastError" placement="top" :show-after="300">
                      <span class="vector-error-text">{{ row.lastError }}</span>
                    </el-tooltip>
                    <span v-else class="vector-empty-text">--</span>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="132" fixed="right">
                  <template #default="{ row }">
                    <div class="vector-row-actions">
                      <el-tooltip content="查看题目" placement="top">
                        <el-button link type="primary" :icon="ExternalLink" @click="openQuestionFailure(row.questionId)" />
                      </el-tooltip>
                      <el-tooltip content="复制错误" placement="top">
                        <el-button link type="info" :icon="Copy" :disabled="!row.lastError" @click="copyVectorText(row.lastError, '错误已复制')" />
                      </el-tooltip>
                    </div>
                  </template>
                </el-table-column>
                <template #empty>
                  <AppState
                    class="ops-empty-state ops-table-empty"
                    :type="vectorFailureEmptyType"
                    :title="vectorFailureEmptyTitle('question')"
                    :description="vectorFailureEmptyDescription('question')"
                  >
                    <el-button type="primary" @click="loadVectorFailures">重新加载明细</el-button>
                    <el-button @click="goAdminPath('/admin/questions')">查看题库治理</el-button>
                  </AppState>
                </template>
              </el-table>
            </el-tab-pane>

            <el-tab-pane :label="`知识库片段 ${vectorFailureCounts.knowledge}`" name="knowledge">
              <el-table :data="vectorFailures?.knowledgeFailures || []" class="ops-table" :size="vectorFailureTableSize">
                <el-table-column v-if="isKnowledgeFailureColumnVisible('chunkId')" label="片段编号" prop="chunkId" min-width="100" />
                <el-table-column v-if="isKnowledgeFailureColumnVisible('owner')" label="用户 / 资料" min-width="150">
                  <template #default="{ row }">
                    <span>用户 {{ row.userId || '--' }} / 资料 {{ row.documentId || '--' }}</span>
                  </template>
                </el-table-column>
                <el-table-column v-if="isKnowledgeFailureColumnVisible('chunkIndex')" label="片段序号" prop="chunkIndex" min-width="90" />
                <el-table-column v-if="isKnowledgeFailureColumnVisible('status')" label="状态" min-width="96">
                  <template #default="{ row }">
                    <el-tag :type="vectorFailureStatusType(row.indexStatus)" effect="plain">{{ vectorStatusLabel(row.indexStatus) }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column v-if="isKnowledgeFailureColumnVisible('model')" label="模型 / 维度" min-width="160">
                  <template #default="{ row }">
                    <span>{{ vectorModelHint(row.embeddingModel, row.embeddingDimension) }}</span>
                  </template>
                </el-table-column>
                <el-table-column v-if="isKnowledgeFailureColumnVisible('updatedAt')" label="更新时间" prop="updatedAt" min-width="170" />
                <el-table-column v-if="isKnowledgeFailureColumnVisible('error')" label="错误" min-width="260">
                  <template #default="{ row }">
                    <el-tooltip v-if="row.lastError" :content="row.lastError" placement="top" :show-after="300">
                      <span class="vector-error-text">{{ row.lastError }}</span>
                    </el-tooltip>
                    <span v-else class="vector-empty-text">--</span>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="132" fixed="right">
                  <template #default="{ row }">
                    <div class="vector-row-actions">
                      <el-tooltip content="查看片段" placement="top">
                        <el-button link type="primary" :icon="ExternalLink" @click="openKnowledgeFailure(row.documentId, row.chunkId)" />
                      </el-tooltip>
                      <el-tooltip content="复制错误" placement="top">
                        <el-button link type="info" :icon="Copy" :disabled="!row.lastError" @click="copyVectorText(row.lastError, '错误已复制')" />
                      </el-tooltip>
                    </div>
                  </template>
                </el-table-column>
                <template #empty>
                  <AppState
                    class="ops-empty-state ops-table-empty"
                    :type="vectorFailureEmptyType"
                    :title="vectorFailureEmptyTitle('knowledge')"
                    :description="vectorFailureEmptyDescription('knowledge')"
                  >
                    <el-button type="primary" @click="loadVectorFailures">重新加载明细</el-button>
                    <el-button @click="goAdminPath('/admin/analytics/ai')">查看 AI 运营看板</el-button>
                  </AppState>
                </template>
              </el-table>
            </el-tab-pane>

            <el-tab-pane :label="`删除补偿 ${vectorFailureCounts.deleteOutbox}`" name="deleteOutbox">
              <el-table :data="vectorFailures?.deleteOutboxFailures || []" class="ops-table" :size="vectorFailureTableSize">
                <el-table-column v-if="isDeleteOutboxFailureColumnVisible('collection')" label="索引集合" min-width="180">
                  <template #default="{ row }">
                    {{ vectorCollectionLabel(row.collectionName) }}
                  </template>
                </el-table-column>
                <el-table-column v-if="isDeleteOutboxFailureColumnVisible('pointId')" label="索引点编号" min-width="220">
                  <template #default="{ row }">
                    <span class="vector-point-text">{{ row.pointId || '--' }}</span>
                  </template>
                </el-table-column>
                <el-table-column v-if="isDeleteOutboxFailureColumnVisible('bizType')" label="业务" prop="bizType" min-width="120" />
                <el-table-column v-if="isDeleteOutboxFailureColumnVisible('status')" label="状态" min-width="96">
                  <template #default="{ row }">
                    <el-tag :type="vectorFailureStatusType(row.status)" effect="plain">{{ vectorStatusLabel(row.status) }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column v-if="isDeleteOutboxFailureColumnVisible('retryCount')" label="重试" prop="retryCount" min-width="80" />
                <el-table-column v-if="isDeleteOutboxFailureColumnVisible('updatedAt')" label="更新时间" prop="updatedAt" min-width="170" />
                <el-table-column v-if="isDeleteOutboxFailureColumnVisible('error')" label="错误" min-width="260">
                  <template #default="{ row }">
                    <el-tooltip v-if="row.lastError" :content="row.lastError" placement="top" :show-after="300">
                      <span class="vector-error-text">{{ row.lastError }}</span>
                    </el-tooltip>
                    <span v-else class="vector-empty-text">--</span>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="96" fixed="right">
                  <template #default="{ row }">
                    <div class="vector-row-actions">
                      <el-tooltip content="复制索引点编号" placement="top">
                        <el-button link type="info" :icon="Copy" :disabled="!row.pointId" @click="copyVectorText(row.pointId, '索引点编号已复制')" />
                      </el-tooltip>
                    </div>
                  </template>
                </el-table-column>
                <template #empty>
                  <AppState
                    class="ops-empty-state ops-table-empty"
                    :type="vectorFailureEmptyType"
                    :title="vectorFailureEmptyTitle('deleteOutbox')"
                    :description="vectorFailureEmptyDescription('deleteOutbox')"
                  >
                    <el-button type="primary" @click="loadVectorFailures">重新加载明细</el-button>
                    <el-button @click="goAdminPath('/admin/analytics/ai')">查看索引任务</el-button>
                  </AppState>
                </template>
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </article>
      </section>

      <section class="ops-main-grid vector-job-grid">
        <article class="ops-panel ops-panel--wide vector-job-panel">
          <div class="ops-panel__head vector-failure-head">
            <div>
              <h2>语义索引任务记录</h2>
              <p>展示最近的重建、失败重试和删除补偿任务，便于确认是否仍有积压。</p>
            </div>
            <div class="vector-failure-tools">
              <el-select v-model="vectorJobStatus" style="width: 128px" @change="loadVectorJobs">
                <el-option label="全部" value="ALL" />
                <el-option label="运行中" value="RUNNING" />
                <el-option label="成功" value="SUCCESS" />
                <el-option label="失败" value="FAILED" />
              </el-select>
              <el-segmented v-model="vectorJobTableSize" :options="vectorJobTableSizeOptions" />
              <el-dropdown trigger="click" :hide-on-click="false">
                <el-button plain>列配置</el-button>
                <template #dropdown>
                  <el-dropdown-menu class="column-config-menu">
                    <el-dropdown-item v-for="item in vectorJobColumnOptions" :key="item.key">
                      <el-checkbox v-model="vectorJobVisibleColumns[item.key]" :disabled="item.required">
                        {{ item.label }}
                      </el-checkbox>
                    </el-dropdown-item>
                    <el-dropdown-item divided>
                      <el-button link type="primary" @click.stop="resetVectorJobTableView">恢复默认视图</el-button>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-button :icon="RefreshCw" :loading="vectorJobLoading" @click="loadVectorJobs">刷新任务</el-button>
            </div>
          </div>
          <el-table :data="vectorJobs" class="ops-table vector-job-table" :size="vectorJobTableSize">
            <el-table-column v-if="isVectorJobColumnVisible('job')" label="任务" min-width="220">
              <template #default="{ row }">
                <div class="vector-job-main">
                  <strong>{{ vectorJobTypeLabel(row.jobType) }}</strong>
                  <small>{{ row.jobNo || `任务编号 ${row.id || '-'}` }}</small>
                </div>
              </template>
            </el-table-column>
            <el-table-column v-if="isVectorJobColumnVisible('scope')" label="范围" min-width="140">
              <template #default="{ row }">{{ row.scopeType || '-' }}{{ row.scopeId ? ` / ${row.scopeId}` : '' }}</template>
            </el-table-column>
            <el-table-column v-if="isVectorJobColumnVisible('status')" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="vectorJobStatusType(row.status)" effect="plain">{{ vectorJobStatusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column v-if="isVectorJobColumnVisible('counts')" label="数量" min-width="170">
              <template #default="{ row }">
                成功 {{ row.successCount || 0 }}/{{ row.totalCount || 0 }} · 失败 {{ row.failedCount || 0 }}
              </template>
            </el-table-column>
            <el-table-column v-if="isVectorJobColumnVisible('vectors')" label="索引变更" min-width="150">
              <template #default="{ row }">写入 {{ row.vectorUpdated || 0 }} / 删除 {{ row.vectorDeleted || 0 }}</template>
            </el-table-column>
            <el-table-column v-if="isVectorJobColumnVisible('duration')" label="耗时" width="110">
              <template #default="{ row }">{{ formatDuration(row.durationMs) }}</template>
            </el-table-column>
            <el-table-column v-if="isVectorJobColumnVisible('finishedAt')" label="完成时间" prop="finishedAt" min-width="170" />
            <el-table-column v-if="isVectorJobColumnVisible('error')" label="错误" min-width="240">
              <template #default="{ row }">
                <el-tooltip v-if="row.lastError || row.errorMessage" :content="row.lastError || row.errorMessage" placement="top" :show-after="300">
                  <span class="vector-error-text">{{ row.lastError || row.errorMessage }}</span>
                </el-tooltip>
                <span v-else class="vector-empty-text">--</span>
              </template>
            </el-table-column>
            <template #empty>
              <AppState
                class="ops-empty-state ops-table-empty"
                :type="vectorJobEmptyType"
                :title="vectorJobEmptyTitle"
                :description="vectorJobEmptyDescription"
              >
                <el-button type="primary" @click="loadVectorJobs">刷新任务</el-button>
                <el-button @click="goAdminPath('/admin/analytics/ai')">AI 运营看板</el-button>
              </AppState>
            </template>
          </el-table>
        </article>
      </section>

      <section class="ops-main-grid">
        <article class="ops-panel ops-panel--wide">
          <div class="ops-panel__head">
            <div>
              <h2>题目去重参数</h2>
              <p>当前生效的规则阈值、语义检索和候选池规模</p>
            </div>
          </div>
          <div class="ops-config-grid">
            <div v-for="item in duplicateConfigItems" :key="item.label" class="ops-config-item">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <small>{{ item.hint }}</small>
            </div>
          </div>
          <AppState
            v-if="!duplicateConfigItems.length && !loading"
            class="ops-empty-state"
            :type="duplicateConfigEmptyType"
            :title="duplicateConfigEmptyTitle"
            :description="duplicateConfigEmptyDescription"
          >
            <el-button type="primary" @click="loadPage">重新加载</el-button>
            <el-button @click="goAdminPath('/admin/questions')">查看题库治理</el-button>
          </AppState>
        </article>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Activity, Copy, ExternalLink, Gauge, Monitor, RefreshCw, Server, ShieldCheck } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  getAdminAgentOverviewApi,
  getAdminAgentTrendApi,
  getAdminAiFailuresApi,
  getAdminAiOverviewApi,
  getAdminAnalyticsJobsApi,
  getAdminVectorIndexJobsApi,
  getAdminVectorStoreFailuresApi,
  getAdminVectorStoreHealthApi,
  rebuildAdminKnowledgeVectorsApi,
  retryAdminKnowledgeVectorsApi,
  getQuestionDuplicateConfigApi,
  retryAdminVectorDeletesApi
} from '@/api/analytics'
import { rebuildQuestionEmbeddingApi, retryFailedQuestionEmbeddingApi, type QuestionEmbeddingRebuildResult } from '@/api/question'
import type { KnowledgeVectorRebuildVO } from '@/api/v4'
import { getAdminDashboardOverviewApi } from '@/api/dashboard'
import AppState from '@/components/common/AppState.vue'
import { useAdminMobileReadonly } from '@/composables/useAdminMobileReadonly'
import { useAdminTableView } from '@/composables/useAdminTableView'
import { appConfig } from '@/config'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { AdminAgentOverviewVO, AdminAiOverviewVO, AdminAnalyticsJobLogVO, MetricPointVO, QuestionDuplicateConfigVO, TrendPointVO, VectorCollectionInfoVO, VectorFailureDetailsVO, VectorIndexJobVO, VectorStoreHealthVO } from '@/types/analytics'
import type { PageResult } from '@/types/api'
import type { AdminDashboardOverviewVO, DashboardStatus } from '@/types/dashboard'
import { translateFailureReason, translateJobName } from '@/utils/adminDisplay'
import { confirmDangerActionPreview, type DangerActionPreviewOptions } from '@/utils/dangerAction'
import type { ECharts } from '@/utils/echarts'
import { toFriendlyMessage } from '@/utils/error'

const loading = ref(false)
const router = useRouter()
const { guardAdminMobileWrite, isAdminMobileReadonly, mobileReadonlyTitle } = useAdminMobileReadonly()
const retryingVectorDeletes = ref(false)
const rebuildingQuestionVectors = ref(false)
const retryingQuestionVectors = ref(false)
const rebuildingKnowledgeVectors = ref(false)
const retryingKnowledgeVectors = ref(false)
const vectorFailureLoading = ref(false)
const vectorJobLoading = ref(false)
const vectorFailureStatus = ref<'ALL' | 'FAILED' | 'PENDING'>('ALL')
const vectorJobStatus = ref<'ALL' | 'RUNNING' | 'SUCCESS' | 'FAILED'>('ALL')
const vectorFailureLimit = ref(50)
const vectorFailureTab = ref<'question' | 'knowledge' | 'deleteOutbox'>('question')
const lastVectorAction = ref<{
  title: string
  summary: string
  detail?: string
  vectorJobId?: number
  vectorJobType?: string
  vectorScopeType?: string
  vectorJobStatus?: string
} | null>(null)
const errorMessage = ref('')
const partialErrors = ref<string[]>([])
const rangeDays = ref(7)
const aiOverview = ref<AdminAiOverviewVO>()
const agentOverview = ref<AdminAgentOverviewVO>()
const dashboard = ref<AdminDashboardOverviewVO>()
const vectorHealth = ref<VectorStoreHealthVO>()
const vectorFailures = ref<VectorFailureDetailsVO>()
const vectorJobs = ref<VectorIndexJobVO[]>([])
const duplicateConfig = ref<QuestionDuplicateConfigVO>()
const trendPoints = ref<TrendPointVO[]>([])
const failurePoints = ref<MetricPointVO[]>([])
const jobs = ref<AdminAnalyticsJobLogVO[]>([])
const trendChartRef = ref<HTMLElement>()
let trendChart: ECharts | null = null
let opsMounted = false
let chartRenderSeq = 0
let echartsModulePromise: Promise<typeof import('@/utils/echarts')> | null = null

const rangeOptions = [
  { label: '7 天', value: 7 },
  { label: '30 天', value: 30 },
  { label: '90 天', value: 90 }
]

const vectorFailureStatusOptions = [
  { label: '全部', value: 'ALL' },
  { label: '失败', value: 'FAILED' },
  { label: '待处理', value: 'PENDING' }
]

const dataSourceLabels = {
  aiOverview: 'AI 运行概览',
  agentOverview: '智能教练概览',
  trend: '趋势数据',
  failures: '失败原因聚合',
  dashboard: '服务健康',
  jobs: '聚合任务',
  vectorHealth: '语义索引健康',
  vectorFailures: '索引失败明细',
  vectorJobs: '语义索引任务',
  duplicateConfig: '题目去重参数'
} as const

const sourceFailed = (label: string) => partialErrors.value.includes(label)
const markSourceFailed = (label: string) => {
  if (!partialErrors.value.includes(label)) {
    partialErrors.value = [...partialErrors.value, label]
  }
}

const clearSourceFailed = (label: string) => {
  partialErrors.value = partialErrors.value.filter((item) => item !== label)
}

type QuestionFailureColumnKey = 'questionId' | 'status' | 'model' | 'updatedAt' | 'error'
type KnowledgeFailureColumnKey = 'chunkId' | 'owner' | 'chunkIndex' | 'status' | 'model' | 'updatedAt' | 'error'
type DeleteOutboxFailureColumnKey = 'collection' | 'pointId' | 'bizType' | 'status' | 'retryCount' | 'updatedAt' | 'error'
type VectorJobColumnKey = 'job' | 'scope' | 'status' | 'counts' | 'vectors' | 'duration' | 'finishedAt' | 'error'

const {
  tableSize: vectorFailureTableSize,
  tableSizeOptions: vectorFailureTableSizeOptions,
  columnOptions: questionFailureColumnOptions,
  visibleColumns: questionFailureVisibleColumns,
  isColumnVisible: isQuestionFailureColumnVisible,
  resetTableView: resetQuestionFailureTableView
} = useAdminTableView<QuestionFailureColumnKey>('admin:ops-vector-question-failures', [
  { key: 'questionId', label: '题目编号', required: true },
  { key: 'status', label: '状态', required: true },
  { key: 'model', label: '模型 / 维度', defaultVisible: false },
  { key: 'updatedAt', label: '更新时间', defaultVisible: false },
  { key: 'error', label: '错误', defaultVisible: true }
])

const {
  columnOptions: knowledgeFailureColumnOptions,
  visibleColumns: knowledgeFailureVisibleColumns,
  isColumnVisible: isKnowledgeFailureColumnVisible,
  resetTableView: resetKnowledgeFailureTableView
} = useAdminTableView<KnowledgeFailureColumnKey>('admin:ops-vector-knowledge-failures', [
  { key: 'chunkId', label: '片段编号', required: true },
  { key: 'owner', label: '用户 / 资料', required: true },
  { key: 'chunkIndex', label: '片段序号', defaultVisible: false },
  { key: 'status', label: '状态', required: true },
  { key: 'model', label: '模型 / 维度', defaultVisible: false },
  { key: 'updatedAt', label: '更新时间', defaultVisible: false },
  { key: 'error', label: '错误', defaultVisible: true }
])

const {
  columnOptions: deleteOutboxFailureColumnOptions,
  visibleColumns: deleteOutboxFailureVisibleColumns,
  isColumnVisible: isDeleteOutboxFailureColumnVisible,
  resetTableView: resetDeleteOutboxFailureTableView
} = useAdminTableView<DeleteOutboxFailureColumnKey>('admin:ops-vector-delete-outbox-failures', [
  { key: 'collection', label: '索引集合', required: true },
  { key: 'pointId', label: '索引点编号', required: true },
  { key: 'bizType', label: '业务', defaultVisible: false },
  { key: 'status', label: '状态', required: true },
  { key: 'retryCount', label: '重试', defaultVisible: true },
  { key: 'updatedAt', label: '更新时间', defaultVisible: false },
  { key: 'error', label: '错误', defaultVisible: true }
])

const {
  tableSize: vectorJobTableSize,
  tableSizeOptions: vectorJobTableSizeOptions,
  columnOptions: vectorJobColumnOptions,
  visibleColumns: vectorJobVisibleColumns,
  isColumnVisible: isVectorJobColumnVisible,
  resetTableView: resetVectorJobTableView
} = useAdminTableView<VectorJobColumnKey>('admin:ops-vector-jobs', [
  { key: 'job', label: '任务', required: true },
  { key: 'scope', label: '范围', defaultVisible: false },
  { key: 'status', label: '状态', required: true },
  { key: 'counts', label: '数量', required: true },
  { key: 'vectors', label: '索引变更', defaultVisible: true },
  { key: 'duration', label: '耗时' },
  { key: 'finishedAt', label: '完成时间', defaultVisible: false },
  { key: 'error', label: '错误', defaultVisible: true }
])

const services = computed(() => dashboard.value?.systemStatus?.services || [])
const vectorCollections = computed(() => vectorHealth.value?.collections || [])
const vectorDeleteOutbox = computed(() => vectorHealth.value?.deleteOutbox)
const hasServiceHealthRows = computed(
  () => Boolean(services.value.length || vectorCollections.value.length || vectorDeleteOutbox.value)
)
const opsMetrics = computed(() => dashboard.value?.systemStatus?.opsMetrics)
const totalFailures = computed(() => Math.max(...failurePoints.value.map((item) => item.value || 0), 1))
const vectorFailureCounts = computed(() => ({
  question: vectorFailures.value?.questionFailures?.length || 0,
  knowledge: vectorFailures.value?.knowledgeFailures?.length || 0,
  deleteOutbox: vectorFailures.value?.deleteOutboxFailures?.length || 0
}))
type VectorFailureScope = 'question' | 'knowledge' | 'deleteOutbox'
const vectorFailureEmptyType = computed(() =>
  sourceFailed(dataSourceLabels.vectorFailures) || vectorFailures.value?.errors?.length ? 'error' : 'empty'
)
const vectorFailureScopeLabels: Record<VectorFailureScope, string> = {
  question: '题目语义索引',
  knowledge: '知识库索引',
  deleteOutbox: '索引删除补偿'
}
const vectorFailureEmptyTitle = (scope: VectorFailureScope) => {
  if (sourceFailed(dataSourceLabels.vectorFailures)) return `${vectorFailureScopeLabels[scope]}明细加载失败`
  if (vectorFailures.value?.errors?.length) return `${vectorFailureScopeLabels[scope]}明细加载不完整`
  if (vectorFailureStatus.value !== 'ALL') return `当前筛选下没有${vectorFailureScopeLabels[scope]}失败记录`
  return `暂无${vectorFailureScopeLabels[scope]}失败记录`
}
const vectorFailureEmptyDescription = (scope: VectorFailureScope) => {
  const label = vectorFailureScopeLabels[scope]
  if (sourceFailed(dataSourceLabels.vectorFailures)) {
    return `${label}失败明细数据暂未返回，本次不能判断是否真的没有失败记录。请重新加载，或进入 AI 运营看板核对索引任务。`
  }
  if (vectorFailures.value?.errors?.length) {
    return `本次明细数据返回了异常提示：${vectorFailures.value.errors.slice(0, 2).join('；')}。请先重新加载，确认不是数据加载失败或权限状态变化后再判断是否真的没有${label}记录。`
  }
  if (!vectorFailures.value) {
    return `尚未拿到${label}失败明细，请重新加载后再判断索引链路是否正常。`
  }
  if (vectorFailureStatus.value !== 'ALL') {
    return `当前只查看“${vectorFailureStatus.value === 'FAILED' ? '失败' : '待处理'}”状态，未命中记录不代表索引链路没有数据。可切换到“全部”或提高条数上限继续核对。`
  }
  return `最近 ${vectorFailureLimit.value} 条范围内没有${label}失败或待处理记录。若仍怀疑索引异常，请结合上方健康检查、语义索引任务和 AI 运营看板一起排查。`
}
const vectorStateBanner = computed(() => {
  if (sourceFailed(dataSourceLabels.vectorHealth)) {
    return {
      type: 'error' as const,
      title: '语义索引健康检查加载失败',
      description: '语义索引健康检查暂未返回，本页不会把当前集合、运行配置或删除补偿状态判断为正常。请重新加载后再执行重建或重试。'
    }
  }
  const health = vectorHealth.value
  if (!health) {
    return {
      type: 'warning' as const,
      title: '语义索引健康状态待确认',
      description: '语义索引健康检查尚未返回，本页不会自动执行集合重建或删除补偿。请先刷新确认状态。'
    }
  }
  if (!health.enabled) {
    return {
      type: 'warning' as const,
      title: '语义索引未启用',
      description: '当前运行配置未启用语义索引能力，本页只展示配置状态，不会自动执行修复。'
    }
  }
  const collections = health.collections || []
  if (!collections.length) {
    return {
      type: 'warning' as const,
      title: '索引集合状态待确认',
      description: '健康检查暂未返回集合记录。请在手动刷新成功前把当前状态视为不确定，不要直接执行重建或重试。'
    }
  }
  const errored = collections.filter((item) => item.errorMessage || String(item.status || '').toUpperCase() === 'ERROR')
  if (errored.length) {
    return {
      type: 'error' as const,
      title: '语义索引异常',
      description: `${errored.map((item) => vectorCollectionLabel(item.collectionName)).join('、')} 返回异常。请先查看下方明细，再决定是否执行重试。`
    }
  }
  const missing = collections.filter((item) => !item.exists)
  if (missing.length) {
    return {
      type: 'warning' as const,
      title: '语义索引缺失',
      description: `${missing.map((item) => vectorCollectionLabel(item.collectionName)).join('、')} 暂未找到。本页不会静默修复，重建操作需要人工确认。`
    }
  }
  return {
    type: 'success' as const,
    title: '索引集合可用',
    description: '已配置的索引集合存在。重建和重试仍需要人工确认影响范围后再执行。'
  }
})

const partialErrorDescription = computed(() =>
  `以下数据源暂未返回：${partialErrors.value.join('、')}。页面会继续展示已成功返回的数据，失败模块会以错误空态标记，请重新加载或进入对应明细页排查。`
)

const trendEmptyType = computed(() => sourceFailed(dataSourceLabels.trend) ? 'error' : 'empty')
const trendEmptyTitle = computed(() => sourceFailed(dataSourceLabels.trend) ? '趋势数据加载失败' : '暂无趋势数据')
const trendEmptyDescription = computed(() =>
  sourceFailed(dataSourceLabels.trend)
    ? '趋势数据暂未返回，当前无法判断是近段时间没有运行记录，还是聚合数据加载失败。请重新加载，或分别查看 AI 运行记录和生成运行。'
    : `近 ${rangeDays.value} 天没有可聚合的 AI 运行或智能教练生成趋势。先确认 AI 运行记录、生成运行记录和聚合任务是否正常写入。`
)

const failureEmptyType = computed(() => sourceFailed(dataSourceLabels.failures) ? 'error' : 'empty')
const failureEmptyTitle = computed(() =>
  sourceFailed(dataSourceLabels.failures) ? '失败原因聚合加载失败' : '暂无失败原因聚合'
)
const failureEmptyDescription = computed(() =>
  sourceFailed(dataSourceLabels.failures)
    ? '失败原因聚合暂未返回，本次不能判断是没有失败运行还是数据加载失败。可到 AI 运行记录按失败状态进一步核对。'
    : '当前失败原因聚合为空，可能是近段时间没有失败运行，也可能是 AI 运行记录尚未写入失败原因字段。可到记录页按失败状态进一步核对。'
)

const serviceHealthEmptyType = computed(() =>
  sourceFailed(dataSourceLabels.dashboard) || sourceFailed(dataSourceLabels.vectorHealth) ? 'error' : 'empty'
)
const serviceHealthEmptyTitle = computed(() =>
  serviceHealthEmptyType.value === 'error' ? '服务健康数据加载失败' : '暂无服务健康数据'
)
const serviceHealthEmptyDescription = computed(() =>
  serviceHealthEmptyType.value === 'error'
    ? '管理驾驶舱或语义索引健康检查暂未返回，当前不能把服务状态判断为正常。请重新加载，或回到运营首页确认基础健康检查。'
    : '管理驾驶舱和语义索引健康检查暂未返回可展示的服务状态。请先刷新本页，或回到运营首页确认基础健康检查是否可用。'
)

const jobEmptyType = computed(() => sourceFailed(dataSourceLabels.jobs) ? 'error' : 'empty')
const jobEmptyTitle = computed(() => sourceFailed(dataSourceLabels.jobs) ? '聚合任务加载失败' : '暂无聚合任务')
const jobEmptyDescription = computed(() =>
  sourceFailed(dataSourceLabels.jobs)
    ? '最近聚合任务数据暂未返回，本次不能判断定时任务是否真的没有执行记录。请打开聚合任务页或重新加载。'
    : '最近没有聚合任务日志。可以先查看聚合任务页确认定时任务是否启用，或手动运行一次每日计划后再回到这里观察。'
)

const vectorJobEmptyType = computed(() => sourceFailed(dataSourceLabels.vectorJobs) ? 'error' : 'empty')
const vectorJobEmptyTitle = computed(() =>
  sourceFailed(dataSourceLabels.vectorJobs) ? '语义索引任务加载失败' : '暂无语义索引任务'
)
const vectorJobEmptyDescription = computed(() =>
  sourceFailed(dataSourceLabels.vectorJobs)
    ? '语义索引任务数据暂未返回，本次不能判断是否仍有重建、失败重试或删除补偿任务。请重新加载，或进入 AI 运营看板排查。'
    : '当前筛选条件下没有题目、知识库或删除补偿索引任务。触发重建、失败重试或切换任务状态后，可在这里查看执行记录。'
)

const duplicateConfigEmptyType = computed(() => sourceFailed(dataSourceLabels.duplicateConfig) ? 'error' : 'empty')
const duplicateConfigEmptyTitle = computed(() =>
  sourceFailed(dataSourceLabels.duplicateConfig) ? '题目去重参数加载失败' : '暂无题目去重参数'
)
const duplicateConfigEmptyDescription = computed(() =>
  sourceFailed(dataSourceLabels.duplicateConfig)
    ? '题目去重参数暂未返回，当前不要把阈值视为未配置。请重新加载，或进入题库治理页核对配置。'
    : '当前没有可展示的题目去重阈值和候选池配置。请先进入题库治理页确认配置是否已保存。'
)

const formatPercent = (value?: number) => `${Number(value || 0).toFixed(2)}%`
const formatMs = (value?: number) => `${Math.round(Number(value || 0))}ms`
const formatMetric = (value?: number, digits = 2) => Number(value ?? 0).toFixed(digits)
const formatMb = (value?: number) => `${Math.round(Number(value || 0))} MB`
const compact = (value?: number) => {
  const num = Number(value || 0)
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return String(num)
}

const errorRate = computed(() => {
  const total = aiOverview.value?.totalAiCalls || 0
  if (!total) return 0
  return ((aiOverview.value?.failedAiCalls || 0) / total) * 100
})

const metricGroups = computed(() => [
  {
    key: 'usage',
    title: '使用统计',
    subtitle: '请求、消耗与调用',
    icon: Activity,
    tone: 'tone-blue',
    metrics: [
      { label: 'AI 运行', value: compact(aiOverview.value?.totalAiCalls), hint: `失败 ${aiOverview.value?.failedAiCalls || 0}` },
      { label: '总消耗', value: compact(aiOverview.value?.totalTokens), hint: `输入 ${compact(aiOverview.value?.totalInputTokens)}` },
      { label: '生成运行', value: compact(agentOverview.value?.totalAgentRuns), hint: `成功 ${agentOverview.value?.successAgentRuns || 0}` },
      { label: '生成任务', value: compact(agentOverview.value?.totalAgentTasks), hint: `完成 ${agentOverview.value?.doneTaskCount || 0}` }
    ]
  },
  {
    key: 'ops',
    title: '系统运维',
    subtitle: '实时吞吐和限流',
    icon: Gauge,
    tone: 'tone-cyan',
    metrics: [
      { label: 'QPS', value: formatMetric(opsMetrics.value?.qps), hint: '最近 1 分钟请求均值' },
      { label: 'TPS', value: formatMetric(opsMetrics.value?.tps), hint: '最近 1 分钟业务写入均值' },
      { label: 'RPM', value: compact(opsMetrics.value?.rpm || aiOverview.value?.totalAiCalls), hint: '最近 1 分钟请求数' },
      { label: '每分钟消耗', value: compact(opsMetrics.value?.tpm || aiOverview.value?.totalTokens), hint: '最近 1 分钟调用消耗' }
    ]
  },
  {
    key: 'load',
    title: '系统负载',
    subtitle: '进程与主机资源',
    icon: Server,
    tone: 'tone-violet',
    metrics: [
      { label: 'CPU', value: formatPercent(opsMetrics.value?.processCpuUsage), hint: `系统 ${formatPercent(opsMetrics.value?.systemCpuUsage)}` },
      { label: '内存', value: formatMb(opsMetrics.value?.heapUsedMb), hint: `JVM ${formatPercent(opsMetrics.value?.heapUsage)} / ${formatMb(opsMetrics.value?.heapMaxMb)}` },
      { label: '服务数', value: services.value.length, hint: '来自管理驾驶舱' },
      { label: '数据库', value: statusText(services.value.find((item) => item.serviceName === 'database')?.status), hint: 'SELECT 1' }
    ]
  },
  {
    key: 'health',
    title: '缓存 + 健康',
    subtitle: '命中率、延迟和错误率',
    icon: ShieldCheck,
    tone: 'tone-green',
    metrics: [
      { label: 'AI 成功率', value: formatPercent(aiOverview.value?.aiSuccessRate), hint: `平均 ${formatMs(aiOverview.value?.avgElapsedMs)}` },
      { label: '生成成功率', value: formatPercent(agentOverview.value?.agentSuccessRate), hint: `平均 ${formatMs(agentOverview.value?.avgDurationMs)}` },
      { label: '缓存命中', value: formatPercent(opsMetrics.value?.redisHitRate), hint: `hits ${compact(opsMetrics.value?.redisKeyspaceHits)} / misses ${compact(opsMetrics.value?.redisKeyspaceMisses)}` },
      { label: '错误率', value: formatPercent(errorRate.value), hint: `失败 ${aiOverview.value?.failedAiCalls || 0}` }
    ]
  }
])

const failurePercent = (value?: number) => Math.min(100, Math.max(4, ((value || 0) / totalFailures.value) * 100))

const formatThreshold = (value?: number) => Number(value ?? 0).toFixed(2)

const formatDuration = (value?: number) => {
  const ms = Number(value || 0)
  if (!ms) return '--'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(ms >= 10000 ? 0 : 1)}s`
}

const mysqlIndexCards = computed(() => {
  const indexes = vectorHealth.value?.mysqlIndexes || {}
  const cards = [
    {
      key: 'questionEmbedding',
      title: '题目语义索引',
      subtitle: '题目索引状态表',
      data: indexes.questionEmbedding
    },
    {
      key: 'personalKnowledgeChunk',
      title: '个人知识库片段',
      subtitle: '知识库片段索引状态表',
      data: indexes.personalKnowledgeChunk
    }
  ]
  return cards.map((item) => ({
    key: item.key,
    title: item.title,
    subtitle: item.data?.lastIndexedAt ? `${item.subtitle} · 最近 ${item.data.lastIndexedAt}` : item.subtitle,
    total: compact(item.data?.total),
    statusCounts: item.data?.statusCounts || [],
    errorMessage: item.data?.errorMessage
  }))
})
const duplicateConfigItems = computed(() => {
  const config = duplicateConfig.value
  if (!config) return []
  return [
    { label: '语义兼容阈值', value: formatThreshold(config.semanticSimilarityThreshold), hint: '旧版语义阈值配置，未配置分层阈值时作为回退' },
    { label: '语义审核阈值', value: formatThreshold(config.semanticReviewThreshold), hint: '语义召回和最终分进入人工审核的最低分' },
    { label: '强命中阈值', value: formatThreshold(config.semanticStrongThreshold), hint: '最终分达到后标记为高置信语义重复' },
    { label: '标题 Jaccard', value: formatThreshold(config.titleJaccardThreshold), hint: '标题词集合相似度门槛' },
    { label: '标题编辑距离', value: formatThreshold(config.titleLevenshteinThreshold), hint: '标题 Levenshtein 相似度门槛' },
    { label: '正文相似度', value: formatThreshold(config.contentSimilarityThreshold), hint: '正文文本规则命中门槛' },
    { label: '语义 / 文本权重', value: `${formatThreshold(config.semanticVectorWeight)} / ${formatThreshold(config.semanticTextWeight)}`, hint: '语义综合分权重' },
    { label: '元数据 / 标签权重', value: `${formatThreshold(config.semanticMetadataWeight)} / ${formatThreshold(config.semanticTagWeight)}`, hint: '分类、题型、难度和标签修正权重' },
    { label: '语义召回数', value: config.vectorSearchLimit, hint: '每题从语义索引库召回的候选数' },
    { label: '候选池规模', value: config.maxRuleCandidateCount, hint: '规则侧最多比较候选数' },
    { label: '批量检测上限', value: config.maxBatchCheckCount, hint: '单次管理端检测题目数' },
    { label: '索引生成批量', value: config.embeddingBatchSize, hint: '批量生成语义索引的请求大小' }
  ]
})

const vectorRuntimeLabel = computed(() => {
  const config = vectorHealth.value?.config
  if (!config) return '--'
  return `${config.provider || 'qdrant'} ${config.enabled ? '已启用' : '未启用'}`
})

const vectorRuntimeHint = computed(() => {
  const config = vectorHealth.value?.config
  if (!config) return '运行中的语义索引配置未返回'
  const collectionState = config.knowledgeCollection ? '个人知识库索引已配置' : '个人知识库索引待配置'
  return `${collectionState} / 片段 ${config.knowledgeChunkSize || '--'}/${config.knowledgeChunkOverlap || 0}`
})

const embeddingMetricHint = computed(() => {
  const metrics = vectorHealth.value?.embeddingMetrics
  if (!metrics) return '最近的索引生成调用尚未返回'
  const model = metrics.modelCounts?.[0]?.model || '模型待确认'
  return `最近 ${metrics.windowDays || 7} 天 / ${model} / 失败率 ${formatPercent(metrics.failureRate)}`
})

const statusText = (status?: DashboardStatus) => {
  const value = String(status || 'UNKNOWN').toUpperCase()
  const map: Record<string, string> = {
    HEALTHY: '正常',
    SUPPORTED: '正常',
    DEGRADED: '能力受限',
    DOWN: '不可用',
    UNKNOWN: '未探测到',
    UNSUPPORTED: '未纳入探测'
  }
  return map[value] || '状态待确认'
}

const statusTone = (status?: DashboardStatus) => {
  const value = String(status || '').toUpperCase()
  if (value === 'HEALTHY' || value === 'SUPPORTED') return 'healthy'
  if (value === 'DEGRADED') return 'degraded'
  if (value === 'DOWN' || value === 'ERROR') return 'down'
  return 'unknown'
}

const serviceLabel = (value: string) => {
  const map: Record<string, string> = {
    overview: '概览服务',
    database: '数据库',
    'codecoachai-gateway': '网关服务',
    'codecoachai-auth': '认证服务',
    'codecoachai-user': '用户服务',
    'codecoachai-resume': '简历服务',
    'codecoachai-interview': '面试服务',
    'codecoachai-question': '题库服务',
    'codecoachai-ai': 'AI 服务',
    'codecoachai-task': '任务服务',
    'codecoachai-file': '文件服务'
  }
  return map[value] || '服务待确认'
}

const serviceReasonLabel = (item: { status?: DashboardStatus; reason?: string; source?: string }) => {
  if (item.reason) return item.reason
  if (item.source) return item.source
  const value = String(item.status || '').toUpperCase()
  if (value === 'UNKNOWN') return '本次健康探测未返回可用状态'
  if (value === 'UNSUPPORTED') return '该服务当前未纳入运行态探测'
  return '来自管理驾驶舱'
}

const vectorCollectionLabel = (value: string) => {
  const map: Record<string, string> = {
    question_embedding: '题目语义索引',
    personal_knowledge_chunk: '个人知识库索引'
  }
  return map[value] || '语义索引'
}

const vectorTone = (item: VectorCollectionInfoVO) => {
  if (!vectorHealth.value) return 'unknown'
  if (!vectorHealth.value.enabled) return 'unknown'
  if (item.exists && String(item.status || '').toUpperCase() !== 'ERROR') return 'healthy'
  if (String(item.status || '').toUpperCase() === 'ERROR') return 'down'
  if (!item.exists) return 'down'
  return 'unknown'
}

const vectorCollectionStatus = (item: VectorCollectionInfoVO) => {
  if (!vectorHealth.value) return '未确认'
  if (!vectorHealth.value.enabled) return '未启用'
  if (String(item.status || '').toUpperCase() === 'ERROR') return '异常'
  if (!item.exists) return '缺失'
  return '可用'
}

const vectorCollectionHint = (item: VectorCollectionInfoVO) => {
  if (item.errorMessage) return item.errorMessage
  if (!vectorHealth.value) return '语义索引状态待确认，本页不会自动修复'
  if (!vectorHealth.value?.enabled) return '语义索引库配置未启用'
  if (!item.exists) return '索引集合缺失；需人工确认后执行重建，本页不会静默修复'
  return `${item.pointCount || 0} 个索引点 / ${item.vectorSize || '--'} 维 / ${item.distance || '--'}`
}

const vectorDeleteOutboxTone = computed(() => {
  if (!vectorDeleteOutbox.value) return 'unknown'
  if (vectorDeleteOutbox.value?.errorMessage) return 'down'
  if ((vectorDeleteOutbox.value?.failed || 0) > 0) return 'down'
  if ((vectorDeleteOutbox.value?.pending || 0) > 0) return 'degraded'
  return 'healthy'
})

const vectorDeleteOutboxStatus = computed(() => {
  if (!vectorDeleteOutbox.value) return '未确认'
  if (vectorDeleteOutbox.value?.errorMessage) return '异常'
  if ((vectorDeleteOutbox.value?.failed || 0) > 0) return '失败'
  if ((vectorDeleteOutbox.value?.pending || 0) > 0) return '待重试'
  return '清爽'
})

const vectorDeleteOutboxHint = computed(() => {
  const outbox = vectorDeleteOutbox.value
  if (!outbox) return '等待语义索引健康检查返回补偿队列状态，未自动执行补偿'
  if (outbox.errorMessage) return outbox.errorMessage
  return `待处理 ${outbox.pending || 0} / 失败 ${outbox.failed || 0} / 已完成 ${outbox.done || 0}`
})

const vectorFailureStatusType = (status?: string) => {
  const value = String(status || 'PENDING').toUpperCase()
  if (value === 'FAILED') return 'danger'
  if (value === 'PENDING') return 'warning'
  if (value === 'SUCCESS' || value === 'DONE' || value === 'INDEXED') return 'success'
  return 'info'
}

const vectorStatusLabel = (status?: string) => {
  const map: Record<string, string> = {
    PENDING: '待处理',
    FAILED: '失败',
    SUCCESS: '成功',
    DONE: '已完成',
    INDEXED: '已入库',
    RUNNING: '执行中'
  }
  return map[String(status || 'PENDING').toUpperCase()] || '状态待确认'
}

const vectorJobStatusType = (status?: string) => {
  const value = String(status || '').toUpperCase()
  if (value === 'FAILED') return 'danger'
  if (value === 'SUCCESS') return 'success'
  if (value === 'RUNNING') return 'warning'
  return 'info'
}

const vectorJobStatusLabel = (status?: string) => {
  const value = String(status || 'UNKNOWN').toUpperCase()
  const map: Record<string, string> = {
    RUNNING: '运行中',
    SUCCESS: '成功',
    FAILED: '失败',
    UNKNOWN: '状态待确认'
  }
  return map[value] || '状态待确认'
}

const vectorJobTypeLabel = (type?: string) => {
  const value = String(type || 'UNKNOWN').toUpperCase()
  const map: Record<string, string> = {
    QUESTION_REBUILD: '题目语义索引重建',
    QUESTION_RETRY: '题目失败重试',
    KNOWLEDGE_REBUILD: '知识库语义索引重建',
    KNOWLEDGE_RETRY: '知识库失败重试',
    DELETE_OUTBOX_RETRY: '索引删除补偿'
  }
  return map[value] || '索引任务'
}

const vectorModelHint = (model?: string, dimension?: number) => {
  const modelText = model || '模型待确认'
  return `${modelText} / ${dimension || '--'} 维`
}

const copyVectorText = async (value?: string, message = '已复制') => {
  if (!value) return
  await navigator.clipboard.writeText(value)
  ElMessage.success(message)
}

const openQuestionFailure = (questionId?: number) => {
  if (!questionId) return
  router.push({ path: '/admin/questions', query: { questionId: String(questionId) } })
}

const openKnowledgeFailure = (documentId?: number, chunkId?: number) => {
  if (!documentId && !chunkId) return
  if (!appConfig.enableV4Preview) {
    ElMessage.info('个人知识库入口当前未开放，已保留失败线索供后续处理。')
    return
  }
  router.push({
    path: '/knowledge',
    query: {
      ...(documentId ? { documentId: String(documentId) } : {}),
      ...(chunkId ? { chunkId: String(chunkId) } : {})
    }
  })
}

const goAdminPath = (path: string) => {
  router.push(path)
}

const jobStatusLabel = (status?: string) => {
  const map: Record<string, string> = {
    PENDING: '待执行',
    RUNNING: '执行中',
    SUCCESS: '成功',
    FAILED: '失败',
    CANCELED: '已取消'
  }
  return map[String(status || 'UNKNOWN').toUpperCase()] || '状态待确认'
}

const disposeChart = () => {
  trendChart?.dispose()
  trendChart = null
}

const loadEcharts = () => {
  if (!echartsModulePromise) {
    echartsModulePromise = import('@/utils/echarts')
  }
  return echartsModulePromise
}

const renderChart = async () => {
  const renderSeq = ++chartRenderSeq
  await nextTick()
  disposeChart()
  if (!opsMounted) return
  if (!trendChartRef.value || !trendPoints.value.length) return
  const echarts = await loadEcharts()
  if (!opsMounted || renderSeq !== chartRenderSeq || !trendChartRef.value || !trendPoints.value.length) {
    return
  }
  trendChart = echarts.default.init(trendChartRef.value)
  trendChart.setOption({
    backgroundColor: 'transparent',
    color: ['#60a5fa', '#22d3ee', '#a78bfa'],
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.94)',
      borderColor: 'rgba(148, 163, 184, 0.28)',
      textStyle: { color: '#e5edf7' }
    },
    legend: { bottom: 0, textStyle: { color: '#94a3b8' } },
    grid: { left: 42, right: 18, top: 28, bottom: 44 },
    xAxis: {
      type: 'category',
      data: trendPoints.value.map((item) => item.date),
      axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.28)' } },
      axisLabel: { color: '#94a3b8' }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.16)', type: 'dashed' } }
    },
    series: [
      { name: '运行数', type: 'line', smooth: true, data: trendPoints.value.map((item) => item.runCount || 0) },
      { name: '成功数', type: 'line', smooth: true, data: trendPoints.value.map((item) => item.successRunCount || 0) },
      { name: '失败数', type: 'line', smooth: true, data: trendPoints.value.map((item) => item.failedRunCount || 0) }
    ]
  })
}

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return toFriendlyMessage((error as { message?: unknown }).message, '\u63a5\u53e3\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002')
  }
  return '\u63a5\u53e3\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002'
}

const getSettledValue = <T,>(result: PromiseSettledResult<T>, fallback: T): T =>
  result.status === 'fulfilled' ? result.value : fallback

const emptyPage = <T,>(pageNo = 1, pageSize = 6): PageResult<T> => ({
  records: [],
  total: 0,
  pageNo,
  pageSize,
  pages: 0
})

const loadPage = async () => {
  loading.value = true
  errorMessage.value = ''
  partialErrors.value = []
  try {
    const params = { days: rangeDays.value }
    const [aiResult, agentResult, trendResult, failureResult, dashboardResult, jobsResult, vectorHealthResult, vectorFailureResult, vectorJobsResult, duplicateConfigResult] = await Promise.allSettled([
      getAdminAiOverviewApi(params),
      getAdminAgentOverviewApi(params),
      getAdminAgentTrendApi(params),
      getAdminAiFailuresApi(params),
      getAdminDashboardOverviewApi(),
      getAdminAnalyticsJobsApi({ pageNo: 1, pageSize: 6 }),
      getAdminVectorStoreHealthApi(),
      getAdminVectorStoreFailuresApi({
        type: 'all',
        status: vectorFailureStatus.value,
        limit: vectorFailureLimit.value
      }),
      getAdminVectorIndexJobsApi({
        status: vectorJobStatus.value,
        pageNo: 1,
        pageSize: 8
      }),
      getQuestionDuplicateConfigApi()
    ])
    const sourceResults = [
      { label: dataSourceLabels.aiOverview, result: aiResult },
      { label: dataSourceLabels.agentOverview, result: agentResult },
      { label: dataSourceLabels.trend, result: trendResult },
      { label: dataSourceLabels.failures, result: failureResult },
      { label: dataSourceLabels.dashboard, result: dashboardResult },
      { label: dataSourceLabels.jobs, result: jobsResult },
      { label: dataSourceLabels.vectorHealth, result: vectorHealthResult },
      { label: dataSourceLabels.vectorFailures, result: vectorFailureResult },
      { label: dataSourceLabels.vectorJobs, result: vectorJobsResult },
      { label: dataSourceLabels.duplicateConfig, result: duplicateConfigResult }
    ]
    const failed = sourceResults.filter((item) => item.result.status === 'rejected')
    if (failed.length === sourceResults.length) {
      errorMessage.value = getErrorMessage((failed[0].result as PromiseRejectedResult).reason)
      disposeChart()
      return
    }
    partialErrors.value = failed.map((item) => item.label)
    if (aiResult.status === 'fulfilled') aiOverview.value = aiResult.value
    if (agentResult.status === 'fulfilled') agentOverview.value = agentResult.value
    if (trendResult.status === 'fulfilled') trendPoints.value = trendResult.value
    if (failureResult.status === 'fulfilled') failurePoints.value = failureResult.value
    if (dashboardResult.status === 'fulfilled') dashboard.value = dashboardResult.value
    const jobsPage = getSettledValue(jobsResult, emptyPage<AdminAnalyticsJobLogVO>())
    jobs.value = jobsResult.status === 'fulfilled' ? jobsPage.records || [] : jobs.value
    if (vectorHealthResult.status === 'fulfilled') vectorHealth.value = vectorHealthResult.value
    if (vectorFailureResult.status === 'fulfilled') vectorFailures.value = vectorFailureResult.value
    const vectorJobsPage = getSettledValue(vectorJobsResult, emptyPage<VectorIndexJobVO>(1, 8))
    vectorJobs.value = vectorJobsResult.status === 'fulfilled' ? vectorJobsPage.records || [] : vectorJobs.value
    if (duplicateConfigResult.status === 'fulfilled') duplicateConfig.value = duplicateConfigResult.value
    await renderChart()
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

const loadVectorFailures = async () => {
  vectorFailureLoading.value = true
  try {
    vectorFailures.value = await getAdminVectorStoreFailuresApi({
      type: 'all',
      status: vectorFailureStatus.value,
      limit: vectorFailureLimit.value
    })
    clearSourceFailed(dataSourceLabels.vectorFailures)
  } catch (error) {
    markSourceFailed(dataSourceLabels.vectorFailures)
    ElMessage.error(getErrorMessage(error))
  } finally {
    vectorFailureLoading.value = false
  }
}

const loadVectorJobs = async () => {
  vectorJobLoading.value = true
  try {
    const result = await getAdminVectorIndexJobsApi({
      status: vectorJobStatus.value,
      pageNo: 1,
      pageSize: 8
    })
    vectorJobs.value = result.records || []
    clearSourceFailed(dataSourceLabels.vectorJobs)
  } catch (error) {
    markSourceFailed(dataSourceLabels.vectorJobs)
    ElMessage.error(getErrorMessage(error))
  } finally {
    vectorJobLoading.value = false
  }
}

const questionVectorSummary = (result: QuestionEmbeddingRebuildResult) => {
  const errors = result.errors?.length ? `，错误 ${result.errors.length} 条` : ''
  return `更新 ${result.updated || 0} 条，写入索引 ${result.vectorUpdated || 0} 条，删除索引 ${result.vectorDeleted || 0} 条${errors}`
}

const knowledgeVectorSummary = (result: KnowledgeVectorRebuildVO) => {
  const errors = result.errors?.length ? `，错误 ${result.errors.length} 条` : ''
  return `文档 ${result.documentCount || 0} 份，片段 ${result.chunkCount || 0} 条，写入索引 ${result.vectorUpdated || 0} 条，删除索引 ${result.vectorDeleted || 0} 条${errors}`
}

const recordQuestionVectorAction = (title: string, result: QuestionEmbeddingRebuildResult) => {
  lastVectorAction.value = {
    title,
    summary: questionVectorSummary(result),
    detail: result.vectorEnabled === false ? '语义索引库未启用，本次仅更新元数据状态。' : undefined,
    vectorJobId: result.vectorJobId,
    vectorJobType: result.vectorJobType,
    vectorScopeType: result.vectorScopeType,
    vectorJobStatus: result.vectorJobStatus
  }
}

const recordKnowledgeVectorAction = (title: string, result: KnowledgeVectorRebuildVO) => {
  lastVectorAction.value = {
    title,
    summary: knowledgeVectorSummary(result),
    detail: result.vectorEnabled === false ? '语义索引库未启用，本次仅检查知识片段状态。' : undefined,
    vectorJobId: result.vectorJobId,
    vectorJobType: result.vectorJobType,
    vectorScopeType: result.vectorScopeType,
    vectorJobStatus: result.vectorJobStatus
  }
}

const recordVectorDeleteAction = (title: string, summary: string, result: { jobId?: number }) => {
  lastVectorAction.value = {
    title,
    summary,
    vectorJobId: result.jobId,
    vectorJobType: 'DELETE_OUTBOX_RETRY',
    vectorScopeType: 'DELETE_OUTBOX',
    vectorJobStatus: undefined
  }
}

const openLastVectorJob = () => {
  const action = lastVectorAction.value
  if (!action?.vectorJobId) return
  router.push({
    path: '/admin/analytics/ai',
    query: {
      vectorJobId: String(action.vectorJobId),
      vectorJobType: action.vectorJobType || undefined,
      vectorScopeType: action.vectorScopeType || undefined,
      vectorJobStatus: action.vectorJobStatus || undefined
    }
  })
}

const confirmVectorAction = (options: DangerActionPreviewOptions) =>
  confirmDangerActionPreview({
    ...options,
    audit: options.audit || '系统会写入语义索引任务或删除补偿任务记录，可结合操作时间追踪。',
    confirmButtonText: options.confirmButtonText || '确认执行'
  })

const handleRebuildQuestionVectors = async () => {
  if (!guardAdminMobileWrite()) return
  const confirmed = await confirmVectorAction({
    title: '题目语义索引重建高风险确认',
    action: '重建题目语义索引',
    target: '最多扫描 5000 道题目，具体数量由当前索引状态和任务规则决定。',
    impact: '可能调用语义检索模型服务，并创建、覆盖或删除题目索引点，运行成本和耗时都高于普通刷新。',
    rollback: '索引重建不能一键回到执行前；如结果异常，需要依据索引任务日志重新重建或人工修复。',
    tips: ['确认语义索引库集合状态正常。', '确认检索模型和维度配置未发生误配。'],
    confirmButtonText: '确认重建'
  })
  if (!confirmed) return
  rebuildingQuestionVectors.value = true
  try {
    const result = await rebuildQuestionEmbeddingApi(5000)
    const summary = questionVectorSummary(result)
    recordQuestionVectorAction('题目语义索引重建', result)
    ElMessage.success(summary)
    await loadVectorJobs()
    await loadPage()
  } finally {
    rebuildingQuestionVectors.value = false
  }
}

const handleRetryQuestionVectors = async () => {
  if (!guardAdminMobileWrite()) return
  const confirmed = await confirmVectorAction({
    title: '题目失败索引重试确认',
    action: '重试失败或长时间待处理的题目索引',
    target: '最多处理 1000 条失败或待处理题目索引记录。',
    impact: '可能重新调用语义检索模型服务，并创建或替换题目索引点。',
    rollback: '已写入的索引点不能直接撤销；可通过失败明细和索引任务日志二次修复。',
    tips: ['先查看失败明细，确认不是模型维度或集合缺失导致的系统性失败。'],
    confirmButtonText: '确认重试'
  })
  if (!confirmed) return
  retryingQuestionVectors.value = true
  try {
    const result = await retryFailedQuestionEmbeddingApi(1000)
    const summary = questionVectorSummary(result)
    recordQuestionVectorAction('题目失败索引重试', result)
    ElMessage.success(summary)
    await loadVectorJobs()
    await loadPage()
  } finally {
    retryingQuestionVectors.value = false
  }
}

const handleRebuildKnowledgeVectors = async () => {
  if (!guardAdminMobileWrite()) return
  const confirmed = await confirmVectorAction({
    title: '知识库语义索引重建高风险确认',
    action: '重建个人知识库语义索引',
    target: '最多扫描 5000 份个人知识库文档，可能跨用户处理知识片段。',
    impact: '会重新计算知识片段语义索引，可能产生较高模型调用成本，并影响知识库检索结果。',
    rollback: '旧索引不会自动恢复；如结果异常，需要重新执行修复任务或人工处理文档状态。',
    tips: ['确认这是维护窗口内的人工动作。', '确认个人知识库能力当前允许运维处理。'],
    confirmButtonText: '确认重建'
  })
  if (!confirmed) return
  rebuildingKnowledgeVectors.value = true
  try {
    const result = await rebuildAdminKnowledgeVectorsApi(5000)
    const summary = knowledgeVectorSummary(result)
    recordKnowledgeVectorAction('知识库语义索引重建', result)
    ElMessage.success(summary)
    await loadVectorJobs()
    await loadPage()
  } finally {
    rebuildingKnowledgeVectors.value = false
  }
}

const handleRetryKnowledgeVectors = async () => {
  if (!guardAdminMobileWrite()) return
  const confirmed = await confirmVectorAction({
    title: '知识库失败索引重试确认',
    action: '重试失败或长时间待处理的知识库索引',
    target: '最多处理 1000 条失败或待处理知识片段索引记录。',
    impact: '可能重新调用语义检索模型服务，并创建或替换个人知识库索引点。',
    rollback: '已写入的索引点不能直接撤销；可通过失败明细和索引任务日志二次修复。',
    tips: ['若语义索引库状态缺失或不确定，请先查看失败详情。'],
    confirmButtonText: '确认重试'
  })
  if (!confirmed) return
  retryingKnowledgeVectors.value = true
  try {
    const result = await retryAdminKnowledgeVectorsApi(1000)
    const summary = knowledgeVectorSummary(result)
    recordKnowledgeVectorAction('知识库失败索引重试', result)
    ElMessage.success(summary)
    await loadVectorJobs()
    await loadPage()
  } finally {
    retryingKnowledgeVectors.value = false
  }
}
const handleRetryVectorDeletes = async () => {
  if (!guardAdminMobileWrite()) return
  const retryable = vectorDeleteOutbox.value?.retryable || 0
  const confirmed = await confirmVectorAction({
    title: '索引删除补偿重试确认',
    action: '重试索引删除补偿记录',
    target: `最多处理 500 条删除补偿记录；当前可重试待处理/失败记录 ${retryable} 条。`,
    impact: '会尝试删除语义索引库中对应索引点，适合修复业务删除后索引侧未同步的记录。',
    rollback: '删除补偿成功后不能直接恢复被删除的索引；如误删，需要重新执行对应数据的语义索引重建。',
    tips: ['本页面不会静默修复缺失集合。', '确认待删除对象确实已在业务侧删除或失效。'],
    confirmButtonText: '确认补偿'
  })
  if (!confirmed) return
  retryingVectorDeletes.value = true
  try {
    const result = await retryAdminVectorDeletesApi(500)
    const summary = `补偿完成：匹配 ${result.matched || 0} 条，删除 ${result.deleted || 0} 条，失败 ${result.failed || 0} 条`
    recordVectorDeleteAction('索引删除补偿重试', summary, result)
    if ((result.errors || []).length || result.failed) {
      await ElMessageBox.alert(
        [summary, ...(result.errors || []).slice(0, 8).map((item, index) => `${index + 1}. ${item}`)].join('\n'),
        '索引删除补偿结果',
        { type: 'warning' }
      )
    } else {
      ElMessage.success(summary)
    }
    await loadVectorJobs()
    await loadPage()
  } finally {
    retryingVectorDeletes.value = false
  }
}

const resizeChart = () => trendChart?.resize()

onMounted(async () => {
  opsMounted = true
  window.addEventListener('resize', resizeChart)
  await loadPage()
})

onBeforeUnmount(() => {
  opsMounted = false
  chartRenderSeq += 1
  window.removeEventListener('resize', resizeChart)
  disposeChart()
})
</script>

<style scoped lang="scss">
.ops-page {
  .ops-hero {
    background:
      linear-gradient(135deg, rgba(79, 70, 229, 0.24), rgba(14, 165, 233, 0.16)),
      rgba(15, 23, 42, 0.76);
    color: var(--app-text);
  }

  .admin-hero__desc,
  .admin-eyebrow {
    color: var(--app-text-muted);
  }

  :deep(.el-segmented) {
    --el-segmented-bg-color: rgba(15, 23, 42, 0.76);
    --el-segmented-item-selected-bg-color: rgba(99, 102, 241, 0.9);
    --el-segmented-item-selected-color: #ffffff;
    --el-border-radius-base: 8px;
    border: 1px solid rgba(148, 163, 184, 0.18);
  }

  :deep(.el-button) {
    border-color: rgba(148, 163, 184, 0.22);
    background: rgba(15, 23, 42, 0.72);
    color: var(--app-text);
  }
}

.ops-card-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.ops-card,
.ops-panel {
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.74);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.18);
}

.ops-card {
  padding: 22px;
  backdrop-filter: blur(14px);
}

.ops-card__head,
.ops-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.ops-card__head {
  justify-content: flex-start;
  margin-bottom: 18px;
}

.ops-card__icon {
  display: inline-flex;
  flex: 0 0 50px;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border-radius: 8px;
  background: rgba(96, 165, 250, 0.16);
  color: #93c5fd;
}

.tone-cyan {
  background: rgba(34, 211, 238, 0.14);
  color: #67e8f9;
}

.tone-violet {
  background: rgba(167, 139, 250, 0.15);
  color: #c4b5fd;
}

.tone-green {
  background: rgba(16, 185, 129, 0.14);
  color: #6ee7b7;
}

.ops-card h2,
.ops-panel h2 {
  margin: 0;
  color: var(--app-text);
  font-size: 20px;
}

.ops-card p,
.ops-panel p {
  margin: 6px 0 0;
  color: var(--app-text-muted);
}

.ops-mini-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.ops-mini {
  min-height: 82px;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.26);
}

.ops-mini span,
.ops-mini small {
  display: block;
  color: var(--app-text-muted);
}

.ops-mini strong {
  display: block;
  margin: 6px 0;
  color: var(--app-text);
  font-size: 24px;
  line-height: 1.1;
}

.admin-diagnostic-state {
  margin-bottom: 18px;
}

.diagnostic-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.ops-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(360px, 1fr);
  gap: 16px;
}

.ops-panel {
  min-width: 0;
  padding: 22px;
}

.ops-chart {
  width: 100%;
  height: 360px;
  margin-top: 18px;
}

.ops-model-list,
.ops-service-list,
.ops-job-list {
  display: grid;
  gap: 12px;
  max-height: 360px;
  margin-top: 18px;
  overflow: auto;
  padding-right: 4px;
  scrollbar-width: thin;
}

.ops-config-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.ops-config-item {
  min-height: 92px;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.28);
}

.ops-config-item span,
.ops-config-item small {
  display: block;
  color: var(--app-text-muted);
}

.ops-config-item strong {
  display: block;
  margin: 8px 0 6px;
  color: var(--app-text);
  font-size: 22px;
  line-height: 1.1;
}

.ops-model-row,
.ops-service-row,
.ops-job-row {
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.28);
}

.ops-model-row {
  padding: 14px;
}

.ops-model-row > div,
.ops-service-row,
.ops-job-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.ops-model-row strong,
.ops-service-row strong,
.ops-job-row strong {
  color: var(--app-text);
}

.ops-model-row span,
.ops-service-row small,
.ops-job-row small {
  display: block;
  margin-top: 4px;
  color: var(--app-text-muted);
}

.ops-service-row,
.ops-job-row {
  padding: 12px;
}

.ops-service-row em {
  flex: 0 0 auto;
  font-style: normal;
  font-weight: 700;
}

.ops-dot {
  flex: 0 0 auto;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #facc15;
}

.ops-dot--healthy {
  background: #22c55e;
}

.ops-dot--down {
  background: #ef4444;
}

.ops-dot--degraded,
.ops-dot--unknown {
  background: #facc15;
}

.status-healthy {
  color: #4ade80;
}

.status-degraded,
.status-unknown {
  color: #facc15;
}

.status-down {
  color: #f87171;
}

.vector-index-grid,
.vector-runtime-grid,
.vector-action-list {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.vector-index-grid,
.vector-runtime-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.vector-index-card,
.vector-action-result {
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.28);
}

.vector-index-card {
  min-height: 132px;
  padding: 14px;
}

.vector-index-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.vector-index-card__head span,
.vector-index-card small,
.vector-index-card em,
.vector-action-result small {
  color: var(--app-text-muted);
}

.vector-index-card__head strong {
  color: var(--app-text);
  font-size: 24px;
  line-height: 1.1;
}

.vector-status-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.vector-status-list span {
  padding: 4px 8px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 8px;
  color: var(--app-text);
  background: rgba(15, 23, 42, 0.42);
  font-size: 12px;
}

.vector-state-alert {
  margin-top: 14px;
}

.vector-action-group {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.24);
}

.vector-action-group--risk {
  border-color: rgba(245, 158, 11, 0.22);
  background: rgba(120, 53, 15, 0.14);
}

.vector-action-group__label {
  color: var(--app-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.vector-action-list :deep(.el-button) {
  justify-content: flex-start;
  width: 100%;
  margin-left: 0;
}

.vector-action-result {
  display: grid;
  gap: 6px;
  margin-top: 14px;
  padding: 14px;
}

.vector-action-result strong,
.vector-action-result span {
  color: var(--app-text);
}

.vector-failure-grid {
  grid-template-columns: 1fr;
}

.vector-job-grid {
  grid-template-columns: 1fr;
}

.vector-failure-head {
  align-items: center;
}

.vector-failure-tools {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.vector-failure-tools :deep(.el-segmented) {
  max-width: 100%;
}

:global(.column-config-menu) {
  min-width: 168px;
}

:global(.column-config-menu .el-dropdown-menu__item) {
  min-width: 148px;
}

.vector-failure-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.vector-failure-summary__item {
  min-height: 76px;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.28);
}

.vector-failure-summary__item span {
  display: block;
  color: var(--app-text-muted);
}

.vector-failure-summary__item strong {
  display: block;
  margin-top: 8px;
  color: var(--app-text);
  font-size: 20px;
  line-height: 1.2;
  word-break: break-word;
}

.vector-failure-alert,
.vector-failure-tabs {
  margin-top: 16px;
}

.ops-table {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
}

.ops-table :deep(.el-table__inner-wrapper),
.ops-table :deep(.el-table__body-wrapper),
.ops-table :deep(.el-table__header-wrapper) {
  background: rgba(2, 6, 23, 0.3);
}

.ops-table :deep(.el-table__cell) {
  background: rgba(2, 6, 23, 0.22);
  color: var(--app-text);
  border-bottom-color: rgba(148, 163, 184, 0.12);
}

.ops-table :deep(th.el-table__cell) {
  background: rgba(15, 23, 42, 0.82);
  color: var(--app-text-muted);
}

.ops-table :deep(.el-table__empty-text) {
  color: var(--app-text-muted);
}

.ops-empty-state {
  margin-top: 18px;
  border-color: rgba(148, 163, 184, 0.16);
  background: rgba(15, 23, 42, 0.42);
  box-shadow: none;
}

.ops-empty-state :deep(.app-state__content) {
  display: grid;
  gap: 10px;
}

.ops-empty-state :deep(.app-state__content p) {
  max-width: 680px;
}

.ops-empty-state :deep(.el-button + .el-button) {
  margin-left: 8px;
}

.ops-table-empty {
  margin: 18px auto;
  max-width: 760px;
  text-align: left;
}

.vector-error-text,
.vector-point-text {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  color: var(--app-text);
  text-overflow: ellipsis;
  vertical-align: middle;
  white-space: nowrap;
}

.vector-error-text {
  color: #fca5a5;
}

.vector-empty-text {
  color: var(--app-text-muted);
}

.vector-job-table {
  margin-top: 16px;
}

.vector-job-main strong,
.vector-job-main small {
  display: block;
}

.vector-job-main strong {
  color: var(--app-text);
}

.vector-job-main small {
  margin-top: 3px;
  overflow: hidden;
  color: var(--app-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vector-row-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
@media (max-width: 1280px) {
  .ops-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ops-config-grid,
  .vector-failure-summary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .ops-card-grid,
  .ops-main-grid {
    grid-template-columns: 1fr;
  }

  .ops-config-grid,
  .vector-index-grid,
  .vector-runtime-grid,
  .vector-failure-summary {
    grid-template-columns: 1fr;
  }

  .vector-failure-head,
  .vector-failure-tools {
    align-items: stretch;
    flex-direction: column;
  }

  .vector-failure-tools :deep(.el-button),
  .vector-failure-tools :deep(.el-select) {
    width: 100% !important;
  }
}
</style>
