# CodeCoachAI-vue 前端代码深度 Review 风险修复报告

修复时间：2026-05-19
修复分支：`dev-v3`
修复范围：仅前端仓库 `CodeCoachAI-vue`，不修改后端代码。

## 1. 总体结论

本轮已按 Review 风险清单完成前端收敛：构建阻断已修复，未确认接口的新增页面已降级为“未联调 / 待接入”说明页，通知、导入导出、图表、头像上传和刷题练习做了前端兜底。

当前前端已通过：

- `npx vue-tsc -b`
- `npm run build`
- `git diff --check`

浏览器层面已确认预览站点登录页可打开，未登录访问受保护路由会重定向登录页。由于本轮没有后端登录态和真实后端联调环境，受保护业务页未做真实点击联调。

## 2. 本轮修复范围

### 2.1 构建阻断修复

- 修复 `src/views/question/PracticeModeView.vue` 提交答案参数缺少 `userAnswer` 的类型错误。
- 刷题练习页补充提交中禁用、空题目进度保护、计时器重启前清理，避免重复提交和异常百分比。

### 2.2 未确认接口页面降级

新增 `src/components/common/PendingIntegrationPanel.vue`，统一呈现“未联调 / 接口待确认”状态。

以下页面已从真实 CRUD / 列表页降级为待接入说明页，不再展示未确认的新增、删除、发布、启停、重试、取消等操作：

- `src/views/admin/AiModelConfigView.vue`
- `src/views/admin/AsyncTaskView.vue`
- `src/views/admin/NotificationManageView.vue`
- `src/views/admin/MenuPermissionView.vue`
- `src/views/admin/InterviewManageView.vue`
- `src/views/admin/InterviewReportManageView.vue`
- `src/views/admin/OperationLogView.vue`
- `src/views/admin/LoginLogView.vue`
- `src/views/study/DailyTaskView.vue`
- `src/views/user/ProjectExperienceView.vue`
- `src/views/user/WeaknessAnalysisView.vue`

### 2.3 通知中心与未读角标

- `src/api/notification.ts` 增加前端归一化，兼容 `readStatus` / `bizType` / `bizId` 字段。
- 标记已读、全部已读改为 `POST` 方式。
- `src/layouts/UserLayout.vue` 未读数请求失败时不再伪装为 0，而是隐藏角标并提示“未读数暂不可用”。
- `src/views/user/NotificationCenterView.vue` 增加错误态，请求失败不会显示成“暂无通知”。

### 2.4 题目导入导出

- 在 `src/api/question.ts` 中新增题目导入、导出、模板下载封装。
- `src/views/admin/QuestionManageView.vue` 不再直接散落裸 `request` 调用。
- 模板下载改用统一 `appConfig.apiBaseUrl`，不再硬编码 `/api/admin/questions/import-template`。

### 2.5 图表和头像上传兜底

- `src/components/report/ReportChart.vue` 在空数据时清理图表实例，数据更新后 `nextTick` 渲染并 resize。
- `src/views/user/ProfileView.vue` 增加头像 MIME 白名单校验，并提示“头像已上传，请保存资料后生效”。

### 2.6 每日任务 API 封装收敛

- `src/api/dailyTask.ts` 调整为更保守的学习计划任务接口形态：
  - `GET /study-plans/{planId}/daily-view`
  - `POST /study-tasks/{taskId}/complete`
  - `POST /study-tasks/{taskId}/skip`
  - `POST /study-checkins`

当前每日任务页面仍为待接入说明页，不会调用这些接口冒充联调完成。

## 3. 验收结果

| 检查项 | 结果 | 说明 |
| --- | --- | --- |
| `npx vue-tsc -b` | 通过 | 无类型错误 |
| `npm run build` | 通过 | Vite build 成功 |
| `git diff --check` | 通过 | 仅有 LF/CRLF 换行提示 |
| 浏览器登录页 | 通过 | `http://127.0.0.1:4173/login` 正常渲染 |
| 未登录路由守卫 | 通过 | 访问 `/questions/practice` 重定向 `/login?redirect=/questions/practice` |
| 真实业务联调 | 未测试 | 当前没有可用后端登录态和真实接口环境 |

构建提示：

- Rollup 对 `@vueuse/core` 的 PURE 注释有 warning，属于依赖构建提示。
- 部分 chunk 超过 1000kB，属于体积优化提示，本轮未调整打包策略。

## 4. 剩余风险

- 未确认后端接口的页面已降级为待接入，但仍保留路由入口；后续接入真实后端后再恢复表格和表单。
- 通知中心保留真实请求与错误态；如果后端字段继续变化，需要继续调整 `src/api/notification.ts` 归一化。
- 受保护页面没有真实登录态，未做完整浏览器点击联调。
- 本轮没有新增 lint/test 脚本，仍只能依赖类型检查、构建和人工浏览器抽查。

## 5. 下一轮建议

- 启动真实后端后，优先联调 V3 目标岗位 / JD 页面。
- 逐个恢复待接入页面：先确认后端 Controller / DTO / VO，再替换 `PendingIntegrationPanel`。
- 后续可增加 `manualChunks` 或按业务域拆包，处理构建体积 warning。
