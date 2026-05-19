# CodeCoachAI - AI Java 面试训练平台（前端）

> 基于 Vue 3 + TypeScript + Element Plus 的全栈 AI 面试训练系统前端，采用暗色 IDE 风格设计，支持 SSE 实时交互、Token 自动续期、角色权限控制等企业级特性。

## 技术栈

| 层级 | 技术选型 |
|------|----------|
| 框架 | Vue 3.5 + Composition API + `<script setup>` |
| 语言 | TypeScript 5.6 |
| 构建 | Vite 6 |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 |
| UI 组件库 | Element Plus 2.9 |
| 样式 | Tailwind CSS 4 + SCSS + CSS Variables |
| 图标 | Lucide Vue Next |
| 图表 | ECharts 5 |
| HTTP | Axios（Token 自动续期 + Promise 锁队列） |
| SSE | 原生 Fetch + ReadableStream（自研 streamSse 工具） |
| 工具库 | VueUse、markdown-it |

## 项目亮点

### 架构设计
- **Token 自动续期**：401 触发时 Promise 锁队列，并发请求排队等待 refresh 后统一重放，避免多次刷新
- **SSE 实时交互**：面试答题评分、简历 AI 优化、题目生成均走 SSE 流式接口，支持断线回退同步接口
- **v-permission 指令**：声明式角色权限控制，不满足时 DOM 移除
- **useRequestCache**：全局 Map 缓存 + TTL 过期策略，退出登录自动清除
- **useSseState**：SSE 状态局部化 composable，避免全局 ElMessage 干扰

### 视觉体系
- **暗色 IDE 风格**：全局 CSS Variables 主题系统（`--cc-*` / `--app-*`），Tailwind v4 `@theme` 集成
- **cc-glass 毛玻璃面板**：`backdrop-filter: blur` + 半透明边框，统一容器风格
- **cc-badge 四态徽章**：idle / thinking / streaming / success，带脉冲动画
- **Element Plus 深度暗色适配**：40+ 组件覆盖（Table、Tabs、Dialog、Drawer、Timeline、Collapse 等）

### 业务功能
- **AI 面试作战台**：三栏 IDE 布局（进度 / 对话 / 实时评估），SSE 四态徽章 + 答题计时器
- **用户工作台**：6 指标卡 + 快捷入口 + 待复习错题 + 学习计划进度
- **简历中心**：上传解析工作流（轮询）+ AI 优化 SSE + 优化对比 Diff（红绿高亮）
- **管理后台**：ECharts 趋势图 + 待处理事项 + 系统状态 + 题目/Prompt/日志 CRUD
- **多标签页**：双作用域 TagsView（用户端/管理端独立），右键菜单关闭操作
- **找回密码**：邮箱发送重置链接 → token 验证 → 新密码设置

## 目录结构

```
src/
├── api/                  # API 接口层（按模块拆分）
├── assets/               # 静态资源
├── components/
│   ├── common/           # 通用组件（StatusTag、MarkdownPreview）
│   └── layout/           # 布局组件（Sidebar、TagsView、Breadcrumb）
├── composables/          # 组合式函数
│   ├── useRequestCache.ts
│   └── useSseState.ts
├── config/               # 应用配置
├── constants/            # 常量（HTTP 状态码、枚举、存储 key）
├── directives/           # 自定义指令（v-permission）
├── layouts/              # 页面布局（UserLayout、AdminLayout）
├── router/               # 路由配置 + 守卫
├── stores/               # Pinia 状态管理
│   ├── auth.ts           # 认证（登录/登出/角色）
│   ├── app.ts            # 应用状态（侧栏收缩）
│   └── tagsView.ts       # 多标签页（双作用域）
├── styles/
│   ├── tailwind.css      # Tailwind v4 + @theme 变量映射
│   ├── index.scss        # 全局样式 + 原子类（cc-glass/cc-badge/cc-terminal）
│   └── element-dark.scss # Element Plus 暗色覆盖
├── types/                # TypeScript 类型定义
├── utils/
│   ├── request.ts        # Axios 封装（Token 续期 + 锁队列）
│   ├── sse.ts            # SSE 流式工具
│   ├── normalizers/      # 数据归一化层
│   └── ...
└── views/                # 页面视图（按模块组织）
```

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产构建
npm run build

# 预览构建产物
npm run preview
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_API_BASE_URL` | 后端 API 网关地址 | `/api` |
| `VITE_APP_TITLE` | 应用标题 | `CodeCoachAI` |

## 设计决策

### 为什么用 CSS Variables 而不是 Tailwind 主题色？
暗色系统需要运行时动态切换能力（未来支持亮色模式），CSS Variables 可以在不重新编译的情况下切换主题。Tailwind v4 的 `@theme` 块将 CSS Variables 映射为工具类，两者互补。

### 为什么 Token 续期用 Promise 锁而不是 axios retry？
axios-retry 会对每个 401 请求独立重试，导致并发场景下多次 refresh。Promise 锁队列确保只发一次 refresh，其余请求排队等待，是生产环境的标准做法。

### 为什么 SSE 用原生 Fetch 而不是 EventSource？
EventSource 只支持 GET 且无法自定义 Header（无法传 Bearer Token）。原生 Fetch + ReadableStream 支持 POST + 自定义 Header + AbortController 取消。

### 为什么 normalizer 从 API 层抽离？
API 文件只负责"发请求 + 链式 normalize"，归一化逻辑（后端字段兼容、tag 去重）集中在 `utils/normalizers/`，便于单元测试和复用。
