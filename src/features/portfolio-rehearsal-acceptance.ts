import type {
  PortfolioRehearsalAcceptanceMatrix,
  PortfolioRehearsalStaticSelfCheck
} from '@/types/portfolioRehearsal'

const rawSensitivePolicy = 'NO_RAW_SENSITIVE_CONTENT' as const

export const portfolioRehearsalAcceptanceMatrix = {
  matrixKey: 'codecoachai-v4-stage-7-final-acceptance',
  version: 'V4_STAGE_7_ACCEPTANCE_STATIC_V1',
  title: 'CodeCoachAI V4 阶段七最终验收矩阵',
  scope: '覆盖 V4 MVP/P1/P2 能力，用于作品集排练与最终演示收口前的静态验收对齐。',
  acceptanceBoundary: '本矩阵只描述静态可确认项与最终运行验收确认项，不要求本阶段启动服务验收。',
  exclusions: [
    '不启动前端或后端服务',
    '不新增或运行单元测试',
    '不执行真实 AI 调用',
    '不运行浏览器 E2E',
    '不暴露 prompt、回答正文、简历正文、日志 raw 字段等敏感原文'
  ],
  rawSensitivePolicy,
  stages: [
    {
      stageNumber: 1,
      stageKey: 'trusted-ai-result-layer',
      title: '阶段 1：统一 AI 可信结果层',
      acceptanceGoal: '所有 AI 建议都能解释来源、可信边界、降级状态与下一步动作，演示时不把模型输出当成不可追溯结论。',
      capabilities: [
        {
          id: 'stage-1-mvp-trusted-suggestion-schema',
          priority: 'MVP',
          title: '统一可信建议结构',
          userValue: '用户看到建议时能同时看到依据、可信状态、降级原因和行动入口。',
          staticConfirmations: [
            {
              id: 'static-schema-version',
              title: '可信结果版本可确认',
              description: '类型层存在 schemaVersion、resultSource、trustStatus、fallback、qualityGate、evidenceSources、trace 等字段。',
              mode: 'STATIC_CONFIRMABLE'
            },
            {
              id: 'static-source-label',
              title: '来源类型可枚举',
              description: '建议来源覆盖岗位、简历、匹配报告、项目证据、面试报告、Agent、知识库与长期记忆等来源。',
              mode: 'STATIC_CONFIRMABLE'
            }
          ],
          runtimeConfirmations: [
            {
              id: 'runtime-real-suggestion-boundary',
              title: '真实建议可信边界展示',
              description: '最终运行验收时确认真实页面能展示来源、证据摘要、可信状态、降级说明与下一步动作。',
              mode: 'FINAL_RUNTIME_CONFIRMATION'
            }
          ],
          demoEvidence: ['Suggestion VO 字段', '职业行动队列信任边界', '实验复盘 qualityGate'],
          rawSensitivePolicy
        },
        {
          id: 'stage-1-p1-quality-gate',
          priority: 'P1',
          title: '质量门禁与弱结论约束',
          userValue: '样本不足或证据不足时，系统只给弱观察和补证据动作，避免过度归因。',
          staticConfirmations: [
            {
              id: 'static-quality-gate-fields',
              title: '质量门禁字段可确认',
              description: '静态类型支持 gateStatus、suggestionStrength、reasons、blockedConclusions、sampleSize 与 minSampleSize。',
              mode: 'STATIC_CONFIRMABLE'
            }
          ],
          runtimeConfirmations: [
            {
              id: 'runtime-low-sample-blocked',
              title: '低样本运行阻断确认',
              description: '最终运行验收时确认低样本实验不会生成强结论，只展示事实、弱观察和补样本行动。',
              mode: 'FINAL_RUNTIME_CONFIRMATION'
            }
          ],
          demoEvidence: ['实验样本边界', 'blockedConclusions', 'weakObservations'],
          rawSensitivePolicy
        },
        {
          id: 'stage-1-p2-feedback-loop',
          priority: 'P2',
          title: '建议反馈闭环',
          userValue: '用户可对建议有效性、难度、相关性或完成状态反馈，为后续推荐调优留接口。',
          staticConfirmations: [
            {
              id: 'static-feedback-state',
              title: '反馈状态结构可确认',
              description: '静态类型支持 submitted、feedbackType、comment 与 updatedAt，且 comment 不进入演示矩阵原文。',
              mode: 'STATIC_CONFIRMABLE'
            }
          ],
          runtimeConfirmations: [
            {
              id: 'runtime-feedback-submit',
              title: '反馈提交链路确认',
              description: '最终运行验收时确认反馈入口、提交状态和后续建议调整链路可用。',
              mode: 'FINAL_RUNTIME_CONFIRMATION'
            }
          ],
          demoEvidence: ['SuggestionFeedbackStateVO', 'AI_RESULT_FEEDBACK 来源类型'],
          rawSensitivePolicy
        }
      ]
    },
    {
      stageNumber: 2,
      stageKey: 'career-command-center-action-queue',
      title: '阶段 2：求职作战指挥台与行动队列',
      acceptanceGoal: '用户能从一个指挥台看到当前求职风险、关键产物和可执行行动，并知道每个行动为什么被推荐。',
      capabilities: [
        {
          id: 'stage-2-mvp-action-queue',
          priority: 'MVP',
          title: '今日行动队列',
          userValue: '把 Agent 任务转为可执行行动，按可信度、状态、优先级和预计耗时排序。',
          staticConfirmations: [
            {
              id: 'static-action-item-fields',
              title: '行动项字段可确认',
              description: '静态结构支持状态、优先级、预计耗时、来源、证据、trace、质量门禁、降级与 actionUrl。',
              mode: 'STATIC_CONFIRMABLE'
            },
            {
              id: 'static-promotion-rule',
              title: '行动提升规则可确认',
              description: '只有未关闭、非降级、非低优先级且具备有效证据的行动可被提升。',
              mode: 'STATIC_CONFIRMABLE'
            }
          ],
          runtimeConfirmations: [
            {
              id: 'runtime-dashboard-actions',
              title: '指挥台行动展示确认',
              description: '最终运行验收时确认作战指挥台能展示今日关键行动、可信边界与跳转入口。',
              mode: 'FINAL_RUNTIME_CONFIRMATION'
            }
          ],
          demoEvidence: ['CareerActionItemVO', 'buildCareerActionQueue', 'ActionQueueSummaryVO'],
          rawSensitivePolicy
        },
        {
          id: 'stage-2-p1-risk-signals',
          priority: 'P1',
          title: '求职风险信号',
          userValue: '缺少简历、目标岗位、今日计划、可信报告或部分数据失败时，用户能看到明确风险提示。',
          staticConfirmations: [
            {
              id: 'static-risk-cases',
              title: '风险类型可确认',
              description: '静态规则覆盖缺简历、缺目标岗位、缺今日计划、报告需复核和部分数据不可用。',
              mode: 'STATIC_CONFIRMABLE'
            }
          ],
          runtimeConfirmations: [
            {
              id: 'runtime-risk-rendering',
              title: '风险卡片运行确认',
              description: '最终运行验收时确认不同数据缺口会出现在指挥台风险区域，且不生成强判断。',
              mode: 'FINAL_RUNTIME_CONFIRMATION'
            }
          ],
          demoEvidence: ['CareerRiskSignalVO', 'buildCareerRiskSignals'],
          rawSensitivePolicy
        },
        {
          id: 'stage-2-p2-recent-artifacts',
          priority: 'P2',
          title: '近期关键产物汇总',
          userValue: '用户可快速回到最新 JD 匹配报告、面试报告和 Agent 今日计划。',
          staticConfirmations: [
            {
              id: 'static-artifact-links',
              title: '产物链接规则可确认',
              description: '静态逻辑支持从报告、面试和 Agent 计划生成最多三个关键产物入口。',
              mode: 'STATIC_CONFIRMABLE'
            }
          ],
          runtimeConfirmations: [
            {
              id: 'runtime-artifact-navigation',
              title: '产物导航运行确认',
              description: '最终运行验收时确认产物入口能跳转到对应业务页面，并显示可信状态。',
              mode: 'FINAL_RUNTIME_CONFIRMATION'
            }
          ],
          demoEvidence: ['CareerArtifactVO', 'buildCareerRecentArtifacts'],
          rawSensitivePolicy
        }
      ]
    },
    {
      stageNumber: 3,
      stageKey: 'application-funnel-experiment-review',
      title: '阶段 3：投递漏斗与求职实验复盘',
      acceptanceGoal: '把投递、反馈、面试和 offer 结果组织成可复盘实验，同时清楚标注样本边界。',
      capabilities: [
        {
          id: 'stage-3-mvp-experiment-metrics',
          priority: 'MVP',
          title: '投递漏斗指标',
          userValue: '用户能看到投递数、反馈数、面试邀约、已完成面试、offer、拒绝和样本量。',
          staticConfirmations: [
            {
              id: 'static-funnel-metrics',
              title: '漏斗指标字段可确认',
              description: '静态类型覆盖 applicationCount、feedbackCount、interviewInviteCount、interviewCompletedCount、offerCount 与 rejectedCount。',
              mode: 'STATIC_CONFIRMABLE'
            }
          ],
          runtimeConfirmations: [
            {
              id: 'runtime-funnel-values',
              title: '真实漏斗数值确认',
              description: '最终运行验收时确认投递记录变化会反映到实验指标和复盘页面。',
              mode: 'FINAL_RUNTIME_CONFIRMATION'
            }
          ],
          demoEvidence: ['JobSearchExperimentMetricsVO', 'JobSearchExperimentDetailVO'],
          rawSensitivePolicy
        },
        {
          id: 'stage-3-p1-evidence-coverage',
          priority: 'P1',
          title: '实验证据覆盖',
          userValue: '复盘前能确认是否绑定简历版本、目标岗位、JD、匹配报告、投递记录和项目证据。',
          staticConfirmations: [
            {
              id: 'static-evidence-groups',
              title: '证据分组可确认',
              description: '静态分组区分必需证据与可选证据，并能输出 covered、missingTypes 与 summaries。',
              mode: 'STATIC_CONFIRMABLE'
            }
          ],
          runtimeConfirmations: [
            {
              id: 'runtime-evidence-binding',
              title: '证据绑定运行确认',
              description: '最终运行验收时确认新增或移除实验关联后，覆盖状态同步更新。',
              mode: 'FINAL_RUNTIME_CONFIRMATION'
            }
          ],
          demoEvidence: ['jobExperimentEvidenceGroups', 'buildJobExperimentEvidenceCoverage'],
          rawSensitivePolicy
        },
        {
          id: 'stage-3-p2-review-dsl',
          priority: 'P2',
          title: '复盘 DSL 与下一步策略',
          userValue: '复盘输出被拆成事实、限制、弱观察、不可支持结论、假设和下一步动作。',
          staticConfirmations: [
            {
              id: 'static-review-dsl',
              title: '复盘 DSL 字段可确认',
              description: '静态类型支持 facts、limits、weakObservations、unsupportedConclusions、hypotheses、nextActions 与 evidenceSources。',
              mode: 'STATIC_CONFIRMABLE'
            }
          ],
          runtimeConfirmations: [
            {
              id: 'runtime-review-display',
              title: '复盘展示运行确认',
              description: '最终运行验收时确认复盘页面按 DSL 展示，且低样本不会显示因果结论。',
              mode: 'FINAL_RUNTIME_CONFIRMATION'
            }
          ],
          demoEvidence: ['JobExperimentReviewDslVO', 'buildJobExperimentReviewDisplayModel'],
          rawSensitivePolicy
        }
      ]
    },
    {
      stageNumber: 4,
      stageKey: 'agent-multi-day-loop-review',
      title: '阶段 4：Agent 多日闭环与阶段性复盘',
      acceptanceGoal: 'Agent 能把多日任务、执行状态、复盘摘要和下一步建议串起来，形成持续求职推进闭环。',
      capabilities: [
        {
          id: 'stage-4-mvp-daily-plan',
          priority: 'MVP',
          title: '今日计划与任务执行',
          userValue: '用户每天看到 Agent 计划、任务列表、状态变化和完成回流。',
          staticConfirmations: [
            {
              id: 'static-agent-task-to-action',
              title: 'Agent 任务转行动可确认',
              description: '静态逻辑能把 AgentTask 转成 CareerActionItem，并保留来源、trace、证据和完成状态。',
              mode: 'STATIC_CONFIRMABLE'
            }
          ],
          runtimeConfirmations: [
            {
              id: 'runtime-agent-today',
              title: '今日 Agent 页面运行确认',
              description: '最终运行验收时确认今日计划生成、任务状态推进和行动队列联动可用。',
              mode: 'FINAL_RUNTIME_CONFIRMATION'
            }
          ],
          demoEvidence: ['AgentTaskVO', 'DailyPlanVO', 'toCareerActionItemFromAgentTask'],
          rawSensitivePolicy
        },
        {
          id: 'stage-4-p1-multi-day-review',
          priority: 'P1',
          title: '多日阶段复盘',
          userValue: '系统能基于多日任务完成、投递和训练结果形成阶段性总结与下一步策略。',
          staticConfirmations: [
            {
              id: 'static-review-summary-fields',
              title: '复盘摘要字段可确认',
              description: '静态结构为 Agent 任务保留 reviewSummary、evidenceSummary、completedAt、skippedAt 与 skipReason 等复盘所需字段。',
              mode: 'STATIC_CONFIRMABLE'
            }
          ],
          runtimeConfirmations: [
            {
              id: 'runtime-periodic-review',
              title: '阶段复盘运行确认',
              description: '最终运行验收时确认跨天任务和求职事件能进入阶段复盘，不展示敏感原文。',
              mode: 'FINAL_RUNTIME_CONFIRMATION'
            }
          ],
          demoEvidence: ['Agent 运行记录', '任务复盘摘要', '求职实验复盘联动'],
          rawSensitivePolicy
        },
        {
          id: 'stage-4-p2-agent-governance',
          priority: 'P2',
          title: 'Agent 运行治理入口',
          userValue: '运营或管理员可追溯 Agent run、任务、异步任务和 AI 调用关系。',
          staticConfirmations: [
            {
              id: 'static-agent-trace-link',
              title: 'Agent trace 链接可确认',
              description: '建议 trace 支持 agentRunId、traceId、aiCallLogId、promptVersionId 与 asyncTaskId。',
              mode: 'STATIC_CONFIRMABLE'
            }
          ],
          runtimeConfirmations: [
            {
              id: 'runtime-agent-run-admin',
              title: 'Agent 治理页面运行确认',
              description: '最终运行验收时确认管理员能从 Agent run 追到任务、AI 调用和异步任务状态。',
              mode: 'FINAL_RUNTIME_CONFIRMATION'
            }
          ],
          demoEvidence: ['SuggestionTraceVO', 'TraceCockpit agentRunId 查询'],
          rawSensitivePolicy
        }
      ]
    },
    {
      stageNumber: 5,
      stageKey: 'knowledge-base-long-term-memory',
      title: '阶段 5：知识库与长期记忆',
      acceptanceGoal: '用户的求职材料、训练反馈和长期偏好能沉淀为可引用证据，但演示层只暴露摘要、引用和状态。',
      capabilities: [
        {
          id: 'stage-5-mvp-knowledge-evidence',
          priority: 'MVP',
          title: '知识库证据引用',
          userValue: 'AI 建议可以引用知识文档或片段，但只展示安全摘要、引用状态和相关度。',
          staticConfirmations: [
            {
              id: 'static-knowledge-source-types',
              title: '知识来源类型可确认',
              description: '建议来源类型覆盖 KNOWLEDGE_DOCUMENT、KNOWLEDGE_CHUNK 与 KNOWLEDGE_ASK。',
              mode: 'STATIC_CONFIRMABLE'
            },
            {
              id: 'static-citation-metadata',
              title: '引用元数据可确认',
              description: '证据 metadata 支持 documentId、chunkId、chunkIndex、score、citationValid 与 answerGrounded。',
              mode: 'STATIC_CONFIRMABLE'
            }
          ],
          runtimeConfirmations: [
            {
              id: 'runtime-knowledge-answer-grounding',
              title: '知识问答接地确认',
              description: '最终运行验收时确认知识问答使用引用和摘要展示，不泄露文档 raw 内容。',
              mode: 'FINAL_RUNTIME_CONFIRMATION'
            }
          ],
          demoEvidence: ['EvidenceSourceVO metadata', '知识库 sourceType'],
          rawSensitivePolicy
        },
        {
          id: 'stage-5-p1-long-term-memory',
          priority: 'P1',
          title: '长期记忆状态',
          userValue: '系统能记录用户偏好、目标、禁忌和历史反馈，并标注是否确认、启用或过期。',
          staticConfirmations: [
            {
              id: 'static-memory-metadata',
              title: '记忆元数据可确认',
              description: '证据 metadata 支持 memoryType、memoryStatus、confirmed、enabled、active、expiresAt 与 disabledReason。',
              mode: 'STATIC_CONFIRMABLE'
            }
          ],
          runtimeConfirmations: [
            {
              id: 'runtime-memory-usage',
              title: '记忆使用运行确认',
              description: '最终运行验收时确认建议会说明使用了哪些记忆摘要，以及记忆禁用或过期后的降级表现。',
              mode: 'FINAL_RUNTIME_CONFIRMATION'
            }
          ],
          demoEvidence: ['AGENT_MEMORY 来源类型', 'EvidenceSourceVO memory metadata'],
          rawSensitivePolicy
        },
        {
          id: 'stage-5-p2-memory-feedback',
          priority: 'P2',
          title: '记忆反馈与清理边界',
          userValue: '用户反馈可以更新长期记忆候选，同时保留禁用、删除、过期和低置信度状态。',
          staticConfirmations: [
            {
              id: 'static-memory-flags',
              title: '记忆清理标记可确认',
              description: 'metadata 支持 candidate、deleted、stale、lowConfidence、activeBlockedReason 等治理标记。',
              mode: 'STATIC_CONFIRMABLE'
            }
          ],
          runtimeConfirmations: [
            {
              id: 'runtime-memory-controls',
              title: '记忆治理运行确认',
              description: '最终运行验收时确认用户或治理入口能查看摘要级记忆状态并执行启停或清理动作。',
              mode: 'FINAL_RUNTIME_CONFIRMATION'
            }
          ],
          demoEvidence: ['AI_RESULT_FEEDBACK', 'AGENT_MEMORY metadata'],
          rawSensitivePolicy
        }
      ]
    },
    {
      stageNumber: 6,
      stageKey: 'trace-cockpit-ai-governance',
      title: '阶段 6：TraceCockpit 与 AI 工程治理',
      acceptanceGoal: '运营和工程人员能用 TraceCockpit 追踪 AI 调用、Agent 运行和异步任务，并在权限边界内治理风险。',
      capabilities: [
        {
          id: 'stage-6-mvp-trace-cockpit',
          priority: 'MVP',
          title: 'TraceCockpit 联合查询',
          userValue: '可按 traceId、requestId、业务对象、Agent run、异步任务或时间窗口定位相关节点。',
          staticConfirmations: [
            {
              id: 'static-trace-query-types',
              title: '查询类型可确认',
              description: 'Trace 查询支持 auto、traceId、requestId、businessId、biz、userTime、agentRunId、asyncTaskId 与 messageId。',
              mode: 'STATIC_CONFIRMABLE'
            },
            {
              id: 'static-node-types',
              title: '节点类型可确认',
              description: 'Trace 节点覆盖 AI_CALL、AGENT_RUN、AGENT_TASK 与 ASYNC_TASK。',
              mode: 'STATIC_CONFIRMABLE'
            }
          ],
          runtimeConfirmations: [
            {
              id: 'runtime-trace-search',
              title: 'Trace 查询运行确认',
              description: '最终运行验收时确认输入有效线索后能返回概览、时间线、风险和治理建议。',
              mode: 'FINAL_RUNTIME_CONFIRMATION'
            }
          ],
          demoEvidence: ['TraceCockpitQuery', 'TraceNode', 'TraceCockpitResult'],
          rawSensitivePolicy
        },
        {
          id: 'stage-6-p1-risk-suggestions',
          priority: 'P1',
          title: 'AI 风险与治理建议',
          userValue: '高延迟、高 token、失败、fallback、弱关联和部分结果能被识别并给出治理动作。',
          staticConfirmations: [
            {
              id: 'static-trace-risk-types',
              title: 'Trace 风险类型可确认',
              description: '风险类型覆盖 AI_FAILURE、FALLBACK、HIGH_LATENCY、HIGH_TOKEN、ASYNC_TASK_FAILURE、AGENT_FAILURE、RAW_AVAILABLE、PARTIAL_RESULT 与 WEAK_ASSOCIATION。',
              mode: 'STATIC_CONFIRMABLE'
            },
            {
              id: 'static-governance-actions',
              title: '治理动作可确认',
              description: '治理动作覆盖查看日志、创建 Prompt 回归候选、检查模型路由、查看 Agent run、查看异步任务、查看重试预览和复核 raw 权限。',
              mode: 'STATIC_CONFIRMABLE'
            }
          ],
          runtimeConfirmations: [
            {
              id: 'runtime-risk-actions',
              title: '风险动作运行确认',
              description: '最终运行验收时确认风险项和治理建议能跳转到对应治理页面或候选创建入口。',
              mode: 'FINAL_RUNTIME_CONFIRMATION'
            }
          ],
          demoEvidence: ['TraceRisk', 'TraceGovernanceSuggestion'],
          rawSensitivePolicy
        },
        {
          id: 'stage-6-p2-raw-access-boundary',
          priority: 'P2',
          title: 'raw 字段权限边界',
          userValue: '即使底层记录了 raw 字段，默认演示也只显示摘要、hash、长度和权限状态。',
          staticConfirmations: [
            {
              id: 'static-raw-access-status',
              title: 'raw 访问状态可确认',
              description: 'TraceRawAccessStatus 明确 rawFieldsAvailable、rawFieldsIncluded、rawAccessPermission 与 requiredPermission。',
              mode: 'STATIC_CONFIRMABLE'
            },
            {
              id: 'static-overview-raw-excluded',
              title: '概览默认不含 raw 可确认',
              description: 'TraceOverview 将 rawFieldsIncluded 固定为 false，矩阵不包含任何 raw 敏感原文。',
              mode: 'STATIC_CONFIRMABLE'
            }
          ],
          runtimeConfirmations: [
            {
              id: 'runtime-raw-permission',
              title: 'raw 权限运行确认',
              description: '最终运行验收时确认无权限不展示 raw，有权限也需要明确申请或临时展示流程。',
              mode: 'FINAL_RUNTIME_CONFIRMATION'
            }
          ],
          demoEvidence: ['TraceRawAccessStatus', 'TracePreviewItem', 'TraceOverview.rawFieldsIncluded'],
          rawSensitivePolicy
        }
      ]
    },
    {
      stageNumber: 7,
      stageKey: 'portfolio-rehearsal-demo-closure',
      title: '阶段 7：作品集排练与演示收口',
      acceptanceGoal: '用一条可控演示故事线串起用户侧和治理侧能力，并在最终验收前明确哪些只能静态确认、哪些必须运行确认。',
      capabilities: [
        {
          id: 'stage-7-mvp-demo-storyline',
          priority: 'MVP',
          title: '作品集演示故事线',
          userValue: '演示者能按目标岗位、JD 匹配、项目证据、面试训练、能力图谱、实验复盘和 Agent 今日任务串讲。',
          staticConfirmations: [
            {
              id: 'static-required-user-demo-steps',
              title: '用户侧必演示步骤可确认',
              description: '静态清单覆盖 target-job、jd-match、project-evidence、interview-training、interview-report、ability-map、job-experiment-review 与 agent-today。',
              mode: 'STATIC_CONFIRMABLE'
            }
          ],
          runtimeConfirmations: [
            {
              id: 'runtime-user-storyline',
              title: '用户侧故事线运行确认',
              description: '最终运行验收时确认 demoFlag 数据能加载，所有用户侧步骤可进入并展示演示摘要。',
              mode: 'FINAL_RUNTIME_CONFIRMATION'
            }
          ],
          demoEvidence: ['requiredUserDemoSteps', 'PortfolioDemoStorylineVO.steps'],
          rawSensitivePolicy
        },
        {
          id: 'stage-7-p1-ops-storyline',
          priority: 'P1',
          title: '治理侧演示故事线',
          userValue: '演示者能从 Agent 运行、Prompt 模板、Prompt 回归、AI 日志、异步任务、指标字典和 AI 运营看板说明工程治理。',
          staticConfirmations: [
            {
              id: 'static-required-ops-demo-steps',
              title: '治理侧必演示步骤可确认',
              description: '静态清单覆盖 agent-runs、prompt-template、prompt-regression、ai-call-logs、async-tasks、metrics-dictionary 与 ai-ops-dashboard。',
              mode: 'STATIC_CONFIRMABLE'
            },
            {
              id: 'static-route-guard',
              title: '演示路由保护可确认',
              description: '演示路线要求 demoFlag=true，未知或未授权路径回落到作品集演示控制台。',
              mode: 'STATIC_CONFIRMABLE'
            }
          ],
          runtimeConfirmations: [
            {
              id: 'runtime-ops-storyline',
              title: '治理侧故事线运行确认',
              description: '最终运行验收时确认治理侧页面可按故事线进入，且 raw 敏感内容默认不可见。',
              mode: 'FINAL_RUNTIME_CONFIRMATION'
            }
          ],
          demoEvidence: ['requiredOpsDemoSteps', 'resolvePortfolioDemoRoute', 'safeStoryRoutes'],
          rawSensitivePolicy
        },
        {
          id: 'stage-7-p2-final-acceptance-matrix',
          priority: 'P2',
          title: '最终总体验收矩阵',
          userValue: '团队能清楚区分当前静态可确认成果与最终必须运行验证的事项，避免把静态验收误判为上线完成。',
          staticConfirmations: [
            {
              id: 'static-matrix-stage-coverage',
              title: '七阶段覆盖可确认',
              description: '本静态矩阵覆盖阶段 1 到阶段 7，每阶段包含 MVP、P1、P2 能力项。',
              mode: 'STATIC_CONFIRMABLE'
            },
            {
              id: 'static-confirmation-separation',
              title: '静态与运行验收分离可确认',
              description: '每个能力项分别列出 staticConfirmations 与 runtimeConfirmations。',
              mode: 'STATIC_CONFIRMABLE'
            }
          ],
          runtimeConfirmations: [
            {
              id: 'runtime-final-walkthrough',
              title: '最终总体验收走查',
              description: '最终运行验收时由人工按矩阵逐项确认页面、数据、权限、降级和演示故事线。',
              mode: 'FINAL_RUNTIME_CONFIRMATION'
            }
          ],
          demoEvidence: ['portfolioRehearsalAcceptanceMatrix', 'portfolioRehearsalStaticSelfCheck'],
          rawSensitivePolicy
        }
      ]
    }
  ]
} satisfies PortfolioRehearsalAcceptanceMatrix

export const portfolioRehearsalStaticSelfCheck = {
  fileBoundary: [
    'src/features/portfolio-rehearsal-acceptance.ts',
    'src/types/portfolioRehearsal.ts'
  ],
  noServiceStarted: true,
  noUnitTestAddedOrRun: true,
  noRealAiCall: true,
  noBrowserE2E: true,
  noRawSensitiveContent: true,
  coversStages: [1, 2, 3, 4, 5, 6, 7],
  coversPriorities: ['MVP', 'P1', 'P2'],
  separatesStaticAndRuntimeConfirmation: true
} satisfies PortfolioRehearsalStaticSelfCheck
