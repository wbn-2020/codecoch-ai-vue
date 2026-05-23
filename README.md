# CodeCoachAI Vue 前端

CodeCoachAI 前端仓库，承载用户侧、管理后台和 V4/V4-A 联动页面。当前项目基于 Vue 3、Vite、Element Plus、Pinia 和 TypeScript 构建。

## 当前联调重点

- 管理后台 Prompt 回归：`/admin/ai/prompt-regression`
- Agent 任务与运行详情：`/agent/tasks`、`/agent/runs/:id`
- 个人知识库：`/knowledge`
- 投递管理：`/applications`
- 简历中心：`/resumes`
- 文件治理与下载：管理后台文件页
- AI 与 V4 相关页面：成长画像、面试、学习计划、知识库等

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 联调说明

前端已按当前后端链路接入以下关键能力：

- Prompt 回归页的列表、创建、运行与结果查看
- 简历上传、解析状态查询与文件下载
- 知识库检索
- 投递管理与 V4 页面导航

上线前建议再复核：

1. 登录与鉴权跳转是否正常
2. 管理后台关键入口是否可用
3. DeepSeek、OSS、搜索等外部链路是否都能在真实配置下跑通
4. 构建结果是否通过
