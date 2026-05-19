# AGENTS.md

## 1. 项目背景

你正在参与 `CodeCoachAI-vue` 前端 V3 开发。

CodeCoachAI 是一个面向 Java 求职者的 AI Java 面试训练、简历优化与求职训练闭环平台，用于 GitHub、个人博客和求职作品集展示。

本仓库是前端仓库：

- 前端仓库：`codecoch-ai-vue`
- 后端仓库：`codecoch-ai-java`
- 文档仓库：`codecoch-ai-doc`

当前前端 V3 开发分支：

```bash
dev-v3
```

分支与基线规则：

- 后续前端 V3 任务完成后 push 到 `origin/dev-v3`。
- V2 前端封板基线是 `dev-ui / 3c60711 fix: align interview question SSE parameters`。
- 文档仓库继续使用 `main`。
- 文档仓库 `main` 已完成 V3-A 规划冻结与一致性修正。
- 当前阶段是 V3，V3-A 已完成，准备进入 V3-B 后端开发。
- 前端下一阶段重点是 V3-C：目标岗位 / JD 前端页面。
- 前端开发必须以后端 `dev-v3` 已完成并验证过的真实接口为准，不允许凭草案提前写死接口。

V3 主线：

```text
岗位目标 / JD -> 简历-JD 匹配 -> 能力差距画像 -> 学习计划 -> 题目训练 -> 模拟面试 -> 报告回流 -> 求职驾驶舱
```

---

## 2. V3 文档基线

执行任何 V3 前端任务前，必须优先阅读文档仓库 `main` 中的 V3 基线文档：

```bash
C:\my-claude\CodeCoachAI-doc\V3\CodeCoachAI_PRD_V3_Enhanced.md
C:\my-claude\CodeCoachAI-doc\MD\V3\V3_开发路线图.md
C:\my-claude\CodeCoachAI-doc\MD\V3\V3_API契约草案.md
C:\my-claude\CodeCoachAI-doc\MD\V3\V3_前端页面清单.md
C:\my-claude\CodeCoachAI-doc\MD\V3\V3_验收清单.md
```

如任务涉及数据库、Prompt 或 AI 调用链路，还应阅读：

```bash
C:\my-claude\CodeCoachAI-doc\MD\V3\V3_数据库设计草案.md
C:\my-claude\CodeCoachAI-doc\MD\V3\V3_AI_Prompt类型清单.md
```

重要原则：

- `V3_API契约草案.md` 是规划草案，不等于前端最终接口契约。
- 前端接口以 `codecoach-ai-java` 后端 `dev-v3` 已实现、已验证的 Controller / DTO / VO / SSE 事件为准。
- 如果文档草案、真实后端接口和当前前端代码冲突，先说明冲突，以真实代码结构和已验证接口为准，不直接硬改。

---

## 3. 当前技术栈

项目当前技术栈：

- Vue 3
- Vite
- TypeScript
- Vue Router
- Pinia
- Axios
- Element Plus
- ECharts
- markdown-it
- Sass / SCSS
- Tailwind CSS
- @vueuse/core
- lucide-vue-next
- clsx
- tailwind-merge
- class-variance-authority

暂缓引入：

- shadcn-vue
- Monaco Editor
- splitpanes

除非用户明确要求并说明必要性，否则不要引入新的无关 UI 框架或大体量依赖。

---

## 4. V3 阶段路线

V3-A 已完成：

- V3 PRD 完善版
- V3 开发路线图
- V3 数据库设计草案
- V3 API 契约草案
- V3 前端页面清单
- V3 AI Prompt 类型清单
- V3 验收清单

推荐执行顺序：

```text
V3-A：规划冻结与契约拆分
V3-B：目标岗位 / JD 后端基础
V3-C：目标岗位 / JD 前端页面
V3-D：简历-JD 匹配分析后端
V3-E：简历-JD 匹配分析前端
V3-F：能力画像、学习计划、题目、面试联动
V3-G：任务中心、通知中心、搜索、文件、日志、工作流治理
V3-H：求职驾驶舱、Compose、全链路验收与封板
```

当前前端后续重点：

- 等待 V3-B 后端目标岗位 / JD P0 接口和 migration 验收通过。
- 进入 V3-C 后，只做目标岗位 / JD 前端页面与真实接口联调。
- 不要提前实现 V3-D 之后的完整业务页面，除非用户明确切换阶段。

---

## 5. V3-C 前端方向

V3-C 优先做：

1. 目标岗位列表页。
2. 目标岗位创建 / 编辑页。
3. JD 分析页。
4. 设置当前主目标入口。
5. JD 解析状态展示。
6. JD 解析结果展示。
7. 与 V3-B 后端真实接口联调。
8. 页面必须使用真实 API，不允许 mock 冒充已完成。

V3-C 验收标准：

- `npx vue-tsc -b` 通过。
- `npm run build` 通过。
- 目标岗位页面调用真实接口。
- loading、empty、error 状态明确。
- 目标岗位列表、创建 / 编辑、JD 分析页面浏览器点击通过。
- SSE 失败时有 REST 结果查询兜底。
- 不破坏 V1/V2 已有登录、权限、题库、简历、面试、管理后台链路。

---

## 6. V3 前端页面规划

后续 V3 主要用户端页面：

1. `/dashboard/v3`
2. `/job-targets`
3. `/job-targets/create`
4. `/job-targets/:id/edit`
5. `/job-targets/:id/analysis`
6. `/resume-match`
7. `/resume-match/:id`
8. `/skill-profile`
9. `/study-plans/from-gap` 或复用 `/study-plans`
10. `/interviews/create?source=job-target`
11. `/questions/recommendations`

后续 V3 主要管理端页面：

1. `/admin/tasks`
2. `/admin/notifications`
3. `/admin/search`
4. `/admin/ai/workflows`
5. `/admin/ai/prompts`
6. `/admin/logs/operations`
7. `/admin/logs/logins`
8. `/admin/files` 或 `/admin/files/storage`

页面规划要求：

- 这些路由是 V3 规划入口，不代表当前仓库已经全部实现。
- 新增路由前必须扫描真实 `src/router`、`src/views`、`src/api`、`src/types`、`src/stores` 结构。
- 可复用现有页面时优先复用，不为了目录整洁大规模移动文件。
- 点击入口必须指向真实可达路由；未实现能力不能做成看似可用的假按钮。

---

## 7. 核心原则

### 7.1 不破坏 V1/V2 已有功能

V3 是在 V2 封板基线上的增量开发，不是业务逻辑重写。

任何改动都必须保证以下功能不被破坏：

- 登录
- 退出
- Token 持久化
- 路由权限守卫
- 用户端 / 管理端菜单权限
- 题库列表
- 题目详情
- 收藏题目
- 错题记录
- 简历新增、编辑、删除、查看
- 简历优化
- 学习计划
- 创建面试
- 进入面试房间
- 提交答案
- AI 评分
- AI 追问
- 结束面试
- 查看面试报告
- 后台题目管理
- 后台分类管理
- 后台标签管理
- 后台 Prompt 管理
- 后台 AI 调用日志
- 后台文件治理
- 后台系统配置

### 7.2 不伪造功能

禁止用 Mock 数据替代已有真实接口。

允许占位的情况：

- 后端接口尚未接入。
- 当前页面属于后续 V3 阶段预留入口。
- 页面明确显示“待接入”或“未联调”。
- 不影响已有 V1/V2 核心流程。

禁止行为：

- 伪造 JD 解析成功结果。
- 伪造简历-JD 匹配评分。
- 伪造能力画像。
- 伪造学习计划结果。
- 伪造题目推荐原因。
- 伪造模拟面试生成结果。
- 用假数据冒充真实接口返回。
- 用伪 SSE 输出冒充真实 AI 流式结果。

### 7.3 不随意改接口

前端 V3 开发默认不修改接口契约。

不要随意修改：

- API 路径
- 请求方法
- 请求参数
- 响应字段解析
- Axios 拦截器
- Token Header
- 错误处理逻辑

如果发现接口字段确实不匹配，先输出问题说明和真实证据，不要直接大改。

---

## 8. 禁止事项

以下行为禁止执行：

1. 禁止大面积删除已有业务代码。
2. 禁止为了 UI 效果绕过真实接口。
3. 禁止把真实接口替换成 Mock 数据。
4. 禁止破坏现有 Axios 封装。
5. 禁止破坏 Token、用户信息、权限状态的 Pinia 存储逻辑。
6. 禁止破坏 Vue Router 路由守卫。
7. 禁止随意改接口路径、请求参数、响应解析逻辑。
8. 禁止修改后端仓库代码，除非用户明确要求后端任务。
9. 禁止一次性引入大量 UI 库。
10. 禁止全量替换 Element Plus。
11. 禁止为了消除 TypeScript 报错使用大量 `any`、`// @ts-ignore` 或无意义类型断言。
12. 禁止提交不能通过 `npx vue-tsc -b` 和 `npm run build` 的代码。
13. 禁止只做首页大屏，忽略真实业务流程。
14. 禁止新增无法访问、无法跳转、无数据来源的空页面。
15. 禁止把用户端和管理端菜单权限混在一起。
16. 禁止把接口草案当成最终契约。
17. 禁止擅自生成结果文档文件。
18. 禁止写入真实数据库密码、AI Key、token 或其他敏感配置。

---

## 9. 前端风格与实现规则

目标风格延续现有前端重构基线：

- 深色 AI 工作台
- 求职训练台
- 开发者 IDE
- AI 面试作战台
- 技术产品展示感
- 适合作为 Java + AI 全栈作品集截图展示

视觉关键词：

- 深色背景
- 低饱和边框
- 半透明卡片
- 蓝紫色 AI 高亮
- 类 IDE 面板
- 数据仪表盘
- 三栏工作区
- 清晰的信息层级
- 现代线性图标
- 控制台 / 终端 / 代码块质感

实现规则：

- 优先复用现有 Layout、路由守卫、权限判断、API 封装、类型定义和页面组件风格。
- 不要重构整体前端架构。
- 不要新增无关 UI 框架。
- 页面必须有 loading、empty、error 状态。
- SSE 页面必须有断开清理和 REST 结果查询兜底。
- 管理端危险操作必须有确认弹窗，取消应为静默 no-op。
- 不使用正式 mock 数据冒充真实接口。
- 如果后端接口尚未完成，前端任务只能做类型和页面骨架，并明确标记未联调；不能宣称完成联调。
- 空字段显示 `--`、空状态或明确说明，不用看似真实的占位业务数据。

---

## 10. Element Plus、Tailwind 与图标规则

### 10.1 Element Plus

Element Plus 继续保留，主要用于：

- 表格
- 表单
- 分页
- 弹窗
- 抽屉
- Select
- DatePicker
- Upload
- Message
- Notification
- 管理后台 CRUD 页面

不要全量替换 Element Plus。

需要持续保证：

- 表格暗色可读性
- 表单暗色可读性
- Dialog / Drawer 暗色背景
- Pagination 暗色样式
- Menu 暗色样式

### 10.2 Tailwind CSS

Tailwind 主要用于：

- 页面布局
- 深色背景
- 卡片
- 间距
- 响应式
- 顶部导航
- 侧边栏
- 三栏面试房间
- AI 工作台组件
- 状态徽章

Tailwind 不用于替代所有 Element Plus 组件。

### 10.3 图标

统一优先使用：

```bash
lucide-vue-next
```

用于：

- 菜单图标
- 工作台卡片图标
- AI 状态图标
- 面试房间操作图标
- 报告页指标图标
- 管理后台概览图标

避免混用过多图标库。

---

## 11. 推荐目录结构

在不破坏现有结构的前提下，可以逐步整理：

```bash
src/
  layouts/
    UserLayout.vue
    AdminLayout.vue
    components/

  components/
    common/
    ai/
    interview/
    resume/

  styles/
    index.scss
    theme.scss
    element-dark.scss
    tailwind.css

  views/
    user/
    admin/
    interview/
    question/
    resume/
    study/
```

要求：

- 如果当前项目已有类似目录，优先复用现有目录。
- 不要为了目录整洁大规模移动文件。
- 每次移动文件必须同步修复 import、路由、组件引用。
- 页面重构优先保持业务逻辑不变，只替换布局和视觉层。

---

## 12. 每轮执行流程

### 12.1 开始前检查

执行：

```bash
git branch --show-current
git status --short
```

要求：

- 当前分支应为 `dev-v3`。
- 工作区应清晰；如果发现已有用户未提交改动，先停止并汇报，不要覆盖。
- 如果当前分支不是 `dev-v3`，切换到 `dev-v3` 并拉取最新代码后再继续。

### 12.2 阅读上下文

每轮开始前必须阅读：

```bash
AGENTS.md
package.json
src/router
src/api
src/views
```

V3 任务还必须阅读本文第 2 节列出的文档仓库基线。

不要凭空重构。

### 12.3 小步修改

每轮只做一个明确主题。

不要一次性修改几十个页面。不要把 V3-C、V3-D、V3-E、V3-F 混在一轮。

### 12.4 修改后检查

每轮前端任务必须执行：

```bash
npx vue-tsc -b
npm run build
git diff --check
```

如果涉及真实页面，必须说明浏览器点击或联调验证结果。

如果项目未来新增 lint / test 脚本，也应执行：

```bash
npm run lint
npm run test
```

如果没有对应脚本，不要虚构执行结果。

检查通过后：

```bash
git add <本轮修改文件>
git commit -m "<符合本轮范围的提交信息>"
git push origin dev-v3
```

---

## 13. 路由与权限约束

不得破坏现有路由守卫。

必须保证：

- 未登录访问受保护页面时跳转登录页。
- 已登录用户可进入用户端页面。
- 管理员可进入管理端页面。
- 普通用户不能访问管理端页面。
- Token 失效后能回到登录页。
- 用户端菜单和管理端菜单权限不混用。

新增 V3 路由时：

- 必须遵守现有 `src/router` 组织方式。
- 必须补齐 `meta.title` 和必要权限信息。
- 必须确认点击入口真实可达。
- 不能创建没有真实页面、没有数据来源、没有阶段说明的空路由。

---

## 14. V3 SSE 与异步任务规则

涉及 SSE 或异步 AI 任务时：

- 优先确认后端 `dev-v3` 是否已有真实 SSE 或任务查询接口。
- SSE 页面必须有连接中、处理中、完成、失败、空结果状态。
- 组件卸载时必须清理连接或 AbortController。
- SSE 失败时必须提供 REST 结果查询兜底。
- 不允许伪造 token streaming。
- 不允许把阶段消息当成模型逐字输出。
- 任务失败时展示后端错误摘要，不要吞掉错误。

---

## 15. 管理端规则

管理端页面必须遵守：

- 只展示后端真实支持的能力。
- 危险操作必须有确认弹窗。
- 取消确认应为静默 no-op，不显示错误提示。
- 列表页必须有 loading、empty、error 状态。
- 表格字段为空时显示 `--` 或明确说明。
- 不做未实现删除、下载、重试、刷新、群发等假按钮。
- V3 管理能力优先复用现有 `/admin/**` 路由和 Prompt / 日志 / 文件治理页面。

---

## 16. 样式规范

推荐基础色彩方向：

```text
背景：深黑 / 深蓝黑
主色：蓝紫色 / 青蓝色
边框：低透明白色
卡片：半透明深色
文字：高对比灰白
弱文字：低对比灰
成功：绿色
警告：黄色 / 橙色
错误：红色
```

必须保证：

- 表格文字清晰。
- 表单 label 清晰。
- 输入框文字清晰。
- placeholder 可读。
- 按钮 hover 状态可见。
- 弹窗内容可读。
- Markdown 内容可读。
- 代码块可读。
- 文本在移动端和桌面端不溢出、不重叠。

允许轻量动效：

- hover
- transition
- 卡片阴影变化
- 菜单展开收起
- 面板切换

禁止过度动效：

- 大量粒子效果
- 影响输入的动画
- 影响表格操作的动画
- 降低性能的背景动效

---

## 17. 出现问题时的处理规则

### 17.1 类型检查或 build 失败

必须先修复类型检查和 build。

不得在失败状态下继续叠加新功能。

### 17.2 接口异常

先确认：

- 请求路径是否变化。
- Token 是否携带。
- 参数是否正确。
- 后端是否启动。
- 是否跨域。
- 是否权限不足。
- 后端 `dev-v3` 是否已经实现该接口。

不要直接改接口封装。

### 17.3 权限异常

先检查：

- Pinia 用户状态。
- Token 持久化。
- 路由 meta。
- 菜单过滤逻辑。
- 管理员角色判断。

不要简单删除权限判断。

### 17.4 样式污染

如果 Tailwind 或全局 SCSS 影响 Element Plus：

- 优先收敛全局选择器。
- 避免滥用 `*`。
- 避免全局覆盖 `button`、`input`、`table`。
- 将 Element Plus 暗色兼容样式集中放入 `element-dark.scss`。

---

## 18. Codex 行为规范

Codex 执行前端任务时必须遵守：

1. 不要跳过类型检查和构建直接说完成。
2. 不要擅自生成结果文档文件。
3. 不要为了 V3 新增假页面、假按钮、假接口。
4. 不要把接口草案当成最终契约；必须以后端 `dev-v3` 真实接口为准。
5. 如果接口、路由、类型、页面规划和真实代码冲突，必须先说明冲突并以真实代码结构为准。
6. 每次开发前先静态扫描真实 router、api、types、views、store 风格。
7. 如果编译通过并完成检查，自动 commit 并 push 到 `origin/dev-v3`。
8. 如果发现工作区已有用户未提交改动，先停止并汇报，不要覆盖。
9. 最终汇报必须说明改动范围、验证命令、commit hash、push 结果和未验证项。

---

## 19. 输出变更报告格式

每轮结束必须输出：

```md
## 本轮修改范围

- 修改了哪些模块
- 修改了哪些文件
- 新增了哪些依赖
- 是否影响接口
- 是否影响路由
- 是否影响权限

## 验收结果

- npx vue-tsc -b：通过 / 失败
- npm run build：通过 / 失败
- git diff --check：通过 / 失败
- 浏览器点击或联调：未测试 / 已测试 / 不涉及
- 登录流程：未测试 / 已测试 / 不涉及
- 用户端菜单：未测试 / 已测试 / 不涉及
- 管理端菜单：未测试 / 已测试 / 不涉及
- 核心业务流程：未测试 / 已测试 / 不涉及

## 风险点

- xxx

## 下一轮建议

- xxx
```

不要只输出“已完成”。

---

## 20. Git 提交规则

每轮任务完成并验证通过后提交一次。

提交示例：

```bash
git add AGENTS.md
git commit -m "docs: update frontend agents for V3"
git push origin dev-v3
```

不要把多个大主题混在一个 commit 中。
