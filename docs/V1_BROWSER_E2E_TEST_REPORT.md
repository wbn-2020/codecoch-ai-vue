# CodeCoachAI V1 前端浏览器点击联调报告

## 1. 测试环境

| 项目 | 内容 |
| --- | --- |
| 测试日期 | 2026-05-13 |
| 前端仓库 | https://github.com/wbn-2020/codecoch-ai-vue.git |
| 前端分支 | dev |
| 前端地址 | http://127.0.0.1:5174 |
| Gateway 地址 | http://localhost:8080 |
| 前端启动命令 | `npm run dev -- --host 127.0.0.1 --port 5174` |
| 构建命令 | `npm run build` |
| 浏览器工具 | Codex in-app browser，Playwright-compatible automation API |
| Playwright 依赖 | 当前项目未安装本地 `playwright` / `@playwright/test` 包，使用 Codex 内置浏览器自动化能力 |
| 普通用户 | `e2e_user / E2eUser@123` |
| 管理员 | `e2e_admin / E2eAdmin@123` |

环境变量核查：

```env
VITE_APP_TITLE=CodeCoachAI
VITE_API_BASE_URL=http://localhost:8080
```

`appConfig.apiBaseUrl` 通过 `import.meta.env.VITE_API_BASE_URL` 读取 Gateway 地址。

## 2. 执行摘要

| 检查项 | 结果 |
| --- | --- |
| 前端是否成功启动 | PASS |
| 普通用户主链路 | PASS |
| 管理员主链路 | PASS |
| 权限反向验证 | PASS |
| 是否存在 P0 阻塞 | 当前未发现未解决 P0 |
| 是否可以进入 V1 演示整理阶段 | 可以进入，P1 观察项已复测通过 |
| `npm run build` | PASS |

本轮通过真实页面点击验证了登录、题库、答题、错题本、收藏题、简历、项目经历、面试创建、面试答题、报告查看、管理端基础维护、AI 日志和系统配置页面。

## 3. 普通用户链路测试结果

| 模块 | 操作 | 结果 | 备注 |
| --- | --- | --- | --- |
| 登录 | 输入 `e2e_user / E2eUser@123` 并点击登录 | PASS | 登录后跳转工作台，token、userInfo、roles 可用 |
| 工作台 | 打开 `/dashboard` | PASS | 页面正常展示用户信息和统计卡片 |
| 题库列表 | 打开 `/questions`，搜索 `E2E_TEST` | PASS | 可看到 E2E 测试题，筛选区正常 |
| 题目详情 | 点击题目进入详情 | PASS | title、content、referenceAnswer、analysis、分类、标签、难度展示正常 |
| 提交答案 | 在详情页输入答案并提交 | PASS | 使用 `POST /questions/{id}/answers`，未调用旧接口 |
| 错题本 | 打开 `/questions/wrong-records` | PASS | 使用 `GET /questions/wrong-records`，可看到错题数据 |
| 收藏题 | 打开 `/questions/favorites`，取消收藏一条 | PASS | 收藏列表展示正常，取消收藏后列表数量变化 |
| 简历列表 | 打开 `/resumes` | PASS | 可看到 `E2E_TEST_Java后端三年经验简历` |
| 简历编辑 | 进入简历编辑页 | PASS | resumeName、targetPosition、skillStack 等字段经前端适配后正常回显 |
| 项目经历维护 | 新增、编辑、删除临时项目 | PASS | 使用带 `resumeId` 的项目接口路径，临时项目已删除 |
| 创建面试 | 创建 `E2E_BROWSER_联调面试` | PASS | 使用 `POST /interviews`，未直连 AI 接口 |
| 面试房间 | start、current、answer | PASS | 使用 `/interviews/{id}/start`、`/current`、`/answer` |
| nextAction | 验证 FOLLOW_UP、NEXT_QUESTION | PASS | 短答案触发追问，补充回答后进入下一题 |
| 结束面试 | 点击结束面试 | PASS | 2026-05-13 复测创建面试 `100002`，确认结束后自动跳转 `/interviews/100002/report`，报告页正常展示 |
| 面试报告 | 打开 `/interviews/100001/report` | PASS | 总分、状态、AI 总结、建议等可展示 |
| 面试历史 | 打开 `/interviews/history` | PASS | 可看到新建面试和已有 `E2E_TEST_综合模拟面试` |

## 4. 管理员链路测试结果

| 模块 | 操作 | 结果 | 备注 |
| --- | --- | --- | --- |
| 管理员登录 | 输入 `e2e_admin / E2eAdmin@123` 并点击登录 | PASS | 登录成功，roles 包含 ADMIN |
| 管理首页 | 打开 `/admin` | PASS | 页面正常展示基础统计卡片 |
| 用户管理 | 打开 `/admin/users` | PASS | 可看到 `e2e_user`、`e2e_admin` |
| 角色管理 | 打开 `/admin/roles` | PASS | 可看到 USER / ADMIN，路径属于 user-service 暴露的 `/admin/roles` |
| 题目管理 | 打开 `/admin/questions` | PASS | 可看到 E2E_TEST 题目 |
| 分类管理 | 打开 `/admin/question-categories` | PASS | 可看到 E2E_TEST 分类 |
| 标签管理 | 打开 `/admin/question-tags` | PASS | 可看到 E2E_TEST 标签 |
| 问题组管理 | 打开 `/admin/question-groups` | PASS | 可看到 E2E_TEST 问题组 |
| Prompt 模板 | 打开 `/admin/ai/prompts` | PASS | 可看到 E2E_TEST Prompt 模板，仍来自 MySQL 接口 |
| AI 调用日志 | 打开 `/admin/ai/logs` | PASS | 可看到 `INTERVIEW_QUESTION_GENERATE`、`INTERVIEW_ANSWER_EVALUATE` 等场景 |
| 系统配置 | 打开 `/admin/system/configs` | PASS | 可看到 `interview.max-question-count`、`interview.max-follow-up-count`、`ai.timeout-seconds`、`ai.provider`、`report.generate-mode` |

## 5. 权限验证结果

| 场景 | 结果 | 说明 |
| --- | --- | --- |
| ADMIN 访问 `/admin/**` | PASS | 管理员可进入管理端页面 |
| USER 访问 `/admin/users` | PASS | 普通用户被前端拦截到 `/403`，未看到管理端数据 |
| 后端 41003 | PASS | 前端请求封装会跳转 403 |
| token 失效 41000 / 41001 | PASS_STATIC | `request.ts` 已调用 `clearLocalAuth()`，清理 token、userInfo、roles 后跳转登录并保留 redirect |

## 6. 接口路径核查

| 检查项 | 结果 |
| --- | --- |
| 是否调用 `/inner/**` | 未发现 |
| 是否直连微服务端口 | 未发现 |
| 是否新增用户端 `/ai/**` | 未发现 |
| `/ai/` 出现位置 | 仅 `/admin/ai/prompts`、`/admin/ai/logs` 和后台菜单 |
| 是否调用 `POST /questions/answer` | 未发现 |
| 是否调用 `GET /questions/wrongs` | 未发现 |
| 是否调用旧 AI 面试接口 | 未发现 |
| 题目答题接口 | `POST /questions/{id}/answers` |
| 错题本接口 | `GET /questions/wrong-records` |
| 简历项目接口 | `POST/PUT/DELETE /resumes/{resumeId}/projects/{projectId}` |
| 面试接口 | 使用 `/interviews/**`，未直连 AI 能力接口 |
| 请求 baseURL | 统一来自 `VITE_API_BASE_URL=http://localhost:8080` |

静态扫描命令：

```bash
rg -n '/inner|inner/|questions/answer|questions/wrongs|/ai/interview/question|/ai/interview/evaluate|/ai/interview/follow-up|/ai/interview/report' src
rg -n '/ai/' src
```

第一条无命中。第二条仅命中允许的 `/admin/ai/**`。

## 7. 问题清单

### P0

| 问题 | 页面 | 复现步骤 | 实际结果 | 预期结果 | 处理状态 |
| --- | --- | --- | --- | --- | --- |
| 答题提交字段不匹配 | 题目详情 | 输入答案并提交 | 后端提示 `answerContent is required` | 使用后端要求字段提交 | 已修复 |
| 收藏题列表行 id 不兼容 | 收藏题 | 点击取消收藏或详情 | 路由/取消收藏使用错误 id | 使用 questionId | 已修复 |
| 简历列表返回结构不兼容 | 简历列表 | 打开 `/resumes` | 列表为空 | 展示后端返回的简历数组 | 已修复 |
| 用户创建面试页调用管理端问题组接口 | 创建面试 | 普通用户打开创建面试 | 触发 403 | 用户页不得调用 `/admin/question-groups` | 已修复 |
| AI 日志字段不兼容 | AI 调用日志 | 打开 `/admin/ai/logs` | 场景/耗时/请求响应字段展示不完整 | 兼容后端 `scene/costMillis/requestBody/responseBody` | 已修复 |
| 系统配置返回结构不兼容 | 系统配置 | 打开 `/admin/system/configs` | 配置列表为空 | 兼容后端数组返回和 `valueType` 字段 | 已修复 |

### P1

| 问题 | 页面 | 复现步骤 | 实际结果 | 预期结果 | 处理状态 |
| --- | --- | --- | --- | --- | --- |
| 手动结束面试后未观察到立即自动跳转报告页 | 面试房间 | 2026-05-13 复测：创建面试 `100002`，开始面试、提交一次回答后点击“结束面试”并确认 | 自动跳转到 `/interviews/100002/report`，报告页展示总分 80、GENERATED、AI 总结和复习建议 | finish 成功后自动进入报告页 | 已复测通过，未复现问题，无需代码修复 |
| 部分页面中文源码存在历史编码显示异常 | 多个 Vue 文件 | PowerShell 读取源码 | 终端中出现乱码；浏览器页面多处显示正常 | 源码和终端均正常显示中文 | 记录，非本轮功能阻塞 |

### P2

| 问题 | 页面 | 说明 | 处理状态 |
| --- | --- | --- | --- |
| 构建 chunk 较大 | 构建输出 | Element Plus、报告页等 chunk 超过 1000 kB 警告 | 记录，V1 演示不阻塞 |
| 浏览器控制台保留历史错误记录 | 浏览器 DevTools | 早期修复前的错误仍在日志列表中，后续重测通过 | 记录 |

## 8. 修复清单

| 文件 | 修复内容 |
| --- | --- |
| `src/api/question.ts` | 答题提交映射 `userAnswer -> answerContent`，保持 `/questions/{id}/answers` |
| `src/types/question.ts` | 兼容后端题目详情、标签、答题结果、收藏题字段 |
| `src/views/question/QuestionDetailView.vue` | 兼容 `referenceAnswer`、字符串标签和答题结果回显 |
| `src/views/question/FavoriteQuestionView.vue` | 兼容 `questionId/id/favoriteId`，修复取消收藏和详情跳转 |
| `src/api/resume.ts` | 兼容后端简历数组返回和 `title/realName/summary/project.id` 字段，项目接口保持带 `resumeId` |
| `src/types/resume.ts` | 补充后端兼容字段 |
| `src/api/interview.ts` | 兼容创建、当前问题、答题、列表、详情、报告字段，answer 仅提交 `answerContent` |
| `src/types/interview.ts` | 补充后端创建 DTO 兼容字段 |
| `src/views/interview/InterviewCreateView.vue` | 移除普通用户页面对 `/admin/question-groups` 的调用 |
| `src/api/aiAdmin.ts` | 兼容 AI 日志后端字段 `scene/costMillis/requestBody/responseBody` |
| `src/views/admin/AiCallLogView.vue` | 日志场景列展示原始场景码，便于联调确认 |
| `src/api/system.ts` | 兼容系统配置数组返回和 `valueType` 字段 |

## 9. 构建结果

命令：

```bash
npm run build
```

结果：PASS。

构建警告：

- `@vueuse/core` 中 `/* #__PURE__ */` 注释位置警告，Rollup 自动移除注释。
- 部分 chunk 超过 1000 kB，建议后续做按需拆包或手动 chunk 优化。

## 10. 最终结论

本轮 CodeCoachAI V1 前端浏览器点击联调通过主流程验证，当前未发现未解决 P0 阻塞问题。

可以进入 V1 演示版整理阶段。手动结束面试后自动跳转报告页的 P1 观察项已复测通过；演示前仍建议补一次全链路清库或重置 E2E 数据，避免本轮取消收藏和新增面试记录影响演示数据一致性。
