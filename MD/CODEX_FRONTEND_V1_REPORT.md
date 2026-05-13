# CodeCoachAI-vue 前端 V1 开发报告

## 1. 本次任务目标

完成 CodeCoachAI-vue 前端 V1 可演示闭环：认证登录、用户工作台、题库浏览与刷题、错题和收藏、简历与项目经历维护、AI 模拟面试创建与房间答题、面试历史和报告、管理端题库、Prompt、AI 调用日志和系统配置基础维护。

## 2. 实际创建或修改的目录

- `src/api`：补齐题库、分类、标签、问题组、简历、面试、AI 管理、系统配置 API。
- `src/components`：新增 Markdown、状态标签、题库元信息、筛选、简历项目表单、报告图表组件。
- `src/constants`：新增 V1 枚举和路由常量。
- `src/router`：补齐用户端和管理端路由，新增面试详情路由。
- `src/stores`：保留认证状态，新增应用 store。
- `src/types`：补齐 auth/user/question/resume/interview/ai/system 类型。
- `src/utils`：补齐请求、token、storage、format、route 等工具。
- `src/views`：实现认证、用户中心、题库、简历、面试、管理端页面。

## 3. 新增关键文件

- `src/api/questionCategory.ts`
- `src/api/questionTag.ts`
- `src/api/questionGroup.ts`
- `src/components/common/MarkdownPreview.vue`
- `src/components/common/StatusTag.vue`
- `src/components/question/QuestionFilters.vue`
- `src/components/question/QuestionMeta.vue`
- `src/components/resume/ResumeProjectForm.vue`
- `src/components/report/ReportChart.vue`
- `src/constants/enums.ts`
- `src/constants/route.ts`
- `src/stores/app.ts`
- `src/types/ai.ts`
- `src/types/system.ts`
- `src/utils/format.ts`
- `src/utils/route.ts`
- `src/views/interview/InterviewDetailView.vue`

## 4. 已实现页面清单

- 认证：`LoginView`、`RegisterView`
- 用户中心：`DashboardView`、`ProfileView`、`PasswordView`
- 题库用户端：`QuestionListView`、`QuestionDetailView`、`WrongQuestionView`、`FavoriteQuestionView`
- 简历：`ResumeListView`、`ResumeEditView`
- 面试：`InterviewCreateView`、`InterviewRoomView`、`InterviewHistoryView`、`InterviewDetailView`、`InterviewReportView`
- 管理端：`AdminDashboardView`、`UserManageView`、`RoleManageView`、`QuestionManageView`、`QuestionCategoryManageView`、`QuestionTagManageView`、`QuestionGroupManageView`、`PromptTemplateView`、`AiCallLogView`、`SystemConfigView`
- 错误页：`ForbiddenView`、`NotFoundView`

## 5. 已实现 API 封装清单

- 认证：`/auth/login`、`/auth/register`、`/auth/logout`、`/auth/current-user`、`/auth/refresh-token`
- 用户：`/users/profile`、`/users/password`、`/users/overview`
- 管理用户：`/admin/users`、`/admin/users/{id}/status`、`/admin/roles`
- 题库用户端：`/questions`、`/questions/{id}`、`/questions/{id}/answers`、`/questions/{id}/favorite`、`/questions/favorites`、`/questions/wrong-records`、`/questions/{id}/mastery`
- 题库管理端：`/admin/questions/**`、`/admin/question-categories/**`、`/admin/question-tags/**`、`/admin/question-groups/**`
- 简历：`/resumes`、`/resumes/{id}`、`/resumes/{id}/default`、`/resumes/{resumeId}/projects`、`/resumes/projects/{projectId}`
- 面试：`/interviews`、`/interviews/{id}/start`、`/interviews/{id}/current`、`/interviews/{id}/answer`、`/interviews/{id}/finish`、`/interviews/{id}/report/retry`、`/interviews/{id}/report`
- AI 管理：`/admin/ai/prompts/**`、`/admin/ai/logs/**`
- 系统：`/admin/system/overview`、`/admin/configs/**`

## 6. 已实现路由清单

- 公共：`/login`、`/register`、`/403`、`/404`
- 用户端：`/`、`/dashboard`、`/profile`、`/password`、`/questions`、`/questions/:id`、`/questions/wrong-records`、`/questions/favorites`、`/resumes`、`/resumes/create`、`/resumes/:id/edit`、`/interviews/create`、`/interviews/room/:id`、`/interviews/history`、`/interviews/:id`、`/interviews/:id/report`
- 管理端：`/admin`、`/admin/users`、`/admin/roles`、`/admin/questions`、`/admin/question-categories`、`/admin/question-tags`、`/admin/question-groups`、`/admin/ai/prompts`、`/admin/ai/logs`、`/admin/system/configs`

## 7. 已实现 Pinia store

- `src/stores/auth.ts`：token、userInfo、roles、login、register、logout、fetchCurrentUser、setToken、clearAuth、isAdmin、hasRole。
- `src/stores/user.ts`：保留用户模块扩展位。
- `src/stores/app.ts`：保留应用级状态扩展位。

## 8. 已实现路由守卫逻辑

- 未登录访问受保护页面跳转 `/login`。
- 登录页保留 `redirect` 参数。
- 已登录访问 `/login` 或 `/register` 跳转 `/dashboard`。
- 本地有 token 但缺少用户信息时自动调用 `/auth/current-user`。
- `/admin/**` 需要 `ADMIN` 角色，否则进入 `/403`。
- current-user 失败后清理 token 和本地用户状态。

## 9. 题库模块完成情况

- 用户端题库支持关键词、分类、标签、难度筛选和分页。
- 题目详情支持 Markdown 展示、提交答案、参考答案、解析、收藏、取消收藏和掌握状态维护。
- 错题本使用 `GET /questions/wrong-records`，支持分页和标记掌握。
- 收藏题使用 `GET /questions/favorites`，支持取消收藏和跳转详情。
- 管理端题目、分类、标签、问题组均提供基础 CRUD、启用禁用和删除入口。

## 10. 简历模块完成情况

- 简历列表支持查询、分页、新建、编辑、删除、设置默认简历。
- 简历编辑支持简历名称、求职方向、技能栈、工作摘要、教育经历、默认简历。
- 项目经历支持新增、编辑、删除，字段覆盖项目名称、时间、背景、技术栈、职责、核心功能、难点、优化成果和补充说明。
- 未实现文件上传、PDF/Word 解析或 AI 简历优化。

## 11. 面试模块完成情况

- 创建面试支持面试模式、目标岗位、经验年限、行业方向、难度、面试官风格、是否基于简历、简历选择、可选问题组和题目数量。
- 面试房间支持 start、current、answer、finish 流程。
- `nextAction` 已处理 `FOLLOW_UP`、`NEXT_QUESTION`、`NEXT_STAGE`、`FINISH`。
- answer 后不直接生成报告，`FINISH` 时调用 `/interviews/{id}/finish`，再进入报告页。
- 面试历史支持分页、状态筛选、详情、房间和报告入口。
- 面试详情展示配置、简历快照、阶段和问答记录。
- 面试报告展示总分、阶段得分 ECharts、Markdown 总结、亮点、问题、薄弱知识点、复习建议、问答明细和报告失败重试。

## 12. 管理端模块完成情况

- 管理首页接入 `/admin/system/overview`，后端不可用时显示 0 值基础卡片。
- 用户管理接入 `/admin/users` 和 `/admin/users/{id}/status`。
- 角色管理接入 `/admin/roles`，只读展示。
- 题目、分类、标签、问题组提供 V1 基础维护。
- 系统配置接入 `/admin/configs/**`。

## 13. Prompt 模板和 AI 调用日志完成情况

- Prompt 模板接入 `/admin/ai/prompts/**`，支持查询、新增、编辑、启用和禁用。
- AI 调用日志接入 `/admin/ai/logs/**`，支持用户、面试、场景、状态筛选和详情抽屉。
- 未实现 Prompt 版本管理、A/B 测试、重新调用或失败重试任务中心。

## 14. 已真实对接接口

已按 API 层封装真实 Gateway 路径，页面不直接写 axios 请求。认证、用户、题库、简历、面试、管理端题库、AI 管理和系统配置均走真实接口封装。

## 15. 等待后端实现或联调的接口

- 管理首页 `/admin/system/overview` 聚合字段需要以后端实现为准。
- 管理端题目编辑若列表接口不返回 `content`、`answer`、`analysis`，需要后端补详情接口或列表补字段。
- 用户端题库分类和标签筛选目前没有明确公开列表接口，前端从当前题目列表中提取筛选项，建议后端补充用户端只读分类/标签接口。
- Prompt 模板字段中 `templateContent`、`systemPrompt`、`userPromptTemplate` 的拆分需要以后端最终 DTO 为准。

## 16. mock / fallback 说明

- 登录、注册、current-user 未做 mock。
- 题库、简历、面试、管理端接口均优先真实接口。
- 用户端题库分类和标签筛选项从已加载题目记录中派生，属于轻量 fallback。
- Dashboard 和 AdminDashboard 聚合统计在接口失败时保留 0 值展示，属于可演示 fallback。
- 未引入大型 mock server。

## 17. 边界确认

- 已确认前端源码未调用 `/inner/**`。
- 已确认未新增用户端 `/ai/**` 路由。
- 管理端 AI 页面仅使用 `/admin/ai/**`。
- 所有请求均通过 `src/utils/request.ts`，baseURL 读取 `VITE_API_BASE_URL`。
- 未使用旧接口 `/questions/answer` 或 `/questions/wrongs`。
- 未实现 SSE / WebSocket、文件上传、MinIO、Elasticsearch、学习计划、AI 简历优化、AI 题目生成、复杂 RBAC。

## 18. 构建结果

- 已执行：`npm install -D @types/markdown-it`
- 已执行：`npm run build`
- 结果：通过。
- 构建警告：Rollup 对第三方库 pure 注释的普通警告；`elementPlus` 和 `InterviewReportView` chunk 超过 1000KB，后续可通过手动分包优化。

## 19. 当前 TODO

- 与后端确认 Gateway 端口，当前 `.env.development` 使用 `http://localhost:8080`。
- 与后端确认管理端题目是否提供详情接口或列表完整字段。
- 与后端确认用户端分类/标签只读接口。
- 根据真实联调结果调整个别 VO 字段命名。
- 后续可优化 ECharts 和 Element Plus chunk 拆包。

## 20. 下一阶段建议

1. 启动 Java 后端 Gateway，逐页联调认证、题库、简历和面试流程。
2. 补充管理端题目详情接口或调整列表字段，避免编辑已有题目时内容为空。
3. 增加用户端分类/标签公开只读接口，提升题库筛选体验。
4. 补充页面级联调用例和少量端到端冒烟测试。
5. 根据后端错误码完善业务级错误文案。
