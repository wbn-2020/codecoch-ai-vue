# CodeCoachAI V1 最终浏览器联调验收报告

## 1. 基本信息

| 项目 | 内容 |
|---|---|
| 验收时间 | 2026-05-14 19:20 左右 |
| 前端仓库 | `C:\my-claude\CodeCoachAI-vue` |
| 前端分支 / commit | `dev` / `4fc184a v1完善` |
| 后端仓库 | `C:\my-claude\CodeCoachAI-java` |
| 后端分支 / commit | `dev` / `1ba38a1 fix: close v1 backend p0 p1 gaps` |
| Gateway 地址 | `http://localhost:8080` |
| 前端地址 | `http://127.0.0.1:5173` |
| 浏览器 | Codex in-app browser |
| AI 模式 | 运行时观测为真实 OpenAI-compatible 调用，模型 `deepseek-v4-flash`；本轮不是纯 Mock AI 验收 |
| SQL 状态 | 仓库内 `sql/init.sql`、`sql/dev_test_data.sql`、`sql/v1_backend_convergence_patch.sql` 均存在；MySQL CLI 直连未确认，Gateway API 已验证账号、题库、Prompt、日志、报告等数据可用 |

## 2. 仓库状态

### 后端

```text
branch: dev
status:
 M codecoachai-ai/src/main/java/com/codecoachai/ai/service/impl/AiServiceImpl.java

log:
1ba38a1 fix: close v1 backend p0 p1 gaps
b76d741 V1完善
7829266 docs: update V1 startup documentation
d6245ce Fix V1 question tags and report fallback
16289f0 Fix V1 backend filters and demo test data
```

### 前端

```text
branch: dev
status:
 M src/components/common/MarkdownPreview.vue
 M src/config/index.ts
 M src/views/question/QuestionDetailView.vue
?? docs/CodeCoachAI_V1_最终浏览器联调验收报告.md

log:
4fc184a v1完善
e86e45e V1完善
1c9e765 docs: add V1 remaining P0 regression report
59e597d Fix user tag filtering to use real tag IDs
d6a348d Refine V1 frontend contract and interview flows
```

## 3. 启动结果

| 服务 | 结果 | 备注 |
|---|---|---|
| MySQL | 已由用户启动 | 3306 端口监听；CLI 密码直连未确认 |
| Redis | 已由用户启动 | 6379 端口监听 |
| Nacos | 已由用户启动 | 8848 端口监听 |
| Gateway | 通过 | 8080 端口监听，认证和业务接口可访问 |
| auth/user/question/resume/interview/system | 通过 | 通过 Gateway 页面和 API 间接验证 |
| ai | 通过 | 9206 端口监听；本轮修复后重新启动 AI 服务 |
| frontend dev server | 通过 | 5173 端口监听，浏览器可访问 |

## 4. 后端 Smoke Test

| 编号 | 接口 | 角色 | 预期 | 实际 | 是否通过 | 备注 |
|---|---|---|---|---|---|---|
| 1 | `POST /auth/login` | 普通用户 | 登录成功 | 返回 token | 是 | `e2e_user` |
| 2 | `POST /auth/login` | 管理员 | 登录成功 | 返回 token | 是 | `e2e_admin` |
| 3 | `GET /auth/current-user` | 普通用户 | 返回当前用户 | code 0 | 是 | token 正常携带 |
| 4 | `GET /questions` | 普通用户 | 返回启用题目 | code 0，total 有数据 | 是 | 题库可用 |
| 5 | `GET /admin/questions` | 管理员 | 返回题目分页 | code 0 | 是 | 后台题库可用 |
| 6 | `GET /admin/ai/prompts` | 管理员 | 返回 Prompt 分页 | code 0，total 有数据 | 是 | Prompt 管理可用 |
| 7 | `GET /admin/ai/logs` | 管理员 | 返回 AI 日志 | code 0，total 递增 | 是 | 面试流程产生新日志 |
| 8 | `GET /admin/questions` | 普通用户 | 无权限 | code 41003 | 是 | HTTP 200 包业务码，前端拦截 |
| 9 | `/inner/test` | 普通用户 | 不可访问 | HTTP 404 | 是 | 前端未调用 `/inner/**` |

## 5. 普通用户浏览器点击结果

| 步骤 | 页面 | 操作 | 关键接口 | 预期 | 实际 | 是否通过 | 备注 |
|---|---|---|---|---|---|---|---|
| 1 | 登录页 | `e2e_user` 登录 | `/auth/login`、`/auth/current-user` | 登录成功并保持登录态 | 登录成功，刷新后仍在用户端 | 是 | token 自动携带 |
| 2 | 题库列表 | 打开题库 | `/questions` | 题目列表可读 | 显示 E2E 题目、分类、标签、难度 | 是 | 未调用管理端标签/分类接口 |
| 3 | 题目详情 | 打开题目 | `/questions/{id}` | 展示 `referenceAnswer` | 参考答案和解析正常显示 | 是 | 未显示旧 `answer` 字段 |
| 4 | 提交答案 | 填写并提交答案 | 题目答题接口 | 成功记录答题结果 | 最近答题更新为“正确” | 是 | 后端返回掌握状态为空时已做前端兜底 |
| 5 | 收藏/错题 | 打开收藏、错题页 | 收藏/错题列表接口 | 列表可读 | 收藏题目和错题记录均显示 | 是 | 未使用假数据 |
| 6 | 简历 | 新建简历 | `/resumes` | 简历真实保存 | 创建 `V1验收简历_20260514073301` | 是 | 页面跳转到编辑页 |
| 7 | 项目经历 | 新增项目 | `/resumes/{id}/projects` | 项目真实保存 | 创建 `V1验收项目_20260514073413` | 是 | 页面显示项目经历 |
| 8 | 创建面试 | 创建综合面试 | `POST /interviews` | 返回真实 sessionId | 跳转 `/interviews/room/100001` | 是 | 选择真实简历 |
| 9 | 面试房间 | 点击开始 | `/interviews/{id}/start`、`/current` | 展示 `questionContent` | 显示 HashMap 当前问题 | 是 | NOT_STARTED 下开始按钮明显 |
| 10 | 提交回答 | 提交 2 轮回答 | `/interviews/{id}/answer` | 展示评分、追问/下一题 | 展示评分、点评、追问和下一阶段 | 是 | AI 原始响应不稳定，后端已做兼容 |
| 11 | 结束面试 | 点击结束并确认 | `/interviews/{id}/finish` | 生成报告并跳转 | 跳转 `/interviews/100001/report` | 是 | 前端超时从 15s 调整为 60s 后通过 |
| 12 | 报告页 | 查看报告 | `/interviews/{id}/report` | 结构化报告不白屏 | 展示 totalScore=82、summary、薄弱点、建议 | 是 | Markdown 非字符串兜底后通过 |
| 13 | 历史页 | 返回历史 | `/interviews` | 新记录可见 | 显示已完成、已生成、报告入口 | 是 | Total 2 |
| 14 | 详情页 | 查看详情 | `/interviews/{id}` | 问答记录完整 | 展示阶段、用户回答、AI 点评、追问 | 是 | 记录可追溯 |

## 6. 管理员浏览器点击结果

| 步骤 | 页面 | 操作 | 关键接口 | 预期 | 实际 | 是否通过 | 备注 |
|---|---|---|---|---|---|---|---|
| 1 | 管理员登录 | `e2e_admin` 登录 | `/auth/login` | 管理员进入系统 | 登录后可点击“管理端” | 是 | 管理端菜单可见 |
| 2 | 管理首页 | 打开 `/admin` | 后台统计接口 | 页面可打开 | 显示后台基础统计和入口 | 是 | 不做复杂大屏 |
| 3 | 分类管理 | 打开列表 | `/admin/question-categories` | 列表、查询、新增按钮可用 | 表格显示分类，含新增/编辑/删除 | 是 | 本轮未删除真实数据 |
| 4 | 标签管理 | 打开列表 | `/admin/question-tags` | 列表、查询、新增按钮可用 | 表格显示 E2E 标签 | 是 | 本轮未删除真实数据 |
| 5 | 问题组管理 | 打开列表 | `/admin/question-groups` | 列表、筛选、新增按钮可用 | 显示问题组、分类、状态 | 是 | 未实现 V2 复杂绑定 |
| 6 | 题目管理 | 打开列表 | `/admin/questions` | 列表和筛选可用 | 表格显示题目、分类、标签、问题组 | 是 | `referenceAnswer` 由前序收敛保障 |
| 7 | Prompt 模板 | 打开列表 | `/admin/ai/prompts` | 模板列表可用 | 显示 V1 场景模板、编辑/禁用/删除按钮 | 是 | 不做版本管理 |
| 8 | AI 调用日志 | 打开列表和详情 | `/admin/ai/logs`、`/admin/ai/logs/{id}` | 日志和长文本详情可读 | 显示新生成的 AI 日志、Prompt、响应内容 | 是 | 成功/失败日志均可见 |
| 9 | 系统配置 | 打开列表 | `/admin/system/configs` | 配置表格可用 | 显示基础配置、编辑/删除按钮 | 是 | 未调用旧 key 详情接口 |

## 7. Network 与静态扫描结果

| 检查项 | 结果 | 说明 |
|---|---|---|
| `/inner/**` | 未命中 | 静态扫描无命中，浏览器流程未发现前端调用 |
| 旧 `/ai/interview/**` | 未命中 | 静态扫描无命中 |
| 旧 `questions/wrongs` | 未命中 | 静态扫描无命中 |
| `/questions/answer` | 未命中 | 本轮静态扫描无旧路径命中 |
| 分类/标签/问题组 `/status` 旧接口 | 未命中 | 静态扫描无命中 |
| `/ai/` | 合理命中 | 仅后台 `/admin/ai/prompts`、`/admin/ai/logs` 和管理端菜单 |
| 404 | 未发现 V1 主链路阻塞 404 | `/inner/test` 人工访问 404 符合预期 |
| 500 | 初始面试回答因 AI 非 JSON 出现失败，已修复 | 修复后回答、结束、报告均通过 |
| 用户端 `/admin/**` | 未发现页面误调 | 普通用户直调后台接口返回业务码 `41003` |
| Gateway | 通过 | 前端 `.env.development` 指向 `http://localhost:8080` |

扫描命令：

```text
rg -n '/inner|inner/|questions/answer|questions/wrongs|/ai/interview/question|/ai/interview/evaluate|/ai/interview/follow-up|/ai/interview/report' src
rg -n '/admin/question-categories/.*/status|/admin/question-tags/.*/status|/admin/question-groups/.*/status' src
rg -n '/ai/' src
```

## 8. 权限检查结果

| 检查项 | 预期 | 实际 | 是否通过 |
|---|---|---|---|
| 未登录访问业务页 | 跳转登录 | 浏览器退出后访问需登录页面 | 是 |
| 未登录访问管理页 | 跳转登录 | 路由守卫处理 | 是 |
| 普通用户访问管理页 | 前端阻止或后端拒绝 | 后端返回 `41003` 无访问权限 | 是 |
| 普通用户访问 `/admin/ai/logs` | 拒绝 | code `41003` | 是 |
| 普通用户访问 `/admin/questions` | 拒绝 | code `41003` | 是 |
| 普通用户访问他人简历/面试/报告 | 不应越权 | 本轮未构造跨用户 ID 深测 | 待补充 |

## 9. 字段契约检查

| 字段 | 检查结果 |
|---|---|
| 当前问题 | 页面展示 `questionContent`，不依赖旧 `questionText` |
| 题目参考答案 | 题目详情展示 `referenceAnswer` |
| 报告字段 | `totalScore`、`summary/reportContent`、`weakPoints`、`strengths`、`mainProblems`、`projectProblems`、`reviewSuggestions`、`questionReviews/qaReview` 均有空值兜底 |
| AI 日志字段 | `scene`、`modelName`、`requestPrompt`、`responseContent`、`elapsedMs`、`status`、`failReason` 可查看 |
| Prompt 字段 | 管理页使用后台 `/admin/ai/prompts`，保存字段已收敛到 V1 后端能力 |

## 10. 本轮修复文件列表

### 前端

| 文件 | 修复内容 |
|---|---|
| `src/config/index.ts` | 将请求超时从 15 秒调整到 60 秒，避免真实 AI 报告生成被前端提前中断 |
| `src/components/common/MarkdownPreview.vue` | 兼容 `string/null/array/object` 内容，避免报告字段为数组或对象时 Markdown 渲染白屏 |
| `src/views/question/QuestionDetailView.vue` | 掌握状态接口空响应时使用本地选中值兜底，避免控制台空对象异常 |
| `docs/CodeCoachAI_V1_最终浏览器联调验收报告.md` | 新增本报告 |

### 后端

| 文件 | 修复内容 |
|---|---|
| `codecoachai-ai/src/main/java/com/codecoachai/ai/service/impl/AiServiceImpl.java` | 对真实 AI 非 JSON 响应增加 V1 兼容解析兜底，覆盖提问、评分、追问、报告生成，避免主链路因模型未严格输出 JSON 而 500 |

## 11. 命令执行结果

| 命令 | 结果 | 备注 |
|---|---|---|
| `mvn clean compile` | 通过 | 本轮修复前全量编译通过 |
| `mvn -q test` | 通过 | 后端测试通过 |
| `mvn -q -pl codecoachai-ai -am compile` | 通过 | 后端 AI 模块修复后编译通过 |
| `npm install` | 通过 | 依赖已存在，0 vulnerabilities |
| `npm run build` | 通过 | `vue-tsc -b && vite build` 通过 |
| `npm run lint` | 未执行 | `package.json` 未提供 lint 脚本 |
| `npm run type-check` | 未单独执行 | `build` 已包含 `vue-tsc -b` |

构建备注：Vite 输出 `@vueuse/core` PURE 注释 warning 和 chunk 体积 warning，不阻塞 V1 验收。

## 12. 剩余问题

| 问题 | 影响 | 责任 | 优先级 | 建议 |
|---|---|---|---|---|
| 真实 AI 偶尔不按 JSON 输出 | 已通过后端兼容兜底解决 P0，但报告内容可能偏模板化 | 后端/Prompt | P1 | 强化 Prompt JSON schema 约束，必要时增加模型响应修复器 |
| MySQL CLI 直连未确认 | 不影响本轮 Gateway 联调，但 SQL 执行状态不能由 CLI 直接证明 | 环境 | P1 | 用户按既定顺序确认 SQL 已执行，或提供当前 DB 凭据 |
| 普通用户访问他人简历/面试/报告未做深度 ID 枚举 | 安全验收覆盖不足 | 后端/测试 | P1 | 增加跨用户数据隔离 API 自动化用例 |
| 后台 CRUD 未在浏览器中逐条新增/删除真实数据 | 避免破坏演示数据，本轮只验证列表、入口和详情 | 前端/测试 | P1 | 封版前使用专用临时数据执行完整 CRUD 清理 |

## 13. 最终结论

**A. V1 浏览器联调通过，建议进入 V1 封版前整理。**

依据：

- 普通用户主链路：登录、题库、答题、收藏/错题、简历、项目经历、创建面试、开始面试、提交回答、追问/下一阶段、结束面试、报告、历史、详情已通过浏览器真实点击。
- 管理员主链路：后台首页、分类、标签、问题组、题目、Prompt、AI 日志、系统配置页面均可打开并展示真实接口数据。
- Network/静态扫描：未发现 `/inner/**`、旧 `/ai/interview/**`、旧问题组/分类/标签 status 子路径。
- 权限：普通用户直调后台接口返回 `41003`。
- 构建：前端 `npm run build` 通过，后端测试和 AI 模块编译通过。

## 14. 是否建议进入 V2

**建议先完成 V1 封版前整理和一次专用临时数据 CRUD 清理回归后，再进入 V2。**

当前不建议立即开始 V2 大功能开发，原因是仍需沉淀真实 AI 输出格式约束、跨用户数据隔离自动化用例和演示数据清理脚本。

## 15. 建议提交信息

如果本轮前后端修复一起提交：

```text
fix: verify v1 browser integration flow
```

如果只提交前端报告和前端兼容修复：

```text
fix: harden v1 frontend browser acceptance flow
```
