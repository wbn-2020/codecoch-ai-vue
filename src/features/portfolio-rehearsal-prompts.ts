import type {
  PortfolioRehearsalCapabilityMap,
  PortfolioRehearsalDisclosureRule,
  PortfolioRehearsalPromptCard,
  PortfolioRehearsalTalkTrack
} from '@/types/portfolioRehearsal'

export const portfolioRehearsalDisclosureRules: PortfolioRehearsalDisclosureRule[] = [
  {
    id: 'no-sensitive-source',
    title: '只讲脱敏摘要',
    description: '演示时只展示结论、状态、证据摘要和跳转入口，不展示用户隐私原文或底层生成内容。',
    protectedContent: [
      '底层提示词全文',
      '模型原始响应',
      '简历原文',
      '面试回答原文',
      '知识库正文',
      '长期记忆全文'
    ]
  },
  {
    id: 'no-overclaim',
    title: '不夸大真实能力',
    description: '只能把已接入页面、降级兜底、可信边界和待验收项分别讲清楚。',
    protectedContent: ['待发布后人工验收确认的端到端效果', '未经人工确认的自动化闭环', '无法在现场复现的 AI 结果']
  }
]

export const portfolioRehearsalTalkTracks: PortfolioRehearsalTalkTrack[] = [
  {
    id: 'problem-solved',
    title: '我解决了什么问题',
    audience: 'INTERVIEWER',
    status: 'READY_FOR_DEMO',
    statusLabel: '可作为演示口径',
    openingLine: 'CodeCoachAI V5 解决的是求职过程中“岗位准备分散、投递行动难闭环、AI 建议不可信”的问题。',
    keyPoints: [
      '把目标岗位、简历匹配、项目证据、面试训练、能力地图和今日行动串成一条求职准备链路。',
      '每个建议都尽量回到可解释来源，例如岗位、报告、项目证据或 Agent 任务，而不是只给一段泛泛建议。',
      '当数据不足、结果降级或页面不可用时，系统用状态和兜底入口提醒用户，不把弱结论包装成强推荐。'
    ],
    evidenceAnchors: [
      'Portfolio Demo 演示路线覆盖用户侧和运营侧步骤',
      '求职作战指挥台汇总 Agent 今日任务、可信建议和近期产物',
      '能力地图、项目证据、面试报告等页面提供可回看证据'
    ],
    trustBoundary: '这是一套演示讲述材料，不代表所有链路已通过发布后人工验收；现场以页面实际状态为准。'
  },
  {
    id: 'v5-core-loop',
    title: 'V5 的核心闭环是什么',
    audience: 'INTERVIEWER',
    status: 'ACCEPTANCE_REQUIRED',
    statusLabel: '待发布后人工验收确认',
    openingLine: 'V5 的核心闭环是“目标岗位 -> 投递包 -> 投递/面试 -> 复盘 -> Agent 行动 -> 可信追踪”。',
    keyPoints: [
      '目标输入来自岗位、简历和项目证据，系统先建立训练上下文。',
      '可信分析层把建议绑定到来源、质量门禁和追踪信息，避免只输出不可验证结论。',
      '行动生成落在今日任务、面试训练、项目补证和复盘入口，完成后再回流到能力地图和后续计划。'
    ],
    evidenceAnchors: [
      '简历与岗位匹配报告',
      '项目证据结构化材料',
      'Agent 今日任务和求职实验复盘',
      '能力地图训练状态'
    ],
    trustBoundary: '多页面闭环需要发布后人工验收确认；当前讲述只描述产品设计和已接入的静态演示证据。',
    fallbackLine: '如果现场链路未跑通，就切到 Phase 5.5 兜底演示，按静态路线讲清设计、边界和待验收项。'
  },
  {
    id: 'trusted-ai-layer',
    title: 'AI 可信结果层怎么保证可信',
    audience: 'REVIEWER',
    status: 'READY_FOR_DEMO',
    statusLabel: '可作为演示口径',
    openingLine: '我没有把 AI 输出当成天然可信，而是在结果外面加了来源、质量门禁、追踪和降级说明。',
    keyPoints: [
      '建议需要关联证据来源，例如岗位匹配、面试报告、Agent 任务或项目证据摘要。',
      '质量门禁区分强建议、弱观察、样本不足、兜底结果和阻塞状态。',
      '追踪信息用于说明一次建议从哪里来、经过什么判断、为什么可以或不可以推进。'
    ],
    evidenceAnchors: [
      '可信建议摘要包含 source、qualityGate、resultSource、trace 等字段',
      '求职作战指挥台会把 fallback、mock、disabled、stale 等状态降级展示',
      '运营侧 AI 日志和 Prompt 回归入口用于验收追踪能力'
    ],
    trustBoundary: '演示材料只呈现脱敏摘要，不展示底层提示词全文、模型原始响应或用户原始资料。'
  },
  {
    id: 'career-command-center',
    title: '求职作战指挥台怎么落地',
    audience: 'INTERVIEWER',
    status: 'READY_FOR_DEMO',
    statusLabel: '可作为演示口径',
    openingLine: '求职作战指挥台不是再造一个首页，而是把今天最该做的动作和可信边界收拢到一个操作面。',
    keyPoints: [
      '行动队列把 Agent 任务转成可执行条目，并按状态、优先级和证据强度排序。',
      '近期产物把最新岗位匹配、面试报告和 Agent 计划沉淀成可回看的材料入口。',
      '风险信号提醒用户补目标岗位、补简历、复核低可信报告或处理部分数据不可用。'
    ],
    evidenceAnchors: [
      'career-command-center feature 内的行动队列构建逻辑',
      '可信建议摘要和风险信号构建逻辑',
      'Agent 今日计划、简历匹配和面试报告的跳转入口'
    ],
    trustBoundary: '指挥台只聚合已有状态和建议摘要，不直接暴露用户原始输入。'
  },
  {
    id: 'agent-multi-day-loop',
    title: 'Agent 多日闭环怎么体现',
    audience: 'INTERVIEWER',
    status: 'ACCEPTANCE_REQUIRED',
    statusLabel: '待发布后人工验收确认',
    openingLine: '多日闭环的设计重点是让 Agent 不只给今天的一次性建议，而是能根据完成、跳过和阻塞持续调整。',
    keyPoints: [
      '今日任务保留状态、优先级、预估时间、来源和完成回流字段。',
      '完成、跳过、阻塞等结果可以作为下一次计划的上下文，避免每天从零开始。',
      '长期效果需要跨天运行数据验证，所以演示时只讲设计和已露出的状态字段。'
    ],
    evidenceAnchors: [
      'Agent 今日任务字段包含 status、completedAt、skippedAt、skipReason、blockedReason',
      '行动队列会过滤关闭状态并保留可执行任务',
      '求职实验复盘用于承接阶段性结果'
    ],
    trustBoundary: '跨天自动调整效果必须等待发布后人工验收确认，不能在演示中说成已经稳定上线。'
  },
  {
    id: 'knowledge-memory-governance',
    title: '知识库/长期记忆怎么治理',
    audience: 'REVIEWER',
    status: 'BOUNDARY_ONLY',
    statusLabel: '待发布后人工验收确认',
    openingLine: '知识库和长期记忆的演示口径是治理边界优先：能引用摘要和标签，但不能泄露正文和全文记忆。',
    keyPoints: [
      '只允许展示知识条目的分类、来源摘要、更新时间、是否可用于建议等治理信息。',
      '长期记忆适合用于偏好、目标和历史状态的摘要，不适合把完整原文直接带入展示。',
      '任何命中知识库或长期记忆的建议，都需要说明它只是证据之一，不能替代用户确认。'
    ],
    evidenceAnchors: [
      '演示材料中的敏感信息规则',
      '可信建议来源摘要',
      '待发布后人工验收确认的知识治理口径'
    ],
    trustBoundary: '当前静态收口未验证知识库/长期记忆端到端页面；相关讲法必须标记为待发布后人工验收确认。'
  },
  {
    id: 'trace-cockpit-engineering',
    title: 'TraceCockpit 怎么证明工程能力',
    audience: 'REVIEWER',
    status: 'ACCEPTANCE_REQUIRED',
    statusLabel: '待发布后人工验收确认',
    openingLine: 'TraceCockpit 的价值是把一次 AI 或 Agent 结果拆成可观测、可复盘、可回归的工程证据。',
    keyPoints: [
      '从用户侧结果可以回到来源、质量门禁和追踪标识，便于解释“为什么给这个建议”。',
      '从运营侧可以看 AI 调用、Prompt 模板、Prompt 回归、异步任务和指标口径。',
      '这体现的是工程化治理能力：可追踪、可降级、可复盘，而不是只做一个聊天框。'
    ],
    evidenceAnchors: [
      'Portfolio Demo 的运营侧步骤包含 TraceCockpit、AI 日志、Prompt 模板、Prompt 回归和异步任务中心',
      '可信建议数据结构保留 trace 与 qualityGate',
      '指标字典和 AI 运营看板作为治理入口'
    ],
    trustBoundary: 'TraceCockpit 当前按前端聚合 MVP 讲述；后端统一聚合、回归候选沉淀和端到端可运行情况需要发布后人工验收确认。'
  },
  {
    id: 'phase-55-fallback',
    title: 'Phase 5.5 如何兜底演示',
    audience: 'SELF_CHECK',
    status: 'DEMO_FALLBACK',
    statusLabel: '演示兜底可用',
    openingLine: 'Phase 5.5 兜底演示的目标是即使真实 AI 或跨页链路不稳定，也能完整讲清产品设计、工程边界和验收缺口。',
    keyPoints: [
      '优先走 Portfolio Demo 静态路线，用 demoFlag 和可用页面串讲核心闭环。',
      '遇到真实 AI 调用、跨天 Agent 或知识库记忆未验收时，明确说“待发布后人工验收确认”。',
      '只展示脱敏摘要、状态和证据入口，把不可复现的环节转成工程边界说明。'
    ],
    evidenceAnchors: [
      'Portfolio Demo 覆盖检查',
      '静态提词卡和讲述材料',
      '敏感信息披露规则'
    ],
    trustBoundary: '兜底演示不能替代真实验收，只用于保证讲述完整和边界清晰。',
    fallbackLine: '如果页面数据为空，就讲静态路线、可信边界、降级策略和下一步验收清单。'
  }
]

export const portfolioRehearsalPromptCards: PortfolioRehearsalPromptCard[] = [
  {
    id: 'card-problem',
    question: '请用 1 分钟讲清 CodeCoachAI V5 解决了什么问题。',
    status: 'READY_FOR_DEMO',
    statusLabel: '可作为演示口径',
    answerFrame: [
      '先说求职准备的三个痛点：资料分散、建议不可解释、行动难持续。',
      '再说 V5 的解法：把岗位、投递包、简历、项目、面试、复盘和 Agent 行动串成闭环。',
      '最后强调可信边界：弱证据降级，不展示隐私原文。'
    ],
    mustMention: ['闭环', '可信建议', '证据来源', '降级兜底'],
    avoidMentioning: ['已完全替代真人教练', '所有结果都自动准确', '用户原始简历或回答内容'],
    demoCue: '从 Portfolio Demo 的用户侧路线开始讲。'
  },
  {
    id: 'card-core-loop',
    question: 'V5 的核心闭环是什么？',
    status: 'ACCEPTANCE_REQUIRED',
    statusLabel: '待发布后人工验收确认',
    answerFrame: [
      '用“目标输入 -> 可信分析 -> 行动生成 -> 执行回流 -> 能力更新”一句话框住。',
      '举例：岗位匹配发现差距，项目证据补强表达，面试训练验证，再回到能力地图。',
      '补一句：端到端稳定性以发布后人工验收为准。'
    ],
    mustMention: ['岗位目标', '投递包', '项目证据', '面试训练', '人工验收'],
    avoidMentioning: ['跨天闭环已经稳定全自动', '未验收链路已经生产可用'],
    demoCue: '优先展示能打开的页面入口；不可运行项切换到静态讲述。'
  },
  {
    id: 'card-trust',
    question: 'AI 可信结果层怎么保证可信？',
    status: 'READY_FOR_DEMO',
    statusLabel: '可作为演示口径',
    answerFrame: [
      '先否定“AI 输出天然可信”，强调外层治理。',
      '讲来源、质量门禁、追踪、降级四件事。',
      '讲隐私边界：演示只看摘要和状态，不看底层生成全文。'
    ],
    mustMention: ['evidence sources', 'quality gate', 'trace', 'fallback'],
    avoidMentioning: ['底层提示词全文', '模型原始响应', '简历原文', '面试回答原文'],
    demoCue: '展示可信建议摘要或运营侧日志入口时，只讲字段含义和边界。'
  },
  {
    id: 'card-command-center',
    question: '求职作战指挥台怎么落地？',
    status: 'READY_FOR_DEMO',
    statusLabel: '可作为演示口径',
    answerFrame: [
      '它不是信息展示页，而是今天行动的调度面。',
      '行动队列承接 Agent 任务，近期产物承接报告，风险信号提示缺口。',
      '可推进的任务需要有有效证据，低可信结果不会强推。'
    ],
    mustMention: ['行动队列', '近期产物', '风险信号', '证据强度'],
    avoidMentioning: ['所有建议都由实时 AI 生成', '无需用户确认即可自动执行'],
    demoCue: '从今日任务或作战指挥台聚合逻辑讲排序和降级。'
  },
  {
    id: 'card-agent-loop',
    question: 'Agent 多日闭环怎么体现？',
    status: 'ACCEPTANCE_REQUIRED',
    statusLabel: '待发布后人工验收确认',
    answerFrame: [
      '先讲状态沉淀：待办、进行中、已完成、已跳过、已阻塞。',
      '再讲回流：完成、跳过、阻塞原因会影响后续计划。',
      '最后明确：跨天自动调整效果待发布后人工验收确认。'
    ],
    mustMention: ['任务状态', '完成回流', '阻塞原因', '待人工验收确认'],
    avoidMentioning: ['多日 Agent 已经完全自治', '无需人工复核'],
    demoCue: '展示 Agent 今日任务字段或静态任务路线。'
  },
  {
    id: 'card-memory',
    question: '知识库和长期记忆怎么治理？',
    status: 'BOUNDARY_ONLY',
    statusLabel: '待发布后人工验收确认',
    answerFrame: [
      '把治理原则放在第一位：只展示摘要、标签、来源和更新时间。',
      '长期记忆用于偏好和状态摘要，不展示完整记忆全文。',
      '涉及个人资料的命中结果都要可解释、可撤回、待确认。'
    ],
    mustMention: ['摘要化', '最小披露', '用户确认', '待人工验收确认'],
    avoidMentioning: ['知识库正文', '长期记忆全文', '自动读取全部隐私资料'],
    demoCue: '没有验收页面时，只讲治理边界，不讲已上线效果。'
  },
  {
    id: 'card-trace-cockpit',
    question: 'TraceCockpit 怎么证明工程能力？',
    status: 'ACCEPTANCE_REQUIRED',
    statusLabel: '待发布后人工验收确认',
    answerFrame: [
      '把它讲成 AI/Agent 结果的工程治理能力。',
      '用户侧看来源和可信边界，运营侧看日志、模板、回归、任务和指标。',
      '不要承诺 cockpit 完整上线，强调可追踪、可降级、可复盘。'
    ],
    mustMention: ['AI 日志', 'Prompt 回归', '异步任务', '指标字典', 'trace'],
    avoidMentioning: ['TraceCockpit 已完成全部验收', '可以看到敏感原文'],
    demoCue: '走运营侧 Portfolio Demo 路线，无法打开时讲静态能力映射。'
  },
  {
    id: 'card-phase-55-fallback',
    question: '如果现场链路不稳定，Phase 5.5 怎么兜底演示？',
    status: 'DEMO_FALLBACK',
    statusLabel: '演示兜底可用',
    answerFrame: [
      '先切 Portfolio Demo 静态路线，保证故事完整。',
      '把不可运行项标成待发布后人工验收确认，不现场触发真实 AI。',
      '用脱敏摘要、状态、证据入口和能力映射说明工程设计。'
    ],
    mustMention: ['静态路线', '不执行真实 AI 调用', '脱敏摘要', '待人工验收确认'],
    avoidMentioning: ['现场临时伪造结果', '展示用户原文', '把兜底说成真实验收'],
    demoCue: '从本文件提供的提词卡和能力映射收口。'
  }
]

export const portfolioRehearsalCapabilityMap: PortfolioRehearsalCapabilityMap[] = [
  {
    id: 'cap-product-loop',
    capability: '产品闭环设计',
    status: 'ACCEPTANCE_REQUIRED',
    statusLabel: '待发布后人工验收确认',
    mappedFeatures: ['Portfolio Demo 路线', '简历岗位匹配', '项目证据', '面试训练', '能力地图', 'Agent 今日任务'],
    proofSignals: [
      '用户侧路线能从目标岗位一路讲到行动和复盘',
      '每个页面承担闭环中的一个明确职责',
      '兜底路线能解释未验收环节'
    ],
    limits: ['跨页端到端稳定性需要发布后人工验收', '不承诺真实 AI 现场可用']
  },
  {
    id: 'cap-trustworthy-ai',
    capability: 'AI 可信结果治理',
    status: 'READY_FOR_DEMO',
    statusLabel: '可作为演示口径',
    mappedFeatures: ['可信建议摘要', '质量门禁', '证据来源', 'trace', '降级兜底'],
    proofSignals: [
      '低可信、样本不足、fallback 和 mock 结果不会被强推',
      '建议能回到来源类型和摘要',
      '运营侧保留日志与回归入口'
    ],
    limits: ['不展示底层提示词全文', '不展示模型原始响应', '不展示用户原始资料']
  },
  {
    id: 'cap-execution-system',
    capability: '求职行动系统落地',
    status: 'READY_FOR_DEMO',
    statusLabel: '可作为演示口径',
    mappedFeatures: ['行动队列', '近期产物', '风险信号', '今日任务入口'],
    proofSignals: [
      '任务按可推进程度、状态和优先级排序',
      '近期报告和计划可以回看',
      '缺少目标、简历或可信报告时有风险提示'
    ],
    limits: ['只聚合已存在的状态和摘要', '不替用户自动提交或执行求职动作']
  },
  {
    id: 'cap-agent-ops',
    capability: 'Agent 任务运营',
    status: 'ACCEPTANCE_REQUIRED',
    statusLabel: '待发布后人工验收确认',
    mappedFeatures: ['Agent 今日任务', '任务完成回流字段', 'Agent 运行记录', '异步任务中心'],
    proofSignals: [
      '任务状态和完成信息可作为后续计划上下文',
      '运营侧有运行记录和异步任务入口',
      '阶段性复盘可承接结果'
    ],
    limits: ['多日自动调整效果需要发布后人工验收', '不声称 Agent 已完全自治']
  },
  {
    id: 'cap-knowledge-governance',
    capability: '知识库与长期记忆治理',
    status: 'BOUNDARY_ONLY',
    statusLabel: '待发布后人工验收确认',
    mappedFeatures: ['知识来源摘要', '长期记忆摘要', '可信建议来源说明'],
    proofSignals: [
      '演示口径明确最小披露原则',
      '只讲标签、摘要、更新时间和可用状态',
      '建议需要用户确认，不能替代事实核验'
    ],
    limits: ['当前 subagent 未验收知识库/长期记忆端到端页面', '不展示正文或全文记忆']
  },
  {
    id: 'cap-engineering-observability',
    capability: '工程可观测与可回归',
    status: 'ACCEPTANCE_REQUIRED',
    statusLabel: '待发布后人工验收确认',
    mappedFeatures: ['AI 服务记录', 'Prompt 模板', 'Prompt 回归', '指标字典', 'AI 运营看板'],
    proofSignals: [
      '能说明一次结果从哪里来、为何可信或为何降级',
      '运营侧入口覆盖日志、模板、回归、任务和指标',
      '可用静态路线演示工程治理思路'
    ],
    limits: ['TraceCockpit 完整命名和可运行状态需发布后人工验收确认', '不展示敏感原文或底层生成全文']
  },
  {
    id: 'cap-demo-resilience',
    capability: 'Phase 5.5 演示兜底',
    status: 'DEMO_FALLBACK',
    statusLabel: '演示兜底可用',
    mappedFeatures: ['静态提词卡', '讲述材料', '能力映射', '敏感信息规则'],
    proofSignals: [
      '每个关键问题都有可讲的一分钟答案结构',
      '待验收项统一标注待发布后人工验收确认',
      '禁止真实 AI 调用和敏感原文展示'
    ],
    limits: ['兜底材料不是端到端验收结果', '需要主页面或总集成方决定展示入口']
  }
]

export const portfolioRehearsalSelfCheck = {
  noRealAiCall: true,
  noRawPromptOrModelResponse: true,
  noResumeOrInterviewRawText: true,
  noKnowledgeOrMemoryFullText: true,
  acceptanceRequiredLabel: '待发布后人工验收确认',
  writeBoundary: [
    'src/features/portfolio-rehearsal-prompts.ts',
    'src/types/portfolioRehearsal.ts'
  ]
}
