# CodeCoachAI 用户端 C 端化前端重构开发计划

## 1. 背景与目标

当前用户端主要沿用管理后台式布局与模块导航，用户进入系统后看到的是“工作台、题库、简历、面试、任务”等功能集合，而不是一条清晰的求职准备路径。`C:\my-claude\CodeCoachAI-product-prototype` 已更新为新版高保真原型，方向是将用户端重组为“Java 求职者的 AI JobCoach”，顶部主导航收敛为“今日计划、简历与岗位、题库训练、模拟面试、AI 教练、记录与工具”6 个入口，并围绕“今天先练什么、为什么练、下一步怎么做”强化求职准备闭环。

本计划用于指导 `CodeCoachAI-vue` 用户端重构，目标不是一次性重写全部业务，而是在不破坏现有 V1/V2/V3/V4-A 能力的前提下，逐步把普通用户体验从后台化界面改造成面向 C 端求职者的产品体验。

## 2. 目标用户与核心问题

目标用户：

- 正在准备 Java 后端 / Spring Cloud / 微服务岗位面试的求职者。
- 有简历、目标 JD、刷题、模拟面试和复盘需求的个人用户。
- 希望每天知道“今天该练什么、为什么练、练完后下一步做什么”的学习型用户。

当前问题：

- 用户端布局与后台布局相似，左侧菜单和功能模块过多，第一屏不够像用户产品。
- 用户路径以系统模块组织，而不是以求职准备阶段组织。
- 今日任务、简历短板、岗位匹配、题库训练、模拟面试和报告复盘之间的关系不够明确。
- V4-A 的 JobCoachAgent 能力需要被放到用户主路径，而不是作为孤立页面。

成功标准：

- 新用户进入后 10 秒内能理解当前产品能帮自己做什么。
- 老用户进入首页后能直接看到“今天优先做什么”。
- 用户端主导航减少后台感，按新版原型落地 6 个 C 端入口：今日计划、简历与岗位、题库训练、模拟面试、AI 教练、记录与工具。
- V4-A 页面只暴露真实已接入能力，不用 mock 成功状态伪装业务完成。
- 现有登录、权限、题库、简历、岗位、面试、报告、Agent 任务能力保持可用。

## 3. 重构原则

1. 保持后台和用户端体验分离
   管理后台继续使用 `AdminLayout` 和侧边栏治理结构；普通用户端应逐步切换到更轻的顶部导航、阶段化入口和任务驱动首页。

2. 不做大爆炸重写
   保留现有路由、API wrapper、Pinia、Axios、权限守卫和业务页面能力，优先重构用户端布局、首页、导航分组和关键页面外层体验。

3. V4-A 阶段边界优先
   当前优先落地 JobCoachAgent MVP：手动生成今日计划、今日任务、任务完成/跳过、运行详情。不要提前把自动每日计划、长期记忆、RAG、完整 BI、投递管理作为生产主入口。

4. 真实接口优先
   原型里的 toast/mock 只能作为交互参考。落地 Vue 页面时，已有后端接口必须接真实 API；接口未实现时显示明确空状态、错误状态或能力暂未开放。

5. C 端不等于花哨
   视觉上减少后台表格密度，但仍保持 CodeCoachAI 的专业感：清晰任务卡、可解释 AI 建议、低饱和边框、可扫描信息层级、移动端可读。

## 3.1 新版原型同步要点

本计划已按 2026-06-06 19:00 左右更新后的 `CodeCoachAI-product-prototype` 同步，关键变化如下：

- 顶部主导航从上一版建议的 5 个入口调整为 6 个入口：今日计划、简历与岗位、题库训练、模拟面试、AI 教练、记录与工具。
- `#/home` 从“Offer 准备首页”进一步收敛为“今日计划”，首屏突出一个焦点任务、推荐理由、预计耗时、开始训练、跳过和重新生成。
- `#/growth` 从宽泛“成长中心”改为“AI 教练计划”，明确只承载 V4-A 的手动生成计划、任务完成/跳过、运行详情、空状态和错误状态。
- `#/offer-help` 从单独 Offer 帮助改为“记录与工具”，聚合历史入口和面试前工具箱。
- 简历与岗位新增 JD 关键词覆盖、缺失关键词、覆盖证据和项目技能卡。
- 题目详情新增追问链，强调从基础题到项目结合、高分骨架和个人薄弱点。
- 模拟面试创建新增模式选择：简历押题、项目深挖、八股技术面、系统设计、HR 面和压力追问。
- 工具箱新增面试前 30 分钟清单，服务临近面试的低压力准备场景。

## 3.2 当前执行口径

截至 2026-06-06，本轮推进口径如下：

- 后端仓库以 `C:\my-claude\CodeCoachAI-java` 的 `dev-logfix` 分支为唯一基线；后端 `AGENTS.md` 已删除，不再按旧后端说明推进。
- 原型仓库 `C:\my-claude\CodeCoachAI-product-prototype` 只作为产品体验和交互参考，不代表所有能力都已具备后端实现。
- 前端仓库 `C:\my-claude\CodeCoachAI-vue` 当前先补计划和契约文档，再进入编码；后续实现按阶段小步推进。
- 第一阶段只做登录后普通用户 C 端壳层和“今日计划”MVP，不重写后台、不改管理端入口、不提前做自动投递、长期记忆、完整 BI。
- 后端重构优先做 C 端 facade / VO 契约冻结，而不是拆掉现有业务接口。现有 `resume`、`question`、`interview`、`agent`、`user` 能力继续复用。
- 所有新增 C 端接口必须以当前登录用户为数据边界，不能接收前端传入的 `userId` 作为归属依据。

## 4. 建议信息架构

### 4.1 用户端一级导航

按新版原型，普通用户主导航收敛为 6 个入口：

| 导航 | 推荐落地路径 | 覆盖能力 |
|---|---|---|
| 今日计划 | `/dashboard` 或 `/agent/today` | 首屏焦点任务、推荐理由、预计耗时、最大短板、求职准备路径 |
| 简历与岗位 | `/resumes`、`/job-targets`、`/resume-match` | 简历诊断、JD 解析、岗位匹配、JD 关键词覆盖、项目技能卡 |
| 题库训练 | `/questions/recommendations`、`/questions/practice` | 推荐题、错题、收藏、专项训练、追问链 |
| 模拟面试 | `/interviews/create`、`/interviews/history` | 创建面试、面试房间、报告 |
| AI 教练 | `/agent/today`、`/agent/tasks`、`/agent/runs/:id` | V4-A 手动生成计划、任务完成/跳过、运行详情、空/错状态 |
| 记录与工具 | `/analytics/personal`、`/notifications`、后续工具箱 | 历史记录、训练分析、面试前清单、Offer 工具模板 |

暂不建议作为一级导航：

- `Agent 记忆`、`个人知识库`、`投递管理`：属于后续 V4-D/V4-E 或预览能力。
- 管理、治理、日志、配置类页面：必须保留在管理后台。
- 纯列表型历史页面：新版原型已将其聚合到“记录与工具”，实现时不应作为独立后台式主入口。

### 4.2 首页定位

首页建议从“工作台 / Dashboard”改为“今日计划”语义，但内部路由可继续使用 `/dashboard`，避免一次性影响现有跳转。

首页第一屏建议包含：

- 当前目标岗位与面试倒计时。
- 今日最优先任务卡：标题、预计耗时、推荐理由、行动按钮，例如“先练 Redis 缓存一致性追问”。
- 计划可信度与来源说明：来自 JD 风险、简历证据、面试报告和错题记录，降低 AI 黑盒感。
- 最大短板：来自简历/JD 匹配、错题、面试报告或 Agent 任务。
- 关键 CTA：开始第 1 个任务、重新生成计划、补充简历/JD、今天跳过。
- 求职准备路径：简历与岗位、题库训练、模拟面试、报告复盘、AI 教练计划。
- 后续训练任务和 AI 推荐依据摘要。

避免第一屏堆叠：

- 大量指标卡。
- 后台表格。
- 全量功能快捷入口。
- 过早暴露 V4-B/V4-C/V4-D/V4-E 能力。

## 5. 路由与页面映射

| 原型页面 | Vue 现有/建议路径 | 落地策略 |
|---|---|---|
| `#/landing` 登录前首页 | 可后续新增公开首页，短期不作为重点 | 当前先重构登录后体验；文案参考“今天先补哪块短板，打开就知道” |
| `#/onboarding` 新手引导 | 新增或改造独立 onboarding 页面 | 支持完整诊断、先体验、只做模拟面试、只有 JD 等低门槛路径 |
| `#/home` 今日计划 | `/dashboard`、可联动 `/agent/today` | 第一优先级；首屏呈现焦点任务、推荐理由、计划来源和开始训练 CTA |
| `#/resume` 简历诊断 | `/resumes`、`/resumes/:id/edit`、分析页 | 重做入口和卡片，增加项目技能卡，保留业务能力 |
| `#/job-match` 岗位匹配 | `/resume-match`、`/job-targets/*` | 聚合到“简历与岗位”，增加 JD 关键词覆盖率、缺失关键词和覆盖证据 |
| `#/practice` 题库训练 | `/questions/recommendations`、`/questions/practice` | 强化推荐题和短板来源 |
| `#/question-detail` 题目详情 | `/questions/:id` | 优化答题、AI 点评、项目表达和题目追问链 |
| `#/interview-create` 创建面试 | `/interviews/create` | 改成向导式，支持简历押题、项目深挖、八股技术面、系统设计、HR 面、压力追问 |
| `#/interview-room` 面试房间 | `/interviews/room/:id` | 强化训练房间感和安全提示 |
| `#/report` 面试报告 | `/interviews/:id/report` | 强化“下一步训练”闭环 |
| `#/growth` AI 教练计划 | `/agent/today`、`/agent/tasks`、`/agent/runs/:id` | V4-A 主入口；只做手动生成计划、任务完成/跳过、运行详情、空/错状态 |
| `#/history` 历史记录 | `/interviews/history`、`/analytics/personal` 等聚合 | 聚合到“记录与工具”下的时间线 |
| `#/offer-help` 记录与工具 | 后续工具箱页，可承载历史入口 | 聚合历史记录、面试前 30 分钟清单、路线、项目表达、自我介绍、HR 模板 |

## 6. 分阶段开发计划

### 阶段 0：现状盘点与安全基线

目标：建立可控改造边界，避免破坏现有用户端能力。

任务：

- 盘点 `src/router/routes.ts` 中用户端路由、管理端路由和 V4 preview 路由。
- 盘点 `src/layouts/UserLayout.vue`、`src/components/layout/UserSidebar.vue`、`src/layouts/AdminLayout.vue` 的布局差异。
- 盘点用户端首页、简历、岗位、题库、面试、Agent 页面使用的 API wrapper。
- 明确当前分支、未提交改动和需要保护的文件。

交付：

- 用户端路由分组清单。
- 用户端页面改造优先级。
- 不动后台布局和权限守卫的确认清单。

验收：

- 不修改业务逻辑。
- 不删除现有路由。
- 不影响管理员入口。

### 阶段 1：用户端壳层重构

目标：把普通用户端从后台侧边栏体验切到 C 端产品体验。

建议改动：

- 改造 `src/layouts/UserLayout.vue`，保留认证、用户菜单、通知入口、命令面板等已有能力。
- 新增或改造用户端顶部导航组件，导航分组按“今日计划、简历与岗位、题库训练、模拟面试、AI 教练、记录与工具”组织。
- 保留移动端折叠导航，避免小屏横向溢出。
- 保留 `AdminLayout.vue` 不变。
- 原有用户侧边栏可以先隐藏或转为二级导航，不建议立即删除。

重点文件：

- `src/layouts/UserLayout.vue`
- `src/components/layout/UserSidebar.vue` 或新增 `src/components/layout/UserTopNav.vue`
- `src/router/routes.ts`

验收：

- 普通用户登录后不再看到明显后台侧栏主结构。
- 管理员访问 `/admin` 仍看到管理后台结构。
- 移动端顶部导航可折叠，按钮和长中文不溢出。
- 现有用户路由仍可访问。

### 阶段 2：首页 / 今日计划重构

目标：让用户进入后直接知道今天该做什么。

第一阶段最小可落地范围：

- 只覆盖登录后首页，不做登录前 landing。
- `/dashboard` 第一屏展示今日焦点任务、计划来源、后续任务和求职准备路径。
- `/agent/today` 作为 AI 教练入口保留独立可访问，同时能从首页主任务跳入。
- 保留现有简历、岗位、题库、面试页面跳转，不在本阶段重写业务页。
- 后端 facade 未完成前，可以临时复用现有 Agent/简历/题库/面试接口拼首页，但必须明确 loading、empty、error、partial 状态；不能造假数据。

建议改动：

- 将 `/dashboard` 改造成“今日计划”，或将 `/dashboard` 重定向/引导到 `/agent/today`。
- 首页展示今日焦点任务、目标岗位、最大短板、求职准备路径、后续训练任务、最近报告、下一步 CTA。
- 首页增加“AI 推荐依据”区域，解释计划来自 JD 风险、简历证据、面试报告、错题记录和当前 Agent 上下文。
- 首页支持“开始第 1 个任务”“重新生成计划”“补充简历/JD”“今天跳过”等主操作。
- 接入 V4-A Agent API：
  - `GET /agent/job-coach/daily-plan/latest`
  - `POST /agent/job-coach/daily-plan/generate`
  - `GET /agent/tasks/today`
  - `POST /agent/tasks/{id}/complete`
  - `POST /agent/tasks/{id}/skip`
- 未生成计划时显示明确空状态和“手动生成今日计划”。
- 生成失败时显示错误原因、重试入口和运行详情入口。

重点文件：

- `src/views/user/DashboardView.vue`
- `src/views/agent/AgentTodayView.vue`
- `src/api/agent.ts`
- `src/types/agent.ts`

验收：

- loading、empty、error、success 状态完整。
- 完成/跳过任务有加载态和失败反馈。
- 不使用 mock 任务伪装成功。
- 任务 actionUrl 能跳转到现有题库、面试、简历或学习页面。
- 无简历、无 JD、无报告、Agent 生成失败时都有用户能理解的下一步。
- 任务完成/跳过后有 toast 或等价反馈，并能刷新当前任务状态。

### 阶段 3：核心业务页面 C 端化

目标：按用户链路重塑页面外观和主操作，不重写所有业务。

优先级：

1. 简历与岗位
   - 简历中心入口减少表格感。
   - 突出当前主简历、诊断分、可改进项、目标岗位绑定。
   - JD 分析和匹配报告表达为“风险 / 优势 / 缺口 / 下一步训练”。
   - 增加 JD 关键词覆盖率、缺失关键词、覆盖证据，帮助用户知道简历该补什么。
   - 增加项目技能卡，把项目拆成技术决策、结果指标和可能追问，服务面试前复习。

2. 刷题训练
   - 推荐题优先于全量题库。
   - 题目详情强化“我的回答、AI 点评、参考结构、项目表达、追问”。
   - 增加题目追问链，从基础题延伸到追问、项目结合、高分骨架和我的薄弱点。
   - 错题和收藏作为训练来源，不作为后台列表中心。

3. 模拟面试
   - 创建页改成向导式选择：面试类型、目标岗位、简历、难度、题数。
   - 面试类型参考新版原型：简历押题、项目深挖、八股技术面、系统设计、HR 面、压力追问。
   - 面试房间突出对话、答题区、上下文提示。
   - 报告页强化下一轮训练计划。

4. AI 教练计划
   - 独立展示 V4-A 能力边界：手动生成今日计划、任务完成/跳过、运行详情。
   - 显示生成上下文摘要，不默认展示敏感原文。
   - 覆盖空状态和错误状态示例，便于实现时接入真实接口。

验收：

- 每个页面第一屏有明确主任务。
- 表格只用于适合列表管理的区域，核心路径优先用卡片、步骤、摘要和 CTA。
- 所有危险或不可逆动作仍保留确认。
- 长中文、JD、简历片段、AI 文本不会溢出。

### 阶段 4：Onboarding 与空状态补齐

目标：让新用户不用理解系统模块，也能开始。

建议改动：

- 新增登录后 onboarding 流程：选择求职阶段、目标岗位、年限、技术栈、上传简历、粘贴 JD。
- 支持低门槛路径：
  - 没有 JD：先选择岗位方向。
  - 没有简历：先进入题库或模拟面试体验。
  - 只想体验：允许创建一次轻量模拟面试。
- 各核心页面空状态统一引导下一步。

验收：

- 新用户空数据时不会看到空表格。
- 每个空状态至少提供一个真实可执行动作。
- 不要求用户一次性补完所有资料。

### 阶段 5：记录与工具

目标：沉淀求职准备轨迹，但不抢 V4-A 主线。

建议改动：

- 聚合面试、简历优化、JD 匹配、Agent 任务、题目训练记录为时间线。
- “记录与工具”作为辅助区，可先提供历史入口、面试前 30 分钟清单、Java 面试准备路线、项目表达模板、自我介绍模板和 HR 沟通模板。
- 后续再接 V4-B/V4-D 的成长档案、简历版本、投递管理。

验收：

- 历史记录不是后台表格，而是可继续行动的时间线。
- 工具箱不暴露未实现的自动投递、真实企业招聘或外部自动化能力。

## 7. API 接入边界

已只读确认：`CodeCoachAI-java` 当前在 `dev-logfix` 分支，后端已有较多可复用 C 端业务接口。前端重构时不要因为页面风格变化就绕过这些接口，也不要直接调用 `/inner/**` 或 `/admin/**` 运维接口。

V4-A 必须优先接入：

| 方法 | 路径 | 用途 |
|---|---|---|
| `POST` | `/agent/job-coach/daily-plan/generate` | 手动生成今日计划 |
| `GET` | `/agent/job-coach/daily-plan/latest` | 获取最新今日计划 |
| `GET` | `/agent/tasks/today` | 查询今日任务 |
| `GET` | `/agent/tasks` | 查询任务列表 |
| `POST` | `/agent/tasks/{id}/complete` | 完成任务 |
| `POST` | `/agent/tasks/{id}/skip` | 跳过任务 |
| `POST` | `/agent/tasks/{id}/start` | 开始任务，按后端实际支持决定是否接入 |
| `POST` | `/agent/tasks/{id}/restore` | 恢复任务，按后端实际支持决定是否接入 |
| `GET` | `/agent/runs/{id}` | 查看生成详情 |

现有能力继续复用：

- 用户与首页：`/users/profile`、`/dashboard/v3/*`
- 简历：`/resumes`、`/resumes/upload`、`/resumes/{id}/analysis-result`、`/resumes/{id}/optimize`
- 岗位：`/job-targets`、`/job-targets/current`、`/job-targets/{id}/parse`、`/job-targets/{id}/analysis`
- 匹配：`/resume-job-match/reports`、`/resume-job-match/latest`
- 技能画像：`/skill-profiles/*`
- 题库：`/questions`、`/questions/{id}`、收藏、错题、掌握度
- 推荐与练习：`/question-recommendations/*`、`/practice/records`
- 面试：`/interviews`、`/interviews/{id}/start`、`/interviews/{id}/answer`、`/interviews/{id}/complete`、`/interviews/{id}/report`、报告导出

接口未实现或失败时：

- 不展示假数据。
- 展示空状态、错误原因、重试入口。
- 对用户说明当前能力暂不可用或需要先补充目标岗位/简历。

明确禁止：

- 普通用户页面直接调用 `/inner/**` 服务内接口。
- 普通用户页面直接调用 `/admin/**`、后台任务、索引重建、Prompt 回归、题库导入去重等运维接口。
- 为了补页面效果在前端硬编码“已完成任务”“高匹配分”“虚假报告”“虚假错题趋势”。

## 8. 后端联动重构边界

本轮 C 端化不建议重写现有后端微服务。后端基线以 `CodeCoachAI-java` 的 `dev-logfix` 分支为准，优先在现有 `resume`、`question`、`interview`、`agent`、`user` 等服务能力之上新增 C 端 facade / 聚合接口，避免把首页编排、空状态判断和错误归因全部压到前端页面。

### 8.1 C 端聚合接口

建议新增一个面向用户首页的聚合接口，路径可二选一，后续以后端 Controller 实际命名为准：

| 方法 | 建议路径 | 用途 | 状态 |
|---|---|---|---|
| `GET` | `/job-coach/home` 或 `/home/today` | 聚合今日计划首页所需数据 | 建议新增 |

建议返回内容：

- 当前目标岗位：岗位名称、城市/方向、JD 是否已解析、缺资料提示。
- 主简历摘要：默认简历、解析状态、最近诊断分、待优化项数量。
- 最新 JD 匹配摘要：匹配分、优势、风险、缺口、关键词覆盖摘要。
- 今日焦点任务：任务标题、类型、预计耗时、推荐理由、行动入口。
- 今日任务列表：待完成、已完成、已跳过、失败状态。
- AI 推荐依据：来源类型、证据摘要、置信度、是否缺少关键上下文。
- 最近训练反馈：最近刷题、最近面试报告、最近 Agent run。
- 下一步 CTA：开始训练、补简历、补 JD、生成计划、查看报告。
- 缺资料状态：无简历、无 JD、无面试报告、无错题记录时的降级说明。

这个接口只负责 C 端首页展示和用户下一步引导，不替代底层业务接口。简历编辑、JD 解析、题目练习、面试答题、Agent 任务完成/跳过仍使用各自业务接口。

建议第一版响应结构草案：

| 字段 | 含义 |
|---|---|
| `profile` | 用户基础信息摘要，只返回昵称、头像、求职阶段等 C 端必要字段 |
| `goal` | 当前求职目标，包含岗位、城市/方向、年限、目标面试日期 |
| `readiness` | 求职准备概览，包含简历、JD、练习、面试报告是否齐备 |
| `primaryTask` | 今日首要任务，复用推荐解释 Contract |
| `dailyPlan` | 最新 Agent 今日计划摘要，不暴露 raw prompt/output |
| `tasks` | 今日任务列表，含可执行 actionUrl 和状态 |
| `resumeSummary` | 主简历摘要、解析状态、优化建议数量 |
| `jobMatchSummary` | 最新 JD 匹配摘要、关键词覆盖、缺口和证据摘要 |
| `practiceSummary` | 推荐题、错题、最近练习和薄弱点摘要 |
| `interviewSummary` | 最近面试、报告分数、薄弱点和下一步建议 |
| `events` | 最近可继续行动的记录事件，数量控制在首页可扫描范围内 |
| `blockers` | 缺资料或服务不可用的 blocker 列表 |
| `partial` | 是否部分模块失败或缺失 |
| `moduleStatus` | 各模块状态：`available`、`empty`、`failed`、`defer` |

首页 facade 的首版目标是让页面稳定、有解释、有降级；不是把所有业务详情一次性塞进首页。

### 8.1.1 后续 C 端辅助 facade

除首页外，建议按页面复杂度逐步补轻量聚合接口，避免前端在多个页面重复拼装跨域数据：

| 建议接口 | 用途 | 优先级 |
|---|---|---|
| `GET /job-coach/practice-summary` | 聚合推荐题、错题、掌握度、追问链入口、最近练习反馈 | P1 |
| `GET /job-coach/resume-job-context` | 聚合主简历、当前 JD、匹配报告、关键词覆盖、项目技能卡 | P1 |
| `GET /job-coach/interview-options` | 返回 C 端面试模式枚举、可用简历/JD、默认推荐模式 | P1 |
| `GET /job-coach/reports/{id}/next-actions` | 把面试报告薄弱点映射到题目、Agent task、简历优化或下一轮面试 | P1 |
| `GET /job-coach/timeline` | 聚合记录与工具时间线事件 | P2 |

这些 facade 均应并行新增，不替换现有业务接口；如果某个底层接口已能稳定满足页面，不强行新增聚合层。

### 8.2 C 端领域模型清单

后端重构时需要把页面从“模块资源”串成“求职准备上下文”。建议在接口契约或 VO 中明确这些概念：

| 领域概念 | 后端来源/建议 | C 端用途 |
|---|---|---|
| `UserJobGoal` | 用户求职目标，可由目标岗位和 onboarding 聚合 | 首页定位、推荐约束、空状态引导 |
| `ResumeVersion` | V4 简历版本能力 | 简历优化、版本回滚、优化前后对比 |
| `JobTarget` / `JdParseResult` | 目标岗位和 JD 解析结果 | JD 风险、关键词、岗位要求 |
| `ResumeJobMatchReport` | 简历岗位匹配报告 | 匹配分、优势、缺口、下一步训练 |
| `KeywordCoverage` | 建议从 JD 分析或匹配报告结构化输出 | 已覆盖/部分覆盖/缺失关键词和证据 |
| `ProjectSkillCard` | 建议从简历项目解析或 AI 优化结果生成 | 技术决策、结果指标、可能追问 |
| `QuestionPracticeRecord` | 练习记录、错题、收藏 | 训练来源和掌握度 |
| `FollowUpChain` | 建议从题目关系或 AI 点评生成 | 基础题、追问、项目结合、高分骨架 |
| `InterviewSession` / `InterviewReport` | 模拟面试和报告 | 面试复盘、薄弱点、下一轮训练 |
| `AgentDailyPlan` / `AgentTask` | V4-A Agent run/task | 今日计划、任务状态、运行详情 |
| `UserActivityEvent` | 建议新增聚合事件 VO 或轻量事件表 | 记录与工具时间线 |

### 8.3 推荐解释 Contract

今日计划和首页焦点任务必须可解释，不能只返回任务名称。建议每个推荐任务至少包含：

| 字段 | 含义 |
|---|---|
| `taskId` | Agent task 或业务任务 ID |
| `taskType` | `question`、`resume`、`jd_match`、`interview`、`review`、`onboarding` 等 |
| `title` | 面向用户的任务标题 |
| `reason` | 推荐理由，回答“为什么今天先做它” |
| `sourceTypes` | `jd_risk`、`resume_gap`、`interview_report`、`wrong_question`、`agent_context` 等 |
| `evidenceRefs` | 证据引用摘要，不直接暴露敏感原文 |
| `confidence` | 推荐置信度或 `high/medium/low` |
| `estimatedMinutes` | 预计耗时 |
| `actionUrl` | 前端可跳转的业务入口 |
| `blockerType` | `missing_resume`、`missing_jd`、`missing_report`、`api_unavailable` 等 |
| `status` | `pending`、`in_progress`、`completed`、`skipped`、`failed` |

### 8.4 缺资料降级规则

后端需要明确空数据用户的返回规则，前端按规则展示空状态，而不是自行猜测。

| 场景 | 后端建议返回 | 前端表现 |
|---|---|---|
| 无简历 | `blockerType=missing_resume`，可返回上传简历 CTA | 引导上传简历或先体验题库/面试 |
| 无 JD / 目标岗位 | `blockerType=missing_jd`，可返回岗位方向选择 CTA | 引导选择岗位或粘贴 JD |
| 无面试报告 | 不展示面试薄弱点分数 | 引导创建一次模拟面试 |
| 无错题/练习记录 | 不展示错题趋势 | 引导从推荐题或基础题开始 |
| Agent 生成失败 | 返回失败原因、runId、重试建议，不生成假任务 | 展示错误、重试、查看运行详情 |
| 部分服务不可用 | 返回 `partial=true` 和具体缺失模块 | 首页保留可用模块，缺失模块显示暂不可用 |

禁止为了让页面好看返回虚假分数、虚假任务、虚假历史记录或 mock 成功状态。

### 8.5 跨域数据闭环

C 端体验的关键不是单页好看，而是各业务结果能推动下一步：

- Agent 任务完成/跳过应影响下一次今日计划推荐。
- 面试报告中的薄弱点应能生成题目训练、项目追问或下一轮模拟面试任务。
- JD 风险和缺失关键词应能流向简历优化建议、推荐题和模拟面试模式。
- 简历项目解析应能生成项目技能卡，并服务题目详情和面试房间的项目表达。
- 题目练习记录、错题和收藏应能影响今日焦点任务和推荐题。
- 记录与工具时间线中的事件应能跳回对应业务详情继续行动。

### 8.6 时间线事件模型

“记录与工具”建议使用统一事件 VO 聚合，而不是把多个后台列表直接搬到 C 端。

建议事件字段：

| 字段 | 含义 |
|---|---|
| `eventId` | 事件 ID |
| `eventType` | `resume_analysis`、`jd_match`、`resume_optimize`、`question_practice`、`interview_report`、`agent_task` |
| `title` | 事件标题 |
| `summary` | 事件摘要 |
| `occurredAt` | 发生时间 |
| `score` | 可选分数 |
| `status` | `success`、`failed`、`pending` 等 |
| `actionText` | 继续行动按钮文案 |
| `actionUrl` | 跳转路径 |

第一版至少聚合面试报告、简历诊断、JD 匹配、优化记录、刷题记录、Agent 任务 6 类事件。

### 8.7 接口可用性矩阵

后续进入实现前，需要以 `dev-logfix` 实际 Controller / DTO / VO 为准冻结接口矩阵。建议使用以下状态：

| 状态 | 含义 |
|---|---|
| `available` | 已有接口和字段能直接支撑页面 |
| `partial` | 已有接口但缺少 C 端字段、摘要、状态或错误原因 |
| `missing` | 后端无接口，需要新增 |
| `defer` | 后续阶段能力，不进入当前生产主路径 |

初步判断：

| 能力 | 建议状态 | 说明 |
|---|---|---|
| Agent 今日计划与任务 | `available/partial` | 基础接口已有，需确认推荐解释字段和失败原因 |
| 首页聚合 facade | `missing` | 建议新增 `/job-coach/home` 或 `/home/today` |
| 简历上传、解析、优化 | `available` | 继续复用现有简历接口 |
| JD 解析和目标岗位 | `available/partial` | 需确认关键词覆盖、证据摘要字段 |
| 简历岗位匹配 | `available/partial` | 需结构化输出优势、风险、缺口、下一步训练 |
| 项目技能卡 | `partial/missing` | 可基于简历解析/优化结果补 VO |
| 推荐题和练习记录 | `available/partial` | 需确认推荐来源、薄弱点、追问链 |
| 题目追问链 | `partial/missing` | 可复用题目关系或 AI 点评补结构 |
| 模拟面试创建/房间/报告 | `available/partial` | 需确认面试模式枚举和报告到训练任务的闭环 |
| 历史时间线 | `missing` | 建议新增聚合事件 VO 或查询接口 |
| 投递管理、长期记忆、完整 BI | `defer` | 不进入 V4-A C 端主入口 |

### 8.8 后端重构实施建议

后端建议按“盘点 - 契约 - facade - 闭环字段”的顺序推进：

1. 接口矩阵冻结
   在 `dev-logfix` 上按 Controller 盘点 `user`、`dashboard`、`agent`、`resume`、`question`、`interview` 模块，明确每个 C 端页面依赖的接口、DTO/VO、权限和错误码。

2. 首页 facade 草案
   优先设计 `GET /job-coach/home` 或 `GET /home/today` 的响应 VO。先覆盖首页稳定展示需要的摘要字段，不强行返回完整业务详情。

3. 空状态与错误归因
   给无简历、无 JD、无报告、无练习记录、Agent 生成失败、部分模块不可用定义统一 `blockerType`、`moduleStatus` 和 `nextAction`。

4. 推荐解释字段
   在 Agent task / daily plan / 首页焦点任务中补齐 `reason`、`sourceTypes`、`evidenceRefs`、`confidence`、`estimatedMinutes`、`actionUrl`。

5. P1 辅助 facade
   再补练习摘要、简历 JD 上下文、面试模式选项、报告 nextActions。不要在首页 facade 中一次性承载全部业务复杂度。

6. 权限与脱敏回归
   对所有新增 C 端接口做当前用户归属校验，确认不返回 raw prompt/output、完整简历原文、完整 JD 原文和后台运维字段。

建议每个 facade 都配一份最小契约样例：正常、有 blocker、部分失败、权限失败四种响应，供前端接入和测试使用。

## 9. 权限与安全影响

- 普通用户端只展示当前用户自己的简历、目标岗位、任务、运行记录和面试报告。
- `/admin/**` 继续使用 `requiresAdmin` 和 `requiredPermissions`，不参与 C 端化布局。
- Agent run 详情中如包含 input snapshot、raw output、简历/JD 原文，应默认摘要展示，敏感原文折叠或不展示。
- 面试房间必须保留“仅用于模拟训练，不用于真实面试作弊”的提示。
- 文件上传、应用优化建议、结束面试、重新生成计划等动作需要明确反馈；危险动作需要确认。

后端实现时补充约束：

- 普通用户接口必须从登录态获取当前用户 ID，不接收前端传入的 `userId` 作为数据归属依据。
- 所有 C 端详情和状态变更必须按 `user_id + biz_id` 查询或更新，包括 `agent_task`、`agent_run`、`resume`、`target_job`、`practice_record`、`interview_session`、`job_application`。
- `input_snapshot_json`、`raw_output_text`、AI call log、完整简历原文、完整 JD 原文不进入 C 端首页聚合接口。
- 后台运维接口不作为普通用户入口，包括 `/admin/agent/**`、`/admin/analytics/**`、`/admin/vector-store/**`、`/admin/tasks/**`、Prompt 回归、索引重建、题库导入/去重、系统配置、慢 SQL 和审计日志。
- 新增 facade 不应绕过网关鉴权、内部签名、RBAC 和已有权限守卫。

## 10. 视觉与交互规范

方向：

- 专业 AI 求职训练产品，而不是后台管理系统。
- 顶部导航 + 内容容器 + 任务卡片 + 阶段化流程。
- 卡片圆角控制在 8px 左右，避免过度圆润。
- 主色可保留橙色行动感，但背景需更中性，避免整站变成单一米橙主题。
- 使用 Element Plus 完成表单、弹窗、分页、空状态、通知；用 Tailwind/SCSS 做页面结构和产品化样式。
- 使用 `lucide-vue-next` 或现有图标库增强按钮和状态识别。

必须覆盖：

- loading
- empty
- error
- disabled
- success feedback
- permission failure
- mobile layout
- long text overflow

## 11. 验证计划

每个阶段完成后至少执行：

```powershell
npx vue-tsc -b
npm run build
git diff --check
```

浏览器验证：

- 阶段 1 后验证登录后用户端、管理端布局分离。
- 阶段 2 后验证 `/dashboard`、`/agent/today`、焦点任务、任务完成/跳过、生成失败状态和 AI 推荐依据。
- 阶段 3 后验证简历、岗位、题库、题目追问链、面试创建、面试房间、报告核心路径。
- 阶段 5 后验证“记录与工具”的历史入口、面试前清单和模板入口。
- 移动端至少验证 390px、768px 和桌面宽度。

重点回归：

- 登录、退出、token 失效。
- 普通用户不能进管理后台。
- 管理员仍可进入管理后台。
- 现有题库、简历、面试、报告路径不 404。
- V4 preview 路由隐藏策略不被破坏。

后端联动验证：

- 新增 facade 返回的数据只属于当前登录用户。
- 空数据用户首页能返回明确 `blockerType` 和可执行 CTA。
- Agent 生成失败不返回假任务，并能查看失败 run。
- 完成/跳过任务后，今日任务状态和首页焦点任务一致。
- 普通用户无法访问他人简历、任务、面试、投递和 Agent run。
- 普通用户无法访问 `/admin/**`、raw prompt/output、索引重建、后台任务重试等运维接口。
- 首页聚合接口在部分模块失败时能返回 `partial` 状态，页面不整体崩溃。

契约文档验收：

- 每个新增 facade 有字段表、枚举表、正常响应示例、空状态响应示例、错误响应示例。
- 每个字段都能追溯到现有接口、数据库字段、AI 生成结果或明确的新后端逻辑。
- `actionUrl` 只返回前端已存在或本阶段明确新增的路由。
- `blockerType`、`moduleStatus`、`sourceTypes`、`taskType`、`eventType` 枚举有统一命名，不由各模块自由发散。
- 明确哪些字段首版可为空，哪些字段缺失时必须降级，哪些字段不允许进入 C 端响应。

## 12. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 一次性改动 UserLayout 影响所有用户页 | 路由和样式回归面大 | 阶段 1 单独提交，先保证旧页面可访问 |
| 原型范围超过 V4-A | 误导用户看到未实现能力 | 导航和首页只暴露真实可用能力 |
| API 与文档不一致 | 前端接入失败 | 以 backend `dev-logfix` 实际 Controller/DTO/VO 为准，先冻结接口矩阵 |
| 首页完全由前端拼多个模块接口 | 空状态、错误归因和加载性能变差 | 新增 C 端 facade 聚合今日首页数据 |
| facade 暴露 raw AI / 简历 / JD 原文 | 敏感信息泄露 | 聚合接口只返回摘要、证据片段和推荐理由 |
| 新增后端聚合破坏旧 API | 旧页面或管理端回归 | facade 并行上线，不替代现有业务接口 |
| 暖色 C 端风格过度 | 产品显得不够技术专业 | 使用中性底色，橙色仅作主行动色 |
| 表格全部替换为卡片导致效率下降 | 老用户查找成本上升 | 列表管理页保留表格，首页和主路径产品化 |
| 移动端导航和长文本溢出 | C 端体验下降 | 每阶段做移动端宽度检查 |

## 13. 推荐实施顺序

1. 阶段 0：完成用户端路由和布局盘点，确认当前前端已改动和需要保护的文件。
2. 后端契约冻结：按 `dev-logfix` 盘点 Controller / DTO / VO，形成 `available / partial / missing / defer` 接口矩阵。
3. 首页 facade 契约：确定 `/job-coach/home` 或 `/home/today` 的响应结构、缺资料降级、推荐解释字段和安全边界。
4. 第一阶段前端 MVP：重构 `UserLayout`，实现 6 入口用户端顶部导航壳层；重构 `/dashboard` 和 `/agent/today`，用真实现有接口支撑今日计划。
5. 第一阶段验收：跑通类型检查、构建、移动端布局、登录后用户端、管理端隔离、空状态和 Agent 失败状态。
6. 后端首页 facade 实现：以不替换现有业务接口为前提，新增聚合接口并补契约样例。
7. 前端切换 facade：将首页从多接口拼装逐步切换到首页聚合接口，保留底层业务接口作为详情页入口。
8. 阶段 3A：重构简历与岗位入口，补 JD 关键词覆盖和项目技能卡。
9. 阶段 3B：重构题库训练和题目详情体验，补题目追问链。
10. 阶段 3C：重构模拟面试创建、房间和报告闭环，补面试模式选择与 report nextActions。
11. 阶段 4：补齐 onboarding 和全链路空状态。
12. 阶段 5：做“记录与工具”：历史时间线、面试前清单和工具模板。

建议每个阶段单独分支或至少单独提交，避免 UI 壳层、业务页面、API 接入和样式系统混在一个大 diff 中。

## 14. 第一批可执行任务清单

P0：

- 以后端 `dev-logfix` 为准冻结接口矩阵。
- 设计 C 端首页聚合接口 `/job-coach/home` 或 `/home/today`。
- 明确今日计划推荐解释 contract、缺资料降级规则和敏感字段边界。
- 设计并实现普通用户端 6 入口顶部导航结构：今日计划、简历与岗位、题库训练、模拟面试、AI 教练、记录与工具。
- 保留 `AdminLayout` 不变。
- 将 `/dashboard` 第一屏改为“今日该做什么”。
- 将 `/agent/today` 嵌入首页主路径，并让 `AI 教练` 入口可访问 V4-A 计划页。
- 完成 Agent 今日任务 loading/empty/error/success 状态。
- 首页补齐焦点任务、AI 推荐依据、求职准备路径和后续任务区域。

P0 交付物建议：

- `docs/backend-dev-logfix-c-end-api-matrix.md`：后端接口矩阵，标注 `available / partial / missing / defer`。
- `docs/job-coach-home-api-contract.md`：首页 facade 契约，含字段、枚举、响应样例和脱敏边界。
- 前端第一阶段 PR：只包含用户端壳层、`/dashboard` 今日计划、`/agent/today` C 端化和必要文案替换。
- 验证记录：类型检查、构建、`git diff --check`、登录态浏览器验证、移动端宽度截图或文字记录。

P1：

- 简历与岗位入口聚合，补 JD 关键词覆盖和项目技能卡。
- 推荐题训练页产品化。
- 题目详情补追问链。
- 面试创建页向导化。
- 面试创建页补模式选择。
- 面试报告页增加“生成下一轮今日训练”闭环。
- 记录与工具页补历史入口和面试前 30 分钟清单。

P2：

- Onboarding。
- 历史时间线。
- Offer / HR / 项目表达工具模板。
- 成长趋势和长期画像入口。

## 15. 下一步建议

如果下一轮开始后端重构，建议先不写 Controller，而是先输出两份契约文档：

1. `backend-dev-logfix-c-end-api-matrix.md`
   逐个列出 `users/profile`、`dashboard/v3`、`agent`、`resumes`、`job-targets`、`resume-job-match`、`skill-profiles`、`questions`、`question-recommendations`、`practice/records`、`interviews` 的现有接口、请求/响应 VO、C 端用途和缺口。

2. `job-coach-home-api-contract.md`
   明确首页 facade 的字段、枚举、样例、权限、脱敏、错误码和降级规则。

这两份文档冻结后，再进入后端实现会更稳。否则前端会继续在页面里拼多个业务接口，短期能跑，但空状态、错误归因、权限边界和推荐解释会越来越难维护。
