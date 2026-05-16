# V2 接入状态盘点与全链路回归清单

生成时间：2026-05-16

本轮范围：静态分析、构建验证、接口接入状态盘点、回归清单整理。未修改业务代码，未提交 commit，未新增依赖。

## 1. 当前构建状态

* 当前分支：`dev-ui`
* 工作区状态：开始前 `git status --short --untracked-files=all` 无输出，工作区清洁；本报告生成后仅新增 `docs/V2_frontend_regression_checklist.md`
* 最近提交：`0ff012a 管理大屏展示`、`fe30072 管理后台重构`、`8829339 建立中心重构`、`be2d318 ai面试链路重构`、`19db02a 工作台重构`
* `npm run build`：通过，执行 `vue-tsc -b && vite build`
* `npm run lint`：无脚本，`npm pkg get scripts` 仅包含 `dev`、`build`、`preview`
* `npm run test`：无脚本
* 既有 warning：
  * `@vueuse/core` 内 `/* #__PURE__ */` 注释位置 Rollup 无法解释，构建时移除注释
  * 构建产物存在大 chunk warning，`index-*.js` 约 1036 kB，`elementPlus-*.js` 约 933 kB；本轮按要求不处理分包优化

## 2. 路由盘点

路由守卫：`src/router/guards.ts` 对非 public 路由要求登录；`/admin` 父路由带 `requiresAuth` 和 `requiresAdmin`，普通用户访问后台会跳转 `/403`。

### 用户端路由

| 路由 | 页面文件 | 是否需要登录 | 是否菜单可达 | 状态 |
| -- | ---- | ------ | ------ | -- |
| `/dashboard` | `src/views/user/DashboardView.vue` | 是 | 是 | 正常 |
| `/profile` | `src/views/user/ProfileView.vue` | 是 | 是 | 正常 |
| `/password` | `src/views/user/PasswordView.vue` | 是 | 否 | 个人资料/用户操作子入口，需浏览器确认入口 |
| `/questions` | `src/views/question/QuestionListView.vue` | 是 | 是 | 正常 |
| `/questions/wrong-records` | `src/views/question/WrongQuestionView.vue` | 是 | 是 | 正常 |
| `/questions/favorites` | `src/views/question/FavoriteQuestionView.vue` | 是 | 是 | 正常 |
| `/questions/:id` | `src/views/question/QuestionDetailView.vue` | 是 | 否 | 详情子路由，由题库列表跳转 |
| `/resumes` | `src/views/resume/ResumeListView.vue` | 是 | 是 | 正常 |
| `/resumes/create` | `src/views/resume/ResumeEditView.vue` | 是 | 否 | 新建子路由，由简历中心按钮跳转 |
| `/resumes/:id/edit` | `src/views/resume/ResumeEditView.vue` | 是 | 否 | 编辑子路由，由简历卡片跳转 |
| `/interviews/create` | `src/views/interview/InterviewCreateView.vue` | 是 | 是 | 正常 |
| `/interviews/room/:id` | `src/views/interview/InterviewRoomView.vue` | 是 | 否 | 运行时子路由，由创建面试跳转 |
| `/interviews/history` | `src/views/interview/InterviewHistoryView.vue` | 是 | 是 | 正常 |
| `/interviews/:id` | `src/views/interview/InterviewDetailView.vue` | 是 | 否 | 详情子路由，由历史/工作台跳转 |
| `/interviews/:id/report` | `src/views/interview/InterviewReportView.vue` | 是 | 否 | 报告子路由，由房间/历史跳转 |

### 管理端路由

| 路由 | 页面文件 | 是否需要管理员 | 是否菜单可达 | 状态 |
| -- | ---- | ------- | ------ | -- |
| `/admin` | `src/views/admin/AdminDashboardView.vue` | 是 | 是 | 正常 |
| `/admin/users` | `src/views/admin/UserManageView.vue` | 是 | 是 | 正常 |
| `/admin/roles` | `src/views/admin/RoleManageView.vue` | 是 | 是 | 正常 |
| `/admin/questions` | `src/views/admin/QuestionManageView.vue` | 是 | 是 | 正常 |
| `/admin/question-categories` | `src/views/admin/QuestionCategoryManageView.vue` | 是 | 是 | 正常 |
| `/admin/question-tags` | `src/views/admin/QuestionTagManageView.vue` | 是 | 是 | 正常 |
| `/admin/question-groups` | `src/views/admin/QuestionGroupManageView.vue` | 是 | 是 | 正常 |
| `/admin/ai/prompts` | `src/views/admin/PromptTemplateView.vue` | 是 | 是 | 正常 |
| `/admin/ai/logs` | `src/views/admin/AiCallLogView.vue` | 是 | 是 | 正常 |
| `/admin/system/configs` | `src/views/admin/SystemConfigView.vue` | 是 | 是 | 正常 |

### 路由问题

* 未发现菜单入口指向不存在路由。
* 用户端存在定义但无侧边栏菜单入口的详情/编辑/运行时路由，属于业务子路由，需在浏览器回归中确认入口按钮可达。
* `/password` 定义了路由但不在侧边栏菜单中，需确认个人菜单或资料页是否提供入口。
* `/login`、`/register`、`/403`、`/404` 为 public 路由，无菜单入口，正常。

## 3. API 接入盘点

页面直接请求检查：未发现页面绕过 `src/api/**` 直接使用 `request`、`axios` 或 `fetch`。

| 模块 | API 文件 | 接口 | 使用页面 | 状态 |
| -- | ------ | -- | ---- | -- |
| auth | `src/api/auth.ts` | `POST /auth/login` | `src/stores/auth.ts`，登录页通过 store 使用 | 已使用 |
| auth | `src/api/auth.ts` | `POST /auth/register` | `src/stores/auth.ts`，注册页通过 store 使用 | 已使用 |
| auth | `src/api/auth.ts` | `POST /auth/logout` | `src/stores/auth.ts`，布局退出通过 store 使用 | 已使用 |
| auth | `src/api/auth.ts` | `GET /auth/current-user` | `src/stores/auth.ts`，路由守卫补拉用户 | 已使用 |
| auth | `src/api/auth.ts` | `POST /auth/refresh-token` | 无 | 定义未使用 |
| user | `src/api/user.ts` | `GET/PUT /users/profile` | `src/views/user/ProfileView.vue`、`src/stores/user.ts` | 已使用 |
| user | `src/api/user.ts` | `PUT /users/password` | `src/views/user/PasswordView.vue` | 已使用 |
| user | `src/api/user.ts` | `GET /users/overview` | `src/views/user/DashboardView.vue` | 已使用 |
| user/admin | `src/api/user.ts` | `GET /admin/users`、`PUT /admin/users/{id}/status` | `src/views/admin/UserManageView.vue` | 已使用 |
| user/admin | `src/api/user.ts` | `GET /admin/roles` | `src/views/admin/RoleManageView.vue` | 已使用 |
| question | `src/api/question.ts` | `GET /questions`、`GET /questions/{id}` | `QuestionListView.vue`、`QuestionDetailView.vue` | 已使用 |
| question | `src/api/question.ts` | `POST /questions/{id}/answers` | `QuestionDetailView.vue` | 已使用 |
| question | `src/api/question.ts` | `POST/DELETE /questions/{id}/favorite` | `QuestionListView.vue`、`QuestionDetailView.vue`、`FavoriteQuestionView.vue` | 已使用 |
| question | `src/api/question.ts` | `GET /questions/favorites`、`GET /questions/wrong-records` | `FavoriteQuestionView.vue`、`WrongQuestionView.vue` | 已使用 |
| question | `src/api/question.ts` | `PUT /questions/{id}/mastery` | `QuestionDetailView.vue`、`WrongQuestionView.vue` | 已使用 |
| resume | `src/api/resume.ts` | `GET/POST /resumes`、`GET/PUT/DELETE /resumes/{id}` | `ResumeListView.vue`、`ResumeEditView.vue`、`InterviewCreateView.vue` | 已使用 |
| resume | `src/api/resume.ts` | `PUT /resumes/{id}/default` | `ResumeListView.vue`、`ResumeEditView.vue` | 已使用 |
| resume | `src/api/resume.ts` | `POST/PUT/DELETE /resumes/{resumeId}/projects...` | `ResumeEditView.vue` | 已使用 |
| interview | `src/api/interview.ts` | `POST /interviews`、`GET /interviews` | `InterviewCreateView.vue`、`InterviewHistoryView.vue`、`DashboardView.vue` | 已使用 |
| interview | `src/api/interview.ts` | `POST /interviews/{id}/start`、`GET /interviews/{id}/current` | `InterviewRoomView.vue` | 已使用 |
| interview | `src/api/interview.ts` | `POST /interviews/{id}/answer`、`POST /interviews/{id}/finish` | `InterviewRoomView.vue` | 已使用 |
| interview | `src/api/interview.ts` | `GET /interviews/{id}`、`GET /interviews/{id}/report`、`POST /interviews/{id}/report/retry` | `InterviewDetailView.vue`、`InterviewReportView.vue` | 已使用 |
| aiAdmin / prompt | `src/api/aiAdmin.ts` | `GET/POST/PUT/DELETE /admin/ai/prompts`、`PUT /admin/ai/prompts/{id}/status` | `PromptTemplateView.vue` | 已使用 |
| ai log | `src/api/aiAdmin.ts` | `GET /admin/ai/logs`、`GET /admin/ai/logs/{id}` | `AiCallLogView.vue` | 已使用 |
| system | `src/api/system.ts` | `GET /admin/system/overview` | `AdminDashboardView.vue` | 已使用 |
| system | `src/api/system.ts` | `GET/POST/PUT/DELETE /admin/configs` | `SystemConfigView.vue` | 已使用 |
| admin question/category/tag/set | `src/api/question.ts` | `GET/POST/PUT/DELETE /admin/questions`、`PUT /admin/questions/{id}/status` | `QuestionManageView.vue` | 已使用 |
| admin question/category/tag/set | `src/api/questionCategory.ts` | `GET/POST/PUT/DELETE /admin/question-categories` | `QuestionCategoryManageView.vue`、题目/题组页面下拉 | 已使用 |
| admin question/category/tag/set | `src/api/questionTag.ts` | `GET/POST/PUT/DELETE /admin/question-tags` | `QuestionTagManageView.vue`、题目页面下拉 | 已使用 |
| admin question/category/tag/set | `src/api/questionGroup.ts` | `GET/POST/PUT/DELETE /admin/question-groups` | `QuestionGroupManageView.vue`、题目页面下拉 | 已使用 |

## 4. V2 能力接入状态

### 已接入真实接口

| 能力 | 页面 | 接口 | 状态 |
| -- | -- | -- | -- |
| 用户工作台概览 | `DashboardView.vue` | `GET /users/overview`、`GET /interviews` | 已接入真实接口，聚合字段不足处显示 `--` |
| V1 简历 CRUD | `ResumeListView.vue`、`ResumeEditView.vue` | `/resumes`、`/resumes/{id}`、`/resumes/{id}/default`、`/resumes/{id}/projects` | 已接入真实接口 |
| 创建 AI 面试 | `InterviewCreateView.vue` | `POST /interviews` | 已接入真实接口 |
| 面试房间作答链路 | `InterviewRoomView.vue` | `start/current/answer/finish` | 已接入真实接口，不伪造 AI 评分 |
| 面试报告轮询 | `InterviewReportView.vue` | `GET /interviews/{id}/report`、`POST /interviews/{id}/report/retry` | 已接入真实接口 |
| 管理后台核心 CRUD | `views/admin/**` | `/admin/questions`、`/admin/question-categories`、`/admin/question-tags`、`/admin/question-groups`、`/admin/ai/prompts`、`/admin/ai/logs`、`/admin/configs` | 已接入真实接口 |

### 待接入入口

| 能力 | 页面 | 当前表现 | 是否明确标注 |
| -- | -- | ---- | ------ |
| 简历上传 / 解析 | `ResumeListView.vue`、`ResumeEditView.vue` | 上传按钮 disabled，侧栏能力卡标注待接入 | 是 |
| AI 简历优化 | `ResumeListView.vue`、`ResumeEditView.vue`、`DashboardView.vue` | 优化按钮 disabled，能力状态显示待接入 | 是 |
| 优化对比报告 | `ResumeEditView.vue` | V2 能力入口仅标注，无真实页面/接口 | 是 |
| 行业场景独立面试模板 | `InterviewCreateView.vue` | 行业场景 mode card disabled；普通行业方向仍随现有字段提交 | 是 |
| 学习计划 | `DashboardView.vue`、`InterviewReportView.vue` | 卡片/按钮 disabled，标注待接入 | 是 |
| 持久化笔记 | `InterviewRoomView.vue` | 右侧 Tab 说明仅预留信息位，不保存本地假数据 | 是 |
| 管理统计大屏 | `AdminDashboardView.vue` | 趋势、分布、待办为 demo 数据，并多处标注演示数据/待接入 | 是 |
| Prompt 版本 diff / 灰度发布 | `PromptTemplateView.vue` | 页面说明待接入，当前仅做模板 CRUD | 是 |
| AI 题目审核池 / 去重 / 告警聚合 | `AdminDashboardView.vue` | 待办项为 demo 数据并标注待接入 | 是 |

### 风险缺口

| 缺口 | 影响页面 | 风险等级 | 建议 |
| -- | ---- | ---- | -- |
| 前端未定义 V2 简历上传、解析状态、确认解析、AI 优化相关 API | 简历中心、简历编辑、工作台 | P1 | 下一轮对照后端 V2 合同补齐 `src/api/resume.ts`，再开放入口 |
| 学习计划只有入口，无 route、无 api、无页面 | 工作台、报告页 | P2 | 保持 disabled；等后端/PRD 确认后新增路由与 API |
| 管理大屏趋势/待办为 demo 数据 | 管理首页 | P1 | 已明确标注，可作为展示占位；上线前接真实统计/待办接口或隐藏 |
| `refreshTokenApi` 定义未使用 | 鉴权链路 | P2 | 如后端支持刷新 token，可在后续设计刷新策略；否则删除未用定义 |
| `/password` 无侧边栏菜单入口 | 修改密码流程 | P2 | 浏览器回归确认是否从用户菜单可达；不可达则补入口 |
| 创建面试已提交 `industryDirection` 等字段，但行业场景独立模板 disabled | 创建面试 | P1 | 浏览器/接口回归确认后端当前是否接受该字段，不接受则下一轮收敛 payload |

## 5. 用户端回归清单

| 链路 | 测试步骤 | 预期结果 | 优先级 |
| -- | ---- | ---- | --- |
| 登录 | 访问 `/login`，输入有效账号密码登录 | 成功写入 token，跳转 `/dashboard` | P0 |
| 退出 | 在用户布局触发退出 | 调用 `/auth/logout`，清空 token，回到登录页 | P0 |
| 未登录拦截 | 清空 token 后访问 `/dashboard` | 跳转 `/login?redirect=/dashboard` | P0 |
| 工作台 | 登录后访问 `/dashboard` | 概览和最近面试加载失败时有空/错误状态，真实入口可点击 | P0 |
| 题库列表 | 访问 `/questions`，搜索/分页 | 调用 `/questions`，列表可读，分页正常 | P0 |
| 题目详情 | 从题库进入详情 | `/questions/{id}` 可打开，Markdown 可读 | P0 |
| 收藏题目 | 在列表/详情收藏和取消收藏 | 调用 favorite/unfavorite，状态刷新 | P0 |
| 错题记录 | 访问 `/questions/wrong-records` | 调用真实错题接口，空态清晰 | P1 |
| 简历列表 | 访问 `/resumes` | 调用 `/resumes`，卡片列表/分页/空态正常 | P0 |
| 新增简历 | 点击新增，填写必填项保存 | 调用 `POST /resumes`，成功后进入编辑页 | P0 |
| 编辑简历 | 修改简历字段保存 | 调用 `PUT /resumes/{id}`，刷新详情 | P0 |
| 删除简历 | 列表删除简历并确认 | 调用 `DELETE /resumes/{id}`，列表刷新 | P0 |
| 设置默认简历 | 列表或编辑页设为默认 | 调用 `PUT /resumes/{id}/default`，默认标记更新 | P1 |
| 项目经历 CRUD | 编辑页新增/编辑/删除项目经历 | 调用 `/resumes/{id}/projects` 系列接口，详情刷新 | P1 |
| 创建面试 | 访问 `/interviews/create`，选择真实简历和模式 | 调用 `POST /interviews`，跳转房间 | P0 |
| 进入面试房间 | 访问 `/interviews/room/{id}` | 调用 current；未开始时可点击 start | P0 |
| 提交答案 | 输入答案提交 | 调用 answer，展示真实 AI 评分/追问/知识点 | P0 |
| AI 评分展示 | 提交后查看右侧评估 | 不出现前端伪造分数；缺字段显示空态 | P0 |
| AI 追问展示 | 后端返回 follow-up 时继续作答 | 当前问题切换为追问，追问原因/知识点展示 | P0 |
| 结束面试 | 手动或 nextAction=FINISH 结束 | 调用 finish，跳转报告页 | P0 |
| 查看面试报告 | 访问 `/interviews/{id}/report` | 轮询 generating，generated 后展示报告 | P0 |
| 面试历史 | 访问 `/interviews/history` | 调用 `/interviews`，详情/报告入口可达 | P0 |

## 6. 管理端回归清单

| 链路 | 测试步骤 | 预期结果 | 优先级 |
| -- | ---- | ---- | --- |
| 管理后台首页 | 管理员访问 `/admin` | 概览真实接口加载，demo 图表明确标注 | P0 |
| 题目管理 | 访问 `/admin/questions` | 查询、分页、表格深色可读 | P0 |
| 分类管理 | 访问 `/admin/question-categories` | CRUD 正常，题目页分类下拉可用 | P0 |
| 标签管理 | 访问 `/admin/question-tags` | CRUD 正常，题目页标签下拉可用 | P0 |
| 题组管理 | 访问 `/admin/question-groups` | CRUD 正常，题目页题组下拉可用 | P1 |
| Prompt 管理 | 访问 `/admin/ai/prompts` | 模板 CRUD、启停正常；版本能力标待接入 | P0 |
| AI 调用日志 | 访问 `/admin/ai/logs` | 查询、详情抽屉、当前页统计正常 | P0 |
| 系统配置 | 访问 `/admin/system/configs` | 查询、新增、编辑、删除正常；不可编辑项 disabled | P0 |
| 表格分页 | 各管理列表翻页、切换 pageSize | 请求参数正确，表格无白块 | P0 |
| 搜索筛选 | 输入关键字/状态筛选 | 请求参数正确，重置后恢复 | P0 |
| 新增 / 编辑 / 删除 | 各 CRUD 页面执行操作 | Dialog/Drawer 可读，保存后刷新列表 | P0 |
| 启用 / 禁用 | 用户、题目、Prompt 等状态切换 | 状态接口调用成功，表格状态更新 | P0 |
| 管理员权限拦截 | 管理员访问 `/admin/**` | 可访问 | P0 |
| 普通用户访问后台拦截 | 普通用户访问 `/admin` | 跳转 `/403` | P0 |
| 未登录后台拦截 | 清 token 后访问 `/admin` | 跳转登录并带 redirect | P0 |

## 7. 视觉与交互回归清单

| 页面/组件 | 检查点 | 预期结果 | 优先级 |
| ----- | --- | ---- | --- |
| 登录页 | 文本、输入框、按钮 | 深色背景下可读，错误提示清楚 | P0 |
| 用户端 Layout | Header、Sidebar、内容区 | 不白屏，菜单 active 正确 | P0 |
| 管理端 Layout | Header、Sidebar、Tabs/Breadcrumb | 刷新后状态正常，不遮挡内容 | P0 |
| 侧边栏收缩 | 用户端/管理端点击收缩 | 宽度、图标、内容区布局正常 | P1 |
| 页面刷新 | 刷新用户端与管理端深层路由 | 不丢权限、不白屏 | P0 |
| Element Plus 表格 | 管理列表、报告阶段表 | 表头、行、hover、空态无明显白块 | P0 |
| 表单输入 | 登录、简历、面试创建、管理弹窗 | label、placeholder、输入文字可读 | P0 |
| 弹窗 / 抽屉 | CRUD Dialog、日志详情抽屉 | 背景、文字、按钮、滚动区域可读 | P0 |
| 下拉框 / 日期选择器 | 各筛选和配置表单 | 弹层深色可读，选中/hover 明显 | P1 |
| 分页 | 用户端/管理端列表 | 页码、禁用、hover 可读 | P1 |
| Markdown / 代码块 | 题目详情、面试房间、报告页 | 文本、代码块、列表清晰 | P0 |
| 窄屏 | 375px/768px 宽度 | 不严重横向溢出；表格可横向滚动或布局折叠 | P1 |

## 8. Demo / 待接入数据检查

* 是否发现未标注 demo 数据：未发现明确未标注的 demo 图表；管理首页 demo 区域已多处标注。用户工作台“mode: resume + question bank + AI mock”属于文案风险，建议改成“AI interview”避免误读为 Mock 数据。
* 是否发现按钮跳 404 风险：静态检查未发现菜单或主要按钮指向不存在路由；需浏览器点击确认详情/报告运行时 ID 跳转。
* 是否发现伪造 AI 结果：未发现前端伪造 AI 评分、优化结果或学习计划结果；报告和房间都声明来自真实接口，缺字段为空态。
* 是否发现待接入入口未标注：未发现严重未标注入口；简历上传、AI 优化、学习计划、行业场景、管理统计均有待接入或 disabled 标注。
* 需要后续替换真实接口的数据：
  * `AdminDashboardView.vue` 的趋势图、分布图、Token 趋势、模型分布、待办项 demo 数据
  * `DashboardView.vue` 的平均得分、学习计划进度等聚合字段
  * `ResumeListView.vue` 的解析数量、AI 优化状态
  * `PromptTemplateView.vue` 的版本 diff / 灰度发布
  * `QuestionManageView.vue` 的 AI 生成题审核池入口

## 9. 问题清单与优先级

### P0 必须修

* 静态分析未发现 P0 阻断项；`npm run build` 通过，核心菜单未发现 404 指向，页面未发现直接绕过 API 封装。

### P1 建议修

* V2 简历上传/解析/优化后端能力尚未在 `src/api/resume.ts` 暴露，前端目前只能 disabled 标注，无法进入真实 V2 简历链路。
* `InterviewCreateView.vue` 已提交 `industryDirection`、`difficulty`、`interviewerStyle` 等字段，需用真实后端回归确认合同完全兼容。
* `AdminDashboardView.vue` demo 统计较多，虽然已标注，但上线/作品集录屏前建议接入真实统计或收敛展示。
* 用户工作台终端文案含 `AI mock`，可能与“禁止 Mock 冒充真实接口”的验收语言冲突，建议下一轮仅改文案。

### P2 后续优化

* `refreshTokenApi` 定义未使用，后续可明确刷新 token 策略。
* `/password` 无侧边栏入口，需确认用户菜单是否可达。
* 管理端当前页统计文案属于真实当前页计算，不是后端聚合统计；可后续接入聚合指标。
* 大 chunk warning 可在回归稳定后做分包优化，本轮不处理。

## 10. 下一步建议

* 是否可以进入浏览器真实回归：可以。静态检查和构建均通过，建议进入第 7 步-B 浏览器真实回归。
* 是否需要先做小修：不强制。若希望减少验收歧义，建议先做两个小修：工作台 `AI mock` 文案、确认 `/password` 入口。
* 下一轮建议执行什么任务：第 7 步-B，启动前端并连接后端网关，按本报告第 5、6、7 节执行浏览器真实回归。
* 如果要修，应该先修哪些文件：
  * `src/views/user/DashboardView.vue`：调整 `AI mock` 文案，避免 Mock 误解。
  * `src/layouts/UserLayout.vue` 或用户菜单组件：确认/补充修改密码入口。
  * `src/api/resume.ts`、`src/views/resume/ResumeListView.vue`、`src/views/resume/ResumeEditView.vue`：后续正式接入 V2 简历上传/解析/优化时优先修改。
