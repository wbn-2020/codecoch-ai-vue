<template>
  <div class="arena arena-report interview-report page-shell">
    <section class="report-top report-top--compact">
      <div>
        <div class="eyebrow">
          <ChartNoAxesCombined :size="16" />
          面试复盘
        </div>
        <h1>结构化 AI 面试报告</h1>
        <p>看清这轮面试哪里说得好、哪里要补强、下一步该练什么。</p>
      </div>
      <div class="report-actions">
        <el-dropdown
          :disabled="!interviewId || !isGenerated || exporting"
          @command="handleExportReport"
        >
          <el-button :loading="exporting" :disabled="!interviewId || !isGenerated">
            <Download :size="16" />
            导出
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="markdown">Markdown</el-dropdown-item>
              <el-dropdown-item command="json">JSON</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button @click="handleStaticTodayAction()">
          <LayoutDashboard :size="16" />
          今日计划
        </el-button>
        <el-button @click="router.push('/interviews/history')">
          <History :size="16" />
          返回历史
        </el-button>
        <el-button
          v-if="interviewId && isGenerated"
          type="primary"
          :loading="remediationLoading"
          :disabled="!advancedReportMeta.remediationAvailable"
          :title="remediationButtonTitle"
          @click="handleCreateRemediation"
        >
          <RotateCcw :size="16" />
          {{ advancedReportMeta.strongRemediationAvailable ? '强化复练' : '一键复练' }}
        </el-button>
        <el-button
          v-if="interviewId && isGenerated"
          :loading="replayLoading"
          :disabled="replayLoading || !replayAvailable"
          :title="replayButtonTitle"
          @click="handleCreateReplay"
        >
          <Repeat2 :size="16" />
          同配置再练
        </el-button>
        <el-button v-else-if="interviewId" @click="handleStaticInterviewAction()">
          <RotateCcw :size="16" />
          新建面试
        </el-button>
      </div>
    </section>

    <section v-if="isGenerating" class="content-card">
      <div class="content-card__body generating-panel">
        <div class="state-eyebrow">报告生成中</div>
        <el-icon class="generating-icon"><Loading /></el-icon>
        <h2>报告生成中</h2>
        <p>{{ generatingMessage }}</p>
        <el-alert
          v-if="reportRecoveryNotice"
          class="report-recovery-alert"
          type="warning"
          show-icon
          :closable="false"
          title="报告读取暂时不可用"
          :description="reportRecoveryNotice"
        />
        <el-progress :percentage="pollProgress" :show-text="false" />
        <div class="task-stage-list">
          <article v-for="item in generatingStages" :key="item.key" class="task-stage-item">
            <span>{{ item.label }}</span>
            <strong>{{ item.title }}</strong>
            <p>{{ item.desc }}</p>
          </article>
        </div>
        <div v-if="taskMetaText" class="task-meta">{{ taskMetaText }}</div>
        <div class="async-diagnostics">
          <span v-if="asyncReceipt.messageId">报告正在准备</span>
          <span v-if="asyncReceipt.traceId">进度已记录</span>
          <span>面试记录已绑定</span>
          <span v-if="asyncReceipt.sendStatus">生成进度 {{ asyncSendStatusLabel(asyncReceipt.sendStatus) }}</span>
        </div>
        <div class="generating-actions">
          <el-button type="primary" @click="goReportTaskCenter">
            <ListChecks :size="16" />
            查看准备进度
          </el-button>
          <el-button @click="router.push('/interviews/history')">
            <History :size="16" />
            稍后回来
          </el-button>
        </div>
      </div>
    </section>

    <section v-else class="content-card" v-loading="loading">
      <div v-if="report && isGenerated" class="content-card__body">
        <div class="settle-banner">
          <div class="settle-banner__left">
            <span class="settle-banner__emoji">🏆</span>
            <div>
              <div class="settle-banner__kicker">副本通关 · 结算</div>
              <b class="settle-banner__score">{{ displayTotalScore }}<small> 分</small></b>
            </div>
          </div>
          <div class="settle-banner__xp">
            <div class="settle-banner__xp-row">
              <span>通关奖励（已入账）</span>
              <b>+{{ completionRewardXp }} XP</b>
            </div>
            <div class="settle-banner__xp-row">
              <span>答题奖励（已入账 {{ answerRewardCount }} 题）</span>
              <b>+{{ answerRewardXp }} XP</b>
            </div>
            <div class="settle-banner__xp-row is-total">
              <span>本场合计</span>
              <b>+{{ sessionRewardXp }} XP</b>
            </div>
          </div>
          <div v-if="improveTop3.length" class="settle-banner__improve">
            <span>三点改进</span>
            <ol>
              <li v-for="item in improveTop3" :key="item">{{ item }}</li>
            </ol>
          </div>
        </div>

        <div class="report-hero-grid">
          <section class="report-score-panel" :class="{ 'report-score-panel--muted': isScoreUnavailable }">
            <span class="panel-kicker">综合得分</span>
            <div class="score-value">{{ displayTotalScore }}</div>
            <p v-if="isScoreUnavailable">本轮没有可信评分，保留问答复盘，不强行给分。</p>
            <p v-else>{{ scoreVerdict }}</p>
            <div class="score-meta">
              <StatusTag :status="report.reportStatus" />
              <span>{{ qaMessages.length ? `基于 ${qaMessages.length} 条问答` : '问答样本不足' }}</span>
            </div>
          </section>

          <section class="report-summary-panel">
            <span class="panel-kicker">一句话总评</span>
            <h2>{{ reportSummaryPreview.title }}</h2>
            <p>{{ reportSummaryPreview.description }}</p>
            <div class="evidence-strip">
              <strong>证据摘要</strong>
              <span>{{ evidenceSummaryPreview }}</span>
            </div>
          </section>

          <section class="report-action-panel">
            <span class="panel-kicker">最大短板</span>
            <h2>{{ mainWeaknessPreview.title }}</h2>
            <p>{{ mainWeaknessPreview.description }}</p>
            <div class="primary-next-action">
              <span>下一步主行动</span>
              <strong>{{ primaryNextAction.title }}</strong>
              <small>{{ primaryNextActionMeta }}</small>
              <el-button
                type="primary"
                :disabled="!canUsePrimaryNextAction"
                :loading="primaryNextAction.actionType === 'STUDY_PLAN' && studyPlanGenerating"
                @click="handlePrimaryNextAction"
              >
                {{ nextActionButtonLabel(primaryNextAction.actionType) }}
                <ArrowRight :size="16" />
              </el-button>
            </div>
          </section>
        </div>

        <div class="report-support-strip">
          <span>{{ report.generatedAt || report.createdAt || '生成时间待确认' }}</span>
          <span>{{ report.reportId || report.id ? `报告 #${report.reportId || report.id}` : '报告记录待确认' }}</span>
          <span>{{ recommendedQuestionIds.length ? `${recommendedQuestionIds.length} 道推荐题可练习` : '推荐题待确认' }}</span>
        </div>

        <div class="report-professional-strip">
          <article v-for="item in reportReviewCriteria" :key="item.label">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <small>{{ item.desc }}</small>
          </article>
        </div>

        <div class="overview-grid">
          <div class="overview-card">
            <span>报告状态</span>
            <strong>{{ isScoreUnavailable ? '评分待确认' : '已生成复盘' }}</strong>
          </div>
          <div class="overview-card">
            <span>面试记录</span>
            <strong>{{ report.interviewId || interviewId }}</strong>
          </div>
          <div class="overview-card">
            <span>生成时间</span>
            <strong>{{ report.generatedAt || report.createdAt || '-' }}</strong>
          </div>
          <div class="overview-card">
            <span>题目明细</span>
            <strong>{{ qaMessages.length }} 条</strong>
          </div>
        </div>

        <el-alert
          v-if="isScoreUnavailable"
          class="score-source"
          type="warning"
          show-icon
          :closable="false"
          title="评分暂未生成"
          description="本次报告没有拿到可信评分，已保留面试问答。你可以重新生成报告。"
        />

        <el-alert
          v-else
          class="score-source"
          type="info"
          show-icon
          :closable="false"
          title="综合得分已生成。"
        />

        <div class="report-trust-strip">
          <el-tag v-for="tag in reportTrustTags" :key="tag.label" :type="tag.type" effect="plain">
            {{ tag.label }}
          </el-tag>
        </div>

        <el-alert
          v-if="remediationGuidance"
          class="remediation-guidance"
          :type="advancedReportMeta.strongRemediationAvailable ? 'success' : 'warning'"
          show-icon
          :closable="false"
          title="复练强度说明"
          :description="remediationGuidance"
        />

        <InterviewVoiceTraceSection :voice-traces="report.voiceTraces" />

        <section class="voice-delivery-report">
          <div class="section-head">
            <div>
              <h2>语音表达指标</h2>
              <p>仅展示可观测的语速、填充词和停顿，不推断情绪、性格或心理状态。</p>
            </div>
            <el-tag :type="voiceDeliverySummary?.available ? 'success' : 'info'" effect="plain">
              {{ voiceDeliveryStatusLabel }}
            </el-tag>
          </div>

          <div v-if="voiceDeliveryFacts.length" class="voice-delivery-facts">
            <article v-for="fact in voiceDeliveryFacts" :key="fact.key">
              <span>{{ fact.label }}</span>
              <strong>{{ fact.value }}</strong>
              <p v-if="fact.hint">{{ fact.hint }}</p>
            </article>
          </div>
          <el-alert
            v-if="!voiceDeliveryFacts.length || !voiceDeliverySummary?.pauseMetricsAvailable"
            type="info"
            show-icon
            :closable="false"
            :title="voiceDeliveryMissingTitle"
            :description="voiceDeliveryMissingDescription"
          />
        </section>

        <div class="report-feedback-row">
          <AiResultFeedback
            scene="INTERVIEW_REPORT"
            biz-type="INTERVIEW_REPORT"
            :biz-id="report.reportId || report.id"
            label="反馈报告问题"
            compact
          />
        </div>

        <div v-if="hasJdAlignment" class="target-job-alignment">
          <div class="section-head">
            <h2>目标岗位对齐</h2>
            <p>把本轮面试结果连接回 JD、能力画像和匹配报告，优先修补岗位要求里的短板。</p>
          </div>
          <div class="alignment-card-grid">
            <article v-for="card in jdAlignmentCards" :key="card.label" class="alignment-card">
              <span>{{ card.label }}</span>
              <strong>{{ card.value }}</strong>
              <el-tag size="small" :type="card.type" effect="plain">{{ card.hint }}</el-tag>
            </article>
          </div>
          <div v-if="missingSkillRows.length" class="missing-skill-list">
            <article v-for="skill in missingSkillRows" :key="skill.id || skill.skillName" class="missing-skill-item">
              <header>
                <strong>{{ skill.skillName }}</strong>
                <el-tag size="small" :type="severityTagType(skill.severity)" effect="plain">{{ skill.severity || '待评估' }}</el-tag>
              </header>
                    <p>{{ skill.gapDescription || '这项能力与目标岗位要求存在差距，建议回到能力画像补充证据。' }}</p>
              <ul v-if="skill.recommendedActions?.length">
                <li v-for="action in skill.recommendedActions.slice(0, 2)" :key="action">{{ action }}</li>
              </ul>
            </article>
          </div>
          <div class="alignment-actions">
            <el-button :disabled="!report.targetJobId" @click="goTargetJobAnalysis">
              <Target :size="16" />
              查看岗位分析
            </el-button>
            <el-button :disabled="!report.skillProfileId && !report.targetJobId && !report.matchReportId" @click="goSkillProfile">
              <Radar :size="16" />
              查看能力画像
            </el-button>
            <el-button type="primary" @click="goJdGapPractice">
              <ArrowRight :size="16" />
              练 JD 短板题
            </el-button>
          </div>
        </div>

        <div v-if="nextActions.length" class="next-action-section">
          <div class="section-head">
            <h2>闭环行动</h2>
            <p>把这份报告接到下一轮训练，按优先级继续推进。</p>
          </div>
          <div class="next-action-grid">
            <article
              v-for="action in nextActions"
              :key="`${action.actionType}-${action.priority}`"
              class="next-action-card"
            >
              <div class="next-action-card__main">
                <span>{{ nextActionTypeLabel(action.actionType) }}</span>
                <strong>{{ action.title }}</strong>
                <p>{{ action.description || action.evidence || '继续完成下一步训练。' }}</p>
                <small v-if="action.evidence">{{ action.evidence }}</small>
                <small v-if="action.confidenceBoundary">{{ action.confidenceBoundary }}</small>
                <small v-if="action.fallbackReason">{{ action.fallbackReason }}</small>
              </div>
              <el-button
                type="primary"
                plain
                :loading="action.actionType === 'STUDY_PLAN' && studyPlanGenerating"
                @click="handleNextAction(action)"
              >
                {{ nextActionButtonLabel(action.actionType) }}
              </el-button>
            </article>
          </div>
        </div>
        <div v-else-if="nextActionUnavailableReason" class="next-action-empty">
          <strong>暂未生成结构化闭环行动</strong>
          <p>{{ nextActionUnavailableReason }}</p>
        </div>

        <div v-if="knowledgeCandidates.length" class="knowledge-candidate-section">
          <div class="section-head">
            <h2>知识候选入口</h2>
            <p>这些内容只作为候选资产，需要你确认后再整理；不会自动入库，也不会进入长期记忆。</p>
          </div>
          <div class="knowledge-candidate-grid">
            <article v-for="candidate in knowledgeCandidates" :key="candidate.id" class="knowledge-candidate-card">
              <div>
                <span>{{ knowledgeCandidateSourceLabel(candidate.sourceField) }}</span>
                <strong>{{ candidate.title }}</strong>
                <p>{{ candidate.evidence || candidate.content || candidate.boundary }}</p>
                <small>{{ candidate.boundary }}</small>
              </div>
              <el-button plain @click="openKnowledgeCandidate(candidate)">确认候选</el-button>
            </article>
          </div>
        </div>

        <div class="coach-next">
          <div class="section-head">
            <h2>下一轮训练建议</h2>
            <p>把报告里的短板转成可执行动作，而不是只看一个分数。</p>
          </div>
          <div class="next-grid">
            <article v-for="item in coachNextSteps" :key="item.title">
              <span>{{ item.kicker }}</span>
              <strong>{{ item.title }}</strong>
              <p>{{ item.desc }}</p>
            </article>
          </div>
        </div>

        <div class="dimension-section">
          <div class="section-head">
            <h2>评分维度</h2>
            <p>按面试阶段展示能力表现，暂未拆分时保持空状态。</p>
          </div>
          <ReportChart v-if="stageReports.length" :stages="stageReports" />
          <AppState
            v-else
            type="empty"
            title="暂未拆分维度评分"
            description="本次报告可能只返回了总评，或问答样本不足以拆分阶段得分。建议结合问答明细和短板建议继续复盘。"
          >
            <el-button type="primary" plain @click="router.push('/interviews/history')">查看面试历史</el-button>
          </AppState>
        </div>
      </div>

      <div v-else-if="isFailed || isUnscorable" class="content-card__body failed-panel">
        <div class="state-eyebrow">{{ isUnscorable ? '不可评分' : '生成失败' }}</div>
        <h2>{{ isUnscorable ? '本轮样本不足，暂不展示强结论' : '报告生成没有完成' }}</h2>
        <p class="failed-panel__lead">
          {{ isUnscorable ? '问答明细仍可继续复盘；页面不会补写分数、短板或推荐题。' : '可以重新生成报告，或先返回历史记录保留本轮面试证据。' }}
        </p>
        <el-alert
          :type="isUnscorable ? 'warning' : 'error'"
          show-icon
          :closable="false"
          :title="isUnscorable ? '报告暂不可评分' : '报告生成失败'"
          :description="failureReason"
        />
        <div class="retry-row">
          <el-button type="primary" :loading="retrying" @click="handleRetry">重新生成报告</el-button>
          <el-button @click="router.push('/interviews/history')">返回历史</el-button>
        </div>
      </div>

      <AppState
        v-else-if="!loading"
        type="empty"
        title="还没有可验证的面试报告"
        description="页面没有拿到可展示的复盘结果，因此不会补写分数、短板或推荐题。若本轮面试已结束，可以手动重新生成报告；如果还没完成答题，请先回到历史记录继续面试。"
      >
        <el-button v-if="interviewId" type="primary" :loading="retrying" @click="handleRetry">重新生成报告</el-button>
        <el-button @click="goReportTaskCenter">查看准备进度</el-button>
        <el-button @click="router.push('/interviews/history')">返回历史</el-button>
        <el-button plain @click="router.push('/questions/recommendations')">先练今日题组</el-button>
      </AppState>
    </section>

    <section v-if="report && isGenerated" class="analysis-grid">
      <article class="analysis-card wide">
        <div class="section-head">
          <h2>AI 总结</h2>
          <p>整体评价与报告正文</p>
        </div>
        <MarkdownPreview v-if="report.reportContent || report.summary" :content="report.reportContent || report.summary" />
        <AppState v-else type="empty" title="总结暂未生成" :description="emptyReportCopy.summary">
          <el-button type="primary" plain :loading="retrying" @click="handleRetry">重新生成报告</el-button>
        </AppState>
      </article>

      <article class="analysis-card">
        <div class="section-head">
          <h2>表现亮点</h2>
        </div>
        <MarkdownPreview v-if="report.strengths" :content="report.strengths" />
        <AppState v-else type="empty" title="亮点暂未提取" :description="emptyReportCopy.strengths">
          <el-button plain @click="router.push('/interviews/create')">重新面试</el-button>
        </AppState>
      </article>

      <article class="analysis-card">
        <div class="section-head">
          <h2>明显短板</h2>
        </div>
        <MarkdownPreview v-if="report.mainProblems || report.weaknesses" :content="report.mainProblems || report.weaknesses" />
        <AppState v-else type="empty" title="短板暂未提取" :description="emptyReportCopy.weaknesses">
          <el-button type="primary" plain :loading="studyPlanGenerating" @click="handleGenerateStudyPlan">生成学习计划</el-button>
        </AppState>
      </article>

      <article class="analysis-card">
        <div class="section-head">
          <h2>建议提升方向</h2>
        </div>
        <MarkdownPreview v-if="report.reviewSuggestions || report.suggestions" :content="report.reviewSuggestions || report.suggestions" />
        <AppState v-else type="empty" title="提升建议暂未生成" :description="emptyReportCopy.suggestions">
          <el-button type="primary" plain :loading="retrying" @click="handleRetry">重新生成报告</el-button>
        </AppState>
      </article>

      <article class="analysis-card">
        <div class="section-head">
          <h2>薄弱知识点</h2>
        </div>
        <MarkdownPreview v-if="weakPointText" :content="weakPointText" />
        <AppState v-else type="empty" title="暂未识别薄弱知识点" :description="emptyReportCopy.weakPoints">
          <el-button type="primary" plain :disabled="!recommendedQuestionIds.length" @click="goPracticeQuestion">练推荐题</el-button>
        </AppState>
      </article>

      <article class="analysis-card">
        <div class="section-head">
          <h2>项目表达问题</h2>
        </div>
        <MarkdownPreview
          v-if="report.projectProblems || report.projectExpressionProblems"
          :content="report.projectProblems || report.projectExpressionProblems"
        />
        <AppState v-else type="empty" title="项目表达问题暂未提取" :description="emptyReportCopy.project">
          <el-button plain @click="router.push('/project-evidence')">整理项目证据</el-button>
        </AppState>
      </article>

      <article class="analysis-card">
        <div class="section-head">
          <h2>简历修改建议</h2>
        </div>
        <MarkdownPreview v-if="report.resumeSuggestions || report.resumeAdvice" :content="report.resumeSuggestions || report.resumeAdvice" />
        <AppState v-else type="empty" title="简历建议暂未生成" :description="emptyReportCopy.resume">
          <el-button plain @click="router.push('/resumes')">查看简历与岗位</el-button>
        </AppState>
      </article>

      <article class="analysis-card">
        <div class="section-head">
          <h2>推荐练习题目</h2>
        </div>
        <div v-if="recommendedQuestionIds.length" class="recommended-training-callout">
          <div>
            <span>下一步训练入口</span>
            <strong>先重练报告暴露的薄弱题</strong>
            <p>完成题库点评后，再回到模拟面试验证表达是否稳定。</p>
          </div>
          <el-button type="primary" @click="goPracticeQuestion">
            <BookOpenCheck :size="16" />
            练这 {{ recommendedQuestionIds.length }} 题
          </el-button>
        </div>
        <div v-if="recommendedQuestions.length" class="recommended-list">
          <button
            v-for="(item, index) in recommendedQuestions"
            :key="item.questionId || `${item.title}-${index}`"
            class="recommended-item"
            :class="{ 'recommended-item--disabled': !item.questionId }"
            type="button"
            @click="openRecommendedQuestion(item)"
          >
            <div>
              <strong>{{ item.title || item.questionTitle || '推荐题目' }}</strong>
              <span v-if="item.reason || item.recommendReason">{{ item.reason || item.recommendReason }}</span>
            </div>
            <el-tag size="small" type="info" effect="plain">来自面试报告</el-tag>
            <el-tag v-if="item.questionId" size="small" type="success" effect="plain">可练习</el-tag>
            <el-tag v-else size="small" type="warning" effect="plain">仅建议</el-tag>
            <el-tag v-if="item.difficulty" size="small" effect="plain">{{ difficultyLabel(item.difficulty) }}</el-tag>
          </button>
        </div>
        <AppState v-else type="empty" title="暂未生成推荐题目" :description="emptyReportCopy.questions">
          <el-button type="primary" plain @click="router.push('/questions/recommendations')">进入今日训练题组</el-button>
        </AppState>
      </article>
    </section>

    <section v-if="stageReports.length && isGenerated" class="content-card">
      <div class="content-card__body">
        <div class="section-head">
          <h2>阶段得分</h2>
          <p>阶段名称、类型、得分、总结、短板与建议会在报告生成后展示。</p>
        </div>
        <div class="stage-report-list">
          <article v-for="(stage, index) in stageReports" :key="stage.stageId || index" class="stage-report-card">
            <header>
              <div>
                <span>阶段 {{ index + 1 }}</span>
                <strong>{{ stage.stageName || '未命名阶段' }}</strong>
                <p>{{ stage.stageType || '未标注类型' }}</p>
              </div>
              <div class="stage-score-pill">
                <span>得分</span>
                <strong>{{ stage.score ?? '--' }}</strong>
              </div>
            </header>
            <div class="stage-report-content">
              <div class="stage-copy">
                <label>总结</label>
                <p>{{ stage.summary || '暂无阶段总结' }}</p>
              </div>
              <div class="stage-copy">
                <label>短板</label>
                <p>{{ stage.weaknesses || '暂无短板记录' }}</p>
              </div>
              <div class="stage-copy">
                <label>建议</label>
                <p>{{ stage.suggestions || '暂无改进建议' }}</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section v-if="qaMessages.length && (isGenerated || isFailed || isUnscorable)" class="content-card">
      <div class="content-card__body">
        <div class="section-head">
          <h2>{{ isGenerated ? '题目明细' : '已保留问答明细' }}</h2>
          <p>{{ isGenerated ? '展示问题、回答、AI 评分、点评、推荐方向和追问记录。' : '完整报告暂不可用，但本次面试的问题、回答、评分和追问仍可继续复盘。' }}</p>
        </div>
        <div class="qa-list">
          <article v-for="message in qaMessages" :key="message.messageId" class="qa-item">
            <div class="qa-head">
              <div>
                <strong>{{ message.questionContent ? '面试题' : message.role }}</strong>
                <el-tag v-if="message.isFollowUp" size="small" type="warning" effect="plain">追问</el-tag>
              </div>
              <span>{{ displayQuestionScore(message) }}</span>
            </div>
            <div class="qa-block">
              <label>问题</label>
              <MarkdownPreview :content="message.questionContent || message.content || '暂无问题内容'" />
            </div>
            <div v-if="message.userAnswer" class="qa-block">
              <label>用户回答</label>
              <p>{{ message.userAnswer }}</p>
            </div>
            <div v-if="message.aiComment" class="qa-block">
              <label>AI 点评</label>
              <MarkdownPreview :content="message.aiComment" />
            </div>
            <div v-if="message.followUpReason" class="qa-block">
              <label>追问记录</label>
              <p>{{ message.followUpReason }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section v-if="isGenerated" class="content-card">
      <div class="content-card__body action-zone">
        <div>
          <h2>下一步行动</h2>
          <p>报告已生成，可继续发起新面试、进入题库练习或生成学习计划。</p>
        </div>
        <div class="action-buttons">
          <el-button type="primary" @click="handleStaticInterviewAction(true)">
            <RotateCcw :size="16" />
            重新面试
          </el-button>
          <el-button :disabled="!recommendedQuestionIds.length" @click="handleStaticPracticeAction(true)">
            <BookOpenCheck :size="16" />
            重练薄弱题
          </el-button>
          <el-button type="success" plain :loading="studyPlanGenerating" @click="handleGenerateStudyPlan">
            <CalendarClock :size="16" />
            生成学习计划
          </el-button>
          <el-button @click="handleStaticTodayAction(true)">返回今日计划</el-button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Loading } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowRight, BookOpenCheck, CalendarClock, ChartNoAxesCombined, Download, History, LayoutDashboard, ListChecks, Radar, Repeat2, RotateCcw, Target } from 'lucide-vue-next'
import { getActivePinia } from 'pinia'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { LocationQueryRaw } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'

import {
  recordAgentMetricEventApi
} from '@/api/agent'
import {
  exportInterviewReportApi,
  getInterviewReportApi,
  retryInterviewReportApi,
  type InterviewReportExportFormat
} from '@/api/interview'
import {
  createInterviewRemediationApi,
  createInterviewReplayApi,
  getInterviewReplayOptionsApi
} from '@/api/interviewAdvanced'
import { getJobRequirementMatrixApi } from '@/api/jobRequirement'
import { generateStudyPlanApi } from '@/api/studyPlan'
import AppState from '@/components/common/AppState.vue'
import MarkdownPreview from '@/components/common/MarkdownPreview.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import AiResultFeedback from '@/components/feedback/AiResultFeedback.vue'
import InterviewVoiceTraceSection from '@/components/report/InterviewVoiceTraceSection.vue'
import ReportChart from '@/components/report/ReportChart.vue'
import { difficultyOptions } from '@/constants/enums'
import {
  extractRemediationRequirementIds,
  normalizeInterviewReportAdvanced
} from '@/features/interview-comparison'
import { buildInterviewReportKnowledgeCandidates } from '@/features/interview-report'
import { buildVoiceDeliveryFacts } from '@/features/interview-voice-product'
import { useGameProfileStore } from '@/features/game-profile'
import type {
  InterviewKnowledgeCandidateVO,
  InterviewMessageVO,
  InterviewReportNextActionVO,
  InterviewReportVO,
  RecommendedQuestionVO,
  StageReportVO
} from '@/types/interview'
import type { InterviewReplayEligibilityVO } from '@/types/interviewAdvanced'
import { toFriendlyMessage } from '@/utils/error'
import { createOperationIdempotencyKey } from '@/utils/idempotency'
import { getRouteNumberParam } from '@/utils/route'

const route = useRoute()
const router = useRouter()
const gameProfile = getActivePinia() ? useGameProfileStore() : null
const interviewId = computed(() => getRouteNumberParam(route.params.id as string) || undefined)
type RouterQueryValue = string | number | boolean | null | undefined
const loading = ref(false)
const retrying = ref(false)
const exporting = ref(false)
const remediationLoading = ref(false)
const remediationIdempotencyKey = ref('')
const remediationIdempotencyKeys = new Map<number, string>()
const replayLoading = ref(false)
const replayIdempotencyKey = ref('')
const replayIdempotencyKeys = new Map<number, string>()
const replayEligibility = ref<InterviewReplayEligibilityVO | null>(null)
const studyPlanGenerating = ref(false)
const report = ref<InterviewReportVO | null>(null)
const reportRecoveryNotice = ref('')
const nextActionShownMetricKey = ref('')
const staticActionShownMetricKey = ref('')
const pollCount = ref(0)
const pollFailures = ref(0)
const taskReportId = ref<number | undefined>()
const routeAsyncReceipt = (id?: number) => ({
  messageId: typeof route.query.asyncMessageId === 'string' ? route.query.asyncMessageId : '',
  traceId: typeof route.query.asyncTraceId === 'string' ? route.query.asyncTraceId : '',
  bizType: typeof route.query.asyncBizType === 'string' ? route.query.asyncBizType : 'interview.report',
  bizId: typeof route.query.asyncBizId === 'string' ? route.query.asyncBizId : (id ? String(id) : ''),
  sendStatus: typeof route.query.asyncSendStatus === 'string' ? route.query.asyncSendStatus : ''
})
const asyncReceipt = ref(routeAsyncReceipt(interviewId.value))
let pollTimer: number | undefined
let reportGeneration = 0
let replayEligibilityRequest = 0
let reportViewDisposed = false

const isCurrentReportRequest = (id: number, generation: number) =>
  !reportViewDisposed
  && reportGeneration === generation
  && interviewId.value === id

const clearReplayEligibility = () => {
  replayEligibilityRequest += 1
  replayEligibility.value = null
}

const loadReplayEligibility = async (id: number, generation: number) => {
  const request = ++replayEligibilityRequest
  try {
    const nextEligibility = await getInterviewReplayOptionsApi(id)
    if (
      !isCurrentReportRequest(id, generation)
      || replayEligibilityRequest !== request
      || !isGenerated.value
    ) {
      return
    }
    replayEligibility.value = nextEligibility
  } catch {
    // Keep the report-embedded contract as a compatibility fallback.
  }
}

const handleExportReport = async (command: string | number | object) => {
  const id = interviewId.value
  const generation = reportGeneration
  if (!id || !isGenerated.value || exporting.value) return
  const format: InterviewReportExportFormat = command === 'json' ? 'json' : 'markdown'
  exporting.value = true
  try {
    const response = await exportInterviewReportApi(id, format)
    if (!isCurrentReportRequest(id, generation)) return
    const mimeType = format === 'json' ? 'application/json;charset=UTF-8' : 'text/markdown;charset=UTF-8'
    const blob = response instanceof Blob ? response : new Blob([response as BlobPart], { type: mimeType })
    const url = URL.createObjectURL(blob)
    try {
      const link = document.createElement('a')
      link.href = url
      link.download = `面试报告_${id}.${format === 'json' ? 'json' : 'md'}`
      link.click()
    } finally {
      URL.revokeObjectURL(url)
    }
    ElMessage.success('报告已导出')
  } catch (error) {
    if (!isCurrentReportRequest(id, generation)) return
    ElMessage.error(toFriendlyMessage(error, '报告导出失败，请稍后重试。'))
  } finally {
    if (isCurrentReportRequest(id, generation)) exporting.value = false
  }
}

const asyncSendStatusLabel = (value?: string | null) => {
  const status = String(value || '').toUpperCase()
  const labels: Record<string, string> = {
    SENT: '已提交',
    SUCCESS: '已提交',
    QUEUED: '排队中',
    PENDING: '排队中',
    FAILED: '提交失败',
    ERROR: '提交失败',
    SKIPPED: '暂未提交',
    DISABLED: '暂未提交',
    UNAVAILABLE: '暂不可用'
  }
  return labels[status] || '待确认'
}

const normalizedStatus = computed(() => {
  const status = report.value?.reportStatus || report.value?.status || ''
  return String(status).toUpperCase()
})

const successReportStatuses = ['GENERATED', 'COMPLETED', 'SUCCESS']
const unscorableReportStatuses = ['UNSCORABLE', 'NOT_SCORABLE', 'INSUFFICIENT_SAMPLE', 'SAMPLE_INSUFFICIENT']
const isGenerating = computed(() => ['GENERATING', 'REPORT_GENERATING'].includes(normalizedStatus.value))
const isFailed = computed(() => normalizedStatus.value === 'FAILED')
const isUnscorable = computed(() => unscorableReportStatuses.includes(normalizedStatus.value))
const isGenerated = computed(() => successReportStatuses.includes(normalizedStatus.value))
const advancedReportMeta = computed(() => {
  const normalized = normalizeInterviewReportAdvanced(report.value, interviewId.value)
  return replayEligibility.value
    ? { ...normalized, replayEligibility: replayEligibility.value }
    : normalized
})
const replayAvailable = computed(() => advancedReportMeta.value.replayEligibility.state === 'ELIGIBLE')
const remediationButtonTitle = computed(() => {
  if (advancedReportMeta.value.remediationAvailable) return '根据本轮报告创建同岗位复练场次'
  return '当前报告尚不支持创建复练'
})
const replayButtonTitle = computed(() => {
  const eligibility = advancedReportMeta.value.replayEligibility
  if (eligibility.state === 'ELIGIBLE') {
    return '以完全相同的配置再打一轮，完成后可与本轮对比'
  }
  const qualityGate = eligibility.qualityGate
  const qualityGateMessage = qualityGate?.actual !== undefined && qualityGate.required !== undefined
    ? `当前 ${qualityGate.actual}，要求 ${qualityGate.required}`
    : ''
  const defaultMessage = eligibility.state === 'INELIGIBLE'
    ? '当前报告不满足同配置再练条件'
    : '当前无法确认同配置再练资格，暂时无法创建'
  return [eligibility.reasonMessage || defaultMessage, qualityGateMessage].filter(Boolean).join('；')
})
const remediationGuidance = computed(() => {
  if (!isGenerated.value || !advancedReportMeta.value.remediationAvailable) return ''
  if (advancedReportMeta.value.strongRemediationAvailable) {
    return '本轮报告证据和样本满足强化复练条件，将沿用同一评分量表并提高追问强度。'
  }
  const reason = String(advancedReportMeta.value.strongRemediationUnavailableReason || '').toUpperCase()
  if (reason === 'SAMPLE_INSUFFICIENT') {
    return '本轮样本不足，只创建普通复练，不把弱信号包装成强化训练结论。'
  }
  return '本轮报告可信度不足以支持强化复练，将保守创建普通复练。'
})

type DisplayRecommendedQuestion = RecommendedQuestionVO & { title?: string }

const objectItems = <T>(value: unknown): T[] => {
  return Array.isArray(value)
    ? (value.filter((item) => item && typeof item === 'object' && !Array.isArray(item)) as T[])
    : []
}

const normalizeRecommendedQuestions = (value: unknown): DisplayRecommendedQuestion[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === 'string') {
        return { title: item }
      }
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        return item as DisplayRecommendedQuestion
      }
      return null
    })
    .filter((item): item is DisplayRecommendedQuestion => Boolean(item))
}

const difficultyLabel = (value?: string) => {
  if (!value) return ''
  return difficultyOptions.find((item) => item.value === value)?.label || '难度待确认'
}

const stageReports = computed<StageReportVO[]>(() => objectItems<StageReportVO>(report.value?.stageReports || report.value?.stageScores))
const recommendedQuestions = computed<DisplayRecommendedQuestion[]>(() => normalizeRecommendedQuestions(report.value?.recommendedQuestions))
const nextActions = computed<InterviewReportNextActionVO[]>(() => {
  if (!isGenerated.value || !Array.isArray(report.value?.nextActions)) return []
  return [...report.value.nextActions]
    .filter((action) => action && action.actionType && action.title)
    .sort((left, right) => (left.priority || 0) - (right.priority || 0))
})

/** 结算画面"三点改进"：优先取下一步行动前三条，退化为短板文本拆分 */
const improveTop3 = computed(() => {
  const fromActions = nextActions.value
    .slice(0, 3)
    .map((action) => action.title || action.description || '')
    .filter((text) => text.trim().length > 0)
  if (fromActions.length) return fromActions
  const text = String(report.value?.mainProblems || report.value?.weaknesses || '')
  return text
    .split(/\r?\n|；|。/)
    .map((line) => line.trim().replace(/^[-*·\d.、\s]+/, ''))
    .filter((line) => line.length > 3)
    .slice(0, 3)
})
const knowledgeCandidates = computed<InterviewKnowledgeCandidateVO[]>(() =>
  isGenerated.value ? buildInterviewReportKnowledgeCandidates(report.value) : []
)
const voiceDeliverySummary = computed(() => report.value?.voiceDeliverySummary)
const voiceDeliveryFacts = computed(() => buildVoiceDeliveryFacts(voiceDeliverySummary.value))
const voiceDeliveryStatusLabel = computed(() => {
  const status = String(voiceDeliverySummary.value?.status || 'NOT_ANALYZED').toUpperCase()
  if (voiceDeliverySummary.value?.available) return '分析完成'
  if (['QUEUED', 'RUNNING'].includes(status)) return '分析处理中'
  if (status === 'FAILED') return '分析失败'
  if (status === 'TIMED_OUT') return '分析超时'
  if (status === 'CANCELLED') return '分析已取消'
  return '暂无分析'
})
const voiceDeliveryMissingTitle = computed(() => {
  if (voiceDeliverySummary.value?.available && !voiceDeliverySummary.value.pauseMetricsAvailable) {
    return '停顿指标不可用'
  }
  return voiceDeliveryStatusLabel.value
})
const voiceDeliveryMissingDescription = computed(() => {
  if (voiceDeliverySummary.value?.available && !voiceDeliverySummary.value.pauseMetricsAvailable) {
    return '本场没有保存真实逐词时间戳，因此不会估算停顿次数或停顿时长。'
  }
  const reason = String(voiceDeliverySummary.value?.missingReason || '').toUpperCase()
  const descriptions: Record<string, string> = {
    VOICE_DELIVERY_NOT_ANALYZED: '本场没有已保存的语音表达分析，文本回答不会被推测为语音指标。',
    VOICE_DELIVERY_ANALYSIS_PENDING: '语音表达分析仍在处理中，稍后刷新报告可查看结果。',
    VOICE_DELIVERY_ANALYSIS_CANCELLED: '本场语音表达分析已取消，没有可展示的可靠指标。',
    VOICE_DELIVERY_ANALYSIS_TIMED_OUT: '本场语音表达分析超时，没有生成可靠指标。',
    VOICE_DELIVERY_ANALYSIS_FAILED: '本场语音表达分析失败，原始面试报告不受影响。'
  }
  return descriptions[reason] || '当前没有可展示的可靠语音表达指标。'
})
const isStaticFallbackNextAction = (action?: InterviewReportNextActionVO) =>
  String(action?.actionSource || '').toUpperCase() === 'STATIC_FALLBACK'
const backendNextActions = computed(() => nextActions.value.filter((action) => !isStaticFallbackNextAction(action)))
const nextActionUnavailableReason = computed(() => {
  if (!isGenerated.value || nextActions.value.length) return ''
  if (recommendedQuestionIds.value.length) {
    return '报告暂未给出结构化行动，页面先用推荐题、重新面试和今日计划入口承接下一轮训练。'
  }
  if (qaMessages.value.length) {
    return '报告有问答证据，但暂未形成可跳转的训练动作。可以先重新面试或回到今日计划，避免把低置信建议包装成确定结论。'
  }
  return '报告缺少足够问答和短板证据，本轮不硬生成训练建议；建议先补一次完整模拟面试。'
})
const primaryNextAction = computed<InterviewReportNextActionVO>(() => {
  if (nextActions.value.length) return nextActions.value[0]
  if (recommendedQuestionIds.value.length) {
    return staticNextAction('QUESTION_PRACTICE', '去题库重练薄弱题', '/questions/practice', 1)
  }
  const reportId = report.value?.reportId || report.value?.id
  if (reportId && (report.value?.reviewSuggestions || report.value?.suggestions || report.value?.mainProblems || report.value?.weaknesses)) {
    return staticNextAction('STUDY_PLAN', '生成学习计划', '/study-plans', 2)
  }
  if (report.value?.projectProblems || report.value?.projectExpressionProblems || report.value?.resumeSuggestions || report.value?.resumeAdvice) {
    return staticNextAction('RESUME_OPTIMIZE', '整理项目证据和简历表达', '/resumes', 3)
  }
  return staticNextAction('INTERVIEW', '再来一轮模拟面试', '/interviews/create', 4)
})
const canUsePrimaryNextAction = computed(() => {
  if (primaryNextAction.value.actionType === 'QUESTION_PRACTICE') return recommendedQuestionIds.value.length > 0
  if (primaryNextAction.value.actionType === 'STUDY_PLAN') return Boolean(report.value?.reportId || report.value?.id)
  return true
})
const primaryNextActionMeta = computed(() => {
  if (!isStaticFallbackNextAction(primaryNextAction.value)) {
    return primaryNextAction.value.evidence || primaryNextAction.value.description || '来自报告给出的结构化下一步行动。'
  }
  if (primaryNextAction.value.actionType === 'QUESTION_PRACTICE') return '基于报告返回的可跳转推荐题。'
  if (primaryNextAction.value.actionType === 'STUDY_PLAN') return '基于报告内容的静态兜底入口，不伪装成 AI 个性化结论。'
  if (primaryNextAction.value.actionType === 'RESUME_OPTIMIZE') return '用于补齐项目证据、简历和面试表达之间的闭环。'
  return '当前证据不足，先用完整面试补样本。'
})
const qaMessages = computed<InterviewMessageVO[]>(() =>
  objectItems<InterviewMessageVO>(report.value?.questionReviews || report.value?.qaReview || report.value?.messages)
)
const interviewRewardPrefix = computed(() => interviewId.value ? `interview:${interviewId.value}:` : '')
const answerRewardXp = computed(() => interviewRewardPrefix.value
  ? gameProfile?.rewardXpForPrefix(`${interviewRewardPrefix.value}answer:`) || 0
  : 0
)
const answerRewardCount = computed(() => interviewRewardPrefix.value
  ? gameProfile?.rewardCountForPrefix(`${interviewRewardPrefix.value}answer:`) || 0
  : 0
)
const completionRewardXp = computed(() => interviewRewardPrefix.value
  ? gameProfile?.rewardXpForKey(`${interviewRewardPrefix.value}complete`) || 0
  : 0
)
const sessionRewardXp = computed(() => answerRewardXp.value + completionRewardXp.value)
const recommendedQuestionIds = computed(() =>
  recommendedQuestions.value
    .map((item) => Number(item.questionId || item.id))
    .filter((id) => Number.isFinite(id) && id > 0)
)
const hasValidTotalScore = computed(() => {
  const score = Number(report.value?.totalScore)
  return isGenerated.value && Number.isFinite(score) && score > 0
})
const isScoreUnavailable = computed(() => isGenerated.value && !hasValidTotalScore.value)
const displayTotalScore = computed(() => hasValidTotalScore.value ? report.value?.totalScore : '--')
const textExcerpt = (value?: string | null, fallback = '暂无可展示内容') => {
  const text = String(value || '')
    .replace(/[#>*_`~\[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return fallback
  return text.length > 96 ? `${text.slice(0, 96)}...` : text
}
const scoreVerdict = computed(() => {
  const score = Number(report.value?.totalScore)
  if (!Number.isFinite(score) || score <= 0) return '评分暂不可用'
  if (score >= 85) return '表现稳定，优先把亮点沉淀成可复用表达。'
  if (score >= 70) return '基础可用，但仍有一处短板会影响面试说服力。'
  if (score >= 60) return '能完成回答框架，需要尽快补强证据和技术深度。'
  return '本轮暴露的问题较集中，建议先做专项训练再进入下一轮面试。'
})
const reportSummaryPreview = computed(() => ({
  title: report.value?.summary || report.value?.reportContent ? 'AI 已生成总评' : '总评证据不足',
  description: textExcerpt(
    report.value?.summary || report.value?.reportContent,
    qaMessages.value.length
      ? '报告没有返回结构化总评，建议结合下方问答复盘查看具体表现。'
      : '当前缺少足够问答样本，页面不会补写 AI 结论。'
  )
}))
const mainWeaknessPreview = computed(() => ({
  title: report.value?.mainProblems || report.value?.weaknesses ? '本轮最大短板' : '短板尚未被可靠识别',
  description: textExcerpt(
    report.value?.mainProblems || report.value?.weaknesses || weakPointText.value,
    qaMessages.value.length
      ? '报告没有给出明确短板，先从问答明细和低分项里定位训练点。'
      : '问答样本不足时不强行归因，建议重新完成一轮更完整的模拟面试。'
  )
}))
const evidenceSummaryPreview = computed(() =>
  textExcerpt(
    report.value?.evidenceSummary || report.value?.jdEvidenceSummary,
    qaMessages.value.length
      ? `已保留 ${qaMessages.value.length} 条问答作为复盘证据。`
      : '暂无足够问答证据，结论可信度有限。'
  )
)
const reportReviewCriteria = computed(() => [
  {
    label: '证据质量',
    value: qaMessages.value.length ? `${qaMessages.value.length} 条问答` : '样本不足',
    desc: qaMessages.value.length ? '判断来自真实问答记录' : '建议补一次完整面试再判断'
  },
  {
    label: '主要判断',
    value: hasValidTotalScore.value ? scoreVerdict.value : '暂不强行打分',
    desc: isScoreUnavailable.value ? '保留复盘，不补写结论' : '结合总分、短板和问答明细阅读'
  },
  {
    label: '下一步训练',
    value: primaryNextAction.value.title,
    desc: primaryNextActionMeta.value
  }
])
const pollProgress = computed(() => Math.min(100, Math.round((pollCount.value / 30) * 100)))
const generatingMessage = computed(() =>
  asyncReceipt.value.messageId
    ? '报告正在准备，可以离开页面，稍后回来查看结果。'
    : '系统正在根据真实问答记录生成结构化报告。'
)
const generatingStages = computed(() => [
  {
    key: 'submitted',
    label: '已提交',
    title: asyncReceipt.value.messageId ? '报告正在准备' : '等待处理进度',
    desc: asyncReceipt.value.sendStatus ? `生成进度：${asyncSendStatusLabel(asyncReceipt.value.sendStatus)}` : '已开始准备报告'
  },
  {
    key: 'tracking',
    label: '可追踪',
    title: '面试记录已绑定',
    desc: asyncReceipt.value.traceId ? '进度已记录，可稍后继续查看' : '刷新后仍可按面试记录继续查找'
  },
  {
    key: 'polling',
    label: '轮询中',
    title: `第 ${pollCount.value} 次状态检查`,
    desc: '报告完成后会自动展示复盘；耗时较长时可以稍后回来'
  }
])

const compactRouterQuery = (params: Record<string, RouterQueryValue>) => {
  const result: LocationQueryRaw = {}
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    result[key] = String(value)
  })
  return result
}

const goReportTaskCenter = () => {
  router.push({
    path: '/agent/tasks',
    query: compactRouterQuery({
      messageId: asyncReceipt.value.messageId,
      traceId: asyncReceipt.value.traceId,
      bizType: asyncReceipt.value.bizType || 'interview.report',
      bizId: asyncReceipt.value.bizId || interviewId.value
    })
  })
}

const reportContextQuery = () => compactRouterQuery({
  source: 'interviewReport',
  interviewId: interviewId.value,
  reportId: report.value?.reportId || report.value?.id,
  targetJobId: report.value?.targetJobId,
  profileId: report.value?.skillProfileId,
  skillProfileId: report.value?.skillProfileId,
  matchReportId: report.value?.matchReportId
})

const goTargetJobAnalysis = async () => {
  if (!report.value?.targetJobId) {
    ElMessage.info('这份报告还没有绑定目标岗位')
    return
  }
  await router.push({
    path: `/job-targets/${report.value.targetJobId}/analysis`,
    query: reportContextQuery()
  })
}

const goSkillProfile = async () => {
  if (!report.value?.skillProfileId && !report.value?.targetJobId && !report.value?.matchReportId) {
    ElMessage.info('这份报告还没有可查看的能力画像上下文')
    return
  }
  await router.push({
    path: '/skill-profile',
    query: reportContextQuery()
  })
}

const goJdGapPractice = async () => {
  if (report.value?.skillProfileId) {
    await router.push({
      path: '/questions/recommendations',
      query: compactRouterQuery({
        source: 'gap',
        sourceId: report.value.skillProfileId,
        interviewId: interviewId.value,
        reportId: report.value.reportId || report.value.id,
        targetJobId: report.value.targetJobId,
        profileId: report.value.skillProfileId,
        skillProfileId: report.value.skillProfileId,
        matchReportId: report.value.matchReportId,
        questionCount: 5
      })
    })
    return
  }
  if (report.value?.matchReportId) {
    await router.push({
      path: '/questions/recommendations',
      query: compactRouterQuery({
        source: 'matchReport',
        sourceId: report.value.matchReportId,
        interviewId: interviewId.value,
        reportId: report.value.reportId || report.value.id,
        targetJobId: report.value.targetJobId,
        profileId: report.value.skillProfileId,
        skillProfileId: report.value.skillProfileId,
        matchReportId: report.value.matchReportId,
        questionCount: 5
      })
    })
    return
  }
  await goPracticeQuestion()
}

const failureReason = computed(() => toFriendlyMessage(
  report.value?.failedReason || report.value?.failureReason || report.value?.errorMessage,
  isUnscorable.value ? '本次面试答题样本不足或题目明细不完整，暂时无法生成可信评分。请继续答题或重新生成报告。' : '报告生成失败，请稍后重试。'
))
const taskMetaText = computed(() => {
  const items = []
  const reportId = taskReportId.value || report.value?.reportId || report.value?.id
  if (reportId) items.push('报告记录已保存')
  if (asyncReceipt.value.messageId) items.push('报告正在准备')
  if (asyncReceipt.value.traceId) items.push('进度已记录')
  return items.join(' / ')
})
const reportTrustTags = computed(() => [
  {
    label: report.value?.evidenceSummary || '面试报告证据待确认',
    type: trustStatusType(report.value?.trustStatus, report.value?.fallback ? 'warning' : 'info')
  },
  {
    label: report.value?.reportId || report.value?.id ? '报告记录已保存' : '报告记录待确认',
    type: report.value?.reportId || report.value?.id ? 'success' : 'warning'
  },
  {
    label: qaMessages.value.length ? `基于 ${qaMessages.value.length} 条真实问答` : '问答样本不足，可信度降低',
    type: qaMessages.value.length ? 'success' : 'warning'
  },
  {
    label: hasValidTotalScore.value ? '评分可用' : '评分不可用或待复核',
    type: hasValidTotalScore.value ? 'success' : 'warning'
  },
  {
    label: recommendedQuestionIds.value.length ? `${recommendedQuestionIds.value.length} 道推荐题可练习` : '推荐题仅供参考',
    type: recommendedQuestionIds.value.length ? 'success' : 'info'
  }
] as Array<{ label: string; type: 'success' | 'warning' | 'info' }>)

const missingSkillRows = computed(() =>
  Array.isArray(report.value?.missingSkills)
    ? report.value.missingSkills
        .filter((item) => item && item.skillName)
        .slice(0, 5)
    : []
)

const hasJdAlignment = computed(() => Boolean(
  report.value?.targetJobId ||
  report.value?.targetJobTitle ||
  report.value?.skillProfileId ||
  report.value?.matchReportId ||
  missingSkillRows.value.length
))

const jdAlignmentCards = computed(() => {
  const targetTitle = report.value?.targetJobTitle || (report.value?.targetJobId ? `目标岗位 #${report.value.targetJobId}` : '未绑定目标岗位')
  const targetValue = report.value?.targetCompanyName
    ? `${targetTitle} · ${report.value.targetCompanyName}`
    : targetTitle
  return [
    {
      label: '目标岗位',
      value: targetValue,
      hint: report.value?.targetJobId ? '报告已绑定岗位/JD' : '建议先绑定目标岗位',
      type: report.value?.targetJobId ? 'success' : 'warning'
    },
    {
      label: '能力画像',
      value: report.value?.skillProfileId ? `画像 #${report.value.skillProfileId}` : '画像待生成',
      hint: missingSkillRows.value.length ? `${missingSkillRows.value.length} 个 JD 短板` : '可从匹配报告生成画像',
      type: report.value?.skillProfileId ? 'success' : 'info'
    },
    {
      label: '匹配报告',
      value: report.value?.matchReportId ? `报告 #${report.value.matchReportId}` : '未关联匹配报告',
      hint: report.value?.jdEvidenceSummary || '用于判断 JD 覆盖和追问方向',
      type: report.value?.matchReportId ? 'success' : 'info'
    }
  ] as Array<{ label: string; value: string; hint: string; type: 'success' | 'warning' | 'info' }>
})

const severityTagType = (severity?: string): 'danger' | 'warning' | 'info' | 'success' => {
  const value = String(severity || '').toUpperCase()
  if (['HIGH', 'CRITICAL', 'SEVERE'].includes(value)) return 'danger'
  if (['MEDIUM', 'MIDDLE'].includes(value)) return 'warning'
  if (['LOW'].includes(value)) return 'info'
  return 'info'
}

const trustStatusType = (
  value?: string | null,
  fallback: 'success' | 'warning' | 'info' = 'info'
): 'success' | 'warning' | 'info' => {
  if (value === 'VERIFIED') return 'success'
  if (value === 'FALLBACK') return 'warning'
  if (value === 'PARTIAL') return 'info'
  return fallback
}

const displayQuestionScore = (message: InterviewMessageVO) => {
  const score = Number(message.score)
  return Number.isFinite(score) && score > 0 ? `${score} 分` : '未评分'
}

const weakPointText = computed(() => {
  const value = report.value?.weakPoints || report.value?.weakKnowledgePoints
  if (Array.isArray(value)) {
    return value.length ? value.map((item) => `- ${item}`).join('\n') : ''
  }
  return value || ''
})

const coachNextSteps = computed(() => [
  {
    kicker: '题库',
    title: recommendedQuestionIds.value.length ? `重练 ${recommendedQuestionIds.value.length} 道薄弱题` : '等待推荐题',
    desc: recommendedQuestionIds.value.length
      ? '优先完成报告推荐题，再回到面试房间验证表达。'
      : '当前报告没有可跳转题目，可以从题库训练页重新生成推荐。'
  },
  {
    kicker: '表达',
    title: report.value?.projectProblems || report.value?.projectExpressionProblems ? '补项目证据链' : '沉淀项目说法',
    desc: '把项目背景、个人职责、指标、取舍和复盘补成一段可复用回答。'
  },
  {
    kicker: '计划',
    title: report.value?.reviewSuggestions || report.value?.suggestions ? '生成学习计划' : '补齐复盘材料',
    desc: '把报告建议转成今日计划，避免复盘停留在页面里。'
  }
])

const emptyReportCopy = computed(() => {
  const qaCount = qaMessages.value.length
  const sampleHint = qaCount
    ? `当前报告基于 ${qaCount} 条问答生成，部分模块可能因为证据不足没有拆分。`
    : '当前报告没有拿到足够的问答样本，AI 只能给出有限复盘。'
  return {
    summary: `${sampleHint} 可重新生成报告，或回到面试历史确认问答是否完整。`,
    strengths: `${sampleHint} 亮点通常需要明确回答、项目证据或指标支撑。`,
    weaknesses: `${sampleHint} 如果没有短板条目，先用学习计划把低分项和推荐题转成下一步训练。`,
    suggestions: `${sampleHint} 提升建议缺失时，可以重新生成报告或根据低分维度手动生成学习计划。`,
    weakPoints: `${sampleHint} 推荐题可用时优先练推荐题；没有推荐题时先回到题库训练做一组基础练习。`,
    project: `${sampleHint} 项目表达问题需要回答里出现项目背景、职责、指标和取舍，缺失时建议先整理项目经历。`,
    resume: `${sampleHint} 简历建议依赖岗位、简历和面试回答之间的证据链，缺失时先回到简历与岗位页补资料。`,
    questions: `${sampleHint} 推荐题缺失不会阻塞复盘，可以先进入题库训练，再把错题带回下一次模拟面试。`
  }
})

const openRecommendedQuestion = async (item: DisplayRecommendedQuestion) => {
  if (!item.questionId) {
    ElMessage.warning('这条推荐暂时不能直接打开题目详情，可以先从推荐训练进入练习。')
    return
  }
  const query: Record<string, string> = { source: 'interviewReport' }
  if (interviewId.value) query.interviewId = String(interviewId.value)
  const reportId = report.value?.reportId || report.value?.id
  if (reportId) query.reportId = String(reportId)
  await router.push({
    path: `/questions/${item.questionId}`,
    query
  })
}

const goPracticeQuestion = async () => {
  if (!recommendedQuestionIds.value.length) {
    ElMessage.info('暂无可跳转的推荐题目')
    return
  }
  const query: Record<string, string> = {
    mode: 'recommended',
    questionIds: recommendedQuestionIds.value.join(','),
    source: 'interviewReport',
    count: String(recommendedQuestionIds.value.length)
  }
  if (interviewId.value) query.interviewId = String(interviewId.value)
  const reportId = report.value?.reportId || report.value?.id
  if (reportId) query.reportId = String(reportId)
  await router.push({
    path: '/questions/practice',
    query
  })
}

const nextActionTypeLabel = (type?: string) => {
  const labels: Record<string, string> = {
    QUESTION_PRACTICE: '题库练习',
    STUDY_PLAN: '学习计划',
    INTERVIEW: '模拟面试',
    RESUME_OPTIMIZE: '简历优化',
    PROJECT_EVIDENCE: '项目证据',
    KNOWLEDGE_CANDIDATE: '知识候选',
    JOB_FOLLOW_UP: '投递跟进',
    REVIEW_EXPERIMENT: '复盘实验'
  }
  return labels[String(type || '').toUpperCase()] || '下一步'
}

const nextActionButtonLabel = (type?: string) => {
  const labels: Record<string, string> = {
    QUESTION_PRACTICE: '去练习',
    STUDY_PLAN: '生成计划',
    INTERVIEW: '再面一轮',
    RESUME_OPTIMIZE: '去优化',
    PROJECT_EVIDENCE: '补证据',
    KNOWLEDGE_CANDIDATE: '确认候选',
    JOB_FOLLOW_UP: '去跟进',
    REVIEW_EXPERIMENT: '去复盘'
  }
  return labels[String(type || '').toUpperCase()] || '开始'
}

const knowledgeCandidateSourceLabel = (sourceField?: string) => {
  const labels: Record<string, string> = {
    weakPoints: '薄弱知识点',
    rubricScores: '评分维度',
    adviceEvidence: '建议证据',
    abilityProfileUpdates: '能力画像候选'
  }
  return labels[sourceField || ''] || '报告候选'
}

const openKnowledgeCandidate = async (candidate: InterviewKnowledgeCandidateVO) => {
  await router.push(candidate.actionUrl || {
    path: '/knowledge',
    query: compactRouterQuery({
      source: 'interviewReport',
      candidate: candidate.sourceField,
      interviewId: interviewId.value,
      reportId: report.value?.reportId || report.value?.id
    })
  })
}

const pushNextActionUrl = async (actionUrl?: string, fallback = '/dashboard') => {
  await router.push(actionUrl || fallback)
}

const reportMetricId = () => report.value?.reportId || report.value?.id
const canTrackReportNextActionMetric = () => isGenerated.value && Boolean(reportMetricId())

const trackInterviewNextActionMetric = (eventCode: 'interview_report_next_action_shown' | 'interview_report_next_action_clicked', action?: InterviewReportNextActionVO) => {
  const metricId = reportMetricId()
  if (!metricId || !canTrackReportNextActionMetric()) return
  void recordAgentMetricEventApi({
    eventCode,
    sourcePage: 'interview_report',
    targetPath: action?.actionUrl,
    bizType: 'interview_report',
    bizId: String(metricId),
    metadata: {
      interviewId: interviewId.value,
      actionType: action?.actionType,
      actionSource: action?.actionSource || (action ? 'BACKEND' : undefined),
      priority: action?.priority,
      title: action?.title,
      actionCount: nextActions.value.length,
      backendActionCount: backendNextActions.value.length
    }
  }, { silentError: true }).catch(() => undefined)
}

const staticNextAction = (actionType: string, title: string, actionUrl: string, priority = 90): InterviewReportNextActionVO => ({
  actionType,
  title,
  actionUrl,
  priority,
  actionSource: 'STATIC_FALLBACK',
  description: '静态兜底训练入口'
})

const handleStaticTodayAction = async (trackMetric = false) => {
  if (trackMetric) {
    trackInterviewNextActionMetric('interview_report_next_action_clicked', staticNextAction('TODAY_PLAN', '返回今日计划', '/dashboard', 93))
  }
  await router.push('/dashboard')
}

const resolveRemediationRequirementIds = async (
  sourceRequirementIds: number[],
  targetJobId?: number
) => {
  if (sourceRequirementIds.length) {
    return sourceRequirementIds
  }
  if (!targetJobId) return []
  const matrix = await getJobRequirementMatrixApi(targetJobId)
  return extractRemediationRequirementIds(matrix)
}

const handleCreateRemediation = async () => {
  const id = interviewId.value
  const generation = reportGeneration
  const meta = advancedReportMeta.value
  if (remediationLoading.value || !id || !meta.remediationAvailable) return
  const sourceReportId = meta.reportId || report.value?.reportId || report.value?.id
  if (!sourceReportId) {
    ElMessage.warning('当前报告缺少可追溯的报告记录，暂时无法创建复练。')
    return
  }
  const snapshot = {
    sourceReportId,
    sourceRequirementIds: [...meta.sourceRequirementIds],
    targetJobId: meta.targetJobId || report.value?.targetJobId,
    purpose: [
      mainWeaknessPreview.value.title,
      mainWeaknessPreview.value.description
    ].filter(Boolean).join('：').slice(0, 500) || '针对本轮面试报告暴露的岗位要求短板进行复练。',
    strongRemediation: meta.strongRemediationAvailable
  }

  remediationLoading.value = true
  try {
    const sourceRequirementIds = await resolveRemediationRequirementIds(
      snapshot.sourceRequirementIds,
      snapshot.targetJobId
    )
    if (!isCurrentReportRequest(id, generation)) return
    if (!sourceRequirementIds.length) {
      ElMessage.warning('当前岗位还没有可用于复练的薄弱或缺失要求，请先完善岗位证据矩阵。')
      return
    }
    let idempotencyKey = remediationIdempotencyKeys.get(snapshot.sourceReportId)
    if (!idempotencyKey) {
      idempotencyKey = createOperationIdempotencyKey('interview-remedy')
      remediationIdempotencyKeys.set(snapshot.sourceReportId, idempotencyKey)
    }
    remediationIdempotencyKey.value = idempotencyKey
    const result = await createInterviewRemediationApi({
      sourceReportId: snapshot.sourceReportId,
      sourceRequirementIds,
      practicePurpose: snapshot.purpose,
      strongRemediation: snapshot.strongRemediation,
      idempotencyKey
    })
    if (!isCurrentReportRequest(id, generation)) return
    const targetSessionId = result.targetSessionId || result.interview?.id || result.interview?.interviewId
    const destination = targetSessionId ? `/interviews/room/${targetSessionId}` : '/interviews/history'
    let navigationFailure: unknown
    try {
      navigationFailure = await router.push(destination)
    } catch {
      if (isCurrentReportRequest(id, generation)) {
        ElMessage.warning('复练场次已创建，但页面跳转失败；重试将恢复同一场次。')
      }
      return
    }
    if (navigationFailure) {
      ElMessage.warning('复练场次已创建，但页面跳转未完成；重试将恢复同一场次。')
      return
    }
    remediationIdempotencyKeys.delete(snapshot.sourceReportId)
    remediationIdempotencyKey.value = ''
    if (targetSessionId) {
      ElMessage.success(result.idempotentReplay ? '已恢复之前创建的复练场次。' : '复练场次已创建。')
    } else {
      ElMessage.info('复练请求已保存，请到面试历史中查看新场次。')
    }
  } catch (error) {
    if (!isCurrentReportRequest(id, generation)) return
    ElMessage.error(toFriendlyMessage(error, '复练创建失败，请稍后重试。'))
  } finally {
    if (isCurrentReportRequest(id, generation)) remediationLoading.value = false
  }
}

const handleCreateReplay = async () => {
  const id = interviewId.value
  const generation = reportGeneration
  if (replayLoading.value || !id || !replayAvailable.value) return
  replayLoading.value = true
  try {
    try {
      await ElMessageBox.confirm(
        '将以完全相同的配置（岗位、难度、题量、场景）开启新一轮面试，完成后可与本轮发起对比。',
        '同配置再练一轮',
        { confirmButtonText: '开始再练', cancelButtonText: '取消', type: 'info' }
      )
    } catch {
      return
    }
    if (!isCurrentReportRequest(id, generation)) return
    if (!replayIdempotencyKey.value) {
      replayIdempotencyKey.value = createOperationIdempotencyKey('interview-replay')
      replayIdempotencyKeys.set(id, replayIdempotencyKey.value)
    }
    const result = await createInterviewReplayApi(id, {
      idempotencyKey: replayIdempotencyKey.value
    })
    if (!isCurrentReportRequest(id, generation)) return
    const targetSessionId = result.targetSessionId || result.interview?.id || result.interview?.interviewId
    const destination = targetSessionId ? `/interviews/room/${targetSessionId}` : '/interviews/history'
    let navigationFailure: unknown
    try {
      navigationFailure = await router.push(destination)
    } catch {
      if (isCurrentReportRequest(id, generation)) {
        ElMessage.warning('再练场次已创建，但页面跳转失败；重试将恢复同一场次。')
      }
      return
    }
    if (navigationFailure) {
      ElMessage.warning('再练场次已创建，但页面跳转未完成；重试将恢复同一场次。')
      return
    }
    replayIdempotencyKeys.delete(id)
    replayIdempotencyKey.value = ''
    if (targetSessionId) {
      ElMessage.success(result.idempotentReplay ? '已恢复之前创建的再练场次。' : '再练场次已创建。')
    } else {
      ElMessage.info('再练请求已保存，请到面试历史中查看新场次。')
    }
  } catch (error) {
    if (!isCurrentReportRequest(id, generation)) return
    ElMessage.error(toFriendlyMessage(error, '同配置再练创建失败，请稍后重试。'))
  } finally {
    if (isCurrentReportRequest(id, generation)) replayLoading.value = false
  }
}

const handleStaticInterviewAction = async (trackMetric = false) => {
  if (trackMetric) {
    trackInterviewNextActionMetric('interview_report_next_action_clicked', staticNextAction('INTERVIEW', '重新面试', '/interviews/create', 91))
  }
  await router.push('/interviews/create')
}

const handleStaticPracticeAction = async (trackMetric = false) => {
  if (trackMetric) {
    trackInterviewNextActionMetric('interview_report_next_action_clicked', staticNextAction('QUESTION_PRACTICE', '重练薄弱题', '/questions/practice', 92))
  }
  await goPracticeQuestion()
}

const handlePrimaryNextAction = async () => {
  if (!canUsePrimaryNextAction.value) return
  await handleNextAction(primaryNextAction.value)
}

const handleNextAction = async (action: InterviewReportNextActionVO) => {
  trackInterviewNextActionMetric('interview_report_next_action_clicked', action)
  const actionType = String(action.actionType || '').toUpperCase()
  if (actionType === 'STUDY_PLAN') {
    await handleGenerateStudyPlan()
    return
  }
  if (actionType === 'QUESTION_PRACTICE') {
    if (recommendedQuestionIds.value.length) {
      await goPracticeQuestion()
      return
    }
    await pushNextActionUrl(action.actionUrl, '/questions/practice')
    return
  }
  if (actionType === 'INTERVIEW') {
    await pushNextActionUrl(action.actionUrl, '/interviews/create')
    return
  }
  if (actionType === 'RESUME_OPTIMIZE') {
    await pushNextActionUrl(action.actionUrl, '/resumes')
    return
  }
  if (actionType === 'PROJECT_EVIDENCE') {
    await pushNextActionUrl(action.actionUrl, '/project-evidence')
    return
  }
  if (actionType === 'KNOWLEDGE_CANDIDATE') {
    await pushNextActionUrl(action.actionUrl, '/knowledge')
    return
  }
  if (actionType === 'JOB_FOLLOW_UP') {
    await pushNextActionUrl(action.actionUrl, '/applications')
    return
  }
  if (actionType === 'REVIEW_EXPERIMENT') {
    await pushNextActionUrl(action.actionUrl, '/job-experiments')
    return
  }
  await pushNextActionUrl(action.actionUrl)
}

const stopPolling = () => {
  if (pollTimer !== undefined) {
    window.clearTimeout(pollTimer)
    pollTimer = undefined
  }
}

const rememberAsyncReceipt = (result?: {
  asyncMessageId?: string | null
  asyncTraceId?: string | null
  asyncBizType?: string | null
  asyncBizId?: string | null
  asyncSendStatus?: string | null
}, id?: number) => {
  if (!result) return
  asyncReceipt.value = {
    messageId: result.asyncMessageId || asyncReceipt.value.messageId,
    traceId: result.asyncTraceId || asyncReceipt.value.traceId,
    bizType: result.asyncBizType || asyncReceipt.value.bizType || 'interview.report',
    bizId: result.asyncBizId || asyncReceipt.value.bizId || (id ? String(id) : ''),
    sendStatus: result.asyncSendStatus || asyncReceipt.value.sendStatus
  }
}

const schedulePolling = (id: number, generation: number) => {
  stopPolling()
  if (!isCurrentReportRequest(id, generation)) return
  if (!isGenerating.value) return
  if (pollCount.value >= 30) {
    ElMessage.warning('报告准备时间较长，可稍后按面试记录继续查看。')
    return
  }
  pollTimer = window.setTimeout(() => {
    void fetchReport(id, generation)
  }, 2000)
}

const fetchReport = async (id: number, generation: number) => {
  if (!isCurrentReportRequest(id, generation)) return
  loading.value = true
  try {
    const nextReport = await getInterviewReportApi(id)
    if (!isCurrentReportRequest(id, generation)) return
    report.value = nextReport
    pollFailures.value = 0
    if (isGenerated.value) void loadReplayEligibility(id, generation)
    if (isGenerating.value) {
      pollCount.value += 1
      schedulePolling(id, generation)
    } else {
      stopPolling()
    }
  } catch (error) {
    if (!isCurrentReportRequest(id, generation)) return
    pollFailures.value += 1
    if (pollFailures.value >= 3) {
      stopPolling()
      ElMessage.error(toFriendlyMessage(error, '报告状态查询失败，请稍后刷新。'))
    } else {
      schedulePolling(id, generation)
    }
  } finally {
    if (isCurrentReportRequest(id, generation)) loading.value = false
  }
}

const markReportUnavailable = (message: string, id: number, generation: number) => {
  if (!isCurrentReportRequest(id, generation)) return
  reportRecoveryNotice.value = message
  report.value = {
    interviewId: id,
    reportStatus: 'FAILED',
    status: 'FAILED',
    failureReason: message,
    trustStatus: 'FALLBACK',
    evidenceSummary: '报告读取失败，未自动重新发起准备流程。',
    fallback: true
  }
  stopPolling()
}

const runSyncFallback = async (id: number, generation: number) => {
  if (!isCurrentReportRequest(id, generation)) return
  clearReplayEligibility()
  retrying.value = true
  try {
    const retryResult = await retryInterviewReportApi(id)
    if (!isCurrentReportRequest(id, generation)) return
    rememberAsyncReceipt(retryResult, id)
    report.value = {
      interviewId: id,
      reportStatus: 'GENERATING',
      status: 'GENERATING',
      asyncMessageId: asyncReceipt.value.messageId,
      asyncTraceId: asyncReceipt.value.traceId,
      asyncBizType: asyncReceipt.value.bizType,
      asyncBizId: asyncReceipt.value.bizId,
      asyncSendStatus: asyncReceipt.value.sendStatus
    }
    pollFailures.value = 0
    reportRecoveryNotice.value = ''
    schedulePolling(id, generation)
  } finally {
    if (isCurrentReportRequest(id, generation)) retrying.value = false
  }
}

const loadReportOrSubmitTask = async (id: number, generation: number) => {
  if (!isCurrentReportRequest(id, generation)) return
  loading.value = true
  reportRecoveryNotice.value = ''
  try {
    const nextReport = await getInterviewReportApi(id)
    if (!isCurrentReportRequest(id, generation)) return
    report.value = nextReport
    pollFailures.value = 0
    if (isGenerated.value) void loadReplayEligibility(id, generation)
    if (isGenerated.value || isFailed.value || isUnscorable.value) {
      stopPolling()
      return
    }
    if (isGenerating.value) {
      schedulePolling(id, generation)
      return
    }
    markReportUnavailable(
      '当前报告暂时不可用，页面没有自动重新准备报告。请先查看准备进度，或点击“重新生成报告”手动触发。',
      id,
      generation
    )
  } catch (error) {
    markReportUnavailable(
      toFriendlyMessage(error, '当前报告暂时无法读取，页面没有自动重新准备报告。你可以稍后回来，或按面试记录继续查看。'),
      id,
      generation
    )
  } finally {
    if (isCurrentReportRequest(id, generation)) loading.value = false
  }
}

const handleRetry = async () => {
  const id = interviewId.value
  const generation = reportGeneration
  if (!id) return
  await runSyncFallback(id, generation)
}

const handleGenerateStudyPlan = async () => {
  const id = interviewId.value
  const generation = reportGeneration
  const reportId = report.value?.reportId || report.value?.id
  if (!id || !reportId || studyPlanGenerating.value) {
    if (id && !reportId) {
      ElMessage.warning('当前报告缺少 reportId，无法生成学习计划')
    }
    return
  }
  if (!isCurrentReportRequest(id, generation)) {
    return
  }
  studyPlanGenerating.value = true
  try {
    const result = await generateStudyPlanApi({ reportId })
    if (!isCurrentReportRequest(id, generation)) return
    if (String(result.planStatus || '').toUpperCase() === 'FAILED') {
      ElMessage.error(toFriendlyMessage(result.failureReason, '学习计划生成失败，请稍后重试'))
      if (result.planId) {
        await router.push(`/study-plans?planId=${result.planId}`)
      }
      return
    } else if (result.asyncMessageId || result.asyncTraceId || result.asyncBizType) {
      ElMessage.success('学习计划正在准备，可查看进度')
      await router.push({
        path: '/agent/tasks',
        query: compactRouterQuery({
          messageId: result.asyncMessageId,
          traceId: result.asyncTraceId,
          bizType: result.asyncBizType || 'study-plan.generate',
          bizId: result.asyncBizId || result.planId
        })
      })
      return
    } else if (!result.planId) {
      ElMessage.warning('学习计划已提交，但暂未返回计划记录，可稍后到学习计划页刷新查看。')
      return
    } else {
      ElMessage.success('学习计划已生成')
    }
    await router.push(`/study-plans?planId=${result.planId}`)
  } catch (error) {
    if (isCurrentReportRequest(id, generation)) {
      ElMessage.error(toFriendlyMessage(error, '学习计划生成失败，请稍后重试'))
    }
  } finally {
    if (isCurrentReportRequest(id, generation)) studyPlanGenerating.value = false
  }
}

const resetReportRouteState = (id?: number) => {
  stopPolling()
  loading.value = false
  retrying.value = false
  exporting.value = false
  remediationLoading.value = false
  replayLoading.value = false
  studyPlanGenerating.value = false
  remediationIdempotencyKey.value = ''
  replayIdempotencyKey.value = id ? replayIdempotencyKeys.get(id) || '' : ''
  clearReplayEligibility()
  report.value = null
  reportRecoveryNotice.value = ''
  nextActionShownMetricKey.value = ''
  staticActionShownMetricKey.value = ''
  pollCount.value = 0
  pollFailures.value = 0
  taskReportId.value = undefined
  asyncReceipt.value = routeAsyncReceipt(id)
}

watch(interviewId, (id) => {
  reportGeneration += 1
  const generation = reportGeneration
  resetReportRouteState(id)
  if (id) void loadReportOrSubmitTask(id, generation)
}, { immediate: true })
watch(backendNextActions, (actions) => {
  const metricId = reportMetricId()
  if (!metricId || !canTrackReportNextActionMetric() || !actions.length) return
  const key = `${metricId}:${actions.map((action) => `${action.actionType || ''}:${action.priority || 0}`).join('|')}`
  if (nextActionShownMetricKey.value === key) return
  nextActionShownMetricKey.value = key
  trackInterviewNextActionMetric('interview_report_next_action_shown', actions[0])
})
watch(isGenerated, (generated) => {
  const metricId = reportMetricId()
  if (!generated || !metricId || backendNextActions.value.length) return
  const key = `${metricId}:static-action-zone`
  if (staticActionShownMetricKey.value === key) return
  staticActionShownMetricKey.value = key
  trackInterviewNextActionMetric(
    'interview_report_next_action_shown',
    staticNextAction('STATIC_ACTION_ZONE', '下一步行动', '', 99)
  )
})
onBeforeUnmount(() => {
  reportViewDisposed = true
  reportGeneration += 1
  stopPolling()
})
</script>

<style scoped lang="scss">
.interview-report {
  color: var(--user-text);
}

.report-top,
.analysis-card {
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);
  box-shadow: none;
}

.report-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 22px;
  padding: 24px;

  h1 {
    margin: 8px 0;
    font-size: 30px;
  }

  p {
    margin: 0;
    color: var(--user-text-muted);
    line-height: 1.65;
  }
}

.eyebrow,
.report-actions,
.action-buttons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.recommended-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recommended-training-callout {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 12px;
  padding: 14px;
  border: 1px solid var(--user-primary-border);
  border-radius: 8px;
  background: var(--user-primary-soft);

  div {
    min-width: 0;
  }

  span,
  strong,
  p {
    display: block;
    margin: 0;
  }

  span {
    color: var(--user-primary);
    font-size: 12px;
    font-weight: 800;
  }

  strong {
    margin-top: 5px;
    color: var(--user-text);
    line-height: 1.4;
  }

  p {
    margin-top: 5px;
    color: var(--user-text-secondary);
    line-height: 1.55;
  }

  .el-button {
    flex: 0 0 auto;
  }
}

.next-action-section {
  margin-top: 20px;
}

.knowledge-candidate-section {
  margin-top: 20px;
}

.next-action-empty {
  margin-top: 20px;
  padding: 14px 16px;
  border: 1px dashed var(--user-border);
  border-radius: 8px;
  background: var(--user-surface-muted);
  color: var(--user-text-secondary);

  strong,
  p {
    margin: 0;
  }

  strong {
    display: block;
    color: var(--user-text);
    font-size: 15px;
  }

  p {
    margin-top: 6px;
    line-height: 1.65;
  }
}

.next-action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.knowledge-candidate-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.next-action-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface-muted);

  .el-button {
    flex: 0 0 auto;
  }
}

.next-action-card__main {
  min-width: 0;

  span {
    color: var(--user-primary);
    font-size: 12px;
    font-weight: 800;
  }

  strong {
    display: block;
    margin-top: 6px;
    font-size: 16px;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }

  p,
  small {
    display: block;
    margin-top: 6px;
    color: var(--user-text-muted);
    line-height: 1.55;
    overflow-wrap: anywhere;
  }

  small {
    font-size: 12px;
  }
}

.knowledge-candidate-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  min-width: 0;
  padding: 16px;
  border: 1px dashed var(--user-primary);
  border-radius: 8px;
  background: var(--user-primary-soft);

  div {
    min-width: 0;
  }

  span {
    color: var(--user-primary);
    font-size: 12px;
    font-weight: 800;
  }

  strong {
    display: block;
    margin-top: 6px;
    color: var(--user-text);
    line-height: 1.35;
    overflow-wrap: anywhere;
  }

  p,
  small {
    display: block;
    margin-top: 6px;
    color: var(--user-text-secondary);
    line-height: 1.55;
    overflow-wrap: anywhere;
  }

  small {
    font-size: 12px;
  }

  .el-button {
    flex: 0 0 auto;
  }
}

.recommended-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 14px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);
  color: var(--user-text);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;

  &:hover {
    border-color: var(--user-primary-border);
    background: var(--user-primary-soft);
  }

  strong {
    display: block;
    font-size: 14px;
  }

  span {
    display: block;
    margin-top: 4px;
    color: var(--user-text-muted);
    font-size: 12px;
    line-height: 1.5;
  }
}

.recommended-item--disabled {
  cursor: not-allowed;
  opacity: 0.78;
}

.stage-report-list {
  display: grid;
  gap: 14px;
}

.stage-report-card {
  padding: 18px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);

  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--user-border);
  }

  span,
  label {
    color: var(--user-text-muted);
    font-size: 12px;
    font-weight: 700;
  }

  strong {
    display: block;
    margin-top: 6px;
    font-size: 18px;
  }

  p {
    margin: 6px 0 0;
    color: var(--user-text-muted);
    line-height: 1.7;
  }
}

.stage-score-pill {
  min-width: 88px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--user-primary-soft);
  text-align: center;

  strong {
    color: var(--user-primary);
    font-size: 24px;
  }
}

.stage-report-content {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  padding-top: 14px;
}

.stage-copy {
  min-width: 0;
  padding: 12px;
  border-radius: 8px;
  background: var(--user-surface-muted);
}

.eyebrow {
  color: var(--user-primary);
  font-size: 12px;
  font-weight: 800;
}

.report-actions,
.action-buttons {
  justify-content: flex-end;
}

.generating-panel,
.failed-panel {
  padding: 42px 24px;
  text-align: center;
}

.failed-panel {
  h2 {
    margin: 14px 0 8px;
    font-size: 24px;
  }
}

.failed-panel__lead {
  max-width: 620px;
  margin: 0 auto 18px;
  color: var(--user-text-muted);
  line-height: 1.7;
}

.generating-panel {
  h2 {
    margin: 12px 0 8px;
    font-size: 22px;
  }

  p {
    margin: 0 auto 18px;
    color: var(--user-text-muted);
  }
}

.generating-icon {
  color: var(--user-primary);
  font-size: 36px;
  animation: spin 1.1s linear infinite;
}

.task-stage-list {
  display: grid;
  gap: 10px;
  margin-top: 18px;
  text-align: left;
}

.task-stage-item {
  padding: 12px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface-muted);

  span {
    color: var(--user-primary);
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
  }

  strong {
    display: block;
    margin-top: 6px;
    color: var(--user-text);
  }

  p {
    margin: 6px 0 0;
    color: var(--user-text-muted);
  }
}

.task-meta {
  margin-top: 12px;
  color: var(--user-text-muted);
  font-size: 12px;
}

.async-diagnostics {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;

  span {
    max-width: 100%;
    padding: 5px 8px;
    border: 1px solid var(--user-border);
    border-radius: 8px;
    background: var(--user-surface);
    color: var(--user-text-muted);
    font-size: 12px;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }
}

.generating-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 18px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.overview-grid {
  display: grid;
  grid-template-columns: 1.3fr repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.report-hero-grid {
  display: grid;
  grid-template-columns: minmax(220px, 0.9fr) minmax(0, 1.15fr) minmax(260px, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.report-score-panel,
.report-summary-panel,
.report-action-panel {
  min-width: 0;
  padding: 20px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);
}

.report-score-panel {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-color: var(--user-primary-border);
  background: var(--user-surface-tint);
  color: var(--user-text);

  p {
    margin: 0;
    color: var(--user-text-secondary);
    line-height: 1.65;
  }
}

.state-eyebrow {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 8px;
  background: var(--user-primary-soft);
  color: var(--user-primary);
  font-size: 12px;
  font-weight: 800;
}

.state-promise {
  justify-content: center;
  margin: 14px 0;

  span {
    padding: 7px 10px;
    border: 1px solid var(--user-primary-border);
    border-radius: 8px;
    background: var(--user-surface);
    color: var(--user-primary);
    font-size: 12px;
    font-weight: 700;
  }
}

.report-score-panel--muted {
  border-color: var(--user-border);
  background: var(--user-surface-muted);
}

.panel-kicker {
  color: var(--user-primary);
  font-size: 12px;
  font-weight: 800;
}

.report-score-panel .panel-kicker {
  color: var(--user-primary);
}

.score-value {
  margin: 16px 0 10px;
  font-size: 64px;
  font-weight: 900;
  line-height: 0.95;
}

.score-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 18px;
  color: var(--user-surface-raised);
  font-size: 12px;
}

.report-summary-panel,
.report-action-panel {
  background: var(--user-surface-muted);

  h2 {
    margin: 10px 0 8px;
    color: var(--user-text);
    font-size: 22px;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }

  p {
    margin: 0;
    color: var(--user-text-secondary);
    line-height: 1.7;
    overflow-wrap: anywhere;
  }
}

.evidence-strip {
  margin-top: 18px;
  padding: 14px;
  border: 1px dashed var(--user-primary-border);
  border-radius: 8px;
  background: var(--user-surface);

  strong,
  span {
    display: block;
  }

  strong {
    color: var(--user-primary);
    font-size: 13px;
  }

  span {
    margin-top: 6px;
    color: var(--user-text-secondary);
    line-height: 1.65;
    overflow-wrap: anywhere;
  }
}

.primary-next-action {
  display: grid;
  gap: 8px;
  margin-top: 18px;
  padding: 14px;
  border: 1px solid var(--user-success-border);
  border-radius: 8px;
  background: var(--user-success-soft);

  span {
    color: var(--user-success);
    font-size: 12px;
    font-weight: 800;
  }

  strong {
    color: var(--user-success);
    font-size: 18px;
    line-height: 1.35;
  }

  small {
    color: var(--user-text-secondary);
    line-height: 1.55;
  }

  .el-button {
    justify-self: start;
    margin-top: 4px;
  }
}

.report-support-strip,
.state-promise {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.report-support-strip {
  margin: 0 0 16px;

  span {
    padding: 6px 10px;
    border: 1px solid var(--user-border);
    border-radius: 8px;
    background: var(--user-surface);
    color: var(--user-text-muted);
    font-size: 12px;
  }
}

.report-professional-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;

  article {
    min-width: 0;
    padding: 14px;
    border: 1px solid var(--user-border);
    border-radius: 8px;
    background: var(--user-surface);
  }

  span,
  strong,
  small {
    display: block;
  }

  span {
    color: var(--user-primary);
    font-size: 12px;
    font-weight: 800;
  }

  strong {
    margin-top: 7px;
    color: var(--user-text);
    line-height: 1.4;
    overflow-wrap: anywhere;
  }

  small {
    margin-top: 6px;
    color: var(--user-text-muted);
    line-height: 1.55;
    overflow-wrap: anywhere;
  }
}

.score-hero,
.overview-card {
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface-muted);
  padding: 18px;

  span {
    color: var(--user-text-muted);
    font-size: 13px;
  }

  strong {
    display: block;
    margin-top: 10px;
    font-size: 22px;
    line-height: 1.2;
  }
}

.score-hero {
  background: var(--user-surface-tint);

  strong {
    margin: 8px 0 12px;
    font-size: 52px;
    line-height: 1;
  }
}

.score-source,
.retry-row {
  margin: 16px 0;
}

.report-trust-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 10px 0 0;
}

.remediation-guidance {
  margin-top: 14px;
}

.voice-delivery-report {
  display: grid;
  gap: 16px;
  margin-top: 16px;
  padding: 20px 0;
  border-top: 1px solid var(--user-border);
  border-bottom: 1px solid var(--user-border);
}

.voice-delivery-facts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;

  article {
    min-width: 0;
    padding: 14px;
    border: 1px solid var(--user-border);
    border-radius: 6px;
    background: var(--user-surface-muted);
  }

  span,
  p {
    color: var(--user-text-muted);
  }

  strong {
    display: block;
    margin-top: 6px;
    font-size: 18px;
  }

  p {
    margin: 6px 0 0;
    line-height: 1.5;
  }
}

.report-feedback-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.target-job-alignment {
  margin-top: 18px;
  padding: 18px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface-muted);
}

.alignment-card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.alignment-card {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);

  span,
  strong {
    display: block;
  }

  span {
    color: var(--user-primary);
    font-size: 12px;
    font-weight: 800;
  }

  strong {
    margin: 8px 0 10px;
    color: var(--user-text);
    font-size: 15px;
    line-height: 1.4;
    word-break: break-word;
  }
}

.missing-skill-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.missing-skill-item {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--user-primary-border);
  border-radius: 8px;
  background: var(--user-surface);

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  strong {
    min-width: 0;
    color: var(--user-text);
    font-size: 14px;
    word-break: break-word;
  }

  p {
    margin: 10px 0 0;
    color: var(--user-text-muted);
    line-height: 1.7;
  }

  ul {
    margin: 10px 0 0;
    padding-left: 18px;
    color: var(--user-text-secondary);
    line-height: 1.7;
  }
}

.alignment-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.dimension-section {
  margin-top: 20px;
}

.coach-next {
  margin-top: 18px;
  padding: 18px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface-muted);
}

.next-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  article {
    padding: 14px;
    border: 1px solid var(--user-border);
    border-radius: 8px;
    background: var(--user-surface);
  }

  span {
    color: var(--user-primary);
    font-size: 12px;
    font-weight: 800;
  }

  strong,
  p {
    display: block;
    margin: 0;
  }

  strong {
    margin-top: 8px;
    color: var(--user-text);
    font-size: 15px;
  }

  p {
    margin-top: 8px;
    color: var(--user-text-muted);
    line-height: 1.6;
  }
}

.section-head {
  margin-bottom: 16px;

  h2 {
    margin: 0;
    font-size: 18px;
  }

  p {
    margin: 6px 0 0;
    color: var(--user-text-muted);
    font-size: 13px;
    line-height: 1.6;
  }
}

.analysis-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.analysis-card {
  padding: 18px;

  &.wide {
    grid-column: 1 / -1;
  }
}

.qa-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.qa-item {
  padding: 16px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface-muted);
}

.qa-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;

  div {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  span {
    color: var(--user-primary);
    font-weight: 700;
  }
}

.qa-block {
  padding: 12px 0;
  border-top: 1px solid var(--user-border);

  label {
    display: block;
    margin-bottom: 8px;
    color: var(--user-text-muted);
    font-size: 12px;
  }

  p {
    margin: 0;
    color: var(--user-text);
    line-height: 1.7;
    white-space: pre-wrap;
  }
}

.action-zone {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;

  h2 {
    margin: 0 0 8px;
    font-size: 18px;
  }

  p {
    margin: 0;
    color: var(--user-text-muted);
  }
}

@media (max-width: 1080px) {
  .overview-grid,
  .report-hero-grid,
  .analysis-grid,
  .next-grid,
  .next-action-grid,
  .knowledge-candidate-grid,
  .report-professional-strip,
  .stage-report-content,
  .alignment-card-grid,
  .missing-skill-list {
    grid-template-columns: 1fr 1fr;
  }

  .voice-delivery-facts {
    grid-template-columns: 1fr 1fr;
  }

  .score-hero {
    grid-column: 1 / -1;
  }

  .action-zone {
    align-items: flex-start;
    flex-direction: column;
  }

  .action-buttons {
    justify-content: flex-start;
  }
}

@media (max-width: 760px) {
  .report-top {
    flex-direction: column;
  }

  .report-actions {
    justify-content: flex-start;
  }

  .overview-grid,
  .report-hero-grid,
  .analysis-grid,
  .next-grid,
  .next-action-grid,
  .knowledge-candidate-grid,
  .report-professional-strip,
  .stage-report-content,
  .alignment-card-grid,
  .missing-skill-list {
    grid-template-columns: 1fr;
  }

  .next-action-card {
    flex-direction: column;

    .el-button {
      width: 100%;
    }
  }

  .knowledge-candidate-card {
    flex-direction: column;

    .el-button {
      width: 100%;
    }
  }

  .recommended-training-callout {
    flex-direction: column;
    align-items: stretch;

    .el-button {
      width: 100%;
    }
  }

  .alignment-actions .el-button {
    width: 100%;
  }

  .stage-report-card header {
    flex-direction: column;
  }
}


@media (max-width: 720px) {
  .page-hero,
  .history-hero,
  .detail-hero,
  .report-top,
  .room-topbar,
  .notification-hero,
  .create-hero {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-actions,
  .report-actions,
  .topbar-actions,
  .card-actions,
  .filter-bar,
  .notification-toolbar {
    justify-content: flex-start;
  }
}

/* Compact report workspace */
.interview-report {
  gap: 14px;
  min-width: 0;
  color: var(--user-text);
}

.report-top {
  gap: 16px;
  padding: 16px 18px;
  border-color: var(--user-border);
  background: var(--user-surface);

  h1 {
    margin: 6px 0;
    font-size: 24px;
  }

  p {
    max-width: 68ch;
    color: var(--user-text-muted);
    font-size: 13px;
    line-height: 1.55;
  }
}

.eyebrow,
.panel-kicker,
.state-eyebrow {
  color: var(--user-primary);
}

.report-actions {
  max-width: 620px;
  justify-content: flex-end;
}

.content-card,
.analysis-card {
  min-width: 0;
  border-color: var(--user-border);
  background: var(--user-surface);
  box-shadow: none;
}

.content-card__body {
  padding: 14px 16px;
}

.report-hero-grid {
  grid-template-columns: minmax(160px, 0.55fr) minmax(0, 1fr) minmax(240px, 0.85fr);
  gap: 0;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-sm);
  background: var(--user-surface-muted);
  overflow: hidden;
}

.report-score-panel,
.report-summary-panel,
.report-action-panel {
  min-width: 0;
  padding: 14px;
  border: 0;
  border-right: 1px solid var(--user-border);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.report-action-panel {
  border-right: 0;
}

.score-value {
  margin-top: 4px;
  font-size: 42px;
}

.report-summary-panel h2,
.report-action-panel h2 {
  margin: 5px 0;
  font-size: 18px;
}

.report-summary-panel p,
.report-action-panel p {
  line-height: 1.5;
}

.evidence-strip,
.primary-next-action {
  margin-top: 10px;
  padding: 10px;
  border-color: var(--user-border);
  background: var(--user-surface);
}

.report-support-strip,
.report-professional-strip,
.overview-grid {
  gap: 0;
  margin-top: 12px;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-sm);
  background: var(--user-surface-muted);
  overflow: hidden;
}

.report-support-strip span,
.report-professional-strip article,
.overview-card {
  min-width: 0;
  padding: 9px 11px;
  border: 0;
  border-right: 1px solid var(--user-border);
  border-radius: 0;
  background: transparent;
}

.report-support-strip span:last-child,
.report-professional-strip article:last-child,
.overview-card:last-child {
  border-right: 0;
}

.report-professional-strip article strong,
.overview-card strong {
  margin-top: 3px;
  font-size: 15px;
}

.score-source,
.remediation-guidance {
  margin: 12px 0 0;
}

.report-trust-strip {
  margin-top: 10px;
}

.voice-delivery-report {
  gap: 10px;
  margin-top: 12px;
  padding: 12px 0;
  border-color: var(--user-border);
}

.voice-delivery-facts {
  gap: 0;
  border-top: 1px solid var(--user-border);
  border-bottom: 1px solid var(--user-border);

  article {
    padding: 9px 11px;
    border: 0;
    border-right: 1px solid var(--user-border);
    border-radius: 0;
    background: transparent;

    &:last-child {
      border-right: 0;
    }
  }

  span,
  p {
    color: var(--user-text-muted);
  }

  strong {
    margin-top: 3px;
    color: var(--user-text);
    font-size: 16px;
  }
}

.target-job-alignment,
.next-action-section,
.knowledge-candidate-section,
.coach-next,
.dimension-section {
  margin-top: 14px;
  padding: 14px 0 0;
  border: 0;
  border-top: 1px solid var(--user-border);
  border-radius: 0;
  background: transparent;
}

.alignment-card-grid,
.next-grid {
  gap: 0;
  border-top: 1px solid var(--user-border);
  border-bottom: 1px solid var(--user-border);
}

.alignment-card,
.next-grid article {
  padding: 10px 12px;
  border: 0;
  border-right: 1px solid var(--user-border);
  border-radius: 0;
  background: transparent;

  &:last-child {
    border-right: 0;
  }
}

.missing-skill-list,
.next-action-grid,
.knowledge-candidate-grid,
.recommended-list,
.stage-report-list,
.qa-list {
  gap: 0;
  border-top: 1px solid var(--user-border);
}

.missing-skill-item,
.next-action-card,
.knowledge-candidate-card,
.recommended-item,
.stage-report-card,
.qa-item {
  min-width: 0;
  padding: 11px 0;
  border: 0;
  border-bottom: 1px solid var(--user-border);
  border-radius: 0;
  background: transparent;
  box-shadow: none;

  &:last-child {
    border-bottom: 0;
  }
}

.next-action-card,
.knowledge-candidate-card {
  align-items: center;
}

.recommended-training-callout {
  padding: 12px;
  border-color: var(--user-primary-border);
  background: var(--user-surface-tint);
}

.next-action-empty {
  padding: 12px;
  border-color: var(--user-border);
  background: var(--user-surface-muted);
}

.section-head {
  margin-bottom: 10px;

  h2 {
    font-size: 17px;
  }

  p {
    margin-top: 3px;
    color: var(--user-text-muted);
    line-height: 1.5;
  }
}

.analysis-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-sm);
  background: var(--user-surface);
  overflow: hidden;
}

.analysis-card {
  padding: 14px 16px;
  border: 0;
  border-right: 1px solid var(--user-border);
  border-bottom: 1px solid var(--user-border);
  border-radius: 0;
  background: transparent;

  &:nth-child(2n) {
    border-right: 0;
  }

  &.wide {
    grid-column: 1 / -1;
    border-right: 0;
  }

  &:last-child {
    border-bottom: 0;
  }
}

.stage-report-card header {
  align-items: center;
}

.stage-score-pill {
  border-color: var(--user-border);
  background: var(--user-surface-muted);
}

.stage-report-content {
  gap: 0;
  margin-top: 10px;
  border-top: 1px solid var(--user-border);
  border-bottom: 1px solid var(--user-border);
}

.stage-copy {
  padding: 10px;
  border: 0;
  border-right: 1px solid var(--user-border);
  border-radius: 0;
  background: transparent;

  &:last-child {
    border-right: 0;
  }
}

.qa-head {
  margin-bottom: 8px;
}

.qa-block {
  padding: 9px 0;
  border-top-color: var(--user-border);
}

.generating-panel,
.failed-panel {
  padding: 18px;
}

.task-stage-list {
  gap: 0;
  border-top: 1px solid var(--user-border);
  border-bottom: 1px solid var(--user-border);
}

.task-stage-item {
  padding: 10px;
  border: 0;
  border-right: 1px solid var(--user-border);
  border-radius: 0;
  background: transparent;

  &:last-child {
    border-right: 0;
  }
}

.action-zone {
  gap: 14px;
}

@media (max-width: 1080px) {
  .report-hero-grid {
    grid-template-columns: 1fr 1fr;
  }

  .report-action-panel {
    grid-column: 1 / -1;
    border-top: 1px solid var(--user-border);
  }

  .report-summary-panel {
    border-right: 0;
  }

  .voice-delivery-facts,
  .report-professional-strip,
  .overview-grid,
  .alignment-card-grid,
  .next-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .voice-delivery-facts article,
  .report-professional-strip article,
  .overview-card,
  .alignment-card,
  .next-grid article {
    border-right: 1px solid var(--user-border);
    border-bottom: 1px solid var(--user-border);
  }

  .voice-delivery-facts article:nth-child(2n),
  .report-professional-strip article:nth-child(2n),
  .overview-card:nth-child(2n),
  .alignment-card:nth-child(2n),
  .next-grid article:nth-child(2n) {
    border-right: 0;
  }
}

@media (max-width: 760px) {
  .report-top {
    padding: 14px;
  }

  .report-actions {
    max-width: none;
  }

  .report-actions :deep(.el-button),
  .report-actions :deep(.el-dropdown) {
    width: 100%;
    margin-left: 0;
  }

  .report-hero-grid,
  .analysis-grid,
  .voice-delivery-facts,
  .report-support-strip,
  .report-professional-strip,
  .overview-grid,
  .alignment-card-grid,
  .next-grid,
  .stage-report-content,
  .task-stage-list {
    grid-template-columns: 1fr;
  }

  .report-score-panel,
  .report-summary-panel,
  .report-action-panel,
  .voice-delivery-facts article,
  .report-support-strip span,
  .report-professional-strip article,
  .overview-card,
  .alignment-card,
  .next-grid article,
  .stage-copy,
  .task-stage-item {
    border-right: 0;
    border-bottom: 1px solid var(--user-border);
  }

  .report-action-panel,
  .voice-delivery-facts article:last-child,
  .report-support-strip span:last-child,
  .report-professional-strip article:last-child,
  .overview-card:last-child,
  .alignment-card:last-child,
  .next-grid article:last-child,
  .stage-copy:last-child,
  .task-stage-item:last-child {
    border-bottom: 0;
  }

  .analysis-card,
  .analysis-card:nth-child(2n) {
    grid-column: auto;
    border-right: 0;
    border-bottom: 1px solid var(--user-border);
  }

  .analysis-card:last-child {
    border-bottom: 0;
  }

  .next-action-card,
  .knowledge-candidate-card,
  .action-zone {
    align-items: stretch;
    flex-direction: column;
  }
}

// ---- 通关结算（游戏化增量样式，暗色霓虹） ----
.settle-banner {
  display: grid;
  grid-template-columns: auto 1fr 1fr;
  gap: 22px;
  align-items: center;
  margin-bottom: 16px;
  padding: 18px 22px;
  border-radius: 16px;
  border: 1px solid rgba(247, 144, 9, 0.35);
  background:
    radial-gradient(420px 160px at 8% 0%, rgba(247, 144, 9, 0.14), transparent 65%),
    rgba(2, 6, 23, 0.55);
}

.settle-banner__left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.settle-banner__emoji {
  font-size: 40px;
}

.settle-banner__kicker {
  font-size: 11px;
  font-weight: 800;
  color: #f7b955;
}

.settle-banner__score {
  display: block;
  margin-top: 2px;
  font-size: 34px;
  font-weight: 900;
  letter-spacing: -0.5px;
  color: #f8fafc;

  small {
    font-size: 13px;
    font-weight: 700;
    color: rgba(203, 213, 225, 0.7);
  }
}

.settle-banner__xp {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.settle-banner__xp-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: rgba(203, 213, 225, 0.75);

  b {
    color: #f7b955;
    font-size: 12.5px;
  }

  &.is-total {
    padding-top: 6px;
    border-top: 1px dashed rgba(148, 163, 184, 0.25);
    font-weight: 800;
    color: #e5edf8;

    b {
      font-size: 14px;
      color: #a3e635;
    }
  }
}

.settle-banner__improve {
  padding: 12px 15px;
  border-radius: 12px;
  background: rgba(148, 163, 184, 0.08);

  > span {
    font-size: 11px;
    font-weight: 800;
    color: #b3a1ff;
  }

  ol {
    margin: 7px 0 0;
    padding-left: 17px;
    font-size: 12px;
    line-height: 1.65;
    color: #e5edf8;
  }
}

@media (max-width: 900px) {
  .settle-banner {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}

// 方向 D · 面试结算。正式评分、证据与导出仍保留；XP 仅作为独立激励层。
.arena-report {
  width: min(1060px, 100%);
  margin: 0 auto;
  padding: 28px 24px 46px;
  gap: 16px;

  .report-top,
  .analysis-card,
  .content-card {
    border: 1.5px solid var(--arena-line);
    border-radius: var(--arena-radius-card);
    background: #ffffff;
    box-shadow: 0 2px 4px rgba(21, 33, 27, 0.04);
  }

  .report-top {
    border-color: #b9e7cd;
    background: linear-gradient(135deg, #f0fbf4, #ffffff 72%);

    h1 {
      font-size: 28px;
      font-weight: 900;
    }
  }

  .eyebrow {
    color: var(--arena-grn-d);
  }

  .settle-banner {
    border: 1.5px solid #f3ddc0;
    border-radius: var(--arena-radius-card);
    background: linear-gradient(135deg, #fff7ec, #ffffff 72%);
    box-shadow: 0 2px 4px rgba(21, 33, 27, 0.04);
  }

  .settle-banner__kicker,
  .settle-banner__xp-row b {
    color: #b4560a;
  }

  .settle-banner__score,
  .settle-banner__xp-row,
  .settle-banner__xp-row.is-total,
  .settle-banner__improve ol {
    color: var(--arena-ink);
  }

  .settle-banner__score small,
  .settle-banner__xp-row {
    color: var(--arena-sub);
  }

  .settle-banner__xp-row.is-total {
    border-color: #f3ddc0;

    b {
      color: var(--arena-grn-d);
    }
  }

  .settle-banner__improve {
    background: var(--arena-vio-soft);

    > span {
      color: var(--arena-vio);
    }
  }

  .report-hero-grid,
  .report-support-strip,
  .report-professional-strip,
  .overview-grid,
  .voice-delivery-facts,
  .next-grid,
  .alignment-card-grid {
    border-color: var(--arena-line);
  }

  .report-score-panel,
  .report-summary-panel,
  .report-action-panel,
  .voice-delivery-facts article,
  .report-professional-strip article,
  .overview-card,
  .alignment-card,
  .next-grid article,
  .stage-report-card,
  .stage-copy,
  .next-action-card,
  .knowledge-candidate-card,
  .recommended-item {
    border-color: var(--arena-line);
    background: #ffffff;
  }

  .report-score-panel {
    background: linear-gradient(135deg, #f0fbf4, #ffffff 72%);
  }

  .report-action-panel,
  .recommended-training-callout {
    border-color: #b9e7cd;
    background: #f5fcf7;
  }

  .knowledge-candidate-card {
    border-color: #d7ccff;
    background: linear-gradient(135deg, var(--arena-vio-soft), #ffffff 75%);
  }

  .stage-score-pill {
    border-radius: 13px;
    background: var(--arena-grn-soft);

    strong {
      color: var(--arena-grn-d);
    }
  }

  :deep(.el-button--primary) {
    border-color: var(--arena-grn);
    background: var(--arena-grn);
    box-shadow: 0 4px 0 var(--arena-grn-d);
    font-weight: 800;
  }
}

@media (max-width: 760px) {
  .arena-report {
    padding: 16px 14px calc(28px + var(--user-mobile-nav-height, 0px));
  }
}
</style>
