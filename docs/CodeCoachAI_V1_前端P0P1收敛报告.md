# CodeCoachAI V1 前端 P0/P1 收敛报告

> 生成时间：2026-05-14  
> 仓库：`C:\my-claude\CodeCoachAI-vue`  
> 分支：`dev`  
> 包管理器：`npm`  
> 本轮范围：只修改前端仓库，不修改后端和文档仓库。

## 1. 仓库状态

### 当前分支

```text
dev
```

### 工作区状态

本轮修改前 `git status --short` 为空；本轮修改后存在前端代码和本报告变更。

### 最近提交

```text
e86e45e V1完善
1c9e765 docs: add V1 remaining P0 regression report
59e597d Fix user tag filtering to use real tag IDs
d6a348d Refine V1 frontend contract and interview flows
b4ab76c Merge remote-tracking branch 'origin/dev' into dev
2ac17ec Fix V1 field mapping and display issues
d9020b1 Fix V1 field mapping and display issues
b83297d Mark interview finish redirect retest as passed
```

## 2. 修改文件列表

### api

- `src/api/aiAdmin.ts`
- `src/api/interview.ts`

### types

- `src/types/ai.ts`
- `src/types/interview.ts`

### views

- `src/views/admin/AiCallLogView.vue`
- `src/views/admin/PromptTemplateView.vue`
- `src/views/interview/InterviewReportView.vue`

### docs

- `docs/CodeCoachAI_V1_前端P0P1收敛报告.md`

## 3. P0 修复结果表

| 编号 | 问题 | 是否修复 | 修改文件 | 验证方式 | 备注 |
|---|---|---|---|---|---|
| P0-01 | 去 Mock / 假数据 | 是 | 无新增 mock | `rg mock/TODO/FIXME/setTimeout/console.log` | 主链路未发现 Mock 或假加载残留 |
| P0-02 | Axios 请求层 | 是 | `src/utils/request.ts` 已有 | 静态检查 | 统一 `VITE_API_BASE_URL`、token、Result 解包、401/403 |
| P0-03 | 登录态和路由权限 | 是 | `src/stores/auth.ts`、`src/router/guards.ts` 已有 | 静态检查 | 未登录跳登录，普通用户访问 admin 跳 403 |
| P0-04 | 题目字段 `referenceAnswer` | 是 | `src/api/question.ts`、题目页面已在 HEAD | `rg referenceAnswer/answer` | 页面主字段为 `referenceAnswer`，`answer` 只作兼容 adapter |
| P0-05 | 当前问题字段 `questionContent` | 是 | `src/api/interview.ts` | `rg questionText` | 页面使用 `questionContent`，`questionText` 仅作后端旧字段兼容 |
| P0-06 | 报告字段渲染 | 是 | `src/api/interview.ts`、`src/types/interview.ts`、`InterviewReportView.vue` | `npm run build` | 新增 `id/questionReviews` 兼容，数组字段支持 JSON 字符串安全解析 |
| P0-07 | 题库页面 | 是 | HEAD 已收敛 | 静态扫描 | 用户端不调用 `/admin/question-tags` 或 `/admin/question-categories` |
| P0-08 | 简历页面 | 是 | HEAD 已收敛 | 静态检查 | 简历和项目经历字段已映射到真实接口 |
| P0-09 | 面试主链路 | 是，待浏览器确认 | `src/api/interview.ts`、面试页面 | build + API 静态校验 | 使用 `/interviews/{id}/start/current/answer/finish/report` |
| P0-10 | 管理端题库 | 是 | HEAD 已收敛 | 静态扫描 | 分类、标签、问题组、题目均走管理端真实 API |
| P0-11 | Prompt 管理 | 是 | `src/api/aiAdmin.ts`、`PromptTemplateView.vue` | build | 补齐真实删除与启用/禁用接口 |
| P0-12 | AI 调用日志 | 是 | `src/api/aiAdmin.ts`、`AiCallLogView.vue`、`src/types/ai.ts` | build | 查询参数收敛为 `scene/status/businessId/modelName/userId`，展示 `requestPrompt/elapsedMs/failReason` |
| P0-13 | 禁止 `/inner/**` 调用 | 是 | 无 | `rg /inner` | 前端 `src` 无命中 |
| P0-14 | build 结果 | 是 | 全项目 | `npm run build` | 通过，只有第三方注释和 chunk 体积警告 |
| P0-15 | 浏览器 E2E 结果 | 未在本轮完成 | 无 | 环境检查 | 当前仓库未安装 Playwright，当前会话未暴露可用浏览器自动化工具；未新增依赖伪造结果 |

## 4. P1 修复结果表

| 编号 | 问题 | 是否修复 | 验证方式 | 备注 |
|---|---|---|---|---|
| P1-01 | loading 状态 | 是 | 静态检查 | 查询、保存、提交、重试等主操作已有 loading |
| P1-02 | empty 状态 | 是 | 静态检查 | 题库、面试、报告等页面已有 `el-empty` |
| P1-03 | error 状态 | 是 | 静态检查 | 请求层统一展示后端 message，401/403 统一处理 |
| P1-04 | 表单校验 | 是 | build | 登录、注册、题目、Prompt、简历、创建面试等已有校验 |
| P1-05 | 页面刷新恢复 | 基本具备 | 静态检查 | 面试房间进入时重新拉当前问题 |

## 5. 前端实际接口清单

### 认证

| 方法 | 路径 | 使用位置 |
|---|---|---|
| POST | `/auth/login` | 登录 |
| POST | `/auth/register` | 注册 |
| POST | `/auth/logout` | 退出 |
| GET | `/auth/current-user` | 恢复登录态 |
| POST | `/auth/refresh-token` | API 层保留，当前主链路不主动依赖 |

### 题库

| 方法 | 路径 | 使用位置 |
|---|---|---|
| GET | `/questions` | 用户题库列表 |
| GET | `/questions/{id}` | 题目详情 |
| POST | `/questions/{id}/answers` | 提交答案 |
| POST | `/questions/{id}/favorite` | 收藏 |
| DELETE | `/questions/{id}/favorite` | 取消收藏 |
| GET | `/questions/favorites` | 收藏列表 |
| GET | `/questions/wrong-records` | 错题列表 |
| PUT | `/questions/{id}/mastery` | 掌握状态 |

### 简历

| 方法 | 路径 | 使用位置 |
|---|---|---|
| GET | `/resumes` | 简历列表 / 创建面试简历下拉 |
| POST | `/resumes` | 新增简历 |
| GET | `/resumes/{id}` | 简历详情 |
| PUT | `/resumes/{id}` | 编辑简历 |
| DELETE | `/resumes/{id}` | 删除简历 |
| PUT | `/resumes/{id}/default` | 设置默认简历 |
| POST | `/resumes/{resumeId}/projects` | 新增项目经历 |
| PUT | `/resumes/{resumeId}/projects/{projectId}` | 编辑项目经历 |
| DELETE | `/resumes/{resumeId}/projects/{projectId}` | 删除项目经历 |

### 面试

| 方法 | 路径 | 使用位置 |
|---|---|---|
| POST | `/interviews` | 创建面试 |
| POST | `/interviews/{id}/start` | 开始面试 |
| GET | `/interviews/{id}/current` | 获取当前问题 |
| POST | `/interviews/{id}/answer` | 提交面试回答 |
| POST | `/interviews/{id}/finish` | 结束面试 |
| POST | `/interviews/{id}/report/retry` | 重试生成报告 |
| GET | `/interviews` | 面试历史 |
| GET | `/interviews/{id}` | 面试详情 |
| GET | `/interviews/{id}/report` | 面试报告 |

### 管理端题库

| 方法 | 路径 | 使用位置 |
|---|---|---|
| GET/POST | `/admin/question-categories` | 分类列表 / 新增 |
| PUT/DELETE | `/admin/question-categories/{id}` | 分类编辑 / 删除 |
| GET/POST | `/admin/question-tags` | 标签列表 / 新增 |
| PUT/DELETE | `/admin/question-tags/{id}` | 标签编辑 / 删除 |
| GET/POST | `/admin/question-groups` | 问题组列表 / 新增 |
| PUT/DELETE | `/admin/question-groups/{id}` | 问题组编辑 / 删除 |
| GET/POST | `/admin/questions` | 题目列表 / 新增 |
| PUT/DELETE | `/admin/questions/{id}` | 题目编辑 / 删除 |
| PUT | `/admin/questions/{id}/status` | 题目状态 |

### AI 管理

| 方法 | 路径 | 使用位置 |
|---|---|---|
| GET | `/admin/ai/prompts` | Prompt 列表 |
| POST | `/admin/ai/prompts` | 新增 Prompt |
| PUT | `/admin/ai/prompts/{id}` | 编辑 Prompt |
| DELETE | `/admin/ai/prompts/{id}` | 删除 Prompt |
| PUT | `/admin/ai/prompts/{id}/status` | 启用 / 禁用 Prompt |
| GET | `/admin/ai/logs` | AI 调用日志 |
| GET | `/admin/ai/logs/{id}` | AI 日志详情 |

## 6. 字段契约说明

- 当前问题：页面主字段统一使用 `questionContent`；`questionText/content` 只在 `src/api/interview.ts` adapter 中兼容读取。
- 题目参考答案：页面主字段统一使用 `referenceAnswer`；`answer` 只在 `src/api/question.ts` adapter 中兼容旧响应或旧表单。
- 报告页：支持 `id/reportId/sessionId/totalScore/summary/reportContent/stageReports/stageScores/weakPoints/strengths/mainProblems/projectProblems/reviewSuggestions/recommendedQuestions/questionReviews/qaReview/generatedAt`。
- AI 日志页：支持后端真实字段 `scene/requestPrompt/responseContent/businessId/elapsedMs/status/errorMessage`，兼容旧前端字段 `callType/promptContent/latencyMs/failReason`。
- Prompt 页：保存请求只提交 `scene/name/content/status`；页面不实现版本管理、A/B 测试。
- 分页：API 层统一使用 `normalizePageResult` 兼容后端 `records/total/pageNo/pageSize`。

## 7. 静态扫描结果

### 禁止旧内部接口

```text
rg -n "/inner|inner/|questions/answer|questions/wrongs|/ai/interview/question|/ai/interview/evaluate|/ai/interview/follow-up|/ai/interview/report" src
```

结果：无命中。

### 禁止不存在的 metadata status 子路径

```text
rg -n "/admin/question-categories/.*/status|/admin/question-tags/.*/status|/admin/question-groups/.*/status" src
```

结果：无命中。

### `/ai/` 命中

仅命中：

- `src/api/aiAdmin.ts` 的 `/admin/ai/prompts`、`/admin/ai/logs`
- `src/components/layout/AdminSidebar.vue` 的后台菜单路径

判断：合理保留，均为管理端。

### 其他关键字

- `mock/TODO/FIXME/setTimeout/console.log/fake/dummy`：无命中。
- `questionText`：仅在 `src/api/interview.ts` 作为兼容读取出现。
- `tagIds`：用户端查询 API 中显式剔除 `tagIds`，管理端题目保存仍合法使用 `tagIds`。

## 8. 命令执行结果

| 命令 | 结果 | 说明 |
|---|---|---|
| `git branch --show-current` | 通过 | 当前分支 `dev` |
| `git status --short` | 通过 | 修改前为空；修改后见 Git 状态 |
| `git log --oneline -8` | 通过 | 最近提交已记录 |
| `npm install` | 未执行 | 当前依赖已存在且 `npm run build` 可直接通过，未引入新依赖 |
| `npm run type-check` | 无脚本 | `package.json` 未定义；`npm run build` 已包含 `vue-tsc -b` |
| `npm run lint` | 无脚本 | `package.json` 未定义 |
| `npm run build` | 通过 | `vue-tsc -b && vite build` 成功 |

构建警告：

- `@vueuse/core` 的 Rollup 注释警告，来自第三方依赖，不阻塞。
- `InterviewReportView` chunk 超过 1000 kB，属于体积警告，不阻塞 V1。

## 9. 浏览器 E2E / 手动点击结果

本轮未完成真实浏览器点击回归。

原因：

- 当前仓库未安装 Playwright / Cypress；
- 本轮没有新增 E2E 依赖，避免扩大技术栈；
- 当前会话未暴露可直接调用的浏览器点击工具；
- 因此没有伪造登录、点击、Network 截图或浏览器结果。

建议进入下一步 V1 联调验收时执行真实点击：

1. 普通用户登录、题库、题目详情、简历、创建面试、面试房间、提交回答、结束面试、报告、历史和详情。
2. 管理员登录、分类、标签、问题组、题目、Prompt、AI 日志详情。
3. Network 验证无 `/inner/**`、无旧 `/ai/interview/**`、无旧 `questions/answer`、无用户端 `/admin/**`。

## 10. 仍然存在的真实风险

| 页面 | 前端接口 | 后端接口 | 当前问题 | 建议 |
|---|---|---|---|---|
| 面试主链路 | `/interviews/{id}/start/current/answer/finish/report` | 后端已存在 | 本轮未做真实浏览器点击 | 用真实普通用户账号完成一次端到端联调 |
| AI 日志 | `/admin/ai/logs` | 后端已存在 | 需确认筛选参数在真实数据上生效 | 管理员账号按 scene/status/businessId 查询 |
| Prompt 管理 | `/admin/ai/prompts/{id}/status`、`DELETE /admin/ai/prompts/{id}` | 后端已存在 | 新增按钮需浏览器确认权限和提示 | 管理员账号只对临时模板测试删除 |
| 报告页 | `/interviews/{id}/report` | 后端已存在 | 后端若返回字符串 JSON，前端已兜底解析，但仍建议后端统一数组 | 联调时记录真实响应结构 |

## 11. 是否建议进入 V1 联调验收

建议进入 V1 联调验收。

理由：前端构建已通过，核心契约和静态边界扫描已收敛，剩余风险主要是真实浏览器点击和后端运行态验证。

## 12. 是否建议进入 V2

不建议进入 V2。

理由：V1 主链路还需要完成一次真实浏览器点击回归和 Network 证据确认后，再进入 V2。

