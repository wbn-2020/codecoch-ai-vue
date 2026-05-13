# 前后端代码静态分析报告

## 0. 执行前检查

### 0.1 后端仓库检查

- 当前目录：`C:\my-claude\CodeCoachAI-java`
- 当前分支：`dev`
- `git status --short`：空
- 最新提交：`c01f9ca chore: add nacos config and e2e test data`
- 是否存在未提交变更：否
- 项目模块目录清单：
  - `codecoachai-gateway`
  - `codecoachai-auth`
  - `codecoachai-user`
  - `codecoachai-question`
  - `codecoachai-resume`
  - `codecoachai-interview`
  - `codecoachai-ai`
  - `codecoachai-system`
  - `codecoachai-common`
  - `sql`
  - `docs`
- 根 `pom.xml` 模块清单：
  - `codecoachai-common`
  - `codecoachai-gateway`
  - `codecoachai-auth`
  - `codecoachai-user`
  - `codecoachai-question`
  - `codecoachai-resume`
  - `codecoachai-interview`
  - `codecoachai-ai`
  - `codecoachai-system`
- `application.yml / Nacos` 配置位置：
  - 各服务：`codecoachai-*/src/main/resources/application.yml`
  - Nacos 样例：`C:\my-claude\CodeCoachAI-java\docs\nacos\*.yml`
- 关键端口：
  - gateway `8080`
  - auth `9201`
  - user `9202`
  - question `9203`
  - resume `9204`
  - interview `9205`
  - ai `9206`
  - system `9207`

### 0.2 前端仓库检查

- 当前目录：`C:\my-claude\CodeCoachAI-vue`
- 当前分支：`dev`
- `git status --short`：空
- 最新提交：`d9020b1 Fix V1 field mapping and display issues`
- 是否存在未提交变更：否
- `package.json scripts`：
  - `dev`: `vite`
  - `build`: `vue-tsc -b && vite build`
  - `preview`: `vite preview`
- `.env.development`：
  - `VITE_API_BASE_URL=http://localhost:8080`
- `.env.production`：
  - `VITE_API_BASE_URL=/api`
- 路由文件位置：
  - `C:\my-claude\CodeCoachAI-vue\src\router\index.ts`
  - `C:\my-claude\CodeCoachAI-vue\src\router\routes.ts`
  - `C:\my-claude\CodeCoachAI-vue\src\router\guards.ts`
- `request.ts / axios` 封装位置：
  - `C:\my-claude\CodeCoachAI-vue\src\utils\request.ts`
- `api` 目录清单：
  - `auth.ts`
  - `user.ts`
  - `question.ts`
  - `questionCategory.ts`
  - `questionTag.ts`
  - `questionGroup.ts`
  - `resume.ts`
  - `interview.ts`
  - `aiAdmin.ts`
  - `system.ts`
- `views` 目录清单：
  - `auth`
  - `user`
  - `question`
  - `resume`
  - `interview`
  - `admin`
  - `error`

## 1. 总体结论

- 当前是否适合继续联调：可以继续做接口联调，但不适合直接做完整 V1 演示。
- 是否存在阻塞问题：存在。
- 是否建议先修复再演示：建议先修复。
- 优先修复方向：
  - 管理端实际会点到的 404 / 字段不匹配问题
  - 题库元数据、Prompt、系统配置的前后端契约统一
  - 用户端题库筛选与面试创建页的真实可用性

## 2. 后端问题清单

### P0 阻塞问题

#### 2.1 system-service 配置接口与前端契约不一致，管理端配置页的编辑/删除/状态切换无法成功

- 问题描述：前端按 `configKey` 访问 `/admin/configs/{key}`、`/admin/configs/{key}/status`、删除 `/admin/configs/{key}`，后端只提供按数值 `id` 的更新/删除接口，且没有详情接口和状态接口。
- 涉及模块：`codecoachai-system`、前端管理端系统配置页
- 涉及文件路径：
  - `C:\my-claude\CodeCoachAI-java\codecoachai-system\src\main\java\com\codecoachai\system\controller\SystemConfigController.java`
  - `C:\my-claude\CodeCoachAI-java\codecoachai-system\src\main\java\com\codecoachai\system\domain\dto\SystemConfigSaveDTO.java`
  - `C:\my-claude\CodeCoachAI-java\codecoachai-system\src\main\java\com\codecoachai\system\domain\vo\SystemConfigVO.java`
- 相关接口路径：
  - 后端存在：`GET /admin/configs`、`POST /admin/configs`、`PUT /admin/configs/{id}`、`DELETE /admin/configs/{id}`、`GET /admin/system/overview`
  - 前端调用：`GET /admin/configs/{key}`、`PUT /admin/configs/{key}`、`PUT /admin/configs/{key}/status`、`DELETE /admin/configs/{key}`
- 证据：
  - `SystemConfigController` 没有 `GET /admin/configs/{id}`、没有 `/status`
  - 前端 `src/api/system.ts` 明确调用基于 `configKey` 的路径
- 建议修复方式：统一 system-config 接口路径与主键语义；V1 最小改法优先前端改为匹配现有后端，或后端补齐详情/状态接口并统一按 key 或按 id 一种方式。
- 是否需要改数据库：否
- 是否需要改前端：是

#### 2.2 ai-service 缺少 Prompt 详情接口，且 Prompt DTO/VO 字段与前端编辑页不一致，管理端 Prompt 编辑不可用

- 问题描述：前端编辑弹窗会先请求 `GET /admin/ai/prompts/{id}`，后端未提供该接口；同时后端 DTO/VO 只有 `scene/name/content/status`，前端页面依赖 `templateCode/promptType/templateContent/systemPrompt/userPromptTemplate/variables/version`。
- 涉及模块：`codecoachai-ai`
- 涉及文件路径：
  - `C:\my-claude\CodeCoachAI-java\codecoachai-ai\src\main\java\com\codecoachai\ai\controller\AdminAiController.java`
  - `C:\my-claude\CodeCoachAI-java\codecoachai-ai\src\main\java\com\codecoachai\ai\domain\dto\PromptTemplateSaveDTO.java`
  - `C:\my-claude\CodeCoachAI-java\codecoachai-ai\src\main\java\com\codecoachai\ai\domain\vo\PromptTemplateVO.java`
- 相关接口路径：
  - 后端存在：`GET /admin/ai/prompts`、`POST /admin/ai/prompts`、`PUT /admin/ai/prompts/{id}`、`PUT /admin/ai/prompts/{id}/status`
  - 后端缺失：`GET /admin/ai/prompts/{id}`
- 证据：
  - `AdminAiController` 只有列表接口，没有详情接口
  - `PromptTemplateSaveDTO` 只接受 `scene/name/content/status`
- 建议修复方式：统一 Prompt 接口字段命名；至少保证编辑页所需详情接口与保存字段一致。
- 是否需要改数据库：否
- 是否需要改前端：是

#### 2.3 question-service 元数据接口只实现了最小字段，管理端分类/标签/问题组页面的大量操作会失真或 404

- 问题描述：分类/标签/问题组后端 DTO/VO 只有极少字段；前端页面却支持 `code/description/parentId/knowledgePoint/difficulty/questionIds/canonicalAnswer` 以及状态切换接口，导致页面能打开但保存、展示或切换状态不符合预期。
- 涉及模块：`codecoachai-question`
- 涉及文件路径：
  - `C:\my-claude\CodeCoachAI-java\codecoachai-question\src\main\java\com\codecoachai\question\controller\AdminQuestionMetadataController.java`
  - `...\domain\dto\SaveQuestionCategoryDTO.java`
  - `...\domain\dto\SaveQuestionTagDTO.java`
  - `...\domain\dto\SaveQuestionGroupDTO.java`
  - `...\domain\vo\QuestionCategoryVO.java`
  - `...\domain\vo\QuestionTagVO.java`
  - `...\domain\vo\QuestionGroupVO.java`
- 相关接口路径：
  - 后端存在：`GET/POST/PUT/DELETE /admin/question-categories`、`/admin/question-tags`、`/admin/question-groups`
  - 后端缺失：`PUT /admin/question-categories/{id}/status`、`PUT /admin/question-tags/{id}/status`、`PUT /admin/question-groups/{id}/status`
- 证据：
  - 前端 `src/api/questionCategory.ts`、`questionTag.ts`、`questionGroup.ts` 均调用 `/status`
  - 后端 Controller 未实现 `/status`
  - `SaveQuestionGroupDTO` 只有 `groupName/description/categoryId/status`
- 建议修复方式：先统一 V1 真实支持字段；未支持字段要么后端补齐，要么前端移除对应编辑能力，不要保留假完整页面。
- 是否需要改数据库：否
- 是否需要改前端：是

#### 2.4 admin question 保存契约不一致，题目编辑页提交的 `answer/questionType` 与后端 `referenceAnswer` 契约不匹配

- 问题描述：前端创建/编辑题目时提交 `answer` 与 `questionType`；后端 `AdminQuestionSaveDTO` 接收的是 `referenceAnswer`，且没有 `questionType` 字段，容易导致参考答案丢失、题型失效。
- 涉及模块：`codecoachai-question`
- 涉及文件路径：
  - `C:\my-claude\CodeCoachAI-java\codecoachai-question\src\main\java\com\codecoachai\question\domain\dto\AdminQuestionSaveDTO.java`
  - `C:\my-claude\CodeCoachAI-java\codecoachai-question\src\main\java\com\codecoachai\question\controller\AdminQuestionController.java`
- 相关接口路径：
  - `POST /admin/questions`
  - `PUT /admin/questions/{id}`
- 证据：
  - 前端 `src/api/question.ts` 直接把 `QuestionCreateDTO` 发给后端
  - `AdminQuestionSaveDTO` 字段为 `referenceAnswer`，无 `questionType`
- 建议修复方式：统一题目保存 DTO/前端 payload 字段命名。
- 是否需要改数据库：否
- 是否需要改前端：是

### P1 重要问题

#### 2.5 interview 列表接口未接收前端传入的 `keyword/status/reportStatus`，筛选无效

- 问题描述：前端历史页提供筛选表单，但后端 `GET /interviews` 只接收 `pageNo/pageSize`。
- 涉及模块：`codecoachai-interview`
- 涉及文件路径：
  - `C:\my-claude\CodeCoachAI-java\codecoachai-interview\src\main\java\com\codecoachai\interview\controller\InterviewController.java`
- 相关接口路径：`GET /interviews`
- 证据：`InterviewController.list` 只有两个 `@RequestParam`
- 建议修复方式：统一筛选 DTO 或前端移除未生效筛选项。
- 是否需要改数据库：否
- 是否需要改前端：是

#### 2.6 interview 创建接口不支持 `questionGroupId`，前端却暴露了“指定问题组”入口

- 问题描述：前端创建面试表单包含 `questionGroupId`，后端 `CreateInterviewDTO` 无该字段。
- 涉及模块：`codecoachai-interview`
- 涉及文件路径：
  - `C:\my-claude\CodeCoachAI-java\codecoachai-interview\src\main\java\com\codecoachai\interview\domain\dto\CreateInterviewDTO.java`
- 相关接口路径：`POST /interviews`
- 证据：`CreateInterviewDTO` 没有 `questionGroupId`
- 建议修复方式：V1 二选一，前端先去掉该入口，或后端明确支持按问题组抽题。
- 是否需要改数据库：否
- 是否需要改前端：是

#### 2.7 ai 日志列表接口未实现筛选字段，前端的用户/面试/场景/状态查询项实际不生效

- 问题描述：前端传 `userId/interviewId/callType/status`，后端 `pageLogs` 只按分页返回。
- 涉及模块：`codecoachai-ai`
- 涉及文件路径：
  - `C:\my-claude\CodeCoachAI-java\codecoachai-ai\src\main\java\com\codecoachai\ai\controller\AdminAiController.java`
- 相关接口路径：`GET /admin/ai/logs`
- 证据：`pageLogs` 只声明 `pageNo/pageSize`
- 建议修复方式：要么实现筛选，要么前端移除假筛选。
- 是否需要改数据库：否
- 是否需要改前端：是

#### 2.8 admin dashboard 统计字段少于前端展示字段，页面数据只会部分展示或回退为 0

- 问题描述：前端需要完成面试数、失败 AI 调用数、Prompt 数、今日面试数、今日 AI 调用数等；后端只返回 `user/question/resume/interview/aiCall` 五项。
- 涉及模块：`codecoachai-system`
- 涉及文件路径：
  - `C:\my-claude\CodeCoachAI-java\codecoachai-system\src\main\java\com\codecoachai\system\domain\vo\AdminSystemOverviewVO.java`
- 相关接口路径：`GET /admin/system/overview`
- 证据：`AdminSystemOverviewVO` 仅 5 个字段
- 建议修复方式：V1 可先收缩前端卡片数量，避免“看起来已接完但长期显示 0”。
- 是否需要改数据库：否
- 是否需要改前端：是

#### 2.9 auth 暴露了 `POST /auth/refresh-token`，但服务端明确未实现

- 问题描述：前端存在 API，后端直接抛出“V1 暂未实现刷新 Token”。
- 涉及模块：`codecoachai-auth`
- 涉及文件路径：
  - `C:\my-claude\CodeCoachAI-java\codecoachai-auth\src\main\java\com\codecoachai\auth\service\impl\AuthServiceImpl.java`
- 相关接口路径：`POST /auth/refresh-token`
- 证据：`refreshToken()` 直接抛异常
- 建议修复方式：V1 不用就前端不要调用；若保留接口，需在文档中明确未启用。
- 是否需要改数据库：否
- 是否需要改前端：是

#### 2.10 question 查询 DTO 仅支持单标签 `tagId`，与前端多标签 `tagIds` 不一致

- 问题描述：用户端题库筛选支持多选标签，但后端 `QuestionQueryDTO` 只有 `tagId`。
- 涉及模块：`codecoachai-question`
- 涉及文件路径：
  - `C:\my-claude\CodeCoachAI-java\codecoachai-question\src\main\java\com\codecoachai\question\domain\dto\QuestionQueryDTO.java`
- 相关接口路径：
  - `GET /questions`
  - `GET /questions/favorites`
  - `GET /questions/wrong-records`
- 证据：`QuestionQueryDTO` 字段为 `tagId`
- 建议修复方式：V1 最小改法建议前端先退回单标签筛选。
- 是否需要改数据库：否
- 是否需要改前端：是

### P2 优化问题

#### 2.11 OpenFeign 内部调用头传递依赖全局扫描，interview-service 虽可推断可用，但显式性不足

- 问题描述：`auth` 的 Feign Client 显式挂了 `OpenFeignConfig`，`interview` 侧 Feign Client 依赖全局 `RequestInterceptor` Bean。
- 涉及模块：`codecoachai-common`、`codecoachai-interview`
- 涉及文件路径：
  - `C:\my-claude\CodeCoachAI-java\codecoachai-common\common-feign\src\main\java\com\codecoachai\common\feign\config\OpenFeignConfig.java`
- 相关接口路径：所有 `/inner/**` Feign 调用
- 证据：`OpenFeignConfig` 定义了 `X-Internal-Call` / `X-Service-Name`
- 建议修复方式：后续可统一在 Feign 启动配置层显式说明，降低误判风险。
- 是否需要改数据库：否
- 是否需要改前端：否

#### 2.12 `/inner/**` 与 `/admin/**` 的保护策略实现是正确的，但建议补文档说明

- 问题描述：gateway 和 common-security 的双层保护是好的，但目前更多是靠代码推断。
- 涉及模块：`codecoachai-gateway`、`codecoachai-common`
- 涉及文件路径：
  - `C:\my-claude\CodeCoachAI-java\codecoachai-gateway\src\main\java\com\codecoachai\gateway\filter\AuthGatewayFilter.java`
  - `C:\my-claude\CodeCoachAI-java\codecoachai-common\common-security\src\main\java\com\codecoachai\common\security\filter\InternalCallFilter.java`
- 相关接口路径：
  - `/inner/**`
  - `/admin/**`
- 证据：
  - gateway 禁止外部访问 `/inner/**`
  - `/admin/**` 需 `ADMIN`
- 建议修复方式：补充架构文档即可。
- 是否需要改数据库：否
- 是否需要改前端：否

## 3. 前端问题清单

### P0 阻塞问题

#### 3.1 系统配置页的编辑、删除、状态切换都会打到后端不存在的路径

- 问题描述：页面可操作，但后端路径和主键语义不匹配，实际会报错。
- 涉及页面：`管理端 /admin/system/configs`
- 涉及文件路径：
  - `C:\my-claude\CodeCoachAI-vue\src\views\admin\SystemConfigView.vue`
  - `C:\my-claude\CodeCoachAI-vue\src\api\system.ts`
- 当前调用接口：
  - `GET /admin/configs/{key}`
  - `PUT /admin/configs/{key}`
  - `PUT /admin/configs/{key}/status`
  - `DELETE /admin/configs/{key}`
- 后端是否存在：不存在
- 证据：后端 `SystemConfigController` 仅支持按 `id` 更新/删除，且无详情/状态接口
- 建议修复方式：优先统一为单一主键语义

#### 3.2 Prompt 模板编辑会请求不存在的详情接口，且保存字段超出后端实际支持范围

- 问题描述：编辑按钮会先调不存在的详情接口；保存页面展示字段也多于后端真实字段。
- 涉及页面：`管理端 /admin/ai/prompts`
- 涉及文件路径：
  - `C:\my-claude\CodeCoachAI-vue\src\views\admin\PromptTemplateView.vue`
  - `C:\my-claude\CodeCoachAI-vue\src\api\aiAdmin.ts`
- 当前调用接口：`GET /admin/ai/prompts/{id}`
- 后端是否存在：不存在
- 证据：后端 `AdminAiController` 无该 GET
- 建议修复方式：先统一 Prompt V1 的真实字段与编辑能力

#### 3.3 分类/标签/问题组页展示“完整维护能力”，但后端只支持最小字段集

- 问题描述：页面支持状态切换、字段编辑，但后端实际未实现对应接口或不接收这些字段。
- 涉及页面：
  - `管理端 /admin/question-categories`
  - `管理端 /admin/question-tags`
  - `管理端 /admin/question-groups`
- 涉及文件路径：
  - `src\views\admin\QuestionCategoryManageView.vue`
  - `src\views\admin\QuestionTagManageView.vue`
  - `src\views\admin\QuestionGroupManageView.vue`
- 当前调用接口：`PUT .../status` 等
- 后端是否存在：部分不存在
- 证据：后端无 `status` 路由，Group DTO 也不接受 `questionIds/difficulty/knowledgePoint/canonicalAnswer`
- 建议修复方式：删除假能力或补齐契约

#### 3.4 题目管理页提交的保存字段与后端保存 DTO 不一致

- 问题描述：页面提交 `answer/questionType`，后端收 `referenceAnswer`，不收 `questionType`。
- 涉及页面：`管理端 /admin/questions`
- 涉及文件路径：
  - `C:\my-claude\CodeCoachAI-vue\src\views\admin\QuestionManageView.vue`
  - `C:\my-claude\CodeCoachAI-vue\src\api\question.ts`
- 当前调用接口：
  - `POST /admin/questions`
  - `PUT /admin/questions/{id}`
- 后端是否存在：存在，但字段不一致
- 证据：`AdminQuestionSaveDTO`
- 建议修复方式：统一请求字段

### P1 重要问题

#### 3.5 用户端题库标签筛选参数与后端不一致，多标签筛选不会按预期生效

- 问题描述：前端传 `tagIds`，后端只支持 `tagId`。
- 涉及页面：`用户端 /questions`
- 涉及文件路径：
  - `C:\my-claude\CodeCoachAI-vue\src\views\question\QuestionListView.vue`
  - `C:\my-claude\CodeCoachAI-vue\src\components\question\QuestionFilters.vue`
- 当前调用接口：`GET /questions`
- 后端是否存在：存在，但参数不一致
- 证据：前端 `QuestionQueryDTO` 为 `tagIds?: number[]`，后端 `QuestionQueryDTO` 为 `tagId`
- 建议修复方式：V1 先改单标签

#### 3.6 面试创建页暴露了“指定问题组”，但前端没有加载问题组，后端也不支持该字段

- 问题描述：页面有选择器，`groups` 永远为空；即使传出去后端也不接。
- 涉及页面：`用户端 /interviews/create`
- 涉及文件路径：`C:\my-claude\CodeCoachAI-vue\src\views\interview\InterviewCreateView.vue`
- 当前调用接口：`POST /interviews`
- 后端是否存在：存在，但不接收 `questionGroupId`
- 证据：页面无 `getQuestionGroupsApi()` 调用，`CreateInterviewDTO` 无该字段
- 建议修复方式：先隐藏该入口

#### 3.7 面试历史页的筛选项是“假筛选”

- 问题描述：状态、报告状态、关键字筛选均发出请求，但后端不会处理。
- 涉及页面：`用户端 /interviews/history`
- 涉及文件路径：`C:\my-claude\CodeCoachAI-vue\src\views\interview\InterviewHistoryView.vue`
- 当前调用接口：`GET /interviews`
- 后端是否存在：存在，但筛选参数不支持
- 证据：后端只收 `pageNo/pageSize`
- 建议修复方式：前后端任选一侧收敛

#### 3.8 Admin Dashboard 与 AI 日志页对字段的假设多于后端真实返回

- 问题描述：有些卡片与表格列会长期为 0 / 空。
- 涉及页面：
  - `管理端 /admin`
  - `管理端 /admin/ai/logs`
- 涉及文件路径：
  - `src\views\admin\AdminDashboardView.vue`
  - `src\views\admin\AiCallLogView.vue`
- 当前调用接口：
  - `GET /admin/system/overview`
  - `GET /admin/ai/logs`
- 后端是否存在：存在，但字段不完整
- 证据：VO 缺字段
- 建议修复方式：V1 先按后端真实字段收缩页面

### P2 优化问题

#### 3.9 多处页面中文文案存在乱码

- 问题描述：多个路由标题与页面文案出现乱码，影响演示观感。
- 涉及页面：登录、路由标题、题库、简历、面试、后台等多页面
- 涉及文件路径：
  - `C:\my-claude\CodeCoachAI-vue\src\router\routes.ts`
  - 多个 `src\views\**\*.vue`
- 当前调用接口：无
- 后端是否存在：不适用
- 证据：源码内直接可见乱码字符串
- 建议修复方式：统一文件编码为 UTF-8 并清理错误文案

#### 3.10 用户端分类/标签筛选项来自当前已加载题目，覆盖范围有限

- 问题描述：不是从独立接口拿选项，而是从当前页面结果派生。
- 涉及页面：`用户端 /questions`
- 涉及文件路径：`C:\my-claude\CodeCoachAI-vue\src\views\question\QuestionListView.vue`
- 当前调用接口：`GET /questions`
- 后端是否存在：存在
- 证据：`categoryOptions` / `tagOptions` 都从 `questions.value` 计算
- 建议修复方式：V1 可接受，但要明确这是最小方案

## 4. 前后端接口对照表

| 功能 | 前端文件 | 前端接口 | 后端 Controller | 后端接口 | 是否一致 | 问题 |
|---|---|---|---|---|---|---|
| 登录 | `src/api/auth.ts` | `POST /auth/login` | `AuthController` | `POST /auth/login` | 是 | 无 |
| 注册 | `src/api/auth.ts` | `POST /auth/register` | `AuthController` | `POST /auth/register` | 是 | 无 |
| 退出登录 | `src/api/auth.ts` | `POST /auth/logout` | `AuthController` | `POST /auth/logout` | 是 | 无 |
| 当前用户 | `src/api/auth.ts` | `GET /auth/current-user` | `AuthController` | `GET /auth/current-user` | 是 | 无 |
| 刷新 Token | `src/api/auth.ts` | `POST /auth/refresh-token` | `AuthController` | `POST /auth/refresh-token` | 否 | 后端明确未实现 |
| 用户资料 | `src/api/user.ts` | `GET/PUT /users/profile` | `UserController` | `GET/PUT /users/profile` | 是 | 无 |
| 修改密码 | `src/api/user.ts` | `PUT /users/password` | `UserController` | `PUT /users/password` | 是 | 无 |
| 用户概览 | `src/api/user.ts` | `GET /users/overview` | `UserController` | `GET /users/overview` | 是 | 无 |
| 管理端用户分页 | `src/api/user.ts` | `GET /admin/users` | `AdminUserController` | `GET /admin/users` | 是 | 无 |
| 管理端用户状态 | `src/api/user.ts` | `PUT /admin/users/{id}/status` | `AdminUserController` | `PUT /admin/users/{id}/status` | 是 | 无 |
| 角色列表 | `src/api/user.ts` | `GET /admin/roles` | `AdminUserController` | `GET /admin/roles` | 是 | 无 |
| 题库列表 | `src/api/question.ts` | `GET /questions` | `QuestionController` | `GET /questions` | 部分一致 | `tagIds` vs `tagId` |
| 题目详情 | `src/api/question.ts` | `GET /questions/{id}` | `QuestionController` | `GET /questions/{id}` | 基本一致 | 返回字段靠前端 normalize |
| 提交答题 | `src/api/question.ts` | `POST /questions/{id}/answers` | `QuestionController` | `POST /questions/{id}/answers` | 是 | 无 |
| 收藏题目 | `src/api/question.ts` | `POST/DELETE /questions/{id}/favorite` | `QuestionController` | `POST/DELETE /questions/{id}/favorite` | 是 | 无 |
| 收藏列表 | `src/api/question.ts` | `GET /questions/favorites` | `QuestionController` | `GET /questions/favorites` | 基本一致 | 仍有 tag 参数差异 |
| 错题列表 | `src/api/question.ts` | `GET /questions/wrong-records` | `QuestionController` | `GET /questions/wrong-records` | 是 | 未发现旧接口 `/questions/wrongs` |
| 掌握度更新 | `src/api/question.ts` | `PUT /questions/{id}/mastery` | `QuestionController` | `PUT /questions/{id}/mastery` | 是 | 无 |
| 管理端题目分页 | `src/api/question.ts` | `GET /admin/questions` | `AdminQuestionController` | `GET /admin/questions` | 基本一致 | 列表字段需前端 normalize |
| 管理端创建题目 | `src/api/question.ts` | `POST /admin/questions` | `AdminQuestionController` | `POST /admin/questions` | 否 | `answer`/`questionType` 契约不一致 |
| 管理端更新题目 | `src/api/question.ts` | `PUT /admin/questions/{id}` | `AdminQuestionController` | `PUT /admin/questions/{id}` | 否 | 同上 |
| 管理端题目状态 | `src/api/question.ts` | `PUT /admin/questions/{id}/status` | `AdminQuestionController` | `PUT /admin/questions/{id}/status` | 是 | 无 |
| 管理端删除题目 | `src/api/question.ts` | `DELETE /admin/questions/{id}` | `AdminQuestionController` | `DELETE /admin/questions/{id}` | 是 | 无 |
| 分类列表 | `src/api/questionCategory.ts` | `GET /admin/question-categories` | `AdminQuestionMetadataController` | `GET /admin/question-categories` | 部分一致 | 字段少于前端期望 |
| 分类创建/更新 | `src/api/questionCategory.ts` | `POST/PUT /admin/question-categories` | `AdminQuestionMetadataController` | `POST/PUT /admin/question-categories` | 否 | `name/code/parentId/description` 与 `categoryName` 不一致 |
| 分类状态切换 | `src/api/questionCategory.ts` | `PUT /admin/question-categories/{id}/status` | 无 | 无 | 否 | 404 |
| 标签列表 | `src/api/questionTag.ts` | `GET /admin/question-tags` | `AdminQuestionMetadataController` | `GET /admin/question-tags` | 部分一致 | 字段少于前端期望 |
| 标签创建/更新 | `src/api/questionTag.ts` | `POST/PUT /admin/question-tags` | `AdminQuestionMetadataController` | `POST/PUT /admin/question-tags` | 否 | `name/code/description` 与 `tagName` 不一致 |
| 标签状态切换 | `src/api/questionTag.ts` | `PUT /admin/question-tags/{id}/status` | 无 | 无 | 否 | 404 |
| 问题组列表 | `src/api/questionGroup.ts` | `GET /admin/question-groups` | `AdminQuestionMetadataController` | `GET /admin/question-groups` | 否 | 后端未返回 `knowledgePoint/difficulty/questionCount/questionIds` |
| 问题组创建/更新 | `src/api/questionGroup.ts` | `POST/PUT /admin/question-groups` | `AdminQuestionMetadataController` | `POST/PUT /admin/question-groups` | 否 | 大量字段被忽略 |
| 问题组状态切换 | `src/api/questionGroup.ts` | `PUT /admin/question-groups/{id}/status` | 无 | 无 | 否 | 404 |
| 简历列表 | `src/api/resume.ts` | `GET /resumes` | `ResumeController` | `GET /resumes` | 基本一致 | 后端返回 list，前端兼容为 page |
| 创建简历 | `src/api/resume.ts` | `POST /resumes` | `ResumeController` | `POST /resumes` | 部分一致 | 前端字段通过 normalize 映射到后端 |
| 简历详情 | `src/api/resume.ts` | `GET /resumes/{id}` | `ResumeController` | `GET /resumes/{id}` | 部分一致 | 字段命名存在漂移 |
| 更新简历 | `src/api/resume.ts` | `PUT /resumes/{id}` | `ResumeController` | `PUT /resumes/{id}` | 部分一致 | 同上 |
| 删除简历 | `src/api/resume.ts` | `DELETE /resumes/{id}` | `ResumeController` | `DELETE /resumes/{id}` | 是 | 无 |
| 默认简历 | `src/api/resume.ts` | `PUT /resumes/{id}/default` | `ResumeController` | `PUT /resumes/{id}/default` | 是 | 无 |
| 简历项目新增 | `src/api/resume.ts` | `POST /resumes/{resumeId}/projects` | `ResumeController` | `POST /resumes/{resumeId}/projects` | 是 | 无文件上传 |
| 简历项目更新 | `src/api/resume.ts` | `PUT /resumes/{resumeId}/projects/{projectId}` | `ResumeController` | `PUT /resumes/{resumeId}/projects/{projectId}` | 是 | 无 |
| 简历项目删除 | `src/api/resume.ts` | `DELETE /resumes/{resumeId}/projects/{projectId}` | `ResumeController` | `DELETE /resumes/{resumeId}/projects/{projectId}` | 是 | 无 |
| 创建面试 | `src/api/interview.ts` | `POST /interviews` | `InterviewController` | `POST /interviews` | 部分一致 | `questionGroupId` 未被后端接收 |
| 开始面试 | `src/api/interview.ts` | `POST /interviews/{id}/start` | `InterviewController` | `POST /interviews/{id}/start` | 是 | 无 |
| 当前题目 | `src/api/interview.ts` | `GET /interviews/{id}/current` | `InterviewController` | `GET /interviews/{id}/current` | 是 | 无 |
| 回答面试题 | `src/api/interview.ts` | `POST /interviews/{id}/answer` | `InterviewController` | `POST /interviews/{id}/answer` | 是 | 前端附加字段会被忽略但不阻塞 |
| 结束面试 | `src/api/interview.ts` | `POST /interviews/{id}/finish` | `InterviewController` | `POST /interviews/{id}/finish` | 是 | 无 |
| 重试报告 | `src/api/interview.ts` | `POST /interviews/{id}/report/retry` | `InterviewController` | `POST /interviews/{id}/report/retry` | 是 | 无 |
| 面试历史 | `src/api/interview.ts` | `GET /interviews` | `InterviewController` | `GET /interviews` | 否 | 筛选参数不生效 |
| 面试详情 | `src/api/interview.ts` | `GET /interviews/{id}` | `InterviewController` | `GET /interviews/{id}` | 基本一致 | 依赖前端 normalize |
| 面试报告 | `src/api/interview.ts` | `GET /interviews/{id}/report` | `InterviewController` | `GET /interviews/{id}/report` | 基本一致 | 依赖前端 normalize |
| Prompt 列表 | `src/api/aiAdmin.ts` | `GET /admin/ai/prompts` | `AdminAiController` | `GET /admin/ai/prompts` | 部分一致 | 查询字段与返回字段不一致 |
| Prompt 详情 | `src/api/aiAdmin.ts` | `GET /admin/ai/prompts/{id}` | 无 | 无 | 否 | 404 |
| Prompt 新增/更新 | `src/api/aiAdmin.ts` | `POST/PUT /admin/ai/prompts` | `AdminAiController` | `POST/PUT /admin/ai/prompts` | 否 | DTO 仅支持 `scene/name/content/status` |
| Prompt 状态 | `src/api/aiAdmin.ts` | `PUT /admin/ai/prompts/{id}/status` | `AdminAiController` | `PUT /admin/ai/prompts/{id}/status` | 是 | 无 |
| AI 日志列表 | `src/api/aiAdmin.ts` | `GET /admin/ai/logs` | `AdminAiController` | `GET /admin/ai/logs` | 部分一致 | 筛选项和部分字段缺失 |
| AI 日志详情 | `src/api/aiAdmin.ts` | `GET /admin/ai/logs/{id}` | `AdminAiController` | `GET /admin/ai/logs/{id}` | 基本一致 | 字段少于前端期望 |
| 系统概览 | `src/api/system.ts` | `GET /admin/system/overview` | `SystemConfigController` | `GET /admin/system/overview` | 部分一致 | 后端统计字段少 |
| 配置列表 | `src/api/system.ts` | `GET /admin/configs` | `SystemConfigController` | `GET /admin/configs` | 部分一致 | 前端按分页/筛选处理，后端返回 list |
| 配置详情 | `src/api/system.ts` | `GET /admin/configs/{key}` | 无 | 无 | 否 | 404 |
| 配置新增 | `src/api/system.ts` | `POST /admin/configs` | `SystemConfigController` | `POST /admin/configs` | 部分一致 | 字段命名 `configType` vs `valueType` |
| 配置更新 | `src/api/system.ts` | `PUT /admin/configs/{key}` | `SystemConfigController` | `PUT /admin/configs/{id}` | 否 | 主键不一致 |
| 配置状态 | `src/api/system.ts` | `PUT /admin/configs/{key}/status` | 无 | 无 | 否 | 404 |
| 配置删除 | `src/api/system.ts` | `DELETE /admin/configs/{key}` | `SystemConfigController` | `DELETE /admin/configs/{id}` | 否 | 主键不一致 |

## 5. 用户端接口安全检查

- 是否误调 `/admin/**`：未发现用户端页面误调 `/admin/**`。`/admin/**` 调用只出现在 `src/api/user.ts`、`questionCategory.ts`、`questionTag.ts`、`questionGroup.ts`、`aiAdmin.ts`、`system.ts`，并由管理端页面引用。
- 是否误调 `/inner/**`：未发现前端误调 `/inner/**`。
- 是否存在用户端 `/ai/**`：未发现。AI 能力由 `interview-service -> /inner/ai/**` 间接调用。
- 是否存在直连微服务端口：未发现前端直连 `9201-9207`；开发环境统一走 `http://localhost:8080` Gateway。
- 是否存在权限绕过：静态分析未发现明显前端绕过点。前端路由守卫要求 ADMIN，Gateway 也对 `/admin/**` 做了角色校验。
- token / Authorization 是否一致：一致。前端统一发 `Authorization: Bearer <token>`，后端 auth/gateway/common-security 均按该头处理。
- `41000 / 41001` 是否清理本地登录态：是。`request.ts` 在这两个 code 下调用 `clearLocalAuth()`，且 `clearLocalAuth` 会清理 `token/userInfo/roles`。

## 6. 字段映射风险清单

| 模块 | 后端字段 | 前端字段 | 风险 | 建议 |
|---|---|---|---|---|
| 分类 | `categoryName` | `name` | 已靠 normalize 兼容，但后端无 `code/parentId/description` | V1 先收缩字段 |
| 标签 | `tagName` | `name` | 已靠 normalize 兼容，但后端无 `code/description` | 同上 |
| 问题组 | `groupName` | `name` | 兼容不完整，`knowledgePoint/difficulty/questionIds/questionCount` 丢失 | 优先统一问题组 DTO/VO |
| 题目详情 | `referenceAnswer` | `answer/referenceAnswer` | 编辑保存时最易丢字段 | 统一保存 DTO |
| 题目组名 | `groupName` | `groupTitle/groupName/name` | 前端做了兜底，但语义混乱 | 固定单一命名 |
| 题目标签 | `tags: List<String>` | `tags: QuestionTagVO[]` | 前端强 normalize，有 `[object Object]` 风险边界 | 后端优先统一返回结构 |
| Prompt | `scene/name/content` | `promptType/templateCode/promptName/templateContent` | 编辑页与后端契约明显漂移 | 先定 V1 单一模型 |
| AI 日志 | `scene/costMillis/requestBody/responseBody` | `callType/latencyMs/requestParams/responseContent` | 展示依赖映射，部分列为空 | 统一 VO |
| 系统配置 | `valueType` | `configType` | 前端已 normalize，但更新路径/详情不一致更严重 | 路径与字段一起统一 |
| 系统配置 | 无 `configName/editable` | `configName/editable` | 页面展示超出后端真实返回 | 收缩页面或补 VO |
| 简历 | `title/realName/summary` | `resumeName/targetPosition/skills/workSummary` | 语义映射偏硬，信息丢失风险高 | 明确 V1 简历字段 |
| 面试列表 | `id/title/mode/updatedAt` | `interviewId/interviewName/interviewMode/createdAt` | 靠 normalize，可用但不稳 | 统一命名 |
| 面试报告 | `status/failureReason` | `reportStatus/failedReason` | 靠 normalize，可用 | 可后置 |

## 7. 启动配置与调用链风险

- Gateway 端口：`8080`
- 前端 `VITE_API_BASE_URL`：
  - 开发：`http://localhost:8080`
  - 生产：`/api`
- Nacos 服务名：
  - `codecoachai-auth`
  - `codecoachai-user`
  - `codecoachai-question`
  - `codecoachai-resume`
  - `codecoachai-interview`
  - `codecoachai-ai`
  - `codecoachai-system`
  - 与 `FeignClient(name=...)`、Gateway `lb://...` 一致
- Feign name：当前看到的 `codecoachai-user / question / resume / ai` 与服务名一致
- Feign path：
  - auth -> user：`/inner/users/**`
  - interview -> question：`/inner/questions/**`
  - interview -> resume：`/inner/resumes/**`
  - interview -> ai：`/inner/ai/interview/**`
- 内部调用 header：
  - `OpenFeignConfig` 会注入 `X-Internal-Call=true` 与 `X-Service-Name`
  - `InternalCallFilter` 会拦截未携带内部头的 `/inner/**`
- auth token-info：
  - gateway 通过 `lb://codecoachai-auth/inner/auth/token-info` 校验 token
  - 该链路设计是正确的
- `/admin/**` 鉴权：
  - Gateway `AuthGatewayFilter` 要求 token 且角色包含 `ADMIN`
- `/inner/**` 保护：
  - Gateway 对外直接拒绝 `/inner/**`
  - 各服务 `InternalCallFilter` 二次校验内部头
- 风险结论：
  - 服务名、Nacos、Gateway 端口整体一致
  - 目前主要不是启动配置错，而是接口契约错

## 8. 后续最小修改建议

### 后端下一轮提示词建议

请只修 V1 联调阻塞项，不新增功能、不改数据库结构、不改 Nacos、不做大重构。  
请先统一以下后端接口契约并保证兼容前端现有页面：  
1. `system-service`：补齐或统一 `GET /admin/configs/{id|key}`、`PUT /admin/configs/{id|key}`、`PUT /admin/configs/{id|key}/status`、`DELETE /admin/configs/{id|key}` 的单一语义，并统一 `valueType/configType`、`configName/editable/status` 返回。  
2. `ai-service`：补 `GET /admin/ai/prompts/{id}`，统一 Prompt 的 V1 DTO/VO 字段，至少明确 `scene/name/content/status` 与前端字段的映射。  
3. `question-service`：统一管理端题目保存 DTO，解决 `referenceAnswer/answer`、`questionType`、分类/标签/问题组 DTO/VO 不一致；补齐或明确移除 `question-categories/question-tags/question-groups` 的状态切换接口。  
4. `interview-service`：确认是否支持 `questionGroupId`、`keyword/status/reportStatus` 筛选；若 V1 不支持，请保持接口明确而不是静默忽略。  
输出要求：列出修改的接口、修改前后字段对照、是否影响前端、是否影响数据库。不要提交代码。

### 前端下一轮提示词建议

请只修 V1 联调阻塞项，不新增功能、不改后端、不引入新依赖、不做大重构。  
请优先按后端现状收敛页面，避免假功能：  
1. `SystemConfigView`：先移除/禁用后端不存在的详情、状态切换、按 key 更新删除能力，直到后端统一接口。  
2. `PromptTemplateView`：在后端详情接口和字段统一前，先避免走不可用编辑链路，或按后端真实字段收缩表单。  
3. `QuestionCategoryManageView` / `QuestionTagManageView` / `QuestionGroupManageView` / `QuestionManageView`：按后端真实字段收缩表单与按钮，移除当前会 404 或静默丢字段的操作。  
4. `QuestionListView`：把多标签筛选改成单标签，避免 `tagIds` 与后端 `tagId` 不一致。  
5. `InterviewCreateView`：移除或隐藏当前未接通的“指定问题组”入口。  
6. `InterviewHistoryView`、`AiCallLogView`、`AdminDashboardView`：先收缩未被后端支持的筛选项和统计项。  
7. 统一清理中文乱码文案。  
输出要求：列出每个页面删除/保留的能力、对应后端接口、是否还有待后端补齐项。不要提交代码。

## 9. 暂不建议做的内容

- 文件上传
- 学习计划
- AI 简历优化
- AI 题目生成
- Prompt 体系大改
- Nacos 配置改造
- 新增普通用户分类/标签/问题组接口
- 数据库结构调整
- 用户端直连 `/inner/**`
- 用户端接入 `/admin/**` 分类、标签、问题组接口
- 大规模前后端重构

## 10. 本轮未确认项

- 未确认：`questionGroupId` 是否本来就不在 V1 范围内。需要产品范围说明或查看更完整设计文档。
- 未确认：interview-service 的 Feign 内部调用头在实际运行时是否全部正常携带。静态代码推断大概率正常，如需 100% 确认需要启动服务并看调用日志。
- 未确认：后台分类/标签/问题组页面是否原本只是“只读展示”还是确实要求完整维护。当前前端表现为完整维护页，后端实现明显未跟上。
- 未确认：部分简历字段如 `education/workSummary/isDefault` 是否故意只做前端本地展示映射。需要对照更完整接口文档或运行结果。
- 未确认：AI 日志和系统概览是否刻意只做最小统计。需要看 V1 验收口径或历史演示脚本。

## 11. 用户端分类/标签/问题组接口专项结论

- 用户端题库列表目前确实有分类/标签筛选 UI。
- 未发现用户端调用 `/admin/question-categories`
- 未发现用户端调用 `/admin/question-tags`
- 未发现用户端调用 `/admin/question-groups`
- 当前实现不是走管理接口，而是从 `/questions` 列表结果中派生筛选项。

结论：

- 本轮没有出现“用户端误调 `/admin/**`”问题。
- 若后续必须在 V1 内二选一：
  - 方案 A：后端补普通用户可访问的分类/标签/问题组查询接口
  - 方案 B：前端继续从 `/questions` 返回数据中派生筛选项

更适合当前 V1 的方案：**方案 B**

理由：

- 方案 B 不新增接口，符合本轮“不要新增接口、不要扩范围”的约束。
- 当前用户端已经采用派生方式，改动最小。
- 但要注意：方案 B 只适合 V1 最小演示；它无法天然覆盖全量分类/标签集合，且目前还存在 `tagIds -> tagId` 参数不一致问题，需同步收敛。
