# CodeCoachAI Vue 前端第一阶段报告

## 1. 本次任务目标

本次完成 CodeCoachAI-vue 前端第一阶段：Vue3 工程骨架、登录注册链路、Axios 请求封装、Pinia 用户状态、路由权限、用户端/管理端基础布局、核心页面与业务占位页。

## 2. 实际创建或修改的目录

- `public`
- `src/api`
- `src/components/common`
- `src/components/layout`
- `src/config`
- `src/constants`
- `src/layouts`
- `src/router`
- `src/stores`
- `src/styles`
- `src/types`
- `src/utils`
- `src/views/auth`
- `src/views/user`
- `src/views/question`
- `src/views/resume`
- `src/views/interview`
- `src/views/admin`
- `src/views/error`

## 3. 新增的关键文件

- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- `.env.development`
- `.env.production`
- `src/main.ts`
- `src/App.vue`
- `src/utils/request.ts`
- `src/utils/token.ts`
- `src/stores/auth.ts`
- `src/router/routes.ts`
- `src/router/guards.ts`
- `src/layouts/UserLayout.vue`
- `src/layouts/AdminLayout.vue`

## 4. 已实现的页面

- 登录页：`/login`
- 注册页：`/register`
- 用户工作台：`/dashboard`
- 当前用户信息页：`/profile`
- 修改密码页：`/password`
- 管理首页：`/admin`
- 管理端用户列表页：`/admin/users`
- 管理端角色列表页：`/admin/roles`
- 403 页面：`/403`
- 404 页面：`/404`

## 5. 已实现的 API 封装

- `src/api/auth.ts`
  - `POST /auth/login`
  - `POST /auth/register`
  - `POST /auth/logout`
  - `GET /auth/current-user`
  - `POST /auth/refresh-token`，仅封装预留
- `src/api/user.ts`
  - `GET /users/profile`
  - `PUT /users/profile`
  - `PUT /users/password`
  - `GET /users/overview`
  - `GET /admin/users`
  - `PUT /admin/users/{id}/status`
  - `GET /admin/roles`
- `src/api/question.ts`、`src/api/resume.ts`、`src/api/interview.ts`、`src/api/aiAdmin.ts`、`src/api/system.ts` 已做后续阶段封装预留，当前占位页面不调用。

## 6. 已实现的路由清单

- 公共路由：`/login`、`/register`、`/403`、`/404`
- 用户端路由：`/`、`/dashboard`、`/profile`、`/password`、`/questions`、`/questions/:id`、`/questions/wrong-records`、`/questions/favorites`、`/resumes`、`/resumes/create`、`/resumes/:id/edit`、`/interviews/create`、`/interviews/room/:id`、`/interviews/history`、`/interviews/:id/report`
- 管理端路由：`/admin`、`/admin/users`、`/admin/roles`、`/admin/questions`、`/admin/question-categories`、`/admin/question-tags`、`/admin/question-groups`、`/admin/ai/prompts`、`/admin/ai/logs`、`/admin/system/configs`

## 7. 已实现的 Pinia store

- `src/stores/auth.ts`
  - state：`token`、`userInfo`、`roles`
  - getters：`isLoggedIn`、`isAdmin`、`hasRole(roleCode)`
  - actions：`login`、`register`、`logout`、`fetchCurrentUser`、`setToken`、`clearAuth`
- `src/stores/user.ts`
  - 预留个人资料状态和资料更新方法。

## 8. 已实现的路由守卫逻辑

- 未登录访问受保护页面跳转 `/login`，并保留 `redirect`。
- 已登录访问 `/login` 或 `/register` 跳转 `/dashboard`。
- 没有 `userInfo` 但存在 token 时，尝试调用 `/auth/current-user` 恢复登录态。
- `/admin/**` 需要 `ADMIN` 角色，否则进入 `/403`。
- 未匹配路由进入 `/404`。

## 9. 只是占位的页面

- 用户端：题库、题目详情、错题本、收藏题目、简历列表、简历编辑、创建面试、面试房间、面试历史、面试报告。
- 管理端：题目管理、分类管理、标签管理、问题组管理、Prompt 模板、AI 调用日志、系统配置。

这些页面只展示标题和阶段说明，不调用未完成业务接口。

## 10. 已真实对接的接口

- 登录、注册、退出、当前用户：`/auth/**`
- 用户资料、修改资料、修改密码、用户概览：`/users/**`
- 管理端用户列表、用户状态修改、角色列表：`/admin/users`、`/admin/roles`

## 11. 等待后端实现或联调的接口

- `/users/overview` 属 P2 聚合接口，前端已做失败兜底。
- `/admin/users`、`/admin/users/{id}/status`、`/admin/roles` 属 P2 管理接口，页面和请求结构已就绪。
- 题库、简历、面试、AI 管理、系统配置接口等待后续阶段页面接入。

## 12. 边界确认

- 已确认没有调用 `/inner/**`。
- 已确认没有新增用户端 `/ai/**` 路由。
- 管理端只保留允许的 `/admin/ai/**` 页面和预留 API 封装。
- 所有请求统一经过 `src/utils/request.ts`，baseURL 读取 `VITE_API_BASE_URL`。
- `.env.development` 使用后端现有 gateway 端口：`http://localhost:8080`。

## 13. 构建结果

- 已执行 `npm install`。
- 已执行 `npm run build`。
- 构建通过。
- Vite 输出 Element Plus 相关 chunk 和 VueUse 注释提示，不影响构建结果。

## 14. 当前 TODO

- 与后端确认 `/auth/login` 响应中 `userInfo.id` 和提示词中的 `userId` 是否长期兼容；当前前端同时兼容 `id` 与 `userId`。
- 与后端联调确认修改密码后是否注销当前 token。
- `/users/overview` 后端未就绪时，当前工作台保留默认 0 数据。
- 后续如需要减小首屏依赖体积，可按需引入 Element Plus 组件。

## 15. 下一阶段建议

- 先联调 `/auth/register`、`/auth/login`、`/auth/current-user`。
- 再联调 `/users/profile`、`/users/password`。
- 管理端随后联调 `/admin/users`、`/admin/roles`。
- 第二阶段再逐步接入题库、简历、面试核心页面，不要跳过后端边界直接访问 `/inner/**` 或用户端 `/ai/**`。
