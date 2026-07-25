<template>
  <div class="evidence-assets page-shell" v-loading="pageLoading">
    <el-alert
      v-if="accessUnavailable"
      type="warning"
      show-icon
      :closable="false"
      title="证据资产功能当前未开放"
      description="当前环境的后端功能开关尚未同步，暂时不能读取或修改证据使用数据。"
    >
      <el-button :loading="pageLoading" @click="load">重试</el-button>
    </el-alert>
    <template v-else>
    <section class="evidence-hero">
      <div class="evidence-hero__copy">
        <p class="eyebrow">求职证据使用</p>
        <h1>证据资产工作台</h1>
        <p>
          只回看已记录的实际使用、结果反馈和待确认观察。页面不会把未填写结果推断成失败，
          也不会在低样本下给出排名或因果结论。
        </p>
      </div>
      <div class="evidence-hero__actions">
        <el-button data-testid="refresh-evidence-assets" :loading="pageLoading" @click="load">
          <RefreshCcw :size="16" />
          刷新
        </el-button>
        <el-button type="primary" @click="router.push('/project-evidence')">
          <FolderKanban :size="16" />
          管理项目证据
        </el-button>
      </div>
    </section>

    <section class="trust-strip" aria-label="数据可信边界">
      <div class="trust-strip__summary">
        <span class="section-kicker">数据边界</span>
        <strong>{{ dataCutoffLabel }}</strong>
        <span>{{ sourceHashLabel }}</span>
      </div>
      <div class="trust-strip__tags">
        <el-tag :type="confidenceTagType(confidenceLevel)" effect="plain">
          {{ confidenceLabel(confidenceLevel) }}
        </el-tag>
        <el-tag v-if="fallback" type="warning" effect="plain">规则降级</el-tag>
        <el-tag v-if="unknowns.length" type="warning" effect="plain">有未知项</el-tag>
        <el-tag v-if="limits.length" type="info" effect="plain">有样本限制</el-tag>
      </div>
    </section>

    <el-alert
      v-if="warnings.length || fallback"
      class="boundary-alert"
      type="warning"
      show-icon
      :closable="false"
      title="请结合来源和限制理解以下内容"
    >
      <template #default>
        <ul class="boundary-list">
          <li v-if="fallback">{{ displayBoundaryText(fallbackReason, '当前结果来自规则降级，请结合来源和限制人工复核。') }}</li>
          <li v-for="warning in warnings" :key="warning">
            {{ displayBoundaryText(warning, '部分来源或字段暂不可用。') }}
          </li>
        </ul>
      </template>
    </el-alert>

    <nav class="section-nav" aria-label="证据资产工作台区块">
      <button
        v-for="item in sectionItems"
        :key="item.key"
        type="button"
        :class="{ 'is-active': activeSection === item.key }"
        @click="selectSection(item.key)"
      >
        <component :is="item.icon" :size="16" />
        <span>{{ item.label }}</span>
        <small>{{ item.count }}</small>
      </button>
    </nav>

    <section id="readiness" class="evidence-section" data-testid="evidence-readiness">
      <header class="section-heading">
        <div>
          <p class="section-kicker">就绪度</p>
          <h2>资产就绪度</h2>
          <p>查看现有资产是否有可回读版本和实际使用记录，不在这里复制资产 CRUD。</p>
        </div>
        <el-tag effect="plain">{{ readinessSummary }}</el-tag>
      </header>
      <AppState
        v-if="overviewError"
        type="error"
        title="资产就绪度暂时无法读取"
        :description="overviewError"
      >
        <el-button type="primary" :loading="overviewLoading" @click="loadOverview">重试</el-button>
      </AppState>
      <div v-else-if="readinessItems.length" class="readiness-grid">
        <article v-for="(item, index) in readinessItems" :key="item.assetType ?? `readiness-${index}`" class="readiness-item">
          <div class="readiness-item__head">
            <div>
              <strong>{{ assetTypeLabel(item.assetType) }}</strong>
              <span>{{ item.label || '现有求职资产' }}</span>
            </div>
            <el-tag :type="readinessTagType(item.readinessStatus)" effect="plain">
              {{ readinessStatusLabel(item.readinessStatus) }}
            </el-tag>
          </div>
          <dl class="readiness-facts">
            <div>
              <dt>资产</dt>
                <dd>{{ countLabel(item.totalCount) }}</dd>
            </div>
            <div>
              <dt>可回读版本</dt>
                <dd>{{ countLabel(item.versionedCount) }}</dd>
            </div>
            <div>
              <dt>已使用</dt>
                <dd>{{ countLabel(item.usedCount) }}</dd>
            </div>
            <div>
              <dt>已记录结果</dt>
                <dd>{{ countLabel(item.resultCount) }}</dd>
              </div>
              <div>
                <dt>来源待复核</dt>
                <dd>{{ countLabel(item.staleCount) }}</dd>
            </div>
          </dl>
          <p>{{ item.readinessReason || '就绪状态由服务端来源和版本信息汇总。' }}</p>
          <el-button
            v-if="item.actionPath"
            link
            type="primary"
            @click="goSafe(item.actionPath)"
          >
            查看来源
          </el-button>
        </article>
      </div>
      <AppState
        v-else-if="!overviewLoading"
        type="empty"
        title="还没有可展示的资产就绪度"
        description="尚未读取到项目证据、投递包或其他可追踪资产。"
      />
    </section>

    <section id="usages" class="evidence-section" data-testid="evidence-usages">
      <header class="section-heading">
        <div>
          <p class="section-kicker">使用记录</p>
          <h2>已使用证据</h2>
          <p>每条记录都保留资产版本、内容哈希、投递包快照和来源引用。</p>
        </div>
        <div class="heading-actions">
          <el-tag effect="plain">{{ envelopeCountLabel(usagesEnvelope, usageItems.length, '条记录') }}</el-tag>
          <el-button link type="primary" @click="router.push('/applications')">去投递管理</el-button>
        </div>
      </header>
      <AppState
        v-if="usagesError"
        type="error"
        title="使用记录暂时无法读取"
        :description="usagesError"
      >
        <el-button type="primary" :loading="usagesLoading" @click="loadUsages">重试</el-button>
      </AppState>
      <div v-else-if="usageItems.length" class="usage-list">
        <article
          v-for="usage in usageItems"
          :key="usageKey(usage)"
          class="usage-item"
          :class="{ 'is-stale': usage.stale === true }"
        >
          <div class="usage-item__main">
            <div class="usage-item__title">
              <strong>{{ usage.assetTitle || assetTypeLabel(usage.assetType) }}</strong>
              <el-tag v-if="usage.stale === true" type="warning" effect="plain">来源已过期</el-tag>
              <el-tag v-else-if="usage.stale === false" type="success" effect="plain">已捕获</el-tag>
              <el-tag v-else type="info" effect="plain">来源状态待确认</el-tag>
            </div>
            <p>
              {{ applicationLabel(usage) }}
              <span v-if="usage.usageScene"> · {{ usageSceneLabel(usage.usageScene) }}</span>
            </p>
            <dl class="usage-facts">
              <div><dt>资产版本</dt><dd>{{ usage.assetVersion || '版本待确认' }}</dd></div>
              <div><dt>投递包快照</dt><dd>{{ usage.packageSnapshotId || '未关联' }}</dd></div>
              <div><dt>使用时间</dt><dd>{{ usage.usedAt || '时间待确认' }}</dd></div>
              <div><dt>结果数</dt><dd>{{ countLabel(usage.resultCount) }}</dd></div>
            </dl>
            <p v-if="usage.staleReason" class="inline-warning">{{ displayBoundaryText(usage.staleReason, '来源状态待复核。') }}</p>
            <div class="source-ref-list">
              <span v-for="(source, index) in usageSources(usage)" :key="`${sourceKey(source)}#${index}`">
                {{ sourceLabel(source) }}
              </span>
              <span v-if="!usageSources(usage).length">来源引用待补充</span>
            </div>
          </div>
          <div class="usage-item__actions">
            <el-button
              type="primary"
              size="small"
              v-if="usage.id !== undefined"
              :data-testid="`record-result-${usage.id}`"
              @click="openResultDialog(usage)"
            >
              记录结果
            </el-button>
            <el-button
              size="small"
              v-if="usage.id !== undefined"
              @click="goUsageDetail(usage.id)"
            >
              查看详情
            </el-button>
          </div>
        </article>
      </div>
      <AppState
        v-else-if="!usagesLoading"
        type="empty"
        title="尚未记录实际使用"
        description="没有记录不等于没有使用。可从投递包或项目证据入口记录一次明确使用。"
      >
        <el-button type="primary" @click="router.push('/application-packages')">查看投递包</el-button>
      </AppState>
    </section>

    <section id="results" class="evidence-section" data-testid="evidence-results">
      <header class="section-heading">
        <div>
          <p class="section-kicker">结果反馈</p>
          <h2>结果反馈</h2>
          <p>事实、外部反馈、个人解释和未知项分栏展示；空白不会被转换成否定结果。</p>
        </div>
        <el-tag effect="plain">{{ envelopeCountLabel(resultsEnvelope, resultItems.length, '条结果') }}</el-tag>
      </header>
      <AppState
        v-if="resultsError"
        type="error"
        title="结果反馈暂时无法读取"
        :description="resultsError"
      >
        <el-button type="primary" :loading="resultsLoading" @click="loadResults">重试</el-button>
      </AppState>
      <div v-else-if="resultItems.length" class="result-list">
        <article v-for="result in resultItems" :key="resultKey(result)" class="result-item">
          <div class="result-item__head">
            <div>
              <strong>{{ outcomeLabel(result.outcomeCode) }}</strong>
              <span>{{ eventTypeLabel(result.eventType) }} · {{ result.occurredAt || '发生时间待确认' }}</span>
            </div>
            <div class="result-item__tags">
              <el-tag :type="resultStatusTagType(result.status)" effect="plain">
                {{ resultStatusLabel(result.status) }}
              </el-tag>
              <el-tag :type="confidenceTagType(result.confidenceLevel)" effect="plain">
                {{ confidenceLabel(result.confidenceLevel) }}
              </el-tag>
              <el-tag v-if="result.fallback === true" type="warning" effect="plain">规则降级</el-tag>
              <el-tag v-if="result.stale === true" type="warning" effect="plain">来源已过期</el-tag>
              <el-tag v-else-if="result.stale === false" type="success" effect="plain">来源已核验</el-tag>
              <el-tag v-else type="info" effect="plain">来源状态待确认</el-tag>
            </div>
          </div>
          <div class="result-fact-grid">
            <div>
              <h3>已知事实</h3>
              <ul v-if="result.knownFacts?.length"><li v-for="fact in result.knownFacts" :key="fact">{{ fact }}</li></ul>
              <p v-else>尚未记录明确事实。</p>
            </div>
            <div>
              <h3>外部反馈</h3>
              <p>{{ result.externalFeedbackText ? displayBoundaryText(result.externalFeedbackText, '外部反馈内容暂不可显示。') : '尚未记录外部反馈。' }}</p>
            </div>
            <div>
              <h3>个人解释</h3>
              <p>{{ result.userInterpretationText ? displayBoundaryText(result.userInterpretationText, '个人解释内容暂不可显示。') : '尚未记录个人解释。' }}</p>
            </div>
            <div>
              <h3>未知项与限制</h3>
              <ul v-if="result.unknowns?.length || result.limits?.length">
                <li v-for="unknown in result.unknowns || []" :key="`unknown-${unknown}`">未知：{{ unknown }}</li>
                <li v-for="limit in result.limits || []" :key="`limit-${limit}`">限制：{{ limit }}</li>
              </ul>
              <p v-else>当前没有额外未知项或限制。</p>
            </div>
          </div>
          <div class="result-item__foot">
            <div class="source-ref-list">
              <span v-for="(source, index) in resultSources(result)" :key="`${sourceKey(source)}#${index}`">
                {{ sourceLabel(source) }}
              </span>
              <span v-if="!resultSources(result).length">来源引用待补充</span>
            </div>
            <div class="result-item__actions">
              <el-button
                v-if="canConfirmResult(result) && result.id !== undefined"
                size="small"
                type="primary"
                :loading="confirmingResultId === result.id"
                @click="confirmResult(result)"
              >
                确认结果
              </el-button>
              <el-button
                v-if="canCorrectResult(result) && result.id !== undefined"
                size="small"
                @click="openCorrectionDialog(result)"
              >
                更正
              </el-button>
            </div>
          </div>
        </article>
      </div>
      <AppState
        v-else-if="!resultsLoading"
        type="empty"
        title="尚未记录明确结果"
        description="可从已使用证据记录回复、面试、Offer 或未知结果。没有填写不代表没有发生。"
      >
        <el-button type="primary" @click="selectSection('usages')">从使用记录开始</el-button>
      </AppState>
    </section>

    <section id="candidates" class="evidence-section" data-testid="evidence-candidates">
      <header class="section-heading">
        <div>
          <p class="section-kicker">待确认候选</p>
          <h2>待确认候选</h2>
          <p>候选在确认前不会进入 Agent 上下文；四种决策均需明确提交或取消。</p>
        </div>
        <el-tag effect="plain">{{ envelopeCountLabel(candidatesEnvelope, candidateItems.length, '条待处理') }}</el-tag>
      </header>
      <AppState
        v-if="candidatesError"
        type="error"
        title="学习候选暂时无法读取"
        :description="candidatesError"
      >
        <el-button type="primary" :loading="candidatesLoading" @click="loadCandidates">重试</el-button>
      </AppState>
      <div v-else-if="candidateItems.length" class="candidate-list">
        <article v-for="candidate in candidateItems" :key="candidateKey(candidate)" class="candidate-item">
          <div class="candidate-item__main">
            <div class="candidate-item__head">
              <div>
                <strong>{{ candidate.title || '待确认观察' }}</strong>
                <span>{{ candidateStatusLabel(candidate.status) }}</span>
              </div>
              <div class="candidate-item__tags">
                <el-tag :type="confidenceTagType(candidate.confidenceLevel)" effect="plain">
                  {{ confidenceLabel(candidate.confidenceLevel) }}
                </el-tag>
                <el-tag v-if="candidate.fallback" type="warning" effect="plain">规则降级</el-tag>
                <el-tag v-if="candidate.confirmed === true" type="success" effect="plain">用户已确认</el-tag>
                <el-tag v-else-if="candidate.confirmed === false" type="info" effect="plain">用户未确认</el-tag>
                <el-tag v-if="candidate.stale === true" type="warning" effect="plain">来源待复核</el-tag>
                <el-tag v-else-if="candidate.stale === false" type="success" effect="plain">来源已核验</el-tag>
                <el-tag v-else type="info" effect="plain">来源状态待确认</el-tag>
              </div>
            </div>
            <p class="candidate-content">{{ candidate.content || candidate.weakObservation || '暂无候选正文。' }}</p>
            <dl class="candidate-facts">
              <div><dt>证据数</dt><dd>{{ countLabel(candidate.evidenceCount) }}</dd></div>
              <div><dt>样本数</dt><dd>{{ countLabel(candidate.sampleCount) }}</dd></div>
              <div><dt>候选类型</dt><dd>{{ candidateTypeLabel(candidate.candidateType) }}</dd></div>
              <div><dt>来源数</dt><dd>{{ countLabel(candidateSources(candidate).length) }}</dd></div>
            </dl>
            <ul v-if="candidate.limits?.length || candidate.unknowns?.length" class="candidate-limits">
              <li v-for="limit in candidate.limits || []" :key="`candidate-limit-${limit}`">限制：{{ limit }}</li>
              <li v-for="unknown in candidate.unknowns || []" :key="`candidate-unknown-${unknown}`">未知：{{ unknown }}</li>
            </ul>
            <div class="source-ref-list">
              <span v-for="(source, index) in candidateSources(candidate)" :key="`${sourceKey(source)}#${index}`">
                {{ sourceLabel(source) }}
              </span>
              <span v-if="!candidateSources(candidate).length">来源引用待补充</span>
            </div>
          </div>
          <div class="candidate-item__actions">
            <template v-if="candidateCanDecide(candidate) && candidate.id !== undefined">
              <el-button
                v-for="decision in candidate.availableDecisions"
                :key="decision"
                size="small"
                :type="decision === 'REJECT' ? 'danger' : decision === 'KEEP' ? 'primary' : 'default'"
                :data-testid="`candidate-${candidate.id}-${decision.toLowerCase()}`"
                @click="openCandidateDecision(candidate, decision)"
              >
                {{ decisionLabel(decision) }}
              </el-button>
            </template>
            <el-button
              v-if="candidate.editPath"
              link
              type="primary"
              size="small"
              @click="goSafe(candidate.editPath)"
            >
              编辑来源
            </el-button>
            <el-button
              v-if="candidate.memoryPreviewPath"
              link
              type="primary"
              size="small"
              @click="goSafe(candidate.memoryPreviewPath)"
            >
              查看记忆影响
            </el-button>
            <el-tag v-if="candidate.id === undefined" type="warning" effect="plain">记录编号待确认</el-tag>
            <el-tag v-else-if="!candidateCanDecide(candidate)" type="info" effect="plain">
              {{ candidateActionStateLabel(candidate) }}
            </el-tag>
          </div>
        </article>
      </div>
      <AppState
        v-else-if="!candidatesLoading"
        type="empty"
        title="暂无待确认候选"
        description="候选会在服务端依据使用样本和结果边界生成；没有候选不代表没有值得继续观察的事实。"
      />
    </section>

    <section
      v-if="unknowns.length || limits.length || sources.length || coverageLines.length"
      class="evidence-section evidence-section--compact"
    >
      <header class="section-heading">
        <div>
          <p class="section-kicker">来源追溯</p>
          <h2>来源与限制</h2>
          <p>以下内容用于回读和人工复核，不代表能力评分。</p>
        </div>
      </header>
      <div class="trace-grid">
        <div>
          <h3>未知项</h3>
          <ul v-if="unknowns.length"><li v-for="item in unknowns" :key="item">{{ item }}</li></ul>
          <p v-else>暂无额外未知项。</p>
        </div>
        <div>
          <h3>限制</h3>
          <ul v-if="limits.length"><li v-for="item in limits" :key="item">{{ item }}</li></ul>
          <p v-else>暂无额外限制。</p>
        </div>
        <div>
          <h3>来源引用</h3>
          <div class="source-ref-list source-ref-list--stack">
            <span v-for="(source, index) in sources" :key="`${sourceKey(source)}#${index}`">{{ sourceLabel(source) }}</span>
            <span v-if="!sources.length">暂无来源引用。</span>
          </div>
        </div>
        <div v-if="coverageLines.length">
          <h3>覆盖范围</h3>
          <ul>
            <li v-for="line in coverageLines" :key="line">{{ line }}</li>
          </ul>
        </div>
      </div>
    </section>

    <el-dialog
      v-model="resultDialogVisible"
      :title="correctionTarget ? '更正结果反馈' : '记录结果反馈'"
      width="min(680px, calc(100vw - 32px))"
    >
      <div class="dialog-context">
        <strong>{{ correctionTarget ? `结果 #${correctionTarget.id}` : resultTarget?.assetTitle || '已使用证据' }}</strong>
        <span>{{ resultTarget ? applicationLabel(resultTarget) : '旧版本仍会保留，可审计回读。' }}</span>
      </div>
      <div class="form-grid">
        <label>
          <span>结果类型</span>
          <el-select v-model="resultForm.outcomeCode" class="full-control" placeholder="请选择结果类型">
            <el-option v-for="item in outcomeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </label>
        <label>
          <span>事件类型</span>
          <el-select
            v-model="resultForm.eventType"
            class="full-control"
            :disabled="Boolean(correctionTarget)"
            placeholder="请选择事件类型"
          >
            <el-option v-for="item in eventOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </label>
        <label>
          <span>来源事件 ID</span>
          <el-input
            v-model="resultForm.eventId"
            inputmode="numeric"
            :disabled="Boolean(correctionTarget)"
            placeholder="请输入已有投递、面试、Offer 或复盘事件 ID"
          />
        </label>
        <label class="form-grid__wide">
          <span>已知事实（每行一条）</span>
          <el-input v-model="resultForm.knownFacts" type="textarea" :rows="3" placeholder="只填写已有事件或你明确确认的事实。" />
        </label>
        <label class="form-grid__wide">
          <span>外部反馈</span>
          <el-input v-model="resultForm.externalFeedbackText" type="textarea" :rows="3" placeholder="记录外部反馈原文或转述，不与个人解释混写。" />
        </label>
        <label class="form-grid__wide">
          <span>个人解释</span>
          <el-input v-model="resultForm.userInterpretationText" type="textarea" :rows="3" placeholder="记录你的理解，不会直接进入事实统计。" />
        </label>
        <label class="form-grid__wide">
          <span>未知项（每行一条）</span>
          <el-input v-model="resultForm.unknowns" type="textarea" :rows="2" placeholder="明确记录仍不知道什么。" />
        </label>
        <label class="form-grid__wide">
          <span>限制（每行一条）</span>
          <el-input v-model="resultForm.limits" type="textarea" :rows="2" placeholder="记录当前样本不能说明什么。" />
        </label>
      </div>
      <template #footer>
        <el-button data-testid="cancel-result-dialog" @click="closeResultDialog">取消</el-button>
        <el-button
          type="primary"
          data-testid="submit-result"
          :loading="resultSaving"
          @click="submitResult"
        >
          {{ correctionTarget ? '确认更正' : '确认记录' }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="candidateDialogVisible"
      title="确认候选决策"
      width="min(560px, calc(100vw - 32px))"
    >
      <div class="dialog-context">
        <strong>{{ decisionLabel(candidateDecision) }}</strong>
        <span>{{ candidateTarget?.title || '待确认观察' }}</span>
      </div>
      <p class="decision-warning">
        {{ candidateDecisionDescription }}
      </p>
      <div v-if="candidateTarget" class="candidate-preview">
        <p>{{ candidateTarget.content || candidateTarget.weakObservation || '暂无候选正文。' }}</p>
        <small>
          {{ confidenceLabel(candidateTarget.confidenceLevel) }} · 样本 {{ countLabel(candidateTarget.sampleCount) }}
          <span v-if="candidateTarget.fallback"> · 规则降级</span>
          <span v-if="candidateTarget.stale === true"> · 来源待复核</span>
        </small>
      </div>
      <label v-if="candidateDecision === 'EDIT'" class="form-grid__wide">
        <span>修改后的候选内容</span>
        <el-input
          v-model="candidateNote"
          type="textarea"
          :rows="3"
          placeholder="填写修改后的候选内容，提交后回到已有资产编辑入口。"
        />
      </label>
      <template #footer>
        <el-button data-testid="cancel-candidate-dialog" @click="closeCandidateDialog">取消</el-button>
        <el-button
          type="primary"
          data-testid="confirm-candidate-decision"
          :loading="candidateSaving"
          @click="submitCandidateDecision"
        >
          确认{{ decisionLabel(candidateDecision) }}
        </el-button>
      </template>
    </el-dialog>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ClipboardCheck,
  FileCheck2,
  FolderKanban,
  RefreshCcw,
  Sparkles
} from 'lucide-vue-next'
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  confirmEvidenceUsageResultApi,
  correctEvidenceUsageResultApi,
  createEvidenceUsageResultApi,
  getEvidenceAssetResultsApi,
  getEvidenceAssetsOverviewApi,
  getEvidenceAssetUsagesApi,
  getEvidenceUsageDetailApi
} from '@/api/evidenceAsset'
import {
  decideEvidenceLearningCandidateApi,
  getEvidenceLearningCandidateApi,
  getEvidenceLearningCandidatesApi
} from '@/api/evidenceLearning'
import AppState from '@/components/common/AppState.vue'
import { defaultUserKnownPaths, resolveAppRoutePath } from '@/features/route-safety'
import type {
  CareerEvidenceUsageResultVO,
  CareerEvidenceUsageQueryDTO,
  CareerEvidenceUsageResultQueryDTO,
  CareerEvidenceUsageVO,
  EvidenceAssetOverviewEnvelopeVO,
  EvidenceAssetOverviewQueryDTO,
  EvidenceAssetReadinessItemVO,
  EvidenceConfidenceLevel,
  EvidenceEnvelopeVO,
  EvidenceSourceRefVO,
  EvidenceUsageOutcomeWriteCode
} from '@/types/evidenceAsset'
import type {
  EvidenceLearningCandidateQueryDTO,
  EvidenceLearningCandidateVO,
  EvidenceLearningDecisionCode
} from '@/types/evidenceLearning'
import { createStableOperationIdempotencyKey } from '@/utils/idempotency'
import { getErrorMessage } from '@/utils/error'
import { getBusinessCode, isAuthOrForbiddenError } from '@/utils/apiError'
import { sanitizeLocalActionPath } from '@/utils/routeSecurity'

type SectionKey = 'readiness' | 'usages' | 'results' | 'candidates'

const route = useRoute()
const router = useRouter()
// Guards against slow in-flight loads overwriting newer ones when the deep-link query changes
// (onMounted / query watch / retry can all fire load()). Mirrors ApplicationWorkspaceView's token.
let loadToken = 0
const pageLoading = ref(false)
const overviewLoading = ref(false)
const usagesLoading = ref(false)
const resultsLoading = ref(false)
const candidatesLoading = ref(false)
const overviewError = ref('')
const usagesError = ref('')
const resultsError = ref('')
const candidatesError = ref('')
const accessUnavailable = ref(false)
const overview = ref<EvidenceAssetOverviewEnvelopeVO>()
const usagesEnvelope = ref<EvidenceEnvelopeVO<CareerEvidenceUsageVO>>()
const resultsEnvelope = ref<EvidenceEnvelopeVO<CareerEvidenceUsageResultVO>>()
const candidatesEnvelope = ref<EvidenceEnvelopeVO<EvidenceLearningCandidateVO>>()
const activeSection = ref<SectionKey>(sectionFromQuery())

const resultDialogVisible = ref(false)
const resultSaving = ref(false)
const resultTarget = ref<CareerEvidenceUsageVO>()
const correctionTarget = ref<CareerEvidenceUsageResultVO>()
const confirmingResultId = ref<number>()
const candidateDialogVisible = ref(false)
const candidateSaving = ref(false)
const candidateTarget = ref<EvidenceLearningCandidateVO>()
const candidateDecision = ref<EvidenceLearningDecisionCode>('KEEP')
const candidateNote = ref('')
const handledRouteModeKey = ref('')

const resultForm = reactive<{
  eventType: string
  eventId: string
  outcomeCode: EvidenceUsageOutcomeWriteCode
  knownFacts: string
  externalFeedbackText: string
  userInterpretationText: string
  unknowns: string
  limits: string
}>({
  eventType: 'APPLICATION_EVENT',
  eventId: '',
  outcomeCode: 'UNKNOWN',
  knownFacts: '',
  externalFeedbackText: '',
  userInterpretationText: '',
  unknowns: '',
  limits: ''
})

const outcomeOptions = [
  { label: '无回复', value: 'NO_RESPONSE' },
  { label: '收到回复', value: 'REPLIED' },
  { label: '面试推进', value: 'INTERVIEW_ADVANCED' },
  { label: '面试未推进', value: 'INTERVIEW_NOT_ADVANCED' },
  { label: '收到 Offer', value: 'OFFER_RECEIVED' },
  { label: '接受 Offer', value: 'OFFER_ACCEPTED' },
  { label: '拒绝 Offer', value: 'OFFER_DECLINED' },
  { label: '未知', value: 'UNKNOWN' }
] satisfies Array<{ label: string; value: EvidenceUsageOutcomeWriteCode }>
const outcomeCodes = new Set<EvidenceUsageOutcomeWriteCode>(
  outcomeOptions.map((item) => item.value)
)
const eventOptions = [
  { label: '投递事件', value: 'APPLICATION_EVENT' },
  { label: '面试轮次', value: 'INTERVIEW_ROUND' },
  { label: 'Offer 决策', value: 'OFFER_DECISION' },
  { label: '联系人活动', value: 'CONTACT_ACTIVITY' },
  { label: '周期复盘快照', value: 'CAMPAIGN_REVIEW_SNAPSHOT' }
]

const countLabel = (value?: number) =>
  typeof value === 'number' && Number.isFinite(value) ? String(value) : '暂无数据'

const envelopeCountLabel = <T>(
  envelope: EvidenceEnvelopeVO<T> | undefined,
  itemCount: number,
  suffix: string
) => {
  if (!envelope) return '待返回'
  if (typeof envelope.total === 'number' && Number.isFinite(envelope.total)) {
    return `${envelope.total}${suffix}`
  }
  return itemCount > 0 ? `${itemCount}${suffix}（当前页）` : '暂无数据'
}

const sectionItems = computed(() => [
  { key: 'readiness' as SectionKey, label: '资产就绪度', count: countLabel(overview.value?.overview.assetCount), icon: FileCheck2 },
  { key: 'usages' as SectionKey, label: '已使用证据', count: envelopeCountLabel(usagesEnvelope.value, usageItems.value.length, ' 条'), icon: FolderKanban },
  { key: 'results' as SectionKey, label: '结果反馈', count: envelopeCountLabel(resultsEnvelope.value, resultItems.value.length, ' 条'), icon: ClipboardCheck },
  { key: 'candidates' as SectionKey, label: '待确认候选', count: envelopeCountLabel(candidatesEnvelope.value, candidateItems.value.length, ' 条'), icon: Sparkles }
])

const readinessItems = computed(() => overview.value?.overview.readiness || overview.value?.items || [])
const usageItems = computed(() => usagesEnvelope.value?.items || [])
const resultItems = computed(() => resultsEnvelope.value?.items || [])
const candidateItems = computed(() => candidatesEnvelope.value?.items || [])
const metadataEnvelopes = computed(() => [
  overview.value,
  usagesEnvelope.value,
  resultsEnvelope.value,
  candidatesEnvelope.value
].filter(Boolean) as Array<EvidenceEnvelopeVO<unknown>>)
const warnings = computed(() => uniqueStrings(metadataEnvelopes.value.flatMap((item) => item.warnings || [])))
const unknowns = computed(() => uniqueStrings(metadataEnvelopes.value.flatMap((item) => item.unknowns || [])))
const limits = computed(() => uniqueStrings(metadataEnvelopes.value.flatMap((item) => item.limits || [])))
const sources = computed(() => uniqueSources(metadataEnvelopes.value.flatMap((item) => item.sources || [])))
const fallback = computed(() => metadataEnvelopes.value.some((item) => item.fallback))
const fallbackReason = computed(() =>
  metadataEnvelopes.value.map((item) => item.fallbackReason).find(Boolean) || ''
)
const coverageLines = computed(() => uniqueStrings(
  metadataEnvelopes.value.flatMap((item) => coverageToLines(item.coverage))
))
const confidenceLevel = computed<EvidenceConfidenceLevel | undefined>(() => {
  if (!metadataEnvelopes.value.length) return undefined
  const ordered = ['LOW', 'MEDIUM', 'HIGH']
  const values = metadataEnvelopes.value.map((item) =>
    String(item.confidenceLevel || 'UNKNOWN').toUpperCase()
  )
  return ordered.find((item) => values.includes(item)) || 'UNKNOWN'
})
const dataCutoffLabel = computed(() => {
  const value = metadataEnvelopes.value.map((item) => item.dataCutoffAt).find(Boolean)
  return value ? `数据截点：${value}` : '数据截点待服务端返回'
})
const sourceHashLabel = computed(() => {
  const value = metadataEnvelopes.value.map((item) => item.sourceSetHash).find(Boolean)
  return value ? `来源集：${value}` : '来源集哈希待返回'
})
const readinessSummary = computed(() => {
  if (!overview.value) return '就绪数据待返回'
  if (!readinessItems.value.length) return '暂无资产就绪度'
  const ready = readinessItems.value.filter((item) => String(item.readinessStatus).toUpperCase() === 'READY').length
  return `${ready}/${readinessItems.value.length} 类资产已就绪`
})

function sectionFromQuery(): SectionKey {
  const rawValue = route.query?.tab
  const value = String(Array.isArray(rawValue) ? rawValue[0] || '' : rawValue || '').toLowerCase()
  return ['readiness', 'usages', 'results', 'candidates'].includes(value) ? value as SectionKey : 'readiness'
}

const queryNumber = (key: string) => {
  const rawValue = route.query?.[key]
  const value = Number(Array.isArray(rawValue) ? rawValue[0] : rawValue)
  return Number.isSafeInteger(value) && value > 0 ? value : undefined
}

const queryString = (key: string) => {
  const rawValue = route.query?.[key]
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

const overviewQuery = (): EvidenceAssetOverviewQueryDTO => ({
  campaignId: queryNumber('campaignId'),
  applicationId: queryNumber('applicationId')
})

const usagesQuery = (): CareerEvidenceUsageQueryDTO => ({
  campaignId: queryNumber('campaignId'),
  applicationId: queryNumber('applicationId'),
  targetJobId: queryNumber('targetJobId'),
  experimentId: queryNumber('experimentId'),
  assetType: queryString('assetType') as CareerEvidenceUsageQueryDTO['assetType'],
  assetId: queryNumber('assetId'),
  packageSnapshotId: queryNumber('packageSnapshotId'),
  hypothesisId: queryNumber('hypothesisId'),
  usageId: queryNumber('usageId'),
  status: queryString('status') as CareerEvidenceUsageQueryDTO['status']
})

const resultsQuery = (): CareerEvidenceUsageResultQueryDTO => ({
  campaignId: queryNumber('campaignId'),
  applicationId: queryNumber('applicationId'),
  targetJobId: queryNumber('targetJobId'),
  experimentId: queryNumber('experimentId'),
  hypothesisId: queryNumber('hypothesisId'),
  usageId: queryNumber('usageId'),
  resultId: queryNumber('resultId'),
  assetType: queryString('assetType') as CareerEvidenceUsageResultQueryDTO['assetType'],
  assetId: queryNumber('assetId'),
  packageSnapshotId: queryNumber('packageSnapshotId'),
  status: queryString('status') as CareerEvidenceUsageResultQueryDTO['status'],
  outcomeCode: queryString('outcomeCode') as CareerEvidenceUsageResultQueryDTO['outcomeCode']
})

const candidatesQuery = (): EvidenceLearningCandidateQueryDTO => ({
  campaignId: queryNumber('campaignId'),
  applicationId: queryNumber('applicationId'),
  usageId: queryNumber('usageId'),
  status: queryString('status') as EvidenceLearningCandidateQueryDTO['status']
})

const isWorkbenchAccessError = (error: unknown) =>
  isAuthOrForbiddenError(error) || getBusinessCode(error) === 403

const workbenchErrorMessage = (error: unknown, fallback: string) =>
  isWorkbenchAccessError(error)
    ? '证据资产工作台当前未开放或当前账户暂无访问权限。'
    : getErrorMessage(error, fallback)

const resetResultDialog = () => {
  resultDialogVisible.value = false
  resultTarget.value = undefined
  correctionTarget.value = undefined
}

const resetCandidateDialog = () => {
  candidateDialogVisible.value = false
  candidateTarget.value = undefined
  candidateNote.value = ''
}

const clearWorkbenchData = () => {
  overview.value = undefined
  usagesEnvelope.value = undefined
  resultsEnvelope.value = undefined
  candidatesEnvelope.value = undefined
  confirmingResultId.value = undefined
  resetResultDialog()
  resetCandidateDialog()
}

const handleAccessUnavailable = (error: unknown) => {
  if (!isWorkbenchAccessError(error)) return false
  accessUnavailable.value = true
  clearWorkbenchData()
  return true
}

const singleItemEnvelope = <T extends {
  dataCutoffAt?: string
  sourceSetHash?: string
  coverage?: EvidenceEnvelopeVO<unknown>['coverage']
  warnings?: string[]
  unknowns?: string[]
  limits?: string[]
  confidenceLevel?: EvidenceConfidenceLevel
  fallback?: boolean
  fallbackReason?: string
  sources?: EvidenceSourceRefVO[]
  sourceRefs?: EvidenceSourceRefVO[]
}>(item: T): EvidenceEnvelopeVO<T> => ({
  items: [item],
  total: 1,
  dataCutoffAt: item.dataCutoffAt,
  sourceSetHash: item.sourceSetHash,
  coverage: item.coverage,
  warnings: item.warnings || [],
  unknowns: item.unknowns || [],
  limits: item.limits || [],
    confidenceLevel: item.confidenceLevel || 'UNKNOWN',
  fallback: item.fallback === true,
  fallbackReason: item.fallbackReason,
  sources: item.sources || item.sourceRefs || []
})

const loadOverview = async (token: number = ++loadToken) => {
  overviewLoading.value = true
  overviewError.value = ''
  try {
    const value = await getEvidenceAssetsOverviewApi(overviewQuery())
    if (token !== loadToken) return true
    overview.value = value
    return true
  } catch (error) {
    if (token !== loadToken) return true
    const unavailable = handleAccessUnavailable(error)
    overviewError.value = workbenchErrorMessage(error, '资产就绪度暂时不可用，请稍后重试。')
    return !unavailable
  } finally {
    if (token === loadToken) overviewLoading.value = false
  }
}

const loadUsages = async (token: number = ++loadToken) => {
  usagesLoading.value = true
  usagesError.value = ''
  try {
    const usageId = queryNumber('usageId')
    const value = usageId
      ? singleItemEnvelope(await getEvidenceUsageDetailApi(usageId))
      : await getEvidenceAssetUsagesApi(usagesQuery())
    if (token !== loadToken) return true
    usagesEnvelope.value = value
    return true
  } catch (error) {
    if (token !== loadToken) return true
    const unavailable = handleAccessUnavailable(error)
    usagesError.value = workbenchErrorMessage(error, '使用记录暂时不可用，请稍后重试。')
    return !unavailable
  } finally {
    if (token === loadToken) usagesLoading.value = false
  }
}

const loadResults = async (token: number = ++loadToken) => {
  resultsLoading.value = true
  resultsError.value = ''
  try {
    const value = await getEvidenceAssetResultsApi(resultsQuery())
    if (token !== loadToken) return true
    resultsEnvelope.value = value
    return true
  } catch (error) {
    if (token !== loadToken) return true
    const unavailable = handleAccessUnavailable(error)
    resultsError.value = workbenchErrorMessage(error, '结果反馈暂时不可用，请稍后重试。')
    return !unavailable
  } finally {
    if (token === loadToken) resultsLoading.value = false
  }
}

const loadCandidates = async (token: number = ++loadToken) => {
  candidatesLoading.value = true
  candidatesError.value = ''
  try {
    const candidateId = queryNumber('candidateId')
    const value = candidateId
      ? singleItemEnvelope(await getEvidenceLearningCandidateApi(candidateId))
      : await getEvidenceLearningCandidatesApi(candidatesQuery())
    if (token !== loadToken) return true
    candidatesEnvelope.value = value
    return true
  } catch (error) {
    if (token !== loadToken) return true
    const unavailable = handleAccessUnavailable(error)
    candidatesError.value = workbenchErrorMessage(error, '学习候选暂时不可用，请稍后重试。')
    return !unavailable
  } finally {
    if (token === loadToken) candidatesLoading.value = false
  }
}

const load = async () => {
  const token = ++loadToken
  pageLoading.value = true
  try {
    accessUnavailable.value = false
    if (!await loadOverview(token) || token !== loadToken) return
    if (accessUnavailable.value) return
    if (!await loadUsages(token) || token !== loadToken) return
    if (accessUnavailable.value) return
    if (!await loadResults(token) || token !== loadToken) return
    if (accessUnavailable.value) return
    if (!await loadCandidates(token) || token !== loadToken) return
    if (accessUnavailable.value) return
    await handleRouteMode()
  } finally {
    if (token === loadToken) pageLoading.value = false
  }
}

const handleRouteMode = async () => {
  const mode = queryString('mode')
  if (mode !== 'record-result') {
    handledRouteModeKey.value = ''
    return
  }
  const modeKey = `${mode}:${queryNumber('applicationId') || ''}:${queryNumber('usageId') || ''}`
  if (handledRouteModeKey.value === modeKey) return
  activeSection.value = 'usages'
  if (usageItems.value.length > 0) {
    handledRouteModeKey.value = modeKey
    await nextTick()
    openResultDialog(usageItems.value[0])
    return
  }
  handledRouteModeKey.value = modeKey
  ElMessage.info('当前投递还没有可记录结果的使用快照，请先记录本次使用。')
  await nextTick()
  document.getElementById('usages')?.scrollIntoView?.({ behavior: 'auto', block: 'start' })
}

const selectSection = (section: SectionKey) => {
  activeSection.value = section
  const query = { ...route.query, tab: section }
  void router.push({ query })
  document.getElementById(section)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
}

const goSafe = (path?: string) => {
  const sanitizedPath = sanitizeLocalActionPath(path, '/project-evidence')
  const safePath = resolveAppRoutePath(sanitizedPath, {
    fallbackPath: '/project-evidence',
    knownPaths: defaultUserKnownPaths
  }).path
  void router.push(safePath)
}

const goUsageDetail = (usageId: number) => {
  void router.push({ query: { ...route.query, tab: 'usages', usageId: String(usageId) } })
}

const applicationLabel = (usage: CareerEvidenceUsageVO) =>
  usage.applicationLabel ||
  [usage.companyName, usage.jobTitle].filter(Boolean).join(' · ') ||
  (usage.applicationId ? `机会 #${usage.applicationId}` : '机会关联待确认')

const assetTypeLabel = (value?: string) => ({
  PROJECT_EVIDENCE: '项目证据',
  PROJECT_SKILL_EVIDENCE: '技能证据',
  PROJECT_STORY_GENERATION: '项目故事',
  APPLICATION_PACKAGE_SNAPSHOT: '投递包快照',
  RESUME_VERSION: '简历版本',
  MATCH_REPORT: '匹配报告'
}[String(value || '').toUpperCase()] || (value ? '其他求职资产' : '资产类型待确认'))

const usageSceneLabel = (value?: string) => ({
  APPLICATION_SUBMISSION: '投递使用',
  INTERVIEW_PREPARATION: '面试准备',
  INTERVIEW_RESPONSE: '面试回答',
  MATERIAL_EXPORT: '材料导出'
}[String(value || '').toUpperCase()] || (value ? '其他使用场景' : '使用场景待确认'))

const outcomeLabel = (value?: string) => ({
  NO_RESPONSE: '无回复',
  REPLIED: '收到回复',
  INTERVIEW_ADVANCED: '面试推进',
  INTERVIEW_NOT_ADVANCED: '面试未推进',
  OFFER_RECEIVED: '收到 Offer',
  OFFER_ACCEPTED: '接受 Offer',
  OFFER_DECLINED: '拒绝 Offer',
  UNKNOWN: '未知结果'
}[String(value || '').toUpperCase()] || (value ? '其他结果' : '结果待确认'))

const eventTypeLabel = (value?: string) => ({
  APPLICATION_EVENT: '投递事件',
  INTERVIEW_ROUND: '面试轮次',
  OFFER_DECISION: 'Offer 决策',
  CONTACT_ACTIVITY: '联系人活动',
  CAMPAIGN_REVIEW_SNAPSHOT: '周期复盘快照'
}[String(value || '').toUpperCase()] || (value ? '其他事件' : '事件来源待确认'))

const resultStatusLabel = (value?: string) => ({
  RECORDED: '待确认',
  CONFIRMED: '已确认',
  CORRECTED: '已更正',
  VOID: '已作废'
}[String(value || '').toUpperCase()] || '状态待确认')

const candidateStatusLabel = (value?: string) => ({
  WEAK_OBSERVATION: '弱观察',
  PENDING_CONFIRMATION: '待确认',
  CONFIRMED_BY_USER: '已确认',
  REJECTED: '已拒绝',
  EXPIRED: '已过期'
}[String(value || '').toUpperCase()] || '待确认')

const candidateTypeLabel = (value?: string) => ({
  EVIDENCE_REUSE: '证据复用',
  FOLLOW_UP_PATTERN: '跟进模式',
  EXPERIMENT_RULE: '实验规则',
  INTERVIEW_PREP: '面试准备'
}[String(value || '').toUpperCase()] || (value ? '其他候选类型' : '弱观察'))

const decisionLabel = (value?: string) => ({
  KEEP: '保留',
  EDIT: '修改',
  CONTINUE: '继续实验',
  REJECT: '拒绝'
}[String(value || '').toUpperCase()] || '确认')

const confidenceLabel = (value?: string) => ({
  HIGH: '高置信度',
  MEDIUM: '中置信度',
  LOW: '低置信度'
}[String(value || '').toUpperCase()] || '置信度待确认')

const confidenceTagType = (value?: string) =>
  String(value || '').toUpperCase() === 'HIGH'
    ? 'success'
    : String(value || '').toUpperCase() === 'MEDIUM'
      ? 'info'
      : String(value || '').toUpperCase() === 'LOW'
        ? 'warning'
        : 'info'

const readinessStatusLabel = (value?: string) => ({
  READY: '已就绪',
  PARTIAL: '部分就绪',
  MISSING: '待补齐'
}[String(value || '').toUpperCase()] || '状态待确认')

const readinessTagType = (value?: string) =>
  String(value || '').toUpperCase() === 'READY'
    ? 'success'
    : String(value || '').toUpperCase() === 'PARTIAL'
      ? 'warning'
      : 'info'

const resultStatusTagType = (value?: string) =>
  String(value || '').toUpperCase() === 'CONFIRMED'
    ? 'success'
    : String(value || '').toUpperCase() === 'VOID'
      ? 'info'
      : 'warning'

const usageSources = (usage: CareerEvidenceUsageVO) => usage.sourceRefs || usage.sources || []
const resultSources = (result: CareerEvidenceUsageResultVO) => result.sourceRefs || result.sources || []
const candidateSources = (candidate: EvidenceLearningCandidateVO) => candidate.sourceRefs || candidate.sources || []

const sourceTypeLabel = (value?: string) => ({
  PROJECT_EVIDENCE: '项目证据',
  PROJECT_SKILL_EVIDENCE: '技能证据',
  PROJECT_STORY_GENERATION: '项目故事',
  APPLICATION_PACKAGE_SNAPSHOT: '投递包快照',
  RESUME_VERSION: '简历版本',
  MATCH_REPORT: '匹配报告',
  EVIDENCE_USAGE: '证据使用',
  APPLICATION_EVENT: '投递事件',
  INTERVIEW_REPORT: '面试报告',
  CAREER_CAMPAIGN_REVIEW: '周期复盘'
}[String(value || '').toUpperCase()] || (value ? '其他来源' : '来源类型待确认'))

const sourceKey = (source: EvidenceSourceRefVO) =>
  `${source.sourceType || 'SOURCE'}:${source.sourceId || ''}:${source.sourceVersion || ''}:${source.sourceHash || ''}`

const sourceLabel = (source: EvidenceSourceRefVO) => {
  const identity = [
    sourceTypeLabel(source.sourceType),
    source.sourceId && `#${source.sourceId}`,
    source.sourceVersion && `v${source.sourceVersion}`
  ]
    .filter(Boolean)
    .join(' ')
  return source.summary ? `${identity} · ${source.summary}` : identity || '来源引用待确认'
}

const uniqueStrings = (values: string[]) => Array.from(new Set(values.filter(Boolean)))
const uniqueSources = (values: EvidenceSourceRefVO[]) => {
  const seen = new Set<string>()
  return values.filter((source) => {
    const key = sourceKey(source)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// Renders recorded business/data text (result feedback, warnings, limits, staleReason) as-is.
// These are real user/recruiter content, not error codes, so they must NOT pass through the
// error-code sanitizer (toFriendlyMessage), which would drop any non-Chinese Latin text — e.g.
// an English recruiter reply — to the fallback and violate this page's "replay only recorded
// content, never fabricate" contract. We only coerce to string and fall back when truly empty.
const displayBoundaryText = (value: unknown, fallback: string) => {
  if (value === null || value === undefined) return fallback
  const text = typeof value === 'string' ? value : String(value)
  return text.trim() ? text : fallback
}

function coverageToLines(value: unknown): string[] {
  const labels: Record<string, string> = {
    included: '已包含',
    unavailable: '暂不可用',
    failed: '读取失败',
    missing: '缺失',
    missingSections: '缺失部分',
    warnings: '覆盖提醒'
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof value === 'string') return value.trim() ? [value.trim()] : []
  if (!value || typeof value !== 'object') return []
  return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) => {
    const label = labels[key] || '其他覆盖信息'
    const values = Array.isArray(entry) ? entry : [entry]
    return values
      .map((item) => String(item ?? '').trim())
      .filter(Boolean)
      .map((item) => `${label}：${item}`)
  })
}

const usageKey = (usage: CareerEvidenceUsageVO) =>
  usage.id !== undefined
    ? `usage-${usage.id}`
    : `usage-${usage.assetType || 'unknown'}-${usage.assetId ?? 'unknown'}`

const resultKey = (result: CareerEvidenceUsageResultVO) =>
  result.id !== undefined
    ? `result-${result.id}`
    : `result-${result.usageId ?? 'unknown'}-${result.outcomeCode || 'unknown'}`

const candidateKey = (candidate: EvidenceLearningCandidateVO) =>
  candidate.id !== undefined
    ? `candidate-${candidate.id}`
    : `candidate-${candidate.semanticKey || candidate.title || 'unknown'}`

const openResultDialog = (usage: CareerEvidenceUsageVO) => {
  resultTarget.value = usage
  correctionTarget.value = undefined
  resetResultForm()
  resultDialogVisible.value = true
}

const openCorrectionDialog = (result: CareerEvidenceUsageResultVO) => {
  if (!canCorrectResult(result)) return
  correctionTarget.value = result
  resultTarget.value = result.usage
  resultForm.eventType = result.eventType || 'APPLICATION_EVENT'
  resultForm.eventId = result.eventId === undefined ? '' : String(result.eventId)
  resultForm.outcomeCode = outcomeCodes.has(result.outcomeCode as EvidenceUsageOutcomeWriteCode)
    ? result.outcomeCode as EvidenceUsageOutcomeWriteCode
    : 'UNKNOWN'
  resultForm.knownFacts = (result.knownFacts || []).join('\n')
  resultForm.externalFeedbackText = result.externalFeedbackText || ''
  resultForm.userInterpretationText = result.userInterpretationText || ''
  resultForm.unknowns = (result.unknowns || []).join('\n')
  resultForm.limits = (result.limits || []).join('\n')
  resultDialogVisible.value = true
}

const resetResultForm = () => {
  resultForm.eventType = 'APPLICATION_EVENT'
  resultForm.eventId = ''
  resultForm.outcomeCode = 'UNKNOWN'
  resultForm.knownFacts = ''
  resultForm.externalFeedbackText = ''
  resultForm.userInterpretationText = ''
  resultForm.unknowns = ''
  resultForm.limits = ''
}

const closeResultDialog = () => {
  if (resultSaving.value) return
  resetResultDialog()
}

const splitLines = (value: string) =>
  value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)

const submitResult = async () => {
  if (resultSaving.value) return
  if (correctionTarget.value && correctionTarget.value.id === undefined) return
  if (correctionTarget.value && !canCorrectResult(correctionTarget.value)) return
  if (!correctionTarget.value && (!resultTarget.value || resultTarget.value.id === undefined)) return
  const eventId = Number(resultForm.eventId)
  if (!correctionTarget.value && !resultForm.eventType.trim()) {
    ElMessage.warning('请选择结果来源事件类型。')
    return
  }
  if (!correctionTarget.value && (!Number.isSafeInteger(eventId) || eventId <= 0)) {
    ElMessage.warning('请输入有效的来源事件 ID。')
    return
  }
  const expectedLockVersion = correctionTarget.value?.lockVersion
  if (
    correctionTarget.value &&
    (expectedLockVersion === undefined ||
      !Number.isSafeInteger(expectedLockVersion) ||
      expectedLockVersion < 0)
  ) {
    ElMessage.warning('结果锁版本待返回，暂不能提交更正。')
    return
  }
  const requestPayload = {
    eventType: resultForm.eventType,
    eventId: correctionTarget.value ? undefined : eventId,
    outcomeCode: resultForm.outcomeCode,
    knownFacts: splitLines(resultForm.knownFacts),
    externalFeedbackText: resultForm.externalFeedbackText.trim(),
    userInterpretationText: resultForm.userInterpretationText.trim(),
    unknowns: splitLines(resultForm.unknowns),
    limits: splitLines(resultForm.limits)
  }
  const idempotencyKey = createStableOperationIdempotencyKey(
    correctionTarget.value
      ? `evidence-result-correct:${correctionTarget.value.id}`
      : `evidence-result-create:${resultTarget.value?.id || 'unknown'}`,
    requestPayload
  )
  const isCorrection = Boolean(correctionTarget.value)
  resultSaving.value = true
  try {
    if (correctionTarget.value && correctionTarget.value.id !== undefined) {
      await correctEvidenceUsageResultApi(correctionTarget.value.id, {
        expectedLockVersion: expectedLockVersion as number,
        outcomeCode: resultForm.outcomeCode,
        knownFacts: requestPayload.knownFacts,
        externalFeedbackText: requestPayload.externalFeedbackText,
        userInterpretationText: requestPayload.userInterpretationText,
        unknowns: requestPayload.unknowns,
        limits: requestPayload.limits,
        reason: '用户更正结果反馈',
        idempotencyKey
      })
    } else if (resultTarget.value && resultTarget.value.id !== undefined) {
      await createEvidenceUsageResultApi(resultTarget.value.id, {
        eventType: resultForm.eventType,
        eventId,
        outcomeCode: resultForm.outcomeCode,
        knownFacts: requestPayload.knownFacts,
        externalFeedbackText: requestPayload.externalFeedbackText || undefined,
        userInterpretationText: requestPayload.userInterpretationText || undefined,
        unknowns: requestPayload.unknowns,
        limits: requestPayload.limits,
        idempotencyKey
      })
    } else {
      return
    }
    ElMessage.success(isCorrection ? '结果更正已保存。' : '结果反馈已记录。')
    resetResultDialog()
    if (!await loadOverview() || accessUnavailable.value) return
    if (!await loadUsages() || accessUnavailable.value) return
    await loadResults()
  } catch (error) {
    handleAccessUnavailable(error)
    ElMessage.error(getErrorMessage(error, '结果反馈未保存，请检查来源和版本后重试。'))
  } finally {
    resultSaving.value = false
  }
}

const canConfirmResult = (result: CareerEvidenceUsageResultVO) =>
  result.id !== undefined &&
  ['RECORDED', 'CORRECTED'].includes(String(result.status || '').toUpperCase())

const canCorrectResult = (result: CareerEvidenceUsageResultVO) =>
  result.id !== undefined &&
  ['RECORDED', 'CONFIRMED', 'CORRECTED'].includes(String(result.status || '').toUpperCase())

const confirmResult = async (result: CareerEvidenceUsageResultVO) => {
  if (!canConfirmResult(result) || result.id === undefined || confirmingResultId.value) return
  if (
    result.lockVersion === undefined ||
    !Number.isSafeInteger(result.lockVersion) ||
    result.lockVersion < 0
  ) {
    ElMessage.warning('结果锁版本待返回，暂不能确认。')
    return
  }
  try {
    await ElMessageBox.confirm(
      '确认后仍会保留结果来源和限制；这不会改变投递、面试或 Offer 状态。',
      '确认结果反馈',
      { type: 'warning', confirmButtonText: '确认', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  confirmingResultId.value = result.id
  try {
    await confirmEvidenceUsageResultApi(result.id, {
      expectedLockVersion: result.lockVersion,
      idempotencyKey: createStableOperationIdempotencyKey(
        `evidence-result-confirm:${result.id}`,
        result.lockVersion
      )
    })
    ElMessage.success('结果反馈已确认。')
    await loadResults()
  } catch (error) {
    handleAccessUnavailable(error)
    ElMessage.error(getErrorMessage(error, '结果反馈确认失败，当前记录未改变。'))
  } finally {
    confirmingResultId.value = undefined
  }
}

const candidateCanDecide = (candidate: EvidenceLearningCandidateVO) =>
  ['PENDING', 'PENDING_CONFIRMATION', 'WEAK_OBSERVATION'].includes(
    String(candidate.status || '').toUpperCase()
  ) &&
  candidate.requiresUserConfirmation === true &&
  candidate.confirmed !== true &&
  Boolean(candidate.availableDecisions?.length)

const candidateActionStateLabel = (candidate: EvidenceLearningCandidateVO) => {
  const status = String(candidate.status || '').toUpperCase()
  if (['CONFIRMED', 'CONFIRMED_BY_USER', 'REJECTED', 'EXPIRED'].includes(status)) return '已处理'
  if (!['PENDING', 'PENDING_CONFIRMATION', 'WEAK_OBSERVATION'].includes(status)) return '状态待确认'
  if (candidate.requiresUserConfirmation !== true) return '确认能力待确认'
  if (!candidate.availableDecisions?.length) return '操作能力待确认'
  return '当前不可操作'
}

const candidateDecisionDescription = computed(() => ({
  KEEP: '保留当前证据使用方式，并生成未确认、未启用的记忆草稿供后续预览。',
  EDIT: '保存修改后的候选内容；如服务端返回编辑入口，将回到已有资产页面继续完善。',
  CONTINUE: '继续收集可比较样本，不生成强结论，也不修改现有计划。',
  REJECT: '停止使用当前观察；不会删除原始证据、使用记录或结果反馈。'
}[candidateDecision.value]))

const openCandidateDecision = (
  candidate: EvidenceLearningCandidateVO,
  decision: EvidenceLearningDecisionCode
) => {
  if (!candidateCanDecide(candidate) || !candidate.availableDecisions?.includes(decision)) return
  candidateTarget.value = candidate
  candidateDecision.value = decision
  candidateNote.value = ''
  candidateDialogVisible.value = true
}

const closeCandidateDialog = () => {
  if (candidateSaving.value) return
  resetCandidateDialog()
}

const submitCandidateDecision = async () => {
  if (!candidateTarget.value || candidateTarget.value.id === undefined || candidateSaving.value) return
  if (
    !candidateCanDecide(candidateTarget.value) ||
    !candidateTarget.value.availableDecisions?.includes(candidateDecision.value)
  ) return
  const note = candidateNote.value.trim()
  if (candidateDecision.value === 'EDIT' && !note) {
    ElMessage.warning('请填写修改后的候选内容或明确修改说明。')
    return
  }
  const candidateId = candidateTarget.value.id
  const decision = candidateDecision.value
  candidateSaving.value = true
  try {
    const decidedCandidate = await decideEvidenceLearningCandidateApi(candidateId, {
      decisionCode: decision,
      editedContent: decision === 'EDIT' ? note : undefined,
      idempotencyKey: createStableOperationIdempotencyKey(
        `evidence-learning:${candidateId}:${decision}`,
        note
      )
    })
    const editPath = decision === 'EDIT' ? decidedCandidate.editPath : undefined
    ElMessage.success(`候选已${decisionLabel(decision)}；不会自动启用长期记忆或修改计划。`)
    resetCandidateDialog()
    await loadCandidates()
    if (editPath) goSafe(editPath)
  } catch (error) {
    handleAccessUnavailable(error)
    ElMessage.error(getErrorMessage(error, '候选决策未保存，当前候选仍保持原状态。'))
  } finally {
    candidateSaving.value = false
  }
}

watch(
  () => route.query.tab,
  async () => {
    activeSection.value = sectionFromQuery()
    await nextTick()
    document.getElementById(activeSection.value)?.scrollIntoView?.({ behavior: 'auto', block: 'start' })
  }
)

watch(
  () => JSON.stringify({
    overview: overviewQuery(),
    usages: usagesQuery(),
    results: resultsQuery(),
    candidates: candidatesQuery(),
    candidateId: queryNumber('candidateId'),
    mode: queryString('mode')
  }),
  (value, previousValue) => {
    if (value !== previousValue) void load()
  }
)

onMounted(async () => {
  await load()
  await nextTick()
  if (activeSection.value !== 'readiness') {
    document.getElementById(activeSection.value)?.scrollIntoView?.({ behavior: 'auto', block: 'start' })
  }
})
</script>

<style scoped lang="scss">
.evidence-assets {
  display: grid;
  gap: 14px;
  min-width: 0;
  color: var(--user-text);
}

.evidence-hero,
.trust-strip,
.section-heading,
.usage-item,
.result-item__head,
.result-item__foot,
.candidate-item,
.readiness-item__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.evidence-hero {
  padding: 20px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);
}

.evidence-hero__copy {
  min-width: 0;
  max-width: 820px;

  h1 {
    margin: 6px 0 0;
    font-size: 30px;
    line-height: 1.2;
  }

  p:last-child {
    margin: 10px 0 0;
    color: var(--user-text-muted);
    line-height: 1.7;
  }
}

.evidence-hero__actions,
.heading-actions,
.trust-strip__tags,
.result-item__tags,
.result-item__actions,
.candidate-item__tags,
.candidate-item__actions,
.usage-item__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.eyebrow,
.section-kicker {
  margin: 0;
  color: var(--user-primary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
}

.trust-strip {
  align-items: center;
  padding: 12px 16px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-control-bg);
}

.trust-strip__summary {
  display: grid;
  gap: 4px;
  min-width: 0;

  strong {
    font-size: 13px;
  }

  span:last-child {
    overflow: hidden;
    color: var(--user-text-muted);
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.boundary-alert {
  margin: 0;
}

.boundary-list,
.trace-grid ul,
.result-fact-grid ul,
.candidate-limits {
  margin: 6px 0 0;
  padding-left: 18px;
  line-height: 1.65;
}

.section-nav {
  position: sticky;
  z-index: 2;
  top: 8px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  padding: 6px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--user-surface) 94%, transparent);
  backdrop-filter: blur(12px);

  button {
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 9px 10px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: var(--user-text-muted);
    text-align: left;
    cursor: pointer;

    &:hover,
    &.is-active {
      border-color: var(--user-primary);
      background: var(--user-primary-soft);
      color: var(--user-text);
    }

    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    small {
      color: var(--user-text-muted);
    }
  }
}

.evidence-section {
  scroll-margin-top: 90px;
  min-width: 0;
  padding: 18px 0;
  border-top: 1px solid var(--user-border);
  background: transparent;
}

.evidence-section--compact {
  background: transparent;
}

.section-heading {
  align-items: center;
  margin-bottom: 16px;

  h2 {
    margin: 4px 0 0;
    font-size: 20px;
  }

  p:last-child {
    margin: 6px 0 0;
    color: var(--user-text-muted);
    line-height: 1.6;
  }
}

.readiness-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.readiness-item,
.usage-item,
.result-item,
.candidate-item {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--user-border);
  border-radius: 6px;
  background: var(--user-control-bg);
}

.readiness-item {
  display: grid;
  gap: 12px;

  p {
    margin: 0;
    color: var(--user-text-muted);
    font-size: 12px;
    line-height: 1.6;
  }
}

.readiness-item__head {
  align-items: center;

  div {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  span {
    color: var(--user-text-muted);
    font-size: 12px;
  }
}

.readiness-facts,
.usage-facts,
.candidate-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
  gap: 8px;
  margin: 0;

  div {
    min-width: 0;
  }

  dt {
    color: var(--user-text-muted);
    font-size: 11px;
  }

  dd {
    margin: 3px 0 0;
    overflow: hidden;
    color: var(--user-text-secondary);
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.usage-list,
.result-list,
.candidate-list {
  display: grid;
  gap: 8px;
}

.usage-item {
  align-items: center;
}

.usage-item.is-stale {
  border-color: color-mix(in srgb, var(--cc-warning) 58%, var(--user-border));
}

.usage-item__main,
.candidate-item__main {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.usage-item__title,
.candidate-item__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.usage-item__main > p,
.candidate-item__main > p {
  margin: 0;
  color: var(--user-text-muted);
  font-size: 12px;
}

.usage-facts {
  grid-template-columns: repeat(4, minmax(80px, 1fr));
}

.inline-warning,
.decision-warning {
  margin: 0;
  color: var(--cc-warning);
  font-size: 12px;
  line-height: 1.6;
}

.source-ref-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  span {
    max-width: 100%;
    padding: 3px 6px;
    border: 1px solid var(--user-border);
    border-radius: 4px;
    color: var(--user-text-muted);
    font-size: 11px;
    overflow-wrap: anywhere;
  }
}

.source-ref-list--stack {
  display: grid;
  justify-items: start;
}

.result-item {
  display: grid;
  gap: 12px;
}

.result-item__head {
  align-items: center;

  div:first-child {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  span {
    color: var(--user-text-muted);
    font-size: 12px;
  }
}

.result-fact-grid,
.trace-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;

  > div {
    min-width: 0;
    padding: 10px;
  }

  h3 {
    margin: 0;
    font-size: 13px;
  }

  p {
    margin: 6px 0 0;
    color: var(--user-text-muted);
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
  }
}

.result-fact-grid > div {
  padding-inline: 0;
  border-top: 1px solid var(--user-border);
}

.trace-grid > div {
  border: 1px solid var(--user-border);
  border-radius: 6px;
  background: var(--user-surface);
}

.result-item__foot {
  align-items: center;
}

.candidate-item {
  align-items: center;
}

.candidate-item__head {
  justify-content: space-between;

  > div:first-child {
    display: grid;
    gap: 4px;
  }

  span {
    color: var(--user-text-muted);
    font-size: 12px;
  }
}

.candidate-content {
  white-space: pre-wrap;
}

.candidate-facts {
  grid-template-columns: repeat(4, minmax(80px, 1fr));
}

.trace-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.dialog-context,
.candidate-preview {
  display: grid;
  gap: 5px;
  margin-bottom: 14px;
  padding: 10px 12px;
  border: 1px solid var(--user-border);
  border-radius: 6px;
  background: var(--user-control-bg);

  span,
  small,
  p {
    color: var(--user-text-muted);
    font-size: 12px;
    line-height: 1.6;
  }

  p {
    margin: 0;
    white-space: pre-wrap;
  }
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  label {
    display: grid;
    gap: 6px;
    min-width: 0;
    color: var(--user-text-secondary);
    font-size: 13px;
  }
}

.form-grid__wide {
  grid-column: 1 / -1;
  display: grid;
  gap: 6px;
  margin-top: 12px;
  color: var(--user-text-secondary);
  font-size: 13px;
}

.full-control {
  width: 100%;
}

@media (max-width: 980px) {
  .readiness-grid,
  .result-fact-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .trace-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .evidence-hero,
  .trust-strip,
  .section-heading,
  .usage-item,
  .result-item__head,
  .result-item__foot,
  .candidate-item {
    flex-direction: column;
    align-items: stretch;
  }

  .evidence-hero__actions,
  .usage-item__actions,
  .candidate-item__actions {
    justify-content: flex-start;
  }

  .evidence-hero__copy h1 {
    font-size: 24px;
  }

  .section-nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .readiness-grid,
  .result-fact-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-grid__wide {
    grid-column: auto;
  }

  .readiness-facts,
  .usage-facts,
  .candidate-facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
