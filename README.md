# CodeCoachAI Vue 前端

CodeCoachAI 前端承载用户侧求职训练、管理后台 AI 工程化能力和作品集演示入口。当前项目基于 Vue 3、Vite、Element Plus、Pinia、Vue Router 和 TypeScript 构建，开发分支为 `dev-260905`。

当前口径（2026-09-07 产品战略拍板后）：前端围绕 P0 核心闭环（JD 匹配 → 定向训练 → 模拟面试 → 复盘 → 下一步行动）收敛，用户侧主导航为六项（今日/求职/资料/面试/训练/准备度）；知识库、长期记忆、求职实验台等历史入口保留代码与路由，但已从主导航移除，按 MVP/预览口径说明。

## 项目定位

前端面向两类演示视角：

- 用户侧：目标岗位、简历/JD 匹配、项目证据、模拟面试、能力画像、求职实验、Agent 今日任务。
- 管理侧：Prompt 回归、AI 服务记录、Agent 运行、异步任务、指标与文件治理等工程化能力。

核心闭环：

```text
目标岗位
  -> 简历/JD 匹配
  -> 项目证据补强
  -> 面试训练和报告
  -> 能力画像
  -> 求职实验复盘
  -> AI 建议证据链
  -> Agent 今日任务
  -> 个人知识库与长期记忆
```

## 当前能力边界

| 能力 | 前端口径 |
| --- | --- |
| 六项主导航（今日/求职/资料/面试/训练/准备度） | P0 主线，已收口；JD 匹配、推荐训练、错题间隔复习、学习计划已接入主链路 |
| Agent 今日任务 | 今日导航组内入口 `/agent/today`，按 MVP 主路径说明 |
| `/portfolio-demo` 作品集演示 | 已有入口，作为统一演示入口 |
| `/applications` 投递管理 | 求职导航组正式入口；投递包并入求职详情 |
| `/knowledge` 个人知识库 | 已从主导航移除（路由保留 / previewOnly），按私域知识方向说明 |
| `/agent/memory` 长期记忆 | 已从主导航移除（路由保留 / previewOnly），按记忆治理方向说明 |
| `/agent/reviews`、`/growth/*`、求职实验台、排行榜、协作练习 | 已从主导航移除（路由保留），不作为验收入口 |
| OfferLab 社区、企业入驻、支付、自动投递 | 非 CodeCoachAI 前端目标，不接入、不展示为已完成能力 |

## 第三次拓展演示重点

- 作品集演示：统一从 `/portfolio-demo` 进入，讲清 5 分钟快讲和 10 分钟深讲路线。
- AI 建议证据链：在建议类页面展示证据来源、置信度、样本不足提示、反馈状态和运行追踪。
- 求职实验台：说明投递、面试、简历版本和能力画像如何进入复盘；样本不足时不输出强结论。
- 个人知识库：说明学习资料、项目笔记、错题总结和面试复盘如何成为私域训练资产。
- 长期记忆：说明记忆来源、置信度、启停、删除和推荐影响边界。
- 演示数据：演示数据需要带 `demoFlag` 或等价标识，不污染真实统计，不触发真实通知或外部调用。

## 关键页面索引

用户侧主导航已按 2026-09-07 P0 决策收敛为六项（见 `src/config/userNavigation.ts` 的 `PRIMARY_NAVIGATION_KEYS`）：今日 / 求职 / 资料 / 面试 / 训练 / 准备度。

| 场景 | 入口 | 说明 |
| --- | --- | --- |
| 今日总览 | `/dashboard` | 今日任务、完成记录和下一步行动 |
| 岗位目标 / JD 匹配 | `/job-targets`、`/resume-match` | 求职导航组 |
| 投递管理 | `/applications` | 投递阶段、跟进和结果 |
| 简历工作台 / 简历管理 | `/resumes/workbench`、`/resumes/manage` | 资料导航组 |
| 我的项目（原项目证据库） | `/project-evidence` | 项目事实与可复用能力证据 |
| 开始面试 / 面试记录 | `/interviews/create`、`/interviews/history` | 面试导航组 |
| 推荐训练 / 错题复盘 / 学习计划 | `/questions/recommendations`、`/questions/wrong-records`、`/study-plans` | 训练导航组；错题 1/3/7/15 天间隔复习 |
| 能力图谱 / 能力画像 / 薄弱点分析 | `/ability-map`、`/skill-profile`、`/weakness-analysis` | 准备度导航组 |
| 作品集演示 | `/portfolio-demo` | 统一演示入口 |
| 管理后台（Prompt 回归、AI 日志、Trace Cockpit、文件治理） | `/admin/**` | 管理侧治理能力 |

已从主导航移除但路由保留的入口（按 MVP/预览口径说明，不写成正式能力）：个人知识库 `/knowledge`、长期记忆 `/agent/memory`、求职实验台、成长档案 `/growth/*`、AI 任务中心、排行榜、协作练习等。

## 技术栈

| 类型 | 技术 |
| --- | --- |
| 应用框架 | Vue 3、TypeScript、Vite |
| UI 与交互 | Element Plus、lucide-vue-next、ECharts |
| 状态与路由 | Pinia、Vue Router |
| 请求与渲染 | Axios、markdown-it |
| 工程检查 | Vitest、vue-tsc、乱码检查、UI 文案检查、路由/质量门禁脚本 |

## 目录约定

- `src/`: 前端源码，页面、路由、API、类型和公共组件都从这里进入。
- `docs/`: 项目文档、联调说明、验收报告和截图资产。
- `docs/reports/frontend/`: 历史前端 Review、阶段报告和检查清单。
- `docs/assets/smoke/`: 浏览器 smoke 截图等可复查图片资产。
- `MD/`: 仅保留旧路径兼容入口，新文档请放到 `docs/`。

## 本地运行说明

依赖安装命令：

```bash
npm install
```

以下命令会启动服务或执行构建/验证。工作纪律：本地只做代码开发与静态检查；启动服务、接口调用与页面级验收一律在测试环境部署后执行：

```text
npm run dev
npm run preview
npm run build
npm run type-check
npm run test:unit
npm run test:unit:run
npm run check:quality
npm run check:quality:workspace
```

Vite 开发服务默认绑定 `127.0.0.1`；只有在明确需要局域网访问时，才通过 `VITE_DEV_SERVER_HOST=0.0.0.0` 显式覆盖。

V4 预览入口采用总开关加子开关：`VITE_ENABLE_V4_PREVIEW=true` 只开放通用 V4 预览入口；`/agent/reviews`、`/growth/*`、`/agent/memory` 还需要 `VITE_ENABLE_V4_GROWTH=true`；`/knowledge` 还需要 `VITE_ENABLE_V4_KNOWLEDGE=true`。这两个前端子开关需要和后端 `codecoachai.v4.features.growth-enabled`、`codecoachai.v4.features.knowledge-enabled` 保持一致。

本地只允许阅读文件、搜索文本、检查 Markdown 结构、编辑文档和执行静态检查；真实页面、接口、构建和测试验收在测试环境（默认 `http://103.236.97.252:30080/`，可用 `node scripts/acceptance-check.mjs` 跑约 20 项脚本化验收）部署后统一执行。

## 质量门禁与发布后验收

发布后建议人工复核：

1. `/portfolio-demo` 能进入作品集演示入口。
2. 5 分钟路线和 10 分钟路线没有明显断链。
3. 关键页面没有乱码、遮挡、空白和不可理解的开发文案。
4. 空状态、错误态、加载态和演示数据标识清晰。
5. AI 建议展示证据来源、置信度、样本不足提示和用户反馈状态。
6. 求职实验台、个人知识库、长期记忆的页面状态和 README 口径一致。
7. 管理后台 Prompt 回归、AI 日志、Agent 运行和文件治理入口可按发布环境配置验收。

## 前端联调边界

- DeepSeek、OSS、搜索等外部链路以真实运行时配置为准，仓库不保存生产密钥。
- `/applications` 是投递跟进闭环入口，不等同于完整 V4-D 求职实验验收完成。
- 个人知识库和长期记忆当前按 MVP/previewOnly 或后续阶段能力表述，不能在简历或 README 中写成完整成熟平台。
- 不新增 OfferLab 社区、真实企业入驻、支付、自动投递或跨用户知识共享能力。
