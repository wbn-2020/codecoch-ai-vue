<template>
  <div class="page-shell admin-console-page question-governance-page">
    <section v-if="showQuestionManagement" class="admin-hero question-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <BookOpenCheck :size="16" />
          <span>Java 题库治理</span>
        </div>
        <h1 class="admin-hero__title">题库治理</h1>
        <p class="admin-hero__desc">
          维护 Java 面试题库的分类、标签、题组、难度和上下架状态，并跟进 AI 生成题目的审核进度。
        </p>
      </div>
      <div class="question-hero-actions">
        <div class="question-hero-actions__group">
          <span>内容操作</span>
          <el-button v-permission="'admin:question:write'" type="primary" @click="openDialog()">
            <Plus :size="16" />
            新增题目
          </el-button>
          <el-button v-permission="'admin:question:import'" @click="importDialogVisible = true">
            <Upload :size="16" />
            批量导入
          </el-button>
          <el-button v-permission="'admin:question:export'" @click="handleExport">
            <Download :size="16" />
            导出题目
          </el-button>
        </div>
        <div v-if="showEmbeddingActions" class="question-hero-actions__group question-hero-actions__group--risk">
          <span><AlertTriangle :size="14" />索引维护</span>
          <el-button :loading="embeddingStatsLoading" @click="handleEmbeddingStats">
            <RefreshCw :size="16" />
            索引状态
          </el-button>
          <el-button
            v-if="(embeddingFailedCount || 0) > 0"
            v-permission="'admin:question:embedding:rebuild'"
            type="warning"
            plain
            :loading="embeddingRetrying"
            @click="handleRetryFailedEmbedding"
          >
            <RefreshCw :size="16" />
            {{ embeddingRetryLabel }}
          </el-button>
          <el-button v-if="lastEmbeddingJob" plain @click="openLatestEmbeddingJob">
            <BookOpenCheck :size="16" />
            查看索引任务
          </el-button>
          <el-dropdown trigger="click">
            <el-button v-permission="'admin:question:embedding:rebuild'" type="warning" plain :disabled="embeddingRebuilding">
              <MoreHorizontal :size="16" />
              更多索引操作
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :disabled="embeddingRebuilding" @click="handleRebuildEmbedding">重建语义索引</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <small>{{ embeddingActionHint }}</small>
        </div>
        <div v-else class="question-hero-actions__group question-hero-actions__group--muted">
          <span>索引维护</span>
          <small>题库有数据后再进行语义索引状态检查和索引维护。</small>
        </div>
      </div>
    </section>

    <div v-if="showQuestionManagement" class="admin-insight-grid">
      <article class="admin-insight-card">
        <span>题目总数</span>
        <strong>{{ total }}</strong>
        <small>当前题库列表总数</small>
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
        <small>待审核题目数量</small>
      </article>
    </div>

    <section v-if="showQuestionManagement" class="admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2>题目列表</h2>
          <p>维护题目内容、分类标签和上下架状态，保持题库质量稳定。</p>
        </div>
        <div class="table-view-tools">
          <el-segmented v-model="questionTableSize" :options="questionTableSizeOptions" />
          <el-dropdown trigger="click" :hide-on-click="false">
            <el-button plain>列配置</el-button>
            <template #dropdown>
              <el-dropdown-menu class="column-config-menu">
                <el-dropdown-item v-for="item in questionColumnOptions" :key="item.key">
                  <el-checkbox v-model="questionVisibleColumns[item.key]" :disabled="item.required">
                    {{ item.label }}
                  </el-checkbox>
                </el-dropdown-item>
                <el-dropdown-item divided>
                  <el-button link type="primary" @click.stop="resetQuestionTableView">恢复默认视图</el-button>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <div class="admin-filter-bar">
        <el-form class="filter-form" :model="query" inline>
          <el-form-item label="关键词">
            <el-input v-model.trim="query.keyword" clearable placeholder="题目标题" />
          </el-form-item>
          <el-form-item label="题目编号">
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
        <el-table v-loading="loading" :data="questions" row-key="id" :size="questionTableSize">
          <template #empty>
            <AppState v-if="questionError" type="error" title="题目列表加载失败" :description="questionError">
              <el-button type="primary" :loading="loading" @click="fetchQuestions">重新加载</el-button>
            </AppState>
            <AppState v-else type="empty" :title="questionEmptyTitle" :description="questionEmptyDescription">
              <el-button v-if="hasQuestionFilters" type="primary" @click="handleReset">清空筛选</el-button>
              <el-button v-else v-permission="'admin:question:write'" type="primary" @click="openDialog()">新增题目</el-button>
            </AppState>
          </template>
          <el-table-column v-if="isQuestionColumnVisible('title')" prop="title" label="题目标题" min-width="220" show-overflow-tooltip />
          <el-table-column v-if="isQuestionColumnVisible('category')" label="分类" min-width="130">
            <template #default="{ row }">
              <el-tag v-if="row.categoryName" type="info" effect="plain">{{ row.categoryName }}</el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column v-if="isQuestionColumnVisible('group')" label="题组" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">{{ row.groupTitle || getGroupNameById(row.groupId) }}</template>
          </el-table-column>
          <el-table-column v-if="isQuestionColumnVisible('difficulty')" label="难度" width="110">
            <template #default="{ row }">
              <el-tag :type="getDifficultyTagType(row.difficulty)" effect="plain">
                {{ getDifficultyLabel(row.difficulty) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="isQuestionColumnVisible('tags')" label="标签" min-width="220">
            <template #default="{ row }">
              <div class="question-tag-cell">
                <el-tag v-for="(tag, index) in getDisplayTags(row)" :key="`${row.id}-${index}`" class="tag-item" size="small" effect="plain">
                  {{ tag }}
                </el-tag>
                <span v-if="getDisplayTags(row).length === 0" class="muted-cell">-</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column v-if="isQuestionColumnVisible('status')" label="状态" width="100">
            <template #default="{ row }"><StatusTag :status="row.status" /></template>
          </el-table-column>
          <el-table-column v-if="isQuestionColumnVisible('createdAt')" prop="createdAt" label="创建时间" min-width="170" />
          <el-table-column label="操作" width="150">
            <template #default="{ row }">
              <div class="question-row-actions">
                <el-button v-permission="'admin:question:write'" link type="primary" :loading="editingId === row.id && dialogLoading" @click="openDialog(row)">编辑</el-button>
                <el-dropdown trigger="click" @command="(command: string) => handleQuestionCommand(row, command)">
                  <el-button v-permission="'admin:question:write'" text :icon="MoreHorizontal" aria-label="更多操作" />
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="status">{{ row.status === 1 ? '禁用' : '启用' }}</el-dropdown-item>
                      <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
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
        <el-button v-if="!props.governanceOnly" v-permission="'admin:question:generate'" :loading="generating" @click="governanceTab = 'generate'">AI 生成题目</el-button>
      </div>

      <el-tabs v-model="governanceTab" :class="['governance-tabs', { 'governance-tabs--single': props.governanceOnly }]">
        <el-tab-pane v-if="showGeneratePane" label="AI 生成" name="generate">
          <div class="ai-generate-panel">
            <el-alert
              type="info"
              :closable="false"
              show-icon
              title="生成结果会进入审核池，请在审核通过后再发布到正式题库。"
            />
            <AppState v-if="generateError" type="error" title="AI 题目生成失败" :description="generateError">
              <el-button v-permission="'admin:question:generate'" type="primary" :loading="generating" @click="handleGenerateReviews">重新生成</el-button>
            </AppState>
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
                      placeholder="可补充场景、侧重点或排除项；不要填写后台无法识别的字段。"
                    />
                  </el-form-item>
                </el-col>
              </el-row>
              <div class="ai-generate-actions">
                <el-button v-permission="'admin:question:generate'" :loading="generating" type="primary" @click="handleGenerateReviews">生成到审核池</el-button>
                <el-button @click="resetGenerateForm">重置</el-button>
                <el-button v-if="hasGeneratedDrafts(generateResult)" type="success" plain @click="viewGeneratedBatch">
                  查看本批次审核题
                </el-button>
              </div>
            </el-form>

            <div v-if="generateSseEvents.length || generateSseMessage" class="sse-progress">
              <div class="sse-progress__head">
                <span>任务提交进度</span>
                <el-tag size="small" effect="plain">{{ generateSseStatus }}</el-tag>
              </div>
              <p>{{ generateSseMessage || '等待生成任务回执。' }}</p>
              <div class="sse-progress__list">
                <span v-for="(event, index) in generateSseEvents" :key="`${event.type}-${index}`">
                  {{ event.display }}
                </span>
              </div>
            </div>

            <div v-if="generateResult" class="generate-result-card">
              <div class="generate-result-card__title">生成结果</div>
              <el-descriptions :column="3" border>
                <el-descriptions-item label="生成批次">{{ generateResult.batchId ? '已创建' : '-' }}</el-descriptions-item>
                <el-descriptions-item label="待审核草稿">{{ generateDraftSummary(generateResult) }}</el-descriptions-item>
                <el-descriptions-item label="处理链路">{{ generateResult.aiCallLogId ? 'AI 运行记录已保存' : '-' }}</el-descriptions-item>
                <el-descriptions-item label="生成数量">
                  {{ generateResult.generatedCount ?? generateResult.successCount ?? generateResult.count ?? '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="结果说明">{{ generateResult.message || '-' }}</el-descriptions-item>
                <el-descriptions-item label="失败原因">{{ generateResult.failedReason || '-' }}</el-descriptions-item>
              </el-descriptions>
              <el-collapse
                v-if="generateResult.batchId || generateResult.reviewIds?.length || generateResult.aiCallLogId || generateResult.asyncMessageId || generateResult.asyncTraceId || generateResult.asyncBizType"
                class="generate-result-card__diagnostics"
              >
                <el-collapse-item title="技术诊断（排障时展开）" name="generate-diagnostics">
                  <div class="generate-result-card__diagnostic-list">
                    <span v-if="generateResult.batchId">生成批次 {{ generateResult.batchId }}</span>
                    <span v-if="generateResult.reviewIds?.length">审核题 {{ generateResult.reviewIds.join(', ') }}</span>
                    <span v-if="generateResult.aiCallLogId">AI 运行记录 {{ generateResult.aiCallLogId }}</span>
                    <span v-if="generateResult.asyncMessageId">处理任务 {{ generateResult.asyncMessageId }}</span>
                    <span v-if="generateResult.asyncTraceId">追踪号 {{ generateResult.asyncTraceId }}</span>
                    <span>{{ generateResult.asyncBizType || 'question.generate' }} / {{ generateResult.asyncBizId || generateResult.batchId || '-' }}</span>
                    <span v-if="generateResult.asyncSendStatus">投递 {{ generateResult.asyncSendStatus }}</span>
                  </div>
                </el-collapse-item>
              </el-collapse>
              <div class="generate-result-card__actions">
                <el-button
                  v-if="generateResult.asyncBizType || generateResult.asyncTraceId || generateResult.asyncMessageId"
                  type="primary"
                  plain
                  @click="viewGenerateTask"
                >
                  查看任务中心
                </el-button>
                <el-button v-if="hasGeneratedDrafts(generateResult)" type="success" plain @click="viewGeneratedBatch">
                  查看本批次审核题
                </el-button>
              </div>
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
                <el-input v-model.trim="reviewQuery.batchId" clearable placeholder="输入生成批次" style="width: 220px" />
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
                v-permission="'admin:question:review'"
                type="primary"
                :disabled="selectedPendingReviewIds.length === 0"
                :loading="batchReviewProcessing"
                @click="handleBatchApproveReviews"
              >
                批量通过
              </el-button>
              <el-button
                v-permission="'admin:question:review'"
                type="danger"
                plain
                :disabled="selectedPendingReviewIds.length === 0"
                :loading="batchReviewProcessing"
                @click="handleBatchRejectReviews"
              >
                批量驳回
              </el-button>
            </el-space>
            <div class="table-view-tools">
              <el-segmented v-model="reviewTableSize" :options="reviewTableSizeOptions" />
              <el-dropdown trigger="click" :hide-on-click="false">
                <el-button plain>列配置</el-button>
                <template #dropdown>
                  <el-dropdown-menu class="column-config-menu">
                    <el-dropdown-item v-for="item in reviewColumnOptions" :key="item.key">
                      <el-checkbox v-model="reviewVisibleColumns[item.key]" :disabled="item.required">
                        {{ item.label }}
                      </el-checkbox>
                    </el-dropdown-item>
                    <el-dropdown-item divided>
                      <el-button link type="primary" @click.stop="resetReviewTableView">恢复默认视图</el-button>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
          <div class="table-card admin-table-card">
            <el-table
              v-loading="reviewLoading"
              :data="reviews"
              row-key="id"
              :size="reviewTableSize"
              @selection-change="handleReviewSelectionChange"
            >
              <template #empty>
                <AppState v-if="reviewError" type="error" title="审核池加载失败" :description="reviewError">
                  <el-button type="primary" :loading="reviewLoading" @click="fetchReviews">重新加载</el-button>
                </AppState>
                <AppState v-else type="empty" :title="reviewEmptyTitle" :description="reviewEmptyDescription">
                  <el-button v-if="hasReviewFilters" type="primary" @click="resetReviewQuery">清空筛选</el-button>
                  <el-button v-else @click="fetchReviews">刷新审核池</el-button>
                </AppState>
              </template>
              <el-table-column type="selection" width="48" :selectable="isPendingReview" />
              <el-table-column v-if="isReviewColumnVisible('questionTitle')" label="题目" min-width="260">
                <template #default="{ row }">
                  <span class="field-two-line">{{ displayReviewText(row.questionTitle) }}</span>
                </template>
              </el-table-column>
              <el-table-column v-if="isReviewColumnVisible('targetPosition')" label="目标岗位" min-width="140" show-overflow-tooltip>
                <template #default="{ row }">{{ displayReviewText(row.targetPosition) }}</template>
              </el-table-column>
              <el-table-column v-if="isReviewColumnVisible('knowledgePoint')" label="知识点" min-width="140" show-overflow-tooltip>
                <template #default="{ row }">{{ displayReviewText(row.knowledgePoint) }}</template>
              </el-table-column>
              <el-table-column v-if="isReviewColumnVisible('difficulty')" prop="difficulty" label="难度" width="110" />
              <el-table-column v-if="isReviewColumnVisible('reviewStatus')" label="状态" width="110">
                <template #default="{ row }">
                  <el-tag :type="getReviewStatusType(row.reviewStatus)" effect="plain">
                    {{ getReviewStatusLabel(row.reviewStatus) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column v-if="isReviewColumnVisible('createdAt')" prop="createdAt" label="生成时间" min-width="170" />
              <el-table-column label="操作" width="170">
                <template #default="{ row }">
                  <el-button link type="primary" @click="openReviewDrawer(row.id)">详情</el-button>
                  <el-dropdown trigger="click" :disabled="row.reviewStatus !== 'PENDING'" @command="(command: string) => handleReviewCommand(row.id, command)">
                    <el-button v-permission="'admin:question:review'" text :icon="MoreHorizontal" :disabled="row.reviewStatus !== 'PENDING'" aria-label="更多审核操作" />
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="editApprove">编辑通过</el-dropdown-item>
                        <el-dropdown-item command="approve">通过</el-dropdown-item>
                        <el-dropdown-item command="reject" divided>驳回</el-dropdown-item>
                        <el-dropdown-item command="cancel">作废</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
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
            <AppState
              v-if="duplicateConfigError && !duplicateConfigLoading"
              type="error"
              title="去重参数加载失败"
              :description="duplicateConfigError"
            >
              <el-button type="primary" @click="fetchDuplicateConfig">重新加载去重参数</el-button>
            </AppState>
            <el-alert
              v-else-if="!duplicateConfigItems.length"
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
            <AppState
              v-if="duplicateFeedbackError && !duplicateFeedbackLoading"
              type="error"
              title="人工反馈统计加载失败"
              :description="duplicateFeedbackError"
            >
              <el-button type="primary" @click="fetchDuplicateFeedbackStats">重新加载反馈统计</el-button>
            </AppState>
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
            <el-alert
              v-if="optionLoadWarning"
              class="duplicate-feedback-alert"
              type="warning"
              :closable="false"
              show-icon
              :title="optionLoadWarning"
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
                <el-button v-permission="'admin:question:dedupe'" :loading="duplicateChecking" @click="handleCheckDuplicates">检测当前页</el-button>
                <el-button
                  v-permission="'admin:question:dedupe'"
                  :loading="duplicateEvaluating"
                  :disabled="duplicates.length === 0"
                  @click="handleEvaluateDuplicates"
                >
                  评估候选
                </el-button>
              </el-form-item>
            </el-form>
          </div>
          <div v-if="duplicateEvaluation" class="duplicate-evaluation-panel">
            <div class="duplicate-evaluation-panel__head">
              <div>
                <strong>评估概览</strong>
                <span>已评估 {{ duplicateEvaluation.evaluatedCount || 0 }} / 样本 {{ duplicateEvaluation.sampleCount || 0 }}</span>
              </div>
              <el-tag :type="duplicateEvaluation.failedCount ? 'warning' : 'success'" effect="light">
                准确率 {{ formatRate(duplicateEvaluation.accuracyRate) }}
              </el-tag>
            </div>
            <div class="duplicate-evaluation-grid">
              <article>
                <span>通过</span>
                <strong>{{ duplicateEvaluation.passedCount || 0 }}</strong>
              </article>
              <article>
                <span>失败</span>
                <strong>{{ duplicateEvaluation.failedCount || 0 }}</strong>
              </article>
              <article>
                <span>缺失</span>
                <strong>{{ duplicateEvaluation.missingQuestionCount || 0 }}</strong>
              </article>
            </div>
            <div v-if="duplicateEvaluationFailures.length" class="duplicate-evaluation-failures">
              <article v-for="(item, index) in duplicateEvaluationFailures" :key="item.caseId || `${item.sourceQuestionId}-${item.targetQuestionId}`">
                <strong>{{ duplicateEvalFailureTitle(index) }}</strong>
                <span>期望 {{ duplicateEvalExpectedLabel(item.expected) }} / 预测 {{ duplicateEvalExpectedLabel(item.predicted) }} / {{ formatSimilarity(item.score) }}</span>
                <small>{{ item.reason || item.note || '-' }}</small>
              </article>
            </div>
            <el-collapse v-if="duplicateEvaluationFailures.length" class="duplicate-eval-diagnostics">
              <el-collapse-item title="技术诊断（样本定位，按需展开）" name="evaluation-failures">
                <div class="duplicate-eval-diagnostic-list">
                  <span v-for="(item, index) in duplicateEvaluationFailures" :key="`eval-diagnostic-${item.caseId || index}`">
                    {{ duplicateEvalFailureDiagnostic(item, index) }}
                  </span>
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>
          <div class="duplicate-eval-dataset" v-loading="duplicateEvalCaseLoading || duplicateEvalRunLoading">
            <div class="duplicate-eval-dataset__head">
              <div>
                <strong>持续评估</strong>
                <span>{{ duplicateEvalCaseTotal || 0 }} 个样本 · {{ duplicateEvalLatestRunSummary }}</span>
              </div>
              <div class="duplicate-eval-dataset__actions">
                <el-button
                  v-permission="'admin:question:dedupe'"
                  :loading="duplicateEvalSaving"
                  :disabled="!duplicateEvalHasCurrentCandidates"
                  @click="saveCurrentDuplicateEvalCases"
                >
                  保存当前页样本
                </el-button>
                <el-button v-permission="'admin:question:dedupe'" type="primary" :loading="duplicateEvalRunning" @click="runDuplicateEvalCases">
                  运行启用样本
                </el-button>
                <el-button v-permission="'admin:question:dedupe'" :loading="duplicateThresholdSweeping" @click="sweepDuplicateThresholds">
                  阈值扫描
                </el-button>
                <el-button @click="refreshDuplicateEvalWorkspace">刷新</el-button>
              </div>
            </div>

            <div v-if="duplicateThresholdSweep" class="duplicate-threshold-panel">
              <div class="duplicate-threshold-panel__head">
                <div>
                  <strong>推荐阈值 {{ duplicateThresholdSweep.bestThreshold ?? '--' }}</strong>
                  <span>
                    F1 {{ formatRate(duplicateThresholdSweep.bestF1) }} / 精确率 {{ formatRate(duplicateThresholdSweep.bestPrecision) }} / 召回率 {{ formatRate(duplicateThresholdSweep.bestRecall) }}
                  </span>
                </div>
                <el-tag type="info" effect="plain">
                  已评估 {{ duplicateThresholdSweep.evaluatedCount || 0 }}
                </el-tag>
              </div>
              <div class="duplicate-threshold-grid">
                <article v-for="bucket in duplicateThresholdSweep.buckets || []" :key="bucket.threshold">
                  <span>{{ bucket.threshold }}</span>
                  <strong>{{ formatRate(bucket.f1) }}</strong>
                  <small>精确率 {{ formatRate(bucket.precision) }} / 召回率 {{ formatRate(bucket.recall) }} / 工作量 {{ formatRate(bucket.reviewWorkloadRate) }}</small>
                </article>
              </div>
            </div>

            <div class="duplicate-eval-dataset__filters">
              <el-input
                v-model.trim="duplicateEvalCaseQuery.keyword"
                clearable
                placeholder="样本 / 题目"
                @keyup.enter="fetchDuplicateEvalCases"
              />
              <el-select v-model="duplicateEvalCaseQuery.expected" clearable placeholder="期望结果">
                <el-option label="重复" value="DUPLICATE" />
                <el-option label="待复核" value="REVIEW" />
                <el-option label="不重复" value="NOT_DUPLICATE" />
              </el-select>
              <el-select v-model="duplicateEvalCaseQuery.enabled" clearable placeholder="状态">
                <el-option label="启用" :value="1" />
                <el-option label="停用" :value="0" />
              </el-select>
              <el-button type="primary" @click="fetchDuplicateEvalCases">查询</el-button>
            </div>

            <div class="duplicate-eval-dataset__body">
              <div class="duplicate-eval-cases">
                <div class="duplicate-eval-cases__toolbar table-view-tools">
                  <el-segmented v-model="duplicateEvalCaseTableSize" :options="duplicateEvalCaseTableSizeOptions" />
                  <el-dropdown trigger="click" :hide-on-click="false">
                    <el-button plain>样本列配置</el-button>
                    <template #dropdown>
                      <el-dropdown-menu class="column-config-menu">
                        <el-dropdown-item v-for="item in duplicateEvalCaseColumnOptions" :key="item.key">
                          <el-checkbox v-model="duplicateEvalCaseVisibleColumns[item.key]" :disabled="item.required">
                            {{ item.label }}
                          </el-checkbox>
                        </el-dropdown-item>
                        <el-dropdown-item divided>
                          <el-button link type="primary" @click.stop="resetDuplicateEvalCaseTableView">恢复默认视图</el-button>
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
                <el-table :data="duplicateEvalCases" row-key="id" :size="duplicateEvalCaseTableSize" max-height="260">
                  <el-table-column v-if="isDuplicateEvalCaseColumnVisible('sample')" label="样本" min-width="150" show-overflow-tooltip>
                    <template #default="{ $index }">
                      <strong>回归样本 {{ duplicateEvalDisplayIndex($index) }}</strong>
                    </template>
                  </el-table-column>
                  <el-table-column v-if="isDuplicateEvalCaseColumnVisible('pair')" label="题目对" min-width="260">
                    <template #default="{ row }">
                      <span class="field-two-line">{{ duplicateEvalCasePairText(row) }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column v-if="isDuplicateEvalCaseColumnVisible('expected')" label="期望结果" width="130">
                    <template #default="{ row }">
                      <el-tag :type="duplicateEvalExpectedType(row.expected)" effect="plain">
                        {{ duplicateEvalExpectedLabel(row.expected) }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column v-if="isDuplicateEvalCaseColumnVisible('enabled')" label="状态" width="105">
                    <template #default="{ row }">
                      <el-tag :type="row.enabled === 1 ? 'success' : 'info'" effect="plain">
                        {{ row.enabled === 1 ? '启用' : '停用' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="118" fixed="right">
                    <template #default="{ row }">
                      <el-button v-permission="'admin:question:dedupe'" link type="danger" @click="deleteDuplicateEvalCase(row.id)">删除</el-button>
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
                <AppState
                  v-if="duplicateEvalCaseError && !duplicateEvalCaseLoading"
                  type="error"
                  title="回归样本加载失败"
                  :description="duplicateEvalCaseError"
                >
                  <el-button type="primary" @click="fetchDuplicateEvalCases">重新加载样本</el-button>
                </AppState>
              </div>

              <div class="duplicate-eval-runs" v-loading="duplicateEvalRunDetailLoading">
                <div class="duplicate-eval-runs__head">
                  <strong>最近运行</strong>
                  <el-button link type="primary" @click="fetchDuplicateEvalRuns">刷新</el-button>
                </div>
                <button
                  v-for="(run, index) in duplicateEvalRuns"
                  :key="run.id"
                  class="duplicate-eval-run-item"
                  type="button"
                  @click="openDuplicateEvalRun(run.id)"
                >
                  <span>{{ duplicateEvalRunHeadline(run, index) }}</span>
                  <strong>{{ formatRate(run.accuracyRate) }}</strong>
                  <small>{{ duplicateEvalRunStatusLabel(run.status) }} · {{ run.evaluatedCount || 0 }}/{{ run.sampleCount || 0 }}</small>
                </button>
                <AppState
                  v-if="duplicateEvalRunError && !duplicateEvalRunLoading"
                  type="error"
                  title="运行记录加载失败"
                  :description="duplicateEvalRunError"
                >
                  <el-button type="primary" @click="fetchDuplicateEvalRuns">重新加载运行记录</el-button>
                </AppState>
                <AppState
                  v-else-if="!duplicateEvalRuns.length"
                  type="empty"
                  title="暂无重复检测运行记录"
                  description="保存样本后运行重复检测评估，这里会展示准确率、样本数量和失败样本，便于判断阈值是否可靠。"
                >
                  <el-button :loading="duplicateEvalRunDetailLoading" @click="fetchDuplicateEvalRuns">刷新运行记录</el-button>
                </AppState>
                <el-collapse v-else class="duplicate-eval-diagnostics">
                  <el-collapse-item title="技术诊断（运行定位，按需展开）" name="eval-runs">
                    <div class="duplicate-eval-diagnostic-list">
                      <span v-for="(run, index) in duplicateEvalRuns" :key="`run-diagnostic-${run.id}`">
                        {{ duplicateEvalRunDiagnostic(run, index) }}
                      </span>
                    </div>
                  </el-collapse-item>
                </el-collapse>
              </div>
            </div>

            <div v-if="duplicateEvalLatestRun" class="duplicate-eval-latest">
              <div class="duplicate-eval-latest__head">
                <strong>{{ duplicateEvalRunHeadline(duplicateEvalLatestRun) }}</strong>
                <el-tag :type="duplicateEvalLatestRun.failedCount ? 'warning' : 'success'" effect="light">
                  {{ formatRate(duplicateEvalLatestRun.accuracyRate) }}
                </el-tag>
              </div>
              <div v-if="duplicateEvalLatestFailures.length" class="duplicate-eval-failures">
                <article v-for="(item, index) in duplicateEvalLatestFailures" :key="item.id || item.caseId">
                  <strong>{{ duplicateEvalFailureTitle(index) }}</strong>
                  <span>期望 {{ duplicateEvalExpectedLabel(item.expected) }} / 预测 {{ duplicateEvalExpectedLabel(item.predicted) }} / {{ formatSimilarity(item.score) }}</span>
                  <small>{{ item.reason || item.note || '-' }}</small>
                </article>
              </div>
              <el-collapse class="duplicate-eval-diagnostics">
                <el-collapse-item title="技术诊断（最近运行，按需展开）" name="latest-run">
                  <div class="duplicate-eval-diagnostic-list">
                    <span>{{ duplicateEvalRunDiagnostic(duplicateEvalLatestRun, 0) }}</span>
                    <span v-for="(item, index) in duplicateEvalLatestFailures" :key="`latest-failure-diagnostic-${item.id || item.caseId || index}`">
                      {{ duplicateEvalFailureDiagnostic(item, index) }}
                    </span>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </div>
          </div>
          <div class="review-batch-toolbar duplicate-batch-toolbar">
            <span>已选择 {{ selectedPendingDuplicateIds.length }} 条待处理候选</span>
            <el-space>
              <el-button
                v-permission="'admin:question:dedupe'"
                type="primary"
                :disabled="selectedPendingDuplicateIds.length === 0"
                :loading="duplicateBatchProcessing"
                @click="handleBatchMergeDuplicates"
              >
                批量合并
              </el-button>
              <el-button
                v-permission="'admin:question:dedupe'"
                type="warning"
                plain
                :disabled="selectedPendingDuplicateIds.length === 0"
                :loading="duplicateBatchProcessing"
                @click="handleBatchIgnoreDuplicates"
              >
                批量忽略
              </el-button>
            </el-space>
            <div class="table-view-tools">
              <el-segmented v-model="duplicateTableSize" :options="duplicateTableSizeOptions" />
              <el-dropdown trigger="click" :hide-on-click="false">
                <el-button plain>列配置</el-button>
                <template #dropdown>
                  <el-dropdown-menu class="column-config-menu">
                    <el-dropdown-item v-for="item in duplicateColumnOptions" :key="item.key">
                      <el-checkbox v-model="duplicateVisibleColumns[item.key]" :disabled="item.required">
                        {{ item.label }}
                      </el-checkbox>
                    </el-dropdown-item>
                    <el-dropdown-item divided>
                      <el-button link type="primary" @click.stop="resetDuplicateTableView">恢复默认视图</el-button>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
          <div class="table-card admin-table-card">
            <el-table
              v-loading="duplicateLoading"
              :data="duplicates"
              row-key="id"
              :size="duplicateTableSize"
              @selection-change="handleDuplicateSelectionChange"
            >
              <template #empty>
                <AppState v-if="duplicateError" type="error" title="重复题候选加载失败" :description="duplicateError">
                  <el-button type="primary" :loading="duplicateLoading" @click="fetchDuplicates">重新加载</el-button>
                </AppState>
                <AppState v-else type="empty" :title="duplicateEmptyTitle" :description="duplicateEmptyDescription">
                  <el-button v-if="hasDuplicateFilters" type="primary" @click="resetDuplicateQuery">清空筛选</el-button>
                  <el-button v-else @click="fetchDuplicates">刷新候选</el-button>
                </AppState>
              </template>
              <el-table-column type="selection" width="48" :selectable="isPendingDuplicate" />
              <el-table-column v-if="isDuplicateColumnVisible('sourceTitle')" label="源题" min-width="230">
                <template #default="{ row }">
                  <span class="field-two-line">{{ row.sourceTitle || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column v-if="isDuplicateColumnVisible('targetTitle')" label="疑似重复题" min-width="230">
                <template #default="{ row }">
                  <span class="field-two-line">{{ row.targetTitle || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column v-if="isDuplicateColumnVisible('matchType')" label="匹配类型" min-width="150">
                <template #default="{ row }">{{ getDuplicateMatchTypeLabel(row.matchType) }}</template>
              </el-table-column>
              <el-table-column v-if="isDuplicateColumnVisible('similarity')" label="相似度" width="100">
                <template #default="{ row }">{{ formatSimilarity(row.similarityScore) }}</template>
              </el-table-column>
              <el-table-column v-if="isDuplicateColumnVisible('scoreParts')" label="语义评分" min-width="210">
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
              <el-table-column v-if="isDuplicateColumnVisible('context')" label="上下文一致性" min-width="220">
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
              <el-table-column v-if="isDuplicateColumnVisible('matchReason')" label="匹配原因" min-width="230">
                <template #default="{ row }">
                  <span class="field-two-line">{{ formatDuplicateReason(row.matchReason) }}</span>
                </template>
              </el-table-column>
              <el-table-column v-if="isDuplicateColumnVisible('reviewStatus')" label="状态" width="110">
                <template #default="{ row }">
                  <el-tag :type="getDuplicateStatusType(row.reviewStatus)" effect="plain">
                    {{ getDuplicateStatusLabel(row.reviewStatus) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150">
                <template #default="{ row }">
                  <el-button link type="info" @click="openDuplicateDrawer(row.id)">
                    详情
                  </el-button>
                  <el-dropdown trigger="click" :disabled="row.reviewStatus !== 'PENDING'" @command="(command: string) => handleDuplicateCommand(row.id, command)">
                    <el-button v-permission="'admin:question:dedupe'" text :icon="MoreHorizontal" :disabled="row.reviewStatus !== 'PENDING'" aria-label="更多重复题操作" />
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="merge">合并</el-dropdown-item>
                        <el-dropdown-item command="ignore">忽略</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
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
              <span>审核编号 {{ duplicateDetail.id }}</span>
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
              <el-collapse-item title="评分明细" name="score-json">
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
                  <el-tag size="small" effect="plain">题目编号 {{ duplicateDetail.sourceQuestionId || '-' }}</el-tag>
                </header>
                <h4>{{ duplicateDetail.sourceQuestion?.title || duplicateDetail.sourceTitleSnapshot || '-' }}</h4>
                <pre>{{ duplicateDetail.sourceQuestion?.content || duplicateDetail.sourceContentSnapshot || '-' }}</pre>
              </article>
              <article class="duplicate-question-panel">
                <header>
                  <span>候选题</span>
                  <el-tag size="small" effect="plain">题目编号 {{ duplicateDetail.targetQuestionId || '-' }}</el-tag>
                </header>
                <h4>{{ duplicateDetail.targetQuestion?.title || duplicateDetail.targetTitleSnapshot || '-' }}</h4>
                <pre>{{ duplicateDetail.targetQuestion?.content || duplicateDetail.targetContentSnapshot || '-' }}</pre>
              </article>
            </div>
          </section>

          <section v-if="duplicateDetail.ignoredReason || duplicateDetail.relationId" class="duplicate-detail-section">
            <div class="duplicate-detail-section__title">处理记录</div>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="关系编号">{{ duplicateDetail.relationId || '-' }}</el-descriptions-item>
              <el-descriptions-item label="处理人">{{ duplicateDetail.reviewedBy || '-' }}</el-descriptions-item>
              <el-descriptions-item label="处理时间">{{ duplicateDetail.reviewedAt || '-' }}</el-descriptions-item>
              <el-descriptions-item label="忽略原因">{{ duplicateDetail.ignoredReason || '-' }}</el-descriptions-item>
            </el-descriptions>
          </section>
        </template>
        <AppState
          v-if="duplicateDetailError && !duplicateDetailLoading"
          type="error"
          title="重复候选详情加载失败"
          :description="duplicateDetailError"
        >
          <el-button type="primary" @click="retryOpenDuplicateDrawer">重新加载详情</el-button>
          <el-button @click="fetchDuplicates">刷新候选列表</el-button>
        </AppState>
        <AppState
          v-else-if="!duplicateDetailLoading"
          type="empty"
          title="重复候选详情暂未加载"
          description="可能是候选已被处理、详情加载失败，或当前账号缺少查看治理详情的权限。请回到候选列表刷新后再进入。"
        >
          <el-button type="primary" @click="fetchDuplicates">刷新候选列表</el-button>
        </AppState>
      </div>
      <template #footer>
        <el-button @click="duplicateDrawerVisible = false">关闭</el-button>
        <el-button
          v-permission="'admin:question:dedupe'"
          type="primary"
          :disabled="duplicateDetail?.reviewStatus !== 'PENDING'"
          @click="duplicateDetail && handleMergeDuplicate(duplicateDetail.id)"
        >
          合并
        </el-button>
        <el-button
          v-permission="'admin:question:dedupe'"
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
            <div class="review-detail-section__title">AI 审核建议</div>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="题目标题">{{ displayReviewText(reviewDetail.questionTitle) }}</el-descriptions-item>
              <el-descriptions-item label="目标岗位">{{ displayReviewText(reviewDetail.targetPosition) }}</el-descriptions-item>
              <el-descriptions-item label="分类建议">{{ displayReviewText(reviewDetail.categorySuggestion) }}</el-descriptions-item>
              <el-descriptions-item label="题组建议">{{ displayReviewText(reviewDetail.groupSuggestion) }}</el-descriptions-item>
              <el-descriptions-item label="状态">{{ getReviewStatusLabel(reviewDetail.reviewStatus) }}</el-descriptions-item>
              <el-descriptions-item label="更新时间">{{ reviewDetail.updatedAt || '-' }}</el-descriptions-item>
            </el-descriptions>
            <div class="review-json-grid">
              <div class="review-json-card">
                <span>题干</span>
                <pre>{{ displayReviewText(reviewDetail.questionContent) }}</pre>
              </div>
              <div class="review-json-card">
                <span>参考答案</span>
                <pre>{{ displayReviewText(reviewDetail.referenceAnswer) }}</pre>
              </div>
              <div class="review-json-card">
                <span>解析</span>
                <pre>{{ displayReviewText(reviewDetail.analysis) }}</pre>
              </div>
              <div class="review-json-card">
                <span>追问方向</span>
                <ul class="review-suggestion-list">
                  <li v-for="(item, index) in reviewListItems(reviewDetail.followUpQuestionsJson)" :key="`${item}-${index}`">
                    {{ item }}
                  </li>
                </ul>
              </div>
              <div class="review-json-card">
                <span>推荐标签</span>
                <div class="review-tag-list">
                  <el-tag v-for="(item, index) in reviewTagItems(reviewDetail.tagSuggestionsJson)" :key="`${item}-${index}`" effect="plain">
                    {{ item }}
                  </el-tag>
                </div>
              </div>
            </div>
            <el-collapse
              v-if="reviewDetail.followUpQuestionsJson || reviewDetail.tagSuggestionsJson || reviewDetail.rawAiResultJson"
              class="review-json-diagnostics"
            >
              <el-collapse-item title="技术诊断（原始生成结果，按需展开）" name="raw-ai-result">
                <pre v-if="reviewDetail.followUpQuestionsJson">追问原始数据：{{ formatJsonText(reviewDetail.followUpQuestionsJson) }}</pre>
                <pre v-if="reviewDetail.tagSuggestionsJson">标签原始数据：{{ formatJsonText(reviewDetail.tagSuggestionsJson) }}</pre>
                <pre v-if="reviewDetail.rawAiResultJson">生成原始结果：{{ formatJsonText(reviewDetail.rawAiResultJson) }}</pre>
              </el-collapse-item>
            </el-collapse>
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
        <AppState
          v-else-if="reviewDetailError && !reviewDetailLoading"
          type="error"
          title="审核详情加载失败"
          :description="reviewDetailError"
        >
          <el-button type="primary" @click="retryOpenReviewDrawer">重新加载详情</el-button>
          <el-button @click="fetchReviews">刷新审核池</el-button>
        </AppState>
      </div>
      <template #footer>
        <el-button @click="reviewDrawerVisible = false">关闭</el-button>
        <el-button
          v-permission="'admin:question:review'"
          type="warning"
          :disabled="reviewDetail?.reviewStatus !== 'PENDING'"
          @click="reviewDetail && handleCancelReview(reviewDetail.id)"
        >
          作废
        </el-button>
        <el-button
          v-permission="'admin:question:review'"
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
        title="若题目列表未返回题干、参考答案或解析，请在编辑保存前补全这些字段。"
      />
      <AppState
        v-if="dialogError && editingId"
        class="dialog-error-state"
        type="error"
        title="题目详情加载失败"
        :description="dialogError"
      >
        <el-button type="primary" :loading="dialogLoading" @click="retryOpenDialog">重新加载详情</el-button>
        <el-button @click="dialogVisible = false">关闭</el-button>
      </AppState>
      <el-form v-else ref="formRef" v-loading="dialogLoading" :model="form" :rules="rules" label-width="104px">
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
        <el-button
          v-permission="'admin:question:write'"
          type="primary"
          :loading="saving"
          :disabled="!!dialogError || dialogLoading"
          @click="handleSave"
        >
          保存
        </el-button>
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
            <el-button v-permission="'admin:question:import'" type="primary">选择文件</el-button>
          </template>
          <template #tip>
            <div class="el-upload__tip">支持 .xlsx / .xls / .md / .docx / .pdf 文件，单次最多 500 条</div>
          </template>
        </el-upload>
        <el-button v-permission="'admin:question:import'" class="import-template-btn" link type="primary" @click="handleDownloadTemplate">下载导入模板</el-button>
      </div>
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button v-permission="'admin:question:import'" type="primary" :loading="importing" :disabled="!importFile" @click="handleImport">开始导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { AlertTriangle, BookOpenCheck, Download, MoreHorizontal, Plus, RefreshCw, Upload } from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

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
  submitAiQuestionGenerateApi,
  streamAiQuestionGenerateApi,
  sweepQuestionDuplicateThresholdApi,
  updateAdminQuestionApi,
  updateAdminQuestionStatusApi
} from '@/api/question'
import { getQuestionDuplicateConfigApi } from '@/api/analytics'
import { getQuestionCategoriesApi } from '@/api/questionCategory'
import { getQuestionGroupsApi } from '@/api/questionGroup'
import { getQuestionTagsApi } from '@/api/questionTag'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { useAdminTableView } from '@/composables/useAdminTableView'
import {
  difficultyOptions,
  experienceLevelOptions,
  QUESTION_DIFFICULTY,
  QUESTION_TYPE,
  questionTypeOptions
} from '@/constants/enums'
import { useAuthStore } from '@/stores/auth'
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
import { useAdminMobileReadonly } from '@/composables/useAdminMobileReadonly'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage, toFriendlyMessage } from '@/utils/error'

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
const router = useRouter()
const authStore = useAuthStore()
const { guardAdminMobileWrite } = useAdminMobileReadonly()
const saving = ref(false)
const dialogLoading = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const dialogError = ref('')
const dialogRetryRow = ref<AdminQuestionVO | null>(null)
const formRef = ref<FormInstance>()
const questions = ref<AdminQuestionVO[]>([])
const categories = ref<QuestionCategoryVO[]>([])
const optionLoadWarning = ref('')
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
const duplicateEvalCaseError = ref('')
const duplicateEvalRunError = ref('')
const duplicateConfigError = ref('')
const duplicateFeedbackError = ref('')
const duplicateEvalCaseTotal = ref(0)
const duplicateEvalRunTotal = ref(0)
const embeddingStatsLoading = ref(false)
const embeddingRetrying = ref(false)
const lastEmbeddingJob = ref<{
  id: number
  type?: string
  status?: string
  scopeType?: string
  scopeId?: string
  action: string
} | null>(null)
const reviews = ref<QuestionReviewListVO[]>([])
const reviewDetail = ref<QuestionReviewDetailVO | null>(null)
const reviewDetailError = ref('')
const currentReviewDetailId = ref<number | null>(null)
const selectedReviewRows = ref<QuestionReviewListVO[]>([])
const duplicates = ref<QuestionDuplicateReviewListVO[]>([])
const selectedDuplicateRows = ref<QuestionDuplicateReviewListVO[]>([])
const duplicateDetail = ref<QuestionDuplicateReviewDetailVO | null>(null)
const duplicateDetailError = ref('')
const currentDuplicateDetailId = ref<number | null>(null)
const duplicateConfig = ref<QuestionDuplicateConfigVO | null>(null)
const duplicateFeedbackStats = ref<QuestionDuplicateFeedbackStatsVO | null>(null)
const duplicateEvaluation = ref<QuestionDuplicateEvaluationVO | null>(null)
const duplicateThresholdSweeping = ref(false)
const embeddingFailedCount = ref<number | null>(null)
const reviewTotal = ref(0)
const duplicateTotal = ref(0)
const questionError = ref('')
const reviewError = ref('')
const duplicateError = ref('')
const generateError = ref('')
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

type QuestionColumnKey = 'title' | 'category' | 'group' | 'difficulty' | 'tags' | 'status' | 'createdAt'
type ReviewColumnKey = 'questionTitle' | 'targetPosition' | 'knowledgePoint' | 'difficulty' | 'reviewStatus' | 'createdAt'
type DuplicateColumnKey =
  | 'sourceTitle'
  | 'targetTitle'
  | 'matchType'
  | 'similarity'
  | 'scoreParts'
  | 'context'
  | 'matchReason'
  | 'reviewStatus'
type DuplicateEvalCaseColumnKey = 'sample' | 'pair' | 'expected' | 'enabled'

const {
  tableSize: questionTableSize,
  tableSizeOptions: questionTableSizeOptions,
  columnOptions: questionColumnOptions,
  visibleColumns: questionVisibleColumns,
  isColumnVisible: isQuestionColumnVisible,
  resetTableView: resetQuestionTableView
} = useAdminTableView<QuestionColumnKey>('admin:question-manage', [
  { key: 'title', label: '题目标题', required: true },
  { key: 'category', label: '分类' },
  { key: 'group', label: '题组' },
  { key: 'difficulty', label: '难度', required: true },
  { key: 'tags', label: '标签' },
  { key: 'status', label: '状态', required: true },
  { key: 'createdAt', label: '创建时间' }
])

const {
  tableSize: reviewTableSize,
  tableSizeOptions: reviewTableSizeOptions,
  columnOptions: reviewColumnOptions,
  visibleColumns: reviewVisibleColumns,
  isColumnVisible: isReviewColumnVisible,
  resetTableView: resetReviewTableView
} = useAdminTableView<ReviewColumnKey>('admin:question-manage:reviews', [
  { key: 'questionTitle', label: '题目', required: true },
  { key: 'targetPosition', label: '目标岗位' },
  { key: 'knowledgePoint', label: '知识点' },
  { key: 'difficulty', label: '难度' },
  { key: 'reviewStatus', label: '状态', required: true },
  { key: 'createdAt', label: '生成时间' }
])

const {
  tableSize: duplicateTableSize,
  tableSizeOptions: duplicateTableSizeOptions,
  columnOptions: duplicateColumnOptions,
  visibleColumns: duplicateVisibleColumns,
  isColumnVisible: isDuplicateColumnVisible,
  resetTableView: resetDuplicateTableView
} = useAdminTableView<DuplicateColumnKey>('admin:question-manage:duplicates', [
  { key: 'sourceTitle', label: '源题', required: true },
  { key: 'targetTitle', label: '疑似重复题', required: true },
  { key: 'matchType', label: '匹配类型' },
  { key: 'similarity', label: '相似度' },
  { key: 'scoreParts', label: '语义评分' },
  { key: 'context', label: '上下文一致性' },
  { key: 'matchReason', label: '匹配原因' },
  { key: 'reviewStatus', label: '状态', required: true }
])

const {
  tableSize: duplicateEvalCaseTableSize,
  tableSizeOptions: duplicateEvalCaseTableSizeOptions,
  columnOptions: duplicateEvalCaseColumnOptions,
  visibleColumns: duplicateEvalCaseVisibleColumns,
  isColumnVisible: isDuplicateEvalCaseColumnVisible,
  resetTableView: resetDuplicateEvalCaseTableView
} = useAdminTableView<DuplicateEvalCaseColumnKey>('admin:question-manage:duplicate-eval-cases', [
  { key: 'sample', label: '样本', required: true },
  { key: 'pair', label: '题目对', required: true },
  { key: 'expected', label: '期望结果', required: true },
  { key: 'enabled', label: '状态' }
])

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
  return run ? duplicateEvalRunSummaryText(run) : '暂无运行'
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
const hasQuestionFilters = computed(() =>
  Boolean(query.keyword || query.questionId || query.categoryId || query.tagId || query.difficulty || query.status !== '')
)
const questionEmptyTitle = computed(() =>
  hasQuestionFilters.value ? '当前筛选没有题目' : '题库暂无题目'
)
const questionEmptyDescription = computed(() =>
  hasQuestionFilters.value
    ? '当前筛选条件下没有题目。可以清空题目编号、分类、标签、难度或状态筛选后重新查看，避免把筛选空误判为题库丢失。'
    : '题库为空会影响用户侧练习、推荐题和面试准备链路。请先新增题目或批量导入经过审核的题目。'
)
const isQuestionBankEmpty = computed(() => !loading.value && !hasQuestionFilters.value && total.value === 0)
const showEmbeddingActions = computed(() => !isQuestionBankEmpty.value)
const canWriteQuestion = computed(() => authStore.hasPermission('admin:question:write'))
const canImportQuestion = computed(() => authStore.hasPermission('admin:question:import'))
const canExportQuestion = computed(() => authStore.hasPermission('admin:question:export'))
const canGenerateQuestion = computed(() => authStore.hasPermission('admin:question:generate'))
const canReviewQuestion = computed(() => authStore.hasPermission('admin:question:review'))
const canDedupeQuestion = computed(() => authStore.hasPermission('admin:question:dedupe'))
const canRebuildEmbedding = computed(() => authStore.hasPermission('admin:question:embedding:rebuild'))
const hasReviewFilters = computed(() => Boolean(reviewQuery.keyword || reviewQuery.batchId || reviewQuery.reviewStatus !== 'PENDING'))
const reviewEmptyTitle = computed(() => hasReviewFilters.value ? '没有匹配当前筛选的审核题目' : '暂无待审核题目')
const reviewEmptyDescription = computed(() => {
  if (hasReviewFilters.value) {
    return '当前筛选条件下没有审核题目。清空标题、批次或状态筛选后，可确认是否真的没有审核数据。'
  }
  return '当前没有待审核的 AI 生成题目。生成新题或切换状态筛选后，可在这里继续处理审核。'
})
const hasDuplicateFilters = computed(() => Boolean(duplicateQuery.keyword || duplicateQuery.scoreBand || duplicateQuery.reviewStatus !== 'ALL'))
const duplicateEmptyTitle = computed(() => hasDuplicateFilters.value ? '没有匹配当前筛选的重复候选' : '暂无重复题候选')
const duplicateEmptyDescription = computed(() => {
  if (hasDuplicateFilters.value) {
    return '当前筛选条件下没有重复题候选。清空关键词、状态或置信区间筛选后，可确认是否真的没有候选。'
  }
  return '当前没有待处理的重复题候选。执行重复题检测或调整去重参数后，这里会展示需要合并或忽略的题目。'
})
const embeddingRetryLabel = computed(() =>
  embeddingFailedCount.value ? `重试失败索引 ${embeddingFailedCount.value}` : '重试失败索引'
)
const embeddingActionHint = computed(() => {
  if (lastEmbeddingJob.value) {
    return `最近${lastEmbeddingJob.value.action}索引处理记录 ${lastEmbeddingJob.value.id}，状态 ${embeddingJobStatusLabel(lastEmbeddingJob.value.status)}，可进入 AI 运营看板查看索引任务历史。`
  }
  if (embeddingFailedCount.value === null) return '先查看索引状态，再处理失败索引。'
  if (embeddingFailedCount.value > 0) return '检测到失败索引，可按需重试。'
  return '当前未检测到失败索引。'
})

const embeddingJobStatusLabel = (status?: string) => {
  const value = String(status || 'UNKNOWN').toUpperCase()
  const map: Record<string, string> = {
    RUNNING: '运行中',
    SUCCESS: '成功',
    FAILED: '失败',
    UNKNOWN: '待确认'
  }
  return map[value] || '状态待确认'
}

const rememberEmbeddingJob = (action: string, result: { jobId?: number; vectorJobId?: number; vectorJobType?: string; vectorScopeType?: string; vectorScopeId?: string; vectorJobStatus?: string }) => {
  const id = Number(result.vectorJobId || result.jobId || 0)
  if (!Number.isFinite(id) || id <= 0) return
  lastEmbeddingJob.value = {
    id,
    type: result.vectorJobType,
    status: result.vectorJobStatus,
    scopeType: result.vectorScopeType,
    scopeId: result.vectorScopeId,
    action
  }
}

const embeddingJobLine = (result: { jobId?: number; vectorJobId?: number; vectorJobStatus?: string }) => {
  const id = Number(result.vectorJobId || result.jobId || 0)
  if (!Number.isFinite(id) || id <= 0) return ''
  return `索引处理记录 ${id}，状态 ${embeddingJobStatusLabel(result.vectorJobStatus)}`
}

const latestEmbeddingJobQuery = computed(() => {
  if (!lastEmbeddingJob.value) return {}
  return {
    vectorJobId: String(lastEmbeddingJob.value.id),
    vectorJobType: lastEmbeddingJob.value.type || '',
    vectorScopeType: lastEmbeddingJob.value.scopeType || '',
    vectorJobStatus: lastEmbeddingJob.value.status || 'ALL'
  }
})

const openLatestEmbeddingJob = () => {
  if (!lastEmbeddingJob.value) return
  router.push({
    path: '/admin/analytics/ai',
    query: latestEmbeddingJobQuery.value
  })
}
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
  if (governanceTab.value === 'generate') return '生成结果进入审核池，审核通过后再发布到正式题库。'
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
    { label: '语义命中阈值', value: formatDuplicateConfigValue(config.semanticSimilarityThreshold), hint: '语义召回进入语义判重的最低分' },
    { label: '语义审核阈值', value: formatDuplicateConfigValue(config.semanticReviewThreshold), hint: '语义召回和最终分进入人工审核的最低分' },
    { label: '高置信阈值', value: formatDuplicateConfigValue(config.semanticStrongThreshold), hint: '最终分达到后标记为高置信语义重复' },
    { label: '标题 Jaccard', value: formatDuplicateConfigValue(config.titleJaccardThreshold), hint: '标题词集合相似度规则阈值' },
    { label: '标题编辑距离', value: formatDuplicateConfigValue(config.titleLevenshteinThreshold), hint: '标题 Levenshtein 相似度阈值' },
    { label: '内容相似度', value: formatDuplicateConfigValue(config.contentSimilarityThreshold), hint: '题干内容规则命中阈值' },
    { label: 'Metadata / Tag Weight', value: `${formatDuplicateConfigValue(config.semanticMetadataWeight)} / ${formatDuplicateConfigValue(config.semanticTagWeight)}`, hint: 'Category, type, difficulty and tag scoring weight' },
    { label: '语义/文本权重', value: `${formatDuplicateConfigValue(config.semanticVectorWeight)} / ${formatDuplicateConfigValue(config.semanticTextWeight)}`, hint: '语义最终分的加权比例' },
    { label: '语义召回数', value: formatDuplicateConfigValue(config.vectorSearchLimit), hint: '每题语义索引候选召回规模' },
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
  return status ? '状态待确认' : '-'
}

const getReviewStatusType = (status?: string) => {
  if (status === 'APPROVED') return 'success'
  if (status === 'REJECTED') return 'danger'
  if (status === 'CANCELLED') return 'info'
  return 'warning'
}

const isPendingReview = (row: QuestionReviewListVO) => row.reviewStatus === 'PENDING'

const isPendingDuplicate = (row: QuestionDuplicateReviewListVO) => row.reviewStatus === 'PENDING'

const compactPreview = <T,>(items: T[], formatter: (item: T) => string) => {
  const text = items.slice(0, 5).map(formatter).join('；')
  if (!text) return '无'
  return items.length > 5 ? `${text} 等 ${items.length} 项` : text
}

const reviewTargetText = (row?: QuestionReviewListVO | QuestionReviewDetailVO | null) =>
  row ? `审核编号：${row.id}；题目：${row.questionTitle || row.knowledgePoint || '-'}` : '审核记录'

const selectedReviewTargetText = (ids: number[]) => {
  const selected = selectedReviewRows.value.filter((item) => ids.includes(item.id))
  return compactPreview(selected, (item) => `审核编号 ${item.id} ${item.questionTitle || item.knowledgePoint || '-'}`)
}

const duplicateTargetText = (id: number) => {
  const row = duplicates.value.find((item) => item.id === id)
  if (!row) return `重复候选编号：${id}`
  return `候选编号：${row.id}；源题：${row.sourceQuestionId || '-'} ${row.sourceTitle || ''}；目标题：${row.targetQuestionId || '-'} ${row.targetTitle || ''}`
}

const selectedDuplicateTargetText = (ids: number[]) => {
  const selected = selectedDuplicateRows.value.filter((item) => ids.includes(item.id))
  return compactPreview(selected, (item) => `候选编号 ${item.id} ${item.sourceTitle || item.sourceQuestionId || '-'} -> ${item.targetTitle || item.targetQuestionId || '-'}`)
}

const duplicateEvalCaseTargetText = (id: number) => {
  const row = duplicateEvalCases.value.find((item) => item.id === id)
  if (!row) return `评估样本：当前列表未加载该样本；技术编号 ${id}`
  return `评估样本：${duplicateEvalCasePairText(row)}；期望结果：${duplicateEvalExpectedLabel(row.expected)}`
}

const duplicateEvalDisplayIndex = (index: number) =>
  ((duplicateEvalCaseQuery.pageNo || 1) - 1) * (duplicateEvalCaseQuery.pageSize || 10) + index + 1

const duplicateEvalFailureTitle = (index: number) => `异常样本 ${index + 1}`

const duplicateEvalCasePairText = (row: QuestionDuplicateEvalCaseVO) => {
  const source = row.sourceTitle || '源题待加载'
  const target = row.targetTitle || '候选题待加载'
  return `${source} / ${target}`
}

const duplicateEvalRunHeadline = (run?: QuestionDuplicateEvalRunVO | null, index?: number) => {
  if (!run) return '暂无评估运行'
  return typeof index === 'number' ? `评估运行 ${index + 1}` : '最近一次评估运行'
}

const duplicateEvalRunSummaryText = (run: QuestionDuplicateEvalRunVO) =>
  `${duplicateEvalRunStatusLabel(run.status)} · 已评估 ${run.evaluatedCount || 0}/${run.sampleCount || 0} · 准确率 ${formatRate(run.accuracyRate)}`

const duplicateEvalRunDiagnostic = (run: QuestionDuplicateEvalRunVO, index: number) =>
  `${duplicateEvalRunHeadline(run, index)}：运行号 ${run.runNo || '-'}，运行记录 ${run.id || '-'}，开始 ${run.startedAt || run.createdAt || '-'}，结束 ${run.finishedAt || '-'}`

const duplicateEvalFailureDiagnostic = (item: QuestionDuplicateEvaluationItemVO | QuestionDuplicateEvalRunResultVO, index: number) =>
  `${duplicateEvalFailureTitle(index)}：caseId ${item.caseId || '-'}，源题 ${item.sourceQuestionId || '-'}，候选题 ${item.targetQuestionId || '-'}，评估样本 ${'evalCaseId' in item ? item.evalCaseId || '-' : '-'}`

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
    .map((item) => `审核编号 ${item.reviewId}: ${item.reason || '未知原因'}`)
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
    .map((item) => `候选编号 ${item.id}: ${item.reason || '未知原因'}`)
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

const duplicateEvalExpectedLabel = (expected?: string) => {
  if (expected === 'DUPLICATE') return '重复'
  if (expected === 'REVIEW') return '待复核'
  if (expected === 'NOT_DUPLICATE') return '不重复'
  return expected || '-'
}

const formatJsonText = (value?: string) => {
  if (!value) return '-'
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

const hasGarbledText = (value?: string) => {
  if (!value) return false
  const compact = value.replace(/\s/g, '')
  if (/[�]/.test(compact)) return true // mojibake-check-ignore-line: intentional replacement-char detector.
  const questionMarks = compact.match(/\?/g)?.length || 0
  return questionMarks >= 3 && questionMarks / Math.max(compact.length, 1) >= 0.25
}

const displayReviewText = (value?: string, fallback = '-') => {
  if (!value) return fallback
  return hasGarbledText(value) ? '疑似编码异常，待人工修复' : value
}

const parseReviewJsonValue = (value?: string): unknown => {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

const reviewItemText = (value: unknown): string => {
  if (value == null) return ''
  if (typeof value === 'string') return displayReviewText(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(reviewItemText).filter(Boolean).join('、')
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const candidate =
      record.question ||
      record.title ||
      record.content ||
      record.name ||
      record.label ||
      record.tagName ||
      record.tag ||
      record.value ||
      record.reason
    return reviewItemText(candidate)
  }
  return ''
}

const reviewListItems = (value?: string) => {
  const parsed = parseReviewJsonValue(value)
  const items = Array.isArray(parsed) ? parsed : parsed ? [parsed] : []
  const texts = items.map(reviewItemText).filter(Boolean).slice(0, 8)
  return texts.length ? texts : ['暂无追问方向']
}

const reviewTagItems = (value?: string) => {
  const parsed = parseReviewJsonValue(value)
  const items = Array.isArray(parsed) ? parsed : parsed ? [parsed] : []
  const texts = items.map(reviewItemText).filter(Boolean).slice(0, 12)
  return texts.length ? texts : ['暂无推荐标签']
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
  return status ? '状态待确认' : '-'
}

const duplicateEvalRunStatusLabel = (status?: string) => {
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
  return questionTypeOptions.find((item) => item.value === value)?.label || '题型待确认'
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
    { code: 'vectorScore', label: '语义', score: row.vectorScore },
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
    vectorScore: '语义',
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
  if (reason.includes('semantic vector match')) return '语义召回后综合文本相似度命中'
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
  optionLoadWarning.value = ''
  const [categoryResult, tagResult, groupResult] = await Promise.allSettled([
    getQuestionCategoriesApi(),
    getQuestionTagsApi(),
    getQuestionGroupsApi({ status: 1 })
  ])
  const warnings: string[] = []

  if (categoryResult.status === 'fulfilled') {
    categories.value = categoryResult.value
  } else {
    categories.value = []
    warnings.push(`分类选项加载失败：${getErrorMessage(categoryResult.reason, '请稍后刷新。')}`)
  }

  if (tagResult.status === 'fulfilled') {
    tags.value = tagResult.value
  } else {
    tags.value = []
    warnings.push(`标签选项加载失败：${getErrorMessage(tagResult.reason, '请稍后刷新。')}`)
  }

  if (groupResult.status === 'fulfilled') {
    groups.value = groupResult.value
  } else {
    groups.value = []
    warnings.push(`题组选项加载失败：${getErrorMessage(groupResult.reason, '请稍后刷新。')}`)
  }

  optionLoadWarning.value = warnings.join('；')
}

const fetchQuestions = async () => {
  loading.value = true
  questionError.value = ''
  try {
    const result = await getAdminQuestionsApi(query)
    questions.value = result.records || []
    total.value = result.total || 0
  } catch (error) {
    questions.value = []
    total.value = 0
    questionError.value = getErrorMessage(error, '题目列表暂时加载失败，请稍后重试。')
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

const firstQueryText = (value: unknown) => {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw : ''
}

const applyReviewRouteQuery = () => {
  const reviewStatus = firstQueryText(route.query.reviewStatus)
  const batchId = firstQueryText(route.query.batchId)
  reviewQuery.reviewStatus = reviewStatus || 'PENDING'
  reviewQuery.batchId = batchId
  reviewQuery.pageNo = 1
}

const fetchReviews = async () => {
  reviewLoading.value = true
  reviewError.value = ''
  try {
    const result = await getQuestionReviewsApi(reviewQuery)
    reviews.value = result.records || []
    reviewTotal.value = result.total || 0
    selectedReviewRows.value = []
  } catch (error) {
    reviews.value = []
    reviewTotal.value = 0
    selectedReviewRows.value = []
    reviewError.value = getErrorMessage(error, '审核池暂时加载失败，请稍后重试。')
  } finally {
    reviewLoading.value = false
  }
}

const openReviewDrawer = async (id: number) => {
  reviewDrawerVisible.value = true
  reviewDetailLoading.value = true
  reviewDetail.value = null
  reviewDetailError.value = ''
  currentReviewDetailId.value = id
  resetReviewApproveForm(null)
  try {
    const detail = await getQuestionReviewDetailApi(id)
    reviewDetail.value = detail
    resetReviewApproveForm(detail)
  } catch (error) {
    reviewDetailError.value = getErrorMessage(error, '审核详情加载失败，请稍后重试。')
    ElMessage.error(reviewDetailError.value)
  } finally {
    reviewDetailLoading.value = false
  }
}

const retryOpenReviewDrawer = async () => {
  if (currentReviewDetailId.value) {
    await openReviewDrawer(currentReviewDetailId.value)
  }
}

const fetchDuplicateConfig = async () => {
  duplicateConfigLoading.value = true
  duplicateConfigError.value = ''
  try {
    duplicateConfig.value = await getQuestionDuplicateConfigApi()
  } catch (error) {
    duplicateConfig.value = null
    duplicateConfigError.value = getErrorMessage(error, '去重参数暂时加载失败，请稍后重试。')
  } finally {
    duplicateConfigLoading.value = false
  }
}

const fetchDuplicateFeedbackStats = async () => {
  duplicateFeedbackLoading.value = true
  duplicateFeedbackError.value = ''
  try {
    duplicateFeedbackStats.value = await getQuestionDuplicateFeedbackStatsApi()
  } catch (error) {
    duplicateFeedbackStats.value = null
    duplicateFeedbackError.value = getErrorMessage(error, '人工反馈统计暂时加载失败，请稍后重试。')
  } finally {
    duplicateFeedbackLoading.value = false
  }
}

const refreshDuplicateWorkspace = async () => {
  await Promise.allSettled([fetchDuplicates(), fetchDuplicateFeedbackStats(), refreshDuplicateEvalWorkspace()])
}

const refreshReviewPublishWorkspace = async () => {
  await Promise.allSettled([fetchReviews(), fetchQuestions(), refreshDuplicateWorkspace()])
}

const refreshQuestionDuplicateWorkspace = async () => {
  await Promise.allSettled([fetchQuestions(), refreshDuplicateWorkspace()])
}

const refreshFullGovernanceWorkspace = async () => {
  await Promise.allSettled([fetchQuestions(), fetchReviews(), refreshDuplicateWorkspace(), fetchDuplicateConfig()])
}

const refreshDuplicateGovernanceWorkspace = async () => {
  await Promise.allSettled([refreshDuplicateWorkspace(), fetchDuplicateConfig()])
}

const fetchDuplicateEvalCases = async () => {
  duplicateEvalCaseLoading.value = true
  duplicateEvalCaseError.value = ''
  try {
    const result = await getQuestionDuplicateEvalCasesApi(duplicateEvalCaseQuery)
    duplicateEvalCases.value = result.records || []
    duplicateEvalCaseTotal.value = result.total || 0
  } catch (error) {
    duplicateEvalCases.value = []
    duplicateEvalCaseTotal.value = 0
    duplicateEvalCaseError.value = getErrorMessage(error, '重复题回归样本暂时加载失败，请稍后重试。')
  } finally {
    duplicateEvalCaseLoading.value = false
  }
}

const fetchDuplicateEvalRuns = async () => {
  duplicateEvalRunLoading.value = true
  duplicateEvalRunError.value = ''
  try {
    const result = await getQuestionDuplicateEvalRunsApi(duplicateEvalRunQuery)
    duplicateEvalRuns.value = result.records || []
    duplicateEvalRunTotal.value = result.total || 0
  } catch (error) {
    duplicateEvalRuns.value = []
    duplicateEvalRunTotal.value = 0
    duplicateEvalRunError.value = getErrorMessage(error, '重复题评估运行记录暂时加载失败，请稍后重试。')
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
    ElMessage.error(getErrorMessage(error, '评估运行记录加载失败'))
  } finally {
    duplicateEvalRunDetailLoading.value = false
  }
}

const refreshDuplicateEvalWorkspace = async () => {
  await Promise.allSettled([fetchDuplicateEvalCases(), fetchDuplicateEvalRuns()])
  if (duplicateEvalRuns.value[0]?.id) {
    await openDuplicateEvalRun(duplicateEvalRuns.value[0].id)
  }
}

const openDuplicateDrawer = async (id: number) => {
  duplicateDrawerVisible.value = true
  duplicateDetailLoading.value = true
  duplicateDetail.value = null
  duplicateDetailError.value = ''
  currentDuplicateDetailId.value = id
  try {
    duplicateDetail.value = await getQuestionDuplicateReviewDetailApi(id)
  } catch (error) {
    duplicateDetailError.value = getErrorMessage(error, '重复候选详情加载失败，请稍后重试。')
    ElMessage.error(duplicateDetailError.value)
  } finally {
    duplicateDetailLoading.value = false
  }
}

const retryOpenDuplicateDrawer = async () => {
  if (currentDuplicateDetailId.value) {
    await openDuplicateDrawer(currentDuplicateDetailId.value)
  }
}
const fetchDuplicates = async () => {
  duplicateLoading.value = true
  duplicateError.value = ''
  try {
    const result = await getQuestionDuplicateReviewsApi({
      ...duplicateQuery,
      reviewStatus: duplicateQuery.reviewStatus || 'ALL'
    })
    duplicates.value = result.records || []
    duplicateTotal.value = result.total || 0
    selectedDuplicateRows.value = []
  } catch (error) {
    duplicates.value = []
    duplicateTotal.value = 0
    selectedDuplicateRows.value = []
    duplicateError.value = getErrorMessage(error, '重复题候选暂时加载失败，请稍后重试。')
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
  if (!canWriteQuestion.value) {
    ElMessage.warning('当前账号没有题目写权限，操作未提交。')
    return
  }
  const questionId = row?.id || null
  editingId.value = questionId
  dialogError.value = ''
  dialogRetryRow.value = row ? { ...row } : null
  fillQuestionForm(row)
  dialogVisible.value = true
  if (!questionId) return

  dialogLoading.value = true
  try {
    const detail = await getAdminQuestionDetailApi(questionId)
    if (editingId.value === questionId) {
      fillQuestionForm(detail)
    }
  } catch (error) {
    const message = getErrorMessage(error, '题目详情加载失败，请稍后重试')
    if (editingId.value === questionId) {
      dialogError.value = message
    }
    ElMessage.error(message)
  } finally {
    if (editingId.value === questionId) {
      dialogLoading.value = false
    }
  }
}

const retryOpenDialog = () => {
  if (!dialogRetryRow.value) return
  openDialog(dialogRetryRow.value)
}

const handleSave = async () => {
  if (!guardAdminMobileWrite()) return
  if (!canWriteQuestion.value) {
    ElMessage.warning('当前账号没有题目写权限，操作未提交。')
    return
  }
  if (dialogLoading.value) return
  if (dialogError.value) {
    ElMessage.warning('题目详情仍未加载成功，请先重新加载详情后再保存。')
    return
  }
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  const actionLabel = editingId.value ? '更新题目' : '新增题目'
  const confirmed = await confirmDangerActionPreview({
    title: `${actionLabel}预览`,
    action: `${actionLabel}「${form.title}」`,
    target: `分类：${form.categoryId || '-'}；难度：${getDifficultyLabel(form.difficulty)}；标签数：${form.tagIds?.length || 0}；状态：${form.status}`,
    impact: '题目保存后会影响用户侧题库、推荐题、练习记录、审核治理和重复题检测。',
    rollback: editingId.value
      ? '可再次编辑题目内容；如题目已被用户练习或推荐引用，需要结合记录人工核对影响。'
      : '如新增错误，可在确认影响范围后禁用、删除或重新编辑该题目。',
    audit: '题目保存会记录操作人、题目编号、分类、难度和时间，便于追踪题库治理变更。',
    tips: ['确认题干、答案、解析、分类、标签和难度已复核。', '确认不是应先进入 AI 审核池的草稿内容。'],
    confirmButtonText: '确认保存'
  })
  if (!confirmed) return
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
  if (!guardAdminMobileWrite()) return
  if (!canWriteQuestion.value) {
    ElMessage.warning('当前账号没有题目写权限，操作未提交。')
    return
  }
  const nextStatus = row.status === 1 ? 0 : 1
  const actionLabel = nextStatus === 1 ? '启用' : '禁用'
  const confirmed = await confirmDangerActionPreview({
    title: `${actionLabel}正式题目预览`,
    action: `${actionLabel}题目「${row.title}」`,
    target: `题目编号：${row.id}；分类：${row.categoryName || row.categoryId || '-'}；难度：${getDifficultyLabel(row.difficulty)}`,
    impact:
      nextStatus === 1
        ? '该题目会重新进入可用题库，可能出现在用户侧题库、推荐题和练习链路中。'
        : '该题目会退出用户侧展示、推荐和练习范围，相关题组、标签和历史记录仍需结合治理策略确认。',
    rollback: `可在题目管理页再次${nextStatus === 1 ? '禁用' : '启用'}该题目；已产生的用户练习记录不会自动回到变更前。`,
    audit: '正式题目启停会记录操作人、题目编号、目标状态和时间，便于审计题库治理行为。',
    tips: ['确认该题目不是正在使用的核心推荐题。', '确认禁用原因已在运营侧同步。'],
    confirmButtonText: `确认${actionLabel}`
  })
  if (!confirmed) return
  await updateAdminQuestionStatusApi(row.id, nextStatus)
  ElMessage.success(nextStatus === 1 ? '题目已启用' : '题目已禁用')
  await fetchQuestions()
}

const handleDelete = async (row: AdminQuestionVO) => {
  if (!guardAdminMobileWrite()) return
  if (!canWriteQuestion.value) {
    ElMessage.warning('当前账号没有题目写权限，操作未提交。')
    return
  }
  const confirmed = await confirmDangerActionPreview({
    title: '删除正式题目预览',
    action: `删除题目「${row.title}」`,
    target: `题目编号：${row.id}；分类：${row.categoryName || row.categoryId || '-'}；标签：${getDisplayTags(row).join('、') || '-'}`,
    impact: '该题目会从正式题库移除，用户侧题库、推荐、练习入口和重复题治理数据可能受到影响。',
    rollback: '删除后不能在页面直接恢复；误删后需要依赖数据备份、导入文件或人工重新创建。',
    audit: '删除正式题目会记录操作人、题目编号、标题和时间，便于审计。',
    tips: ['确认不是只需要禁用题目。', '确认已记录题目内容、答案、标签和题组信息。'],
    confirmButtonText: '确认删除'
  })
  if (!confirmed) return
  await deleteAdminQuestionApi(row.id)
  ElMessage.success('题目已删除')
  await fetchQuestions()
}

const handleQuestionCommand = (row: AdminQuestionVO, command: string) => {
  if (command === 'status') {
    void handleStatus(row)
    return
  }
  if (command === 'delete') {
    void handleDelete(row)
  }
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
  generateError.value = ''
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

const hasGeneratedDrafts = (result?: AiQuestionGenerateResultVO | null) => {
  if (!result) return false
  if (result.reviewIds?.length) return true
  if ((result.generatedCount ?? 0) > 0) return true
  if ((result.successCount ?? 0) > 0) return true
  if ((result.count ?? 0) <= 0) return false
  return !(result.asyncMessageId || result.asyncTraceId || result.asyncBizType)
}

const generateDraftSummary = (result?: AiQuestionGenerateResultVO | null) => {
  if (!result) return '-'
  const count = result.generatedCount ?? result.successCount ?? result.count ?? result.reviewIds?.length ?? 0
  if (count > 0) return `已生成 ${count} 条，可进入审核池处理`
  if (result.asyncMessageId || result.asyncTraceId || result.asyncBizType) return '正在生成，可稍后刷新审核池'
  return '-'
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

const viewGenerateTask = () => {
  if (!generateResult.value) return
  const query: Record<string, string> = {}
  if (generateResult.value.asyncBizType || generateResult.value.batchId) {
    query.bizType = generateResult.value.asyncBizType || 'question.generate'
    query.bizId = generateResult.value.asyncBizId || generateResult.value.batchId || ''
  }
  if (generateResult.value.asyncTraceId) {
    query.traceId = generateResult.value.asyncTraceId
  }
  if (generateResult.value.asyncMessageId) {
    query.messageId = generateResult.value.asyncMessageId
  }
  router.push({ path: '/admin/async-tasks', query })
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

const completeGenerateSubmitFlow = async (result: AiQuestionGenerateResultVO) => {
  generateResult.value = result
  generateSseStatus.value = result.asyncSendStatus === 'FAILED' ? '投递失败' : '已提交'
  generateSseMessage.value =
    result.asyncSendStatus === 'FAILED'
      ? '题目生成任务未成功投递，请检查消息队列或稍后重试。'
      : '题目生成已进入任务中心，可以离开页面，稍后按生成批次或追踪号查看结果。'
  if (result.asyncSendStatus === 'FAILED') {
    ElMessage.error(generateSseMessage.value)
    return
  }
  ElMessage.success('已提交 AI 题目生成任务，可在任务中心跟踪进度。')
}

const runLegacyGenerateFallback = async (payload: AiQuestionGenerateRequestDTO) => {
  generateSseStatus.value = '兼容生成'
  generateSseMessage.value = '异步任务提交不可用，正在尝试旧版阶段式生成。'
  let streamStarted = false
  let latestResult: AiQuestionGenerateResultVO | null = null

  try {
    generateSseHandle.value = streamAiQuestionGenerateApi(payload, {
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
      generateSseStatus.value = '同步生成'
      generateSseMessage.value = '阶段式进度未启动，已改用同步生成。'
      await completeGenerateFlow(await generateAiQuestionsApi(payload))
      return
    }
    throw error
  }
}

const generateSseStageLabel = (stage?: string) => {
  const normalized = (stage || '').trim().toUpperCase()
  const labels: Record<string, string> = {
    START: '开始生成',
    INIT: '准备生成',
    VALIDATE_REQUEST: '校验请求',
    REQUEST_VALIDATED: '请求已校验',
    CALL_AI: '调用 AI',
    AI_CALLING: '调用 AI',
    AI_STREAMING: 'AI 生成中',
    PARSE_RESULT: '解析结果',
    RESULT: '生成结果',
    SAVE_REVIEW: '写入审核池',
    SAVE_REVIEWS: '写入审核池',
    DONE: '生成完成',
    ERROR: '生成失败',
    FALLBACK: '基础生成'
  }
  return labels[normalized] || ''
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
  const rawMessage = type === 'delta' ? data?.message || messageMap[type] : data?.message || messageMap[type] || 'AI 题目生成状态更新'
  const message = toFriendlyMessage(rawMessage, messageMap[type] || 'AI 题目生成进行中')
  const stageLabel = generateSseStageLabel(data?.stage) || generateSseStageLabel(type)
  const result = resolveGenerateResult(data, generateResult.value)
  const metadataParts =
    type === 'result' || type === 'done'
      ? [
          result.batchId ? '生成结果已返回' : '',
          result.generatedCount != null || result.reviewIds?.length
            ? `待审核草稿 ${result.generatedCount ?? result.reviewIds?.length} 条`
            : '',
          result.aiCallLogId ? '处理链路已记录' : ''
        ].filter(Boolean)
      : []
  const display = [stageLabel, message, ...metadataParts].filter(Boolean).join(' · ')
  generateSseStatus.value = type
  generateSseMessage.value = display || message
  generateSseEvents.value.push({
    type,
    stage: stageLabel,
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
    asyncMessageId: String(getValue('asyncMessageId') || getValue('messageId') || latest?.asyncMessageId || '') || undefined,
    asyncTraceId: String(getValue('asyncTraceId') || getValue('traceId') || latest?.asyncTraceId || '') || undefined,
    asyncBizType: String(getValue('asyncBizType') || getValue('bizType') || latest?.asyncBizType || '') || undefined,
    asyncBizId: String(getValue('asyncBizId') || getValue('bizId') || latest?.asyncBizId || '') || undefined,
    asyncSendStatus: String(getValue('asyncSendStatus') || getValue('sendStatus') || latest?.asyncSendStatus || '') || undefined,
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
  if (!guardAdminMobileWrite()) return
  if (!canGenerateQuestion.value) {
    ElMessage.warning('当前账号没有 AI 题目生成权限，操作未提交。')
    return
  }
  if (generating.value) return
  const payload = normalizeGeneratePayload()
  const confirmed = await confirmDangerActionPreview({
    title: 'AI 题目生成预览',
    action: '提交 AI 题目生成任务',
    target: `目标岗位：${payload.targetPosition || '通用 Java 后端'}；知识点：${payload.knowledgePoint || '-'}；生成数量：${payload.count || 0}`,
    impact: '该操作会提交异步生成任务，可能消耗 AI 调用额度，并把生成结果写入待审核题目池。',
    rollback: '生成任务提交后不能直接撤销；如生成内容不合适，需要在审核池中驳回、作废或人工修正。',
    audit: '生成任务会记录操作人、生成参数、生成批次、处理任务和 AI 运行记录，便于追踪质量问题。',
    tips: [
      `技术栈：${payload.technologyStack || '-'}`,
      `题型/难度：${payload.questionType || '-'} / ${getDifficultyLabel(payload.difficulty)}`,
      payload.extraRequirements ? `额外要求：${payload.extraRequirements.slice(0, 80)}` : '额外要求：无'
    ],
    confirmButtonText: '确认生成'
  })
  if (!confirmed) return
  generateSseHandle.value?.abort()
  generating.value = true
  generateError.value = ''
  generateResult.value = null
  generateSseEvents.value = []
  generateSseMessage.value = '正在提交生成任务。'
  generateSseStatus.value = '启动中'

  try {
    await completeGenerateSubmitFlow(await submitAiQuestionGenerateApi(payload))
  } catch (error) {
    try {
      await runLegacyGenerateFallback(payload)
    } catch (fallbackError) {
      generateError.value = getErrorMessage(fallbackError, getErrorMessage(error, 'AI 题目生成失败，请稍后重试。'))
      ElMessage.error(generateError.value)
    }
  } finally {
    generating.value = false
    generateSseHandle.value = null
  }
}

const handleApproveReview = async (id: number) => {
  if (!guardAdminMobileWrite()) return
  if (!canReviewQuestion.value) {
    ElMessage.warning('当前账号没有题目审核权限，操作未提交。')
    return
  }
  const review = reviews.value.find((item) => item.id === id) || (reviewDetail.value?.id === id ? reviewDetail.value : null)
  const confirmed = await confirmDangerActionPreview({
    title: 'AI 题目审核通过预览',
    action: '通过 AI 题目并写入正式题库',
    target: reviewTargetText(review),
    impact: '该草稿会进入正式题库，可能影响用户侧题库、推荐题、练习和重复题治理。',
    rollback: '已写入正式题库的题目无法自动撤销；误操作后需禁用、删除或人工修正。',
    audit: '审核通过会记录审核人、审核编号、写入题目和时间。',
    tips: ['确认内容、答案、分类、标签和难度已检查。'],
    confirmButtonText: '确认通过'
  })
  if (!confirmed) return
  await approveQuestionReviewApi(id)
  ElMessage.success('题目已通过审核')
  await refreshReviewPublishWorkspace()
}

const handleRejectReview = async (id: number) => {
  if (!guardAdminMobileWrite()) return
  if (!canReviewQuestion.value) {
    ElMessage.warning('当前账号没有题目审核权限，操作未提交。')
    return
  }
  const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回题目', {
    inputType: 'textarea',
    inputValidator: (value) => Boolean(value?.trim()) || '请输入驳回原因'
  })
  const review = reviews.value.find((item) => item.id === id) || (reviewDetail.value?.id === id ? reviewDetail.value : null)
  const confirmed = await confirmDangerActionPreview({
    title: 'AI 题目驳回预览',
    action: '驳回 AI 题目草稿',
    target: reviewTargetText(review),
    impact: '该草稿会从待审核发布链路中移出，不会写入正式题库；批次质量统计和审核记录会发生变化。',
    rollback: '已驳回草稿不能一键恢复；如误驳回，需要重新生成或通过审核记录恢复。',
    audit: `驳回会记录审核人、审核编号、原因和时间；原因：${value.trim()}`,
    tips: ['确认驳回原因足够清楚，后续可用于定位 AI 生成质量问题。'],
    confirmButtonText: '确认驳回'
  })
  if (!confirmed) return
  await rejectQuestionReviewApi(id, { rejectReason: value.trim() })
  ElMessage.success('题目已驳回')
  await fetchReviews()
}

const handleCancelReview = async (id: number) => {
  if (!guardAdminMobileWrite()) return
  if (!canReviewQuestion.value) {
    ElMessage.warning('当前账号没有题目审核权限，操作未提交。')
    return
  }
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
  const review = reviews.value.find((item) => item.id === id) || (reviewDetail.value?.id === id ? reviewDetail.value : null)
  const confirmed = await confirmDangerActionPreview({
    title: 'AI 题目作废预览',
    action: '作废 AI 题目草稿',
    target: reviewTargetText(review),
    impact: '该草稿会退出待审核队列，不会写入正式题库；常用于测试数据清理或明显无效内容治理。',
    rollback: '已作废草稿不能一键恢复；如误作废，需要重新生成或通过审核记录恢复。',
    audit: `作废会记录审核人、审核编号、原因和时间；原因：${value.trim()}`,
    tips: ['确认这不是需要“驳回给生成质量分析”的正式内容问题。'],
    confirmButtonText: '确认作废'
  })
  if (!confirmed) return
  await cancelQuestionReviewApi(id, { rejectReason: value.trim() })
  ElMessage.success('题目草稿已作废')
  if (reviewDetail.value?.id === id) {
    reviewDrawerVisible.value = false
  }
  await fetchReviews()
}

const handleReviewCommand = (id: number, command: string) => {
  if (command === 'editApprove') {
    void openReviewDrawer(id)
    return
  }
  if (command === 'approve') {
    void handleApproveReview(id)
    return
  }
  if (command === 'reject') {
    void handleRejectReview(id)
    return
  }
  if (command === 'cancel') {
    void handleCancelReview(id)
  }
}

const handleApproveReviewWithEdit = async () => {
  if (!guardAdminMobileWrite()) return
  if (!canReviewQuestion.value) {
    ElMessage.warning('当前账号没有题目审核权限，操作未提交。')
    return
  }
  if (!reviewDetail.value) return
  if (reviewDetail.value.reviewStatus !== 'PENDING') {
    ElMessage.warning('只有待审核题目可以编辑后通过')
    return
  }
  const confirmed = await confirmDangerActionPreview({
    title: '编辑后通过 AI 题目预览',
    action: '按当前编辑内容通过 AI 题目并写入正式题库',
    target: reviewTargetText(reviewDetail.value),
    impact: '当前抽屉内编辑后的题干、答案、解析、分类、题组和标签会写入正式题库，影响用户侧练习与推荐。',
    rollback: '已写入正式题库的题目无法自动撤销；误操作后需禁用、删除或再次编辑正式题目。',
    audit: '编辑后通过会记录审核人、审核编号、编辑原因、写入题目和时间。',
    tips: ['确认已保存当前编辑内容。', '确认编辑原因能说明人工修正点。'],
    confirmButtonText: '确认写入题库'
  })
  if (!confirmed) return
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
    await refreshReviewPublishWorkspace()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '编辑后通过失败'))
  } finally {
    reviewApproveSaving.value = false
  }
}

const handleBatchApproveReviews = async () => {
  if (!guardAdminMobileWrite()) return
  if (!canReviewQuestion.value) {
    ElMessage.warning('当前账号没有题目审核权限，操作未提交。')
    return
  }
  const reviewIds = selectedPendingReviewIds.value
  if (!reviewIds.length) {
    ElMessage.warning('请先选择待审核记录')
    return
  }
  const { value } = await ElMessageBox.prompt(`确认批量通过 ${reviewIds.length} 条待审核题目？`, '批量通过', {
    inputPlaceholder: '可选：填写通过说明',
    inputValue: '批量审核通过'
  })
  const confirmed = await confirmDangerActionPreview({
    title: '批量通过 AI 题目预览',
    action: `批量通过 ${reviewIds.length} 条 AI 题目并写入正式题库`,
    target: selectedReviewTargetText(reviewIds),
    impact: '这些草稿会批量进入正式题库，可能影响用户侧题库、推荐题、练习和重复题治理。',
    rollback: '批量写入正式题库后无法自动撤销；误操作后需按正式题目逐条禁用、删除或人工修正。',
    audit: `批量通过会记录审核人、审核编号列表、写入题目和时间；说明：${value?.trim() || '批量审核通过'}`,
    tips: ['确认当前选择只包含已人工抽检过的待审核题目。', '建议批次较大时先小批量处理。'],
    confirmButtonText: '确认批量通过'
  })
  if (!confirmed) return
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
    await refreshReviewPublishWorkspace()
  } finally {
    batchReviewProcessing.value = false
  }
}

const handleBatchRejectReviews = async () => {
  if (!guardAdminMobileWrite()) return
  if (!canReviewQuestion.value) {
    ElMessage.warning('当前账号没有题目审核权限，操作未提交。')
    return
  }
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
  const confirmed = await confirmDangerActionPreview({
    title: '批量驳回 AI 题目预览',
    action: `批量驳回 ${reviewIds.length} 条 AI 题目草稿`,
    target: selectedReviewTargetText(reviewIds),
    impact: '这些草稿会从待审核发布链路中移出，不会写入正式题库；批次质量统计和审核记录会发生变化。',
    rollback: '已驳回草稿不能批量一键恢复；如误驳回，需要重新生成或通过审核记录恢复。',
    audit: `批量驳回会记录审核人、审核编号列表、原因和时间；原因：${value.trim()}`,
    tips: ['确认选择范围没有混入可修正后通过的题目。', '确认驳回原因能支撑后续 AI 生成质量复盘。'],
    confirmButtonText: '确认批量驳回'
  })
  if (!confirmed) return
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
  if (!guardAdminMobileWrite()) return
  if (!canDedupeQuestion.value) {
    ElMessage.warning('当前账号没有重复题处理权限，操作未提交。')
    return
  }
  const questionIds = questions.value.map((item) => item.id).filter(Boolean)
  if (!questionIds.length) {
    ElMessage.warning('当前页没有可检测题目')
    return
  }
  const confirmed = await confirmDangerActionPreview({
    title: '当前页重复题检测预览',
    action: `检测当前页 ${questionIds.length} 道题目的重复候选`,
    target: compactPreview(questionIds, (id) => `题目编号 ${id}`),
    impact: '检测结果可能新增或更新重复题候选，影响后续题库治理、推荐排重和人工合并判断。',
    rollback: '检测生成的候选不会自动撤销；如误触发，需要在重复题审核中逐条忽略或等待后续检测覆盖。',
    audit: '重复题检测会记录操作人、题目范围、检测结果和时间，便于追踪题库治理来源。',
    tips: ['确认当前页筛选范围是本次要检查的题目。', '如果只想查看已有候选，请直接刷新重复题审核列表。'],
    confirmButtonText: '确认检测'
  })
  if (!confirmed) return
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
      sourceTitle: item.sourceTitle,
      targetQuestionId: item.targetQuestionId,
      targetTitle: item.targetTitle,
      expected: duplicateExpectedLabel(item),
      note: [item.matchType, item.scoreBand, formatSimilarity(item.similarityScore)].filter(Boolean).join(' / ')
    }))

const duplicateEvalSamplePreview = (item: ReturnType<typeof duplicateEvaluationSamples>[number]) =>
  `${item.sourceTitle || '源题待加载'} -> ${item.targetTitle || '候选题待加载'}（期望 ${duplicateEvalExpectedLabel(item.expected)}）`

const confirmDuplicateEvalAction = (options: {
  title: string
  action: string
  target: string
  impact: string
  confirmButtonText: string
  tips?: string[]
}) =>
  confirmDangerActionPreview({
    title: options.title,
    action: options.action,
    target: options.target,
    impact: options.impact,
    rollback: '已写入的评估样本、运行记录或阈值扫描结果不能自动撤销；如结果异常，需要重新运行评估或结合历史记录人工修正。',
    audit: '重复题评估操作会记录操作人、样本范围、运行参数、结果摘要和时间，便于追踪题库治理口径。',
    tips: options.tips || ['确认当前候选样本已经过人工抽检。', '避免在大批量重复题治理同时调整阈值。'],
    confirmButtonText: options.confirmButtonText
  })

const handleEvaluateDuplicates = async () => {
  if (!guardAdminMobileWrite()) return
  if (!canDedupeQuestion.value) {
    ElMessage.warning('当前账号没有重复题处理权限，操作未提交。')
    return
  }
  const samples = duplicateEvaluationSamples()
  if (!samples.length) {
    ElMessage.warning('当前页没有可评估的重复题候选')
    return
  }
  const confirmed = await confirmDuplicateEvalAction({
    title: '当前页重复题评估预览',
    action: `评估当前页 ${samples.length} 个重复题候选`,
    target: compactPreview(samples, duplicateEvalSamplePreview),
    impact: '系统会调用重复题判定逻辑对当前页候选进行即时评估，结果会展示准确率和通过数量，便于人工判断治理质量。',
    tips: ['确认当前页候选来自本次筛选结果。', '如只是查看候选列表，请取消本次评估。'],
    confirmButtonText: '确认评估'
  })
  if (!confirmed) return
  duplicateEvaluating.value = true
  try {
    duplicateEvaluation.value = await evaluateQuestionDuplicateApi({ samples })
    const result = duplicateEvaluation.value
    ElMessage.success(
      `评估完成：${result.passedCount || 0}/${result.evaluatedCount || 0}，准确率 ${formatRate(result.accuracyRate)}`
    )
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '重复题评估失败'))
  } finally {
    duplicateEvaluating.value = false
  }
}

const saveCurrentDuplicateEvalCases = async () => {
  if (!guardAdminMobileWrite()) return
  if (!canDedupeQuestion.value) {
    ElMessage.warning('当前账号没有重复题处理权限，操作未提交。')
    return
  }
  const samples = duplicateEvaluationSamples()
  if (!samples.length) {
    ElMessage.warning('当前页没有可保存的重复题候选')
    return
  }
  const confirmed = await confirmDuplicateEvalAction({
    title: '保存重复题评估样本预览',
    action: `保存当前页 ${samples.length} 个重复题评估样本`,
    target: compactPreview(samples, duplicateEvalSamplePreview),
    impact: '这些样本会进入持续评估数据集，并影响后续重复题检测准确率、阈值扫描和治理效果判断。',
    tips: ['确认当前页候选的期望结果可信。', '确认不是仅想临时查看当前页评估结果。'],
    confirmButtonText: '确认保存样本'
  })
  if (!confirmed) return
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
    ElMessage.success(`已保存 ${saved} 个评估样本`)
    await refreshDuplicateEvalWorkspace()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '评估样本保存失败'))
  } finally {
    duplicateEvalSaving.value = false
  }
}

const runDuplicateEvalCases = async () => {
  if (!guardAdminMobileWrite()) return
  if (!canDedupeQuestion.value) {
    ElMessage.warning('当前账号没有重复题处理权限，操作未提交。')
    return
  }
  const confirmed = await confirmDuplicateEvalAction({
    title: '运行重复题评估预览',
    action: '运行启用的重复题评估样本',
    target: `仅启用样本；最多 100 条；当前样本总数 ${duplicateEvalCaseTotal.value || 0}`,
    impact: '系统会创建一条新的评估运行记录，用于判断当前重复题算法和阈值表现，结果会影响后续治理决策。',
    confirmButtonText: '确认运行评估'
  })
  if (!confirmed) return
  duplicateEvalRunning.value = true
  try {
    const result = await runQuestionDuplicateEvalApi({
      onlyEnabled: true,
      limit: 100
    })
    duplicateEvalLatestRun.value = result
    ElMessage.success(
      `评估运行完成：${result.passedCount || 0}/${result.evaluatedCount || 0}，准确率 ${formatRate(result.accuracyRate)}`
    )
    await fetchDuplicateEvalRuns()
    if (result.id) {
      await openDuplicateEvalRun(result.id)
    }
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '评估运行失败'))
  } finally {
    duplicateEvalRunning.value = false
  }
}

const sweepDuplicateThresholds = async () => {
  if (!guardAdminMobileWrite()) return
  if (!canDedupeQuestion.value) {
    ElMessage.warning('当前账号没有重复题处理权限，操作未提交。')
    return
  }
  const confirmed = await confirmDuplicateEvalAction({
    title: '重复题阈值扫描预览',
    action: '扫描重复题判定阈值',
    target: `仅启用样本；最多 100 条；阈值 70-95，步长 5；当前样本总数 ${duplicateEvalCaseTotal.value || 0}`,
    impact: '系统会基于评估样本计算推荐阈值、F1、精确率、召回率和人工复核工作量，错误样本会误导后续阈值配置。',
    tips: ['确认启用样本覆盖高置信、待复核和非重复场景。', '扫描结果只是决策依据，不应直接替代人工复核。'],
    confirmButtonText: '确认阈值扫描'
  })
  if (!confirmed) return
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
      `阈值扫描完成：推荐 ${result.bestThreshold ?? '--'}，F1 ${formatRate(result.bestF1)}`
    )
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '阈值扫描失败'))
  } finally {
    duplicateThresholdSweeping.value = false
  }
}

const deleteDuplicateEvalCase = async (id?: number) => {
  if (!guardAdminMobileWrite()) return
  if (!canDedupeQuestion.value) {
    ElMessage.warning('当前账号没有重复题处理权限，操作未提交。')
    return
  }
  if (!id) return
  const confirmed = await confirmDangerActionPreview({
    title: '删除重复题评估样本预览',
    action: '删除重复题评估样本',
    target: duplicateEvalCaseTargetText(id),
    impact: '删除后不会影响正式题库，但后续重复题阈值评估和准确率统计将不再使用该样本。',
    rollback: '删除后无法直接恢复该样本；误删后需要重新保存相同源题和目标题的评估样本。',
    audit: '删除评估样本会记录操作人、样本定位信息和时间。',
    tips: ['确认这不是用于回归阈值效果的关键样本。'],
    confirmButtonText: '确认删除'
  })
  if (!confirmed) return
  try {
    await deleteQuestionDuplicateEvalCaseApi(id)
    ElMessage.success('评估样本已删除')
    await fetchDuplicateEvalCases()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '评估样本删除失败'))
  }
}

const handleRebuildEmbedding = async () => {
  if (!guardAdminMobileWrite()) return
  if (!canRebuildEmbedding.value) {
    ElMessage.warning('当前账号没有重建语义索引权限，操作未提交。')
    return
  }
  const confirmed = await confirmDangerActionPreview({
    title: '重建题目语义索引高风险确认',
    action: '重建启用题目的文本指纹和语义索引',
    target: '最多处理 5000 道启用题目，按更新时间和索引状态执行。',
    impact: '可能产生语义检索模型服务调用成本，并创建、覆盖或删除题目语义索引。',
    rollback: '旧索引不能一键恢复；如结果异常，需要重新执行修复或结合服务日志人工处理。',
    audit: '系统会记录索引维护结果，页面会展示本次处理数量和失败明细。',
    tips: ['建议先点击“索引状态”确认集合、维度和失败数量。', '避免在题库批量导入过程中同时重建索引。'],
    confirmButtonText: '确认重建'
  })
  if (!confirmed) return
  embeddingRebuilding.value = true
  try {
    const result = await rebuildQuestionEmbeddingApi(5000)
    rememberEmbeddingJob('重建', result)
    const errors = result.errors || []
    const jobLine = embeddingJobLine(result)
    const summary = `索引重建完成：元数据 ${result.updated || 0} 条，语义索引 ${result.vectorUpdated || 0} 条${jobLine ? `，处理记录 ${result.vectorJobId || result.jobId}` : ''}`
    if (errors.length || result.failedBatches) {
      await ElMessageBox.alert(
        [
          summary,
          jobLine,
          `失败批次：${result.failedBatches || errors.length}`,
          ...errors.slice(0, 8).map((item, index) => `${index + 1}. ${item}`),
          errors.length > 8 ? `还有 ${errors.length - 8} 条错误未展示，请查看服务日志。` : ''
        ].filter(Boolean).join('\n'),
        '题目语义索引重建结果',
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
    embeddingFailedCount.value = stats.failed || 0
    const statusLines = (stats.statusCounts || [])
      .map((item) => `${embeddingJobStatusLabel(item.status)}: ${item.count || 0}`)
      .join('\n')
    const dimensionLines = (stats.dimensionCounts || [])
      .map((item) => `${item.dimension || '--'} 维：${item.count || 0}`)
      .join('\n')
    const modelLines = (stats.modelCounts || [])
      .map((item) => `${item.model || '模型待确认'}: ${item.count || 0}`)
      .join('\n')
    await ElMessageBox.alert(
      [
        `语义检索：${stats.vectorEnabled ? '已启用' : '未启用'}`,
        `索引记录：${stats.total || 0} 条，失败 ${stats.failed || 0} 条`,
        `集合：${stats.collection?.collectionName || 'question_embedding'} / ${stats.collection?.status || '--'}`,
        `维度：${stats.collection?.vectorSize || '--'}，索引点数：${stats.collection?.pointCount ?? '--'}`,
        `最近索引：${stats.lastIndexedAt || '--'}，最近失败：${stats.lastFailedAt || '--'}`,
        `平均文本长度：${stats.averageTextChars ?? '--'}`,
        statusLines ? `\n状态分布：\n${statusLines}` : '',
        dimensionLines ? `\n维度分布：\n${dimensionLines}` : '',
        modelLines ? `\n检索模型分布：\n${modelLines}` : '',
        stats.collection?.errorMessage ? `\n错误：${stats.collection.errorMessage}` : ''
      ].filter(Boolean).join('\n'),
      '题目语义索引状态',
      { type: stats.failed ? 'warning' : 'info' }
    )
  } finally {
    embeddingStatsLoading.value = false
  }
}

const handleRetryFailedEmbedding = async () => {
  if (!guardAdminMobileWrite()) return
  if (!canRebuildEmbedding.value) {
    ElMessage.warning('当前账号没有重试语义索引权限，操作未提交。')
    return
  }
  const confirmed = await confirmDangerActionPreview({
    title: '重试失败题目索引确认',
    action: '重试失败的题目语义索引记录',
    target: '最多处理 1000 条失败题目语义索引记录。',
    impact: '可能重新调用语义检索模型服务，并创建或替换语义索引库中的题目索引点。',
    rollback: '已写入的索引点不能直接撤销；如仍失败，请结合失败明细和服务日志继续排查。',
    audit: '系统会记录索引维护结果，页面会展示本次匹配、重试和失败明细。',
    tips: ['确认失败原因不是模型维度变化或集合缺失。'],
    confirmButtonText: '确认重试'
  })
  if (!confirmed) return
  embeddingRetrying.value = true
  try {
    const result = await retryFailedQuestionEmbeddingApi(1000)
    rememberEmbeddingJob('重试', result)
    embeddingFailedCount.value = Math.max(0, (embeddingFailedCount.value || 0) - (result.retried || 0))
    const errors = result.errors || []
    const deleteSummary = result.vectorDeleted ? `，清理索引 ${result.vectorDeleted || 0} 条` : ''
    const jobLine = embeddingJobLine(result)
    const summary = `重试完成：匹配 ${result.matched || 0} 条，已重试 ${result.retried || 0} 条${deleteSummary}${jobLine ? `，处理记录 ${result.vectorJobId || result.jobId}` : ''}`
    if (errors.length) {
      await ElMessageBox.alert(
        [summary, jobLine, ...errors.slice(0, 8).map((item, index) => `${index + 1}. ${item}`)].filter(Boolean).join('\n'),
        '失败题目索引重试结果',
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
  if (!guardAdminMobileWrite()) return
  if (!canDedupeQuestion.value) {
    ElMessage.warning('当前账号没有重复题处理权限，操作未提交。')
    return
  }
  const { value } = await ElMessageBox.prompt('请输入合并原因', '合并重复题', {
    inputType: 'textarea',
    inputPlaceholder: '例如：语义重复，保留主问题并建立重复关系'
  })
  const reason = value?.trim() || '确认重复'
  const confirmed = await confirmDangerActionPreview({
    title: '合并重复题预览',
    action: '确认同意图重复题并建立 SAME_INTENT 关系',
    target: duplicateTargetText(id),
    impact: '系统会建立同意图关系，并自动归入同一题组；后续每日推荐和内部推荐会按题组或同意图排重。',
    rollback: '已建立的重复关系不能一键撤销；误合并后需要到题目关系或治理工具中人工修正。',
    audit: `合并会记录操作人、候选编号、关系类型、原因和时间；原因：${reason}`,
    tips: ['确认两道题考察意图一致，而不只是技术关键词相似。'],
    confirmButtonText: '确认合并'
  })
  if (!confirmed) return
  await mergeQuestionDuplicateReviewApi(id, {
    relationType: 'SAME_INTENT',
    reason
  })
  ElMessage.success('重复题已合并')
  await refreshDuplicateWorkspace()
}

const handleIgnoreDuplicate = async (id: number) => {
  if (!guardAdminMobileWrite()) return
  if (!canDedupeQuestion.value) {
    ElMessage.warning('当前账号没有重复题处理权限，操作未提交。')
    return
  }
  const { value } = await ElMessageBox.prompt('请输入忽略原因', '忽略重复候选', {
    inputType: 'textarea',
    inputPlaceholder: '例如：考察角度不同',
    inputValidator: (value) => Boolean(value?.trim()) || '请输入忽略原因'
  })
  const confirmed = await confirmDangerActionPreview({
    title: '忽略重复候选预览',
    action: '忽略重复题候选',
    target: duplicateTargetText(id),
    impact: '该候选会从待处理队列移出，不会建立重复关系；后续推荐排重不会使用该候选关系。',
    rollback: '已忽略候选不能一键恢复；如误忽略，需要重新检测重复题或通过候选记录恢复。',
    audit: `忽略会记录操作人、候选编号、原因和时间；原因：${value.trim()}`,
    tips: ['确认两道题只是相似，并非同一考察意图。'],
    confirmButtonText: '确认忽略'
  })
  if (!confirmed) return
  await ignoreQuestionDuplicateReviewApi(id, {
    ignoredReason: value.trim()
  })
  ElMessage.success('重复候选已忽略')
  await refreshDuplicateWorkspace()
}

const handleDuplicateCommand = (id: number, command: string) => {
  if (command === 'merge') {
    void handleMergeDuplicate(id)
    return
  }
  if (command === 'ignore') {
    void handleIgnoreDuplicate(id)
  }
}

const handleBatchMergeDuplicates = async () => {
  if (!guardAdminMobileWrite()) return
  if (!canDedupeQuestion.value) {
    ElMessage.warning('当前账号没有重复题处理权限，操作未提交。')
    return
  }
  const ids = selectedPendingDuplicateIds.value
  if (!ids.length) return
  const { value } = await ElMessageBox.prompt('请输入批量合并原因', '批量合并重复题', {
    inputType: 'textarea',
    inputPlaceholder: '例如：批量确认同意图重复'
  })
  const reason = value?.trim() || '批量确认重复'
  const confirmed = await confirmDangerActionPreview({
    title: '批量合并重复题预览',
    action: `批量确认 ${ids.length} 条同意图重复题并建立 SAME_INTENT 关系`,
    target: selectedDuplicateTargetText(ids),
    impact: '系统会逐条建立同意图关系；后续每日推荐和内部推荐会按题组或同意图排重，冲突项会返回失败明细。',
    rollback: '已建立的重复关系不能批量一键撤销；误合并后需要逐条人工修正题目关系。',
    audit: `批量合并会记录操作人、候选编号列表、关系类型、原因和时间；原因：${reason}`,
    tips: ['确认当前选中项已经过抽检。', '建议大批量合并前先处理高相似度候选。'],
    confirmButtonText: '确认批量合并'
  })
  if (!confirmed) return
  duplicateBatchProcessing.value = true
  try {
    const result = await batchMergeQuestionDuplicateReviewApi({
      ids,
      relationType: 'SAME_INTENT',
      reason
    })
    showBatchDuplicateResult(result)
    selectedDuplicateRows.value = []
    await refreshDuplicateWorkspace()
  } finally {
    duplicateBatchProcessing.value = false
  }
}

const handleBatchIgnoreDuplicates = async () => {
  if (!guardAdminMobileWrite()) return
  if (!canDedupeQuestion.value) {
    ElMessage.warning('当前账号没有重复题处理权限，操作未提交。')
    return
  }
  const ids = selectedPendingDuplicateIds.value
  if (!ids.length) return
  const { value } = await ElMessageBox.prompt('请输入批量忽略原因', '批量忽略重复候选', {
    inputType: 'textarea',
    inputPlaceholder: '例如：考察角度不同'
  })
  const reason = value?.trim() || '批量确认不是重复题'
  const confirmed = await confirmDangerActionPreview({
    title: '批量忽略重复候选预览',
    action: `批量忽略 ${ids.length} 条重复题候选`,
    target: selectedDuplicateTargetText(ids),
    impact: '这些候选会从待处理队列移出，不会建立重复关系；后续推荐排重不会使用这些候选关系。',
    rollback: '已忽略候选不能批量一键恢复；如误忽略，需要重新检测重复题或通过候选记录恢复。',
    audit: `批量忽略会记录操作人、候选编号列表、原因和时间；原因：${reason}`,
    tips: ['确认选中项只是相似而非同一考察意图。'],
    confirmButtonText: '确认批量忽略'
  })
  if (!confirmed) return
  duplicateBatchProcessing.value = true
  try {
    const result = await batchIgnoreQuestionDuplicateReviewApi({
      ids,
      ignoredReason: reason
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
  if (!guardAdminMobileWrite()) return
  if (!canImportQuestion.value) {
    ElMessage.warning('当前账号没有题目导入权限，操作未提交。')
    return
  }
  if (!importFile.value) return
  const fileSizeKb = Math.ceil(importFile.value.size / 1024)
  const confirmed = await confirmDangerActionPreview({
    title: '批量导入题目预览',
    action: '批量导入题目到正式题库',
    target: `文件：${importFile.value.name}；大小：${fileSizeKb} KB；单次最多 500 条。`,
    impact: '系统会校验文件并写入题库记录，成功题目可能进入用户侧题库、推荐、练习和重复题治理链路。',
    rollback: '导入批次不能在页面一键撤销；误导入后需要按导入结果逐条禁用、删除或通过批次记录回滚。',
    audit: '导入会记录操作人、文件名、导入批次、成功/失败/重复数量和时间。',
    tips: ['确认文件来源可信且字段格式正确。', '确认导入前已处理明显重复题和测试数据。'],
    confirmButtonText: '确认导入'
  })
  if (!confirmed) return
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
    await refreshQuestionDuplicateWorkspace()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '题目导入失败，请检查文件格式、重复题策略或稍后重试。'))
  } finally {
    importing.value = false
  }
}

const handleExport = async () => {
  if (!guardAdminMobileWrite()) return
  if (!canExportQuestion.value) {
    ElMessage.warning('当前账号没有题目导出权限，操作未提交。')
    return
  }
  const filters = [
    query.keyword ? `关键词：${query.keyword}` : '',
    query.questionId ? `题目编号：${query.questionId}` : '',
    query.categoryId ? `分类：${query.categoryId}` : '',
    query.tagId ? `标签：${query.tagId}` : '',
    query.difficulty ? `难度：${getDifficultyLabel(query.difficulty)}` : '',
    query.status !== '' ? `状态：${query.status}` : ''
  ].filter(Boolean)
  const confirmed = await confirmDangerActionPreview({
    title: '导出题库数据预览',
    action: '导出当前筛选下的题库数据',
    target: filters.length ? filters.join('；') : '当前未设置筛选条件，可能导出全部可见题目',
    impact: '导出的文件会离开系统页面，可能包含题干、答案、解析、分类、标签等题库核心内容。',
    rollback: '文件下载后无法从系统侧撤回；如误导出，需要按内部数据外带流程处理。',
    audit: '导出操作会按权限、筛选条件、操作人和时间保留记录，便于追踪题库数据外带行为。',
    tips: ['确认导出范围最小化，避免无筛选导出全部题库。', '确认导出文件不会发送给无权限人员。'],
    confirmButtonText: '确认导出'
  })
  if (!confirmed) return
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
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '题目导出失败，请确认权限或稍后重试。'))
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
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '题目导入模板下载失败，请确认权限或稍后重试。'))
  }
}

onMounted(async () => {
  applyFailureQuery()
  applyReviewRouteQuery()
  await fetchOptions()
  if (!props.governanceOnly) {
    await refreshFullGovernanceWorkspace()
    return
  }

  if (governanceTab.value === 'reviews') {
    await fetchReviews()
  } else if (governanceTab.value === 'duplicates') {
    await refreshDuplicateGovernanceWorkspace()
  }
})

watch(
  () => route.query.questionId,
  async () => {
    applyFailureQuery()
    if (showQuestionManagement.value) {
      await fetchQuestions()
    } else if (showDuplicatesPane.value) {
      await fetchDuplicates()
    }
  }
)

watch(
  () => [route.query.reviewStatus, route.query.batchId],
  async () => {
    applyReviewRouteQuery()
    if (showReviewsPane.value) {
      await fetchReviews()
    }
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
.question-governance-page {
  .admin-hero {
    padding-top: 6px;
    padding-bottom: 18px;
  }
}

.question-hero {
  gap: 16px;
}

.question-hero-actions {
  display: grid;
  gap: 12px;
}

.question-hero-actions__group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.28);
}

.question-hero-actions__group > span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--app-text-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.question-hero-actions__group--risk {
  border-color: rgba(245, 158, 11, 0.18);
  background: rgba(120, 53, 15, 0.16);
}

.question-hero-actions__group--muted {
  border-style: dashed;
}

.question-hero-actions__group > small {
  flex-basis: 100%;
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.6;
}

.question-row-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.question-row-actions__risk {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.question-empty-state {
  padding: 18px 0 10px;
}

.filter-form {
  width: 100%;
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

.question-tag-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.tag-item {
  margin-right: 0;
}

.muted-cell {
  color: var(--app-text-muted);
  font-size: 12px;
}

.dialog-alert {
  margin-bottom: 16px;
}

.dialog-error-state {
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

.table-card :deep(.el-table__empty-block) {
  min-height: 200px;
}

@media (max-width: 760px) {
  .table-view-tools {
    justify-content: flex-start;
    width: 100%;
  }
}

.governance-panel {
  margin-top: 18px;
}

.governance-tabs {
  padding: 0 20px 20px;

  :deep(.el-tabs__header) {
    position: sticky;
    top: 72px;
    z-index: 5;
    margin-bottom: 18px;
    padding-top: 10px;
    background: var(--app-surface);
  }
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

.duplicate-eval-cases__toolbar {
  margin-bottom: 10px;
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

.duplicate-eval-diagnostics {
  margin-top: 10px;
}

.duplicate-eval-diagnostic-list {
  display: grid;
  gap: 8px;
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.duplicate-eval-diagnostic-list span {
  min-width: 0;
  overflow-wrap: anywhere;
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

.review-suggestion-list {
  margin: 0;
  padding-left: 18px;
  color: var(--app-text-muted);
  line-height: 1.7;
}

.review-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.review-json-diagnostics {
  margin-top: 12px;
}

.review-json-diagnostics pre {
  max-height: 260px;
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

.generate-result-card__diagnostics {
  margin-top: 12px;
  border-radius: 8px;
  overflow: hidden;
}

.generate-result-card__diagnostic-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  span {
    max-width: 100%;
    padding: 5px 8px;
    border: 1px solid var(--app-border);
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.28);
    color: var(--app-text-muted);
    font-size: 12px;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }
}
</style>
