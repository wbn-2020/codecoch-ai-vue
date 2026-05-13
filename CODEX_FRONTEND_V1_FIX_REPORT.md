# CodeCoachAI-vue V1 联调前整改报告

## 修改文件

- `src/api/resume.ts`
- `src/views/resume/ResumeEditView.vue`
- `src/utils/token.ts`
- `src/utils/request.ts`

## 修复问题

1. `.env` 文件格式核对
   - `.env.development` 已是 `VITE_APP_TITLE=CodeCoachAI` 和 `VITE_API_BASE_URL=http://localhost:8080`。
   - `.env.production` 已是 `VITE_APP_TITLE=CodeCoachAI` 和 `VITE_API_BASE_URL=/api`。
   - `src/config/index.ts` 已通过 `import.meta.env.VITE_API_BASE_URL` 读取 Gateway baseURL。

2. 简历项目接口路径修复
   - `PUT /resumes/projects/{projectId}` 已改为 `PUT /resumes/{resumeId}/projects/{projectId}`。
   - `DELETE /resumes/projects/{projectId}` 已改为 `DELETE /resumes/{resumeId}/projects/{projectId}`。
   - `ResumeEditView.vue` 已同步传入当前 `resumeId`。

3. token 失效清理修复
   - 新增 `clearLocalAuth()`，统一清理 `token`、`userInfo`、`roles` 本地缓存。
   - `request.ts` 在 `41000` / `41001` 时调用 `clearLocalAuth()`，再跳转 `/login` 并保留 `redirect` 参数。

4. API 和路由边界核对
   - 源码扫描未发现 `/inner/**` 前端调用。
   - 源码扫描未发现用户端 `/ai/**`，仅保留允许的 `/admin/ai/**`。
   - 源码扫描未发现旧接口 `/questions/answer`、`/questions/wrongs` 或 `/ai/interview/**`。

5. 面试流程核对
   - `POST /interviews/{id}/answer` 后仍只处理 `nextAction`。
   - `nextAction=FINISH` 时调用 `POST /interviews/{id}/finish`。
   - 报告失败重试仍保留 `POST /interviews/{id}/report/retry`。
   - `FOLLOW_UP`、`NEXT_QUESTION`、`NEXT_STAGE`、`FINISH` 四种分支均保留。

## 构建结果

- 已执行 `npm run build`。
- 构建通过。
- 仅存在 Vite/Rollup 既有警告：第三方库 pure 注释提示，以及部分 chunk 超过 1000KB。

## TODO

- 暂无本次整改范围内遗留 TODO。

## 需要后端联调确认的接口

- 简历项目更新和删除接口最终路径：`PUT/DELETE /resumes/{resumeId}/projects/{projectId}`。
- token 失效错误码是否稳定使用 `41000` / `41001`。
- 面试 answer 返回的 `nextAction` 和 `nextQuestion` 字段结构。
- 报告失败时 `/interviews/{id}/report` 返回 `reportStatus=FAILED` 与 `failedReason` 的字段格式。
