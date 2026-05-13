# CodeCoachAI V1 全页面巡检问题修复报告

## 1. 本次修复范围
本轮仅修复 V1 巡检中与字段映射、列表展示、下拉标签、详情页变量访问、编辑回显相关的 P1 问题，不新增功能、不修改后端、不调整后端接口路径。

修复目标页面：
- 用户端：`/questions`、`/questions/:id`
- 管理端：`/admin`、`/admin/questions`、`/admin/question-categories`、`/admin/question-tags`、`/admin/question-groups`、`/admin/ai/prompts`

## 2. 修复前问题列表（P1）
1. 分类管理字段空白（名称/编码/父级/描述）
2. 标签管理字段空白（名称/编码/描述）
3. 问题组管理字段空白，分类列 ID 直显
4. Prompt 模板列表字段空白（名称、模板编码、版本、变量说明、更新时间）
5. 题目管理标签筛选下拉显示 ID
6. 题目管理标签列显示异常/不可读
7. 题目详情 `normalizedTags` 未定义 warning
8. 题库筛选下拉 `ElOption value got Undefined`
9. 管理端部分编辑弹窗回显异常（字段未对齐）
10. 管理首页统计字段映射偏差（多字段为 0 或缺失）

## 3. 修复内容与文件清单

### API 层字段归一化（优先）
- `src/api/questionCategory.ts`
  - 兼容 `name/categoryName`、`code/categoryCode`、`description/remark`、时间字段
  - create/update payload 双字段兼容
- `src/api/questionTag.ts`
  - 兼容 `name/tagName`、`code/tagCode`、`description/remark`
- `src/api/questionGroup.ts`
  - 兼容 `name/groupName/canonicalTitle`、`knowledgePoint/mainKnowledgePoint`
- `src/api/question.ts`
  - 统一用户端/管理端题目 tags 归一化
  - 兼容 tags 为字符串数组、对象数组
  - `groupTitle/groupName` 兼容
- `src/api/aiAdmin.ts`
  - Prompt 模板字段归一化：`scene/name/content` -> 前端字段
  - `templateCode/promptType` 互相兜底
- `src/api/system.ts`
  - 管理首页统计字段归一化，避免 `undefined/NaN`

### 类型兼容补充
- `src/types/question.ts`
  - 增补 category/tag/group 多命名字段兼容
  - 管理题目 tags 类型兼容
- `src/types/ai.ts`
  - Prompt 模板多命名字段兼容

### 页面展示与回显修复
- `src/components/question/QuestionFilters.vue`
  - 过滤无效分类/标签 option，避免 undefined value
- `src/views/question/QuestionListView.vue`
  - 筛选项来源仅依赖 `/questions` 返回数据
  - 标签筛选选项去重并过滤无效 id/name
- `src/views/question/QuestionDetailView.vue`
  - 用 `displayTags` 统一渲染，移除 `normalizedTags` 未定义路径
- `src/views/admin/QuestionManageView.vue`
  - 标签筛选 label 显示标签名称
  - 标签列可读展示
  - 编辑弹窗 tagIds 回显支持字符串标签反查字典 ID
- `src/views/admin/QuestionCategoryManageView.vue`
  - 列表编码/描述为空时显示 `-`
  - 编辑回显字段对齐
- `src/views/admin/QuestionTagManageView.vue`
  - 列表编码/描述为空时显示 `-`
  - 编辑回显字段对齐
- `src/views/admin/QuestionGroupManageView.vue`
  - 问题组名称/主知识点字段映射
  - 分类列优先显示分类名
- `src/views/admin/PromptTemplateView.vue`
  - 版本、变量说明、更新时间展示兜底
  - 编辑弹窗字段回显对齐
- `src/views/admin/AdminDashboardView.vue`
  - 统计卡片使用归一化结果，避免 NaN/undefined

## 4. 复测结果（修复后）
复测方式：Playwright 驱动本机 Chrome（headless）+ Gateway 真实接口。

### 管理端复测
页面：
- `/admin`
- `/admin/questions`
- `/admin/question-categories`
- `/admin/question-tags`
- `/admin/question-groups`
- `/admin/ai/prompts`

结果：
- 页面均可打开，非空白
- 字段不再出现大面积空白；后端未提供字段位置显示 `-`（如分类编码、标签描述）
- 题目管理标签筛选显示标签名称
- 题目管理标签列可读
- 问题组分类列显示分类名称，不再仅 ID 直显
- Prompt 模板核心字段可读（名称、场景/类型、版本兜底、变量说明兜底、更新时间兜底）

### 用户端复测
页面：
- `/questions`
- `/questions/100000`

结果：
- `/questions`：未再出现 `ElOption value got Undefined`
- `/questions/:id`：`normalizedTags` 未定义 warning 消失
- 页面文本中未出现 `undefined/null/NaN`

### Console / Network
- 仍有 P2：Element Plus `el-radio label act as value` 未来版本 warning（已记录，不阻塞本轮）
- 观测到 1 条 favicon 404（静态资源告警，不影响业务）

## 5. 业务边界核查

### 静态扫描命令
```bash
rg -n '/inner|inner/|questions/answer|questions/wrongs|/ai/interview/question|/ai/interview/evaluate|/ai/interview/follow-up|/ai/interview/report' src
rg -n '/admin/question-categories|/admin/question-tags|/admin/question-groups' src
rg -n '/ai/' src
```

### 结论
- 旧接口：未发现
- `/inner/**`：未发现
- 用户端 `/ai/**`：未发现
- `/ai/` 命中仅在 `/admin/ai/**`
- 用户端 `/questions` 网络复测：仅调用 `/questions`、`/questions/{id}`，未调用 `/admin/**`

## 6. 构建验证
已执行：`npm run build`

结果：通过。
- 无 TypeScript 错误
- 非阻塞 warning：Rollup 注释 warning、chunk size warning

## 7. 当前剩余问题

### P0
- 无

### P1
- 无阻塞项
- 管理首页统计值偏低主要由后端统计接口当前返回决定（接口返回多字段为 0），前端已做映射与兜底，不再显示 `undefined/NaN`

### P2（保留）
1. Element Plus radio deprecation warning
2. favicon 404（静态资源提示）
3. 终端中文乱码（显示环境问题，不是页面功能问题）

## 8. 是否建议进入 V1 演示版整理
建议进入。当前 P1 核心字段映射与展示问题已完成修复，主流程与管理端展示已可演示。

## 9. 后端联调待确认项
1. 若希望分类/标签管理页展示更完整信息（编码、描述、父级名称），需后端接口持续补充对应字段
2. 管理首页统计卡片数值准确性，需后端聚合逻辑进一步确认
