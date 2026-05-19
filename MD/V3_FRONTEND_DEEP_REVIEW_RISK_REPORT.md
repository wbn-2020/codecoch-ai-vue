# CodeCoachAI-vue 前端深度 Review 与风险分析报告

审查时间：2026-05-19
审查分支：`dev-v3`
审查范围：当前工作区快照、前端 `src/router` / `src/api` / `src/views` / `src/types` / `src/stores` / `src/components`，并对照文档仓库 V3 基线与后端 `codecoachai-java` 的 `dev-v3` Controller / DTO / VO / gateway 配置。

> 说明：审查开始时工作区已有较多未提交/未跟踪改动。本报告按用户确认，以当前工作区快照为准进行静态审查与构建验证；报告只新增本文档，不修改任何业务代码。

## 1. 结论摘要

当前前端 V3-C 的“目标岗位 / JD”主链路方向基本正确，`src/api/jobTarget.ts` 调用的 `/job-targets`、`/job-targets/{id}/parse`、`/job-targets/{id}/analysis` 与后端 `TargetJobController` 已实现路径总体一致，字段也能与 `TargetJobSaveDTO`、`TargetJobQueryDTO`、`TargetJobVO` 对齐。

但当前工作区不能进入可验收状态：`npx vue-tsc -b` 与 `npm run build` 均失败，阻断项位于 `src/views/question/PracticeModeView.vue:322`，调用 `submitQuestionAnswerApi` 时只传 `answerContent`，但 `QuestionAnswerDTO` 要求 `userAnswer`。

更大的系统性风险集中在一批新增用户端/管理端页面：它们已经注册路由或入口，但部分接口路径、HTTP 方法、查询参数、响应字段与后端真实 Controller 不一致，且很多页面把错误吞掉后展示空列表，容易把 404、403、字段错配伪装成“暂无数据”。这会显著增加 V3 联调与回归排查成本。

## 2. 验证结果

| 命令 | 结果 | 关键输出 |
| --- | --- | --- |
| `npx vue-tsc -b` | 失败 | `src/views/question/PracticeModeView.vue(322,76): error TS2345`，缺少 `QuestionAnswerDTO.userAnswer` |
| `npm run build` | 失败 | `vue-tsc -b && vite build` 在同一类型错误处失败，未进入 Vite build |
| `git diff --check` | 通过，有警告 | 多个已修改文件提示未来 Git touch 时 `LF will be replaced by CRLF` |
| 浏览器点击 / 联调 | 未执行 | 构建已失败，且本轮为代码审查报告，不启动前端服务 |
| lint / test | 未执行 | `package.json` 当前只有 `dev`、`build`、`preview` 脚本 |

阻断证据：

- `src/views/question/PracticeModeView.vue:322-324`：传参为 `{ answerContent: userAnswer.value }`。
- `src/types/question.ts:104-108`：`QuestionAnswerDTO` 中 `userAnswer` 为必填。
- `src/api/question.ts:78-86`：`submitQuestionAnswerApi` 会用 `data.answerContent || data.userAnswer` 生成后端 payload。

## 3. 已确认做得较好的部分

### 3.1 目标岗位 / JD 链路基本对齐真实后端

前端证据：

- `src/api/jobTarget.ts:11-48` 覆盖目标岗位列表、创建、当前目标、详情、编辑、删除、设置当前、JD 解析、分析结果查询。
- `src/views/v3/JobTargetListView.vue`、`JobTargetEditView.vue`、`JobTargetAnalysisView.vue` 均使用真实 API，不用 mock 冒充结果。
- `src/views/v3/JobTargetListView.vue:64` 明确声明列表、筛选和操作来自 V3-B 后端真实接口。

后端证据：

- `TargetJobController.java:25` 声明 `/job-targets`。
- `TargetJobController.java:30-72` 覆盖 `GET`、`POST`、`GET /current`、`GET /{id}`、`PUT /{id}`、`DELETE /{id}`、`POST /{id}/set-current`、`POST /{id}/parse`、`GET /{id}/analysis`。
- `TargetJobSaveDTO.java:10-24` 支持 `jobTitle`、`companyName`、`jobLevel`、`jdText`、`jdSource`。
- `TargetJobQueryDTO.java:8-10` 支持 `keyword`、`status`、`current`。
- `TargetJobVO.java:10-25` 包含 `parseStatus`、`parseErrorMessage`、`analysisSummary`、`requiredSkills`、`interviewFocusPoints`。

风险说明：V3 页面清单写到 JD 分析页可选 `GET /ai/sse/job-targets/{id}/parse`，且要求 SSE 失败时可回退查询最终结果；当前真实后端以 REST 为主，SSE 是 P1/体验增强。因此这不是已确认 bug，但需要在验收口径里明确“V3-C P0 是否允许 REST-only 通过”。

### 3.2 V3 后续页面多数没有伪造业务结果

`src/views/v3/*` 里多个后续阶段页面通过 `V3FoundationShell` 呈现“API 待接入”，例如：

- `V3DashboardView.vue:11-12`
- `ResumeMatchView.vue:11-12`
- `ResumeMatchDetailView.vue:11-12`
- `SkillProfileView.vue:11-12`
- `QuestionRecommendationsView.vue:11-12`
- `StudyPlanFromGapView.vue:11-12`
- `V3FoundationShell.vue:26`

这比用假数据冒充已完成更安全。但它们已经出现在主菜单，会带来产品验收风险，详见第 4.4 节。

### 3.3 Markdown 渲染默认关闭 HTML

`src/components/common/MarkdownPreview.vue:2` 使用 `v-html` 渲染 markdown 结果，但 `MarkdownIt` 配置中 `html: false` 位于 `MarkdownPreview.vue:14`，当前可降低 AI/用户内容注入 HTML 的风险。

## 4. 高风险问题

### P0-1：当前快照构建失败，不能进入 V3-C 验收

现象：

- `npx vue-tsc -b` 失败。
- `npm run build` 失败。

根因：

- `src/views/question/PracticeModeView.vue:322-324` 传给 `submitQuestionAnswerApi` 的对象缺少 `userAnswer`。
- `src/types/question.ts:104-108` 定义 `QuestionAnswerDTO.userAnswer` 必填。

影响：

- V3-C 验收清单要求 `npx vue-tsc -b`、`npm run build` 通过。
- 该错误位于题目练习链路，属于 V1/V2 核心功能范围，不只是 V3 新增页面问题。

建议：

- 最小修复：调用处补 `userAnswer: userAnswer.value`，并保留 `answerContent` 兼容后端 payload。
- 修复后重新跑 `npx vue-tsc -b`、`npm run build`、`git diff --check`。

### P1-1：通知中心用户端 API 与后端真实契约不一致

前端证据：

- `src/api/notification.ts:27` 调 `GET /notifications`。
- `src/api/notification.ts:31` 期望 `GET /notifications/unread-count` 返回 `{ total }`。
- `src/api/notification.ts:35` 使用 `PUT /notifications/{id}/read`。
- `src/api/notification.ts:39` 使用 `PUT /notifications/read-all`。
- `src/layouts/UserLayout.vue:99-100` 从 `result.total` 读取未读数。
- `src/views/user/NotificationCenterView.vue:49-52` 使用 `item.isRead` 判断未读。

后端证据：

- `NotificationController.java:27` 声明 `/notifications`。
- `NotificationController.java:34` 列表查询参数为 `readStatus`，不是 `isRead`。
- `NotificationController.java:50` 未读数接口返回 `Result<Long>`，不是 `{ total }`。
- `NotificationController.java:61` 标记已读是 `POST /notifications/{id}/read`。
- `NotificationController.java:73` 全部已读是 `POST /notifications/read-all`。
- `Notification.java:28-36` 字段为 `bizType`、`bizId`、`readStatus`、`readAt`，不是 `relatedType`、`relatedId`、`isRead`。

影响：

- 用户布局右上角未读角标可能永远为 0。
- 通知中心点击已读/全部已读可能 404 或 405。
- 列表未读态可能全失效。

建议：

- 将前端通知类型和 API 方法改回后端真实字段：`readStatus`、`bizType`、`bizId`、`POST`。
- `unread-count` 返回值按数字处理，不按 `{ total }` 处理。
- 页面错误不要吞成空列表，至少展示接口错误摘要。

### P1-2：管理端“系统通知管理”调用 `/admin/notices`，后端真实路径是 `/admin/announcements` 或 `/admin/notifications`

前端证据：

- `src/views/admin/NotificationManageView.vue:177` 调 `GET /admin/notices`。
- `src/views/admin/NotificationManageView.vue:207-209` 调 `PUT/POST /admin/notices`。
- `src/views/admin/NotificationManageView.vue:221` 调 `PUT /admin/notices/{id}/publish`。
- `src/views/admin/NotificationManageView.vue:227` 调 `PUT /admin/notices/{id}/offline`。
- `src/views/admin/NotificationManageView.vue:234` 调 `DELETE /admin/notices/{id}`。
- `NotificationManageView.vue:162` 使用字符串状态 `PUBLISHED`、`DRAFT`、`OFFLINE`。

后端证据：

- `AdminAnnouncementController.java:45-131` 暴露 `/admin/announcements`、`/admin/announcements/{id}`、`POST /publish`、`POST /offline`、`DELETE`。
- `SysAnnouncement.java:13-24` 状态字段为 `Integer status`。
- `AdminNotificationController.java:34` 另有 `/admin/notifications`，用于发送/广播通知，不是公告 CRUD。
- 后端搜索 `/admin/notices` 无匹配。

影响：

- 页面 CRUD、发布、下线大概率不可用。
- 如果错误被吞成空表，会误判为“没有公告”。
- 状态字段字符串/数字错配会导致标签、操作按钮显示错误。

建议：

- 先确定该页面真实业务是“公告管理”还是“通知发送管理”。
- 公告管理应对齐 `/admin/announcements` 与数字状态。
- 通知发送管理应对齐 `/admin/notifications/send`、`/admin/notifications/broadcast`，并重做页面能力边界。

### P1-3：异步任务管理前端路径和能力与后端不一致

前端证据：

- `src/views/admin/AsyncTaskView.vue:207` 调 `GET /admin/async-tasks`。
- `AsyncTaskView.vue:231` 调 `POST /admin/async-tasks/{id}/retry`。
- `AsyncTaskView.vue:243` 调 `PUT /admin/async-tasks/{id}/cancel`。

后端证据：

- `AdminTaskController.java:34` 声明 `/admin/tasks`。
- `AdminTaskController.java:44` 支持列表。
- `AdminTaskController.java:95` 支持 `POST /admin/tasks/{id}/retry`。
- 未发现 `/admin/async-tasks` 或 cancel endpoint。
- `AsyncTask.java:22-55` 字段包括 `bizType`、`bizId`、`status`、`retryCount`、`failureReason`、`payload`、`result`、`startedAt`、`completedAt`。

影响：

- 管理端任务中心主列表、重试、取消不可用。
- “取消”按钮属于危险操作，但后端未确认支持，前端不应展示为可用能力。

建议：

- 前端改为 `/admin/tasks`，字段改为 `bizType`、`failureReason`、`completedAt` 等真实字段。
- 移除或禁用 cancel 操作，除非后端补齐真实接口。
- retry 建议加确认弹窗，避免误触重跑耗时/付费任务。

### P1-4：多个管理端页面注册了路由，但后端没有对应 Controller 证据

前端已注册路由：

- `src/router/routes.ts:485` -> `AiModelConfigView.vue`
- `src/router/routes.ts:494` -> `MenuPermissionView.vue`
- `src/router/routes.ts:530` -> `InterviewManageView.vue`
- `src/router/routes.ts:539` -> `InterviewReportManageView.vue`

前端调用：

- `AiModelConfigView.vue:201`、`:245`、`:247`、`:260`、`:268` 使用 `/admin/ai/models`。
- `MenuPermissionView.vue:199`、`:238`、`:240`、`:253` 使用 `/admin/menus`。
- `InterviewManageView.vue:147` 使用 `/admin/interviews`。
- `InterviewReportManageView.vue:128`、`:155` 使用 `/admin/interview-reports`。

后端证据：

- 在 `codecoachai-ai`、`codecoachai-system`、`codecoachai-interview`、`codecoachai-task` 中搜索 `/admin/ai/models`、`/admin/menus`、`/admin/interviews`、`/admin/interview-reports`、`/admin/notices` 均无匹配。
- `AiModelRouter.java` 存在，但它是内部模型路由类，不是 `/admin/ai/models` 管理 Controller。

影响：

- 页面如果可直接访问，会给管理员一个“看似已上线”的功能入口。
- 错误吞成空态后，联调人员不易发现是接口未实现。
- 这违反“点击入口必须指向真实可达路由；未实现能力不能做成看似可用假按钮”的 V3 规则。

建议：

- 未有后端真实 Controller 的页面从菜单隐藏，或降级为明确 `API 待接入` 的说明页。
- 如果保留路由，页面标题和状态必须明确“未联调 / 后端未实现”，并禁止展示新增、删除、启停等真实操作按钮。

### P1-5：用户端若干页面接口路径与后端真实路径不一致

#### 薄弱点分析

前端：

- `src/views/user/WeaknessAnalysisView.vue:186` 调 `GET /users/weakness-analysis`。
- `WeaknessAnalysisView.vue:96-98` 期望 `weakPoints` 与 `suggestions`。

后端：

- `QuestionStudyController.java:35` 声明 `/questions`。
- `QuestionStudyController.java:85` 暴露 `GET /questions/weakness-analysis`。
- `QuestionStudyController.java:143-145` 设置 `totalAnswered`、`correctRate`、`weakCategories`。
- `QuestionStudyController.java:234-245` 内部 VO 字段包含 `weakCategories`、`weakDifficulties`、`wrongRate` 等。

风险：页面会 404 或空态，雷达图数据结构也无法直接渲染。

#### 项目经历管理

前端：

- `src/views/user/ProjectExperienceView.vue:184` 调 `GET /users/projects`。
- `ProjectExperienceView.vue:227-242` 使用 `/users/projects/{id}` 进行更新和删除。

后端：

- `ResumeController.java:37` 声明 `/resumes`。
- `ResumeController.java:145` `POST /resumes/{resumeId}/projects`。
- `ResumeController.java:151` `PUT /resumes/{resumeId}/projects/{projectId}`。
- `ResumeController.java:157` `DELETE /resumes/{resumeId}/projects/{projectId}`。

风险：项目经历在后端属于简历子资源，不是用户独立资源；页面需要先选择 resumeId 或复用简历编辑页，不应新增孤立接口假设。

#### 每日任务 / 打卡

前端：

- `src/api/dailyTask.ts:30` 调 `GET /study-plans/daily-tasks`。
- `src/api/dailyTask.ts:36` 调 `PUT /study-plans/daily-tasks/{taskId}/complete`。
- `src/api/dailyTask.ts:40` 调 `PUT /study-plans/daily-tasks/{taskId}/skip`。
- `src/api/dailyTask.ts:44` 调 `POST /study-plans/checkin`。

后端：

- `StudyPlanController.java:82` 暴露 `GET /study-plans/{planId}/daily-view`。
- `StudyPlanController.java:104` 暴露 `POST /study-tasks/{taskId}/complete`。
- `StudyPlanController.java:109` 暴露 `POST /study-tasks/{taskId}/skip`。
- `StudyCheckinController.java:29` 声明 `/study-checkins`，`StudyCheckinController.java:37` 为打卡 `POST`。

风险：每日任务页的查询、完成、跳过、打卡均无法与真实接口对齐；当前 root gateway 配置还只包含 `/study-plans/**`，未包含 `/study-tasks/**`，会进一步扩大联调问题。

## 5. 中风险问题

### P2-1：操作日志 / 登录日志字段与查询参数错配

操作日志前端：

- `src/views/admin/OperationLogView.vue:27` 使用 `query.operator`。
- `OperationLogView.vue:40` 使用 `query.operationType`。
- `OperationLogView.vue:56-73` 展示 `operator`、`operationType`、`status`。
- `OperationLogView.vue:168-173` 发送 `operator`、`operationType` 到 `/admin/operation-logs`。

后端：

- `AdminLogController.java:61-77` 查询参数为 `username`、`module`、`action`、`status`。
- `OperationLog.java:13-27` 字段为 `username`、`module`、`action`、`requestUri`、`costMs`、`errorMsg`。

登录日志前端：

- `src/views/admin/LoginLogView.vue:48-51` 使用 `row.status`。
- `LoginLogView.vue:116-119` 发送 `status` 到 `/admin/login-logs`。

后端：

- `AdminLogController.java:37-50` 查询参数为 `username`、`loginStatus`。
- `LoginLog.java:12-19` 字段为 `username`、`loginType`、`loginStatus`、`ip`、`userAgent`、`failReason`、`traceId`、`loginTime`。

风险：接口可能返回 200，但表格字段为空，筛选不生效，误判为数据缺失。

### P2-2：网关配置存在多份且明显漂移

root 配置证据：

- `config/nacos/codecoachai-gateway-dev.yml:38` resume 路由只有 `/resumes/**,/admin/resumes/**,/skill-profiles/**`，未包含 `/job-targets`、`/resume-job-match`。
- `config/nacos/codecoachai-gateway-dev.yml:44` interview 路由有 `/interviews/**,/admin/interviews/**,/study-plans/**`，未包含 `/study-tasks/**`。
- `config/nacos/codecoachai-gateway-dev.yml:69` task 路由只有 `/admin/tasks/**,/notifications/**`。
- `config/nacos/codecoachai-gateway-dev.yml:81` system 路由只有 `/admin/system/**,/admin/config/**`。

docs 配置证据：

- `docs/nacos/codecoachai-gateway-dev.yml:79-86` 包含 `/job-targets` 与 `/resume-job-match`。
- `docs/nacos/codecoachai-gateway-dev.yml:103-106` 包含 `/study-plans/**,/study-tasks/**`。
- `docs/nacos/codecoachai-gateway-dev.yml:119-130` system 管理路由只有 `/admin/system/**`、`/admin/dashboard/**`、`/admin/configs/**`，仍未覆盖 `/admin/login-logs`、`/admin/operation-logs`、`/admin/announcements`。

风险：前端即使接口路径正确，也可能因实际 Nacos 加载的配置不同而 404。联调时必须确认运行环境读取的是哪份 gateway 配置。

### P2-3：错误处理普遍吞错，容易掩盖接口契约问题

典型位置：

- `NotificationManageView.vue:180`
- `AsyncTaskView.vue:212`
- `AiModelConfigView.vue:203`
- `MenuPermissionView.vue:201`
- `InterviewManageView.vue:152`
- `InterviewReportManageView.vue:133`
- `LoginLogView.vue:124`
- `OperationLogView.vue:178`
- `WeaknessAnalysisView.vue:191-193`
- `ProjectExperienceView.vue:186`
- `DailyTaskView.vue:169`、`:184`、`:193`、`:207`
- `NotificationCenterView.vue:128`、`:140`

风险：接口 404/405/字段错配会被静默变成空列表或空图表，联调验收无法区分“无数据”和“接口坏了”。

建议：

- 列表页保留 `errorMessage` 并用 `AppState type="error"` 或页面内错误条展示。
- 对 404/405 单独提示“接口未实现或路径不一致”。
- 不要在 catch 中只写空数组。

### P2-4：部分危险操作缺少确认或未确认后端能力

风险位置：

- `AsyncTaskView.vue:231` 重试任务无确认。
- `AsyncTaskView.vue:243` 取消任务无确认且后端未确认支持。
- `NotificationManageView.vue:221` 发布无确认。
- `NotificationManageView.vue:227` 下线无确认。
- `AiModelConfigView.vue:260` 启停模型配置无确认。
- `InterviewReportManageView.vue:155` 重试报告生成无确认。

影响：管理端操作可能触发异步任务、通知发布、模型路由变化或重跑 AI 任务，误触成本较高。

建议：管理端危险操作统一加确认弹窗；取消确认时保持静默 no-op。

### P2-5：路由、菜单与页面可达性不一致

用户端：

- `UserSidebar.vue:36-40` 展示 `岗位目标`、`简历匹配`、`能力画像`、`推荐题目`。
- 后三者多为 `V3FoundationShell` 待接入页面。

管理端：

- `routes.ts:485-548` 注册了 AI 模型、菜单权限、系统通知、操作日志、登录日志、面试管理、报告管理、异步任务等页面。
- `AdminSidebar.vue:37-52` 仅展示旧的管理入口，未展示这些新增页面。

风险：

- 用户端主菜单暴露后续阶段入口，验收时可能被视为“功能应该可用”。
- 管理端新路由可地址栏访问，但侧栏不可见，权限/可达性不一致。

建议：

- 后续阶段入口只在明确“待接入”的页面中出现，主菜单可以先隐藏或分组标记。
- 管理端新增路由应和 sidebar、权限、后端能力同步，否则保持不可见。

### P2-6：权限控制仍是粗粒度角色判断

前端证据：

- `router/guards.ts:45` 对 admin 页面只检查 `requiresAdmin` 与 `authStore.isAdmin`。
- `directives/permission.ts:37` 是基于角色数组的 DOM 移除。
- 多数管理端页面没有使用细粒度 permission 标识。

后端证据：

- 部分 Controller 方法显式 `SecurityAssert.requireAdmin()`，例如 `AdminAnnouncementController`、`AdminNotificationController`、`SystemConfigController`。
- `AdminLogController` 未在方法片段中看到显式 `SecurityAssert.requireAdmin()`，可能依赖网关或其他安全层。

风险：前端隐藏不是安全边界；当后端接口权限不一致时，普通用户可能通过直连接口或路由可达性触发安全问题。

建议：

- 前端只负责体验层隐藏，后端必须统一 admin 接口鉴权。
- 前端可以逐步增加 route meta permission，但不要替代后端鉴权。

### P2-7：Token 刷新重放缺少单请求 retry 标记

前端证据：

- `src/utils/request.ts:91-126` 业务 code 401 时 refresh 后重放原请求。
- `src/utils/request.ts:144-179` HTTP 401 时 refresh 后重放原请求。
- 未看到类似 `_retry` 的单请求保护。

风险：如果 refresh 成功但原请求继续返回 401，可能再次进入 refresh/replay 流程，造成重复请求或循环重试。当前实现已有并发队列，能解决并发 401 风暴，但不解决“同一请求重放后仍 401”的保护。

建议：

- 给 Axios config 增加内部 `_retry` 标记。
- refresh 成功后若同一请求再次 401，应直接清登录态并跳登录，而不是再次 refresh。

## 6. 接口风险矩阵

| 模块 | 前端当前调用 | 后端真实证据 | 风险等级 | 建议 |
| --- | --- | --- | --- | --- |
| 目标岗位 / JD | `/job-targets/**` | `TargetJobController.java:25-72` | 低 | 保持；补充 REST-only 验收说明 |
| JD 解析 SSE | 当前未接 SSE | V3 草案 `GET /ai/sse/job-targets/{id}/parse` 为 P1 可选 | 中 | 验收口径写清 P0 REST 通过，P1 再接 SSE |
| 用户通知 | `PUT /notifications/{id}/read`、`result.total`、`isRead` | 后端为 `POST`、`Result<Long>`、`readStatus` | 高 | 改 API 方法与类型 |
| 管理公告/通知 | `/admin/notices` | 后端为 `/admin/announcements` 或 `/admin/notifications` | 高 | 明确业务并改真实路径 |
| 异步任务 | `/admin/async-tasks`、cancel | 后端为 `/admin/tasks`，未见 cancel | 高 | 改路径，移除未实现操作 |
| AI 模型配置 | `/admin/ai/models` | 后端无 Controller 证据 | 高 | 隐藏或改为待接入 |
| 菜单权限 | `/admin/menus` | 后端无 Controller 证据 | 高 | 隐藏或改为待接入 |
| 面试管理 | `/admin/interviews` | 后端未见 admin Controller 证据 | 高 | 隐藏或等待后端 |
| 面试报告管理 | `/admin/interview-reports` | 后端未见 admin Controller 证据 | 高 | 隐藏或等待后端 |
| 登录日志 | `/admin/login-logs` | 后端路径存在，字段/参数错配 | 中 | 改 `loginStatus`、`userAgent` 等字段 |
| 操作日志 | `/admin/operation-logs` | 后端路径存在，字段/参数错配 | 中 | 改 `username`、`action`、`requestUri`、`costMs` |
| 薄弱点分析 | `/users/weakness-analysis` | 后端为 `/questions/weakness-analysis` | 高 | 改路径与 VO 映射 |
| 项目经历 | `/users/projects` | 后端为 `/resumes/{resumeId}/projects/**` | 高 | 并入简历上下文 |
| 每日任务 | `/study-plans/daily-tasks` | 后端为 `/study-plans/{planId}/daily-view` | 高 | 改为按 planId 查询 |
| 任务完成/跳过 | `PUT /study-plans/daily-tasks/{id}/complete|skip` | 后端为 `POST /study-tasks/{id}/complete|skip` | 高 | 改路径和方法 |
| 学习打卡 | `/study-plans/checkin` | 后端为 `/study-checkins` | 高 | 改路径与 DTO |

## 7. 建议修复顺序

### 第一优先级：恢复可构建状态

1. 修复 `PracticeModeView.vue` 的 `QuestionAnswerDTO` 参数。
2. 重新执行 `npx vue-tsc -b`、`npm run build`、`git diff --check`。
3. 构建通过前不要继续叠加新功能。

### 第二优先级：收敛真实接口契约

1. 将所有新增页面按“已实现 / 未实现 / 字段错配 / gateway 未通”打标。
2. 对已实现后端接口的页面，改前端路径、方法、字段。
3. 对未实现后端接口的页面，主菜单隐藏或改成明确待接入，不展示真实操作按钮。
4. 通知、任务、日志、每日学习任务优先修，因为它们影响布局、管理端和用户端基础体验。

### 第三优先级：补错误状态与危险操作确认

1. 所有列表页 catch 保留 `errorMessage`。
2. 空状态只用于真实空数据，不用于接口失败。
3. 发布、下线、启停、重试、取消等操作统一确认。

### 第四优先级：联调与浏览器回归

1. 后端和 gateway 启动后，先验证 `/job-targets` V3-C P0。
2. 再逐页验证用户端通知、学习计划、题目练习、简历项目、管理端日志/任务。
3. 每一类页面保留 loading、empty、error 三态截图或记录。

## 8. 本轮未处理事项

- 未修改业务代码。
- 未修复构建失败项。
- 未启动浏览器点击测试。
- 未提交 commit / 未 push。当前工作区已有用户未提交改动，本轮只新增报告文件，避免混入用户改动。
