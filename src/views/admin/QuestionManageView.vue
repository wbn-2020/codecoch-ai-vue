<template>
  <div class="page-shell admin-console-page">
    <section v-if="showQuestionManagement" class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <BookOpenCheck :size="16" />
          <span>Java Question Governance</span>
        </div>
        <h1 class="admin-hero__title">题库治理</h1>
        <p class="admin-hero__desc">
          维护 Java 面试题库的分类、标签、题组、难度和上下架状态。AI 生成题目审核属于后续能力，
          当前不伪造审核结果或生成数据。
        </p>
      </div>
      <el-button type="primary" @click="openDialog()">
        <Plus :size="16" />
        新增题目
      </el-button>
      <el-button @click="handleExport">
        <Download :size="16" />
        导出题目
      </el-button>
      <el-button @click="importDialogVisible = true">
        <Upload :size="16" />
        批量导入
      </el-button>
      <el-button :loading="embeddingRebuilding" @click="handleRebuildEmbedding">
        <RefreshCw :size="16" />
        重建向量索引
      </el-button>
      <el-button :loading="embeddingStatsLoading" @click="handleEmbeddingStats">
        <RefreshCw :size="16" />
        向量状态
      </el-button>
      <el-button :loading="embeddingRetrying" @click="handleRetryFailedEmbedding">
        <RefreshCw :size="16" />
        重试失败向量
      </el-button>
    </section>

    <div v-if="showQuestionManagement" class="admin-insight-grid">
      <article class="admin-insight-card">
        <span>题目总数</span>
        <strong>{{ total }}</strong>
        <small>来自题目列表接口 total</small>
      </article>
      <article class="admin-insight-card">
        <span>当前页分类</span>
        <strong>{{ categoryCount }}</strong>
        <small>仅统计当前页记录</small>
      </article>
      <article class="admin-insight-card">
        <span>当前页高频题</span>
        <strong>{{ highFrequencyCount }}</strong>
        <small>仅统计当前页记录</small>
      </article>
      <article class="admin-insight-card">
        <span>AI 生成审核</span>
        <strong>{{ reviewTotal }}</strong>
        <small>来自审核池真实接口</small>
      </article>
    </div>

    <section v-if="showQuestionManagement" class="admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2>题目列表</h2>
          <p>搜索、分页、新增、编辑、删除、启禁用保留现有后台 CRUD 链路。</p>
        </div>
      </div>

      <div class="admin-filter-bar">
        <el-form class="filter-form" :model="query" inline>
          <el-form-item label="关键词">
            <el-input v-model.trim="query.keyword" clearable placeholder="题目标题" />
          </el-form-item>
          <el-form-item label="题目ID">
            <el-input-number v-model="query.questionId" :min="1" :precision="0" controls-position="right" placeholder="全部" style="width: 140px" />
          </el-form-item>
          <el-form-item label="分类">
            <el-select v-model="query.categoryId" clearable placeholder="全部分类" style="width: 150px">
              <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="标签">
            <el-select v-model="query.tagId" clearable placeholder="全部标签" style="width: 150px">
              <el-option v-for="item in tags" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="难度">
            <el-select v-model="query.difficulty" clearable placeholder="全部" style="width: 120px">
              <el-option v-for="item in difficultyOptions" :key="item.value" :label="item.label" :value="item.value" />
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

      <div class="question-distribution">
        <span>当前页难度分布</span>
        <el-tag type="success" effect="plain">简单 {{ difficultyStats.EASY }}</el-tag>
        <el-tag type="warning" effect="plain">中等 {{ difficultyStats.MEDIUM }}</el-tag>
        <el-tag type="danger" effect="plain">困难 {{ difficultyStats.HARD }}</el-tag>
      </div>

      <div class="table-card admin-table-card">
        <el-table v-loading="loading" :data="questions" row-key="id">
          <el-table-column prop="title" label="题目标题" min-width="220" show-overflow-tooltip />
          <el-table-column label="分类" min-width="130">
            <template #default="{ row }">
              <el-tag v-if="row.categoryName" type="info" effect="plain">{{ row.categoryName }}</el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="题组" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">{{ row.groupTitle || getGroupNameById(row.groupId) }}</template>
          </el-table-column>
          <el-table-column label="难度" width="110">
            <template #default="{ row }">
              <el-tag :type="getDifficultyTagType(row.difficulty)" effect="plain">
                {{ getDifficultyLabel(row.difficulty) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="标签" min-width="220">
            <template #default="{ row }">
              <el-space wrap>
                <el-tag v-for="(tag, index) in getDisplayTags(row)" :key="`${row.id}-${index}`" class="tag-item" size="small" effect="plain">
                  {{ tag }}
                </el-tag>
                <span v-if="getDisplayTags(row).length === 0">-</span>
              </el-space>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }"><StatusTag :status="row.status" /></template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" min-width="170" />
          <el-table-column label="操作" width="230" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" :loading="editingId === row.id && dialogLoading" @click="openDialog(row)">编辑</el-button>
              <el-button link type="warning" @click="handleStatus(row)">
                {{ row.status === 1 ? '禁用' : '启用' }}
              </el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
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
          @change="fetchQuestions"
        />
      </div>
    </section>

    <section v-if="showGovernancePanel" class="admin-panel governance-panel">
      <div class="admin-panel__header">
        <div>
          <h2>{{ governancePageTitle }}</h2>
          <p>{{ governancePageDesc }}</p>
        </div>
        <el-button v-if="!props.governanceOnly" :loading="generating" @click="governanceTab = 'generate'">AI 生成题目</el-button>
      </div>

      <el-tabs v-model="governanceTab" :class="['governance-tabs', { 'governance-tabs--single': props.governanceOnly }]">
        <el-tab-pane v-if="showGeneratePane" label="AI 生成" name="generate">
          <div class="ai-generate-panel">
            <el-alert
              type="info"
              :closable="false"
              show-icon
              title="生成结果只进入后端审核池，不在前端伪造题目内容；审核池数据来自 GET /admin/question-reviews。"
            />
            <el-form class="ai-generate-form" :model="generateForm" label-width="110px">
              <el-row :gutter="16">
                <el-col :xs="24" :md="12">
                  <el-form-item label="目标岗位">
                    <el-input v-model.trim="generateForm.targetPosition" clearable placeholder="为空则生成通用 Java 后端题" />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="12">
                  <el-form-item label="技术栈">
                    <el-input v-model.trim="generateForm.technologyStack" clearable placeholder="例如：Spring Boot / MySQL / Redis" />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="12">
                  <el-form-item label="知识点">
                    <el-input v-model.trim="generateForm.knowledgePoint" clearable placeholder="例如：JVM 垃圾回收" />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="12">
                  <el-form-item label="题型">
                    <el-select v-model="generateForm.questionType" clearable placeholder="使用题库已有题型" style="width: 100%">
                      <el-option v-for="item in questionTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="8">
                  <el-form-item label="难度">
                    <el-select v-model="generateForm.difficulty" clearable placeholder="使用题库已有难度" style="width: 100%">
                      <el-option v-for="item in difficultyOptions" :key="item.value" :label="item.label" :value="item.value" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="8">
                  <el-form-item label="经验年限">
                    <el-input-number v-model="generateForm.experienceYears" :min="0" :max="20" :step="1" style="width: 100%" />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="8">
                  <el-form-item label="生成数量">
                    <el-input-number v-model="generateForm.count" :min="1" :max="20" :step="1" style="width: 100%" />
                  </el-form-item>
                </el-col>
                <el-col :span="24">
                  <el-form-item label="额外要求">
                    <el-input
                      v-model="generateForm.extraRequirements"
                      type="textarea"
                      :rows="3"
                      maxlength="500"
                      show-word-limit
                      placeholder="可补充场景、侧重点或排除项；不要填写不存在的接口字段。"
                    />
                  </el-form-item>
                </el-col>
              </el-row>
              <div class="ai-generate-actions">
                <el-button :loading="generating" type="primary" @click="handleGenerateReviews">生成到审核池</el-button>
                <el-button @click="resetGenerateForm">重置</el-button>
                <el-button v-if="generateResult?.batchId" type="success" plain @click="viewGeneratedBatch">
                  查看本批次审核题
                </el-button>
              </div>
            </el-form>

            <div v-if="generateSseEvents.length || generateSseMessage" class="sse-progress">
              <div class="sse-progress__head">
                <span>阶段式生成进度</span>
                <el-tag size="small" effect="plain">{{ generateSseStatus }}</el-tag>
              </div>
              <p>{{ generateSseMessage || '等待后端阶段事件返回。' }}</p>
              <div class="sse-progress__list">
                <span v-for="(event, index) in generateSseEvents" :key="`${event.type}-${index}`">
                  {{ event.display }}
                </span>
              </div>
            </div>

            <div v-if="generateResult" class="generate-result-card">
              <div class="generate-result-card__title">生成结果</div>
              <el-descriptions :column="3" border>
                <el-descriptions-item label="batchId">{{ generateResult.batchId || '-' }}</el-descriptions-item>
                <el-descriptions-item label="reviewIds">{{ generateResult.reviewIds?.join(', ') || '-' }}</el-descriptions-item>
                <el-descriptions-item label="aiCallLogId">{{ generateResult.aiCallLogId || '-' }}</el-descriptions-item>
                <el-descriptions-item label="generatedCount">
                  {{ generateResult.generatedCount ?? generateResult.successCount ?? generateResult.count ?? '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="message">{{ generateResult.message || '-' }}</el-descriptions-item>
                <el-descriptions-item label="failedReason">{{ generateResult.failedReason || '-' }}</el-descriptions-item>
              </el-descriptions>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane v-if="showReviewsPane" label="审核池" name="reviews">
          <div class="admin-filter-bar governance-filter">
            <el-form :model="reviewQuery" inline>
              <el-form-item label="关键词">
                <el-input v-model.trim="reviewQuery.keyword" clearable placeholder="标题 / 题干 / 知识点" />
              </el-form-item>
              <el-form-item label="批次">
                <el-input v-model.trim="reviewQuery.batchId" clearable placeholder="batchId" style="width: 220px" />
              </el-form-item>
              <el-form-item label="状态">
                <el-select v-model="reviewQuery.reviewStatus" clearable placeholder="全部" style="width: 130px">
                  <el-option label="待审核" value="PENDING" />
                  <el-option label="已通过" value="APPROVED" />
                  <el-option label="已驳回" value="REJECTED" />
                  <el-option label="已作废" value="CANCELLED" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="fetchReviews">查询</el-button>
                <el-button @click="resetReviewQuery">重置</el-button>
              </el-form-item>
            </el-form>
          </div>
          <div class="review-batch-toolbar">
            <span>已选择 {{ selectedPendingReviewIds.length }} 条待审核记录</span>
            <el-space>
              <el-button
                type="primary"
                :disabled="selectedPendingReviewIds.length === 0"
                :loading="batchReviewProcessing"
                @click="handleBatchApproveReviews"
              >
                批量通过
              </el-button>
              <el-button
                type="danger"
                plain
                :disabled="selectedPendingReviewIds.length === 0"
                :loading="batchReviewProcessing"
                @click="handleBatchRejectReviews"
              >
                批量驳回
              </el-button>
            </el-space>
          </div>
          <div class="table-card admin-table-card">
            <el-table
              v-loading="reviewLoading"
              :data="reviews"
              row-key="id"
              @selection-change="handleReviewSelectionChange"
            >
              <el-table-column type="selection" width="48" :selectable="isPendingReview" />
              <el-table-column prop="questionTitle" label="题目" min-width="240" show-overflow-tooltip />
              <el-table-column prop="targetPosition" label="目标岗位" min-width="140" show-overflow-tooltip />
              <el-table-column prop="knowledgePoint" label="知识点" min-width="140" show-overflow-tooltip />
              <el-table-column prop="difficulty" label="难度" width="110" />
              <el-table-column label="状态" width="110">
                <template #default="{ row }">
                  <el-tag :type="getReviewStatusType(row.reviewStatus)" effect="plain">
                    {{ getReviewStatusLabel(row.reviewStatus) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="createdAt" label="生成时间" min-width="170" />
              <el-table-column label="操作" width="300" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" @click="openReviewDrawer(row.id)">详情</el-button>
                  <el-button link type="success" :disabled="row.reviewStatus !== 'PENDING'" @click="openReviewDrawer(row.id)">
                    编辑通过
                  </el-button>
                  <el-button link type="primary" :disabled="row.reviewStatus !== 'PENDING'" @click="handleApproveReview(row.id)">
                    通过
                  </el-button>
                  <el-button link type="danger" :disabled="row.reviewStatus !== 'PENDING'" @click="handleRejectReview(row.id)">
                    驳回
                  </el-button>
                  <el-button link type="warning" :disabled="row.reviewStatus !== 'PENDING'" @click="handleCancelReview(row.id)">
                    作废
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="reviewQuery.pageNo"
              v-model:page-size="reviewQuery.pageSize"
              background
              layout="total, sizes, prev, pager, next"
              :total="reviewTotal"
              :page-sizes="[10, 20, 50]"
              @change="fetchReviews"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane v-if="showDuplicatesPane" label="重复题审核" name="duplicates">
          <div class="duplicate-config-panel" v-loading="duplicateConfigLoading">
            <div class="duplicate-config-panel__head">
              <div>
                <strong>当前去重参数</strong>
                <span>规则判重、语义召回和候选池配置</span>
              </div>
              <el-button link type="primary" @click="fetchDuplicateConfig">刷新</el-button>
            </div>
            <div v-if="duplicateConfigItems.length" class="duplicate-config-grid">
              <div v-for="item in duplicateConfigItems" :key="item.label" class="duplicate-config-item">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
                <small>{{ item.hint }}</small>
              </div>
            </div>
            <el-alert
              v-else
              type="info"
              :closable="false"
              show-icon
              title="暂未加载到去重参数，审核和处理功能仍可继续使用。"
            />
          </div>
          <div class="duplicate-feedback-panel" v-loading="duplicateFeedbackLoading">
            <div class="duplicate-feedback-panel__head">
              <div>
                <strong>人工反馈统计</strong>
                <span>用确认/忽略结果观察阈值是否偏松或偏紧</span>
              </div>
              <el-button link type="primary" @click="fetchDuplicateFeedbackStats">刷新</el-button>
            </div>
            <div v-if="duplicateFeedbackCards.length" class="duplicate-feedback-grid">
              <div v-for="item in duplicateFeedbackCards" :key="item.label" class="duplicate-feedback-card">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
                <small>{{ item.hint }}</small>
              </div>
            </div>
            <div v-if="duplicateFeedbackRecommendation" class="duplicate-feedback-recommendation">
              <div>
                <span>阈值建议</span>
                <strong>{{ duplicateFeedbackRecommendation }}</strong>
              </div>
              <small>样本覆盖率 {{ formatRate(duplicateFeedbackStats?.sampleCoverageRate) }} · 已处理 {{ duplicateFeedbackStats?.resolvedCount || 0 }} 条</small>
            </div>
            <div v-if="duplicateFeedbackBuckets.length" class="duplicate-feedback-buckets">
              <article v-for="bucket in duplicateFeedbackBuckets" :key="bucket.label">
                <div>
                  <strong>{{ bucket.label }}</strong>
                  <span>{{ bucket.totalCount || 0 }} 条</span>
                </div>
                <small>确认 {{ bucket.confirmedCount || 0 }} / 忽略 {{ bucket.ignoredCount || 0 }} / 确认率 {{ formatRate(bucket.confirmationRate) }}</small>
              </article>
            </div>
            <el-alert
              v-if="duplicateFeedbackMatchSummary"
              class="duplicate-feedback-alert"
              type="info"
              :closable="false"
              show-icon
              :title="`主要命中类型：${duplicateFeedbackMatchSummary}`"
            />
            <el-alert
              v-for="item in duplicateFeedbackWarnings"
              :key="item"
              class="duplicate-feedback-alert"
              type="warning"
              :closable="false"
              show-icon
              :title="item"
            />
          </div>
          <div class="admin-filter-bar governance-filter">
            <el-form :model="duplicateQuery" inline>
              <el-form-item label="关键词">
                <el-input v-model.trim="duplicateQuery.keyword" clearable placeholder="源题 / 目标题" />
              </el-form-item>
              <el-form-item label="状态">
                <el-select v-model="duplicateQuery.reviewStatus" clearable placeholder="全部" style="width: 130px">
                  <el-option label="全部" value="ALL" />
                  <el-option label="待处理" value="PENDING" />
                  <el-option label="已合并" value="MERGED" />
                  <el-option label="已忽略" value="IGNORED" />
                </el-select>
              </el-form-item>
              <el-form-item label="置信度">
                <el-select v-model="duplicateQuery.scoreBand" clearable placeholder="全部" style="width: 130px">
                  <el-option label="高置信" value="STRONG" />
                  <el-option label="待审核" value="REVIEW" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="fetchDuplicates">查询</el-button>
                <el-button @click="resetDuplicateQuery">重置</el-button>
                <el-button :loading="duplicateChecking" @click="handleCheckDuplicates">检测当前页</el-button>
                <el-button :loading="duplicateEvaluating" :disabled="duplicates.length === 0" @click="handleEvaluateDuplicates">Evaluate Candidates</el-button>
              </el-form-item>
            </el-form>
          </div>
          <div v-if="duplicateEvaluation" class="duplicate-evaluation-panel">
            <div class="duplicate-evaluation-panel__head">
              <div>
                <strong>Evaluation Snapshot</strong>
                <span>{{ duplicateEvaluation.evaluatedCount || 0 }} evaluated / {{ duplicateEvaluation.sampleCount || 0 }} samples</span>
              </div>
              <el-tag :type="duplicateEvaluation.failedCount ? 'warning' : 'success'" effect="light">
                Accuracy {{ formatRate(duplicateEvaluation.accuracyRate) }}
              </el-tag>
            </div>
            <div class="duplicate-evaluation-grid">
              <article>
                <span>Passed</span>
                <strong>{{ duplicateEvaluation.passedCount || 0 }}</strong>
              </article>
              <article>
                <span>Failed</span>
                <strong>{{ duplicateEvaluation.failedCount || 0 }}</strong>
              </article>
              <article>
                <span>Missing</span>
                <strong>{{ duplicateEvaluation.missingQuestionCount || 0 }}</strong>
              </article>
            </div>
            <div v-if="duplicateEvaluationFailures.length" class="duplicate-evaluation-failures">
              <article v-for="item in duplicateEvaluationFailures" :key="item.caseId || `${item.sourceQuestionId}-${item.targetQuestionId}`">
                <strong>{{ item.caseId || `#${item.sourceQuestionId} / #${item.targetQuestionId}` }}</strong>
                <span>expected {{ item.expected || '-' }} / predicted {{ item.predicted || '-' }} / {{ formatSimilarity(item.score) }}</span>
                <small>{{ item.reason || item.note || '-' }}</small>
              </article>
            </div>
          </div>
          <div class="duplicate-eval-dataset" v-loading="duplicateEvalCaseLoading || duplicateEvalRunLoading">
            <div class="duplicate-eval-dataset__head">
              <div>
                <strong>Persistent Evaluation</strong>
                <span>{{ duplicateEvalCaseTotal || 0 }} cases ? {{ duplicateEvalLatestRunSummary }}</span>
              </div>
              <div class="duplicate-eval-dataset__actions">
                <el-button
                  :loading="duplicateEvalSaving"
                  :disabled="!duplicateEvalHasCurrentCandidates"
                  @click="saveCurrentDuplicateEvalCases"
                >
                  Save Page Cases
                </el-button>
                <el-button type="primary" :loading="duplicateEvalRunning" @click="runDuplicateEvalCases">
                  Run Enabled
                </el-button>
                <el-button :loading="duplicateThresholdSweeping" @click="sweepDuplicateThresholds">
                  Threshold Sweep
                </el-button>
                <el-button @click="refreshDuplicateEvalWorkspace">Refresh</el-button>
              </div>
            </div>

            <div v-if="duplicateThresholdSweep" class="duplicate-threshold-panel">
              <div class="duplicate-threshold-panel__head">
                <div>
                  <strong>Recommended threshold {{ duplicateThresholdSweep.bestThreshold ?? '--' }}</strong>
                  <span>
                    F1 {{ formatRate(duplicateThresholdSweep.bestF1) }} / Precision {{ formatRate(duplicateThresholdSweep.bestPrecision) }} / Recall {{ formatRate(duplicateThresholdSweep.bestRecall) }}
                  </span>
                </div>
                <el-tag type="info" effect="plain">
                  {{ duplicateThresholdSweep.evaluatedCount || 0 }} evaluated
                </el-tag>
              </div>
              <div class="duplicate-threshold-grid">
                <article v-for="bucket in duplicateThresholdSweep.buckets || []" :key="bucket.threshold">
                  <span>{{ bucket.threshold }}</span>
                  <strong>{{ formatRate(bucket.f1) }}</strong>
                  <small>P {{ formatRate(bucket.precision) }} / R {{ formatRate(bucket.recall) }} / workload {{ formatRate(bucket.reviewWorkloadRate) }}</small>
                </article>
              </div>
            </div>

            <div class="duplicate-eval-dataset__filters">
              <el-input
                v-model.trim="duplicateEvalCaseQuery.keyword"
                clearable
                placeholder="case / question"
                @keyup.enter="fetchDuplicateEvalCases"
              />
              <el-select v-model="duplicateEvalCaseQuery.expected" clearable placeholder="expected">
                <el-option label="Duplicate" value="DUPLICATE" />
                <el-option label="Review" value="REVIEW" />
                <el-option label="Not duplicate" value="NOT_DUPLICATE" />
              </el-select>
              <el-select v-model="duplicateEvalCaseQuery.enabled" clearable placeholder="enabled">
                <el-option label="Enabled" :value="1" />
                <el-option label="Disabled" :value="0" />
              </el-select>
              <el-button type="primary" @click="fetchDuplicateEvalCases">Query</el-button>
            </div>

            <div class="duplicate-eval-dataset__body">
              <div class="duplicate-eval-cases">
                <el-table :data="duplicateEvalCases" row-key="id" size="small" max-height="260">
                  <el-table-column prop="caseId" label="Case" min-width="150" show-overflow-tooltip />
                  <el-table-column label="Pair" min-width="240" show-overflow-tooltip>
                    <template #default="{ row }">
                      <span>#{{ row.sourceQuestionId }} / #{{ row.targetQuestionId }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="Expected" width="130">
                    <template #default="{ row }">
                      <el-tag :type="duplicateEvalExpectedType(row.expected)" effect="plain">
                        {{ row.expected || '-' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="Status" width="105">
                    <template #default="{ row }">
                      <el-tag :type="row.enabled === 1 ? 'success' : 'info'" effect="plain">
                        {{ row.enabled === 1 ? 'Enabled' : 'Disabled' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="Action" width="96" fixed="right">
                    <template #default="{ row }">
                      <el-button link type="danger" @click="deleteDuplicateEvalCase(row.id)">Delete</el-button>
                    </template>
                  </el-table-column>
                </el-table>
                <el-pagination
                  v-model:current-page="duplicateEvalCaseQuery.pageNo"
                  v-model:page-size="duplicateEvalCaseQuery.pageSize"
                  small
                  background
                  layout="total, prev, pager, next"
                  :total="duplicateEvalCaseTotal"
                  @change="fetchDuplicateEvalCases"
                />
              </div>

              <div class="duplicate-eval-runs" v-loading="duplicateEvalRunDetailLoading">
                <div class="duplicate-eval-runs__head">
                  <strong>Recent Runs</strong>
                  <el-button link type="primary" @click="fetchDuplicateEvalRuns">Reload</el-button>
                </div>
                <button
                  v-for="run in duplicateEvalRuns"
                  :key="run.id"
                  class="duplicate-eval-run-item"
                  type="button"
                  @click="openDuplicateEvalRun(run.id)"
                >
                  <span>{{ run.runNo || `#${run.id}` }}</span>
                  <strong>{{ formatRate(run.accuracyRate) }}</strong>
                  <small>{{ run.status || '-' }} ? {{ run.evaluatedCount || 0 }}/{{ run.sampleCount || 0 }}</small>
                </button>
                <el-empty v-if="!duplicateEvalRuns.length" description="No runs" />
              </div>
            </div>

            <div v-if="duplicateEvalLatestRun" class="duplicate-eval-latest">
              <div class="duplicate-eval-latest__head">
                <strong>{{ duplicateEvalLatestRun.runNo || `#${duplicateEvalLatestRun.id}` }}</strong>
                <el-tag :type="duplicateEvalLatestRun.failedCount ? 'warning' : 'success'" effect="light">
                  {{ formatRate(duplicateEvalLatestRun.accuracyRate) }}
                </el-tag>
              </div>
              <div v-if="duplicateEvalLatestFailures.length" class="duplicate-eval-failures">
                <article v-for="item in duplicateEvalLatestFailures" :key="item.id || item.caseId">
                  <strong>{{ item.caseId || `case-${item.evalCaseId || '-'}` }}</strong>
                  <span>{{ item.expected || '-' }} / {{ item.predicted || '-' }} / {{ formatSimilarity(item.score) }}</span>
                  <small>{{ item.reason || item.note || '-' }}</small>
                </article>
              </div>
            </div>
          </div>
          <div class="review-batch-toolbar duplicate-batch-toolbar">
            <span>已选择 {{ selectedPendingDuplicateIds.length }} 条待处理候选</span>
            <el-space>
              <el-button
                type="primary"
                :disabled="selectedPendingDuplicateIds.length === 0"
                :loading="duplicateBatchProcessing"
                @click="handleBatchMergeDuplicates"
              >
                批量合并
              </el-button>
              <el-button
                type="warning"
                plain
                :disabled="selectedPendingDuplicateIds.length === 0"
                :loading="duplicateBatchProcessing"
                @click="handleBatchIgnoreDuplicates"
              >
                批量忽略
              </el-button>
            </el-space>
          </div>
          <div class="table-card admin-table-card">
            <el-table
              v-loading="duplicateLoading"
              :data="duplicates"
              row-key="id"
              @selection-change="handleDuplicateSelectionChange"
            >
              <el-table-column type="selection" width="48" :selectable="isPendingDuplicate" />
              <el-table-column prop="sourceTitle" label="源题" min-width="220" show-overflow-tooltip />
              <el-table-column prop="targetTitle" label="疑似重复题" min-width="220" show-overflow-tooltip />
              <el-table-column label="匹配类型" min-width="150">
                <template #default="{ row }">{{ getDuplicateMatchTypeLabel(row.matchType) }}</template>
              </el-table-column>
              <el-table-column label="相似度" width="100">
                <template #default="{ row }">{{ formatSimilarity(row.similarityScore) }}</template>
              </el-table-column>
              <el-table-column label="语义评分" min-width="210">
                <template #default="{ row }">
                  <div class="duplicate-score-parts">
                    <el-tag
                      v-if="duplicateScoreBandLabel(row)"
                      :type="duplicateScoreBandType(row)"
                      size="small"
                      effect="dark"
                    >
                      {{ duplicateScoreBandLabel(row) }}
                    </el-tag>
                    <el-tag
                      v-for="item in duplicateScoreParts(row)"
                      :key="`${row.id}-${item.label}`"
                      size="small"
                      effect="plain"
                    >
                      {{ item.label }} {{ item.value }}
                    </el-tag>
                    <span v-if="!duplicateScoreParts(row).length" class="muted-text">-</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="上下文一致性" min-width="220">
                <template #default="{ row }">
                  <div class="duplicate-context-tags">
                    <el-tag
                      v-for="item in duplicateContextTags(row)"
                      :key="`${row.id}-${item.label}`"
                      :type="item.type"
                      size="small"
                      effect="plain"
                    >
                      {{ item.label }} {{ item.text }}
                    </el-tag>
                    <small>{{ duplicateContextHint(row) }}</small>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="匹配原因" min-width="220" show-overflow-tooltip>
                <template #default="{ row }">{{ formatDuplicateReason(row.matchReason) }}</template>
              </el-table-column>
              <el-table-column label="状态" width="110">
                <template #default="{ row }">
                  <el-tag :type="getDuplicateStatusType(row.reviewStatus)" effect="plain">
                    {{ getDuplicateStatusLabel(row.reviewStatus) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="190" fixed="right">
                <template #default="{ row }">
                  <el-button link type="info" @click="openDuplicateDrawer(row.id)">
                    详情
                  </el-button>
                  <el-button link type="primary" :disabled="row.reviewStatus !== 'PENDING'" @click="handleMergeDuplicate(row.id)">
                    合并
                  </el-button>
                  <el-button link type="warning" :disabled="row.reviewStatus !== 'PENDING'" @click="handleIgnoreDuplicate(row.id)">
                    忽略
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="duplicateQuery.pageNo"
              v-model:page-size="duplicateQuery.pageSize"
              background
              layout="total, sizes, prev, pager, next"
              :total="duplicateTotal"
              :page-sizes="[10, 20, 50]"
              @change="fetchDuplicates"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </section>

    <el-drawer v-model="duplicateDrawerVisible" title="重复候选详情" size="860px" class="duplicate-detail-drawer">
      <div v-loading="duplicateDetailLoading" class="duplicate-detail-content">
        <template v-if="duplicateDetail">
          <section class="duplicate-detail-section duplicate-detail-summary">
            <div>
              <div class="duplicate-detail-section__title">判重结论</div>
              <div class="duplicate-detail-tags">
                <el-tag :type="getDuplicateStatusType(duplicateDetail.reviewStatus)" effect="plain">
                  {{ getDuplicateStatusLabel(duplicateDetail.reviewStatus) }}
                </el-tag>
                <el-tag type="info" effect="plain">{{ getDuplicateMatchTypeLabel(duplicateDetail.matchType) }}</el-tag>
                <el-tag v-if="duplicateScoreBandLabel(duplicateDetail)" :type="duplicateScoreBandType(duplicateDetail)" effect="dark">
                  {{ duplicateScoreBandLabel(duplicateDetail) }}
                </el-tag>
                <el-tag type="warning" effect="plain">{{ formatSimilarity(duplicateDetail.similarityScore) }}</el-tag>
              </div>
            </div>
            <div class="duplicate-detail-meta">
              <span>Review #{{ duplicateDetail.id }}</span>
              <span>{{ duplicateDetail.createdAt || '-' }}</span>
            </div>
          </section>

          <section class="duplicate-detail-section">
            <div class="duplicate-detail-section__title">评分构成</div>
            <div class="duplicate-score-parts duplicate-score-parts--large">
              <el-tag
                v-for="item in duplicateScoreParts(duplicateDetail)"
                :key="`detail-${duplicateDetail.id}-${item.code || item.label}`"
                effect="plain"
              >
                {{ item.label }} {{ item.value }}
              </el-tag>
              <span v-if="!duplicateScoreParts(duplicateDetail).length" class="muted-text">暂无拆分评分</span>
            </div>
            <p class="duplicate-detail-reason">{{ formatDuplicateReason(duplicateDetail.matchReason) }}</p>
            <el-collapse v-if="duplicateDetail.scoreDetailJson" class="duplicate-score-debug">
              <el-collapse-item title="原始评分 JSON" name="score-json">
                <pre>{{ formatScoreDetailJson(duplicateDetail.scoreDetailJson) }}</pre>
              </el-collapse-item>
            </el-collapse>
          </section>

          <section class="duplicate-detail-section">
            <div class="duplicate-detail-section__title">题目对比</div>
            <div class="duplicate-compare-grid">
              <article class="duplicate-question-panel">
                <header>
                  <span>源题</span>
                  <el-tag size="small" effect="plain">#{{ duplicateDetail.sourceQuestionId || '-' }}</el-tag>
                </header>
                <h4>{{ duplicateDetail.sourceQuestion?.title || duplicateDetail.sourceTitleSnapshot || '-' }}</h4>
                <pre>{{ duplicateDetail.sourceQuestion?.content || duplicateDetail.sourceContentSnapshot || '-' }}</pre>
              </article>
              <article class="duplicate-question-panel">
                <header>
                  <span>候选题</span>
                  <el-tag size="small" effect="plain">#{{ duplicateDetail.targetQuestionId || '-' }}</el-tag>
                </header>
                <h4>{{ duplicateDetail.targetQuestion?.title || duplicateDetail.targetTitleSnapshot || '-' }}</h4>
                <pre>{{ duplicateDetail.targetQuestion?.content || duplicateDetail.targetContentSnapshot || '-' }}</pre>
              </article>
            </div>
          </section>

          <section v-if="duplicateDetail.ignoredReason || duplicateDetail.relationId" class="duplicate-detail-section">
            <div class="duplicate-detail-section__title">处理记录</div>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="关系ID">{{ duplicateDetail.relationId || '-' }}</el-descriptions-item>
              <el-descriptions-item label="处理人">{{ duplicateDetail.reviewedBy || '-' }}</el-descriptions-item>
              <el-descriptions-item label="处理时间">{{ duplicateDetail.reviewedAt || '-' }}</el-descriptions-item>
              <el-descriptions-item label="忽略原因">{{ duplicateDetail.ignoredReason || '-' }}</el-descriptions-item>
            </el-descriptions>
          </section>
        </template>
        <el-empty v-else-if="!duplicateDetailLoading" description="暂无重复候选详情" />
      </div>
      <template #footer>
        <el-button @click="duplicateDrawerVisible = false">关闭</el-button>
        <el-button
          type="primary"
          :disabled="duplicateDetail?.reviewStatus !== 'PENDING'"
          @click="duplicateDetail && handleMergeDuplicate(duplicateDetail.id)"
        >
          合并
        </el-button>
        <el-button
          type="warning"
          :disabled="duplicateDetail?.reviewStatus !== 'PENDING'"
          @click="duplicateDetail && handleIgnoreDuplicate(duplicateDetail.id)"
        >
          忽略
        </el-button>
      </template>
    </el-drawer>
    <el-drawer v-model="reviewDrawerVisible" title="AI 题目审核详情" size="760px" class="review-detail-drawer">
      <div v-loading="reviewDetailLoading" class="review-detail-content">
        <template v-if="reviewDetail">
          <section class="review-detail-section">
            <div class="review-detail-section__title">AI 原始建议</div>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="题目标题">{{ reviewDetail.questionTitle || '-' }}</el-descriptions-item>
              <el-descriptions-item label="目标岗位">{{ reviewDetail.targetPosition || '-' }}</el-descriptions-item>
              <el-descriptions-item label="分类建议">{{ reviewDetail.categorySuggestion || '-' }}</el-descriptions-item>
              <el-descriptions-item label="题组建议">{{ reviewDetail.groupSuggestion || '-' }}</el-descriptions-item>
              <el-descriptions-item label="状态">{{ getReviewStatusLabel(reviewDetail.reviewStatus) }}</el-descriptions-item>
              <el-descriptions-item label="更新时间">{{ reviewDetail.updatedAt || '-' }}</el-descriptions-item>
            </el-descriptions>
            <div class="review-json-grid">
              <div class="review-json-card">
                <span>题干</span>
                <pre>{{ reviewDetail.questionContent || '-' }}</pre>
              </div>
              <div class="review-json-card">
                <span>参考答案</span>
                <pre>{{ reviewDetail.referenceAnswer || '-' }}</pre>
              </div>
              <div class="review-json-card">
                <span>解析</span>
                <pre>{{ reviewDetail.analysis || '-' }}</pre>
              </div>
              <div class="review-json-card">
                <span>追问建议</span>
                <pre>{{ formatJsonText(reviewDetail.followUpQuestionsJson) }}</pre>
              </div>
              <div class="review-json-card">
                <span>标签建议</span>
                <pre>{{ formatJsonText(reviewDetail.tagSuggestionsJson) }}</pre>
              </div>
              <div class="review-json-card">
                <span>AI 原始 JSON</span>
                <pre>{{ formatJsonText(reviewDetail.rawAiResultJson) }}</pre>
              </div>
            </div>
          </section>

          <section class="review-detail-section">
            <div class="review-detail-section__title">编辑后通过</div>
            <el-form :model="reviewApproveForm" label-width="110px">
              <el-form-item label="题目标题">
                <el-input v-model.trim="reviewApproveForm.title" />
              </el-form-item>
              <el-form-item label="题干">
                <el-input v-model="reviewApproveForm.content" type="textarea" :rows="4" />
              </el-form-item>
              <el-form-item label="参考答案">
                <el-input v-model="reviewApproveForm.referenceAnswer" type="textarea" :rows="4" />
              </el-form-item>
              <el-form-item label="解析">
                <el-input v-model="reviewApproveForm.analysis" type="textarea" :rows="3" />
              </el-form-item>
              <el-row :gutter="14">
                <el-col :xs="24" :md="12">
                  <el-form-item label="难度">
                    <el-select v-model="reviewApproveForm.difficulty" style="width: 100%">
                      <el-option v-for="item in difficultyOptions" :key="item.value" :label="item.label" :value="item.value" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="12">
                  <el-form-item label="题型">
                    <el-select v-model="reviewApproveForm.questionType" style="width: 100%">
                      <el-option v-for="item in questionTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="12">
                  <el-form-item label="分类">
                    <el-select v-model="reviewApproveForm.categoryId" clearable filterable style="width: 100%">
                      <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="12">
                  <el-form-item label="题组">
                    <el-select v-model="reviewApproveForm.groupId" clearable filterable style="width: 100%">
                      <el-option v-for="item in groups" :key="item.id" :label="item.name" :value="item.id" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="24">
                  <el-form-item label="标签">
                    <el-select v-model="reviewApproveForm.tagIds" multiple filterable collapse-tags style="width: 100%">
                      <el-option v-for="item in tags" :key="item.id" :label="item.name" :value="item.id" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="8">
                  <el-form-item label="状态">
                    <el-switch v-model="reviewApproveForm.status" :active-value="1" :inactive-value="0" />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="8">
                  <el-form-item label="高频题">
                    <el-switch v-model="reviewApproveForm.isHighFrequency" :active-value="1" :inactive-value="0" />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="8">
                  <el-form-item label="经验要求">
                    <el-input v-model.trim="reviewApproveForm.experienceLevel" placeholder="例如：3年" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-form-item label="编辑说明">
                <el-input v-model="reviewApproveForm.editedReason" type="textarea" :rows="2" maxlength="300" show-word-limit />
              </el-form-item>
            </el-form>
          </section>
        </template>
      </div>
      <template #footer>
        <el-button @click="reviewDrawerVisible = false">关闭</el-button>
        <el-button
          type="warning"
          :disabled="reviewDetail?.reviewStatus !== 'PENDING'"
          @click="reviewDetail && handleCancelReview(reviewDetail.id)"
        >
          作废
        </el-button>
        <el-button
          type="primary"
          :disabled="reviewDetail?.reviewStatus !== 'PENDING'"
          :loading="reviewApproveSaving"
          @click="handleApproveReviewWithEdit"
        >
          编辑后通过
        </el-button>
      </template>
    </el-drawer>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑题目' : '新增题目'" width="760px">
      <el-alert
        v-if="editingId"
        class="dialog-alert"
        type="info"
        :closable="false"
        show-icon
        title="若后端列表未返回题干、参考答案或解析，请在编辑保存前补全这些字段。"
      />
      <el-form ref="formRef" v-loading="dialogLoading" :model="form" :rules="rules" label-width="104px">
        <el-form-item label="题目标题" prop="title">
          <el-input v-model.trim="form.title" />
        </el-form-item>
        <el-form-item label="分类" prop="categoryId">
          <el-select v-model="form.categoryId" placeholder="请选择分类" style="width: 100%">
            <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="题组" prop="groupId">
          <el-select v-model="form.groupId" filterable placeholder="请选择题组" style="width: 100%">
            <el-option v-for="item in groups" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="标签">
          <el-select v-model="form.tagIds" multiple filterable collapse-tags placeholder="请选择标签" style="width: 100%">
            <el-option v-for="item in tags" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="难度" prop="difficulty">
          <el-select v-model="form.difficulty" style="width: 100%">
            <el-option v-for="item in difficultyOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="题型" prop="questionType">
          <el-select v-model="form.questionType" style="width: 100%">
            <el-option v-for="item in questionTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="经验年限">
          <el-select v-model="form.experienceLevel" clearable placeholder="请选择经验年限" style="width: 100%">
            <el-option v-for="item in experienceLevelOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="高频题">
          <el-switch v-model="form.isHighFrequency" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="题干" prop="content">
          <el-input v-model="form.content" type="textarea" :rows="5" />
        </el-form-item>
        <el-form-item label="参考答案" prop="referenceAnswer">
          <el-input v-model="form.referenceAnswer" type="textarea" :rows="5" />
        </el-form-item>
        <el-form-item label="解析">
          <el-input v-model="form.analysis" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="importDialogVisible" title="批量导入题目" width="500px">
      <div class="import-dialog-body">
        <p>支持 Excel (.xlsx/.xls)、Markdown (.md)、Word (.docx)、PDF (.pdf) 格式，请按模板格式填写题目数据。</p>
        <el-upload
          ref="importUploadRef"
          :auto-upload="false"
          :limit="1"
          accept=".xlsx,.xls,.md,.docx,.pdf"
          :on-change="handleImportFileChange"
        >
          <template #trigger>
            <el-button type="primary">选择文件</el-button>
          </template>
          <template #tip>
            <div class="el-upload__tip">支持 .xlsx / .xls / .md / .docx / .pdf 文件，单次最多 500 条</div>
          </template>
        </el-upload>
        <el-button class="import-template-btn" link type="primary" @click="handleDownloadTemplate">下载导入模板</el-button>
      </div>
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="importing" :disabled="!importFile" @click="handleImport">开始导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { BookOpenCheck, Download, Plus, RefreshCw, Upload } from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import {
  approveQuestionReviewApi,
  batchApproveQuestionReviewsApi,
  batchIgnoreQuestionDuplicateReviewApi,
  batchMergeQuestionDuplicateReviewApi,
  batchRejectQuestionReviewsApi,
  cancelQuestionReviewApi,
  checkQuestionDuplicateApi,
  createAdminQuestionApi,
  deleteAdminQuestionApi,
  deleteQuestionDuplicateEvalCaseApi,
  downloadQuestionImportTemplate,
  evaluateQuestionDuplicateApi,
  exportAdminQuestionsApi,
  generateAiQuestionsApi,
  getAdminQuestionDetailApi,
  getAdminQuestionsApi,
  getQuestionEmbeddingStatsApi,
  getQuestionDuplicateEvalCasesApi,
  getQuestionDuplicateEvalRunApi,
  getQuestionDuplicateEvalRunsApi,
  getQuestionDuplicateReviewsApi,
  getQuestionDuplicateReviewDetailApi,
  getQuestionDuplicateFeedbackStatsApi,
  getQuestionReviewDetailApi,
  getQuestionReviewsApi,
  ignoreQuestionDuplicateReviewApi,
  importAdminQuestionsApi,
  mergeQuestionDuplicateReviewApi,
  rebuildQuestionEmbeddingApi,
  rejectQuestionReviewApi,
  retryFailedQuestionEmbeddingApi,
  runQuestionDuplicateEvalApi,
  saveQuestionDuplicateEvalCaseApi,
  streamAiQuestionGenerateApi,
  sweepQuestionDuplicateThresholdApi,
  updateAdminQuestionApi,
  updateAdminQuestionStatusApi
} from '@/api/question'
import { getQuestionDuplicateConfigApi } from '@/api/analytics'
import { getQuestionCategoriesApi } from '@/api/questionCategory'
import { getQuestionGroupsApi } from '@/api/questionGroup'
import { getQuestionTagsApi } from '@/api/questionTag'
import StatusTag from '@/components/common/StatusTag.vue'
import {
  difficultyOptions,
  experienceLevelOptions,
  QUESTION_DIFFICULTY,
  QUESTION_TYPE,
  questionTypeOptions
} from '@/constants/enums'
import type {
  AdminQuestionQueryDTO,
  AdminQuestionVO,
  AiQuestionGenerateRequestDTO,
  AiQuestionGenerateResultVO,
  AiQuestionGenerateSseEvent,
  QuestionDuplicateEvaluationItemVO,
  QuestionDuplicateEvalCaseQueryDTO,
  QuestionDuplicateEvalCaseVO,
  QuestionDuplicateEvalRunVO,
  QuestionDuplicateEvalRunResultVO,
  QuestionDuplicateEvaluationVO,
  QuestionDuplicateReviewListVO,
  QuestionDuplicateReviewDetailVO,
  QuestionDuplicateFeedbackStatsVO,
  QuestionDuplicateReviewQueryDTO,
  QuestionDuplicateThresholdSweepVO,
  QuestionCategoryVO,
  QuestionCreateDTO,
  QuestionDifficulty,
  QuestionGroupVO,
  QuestionReviewApproveDTO,
  QuestionReviewDetailVO,
  QuestionReviewListVO,
  QuestionReviewQueryDTO,
  QuestionTagVO
} from '@/types/question'
import type { QuestionDuplicateConfigVO } from '@/types/analytics'

type GovernanceTab = 'generate' | 'reviews' | 'duplicates'

const props = withDefaults(
  defineProps<{
    initialGovernanceTab?: GovernanceTab
    governanceOnly?: boolean
  }>(),
  {
    initialGovernanceTab: 'generate',
    governanceOnly: false
  }
)

const loading = ref(false)
const route = useRoute()
const saving = ref(false)
const dialogLoading = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const questions = ref<AdminQuestionVO[]>([])
const categories = ref<QuestionCategoryVO[]>([])
const duplicateEvalCaseLoading = ref(false)
const duplicateEvalRunLoading = ref(false)
const duplicateEvalSaving = ref(false)
const duplicateEvalRunning = ref(false)
const duplicateEvalRunDetailLoading = ref(false)
const tags = ref<QuestionTagVO[]>([])
const groups = ref<QuestionGroupVO[]>([])
const total = ref(0)
const governanceTab = ref<GovernanceTab>(props.initialGovernanceTab)
const reviewLoading = ref(false)
const duplicateLoading = ref(false)
const duplicateDetailLoading = ref(false)
const duplicateConfigLoading = ref(false)
const duplicateFeedbackLoading = ref(false)
const duplicateEvaluating = ref(false)
const generating = ref(false)
const batchReviewProcessing = ref(false)
const reviewDetailLoading = ref(false)
const reviewApproveSaving = ref(false)
const reviewDrawerVisible = ref(false)
const duplicateDrawerVisible = ref(false)
const duplicateChecking = ref(false)
const duplicateBatchProcessing = ref(false)
const embeddingRebuilding = ref(false)
const duplicateEvalCases = ref<QuestionDuplicateEvalCaseVO[]>([])
const duplicateEvalRuns = ref<QuestionDuplicateEvalRunVO[]>([])
const duplicateEvalLatestRun = ref<QuestionDuplicateEvalRunVO | null>(null)
const duplicateThresholdSweep = ref<QuestionDuplicateThresholdSweepVO | null>(null)
const duplicateEvalCaseTotal = ref(0)
const duplicateEvalRunTotal = ref(0)
const embeddingStatsLoading = ref(false)
const embeddingRetrying = ref(false)
const reviews = ref<QuestionReviewListVO[]>([])
const reviewDetail = ref<QuestionReviewDetailVO | null>(null)
const selectedReviewRows = ref<QuestionReviewListVO[]>([])
const duplicates = ref<QuestionDuplicateReviewListVO[]>([])
const selectedDuplicateRows = ref<QuestionDuplicateReviewListVO[]>([])
const duplicateDetail = ref<QuestionDuplicateReviewDetailVO | null>(null)
const duplicateConfig = ref<QuestionDuplicateConfigVO | null>(null)
const duplicateFeedbackStats = ref<QuestionDuplicateFeedbackStatsVO | null>(null)
const duplicateEvaluation = ref<QuestionDuplicateEvaluationVO | null>(null)
const duplicateThresholdSweeping = ref(false)
const reviewTotal = ref(0)
const duplicateTotal = ref(0)
const generateResult = ref<AiQuestionGenerateResultVO | null>(null)
const generateSseEvents = ref<Array<{ type: string; stage?: string; message: string; display: string }>>([])
const generateSseMessage = ref('')
const generateSseStatus = ref('未开始')
const generateSseHandle = ref<ReturnType<typeof streamAiQuestionGenerateApi> | null>(null)

const query = reactive<AdminQuestionQueryDTO>({
  keyword: '',
  questionId: undefined,
  categoryId: undefined,
  tagId: undefined,
  difficulty: '',
  status: '',
  pageNo: 1,
  pageSize: 10
})

const form = reactive<QuestionCreateDTO>({
  title: '',
  content: '',
  referenceAnswer: '',
  analysis: '',
  categoryId: undefined,
  groupId: undefined,
  difficulty: QUESTION_DIFFICULTY.MEDIUM,
  questionType: QUESTION_TYPE.SHORT_ANSWER,
  experienceLevel: '',
  isHighFrequency: 0,
  tagIds: [],
  status: 1
})

const reviewApproveForm = reactive<QuestionReviewApproveDTO>({
  title: '',
  content: '',
  referenceAnswer: '',
  analysis: '',
  difficulty: QUESTION_DIFFICULTY.MEDIUM,
  questionType: QUESTION_TYPE.SHORT_ANSWER,
  categoryId: undefined,
  groupId: undefined,
  tagIds: [],
  status: 1,
  isHighFrequency: 0,
  experienceLevel: '',
  editedReason: ''
})

const reviewQuery = reactive<QuestionReviewQueryDTO>({
  keyword: '',
  reviewStatus: 'PENDING',
  batchId: '',
  pageNo: 1,
  pageSize: 10
})

const generateForm = reactive<AiQuestionGenerateRequestDTO>({
  targetPosition: '',
  technologyStack: '',
  knowledgePoint: '',
  questionType: QUESTION_TYPE.SHORT_ANSWER,
  difficulty: QUESTION_DIFFICULTY.MEDIUM,
  experienceYears: undefined,
  count: 5,
  extraRequirements: ''
})

const duplicateEvalCaseQuery = reactive<QuestionDuplicateEvalCaseQueryDTO>({
  keyword: '',
  expected: '',
  enabled: 1,
  pageNo: 1,
  pageSize: 5
})

const duplicateEvalRunQuery = reactive({
  pageNo: 1,
  pageSize: 5
})

const duplicateQuery = reactive<QuestionDuplicateReviewQueryDTO>({
  keyword: '',
  reviewStatus: 'ALL',
  scoreBand: '',
  pageNo: 1,
  pageSize: 10
})

const duplicateEvalLatestFailures = computed<QuestionDuplicateEvalRunResultVO[]>(() =>
  (duplicateEvalLatestRun.value?.results || [])
    .filter((item) => item.passed === false || !item.predicted)
    .slice(0, 5)
)
const duplicateEvalCaseIds = computed(() => new Set(duplicateEvalCases.value.map((item) => item.id).filter(Boolean)))
const duplicateEvalHasCurrentCandidates = computed(() => duplicates.value.some((item) => item.sourceQuestionId && item.targetQuestionId))
const duplicateEvalLatestRunSummary = computed(() => {
  const run = duplicateEvalLatestRun.value
  return run ? `${run.runNo || `#${run.id}`} · ${run.status || '--'} · ${formatRate(run.accuracyRate)}` : 'No run yet'
})

const rules: FormRules<QuestionCreateDTO> = {
  title: [{ required: true, message: '请输入题目标题', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  groupId: [{ required: true, message: '请选择题组', trigger: 'change' }],
  difficulty: [{ required: true, message: '请选择难度', trigger: 'change' }],
  questionType: [{ required: true, message: '请选择题型', trigger: 'change' }],
  content: [{ required: true, message: '请输入题干', trigger: 'blur' }],
  referenceAnswer: [{ required: true, message: '请输入参考答案', trigger: 'blur' }]
}

const categoryCount = computed(() => new Set(questions.value.map((item) => item.categoryId || item.categoryName).filter(Boolean)).size)
const highFrequencyCount = computed(() => questions.value.filter((item) => item.isHighFrequency === true || item.isHighFrequency === 1).length)
const difficultyStats = computed(() => ({
  EASY: questions.value.filter((item) => item.difficulty === QUESTION_DIFFICULTY.EASY).length,
  MEDIUM: questions.value.filter((item) => item.difficulty === QUESTION_DIFFICULTY.MEDIUM).length,
  HARD: questions.value.filter((item) => item.difficulty === QUESTION_DIFFICULTY.HARD).length
}))
const selectedPendingReviewIds = computed(() =>
  selectedReviewRows.value
    .filter((item) => item.reviewStatus === 'PENDING')
    .map((item) => item.id)
)
const selectedPendingDuplicateIds = computed(() =>
  selectedDuplicateRows.value
    .filter((item) => item.reviewStatus === 'PENDING')
    .map((item) => item.id)
)
const duplicateEvaluationFailures = computed<QuestionDuplicateEvaluationItemVO[]>(() =>
  (duplicateEvaluation.value?.items || [])
    .filter((item) => item.passed === false || !item.predicted)
    .slice(0, 6)
)
const showQuestionManagement = computed(() => !props.governanceOnly)
const showGovernancePanel = computed(() => props.governanceOnly || !showQuestionManagement.value)
const showGeneratePane = computed(() => !props.governanceOnly || governanceTab.value === 'generate')
const showReviewsPane = computed(() => !props.governanceOnly || governanceTab.value === 'reviews')
const showDuplicatesPane = computed(() => !props.governanceOnly || governanceTab.value === 'duplicates')
const governancePageTitle = computed(() => {
  if (governanceTab.value === 'generate') return 'AI 题目生成'
  if (governanceTab.value === 'reviews') return '题目审核'
  return '重复题审核'
})
const governancePageDesc = computed(() => {
  if (governanceTab.value === 'generate') return '生成结果进入后端审核池，不在前端伪造题目内容。'
  if (governanceTab.value === 'reviews') return '处理 AI 生成题目的审核、编辑通过和批量驳回。'
  return '处理疑似重复题的合并和忽略，保持题库质量。'
})

const formatDuplicateConfigValue = (value?: number) => {
  if (value === undefined || value === null) return '-'
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '-'
  return numeric % 1 === 0 ? String(numeric) : numeric.toFixed(2)
}

const duplicateFeedbackCards = computed(() => {
  const stats = duplicateFeedbackStats.value
  if (!stats) return []
  return [
    { label: '累计候选', value: stats.totalCount || 0, hint: `待处理 ${stats.pendingCount || 0}` },
    { label: '已处理样本', value: stats.resolvedCount || 0, hint: `覆盖率 ${formatRate(stats.sampleCoverageRate)}` },
    { label: '确认重复', value: stats.confirmedCount || 0, hint: `确认率 ${formatRate(stats.confirmationRate)}` },
    { label: '忽略候选', value: stats.ignoredCount || 0, hint: `忽略率 ${formatRate(stats.ignoreRate)}` },
    { label: '平均分', value: formatSimilarity(stats.averageSimilarityScore), hint: `STRONG ${stats.scoreBandCounts?.STRONG || 0} / REVIEW ${stats.scoreBandCounts?.REVIEW || 0}` }
  ]
})

const duplicateFeedbackBuckets = computed(() => duplicateFeedbackStats.value?.scoreBuckets || [])

const duplicateFeedbackRecommendation = computed(() => duplicateFeedbackStats.value?.thresholdRecommendation || '')

const duplicateFeedbackWarnings = computed(() => duplicateFeedbackStats.value?.warningItems || [])

const duplicateFeedbackMatchSummary = computed(() => {
  const counts = duplicateFeedbackStats.value?.matchTypeCounts || {}
  return Object.entries(counts)
    .sort((left, right) => Number(right[1]) - Number(left[1]))
    .slice(0, 4)
    .map(([type, count]) => `${getDuplicateMatchTypeLabel(type)} ${count}`)
    .join(' / ')
})
const duplicateConfigItems = computed(() => {
  const config = duplicateConfig.value
  if (!config) return []
  return [
    { label: '语义命中阈值', value: formatDuplicateConfigValue(config.semanticSimilarityThreshold), hint: '向量召回进入语义判重的最低分' },
    { label: '语义审核阈值', value: formatDuplicateConfigValue(config.semanticReviewThreshold), hint: '向量召回和最终分进入人工审核的最低分' },
    { label: '高置信阈值', value: formatDuplicateConfigValue(config.semanticStrongThreshold), hint: '最终分达到后标记为高置信语义重复' },
    { label: '标题 Jaccard', value: formatDuplicateConfigValue(config.titleJaccardThreshold), hint: '标题词集合相似度规则阈值' },
    { label: '标题编辑距离', value: formatDuplicateConfigValue(config.titleLevenshteinThreshold), hint: '标题 Levenshtein 相似度阈值' },
    { label: '内容相似度', value: formatDuplicateConfigValue(config.contentSimilarityThreshold), hint: '题干内容规则命中阈值' },
    { label: 'Metadata / Tag Weight', value: `${formatDuplicateConfigValue(config.semanticMetadataWeight)} / ${formatDuplicateConfigValue(config.semanticTagWeight)}`, hint: 'Category, type, difficulty and tag scoring weight' },
    { label: '向量/文本权重', value: `${formatDuplicateConfigValue(config.semanticVectorWeight)} / ${formatDuplicateConfigValue(config.semanticTextWeight)}`, hint: '语义最终分的加权比例' },
    { label: '向量召回数', value: formatDuplicateConfigValue(config.vectorSearchLimit), hint: '每题向量库候选召回规模' },
    { label: '规则候选池', value: formatDuplicateConfigValue(config.maxRuleCandidateCount), hint: '规则侧最多比较的候选数' },
    { label: '批量检测上限', value: formatDuplicateConfigValue(config.maxBatchCheckCount), hint: '单次管理端检测题目数' }
  ]
})
const getDifficultyLabel = (value?: QuestionDifficulty) => {
  if (value === QUESTION_DIFFICULTY.EASY) return '简单'
  if (value === QUESTION_DIFFICULTY.MEDIUM) return '中等'
  if (value === QUESTION_DIFFICULTY.HARD) return '困难'
  return value || '-'
}

const getDifficultyTagType = (value?: QuestionDifficulty) => {
  if (value === QUESTION_DIFFICULTY.EASY) return 'success'
  if (value === QUESTION_DIFFICULTY.HARD) return 'danger'
  return 'warning'
}

const getGroupNameById = (groupId?: number) => {
  if (!groupId) return '-'
  return groups.value.find((item) => item.id === groupId)?.name || String(groupId)
}

const getDisplayTags = (row: AdminQuestionVO) => {
  return (row.tags || [])
    .map((tag) => (typeof tag === 'string' ? tag : tag?.name || ''))
    .filter((name) => Boolean(name))
}

const getReviewStatusLabel = (status?: string) => {
  if (status === 'PENDING') return '待审核'
  if (status === 'APPROVED') return '已通过'
  if (status === 'REJECTED') return '已驳回'
  if (status === 'CANCELLED') return '已作废'
  return status || '-'
}

const getReviewStatusType = (status?: string) => {
  if (status === 'APPROVED') return 'success'
  if (status === 'REJECTED') return 'danger'
  if (status === 'CANCELLED') return 'info'
  return 'warning'
}

const isPendingReview = (row: QuestionReviewListVO) => row.reviewStatus === 'PENDING'

const isPendingDuplicate = (row: QuestionDuplicateReviewListVO) => row.reviewStatus === 'PENDING'

const handleReviewSelectionChange = (rows: QuestionReviewListVO[]) => {
  selectedReviewRows.value = rows
}

const handleDuplicateSelectionChange = (rows: QuestionDuplicateReviewListVO[]) => {
  selectedDuplicateRows.value = rows
}

const showBatchReviewResult = (result: { successCount?: number; failureCount?: number; failures?: Array<{ reviewId: number; reason?: string }> }) => {
  const failures = result.failures || []
  if (!failures.length) {
    ElMessage.success(`批量操作完成：成功 ${result.successCount || 0} 条，失败 ${result.failureCount || 0} 条`)
    return
  }

  const failureText = failures
    .slice(0, 5)
    .map((item) => `#${item.reviewId}: ${item.reason || '未知原因'}`)
    .join('\n')
  ElMessageBox.alert(
    `成功 ${result.successCount || 0} 条，失败 ${result.failureCount || 0} 条。\n${failureText}`,
    '批量操作结果',
    { type: 'warning' }
  )
}

const showBatchDuplicateResult = (result: { successCount?: number; failureCount?: number; failures?: Array<{ id: number; reason?: string }> }) => {
  const failures = result.failures || []
  if (!failures.length) {
    ElMessage.success(`批量处理完成：成功 ${result.successCount || 0} 条，失败 ${result.failureCount || 0} 条`)
    return
  }
  const failureText = failures
    .slice(0, 6)
    .map((item) => `#${item.id}: ${item.reason || '未知原因'}`)
    .join('\n')
  ElMessageBox.alert(
    `批量处理完成：成功 ${result.successCount || 0} 条，失败 ${result.failureCount || 0} 条\n${failureText}`,
    '批量重复题处理结果',
    { type: 'warning' }
  )
}

const duplicateEvalExpectedType = (expected?: string) => {
  if (expected === 'DUPLICATE') return 'danger'
  if (expected === 'REVIEW') return 'warning'
  if (expected === 'NOT_DUPLICATE') return 'info'
  return 'info'
}

const formatJsonText = (value?: string) => {
  if (!value) return '-'
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

const parseNumberArray = (value?: string): number[] => {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0)
  } catch {
    return []
  }
}

const resetReviewApproveForm = (detail?: QuestionReviewDetailVO | null) => {
  Object.assign(reviewApproveForm, {
    title: detail?.questionTitle || '',
    content: detail?.questionContent || '',
    referenceAnswer: detail?.referenceAnswer || '',
    analysis: detail?.analysis || '',
    difficulty: detail?.difficulty || QUESTION_DIFFICULTY.MEDIUM,
    questionType: detail?.questionType || QUESTION_TYPE.SHORT_ANSWER,
    categoryId: detail?.categoryId,
    groupId: detail?.groupId,
    tagIds: parseNumberArray(detail?.tagIdsJson),
    status: 1,
    isHighFrequency: 0,
    experienceLevel: detail?.experienceYears ? `${detail.experienceYears}年` : '',
    editedReason: '编辑后审核通过'
  })
}

const getDuplicateStatusLabel = (status?: string) => {
  if (status === 'ALL') return '全部'
  if (status === 'PENDING') return '待处理'
  if (status === 'CONFIRMED' || status === 'MERGED') return '已合并'
  if (status === 'IGNORED') return '已忽略'
  return status || '-'
}

const getDuplicateStatusType = (status?: string) => {
  if (status === 'CONFIRMED' || status === 'MERGED') return 'success'
  if (status === 'IGNORED') return 'info'
  return 'warning'
}

const getDuplicateMatchTypeLabel = (matchType?: string) => {
  if (matchType === 'SEMANTIC_SIMILAR') return '语义相似'
  const labels: Record<string, string> = {
    HARD_TITLE_HASH: '标题指纹一致',
    HARD_CONTENT_HASH: '内容指纹一致',
    TITLE_EXACT: '标题完全一致',
    TITLE_NORMALIZED_EQUAL: '标题归一后一致',
    TITLE_SIMILAR: '标题高度相似',
    CONTENT_SIMILAR: '内容高度相似'
  }
  return matchType ? labels[matchType] || matchType : '-'
}

const getQuestionTypeLabel = (value?: string) => {
  if (!value) return '-'
  return questionTypeOptions.find((item) => item.value === value)?.label || value
}

const duplicateContextTagType = (same?: boolean | null) => {
  if (same === true) return 'success'
  if (same === false) return 'warning'
  return 'info'
}

const duplicateContextTagText = (same?: boolean | null) => {
  if (same === true) return '一致'
  if (same === false) return '不同'
  return '未知'
}

const duplicateContextTags = (row: QuestionDuplicateReviewListVO) => [
  { label: '分类', text: duplicateContextTagText(row.sameCategory), type: duplicateContextTagType(row.sameCategory) },
  { label: '题型', text: duplicateContextTagText(row.sameQuestionType), type: duplicateContextTagType(row.sameQuestionType) },
  { label: '难度', text: duplicateContextTagText(row.sameDifficulty), type: duplicateContextTagType(row.sameDifficulty) }
]

const duplicateContextHint = (row: QuestionDuplicateReviewListVO) => {
  const categoryText = `${row.sourceCategoryId || '-'} / ${row.targetCategoryId || '-'}`
  const typeText = `${getQuestionTypeLabel(row.sourceQuestionType)} / ${getQuestionTypeLabel(row.targetQuestionType)}`
  const difficultyText = `${getDifficultyLabel(row.sourceDifficulty)} / ${getDifficultyLabel(row.targetDifficulty)}`
  return `分类 ${categoryText} · 题型 ${typeText} · 难度 ${difficultyText}`
}

const formatSimilarity = (value?: number) => {
  if (value === undefined || value === null) return '-'
  const score = Number(value)
  if (!Number.isFinite(score)) return '-'
  const percent = score > 1 ? score : score * 100
  return `${percent.toFixed(percent >= 99 ? 0 : 2).replace(/\.00$/, '')}%`
}

const formatRate = (value?: number) => {
  if (value === undefined || value === null) return '-'
  const rate = Number(value)
  if (!Number.isFinite(rate)) return '-'
  return `${rate.toFixed(rate >= 99 ? 0 : 1).replace(/\.0$/, '')}%`
}

const duplicateScoreParts = (row: QuestionDuplicateReviewListVO) => {
  if (row.scoreParts?.length) {
    return row.scoreParts
      .filter((item) => Number.isFinite(Number(item.score)))
      .sort((left, right) => duplicateScorePartOrder(left.code) - duplicateScorePartOrder(right.code))
      .map((item) => ({
        code: item.code,
        label: item.label || item.code || '评分',
        value: formatSimilarity(Number(item.score))
      }))
  }
  const topLevelParts = [
    { code: 'vectorScore', label: '向量', score: row.vectorScore },
    { code: 'textScore', label: '文本', score: row.textScore },
    { code: 'finalScore', label: '综合', score: row.finalScore }
  ]
    .filter((item) => Number.isFinite(Number(item.score)))
    .map((item) => ({
      code: item.code,
      label: item.label,
      value: formatSimilarity(Number(item.score))
    }))
  if (topLevelParts.length) {
    return topLevelParts
  }
  return parseDuplicateScoreParts(row.matchReason)
}

const duplicateScorePartOrder = (code?: string) => {
  const order: Record<string, number> = {
    vectorScore: 10,
    textScore: 20,
    metadataScore: 30,
    tagScore: 40,
    finalScore: 50
  }
  return code ? order[code] ?? 100 : 100
}

const duplicateScoreBandLabel = (row: QuestionDuplicateReviewListVO) => {
  const scoreBand = row.scoreBand || parseDuplicateReasonToken(row.matchReason, 'scoreBand')
  if (scoreBand === 'STRONG') return '高置信'
  if (scoreBand === 'REVIEW') return '待审核'
  return ''
}

const duplicateScoreBandType = (row: QuestionDuplicateReviewListVO) => {
  const scoreBand = row.scoreBand || parseDuplicateReasonToken(row.matchReason, 'scoreBand')
  if (scoreBand === 'STRONG') return 'danger'
  if (scoreBand === 'REVIEW') return 'warning'
  return 'info'
}

const parseDuplicateReasonToken = (reason?: string, key?: string) => {
  if (!reason || !key) return ''
  const match = reason.match(new RegExp(`${key}=([^;\\s]+)`))
  return match?.[1] || ''
}

const parseDuplicateScoreParts = (reason?: string) => {
  if (!reason?.includes('semantic vector match')) {
    return []
  }
  const labels: Record<string, string> = {
    vectorScore: '向量',
    textScore: '文本',
    metadataScore: '元数据',
    tagScore: '标签',
    finalScore: '综合'
  }
  return ['vectorScore', 'textScore', 'metadataScore', 'tagScore', 'finalScore']
    .map((key) => {
      const match = reason.match(new RegExp(`${key}=([0-9.]+)`))
      return match ? { code: key, label: labels[key], value: `${Number(match[1]).toFixed(1).replace(/\.0$/, '')}%` } : null
    })
    .filter((item): item is { code: string; label: string; value: string } => Boolean(item))
}

const formatScoreDetailJson = (value?: string) => {
  if (!value) return '-'
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

const formatDuplicateReason = (reason?: string) => {
  if (!reason) return '-'
  if (reason.includes('content fingerprint exact match')) return '内容指纹完全一致'
  if (reason.includes('normalized title fingerprint exact match')) return '标题指纹完全一致'
  if (reason.includes('semantic vector match')) return '向量召回后综合文本相似度命中'
  return reason
}

const resolveTagIdsFromRow = (row?: AdminQuestionVO): number[] => {
  if (!row?.tags?.length) return []

  return row.tags
    .map((tag) => {
      if (typeof tag === 'string') {
        return tags.value.find((item) => item.name === tag)?.id
      }
      return tag?.id
    })
    .filter((id): id is number => Number.isFinite(Number(id)) && Number(id) > 0)
}

const fetchOptions = async () => {
  try {
    const [categoryResult, tagResult, groupResult] = await Promise.all([
      getQuestionCategoriesApi(),
      getQuestionTagsApi(),
      getQuestionGroupsApi({ status: 1 })
    ])
    categories.value = categoryResult
    tags.value = tagResult
    groups.value = groupResult
  } catch {
    categories.value = []
    tags.value = []
    groups.value = []
  }
}

const fetchQuestions = async () => {
  loading.value = true
  try {
    const result = await getAdminQuestionsApi(query)
    questions.value = result.records || []
    total.value = result.total || 0
  } catch {
    questions.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const applyFailureQuery = () => {
  const rawQuestionId = route.query.questionId
  const questionId = Array.isArray(rawQuestionId) ? rawQuestionId[0] : rawQuestionId
  if (!questionId) return
  const parsed = Number(questionId)
  if (!Number.isFinite(parsed) || parsed <= 0) return
  query.questionId = parsed
  query.pageNo = 1
  if (showDuplicatesPane.value) {
    duplicateQuery.keyword = String(parsed)
    duplicateQuery.pageNo = 1
  }
}

const fetchReviews = async () => {
  reviewLoading.value = true
  try {
    const result = await getQuestionReviewsApi(reviewQuery)
    reviews.value = result.records || []
    reviewTotal.value = result.total || 0
    selectedReviewRows.value = []
  } catch {
    reviews.value = []
    reviewTotal.value = 0
    selectedReviewRows.value = []
  } finally {
    reviewLoading.value = false
  }
}

const openReviewDrawer = async (id: number) => {
  reviewDrawerVisible.value = true
  reviewDetailLoading.value = true
  reviewDetail.value = null
  resetReviewApproveForm(null)
  try {
    const detail = await getQuestionReviewDetailApi(id)
    reviewDetail.value = detail
    resetReviewApproveForm(detail)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '审核详情加载失败')
  } finally {
    reviewDetailLoading.value = false
  }
}

const fetchDuplicateConfig = async () => {
  duplicateConfigLoading.value = true
  try {
    duplicateConfig.value = await getQuestionDuplicateConfigApi()
  } catch {
    duplicateConfig.value = null
  } finally {
    duplicateConfigLoading.value = false
  }
}

const fetchDuplicateFeedbackStats = async () => {
  duplicateFeedbackLoading.value = true
  try {
    duplicateFeedbackStats.value = await getQuestionDuplicateFeedbackStatsApi()
  } catch {
    duplicateFeedbackStats.value = null
  } finally {
    duplicateFeedbackLoading.value = false
  }
}

const refreshDuplicateWorkspace = async () => {
  await Promise.all([fetchDuplicates(), fetchDuplicateFeedbackStats(), refreshDuplicateEvalWorkspace()])
}

const fetchDuplicateEvalCases = async () => {
  duplicateEvalCaseLoading.value = true
  try {
    const result = await getQuestionDuplicateEvalCasesApi(duplicateEvalCaseQuery)
    duplicateEvalCases.value = result.records || []
    duplicateEvalCaseTotal.value = result.total || 0
  } catch {
    duplicateEvalCases.value = []
    duplicateEvalCaseTotal.value = 0
  } finally {
    duplicateEvalCaseLoading.value = false
  }
}

const fetchDuplicateEvalRuns = async () => {
  duplicateEvalRunLoading.value = true
  try {
    const result = await getQuestionDuplicateEvalRunsApi(duplicateEvalRunQuery)
    duplicateEvalRuns.value = result.records || []
    duplicateEvalRunTotal.value = result.total || 0
  } catch {
    duplicateEvalRuns.value = []
    duplicateEvalRunTotal.value = 0
  } finally {
    duplicateEvalRunLoading.value = false
  }
}

const openDuplicateEvalRun = async (id?: number) => {
  if (!id) return
  duplicateEvalRunDetailLoading.value = true
  try {
    duplicateEvalLatestRun.value = await getQuestionDuplicateEvalRunApi(id)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Evaluation run load failed')
  } finally {
    duplicateEvalRunDetailLoading.value = false
  }
}

const refreshDuplicateEvalWorkspace = async () => {
  await Promise.all([fetchDuplicateEvalCases(), fetchDuplicateEvalRuns()])
  if (duplicateEvalRuns.value[0]?.id) {
    await openDuplicateEvalRun(duplicateEvalRuns.value[0].id)
  }
}

const openDuplicateDrawer = async (id: number) => {
  duplicateDrawerVisible.value = true
  duplicateDetailLoading.value = true
  duplicateDetail.value = null
  try {
    duplicateDetail.value = await getQuestionDuplicateReviewDetailApi(id)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '重复候选详情加载失败')
  } finally {
    duplicateDetailLoading.value = false
  }
}
const fetchDuplicates = async () => {
  duplicateLoading.value = true
  try {
    const result = await getQuestionDuplicateReviewsApi({
      ...duplicateQuery,
      reviewStatus: duplicateQuery.reviewStatus || 'ALL'
    })
    duplicates.value = result.records || []
    duplicateTotal.value = result.total || 0
    selectedDuplicateRows.value = []
  } catch {
    duplicates.value = []
    duplicateTotal.value = 0
    selectedDuplicateRows.value = []
  } finally {
    duplicateLoading.value = false
  }
}

const fillQuestionForm = (row?: AdminQuestionVO) => {
  Object.assign(form, {
    title: row?.title || '',
    content: row?.content || '',
    referenceAnswer: row?.referenceAnswer || '',
    analysis: row?.analysis || '',
    categoryId: row?.categoryId,
    groupId: row?.groupId,
    difficulty: row?.difficulty || QUESTION_DIFFICULTY.MEDIUM,
    questionType: row?.questionType || QUESTION_TYPE.SHORT_ANSWER,
    experienceLevel: row?.experienceLevel || '',
    isHighFrequency: row?.isHighFrequency ?? 0,
    tagIds: resolveTagIdsFromRow(row),
    status: row?.status ?? 1
  })
}

const openDialog = async (row?: AdminQuestionVO) => {
  editingId.value = row?.id || null
  fillQuestionForm(row)
  dialogVisible.value = true
  if (!row?.id) return

  dialogLoading.value = true
  try {
    const detail = await getAdminQuestionDetailApi(row.id)
    if (editingId.value === row.id) {
      fillQuestionForm(detail)
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '题目详情加载失败，请稍后重试')
  } finally {
    dialogLoading.value = false
  }
}

const handleSave = async () => {
  if (dialogLoading.value) return
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  saving.value = true
  try {
    if (editingId.value) {
      await updateAdminQuestionApi(editingId.value, form)
    } else {
      await createAdminQuestionApi(form)
    }
    ElMessage.success('题目已保存')
    dialogVisible.value = false
    await fetchQuestions()
  } finally {
    saving.value = false
  }
}

const handleStatus = async (row: AdminQuestionVO) => {
  const nextStatus = row.status === 1 ? 0 : 1
  await updateAdminQuestionStatusApi(row.id, nextStatus)
  ElMessage.success(nextStatus === 1 ? '题目已启用' : '题目已禁用')
  await fetchQuestions()
}

const handleDelete = async (row: AdminQuestionVO) => {
  await ElMessageBox.confirm(`确认删除题目 ${row.title}？`, '删除确认', { type: 'warning' })
  await deleteAdminQuestionApi(row.id)
  ElMessage.success('题目已删除')
  await fetchQuestions()
}

const handleSearch = () => {
  query.pageNo = 1
  fetchQuestions()
}

const handleReset = () => {
  Object.assign(query, {
    keyword: '',
    questionId: undefined,
    categoryId: undefined,
    tagId: undefined,
    difficulty: '',
    status: '',
    pageNo: 1,
    pageSize: 10
  })
  fetchQuestions()
}

const resetReviewQuery = () => {
  Object.assign(reviewQuery, {
    keyword: '',
    reviewStatus: 'PENDING',
    batchId: '',
    pageNo: 1,
    pageSize: 10
  })
  fetchReviews()
}

const resetDuplicateQuery = () => {
  Object.assign(duplicateQuery, {
    keyword: '',
    reviewStatus: 'ALL',
    scoreBand: '',
    pageNo: 1,
    pageSize: 10
  })
  fetchDuplicates()
}

const resetGenerateForm = () => {
  Object.assign(generateForm, {
    targetPosition: '',
    technologyStack: '',
    knowledgePoint: '',
    questionType: QUESTION_TYPE.SHORT_ANSWER,
    difficulty: QUESTION_DIFFICULTY.MEDIUM,
    experienceYears: undefined,
    count: 5,
    extraRequirements: ''
  })
  generateResult.value = null
  generateSseEvents.value = []
  generateSseMessage.value = ''
  generateSseStatus.value = '未开始'
}

const normalizeGeneratePayload = (): AiQuestionGenerateRequestDTO => {
  const trimValue = (value?: string) => value?.trim() || undefined
  return {
    targetPosition: trimValue(generateForm.targetPosition),
    technologyStack: trimValue(generateForm.technologyStack),
    knowledgePoint: trimValue(generateForm.knowledgePoint),
    questionType: generateForm.questionType || undefined,
    difficulty: generateForm.difficulty || undefined,
    experienceYears: generateForm.experienceYears,
    count: Math.min(Math.max(Number(generateForm.count || 5), 1), 20),
    extraRequirements: trimValue(generateForm.extraRequirements)
  }
}

const viewGeneratedBatch = async () => {
  if (!generateResult.value?.batchId) return
  Object.assign(reviewQuery, {
    batchId: generateResult.value.batchId,
    reviewStatus: 'PENDING',
    pageNo: 1
  })
  governanceTab.value = 'reviews'
  await fetchReviews()
}

const completeGenerateFlow = async (result: AiQuestionGenerateResultVO) => {
  generateResult.value = result
  const generatedCount = result.generatedCount ?? result.successCount ?? result.count ?? result.reviewIds?.length ?? 0
  ElMessage.success(`已生成 ${generatedCount} 条待审核题目`)
  if (result.batchId) {
    await viewGeneratedBatch()
  } else {
    await fetchReviews()
  }
}

const runSyncGenerateFallback = async () => {
  generateSseStatus.value = '同步 fallback'
  generateSseMessage.value = 'SSE 未启动成功，已回退到原同步生成接口。'
  await completeGenerateFlow(await generateAiQuestionsApi(normalizeGeneratePayload()))
}

const pushGenerateSseEvent = (type: string, data?: AiQuestionGenerateSseEvent) => {
  const messageMap: Record<string, string> = {
    start: 'AI 题目生成开始',
    delta: 'AI 题目生成进行中',
    metadata: 'AI 题目生成状态更新',
    progress: 'AI 题目生成进行中',
    result: '已收到生成结果',
    done: 'AI 题目生成完成',
    error: 'AI 题目生成失败'
  }
  const message = type === 'delta' ? data?.content || data?.message || messageMap[type] : data?.message || messageMap[type] || type
  const result = resolveGenerateResult(data, generateResult.value)
  const metadataParts =
    type === 'result' || type === 'done'
      ? [
          result.batchId ? `batchId=${result.batchId}` : '',
          result.generatedCount != null ? `count=${result.generatedCount}` : '',
          result.reviewIds?.length ? `reviewIds=${result.reviewIds.length}` : '',
          result.aiCallLogId ? `aiCallLogId=${result.aiCallLogId}` : ''
        ].filter(Boolean)
      : []
  const display = [data?.stage, message, ...metadataParts].filter(Boolean).join(' · ')
  generateSseStatus.value = type
  generateSseMessage.value = display || message
  generateSseEvents.value.push({
    type,
    stage: data?.stage,
    message,
    display: display || message
  })
}

const resolveGenerateResult = (
  data?: AiQuestionGenerateSseEvent,
  latest?: AiQuestionGenerateResultVO | null
): AiQuestionGenerateResultVO => {
  const metadata = data?.metadata && typeof data.metadata === 'object' ? data.metadata : {}
  const result: Record<string, unknown> =
    data?.result && typeof data.result === 'object' ? (data.result as Record<string, unknown>) : {}
  const getValue = (key: string) => {
    if (data && key in data) return data[key]
    if (key in metadata) return metadata[key]
    if (key in result) return result[key]
    return undefined
  }
  const count = Number(getValue('count'))
  const successCount = Number(getValue('successCount'))
  return {
    batchId: String(getValue('batchId') || latest?.batchId || ''),
    reviewIds: (getValue('reviewIds') as number[] | undefined) || latest?.reviewIds,
    aiCallLogId: Number(getValue('aiCallLogId') || latest?.aiCallLogId || 0) || undefined,
    count: Number.isFinite(count) ? count : latest?.count,
    successCount: Number.isFinite(successCount) ? successCount : latest?.successCount,
    generatedCount: Number.isFinite(successCount)
      ? successCount
      : Number.isFinite(count)
        ? count
        : latest?.generatedCount,
    message: data?.message || latest?.message
  }
}

const handleGenerateReviews = async () => {
  if (generating.value) return
  generateSseHandle.value?.abort()
  generating.value = true
  generateResult.value = null
  generateSseEvents.value = []
  generateSseMessage.value = '正在启动阶段式生成进度。'
  generateSseStatus.value = '启动中'
  let streamStarted = false
  let latestResult: AiQuestionGenerateResultVO | null = null

  try {
    generateSseHandle.value = streamAiQuestionGenerateApi(normalizeGeneratePayload(), {
      onEvent: (event, data) => {
        if (event === 'start' || event === 'delta' || event === 'metadata' || event === 'progress' || event === 'result' || event === 'done') {
          streamStarted = true
        }
        pushGenerateSseEvent(event, data)
        if (event === 'metadata' || event === 'result' || event === 'done') {
          latestResult = resolveGenerateResult(data, latestResult)
          generateResult.value = latestResult
        }
      }
    })
    await generateSseHandle.value.finished
    if (latestResult) {
      await completeGenerateFlow(latestResult)
    } else {
      await fetchReviews()
    }
  } catch (error) {
    if (!streamStarted) {
      await runSyncGenerateFallback()
    } else {
      ElMessage.error(error instanceof Error ? error.message : 'AI 题目生成流中断，请稍后手动重试。')
    }
  } finally {
    generating.value = false
    generateSseHandle.value = null
  }
}

const handleApproveReview = async (id: number) => {
  await ElMessageBox.confirm('确认通过该 AI 题目并写入正式题库？', '审核通过', { type: 'warning' })
  await approveQuestionReviewApi(id)
  ElMessage.success('题目已通过审核')
  await Promise.all([fetchReviews(), fetchQuestions(), refreshDuplicateWorkspace()])
}

const handleRejectReview = async (id: number) => {
  const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回题目', {
    inputType: 'textarea',
    inputValidator: (value) => Boolean(value?.trim()) || '请输入驳回原因'
  })
  await rejectQuestionReviewApi(id, { rejectReason: value.trim() })
  ElMessage.success('题目已驳回')
  await fetchReviews()
}

const handleCancelReview = async (id: number) => {
  const { value } = await ElMessageBox.prompt('请输入作废原因', '作废 AI 草稿', {
    inputType: 'textarea',
    inputPlaceholder: '例如：E2E 测试数据清理或生成内容不再需要',
    inputValue: '管理员作废草稿',
    inputValidator: (value) => {
      const reason = value?.trim() || ''
      if (!reason) return '请输入作废原因'
      if (reason.length > 500) return '作废原因不能超过 500 字'
      return true
    }
  })
  await cancelQuestionReviewApi(id, { rejectReason: value.trim() })
  ElMessage.success('题目草稿已作废')
  if (reviewDetail.value?.id === id) {
    reviewDrawerVisible.value = false
  }
  await fetchReviews()
}

const handleApproveReviewWithEdit = async () => {
  if (!reviewDetail.value) return
  if (reviewDetail.value.reviewStatus !== 'PENDING') {
    ElMessage.warning('只有待审核题目可以编辑后通过')
    return
  }
  await ElMessageBox.confirm('确认按当前编辑内容通过该 AI 题目并写入正式题库？', '编辑后通过', { type: 'warning' })
  reviewApproveSaving.value = true
  try {
    await approveQuestionReviewApi(reviewDetail.value.id, {
      ...reviewApproveForm,
      title: reviewApproveForm.title?.trim(),
      content: reviewApproveForm.content?.trim(),
      referenceAnswer: reviewApproveForm.referenceAnswer?.trim(),
      analysis: reviewApproveForm.analysis?.trim(),
      experienceLevel: reviewApproveForm.experienceLevel?.trim(),
      editedReason: reviewApproveForm.editedReason?.trim() || '编辑后审核通过'
    })
    ElMessage.success('题目已编辑并通过审核')
    reviewDrawerVisible.value = false
    await Promise.all([fetchReviews(), fetchQuestions(), refreshDuplicateWorkspace()])
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '编辑后通过失败')
  } finally {
    reviewApproveSaving.value = false
  }
}

const handleBatchApproveReviews = async () => {
  const reviewIds = selectedPendingReviewIds.value
  if (!reviewIds.length) {
    ElMessage.warning('请先选择待审核记录')
    return
  }
  const { value } = await ElMessageBox.prompt(`确认批量通过 ${reviewIds.length} 条待审核题目？`, '批量通过', {
    inputPlaceholder: '可选：填写通过说明',
    inputValue: '批量审核通过'
  })
  batchReviewProcessing.value = true
  try {
    const result = await batchApproveQuestionReviewsApi({
      reviewIds,
      approveData: {
        status: 1,
        isHighFrequency: 0,
        editedReason: value?.trim() || '批量审核通过'
      }
    })
    showBatchReviewResult(result)
    await Promise.all([fetchReviews(), fetchQuestions(), refreshDuplicateWorkspace()])
  } finally {
    batchReviewProcessing.value = false
  }
}

const handleBatchRejectReviews = async () => {
  const reviewIds = selectedPendingReviewIds.value
  if (!reviewIds.length) {
    ElMessage.warning('请先选择待审核记录')
    return
  }
  const { value } = await ElMessageBox.prompt(`请输入 ${reviewIds.length} 条题目的批量驳回原因`, '批量驳回', {
    inputType: 'textarea',
    inputPlaceholder: '例如：不符合题库质量要求',
    inputValidator: (value) => {
      const reason = value?.trim() || ''
      if (!reason) return '请输入驳回原因'
      if (reason.length > 500) return '驳回原因不能超过 500 字'
      return true
    }
  })
  batchReviewProcessing.value = true
  try {
    const result = await batchRejectQuestionReviewsApi({
      reviewIds,
      rejectReason: value.trim()
    })
    showBatchReviewResult(result)
    await fetchReviews()
  } finally {
    batchReviewProcessing.value = false
  }
}

const handleCheckDuplicates = async () => {
  const questionIds = questions.value.map((item) => item.id).filter(Boolean)
  if (!questionIds.length) {
    ElMessage.warning('当前页没有可检测题目')
    return
  }
  duplicateChecking.value = true
  try {
    const result = await checkQuestionDuplicateApi({ questionIds })
    ElMessage.success(`已检测 ${result.checkedCount || questionIds.length} 道题，新增 ${result.createdCount || 0} 条候选`)
    await refreshDuplicateWorkspace()
  } finally {
    duplicateChecking.value = false
  }
}

const duplicateExpectedLabel = (row: QuestionDuplicateReviewListVO) => {
  if (row.reviewStatus === 'CONFIRMED') return 'DUPLICATE'
  if (row.reviewStatus === 'IGNORED') return 'NOT_DUPLICATE'
  return 'REVIEW'
}

const duplicateEvaluationSamples = () =>
  duplicates.value
    .filter((item) => item.sourceQuestionId && item.targetQuestionId)
    .map((item) => ({
      caseId: `review-${item.id}`,
      sourceQuestionId: item.sourceQuestionId,
      targetQuestionId: item.targetQuestionId,
      expected: duplicateExpectedLabel(item),
      note: [item.matchType, item.scoreBand, formatSimilarity(item.similarityScore)].filter(Boolean).join(' / ')
    }))

const handleEvaluateDuplicates = async () => {
  const samples = duplicateEvaluationSamples()
  if (!samples.length) {
    ElMessage.warning('No evaluable duplicate candidates on this page')
    return
  }
  duplicateEvaluating.value = true
  try {
    duplicateEvaluation.value = await evaluateQuestionDuplicateApi({ samples })
    const result = duplicateEvaluation.value
    ElMessage.success(
      `Evaluation done: ${result.passedCount || 0}/${result.evaluatedCount || 0}, accuracy ${formatRate(result.accuracyRate)}`
    )
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Duplicate evaluation failed')
  } finally {
    duplicateEvaluating.value = false
  }
}

const saveCurrentDuplicateEvalCases = async () => {
  const samples = duplicateEvaluationSamples()
  if (!samples.length) {
    ElMessage.warning('No duplicate candidates can be saved on this page')
    return
  }
  duplicateEvalSaving.value = true
  try {
    let saved = 0
    for (const sample of samples) {
      await saveQuestionDuplicateEvalCaseApi({
        caseId: sample.caseId,
        sourceQuestionId: sample.sourceQuestionId,
        targetQuestionId: sample.targetQuestionId,
        expected: sample.expected,
        note: sample.note,
        enabled: 1
      })
      saved++
    }
    ElMessage.success(`Saved ${saved} evaluation cases`)
    await refreshDuplicateEvalWorkspace()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Evaluation cases save failed')
  } finally {
    duplicateEvalSaving.value = false
  }
}

const runDuplicateEvalCases = async () => {
  duplicateEvalRunning.value = true
  try {
    const result = await runQuestionDuplicateEvalApi({
      onlyEnabled: true,
      limit: 100
    })
    duplicateEvalLatestRun.value = result
    ElMessage.success(
      `Evaluation run done: ${result.passedCount || 0}/${result.evaluatedCount || 0}, accuracy ${formatRate(result.accuracyRate)}`
    )
    await fetchDuplicateEvalRuns()
    if (result.id) {
      await openDuplicateEvalRun(result.id)
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Evaluation run failed')
  } finally {
    duplicateEvalRunning.value = false
  }
}

const sweepDuplicateThresholds = async () => {
  duplicateThresholdSweeping.value = true
  try {
    const result = await sweepQuestionDuplicateThresholdApi({
      onlyEnabled: true,
      limit: 100,
      minThreshold: 70,
      maxThreshold: 95,
      step: 5
    })
    duplicateThresholdSweep.value = result
    ElMessage.success(
      `Threshold sweep done: best ${result.bestThreshold ?? '--'}, F1 ${formatRate(result.bestF1)}`
    )
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Threshold sweep failed')
  } finally {
    duplicateThresholdSweeping.value = false
  }
}

const deleteDuplicateEvalCase = async (id?: number) => {
  if (!id) return
  await ElMessageBox.confirm('Delete this evaluation case?', 'Delete Evaluation Case', { type: 'warning' })
  try {
    await deleteQuestionDuplicateEvalCaseApi(id)
    ElMessage.success('Evaluation case deleted')
    await fetchDuplicateEvalCases()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Evaluation case delete failed')
  }
}

const handleRebuildEmbedding = async () => {
  await ElMessageBox.confirm(
    '将按更新时间重建最多 5000 道启用题目的文本指纹和向量索引，期间可能产生 embedding 调用成本。确认继续？',
    '重建题目向量索引',
    { type: 'warning' }
  )
  embeddingRebuilding.value = true
  try {
    const result = await rebuildQuestionEmbeddingApi(5000)
    const errors = result.errors || []
    const summary = `索引重建完成：元数据 ${result.updated || 0} 条，向量 ${result.vectorUpdated || 0} 条`
    if (errors.length || result.failedBatches) {
      await ElMessageBox.alert(
        [
          summary,
          `失败批次：${result.failedBatches || errors.length}`,
          ...errors.slice(0, 8).map((item, index) => `${index + 1}. ${item}`),
          errors.length > 8 ? `还有 ${errors.length - 8} 条错误未展示，请查看后端日志。` : ''
        ].filter(Boolean).join('\n'),
        '题目向量索引重建结果',
        { type: 'warning' }
      )
      return
    }
    ElMessage.success(summary)
  } finally {
    embeddingRebuilding.value = false
  }
}

const handleEmbeddingStats = async () => {
  embeddingStatsLoading.value = true
  try {
    const stats = await getQuestionEmbeddingStatsApi()
    const statusLines = (stats.statusCounts || [])
      .map((item) => `${item.status || 'UNKNOWN'}: ${item.count || 0}`)
      .join('\n')
    const dimensionLines = (stats.dimensionCounts || [])
      .map((item) => `${item.dimension || '--'} dims: ${item.count || 0}`)
      .join('\n')
    const modelLines = (stats.modelCounts || [])
      .map((item) => `${item.model || 'UNKNOWN'}: ${item.count || 0}`)
      .join('\n')
    await ElMessageBox.alert(
      [
        `Vector store: ${stats.vectorEnabled ? 'enabled' : 'disabled'}`,
        `Index records: ${stats.total || 0}, failed: ${stats.failed || 0}`,
        `Collection: ${stats.collection?.collectionName || 'question_embedding'} / ${stats.collection?.status || '--'}`,
        `Dimension: ${stats.collection?.vectorSize || '--'}, points: ${stats.collection?.pointCount ?? '--'}`,
        `Last indexed: ${stats.lastIndexedAt || '--'}, last failed: ${stats.lastFailedAt || '--'}`,
        `Average text chars: ${stats.averageTextChars ?? '--'}`,
        statusLines ? `\nStatus distribution:\n${statusLines}` : '',
        dimensionLines ? `\nDimension distribution:\n${dimensionLines}` : '',
        modelLines ? `\nEmbedding model distribution:\n${modelLines}` : '',
        stats.collection?.errorMessage ? `\nError: ${stats.collection.errorMessage}` : ''
      ].filter(Boolean).join('\n'),
      '题目向量索引状态',
      { type: stats.failed ? 'warning' : 'info' }
    )
  } finally {
    embeddingStatsLoading.value = false
  }
}

const handleRetryFailedEmbedding = async () => {
  await ElMessageBox.confirm(
    '将重试最多 1000 条失败的题目向量索引记录，期间可能产生 embedding 调用成本。确认继续？',
    '重试失败题目向量',
    { type: 'warning' }
  )
  embeddingRetrying.value = true
  try {
    const result = await retryFailedQuestionEmbeddingApi(1000)
    const errors = result.errors || []
    const deleteSummary = result.vectorDeleted ? `，清理向量 ${result.vectorDeleted || 0} 条` : ''
    const summary = `重试完成：匹配 ${result.matched || 0} 条，已重试 ${result.retried || 0} 条${deleteSummary}`
    if (errors.length) {
      await ElMessageBox.alert(
        [summary, ...errors.slice(0, 8).map((item, index) => `${index + 1}. ${item}`)].join('\n'),
        '失败题目向量重试结果',
        { type: 'warning' }
      )
      return
    }
    ElMessage.success(summary)
  } finally {
    embeddingRetrying.value = false
  }
}

const handleMergeDuplicate = async (id: number) => {
  await ElMessageBox.confirm(
    '确认后会建立 SAME_INTENT 关系，并自动归入同一 canonical 题组；后续每日推荐、内部推荐会按题组/同意图排重。',
    '确认同意图重复题',
    { type: 'warning' }
  )
  const { value } = await ElMessageBox.prompt('请输入合并原因', '合并重复题', {
    inputType: 'textarea',
    inputPlaceholder: '例如：语义重复，保留主问题并建立重复关系'
  })
  await mergeQuestionDuplicateReviewApi(id, {
    relationType: 'SAME_INTENT',
    reason: value?.trim() || '确认重复'
  })
  ElMessage.success('重复题已合并')
  await refreshDuplicateWorkspace()
}

const handleIgnoreDuplicate = async (id: number) => {
  const { value } = await ElMessageBox.prompt('请输入忽略原因', '忽略重复候选', {
    inputType: 'textarea',
    inputPlaceholder: '例如：考察角度不同'
  })
  await ignoreQuestionDuplicateReviewApi(id, {
    ignoredReason: value?.trim() || '确认不是重复题'
  })
  ElMessage.success('重复候选已忽略')
  await refreshDuplicateWorkspace()
}

const handleBatchMergeDuplicates = async () => {
  const ids = selectedPendingDuplicateIds.value
  if (!ids.length) return
  await ElMessageBox.confirm(
    `将批量合并 ${ids.length} 条待处理重复候选，后端会逐条建立 SAME_INTENT 关系；冲突项会返回失败明细。确认继续？`,
    '批量合并重复题',
    { type: 'warning' }
  )
  const { value } = await ElMessageBox.prompt('请输入批量合并原因', '批量合并重复题', {
    inputType: 'textarea',
    inputPlaceholder: '例如：批量确认同意图重复'
  })
  duplicateBatchProcessing.value = true
  try {
    const result = await batchMergeQuestionDuplicateReviewApi({
      ids,
      relationType: 'SAME_INTENT',
      reason: value?.trim() || '批量确认重复'
    })
    showBatchDuplicateResult(result)
    selectedDuplicateRows.value = []
    await refreshDuplicateWorkspace()
  } finally {
    duplicateBatchProcessing.value = false
  }
}

const handleBatchIgnoreDuplicates = async () => {
  const ids = selectedPendingDuplicateIds.value
  if (!ids.length) return
  await ElMessageBox.confirm(
    `将批量忽略 ${ids.length} 条待处理重复候选；后端会逐条处理，冲突项会返回失败明细。确认继续？`,
    '批量忽略重复候选',
    { type: 'warning' }
  )
  const { value } = await ElMessageBox.prompt('请输入批量忽略原因', '批量忽略重复候选', {
    inputType: 'textarea',
    inputPlaceholder: '例如：考察角度不同'
  })
  duplicateBatchProcessing.value = true
  try {
    const result = await batchIgnoreQuestionDuplicateReviewApi({
      ids,
      ignoredReason: value?.trim() || '批量确认不是重复题'
    })
    showBatchDuplicateResult(result)
    selectedDuplicateRows.value = []
    await refreshDuplicateWorkspace()
  } finally {
    duplicateBatchProcessing.value = false
  }
}

// ============ 批量导入/导出 ============
const importDialogVisible = ref(false)
const importing = ref(false)
const importFile = ref<File | null>(null)
const importUploadRef = ref()

const handleImportFileChange = (file: { raw: File }) => {
  importFile.value = file.raw
}

const importDuplicateReasonLabel = (code?: string) => {
  const labels: Record<string, string> = {
    FILE_TITLE_DUPLICATE: '文件内标题重复',
    FILE_CONTENT_DUPLICATE: '文件内内容重复',
    BANK_TITLE_DUPLICATE: '题库标题已存在',
    BANK_CONTENT_DUPLICATE: '题库内容已存在'
  }
  return code ? labels[code] || code : '重复'
}

const handleImport = async () => {
  if (!importFile.value) return
  importing.value = true
  try {
    const result = await importAdminQuestionsApi(importFile.value)
    const duplicateParts = Object.entries(result.duplicateReasonCounts || {})
      .filter(([, count]) => Number(count) > 0)
      .map(([code, count]) => `${importDuplicateReasonLabel(code)} ${count}`)
    const summary = `导入完成：总数 ${result.totalCount || 0}，成功 ${result.successCount || 0}，失败 ${result.failCount || 0}，重复 ${result.duplicateCount || 0}${duplicateParts.length ? `（${duplicateParts.join('，')}）` : ''}`
    if (result.errors?.length) {
      await ElMessageBox.alert(
        [summary, ...result.errors.slice(0, 8).map((item) => `第 ${item.rowIndex || '-'} 行：${item.title || '-'} - ${importDuplicateReasonLabel(item.reason)}`)]
          .join('\n'),
        '导入结果',
        { type: result.successCount ? 'warning' : 'error' }
      )
    } else {
      ElMessage.success(summary)
    }
    importDialogVisible.value = false
    importFile.value = null
    await Promise.all([fetchQuestions(), refreshDuplicateWorkspace()])
  } catch {
    ElMessage.error('导入失败')
  } finally {
    importing.value = false
  }
}

const handleExport = async () => {
  try {
    const res = await exportAdminQuestionsApi({ ...query })
    const blob = new Blob([res as unknown as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `questions_export_${Date.now()}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  }
}

const handleDownloadTemplate = async () => {
  try {
    const res = await downloadQuestionImportTemplate()
    const blob = new Blob([res as unknown as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'question_import_template.xlsx'
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('模板下载成功')
  } catch {
    ElMessage.error('模板下载失败')
  }
}

onMounted(async () => {
  applyFailureQuery()
  await fetchOptions()
  await Promise.all([fetchQuestions(), fetchReviews(), refreshDuplicateWorkspace(), fetchDuplicateConfig()])
})

watch(
  () => route.query.questionId,
  async () => {
    applyFailureQuery()
    await fetchQuestions()
  }
)

watch(
  () => props.initialGovernanceTab,
  (tab) => {
    governanceTab.value = tab
  }
)

onUnmounted(() => {
  generateSseHandle.value?.abort()
})
</script>

<style scoped lang="scss">
.filter-form {
  width: 100%;
}

.tag-item {
  margin-right: 6px;
}

.dialog-alert {
  margin-bottom: 16px;
}

.question-distribution {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 0 20px 16px;
  color: var(--app-text-muted);
  font-size: 13px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
}

.governance-panel {
  margin-top: 18px;
}

.governance-tabs {
  padding: 0 20px 20px;
}

.governance-tabs--single {
  padding-top: 20px;

  :deep(.el-tabs__header) {
    display: none;
  }
}

.governance-filter {
  padding: 0 0 16px;
}

.duplicate-feedback-panel {
  display: grid;
  gap: 14px;
  margin: 0 0 16px;
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.34);
}

.duplicate-feedback-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.duplicate-feedback-panel__head > div,
.duplicate-feedback-card,
.duplicate-feedback-recommendation,
.duplicate-feedback-buckets article {
  min-width: 0;
}

.duplicate-feedback-panel__head strong,
.duplicate-feedback-card strong,
.duplicate-feedback-recommendation strong,
.duplicate-feedback-buckets strong {
  color: var(--app-text);
}

.duplicate-feedback-panel__head span,
.duplicate-feedback-card span,
.duplicate-feedback-card small,
.duplicate-feedback-recommendation span,
.duplicate-feedback-recommendation small,
.duplicate-feedback-buckets span,
.duplicate-feedback-buckets small {
  color: var(--app-text-muted);
  font-size: 13px;
}

.duplicate-feedback-panel__head span,
.duplicate-feedback-card span,
.duplicate-feedback-card small,
.duplicate-feedback-recommendation span,
.duplicate-feedback-recommendation small,
.duplicate-feedback-buckets small {
  display: block;
}

.duplicate-feedback-grid,
.duplicate-feedback-buckets {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.duplicate-feedback-card,
.duplicate-feedback-recommendation,
.duplicate-feedback-buckets article {
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.42);
}

.duplicate-feedback-card strong {
  display: block;
  margin: 6px 0 3px;
  font-size: 20px;
}

.duplicate-feedback-recommendation {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.duplicate-feedback-recommendation strong {
  display: block;
  margin-top: 5px;
  line-height: 1.45;
}

.duplicate-feedback-buckets article div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.duplicate-feedback-alert {
  margin-top: 2px;
}

.review-batch-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 0 14px;
  color: var(--app-text-muted);
  font-size: 13px;
}

.duplicate-evaluation-panel {
  display: grid;
  gap: 12px;
  margin: 0 0 16px;
  padding: 14px 16px;
  border: 1px solid rgba(59, 130, 246, 0.28);
  border-radius: 10px;
  background: rgba(30, 64, 175, 0.12);
}

.duplicate-threshold-panel {
  display: grid;
  gap: 12px;
  margin: 0 0 16px;
  padding: 14px 16px;
  border: 1px solid rgba(20, 184, 166, 0.24);
  border-radius: 10px;
  background: rgba(15, 118, 110, 0.12);
}

.duplicate-threshold-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.duplicate-threshold-panel__head strong,
.duplicate-threshold-grid strong {
  display: block;
  color: var(--app-text);
}

.duplicate-threshold-panel__head span,
.duplicate-threshold-grid span,
.duplicate-threshold-grid small {
  display: block;
  color: var(--app-text-muted);
  font-size: 13px;
}

.duplicate-threshold-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.duplicate-threshold-grid article {
  min-width: 0;
  padding: 10px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.26);
}

.duplicate-threshold-grid strong {
  margin: 5px 0;
  font-size: 18px;
}

.duplicate-evaluation-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.duplicate-evaluation-panel__head strong,
.duplicate-evaluation-grid strong,
.duplicate-evaluation-failures strong {
  color: var(--app-text);
}

.duplicate-evaluation-panel__head span,
.duplicate-evaluation-grid span,
.duplicate-evaluation-failures span,
.duplicate-evaluation-failures small {
  color: var(--app-text-muted);
  font-size: 13px;
}

.duplicate-evaluation-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.duplicate-evaluation-grid article,
.duplicate-evaluation-failures article {
  min-width: 0;
  padding: 10px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.28);
}

.duplicate-evaluation-grid span,
.duplicate-evaluation-grid strong,
.duplicate-evaluation-failures strong,
.duplicate-evaluation-failures span,
.duplicate-evaluation-failures small {
  display: block;
}

.duplicate-evaluation-failures {
  display: grid;
  gap: 8px;
}

.duplicate-score-parts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.duplicate-context-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.duplicate-context-tags small {
  flex: 0 0 100%;
  overflow: hidden;
  color: var(--app-text-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.duplicate-score-debug {
  margin-top: 12px;
}

.duplicate-score-debug pre {
  max-height: 220px;
  margin: 0;
  overflow: auto;
  color: var(--app-text-muted);
  white-space: pre-wrap;
  word-break: break-word;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  line-height: 1.6;
}

.muted-text {
  color: var(--app-text-muted);
}

.review-detail-content {
  min-height: 420px;
}

.review-detail-section {
  margin-bottom: 22px;
}

.review-detail-section__title {
  margin-bottom: 12px;
  color: var(--app-text);
  font-size: 15px;
  font-weight: 700;
}

.review-json-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.review-json-card {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.38);
}

.review-json-card span {
  display: block;
  margin-bottom: 8px;
  color: var(--app-text);
  font-weight: 700;
}

.review-json-card pre {
  max-height: 220px;
  margin: 0;
  overflow: auto;
  color: var(--app-text-muted);
  white-space: pre-wrap;
  word-break: break-word;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
  line-height: 1.6;
}

.ai-generate-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.ai-generate-form {
  padding: 18px 0 4px;
}

.ai-generate-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.sse-progress {
  padding: 14px;
  border: 1px solid rgba(129, 140, 248, 0.2);
  border-radius: 12px;
  background: rgba(2, 6, 23, 0.24);

  p {
    margin: 8px 0 0;
    color: #cbd5e1;
    font-size: 12px;
    line-height: 1.6;
  }
}

.sse-progress__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #dbeafe;
  font-size: 13px;
  font-weight: 700;
}

.sse-progress__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;

  span {
    color: var(--app-text-muted);
    font-size: 12px;
    line-height: 1.5;
  }
}

.generate-result-card {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.42);
}

.generate-result-card__title {
  margin-bottom: 12px;
  color: var(--app-text);
  font-size: 15px;
  font-weight: 700;
}
</style>
