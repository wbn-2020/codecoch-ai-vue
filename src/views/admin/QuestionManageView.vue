<template>
  <div class="page-shell admin-console-page">
    <section class="admin-hero">
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
    </section>

    <div class="admin-insight-grid">
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

    <section class="admin-panel">
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
              <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
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

    <section class="admin-panel governance-panel">
      <div class="admin-panel__header">
        <div>
          <h2>AI 题目审核 / 去重</h2>
          <p>接入后端真实审核池与重复题审核接口，不展示 Mock 结果。</p>
        </div>
        <el-button :loading="generating" @click="governanceTab = 'generate'">AI 生成题目</el-button>
      </div>

      <el-tabs v-model="governanceTab" class="governance-tabs">
        <el-tab-pane label="AI 生成" name="generate">
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

        <el-tab-pane label="审核池" name="reviews">
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
              <el-table-column label="操作" width="250" fixed="right">
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

        <el-tab-pane label="重复题审核" name="duplicates">
          <div class="admin-filter-bar governance-filter">
            <el-form :model="duplicateQuery" inline>
              <el-form-item label="关键词">
                <el-input v-model.trim="duplicateQuery.keyword" clearable placeholder="源题 / 目标题" />
              </el-form-item>
              <el-form-item label="状态">
                <el-select v-model="duplicateQuery.reviewStatus" clearable placeholder="全部" style="width: 130px">
                  <el-option label="待处理" value="PENDING" />
                  <el-option label="已合并" value="CONFIRMED" />
                  <el-option label="已忽略" value="IGNORED" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="fetchDuplicates">查询</el-button>
                <el-button @click="resetDuplicateQuery">重置</el-button>
                <el-button :loading="duplicateChecking" @click="handleCheckDuplicates">检测当前页</el-button>
              </el-form-item>
            </el-form>
          </div>
          <div class="table-card admin-table-card">
            <el-table v-loading="duplicateLoading" :data="duplicates" row-key="id">
              <el-table-column prop="sourceTitle" label="源题" min-width="220" show-overflow-tooltip />
              <el-table-column prop="targetTitle" label="疑似重复题" min-width="220" show-overflow-tooltip />
              <el-table-column prop="matchType" label="匹配类型" min-width="150" />
              <el-table-column label="相似度" width="100">
                <template #default="{ row }">{{ formatSimilarity(row.similarityScore) }}</template>
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
      <el-form ref="formRef" :model="form" :rules="rules" label-width="104px">
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
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { BookOpenCheck, Plus } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'

import {
  approveQuestionReviewApi,
  batchApproveQuestionReviewsApi,
  batchRejectQuestionReviewsApi,
  checkQuestionDuplicateApi,
  createAdminQuestionApi,
  deleteAdminQuestionApi,
  generateAiQuestionsApi,
  getAdminQuestionsApi,
  getQuestionDuplicateReviewsApi,
  getQuestionReviewDetailApi,
  getQuestionReviewsApi,
  ignoreQuestionDuplicateReviewApi,
  mergeQuestionDuplicateReviewApi,
  rejectQuestionReviewApi,
  updateAdminQuestionApi,
  updateAdminQuestionStatusApi
} from '@/api/question'
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
  QuestionDuplicateReviewListVO,
  QuestionDuplicateReviewQueryDTO,
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

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const questions = ref<AdminQuestionVO[]>([])
const categories = ref<QuestionCategoryVO[]>([])
const tags = ref<QuestionTagVO[]>([])
const groups = ref<QuestionGroupVO[]>([])
const total = ref(0)
const governanceTab = ref('generate')
const reviewLoading = ref(false)
const duplicateLoading = ref(false)
const generating = ref(false)
const batchReviewProcessing = ref(false)
const reviewDetailLoading = ref(false)
const reviewApproveSaving = ref(false)
const reviewDrawerVisible = ref(false)
const duplicateChecking = ref(false)
const reviews = ref<QuestionReviewListVO[]>([])
const reviewDetail = ref<QuestionReviewDetailVO | null>(null)
const selectedReviewRows = ref<QuestionReviewListVO[]>([])
const duplicates = ref<QuestionDuplicateReviewListVO[]>([])
const reviewTotal = ref(0)
const duplicateTotal = ref(0)
const generateResult = ref<AiQuestionGenerateResultVO | null>(null)

const query = reactive<AdminQuestionQueryDTO>({
  keyword: '',
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

const duplicateQuery = reactive<QuestionDuplicateReviewQueryDTO>({
  keyword: '',
  reviewStatus: 'PENDING',
  pageNo: 1,
  pageSize: 10
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
  return status || '-'
}

const getReviewStatusType = (status?: string) => {
  if (status === 'APPROVED') return 'success'
  if (status === 'REJECTED') return 'danger'
  return 'warning'
}

const isPendingReview = (row: QuestionReviewListVO) => row.reviewStatus === 'PENDING'

const handleReviewSelectionChange = (rows: QuestionReviewListVO[]) => {
  selectedReviewRows.value = rows
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
  if (status === 'PENDING') return '待处理'
  if (status === 'CONFIRMED') return '已合并'
  if (status === 'IGNORED') return '已忽略'
  return status || '-'
}

const getDuplicateStatusType = (status?: string) => {
  if (status === 'CONFIRMED') return 'success'
  if (status === 'IGNORED') return 'info'
  return 'warning'
}

const formatSimilarity = (value?: number) => {
  if (value === undefined || value === null) return '-'
  return `${Math.round(Number(value) * 100)}%`
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
  const [categoryResult, tagResult, groupResult] = await Promise.all([
    getQuestionCategoriesApi(),
    getQuestionTagsApi(),
    getQuestionGroupsApi({ status: 1 })
  ])
  categories.value = categoryResult
  tags.value = tagResult
  groups.value = groupResult
}

const fetchQuestions = async () => {
  loading.value = true
  try {
    const result = await getAdminQuestionsApi(query)
    questions.value = result.records || []
    total.value = result.total || 0
  } finally {
    loading.value = false
  }
}

const fetchReviews = async () => {
  reviewLoading.value = true
  try {
    const result = await getQuestionReviewsApi(reviewQuery)
    reviews.value = result.records || []
    reviewTotal.value = result.total || 0
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

const fetchDuplicates = async () => {
  duplicateLoading.value = true
  try {
    const result = await getQuestionDuplicateReviewsApi(duplicateQuery)
    duplicates.value = result.records || []
    duplicateTotal.value = result.total || 0
  } finally {
    duplicateLoading.value = false
  }
}

const openDialog = (row?: AdminQuestionVO) => {
  editingId.value = row?.id || null
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
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!formRef.value) return
  await formRef.value.validate()
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
    reviewStatus: 'PENDING',
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

const handleGenerateReviews = async () => {
  generating.value = true
  try {
    const result = await generateAiQuestionsApi(normalizeGeneratePayload())
    generateResult.value = result
    const generatedCount = result.generatedCount ?? result.successCount ?? result.count ?? result.reviewIds?.length ?? 0
    ElMessage.success(`已生成 ${generatedCount} 条待审核题目`)
    if (result.batchId) {
      await viewGeneratedBatch()
    } else {
      await fetchReviews()
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'AI 题目生成失败')
  } finally {
    generating.value = false
  }
}

const handleApproveReview = async (id: number) => {
  await ElMessageBox.confirm('确认通过该 AI 题目并写入正式题库？', '审核通过', { type: 'warning' })
  await approveQuestionReviewApi(id)
  ElMessage.success('题目已通过审核')
  await Promise.all([fetchReviews(), fetchQuestions(), fetchDuplicates()])
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
    await Promise.all([fetchReviews(), fetchQuestions(), fetchDuplicates()])
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
    await Promise.all([fetchReviews(), fetchQuestions(), fetchDuplicates()])
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
    await fetchDuplicates()
  } finally {
    duplicateChecking.value = false
  }
}

const handleMergeDuplicate = async (id: number) => {
  const { value } = await ElMessageBox.prompt('请输入合并原因', '合并重复题', {
    inputType: 'textarea',
    inputPlaceholder: '例如：语义重复，保留主问题并建立重复关系'
  })
  await mergeQuestionDuplicateReviewApi(id, {
    relationType: 'SAME_INTENT',
    reason: value?.trim() || '确认重复'
  })
  ElMessage.success('重复题已合并')
  await fetchDuplicates()
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
  await fetchDuplicates()
}

onMounted(async () => {
  await fetchOptions()
  await Promise.all([fetchQuestions(), fetchReviews(), fetchDuplicates()])
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

.governance-filter {
  padding: 0 0 16px;
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
