<template>
  <div class="page-shell knowledge-page">
    <section class="knowledge-hero">
      <div>
        <p class="eyebrow">个人知识检索</p>
        <h1>个人知识库</h1>
        <p>维护你的学习资料、项目笔记和面试复盘，并用语义检索快速找到真正相关的片段。</p>
      </div>
      <div class="hero-actions">
        <el-button :icon="Refresh" :loading="loading" @click="refreshKnowledgePage">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">新增资料</el-button>
        <el-upload
          class="knowledge-upload"
          :accept="uploadAccept"
          :show-file-list="false"
          :auto-upload="false"
          :on-change="handleKnowledgeFileChange"
        >
          <el-button :icon="Files" :loading="uploading">上传资料</el-button>
        </el-upload>
        <el-button
          :icon="Refresh"
          :loading="rebuilding"
          :disabled="!semanticEnabled"
          :title="!semanticEnabled ? semanticDisabledReason : undefined"
          @click="handleRebuildVectors"
        >
          重建索引
        </el-button>
        <el-button
          :icon="Refresh"
          :loading="retryingFailedVectors"
          :disabled="!semanticEnabled"
          :title="!semanticEnabled ? semanticDisabledReason : undefined"
          @click="handleRetryFailedVectors"
        >
          重试失败索引
        </el-button>
      </div>
    </section>

    <section class="summary-grid">
      <article class="summary-item">
        <span>文档</span>
        <strong>{{ documentTotal }}</strong>
      </article>
      <article class="summary-item">
        <span>片段</span>
        <strong>{{ chunkTotal }}</strong>
      </article>
      <article class="summary-item">
        <span>重复片段</span>
        <strong>{{ duplicateChunkTotal }}</strong>
      </article>
      <article class="summary-item">
        <span>{{ retrievalModeLabel }}</span>
        <strong>{{ chunkStrategyLabel }}</strong>
      </article>
      <article class="summary-item">
        <span>类型分布</span>
        <strong>{{ documentTypeSummary }}</strong>
      </article>
    </section>

    <section class="config-strip">
      <article>
        <span>语义检索</span>
        <strong>{{ vectorCapabilityLabel }}</strong>
        <small>{{ vectorCapabilityDetail }}</small>
      </article>
      <article>
        <span>切片策略</span>
        <strong>{{ chunkConfigLabel }}</strong>
        <small>{{ chunkStrategyDetail }}</small>
      </article>
      <article>
        <span>近重复阈值</span>
        <strong>{{ nearDuplicateThresholdLabel }}</strong>
        <small>问答阈值 >= {{ askMinScoreLabel }}</small>
      </article>
      <article>
        <span>上传限制</span>
        <strong>{{ uploadLimitLabel }}</strong>
        <small>{{ uploadExtensionsLabel }}</small>
      </article>
    </section>

    <section class="governance-strip">
      <div class="governance-strip__head">
        <div>
          <p class="section-kicker">治理状态</p>
          <strong>{{ knowledgeGovernanceHealthLabel }}</strong>
          <small>{{ knowledgeGovernanceHealthDetail }}</small>
        </div>
        <el-tag :type="knowledgeGovernanceHealthType" effect="light">{{ knowledgeGovernanceHealthBadge }}</el-tag>
      </div>
      <div class="governance-grid">
        <article v-for="item in knowledgeGovernanceItems" :key="item.key">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <small>{{ item.detail }}</small>
        </article>
      </div>
      <div v-if="knowledgeGovernanceWarnings.length" class="governance-alerts">
        <el-alert
          v-for="warning in knowledgeGovernanceWarnings"
          :key="warning"
          type="warning"
          :closable="false"
          :title="warning"
        />
      </div>
    </section>

    <section class="quality-gate-strip">
      <div class="quality-gate-strip__head">
        <div>
          <p class="section-kicker">质量门槛</p>
          <strong>强结论必须有可追溯来源</strong>
          <small>引用不足、评测样本不足、候选记忆或低置信记忆只作为弱观察和治理入口。</small>
        </div>
      </div>
      <div class="quality-gate-grid">
        <article v-for="item in qualityGateItems" :key="item.key">
          <span>{{ item.label }}</span>
          <strong>{{ item.status }}</strong>
          <small>{{ item.detail }}</small>
        </article>
      </div>
    </section>

    <section class="governance-action-strip">
      <div class="governance-action-strip__head">
        <div>
          <p class="section-kicker">治理行动</p>
          <strong>{{ governanceActionSummary }}</strong>
          <small>优先处理会影响检索、问答引用和长期记忆可信度的问题。</small>
        </div>
        <el-button text type="primary" @click="refreshKnowledgePage">刷新治理状态</el-button>
      </div>
      <div class="governance-action-list">
        <article v-for="item in knowledgeGovernanceActions" :key="item.key">
          <div>
            <div class="governance-action-title">
              <strong>{{ item.title }}</strong>
              <el-tag size="small" :type="item.tagType" effect="light">{{ item.priority }}</el-tag>
            </div>
            <p>{{ item.description }}</p>
            <small>{{ item.impact }}</small>
          </div>
          <el-button size="small" :type="item.buttonType" plain @click="runGovernanceAction(item.action)">
            {{ item.cta }}
          </el-button>
        </article>
      </div>
    </section>

    <section class="index-observability-strip">
      <article>
        <span>索引状态</span>
        <div class="index-pill-row">
          <el-tag v-for="item in indexStatusItems" :key="item.status" size="small" :type="statusType(item.status)" effect="light">
            {{ statusLabel(item.status) }} {{ item.count }}
          </el-tag>
        </div>
      </article>
      <article>
        <span>检索索引</span>
        <strong>{{ embeddingModelSummary }}</strong>
        <small>{{ vectorIndexHealthLabel }}</small>
      </article>
      <article>
        <span>失败片段</span>
        <strong>{{ failedChunkCount }}</strong>
        <small>{{ pendingChunkCount }} 待索引 / {{ disabledChunkCount }} 未启用</small>
      </article>
    </section>

    <section class="duplicate-review-strip">
      <div>
        <p class="section-kicker">去重审核</p>
        <strong>{{ duplicateReviewSummary }}</strong>
        <small>阈值 {{ duplicateReviewThresholdLabel }} · 已扫描 {{ duplicateReview?.scannedChunkCount || 0 }}</small>
      </div>
      <div class="dedup-actions">
        <el-input-number v-model="duplicateThresholdPercent" :min="0" :max="100" :step="2" controls-position="right" />
        <el-button :icon="Search" :loading="duplicateReviewLoading" :disabled="duplicateReviewLoading" @click="loadDuplicateReview">扫描近重复</el-button>
        <el-button :icon="Files" :loading="exactDuplicateLoading" @click="loadExactDuplicates()">完全重复</el-button>
      </div>
    </section>

    <el-alert
      v-if="partialLoadWarning && !errorMessage"
      class="knowledge-load-warning"
      type="warning"
      show-icon
      :closable="false"
      title="部分知识库数据暂时不可用"
      :description="partialLoadWarning"
    />

    <AppState v-if="errorMessage" type="error" title="知识资料加载失败" :description="errorMessage">
      <el-button type="primary" @click="refreshKnowledgePage">重试</el-button>
    </AppState>

    <section v-if="hasDuplicateHotspots && !errorMessage" class="duplicate-hotspot-strip">
      <article>
        <span>重复类型</span>
        <strong>{{ duplicateTypeSummary }}</strong>
        <el-button v-if="topDuplicateType" link type="primary" @click="loadExactDuplicates(undefined, topDuplicateType)">查看</el-button>
      </article>
      <article>
        <span>主要重复资料</span>
        <strong>{{ topDuplicateHotspotLabel }}</strong>
        <el-button v-if="topDuplicateHotspotId" link type="primary" @click="loadExactDuplicates(topDuplicateHotspotId)">查看</el-button>
      </article>
      <article>
        <span>清理候选</span>
        <strong>{{ duplicateChunkTotal }}</strong>
      </article>
    </section>

    <section v-if="!errorMessage" class="workspace-grid">
      <main class="main-stack">
        <section class="content-card">
          <div class="content-card__body">
            <div class="section-head">
              <div>
                <p class="section-kicker">知识资料</p>
                <h2>已索引资料</h2>
              </div>
            </div>
            <el-form class="document-filter" inline @submit.prevent>
              <el-form-item label="标题">
                <el-input v-model.trim="query.title" clearable placeholder="搜索资料标题" @keyup.enter="handleDocumentFilter" />
              </el-form-item>
              <el-form-item label="类型">
                <el-select v-model="query.documentType" clearable filterable placeholder="全部类型" style="width: 160px">
                  <el-option v-for="type in documentTypeOptions" :key="type" :label="documentTypeLabel(type)" :value="type" />
                </el-select>
              </el-form-item>
              <el-form-item label="状态">
                <el-select v-model="query.status" clearable placeholder="全部" style="width: 120px">
                  <el-option label="已索引" value="INDEXED" />
                  <el-option label="待索引" value="PENDING" />
                  <el-option label="空内容" value="EMPTY" />
                  <el-option label="失败" value="FAILED" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :icon="Search" :loading="loading" @click="handleDocumentFilter">查询</el-button>
                <el-button :icon="Refresh" @click="resetDocumentFilter">重置</el-button>
              </el-form-item>
            </el-form>
            <el-table v-loading="loading" :data="documents" row-key="id">
              <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
              <el-table-column label="类型" width="130">
                <template #default="{ row }">
                  <el-tag effect="plain">{{ documentTypeLabel(row.documentType) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="chunkCount" label="片段" width="100" />
              <el-table-column label="状态" width="120">
                <template #default="{ row }">
                  <el-tag :type="statusType(row.status)" effect="light">{{ statusLabel(row.status) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="更新时间" width="180">
                <template #default="{ row }">{{ row.updatedAt || '--' }}</template>
              </el-table-column>
              <el-table-column label="操作" width="150" fixed="right">
                <template #default="{ row }">
                  <el-button
                    link
                    type="primary"
                    :icon="Files"
                    :loading="chunksLoading && selectedDocument?.id === row.id"
                    @click="openChunksDrawer(row)"
                  >
                    片段
                  </el-button>
                  <el-button
                    link
                    type="primary"
                    :icon="Search"
                    @click="openDocumentInfluencePreview(row)"
                  >
                    影响
                  </el-button>
                  <el-button
                    link
                    type="primary"
                    :icon="Plus"
                    :loading="editingLoadingId === row.id"
                    @click="openEdit(row)"
                  >
                    编辑
                  </el-button>
                  <el-button
                    link
                    type="primary"
                    :icon="Files"
                    :loading="versionsLoadingId === row.id"
                    @click="openVersionsDrawer(row)"
                  >
                    历史
                  </el-button>
                  <el-button
                    link
                    type="primary"
                    :icon="Refresh"
                    :loading="rebuilding"
                    :disabled="!semanticEnabled"
                    :title="!semanticEnabled ? semanticDisabledReason : undefined"
                    @click="handleRebuildVectors(row.id, row.title)"
                  >
                    重建
                  </el-button>
                  <el-button
                    link
                    type="danger"
                    :icon="Delete"
                    :loading="deletingId === row.id"
                    @click="handleDelete(row)"
                  >
                    删除
                  </el-button>
                </template>
              </el-table-column>
              <template #empty>
                <AppState type="empty" :title="documentEmptyTitle" :description="documentEmptyDescription">
                  <div class="empty-actions">
                    <el-button v-if="hasDocumentFilters" @click="resetDocumentFilter">清空筛选</el-button>
                    <el-button v-else type="primary" @click="openCreate">新增资料</el-button>
                  </div>
                </AppState>
              </template>
            </el-table>
            <div class="pagination-wrap">
              <el-pagination
                v-model:current-page="query.pageNo"
                v-model:page-size="query.pageSize"
                background
                layout="total, sizes, prev, pager, next"
                :total="total"
                :page-sizes="[10, 20, 50]"
                @change="applyDocumentPage"
              />
            </div>
          </div>
        </section>

        <section class="content-card">
          <div class="content-card__body">
            <div class="section-head">
              <div>
                <p class="section-kicker">语义搜索</p>
                <h2>语义搜索</h2>
              </div>
            </div>
            <el-form class="search-toolbar" inline @submit.prevent>
              <el-form-item label="关键词">
                <el-input
                  v-model.trim="keyword"
                  clearable
                  placeholder="例如：JVM 调优、项目亮点、线程池"
                  @keyup.enter="handleSearch"
                />
              </el-form-item>
              <el-form-item label="数量">
                <el-input-number v-model="limit" :min="1" :max="50" controls-position="right" />
              </el-form-item>
              <el-form-item label="最低分">
                <el-input-number v-model="searchMinScorePercent" :min="0" :max="100" :step="5" controls-position="right" />
              </el-form-item>
              <el-form-item label="类型">
                <el-select v-model="knowledgeScopeType" clearable filterable placeholder="全部类型" style="width: 160px">
                  <el-option v-for="type in documentTypeOptions" :key="`search-${type}`" :label="documentTypeLabel(type)" :value="type" />
                </el-select>
              </el-form-item>
              <el-form-item label="资料">
                <el-select v-model="knowledgeScopeDocumentId" clearable filterable placeholder="全部资料" style="width: 220px">
                  <el-option v-for="item in scopedDocumentOptions" :key="`search-doc-${item.id}`" :label="documentOptionLabel(item)" :value="item.id" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :icon="Search" :loading="searching" @click="handleSearch">搜索</el-button>
                <el-button :icon="Search" :loading="tracingSearch" @click="handleSearchTrace">查看匹配说明</el-button>
                <el-button :icon="Search" :loading="knowledgeEvaluating" @click="handleEvaluateKnowledge">评估匹配效果</el-button>
              </el-form-item>
            </el-form>
            <div v-if="searchTrace" class="search-trace-panel">
              <div class="search-trace-panel__head">
                <div>
                  <span>匹配说明</span>
                  <strong>{{ searchTraceRetrievalModeLabel }}</strong>
                </div>
                <el-tag :type="searchTrace.vectorEnabled ? 'success' : 'warning'" effect="light">
                  {{ searchTrace.vectorEnabled ? '智能匹配可用' : '关键词匹配' }}
                </el-tag>
              </div>
              <div class="search-trace-metrics">
                <article>
                  <span>参考资料</span>
                  <strong>{{ searchTrace.finalResults?.length || 0 }}</strong>
                  <small>已按当前问题和资料范围筛选</small>
                </article>
                <article>
                  <span>匹配方式</span>
                  <strong>{{ searchTrace.vectorEnabled ? '智能匹配优先' : '关键词优先' }}</strong>
                  <small>{{ searchTraceRetrievalModeLabel }}</small>
                </article>
                <article>
                  <span>关键词建议</span>
                  <strong>{{ searchTrace.expandedTerms?.length ? '已整理' : '待补充' }}</strong>
                  <small>{{ searchTrace.expandedTerms?.slice(0, 4).join(' / ') || '可换一个更具体的问题' }}</small>
                </article>
                <article>
                  <span>结果状态</span>
                  <strong>{{ searchTrace.finalCandidateCount ? `命中 ${searchTrace.finalCandidateCount} 条` : '暂无命中' }}</strong>
                  <small>可调整资料范围或问题描述</small>
                </article>
              </div>
              <details class="search-trace-technical">
                <summary>匹配过程（按需展开）</summary>
                <div class="search-trace-metrics">
                  <article>
                    <span>扩展词数量</span>
                    <strong>{{ searchTrace.expandedTerms?.length || 0 }}</strong>
                    <small>{{ searchTrace.expandedTerms?.slice(0, 8).join(' / ') || '-' }}</small>
                  </article>
                  <article>
                    <span>智能候选数</span>
                    <strong>{{ searchTrace.vectorCandidateCount || 0 }}</strong>
                    <small>初步找到 {{ searchTrace.recallLimit || 0 }}</small>
                  </article>
                  <article>
                    <span>关键词候选数</span>
                    <strong>{{ searchTrace.keywordCandidateCount || 0 }}</strong>
                    <small>多关键词匹配</small>
                  </article>
                  <article>
                    <span>候选阈值</span>
                    <strong>{{ scoreLabel(searchTrace.minScore) }}</strong>
                    <small>最终保留 {{ searchTrace.finalCandidateCount || 0 }}</small>
                  </article>
                </div>
              </details>
              <el-alert
                v-for="warning in searchTraceWarnings"
                :key="warning"
                class="search-trace-warning"
                type="warning"
                :closable="false"
                :title="warning"
              />
            </div>
            <div v-if="knowledgeEvaluation" class="knowledge-evaluation-panel">
              <div class="knowledge-evaluation-panel__head">
                <div>
                  <span>检索评估</span>
                  <strong>{{ formatRate(knowledgeEvaluation.passRate) }}</strong>
                </div>
                <el-tag :type="knowledgeEvaluation.failedCount ? 'warning' : 'success'" effect="light">
                  通过 {{ knowledgeEvaluation.passedCount || 0 }} / {{ knowledgeEvaluation.evaluatedCount || 0 }}
                </el-tag>
              </div>
              <div class="knowledge-evaluation-grid">
                <article>
                  <span>最高分</span>
                  <strong>{{ scoreLabel(knowledgeEvaluationTop?.topScore) }}</strong>
                </article>
                <article>
                  <span>引用数</span>
                  <strong>{{ knowledgeEvaluationTop?.referenceCount || 0 }}</strong>
                </article>
                <article>
                  <span>引用校验</span>
                  <strong>{{ knowledgeTrustLabel(knowledgeEvaluationTop) }}</strong>
                </article>
                <article>
                  <span>期望结果</span>
                  <strong>{{ knowledgeEvaluationExpectedLabel }}</strong>
                </article>
              </div>
              <div v-if="knowledgeEvaluationTop" class="knowledge-trust-strip">
                <el-tag :type="trustTagType(knowledgeEvaluationTop.citationValid)" effect="plain">
                  引用 {{ trustText(knowledgeEvaluationTop.citationValid) }}
                </el-tag>
                <el-tag :type="trustTagType(knowledgeEvaluationTop.answerGrounded)" effect="plain">
                  有依据 {{ trustText(knowledgeEvaluationTop.answerGrounded) }}
                </el-tag>
                <span v-if="knowledgeEvaluationTop.answerExcerpt">{{ knowledgeEvaluationTop.answerExcerpt }}</span>
              </div>
              <el-alert
                v-if="knowledgeEvaluationTop?.failureReason || knowledgeEvaluationTop?.citationWarning"
                class="knowledge-evaluation-alert"
                type="warning"
                :closable="false"
                :title="knowledgeEvaluationTop.failureReason || knowledgeEvaluationTop.citationWarning"
              />
            </div>
            <div class="knowledge-eval-dataset" v-loading="knowledgeEvalCaseLoading || knowledgeEvalRunLoading">
              <div class="knowledge-eval-dataset__head">
                <div>
                  <span>持续评估</span>
                  <strong>{{ knowledgeEvalCaseTotal || 0 }} 个样本 · {{ knowledgeEvalLatestRunSummary }}</strong>
                </div>
                <div class="knowledge-eval-dataset__actions">
                  <el-button
                    :loading="knowledgeEvalSaving"
                    :disabled="!knowledgeEvalHasCurrentQuery"
                    @click="saveCurrentKnowledgeEvalCase"
                  >
                    保存当前样本
                  </el-button>
                  <el-button
                    type="primary"
                    :loading="knowledgeEvalRunning"
                    :disabled="!knowledgeEvalCaseTotal"
                    @click="runKnowledgeEvalCases"
                  >
                    运行启用样本
                  </el-button>
                  <el-button @click="refreshKnowledgeEvalWorkspace">刷新</el-button>
                </div>
              </div>

              <div class="knowledge-eval-dataset__filters">
                <el-input
                  v-model.trim="knowledgeEvalCaseQuery.keyword"
                  clearable
                  placeholder="样本 / 查询 / 备注"
                  @keyup.enter="fetchKnowledgeEvalCases"
                />
                <el-select v-model="knowledgeEvalCaseQuery.expectedDocumentType" clearable filterable placeholder="资料类型">
                  <el-option v-for="type in documentTypeOptions" :key="`eval-type-${type}`" :label="documentTypeLabel(type)" :value="type" />
                </el-select>
                <el-select v-model="knowledgeEvalCaseQuery.expectNoAnswer" clearable placeholder="期望结果">
                  <el-option label="命中文档" :value="false" />
                  <el-option label="无答案" :value="true" />
                </el-select>
                <el-select v-model="knowledgeEvalCaseQuery.enabled" clearable placeholder="状态">
                  <el-option label="启用" :value="1" />
                  <el-option label="停用" :value="0" />
                </el-select>
                <el-button type="primary" @click="fetchKnowledgeEvalCases">查询</el-button>
              </div>

              <div class="knowledge-eval-dataset__body">
                <div class="knowledge-eval-cases">
                  <el-table :data="knowledgeEvalCases" row-key="id" size="small" max-height="260">
                    <el-table-column prop="caseId" label="样本标识" min-width="150" show-overflow-tooltip />
                    <el-table-column prop="query" label="查询内容" min-width="220" show-overflow-tooltip />
                    <el-table-column label="期望结果" min-width="180" show-overflow-tooltip>
                      <template #default="{ row }">
                        <span>{{ knowledgeEvalExpectedLabel(row) }}</span>
                      </template>
                    </el-table-column>
                    <el-table-column label="状态" width="105">
                      <template #default="{ row }">
                        <el-tag :type="row.enabled === 1 ? 'success' : 'info'" effect="plain">
                          {{ row.enabled === 1 ? '启用' : '停用' }}
                        </el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="96" fixed="right">
                      <template #default="{ row }">
                        <el-button link type="danger" @click="deleteKnowledgeEvalCase(row.id)">删除</el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                  <el-pagination
                    v-model:current-page="knowledgeEvalCaseQuery.pageNo"
                    v-model:page-size="knowledgeEvalCaseQuery.pageSize"
                    small
                    background
                    layout="total, prev, pager, next"
                    :total="knowledgeEvalCaseTotal"
                    @change="fetchKnowledgeEvalCases"
                  />
                </div>

                <div class="knowledge-eval-runs" v-loading="knowledgeEvalRunLoading || knowledgeEvalRunDetailLoading">
                  <div class="knowledge-eval-runs__head">
                    <strong>最近运行</strong>
                    <el-button link type="primary" @click="fetchKnowledgeEvalRuns">刷新</el-button>
                  </div>
                  <button
                    v-for="run in knowledgeEvalRuns"
                    :key="run.id"
                    class="knowledge-eval-run-item"
                    type="button"
                    @click="openKnowledgeEvalRun(run.id)"
                  >
                    <span>{{ run.runNo || '评估运行记录' }}</span>
                    <strong>{{ formatRate(run.passRate) }}</strong>
                    <small>{{ evalRunStatusLabel(run.status) }} · {{ run.evaluatedCount || 0 }}/{{ run.sampleCount || 0 }}</small>
                  </button>
                  <AppState
                    v-if="!knowledgeEvalRuns.length && !knowledgeEvalRunLoading"
                    type="empty"
                    :title="knowledgeEvalRunEmptyTitle"
                    :description="knowledgeEvalRunEmptyDescription"
                  >
                    <div class="empty-actions empty-actions--compact">
                      <el-button v-if="knowledgeEvalCaseTotal" type="primary" :loading="knowledgeEvalRunning" @click="runKnowledgeEvalCases">
                        运行启用样本
                      </el-button>
                      <el-button v-else @click="seedKnowledgeEvalQuestion">填入示例问题</el-button>
                    </div>
                  </AppState>
                </div>
              </div>

              <div v-if="knowledgeEvalLatestRun" class="knowledge-eval-latest">
                <div class="knowledge-eval-latest__head">
                  <div>
                    <strong>{{ knowledgeEvalLatestRun.runNo || '评估运行记录' }}</strong>
                    <span>{{ knowledgeEvalLatestTrustSummary }}</span>
                  </div>
                  <div class="knowledge-eval-latest__tags">
                    <el-tag :type="knowledgeEvalLatestRun.failedCount ? 'warning' : 'success'" effect="light">
                      {{ formatRate(knowledgeEvalLatestRun.passRate) }}
                    </el-tag>
                    <el-tag :type="knowledgeEvalLatestTrustRiskCount ? 'warning' : 'success'" effect="plain">
                      可信 {{ knowledgeEvalLatestTrustedCount }}/{{ knowledgeEvalLatestRun.results?.length || 0 }}
                    </el-tag>
                  </div>
                </div>
                <el-alert
                  v-if="knowledgeEvalLatestRun.errorMessage"
                  class="knowledge-evaluation-alert"
                  type="error"
                  :closable="false"
                  :title="knowledgeEvalLatestRun.errorMessage"
                />
                <div v-if="knowledgeEvalLatestFailures.length" class="knowledge-eval-failures">
                  <article v-for="item in knowledgeEvalLatestFailures" :key="item.id || item.caseId">
                    <strong>{{ item.caseId || `样本-${item.evalCaseId || '-'}` }}</strong>
                    <span>{{ knowledgeEvalExpectedLabel(item) }} / 最佳匹配 {{ item.topTitle || '知识资料' }} / {{ scoreLabel(item.topScore) }}</span>
                    <div class="knowledge-trust-strip knowledge-trust-strip--compact">
                      <el-tag :type="trustTagType(item.citationValid)" effect="plain">
                        引用 {{ trustText(item.citationValid) }}
                      </el-tag>
                      <el-tag :type="trustTagType(item.answerGrounded)" effect="plain">
                        有依据 {{ trustText(item.answerGrounded) }}
                      </el-tag>
                    </div>
                    <small>{{ item.failureReason || item.citationWarning || item.note || '-' }}</small>
                  </article>
                </div>
                <AppState
                  v-else-if="knowledgeEvalLatestRun.results?.length"
                  type="empty"
                  title="最近一次评估全部通过"
                  description="当前样本没有发现引用缺失或答案脱离知识库的问题。可以继续新增评估样本，扩大可信度覆盖面。"
                >
                  <el-button type="primary" plain @click="startNewKnowledgeEvalCase">新增评估样本</el-button>
                </AppState>
              </div>
            </div>
            <div class="result-list" v-loading="searching">
              <article v-for="item in searchResults" :key="resultKey(item)" class="result-row">
                <div>
                  <div class="result-title">
                    <strong>{{ item.title || '知识资料' }}</strong>
                    <el-tag size="small" effect="plain">{{ matchLabel(item.matchType) }}</el-tag>
                  </div>
                  <p v-html="highlightSnippet(item)"></p>
                  <div v-if="item.matchedTerms?.length" class="matched-terms">
                    <el-tag v-for="term in item.matchedTerms" :key="term" size="small" effect="plain">{{ term }}</el-tag>
                  </div>
                </div>
                <div class="result-meta">
                  <span>{{ scoreLabel(item.score) }}</span>
                  <small>{{ documentTypeOrRefLabel(item.sourceRef, item.documentType) }}</small>
                  <el-button
                    v-if="item.chunkId"
                    link
                    size="small"
                    type="primary"
                    :loading="chunkDetailLoadingId === item.chunkId"
                    @click="openChunkDetail(item)"
                  >
                    查看片段
                  </el-button>
                  <el-button link size="small" type="primary" @click="openSearchResultInfluencePreview(item)">
                    影响预览
                  </el-button>
                </div>
              </article>
              <AppState
                v-if="!searchResults.length && !searching"
                type="empty"
                :title="searchEmptyTitle"
                :description="searchEmptyDescription"
              >
                <div class="empty-actions">
                  <el-button v-if="!documentTotal" type="primary" @click="openCreate">新增资料</el-button>
                  <el-button v-else-if="!searchHasQuery" type="primary" @click="fillKnowledgeSearchExample">填入示例关键词</el-button>
                  <el-button v-else @click="handleSearch">重新检索</el-button>
                </div>
              </AppState>
            </div>
          </div>
        </section>
      </main>

      <aside class="side-stack">
        <section class="content-card">
          <div class="content-card__body ask-panel">
            <div class="section-head compact">
              <div>
                <p class="section-kicker">知识问答</p>
                <h2>知识库问答</h2>
              </div>
            </div>
            <el-input
              v-model="question"
              type="textarea"
              :rows="5"
              maxlength="1000"
              show-word-limit
              placeholder="问一个只依赖个人资料回答的问题"
            />
            <el-form label-position="top" class="ask-options">
              <el-form-item :label="`引用最低分（默认 ${askMinScoreLabel}）`">
                <el-input-number v-model="askMinScorePercent" :min="0" :max="100" :step="5" controls-position="right" />
              </el-form-item>
              <el-form-item label="资料类型范围">
                <el-select v-model="knowledgeScopeType" clearable filterable placeholder="全部类型">
                  <el-option v-for="type in documentTypeOptions" :key="`ask-${type}`" :label="documentTypeLabel(type)" :value="type" />
                </el-select>
              </el-form-item>
              <el-form-item label="资料范围">
                <el-select v-model="knowledgeScopeDocumentId" clearable filterable placeholder="全部资料">
                  <el-option v-for="item in scopedDocumentOptions" :key="`ask-doc-${item.id}`" :label="documentOptionLabel(item)" :value="item.id" />
                </el-select>
              </el-form-item>
            </el-form>
            <el-button class="ask-button" type="primary" :icon="ChatDotRound" :loading="asking" @click="handleAsk">
              生成回答
            </el-button>
            <el-button class="ask-button ask-button--secondary" :icon="Search" :loading="knowledgeEvaluating" @click="handleEvaluateKnowledge">
              评估检索质量
            </el-button>

            <div v-if="answer" class="answer-box">
              <span>回答</span>
              <el-alert
                v-if="askInsufficientReferences"
                class="answer-alert"
                type="warning"
                :closable="false"
                title="未找到足够相关的引用来源"
              />
              <el-alert
                v-else-if="askStronglyGrounded"
                class="answer-alert"
                type="success"
                :closable="false"
                title="可信回答：引用来源已通过校验"
              />
              <el-alert
                v-else-if="answerReferenceRisk"
                class="answer-alert"
                type="warning"
                :closable="false"
                :title="askCitationWarning || answerReferenceRiskMessage"
              />
              <div class="answer-quality">
                <span>引用 {{ askReferenceCount }} 条</span>
                <span>最高分 {{ scoreLabel(askTopReferenceScore) }}</span>
                <span>最低分 {{ scoreLabel(askMinReferenceScore) }}</span>
                <span v-if="askCitationValid !== undefined">引用校验 {{ askCitationValid ? '通过' : '需复核' }}</span>
                <span v-if="askAnswerGrounded !== undefined">回答依据 {{ askAnswerGrounded ? '充分' : '需复核' }}</span>
                <span v-if="askCitedReferenceNumbers.length">已引用 {{ askCitedReferenceNumbers.join(', ') }}</span>
                <span v-if="askInvalidReferenceNumbers.length">异常引用 {{ askInvalidReferenceNumbers.join(', ') }}</span>
              </div>
              <p>{{ answer }}</p>
            </div>
          </div>
        </section>

        <section class="content-card">
          <div class="content-card__body">
            <div class="section-head compact">
              <div>
                <p class="section-kicker">引用来源</p>
                <h2>回答引用</h2>
              </div>
            </div>
            <div class="reference-list">
              <article v-for="item in askReferences" :key="`ask-${resultKey(item)}`" class="reference-row">
                <strong>{{ item.title || '知识资料' }}</strong>
                <p>{{ item.snippet || '--' }}</p>
                <small>{{ matchLabel(item.matchType) }} · {{ scoreLabel(item.score) }}</small>
                <el-button
                  v-if="item.chunkId"
                  link
                  size="small"
                  type="primary"
                  :loading="chunkDetailLoadingId === item.chunkId"
                  @click="openChunkDetail(item)"
                >
                  查看片段
                </el-button>
                <el-button link size="small" type="primary" @click="openSearchResultInfluencePreview(item)">
                  影响预览
                </el-button>
              </article>
              <AppState
                v-if="!askReferences.length"
                type="empty"
                :title="askReferenceEmptyTitle"
                :description="askReferenceEmptyDescription"
              >
                <div class="empty-actions empty-actions--compact">
                  <el-button v-if="!documentTotal" type="primary" @click="openCreate">新增资料</el-button>
                  <el-button v-else-if="!question.trim()" @click="seedKnowledgeEvalQuestion">填入示例问题</el-button>
                  <el-button v-else @click="handleAsk">重新生成回答</el-button>
                </div>
              </AppState>
            </div>
          </div>
        </section>
      </aside>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingDocumentId ? '编辑知识资料' : '新增知识资料'" width="640px">
      <el-form label-position="top">
        <el-form-item label="标题" required>
          <el-input v-model.trim="form.title" maxlength="120" show-word-limit />
        </el-form-item>
        <el-form-item label="资料类型">
          <el-select
            v-model="form.documentType"
            filterable
            allow-create
            default-first-option
            placeholder="选择或输入资料类型"
            style="width: 100%"
          >
            <el-option
              v-for="type in formDocumentTypeOptions"
              :key="type"
              :label="documentTypeLabel(type)"
              :value="type"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="内容" required>
          <el-input v-model="form.content" type="textarea" :rows="10" maxlength="10000" show-word-limit />
          <small class="form-help">保存后会优先按标题、段落和代码块切成语义片段，再写入个人检索索引。</small>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveDocument">保存并索引</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="rebuildDialogVisible" title="知识库索引重建结果" width="640px">
      <div v-if="rebuildResult" class="rebuild-result">
        <p class="rebuild-tip">重建范围：{{ rebuildTargetLabel }}</p>
        <div class="rebuild-grid">
          <article class="rebuild-stat">
            <span>语义检索</span>
            <strong>{{ (rebuildResult.semanticEnabled ?? rebuildResult.vectorEnabled) ? '已启用' : '未配置' }}</strong>
          </article>
          <article class="rebuild-stat">
            <span>文档</span>
            <strong>{{ rebuildResult.documentCount || 0 }}</strong>
          </article>
          <article class="rebuild-stat">
            <span>片段</span>
            <strong>{{ rebuildResult.chunkCount || 0 }}</strong>
          </article>
          <article class="rebuild-stat">
            <span>已更新索引</span>
            <strong>{{ rebuildResult.vectorUpdated || 0 }}</strong>
          </article>
          <article class="rebuild-stat">
            <span>已清理索引</span>
            <strong>{{ rebuildResult.vectorDeleted || 0 }}</strong>
          </article>
          <article class="rebuild-stat">
            <span>重复片段</span>
            <strong>{{ rebuildResult.duplicateChunkCount || 0 }}</strong>
          </article>
        </div>
        <p v-if="rebuildResult.embeddingDisabledReason" class="rebuild-tip">{{ knowledgeDisabledReason(rebuildResult.embeddingDisabledReason) }}</p>
        <p v-if="rebuildResult.vectorJobId" class="rebuild-tip">
          检索任务记录 {{ rebuildResult.vectorJobId }} · {{ vectorJobStatusLabel(rebuildResult.vectorJobStatus) }}
        </p>
        <p v-if="rebuildResult.vectorJobId" class="rebuild-tip">
          可稍后按检索任务记录继续查看进度、失败原因和重试结果。
        </p>
        <p class="rebuild-tip">失败文档：{{ rebuildResult.failedDocuments?.length || 0 }}</p>
        <p class="rebuild-tip" v-if="rebuildResult.failedDocuments?.length">
          未处理成功的资料记录：{{ rebuildResult.failedDocuments.join(', ') }}
        </p>
        <div v-if="rebuildResult.errors?.length" class="rebuild-errors">
          <strong>错误详情</strong>
          <ul>
            <li v-for="(item, index) in rebuildResult.errors.slice(0, 8)" :key="index">{{ item }}</li>
          </ul>
        </div>
      </div>
      <template #footer>
        <el-button
          v-if="rebuildResult?.vectorJobId"
          v-permission="'admin:analytics:ai'"
          type="primary"
          @click="openKnowledgeVectorJob(rebuildResult)"
        >
          查看检索任务明细
        </el-button>
        <el-button @click="rebuildDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="duplicateReviewVisible" size="760px" title="近重复片段审查">
      <div class="duplicate-review-drawer" v-loading="duplicateReviewLoading">
        <div class="chunk-summary">
          <article>
            <span>候选</span>
            <strong>{{ duplicateReview?.candidateCount || 0 }}</strong>
          </article>
          <article>
            <span>扫描</span>
            <strong>{{ duplicateReview?.scannedChunkCount || 0 }}</strong>
          </article>
          <article>
            <span>阈值</span>
            <strong>{{ duplicateReviewThresholdLabel }}</strong>
          </article>
        </div>
        <div class="duplicate-review-list">
          <article v-for="item in duplicateReviewItems" :key="`dup-${item.chunkId}`" class="duplicate-review-row">
            <div class="duplicate-review-row__head">
              <strong>{{ item.title || '知识资料' }}</strong>
              <el-tag size="small" type="warning" effect="light">{{ scoreLabel(item.topScore) }}</el-tag>
              <small>第 {{ (item.chunkIndex ?? 0) + 1 }} 段 · {{ documentTypeOrRefLabel(item.sourceRef, item.documentType) }}</small>
              <el-button
                v-if="item.chunkId"
                link
                size="small"
                type="primary"
                :loading="chunkDetailLoadingId === item.chunkId"
                @click="openDuplicateReviewChunk(item)"
              >
                查看片段
              </el-button>
              <el-button
                v-if="item.chunkId"
                link
                size="small"
                type="danger"
                :loading="deletingChunkId === item.chunkId"
                @click="handleDeleteDuplicateReviewChunk(item)"
              >
                删除候选
              </el-button>
            </div>
            <p>{{ item.snippet || '--' }}</p>
            <div class="similar-list">
              <article v-for="match in item.matches || []" :key="`dup-${item.chunkId}-${resultKey(match)}`">
                <strong>{{ match.title || '知识资料' }}</strong>
                <span>{{ scoreLabel(match.score) }} · {{ documentTypeOrRefLabel(match.sourceRef, match.documentType) }}</span>
                <p>{{ match.snippet || '--' }}</p>
                <el-button
                  v-if="match.chunkId"
                  link
                  size="small"
                  type="primary"
                  :loading="chunkDetailLoadingId === match.chunkId"
                  @click="openChunkDetail(match)"
                >
                  查看片段
                </el-button>
              </article>
            </div>
          </article>
          <AppState
            v-if="!duplicateReviewItems.length && !duplicateReviewLoading"
            type="empty"
            title="没有发现近重复候选"
            description="当前阈值下没有语义相近片段；如果仍怀疑重复，可以调低阈值、切换资料范围，或先重建检索索引后再扫描。"
          >
            <el-button type="primary" plain :loading="duplicateReviewLoading" :disabled="duplicateReviewLoading" @click="loadDuplicateReview">重新扫描</el-button>
          </AppState>
        </div>
      </div>
    </el-drawer>

    <el-drawer v-model="exactDuplicateVisible" size="760px" title="完全重复片段">
      <div class="duplicate-review-drawer" v-loading="exactDuplicateLoading">
        <div class="duplicate-cleanup-bar">
          <div>
            <strong>{{ exactDuplicateGroups.length }}</strong>
            <small>组完全重复</small>
            <small>{{ exactDuplicateScopeLabel }}</small>
          </div>
          <div class="exact-scope-actions">
            <el-button v-if="exactDuplicateScopeDocumentId || exactDuplicateScopeType" link @click="loadExactDuplicates()">查看全部范围</el-button>
          </div>
          <el-button type="danger" :loading="exactDuplicateCleanupLoading" @click="handleCleanupExactDuplicates">
            清理完全重复
          </el-button>
        </div>
        <div class="duplicate-review-list">
          <article v-for="(group, groupIndex) in exactDuplicateGroups" :key="group.chunkHash" class="duplicate-review-row">
            <div class="duplicate-review-row__head">
              <strong>重复组 {{ groupIndex + 1 }}</strong>
              <el-tag size="small" type="warning" effect="light">{{ group.duplicateCount || 0 }} 个重复片段</el-tag>
              <small>{{ group.chunks?.length || 0 }} 个片段</small>
            </div>
            <div class="chunk-list exact-duplicate-chunks">
              <article v-for="chunk in group.chunks || []" :key="`exact-${group.chunkHash}-${chunk.id}`" class="chunk-row">
                <div class="chunk-row__head">
                  <strong>第 {{ (chunk.chunkIndex ?? 0) + 1 }} 段</strong>
                  <el-tag size="small" :type="chunk.cleanupCandidate ? 'danger' : 'success'" effect="light">
                    {{ chunk.cleanupCandidate ? '清理候选' : '保留' }}
                  </el-tag>
                  <span>{{ chunk.sourceRef || '知识资料' }}</span>
                  <el-button
                    v-if="chunk.id"
                    link
                    size="small"
                    type="primary"
                    :loading="chunkDetailLoadingId === chunk.id"
                    @click="openExactDuplicateChunk(chunk)"
                  >
                    查看片段
                  </el-button>
                </div>
                <p>{{ chunk.content || '--' }}</p>
              </article>
            </div>
          </article>
          <AppState
            v-if="!exactDuplicateGroups.length && !exactDuplicateLoading"
            type="empty"
            title="没有完全重复片段"
            description="当前范围内没有内容哈希完全相同的片段；如果刚导入资料，可先重建索引后再检查。"
          >
            <el-button type="primary" plain :loading="exactDuplicateLoading" @click="loadExactDuplicates()">重新检查</el-button>
          </AppState>
        </div>
      </div>
    </el-drawer>

    <el-drawer v-model="chunksDrawerVisible" size="720px" :title="selectedDocument?.title || '资料片段'">
      <div class="chunk-drawer" v-loading="chunksLoading">
        <div class="chunk-summary">
          <article>
            <span>片段</span>
            <strong>{{ documentChunks.length }}</strong>
          </article>
          <article>
            <span>重复</span>
            <strong>{{ selectedDuplicateChunkCount }}</strong>
          </article>
          <article>
            <span>类型</span>
            <strong>{{ documentTypeLabel(selectedDocument?.documentType) }}</strong>
          </article>
        </div>
        <div class="chunk-list">
          <article v-for="chunk in documentChunks" :key="chunk.id" class="chunk-row">
            <div class="chunk-row__head">
              <strong>第 {{ (chunk.chunkIndex ?? 0) + 1 }} 段</strong>
              <el-tag v-if="chunk.duplicateInDocument" size="small" type="warning" effect="light">重复</el-tag>
              <el-tag size="small" :type="statusType(chunk.indexStatus)" effect="light">{{ statusLabel(chunk.indexStatus) }}</el-tag>
              <span>{{ chunk.sourceRef || '--' }}</span>
              <el-button
                link
                size="small"
                type="primary"
                :loading="similarLoadingId === chunk.id"
                @click="loadSimilarChunks(chunk)"
              >
                相似
              </el-button>
              <el-button link size="small" type="primary" @click="openChunkInfluencePreview(chunk)">
                影响
              </el-button>
              <el-button
                link
                size="small"
                type="danger"
                :loading="deletingChunkId === chunk.id"
                @click="handleDeleteChunk(chunk)"
              >
                删除
              </el-button>
            </div>
            <p>{{ chunk.content || '--' }}</p>
            <small>{{ indexMetaLabel(chunk) }}</small>
            <el-alert
              v-if="chunk.lastError"
              class="chunk-error"
              type="error"
              :closable="false"
              :title="chunk.lastError"
            />
            <div v-if="similarChunkMap[chunk.id]?.length" class="similar-list">
              <article v-for="item in similarChunkMap[chunk.id]" :key="`${chunk.id}-${resultKey(item)}`">
                <strong>{{ item.title || '知识资料' }}</strong>
                <span>
                  {{ scoreLabel(item.score) }} · {{ documentTypeOrRefLabel(item.sourceRef, item.documentType) }}
                  <template v-if="item.matchType"> · {{ matchLabel(item.matchType) }}</template>
                </span>
                <p>{{ item.snippet || '--' }}</p>
              </article>
            </div>
          </article>
          <AppState
            v-if="!documentChunks.length && !chunksLoading"
            type="empty"
            :title="chunkEmptyTitle"
            :description="chunkEmptyDescription"
          >
            <div class="empty-actions empty-actions--compact">
              <el-button v-if="selectedDocument" @click="openChunksDrawer(selectedDocument)">刷新片段</el-button>
              <el-button v-if="selectedDocument" type="primary" @click="openEdit(selectedDocument)">编辑资料</el-button>
              <el-button
                v-if="selectedDocument && semanticEnabled"
                :loading="rebuilding"
                @click="handleRebuildVectors(selectedDocument.id, selectedDocument.title)"
              >
                重建索引
              </el-button>
              <el-button v-if="!selectedDocument" type="primary" @click="openCreate">新增资料</el-button>
            </div>
          </AppState>
        </div>
      </div>
    </el-drawer>

    <el-drawer v-model="versionsDrawerVisible" size="760px" :title="versionDocument?.title || '版本历史'">
      <div class="version-drawer" v-loading="versionsLoadingId === versionDocument?.id">
        <div class="version-list">
          <article v-for="item in documentVersions" :key="item.id" class="version-row">
            <div class="version-row__head">
              <strong>v{{ item.versionNo || 0 }}</strong>
              <el-tag size="small" effect="plain">{{ documentTypeLabel(item.documentType) }}</el-tag>
              <small>{{ item.createdAt || '--' }} · {{ item.chunkCount || 0 }} 个片段</small>
              <el-button
                link
                size="small"
                type="primary"
                :loading="restoringVersionId === item.id"
                @click="handleRestoreVersion(item)"
              >
                恢复
              </el-button>
            </div>
            <div class="version-row__title">{{ item.title || '--' }}</div>
            <p>{{ item.content || '--' }}</p>
            <small>{{ item.contentHash ? '内容快照已保存' : '等待生成内容快照' }}</small>
          </article>
          <AppState
            v-if="!documentVersions.length && versionsLoadingId !== versionDocument?.id"
            type="empty"
            title="还没有历史版本"
            description="资料首次创建或尚未发生编辑时不会产生历史版本。后续修改资料内容后，这里会保留可恢复记录。"
          >
            <el-button type="primary" plain @click="versionDocument && openEdit(versionDocument)">编辑资料</el-button>
          </AppState>
        </div>
      </div>
    </el-drawer>

    <el-drawer v-model="chunkDetailVisible" size="640px" :title="chunkDetailTitle">
      <div class="chunk-detail" v-loading="!!chunkDetailLoadingId">
        <div v-if="selectedChunkDetail" class="chunk-row">
          <div class="chunk-row__head">
            <strong>第 {{ (selectedChunkDetail.chunkIndex ?? 0) + 1 }} 段</strong>
            <el-tag size="small" effect="plain">{{ documentTypeLabel(selectedChunkSource?.documentType) }}</el-tag>
            <el-tag size="small" :type="statusType(selectedChunkDetail.indexStatus)" effect="light">{{ statusLabel(selectedChunkDetail.indexStatus) }}</el-tag>
            <span>{{ selectedChunkDetail.sourceRef || '--' }}</span>
            <el-button link size="small" type="primary" @click="openChunkInfluencePreview(selectedChunkDetail)">
              影响预览
            </el-button>
          </div>
          <p>{{ selectedChunkDetail.content || '--' }}</p>
          <small>{{ indexMetaLabel(selectedChunkDetail) }}</small>
          <el-alert
            v-if="selectedChunkDetail.lastError"
            class="chunk-error"
            type="error"
            :closable="false"
            :title="selectedChunkDetail.lastError"
          />
        </div>
        <AppState
          v-else-if="!chunkDetailLoadingId"
          type="empty"
          title="片段详情暂未加载"
          description="片段可能已被重建、清理或当前索引结果没有返回完整记录。请回到资料列表刷新后再查看。"
        >
          <el-button type="primary" plain @click="loadDocuments">刷新资料列表</el-button>
        </AppState>
      </div>
    </el-drawer>

    <el-drawer v-model="influencePreviewVisible" size="720px" :title="selectedInfluencePreview?.title || '知识影响预览'">
      <div v-if="selectedInfluencePreview" class="influence-preview-drawer">
        <section class="influence-preview-summary">
          <div>
            <span>{{ selectedInfluencePreview.targetKind === 'CHUNK' ? '知识片段' : '知识资料' }}</span>
            <strong>{{ selectedInfluencePreview.evidenceSummary }}</strong>
          </div>
          <el-tag :type="influenceStatusType(selectedInfluencePreview.confidence)" effect="light">
            {{ influenceStatusLabel(selectedInfluencePreview.confidence) }}
          </el-tag>
          <el-tag type="info" effect="plain">
            {{ selectedInfluencePreview.previewSource === 'BACKEND_REFERENCES' ? 'Backend precise' : 'Estimated fallback' }}
          </el-tag>
        </section>

        <el-alert
          v-if="selectedInfluencePreview.warnings.length"
          class="influence-preview-alert"
          type="warning"
          :closable="false"
          show-icon
          title="证据不足或存在风险，以下影响仅作为降级预览。"
        />

        <section class="influence-preview-section">
          <div class="section-head compact">
            <div>
              <p class="section-kicker">直接影响</p>
              <h2>建议、行动、投递包、面试训练与报告</h2>
            </div>
          </div>
          <article v-for="item in selectedInfluencePreview.directImpacts" :key="item.key" class="influence-preview-row">
            <div>
              <strong>{{ item.label }}</strong>
              <p>{{ item.summary }}</p>
              <small v-if="item.evidence">{{ item.evidence }}</small>
            </div>
            <el-tag :type="influenceStatusType(item.status)" effect="plain">{{ influenceStatusLabel(item.status) }}</el-tag>
          </article>
        </section>

        <section class="influence-preview-section">
          <div class="section-head compact">
            <div>
              <p class="section-kicker">间接影响</p>
              <h2>Agent 计划与训练队列</h2>
            </div>
          </div>
          <article v-for="item in selectedInfluencePreview.indirectImpacts" :key="item.key" class="influence-preview-row">
            <div>
              <strong>{{ item.label }}</strong>
              <p>{{ item.summary }}</p>
            </div>
            <el-tag :type="influenceStatusType(item.status)" effect="plain">{{ influenceStatusLabel(item.status) }}</el-tag>
          </article>
        </section>

        <section class="influence-preview-section">
          <div class="section-head compact">
            <div>
              <p class="section-kicker">治理行动</p>
              <h2>低置信、过期、失败和重复的处理建议</h2>
            </div>
          </div>
          <article
            v-for="action in selectedInfluencePreview.governanceActions"
            :key="`${action.code}-${action.reason}`"
            class="influence-governance-row"
          >
            <div>
              <strong>{{ governanceActionCodeLabel(action.code) }}</strong>
              <p>{{ action.title }}：{{ action.reason }}</p>
            </div>
            <el-tag :type="action.priority === 'HIGH' ? 'danger' : action.priority === 'MEDIUM' ? 'warning' : 'info'" effect="light">
              {{ action.priority }}
            </el-tag>
          </article>
          <AppState
            v-if="!selectedInfluencePreview.governanceActions.length"
            type="empty"
            title="暂无明确治理行动"
            description="当前证据没有触发低置信、过期、评测失败或重复片段规则；仍建议在删除、重建索引等操作前查看影响范围。"
          />
        </section>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ChatDotRound, Delete, Files, Plus, Refresh, Search } from '@element-plus/icons-vue'
import { ElMessage, type UploadFile } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isAuthOrForbiddenError } from '@/utils/apiError'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { toFriendlyMessage } from '@/utils/error'
import { formatDateTime } from '@/utils/format'
import { createOperationIdempotencyKey } from '@/utils/idempotency'
import {
  buildKnowledgeInfluencePreview,
  type KnowledgeInfluenceItem,
  type KnowledgeInfluencePreview
} from '@/features/knowledge-impact'

import {
  askKnowledgeApi,
  askKnowledgeStreamApi,
  cleanupKnowledgeExactDuplicatesApi,
  createKnowledgeDocumentApi,
  deleteKnowledgeChunkApi,
  deleteKnowledgeDocumentApi,
  evaluateKnowledgeApi,
  deleteKnowledgeEvalCaseApi,
  getKnowledgeConfigApi,
  getKnowledgeChunkApi,
  getKnowledgeEvalCasesApi,
  getKnowledgeEvalRunApi,
  getKnowledgeEvalRunsApi,
  getKnowledgeDuplicateReviewApi,
  getKnowledgeDocumentChunksApi,
  getKnowledgeDocumentDetailApi,
  getKnowledgeDocumentImpactPreviewApi,
  getKnowledgeDocumentOptionsApi,
  getKnowledgeDocumentTypesApi,
  getKnowledgeDocumentVersionsApi,
  getKnowledgeDocumentsApi,
  getKnowledgeExactDuplicatesApi,
  getAgentMemoriesApi,
  getKnowledgeChunkImpactPreviewApi,
  getKnowledgeSimilarChunksApi,
  getKnowledgeStatsApi,
  rebuildKnowledgeVectorsApi,
  retryFailedKnowledgeVectorsApi,
  runKnowledgeEvalApi,
  saveKnowledgeEvalCaseApi,
  restoreKnowledgeDocumentVersionApi,
  searchKnowledgeApi,
  traceKnowledgeSearchApi,
  updateKnowledgeDocumentApi,
  uploadKnowledgeDocumentApi,
  type AgentMemoryVO,
  type KnowledgeChunkVO,
  type KnowledgeConfigVO,
  type KnowledgeDocumentOptionVO,
  type KnowledgeDocumentVO,
  type KnowledgeDocumentVersionVO,
  type KnowledgeDuplicateCleanupVO,
  type KnowledgeDuplicateReviewItemVO,
  type KnowledgeDuplicateReviewVO,
  type KnowledgeExactDuplicateGroupVO,
  type KnowledgeEvaluationItemVO,
  type KnowledgeEvaluationVO,
  type KnowledgeEvalCaseQueryDTO,
  type KnowledgeEvalCaseVO,
  type KnowledgeEvalRunResultVO,
  type KnowledgeEvalRunVO,
  type KnowledgeStatsVO,
  type KnowledgeVectorRebuildVO,
  type KnowledgeSearchResultVO,
  type KnowledgeSearchTraceVO
} from '@/api/v4'
import AppState from '@/components/common/AppState.vue'
import type { StreamSseHandle } from '@/utils/sse'
import type { AgentContextImpactPreviewVO } from '@/types/agent'

const loading = ref(false)
const route = useRoute()
const router = useRouter()
const searching = ref(false)
const tracingSearch = ref(false)
const asking = ref(false)
const saving = ref(false)
const uploading = ref(false)
const rebuilding = ref(false)
const knowledgeEvaluating = ref(false)
const knowledgeEvalCaseLoading = ref(false)
const knowledgeEvalRunLoading = ref(false)
const knowledgeEvalSaving = ref(false)
const knowledgeEvalRunning = ref(false)
const knowledgeEvalRunDetailLoading = ref(false)
const retryingFailedVectors = ref(false)
const chunksLoading = ref(false)
const duplicateReviewLoading = ref(false)
const exactDuplicateLoading = ref(false)
const exactDuplicateCleanupLoading = ref(false)
const editingLoadingId = ref<number | null>(null)
const versionsLoadingId = ref<number | null>(null)
const restoringVersionId = ref<number | null>(null)
const similarLoadingId = ref<number | null>(null)
const chunkDetailLoadingId = ref<number | null>(null)
let activeKnowledgeAskStream: StreamSseHandle | null = null
let knowledgeAskRunId = 0
const deletingChunkId = ref<number | null>(null)
const deletingId = ref<number | null>(null)
const errorMessage = ref('')
const partialLoadWarnings = ref<string[]>([])
const allDocuments = ref<KnowledgeDocumentVO[]>([])
const documents = ref<KnowledgeDocumentVO[]>([])
const documentOptions = ref<KnowledgeDocumentOptionVO[]>([])
const documentTypeOptions = ref<string[]>([])
const agentMemories = ref<AgentMemoryVO[]>([])
const searchResults = ref<KnowledgeSearchResultVO[]>([])
const searchTrace = ref<KnowledgeSearchTraceVO | null>(null)
const askReferences = ref<KnowledgeSearchResultVO[]>([])
const selectedDocument = ref<KnowledgeDocumentVO | null>(null)
const versionDocument = ref<KnowledgeDocumentVO | null>(null)
const documentChunks = ref<KnowledgeChunkVO[]>([])
const documentVersions = ref<KnowledgeDocumentVersionVO[]>([])
const selectedChunkDetail = ref<KnowledgeChunkVO | null>(null)
const selectedChunkSource = ref<KnowledgeSearchResultVO | null>(null)
const exactDuplicateGroups = ref<KnowledgeExactDuplicateGroupVO[]>([])
const exactDuplicateCleanup = ref<KnowledgeDuplicateCleanupVO | null>(null)
const exactDuplicateScopeDocumentId = ref<number | undefined>()
const exactDuplicateScopeType = ref('')
const similarChunkMap = ref<Record<number, KnowledgeSearchResultVO[]>>({})
const knowledgeStats = ref<KnowledgeStatsVO | null>(null)
const knowledgeConfig = ref<KnowledgeConfigVO | null>(null)
const knowledgeEvaluation = ref<KnowledgeEvaluationVO | null>(null)
const knowledgeEvalCases = ref<KnowledgeEvalCaseVO[]>([])
const knowledgeEvalRuns = ref<KnowledgeEvalRunVO[]>([])
const knowledgeEvalLatestRun = ref<KnowledgeEvalRunVO | null>(null)
const knowledgeEvalCaseTotal = ref(0)
const knowledgeEvalRunTotal = ref(0)
const duplicateReview = ref<KnowledgeDuplicateReviewVO | null>(null)
const answer = ref('')
const askInsufficientReferences = ref(false)
const askReferenceCount = ref(0)
const askTopReferenceScore = ref<number | undefined>()
const askMinReferenceScore = ref<number | undefined>()
const askCitationValid = ref<boolean | undefined>()
const askAnswerGrounded = ref<boolean | undefined>()
const askCitationWarning = ref('')
const askCitedReferenceNumbers = ref<number[]>([])
const askInvalidReferenceNumbers = ref<number[]>([])
const total = ref(0)
const keyword = ref('')
const question = ref('')
const limit = ref(10)
const knowledgeScopeType = ref('')
const knowledgeScopeDocumentId = ref<number | undefined>()
const searchMinScorePercent = ref<number | null>(null)

const knowledgeEvalCaseQuery = reactive<KnowledgeEvalCaseQueryDTO>({
  keyword: '',
  expectedDocumentType: '',
  expectNoAnswer: undefined,
  enabled: 1,
  pageNo: 1,
  pageSize: 5
})

const knowledgeEvalRunQuery = reactive({
  pageNo: 1,
  pageSize: 5
})
const askMinScorePercent = ref<number | null>(null)
const duplicateThresholdPercent = ref<number | null>(null)
const dialogVisible = ref(false)
const rebuildDialogVisible = ref(false)
const chunksDrawerVisible = ref(false)
const duplicateReviewVisible = ref(false)
const versionsDrawerVisible = ref(false)
const chunkDetailVisible = ref(false)
const exactDuplicateVisible = ref(false)
const influencePreviewVisible = ref(false)
const selectedInfluencePreview = ref<KnowledgeInfluencePreview | null>(null)
const editingDocumentId = ref<number | null>(null)
const rebuildResult = ref<KnowledgeVectorRebuildVO | null>(null)
const rebuildTargetLabel = ref('全部资料')

const query = reactive({
  pageNo: 1,
  pageSize: 10,
  title: '',
  documentType: '',
  status: ''
})

const form = reactive({
  title: '',
  documentType: 'NOTE',
  content: ''
})

const documentTypeLabelMap: Record<string, string> = {
  NOTE: '学习笔记',
  PROJECT: '项目资料',
  INTERVIEW_REVIEW: '面试复盘',
  RESUME: '简历资料',
  MARKDOWN: 'Markdown 文档',
  PDF: 'PDF 文档',
  WORD: 'Word 文档',
  TEXT: '文本资料'
}

const documentTypeLabel = (type?: string) => documentTypeLabelMap[String(type || '').toUpperCase()] || '未分类资料'

const documentTypeOrRefLabel = (sourceRef?: string | null, documentType?: string | null) =>
  sourceRef || documentTypeLabel(documentType || undefined)

const influenceStatusLabel = (status?: KnowledgeInfluenceItem['status']) => {
  if (status === 'SUPPORTED') return '有证据'
  if (status === 'PARTIAL') return '部分证据'
  if (status === 'DEGRADED') return '降级'
  return '待复核'
}

const influenceStatusType = (status?: KnowledgeInfluenceItem['status']) => {
  if (status === 'SUPPORTED') return 'success'
  if (status === 'PARTIAL') return 'warning'
  if (status === 'DEGRADED') return 'danger'
  return 'info'
}

const governanceActionCodeLabel = (code: string) => {
  if (code === 'ADD_KNOWLEDGE_DOCUMENT') return 'ADD_KNOWLEDGE_DOCUMENT'
  if (code === 'REINDEX_KNOWLEDGE') return 'REINDEX_KNOWLEDGE'
  if (code === 'REVIEW_KNOWLEDGE_CITATION') return 'REVIEW_KNOWLEDGE_CITATION'
  if (code === 'MERGE_DUPLICATE_KNOWLEDGE') return 'MERGE_DUPLICATE_KNOWLEDGE'
  return code
}

const latestEvalImpactSource = () =>
  knowledgeEvalLatestRun.value
    ? {
        evaluatedCount: knowledgeEvalLatestRun.value.evaluatedCount,
        failedCount: knowledgeEvalLatestRun.value.failedCount,
        passRate: knowledgeEvalLatestRun.value.passRate,
        results: knowledgeEvalLatestRun.value.results || []
      }
    : null

const findKnowledgeDocument = (documentId?: number | null) =>
  documentId ? allDocuments.value.find((item) => item.id === documentId) || documentOptions.value.find((item) => item.id === documentId) || null : null

const buildDocumentInfluencePreview = (row: KnowledgeDocumentVO) =>
  buildKnowledgeInfluencePreview({
    targetKind: 'DOCUMENT',
    document: row,
    chunks: selectedDocument.value?.id === row.id ? documentChunks.value : [],
    searchResults: searchResults.value,
    askReferences: askReferences.value,
    searchTrace: searchTrace.value,
    knowledgeEvaluation: knowledgeEvaluation.value,
    latestEvalRun: latestEvalImpactSource(),
    duplicateReview: duplicateReview.value,
    stats: knowledgeStats.value,
    memories: agentMemories.value,
    minScore: normalizedSearchMinScore.value ?? knowledgeConfig.value?.askMinScore
  })

const buildChunkInfluencePreview = (chunk: KnowledgeChunkVO) =>
  buildKnowledgeInfluencePreview({
    targetKind: 'CHUNK',
    document: findKnowledgeDocument(chunk.documentId) || selectedDocument.value,
    chunk,
    chunks: [chunk],
    searchResults: searchResults.value,
    askReferences: askReferences.value,
    searchTrace: searchTrace.value,
    knowledgeEvaluation: knowledgeEvaluation.value,
    latestEvalRun: latestEvalImpactSource(),
    duplicateReview: duplicateReview.value,
    stats: knowledgeStats.value,
    memories: agentMemories.value,
    minScore: normalizedSearchMinScore.value ?? knowledgeConfig.value?.askMinScore
  })

const impactStatusFromStrength = (strength?: string | null): KnowledgeInfluenceItem['status'] => {
  const token = String(strength || '').toUpperCase()
  if (token === 'STRONG') return 'SUPPORTED'
  if (token === 'WEAK') return 'REVIEW_REQUIRED'
  return 'PARTIAL'
}

const withBackendImpactPreview = (
  localPreview: KnowledgeInfluencePreview,
  backend?: AgentContextImpactPreviewVO | null,
  fallbackReason?: string
): KnowledgeInfluencePreview => {
  if (!backend) {
    return {
      ...localPreview,
      previewSource: 'ESTIMATED',
      resultSource: 'ESTIMATED',
      fallbackReason
    }
  }
  const consumers = Array.isArray(backend.affectedConsumers) ? backend.affectedConsumers : []
  const backendImpacts = consumers.map((item, index) => ({
    key: `${item.consumerType || 'CONSUMER'}-${item.consumerId || index}-${item.usageScene || 'USAGE'}`,
    label: item.consumerType || 'CONSUMER',
    status: impactStatusFromStrength(item.usageStrength),
    summary: item.summary || `${item.consumerType || 'Consumer'} #${item.consumerId || '-'} ${item.usageScene || 'used this context'}`,
    evidence: [item.traceId ? `traceId=${item.traceId}` : '', item.snapshotHash ? `hash=${item.snapshotHash}` : '']
      .filter(Boolean)
      .join(' / ')
  }))
  const moduleImpacts = (backend.affectedModules || []).map((module, index) => ({
    key: `module-${module}-${index}`,
    label: module,
    status: 'SUPPORTED' as KnowledgeInfluenceItem['status'],
    summary: `Historical usage exists in ${module}.`
  }))
  return {
    ...localPreview,
    referenceCount: backend.referenceCount ?? 0,
    recentReferenceCount: backend.recentReferenceCount ?? 0,
    futureContextImpact: Boolean(backend.futureContextImpact),
    historicalOnly: Boolean(backend.historicalOnly),
    safeToDisable: Boolean(backend.safeToDisable),
    previewSource: backend.previewSource || backend.resultSource || 'BACKEND_REFERENCES',
    resultSource: backend.resultSource || backend.previewSource || 'BACKEND_REFERENCES',
    evidenceSummary: `Backend references: total ${backend.referenceCount ?? 0}, recent ${backend.recentReferenceCount ?? 0}, futureContext=${backend.futureContextImpact ? 'yes' : 'no'}.`,
    directImpacts: backendImpacts.length ? backendImpacts : localPreview.directImpacts,
    indirectImpacts: moduleImpacts.length ? moduleImpacts : localPreview.indirectImpacts,
    warnings: Array.from(new Set([...(backend.warnings || []), ...localPreview.warnings])),
    governanceActions: localPreview.governanceActions
  }
}

const loadDocumentInfluencePreview = async (row: KnowledgeDocumentVO) => {
  const localPreview = buildDocumentInfluencePreview(row)
  try {
    return withBackendImpactPreview(localPreview, await getKnowledgeDocumentImpactPreviewApi(row.id))
  } catch (error) {
    if (isAuthOrForbiddenError(error)) throw error
    return withBackendImpactPreview(localPreview, null, toFriendlyMessage(error))
  }
}

const loadChunkInfluencePreview = async (chunk: KnowledgeChunkVO) => {
  const localPreview = buildChunkInfluencePreview(chunk)
  try {
    return chunk.id
      ? withBackendImpactPreview(localPreview, await getKnowledgeChunkImpactPreviewApi(chunk.id))
      : withBackendImpactPreview(localPreview, null, 'missing chunk id')
  } catch (error) {
    if (isAuthOrForbiddenError(error)) throw error
    return withBackendImpactPreview(localPreview, null, toFriendlyMessage(error))
  }
}

const openDocumentInfluencePreview = async (row: KnowledgeDocumentVO) => {
  selectedInfluencePreview.value = buildDocumentInfluencePreview(row)
  influencePreviewVisible.value = true
  selectedInfluencePreview.value = await loadDocumentInfluencePreview(row)
}

const openChunkInfluencePreview = async (chunk: KnowledgeChunkVO) => {
  selectedInfluencePreview.value = buildChunkInfluencePreview(chunk)
  influencePreviewVisible.value = true
  selectedInfluencePreview.value = await loadChunkInfluencePreview(chunk)
}

const openSearchResultInfluencePreview = async (item: KnowledgeSearchResultVO) => {
  let chunk: KnowledgeChunkVO | null = null
  if (item.chunkId) {
    try {
      chunk = await getKnowledgeChunkApi(item.chunkId)
    } catch {
      chunk = null
    }
  }
  const localPreview = buildKnowledgeInfluencePreview({
    targetKind: chunk ? 'CHUNK' : 'DOCUMENT',
    document: findKnowledgeDocument(item.documentId),
    chunk: chunk || undefined,
    chunks: chunk ? [chunk] : [],
    searchResults: [item, ...searchResults.value],
    askReferences: askReferences.value,
    searchTrace: searchTrace.value,
    knowledgeEvaluation: knowledgeEvaluation.value,
    latestEvalRun: latestEvalImpactSource(),
    duplicateReview: duplicateReview.value,
    stats: knowledgeStats.value,
    memories: agentMemories.value,
    minScore: normalizedSearchMinScore.value ?? knowledgeConfig.value?.askMinScore
  })
  selectedInfluencePreview.value = localPreview
  influencePreviewVisible.value = true
  if (chunk) {
    selectedInfluencePreview.value = await loadChunkInfluencePreview(chunk)
    return
  }
  const document = findKnowledgeDocument(item.documentId)
  if (document) {
    selectedInfluencePreview.value = await loadDocumentInfluencePreview(document)
  }
}

const influencePreviewDangerText = (preview: KnowledgeInfluencePreview) => {
  const actions = preview.governanceActions.map((item) => item.code).join(' / ') || 'none'
  const source = preview.previewSource === 'BACKEND_REFERENCES'
    ? `Backend precise references: total=${preview.referenceCount ?? 0}, recent=${preview.recentReferenceCount ?? 0}, futureContext=${preview.futureContextImpact ? 'yes' : 'no'}.`
    : `Estimated fallback only${preview.fallbackReason ? `: ${preview.fallbackReason}` : ''}. Historical reference details are unavailable.`
  return `${source} ${preview.evidenceSummary} Direct impacts: ${preview.directImpacts.map((item) => `${item.label}:${influenceStatusLabel(item.status)}`).join('; ')}. Indirect impacts: ${preview.indirectImpacts.map((item) => `${item.label}:${influenceStatusLabel(item.status)}`).join('; ')}. Governance actions: ${actions}.`
}

const formDocumentTypeOptions = computed(() =>
  Array.from(new Set(['NOTE', 'PROJECT', 'INTERVIEW_REVIEW', 'RESUME', ...documentTypeOptions.value]))
)

const isKeywordFallbackReason = (value: string) => {
  const normalized = value.toLowerCase()
  return normalized.includes('keyword') && normalized.includes('fallback')
}

const knowledgeDisabledReason = (reason?: string) => {
  if (!reason) return '更精准的资料检索暂未配置，当前先按关键词查找。'
  if (reason.includes('Vector store is disabled')) return '更精准的资料检索暂未启用，当前先按关键词查找。'
  if (reason.includes('Embedding provider is not configured')) return '检索增强服务暂未配置，当前先按关键词查找。'
  if (reason.includes('Embedding base URL')) return '检索增强服务配置不完整，当前先按关键词查找。'
  if (isKeywordFallbackReason(reason)) return '更精准的资料检索暂不可用，当前先按关键词查找。'
  return reason.match(/[A-Za-z]{3,}/)
    ? '更精准的资料检索暂不可用，当前先按关键词查找。'
    : reason
}

const chunkTotal = computed(() =>
  knowledgeStats.value?.chunkCount ?? allDocuments.value.reduce((sum, item) => sum + (Number(item.chunkCount) || 0), 0)
)

const documentTotal = computed(() => knowledgeStats.value?.documentCount ?? total.value)
const hasDocumentFilters = computed(() => Boolean(query.title || query.documentType || query.status))

const duplicateChunkTotal = computed(() => knowledgeStats.value?.duplicateChunkCount ?? 0)

const semanticEnabled = computed(() => {
  if (typeof knowledgeConfig.value?.semanticEnabled === 'boolean') {
    return knowledgeConfig.value.semanticEnabled
  }
  if (typeof knowledgeStats.value?.semanticEnabled === 'boolean') {
    return knowledgeStats.value.semanticEnabled
  }
  return Boolean(knowledgeConfig.value?.vectorEnabled ?? knowledgeStats.value?.vectorEnabled)
})

const semanticDisabledReason = computed(() =>
  knowledgeDisabledReason(
    knowledgeConfig.value?.embeddingDisabledReason ||
    knowledgeStats.value?.embeddingDisabledReason ||
    '语义检索未配置，当前使用关键词检索。'
  )
)

const vectorCapabilityLabel = computed(() => {
  if (semanticEnabled.value) {
    return '语义检索已启用'
  }
  return '未配置'
})

const vectorCapabilityDetail = computed(() => {
  if (!semanticEnabled.value) return semanticDisabledReason.value
  if (knowledgeConfig.value?.vectorEnabled) return '个人知识库检索索引可用'
  return '语义检索可用'
})

const documentTypeSummary = computed(() => {
  const counts = knowledgeStats.value?.documentTypeCounts || {}
  const items = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
  if (!items.length) return '--'
  return items.map(([type, count]) => `${type}:${count}`).join(' / ')
})


const indexStatusItems = computed(() => {
  const counts = knowledgeStats.value?.indexStatusCounts || {}
  const ordered = ['INDEXED', 'PENDING', 'FAILED', 'DISABLED', 'DELETED']
  const items = ordered
    .map((status) => ({ status, count: Number(counts[status] || 0) }))
    .filter((item) => item.count > 0)
  for (const [status, count] of Object.entries(counts)) {
    if (!ordered.includes(status) && Number(count) > 0) {
      items.push({ status, count: Number(count) })
    }
  }
  return items.length ? items : [{ status: semanticEnabled.value ? 'PENDING' : 'DISABLED', count: 0 }]
})

const failedChunkCount = computed(() => Number(knowledgeStats.value?.indexStatusCounts?.FAILED || 0))

const pendingChunkCount = computed(() => Number(knowledgeStats.value?.indexStatusCounts?.PENDING || 0))

const disabledChunkCount = computed(() => Number(knowledgeStats.value?.indexStatusCounts?.DISABLED || 0))

const indexedChunkCount = computed(() => Number(knowledgeStats.value?.indexStatusCounts?.INDEXED || 0))

const embeddingModelSummary = computed(() => {
  const counts = knowledgeStats.value?.embeddingModelCounts || {}
  const total = Object.values(counts).reduce((sum, count) => sum + (Number(count) || 0), 0)
  if (total > 0) return `已处理 ${total} 个片段`
  return semanticEnabled.value ? '等待生成' : '未启用'
})

const vectorIndexHealthLabel = computed(() => {
  if (!semanticEnabled.value) return semanticDisabledReason.value
  if (failedChunkCount.value > 0) return '存在失败片段，建议重试索引'
  if (pendingChunkCount.value > 0) return '存在等待索引的片段'
  return '检索索引状态正常'
})

const duplicateTypeLabel = (type?: string | null) => {
  const value = String(type || '').toUpperCase()
  if (value.includes('EXACT')) return '完全重复'
  if (value.includes('NEAR') || value.includes('SIMILAR')) return '近重复'
  if (value.includes('CONTENT')) return '内容重复'
  return '重复片段'
}

const duplicateTypeSummary = computed(() => {
  const counts = knowledgeStats.value?.duplicateTypeCounts || {}
  const items = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
  if (!items.length) return '--'
  return items.map(([type, count]) => `${duplicateTypeLabel(type)} ${count}`).join(' / ')
})

const topDuplicateType = computed(() => {
  const counts = knowledgeStats.value?.duplicateTypeCounts || {}
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((left, right) => right[1] - left[1])[0]?.[0]
})

const duplicateDocumentHotspots = computed(() => knowledgeStats.value?.duplicateDocumentHotspots || [])

const hasDuplicateHotspots = computed(() => duplicateChunkTotal.value > 0 || duplicateDocumentHotspots.value.length > 0)

const topDuplicateHotspotLabel = computed(() => {
  const hotspot = duplicateDocumentHotspots.value[0]
  if (!hotspot) return '--'
  const title = hotspot.title || '知识资料'
  const duplicateCount = hotspot.duplicateChunkCount || 0
  const ratio = typeof hotspot.duplicateRatio === 'number' ? `, ${hotspot.duplicateRatio}%` : ''
  return `${title} (${duplicateCount}${ratio})`
})

const topDuplicateHotspotId = computed(() => duplicateDocumentHotspots.value[0]?.documentId)

const exactDuplicateScopeLabel = computed(() => {
  if (exactDuplicateScopeDocumentId.value) {
    const item = documentOptions.value.find((option) => option.id === exactDuplicateScopeDocumentId.value)
    return `范围：${item?.title || '选中资料'}`
  }
  if (exactDuplicateScopeType.value) return `范围：${duplicateTypeLabel(exactDuplicateScopeType.value)}`
  return '范围：全部资料'
})

const exactDuplicateScopeParams = () => ({
  limit: 20,
  documentId: exactDuplicateScopeDocumentId.value,
  documentType: exactDuplicateScopeType.value || undefined
})

const formatRetrievalModeLabel = (mode?: string | null, semanticAvailable = semanticEnabled.value) => {
  const raw = String(mode || '').trim()
  const normalized = raw.toUpperCase()
  if (!normalized) return semanticAvailable ? '混合检索' : '关键词检索'
  if (normalized === 'HYBRID') return '混合检索'
  if (['VECTOR_FIRST', 'VECTOR', 'SEMANTIC_FIRST'].includes(normalized)) return '语义优先'
  if (['KEYWORD_FALLBACK', 'KEYWORD_ONLY', 'KEYWORD'].includes(normalized)) return '关键词检索'
  return /^[A-Z0-9_./:-]+$/.test(normalized) ? (semanticAvailable ? '混合检索' : '关键词检索') : raw
}

const knowledgeSearchWarningLabel = (warning?: string | null) => {
  const text = String(warning || '').trim()
  if (!text) return '本次检索有一条提示需要复核。'
  if (text.includes('No candidate passed')) return '当前最低分或筛选条件较严格，暂未找到满足条件的资料。'
  if (isKeywordFallbackReason(text)) return '更精准的资料检索暂不可用，本次先按关键词查找。'
  if (text.includes('Vector store is disabled')) return '更精准的资料检索暂未启用，本次先按关键词查找。'
  if (text.includes('Embedding provider is not configured')) return '检索增强服务暂未配置，本次先按关键词查找。'
  if (text.includes('Embedding base URL')) return '检索增强服务配置不完整，本次先按关键词查找。'
  if (/^[A-Za-z0-9_ ./:-]+$/.test(text)) return '本次检索返回了技术提示，请调整关键词、范围或最低分后重试。'
  return text
}

const retrievalModeLabel = computed(() => formatRetrievalModeLabel(knowledgeStats.value?.retrievalMode))

const searchTraceRetrievalModeLabel = computed(() =>
  formatRetrievalModeLabel(searchTrace.value?.retrievalMode, Boolean(searchTrace.value?.vectorEnabled ?? semanticEnabled.value))
)

const searchTraceWarnings = computed(() =>
  Array.from(new Set((searchTrace.value?.warnings || []).map(knowledgeSearchWarningLabel)))
)

const chunkStrategyLabel = computed(() => {
  const strategy = knowledgeStats.value?.chunkStrategy
  if (String(strategy || '').includes('STRUCTURED')) return '结构化分段'
  return '智能分段'
})

const chunkConfigLabel = computed(() => {
  const size = knowledgeConfig.value?.chunkSize
  return size ? `约 ${size} 字/段` : '自动分段'
})

const chunkStrategyDetail = computed(() => {
  const overlap = knowledgeConfig.value?.chunkOverlap
  const min = knowledgeConfig.value?.minChunkSize
  if (overlap) return `保留约 ${overlap} 字上下文`
  if (min) return `最小片段约 ${min} 字`
  return '按资料内容自动整理'
})

const nearDuplicateThresholdLabel = computed(() => {
  const threshold = knowledgeConfig.value?.nearDuplicateThreshold
  return typeof threshold === 'number' ? `${Math.round(threshold * 100)}%` : '--'
})

const askMinScoreLabel = computed(() => {
  const score = knowledgeConfig.value?.askMinScore
  return typeof score === 'number' ? `${Math.round(score * 100)}%` : '--'
})

const nearDuplicateActionLabel = computed(() => {
  const action = knowledgeConfig.value?.nearDuplicateAction
  if (action === 'WARN_ONLY') return 'warn only'
  return action || '--'
})

const uploadLimitLabel = computed(() => {
  const bytes = knowledgeConfig.value?.uploadMaxBytes
  return bytes ? `${Math.round(bytes / 1024 / 1024)} MB` : '--'
})

const formatFileSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

const uploadExtensionsLabel = computed(() => knowledgeConfig.value?.uploadExtensions?.join(', ') || '--')
const uploadExtensions = computed(() => knowledgeConfig.value?.uploadExtensions?.length
  ? knowledgeConfig.value.uploadExtensions.map((item) => item.toLowerCase().replace(/^\./, ''))
  : ['txt', 'md', 'markdown', 'pdf', 'doc', 'docx']
)
const uploadAccept = computed(() => uploadExtensions.value.map((item) => `.${item}`).join(','))
const uploadMaxBytes = computed(() => knowledgeConfig.value?.uploadMaxBytes || 8 * 1024 * 1024)

const scopedDocumentOptions = computed(() => {
  if (!knowledgeScopeType.value) return documentOptions.value
  return documentOptions.value.filter((item) => item.documentType === knowledgeScopeType.value)
})

const duplicateReviewItems = computed<KnowledgeDuplicateReviewItemVO[]>(() => duplicateReview.value?.items || [])

const duplicateReviewSummary = computed(() => {
  if (!duplicateReview.value) return '尚未扫描'
  if (!semanticEnabled.value || !duplicateReview.value.vectorEnabled) return '语义检索未启用'
  return `${duplicateReview.value.candidateCount || 0} 个候选`
})

const duplicateReviewThresholdLabel = computed(() => {
  const threshold = duplicateReview.value?.threshold ?? knowledgeConfig.value?.nearDuplicateThreshold
  return typeof threshold === 'number' ? `${Math.round(threshold * 100)}%` : '--'
})

const chunkDetailTitle = computed(() =>
  selectedChunkSource.value?.title || '知识片段'
)

const knowledgeEvaluationTop = computed<KnowledgeEvaluationItemVO | undefined>(() => knowledgeEvaluation.value?.items?.[0])

const knowledgeEvaluationExpectedLabel = computed(() => {
  const item = knowledgeEvaluationTop.value
  if (!item) return '--'
  if (item.expectNoAnswer) return '期望无答案'
  if (item.expectedDocumentTitle) return item.expectedDocumentTitle
  if (item.expectedDocumentId) return '指定资料'
  if (item.expectedDocumentType) return item.expectedDocumentType
  return '任意来源'
})

const knowledgeEvalLatestFailures = computed<KnowledgeEvalRunResultVO[]>(() =>
  (knowledgeEvalLatestRun.value?.results || [])
    .filter((item) => item.passed === false)
    .slice(0, 5)
)

const knowledgeEvalLatestTrustedCount = computed(() =>
  (knowledgeEvalLatestRun.value?.results || [])
    .filter((item) => item.expectNoAnswer || (Number(item.referenceCount || 0) > 0 && item.citationValid === true && item.answerGrounded === true))
    .length
)

const knowledgeEvalLatestTrustRiskCount = computed(() => {
  const results = knowledgeEvalLatestRun.value?.results || []
  if (!results.length) return 0
  return results.length - knowledgeEvalLatestTrustedCount.value
})

const knowledgeEvalLatestTrustSummary = computed(() => {
  const results = knowledgeEvalLatestRun.value?.results || []
  if (!results.length) return '暂无可信度样本'
  return `${knowledgeEvalLatestTrustRiskCount.value} 条引用或依据风险`
})

const knowledgeEvalLatestRunSummary = computed(() => {
  const run = knowledgeEvalLatestRun.value
  return run ? `${run.runNo || '评估运行记录'} · ${evalRunStatusLabel(run.status)} · ${formatRate(run.passRate)}` : '暂无运行'
})

const enabledMemoryCount = computed(() =>
  agentMemories.value.filter((item) => Number(item.enabled) === 1).length
)

const disabledMemoryCount = computed(() =>
  agentMemories.value.filter((item) => Number(item.enabled) !== 1).length
)

const candidateMemoryCount = computed(() =>
  agentMemories.value.filter((item) => {
    const sourceType = String(item.sourceType || '').toUpperCase()
    const generatedByAgent = ['AGENT', 'AI', 'REVIEW', 'SYSTEM'].some((key) => sourceType.includes(key))
    return Number(item.enabled) !== 1 && generatedByAgent
  }).length
)

const lowConfidenceMemoryCount = computed(() =>
  agentMemories.value.filter((item) =>
    Number(item.enabled) === 1 &&
    typeof item.confidence === 'number' &&
    item.confidence > 0 &&
    item.confidence < 0.6
  ).length
)

const memoryGovernanceLabel = computed(() => {
  if (!agentMemories.value.length) return '暂无记忆'
  if (candidateMemoryCount.value) return `${candidateMemoryCount.value} 条待确认`
  if (lowConfidenceMemoryCount.value) return `${lowConfidenceMemoryCount.value} 条低置信`
  return `${enabledMemoryCount.value} 条可用`
})

const memoryGovernanceDetail = computed(() => {
  if (!agentMemories.value.length) return '长期记忆为空，后续建议不会引用记忆作为强证据。'
  if (candidateMemoryCount.value) return '候选记忆需要用户确认后，才适合影响强推荐。'
  if (lowConfidenceMemoryCount.value) return '低置信记忆仅作为复核提示，不应包装成强依据。'
  if (disabledMemoryCount.value) return `${disabledMemoryCount.value} 条已停用或待确认记忆不会主动影响推荐。`
  return '已启用记忆仅作为偏好或约束输入，不替代项目、投递、面试或题目证据。'
})

const knowledgeGovernanceIndexLabel = computed(() => {
  if (!chunkTotal.value) return '无片段'
  if (!semanticEnabled.value) return '未启用'
  return `${indexedChunkCount.value}/${chunkTotal.value}`
})

const knowledgeGovernanceIndexDetail = computed(() => {
  if (!semanticEnabled.value) return semanticDisabledReason.value
  const risks = [
    failedChunkCount.value ? `${failedChunkCount.value} 失败` : '',
    pendingChunkCount.value ? `${pendingChunkCount.value} 待索引` : '',
    disabledChunkCount.value ? `${disabledChunkCount.value} 未启用` : ''
  ].filter(Boolean)
  return risks.length ? risks.join(' / ') : '索引覆盖正常'
})

const duplicateGovernanceLabel = computed(() =>
  duplicateChunkTotal.value ? `${duplicateChunkTotal.value} 待治理` : '无明显重复'
)

const duplicateGovernanceDetail = computed(() => {
  if (duplicateReview.value) return `近重复候选 ${duplicateReview.value.candidateCount || 0}，已扫描 ${duplicateReview.value.scannedChunkCount || 0}`
  if (duplicateChunkTotal.value) return `${duplicateTypeSummary.value}，可扫描近重复或检查完全重复`
  return `阈值 ${duplicateReviewThresholdLabel.value}，可按需扫描`
})

const answerReferenceRisk = computed(() =>
  Boolean(
    answer.value &&
    (
      askInsufficientReferences.value ||
      !askReferenceCount.value ||
      askCitationValid.value !== true ||
      askAnswerGrounded.value !== true ||
      askCitationWarning.value
    )
  )
)

const askStronglyGrounded = computed(() =>
  Boolean(answer.value && askReferenceCount.value > 0 && askCitationValid.value === true && askAnswerGrounded.value === true)
)

const answerReferenceRiskMessage = computed(() => {
  if (!askReferenceCount.value) return '当前回答没有返回引用来源，暂不作为可信结论展示。'
  if (askCitationValid.value !== true) return '生成结果未通过引用校验，暂不作为可信结论展示。'
  if (askAnswerGrounded.value !== true) return '回答依据未充分绑定资料来源，建议复核引用后再使用。'
  return '当前回答需要复核引用来源，暂不作为强结论。'
})

const referenceGovernanceLabel = computed(() => {
  if (askInsufficientReferences.value) return '引用不足'
  if (answerReferenceRisk.value) return '需复核'
  if (askStronglyGrounded.value) return '可信回答'
  const total = knowledgeEvalLatestRun.value?.results?.length || 0
  if (total) return `可信 ${knowledgeEvalLatestTrustedCount.value}/${total}`
  return '待校验'
})

const referenceGovernanceDetail = computed(() => {
  if (askInsufficientReferences.value) return '当前回答没有足够相关引用，建议补充资料或降低引用最低分'
  if (askCitationWarning.value) return askCitationWarning.value
  if (answer.value) return `引用 ${askReferenceCount.value} 条，最高分 ${scoreLabel(askTopReferenceScore.value)}`
  if (knowledgeEvalLatestRun.value?.results?.length) return knowledgeEvalLatestTrustSummary.value
  return '生成回答或运行评估后显示引用可信状态'
})

const evaluationGovernanceLabel = computed(() => {
  if (knowledgeEvaluation.value) return formatRate(knowledgeEvaluation.value.passRate)
  const run = knowledgeEvalLatestRun.value
  if (run) return formatRate(run.passRate)
  if (knowledgeEvalCaseTotal.value) return '待运行'
  return '无样本'
})

const evaluationGovernanceDetail = computed(() => {
  if (knowledgeEvaluation.value) {
    return `当前评估通过 ${knowledgeEvaluation.value.passedCount || 0}/${knowledgeEvaluation.value.evaluatedCount || 0}`
  }
  const run = knowledgeEvalLatestRun.value
  if (run) {
    return `${evalRunStatusLabel(run.status)} · 失败 ${run.failedCount || 0} · ${knowledgeEvalLatestTrustSummary.value}`
  }
  if (knowledgeEvalCaseTotal.value) return `${knowledgeEvalCaseTotal.value} 个样本待运行`
  return '可保存真实问题作为样本，持续评估检索和引用质量'
})

const referenceInsufficientLabel = computed(() => {
  if (askInsufficientReferences.value) return '已触发'
  if (answer.value && !askReferenceCount.value) return '无引用'
  return '未触发'
})

const referenceInsufficientDetail = computed(() => {
  if (askInsufficientReferences.value) return '问答结果已提示引用不足'
  if (answer.value && !askReferenceCount.value) return '当前回答没有返回引用来源'
  return `当前引用最低分 ${askMinScoreLabel.value}`
})

const knowledgeGovernanceRiskCount = computed(() => {
  let count = 0
  if (!documentTotal.value) count += 1
  if (!semanticEnabled.value) count += 1
  if (failedChunkCount.value > 0) count += 1
  if (pendingChunkCount.value > 0) count += 1
  if (duplicateChunkTotal.value > 0) count += 1
  if (knowledgeEvalLatestTrustRiskCount.value > 0 || (knowledgeEvalLatestRun.value?.failedCount || 0) > 0) count += 1
  if (answerReferenceRisk.value || askInsufficientReferences.value) count += 1
  if (candidateMemoryCount.value > 0 || lowConfidenceMemoryCount.value > 0) count += 1
  return count
})

const knowledgeGovernanceHealthType = computed(() => {
  if (!documentTotal.value) return 'info'
  if (failedChunkCount.value > 0 || answerReferenceRisk.value) return 'danger'
  if (knowledgeGovernanceRiskCount.value > 0) return 'warning'
  return 'success'
})

const knowledgeGovernanceHealthBadge = computed(() => {
  if (knowledgeGovernanceHealthType.value === 'success') return '健康'
  if (knowledgeGovernanceHealthType.value === 'danger') return '高优先级'
  if (knowledgeGovernanceHealthType.value === 'warning') return '需关注'
  return '待建设'
})

const knowledgeGovernanceHealthLabel = computed(() => {
  if (!documentTotal.value) return '知识库待建设'
  if (knowledgeGovernanceHealthType.value === 'success') return '知识健康状态良好'
  return `${knowledgeGovernanceRiskCount.value} 项治理项需关注`
})

const knowledgeGovernanceHealthDetail = computed(() => {
  if (!documentTotal.value) return '先添加可引用资料，再观察索引、重复、评测和引用可信状态。'
  if (knowledgeGovernanceHealthType.value === 'success') return '索引、重复、评测和引用可信暂无明显风险。'
  return '优先处理失败索引、重复片段、引用不足和评测失败项。'
})

const knowledgeGovernanceItems = computed(() => [
  {
    key: 'index',
    label: '索引覆盖',
    value: knowledgeGovernanceIndexLabel.value,
    detail: knowledgeGovernanceIndexDetail.value
  },
  {
    key: 'duplicate',
    label: '重复治理',
    value: duplicateGovernanceLabel.value,
    detail: duplicateGovernanceDetail.value
  },
  {
    key: 'reference',
    label: '引用可信',
    value: referenceGovernanceLabel.value,
    detail: referenceGovernanceDetail.value
  },
  {
    key: 'evaluation',
    label: '评测结果',
    value: evaluationGovernanceLabel.value,
    detail: evaluationGovernanceDetail.value
  },
  {
    key: 'memory',
    label: '记忆治理',
    value: memoryGovernanceLabel.value,
    detail: memoryGovernanceDetail.value
  },
  {
    key: 'insufficient-reference',
    label: '引用不足',
    value: referenceInsufficientLabel.value,
    detail: referenceInsufficientDetail.value
  }
])

const knowledgeGovernanceWarnings = computed(() => {
  const warnings: string[] = []
  if (!documentTotal.value) warnings.push('知识库暂无资料，无法形成可引用答案。')
  if (!semanticEnabled.value) warnings.push(semanticDisabledReason.value)
  if (failedChunkCount.value > 0) warnings.push(`${failedChunkCount.value} 个片段索引失败，建议重试失败索引或查看片段错误。`)
  if (pendingChunkCount.value > 0) warnings.push(`${pendingChunkCount.value} 个片段仍待索引，评测和问答可信度可能暂不稳定。`)
  if (duplicateChunkTotal.value > 0) warnings.push(`${duplicateChunkTotal.value} 个重复片段待治理，建议先扫描近重复或检查完全重复。`)
  if (knowledgeEvalLatestTrustRiskCount.value > 0) warnings.push(`${knowledgeEvalLatestTrustRiskCount.value} 条评测结果存在引用或依据风险。`)
  if (candidateMemoryCount.value > 0) warnings.push(`${candidateMemoryCount.value} 条候选记忆尚未确认，不应进入强推荐依据。`)
  if (lowConfidenceMemoryCount.value > 0) warnings.push(`${lowConfidenceMemoryCount.value} 条低置信记忆仅作为复核提示。`)
  if (askInsufficientReferences.value) warnings.push('当前问答引用不足，建议补充资料、缩小范围或降低引用最低分后重试。')
  else if (answerReferenceRisk.value) warnings.push(referenceGovernanceDetail.value)
  return Array.from(new Set(warnings))
})

const qualityGateItems = computed(() => [
  {
    key: 'citation',
    label: '引用可信门槛',
    status: askStronglyGrounded.value ? '可作为可信回答' : '需引用校验',
    detail: askStronglyGrounded.value
      ? `已绑定 ${askReferenceCount.value} 条引用，引用校验和回答依据均通过。`
      : '无引用、引用不足或校验失败时，只能作为弱观察或补资料行动。'
  },
  {
    key: 'eval-sample',
    label: '评测样本门槛',
    status: knowledgeEvalCaseTotal.value ? `${knowledgeEvalCaseTotal.value} 个样本` : '样本不足',
    detail: knowledgeEvalCaseTotal.value
      ? evaluationGovernanceDetail.value
      : '没有评测样本时，不宣称知识库整体可靠，只提示补充样本。'
  },
  {
    key: 'index',
    label: '索引可用门槛',
    status: failedChunkCount.value || pendingChunkCount.value || !semanticEnabled.value ? '需降级' : '可检索',
    detail: knowledgeGovernanceIndexDetail.value
  },
  {
    key: 'memory',
    label: '记忆可信门槛',
    status: candidateMemoryCount.value || lowConfidenceMemoryCount.value ? '需复核' : memoryGovernanceLabel.value,
    detail: memoryGovernanceDetail.value
  },
  {
    key: 'impact',
    label: '破坏性动作门槛',
    status: '已启用影响说明',
    detail: '删除、清理、恢复和重建前均通过确认弹窗说明影响、回滚方式和审计口径。'
  }
])

type KnowledgeGovernanceActionKind =
  | 'ADD_DOCUMENT'
  | 'RETRY_INDEX'
  | 'SCAN_DUPLICATES'
  | 'CHECK_EXACT_DUPLICATES'
  | 'ADD_EVAL_CASE'
  | 'RUN_EVAL'
  | 'RETRY_ASK'
  | 'OPEN_MEMORY'

type KnowledgeGovernanceAction = {
  key: string
  title: string
  description: string
  impact: string
  priority: string
  tagType: 'success' | 'warning' | 'danger' | 'info'
  buttonType: 'primary' | 'warning' | 'danger' | 'info'
  cta: string
  action: KnowledgeGovernanceActionKind
}

const knowledgeGovernanceActions = computed<KnowledgeGovernanceAction[]>(() => {
  const actions: KnowledgeGovernanceAction[] = []
  if (!documentTotal.value) {
    actions.push({
      key: 'add-document',
      title: '补充可引用资料',
      description: '知识库为空时不能形成可信回答。',
      impact: '新增资料后仍需通过索引、引用校验和评测样本验证，不能立即宣称整体可靠。',
      priority: '高',
      tagType: 'danger',
      buttonType: 'primary',
      cta: '新增资料',
      action: 'ADD_DOCUMENT'
    })
  }
  if (failedChunkCount.value > 0) {
    actions.push({
      key: 'retry-index',
      title: '重试失败索引',
      description: `${failedChunkCount.value} 个片段索引失败，相关问答可能找不到引用。`,
      impact: '重试会重新提交索引任务；若仍失败，应检查资料内容或语义检索配置。',
      priority: '高',
      tagType: 'danger',
      buttonType: 'warning',
      cta: '重试索引',
      action: 'RETRY_INDEX'
    })
  }
  if (duplicateChunkTotal.value > 0) {
    actions.push({
      key: 'scan-duplicates',
      title: '审查重复或污染片段',
      description: `${duplicateChunkTotal.value} 个重复片段可能放大相同资料的权重。`,
      impact: '先扫描和查看候选，不自动删除；清理前会再次展示删除数量和影响。',
      priority: '中',
      tagType: 'warning',
      buttonType: 'warning',
      cta: '扫描重复',
      action: 'SCAN_DUPLICATES'
    })
    actions.push({
      key: 'exact-duplicates',
      title: '检查完全重复片段',
      description: '完全重复可先做 dry-run 预览，再决定是否清理。',
      impact: '清理会删除重复片段并同步清理索引；误删需要重新导入或重新保存资料。',
      priority: '中',
      tagType: 'warning',
      buttonType: 'warning',
      cta: '检查重复',
      action: 'CHECK_EXACT_DUPLICATES'
    })
  }
  if (!knowledgeEvalCaseTotal.value) {
    actions.push({
      key: 'add-eval-case',
      title: '新增评测样本',
      description: '没有真实问题样本时，评测结果只能作为弱提示。',
      impact: '样本会用于后续检索评估，建议绑定期望资料或标记为期望无答案。',
      priority: '中',
      tagType: 'warning',
      buttonType: 'primary',
      cta: '准备样本',
      action: 'ADD_EVAL_CASE'
    })
  } else if ((knowledgeEvalLatestRun.value?.failedCount || 0) > 0 || knowledgeEvalLatestTrustRiskCount.value > 0) {
    actions.push({
      key: 'run-eval',
      title: '复跑或复核评测',
      description: evaluationGovernanceDetail.value,
      impact: '运行评测可能调用知识问答能力并写入评测运行记录，失败项只生成治理提示。',
      priority: '中',
      tagType: 'warning',
      buttonType: 'primary',
      cta: '运行评测',
      action: 'RUN_EVAL'
    })
  }
  if (askInsufficientReferences.value || answerReferenceRisk.value) {
    actions.push({
      key: 'retry-ask',
      title: '复核引用不足回答',
      description: referenceGovernanceDetail.value,
      impact: '当前回答不作为可信结论；建议补资料、缩小范围或调整最低引用分后重试。',
      priority: '高',
      tagType: 'danger',
      buttonType: 'warning',
      cta: '回到问答',
      action: 'RETRY_ASK'
    })
  }
  if (candidateMemoryCount.value || lowConfidenceMemoryCount.value || disabledMemoryCount.value) {
    actions.push({
      key: 'memory-governance',
      title: '复核长期记忆',
      description: memoryGovernanceDetail.value,
      impact: '候选、停用或低置信记忆不应进入强证据；确认或删除应在记忆页完成。',
      priority: candidateMemoryCount.value || lowConfidenceMemoryCount.value ? '中' : '低',
      tagType: candidateMemoryCount.value || lowConfidenceMemoryCount.value ? 'warning' : 'info',
      buttonType: 'primary',
      cta: '打开记忆页',
      action: 'OPEN_MEMORY'
    })
  }
  return actions.slice(0, 6)
})

const governanceActionSummary = computed(() =>
  knowledgeGovernanceActions.value.length
    ? `${knowledgeGovernanceActions.value.length} 个可转行动`
    : '暂无高优先级治理行动'
)

const knowledgeEvalHasCurrentQuery = computed(() => Boolean((question.value || keyword.value).trim()))
const searchHasQuery = computed(() => Boolean(keyword.value.trim()))

const documentEmptyTitle = computed(() => {
  if (hasDocumentFilters.value) return '当前筛选没有资料'
  return '还没有知识库资料'
})

const documentEmptyDescription = computed(() => {
  if (hasDocumentFilters.value) return '当前筛选条件下没有资料，清空筛选后可以查看全部资料。'
  return `可以先添加项目复盘、错题总结、岗位描述笔记或简历片段；上传支持 ${uploadExtensionsLabel.value}，单个文件不超过 ${uploadLimitLabel.value}。`
})

const searchEmptyTitle = computed(() => {
  if (!documentTotal.value) return '先添加资料再检索'
  if (!searchHasQuery.value) return '输入关键词开始检索'
  return '没有命中知识片段'
})

const searchEmptyDescription = computed(() => {
  if (!documentTotal.value) return '语义搜索依赖你添加的资料；先新增项目笔记、复盘记录或岗位摘要，再回来搜索。'
  if (!searchHasQuery.value) return '输入 JVM 调优、项目亮点、线程池等关键词后，可以查看匹配片段和召回记录。'
  return semanticEnabled.value
    ? '当前资料没有匹配片段，可以换一个关键词、降低最低分，或补充更贴近问题的资料。'
    : `${semanticDisabledReason.value} 如果关键词也没有命中，可以补充更明确的标题或正文关键词。`
})

const knowledgeEvalRunEmptyTitle = computed(() =>
  knowledgeEvalCaseTotal.value ? '还没有运行评估' : '先准备评估样本'
)

const knowledgeEvalRunEmptyDescription = computed(() =>
  knowledgeEvalCaseTotal.value
    ? '已有评估样本，可以运行一次检索评估，检查答案引用和资料命中是否可靠。'
    : '输入一个真实问题并保存为样本后，再运行评估；例如“我的项目里线程池优化怎么讲？”并指定期望资料。'
)

const askReferenceEmptyTitle = computed(() => {
  if (!documentTotal.value) return '还没有可引用资料'
  if (!question.value.trim()) return '生成回答后会显示引用'
  return '本次回答没有可靠引用'
})

const askReferenceEmptyDescription = computed(() => {
  if (!documentTotal.value) return '问答需要先有个人资料作为来源；建议先添加项目复盘、面试复盘或学习笔记。'
  if (!question.value.trim()) return '输入一个只依赖个人资料回答的问题，系统会在回答下方列出引用片段。'
  return '可以降低引用最低分、缩小资料范围，或补充更贴近问题的资料后重新生成。'
})

const selectedKnowledgeDocumentOption = computed(() => {
  const id = knowledgeScopeDocumentId.value
  if (!id) return undefined
  return documentOptions.value.find((item) => item.id === id)
})

const normalizedSearchMinScore = computed(() => {
  if (searchMinScorePercent.value === null || searchMinScorePercent.value === undefined) return undefined
  return Math.min(Math.max(searchMinScorePercent.value, 0), 100) / 100
})

const normalizedAskMinScore = computed(() => {
  if (askMinScorePercent.value === null || askMinScorePercent.value === undefined) return undefined
  return Math.min(Math.max(askMinScorePercent.value, 0), 100) / 100
})

const normalizedDuplicateThreshold = computed(() => {
  if (duplicateThresholdPercent.value === null || duplicateThresholdPercent.value === undefined) return undefined
  return Math.min(Math.max(duplicateThresholdPercent.value, 0), 100) / 100
})

const selectedDuplicateChunkCount = computed(() =>
  documentChunks.value.filter((item) => item.duplicateInDocument).length
)

const chunkEmptyTitle = computed(() => {
  if (!selectedDocument.value) return '还没有选择资料'
  const status = String(selectedDocument.value.status || '').toUpperCase()
  if (status.includes('FAIL')) return '片段生成失败'
  if (['PENDING', 'PROCESSING', 'INDEXING'].includes(status)) return '片段还在生成'
  if (Number(selectedDocument.value.chunkCount || 0) > 0) return '片段暂未加载'
  return '这份资料还没有片段'
})

const chunkEmptyDescription = computed(() => {
  const document = selectedDocument.value
  if (!document) return '从资料列表打开一份资料后，可以查看切片、索引状态、重复片段和相似片段。'
  const status = statusLabel(document.status)
  if (String(document.status || '').toUpperCase().includes('FAIL')) {
    return `当前资料状态为「${status}」，可能是切片或索引失败；可以编辑资料内容后重新保存，或重建检索索引。`
  }
  if (['PENDING', 'PROCESSING', 'INDEXING'].includes(String(document.status || '').toUpperCase())) {
    return `当前资料状态为「${status}」，片段可能仍在生成；稍后刷新，或在确认内容无误后重建检索索引。`
  }
  if (!semanticEnabled.value) {
    return `${semanticDisabledReason.value} 如果保存后仍无片段，可以先检查资料内容是否为空或过短。`
  }
  return '资料内容可能为空、过短或尚未完成切片；建议编辑补充正文后保存，必要时再重建检索索引。'
})

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return toFriendlyMessage((error as { message?: unknown }).message, '资料暂时加载失败，请稍后重试。')
  }
  return '资料暂时加载失败，请稍后重试。'
}

const isFulfilled = <T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> =>
  result.status === 'fulfilled'

const addPartialLoadWarning = (label: string, error: unknown) => {
  const message = `${label}：${getErrorMessage(error)}`
  if (!partialLoadWarnings.value.includes(message)) {
    partialLoadWarnings.value = [...partialLoadWarnings.value, message]
  }
}

const clearPartialLoadWarnings = (...labels: string[]) => {
  partialLoadWarnings.value = partialLoadWarnings.value.filter((item) =>
    !labels.some((label) => item.startsWith(label))
  )
}

const partialLoadWarning = computed(() => partialLoadWarnings.value.join('；'))

const documentOptionLabel = (item: KnowledgeDocumentOptionVO) => {
  const type = item.documentType ? ` · ${documentTypeLabel(item.documentType)}` : ''
  return `${item.title || '知识资料'}${type}`
}

watch([knowledgeScopeType, scopedDocumentOptions], () => {
  if (!knowledgeScopeDocumentId.value) return
  const matched = scopedDocumentOptions.value.some((item) => item.id === knowledgeScopeDocumentId.value)
  if (!matched) {
    knowledgeScopeDocumentId.value = undefined
  }
})

const applyDocumentPage = () => {
  const pageNo = query.pageNo || 1
  const pageSize = query.pageSize || 10
  const start = (pageNo - 1) * pageSize
  documents.value = allDocuments.value.slice(start, start + pageSize)
  total.value = allDocuments.value.length
}

const documentQueryParams = () => ({
  pageNo: query.pageNo,
  pageSize: query.pageSize,
  title: query.title || undefined,
  documentType: query.documentType || undefined,
  status: query.status || undefined
})

const firstQueryValue = (value: unknown) => Array.isArray(value) ? value[0] : value

const parsePositiveQueryNumber = (value: unknown) => {
  const raw = firstQueryValue(value)
  if (!raw) return undefined
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

const loadDocuments = async () => {
  loading.value = true
  errorMessage.value = ''
  partialLoadWarnings.value = []
  try {
    const [page, stats, config, types, options] = await Promise.allSettled([
      getKnowledgeDocumentsApi(documentQueryParams()),
      getKnowledgeStatsApi(),
      getKnowledgeConfigApi(),
      getKnowledgeDocumentTypesApi(),
      getKnowledgeDocumentOptionsApi()
    ])

    if (!isFulfilled(page)) {
      allDocuments.value = []
      documents.value = []
      total.value = 0
      errorMessage.value = getErrorMessage(page.reason)
      return
    }

    allDocuments.value = page.value.records || []
    knowledgeStats.value = isFulfilled(stats) ? stats.value || null : null
    knowledgeConfig.value = isFulfilled(config) ? config.value || null : null
    documentTypeOptions.value = isFulfilled(types) ? types.value || [] : []
    documentOptions.value = isFulfilled(options) ? options.value || [] : []

    if (!isFulfilled(stats)) addPartialLoadWarning('统计概览加载失败，已暂用资料列表展示', stats.reason)
    if (!isFulfilled(config)) addPartialLoadWarning('知识库配置加载失败，上传和检索阈值使用默认口径', config.reason)
    if (!isFulfilled(types)) addPartialLoadWarning('资料类型加载失败，筛选项暂时不完整', types.reason)
    if (!isFulfilled(options)) addPartialLoadWarning('资料范围选项加载失败，搜索和问答仍可按类型继续', options.reason)

    applyDocumentPage()
  } catch (error) {
    allDocuments.value = []
    documents.value = []
    total.value = 0
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

const handleDocumentFilter = async () => {
  query.pageNo = 1
  await loadDocuments()
}

const resetDocumentFilter = async () => {
  query.pageNo = 1
  query.title = ''
  query.documentType = ''
  query.status = ''
  await loadDocuments()
}

const openKnowledgeFailureFromQuery = async () => {
  const documentId = parsePositiveQueryNumber(route.query.documentId)
  const chunkId = parsePositiveQueryNumber(route.query.chunkId)
  if (!documentId && !chunkId) return
  if (documentId) {
    query.pageNo = 1
    knowledgeScopeDocumentId.value = documentId
  }
  if (!allDocuments.value.length) {
    await loadDocuments()
  }
  let document = documentId ? allDocuments.value.find((item) => item.id === documentId) : undefined
  if (!document && documentId) {
    try {
      document = await getKnowledgeDocumentDetailApi(documentId)
    } catch {
      document = undefined
    }
  }
  if (document) {
    await openChunksDrawer(document)
  }
  if (chunkId) {
    await openChunkDetail({
      documentId,
      chunkId,
      title: document?.title,
      documentType: document?.documentType,
      snippet: '',
      score: undefined,
      matchType: 'VECTOR_FAILURE'
    })
  }
}

const handleSearch = async () => {
  if (!keyword.value) {
    searchResults.value = []
    searchTrace.value = null
    return
  }
  searching.value = true
  try {
    searchResults.value = await searchKnowledgeApi({
      keyword: keyword.value,
      limit: limit.value,
      minScore: normalizedSearchMinScore.value,
      documentId: knowledgeScopeDocumentId.value,
      documentType: knowledgeScopeType.value || undefined
    })
  } finally {
    searching.value = false
  }
}

const fillKnowledgeSearchExample = () => {
  keyword.value = '项目亮点'
}

const seedKnowledgeEvalQuestion = () => {
  const example = '我的项目里最值得讲的技术亮点是什么？'
  question.value = question.value.trim() || example
  keyword.value = keyword.value.trim() || '项目亮点'
}

const startNewKnowledgeEvalCase = () => {
  seedKnowledgeEvalQuestion()
  knowledgeEvaluation.value = null
  ElMessage.info('已填入评估问题，可以继续选择期望资料并保存为样本')
}

const handleSearchTrace = async () => {
  if (!keyword.value) {
    searchTrace.value = null
    ElMessage.warning('请先输入搜索关键词或问题')
    return
  }
  tracingSearch.value = true
  try {
    const trace = await traceKnowledgeSearchApi({
      keyword: keyword.value,
      limit: limit.value,
      minScore: normalizedSearchMinScore.value,
      documentId: knowledgeScopeDocumentId.value,
      documentType: knowledgeScopeType.value || undefined
    })
    searchTrace.value = trace || null
    searchResults.value = trace?.finalResults || []
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  } finally {
    tracingSearch.value = false
  }
}

const handleEvaluateKnowledge = async () => {
  const queryText = question.value.trim() || keyword.value.trim()
  if (!queryText) {
    ElMessage.warning('请先输入搜索关键词或问题')
    return
  }
  const expectedDocument = selectedKnowledgeDocumentOption.value
  const expectedReference = expectedDocument
    ? undefined
    : (searchResults.value[0] || askReferences.value[0])
  const hasExpectedSource = Boolean(expectedDocument || expectedReference || knowledgeScopeType.value)
  knowledgeEvaluating.value = true
  try {
    knowledgeEvaluation.value = await evaluateKnowledgeApi({
      limit: limit.value,
      minScore: normalizedAskMinScore.value ?? normalizedSearchMinScore.value,
      samples: [
        {
          caseId: 'current-query',
          query: queryText,
          expectedDocumentId: expectedDocument?.id ?? expectedReference?.documentId,
          expectedDocumentTitle: expectedDocument?.title ?? expectedReference?.title,
          expectedDocumentType: knowledgeScopeType.value || expectedDocument?.documentType || expectedReference?.documentType,
          retrievalDocumentId: knowledgeScopeDocumentId.value,
          retrievalDocumentType: knowledgeScopeType.value || undefined,
          expectNoAnswer: !hasExpectedSource,
          note: expectedDocument ? '当前选中的资料范围' : expectedReference ? '当前最高相关资料' : '未指定期望来源'
        }
      ]
    })
    const item = knowledgeEvaluation.value.items?.[0]
    const score = item?.topScore != null ? `，最高分 ${scoreLabel(item.topScore)}` : ''
    ElMessage.success(
      `评估${item?.passed ? '通过' : '完成'}：${knowledgeEvaluation.value.passedCount || 0}/${knowledgeEvaluation.value.evaluatedCount || 0}${score}`
    )
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  } finally {
    knowledgeEvaluating.value = false
  }
}

const knowledgeEvalExpectedLabel = (item: {
  expectNoAnswer?: boolean
  expectedDocumentTitle?: string
  expectedDocumentId?: number
  expectedDocumentType?: string
}) => {
  if (item.expectNoAnswer) return '期望无答案'
  if (item.expectedDocumentTitle) return item.expectedDocumentTitle
  if (item.expectedDocumentId) return '指定资料'
  if (item.expectedDocumentType) return item.expectedDocumentType
  return '任意来源'
}

const currentKnowledgeEvalCasePayload = () => {
  const queryText = question.value.trim() || keyword.value.trim()
  if (!queryText) return undefined
  const expectedDocument = selectedKnowledgeDocumentOption.value
  const expectedReference = expectedDocument ? undefined : (searchResults.value[0] || askReferences.value[0])
  const expectedDocumentId = expectedDocument?.id ?? expectedReference?.documentId
  const expectedDocumentTitle = expectedDocument?.title ?? expectedReference?.title
  const expectedDocumentType = knowledgeScopeType.value || expectedDocument?.documentType || expectedReference?.documentType
  const retrievalDocumentId = knowledgeScopeDocumentId.value
  const retrievalDocumentType = knowledgeScopeType.value || undefined
  const hasExpectedSource = Boolean(expectedDocumentId || expectedDocumentTitle || expectedDocumentType)
  const caseSeed = [queryText, expectedDocumentId || expectedDocumentTitle || expectedDocumentType || 'NO_SOURCE']
    .join('|')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .slice(0, 72)
    .toUpperCase()
  return {
    caseId: `RAG-${caseSeed || 'CURRENT'}`,
    query: queryText,
    expectedDocumentId,
    expectedDocumentTitle,
    expectedDocumentType,
    retrievalDocumentId,
    retrievalDocumentType,
    expectNoAnswer: !hasExpectedSource,
    note: expectedDocument
      ? '当前选中的资料范围'
      : expectedReference
        ? '当前最高相关资料'
        : '未指定期望来源',
    enabled: 1
  }
}

const fetchKnowledgeEvalCases = async () => {
  knowledgeEvalCaseLoading.value = true
  clearPartialLoadWarnings('评估样本加载失败')
  try {
    const result = await getKnowledgeEvalCasesApi(knowledgeEvalCaseQuery)
    knowledgeEvalCases.value = result.records || []
    knowledgeEvalCaseTotal.value = result.total || 0
  } catch (error) {
    knowledgeEvalCases.value = []
    knowledgeEvalCaseTotal.value = 0
    addPartialLoadWarning('评估样本加载失败', error)
  } finally {
    knowledgeEvalCaseLoading.value = false
  }
}

const fetchKnowledgeEvalRuns = async () => {
  knowledgeEvalRunLoading.value = true
  clearPartialLoadWarnings('评估运行加载失败')
  try {
    const result = await getKnowledgeEvalRunsApi(knowledgeEvalRunQuery)
    knowledgeEvalRuns.value = result.records || []
    knowledgeEvalRunTotal.value = result.total || 0
  } catch (error) {
    knowledgeEvalRuns.value = []
    knowledgeEvalRunTotal.value = 0
    addPartialLoadWarning('评估运行加载失败', error)
  } finally {
    knowledgeEvalRunLoading.value = false
  }
}

const openKnowledgeEvalRun = async (id?: number) => {
  if (!id) return
  knowledgeEvalRunDetailLoading.value = true
  try {
    knowledgeEvalLatestRun.value = await getKnowledgeEvalRunApi(id)
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  } finally {
    knowledgeEvalRunDetailLoading.value = false
  }
}

const refreshKnowledgeEvalWorkspace = async () => {
  clearPartialLoadWarnings('评估样本加载失败', '评估运行加载失败')
  await Promise.allSettled([fetchKnowledgeEvalCases(), fetchKnowledgeEvalRuns()])
  if (knowledgeEvalRuns.value[0]?.id) {
    await openKnowledgeEvalRun(knowledgeEvalRuns.value[0].id)
  } else {
    knowledgeEvalLatestRun.value = null
  }
}

const fetchAgentMemoryGovernance = async () => {
  clearPartialLoadWarnings('长期记忆治理加载失败')
  try {
    const result = await getAgentMemoriesApi({ pageNo: 1, pageSize: 200 })
    agentMemories.value = result.records || []
  } catch (error) {
    agentMemories.value = []
    addPartialLoadWarning('长期记忆治理加载失败', error)
  }
}

const refreshKnowledgePage = async () => {
  partialLoadWarnings.value = []
  await loadDocuments()
  await Promise.allSettled([refreshKnowledgeEvalWorkspace(), fetchAgentMemoryGovernance()])
}

const runGovernanceAction = async (action: KnowledgeGovernanceActionKind) => {
  if (action === 'ADD_DOCUMENT') {
    openCreate()
    return
  }
  if (action === 'RETRY_INDEX') {
    await handleRetryFailedVectors()
    return
  }
  if (action === 'SCAN_DUPLICATES') {
    await loadDuplicateReview()
    return
  }
  if (action === 'CHECK_EXACT_DUPLICATES') {
    await loadExactDuplicates()
    return
  }
  if (action === 'ADD_EVAL_CASE') {
    startNewKnowledgeEvalCase()
    return
  }
  if (action === 'RUN_EVAL') {
    await runKnowledgeEvalCases()
    return
  }
  if (action === 'RETRY_ASK') {
    seedKnowledgeEvalQuestion()
    return
  }
  if (action === 'OPEN_MEMORY') {
    router.push('/agent/memory')
  }
}

const saveCurrentKnowledgeEvalCase = async () => {
  if (knowledgeEvalSaving.value) return
  const payload = currentKnowledgeEvalCasePayload()
  if (!payload) {
    ElMessage.warning('请先输入搜索关键词或问题')
    return
  }
  const confirmed = await confirmDangerActionPreview({
    title: '保存知识库评估样本',
    action: '把当前问题和期望来源保存为检索评估样本',
    target: `查询内容：${payload.query}；期望来源：${knowledgeEvalExpectedLabel(payload)}`,
    impact: '保存后，这个样本会进入知识库评估数据集；后续运行评估时会用它检查检索命中、引用可信度和回答是否有依据。',
    rollback: '如样本设置不准确，可以在样本列表删除后重新保存；已经产生的历史评估运行不会自动改写。',
    audit: `样本标识：${payload.caseId}；检索范围：${payload.retrievalDocumentId || payload.retrievalDocumentType || '当前范围'}`,
    tips: [
      payload.expectNoAnswer ? '当前未指定期望资料，系统会把它作为“期望无答案”样本。' : '确认期望来源就是这个问题应该引用的资料。',
      '建议使用真实问题，避免把随手输入的测试词保存为长期评估样本。'
    ],
    confirmButtonText: '确认保存样本'
  })
  if (!confirmed) return
  knowledgeEvalSaving.value = true
  try {
    await saveKnowledgeEvalCaseApi(payload)
    ElMessage.success('评估样本已保存')
    await refreshKnowledgeEvalWorkspace()
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  } finally {
    knowledgeEvalSaving.value = false
  }
}

const runKnowledgeEvalCases = async () => {
  if (!knowledgeEvalCaseTotal.value) {
    ElMessage.warning('请先保存评估样本')
    return
  }
  const minScore = normalizedAskMinScore.value ?? normalizedSearchMinScore.value
  const confirmed = await confirmDangerActionPreview({
    title: '运行知识库评估样本',
    action: '运行全部启用的知识库检索评估样本',
    target: `当前样本 ${knowledgeEvalCaseTotal.value || 0} 个；实际运行范围以启用状态为准。`,
    impact: '会批量执行检索评估，可能调用知识库问答和模型能力，并写入一条新的评估运行记录。',
    rollback: '评估运行产生的调用资源不能撤销；如样本设置不合适，可调整或删除样本后重新运行。',
    audit: '系统会记录运行信息、样本数量、通过率、失败原因和时间，便于后续追踪检索质量。',
    tips: [
      `最低引用分：${scoreLabel(minScore)}`,
      '确认启用样本已经代表当前要巡检的问题范围。',
      '如只是试查单个问题，请优先使用上方“评估检索”。'
    ],
    confirmButtonText: '确认运行'
  })
  if (!confirmed) return
  knowledgeEvalRunning.value = true
  try {
    const result = await runKnowledgeEvalApi({
      onlyEnabled: true,
      minScore
    })
    knowledgeEvalLatestRun.value = result
    ElMessage.success(
      `评估运行完成：${result.passedCount || 0}/${result.evaluatedCount || 0}，通过率 ${formatRate(result.passRate)}`
    )
    await fetchKnowledgeEvalRuns()
    if (result.id) {
      await openKnowledgeEvalRun(result.id)
    }
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  } finally {
    knowledgeEvalRunning.value = false
  }
}

const deleteKnowledgeEvalCase = async (id?: number) => {
  if (!id) return
  const confirmed = await confirmDangerActionPreview({
    title: '删除评估样本',
    action: '删除该知识库检索评估样本',
    target: '选中的评估样本',
    impact: '删除后不会影响资料内容，但后续检索评估将不再使用该样本，评估覆盖面会减少。',
    rollback: '系统不会自动恢复已删除样本；如误删，需要重新新增评估样本。',
    audit: '删除操作会记录对应评估样本。',
    tips: ['确认该样本不再用于评估检索质量。', '确认删除后仍有足够样本覆盖常见问题。'],
    confirmButtonText: '确认删除'
  })
  if (!confirmed) return
  try {
    await deleteKnowledgeEvalCaseApi(id, {
      confirm: true,
      dryRun: false,
      reason: 'user knowledge delete eval case',
      idempotencyKey: createOperationIdempotencyKey('knowledge-delete-eval-case')
    })
    ElMessage.success('评估样本已删除')
    await fetchKnowledgeEvalCases()
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  }
}

const cancelActiveKnowledgeAskStream = () => {
  activeKnowledgeAskStream?.cancel()
  activeKnowledgeAskStream = null
}

const handleAsk = async () => {
  if (!question.value.trim()) {
    ElMessage.warning('请先输入问题')
    return
  }
  cancelActiveKnowledgeAskStream()
  const askRunId = ++knowledgeAskRunId
  asking.value = true
  answer.value = ''
  askInsufficientReferences.value = false
  askReferences.value = []
  askReferenceCount.value = 0
  askTopReferenceScore.value = undefined
  askMinReferenceScore.value = undefined
  askCitationValid.value = undefined
  askAnswerGrounded.value = undefined
  askCitationWarning.value = ''
  askCitedReferenceNumbers.value = []
  askInvalidReferenceNumbers.value = []

  const payload = {
    question: question.value.trim(),
    limit: Math.min(limit.value || 5, 10),
    minScore: normalizedAskMinScore.value,
    documentId: knowledgeScopeDocumentId.value,
    documentType: knowledgeScopeType.value || undefined
  }

  try {
    await new Promise<void>((resolve) => {
      let settled = false
      const finish = () => {
        if (!settled) {
          settled = true
          resolve()
        }
      }
      const stream = askKnowledgeStreamApi(payload, {
        onReferences: (references) => {
          if (knowledgeAskRunId !== askRunId) return
          askReferences.value = references
          askReferenceCount.value = references.length
          askInsufficientReferences.value = references.length === 0
        },
        onToken: (delta) => {
          if (knowledgeAskRunId !== askRunId) return
          answer.value += delta
        },
        onCitation: (result) => {
          if (knowledgeAskRunId !== askRunId) return
          if (result.answer) answer.value = result.answer
          askCitationValid.value = result.citationValid
          askAnswerGrounded.value = result.answerGrounded
          askCitationWarning.value = result.citationWarning || ''
          askCitedReferenceNumbers.value = result.citedReferenceNumbers || []
          askInvalidReferenceNumbers.value = result.invalidReferenceNumbers || []
          if (result.insufficientReferences !== undefined) {
            askInsufficientReferences.value = !!result.insufficientReferences
          }
        },
        onDone: () => finish(),
        onError: async (message) => {
          if (knowledgeAskRunId !== askRunId) {
            finish()
            return
          }
          // 流式失败时降级到同步接口，保证可用性
          try {
            const result = await askKnowledgeApi(payload)
            answer.value = result.answer || ''
            askInsufficientReferences.value = !!result.insufficientReferences
            askReferences.value = result.references || []
            askReferenceCount.value = result.referenceCount ?? askReferences.value.length
            askTopReferenceScore.value = result.topReferenceScore
            askMinReferenceScore.value = result.minReferenceScore
            askCitationValid.value = result.citationValid
            askAnswerGrounded.value = result.answerGrounded
            askCitationWarning.value = result.citationWarning || ''
            askCitedReferenceNumbers.value = result.citedReferenceNumbers || []
            askInvalidReferenceNumbers.value = result.invalidReferenceNumbers || []
          } catch {
            ElMessage.error(message || '问答失败，请稍后重试')
          } finally {
            finish()
          }
        }
      })
      activeKnowledgeAskStream = stream
      void stream.finished
        .catch(() => undefined)
        .finally(() => {
          if (activeKnowledgeAskStream === stream) {
            activeKnowledgeAskStream = null
          }
          finish()
        })
    })
  } finally {
    if (knowledgeAskRunId === askRunId) {
      asking.value = false
    }
  }
}

const openChunksDrawer = async (row: KnowledgeDocumentVO) => {
  selectedDocument.value = row
  chunksDrawerVisible.value = true
  chunksLoading.value = true
  similarChunkMap.value = {}
  try {
    documentChunks.value = await getKnowledgeDocumentChunksApi(row.id)
  } finally {
    chunksLoading.value = false
  }
}

const loadSimilarChunks = async (chunk: KnowledgeChunkVO) => {
  if (!chunk.id) return
  if (similarChunkMap.value[chunk.id]?.length) {
    similarChunkMap.value = { ...similarChunkMap.value, [chunk.id]: [] }
    return
  }
  similarLoadingId.value = chunk.id
  try {
    const result = await getKnowledgeSimilarChunksApi(chunk.id, 5)
    similarChunkMap.value = { ...similarChunkMap.value, [chunk.id]: result }
    if (!result.length) {
      ElMessage.info('暂未找到相似片段')
    }
  } finally {
    similarLoadingId.value = null
  }
}

const openChunkDetail = async (item: KnowledgeSearchResultVO) => {
  if (!item.chunkId) return
  chunkDetailVisible.value = true
  selectedChunkSource.value = item
  chunkDetailLoadingId.value = item.chunkId
  try {
    selectedChunkDetail.value = await getKnowledgeChunkApi(item.chunkId)
  } finally {
    chunkDetailLoadingId.value = null
  }
}

const openDuplicateReviewChunk = async (item: KnowledgeDuplicateReviewItemVO) => {
  if (!item.chunkId) return
  await openChunkDetail({
    documentId: item.documentId,
    chunkId: item.chunkId,
    title: item.title,
    documentType: item.documentType,
    snippet: item.snippet,
    sourceRef: item.sourceRef,
    score: item.topScore,
    matchType: 'DUPLICATE_REVIEW'
  })
}

const openExactDuplicateChunk = async (chunk: KnowledgeChunkVO) => {
  if (!chunk.id) return
  const document = documentOptions.value.find((item) => item.id === chunk.documentId)
  await openChunkDetail({
    documentId: chunk.documentId,
    chunkId: chunk.id,
    title: document?.title,
    documentType: document?.documentType,
    snippet: chunk.content,
    sourceRef: chunk.sourceRef,
    score: 1,
    matchType: 'EXACT_DUPLICATE'
  })
}

const refreshDuplicateReview = async () => {
  duplicateReview.value = await getKnowledgeDuplicateReviewApi({
    limit: 20,
    threshold: normalizedDuplicateThreshold.value
  })
}

const loadDuplicateReview = async () => {
  if (duplicateReviewLoading.value) return
  duplicateReviewVisible.value = true
  duplicateReviewLoading.value = true
  try {
    await refreshDuplicateReview()
    if (!duplicateReview.value?.vectorEnabled) {
      ElMessage.warning('语义检索未启用，无法扫描近重复片段')
    } else if (!duplicateReview.value?.candidateCount) {
      ElMessage.success('暂未发现近重复候选')
    }
  } finally {
    duplicateReviewLoading.value = false
  }
}

const handleDeleteDuplicateReviewChunk = async (item: KnowledgeDuplicateReviewItemVO) => {
  if (!item.chunkId) return
  const previewChunk: KnowledgeChunkVO = {
    id: item.chunkId,
    documentId: item.documentId,
    chunkIndex: item.chunkIndex,
    sourceRef: item.sourceRef,
    content: item.snippet,
    duplicateInDocument: true
  }
  const localPreview = buildKnowledgeInfluencePreview({
    targetKind: 'CHUNK',
    document: findKnowledgeDocument(item.documentId),
    chunk: previewChunk,
    searchResults: item.matches || [],
    duplicateReview: duplicateReview.value,
    stats: knowledgeStats.value,
    memories: agentMemories.value,
    minScore: normalizedSearchMinScore.value ?? knowledgeConfig.value?.askMinScore
  })
  let preview = localPreview
  try {
    preview = withBackendImpactPreview(localPreview, await getKnowledgeChunkImpactPreviewApi(item.chunkId))
  } catch (error) {
    if (isAuthOrForbiddenError(error)) throw error
    preview = withBackendImpactPreview(localPreview, null, toFriendlyMessage(error))
  }
  const previewText = influencePreviewDangerText(preview)
  const confirmed = await confirmDangerActionPreview({
    title: '删除近重复候选',
    action: '删除近重复候选片段并同步清理索引',
    target: `第 ${(item.chunkIndex ?? 0) + 1} 段`,
    impact: `该片段会从资料片段中删除，并同步清理对应检索索引，后续语义检索不再返回该片段。${previewText}`,
    rollback: '系统不会自动恢复已删除片段；如误删，需要重新导入或重新保存资料生成片段。',
    audit: '删除操作会记录对应片段和当前账号。',
    tips: ['确认它确实是重复或低价值片段。', '确认删除后不会丢失唯一有效资料。'],
    confirmButtonText: '确认删除'
  })
  if (!confirmed) return
  deletingChunkId.value = item.chunkId
  try {
    await deleteKnowledgeChunkApi(item.chunkId, {
      confirm: true,
      dryRun: false,
      reason: 'user knowledge delete near duplicate chunk',
      idempotencyKey: createOperationIdempotencyKey('knowledge-delete-chunk')
    })
    ElMessage.success('近重复候选已删除')
    similarChunkMap.value = {}
    if (selectedChunkDetail.value?.id === item.chunkId) {
      selectedChunkDetail.value = null
      selectedChunkSource.value = null
      chunkDetailVisible.value = false
    }
    await refreshDuplicateReview()
    await loadDocuments()
  } finally {
    deletingChunkId.value = null
  }
}

const loadExactDuplicates = async (documentId?: number, documentType?: string) => {
  exactDuplicateScopeDocumentId.value = documentId
  exactDuplicateScopeType.value = documentType || ''
  exactDuplicateVisible.value = true
  exactDuplicateLoading.value = true
  try {
    exactDuplicateGroups.value = await getKnowledgeExactDuplicatesApi(exactDuplicateScopeParams())
    if (!exactDuplicateGroups.value.length) {
      ElMessage.success('暂未发现完全重复片段')
    }
  } finally {
    exactDuplicateLoading.value = false
  }
}

const handleCleanupExactDuplicates = async () => {
  exactDuplicateCleanupLoading.value = true
  try {
    const preview = await cleanupKnowledgeExactDuplicatesApi({ dryRun: true, ...exactDuplicateScopeParams() })
    exactDuplicateCleanup.value = preview
    if (!preview.deleteCandidateCount) {
      ElMessage.success('暂无需要清理的完全重复片段')
      return
    }
    const confirmed = await confirmDangerActionPreview({
      title: '清理完全重复片段',
      action: '按预览结果删除完全重复片段并同步清理索引',
      target: `${preview.duplicateGroupCount || 0} 组重复，${preview.deleteCandidateCount || 0} 个待删除片段`,
      impact: '会删除完全重复片段并同步清理对应检索索引，后续检索会减少重复命中。基础影响范围：重复片段将转为 MERGE_DUPLICATE_KNOWLEDGE 治理行动；清理后投递包、面试训练、报告和 Agent 计划引用应以刷新后的检索结果为准。',
      rollback: '系统不会自动恢复清理结果；如误删，需要重新导入或重新保存资料生成片段。',
      audit: '清理操作会按当前筛选范围、删除数量和当前账号记录。',
      tips: ['已完成 dry-run 预览并确认待删除数量。', '确认当前筛选范围就是要清理的资料范围。'],
      confirmButtonText: '确认清理'
    })
    if (!confirmed) return
    const result = await cleanupKnowledgeExactDuplicatesApi({
      ...exactDuplicateScopeParams(),
      confirm: true,
      dryRun: false,
      reason: 'user knowledge cleanup exact duplicate chunks',
      idempotencyKey: createOperationIdempotencyKey('knowledge-duplicate-cleanup')
    })
    exactDuplicateCleanup.value = result
    ElMessage.success(`已清理 ${result.deletedCount || 0} 个重复片段`)
    exactDuplicateGroups.value = await getKnowledgeExactDuplicatesApi(exactDuplicateScopeParams())
    await loadDocuments()
  } finally {
    exactDuplicateCleanupLoading.value = false
  }
}

const handleDeleteChunk = async (chunk: KnowledgeChunkVO) => {
  if (!chunk.id) return
  const previewText = influencePreviewDangerText(await loadChunkInfluencePreview(chunk))
  const confirmed = await confirmDangerActionPreview({
    title: '删除知识片段',
    action: '删除该知识片段并同步清理索引',
    target: `第 ${(chunk.chunkIndex ?? 0) + 1} 段`,
    impact: `该片段会从资料中移除，并同步清理对应检索索引，后续检索和问答不再引用这段内容。${previewText}`,
    rollback: '系统不会自动恢复已删除片段；如误删，需要重新导入或重新保存资料生成片段。',
    audit: '删除操作会记录对应片段和当前账号。',
    tips: ['确认这段内容不再需要被检索或引用。', '确认删除后资料仍保留完整上下文。'],
    confirmButtonText: '确认删除'
  })
  if (!confirmed) return
  deletingChunkId.value = chunk.id
  try {
    await deleteKnowledgeChunkApi(chunk.id, {
      confirm: true,
      dryRun: false,
      reason: 'user knowledge delete chunk',
      idempotencyKey: createOperationIdempotencyKey('knowledge-delete-chunk')
    })
    ElMessage.success('片段已删除')
    similarChunkMap.value = {}
    if (selectedDocument.value?.id) {
      documentChunks.value = await getKnowledgeDocumentChunksApi(selectedDocument.value.id)
    }
    await loadDocuments()
  } finally {
    deletingChunkId.value = null
  }
}

const openCreate = () => {
  editingDocumentId.value = null
  Object.assign(form, {
    title: '',
    documentType: 'NOTE',
    content: ''
  })
  dialogVisible.value = true
}

const openEdit = async (row: KnowledgeDocumentVO) => {
  editingLoadingId.value = row.id
  try {
    const detail = await getKnowledgeDocumentDetailApi(row.id)
    editingDocumentId.value = row.id
    Object.assign(form, {
      title: detail.title || '',
      documentType: detail.documentType || 'NOTE',
      content: detail.content || ''
    })
    dialogVisible.value = true
  } finally {
    editingLoadingId.value = null
  }
}

const openVersionsDrawer = async (row: KnowledgeDocumentVO) => {
  versionDocument.value = row
  versionsDrawerVisible.value = true
  versionsLoadingId.value = row.id
  try {
    documentVersions.value = await getKnowledgeDocumentVersionsApi(row.id)
  } finally {
    versionsLoadingId.value = null
  }
}

const handleRestoreVersion = async (version: KnowledgeDocumentVersionVO) => {
  if (!versionDocument.value?.id || !version.id) return
  const confirmed = await confirmDangerActionPreview({
    title: '恢复历史版本',
    action: '将资料恢复到选中的历史版本',
    target: `${versionDocument.value.title || '知识资料'} · v${version.versionNo || 0}`,
    impact: '当前内容会先保存为新的历史版本，然后恢复选中版本，并重建片段和检索索引。',
    rollback: '可以再次从版本列表选择其他版本恢复；系统不会自动撤销本次恢复。',
    audit: '恢复操作会记录对应资料、版本和当前账号。',
    tips: ['确认当前内容已保存或可以被历史版本覆盖。', '确认恢复后允许重建片段和检索索引。'],
    confirmButtonText: '确认恢复'
  })
  if (!confirmed) return
  restoringVersionId.value = version.id
  try {
    const result = await restoreKnowledgeDocumentVersionApi(versionDocument.value.id, version.id, {
      confirm: true,
      dryRun: false,
      reason: 'user knowledge restore document version',
      idempotencyKey: createOperationIdempotencyKey('knowledge-restore-version')
    })
    ElMessage.success(`已恢复到 v${version.versionNo || 0}`)
    versionDocument.value = result
    documentVersions.value = await getKnowledgeDocumentVersionsApi(result.id)
    await loadDocuments()
  } finally {
    restoringVersionId.value = null
  }
}

const saveDocument = async () => {
  const title = form.title.trim()
  const content = form.content.trim()
  if (!title || !content) {
    ElMessage.warning('请填写标题和内容')
    return
  }
  const editingId = editingDocumentId.value
  const documentType = form.documentType || 'NOTE'
  const confirmed = await confirmDangerActionPreview({
    title: editingId ? '更新知识资料' : '新增知识资料',
    action: editingId ? '更新资料并重新生成知识库索引' : '新增资料并生成知识库索引',
    target: `${title} · ${documentTypeLabel(documentType)} · 约 ${content.length} 字`,
    impact: semanticEnabled.value
      ? '保存后会重新切分片段并写入个人知识库索引，后续知识库问答、引用校验、评估样本和推荐解释可能引用这些片段。'
      : '保存后会生成关键词检索片段；当前语义检索未启用，后续启用语义检索或手动重建索引时会重新处理该资料。',
    rollback: editingId
      ? '系统会保留资料版本记录，可从版本列表恢复历史版本；若索引结果不符合预期，也可以再次编辑后保存。'
      : '如新增错误，可以删除资料并清理片段/索引；删除不会自动恢复，需要重新上传或创建。',
    audit: '资料保存会记录当前资料、账号和索引结果，便于后续追踪问答引用来源。',
    tips: ['确认资料内容可作为后续回答和训练依据。', '确认内容中没有不希望进入个人知识库检索的敏感信息。'],
    confirmButtonText: editingId ? '确认更新并索引' : '确认新增并索引'
  })
  if (!confirmed) return
  saving.value = true
  try {
    const payload = {
      title,
      documentType,
      content
    }
    const result = editingId
      ? await updateKnowledgeDocumentApi(editingId, payload)
      : await createKnowledgeDocumentApi(payload)
    dialogVisible.value = false
    showKnowledgeIndexResult(result, editingId ? '资料已更新' : '资料已索引')
    editingDocumentId.value = null
    await loadDocuments()
  } finally {
    saving.value = false
  }
}

const handleKnowledgeFileChange = async (uploadFile: UploadFile) => {
  const file = uploadFile.raw
  if (!file) return
  const lowerName = file.name.toLowerCase()
  const extension = lowerName.includes('.') ? lowerName.split('.').pop() || '' : ''
  const supported = uploadExtensions.value.includes(extension)
  if (!supported) {
    ElMessage.warning(`仅支持 ${uploadAccept.value || uploadExtensionsLabel.value} 文件`)
    return
  }
  if (file.size > uploadMaxBytes.value) {
    ElMessage.warning(`文件大小不能超过 ${uploadLimitLabel.value}`)
    return
  }
  const documentType = documentTypeFromFileName(lowerName)
  const confirmed = await confirmDangerActionPreview({
    title: '上传知识资料',
    action: '上传文件并生成个人知识库索引',
    target: `${file.name} · ${documentTypeLabel(documentType)} · ${formatFileSize(file.size)}`,
    impact: semanticEnabled.value
      ? '上传后会解析文件内容、切分片段并写入个人知识库索引，后续知识库问答、引用校验和评估运行可能引用这些片段。'
      : '上传后会解析文件内容并生成关键词检索片段；当前语义检索未启用，后续启用语义检索或手动重建索引时会重新处理该资料。',
    rollback: '如文件选错，可以删除资料并清理片段/索引；删除不会自动恢复，需要重新上传正确文件。',
    audit: '上传资料会按文件名、资料类型、当前账号和索引结果记录，便于后续追踪来源。',
    tips: ['确认文件内容适合作为后续回答和训练依据。', '确认文件中没有不希望进入个人知识库检索的敏感信息。'],
    confirmButtonText: '确认上传并索引'
  })
  if (!confirmed) return
  uploading.value = true
  try {
    const result = await uploadKnowledgeDocumentApi(file, documentType)
    showKnowledgeIndexResult(result, '上传完成')
    await loadDocuments()
  } finally {
    uploading.value = false
  }
}

const documentTypeFromFileName = (lowerName: string) => {
  if (lowerName.endsWith('.pdf')) return 'PDF'
  if (lowerName.endsWith('.doc') || lowerName.endsWith('.docx')) return 'WORD'
  if (lowerName.endsWith('.txt')) return 'TEXT'
  return 'MARKDOWN'
}

const showKnowledgeIndexResult = (result: KnowledgeDocumentVO, actionLabel: string) => {
  if (result.duplicateDocument) {
    const title = result.title ? `「${result.title}」` : '这份资料'
    ElMessage.warning(`资料已存在：${title}`)
    return
  }
  const parts = [`${actionLabel}：生成 ${result.chunkCount || 0} 个片段`]
  if (result.duplicateChunkCount) {
    parts.push(`跳过 ${result.duplicateChunkCount} 个完全重复片段`)
  }
  if (result.nearDuplicateChunkCount) {
    parts.push(`${result.nearDuplicateChunkCount} 个片段疑似语义重复`)
  }
  const message = parts.join('，')
  if (result.nearDuplicateChunkCount) {
    ElMessage.warning(message)
    return
  }
  ElMessage.success(message)
}

const createKnowledgeVectorIdempotencyKey = (operation: string) => {
  return createOperationIdempotencyKey(operation)
}

const handleRebuildVectors = async (documentId?: number, documentTitle?: string) => {
  if (!semanticEnabled.value) {
    ElMessage.warning(semanticDisabledReason.value)
    return
  }
  const scopeLabel = documentTitle ? `资料「${documentTitle}」` : '全部资料'
  const targetDocument = documentId ? allDocuments.value.find((item) => item.id === documentId) || null : null
  const previewText = targetDocument
    ? influencePreviewDangerText(await loadDocumentInfluencePreview(targetDocument))
    : `基础影响范围：约 ${documentTotal.value} 篇资料、${chunkTotal.value} 个片段；重建期间建议将检索、问答、投递包、面试训练和报告结论降级为待复核。`
  const confirmed = await confirmDangerActionPreview({
    title: '重建知识库检索索引',
    action: '重建知识库语义检索索引',
    target: scopeLabel,
    impact: `会重新切分并写入检索索引，可能消耗语义检索服务调用资源；请求完成前请不要重复点击。${previewText}`,
    rollback: '重建结果不会自动回到旧索引；如结果异常，需要再次重建或检查资料内容。',
    audit: '重建任务会生成处理记录或统计结果，便于后续追踪。',
    tips: ['确认语义检索能力已启用。', '确认当前资料内容已经保存完成。'],
    confirmButtonText: '确认重建'
  })
  if (!confirmed) return
  rebuilding.value = true
  rebuildTargetLabel.value = scopeLabel
  try {
    const result = await rebuildKnowledgeVectorsApi({
      documentId,
      confirm: true,
      dryRun: false,
      reason: documentId ? 'user knowledge manual rebuild document vector' : 'user knowledge manual rebuild all vectors',
      idempotencyKey: createKnowledgeVectorIdempotencyKey('knowledge-rebuild')
    })
    rebuildResult.value = result
    const duplicateSummary = result.duplicateChunkCount ? `，重复片段 ${result.duplicateChunkCount || 0} 个` : ''
    const summary = `重建完成：文档 ${result.documentCount || 0} 篇，片段 ${result.chunkCount || 0} 个，索引 ${result.vectorUpdated || 0} 条${duplicateSummary}`
    rebuildDialogVisible.value = true
    if ((result.errors || []).length || (result.failedDocuments || []).length) {
      ElMessage.warning(summary)
      return
    }
    ElMessage.success(summary)
  } finally {
    rebuilding.value = false
  }
}

const handleRetryFailedVectors = async () => {
  if (!semanticEnabled.value) {
    ElMessage.warning(semanticDisabledReason.value)
    return
  }
  const previewText = `基础影响范围：失败 ${failedChunkCount.value} 个、待索引 ${pendingChunkCount.value} 个片段；重试前相关检索、问答、训练队列和 Agent 计划应按降级证据处理。`
  const confirmed = await confirmDangerActionPreview({
    title: '重试知识库检索索引',
    action: '重试失败或超时的知识库检索索引任务',
    target: '当前用户最多 500 个失败或超时待索引片段所属文档',
    impact: `会再次提交检索索引任务，期间可能消耗语义检索服务调用资源；成功后相关资料的语义检索可用性会更新。${previewText}`,
    rollback: '重试结果不会自动回到重试前状态；如仍失败，需要查看任务错误并修正资料或配置。',
    audit: '重试任务会保留处理记录、成功数量和失败数量。',
    tips: ['确认当前不是重复点击造成的短时间重试。', '确认语义检索服务和索引配置可用。'],
    confirmButtonText: '确认重试'
  })
  if (!confirmed) return
  retryingFailedVectors.value = true
  rebuildTargetLabel.value = '失败或超时待索引记录'
  try {
    const result = await retryFailedKnowledgeVectorsApi({
      limit: 500,
      confirm: true,
      dryRun: false,
      reason: 'user knowledge manual retry failed vectors',
      idempotencyKey: createKnowledgeVectorIdempotencyKey('knowledge-retry')
    })
    rebuildResult.value = result
    rebuildDialogVisible.value = true
    const deleteSummary = result.vectorDeleted ? `，清理索引 ${result.vectorDeleted || 0} 条` : ''
    const summary = `重试完成：文档 ${result.documentCount || 0} 篇，片段 ${result.chunkCount || 0} 个，索引 ${result.vectorUpdated || 0} 条${deleteSummary}`
    if ((result.errors || []).length || (result.failedDocuments || []).length) {
      ElMessage.warning(summary)
      return
    }
    ElMessage.success(summary)
  } finally {
    retryingFailedVectors.value = false
  }
}

const handleDelete = async (row: KnowledgeDocumentVO) => {
  const previewText = influencePreviewDangerText(await loadDocumentInfluencePreview(row))
  const confirmed = await confirmDangerActionPreview({
    title: '删除知识资料',
    action: '删除该知识资料并同步清理索引',
    target: row.title || '知识资料',
    impact: `资料、片段和对应检索索引都会被清理，后续检索、问答和评估不会再引用该资料。${previewText}`,
    rollback: '系统不会自动恢复已删除资料；如误删，需要重新上传或重新创建资料。',
    audit: '删除操作会记录对应资料和当前账号。',
    tips: ['确认这份资料不再作为训练或问答依据。', '确认删除后不会影响仍在使用的评估样本和问答引用。'],
    confirmButtonText: '确认删除'
  })
  if (!confirmed) return
  deletingId.value = row.id
  try {
    await deleteKnowledgeDocumentApi(row.id, {
      confirm: true,
      dryRun: false,
      reason: 'user knowledge delete document',
      idempotencyKey: createOperationIdempotencyKey('knowledge-delete-document')
    })
    ElMessage.success('资料已删除')
    searchResults.value = []
    askReferences.value = []
    askInsufficientReferences.value = false
    answer.value = ''
    askReferenceCount.value = 0
    askTopReferenceScore.value = undefined
    askMinReferenceScore.value = undefined
    askCitationValid.value = undefined
    askAnswerGrounded.value = undefined
    askCitationWarning.value = ''
    askCitedReferenceNumbers.value = []
    askInvalidReferenceNumbers.value = []
    await loadDocuments()
  } finally {
    deletingId.value = null
  }
}

const resultKey = (item: KnowledgeSearchResultVO) =>
  `${item.documentId || 'doc'}-${item.chunkId || 'whole'}-${item.matchType || 'match'}`

const matchLabel = (value?: string) => {
  if (value === 'HYBRID') return '混合匹配'
  if (value === 'VECTOR') return '语义匹配'
  if (value === 'KEYWORD_CHUNK') return '片段命中'
  if (value === 'KEYWORD_DOCUMENT') return '文档命中'
  return '匹配'
}

const scoreLabel = (score?: number) => {
  if (score === undefined || score === null) return '--'
  return `${Math.round(score * 100)}%`
}

const formatRate = (value?: number) => {
  if (value === undefined || value === null) return '--'
  const rate = Number(value)
  if (!Number.isFinite(rate)) return '--'
  return `${rate.toFixed(rate >= 99 ? 0 : 1).replace(/\.0$/, '')}%`
}

const trustText = (value?: boolean) => {
  if (value === true) return '可信'
  if (value === false) return '需复核'
  return '待确认'
}

const trustTagType = (value?: boolean) => {
  if (value === true) return 'success'
  if (value === false) return 'warning'
  return 'info'
}

const knowledgeTrustLabel = (item?: Pick<KnowledgeEvaluationItemVO, 'citationValid' | 'answerGrounded'>) => {
  if (!item) return '--'
  if (item.citationValid === true && item.answerGrounded === true) return '可信'
  if (item.citationValid === false || item.answerGrounded === false) return '需复核'
  return '未知'
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const highlightSnippet = (item: KnowledgeSearchResultVO) => {
  const value = item.highlightedSnippet || item.snippet || '--'
  return escapeHtml(value)
    .replace(/\[\[H\]\]/g, '<mark>')
    .replace(/\[\[\/H\]\]/g, '</mark>')
}

const shortHash = (hash?: string) => {
  if (!hash) return '--'
  return hash.length > 16 ? `${hash.slice(0, 8)}...${hash.slice(-6)}` : hash
}

const statusType = (status?: string) => {
  if (status === 'INDEXED') return 'success'
  if (status?.includes('FAIL')) return 'danger'
  return 'info'
}

const statusLabel = (status?: string) => {
  const value = status || 'PENDING'
  const map: Record<string, string> = {
    INDEXED: '已索引',
    PENDING: '待索引',
    FAILED: '索引失败',
    DISABLED: '未启用',
    DELETED: '已删除'
  }
  return map[value] || '状态待确认'
}

const indexMetaLabel = (item?: { indexStatus?: string | null; indexedAt?: string | null }) => {
  const label = statusLabel(item?.indexStatus || undefined)
  return item?.indexedAt ? `${label} · ${formatDateTime(item.indexedAt)}` : label
}

const vectorJobStatusLabel = (status?: string) => {
  const value = String(status || '').toUpperCase()
  const map: Record<string, string> = {
    RUNNING: '运行中',
    SUCCESS: '成功',
    FAILED: '失败'
  }
  return map[value] || '待查询'
}

const evalRunStatusLabel = (status?: string) => {
  const value = String(status || '').toUpperCase()
  const map: Record<string, string> = {
    PENDING: '待运行',
    RUNNING: '运行中',
    SUCCESS: '已完成',
    COMPLETED: '已完成',
    FAILED: '运行失败'
  }
  return map[value] || (status ? '状态待确认' : '-')
}

const openKnowledgeVectorJob = (result?: KnowledgeVectorRebuildVO | null) => {
  if (!result?.vectorJobId) return
  rebuildDialogVisible.value = false
  router.push({
    path: '/admin/analytics/ai',
    query: {
      vectorJobId: String(result.vectorJobId),
      vectorJobType: result.vectorJobType || 'KNOWLEDGE_REBUILD',
      vectorScopeType: result.vectorScopeType || 'KNOWLEDGE',
      vectorJobStatus: result.vectorJobStatus || undefined
    }
  })
}

onMounted(async () => {
  await refreshKnowledgePage()
  await openKnowledgeFailureFromQuery()
})

onBeforeUnmount(() => {
  knowledgeAskRunId += 1
  cancelActiveKnowledgeAskStream()
})

watch(
  () => [route.query.documentId, route.query.chunkId],
  async () => {
    await openKnowledgeFailureFromQuery()
  }
)
</script>

<style scoped lang="scss">
.knowledge-hero,
.summary-grid,
.workspace-grid,
.section-head,
.hero-actions,
.result-title,
.result-meta {
  display: flex;
  gap: 16px;
}

.knowledge-hero {
  align-items: flex-end;
  justify-content: space-between;
  padding: 24px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.14), rgba(34, 197, 94, 0.08)), var(--app-surface);
  box-shadow: var(--app-shadow);
}

.knowledge-hero h1,
.section-head h2 {
  margin: 0;
}

.knowledge-hero h1 {
  margin-top: 8px;
  font-size: 28px;
}

.knowledge-hero p,
.result-row p,
.reference-row p,
.answer-box p {
  color: var(--app-text-muted);
  line-height: 1.7;
}

.eyebrow,
.section-kicker {
  margin: 0;
  color: #67e8f9;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}

.hero-actions {
  flex-wrap: wrap;
  align-items: center;
}

.knowledge-upload {
  display: inline-flex;
}

.rebuild-result {
  display: grid;
  gap: 14px;
}

.rebuild-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.rebuild-stat {
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.42);
}

.rebuild-stat span,
.rebuild-tip,
.rebuild-errors li {
  color: var(--app-text-muted);
}

.rebuild-stat strong {
  display: block;
  margin-top: 8px;
  color: var(--app-text);
  font-size: 20px;
}

.rebuild-errors {
  padding: 14px;
  border: 1px solid rgba(248, 113, 113, 0.28);
  border-radius: 8px;
  background: rgba(127, 29, 29, 0.16);
}

.rebuild-errors strong {
  color: var(--app-text);
}

.rebuild-errors ul {
  margin: 10px 0 0;
  padding-left: 18px;
}

.chunk-drawer,
.chunk-list,
.duplicate-review-drawer,
.duplicate-review-list,
.version-drawer,
.version-list {
  display: grid;
  gap: 14px;
}

.chunk-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.chunk-summary article,
.chunk-row,
.duplicate-review-row,
.version-row {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.42);
}

.chunk-summary article {
  padding: 14px;
}

.chunk-summary span,
.chunk-row small,
.duplicate-review-row small,
.version-row small,
.chunk-row__head span {
  color: var(--app-text-muted);
  font-size: 13px;
}

.chunk-summary strong {
  display: block;
  margin-top: 8px;
  color: var(--app-text);
  font-size: 18px;
}

.chunk-row,
.duplicate-review-row,
.version-row {
  padding: 14px;
}

.chunk-row__head,
.duplicate-review-row__head,
.version-row__head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.chunk-row__head strong,
.duplicate-review-row__head strong,
.version-row__head strong,
.version-row__title {
  color: var(--app-text);
}

.chunk-row p,
.duplicate-review-row p,
.version-row p {
  margin: 10px 0 8px;
  color: var(--app-text-muted);
  line-height: 1.7;
  white-space: pre-wrap;
}

.version-row__title {
  margin-top: 10px;
  font-weight: 700;
}

.version-row p {
  max-height: 180px;
  overflow: auto;
}

.similar-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.similar-list article {
  padding: 10px;
  border: 1px solid rgba(34, 197, 94, 0.22);
  border-radius: 8px;
  background: rgba(34, 197, 94, 0.08);
}

.similar-list strong,
.similar-list span {
  display: block;
}

.similar-list strong {
  color: var(--app-text);
}

.similar-list span {
  margin-top: 4px;
  color: var(--app-text-muted);
  font-size: 12px;
}

.similar-list p {
  margin-bottom: 0;
}

.similar-list .el-button {
  margin-top: 6px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.config-strip,
.index-observability-strip {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.32);
}

.config-strip {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.index-observability-strip {
  grid-template-columns: 1.4fr 1fr 1fr;
  border-color: rgba(34, 197, 94, 0.24);
  background: rgba(20, 83, 45, 0.1);
}

.config-strip article,
.index-observability-strip article {
  min-width: 0;
}

.config-strip span,
.config-strip small,
.index-observability-strip span,
.index-observability-strip small {
  display: block;
  color: var(--app-text-muted);
  font-size: 12px;
}

.config-strip strong,
.index-observability-strip strong {
  display: block;
  margin: 5px 0;
  color: var(--app-text);
  font-size: 15px;
}

.config-strip small,
.index-observability-strip small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.governance-strip {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid rgba(20, 184, 166, 0.26);
  border-radius: 8px;
  background: rgba(15, 118, 110, 0.1);
}

.governance-strip__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.governance-strip__head strong,
.governance-strip__head small {
  display: block;
}

.governance-strip__head strong {
  color: var(--app-text);
  font-size: 18px;
}

.governance-strip__head small {
  margin-top: 5px;
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.6;
}

.governance-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.governance-grid article {
  min-width: 0;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.28);
}

.governance-grid span,
.governance-grid small {
  display: block;
  color: var(--app-text-muted);
  font-size: 12px;
}

.governance-grid strong {
  display: block;
  margin: 5px 0;
  overflow: hidden;
  color: var(--app-text);
  font-size: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.governance-grid small {
  overflow: hidden;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.governance-alerts {
  display: grid;
  gap: 8px;
}

.quality-gate-strip,
.governance-action-strip {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid rgba(59, 130, 246, 0.24);
  border-radius: 8px;
  background: rgba(30, 64, 175, 0.1);
}

.governance-action-strip {
  border-color: rgba(245, 158, 11, 0.24);
  background: rgba(120, 53, 15, 0.1);
}

.quality-gate-strip__head,
.governance-action-strip__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.quality-gate-strip__head strong,
.quality-gate-strip__head small,
.governance-action-strip__head strong,
.governance-action-strip__head small {
  display: block;
}

.quality-gate-strip__head strong,
.governance-action-strip__head strong {
  color: var(--app-text);
  font-size: 17px;
}

.quality-gate-strip__head small,
.governance-action-strip__head small {
  margin-top: 5px;
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.6;
}

.quality-gate-grid,
.governance-action-list {
  display: grid;
  gap: 10px;
}

.quality-gate-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.quality-gate-grid article,
.governance-action-list article {
  min-width: 0;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.28);
}

.quality-gate-grid span,
.quality-gate-grid small,
.governance-action-list p,
.governance-action-list small {
  color: var(--app-text-muted);
  font-size: 12px;
}

.quality-gate-grid span,
.quality-gate-grid strong,
.quality-gate-grid small,
.governance-action-list small {
  display: block;
}

.quality-gate-grid strong {
  display: block;
  margin: 5px 0;
  overflow: hidden;
  color: var(--app-text);
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quality-gate-grid small,
.governance-action-list small {
  overflow: hidden;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.governance-action-list article {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.governance-action-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.governance-action-title strong {
  overflow: hidden;
  color: var(--app-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.governance-action-list p {
  margin: 6px 0 4px;
  line-height: 1.6;
}

.index-pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.duplicate-review-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid rgba(245, 158, 11, 0.28);
  border-radius: 8px;
  background: rgba(245, 158, 11, 0.08);
}

.duplicate-review-strip strong,
.duplicate-review-strip small {
  display: block;
}

.duplicate-review-strip strong {
  color: var(--app-text);
}

.duplicate-review-strip small {
  margin-top: 5px;
  color: var(--app-text-muted);
  font-size: 12px;
}

.duplicate-hotspot-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.duplicate-hotspot-strip article {
  min-width: 0;
  padding: 14px;
  border: 1px solid rgba(248, 113, 113, 0.22);
  border-radius: 8px;
  background: rgba(127, 29, 29, 0.1);
}

.duplicate-hotspot-strip span,
.duplicate-hotspot-strip strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.duplicate-hotspot-strip span {
  color: var(--app-text-muted);
  font-size: 12px;
}

.duplicate-hotspot-strip strong {
  margin-top: 6px;
  color: var(--app-text);
  font-size: 15px;
}

.dedup-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.dedup-actions :deep(.el-input-number) {
  width: 118px;
}

.exact-duplicate-chunks {
  margin-top: 12px;
}

.duplicate-cleanup-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(248, 113, 113, 0.25);
  border-radius: 8px;
  background: rgba(127, 29, 29, 0.12);
}

.duplicate-cleanup-bar strong,
.duplicate-cleanup-bar small {
  display: block;
}

.duplicate-cleanup-bar small {
  color: var(--app-text-muted);
  font-size: 12px;
}

.summary-item {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.42);
}

.summary-item span,
.reference-row small,
.result-meta small,
.answer-box span,
.form-help {
  color: var(--app-text-muted);
  font-size: 13px;
}

.form-help {
  display: block;
  margin-top: 8px;
  line-height: 1.6;
}

.summary-item strong {
  display: block;
  margin-top: 8px;
  color: var(--app-text);
  font-size: 22px;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(360px, 0.75fr);
  align-items: flex-start;
}

.main-stack,
.side-stack {
  display: grid;
  gap: 16px;
}

.section-head {
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-head.compact {
  margin-bottom: 12px;
}

.section-kicker {
  margin-bottom: 6px;
}

.search-toolbar,
.document-filter {
  row-gap: 8px;
}

.search-toolbar :deep(.el-input),
.document-filter :deep(.el-input) {
  width: 320px;
  max-width: 100%;
}

.document-filter {
  margin-bottom: 12px;
}

.result-list,
.reference-list {
  display: grid;
  gap: 12px;
}

.result-row,
.reference-row,
.answer-box {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.5);
}

.result-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: flex-start;
  padding: 14px;
}

.result-title {
  align-items: center;
  flex-wrap: wrap;
}

.result-title strong,
.reference-row strong {
  color: var(--app-text);
}

.result-row p,
.reference-row p {
  display: -webkit-box;
  margin: 8px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.result-row p :deep(mark) {
  padding: 0 3px;
  border-radius: 4px;
  color: #fef3c7;
  background: rgba(245, 158, 11, 0.28);
}

.matched-terms {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.search-trace-panel {
  display: grid;
  gap: 12px;
  margin-bottom: 14px;
  padding: 14px;
  border: 1px solid rgba(20, 184, 166, 0.24);
  border-radius: 8px;
  background: rgba(15, 118, 110, 0.12);
}

.search-trace-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.search-trace-panel__head span,
.search-trace-metrics span,
.search-trace-metrics small {
  display: block;
  color: var(--app-text-muted);
  font-size: 12px;
}

.search-trace-panel__head strong,
.search-trace-metrics strong {
  display: block;
  margin-top: 4px;
  color: var(--app-text);
  font-size: 18px;
}

.search-trace-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.search-trace-metrics article {
  min-width: 0;
  padding: 10px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.24);
}

.search-trace-metrics small {
  overflow: hidden;
  margin-top: 4px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-trace-warning {
  margin-top: 0;
}

.search-trace-technical {
  summary {
    cursor: pointer;
    color: var(--app-text-muted);
    font-size: 13px;
  }

  .search-trace-metrics {
    margin-top: 10px;
  }
}

.knowledge-evaluation-panel {
  display: grid;
  gap: 12px;
  margin-bottom: 14px;
  padding: 14px;
  border: 1px solid rgba(59, 130, 246, 0.26);
  border-radius: 8px;
  background: rgba(30, 64, 175, 0.14);
}

.knowledge-evaluation-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.knowledge-evaluation-panel__head span,
.knowledge-evaluation-grid span {
  display: block;
  color: var(--app-text-muted);
  font-size: 12px;
}

.knowledge-evaluation-panel__head strong,
.knowledge-evaluation-grid strong {
  display: block;
  margin-top: 4px;
  color: var(--app-text);
  font-size: 18px;
}

.knowledge-evaluation-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.knowledge-evaluation-grid article {
  min-width: 0;
  padding: 10px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.26);
}

.knowledge-evaluation-grid strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.knowledge-evaluation-alert {
  margin-top: 2px;
}

.influence-preview-drawer {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.influence-preview-summary,
.influence-preview-row,
.influence-governance-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.24);
}

.influence-preview-summary span,
.influence-preview-row p,
.influence-governance-row p {
  margin: 0;
  color: var(--app-text-muted);
  line-height: 1.6;
}

.influence-preview-summary strong,
.influence-preview-row strong,
.influence-governance-row strong {
  display: block;
  margin-top: 4px;
  color: var(--app-text);
  line-height: 1.5;
}

.influence-preview-row small {
  display: block;
  margin-top: 6px;
  color: var(--app-text-muted);
  line-height: 1.5;
}

.influence-preview-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.knowledge-trust-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  min-width: 0;

  span:not(.el-tag__content) {
    min-width: 0;
    overflow: hidden;
    color: var(--app-text-muted);
    font-size: 12px;
    line-height: 1.6;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.knowledge-trust-strip--compact {
  margin-top: 8px;
}

.knowledge-eval-dataset {
  display: grid;
  gap: 12px;
  margin-bottom: 14px;
  padding: 14px;
  border: 1px solid rgba(34, 197, 94, 0.24);
  border-radius: 8px;
  background: rgba(20, 83, 45, 0.1);
}

.knowledge-eval-dataset__head,
.knowledge-eval-dataset__actions,
.knowledge-eval-dataset__filters,
.knowledge-eval-runs__head,
.knowledge-eval-latest__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.knowledge-eval-dataset__head,
.knowledge-eval-runs__head,
.knowledge-eval-latest__head {
  justify-content: space-between;
}

.knowledge-eval-dataset__head span,
.knowledge-eval-dataset__head strong,
.knowledge-eval-runs__head strong,
.knowledge-eval-latest__head strong,
.knowledge-eval-run-item span,
.knowledge-eval-run-item strong,
.knowledge-eval-run-item small,
.knowledge-eval-failures strong,
.knowledge-eval-failures span,
.knowledge-eval-failures small {
  display: block;
}

.knowledge-eval-dataset__head span,
.knowledge-eval-run-item small,
.knowledge-eval-failures span,
.knowledge-eval-failures small {
  color: var(--app-text-muted);
  font-size: 12px;
}

.knowledge-eval-dataset__head strong,
.knowledge-eval-runs__head strong,
.knowledge-eval-latest__head strong,
.knowledge-eval-run-item span,
.knowledge-eval-run-item strong,
.knowledge-eval-failures strong {
  color: var(--app-text);
}

.knowledge-eval-dataset__actions,
.knowledge-eval-dataset__filters {
  flex-wrap: wrap;
}

.knowledge-eval-latest__head > div,
.knowledge-eval-latest__tags {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.knowledge-eval-latest__head > div:first-child {
  flex-direction: column;
  align-items: flex-start;
}

.knowledge-eval-latest__head span {
  color: var(--app-text-muted);
  font-size: 12px;
}

.knowledge-eval-dataset__filters :deep(.el-input),
.knowledge-eval-dataset__filters :deep(.el-select) {
  width: 180px;
}

.knowledge-eval-dataset__filters :deep(.el-input) {
  width: 240px;
}

.knowledge-eval-dataset__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 12px;
  align-items: flex-start;
}

.knowledge-eval-cases {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.knowledge-eval-runs,
.knowledge-eval-latest,
.knowledge-eval-failures {
  display: grid;
  gap: 8px;
}

.knowledge-eval-run-item,
.knowledge-eval-failures article {
  min-width: 0;
  padding: 10px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.28);
}

.knowledge-eval-run-item {
  width: 100%;
  cursor: pointer;
  text-align: left;
}

.knowledge-eval-run-item:hover {
  border-color: rgba(34, 197, 94, 0.42);
  background: rgba(34, 197, 94, 0.1);
}

.knowledge-eval-run-item strong {
  margin: 4px 0;
  font-size: 18px;
}

.knowledge-eval-failures span,
.knowledge-eval-failures small {
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-meta {
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  min-width: 86px;
}

.result-meta span {
  color: var(--app-text);
  font-weight: 700;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}

.ask-panel {
  display: grid;
  gap: 12px;
}

.ask-options {
  margin-bottom: -8px;
}

.ask-options :deep(.el-form-item) {
  margin-bottom: 8px;
}

.ask-button {
  width: 100%;
}

.answer-box,
.reference-row {
  padding: 14px;
}

.answer-quality {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 10px 0 4px;
}

.answer-quality span {
  padding: 3px 8px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  color: var(--app-text-muted);
  font-size: 12px;
}

.answer-box p {
  margin: 8px 0 0;
  white-space: pre-wrap;
}

.answer-alert {
  margin-top: 10px;
}

.chunk-error {
  margin-top: 10px;
}

.reference-row small {
  display: block;
  margin-top: 8px;
}

@media (max-width: 1120px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .summary-grid,
  .config-strip,
  .governance-grid,
  .quality-gate-grid,
  .index-observability-strip,
  .duplicate-hotspot-strip,
  .knowledge-eval-dataset__body {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .rebuild-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .knowledge-hero,
  .governance-strip__head,
  .quality-gate-strip__head,
  .governance-action-strip__head,
  .duplicate-review-strip,
  .result-row {
    align-items: flex-start;
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .summary-grid,
  .config-strip,
  .governance-grid,
  .quality-gate-grid,
  .index-observability-strip,
  .duplicate-hotspot-strip,
  .knowledge-eval-dataset__body {
    grid-template-columns: 1fr;
  }

  .governance-action-list article {
    grid-template-columns: 1fr;
  }

  .knowledge-eval-dataset__head {
    align-items: flex-start;
    flex-direction: column;
  }

  .knowledge-eval-dataset__filters :deep(.el-input),
  .knowledge-eval-dataset__filters :deep(.el-select) {
    width: 100%;
  }

  .result-meta {
    align-items: flex-start;
  }
}
</style>
