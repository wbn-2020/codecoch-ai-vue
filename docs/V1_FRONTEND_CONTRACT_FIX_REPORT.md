# V1 前端契约收敛修复报告

## 1. 本次修复范围

本轮从中断处接手 `C:\my-claude\CodeCoachAI-vue` 前端仓库。接手时 `git status --short` 为空，说明上轮业务代码修复已经进入当前 `HEAD`，本轮未继续扩大业务代码改动范围。

本轮实际完成内容：

- 核对最近提交：`2ac17ec`、`d9020b1` 已包含 V1 字段映射和展示问题修复，当前 `HEAD` 为 `b4ab76c` merge 提交。
- 执行接口边界静态扫描。
- 执行 `npm run build`。
- 新增本报告文件：`docs/V1_FRONTEND_CONTRACT_FIX_REPORT.md`。

## 2. 修改文件清单

本轮实际修改：

- `docs/V1_FRONTEND_CONTRACT_FIX_REPORT.md`

当前 `HEAD` 中已核验的契约收敛相关文件：

- `src/api/system.ts`
- `src/views/admin/SystemConfigView.vue`
- `src/api/aiAdmin.ts`
- `src/views/admin/PromptTemplateView.vue`
- `src/types/ai.ts`
- `src/api/questionCategory.ts`
- `src/views/admin/QuestionCategoryManageView.vue`
- `src/api/questionTag.ts`
- `src/views/admin/QuestionTagManageView.vue`
- `src/api/questionGroup.ts`
- `src/views/admin/QuestionGroupManageView.vue`
- `src/api/question.ts`
- `src/views/admin/QuestionManageView.vue`
- `src/types/question.ts`
- `src/views/question/QuestionListView.vue`
- `src/components/question/QuestionFilters.vue`
- `src/api/interview.ts`
- `src/types/interview.ts`
- `src/views/interview/InterviewCreateView.vue`
- `src/views/interview/InterviewHistoryView.vue`
- `src/views/admin/AdminDashboardView.vue`
- `src/views/admin/AiCallLogView.vue`

## 3. 每个问题修复前后对照

### 系统配置页

- 修复前风险：可能调用不存在的 `GET /admin/configs/{key}` 和 `PUT /admin/configs/{key}/status`。
- 当前状态：`src/api/system.ts` 只保留 `GET /admin/configs`、`POST /admin/configs`、`PUT /admin/configs/{id}`、`DELETE /admin/configs/{id}`。
- 当前状态：`SystemConfigView.vue` 编辑弹窗直接使用当前行数据回显，保存编辑时按 `id` 调用更新接口。
- 当前状态：编辑已有配置时不展示状态切换开关，避免调用后端不支持的状态接口。

### Prompt 模板页

- 修复前风险：可能调用不存在的 `GET /admin/ai/prompts/{id}`，并提交前端自定义字段。
- 当前状态：`src/api/aiAdmin.ts` 未提供 Prompt 详情查询接口，编辑弹窗直接用当前行数据回显。
- 当前状态：创建和更新通过 `toBackendPromptDTO` 收敛为后端支持字段：`scene`、`name`、`content`、`status`。
- 当前状态：未实现 Prompt 版本管理，未迁移 Prompt 到 Nacos。

### 分类管理

- 修复前风险：可能调用不存在的 `/admin/question-categories/{id}/status`。
- 当前状态：`src/api/questionCategory.ts` 只保留列表、新增、编辑、删除接口。
- 当前状态：保存 payload 由 `toBackendCategoryDTO` 转为 `categoryName`、`categoryCode`、`parentId`、`sort`、`status`、`remark`。
- 当前状态：编辑弹窗直接使用当前行数据回显。

### 标签管理

- 修复前风险：可能调用不存在的 `/admin/question-tags/{id}/status`。
- 当前状态：`src/api/questionTag.ts` 只保留列表、新增、编辑、删除接口。
- 当前状态：保存 payload 由 `toBackendTagDTO` 转为 `tagName`、`tagCode`、`status`、`remark`。
- 当前状态：编辑弹窗直接使用当前行数据回显。

### 问题组管理

- 修复前风险：可能调用不存在的 `/admin/question-groups/{id}/status`，或提交 V2/V3 字段。
- 当前状态：`src/api/questionGroup.ts` 只保留列表、新增、编辑、删除接口。
- 当前状态：保存 payload 由 `toBackendGroupDTO` 收敛为 `groupName`、`categoryId`、`description`、`status`。
- 当前状态：分类列通过分类字典显示名称。
- 当前状态：未实现复杂题目绑定、Embedding、AI 判定等 V2/V3 能力。

### 题目管理

- 修复前风险：保存时可能丢失参考答案，或提交后端不支持的 `questionType`。
- 当前状态：`src/api/question.ts` 在创建和更新管理员题目时将前端 `answer` 映射为 `referenceAnswer`。
- 当前状态：管理员题目保存 payload 未提交 `questionType`。
- 当前状态：编辑时用 `row.answer || row.referenceAnswer || ''` 回显参考答案。

### 用户端题库筛选

- 修复前风险：用户端可能使用 `tagIds` 多选或误调 `/admin/question-tags`、`/admin/question-categories`。
- 当前状态：`QuestionFilters.vue` 使用 `model.tagId` 单选。
- 当前状态：`QuestionListView.vue` 的分类和标签筛选项从当前 `/questions` 返回数据派生。
- 当前状态：用户端题库页未调用 `/admin/question-tags` 或 `/admin/question-categories`。
- 当前状态：`getQuestionsApi` 和 `getFavoriteQuestionsApi` 只向后端传 `tagId`，不传 `tagIds`。

### 面试创建页

- 修复前风险：创建面试可能暴露或提交 `questionGroupId`，并误调 `/admin/question-groups`。
- 当前状态：`InterviewCreateView.vue` 未提供 `questionGroupId` 入口。
- 当前状态：`src/api/interview.ts` 的创建 payload 未包含 `questionGroupId`。
- 当前状态：面试创建页未调用 `/admin/question-groups`。

### 面试历史页

- 修复前风险：可能向后端传 `keyword`、`status`、`reportStatus` 等不支持筛选参数。
- 当前状态：`InterviewHistoryView.vue` 仅使用 `pageNo`、`pageSize` 查询并刷新列表，未提供这些筛选项。

### 管理首页和 AI 日志页

- 当前状态：管理首页通过 `GET /admin/system/overview` 展示后端统计字段。
- 当前状态：AI 日志页只使用 `GET /admin/ai/logs` 和 `GET /admin/ai/logs/{id}`，页面未暴露后端不支持的筛选项。
- 当前状态：未新增假数据或 mock 假功能。

## 4. 静态扫描结果

### 旧 inner / 用户端旧 AI 面试接口

命令：

```powershell
rg -n '/inner|inner/|questions/answer|questions/wrongs|/ai/interview/question|/ai/interview/evaluate|/ai/interview/follow-up|/ai/interview/report' src
```

结果：无命中。

结论：`/inner/**`、旧 `questions/answer`、旧 `questions/wrongs`、旧用户端 `/ai/interview/**` 接口已清零。

### 管理端分类 / 标签 / 问题组接口

命令：

```powershell
rg -n '/admin/question-categories|/admin/question-tags|/admin/question-groups' src
```

结果：有命中。

合理保留：

- `src/api/questionCategory.ts`：管理端分类列表、新增、编辑、删除接口。
- `src/api/questionTag.ts`：管理端标签列表、新增、编辑、删除接口。
- `src/api/questionGroup.ts`：管理端问题组列表、新增、编辑、删除接口。
- `src/components/layout/AdminSidebar.vue`：管理端菜单路由。

结论：命中均为管理端合法接口或管理端路由入口，未发现用户端页面直接调用这些 `/admin/**` 接口。

### 分类 / 标签 / 问题组 status 子路径

命令：

```powershell
rg -n '/admin/question-categories/.*/status|/admin/question-tags/.*/status|/admin/question-groups/.*/status' src
```

结果：无命中。

结论：不存在分类、标签、问题组的错误 `/status` 子路径调用。

### tagIds / questionGroupId / questionType / referenceAnswer / answer

命令：

```powershell
rg -n 'tagIds|questionGroupId|questionType|referenceAnswer|answer' src
```

结果：有命中。

合理保留：

- `src/api/question.ts`：兼容后端返回的 `tagIds`、`answer`、`referenceAnswer`，并将管理员题目保存的 `answer` 映射成 `referenceAnswer`。
- `src/types/question.ts`：保留后端响应兼容字段，以及管理员题目维护所需的 `tagIds`、`answer` 类型。
- `src/views/admin/QuestionManageView.vue`：管理员题目维护仍使用标签多选和前端 `answer` 表单字段，保存时由 API 层转换为 `referenceAnswer`，且不提交 `questionType`。
- `src/views/question/QuestionListView.vue`、`src/components/question/QuestionMeta.vue`、`src/views/question/QuestionDetailView.vue`：仅用于展示题型和答题表单，不是错误接口。
- `src/api/interview.ts`、`src/types/interview.ts`、`src/views/interview/InterviewRoomView.vue`：面试答题主流程字段和后端响应兼容字段，不是创建面试的 `questionGroupId` 提交。

结论：用户端题库筛选已使用 `tagId` 单选，未向 `/questions` 传 `tagIds`。管理员题目维护中的 `tagIds` 属于管理端保存标签关系能力，未按本次限制删除。

### AI 接口边界

命令：

```powershell
rg -n '/ai/' src
```

结果：有命中。

合理保留：

- `src/api/aiAdmin.ts`：`/admin/ai/prompts`、`/admin/ai/logs`、`/admin/ai/logs/{id}`。
- `src/components/layout/AdminSidebar.vue`：管理端 AI 菜单路由。

结论：只保留 `/admin/ai/**` 管理端接口，未发现用户端直接调用 `/ai/**`。

## 5. 构建结果

命令：

```powershell
npm run build
```

结果：通过。

说明：

- `vue-tsc -b` 通过。
- `vite build` 通过。
- Rollup `/* #__PURE__ */` 注释 warning 不阻塞。
- 大 chunk warning 不阻塞。

## 6. 是否仍有前端调用后端不存在接口

静态扫描未发现以下已知错误接口：

- `GET /admin/configs/{key}`
- `PUT /admin/configs/{key}/status`
- `GET /admin/ai/prompts/{id}`
- `/admin/question-categories/{id}/status`
- `/admin/question-tags/{id}/status`
- `/admin/question-groups/{id}/status`
- `/inner/**`
- 旧用户端 `/ai/interview/**`

仍建议进入真实浏览器联调，用 Network 面板确认运行时无 404。

## 7. 是否仍有用户端误调 /admin/**

静态扫描未发现用户端题库、面试创建、面试历史页面直接调用 `/admin/question-categories`、`/admin/question-tags`、`/admin/question-groups`。

保留的 `/admin/**` 命中均在管理端 API 文件或管理端菜单。

## 8. 是否仍有 /inner/** 或旧接口

无。

## 9. 是否还需要后端补接口

按当前 V1 契约收敛目标，不需要后端新增接口。

前端已经通过隐藏、移除或 API 层字段转换的方式避开未实现接口和后端不支持字段。

## 10. 是否可以进入 V1 演示整理

可以进入 V1 演示整理前的浏览器联调测试阶段。

建议下一步用真实浏览器登录管理员和普通用户账号，重点复测：

- 管理端系统配置、Prompt、分类、标签、问题组、题目、首页、AI 日志。
- 用户端题库、面试创建、面试历史。
- Network 中无 404、无 `/inner/**`、用户端无 `/admin/**`、无旧 AI 面试接口。

