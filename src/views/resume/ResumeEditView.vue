<template>
  <div class="arena arena-resume-studio resume-editor page-shell">
    <AppState
      v-if="isEdit && loading"
      class="resume-editor-state"
      type="loading"
      title="正在加载简历"
      description="正在确认简历归属并加载内容，请稍候。"
    />

    <AppState
      v-else-if="isEdit && detailError"
      class="resume-editor-state"
      type="error"
      title="简历不可用"
      :description="detailError"
    >
      <div class="resume-editor-state__actions">
        <el-button @click="router.push('/resumes')">返回简历实验室</el-button>
        <el-button type="primary" @click="fetchDetail">重试</el-button>
      </div>
    </AppState>

    <template v-else>
    <section class="editor-hero">
      <div>
        <div class="hero-kicker">
          <FilePenLine :size="16" />
          AI 简历实验室
        </div>
        <h1>{{ isEdit ? '打磨 Offer 简历' : '创建可验证简历' }}</h1>
        <p>左侧沉淀真实经历，中间同步生成白纸预览，右侧把完整度、JD 匹配、项目证据和缺口建议放在同一个工作台里。</p>
        <div class="hero-status">
          <span>{{ form.resumeName || '未命名简历' }}</span>
          <span>{{ form.targetPosition || '待补目标岗位' }}</span>
          <span>{{ completion }}% 已填写</span>
        </div>
      </div>
      <div class="hero-actions">
        <el-button @click="router.push('/resumes')">
          <ArrowLeft :size="16" />
          返回简历实验室
        </el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">
          <Save :size="16" />
          保存简历
        </el-button>
      </div>
    </section>

    <div class="workspace-tabs" role="tablist" aria-label="移动端简历工作区">
      <button
        type="button"
        role="tab"
        id="resume-tab-edit"
        aria-controls="resume-panel-edit"
        :aria-selected="mobileWorkspaceTab === 'edit'"
        :tabindex="mobileWorkspaceTab === 'edit' ? 0 : -1"
        :class="{ active: mobileWorkspaceTab === 'edit' }"
        @click="mobileWorkspaceTab = 'edit'"
        @keydown="moveMobileWorkspaceTab($event)"
      >
        编辑
      </button>
      <button
        type="button"
        role="tab"
        id="resume-tab-preview"
        aria-controls="resume-panel-preview"
        :aria-selected="mobileWorkspaceTab === 'preview'"
        :tabindex="mobileWorkspaceTab === 'preview' ? 0 : -1"
        :class="{ active: mobileWorkspaceTab === 'preview' }"
        @click="mobileWorkspaceTab = 'preview'"
        @keydown="moveMobileWorkspaceTab($event)"
      >
        预览
      </button>
      <button
        type="button"
        role="tab"
        id="resume-tab-advice"
        aria-controls="resume-panel-advice"
        :aria-selected="mobileWorkspaceTab === 'advice'"
        :tabindex="mobileWorkspaceTab === 'advice' ? 0 : -1"
        :class="{ active: mobileWorkspaceTab === 'advice' }"
        @click="mobileWorkspaceTab = 'advice'"
        @keydown="moveMobileWorkspaceTab($event)"
      >
        AI 建议
      </button>
    </div>

    <section class="live-feedback-strip">
      <article v-for="item in liveFeedbackItems" :key="item.title" :class="item.tone">
        <span>{{ item.label }}</span>
        <strong>{{ item.title }}</strong>
        <p>{{ item.desc }}</p>
      </article>
    </section>

    <details class="mobile-feedback-details">
      <summary>
        <span>实时检查</span>
        <strong>{{ completion }}% 完整 · {{ projects.length }} 段项目</strong>
      </summary>
      <div>
        <article v-for="item in liveFeedbackItems" :key="`mobile-${item.title}`">
          <span>{{ item.label }}</span>
          <strong>{{ item.title }}</strong>
          <p>{{ item.desc }}</p>
        </article>
      </div>
    </details>

    <div :class="['editor-workspace', `is-mobile-${mobileWorkspaceTab}`]">
      <main
        id="resume-panel-edit"
        class="editor-column editor-main mobile-pane-edit"
        role="tabpanel"
        aria-labelledby="resume-tab-edit"
      >
        <section class="content-card side-panel ai-writing-card">
          <div class="panel-kicker">
            <Sparkles :size="15" />
            AI 写作
          </div>
          <h3>先锁定事实，再让表达更像简历</h3>
          <p>这里不替你编造经历，只把当前缺口转成可执行的写作动作。</p>
          <div class="prompt-list">
            <button
              v-for="prompt in aiWritingPrompts"
              :key="prompt.target"
              type="button"
              class="prompt-card"
              @click="focusSection(prompt.target)"
            >
              <span>{{ prompt.label }}</span>
              <strong>{{ prompt.title }}</strong>
              <small>{{ prompt.desc }}</small>
            </button>
          </div>
        </section>

        <section class="content-card side-panel section-nav-card">
          <div class="panel-kicker">
            <Layers3 :size="15" />
            分区导航
          </div>
          <div class="section-nav">
            <button
              v-for="item in sectionNavItems"
              :key="item.id"
              type="button"
              :class="{ done: item.done }"
              @click="focusSection(item.id)"
            >
              <CheckCircle2 v-if="item.done" :size="15" />
              <Circle v-else :size="15" />
              {{ item.label }}
            </button>
          </div>
        </section>

        <section class="content-card editor-section edit-card" v-loading="loading">
          <div class="section-heading">
            <div class="section-icon">
              <UserRound :size="18" />
            </div>
            <div>
              <h2>结构化编辑</h2>
              <p>先把真实信息写扎实，右侧预览会同步展示当前内容。</p>
            </div>
          </div>

          <el-form ref="formRef" class="resume-form" :model="form" :rules="rules" label-position="top">
            <div id="resume-basic" class="editor-block">
              <div class="block-head">
                <span>基本信息</span>
                <el-tag size="small" :type="form.resumeName && form.realName ? 'success' : 'warning'" effect="plain">
                  {{ form.resumeName && form.realName ? '可识别' : '待补充' }}
                </el-tag>
              </div>
            <div class="form-grid">
              <el-form-item label="简历名称" prop="resumeName">
                <el-input v-model.trim="form.resumeName" placeholder="例如：Java 后端 3 年经验简历" />
              </el-form-item>
              <el-form-item label="真实姓名">
                <el-input v-model.trim="form.realName" placeholder="请输入姓名" />
              </el-form-item>
              <el-form-item label="邮箱">
                <el-input v-model.trim="form.email" placeholder="用于补充联系方式" />
              </el-form-item>
              <el-form-item label="手机号">
                <el-input v-model.trim="form.phone" placeholder="用于补充联系方式" />
              </el-form-item>
            </div>
            </div>

            <div id="resume-target" class="editor-block">
              <div class="block-head">
                <span>求职目标</span>
                <el-tag size="small" :type="form.targetPosition ? 'success' : 'warning'" effect="plain">
                  {{ form.targetPosition ? '已明确' : '待填写' }}
                </el-tag>
            </div>
            <div class="form-grid">
              <el-form-item label="求职方向">
                <el-input v-model.trim="form.targetPosition" placeholder="例如：Java 微服务开发" />
              </el-form-item>
              <el-form-item label="默认简历">
                <div class="switch-line">
                  <el-switch v-model="form.isDefault" :active-value="1" :inactive-value="0" />
                  <span>保存后会更新你的默认简历</span>
                </div>
              </el-form-item>
            </div>
            </div>

            <div id="resume-summary" class="editor-block">
              <div class="block-head">
                <span>个人摘要</span>
                <el-tag size="small" :type="form.summary ? 'success' : 'info'" effect="plain">
                  {{ form.summary ? '已填写' : '可继续补充' }}
                </el-tag>
              </div>
            <el-form-item label="个人摘要">
              <el-input
                v-model="form.summary"
                type="textarea"
                :rows="4"
                placeholder="简要说明工作背景、优势方向、项目类型和求职重点"
              />
            </el-form-item>
            </div>

            <div id="resume-skills" class="editor-block">
              <div class="block-head">
                <span>技能关键词</span>
                <el-tag size="small" :type="skillTags.length ? 'success' : 'warning'" effect="plain">
                  {{ skillTags.length ? `${skillTags.length} 个关键词` : '待填写' }}
                </el-tag>
            </div>
            <el-form-item label="核心技术栈" prop="skills">
              <el-input
                v-model="form.skills"
                type="textarea"
                :rows="4"
                placeholder="Spring Boot、MySQL、Redis、MQ、Spring Cloud、Vue..."
              />
            </el-form-item>
            </div>

            <div id="resume-experience" class="editor-block">
              <div class="block-head">
                <span>经历与教育</span>
                <el-tag size="small" :type="form.workSummary || form.education ? 'success' : 'info'" effect="plain">
                  {{ form.workSummary || form.education ? '已填写' : '可继续补充' }}
                </el-tag>
            </div>
            <el-form-item label="工作经历 / 工作摘要">
              <el-input
                v-model="form.workSummary"
                type="textarea"
                :rows="5"
                placeholder="描述公司类型、负责系统、业务规模、核心职责和结果"
              />
            </el-form-item>
            <el-form-item label="教育经历">
              <el-input
                v-model="form.education"
                type="textarea"
                :rows="3"
                placeholder="学校、专业、学历、时间范围等"
              />
            </el-form-item>
            </div>
          </el-form>

          <div class="form-actions">
            <el-button @click="router.push('/resumes')">取消</el-button>
            <el-button type="primary" :loading="saving" @click="handleSave">保存简历</el-button>
          </div>
        </section>

        <section id="resume-projects" class="content-card editor-section project-section">
          <div class="section-heading project-header">
            <div class="section-heading__left">
              <div class="section-icon">
                <Layers3 :size="18" />
              </div>
              <div>
                <h2>项目经历</h2>
                <p>{{ isEdit ? '把背景、职责、难点和结果写成可证明的经历，后续可沉淀为项目证据。' : '创建简历时可先补项目草稿，保存后会自动挂到这份简历下。' }}</p>
              </div>
            </div>
            <el-button type="primary" @click="openProjectDialog()">
              <Plus :size="16" />
              {{ isEdit ? '新增项目' : '添加项目草稿' }}
            </el-button>
          </div>

          <div class="project-list">
            <div v-if="projects.length === 0" class="project-empty">
              <FolderOpen :size="30" />
              <h3>暂无项目经历</h3>
              <p>{{ isEdit ? '项目经历会帮助面试创建页构建更完整的简历上下文。' : '建议至少补一个能讲清背景、职责、技术难点和结果的项目。' }}</p>
            </div>
            <article v-for="project in projects" v-else :key="project.projectId" class="project-card">
              <div class="project-card__main">
                <div class="project-card__top">
                  <h3>{{ project.projectName }}</h3>
                  <span>{{ project.projectTime || project.projectPeriod || '未填写项目时间' }}</span>
                </div>
                <p class="project-meta">{{ project.techStack || '未填写技术栈' }}</p>
                <p class="project-desc">{{ project.projectBackground || project.description || '暂无项目背景' }}</p>
              </div>
              <div class="project-actions">
                <el-button type="primary" plain @click="openProjectEvidenceCreate(project)">补项目证据</el-button>
                <el-button @click="openProjectDialog(project)">编辑</el-button>
                <el-button type="danger" plain @click="handleDeleteProject(project)">删除</el-button>
              </div>
            </article>
          </div>
        </section>
      </main>

      <section
        id="resume-panel-preview"
        class="preview-column content-card mobile-pane-preview"
        role="tabpanel"
        aria-labelledby="resume-tab-preview"
      >
        <div class="preview-toolbar">
          <div>
            <h2>简历成品预览</h2>
            <p>模板选择会同步到下方 ATS 导出工作台；未保存内容仍需先保存后才能生成正式文件。</p>
          </div>
          <div class="preview-toolbar__status">
            <el-tag :type="hasUnsavedResumeChanges ? 'warning' : 'success'" effect="plain">
              {{ !isEdit ? '未保存草稿' : hasUnsavedResumeChanges ? '存在未保存改动' : '已同步保存内容' }}
            </el-tag>
          </div>
        </div>

        <div class="preview-customizer">
          <div class="template-selector" role="radiogroup" aria-label="选择简历模板">
            <button
              v-for="template in resumeTemplateOptions"
              :key="template.code"
              type="button"
              role="radio"
              :aria-checked="selectedResumeTemplateCode === template.code"
              :aria-disabled="!isTemplateUnlocked(template)"
              :tabindex="selectedResumeTemplateCode === template.code ? 0 : -1"
              :class="{
                active: selectedResumeTemplateCode === template.code,
                locked: !isTemplateUnlocked(template)
              }"
              :disabled="!isTemplateUnlocked(template)"
              @click="selectResumeTemplate(template)"
              @keydown="moveTemplateSelection($event)"
            >
              <span class="template-thumb" :class="`is-${template.className}`">
                <i></i><i></i><i></i>
              </span>
              <span>
                <strong>{{ template.name }}</strong>
                <small>{{ template.description }}</small>
              </span>
              <CheckCircle2 v-if="selectedResumeTemplateCode === template.code" :size="16" />
            </button>
          </div>

          <div class="preview-controls">
            <div class="accent-control">
              <span>编辑预览色</span>
              <div class="accent-swatches" role="radiogroup" aria-label="选择编辑预览强调色">
                <button
                  v-for="option in resumeAccentOptions"
                  :key="option.value"
                  type="button"
                  role="radio"
                  :aria-label="option.label"
                  :aria-checked="previewAccent === option.value"
                  :tabindex="previewAccent === option.value ? 0 : -1"
                  :class="[`is-${option.value}`, { active: previewAccent === option.value }]"
                  @click="previewAccent = option.value"
                  @keydown="moveAccentSelection($event)"
                ></button>
              </div>
            </div>
            <div class="zoom-control" aria-label="预览缩放">
              <button
                type="button"
                aria-label="缩小预览"
                :disabled="previewZoom <= 0.72"
                @click="changePreviewZoom(-0.08)"
              >
                <Minus :size="15" />
              </button>
              <span>{{ Math.round(previewZoom * 100) }}%</span>
              <button
                type="button"
                aria-label="放大预览"
                :disabled="previewZoom >= 1.12"
                @click="changePreviewZoom(0.08)"
              >
                <Plus :size="15" />
              </button>
            </div>
          </div>
        </div>

        <div class="resume-paper-wrap">
          <div class="resume-paper-stage" :style="{ zoom: previewZoom }">
            <ResumeDocumentPreview
              :draft="resumeDocumentDraft"
              :template-code="selectedResumeTemplateCode"
              :accent="previewAccent"
              :density="selectedResumeTemplateCode === 'ATS_COMPACT' ? 'compact' : 'comfortable'"
            />
          </div>
        </div>
      </section>

      <aside
        id="resume-panel-advice"
        class="editor-column editor-aside mobile-pane-advice"
        role="tabpanel"
        aria-labelledby="resume-tab-advice"
      >
        <section class="content-card side-panel readiness-panel">
          <div class="completion-head">
            <span>简历完整度</span>
            <strong>{{ completion }}%</strong>
          </div>
          <el-progress :percentage="completion" :stroke-width="10" :show-text="false" />
          <p>仅基于当前表单真实填写项计算，不代表 AI 评分。</p>
          <div class="completion-list">
            <span v-for="item in completionItems" :key="item.label" :class="{ done: item.done }">
              <CheckCircle2 v-if="item.done" :size="15" />
              <Circle v-else :size="15" />
              {{ item.label }}
            </span>
          </div>
        </section>

        <section class="content-card side-panel jd-match-panel">
          <div class="completion-head">
            <span>JD 匹配准备度</span>
            <strong>{{ jdMatchReadiness }}%</strong>
          </div>
          <el-progress :percentage="jdMatchReadiness" :stroke-width="10" :show-text="false" />
          <p>用于判断当前简历是否适合进入 JD 匹配，不替代正式匹配报告。</p>
          <div class="diagnostic-list">
            <span v-for="item in jdMatchItems" :key="item.label" :class="{ done: item.done }">
              <CheckCircle2 v-if="item.done" :size="15" />
              <Circle v-else :size="15" />
              {{ item.label }}
            </span>
          </div>
        </section>

        <section class="content-card side-panel evidence-panel">
          <h3>项目证据</h3>
          <p>项目是否能支撑岗位能力，先看数量、结果和技能映射。</p>
          <div class="evidence-list">
            <div v-for="item in projectEvidenceItems" :key="item.label" :class="{ done: item.done }">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
          <el-button class="full-button" @click="router.push('/project-evidence')">
            <Layers3 :size="16" />
            打开项目证据库
          </el-button>
        </section>

        <section class="content-card side-panel gap-panel">
          <h3>缺口建议</h3>
          <div class="gap-list">
            <article v-for="item in gapSuggestionItems" :key="item.title">
              <strong>{{ item.title }}</strong>
              <p>{{ item.desc }}</p>
            </article>
          </div>
        </section>

        <section v-if="isEdit && resumeId" class="content-card side-panel ai-panel">
          <h3>AI 优化建议</h3>
          <p>基于已保存简历生成建议。建议需要人工复核，应用时会创建草稿，不会覆盖当前简历。</p>
          <el-form class="optimize-form" :model="optimizeForm" label-position="top">
            <el-form-item label="目标岗位">
              <el-input v-model.trim="optimizeForm.targetPosition" placeholder="默认使用当前求职方向" />
            </el-form-item>
            <el-form-item label="工作年限">
              <el-input-number v-model="optimizeForm.experienceYears" :min="0" :max="30" />
            </el-form-item>
            <el-form-item label="行业方向">
              <el-input v-model.trim="optimizeForm.industryDirection" placeholder="例如：电商 / 金融支付 / SaaS" />
            </el-form-item>
          </el-form>
          <el-button class="full-button" type="primary" :loading="optimizing" @click="handleOptimizeResume">
            <Sparkles :size="16" />
            生成建议
          </el-button>

          <div v-if="!optimizeRecords.length && !optimizeSseMessage" class="ai-empty">
            暂无 AI 建议记录。保存简历后可生成一次优化建议。
          </div>

          <div v-if="optimizeSseEvents.length || optimizeSseMessage" class="sse-progress">
            <div class="sse-progress__head">
              <span>建议生成进度</span>
              <el-tag size="small" effect="plain">{{ optimizeSseStatus }}</el-tag>
            </div>
            <p>{{ optimizeSseMessage || '等待建议进度返回。' }}</p>
            <p class="sse-progress__hint">{{ optimizeRecoveryHint }}</p>
            <div class="sse-progress__list">
              <span v-for="(event, index) in optimizeSseEvents" :key="`${event.type}-${index}`">
                {{ event.stage || optimizeSseTypeLabel(event.type) }} · {{ event.message }}
              </span>
            </div>
            <el-button
              v-if="optimizeTask"
              class="sse-progress__action"
              text
              type="primary"
              @click="goOptimizeTaskCenter(optimizeTask)"
            >
              查看生成进度
            </el-button>
            <el-button
              v-if="showOptimizeRefreshAction"
              class="sse-progress__action"
              text
              type="primary"
              :loading="optimizeRecordsRefreshing"
              @click="refreshOptimizeRecords"
            >
              刷新最近记录
            </el-button>
          </div>

          <div class="optimize-records">
            <div class="capability-item">
              <span>最近建议</span>
              <el-tag :type="latestOptimizeRecord?.optimizeStatus === 'FAILED' ? 'danger' : latestOptimizeRecord ? 'success' : 'info'" effect="plain">
                {{ optimizeStatusText(latestOptimizeRecord?.optimizeStatus) }}
              </el-tag>
            </div>
            <button
              v-for="record in optimizeRecords"
              :key="record.optimizeRecordId"
              class="record-row"
              type="button"
              @click="openOptimizeDetail(record.optimizeRecordId)"
            >
              <span>建议记录 {{ record.optimizeRecordId }} · {{ optimizeStatusText(record.optimizeStatus) }}</span>
              <small>{{ formatDateTime(record.createdAt || record.updatedAt) }}</small>
            </button>
          </div>

          <div v-if="optimizeDetail" class="optimize-result">
          <el-alert
            type="info"
            :closable="false"
            show-icon
              title="建议仅供复核"
              description="这里只展示字段建议、改写方向和风险提示；没有返回分数时不会补造分数。"
          />
            <div v-if="optimizeDetail.overallScore !== undefined && optimizeDetail.overallScore !== null" class="score-line">
              <span>综合评分</span>
              <strong>{{ optimizeDetail.overallScore }}</strong>
            </div>
          <p>{{ optimizeDetailSummary }}</p>
          <div v-if="optimizeSuggestions.length" class="rewrite-toolbar">
            <span>已选择 {{ selectedOptimizeSuggestionIndexes.length }} / {{ optimizeSuggestions.length }} 个字段建议</span>
            <el-button text size="small" @click="selectAllOptimizeSuggestions">全选</el-button>
            <el-button text size="small" @click="selectedOptimizeSuggestionIndexes = []">清空</el-button>
          </div>
          <div v-if="optimizeSuggestions.length" class="rewrite-list">
            <article v-for="(item, index) in optimizeSuggestions" :key="index">
              <div class="rewrite-head">
                <el-checkbox v-model="selectedOptimizeSuggestionIndexes" :label="index">
                  {{ getOptimizeSuggestionFieldName(item, index) }}
                </el-checkbox>
                <el-tag v-if="item.fabricationRisk" type="warning" effect="plain">需核实真实性</el-tag>
              </div>
              <div class="rewrite-diff">
                <div>
                  <span>字段</span>
                  <p>{{ getOptimizeSuggestionFieldName(item, index) }}</p>
                </div>
                <div>
                  <span>改写建议</span>
                  <p>{{ item.after || item.reason || '暂未返回改写建议' }}</p>
                </div>
              </div>
              <p v-if="item.reason" class="rewrite-reason">{{ item.reason }}</p>
            </article>
          </div>
            <div v-else class="ai-empty">
              这条记录暂未返回可应用的字段建议，可刷新最近记录或补充目标岗位后重新生成。
            </div>
            <el-tooltip :content="applyOptimizeDisabledReason" placement="top" :disabled="canApplyOptimizeResult">
              <el-button
                class="full-button"
                type="primary"
                :disabled="!canApplyOptimizeResult"
                :loading="applyingOptimize"
                @click="handleApplyOptimizeResult"
              >
                <GitCompareArrows :size="16" />
                应用建议 · 新建草稿
              </el-button>
            </el-tooltip>
          </div>
        </section>

        <section v-else class="content-card side-panel ai-panel ai-locked-panel">
          <h3>AI 优化建议</h3>
          <p>先保存简历，系统才能基于稳定版本生成建议。建议应用时会创建草稿，不会覆盖当前编辑内容。</p>
          <div class="ai-empty">
            当前是未保存草稿。保存后可生成一次 AI 润色建议，并在这里查看记录。
          </div>
        </section>

        <section class="content-card side-panel">
          <h3>闭环动作</h3>
          <p>保存后可以把项目补成证据，也可以进入面试训练验证简历表达。</p>
          <el-button class="full-button" @click="router.push('/interviews/create')">
            <MessagesSquare :size="16" />
            进入模拟面试
          </el-button>
        </section>

        <section class="content-card side-panel">
          <h3>填写建议</h3>
          <ul>
            <li>技术栈尽量按语言、框架、中间件、数据库分组。</li>
            <li>项目经历建议写清背景、职责、难点和可量化结果。</li>
            <li>个人摘要保持真实，不写无法在面试中展开的内容。</li>
          </ul>
        </section>
      </aside>
    </div>

    <ResumeDeliveryWorkbench
      v-if="isEdit"
      :resume-id="resumeId || undefined"
      :preferred-template-code="selectedResumeTemplateCode"
      :refresh-key="deliveryRefreshKey"
      :has-unsaved-changes="hasUnsavedResumeChanges"
      @resume-version-applied="reloadCurrentResume"
      @template-change="selectedResumeTemplateCode = $event"
    />

    <el-dialog
      v-model="projectDialogVisible"
      :title="editingProjectId ? '编辑项目经历' : '新增项目经历'"
      width="760px"
      class="resume-project-dialog"
    >
      <ResumeProjectForm ref="projectFormRef" :model-value="editingProject || undefined" />
      <template #footer>
        <el-button @click="projectDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="projectSaving" @click="handleSaveProject">保存项目</el-button>
      </template>
    </el-dialog>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  FilePenLine,
  FolderOpen,
  GitCompareArrows,
  Layers3,
  MessagesSquare,
  Minus,
  Plus,
  Save,
  Sparkles,
  UserRound
} from 'lucide-vue-next'
import { getActivePinia } from 'pinia'
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  applyResumeOptimizeResultApi,
  createResumeApi,
  createResumeProjectApi,
  deleteResumeProjectApi,
  getResumeOptimizeRecordsApi,
  getResumeOptimizeResultApi,
  getResumeDetailApi,
  optimizeResumeApi,
  setDefaultResumeApi,
  updateResumeApi,
  updateResumeProjectApi
} from '@/api/resume'
import { createResumeVersionApi, getResumeVersionsApi } from '@/api/v4'
import AppState from '@/components/common/AppState.vue'
import ResumeProjectForm from '@/components/resume/ResumeProjectForm.vue'
import {
  isResumeTemplateUnlocked,
  resumeTemplateOptions,
  type ResumeTemplateOption,
  type ResumeAccent,
  type ResumeTemplateCode
} from '@/features/resume-document'
import { useGameProfileStore } from '@/features/game-profile'
import ResumeDocumentPreview from '@/views/resume/components/ResumeDocumentPreview.vue'
import ResumeDeliveryWorkbench from '@/views/resume/components/ResumeDeliveryWorkbench.vue'
import type {
  ResumeCreateDTO,
  ResumeDetailVO,
  ResumeOptimizeDetailVO,
  ResumeOptimizeRecordVO,
  ResumeOptimizeRequestDTO,
  ResumeOptimizeSubmitVO,
  ResumeRewriteSuggestion,
  ResumeProjectDTO,
  ResumeProjectVO
} from '@/types/resume'
import type { ResumeDeliveryDraft } from '@/types/resumeDelivery'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage, toFriendlyMessage } from '@/utils/error'
import { getRouteNumberParam } from '@/utils/route'
import { formatDateTime } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const gameProfile = getActivePinia() ? useGameProfileStore() : null
const resumeId = computed(() => getRouteNumberParam(route.params.id as string))
const isEdit = computed(() => Boolean(resumeId.value))
const routeTargetJobId = computed(() => {
  const rawValue = Array.isArray(route.query.targetJobId) ? route.query.targetJobId[0] : route.query.targetJobId
  const value = Number(rawValue)
  return Number.isFinite(value) && value > 0 ? value : undefined
})

const loading = ref(false)
const detailError = ref('')
const saving = ref(false)
const projectSaving = ref(false)
const optimizing = ref(false)
const applyingOptimize = ref(false)
const formRef = ref<FormInstance>()
const projectFormRef = ref<InstanceType<typeof ResumeProjectForm>>()
const projectDialogVisible = ref(false)
const editingProjectId = ref<number | null>(null)
const editingProject = ref<ResumeProjectVO | null>(null)
const projects = ref<ResumeProjectVO[]>([])
const optimizeRecords = ref<ResumeOptimizeRecordVO[]>([])
const optimizeDetail = ref<ResumeOptimizeDetailVO | null>(null)
const selectedOptimizeSuggestionIndexes = ref<number[]>([])
const optimizeSseEvents = ref<Array<{ type: string; stage?: string; message: string }>>([])
const optimizeSseMessage = ref('')
const optimizeSseStatus = ref('未开始')
const optimizeTask = ref<ResumeOptimizeSubmitVO | null>(null)
const optimizeRecordsRefreshing = ref(false)
const mobileWorkspaceTab = ref<'edit' | 'preview' | 'advice'>('edit')
const selectedResumeTemplateCode = ref<ResumeTemplateCode>('ATS_SINGLE_COLUMN')
const previewAccent = ref<ResumeAccent>('ocean')
const previewZoom = ref(0.88)
const deliveryRefreshKey = ref(0)
let resumeLoadGeneration = 0
let resumeSaveOperationGeneration = 0
let projectWriteOperationGeneration = 0
const resumeAccentOptions: Array<{ value: ResumeAccent; label: string }> = [
  { value: 'ocean', label: '海洋蓝' },
  { value: 'teal', label: '青绿色' },
  { value: 'graphite', label: '石墨灰' },
  { value: 'berry', label: '莓红色' }
]
const mobileWorkspaceTabs = ['edit', 'preview', 'advice'] as const
const availableResumeTemplateCodes = computed(() =>
  resumeTemplateOptions
    .filter((template) => isTemplateUnlocked(template))
    .map((template) => template.code)
)

const isTemplateUnlocked = (template: ResumeTemplateOption) =>
  isResumeTemplateUnlocked(template, gameProfile?.streakDays || 0)

const selectResumeTemplate = (template: ResumeTemplateOption) => {
  if (!isTemplateUnlocked(template)) return
  selectedResumeTemplateCode.value = template.code
}

const moveRovingSelection = <T>(
  event: KeyboardEvent,
  values: readonly T[],
  currentValue: T,
  select: (value: T) => void
) => {
  const currentIndex = values.indexOf(currentValue)
  if (currentIndex < 0) return

  let nextIndex = currentIndex
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    nextIndex = (currentIndex + 1) % values.length
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    nextIndex = (currentIndex - 1 + values.length) % values.length
  } else if (event.key === 'Home') {
    nextIndex = 0
  } else if (event.key === 'End') {
    nextIndex = values.length - 1
  } else {
    return
  }

  event.preventDefault()
  select(values[nextIndex])
  void nextTick(() => {
    const buttons = event.currentTarget instanceof HTMLElement
      ? Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || [])
      : []
    buttons[nextIndex]?.focus()
  })
}

const moveMobileWorkspaceTab = (event: KeyboardEvent) =>
  moveRovingSelection(
    event,
    mobileWorkspaceTabs,
    mobileWorkspaceTab.value,
    (value) => { mobileWorkspaceTab.value = value }
  )

const moveTemplateSelection = (event: KeyboardEvent) =>
  moveRovingSelection(
    event,
    availableResumeTemplateCodes.value,
    selectedResumeTemplateCode.value,
    (value) => { selectedResumeTemplateCode.value = value }
  )

const moveAccentSelection = (event: KeyboardEvent) =>
  moveRovingSelection(
    event,
    resumeAccentOptions.map((item) => item.value),
    previewAccent.value,
    (value) => { previewAccent.value = value }
  )

const createDefaultResumeForm = (): ResumeCreateDTO => ({
  resumeName: '',
  realName: '',
  email: '',
  phone: '',
  targetPosition: '',
  summary: '',
  skills: '',
  workSummary: '',
  education: '',
  isDefault: 0
})

const createDefaultOptimizeForm = (): ResumeOptimizeRequestDTO => ({
  targetPosition: '',
  experienceYears: undefined,
  industryDirection: ''
})

const form = reactive<ResumeCreateDTO>(createDefaultResumeForm())

const optimizeForm = reactive<ResumeOptimizeRequestDTO>(createDefaultOptimizeForm())

const rules: FormRules<ResumeCreateDTO> = {
  resumeName: [{ required: true, message: '请输入简历名称', trigger: 'blur' }],
  skills: [{ required: true, message: '请输入技术栈', trigger: 'blur' }]
}

const completionItems = computed(() => [
  { label: '简历名称', done: Boolean(form.resumeName?.trim()) },
  { label: '求职方向', done: Boolean(form.targetPosition?.trim()) },
  { label: '技术栈', done: Boolean(form.skills?.trim()) },
  { label: '个人摘要', done: Boolean(form.summary?.trim()) },
  { label: '工作经历', done: Boolean(form.workSummary?.trim()) },
  { label: '教育经历', done: Boolean(form.education?.trim()) },
  { label: '项目经历', done: projects.value.length > 0 }
])

const completion = computed(() => {
  const done = completionItems.value.filter((item) => item.done).length
  return Math.round((done / completionItems.value.length) * 100)
})

const sectionNavItems = computed(() => [
  { id: 'resume-basic', label: '基本信息', done: Boolean(form.resumeName?.trim() && form.realName?.trim()) },
  { id: 'resume-target', label: '求职目标', done: Boolean(form.targetPosition?.trim()) },
  { id: 'resume-summary', label: '个人摘要', done: Boolean(form.summary?.trim()) },
  { id: 'resume-skills', label: '技能关键词', done: Boolean(form.skills?.trim()) },
  { id: 'resume-experience', label: '经历与教育', done: Boolean(form.workSummary?.trim() || form.education?.trim()) },
  { id: 'resume-projects', label: '项目经历', done: projects.value.length > 0 }
])

const splitTextTags = (value?: string) =>
  (value || '')
    .split(/[，,、\n/|]+/)
    .map((item) => item.trim())
    .filter(Boolean)

const skillTags = computed(() => splitTextTags(form.skills).slice(0, 18))

const hasPreviewContent = computed(() =>
  Boolean(
    form.realName ||
    form.targetPosition ||
    form.summary ||
    form.education ||
    form.workSummary ||
    skillTags.value.length ||
    projects.value.length
  )
)

const resumeDeliveryDraft = computed<ResumeDeliveryDraft>(() => ({
  title: form.resumeName,
  realName: form.realName,
  email: form.email,
  phone: form.phone,
  targetPosition: form.targetPosition,
  summary: form.summary,
  skillStack: form.skills,
  workExperience: form.workSummary,
  educationExperience: form.education,
  projects: projects.value
}))

const resumeDocumentDraft = computed(() => ({
  ...resumeDeliveryDraft.value,
  resumeName: form.resumeName
}))
const savedResumeSignature = ref('')
const resumeDraftSignature = computed(() => JSON.stringify(resumeDeliveryDraft.value))
const hasUnsavedResumeChanges = computed(() =>
  isEdit.value
  && (!savedResumeSignature.value || savedResumeSignature.value !== resumeDraftSignature.value)
)

const previewPreferenceKey = computed(() =>
  `codecoachai:resume-preview:${resumeId.value || 'draft'}`
)

const loadPreviewPreferences = () => {
  try {
    const raw = window.localStorage.getItem(previewPreferenceKey.value)
    if (!raw) return
    const preference = JSON.parse(raw) as {
      templateCode?: ResumeTemplateCode
      accent?: ResumeAccent
      zoom?: number
    }
    const storedTemplate = resumeTemplateOptions.find((item) => item.code === preference.templateCode)
    if (storedTemplate && isTemplateUnlocked(storedTemplate)) {
      selectedResumeTemplateCode.value = storedTemplate.code
    }
    if (resumeAccentOptions.some((item) => item.value === preference.accent)) {
      previewAccent.value = preference.accent as ResumeAccent
    }
    if (typeof preference.zoom === 'number' && Number.isFinite(preference.zoom)) {
      previewZoom.value = Math.min(1.12, Math.max(0.72, preference.zoom))
    }
  } catch {
    // A corrupt local preference must never block editing.
  }
}

const persistPreviewPreferences = () => {
  try {
    window.localStorage.setItem(previewPreferenceKey.value, JSON.stringify({
      templateCode: selectedResumeTemplateCode.value,
      accent: previewAccent.value,
      zoom: previewZoom.value
    }))
  } catch {
    // Private browsing or storage limits should not affect the editor.
  }
}

const changePreviewZoom = (delta: number) => {
  previewZoom.value = Math.round(
    Math.min(1.12, Math.max(0.72, previewZoom.value + delta)) * 100
  ) / 100
}

const projectsWithResult = computed(() =>
  projects.value.filter((project) => Boolean(project.optimizationResult || project.optimizationResults)).length
)

const aiWritingPrompts = computed(() => [
  {
    target: 'resume-summary',
    label: '摘要',
    title: form.summary ? '把摘要压到 3 句话' : '先写 30 秒自我介绍',
    desc: '背景、主技术栈、能证明的业务结果各保留一句。'
  },
  {
    target: 'resume-skills',
    label: '技能',
    title: skillTags.value.length >= 6 ? '按岗位优先级排序' : '补齐核心技能簇',
    desc: '语言、框架、中间件、数据库、工程实践分组展示。'
  },
  {
    target: 'resume-projects',
    label: '证据',
    title: projects.value.length ? '给项目补结果指标' : '添加最能被追问的项目',
    desc: '每段项目至少包含背景、职责、难点、方案和结果。'
  }
])

const jdMatchItems = computed(() => [
  { label: '目标岗位', done: Boolean(routeTargetJobId.value || form.targetPosition?.trim()) },
  { label: '关键词密度', done: skillTags.value.length >= 6 },
  { label: '项目支撑', done: projects.value.length > 0 },
  { label: '结果指标', done: projectsWithResult.value > 0 }
])

const jdMatchReadiness = computed(() => {
  const done = jdMatchItems.value.filter((item) => item.done).length
  return Math.round((done / jdMatchItems.value.length) * 100)
})

const projectEvidenceItems = computed(() => [
  {
    label: '项目数量',
    value: projects.value.length ? `${projects.value.length} 段` : '待补充',
    done: projects.value.length > 0
  },
  {
    label: '结果指标',
    value: projectsWithResult.value ? `${projectsWithResult.value} 段已写结果` : '缺少量化结果',
    done: projectsWithResult.value > 0
  },
  {
    label: '技术栈映射',
    value: skillTags.value.length ? `${skillTags.value.length} 个关键词` : '待提取',
    done: skillTags.value.length > 0
  }
])

const gapSuggestionItems = computed(() => {
  const items = [
    !form.targetPosition?.trim()
      ? { title: '先明确目标岗位', desc: '没有岗位锚点时，摘要和技能排序容易发散。' }
      : null,
    skillTags.value.length < 6
      ? { title: '补齐可检索关键词', desc: '至少覆盖语言、框架、数据库、中间件和工程实践。' }
      : null,
    !form.summary?.trim()
      ? { title: '补一段个人摘要', desc: '用真实经历概括方向，不写无法展开的形容词。' }
      : null,
    !form.workSummary?.trim()
      ? { title: '补工作经历上下文', desc: '说明负责系统、业务规模、职责边界和结果。' }
      : null,
    !projects.value.length
      ? { title: '补项目证据', desc: '至少准备一段可被面试追问的完整项目。' }
      : null,
    projects.value.length > 0 && projectsWithResult.value === 0
      ? { title: '给项目加结果', desc: '用性能、效率、稳定性、成本或业务指标承接方案。' }
      : null
  ].filter((item): item is { title: string; desc: string } => Boolean(item))

  return items.length
    ? items.slice(0, 4)
    : [{ title: '进入投递前复核', desc: '当前结构已比较完整，建议结合具体 JD 再做关键词取舍。' }]
})

const focusSection = (sectionId: string) => {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const liveFeedbackItems = computed(() => [
  {
    label: '实时预览',
    title: hasPreviewContent.value ? '右侧 A4 已同步当前填写内容' : '先写姓名、岗位或项目，右侧会生成纸张预览',
    desc: hasPreviewContent.value ? '预览只来自当前真实字段，不会补造经历。' : '不需要等保存，编辑区改动会直接反映到预览。',
    tone: hasPreviewContent.value ? 'is-good' : 'is-waiting'
  },
  {
    label: '项目证据',
    title: projects.value.length ? `${projects.value.length} 段项目经历可继续打磨` : '还缺一段可追问的项目经历',
    desc: projectsWithResult.value
      ? `${projectsWithResult.value} 段项目已经写到结果指标，后续可沉淀为证据。`
      : '建议补上背景、职责、技术难点和量化结果，面试追问才有真实依据。',
    tone: projectsWithResult.value ? 'is-good' : 'is-warning'
  },
  {
    label: 'AI 润色',
    title: latestOptimizeRecord.value ? `最近建议：${optimizeStatusText(latestOptimizeRecord.value.optimizeStatus)}` : '保存后可生成 AI 润色建议',
    desc: latestOptimizeRecord.value ? '建议需要你人工复核，应用时会创建新草稿。' : 'AI 建议不会覆盖当前简历，用于对照和筛选可采纳改写。',
    tone: latestOptimizeRecord.value ? 'is-good' : 'is-waiting'
  }
])

const latestOptimizeRecord = computed(() => optimizeRecords.value[0])

const optimizeSuggestions = computed(() => optimizeDetail.value?.rewriteSuggestions || [])

const optimizeDetailSummary = computed(() => {
  const raw = optimizeDetail.value?.overallComment || optimizeDetail.value?.errorMessage
  return raw ? toFriendlyMessage(raw, '建议结果暂不可用，请稍后重试。') : '暂未返回整体评价。'
})

const showOptimizeRefreshAction = computed(() => Boolean(optimizeSseMessage.value) && !optimizing.value)

const showOptimizeTaskCenterAction = computed(() => Boolean(optimizeTask.value))

const optimizeRecoveryHint = computed(() => {
  if (showOptimizeTaskCenterAction.value) {
    return '建议已在后台生成，可以离开本页，完成后再刷新最近记录查看结果。'
  }
  if (optimizing.value) {
    return '建议生成可能需要一点时间。你可以停留等待，也可以稍后回到本页，从最近记录继续查看结果。'
  }
  if (latestOptimizeRecord.value) {
    return '最近建议记录已保留，可打开记录查看结果或失败原因。'
  }
  return '如果刚才离开或网络中断，可以刷新最近记录；仍没有结果时再重新生成建议。'
})

const hasOptimizeAsyncReceipt = (result: ResumeOptimizeSubmitVO) =>
  Boolean(result.asyncMessageId || result.asyncTraceId || result.asyncBizId || result.asyncSendStatus)

const buildOptimizeTaskCenterQuery = (task: ResumeOptimizeSubmitVO) => {
  const query: Record<string, string> = {
    bizType: task.asyncBizType || 'resume.optimize',
    bizId: task.asyncBizId || String(task.optimizeRecordId)
  }
  if (task.asyncMessageId) query.messageId = task.asyncMessageId
  if (task.asyncTraceId) query.traceId = task.asyncTraceId
  return query
}

const goOptimizeTaskCenter = (task: ResumeOptimizeSubmitVO) => {
  router.push({ path: '/agent/tasks', query: buildOptimizeTaskCenterQuery(task) })
}

const canApplyOptimizeResult = computed(() =>
  optimizeDetail.value?.optimizeStatus === 'SUCCESS' && selectedOptimizeSuggestionIndexes.value.length > 0
)

const applyOptimizeDisabledReason = computed(() => {
  if (!optimizeDetail.value) return '请选择一条优化记录'
  if (optimizeDetail.value.optimizeStatus !== 'SUCCESS') return '仅成功的优化记录可应用'
  if (!selectedOptimizeSuggestionIndexes.value.length) return '请至少选择一个字段建议'
  return ''
})

const getOptimizeSuggestionFieldName = (item: ResumeRewriteSuggestion, index: number) =>
  item.fieldName || item.fieldKey || item.projectName || item.section || `建议 ${index + 1}`

const getOptimizeSuggestionFieldKey = (item: ResumeRewriteSuggestion) =>
  item.fieldKey || item.section || item.fieldName || (item.projectName ? 'project' : undefined)

const toProjectDraft = (payload: ResumeProjectDTO, projectId: number): ResumeProjectVO => ({
  ...payload,
  id: projectId,
  projectId,
  projectTime: payload.projectTime || payload.projectPeriod || '',
  projectPeriod: payload.projectPeriod || payload.projectTime || '',
  projectBackground: payload.projectBackground || payload.description || '',
  description: payload.description || payload.projectBackground || '',
  responsibility: payload.responsibility || payload.role || '',
  role: payload.role || payload.responsibility || '',
  technicalChallenges: payload.technicalChallenges || payload.technicalDifficulties || '',
  technicalDifficulties: payload.technicalDifficulties || payload.technicalChallenges || '',
  optimizationResult: payload.optimizationResult || payload.optimizationResults || '',
  optimizationResults: payload.optimizationResults || payload.optimizationResult || '',
  sort: payload.sort ?? payload.sortOrder ?? 0,
  sortOrder: payload.sortOrder ?? payload.sort ?? 0
})

const persistDraftProjects = async (
  createdResumeId: number,
  draftProjects: ResumeProjectVO[],
  isCurrentOperation: () => boolean
) => {
  let failedCount = 0
  for (const project of draftProjects) {
    if (!isCurrentOperation()) {
      return { failedCount, stale: true }
    }
    try {
      await createResumeProjectApi(createdResumeId, project)
    } catch {
      failedCount++
    }
  }
  return { failedCount, stale: !isCurrentOperation() }
}

const selectAllOptimizeSuggestions = () => {
  selectedOptimizeSuggestionIndexes.value = optimizeSuggestions.value.map((_, index) => index)
}

const getSelectedOptimizeSuggestions = () =>
  selectedOptimizeSuggestionIndexes.value
    .filter((index) => index >= 0 && index < optimizeSuggestions.value.length)
    .map((index) => ({
      index,
      item: optimizeSuggestions.value[index]
    }))

const isCurrentResumeRoute = (
  requestGeneration: number,
  targetResumeId: number | null
) => (
  requestGeneration === resumeLoadGeneration
  && targetResumeId === resumeId.value
)

const resetRouteState = () => {
  Object.assign(form, createDefaultResumeForm())
  Object.assign(optimizeForm, createDefaultOptimizeForm())
  projectDialogVisible.value = false
  editingProjectId.value = null
  editingProject.value = null
  projects.value = []
  optimizeRecords.value = []
  optimizeDetail.value = null
  selectedOptimizeSuggestionIndexes.value = []
  optimizeSseEvents.value = []
  optimizeSseMessage.value = ''
  optimizeSseStatus.value = '未开始'
  optimizeTask.value = null
  optimizeRecordsRefreshing.value = false
  optimizing.value = false
  applyingOptimize.value = false
  mobileWorkspaceTab.value = 'edit'
  selectedResumeTemplateCode.value = 'ATS_SINGLE_COLUMN'
  previewAccent.value = 'ocean'
  previewZoom.value = 0.88
  savedResumeSignature.value = ''
  detailError.value = ''
  loading.value = false
  deliveryRefreshKey.value += 1
  void nextTick(() => formRef.value?.clearValidate?.())
}

const applyDetail = (detail: ResumeDetailVO) => {
  Object.assign(form, {
    resumeName: detail.resumeName,
    realName: detail.realName || '',
    email: detail.email || '',
    phone: detail.phone || '',
    targetPosition: detail.targetPosition || '',
    summary: detail.summary || '',
    skills: detail.skills || detail.skillStack || '',
    workSummary: detail.workSummary || detail.workExperience || '',
    education: detail.education || detail.educationExperience || '',
    isDefault: detail.isDefault
  })
  if (!optimizeForm.targetPosition) {
    optimizeForm.targetPosition = detail.targetPosition || ''
  }
  projects.value = detail.projects || []
  savedResumeSignature.value = resumeDraftSignature.value
}

const fetchDetail = async (targetResumeId: number, requestGeneration: number) => {
  loading.value = true
  detailError.value = ''
  try {
    const nextDetail = await getResumeDetailApi(targetResumeId)
    if (requestGeneration !== resumeLoadGeneration) return
    applyDetail(nextDetail)
    await fetchOptimizeRecords(targetResumeId, requestGeneration)
  } catch (error) {
    if (requestGeneration === resumeLoadGeneration) {
      detailError.value = getErrorMessage(error, '简历详情加载失败，请返回简历实验室重试。')
      ElMessage.error(detailError.value)
    }
  } finally {
    if (requestGeneration === resumeLoadGeneration) {
      loading.value = false
    }
  }
}

const optimizeStatusText = (status?: string) => {
  const map: Record<string, string> = {
    PROCESSING: '建议生成中',
    SUCCESS: '建议已生成',
    FAILED: '建议生成失败'
  }
  return status ? map[status] || '状态待确认' : '暂无记录'
}

const fetchOptimizeRecords = async (
  targetResumeId: number,
  requestGeneration = resumeLoadGeneration
) => {
  try {
    const nextRecords = await getResumeOptimizeRecordsApi(targetResumeId)
    if (requestGeneration !== resumeLoadGeneration) return
    optimizeRecords.value = nextRecords
    if (!optimizeDetail.value && nextRecords[0]) {
      const nextOptimizeDetail = await getResumeOptimizeResultApi(nextRecords[0].optimizeRecordId)
      if (requestGeneration !== resumeLoadGeneration) return
      optimizeDetail.value = nextOptimizeDetail
      selectedOptimizeSuggestionIndexes.value = optimizeSuggestions.value.map((_, index) => index)
    }
  } catch {
    if (requestGeneration === resumeLoadGeneration) {
      optimizeRecords.value = []
    }
  }
}

const openOptimizeDetail = async (recordId: number) => {
  const requestGeneration = resumeLoadGeneration
  const nextOptimizeDetail = await getResumeOptimizeResultApi(recordId)
  if (requestGeneration !== resumeLoadGeneration) return
  optimizeDetail.value = nextOptimizeDetail
  selectedOptimizeSuggestionIndexes.value = optimizeSuggestions.value.map((_, index) => index)
}

const refreshOptimizeRecords = async () => {
  const targetResumeId = resumeId.value
  if (!targetResumeId) return
  const requestGeneration = resumeLoadGeneration
  optimizeRecordsRefreshing.value = true
  try {
    await fetchOptimizeRecords(targetResumeId, requestGeneration)
    if (requestGeneration !== resumeLoadGeneration) return
    if (latestOptimizeRecord.value) {
      ElMessage.success('最近记录已刷新')
    } else {
      ElMessage.info('暂未发现新的建议记录')
    }
  } finally {
    if (requestGeneration === resumeLoadGeneration) {
      optimizeRecordsRefreshing.value = false
    }
  }
}

const reloadCurrentResume = async () => {
  const targetResumeId = resumeId.value
  if (!targetResumeId) return
  const requestGeneration = resumeLoadGeneration
  await fetchDetail(targetResumeId, requestGeneration)
}

const buildOptimizePayload = (): ResumeOptimizeRequestDTO => ({
  targetJobId: routeTargetJobId.value,
  targetPosition: optimizeForm.targetPosition || form.targetPosition,
  experienceYears: optimizeForm.experienceYears,
  industryDirection: optimizeForm.industryDirection,
  selectedProjectIds: projects.value.map((project) => project.projectId).filter(Boolean)
})

const runSyncOptimizeFallback = async (
  targetResumeId: number,
  requestGeneration: number,
  payload: ResumeOptimizeRequestDTO
) => {
  optimizeSseStatus.value = '普通生成'
  optimizeSseMessage.value = '生成进度暂时不可用，系统会继续生成建议，稍后可刷新最近记录查看。'
  const result = await optimizeResumeApi(targetResumeId, payload)
  if (requestGeneration !== resumeLoadGeneration) return
  if (hasOptimizeAsyncReceipt(result)) {
    optimizeTask.value = result
    optimizeSseStatus.value = '已提交'
    optimizeSseMessage.value = '建议已开始生成，可稍后刷新最近记录查看结果。'
    optimizeSseEvents.value = [{
      type: 'task',
      stage: '生成进度',
      message: '建议已开始生成'
    }]
    ElMessage.success('建议已开始生成')
    await fetchOptimizeRecords(targetResumeId, requestGeneration)
    return
  }
  if (result.optimizeStatus === 'FAILED') {
    ElMessage.error(toFriendlyMessage(result.errorMessage, '生成建议失败，请稍后重试'))
  } else {
    ElMessage.success('建议已生成')
  }
  await fetchOptimizeRecords(targetResumeId, requestGeneration)
  if (requestGeneration !== resumeLoadGeneration) return
  if (result.optimizeRecordId) {
    await openOptimizeDetail(result.optimizeRecordId)
  }
}

const optimizeSseTypeLabel = (type?: string) => {
  const map: Record<string, string> = {
    start: '建议开始',
    delta: '建议生成中',
    metadata: '状态更新',
    progress: '生成进度',
    result: '建议结果',
    done: '建议完成',
    error: '生成失败'
  }
  return type ? map[type] || '状态更新' : '状态更新'
}

const handleOptimizeResume = async () => {
  const targetResumeId = resumeId.value
  if (!targetResumeId || optimizing.value) return
  const requestGeneration = resumeLoadGeneration
  const payload = buildOptimizePayload()
  optimizing.value = true
  optimizeSseEvents.value = []
  optimizeSseMessage.value = '正在启动建议生成进度。'
  optimizeSseStatus.value = '启动中'
  optimizeTask.value = null

  try {
    await runSyncOptimizeFallback(targetResumeId, requestGeneration, payload)
  } catch (error) {
    if (requestGeneration === resumeLoadGeneration) {
      optimizeSseStatus.value = '提交失败'
      optimizeSseMessage.value = getErrorMessage(error, '建议任务提交失败，可以刷新最近记录，或稍后重新生成。')
      ElMessage.error(optimizeSseMessage.value)
    }
  } finally {
    if (requestGeneration === resumeLoadGeneration) {
      optimizing.value = false
    }
  }
}

const showApplyResultMessage = async (message?: string, warnings?: string[], newResumeId?: number) => {
  const warningText = warnings?.length ? `\n\n注意事项：\n${warnings.map((item) => `- ${item}`).join('\n')}` : ''
  const draftText = newResumeId ? '\n\n建议草稿已创建，稍后会自动打开编辑页。' : ''
  await ElMessageBox.alert(
    `${message || '已创建建议草稿，可继续编辑后再用于投递或匹配。'}${warningText}${draftText}`,
    '应用建议',
    { type: warnings?.length ? 'warning' : 'success' }
  )
}

const handleApplyOptimizeResult = async () => {
  if (!optimizeDetail.value || !canApplyOptimizeResult.value) {
    ElMessage.warning(applyOptimizeDisabledReason.value || '仅成功的优化记录可应用')
    return
  }
  const selectedSuggestions = getSelectedOptimizeSuggestions()
  const selectedFields = selectedSuggestions
    .map(({ item }) => getOptimizeSuggestionFieldKey(item))
    .filter((field): field is string => Boolean(field))
  const confirmed = await confirmDangerActionPreview({
    title: '应用建议',
    action: '应用选中的 AI 建议并创建建议草稿',
    target: `${form.resumeName || '当前简历'}，${selectedSuggestions.length} 个字段建议`,
    impact: '会创建一份新的建议草稿，不会覆盖当前正在编辑的简历；草稿内容仍需要你人工检查后再用于投递或匹配。',
    rollback: '当前简历不会被修改；如果草稿不合适，可以继续编辑原简历或删除草稿。',
    audit: '优化记录、选中字段和建议草稿记录会保留。',
    tips: ['确认建议没有夸大经历或编造项目结果。', '确认需要先创建草稿再继续人工编辑。'],
    confirmButtonText: '创建草稿'
  })
  if (!confirmed) return
  applyingOptimize.value = true
  try {
    const result = await applyResumeOptimizeResultApi(optimizeDetail.value.optimizeRecordId, {
      applyMode: 'CREATE_DRAFT',
      selectedSuggestionIndexes: selectedSuggestions.map(({ index }) => index),
      selectedFields
    })
    gameProfile?.grantXpOnce(
      'resume_section',
      `resume:optimize-apply:${optimizeDetail.value.optimizeRecordId}`
    )
    await showApplyResultMessage(result.message, result.warnings, result.newResumeId)
    if (result.newResumeId) {
      await router.push(`/resumes/${result.newResumeId}/edit`)
    } else {
      await reloadCurrentResume()
    }
  } finally {
    applyingOptimize.value = false
  }
}

const ensureStableVersionAfterSave = async (
  savedResumeId: number,
  forceCreate: boolean,
  isCurrentOperation: () => boolean
) => {
  try {
    if (!isCurrentOperation()) return null
    const shouldCreate = forceCreate
      || (await getResumeVersionsApi(savedResumeId)).length === 0
    if (!isCurrentOperation()) return null
    if (shouldCreate) {
      await createResumeVersionApi(savedResumeId, { sourceType: 'MANUAL_SAVE' })
      if (!isCurrentOperation()) return null
    }
    return true
  } catch {
    if (!isCurrentOperation()) return null
    ElMessage.warning('简历已保存，但稳定版本生成失败。请刷新后重试，正式导出仍会使用最近一次稳定版本。')
    return false
  }
}

const handleSave = async () => {
  if (saving.value || !formRef.value) return
  const operationGeneration = ++resumeSaveOperationGeneration
  const requestGeneration = resumeLoadGeneration
  const editingResumeId = resumeId.value
  const formSnapshot: ResumeCreateDTO = { ...form }
  const draftProjectsSnapshot = projects.value
    .filter((project) => project.projectId < 0)
    .map((project) => ({ ...project }))
  const shouldCreateVersion = hasUnsavedResumeChanges.value
  const isCurrentOperation = () => (
    operationGeneration === resumeSaveOperationGeneration
    && isCurrentResumeRoute(requestGeneration, editingResumeId)
  )

  saving.value = true
  try {
    try {
      await formRef.value.validate()
    } catch {
      return
    }
    if (!isCurrentOperation()) return

    if (editingResumeId) {
      await updateResumeApi(editingResumeId, formSnapshot)
      if (!isCurrentOperation()) return
      if (formSnapshot.isDefault === 1) {
        await setDefaultResumeApi(editingResumeId)
        if (!isCurrentOperation()) return
      }
      const stableVersionReady = await ensureStableVersionAfterSave(
        editingResumeId,
        shouldCreateVersion,
        isCurrentOperation
      )
      if (stableVersionReady === null || !isCurrentOperation()) return
      ElMessage.success(stableVersionReady ? '简历与稳定版本已保存' : '简历已保存')
      await reloadCurrentResume()
      if (!isCurrentOperation()) return
      deliveryRefreshKey.value += 1
    } else {
      const created = await createResumeApi(formSnapshot)
      if (!isCurrentOperation()) return
      const projectResult = await persistDraftProjects(
        created.id,
        draftProjectsSnapshot,
        isCurrentOperation
      )
      if (projectResult.stale || !isCurrentOperation()) return
      if (projectResult.failedCount) {
        ElMessage.warning(`简历已创建，${projectResult.failedCount} 条项目草稿保存失败，请在编辑页补充。`)
      }
      if (formSnapshot.isDefault === 1) {
        await setDefaultResumeApi(created.id)
        if (!isCurrentOperation()) return
      }
      const stableVersionReady = await ensureStableVersionAfterSave(
        created.id,
        true,
        isCurrentOperation
      )
      if (stableVersionReady === null || !isCurrentOperation()) return
      ElMessage.success(stableVersionReady ? '简历与初始稳定版本已创建' : '简历已创建')
      await router.replace(`/resumes/${created.id}/edit`)
    }
  } finally {
    if (operationGeneration === resumeSaveOperationGeneration) {
      saving.value = false
    }
  }
}

const openProjectDialog = (project?: ResumeProjectVO) => {
  editingProjectId.value = project?.projectId || null
  editingProject.value = project || null
  projectDialogVisible.value = true
}

const openProjectEvidenceCreate = (project: ResumeProjectVO) => {
  if (!resumeId.value || !project.projectId) return
  router.push({
    path: '/project-evidence/create',
    query: {
      sourceResumeId: String(resumeId.value),
      sourceResumeProjectId: String(project.projectId)
    }
  })
}

const handleSaveProject = async () => {
  if (projectSaving.value || !projectFormRef.value) return
  const operationGeneration = ++projectWriteOperationGeneration
  const requestGeneration = resumeLoadGeneration
  const targetResumeId = resumeId.value
  const targetProjectId = editingProjectId.value
  const projectsSnapshot = projects.value.map((project) => ({ ...project }))
  const isCurrentOperation = () => (
    operationGeneration === projectWriteOperationGeneration
    && isCurrentResumeRoute(requestGeneration, targetResumeId)
  )

  projectSaving.value = true
  try {
    const payload = (await projectFormRef.value.validate().catch(() => false)) as ResumeProjectDTO | false
    if (!payload || !isCurrentOperation()) return
    const projectPayload = { ...payload }
    if (!targetResumeId) {
      const projectId = targetProjectId || -Date.now()
      const draftProject = toProjectDraft(projectPayload, projectId)
      if (targetProjectId) {
        projects.value = projectsSnapshot.map((project) => (
          project.projectId === targetProjectId ? draftProject : project
        ))
      } else {
        projects.value = [...projectsSnapshot, draftProject]
      }
      ElMessage.success('项目草稿已加入，保存简历后会一起创建')
      projectDialogVisible.value = false
      editingProjectId.value = null
      editingProject.value = null
      return
    }
    if (targetProjectId) {
      await updateResumeProjectApi(targetResumeId, targetProjectId, projectPayload)
    } else {
      await createResumeProjectApi(targetResumeId, projectPayload)
    }
    if (!isCurrentOperation()) return
    ElMessage.success('项目经历已保存')
    projectDialogVisible.value = false
    editingProjectId.value = null
    editingProject.value = null
    await reloadCurrentResume()
  } catch (err) {
    if (isCurrentOperation()) {
      ElMessage.error(getErrorMessage(err, '项目经历保存失败，请检查必填项后重试'))
    }
  } finally {
    if (operationGeneration === projectWriteOperationGeneration) {
      projectSaving.value = false
    }
  }
}

const handleDeleteProject = async (project: ResumeProjectVO) => {
  if (projectSaving.value) return
  const operationGeneration = ++projectWriteOperationGeneration
  const requestGeneration = resumeLoadGeneration
  const targetResumeId = resumeId.value
  const projectSnapshot = { ...project }
  const projectsSnapshot = projects.value.map((item) => ({ ...item }))
  const isCurrentOperation = () => (
    operationGeneration === projectWriteOperationGeneration
    && isCurrentResumeRoute(requestGeneration, targetResumeId)
  )

  if (!targetResumeId) {
    if (!isCurrentOperation()) return
    projects.value = projectsSnapshot.filter((item) => item.projectId !== projectSnapshot.projectId)
    ElMessage.success('项目草稿已移除')
    return
  }
  projectSaving.value = true
  try {
    const confirmed = await confirmDangerActionPreview({
      title: '删除项目经历',
      action: '删除该简历中的项目经历',
      target: projectSnapshot.projectName || '项目经历',
      impact: '该项目经历会从当前简历中移除，后续简历匹配、面试追问和推荐任务将不再把它作为证据。',
      rollback: '系统不会自动恢复已删除项目；如误删，需要重新录入项目经历。',
      audit: '删除操作会记录当前账号、简历和项目经历。',
      tips: ['确认这段项目经历不再用于证明目标岗位能力。', '确认删除后仍有足够项目证据支撑简历。'],
      confirmButtonText: '确认删除'
    })
    if (!confirmed || !isCurrentOperation()) return
    await deleteResumeProjectApi(targetResumeId, projectSnapshot.projectId)
    if (!isCurrentOperation()) return
    ElMessage.success('项目经历已删除')
    await reloadCurrentResume()
  } finally {
    if (operationGeneration === projectWriteOperationGeneration) {
      projectSaving.value = false
    }
  }
}

watch(
  [selectedResumeTemplateCode, previewAccent, previewZoom],
  persistPreviewPreferences
)

watch(
  resumeId,
  (nextResumeId) => {
    const requestGeneration = ++resumeLoadGeneration
    resetRouteState()
    loadPreviewPreferences()
    if (!nextResumeId) return
    loading.value = true
    void fetchDetail(nextResumeId, requestGeneration)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  resumeLoadGeneration += 1
  resumeSaveOperationGeneration += 1
  projectWriteOperationGeneration += 1
})
</script>

<style scoped lang="scss">
.resume-editor {
  --resume-template-paper: #ffffff;
  --resume-paper-border: #d4dbe4;
  --resume-paper-line: #9aa7b5;
  --resume-paper-ocean: #1779a7;
  --resume-paper-teal: #0b7669;
  --resume-paper-graphite: #3f4b59;
  --resume-paper-berry: #a23b55;
  --resume-paper-project: #255da8;
  --resume-paper-project-soft: #eef4fb;
  --resume-preview-top: 84px;
  --resume-preview-bottom-gap: max(16px, env(safe-area-inset-bottom, 0px));
  --resume-preview-viewport-height: calc(100dvh - var(--resume-preview-top) - var(--resume-preview-bottom-gap));
  --resume-surface: var(--user-surface);
  --resume-surface-soft: var(--user-surface-muted);
  --resume-border: var(--user-border);
  --resume-border-strong: var(--user-primary-border);
  --resume-text: var(--user-text);
  --resume-muted: var(--user-text-muted);
  --resume-subtle: var(--user-text-subtle);
  --resume-primary: var(--user-primary);
  --resume-ai: var(--user-ai);
  --resume-success: var(--user-success);
  --resume-warning: var(--user-warning);
  --resume-danger: var(--user-danger);
  gap: var(--user-space-4);
  min-width: 0;
  min-height: 100%;
  color: var(--resume-text);
  background: transparent;
}

.resume-editor-state {
  padding-block: 64px;
}

.resume-editor-state__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.editor-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--user-space-4);
  padding: 18px 20px;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-md);
  background: var(--user-surface);

  h1 {
    margin: 7px 0 0;
    color: var(--user-text);
    font-size: 26px;
    letter-spacing: 0;
    line-height: 1.25;
  }

  p {
    max-width: 680px;
    margin: 7px 0 0;
    color: var(--user-text-muted);
    font-size: 13px;
    line-height: 1.6;
  }
}

.hero-kicker,
.hero-actions,
.hero-status,
.workspace-tabs,
.section-heading,
.section-heading__left,
.section-icon,
.block-head,
.switch-line,
.form-actions,
.project-card,
.project-card__top,
.project-actions,
.completion-head,
.completion-list span,
.capability-item,
.preview-toolbar,
.paper-contact,
.paper-project__head,
.full-button {
  display: flex;
  align-items: center;
}

.hero-kicker {
  gap: 8px;
  color: var(--user-primary);
  font-size: 12px;
  font-weight: 700;
}

.hero-status {
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;

  span {
    padding: 4px 8px;
    border: 1px solid var(--user-border);
    border-radius: 999px;
    background: var(--user-control-bg);
    color: var(--user-text-secondary);
    font-size: 12px;
  }
}

.hero-actions {
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.workspace-tabs {
  display: none;
  gap: 6px;
  overflow-x: auto;
  padding: 6px;
  border: 1px solid var(--resume-border);
  border-radius: 8px;
  background: var(--user-surface);

  button {
    flex: 1 0 auto;
    min-width: 74px;
    padding: 8px 10px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--resume-muted);
    font-size: 13px;
    text-align: center;
    cursor: pointer;

    &.active {
      background: var(--resume-primary);
      color: var(--user-primary-contrast);
      font-weight: 700;
    }
  }
}

.mobile-feedback-details {
  display: none;
}

.live-feedback-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  overflow: hidden;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-md);
  background: var(--user-surface-muted);

  article {
    min-width: 0;
    padding: 12px 14px;
    border-right: 1px solid var(--user-border);

    &:last-child {
      border-right: 0;
    }

    &.is-good span {
      color: var(--user-success);
    }

    &.is-warning span {
      color: var(--user-warning);
    }
  }

  span,
  strong,
  p {
    display: block;
    overflow-wrap: anywhere;
  }

  span {
    color: var(--user-primary);
    font-size: 12px;
    font-weight: 700;
  }

  strong {
    margin-top: 4px;
    color: var(--resume-text);
    line-height: 1.45;
  }

  p {
    margin: 4px 0 0;
    color: var(--resume-muted);
    font-size: 12px;
    line-height: 1.5;
  }
}

.editor-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(520px, 1.05fr);
  gap: var(--user-space-4);
  align-items: start;
  min-width: 0;
}

.editor-column {
  gap: var(--user-space-3);
  min-width: 0;
}

.editor-main {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.editor-main > .edit-card,
.editor-main > .project-section {
  grid-column: 1 / -1;
}

.editor-aside {
  position: static;
  grid-column: 1;
  grid-row: 2;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  align-items: start;
}

.editor-section {
  padding: var(--user-space-4);
}

.content-card,
.preview-column,
.side-panel {
  border: 1px solid var(--resume-border);
  border-radius: 8px;
  background: var(--resume-surface);
  box-shadow: none;
}

.panel-kicker {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  color: var(--resume-primary);
  font-size: 12px;
  font-weight: 800;
}

.ai-writing-card {
  border-color: var(--user-primary-border);
  background: var(--user-surface-tint);
}

.prompt-list,
.section-nav,
.diagnostic-list,
.evidence-list,
.gap-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.prompt-card,
.section-nav button {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--resume-border);
  border-radius: 8px;
  background: var(--user-control-bg);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease;

  &:hover {
    border-color: var(--user-primary-border);
    background: var(--user-surface-raised);
  }
}

.prompt-card {
  display: grid;
  gap: 4px;
  padding: 10px;

  span {
    color: var(--user-ai);
    font-size: 12px;
    font-weight: 800;
  }

  strong {
    color: var(--resume-text);
    line-height: 1.45;
  }

  small {
    color: var(--resume-muted);
    line-height: 1.55;
  }
}

.section-nav {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.section-nav button,
.diagnostic-list span {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  padding: 9px;
  color: var(--resume-muted);
  font-size: 12px;
  font-weight: 700;

  &.done {
    color: var(--resume-success);
    background: var(--user-success-soft);
  }
}

.section-heading {
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 14px;

  h2 {
    margin: 0;
    color: var(--resume-text);
    font-size: 18px;
  }

  p {
    margin: 7px 0 0;
    color: var(--resume-muted);
    font-size: 13px;
    line-height: 1.6;
  }
}

.section-heading.compact {
  margin-bottom: 12px;
}

.section-heading__left {
  align-items: flex-start;
  gap: 12px;
}

.section-icon {
  flex: 0 0 auto;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--user-primary-border);
  border-radius: 8px;
  background: var(--user-primary-soft);
  color: var(--resume-primary);
}

.resume-form {
  :deep(.el-form-item) {
    margin-bottom: 14px;
  }
}

.editor-block {
  padding: 14px 0 2px;
  border-top: 1px solid var(--resume-border);
  scroll-margin-top: 92px;

  & + .editor-block {
    margin-top: 4px;
  }
}

.block-head {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;

  span {
    color: var(--user-text-secondary);
    font-size: 14px;
    font-weight: 800;
  }
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.section-divider {
  height: 1px;
  margin: 8px 0 22px;
  background: var(--user-border);
}

.switch-line {
  min-height: 32px;
  gap: 10px;
  color: var(--resume-muted);
  font-size: 13px;
}

.form-actions {
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
}

.project-header {
  justify-content: space-between;
}

.project-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.project-empty {
  padding: 28px 18px;
  border: 1px dashed var(--resume-border-strong);
  border-radius: 8px;
  color: var(--resume-muted);
  text-align: center;
  background: var(--user-primary-faint);

  h3 {
    margin: 14px 0 0;
    color: var(--resume-text);
    font-size: 18px;
  }

  p {
    margin: 8px 0 0;
  }
}

.project-card {
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 0;
  border: 1px solid var(--resume-border);
  border-radius: 8px;
  background: var(--user-surface-muted);
}

.project-card__main {
  min-width: 0;
  overflow-wrap: anywhere;
}

.project-card__top {
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  h3 {
    margin: 0;
    color: var(--user-text);
    font-size: 16px;
  }

  span {
    flex: 0 0 auto;
    color: var(--resume-muted);
    font-size: 12px;
  }
}

.project-meta,
.project-desc {
  margin: 8px 0 0;
  color: var(--resume-muted);
  font-size: 13px;
  line-height: 1.6;
}

.project-desc {
  color: var(--user-text-secondary);
}

.project-actions {
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 8px;
}

.preview-column {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: var(--resume-preview-viewport-height);
  max-height: var(--resume-preview-viewport-height);
  overflow: visible;
  position: sticky;
  top: var(--resume-preview-top);
  padding: 14px;
  border-color: var(--user-border);
  background: var(--user-bg-panel);
}

.preview-toolbar {
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;

  h2 {
    margin: 0;
    color: var(--user-text);
    font-size: 18px;
  }

  p {
    margin: 6px 0 0;
    color: var(--user-text-muted);
    font-size: 12px;
  }
}

.preview-toolbar__status {
  flex: 0 0 auto;
}

.preview-customizer {
  display: grid;
  gap: 10px;
  margin-bottom: 12px;
}

.template-selector {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;

  > button {
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
    min-width: 0;
    padding: 8px;
    border: 1px solid var(--user-border);
    border-radius: 8px;
    background: var(--user-control-bg);
    color: var(--user-text-secondary);
    text-align: left;
    cursor: pointer;
    transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease;

    &:hover {
      border-color: var(--user-primary-border);
      background: var(--user-surface-raised);
    }

    &:focus-visible {
      outline: 2px solid var(--user-primary);
      outline-offset: 2px;
    }

    &.active {
      border-color: var(--user-primary-border);
      background: var(--user-primary-soft);
      color: var(--user-text);
    }

    &.locked {
      cursor: not-allowed;
      opacity: 0.58;

      &:hover {
        border-color: var(--user-border);
        background: var(--user-control-bg);
      }
    }

    > span:nth-child(2) {
      min-width: 0;
    }

    strong,
    small {
      display: block;
    }

    strong {
      color: inherit;
      font-size: 12px;
    }

    small {
      margin-top: 3px;
      overflow: hidden;
      color: var(--user-text-muted);
      font-size: 10px;
      line-height: 1.35;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    > svg {
      color: var(--user-primary);
    }
  }
}

.template-thumb {
  display: grid;
  align-content: start;
  gap: 3px;
  width: 38px;
  height: 48px;
  padding: 6px 5px;
  border: 1px solid var(--resume-paper-border);
  border-radius: 3px;
  background: var(--resume-template-paper);

  &::before,
  i {
    display: block;
    height: 2px;
    background: var(--resume-paper-line);
    content: "";
  }

  &::before {
    width: 58%;
    height: 4px;
    background: var(--resume-paper-ocean);
  }

  i:nth-child(2) {
    width: 78%;
  }

  i:nth-child(3) {
    width: 62%;
  }

  &.is-compact {
    gap: 2px;

    &::before {
      width: 46%;
      height: 3px;
      background: var(--resume-paper-graphite);
    }
  }

  &.is-project {
    padding-top: 9px;
    background: var(--resume-paper-project-soft);

    &::before {
      width: 82%;
      background: var(--resume-paper-project);
    }
  }

  &.is-classic {
    padding: 5px;
    background: linear-gradient(90deg, #2d3748 0 32%, var(--resume-template-paper) 32% 100%);

    &::before,
    i {
      margin-left: 14px;
      background: var(--resume-paper-line);
    }

    &::before {
      background: #e2e8f0;
    }
  }

  &.is-streak {
    background: repeating-linear-gradient(
      135deg,
      #f4f6f4,
      #f4f6f4 6px,
      #edf1ed 6px,
      #edf1ed 12px
    );

    &::before {
      background: var(--user-warning);
    }
  }
}

.preview-controls,
.accent-control,
.accent-swatches,
.zoom-control {
  display: flex;
  align-items: center;
}

.preview-controls {
  justify-content: space-between;
  gap: 12px;
  min-height: 34px;
}

.accent-control {
  gap: 9px;

  > span {
    color: var(--user-text-muted);
    font-size: 11px;
  }
}

.accent-swatches {
  gap: 6px;

  button {
    width: 24px;
    height: 24px;
    border: 3px solid var(--user-bg-panel);
    border-radius: 50%;
    background: var(--resume-paper-ocean);
    box-shadow: 0 0 0 1px var(--user-border);
    cursor: pointer;

    &.is-teal {
      background: var(--resume-paper-teal);
    }

    &.is-graphite {
      background: var(--resume-paper-graphite);
    }

    &.is-berry {
      background: var(--resume-paper-berry);
    }

    &.active {
      box-shadow: 0 0 0 2px var(--user-primary);
    }

    &:focus-visible {
      outline: 2px solid var(--user-primary);
      outline-offset: 2px;
    }
  }
}

.zoom-control {
  height: 32px;
  overflow: hidden;
  border: 1px solid var(--user-border);
  border-radius: 7px;
  background: var(--user-control-bg);

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 30px;
    border: 0;
    background: transparent;
    color: var(--user-text-muted);
    cursor: pointer;

    &:hover:not(:disabled) {
      background: var(--user-primary-soft);
      color: var(--user-primary);
    }

    &:disabled {
      color: var(--user-disabled);
      cursor: not-allowed;
    }
  }

  span {
    min-width: 48px;
    color: var(--user-text-secondary);
    font-size: 11px;
    text-align: center;
  }
}

.resume-paper-wrap {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  justify-content: center;
  max-height: none;
  min-height: 0;
  padding: 18px;
  overflow: auto;
  overscroll-behavior: contain;
  scroll-padding: 18px;
  scrollbar-gutter: stable both-edges;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-bg);
}

.resume-paper-stage {
  display: flex;
  justify-content: center;
  width: 100%;
  min-width: 0;
}

.side-panel {
  min-width: 0;
  padding: 14px;

  h3 {
    margin: 0 0 8px;
    color: var(--resume-text);
    font-size: 16px;
  }

  p {
    margin: 8px 0 0;
    color: var(--resume-muted);
    font-size: 13px;
    line-height: 1.7;
  }

  ul {
    margin: 8px 0 0;
    padding-left: 18px;
    color: var(--resume-muted);
    font-size: 13px;
    line-height: 1.8;
  }
}

.completion-head {
  justify-content: space-between;
  margin-bottom: 12px;

  span {
    color: var(--resume-muted);
    font-size: 13px;
  }

  strong {
    color: var(--resume-primary);
    font-size: 20px;
  }
}

.completion-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  margin-top: 16px;

  span {
    gap: 6px;
    color: var(--resume-muted);
    font-size: 12px;
  }

  .done {
    color: var(--resume-success);
  }
}

.diagnostic-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.diagnostic-list span {
  border: 1px solid var(--resume-border);
  border-radius: 8px;
  background: var(--user-control-bg);
}

.jd-match-panel {
  border-color: var(--user-primary-border);
}

.evidence-panel {
  border-color: var(--user-success-border);
}

.evidence-list div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--resume-border);

  &:last-child {
    border-bottom: 0;
  }

  span {
    color: var(--resume-muted);
    font-size: 12px;
  }

  strong {
    color: var(--resume-text);
    font-size: 13px;
    text-align: right;
  }

  &.done strong {
    color: var(--resume-success);
  }
}

.gap-panel {
  border-color: var(--user-warning);
  background: var(--user-warning-soft);
}

.gap-list article {
  padding: 10px;
  border: 1px solid var(--user-warning);
  border-radius: 8px;
  background: var(--user-control-bg);

  strong {
    display: block;
    color: var(--user-warning);
    font-size: 13px;
    line-height: 1.45;
  }

  p {
    margin: 6px 0 0;
    color: var(--user-text-secondary);
    font-size: 12px;
    line-height: 1.6;
  }
}

.capability-item {
  justify-content: space-between;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--resume-border);
  color: var(--user-text-secondary);
  font-size: 13px;

  &:last-of-type {
    border-bottom: 0;
  }
}

.full-button {
  justify-content: center;
  width: 100%;
  margin-top: 14px;
  gap: 8px;
}

.ai-panel {
  border-color: var(--user-primary-border);
  background: var(--user-surface-tint);
}

.ai-locked-panel {
  background: var(--user-surface-muted);
}

.optimize-form {
  margin-top: 14px;

  :deep(.el-form-item) {
    margin-bottom: 12px;
  }

  :deep(.el-input-number) {
    width: 100%;
  }
}

.optimize-records {
  margin-top: 12px;
  border-top: 1px solid var(--resume-border);
}

.ai-empty {
  margin-top: 14px;
  padding: 12px;
  border: 1px dashed var(--resume-border-strong);
  border-radius: 8px;
  background: var(--user-control-bg);
  color: var(--resume-muted);
  font-size: 12px;
  line-height: 1.6;
}

.sse-progress {
  margin-top: 14px;
  padding: 12px;
  border: 1px solid var(--user-primary-border);
  border-radius: 8px;
  background: var(--user-ai-soft);

  p {
    margin: 8px 0 0;
    color: var(--user-text-secondary);
    font-size: 12px;
    line-height: 1.6;
  }
}

.sse-progress__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--user-ai);
  font-size: 13px;
  font-weight: 700;
}

.sse-progress__hint {
  color: var(--user-text-secondary);
}

.sse-progress__action {
  margin-top: 8px;
  padding-left: 0;
}

.sse-progress__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;

  span {
    color: var(--resume-muted);
    font-size: 12px;
    line-height: 1.5;
  }
}

.record-row {
  display: block;
  width: 100%;
  padding: 10px 0;
  border: 0;
  border-bottom: 1px solid var(--resume-border);
  background: transparent;
  color: var(--resume-text);
  text-align: left;
  cursor: pointer;

  span,
  small {
    display: block;
  }

  span {
    color: var(--user-text-secondary);
    font-size: 13px;
  }

  small {
    margin-top: 4px;
    color: var(--resume-muted);
  }
}

.optimize-result {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid var(--user-primary-border);
  border-radius: 8px;
  background: var(--user-control-bg);

  > p {
    margin: 8px 0 0;
    color: var(--user-text-secondary);
  }
}

.score-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  span {
    color: var(--resume-muted);
    font-size: 13px;
  }

  strong {
    color: var(--resume-ai);
    font-size: 22px;
  }
}

.rewrite-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;

  article {
    padding: 10px;
    border: 1px solid var(--resume-border);
    border-radius: 8px;
    background: var(--resume-surface-soft);
  }

  span {
    color: var(--user-text-secondary);
    font-size: 12px;
    font-weight: 700;
  }

  p {
    margin: 6px 0 0;
    color: var(--resume-muted);
    font-size: 12px;
    line-height: 1.6;
  }
}

.rewrite-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
  color: var(--resume-muted);
  font-size: 12px;
}

.rewrite-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  :deep(.el-checkbox__label) {
    color: var(--user-text-secondary);
    font-weight: 700;
  }
}

.rewrite-diff {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 8px;

  div {
    min-width: 0;
    padding: 9px;
    border: 1px solid var(--resume-border);
    border-radius: 8px;
    background: var(--user-bg-panel);
  }
}

.rewrite-reason {
  color: var(--user-text-secondary) !important;
}

@media (max-width: 1260px) {
  .editor-workspace {
    grid-template-columns: minmax(0, 1fr) minmax(440px, 1fr);
  }

  .editor-aside {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }

  .template-selector {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1020px) {
  .workspace-tabs {
    display: flex;
    position: sticky;
    top: 0;
    z-index: 5;
  }

  .editor-workspace {
    display: block;
  }

  .mobile-pane-edit,
  .mobile-pane-preview,
  .mobile-pane-advice {
    display: none;
  }

  .is-mobile-edit .mobile-pane-edit,
  .is-mobile-advice .mobile-pane-advice {
    display: grid;
  }

  .is-mobile-preview .mobile-pane-preview {
    display: flex;
  }

  .preview-column {
    position: static;
    height: min(780px, calc(100dvh - 160px));
    max-height: min(780px, calc(100dvh - 160px));
    overflow: visible;
  }

  .resume-paper-wrap {
    flex: 1 1 auto;
    min-height: 0;
  }

  .editor-aside {
    grid-column: auto;
    grid-row: auto;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .live-feedback-strip {
    grid-template-columns: 1fr;

    article {
      border-right: 0;
      border-bottom: 1px solid var(--user-border);

      &:last-child {
        border-bottom: 0;
      }
    }
  }
}

@media (max-width: 760px) {
  .resume-editor {
    padding: 0;
  }

  .editor-hero {
    padding: 14px;

    > div:first-child > p,
    .hero-status {
      display: none;
    }

    h1 {
      font-size: 21px;
    }
  }

  .live-feedback-strip {
    display: none;
  }

  .mobile-feedback-details {
    display: block;
    border: 1px solid var(--user-border);
    border-radius: 8px;
    background: var(--user-surface);

    summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      min-height: 44px;
      padding: 10px 12px;
      color: var(--user-text-secondary);
      cursor: pointer;

      span {
        font-weight: 700;
      }

      strong {
        color: var(--user-primary);
        font-size: 12px;
      }
    }

    > div {
      display: grid;
      gap: 0;
      border-top: 1px solid var(--user-border);
    }

    article {
      padding: 10px 12px;
      border-bottom: 1px solid var(--user-border);

      &:last-child {
        border-bottom: 0;
      }

      span,
      strong,
      p {
        display: block;
      }

      span {
        color: var(--user-primary);
        font-size: 11px;
      }

      strong {
        margin-top: 3px;
        color: var(--user-text);
        font-size: 13px;
      }

      p {
        margin: 4px 0 0;
        color: var(--user-text-muted);
        font-size: 12px;
        line-height: 1.5;
      }
    }
  }

  .editor-hero,
  .project-header,
  .project-card,
  .project-card__top,
  .preview-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero-actions {
    justify-content: flex-start;
  }

  .editor-main,
  .editor-aside,
  .form-grid,
  .completion-list,
  .diagnostic-list,
  .section-nav,
  .rewrite-diff {
    grid-template-columns: 1fr;
  }

  .editor-main > .edit-card {
    order: -3;
  }

  .editor-main > .ai-writing-card {
    order: -2;
  }

  .editor-main > .section-nav-card {
    order: -1;
  }

  .editor-section,
  .preview-column,
  .side-panel {
    padding: 12px;
  }

  .resume-paper-wrap {
    padding: 8px;
  }

  .preview-controls {
    align-items: flex-start;
    flex-direction: column;
  }

  .project-actions,
  .hero-actions {
    width: 100%;

    .el-button {
      flex: 1 1 140px;
      margin-left: 0;
    }
  }

  .resume-project-dialog {
    :deep(.el-dialog) {
      width: calc(100vw - 24px) !important;
      max-width: none;
    }
  }
}

// 方向 D · 简历工坊适配。保留原有编辑、AI 建议和导出链路，只重塑工作台层级。
.arena-resume-studio {
  width: min(1060px, 100%);
  margin: 0 auto;
  padding: 28px 24px 46px;
  gap: 16px;

  .editor-hero {
    border: 1.5px solid #b9e7cd;
    border-radius: var(--arena-radius-card);
    background: linear-gradient(135deg, #effcf4, #ffffff 70%);
    box-shadow: 0 2px 4px rgba(21, 33, 27, 0.04);

    h1 {
      font-size: 28px;
      font-weight: 900;
    }
  }

  .hero-kicker,
  .panel-kicker,
  .eyebrow {
    color: var(--arena-grn-d);
  }

  .hero-status span,
  .template-selector button,
  .section-nav button,
  .prompt-card,
  .diagnostic-list span,
  .evidence-list > div,
  .gap-list article,
  .completion-list span {
    border-color: var(--arena-line);
    border-radius: 13px;
  }

  .hero-status span {
    background: var(--arena-grn-soft);
    color: var(--arena-grn-d);
    font-weight: 800;
  }

  .live-feedback-strip,
  .content-card,
  .preview-column,
  .side-panel {
    border: 1.5px solid var(--arena-line);
    border-radius: var(--arena-radius-card);
    box-shadow: 0 2px 4px rgba(21, 33, 27, 0.04);
  }

  .live-feedback-strip {
    background: #ffffff;

    article {
      padding: 14px 16px;
    }
  }

  .editor-workspace {
    grid-template-columns: 206px minmax(0, 1fr) minmax(300px, 0.84fr);
    gap: 18px;
  }

  .editor-main {
    grid-column: 2;
    grid-row: 1;
    grid-template-columns: 1fr;
  }

  .preview-column {
    grid-column: 3;
    grid-row: 1 / span 2;
    position: sticky;
    top: 18px;
    align-self: start;
  }

  .editor-aside {
    grid-column: 1;
    grid-row: 1;
    grid-template-columns: 1fr;
    position: sticky;
    top: 18px;

    > .side-panel {
      padding: 14px;
    }
  }

  .section-heading h2,
  .preview-toolbar h2 {
    font-weight: 900;
  }

  .section-icon {
    border-radius: 12px;
  }

  .ai-writing-card {
    border-color: #d7ccff;
    background: linear-gradient(135deg, var(--arena-vio-soft), #ffffff 75%);
  }

  .template-selector {
    gap: 10px;
  }

  .template-selector button {
    min-width: 0;
    padding: 9px;
    background: #ffffff;

    &.active {
      border-color: var(--arena-grn);
      background: var(--arena-grn-soft);
      box-shadow: 0 0 0 3px rgba(23, 178, 106, 0.1);
    }
  }

  .preview-column {
    background: linear-gradient(180deg, #ffffff, #f9fcf9);
  }

  .resume-paper-wrap {
    background: #f2f5f2;
    border-radius: 14px;
  }

  :deep(.el-button--primary) {
    border-color: var(--arena-grn);
    background: var(--arena-grn);
    box-shadow: 0 4px 0 var(--arena-grn-d);
    font-weight: 800;
  }

  :deep(.el-button--primary:hover) {
    border-color: var(--arena-grn);
    background: var(--arena-grn);
    transform: translateY(-1px);
  }

  :deep(.el-input__wrapper),
  :deep(.el-textarea__inner),
  :deep(.el-select__wrapper) {
    border-radius: 13px;
    box-shadow: 0 0 0 1.5px var(--arena-line) inset;
  }

  :deep(.el-input__wrapper.is-focus),
  :deep(.el-textarea__inner:focus),
  :deep(.el-select__wrapper.is-focused) {
    box-shadow: 0 0 0 2px var(--arena-grn) inset;
  }
}

@media (max-width: 1180px) {
  .arena-resume-studio {
    .editor-workspace {
      grid-template-columns: minmax(0, 1fr) minmax(310px, 0.8fr);
    }

    .editor-main {
      grid-column: 1;
    }

    .preview-column {
      grid-column: 2;
    }

    .editor-aside {
      position: static;
      grid-column: 1 / -1;
      grid-row: 2;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
}

@media (max-width: 820px) {
  .arena-resume-studio {
    padding: 16px 14px calc(28px + var(--user-mobile-nav-height, 0px));

    .editor-workspace {
      grid-template-columns: 1fr;
    }

    .editor-main,
    .preview-column,
    .editor-aside {
      position: static;
      grid-column: auto;
      grid-row: auto;
    }

    .editor-aside {
      grid-template-columns: 1fr;
    }

    .preview-column {
      order: 2;
    }
  }
}
</style>
