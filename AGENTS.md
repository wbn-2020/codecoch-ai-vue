# AGENTS.md

## 1. 项目背景

你正在参与 `CodeCoachAI-vue` 前端重构。

CodeCoachAI 是一个面向 Java 求职者的 AI Java 面试训练与简历优化平台，用于 GitHub、个人博客和求职作品集展示。

本仓库是前端仓库：

- 前端仓库：`codecoch-ai-vue`
- 后端仓库：`codecoch-ai-java`
- 文档仓库：`codecoch-ai-doc`

当前重构分支：

```bash
dev-ui
```

当前前端重构目标：

> 在不破坏 V1 已有业务功能和现有接口的前提下，将前端从普通 Element Plus 后台风格升级为：深色 AI SaaS + 开发者 IDE + AI 面试作战台风格。

前端重构 PRD 位于：

```bash
docs/CodeCoachAI_前端重构PRD_深色AI工作台版.md
```

执行任何前端重构任务前，必须先阅读该 PRD 和本文件。

---

## 2. 当前技术栈

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

允许新增：

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

除非用户明确要求，否则第一轮不要引入暂缓技术。

---

## 3. 重构总路线

整个前端重构分 7 大步：

```text
1. 工程基础
2. 布局重构
3. 用户端工作台
4. AI 面试核心链路
5. 简历中心
6. 管理后台
7. V2 接入与回归测试
```

每一轮只允许做一个明确主题，不要一次性重构多个阶段。

---

## 4. 当前优先级

当前从第 1 步开始：

```text
第 1 步：工程基础
```

第 1 步目标：

- 确认当前分支为 `dev-ui`
- 确认当前 build 状态
- 接入 Tailwind CSS
- 建立全局深色主题 token
- 建立 Element Plus 暗色兼容样式
- 保证原有页面仍可访问
- 保证 `npm run build` 通过

第 1 步不允许重构业务页面。

禁止在第 1 步修改：

- 用户工作台页面
- AI 面试房间页面
- 创建面试页面
- 面试报告页面
- 简历中心页面
- 管理后台首页
- 任何后端接口路径
- Axios 核心封装
- 路由守卫
- Pinia 鉴权逻辑

---

## 5. 核心原则

### 5.1 不破坏 V1 已有功能

本次是前端 UI / 体验 / 布局重构，不是业务逻辑重写。

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
- 后台系统配置

### 5.2 不伪造功能

禁止用 Mock 数据替代已有真实接口。

允许占位的情况：

- 后端接口尚未接入
- 当前页面属于 V2 预留入口
- 页面明确显示“待接入”
- 不影响已有 V1 核心流程

禁止行为：

- 伪造 AI 评分
- 伪造简历优化结果
- 伪造学习计划结果
- 伪造代码运行结果
- 用假数据冒充真实接口返回

### 5.3 不随意改接口

前端重构默认不修改接口契约。

不要随意修改：

- API 路径
- 请求方法
- 请求参数
- 响应字段解析
- Axios 拦截器
- Token Header
- 错误处理逻辑

如果发现接口字段确实不匹配，先输出问题说明，不要直接大改。

---

## 6. 禁止事项

以下行为禁止执行：

1. 禁止大面积删除已有业务代码。
2. 禁止为了 UI 效果绕过真实接口。
3. 禁止把真实接口替换成 Mock 数据。
4. 禁止破坏现有 Axios 封装。
5. 禁止破坏 Token、用户信息、权限状态的 Pinia 存储逻辑。
6. 禁止破坏 Vue Router 路由守卫。
7. 禁止随意改接口路径、请求参数、响应解析逻辑。
8. 禁止修改后端仓库代码。
9. 禁止一次性引入大量 UI 库。
10. 禁止第一轮全量替换 Element Plus。
11. 禁止为了消除 TypeScript 报错使用大量 `any`、`// @ts-ignore` 或无意义类型断言。
12. 禁止提交不能通过 `npm run build` 的代码。
13. 禁止只做首页大屏，忽略真实业务流程。
14. 禁止新增无法访问、无法跳转、无数据来源的空页面。
15. 禁止把用户端和管理端菜单权限混在一起。

---

## 7. UI 重构方向

目标风格：

- 深色 AI SaaS
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

不要做成：

- 普通若依后台
- 传统白底管理系统
- 花哨官网
- 纯静态 Landing Page
- 与业务无关的大屏炫技页面

---

## 8. 技术使用策略

### 8.1 Element Plus

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

不要第一轮全量替换 Element Plus。

需要重点处理：

- 表格暗色可读性
- 表单暗色可读性
- Dialog / Drawer 暗色背景
- Pagination 暗色样式
- Menu 暗色样式

### 8.2 Tailwind CSS

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

### 8.3 图标

统一使用：

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

## 9. 推荐目录结构

在不破坏现有结构的前提下，可以逐步整理：

```bash
src/
  layouts/
    UserLayout.vue
    AdminLayout.vue
    components/
      AppSidebar.vue
      AppHeader.vue
      AppTabs.vue
      UserSidebar.vue
      AdminSidebar.vue

  components/
    common/
      AppCard.vue
      AppSection.vue
      AppEmpty.vue
      AppStatusBadge.vue
      AppMetricCard.vue
      AppPageHeader.vue
    ai/
      AiChatPanel.vue
      AiScoreCard.vue
      AiQuestionCard.vue
      AiFollowUpList.vue
    interview/
      InterviewQuestionPanel.vue
      InterviewAnswerEditor.vue
      InterviewRoomAside.vue
      InterviewProgress.vue
    resume/
      ResumeCard.vue
      ResumeOptimizeCompare.vue

  styles/
    index.scss
    theme.scss
    element-dark.scss
    tailwind.css

  views/
    user/
    admin/
```

要求：

- 如果当前项目已有类似目录，优先复用现有目录。
- 不要为了目录整洁大规模移动文件。
- 每次移动文件必须同步修复 import、路由、组件引用。
- 页面重构优先保持业务逻辑不变，只替换布局和视觉层。

---

## 10. 每轮执行流程

每一轮任务必须按以下流程执行。

### 10.1 开始前检查

执行：

```bash
git branch --show-current
git status --short
npm run build
```

要求：

- 当前分支应为 `dev-ui`
- 工作区应清晰，或者明确说明已有改动
- 如果 build 已经失败，必须先说明失败原因，不得继续叠加大改动

### 10.2 阅读上下文

每轮开始前必须阅读：

```bash
AGENTS.md
docs/CodeCoachAI_前端重构PRD_深色AI工作台版.md
```

不要凭空重构。

### 10.3 小步修改

每轮只做一个明确主题。

推荐轮次：

```text
1. 工程基础
2. 布局重构
3. 用户端工作台
4. AI 面试核心链路
5. 简历中心
6. 管理后台
7. V2 接入与回归测试
```

不要一次性修改几十个页面。

### 10.4 修改后检查

每轮结束必须执行：

```bash
npm run build
```

如果项目有 lint / test 脚本，也执行：

```bash
npm run lint
npm run test
```

如果没有对应脚本，不要虚构执行结果。

---

## 11. 各阶段验收标准

### 第 1 步：工程基础

验收标准：

- Tailwind 生效
- 全局深色背景生效
- Element Plus 页面不出现明显白块
- 原有页面可正常访问
- `npm run build` 通过

### 第 2 步：布局重构

验收标准：

- 用户端菜单正常
- 管理端菜单正常
- 刷新后路由状态正常
- 权限不丢失
- 退出登录正常
- 左侧菜单可收缩
- `npm run build` 通过

### 第 3 步：用户端工作台

验收标准：

- 工作台页面能打开
- 核心入口可点击
- 真实路由跳转正常
- 数据加载失败有空状态
- 不出现无效按钮
- `npm run build` 通过

### 第 4 步：AI 面试核心链路

验收标准：

- 创建面试正常
- 面试房间能进入
- 当前题目能显示
- 可以提交答案
- 可以查看 AI 评分
- 可以查看 AI 追问
- 可以结束面试
- 可以查看报告
- `npm run build` 通过

### 第 5 步：简历中心

验收标准：

- 简历列表正常
- 新增正常
- 编辑正常
- 删除正常
- 查看正常
- 操作后列表刷新正常
- V2 入口未接入时必须标注“待接入”
- `npm run build` 通过

### 第 6 步：管理后台

验收标准：

- 管理端首页可访问
- 管理菜单可跳转
- 题库管理正常
- Prompt 管理正常
- AI 调用日志正常
- 系统配置正常
- 表格、分页、弹窗、抽屉在深色主题下可读
- `npm run build` 通过

### 第 7 步：V2 接入与回归测试

验收标准：

- 登录 / 退出正常
- 用户端路由正常
- 管理端路由正常
- 权限守卫正常
- 题库链路正常
- 简历链路正常
- 面试链路正常
- 报告链路正常
- 管理端 CRUD 正常
- `npm run build` 通过

---

## 12. V2 预留规则

允许预留：

- 简历上传入口
- AI 简历优化入口
- 行业场景面试入口
- 学习计划入口
- 代码练习入口
- SSE 流式输出组件占位

禁止行为：

- 伪造解析成功结果
- 写死假优化评分
- 写死假学习计划
- 向后端传不存在字段导致接口失败
- 接入 Monaco 但没有真实运行 / 判题能力
- 绕过真实接口展示伪流式结果

占位提示示例：

```text
该能力将在后续版本接入，目前仅展示入口。
```

---

## 13. 路由与权限约束

不得破坏现有路由守卫。

必须保证：

- 未登录访问受保护页面时跳转登录页
- 已登录用户可进入用户端页面
- 管理员可进入管理端页面
- 普通用户不能访问管理端页面
- Token 失效后能回到登录页

用户端菜单重点：

- 工作台
- 题库
- 错题
- 收藏
- 简历中心
- 创建面试
- 面试记录 / 报告
- 学习计划

管理端菜单重点：

- 管理后台首页
- 题目管理
- 分类管理
- 标签管理
- Prompt 管理
- AI 调用日志
- 系统配置

---

## 14. 样式规范

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

- 表格文字清晰
- 表单 label 清晰
- 输入框文字清晰
- placeholder 可读
- 按钮 hover 状态可见
- 弹窗内容可读
- Markdown 内容可读
- 代码块可读

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

## 15. 输出变更报告格式

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

- npm run build：通过 / 失败
- npm run lint：通过 / 失败 / 无脚本
- 登录流程：未测试 / 已测试
- 用户端菜单：未测试 / 已测试
- 管理端菜单：未测试 / 已测试
- 核心业务流程：未测试 / 已测试

## 风险点

- xxx

## 下一轮建议

- xxx
```

不要只输出“已完成”。

---

## 16. Git 提交建议

每轮任务完成后建议提交一次。

提交信息示例：

```bash
git add .
git commit -m "docs: update frontend refactor agents guide"
git commit -m "feat: add dark theme foundation"
git commit -m "feat: refactor user and admin layouts"
git commit -m "feat: redesign user dashboard"
git commit -m "feat: redesign interview workspace"
git commit -m "feat: redesign interview report page"
git commit -m "feat: redesign resume center"
git commit -m "feat: redesign admin dashboard"
git commit -m "fix: improve element plus dark mode compatibility"
```

不要把多个大主题混在一个 commit 中。

---

## 17. 出现问题时的处理规则

### 17.1 build 失败

必须先修复 build。

不得在 build 失败状态下继续叠加新功能。

### 17.2 接口异常

先确认：

- 请求路径是否变化
- Token 是否携带
- 参数是否正确
- 后端是否启动
- 是否跨域
- 是否权限不足

不要直接改接口封装。

### 17.3 权限异常

先检查：

- Pinia 用户状态
- Token 持久化
- 路由 meta
- 菜单过滤逻辑
- 管理员角色判断

不要简单删除权限判断。

### 17.4 样式污染

如果 Tailwind 或全局 SCSS 影响 Element Plus：

- 优先收敛全局选择器
- 避免滥用 `*`
- 避免全局覆盖 `button`、`input`、`table`
- 将 Element Plus 暗色兼容样式集中放入 `element-dark.scss`

---

## 18. 当前任务

当前只执行：

```text
第 1 步：工程基础
```

执行顺序：

```bash
git branch --show-current
git status --short
npm run build
```

然后再做：

```text
1. 接入 Tailwind CSS
2. 建立全局深色主题
3. 建立 Element Plus 暗色兼容
4. 保证 npm run build 通过
```

完成后再进入：

```text
第 2 步：布局重构
```