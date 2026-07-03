# CodeCoachAI Vue 前端

CodeCoachAI 前端仓库，承载用户侧、管理后台和 V4/V4-A 联动页面。当前项目基于 Vue 3、Vite、Element Plus、Pinia 和 TypeScript 构建。

## 当前联调重点

- 管理后台 Prompt 回归：`/admin/ai/prompt-regression`
- Agent 任务与运行详情：`/agent/tasks`、`/agent/runs/:id`
- 个人知识库：`/knowledge`（previewOnly，V4-E 预留）
- 投递管理：`/applications`（已作为 Agent 投递跟进闭环入口开放；完整 V4-D 能力另行验收）
- 简历中心：`/resumes`
- 文件治理与下载：管理后台文件页
- AI 与 V4 相关页面：面试、学习计划已接入；成长画像、长期记忆、知识库仍按 previewOnly 预留

## 当前阶段边界

- V4-A 主线以 JobCoachAgent 今日计划、今日任务、任务中心、生成详情和任务完成/跳过闭环为准。
- `/applications` 当前服务于 `APPLICATION_FOLLOW_UP` 任务深链和求职进度记录，不等同于完整 V4-D 验收完成。
- `/agent/reviews`、`/growth/*`、`/agent/memory`、`/knowledge` 当前仍是 previewOnly/后续阶段能力，不应作为 V4-A 必验收入口。

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 目录约定

- `src/`: 前端源码，页面、路由、API、类型和公共组件都从这里进入。
- `docs/`: 项目文档、联调说明、验收报告和截图资产。
- `docs/reports/frontend/`: 历史前端 Review、阶段报告和检查清单。
- `docs/assets/smoke/`: 浏览器 smoke 截图等可复查图片资产。
- `MD/`: 仅保留旧路径兼容入口，新文档请放到 `docs/`。

## 联调说明

前端已按当前后端链路接入以下关键能力：

- Prompt 回归页的列表、创建、运行与结果查看
- 简历上传、解析状态查询与文件下载
- 知识库检索（previewOnly 页面预留）
- 投递管理与 V4 页面导航（投递跟进闭环已开放，完整 V4-D 按后续阶段验收）

上线前建议再复核：

1. 登录与鉴权跳转是否正常
2. 管理后台关键入口是否可用
3. DeepSeek、OSS、搜索等外部链路是否都能在真实配置下跑通
4. 构建结果是否通过
