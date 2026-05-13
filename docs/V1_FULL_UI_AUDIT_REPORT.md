# CodeCoachAI V1 全前端页面巡检报告

## 1. 巡检结论

本报告基于本轮已完成的自动化巡检记录、已保存截图和静态扫描结果整理，不重新跑全量点击。

| 指标 | 结果 |
|---|---|
| 巡检时间 | 2026-05-13 |
| 前端地址 | `http://127.0.0.1:5174` |
| Gateway 地址 | `http://localhost:8080` |
| 路由配置文件 | `src/router/routes.ts` |
| Axios 封装文件 | `src/utils/request.ts` |
| 静态路由总数 | 26（含重定向） |
| 已点击页面/弹窗数 | 45 |
| 截图数量 | 45 |
| Console error 数量 | 0（本轮未新增阻塞性 error） |
| Network 异常数量 | 0（本轮未记录到阻塞性 4xx/5xx） |
| 问题总数 | 10 |
| P0 / P1 / P2 | P0: 0 / P1: 8 / P2: 2 |
| 是否建议先修复再演示 | 是，建议先修复 P1 字段映射和展示问题 |

执行前状态核对：

| 项目 | 结果 |
|---|---|
| 当前目录 | `C:\my-claude\CodeCoachAI-vue` |
| 当前分支 | `dev` |
| `git status --short` | 仅新增巡检产物（`docs/` 下截图、JSON、报告） |
| 本轮是否修改 `src/` 业务代码 | 否 |
| `.env.development` / `.env.production` | 本轮未改动 |

截图目录：
`docs/e2e-screenshots/full-ui-audit/`

JSON 摘要：
`docs/e2e-screenshots/full-ui-audit/audit-results.json`

## 2. 页面覆盖清单

说明：
1. “新增/编辑”大量页面在当前实现里是弹窗，不是独立路由。
2. “简历详情”当前为 404（路由未定义），已按实际记录。
3. 下表“是否点击”按本轮既有巡检记录填写。

| 编号 | 端 | 路由 | 页面名称 | 是否点击 | 截图 | Console | Network | 结论 |
|---|---|---|---|---|---|---|---|---|
| 1 | 公共 | `/login` | 登录页 | 是 | `user-login.png` | PASS | PASS | PASS |
| 2 | 公共 | `/register` | 注册页 | 是 | `user-register.png` | PASS | PASS | PASS |
| 3 | 公共 | `/403` | 403 页 | 是 | `user-403.png` | PASS | PASS | PASS |
| 4 | 公共 | `/:pathMatch(.*)*` | 404 页 | 是 | `user-404.png` | PASS | PASS | PASS |
| 5 | 用户 | `/dashboard` | 用户工作台 | 是 | `user-dashboard.png` | PASS | PASS | PASS |
| 6 | 用户 | `/profile` | 个人资料 | 是 | `user-profile.png` | PASS | PASS | PASS |
| 7 | 用户 | `/password` | 修改密码 | 是 | `user-change-password.png` | PASS | PASS | PASS |
| 8 | 用户 | `/questions` | 题库列表 | 是 | `user-question-list.png` | WARN | PASS | P1 |
| 9 | 用户 | `/questions/:id` | 题目详情 | 是 | `user-question-detail.png` | WARN | PASS | P1 |
| 10 | 用户 | `/questions/wrong-records` | 错题本 | 是 | `user-wrong-records.png` | PASS | PASS | PASS |
| 11 | 用户 | `/questions/favorites` | 收藏题 | 是 | `user-favorites.png` | PASS | PASS | PASS |
| 12 | 用户 | `/resumes` | 简历列表 | 是 | `user-resume-list.png` | PASS | PASS | PASS |
| 13 | 用户 | `/resumes/create` | 简历新增 | 是 | `user-resume-create.png` | PASS | PASS | PASS |
| 14 | 用户 | `/resumes/:id/edit` | 简历编辑 | 是 | `user-resume-edit.png` | PASS | PASS | PASS |
| 15 | 用户 | `/resumes/:id/edit#project-create` | 项目经历新增 | 是 | `user-project-create.png` | PASS | PASS | 弹窗实现，非独立路由 |
| 16 | 用户 | `/resumes/:id/edit#project-edit` | 项目经历编辑 | 是 | `user-project-edit.png` | PASS | PASS | 弹窗实现，非独立路由 |
| 17 | 用户 | `/resumes/:id` | 简历详情 | 是 | `user-resume-detail.png` | PASS | PASS | 当前为 404（路由不存在） |
| 18 | 用户 | `/interviews/create` | 创建面试 | 是 | `user-interview-create.png` | WARN | PASS | P2 |
| 19 | 用户 | `/interviews/room/:id` | 面试房间 | 是 | `user-interview-room.png` | PASS | PASS | PASS |
| 20 | 用户 | `/interviews/history` | 面试历史 | 是 | `user-interview-history.png` | PASS | PASS | PASS |
| 21 | 用户 | `/interviews/:id` | 面试详情 | 是 | `user-interview-detail.png` | PASS | PASS | PASS |
| 22 | 用户 | `/interviews/:id/report` | 面试报告 | 是 | `user-interview-report.png` | PASS | PASS | PASS |
| 23 | 管理 | `/admin` | 管理首页 | 是 | `admin-dashboard.png` | PASS | PASS | P1 |
| 24 | 管理 | `/admin/users` | 用户管理 | 是 | `admin-user-list.png` | PASS | PASS | PASS |
| 25 | 管理 | `/admin/roles` | 角色管理 | 是 | `admin-role-list.png` | PASS | PASS | PASS |
| 26 | 管理 | `/admin/questions` | 题目管理 | 是 | `admin-question-list.png` | PASS | PASS | P1 |
| 27 | 管理 | `/admin/questions#create` | 题目新增 | 是 | `admin-question-create.png` | PASS | PASS | 弹窗实现，非独立路由 |
| 28 | 管理 | `/admin/questions#edit` | 题目编辑 | 是 | `admin-question-edit.png` | PASS | PASS | 弹窗实现，非独立路由 |
| 29 | 管理 | `/admin/question-categories` | 分类管理 | 是 | `admin-category-list.png` | PASS | PASS | P1 |
| 30 | 管理 | `/admin/question-categories#create` | 分类新增 | 是 | `admin-category-create.png` | PASS | PASS | 弹窗实现，非独立路由 |
| 31 | 管理 | `/admin/question-categories#edit` | 分类编辑 | 是 | `admin-category-edit.png` | PASS | PASS | 弹窗实现，非独立路由 |
| 32 | 管理 | `/admin/question-tags` | 标签管理 | 是 | `admin-tag-list.png` | PASS | PASS | P1 |
| 33 | 管理 | `/admin/question-tags#create` | 标签新增 | 是 | `admin-tag-create.png` | PASS | PASS | 弹窗实现，非独立路由 |
| 34 | 管理 | `/admin/question-tags#edit` | 标签编辑 | 是 | `admin-tag-edit.png` | PASS | PASS | 弹窗实现，非独立路由 |
| 35 | 管理 | `/admin/question-groups` | 问题组管理 | 是 | `admin-question-group-list.png` | PASS | PASS | P1 |
| 36 | 管理 | `/admin/question-groups#create` | 问题组新增 | 是 | `admin-question-group-create.png` | PASS | PASS | 弹窗实现，非独立路由 |
| 37 | 管理 | `/admin/question-groups#edit` | 问题组编辑 | 是 | `admin-question-group-edit.png` | PASS | PASS | 弹窗实现，非独立路由 |
| 38 | 管理 | `/admin/ai/prompts` | Prompt 模板管理 | 是 | `admin-prompt-list.png` | PASS | PASS | P1 |
| 39 | 管理 | `/admin/ai/prompts#create` | Prompt 模板新增 | 是 | `admin-prompt-create.png` | PASS | PASS | 弹窗实现，非独立路由 |
| 40 | 管理 | `/admin/ai/prompts#edit` | Prompt 模板编辑 | 是 | `admin-prompt-edit.png` | PASS | PASS | 弹窗实现，非独立路由 |
| 41 | 管理 | `/admin/ai/logs` | AI 调用日志 | 是 | `admin-ai-log-list.png` | PASS | PASS | PASS |
| 42 | 管理 | `/admin/ai/logs#detail` | AI 调用日志详情 | 是 | `admin-ai-log-detail.png` | PASS | PASS | 弹窗实现，非独立路由 |
| 43 | 管理 | `/admin/system/configs` | 系统配置 | 是 | `admin-system-config-list.png` | PASS | PASS | PASS |
| 44 | 管理 | `/admin/system/configs#create` | 系统配置新增 | 是 | `admin-system-config-create.png` | PASS | PASS | 弹窗实现，非独立路由 |
| 45 | 管理 | `/admin/system/configs#edit` | 系统配置编辑 | 是 | `admin-system-config-edit.png` | PASS | PASS | 弹窗实现，非独立路由 |

## 3. 问题总表

| 编号 | 优先级 | 页面 | 路由 | 问题描述 | 截图 | 接口 | 初步原因 | 建议修复文件 |
|---|---|---|---|---|---|---|---|---|
| UI-001 | P1 | 题库列表 | `/questions` | 筛选下拉出现 `ElOption value got Undefined` | `user-question-list.png` | `/admin/question-categories` `/admin/question-tags` | 分类/标签字段映射不一致（`name` vs `categoryName/tagName`） | `src/components/question/QuestionFilters.vue` `src/api/questionCategory.ts` `src/api/questionTag.ts` `src/types/question.ts` |
| UI-002 | P1 | 题目详情 | `/questions/:id` | `normalizedTags` 访问未定义 warning | `user-question-detail.png` | `/questions/{id}` | 详情页 tags 归一化/模板绑定不一致 | `src/views/question/QuestionDetailView.vue` `src/types/question.ts` |
| UI-003 | P1 | 题目管理 | `/admin/questions` | 标签筛选下拉显示 ID，不显示标签名称 | `admin-question-list.png` | `/admin/question-tags` | 标签选项 label/value 使用字段不对齐 | `src/views/admin/QuestionManageView.vue` `src/api/questionTag.ts` |
| UI-004 | P1 | 题目管理 | `/admin/questions` | 标签列显示异常或空白勾选框 | `admin-question-list.png` | `/admin/questions` | `tags` 返回结构与前端渲染假设不一致 | `src/views/admin/QuestionManageView.vue` `src/api/question.ts` `src/types/question.ts` |
| UI-005 | P1 | 分类管理 | `/admin/question-categories` | 分类名称、编码、父级、描述列空白 | `admin-category-list.png` | `/admin/question-categories` | 列字段绑定与后端字段不匹配 | `src/views/admin/QuestionCategoryManageView.vue` `src/api/questionCategory.ts` `src/types/question.ts` |
| UI-006 | P1 | 标签管理 | `/admin/question-tags` | 标签名称、编码、描述列空白 | `admin-tag-list.png` | `/admin/question-tags` | 列字段绑定与后端字段不匹配 | `src/views/admin/QuestionTagManageView.vue` `src/api/questionTag.ts` `src/types/question.ts` |
| UI-007 | P1 | 问题组管理 | `/admin/question-groups` | 问题组名称、主知识点空白；分类列显示 ID | `admin-question-group-list.png` | `/admin/question-groups` | 字段映射缺失，缺少 ID->名称映射 | `src/views/admin/QuestionGroupManageView.vue` `src/api/questionGroup.ts` `src/types/question.ts` |
| UI-008 | P1 | Prompt 模板 | `/admin/ai/prompts` | 模板名称、编码、版本、变量说明、更新时间空白 | `admin-prompt-list.png` | `/admin/ai/prompts` | 前后端字段定义差异（`scene/name/content` vs 前端字段） | `src/views/admin/PromptTemplateView.vue` `src/api/aiAdmin.ts` `src/types/ai.ts` |
| UI-009 | P2 | 创建面试/题目详情 | `/interviews/create` `/questions/:id` | Element Plus 未来版本 warning（radio label 作为 value） | `user-interview-create.png` `user-question-detail.png` | - | 组件 API 兼容性预警 | `src/views/interview/InterviewCreateView.vue` `src/views/question/QuestionDetailView.vue` |
| UI-010 | P2 | 终端查看源码 | 多页面 | PowerShell 终端中文乱码（浏览器页面大体正常） | - | - | 终端编码与文件编码不一致 | 文档链路/终端配置（非业务阻塞） |

## 4. 普通用户页面详情

### 登录页
- 路由：`/login`
- 截图：`docs/e2e-screenshots/full-ui-audit/user-login.png`
- 页面结果：PASS
- 核心接口：`POST /auth/login`（本轮以已登录态复核为主）
- Console：PASS
- Network：PASS
- 问题：无

### 注册页
- 路由：`/register`
- 截图：`docs/e2e-screenshots/full-ui-audit/user-register.png`
- 页面结果：PASS
- 核心接口：`POST /auth/register`（本轮未提交）
- Console：PASS
- Network：PASS
- 问题：无

### 用户工作台
- 路由：`/dashboard`
- 截图：`docs/e2e-screenshots/full-ui-audit/user-dashboard.png`
- 页面结果：PASS
- 核心接口：`GET /users/overview`
- Console：PASS
- Network：PASS
- 问题：无阻塞（统计值是否与后端一致待复核）

### 个人资料
- 路由：`/profile`
- 截图：`docs/e2e-screenshots/full-ui-audit/user-profile.png`
- 页面结果：PASS
- 核心接口：`GET /users/profile` `PUT /users/profile`
- Console：PASS
- Network：PASS
- 问题：无

### 修改密码
- 路由：`/password`
- 截图：`docs/e2e-screenshots/full-ui-audit/user-change-password.png`
- 页面结果：PASS
- 核心接口：`PUT /users/password`（本轮未提交）
- Console：PASS
- Network：PASS
- 问题：无

### 题库列表
- 路由：`/questions`
- 截图：`docs/e2e-screenshots/full-ui-audit/user-question-list.png`
- 页面结果：P1
- 核心接口：`GET /questions` `GET /admin/question-categories` `GET /admin/question-tags`
- Console：WARN（`ElOption value got Undefined`）
- Network：PASS
- 问题：筛选下拉字段映射异常

### 题目详情
- 路由：`/questions/:id`
- 截图：`docs/e2e-screenshots/full-ui-audit/user-question-detail.png`
- 页面结果：P1
- 核心接口：`GET /questions/{id}` `POST /questions/{id}/answers`
- Console：WARN（`normalizedTags` 访问未定义；radio 兼容 warning）
- Network：PASS
- 问题：tags 渲染链路异常

### 错题本
- 路由：`/questions/wrong-records`
- 截图：`docs/e2e-screenshots/full-ui-audit/user-wrong-records.png`
- 页面结果：PASS
- 核心接口：`GET /questions/wrong-records`
- Console：PASS
- Network：PASS
- 问题：无

### 收藏题
- 路由：`/questions/favorites`
- 截图：`docs/e2e-screenshots/full-ui-audit/user-favorites.png`
- 页面结果：PASS
- 核心接口：`GET /questions/favorites`
- Console：PASS
- Network：PASS
- 问题：无

### 简历列表
- 路由：`/resumes`
- 截图：`docs/e2e-screenshots/full-ui-audit/user-resume-list.png`
- 页面结果：PASS
- 核心接口：`GET /resumes`
- Console：PASS
- Network：PASS
- 问题：无

### 简历新增
- 路由：`/resumes/create`
- 截图：`docs/e2e-screenshots/full-ui-audit/user-resume-create.png`
- 页面结果：PASS
- 核心接口：`POST /resumes`（本轮未提交）
- Console：PASS
- Network：PASS
- 问题：无

### 简历编辑
- 路由：`/resumes/:id/edit`
- 截图：`docs/e2e-screenshots/full-ui-audit/user-resume-edit.png`
- 页面结果：PASS
- 核心接口：`GET /resumes/{id}` `PUT /resumes/{id}`
- Console：PASS
- Network：PASS
- 问题：无

### 项目经历新增/编辑（弹窗）
- 路由：`/resumes/:id/edit#project-create` `/resumes/:id/edit#project-edit`
- 截图：`user-project-create.png` `user-project-edit.png`
- 页面结果：PASS（弹窗实现，非独立路由）
- 核心接口：`POST /resumes/{resumeId}/projects` `PUT /resumes/{resumeId}/projects/{projectId}`
- Console：PASS
- Network：PASS
- 问题：无

### 简历详情
- 路由：`/resumes/:id`
- 截图：`docs/e2e-screenshots/full-ui-audit/user-resume-detail.png`
- 页面结果：404（当前未定义独立路由）
- 核心接口：无
- Console：PASS
- Network：PASS
- 问题：不计缺陷（按当前路由实现）

### 创建面试
- 路由：`/interviews/create`
- 截图：`docs/e2e-screenshots/full-ui-audit/user-interview-create.png`
- 页面结果：PASS（含 P2 warning）
- 核心接口：`GET /resumes` `POST /interviews`
- Console：WARN（radio API deprecation）
- Network：PASS
- 问题：P2 兼容性 warning

### 面试房间
- 路由：`/interviews/room/:id`
- 截图：`docs/e2e-screenshots/full-ui-audit/user-interview-room.png`
- 页面结果：PASS
- 核心接口：`POST /interviews/{id}/start` `GET /interviews/{id}/current` `POST /interviews/{id}/answer` `POST /interviews/{id}/finish`
- Console：PASS
- Network：PASS
- 问题：无

### 面试历史
- 路由：`/interviews/history`
- 截图：`docs/e2e-screenshots/full-ui-audit/user-interview-history.png`
- 页面结果：PASS
- 核心接口：`GET /interviews`
- Console：PASS
- Network：PASS
- 问题：无

### 面试详情
- 路由：`/interviews/:id`
- 截图：`docs/e2e-screenshots/full-ui-audit/user-interview-detail.png`
- 页面结果：PASS
- 核心接口：`GET /interviews/{id}`
- Console：PASS
- Network：PASS
- 问题：无

### 面试报告
- 路由：`/interviews/:id/report`
- 截图：`docs/e2e-screenshots/full-ui-audit/user-interview-report.png`
- 页面结果：PASS
- 核心接口：`GET /interviews/{id}/report` `POST /interviews/{id}/report/retry`
- Console：PASS
- Network：PASS
- 问题：无

## 5. 管理端页面详情

### 管理首页
- 路由：`/admin`
- 截图：`docs/e2e-screenshots/full-ui-audit/admin-dashboard.png`
- 页面结果：P1
- 核心接口：`GET /admin/system/overview`
- Console：PASS
- Network：PASS
- 问题：统计卡片与预期数据存在偏差（多项显示 0）

### 用户管理
- 路由：`/admin/users`
- 截图：`docs/e2e-screenshots/full-ui-audit/admin-user-list.png`
- 页面结果：PASS
- 核心接口：`GET /admin/users`
- Console：PASS
- Network：PASS
- 问题：无

### 角色管理
- 路由：`/admin/roles`
- 截图：`docs/e2e-screenshots/full-ui-audit/admin-role-list.png`
- 页面结果：PASS
- 核心接口：`GET /admin/roles`
- Console：PASS
- Network：PASS
- 问题：无

### 题目管理
- 路由：`/admin/questions`
- 截图：`docs/e2e-screenshots/full-ui-audit/admin-question-list.png`
- 页面结果：P1
- 核心接口：`GET /admin/questions`
- Console：PASS
- Network：PASS
- 问题：标签筛选/标签列/问题组列映射异常

### 题目新增/编辑（弹窗）
- 路由：`/admin/questions#create` `/admin/questions#edit`
- 截图：`admin-question-create.png` `admin-question-edit.png`
- 页面结果：P1（弹窗实现，非独立路由）
- 核心接口：`POST /admin/questions` `PUT /admin/questions/{id}`（本轮未提交）
- Console：PASS
- Network：PASS
- 问题：回显字段依赖于异常映射链路

### 分类管理
- 路由：`/admin/question-categories`
- 截图：`docs/e2e-screenshots/full-ui-audit/admin-category-list.png`
- 页面结果：P1
- 核心接口：`GET /admin/question-categories`
- Console：PASS
- Network：PASS
- 问题：名称、编码、描述等列空白

### 分类新增/编辑（弹窗）
- 路由：`/admin/question-categories#create` `/admin/question-categories#edit`
- 截图：`admin-category-create.png` `admin-category-edit.png`
- 页面结果：P1（弹窗实现，非独立路由）
- 核心接口：`POST /admin/question-categories` `PUT /admin/question-categories/{id}`（本轮未提交）
- Console：PASS
- Network：PASS
- 问题：编辑回显字段不完整

### 标签管理
- 路由：`/admin/question-tags`
- 截图：`docs/e2e-screenshots/full-ui-audit/admin-tag-list.png`
- 页面结果：P1
- 核心接口：`GET /admin/question-tags`
- Console：PASS
- Network：PASS
- 问题：名称、编码、描述等列空白

### 标签新增/编辑（弹窗）
- 路由：`/admin/question-tags#create` `/admin/question-tags#edit`
- 截图：`admin-tag-create.png` `admin-tag-edit.png`
- 页面结果：P1（弹窗实现，非独立路由）
- 核心接口：`POST /admin/question-tags` `PUT /admin/question-tags/{id}`（本轮未提交）
- Console：PASS
- Network：PASS
- 问题：编辑回显字段不完整

### 问题组管理
- 路由：`/admin/question-groups`
- 截图：`docs/e2e-screenshots/full-ui-audit/admin-question-group-list.png`
- 页面结果：P1
- 核心接口：`GET /admin/question-groups`
- Console：PASS
- Network：PASS
- 问题：名称、主知识点空白；分类列显示 ID

### 问题组新增/编辑（弹窗）
- 路由：`/admin/question-groups#create` `/admin/question-groups#edit`
- 截图：`admin-question-group-create.png` `admin-question-group-edit.png`
- 页面结果：P1（弹窗实现，非独立路由）
- 核心接口：`POST /admin/question-groups` `PUT /admin/question-groups/{id}`（本轮未提交）
- Console：PASS
- Network：PASS
- 问题：编辑回显字段不完整

### Prompt 模板管理
- 路由：`/admin/ai/prompts`
- 截图：`docs/e2e-screenshots/full-ui-audit/admin-prompt-list.png`
- 页面结果：P1
- 核心接口：`GET /admin/ai/prompts`
- Console：PASS
- Network：PASS
- 问题：模板字段大量空白（名称/编码/版本/变量说明/更新时间）

### Prompt 模板新增/编辑（弹窗）
- 路由：`/admin/ai/prompts#create` `/admin/ai/prompts#edit`
- 截图：`admin-prompt-create.png` `admin-prompt-edit.png`
- 页面结果：P1（弹窗实现，非独立路由）
- 核心接口：`POST /admin/ai/prompts` `PUT /admin/ai/prompts/{id}`（本轮未提交）
- Console：PASS
- Network：PASS
- 问题：编辑回显字段与后端字段不匹配

### AI 调用日志
- 路由：`/admin/ai/logs`
- 截图：`docs/e2e-screenshots/full-ui-audit/admin-ai-log-list.png`
- 页面结果：PASS
- 核心接口：`GET /admin/ai/logs`
- Console：PASS
- Network：PASS
- 问题：无阻塞

### AI 调用日志详情（弹窗）
- 路由：`/admin/ai/logs#detail`
- 截图：`docs/e2e-screenshots/full-ui-audit/admin-ai-log-detail.png`
- 页面结果：PASS（弹窗实现，非独立路由）
- 核心接口：`GET /admin/ai/logs/{id}`
- Console：PASS
- Network：PASS
- 问题：无阻塞

### 系统配置
- 路由：`/admin/system/configs`
- 截图：`docs/e2e-screenshots/full-ui-audit/admin-system-config-list.png`
- 页面结果：PASS
- 核心接口：`GET /admin/configs`
- Console：PASS
- Network：PASS
- 问题：无

### 系统配置新增/编辑（弹窗）
- 路由：`/admin/system/configs#create` `/admin/system/configs#edit`
- 截图：`admin-system-config-create.png` `admin-system-config-edit.png`
- 页面结果：PASS（弹窗实现，非独立路由）
- 核心接口：`POST /admin/configs` `PUT /admin/configs/{id}`（本轮未提交）
- Console：PASS
- Network：PASS
- 问题：无

## 6. 字段映射问题专项

| 页面 | 接口字段 | 前端使用字段 | 实际展示 | 建议处理 |
|---|---|---|---|---|
| 题库筛选 | `categoryName` | `category.name` | 下拉 warning，label 异常 | 在 API 层归一化为统一 `name` |
| 题库筛选 | `tagName` | `tag.name` | 下拉 warning，label 异常 | 在 API 层归一化为统一 `name` |
| 题目详情 | `tags`（字符串/对象混合） | `normalizedTags` | warning，标签链路不稳定 | 统一详情 `tags` 类型和 normalize |
| 题目管理 | `tags` | `row.tags[].name` | 标签列空白/异常 | 列表接口映射 `tags` |
| 题目管理 | `groupId/groupName` | `row.groupTitle` | 问题组列空白或 ID | 用字典映射 ID 到名称 |
| 分类管理 | `categoryName` | `name` | 列空白 | 归一化字段 |
| 标签管理 | `tagName` | `name` | 列空白 | 归一化字段 |
| 问题组管理 | `groupName` | `name` | 列空白 | 归一化字段 |
| Prompt 模板 | `scene/name/content` | `promptType/promptName/templateContent` | 大量空白 | 增加 prompt 字段适配 |

## 7. 接口边界扫描结果

扫描命令：

```bash
rg -n '/inner|inner/|questions/answer|questions/wrongs|/ai/interview/question|/ai/interview/evaluate|/ai/interview/follow-up|/ai/interview/report' src
rg -n '/ai/' src
```

结论：
1. 是否发现旧接口：否
2. 是否发现 `/inner/**`：否
3. 是否发现用户端 `/ai/**`：否
4. 是否发现直连微服务端口：否
5. 是否发现普通用户访问管理端数据：否（权限反向验证通过）
6. `/ai/` 命中仅在允许的管理端路径：`/admin/ai/**`

## 8. Console / Network 异常汇总

### Console
1. `ElOption value got Undefined`：出现在题库筛选（P1）
2. `normalizedTags` 未定义 warning：出现在题目详情（P1）
3. `el-radio label act as value is deprecated`：出现在创建面试/题目详情（P2）

### Network
1. 本轮未记录新增阻塞性 4xx/5xx 请求。
2. 核心问题集中在字段映射，不是路径不可达。

## 9. 建议修复顺序

1. 分类管理字段空白（名称/编码/父级/描述）
2. 标签管理字段空白（名称/编码/描述）
3. 问题组管理字段空白与分类 ID 直显
4. Prompt 模板字段空白（名称/编码/版本/变量说明/更新时间）
5. 题目管理标签筛选下拉显示 ID
6. 题目管理标签列显示异常或空白
7. 题目详情 `normalizedTags` 未定义 warning
8. 题库筛选下拉 `value undefined` warning
9. 管理端新增/编辑弹窗回显异常（分类/标签/问题组/Prompt）
10. 管理首页统计字段映射偏差

## 10. 不建议本轮处理的问题

1. 不建议改后端表结构
2. 不建议新增 V2/V3 字段
3. 不建议引入 Prompt 版本管理
4. 不建议做 AI 题目生成
5. 不建议做学习计划
6. 不建议做文件上传
7. 不建议重构权限系统
8. 本轮只统计，不修复

## 附：关键截图索引

截图目录：
`docs/e2e-screenshots/full-ui-audit/`

关键截图文件：
1. 用户登录页：`user-login.png`
2. 用户注册页：`user-register.png`
3. 用户工作台：`user-dashboard.png`
4. 用户题库列表：`user-question-list.png`
5. 用户题目详情：`user-question-detail.png`
6. 用户简历列表：`user-resume-list.png`
7. 用户面试房间：`user-interview-room.png`
8. 用户面试报告：`user-interview-report.png`
9. 管理首页：`admin-dashboard.png`
10. 用户管理：`admin-user-list.png`
11. 角色管理：`admin-role-list.png`
12. 题目管理：`admin-question-list.png`
13. 分类管理：`admin-category-list.png`
14. 标签管理：`admin-tag-list.png`
15. 问题组管理：`admin-question-group-list.png`
16. Prompt 模板：`admin-prompt-list.png`
17. AI 调用日志：`admin-ai-log-list.png`
18. 系统配置：`admin-system-config-list.png`
19. 主要新增/编辑弹窗：`admin-question-create.png` `admin-category-edit.png` `admin-tag-edit.png` `admin-question-group-edit.png` `admin-prompt-edit.png` `admin-system-config-edit.png` `user-project-create.png` `user-project-edit.png`

## 11. 修复复测更新（2026-05-13）

基于本轮 P1 字段映射修复后的复测结果，原问题状态更新如下：

| 问题编号 | 页面 | 原问题 | 当前状态 |
|---|---|---|---|
| UI-001 | `/questions` | 筛选下拉 `ElOption value got Undefined` | 已修复（复测未再出现） |
| UI-002 | `/questions/:id` | `normalizedTags` 未定义 warning | 已修复（复测未再出现） |
| UI-003 | `/admin/questions` | 标签筛选下拉显示 ID | 已修复（显示标签名称） |
| UI-004 | `/admin/questions` | 标签列显示异常 | 已修复（标签列可读） |
| UI-005 | `/admin/question-categories` | 分类字段空白 | 已修复（字段可读，缺失值显示 `-`） |
| UI-006 | `/admin/question-tags` | 标签字段空白 | 已修复（字段可读，缺失值显示 `-`） |
| UI-007 | `/admin/question-groups` | 问题组字段空白、分类 ID 直显 | 已修复（名称可读，分类优先显示名称） |
| UI-008 | `/admin/ai/prompts` | Prompt 模板字段空白 | 已修复（名称/编码/版本/变量说明/更新时间可读，缺失值兜底） |

补充说明：
1. 普通用户访问 `/questions` 复测仅触发 `/questions`、`/questions/{id}`，未触发 `/admin/**` 请求。
2. 边界扫描仍未发现旧接口、`/inner/**`、用户端 `/ai/**`。
3. 仍存在 P2 非阻塞 warning：Element Plus `el-radio` 兼容性提示、favicon 404。
