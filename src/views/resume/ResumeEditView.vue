<template>
  <div class="arena resume-workbench-page resume-editor page-shell">
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
        <el-button @click="router.push('/resumes')">返回简历管理</el-button>
        <el-button type="primary" @click="reloadCurrentResume">重试</el-button>
      </div>
    </AppState>

    <template v-else>
    <ResumeWorkbenchTopbar
      :title="form.resumeName?.trim() || '未命名简历'"
      :save-state="documentSaveStatus"
      :completion="completion"
      :has-started="hasResumeContentStarted"
      :saving="saving"
      :is-edit="isEdit"
      :can-undo="resumeHistory.canUndo.value"
      :can-redo="resumeHistory.canRedo.value"
      :template-label="selectedResumeTemplateLabel"
      :inspector-mode="inspectorMode"
      :active-step="activeWorkbenchStep"
      @back="router.push('/resumes')"
      @save="handleSave('complete')"
      @save-draft="handleSave('draft')"
      @open-templates="openTemplateGallery"
      @open-export="openDeliveryChecks"
      @open-preview="openPreviewStep"
      @undo="undoResumeEdit"
      @redo="redoResumeEdit"
      @mode-change="setInspectorMode"
    />

    <ModuleTabs class="resume-workbench-module-tabs" :items="moduleTabs" />

    <div v-if="saveError" class="resume-save-error" role="alert">
      <div>
        <b>简历尚未保存</b>
        <p>{{ saveError }}</p>
      </div>
      <el-button type="primary" plain :loading="saving" @click="handleSave('complete')">重试保存</el-button>
    </div>

    <div class="workspace-tabs" role="tablist" aria-label="移动端简历工作区">
      <button
        type="button"
        role="tab"
        id="resume-tab-edit"
        aria-controls="resume-panel-edit"
        :aria-selected="mobileWorkspaceTab === 'edit'"
        :tabindex="mobileWorkspaceTab === 'edit' ? 0 : -1"
        :class="{ active: mobileWorkspaceTab === 'edit' }"
        @click="selectMobileWorkspaceTab('edit')"
        @keydown="moveMobileWorkspaceTab($event)"
      >
        编辑
      </button>
      <button
        type="button"
        role="tab"
        id="resume-tab-review"
        aria-controls="resume-panel-inspector"
        :aria-selected="mobileWorkspaceTab === 'review'"
        :tabindex="mobileWorkspaceTab === 'review' ? 0 : -1"
        :class="{ active: mobileWorkspaceTab === 'review' }"
        @click="selectMobileWorkspaceTab('review')"
        @keydown="moveMobileWorkspaceTab($event)"
      >
        检查
      </button>
      <button
        type="button"
        role="tab"
        id="resume-tab-ai"
        aria-controls="resume-panel-inspector"
        :aria-selected="mobileWorkspaceTab === 'ai'"
        :tabindex="mobileWorkspaceTab === 'ai' ? 0 : -1"
        :class="{ active: mobileWorkspaceTab === 'ai' }"
        @click="selectMobileWorkspaceTab('ai')"
        @keydown="moveMobileWorkspaceTab($event)"
      >
        AI
      </button>
      <button
        type="button"
        role="tab"
        id="resume-tab-preview"
        aria-controls="resume-panel-preview"
        :aria-selected="mobileWorkspaceTab === 'preview'"
        :tabindex="mobileWorkspaceTab === 'preview' ? 0 : -1"
        :class="{ active: mobileWorkspaceTab === 'preview' }"
        @click="selectMobileWorkspaceTab('preview')"
        @keydown="moveMobileWorkspaceTab($event)"
      >
        预览
      </button>
    </div>

    <ResumeWorkbenchShell
      :mobile-tab="mobileWorkspaceTab"
      :rail-collapsed="railCollapsed"
      :editor-collapsed="editorPanelCollapsed"
      :preview-focus="previewFocusMode"
    >
      <template #rail>
      <ResumeSectionRail
        :items="sectionNavItems"
        :active-id="activeWorkshopModule"
        :collapsed="railCollapsed || previewFocusMode"
        :completion="completion"
        :has-started="hasResumeContentStarted"
        :export-ready-count="exportReadyCount"
        :export-total="exportChecklistItems.length"
        :hidden-ids="hiddenPaneIds"
        :custom-section-quota="customSectionQuota"
        @select="focusSection"
        @add-section="addCustomSectionPane"
        @review="setInspectorMode('review')"
        @move="moveWorkshopModule"
        @toggle-visibility="toggleWorkshopModule"
      />
      </template>
      <template #editor>
      <main
        v-show="inspectorMode === 'edit'"
        id="resume-panel-edit"
        class="editor-column resume-workbench-pane--editor mobile-pane-editor"
        role="tabpanel"
        aria-labelledby="resume-tab-edit"
      >
        <header class="resume-inspector-header">
          <div>
            <span class="resume-inspector-header__eyebrow">当前编辑</span>
            <h1>{{ activeWorkshopModuleMeta.title }}</h1>
            <p>{{ activeWorkshopModuleMeta.description }}</p>
          </div>
          <button
            type="button"
            class="resume-inspector-header__template"
            :aria-label="`打开模板设置，当前模板为 ${selectedResumeTemplateLabel}`"
            @click="openTemplateGallery"
          >
            <LayoutTemplate :size="16" aria-hidden="true" />
            <span>{{ selectedResumeTemplateLabel }}</span>
            <ChevronRight :size="15" aria-hidden="true" />
          </button>
        </header>

        <section
          v-show="!isCustomSectionPane && activeWorkshopModule !== 'resume-projects'"
          class="content-card editor-section edit-card"
          v-loading="loading"
        >
          <el-form
            ref="formRef"
            class="resume-form"
            :model="form"
            :rules="rules"
            :disabled="saving"
            label-position="top"
          >
            <div v-show="activeWorkshopModule === 'resume-basic'" id="resume-basic" class="editor-block">
              <div class="block-head">
                <span>基本信息</span>
                <el-tag size="small" :type="form.resumeName && form.realName ? 'success' : 'warning'" effect="plain">
                  {{ form.resumeName && form.realName ? '可识别' : '待补充' }}
                </el-tag>
              </div>
            <div class="form-grid">
              <el-form-item label="简历名称" prop="resumeName">
                <el-input
                  v-model.trim="form.resumeName"
                  placeholder="例如：Java 后端 3 年经验简历"
                  @update:model-value="clearResolvedValidation('resumeName', $event)"
                />
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

            <div v-show="activeWorkshopModule === 'resume-target'" id="resume-target" class="editor-block">
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

            <div v-show="activeWorkshopModule === 'resume-basic'" id="resume-summary" class="editor-block">
              <div class="block-head">
                <span>个人摘要</span>
                <el-tag size="small" :type="form.summary ? 'success' : 'info'" effect="plain">
                  {{ form.summary ? '已填写' : '可继续补充' }}
                </el-tag>
              </div>
            <el-form-item label="个人摘要">
              <TextBlocksField
                :blocks="summaryBlocks"
                label="个人摘要"
                placeholder="简要说明工作背景、优势方向、项目类型和求职重点"
                @update:blocks="applySummaryBlocks"
              />
            </el-form-item>
            </div>

            <div v-show="activeWorkshopModule === 'resume-skills'" id="resume-skills" class="editor-block">
              <div class="block-head">
                <span>技能关键词</span>
                <el-tag size="small" :type="skillTags.length ? 'success' : 'warning'" effect="plain">
                  {{ skillTags.length ? `${skillTags.length} 个关键词` : '待填写' }}
                </el-tag>
            </div>
            <el-form-item label="核心技术栈" prop="skills">
              <SkillGroupEditor :groups="skillGroups" @update:groups="applySkillGroups" />
            </el-form-item>
            </div>

            <div v-show="activeWorkshopModule === 'resume-experience'" id="resume-experience" class="editor-block">
              <div class="block-head">
                <span>经历与教育</span>
                <el-tag size="small" :type="form.workSummary || form.education ? 'success' : 'info'" effect="plain">
                  {{ form.workSummary || form.education ? '已填写' : '可继续补充' }}
                </el-tag>
            </div>
            <el-form-item label="工作经历 / 工作摘要">
              <EntryItemEditor
                :items="workItems"
                label="工作经历"
                :headings="['公司 / 组织', '职位', '规模、技术栈或地点', '描述这一段的职责与结果']"
                @update:items="(items) => applyEntryItems('experience', items, (value) => { form.workSummary = value })"
              />
            </el-form-item>
            <el-form-item label="教育经历">
              <EntryItemEditor
                :items="educationItems"
                label="教育经历"
                :headings="['学校', '专业与学历', '补充', '主修课程、荣誉等']"
                @update:items="(items) => applyEntryItems('education', items, (value) => { form.education = value })"
              />
            </el-form-item>
            </div>
          </el-form>

          <div class="form-actions">
            <span v-if="!isEdit" class="draft-save-hint">草稿只需名称，其他内容可继续补充</span>
            <el-button @click="router.push('/resumes')">{{ isEdit ? '取消' : '返回简历列表' }}</el-button>
            <el-button :loading="saving" @click="handleSave('draft')">保存草稿</el-button>
            <el-button type="primary" :loading="saving" @click="handleSave('complete')">
              {{ isEdit ? '保存完整简历' : '保存并创建简历' }}
            </el-button>
          </div>
        </section>

        <section
          v-show="activeWorkshopModule === 'resume-projects'"
          id="resume-projects"
          class="content-card editor-section project-section"
        >
          <div class="section-heading project-header">
            <div class="section-heading__left">
              <div class="section-icon">
                <Layers3 :size="18" />
              </div>
              <div>
                <h2>{{ selectedInlineProject ? `项目经历 · ${selectedInlineProject.projectName}` : '项目经历' }}</h2>
                <p>{{ isEdit ? '先补真实背景、技术决策和量化结果，右侧修改会实时同步到预览。' : '创建简历时可先补项目草稿，保存后会自动挂到这份简历下。' }}</p>
              </div>
            </div>
            <div class="project-header__actions">
              <el-button
                v-if="selectedInlineProject"
                :disabled="saving"
                @click="openProjectDialog(selectedInlineProject)"
              >
                <FilePenLine :size="16" />
                完整编辑
              </el-button>
              <el-button type="primary" :disabled="saving" @click="openProjectDialog()">
                <Plus :size="16" />
                {{ isEdit ? '新增项目' : '添加项目草稿' }}
              </el-button>
            </div>
          </div>

          <template v-if="selectedInlineProject">
            <div class="project-switcher" role="tablist" aria-label="选择项目经历">
              <button
                v-for="project in projects"
                :key="project.projectId"
                type="button"
                role="tab"
                :aria-selected="selectedInlineProject.projectId === project.projectId"
                :class="{ active: selectedInlineProject.projectId === project.projectId }"
                @click="selectInlineProject(project.projectId)"
              >
                <span>{{ project.projectName }}</span>
                <small>{{ project.projectTime || project.projectPeriod || '未填写项目时间' }}</small>
              </button>
            </div>

            <el-form class="inline-project-editor" :disabled="saving" label-position="top">
              <div class="inline-project-editor__meta">
                <el-form-item label="项目名称">
                  <el-input
                    :model-value="selectedInlineProject.projectName"
                    placeholder="例如：招聘平台简历解析服务"
                    @update:model-value="setInlineProjectName"
                  />
                </el-form-item>
                <el-form-item label="项目时间">
                  <el-input
                    :model-value="selectedInlineProject.projectTime"
                    placeholder="例如：2024.03 - 2024.08"
                    @update:model-value="setInlineProjectPeriod"
                  />
                </el-form-item>
              </div>

              <ProjectItemEditor
                :fields="inlineProjectFields"
                :label="selectedInlineProject.projectName || '项目经历'"
                :disabled="saving"
                @update:fields="applyProjectFields"
              />
            </el-form>

            <div class="inline-project-skills">
              <span>技术栈</span>
              <div>
                <el-tag
                  v-for="tag in inlineProjectTechTags"
                  :key="tag"
                  size="small"
                  effect="plain"
                >
                  {{ tag }}
                </el-tag>
                <el-button text size="small" @click="openProjectDialog(selectedInlineProject)">
                  {{ inlineProjectTechTags.length ? '编辑技术栈' : '添加技术栈' }}
                </el-button>
              </div>
            </div>

            <section class="workshop-ai-rewrite">
              <div>
                <span>✦ AI 教练 · 改写建议</span>
                <strong>{{ latestOptimizeRecord ? '已生成建议，先核对事实再采纳' : '把结果写成可被验证的证据' }}</strong>
                <p class="workshop-ai-rewrite__before">「{{ inlineProjectOriginalStatement }}」</p>
                <p class="workshop-ai-rewrite__after">{{ inlineProjectSuggestedStatement }}</p>
              </div>
              <div class="workshop-ai-rewrite__actions">
                <el-button
                  v-if="isEdit && resumeId"
                  type="primary"
                  :loading="optimizing"
                  @click="handleOptimizeResume"
                >
                  <Sparkles :size="16" />
                  {{ latestOptimizeRecord ? '查看建议' : '生成建议' }}
                </el-button>
                <el-button v-else type="primary" :loading="saving" @click="handleSave('complete')">
                  <Save :size="16" />
                  保存后生成
                </el-button>
                <el-button :loading="projectSaving" :disabled="saving" @click="handleSaveInlineProject">
                  <Save :size="16" />
                  保存项目
                </el-button>
              </div>
            </section>
          </template>

          <div v-else class="project-list">
            <div class="project-empty">
              <FolderOpen :size="30" />
              <h3>暂无项目经历</h3>
              <p>{{ isEdit ? '项目经历会帮助面试创建页构建更完整的简历上下文。' : '建议至少补一个能讲清背景、职责、技术难点和结果的项目。' }}</p>
              <el-button type="primary" @click="openProjectDialog()">
                <Plus :size="16" />
                添加项目经历
              </el-button>
            </div>
          </div>
        </section>

        <section
          v-for="section in customSections"
          v-show="activeWorkshopModule === section.id"
          :id="section.id"
          :key="section.id"
          class="content-card editor-section custom-section"
        >
          <SectionCard
            :section="section"
            @update:blocks="applyCustomSectionBlocks"
            @update:items="applyCustomSectionItems"
            @rename="renameCustomSection"
            @remove="removeCustomSectionPane"
          />
        </section>
      </main>
      </template>

      <template #preview>
      <section
        id="resume-panel-preview"
        class="resume-workbench-pane--preview content-card mobile-pane-preview"
        role="tabpanel"
        aria-labelledby="resume-tab-preview"
      >
          <div class="preview-toolbar">
            <div>
              <span>文档画布</span>
              <h2>{{ selectedResumeTemplateLabel }}</h2>
            </div>
            <div class="preview-toolbar__actions">
              <button type="button" @click="openTemplateGallery">
                模板
              </button>
              <div class="preview-layout-controls" role="group" aria-label="预览布局控制">
                <button
                  type="button"
                  :aria-label="railCollapsed ? '展开模块导航' : '收起模块导航'"
                  :title="railCollapsed ? '展开模块导航' : '收起模块导航'"
                  @click="railCollapsed = !railCollapsed"
                >
                  <PanelLeftOpen v-if="railCollapsed" :size="15" aria-hidden="true" />
                  <PanelLeftClose v-else :size="15" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  :aria-label="previewFocusMode ? '退出预览聚焦' : '进入预览聚焦'"
                  :title="previewFocusMode ? '退出预览聚焦' : '进入预览聚焦'"
                  @click="previewFocusMode = !previewFocusMode"
                >
                  <Minimize2 v-if="previewFocusMode" :size="15" aria-hidden="true" />
                  <Maximize2 v-else :size="15" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  :aria-label="editorPanelCollapsed ? '展开编辑面板' : '收起编辑面板'"
                  :title="editorPanelCollapsed ? '展开编辑面板' : '收起编辑面板'"
                  @click="editorPanelCollapsed = !editorPanelCollapsed"
                >
                  <PanelRightOpen v-if="editorPanelCollapsed" :size="15" aria-hidden="true" />
                  <PanelRightClose v-else :size="15" aria-hidden="true" />
                </button>
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
            <div class="resume-paper-stage" :style="{ '--resume-preview-zoom': previewZoom }">
              <ResumeDocumentPreview
                :draft="resumeDocumentDraft"
                :template-code="selectedResumeTemplateCode"
                :accent="previewAccent"
                :presentation-config="presentationConfig"
                :density="selectedResumeTemplateCode === 'ATS_COMPACT' ? 'compact' : 'comfortable'"
                :document="resumeDocument.document.value"
              />
            </div>
          </div>
          <div class="resume-preview-actions">
            <el-button @click="openPdfExport">
              <FileCheck2 :size="15" />
              导出 PDF
            </el-button>
            <el-button @click="enlargePreview">
              放大检查
            </el-button>
            <span class="resume-preview-page-chip">A4 预览 · 分页以导出为准</span>
          </div>
      </section>
      </template>

      <template #inspector>
      <aside
        v-show="inspectorMode !== 'edit'"
        id="resume-panel-inspector"
        class="editor-column resume-workbench-pane--inspector mobile-pane-inspector"
        role="tabpanel"
        :aria-labelledby="mobileWorkspaceTab === 'ai' ? 'resume-tab-ai' : 'resume-tab-review'"
      >
        <header class="resume-inspector-heading">
          <div>
            <span>{{ inspectorMode === 'review' ? '简历检查' : 'AI 优化' }}</span>
            <h2>{{ inspectorMode === 'review' ? '发布前复核' : '基于稳定版本生成建议' }}</h2>
          </div>
          <button type="button" @click="setInspectorMode('edit')">返回编辑</button>
        </header>

        <section v-show="inspectorMode === 'review'" class="content-card side-panel readiness-panel">
          <div class="completion-head">
            <span>填写完整度</span>
            <strong>{{ hasResumeContentStarted ? `${completion}%` : '尚未开始' }}</strong>
          </div>
          <el-progress v-if="hasResumeContentStarted" :percentage="completion" :stroke-width="10" :show-text="false" />
          <p>{{ hasResumeContentStarted ? '仅基于当前表单真实填写项计算，不代表 AI 评分。' : '先填写基本信息、求职方向和技术栈，再检查导出准备度。' }}</p>
          <div v-if="hasResumeContentStarted" class="completion-list">
            <span v-for="item in completionItems" :key="item.label" :class="{ done: item.done }">
              <CheckCircle2 v-if="item.done" :size="15" />
              <Circle v-else :size="15" />
              {{ item.label }}
            </span>
          </div>
        </section>

        <section v-show="inspectorMode === 'review'" class="content-card side-panel export-check-panel">
          <div class="completion-head">
            <span>导出前检查 · 启发式</span>
            <strong>{{ hasResumeContentStarted ? `${exportReadyCount}/${exportChecklistItems.length} 通过` : '待填写后检查' }}</strong>
          </div>
          <p>{{ hasResumeContentStarted ? '这里不生成真实 ATS 分数。页数与分页断裂只根据字段长度、段落数量和模板倾向提示，正式结果请以稳定版本工作台的 PDF/DOCX 为准。' : '完成基础填写后，系统会提示缺失信息、页数和分页风险。' }}</p>
          <div v-if="hasResumeContentStarted" class="completion-list export-check-list">
            <article
              v-for="item in exportChecklistItems"
              :key="item.key"
              class="export-check-item"
              :class="`is-${item.state.toLowerCase()}`"
            >
              <div class="export-check-item__head">
                <CheckCircle2 v-if="item.state === 'PASS'" :size="15" />
                <AlertTriangle v-else-if="item.state === 'WARNING'" :size="15" />
                <Circle v-else :size="15" />
                <strong>{{ item.label }}</strong>
                <span v-if="item.heuristic">启发式</span>
              </div>
              <p>{{ item.detail }}</p>
            </article>
          </div>
          <el-button class="full-button" :disabled="!isEdit" @click="openDeliveryChecks">
            <FileCheck2 :size="16" />
            {{ isEdit ? '打开稳定版本分页与导出工作台' : '保存并创建后导出' }}
          </el-button>
        </section>

        <section v-show="inspectorMode === 'review'" class="content-card side-panel jd-match-panel">
          <div class="completion-head">
            <span>JD 匹配准备度</span>
            <strong>{{ hasResumeContentStarted ? `${jdMatchReadiness}%` : '待检查' }}</strong>
          </div>
          <el-progress v-if="hasResumeContentStarted" :percentage="jdMatchReadiness" :stroke-width="10" :show-text="false" />
          <p>{{ hasResumeContentStarted ? '用于判断当前简历是否适合进入 JD 匹配，不替代正式匹配报告。' : '填写目标岗位和技术栈后，可在此检查是否适合发起 JD 匹配。' }}</p>
          <div v-if="hasResumeContentStarted" class="diagnostic-list">
            <span v-for="item in jdMatchItems" :key="item.label" :class="{ done: item.done }">
              <CheckCircle2 v-if="item.done" :size="15" />
              <Circle v-else :size="15" />
              {{ item.label }}
            </span>
          </div>
        </section>

        <section v-show="inspectorMode === 'review'" class="content-card side-panel evidence-panel">
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

        <section v-show="inspectorMode === 'review'" class="content-card side-panel gap-panel">
          <h3>缺口建议</h3>
          <div class="gap-list">
            <article v-for="item in gapSuggestionItems" :key="item.title">
              <strong>{{ item.title }}</strong>
              <p>{{ item.desc }}</p>
            </article>
          </div>
        </section>

        <section v-if="inspectorMode === 'ai' && isEdit && resumeId" class="content-card side-panel ai-panel">
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

        <section v-else-if="inspectorMode === 'ai'" class="content-card side-panel ai-panel ai-locked-panel">
          <h3>AI 优化建议</h3>
          <p>先保存简历，系统才能基于稳定版本生成建议。建议应用时会创建草稿，不会覆盖当前编辑内容。</p>
          <div class="ai-empty">
            当前是未保存草稿。保存后可生成一次 AI 润色建议，并在这里查看记录。
          </div>
        </section>

      </aside>
      </template>
    </ResumeWorkbenchShell>

    <ResumeTemplateBrowser
      v-model="templateGalleryVisible"
      :templates="selectableResumeTemplateOptions"
      :pending-code="pendingResumeTemplateCode"
      :accent="previewAccent"
      :accent-options="resumeAccentOptions"
      :zoom="previewZoom"
      :is-unlocked="isTemplateUnlocked"
      :template-registry="resumeAtsTemplates"
      :presentation-config="presentationConfig"
      :registry-error="templateRegistryError"
      @select="pendingResumeTemplateCode = $event"
      @accent-change="previewAccent = $event"
      @zoom-change="changePreviewZoom"
      @cancel="closeTemplateGallery"
      @confirm="applyPendingTemplate"
    />

    <el-dialog
      v-model="deliveryWorkbenchVisible"
      title="稳定版本分页与导出"
      width="min(1240px, 96vw)"
      class="resume-delivery-dialog"
      append-to-body
      destroy-on-close
    >
      <ResumeDeliveryWorkbench
        v-if="isEdit"
        ref="deliveryWorkbenchRef"
        :resume-id="resumeId || undefined"
        :preferred-template-code="selectedResumeTemplateCode"
        :refresh-key="deliveryRefreshKey"
        :has-unsaved-changes="hasUnsavedResumeChanges"
        @resume-version-applied="reloadCurrentResume"
        @template-change="selectedResumeTemplateCode = $event"
      />
    </el-dialog>

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
import type { FormInstance, FormRules, FormValidateFailure } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  FileCheck2,
  FilePenLine,
  FolderOpen,
  GitCompareArrows,
  ChevronRight,
  LayoutTemplate,
  Layers3,
  Maximize2,
  Minimize2,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Save,
  Sparkles,
} from 'lucide-vue-next'
import { getActivePinia } from 'pinia'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'

import {
  applyResumeOptimizeResultApi,
  createResumeApi,
  createResumeProjectApi,
  deleteResumeProjectApi,
  getResumeOptimizeRecordsApi,
  getResumeOptimizeResultApi,
  getResumeDetailApi,
  optimizeResumeApi,
  clearDefaultResumeApi,
  setDefaultResumeApi,
  updateResumeApi,
  updateResumeProjectApi
} from '@/api/resume'
import { getResumeAtsTemplatesApi } from '@/api/resumeDelivery'
import { createResumeVersionApi, getResumeVersionsApi } from '@/api/v4'
import AppState from '@/components/common/AppState.vue'
import ResumeProjectForm from '@/components/resume/ResumeProjectForm.vue'
import ModuleTabs from '@/components/user-ui/ModuleTabs.vue'
import SkillGroupEditor from '@/views/resume/workbench/blocks/SkillGroupEditor.vue'
import EntryItemEditor from '@/views/resume/workbench/blocks/EntryItemEditor.vue'
import ProjectItemEditor from '@/views/resume/workbench/blocks/ProjectItemEditor.vue'
import TextBlocksField from '@/views/resume/workbench/blocks/TextBlocksField.vue'
import SectionCard from '@/views/resume/workbench/blocks/SectionCard.vue'
import { useResumeHistory } from '@/composables/useResumeHistory'
import { useUserModuleTabs } from '@/composables/useUserModuleTabs'
import {
  buildResumeExportChecks,
  isResumeTemplateUnlocked,
  resumeTemplateOptions,
  resumeTemplateSectionOrder,
  type ResumeTemplateOption,
  type ResumeAccent,
  type ResumeTemplateCode
} from '@/features/resume-document'
import {
  createDefaultResumePresentation,
  mergeResumeTemplatePresentation,
  normalizeResumePresentation
} from '@/features/resume-presentation'
import { useGameProfileStore } from '@/features/game-profile'
import { useResumeAutosave } from '@/features/resume-workbench/use-resume-autosave'
import { useResumeDocument } from '@/features/resume-workbench/use-resume-document'
import { projectToDocumentItem } from '@/features/resume-workbench/document-migrator'
import {
  updateProjectItems,
  updateSectionBlocks,
  updateSectionGroups,
  updateSectionItems
} from '@/features/resume-workbench/section-ops'
import { MAX_CUSTOM_SECTIONS } from '@/features/resume-workbench/document'
import type {
  CustomSection,
  ResumeBlock,
  ResumeDocumentV2,
  ResumeEntryItem,
  ResumeProjectItem,
  ResumeSkillGroupItem
} from '@/features/resume-workbench/document'
import ResumeDocumentPreview from '@/views/resume/components/ResumeDocumentPreview.vue'
import ResumeDeliveryWorkbench from '@/views/resume/components/ResumeDeliveryWorkbench.vue'
import ResumeSectionRail from '@/views/resume/components/ResumeSectionRail.vue'
import ResumeTemplateBrowser from '@/views/resume/components/ResumeTemplateBrowser.vue'
import ResumeWorkbenchShell from '@/views/resume/components/ResumeWorkbenchShell.vue'
import ResumeWorkbenchTopbar from '@/views/resume/components/ResumeWorkbenchTopbar.vue'
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
import type { ResumeAtsTemplateVO, ResumeDeliveryDraft } from '@/types/resumeDelivery'
import type { ResumePresentationConfig } from '@/types/resumePresentation'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage, toFriendlyMessage } from '@/utils/error'
import { getRouteNumberParam } from '@/utils/route'
import { formatDateTime } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const moduleTabs = useUserModuleTabs('prepare')
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
const saveError = ref('')
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
const selectedInlineProjectId = ref<number | null>(null)
const deliveryWorkbenchRef = ref<InstanceType<typeof ResumeDeliveryWorkbench>>()
const deliveryWorkbenchVisible = ref(false)
const templateGalleryVisible = ref(false)
const optimizeRecords = ref<ResumeOptimizeRecordVO[]>([])
const optimizeDetail = ref<ResumeOptimizeDetailVO | null>(null)
const selectedOptimizeSuggestionIndexes = ref<number[]>([])
const optimizeSseEvents = ref<Array<{ type: string; stage?: string; message: string }>>([])
const optimizeSseMessage = ref('')
const optimizeSseStatus = ref('未开始')
const optimizeTask = ref<ResumeOptimizeSubmitVO | null>(null)
const optimizeRecordsRefreshing = ref(false)
const mobileWorkspaceTab = ref<'edit' | 'review' | 'ai' | 'preview'>('edit')
const inspectorMode = ref<'edit' | 'review' | 'ai'>('edit')
const railCollapsed = ref(false)
const editorPanelCollapsed = ref(false)
const previewFocusMode = ref(false)
const activeWorkbenchStep = ref<'fill' | 'review' | 'preview' | 'export'>('fill')
type ResumeWorkbenchModule =
  | 'resume-basic'
  | 'resume-target'
  | 'resume-skills'
  | 'resume-projects'
  | 'resume-experience'

const activeWorkshopModule = ref<string>('resume-basic')
const invalidSectionIds = ref<ResumeWorkbenchModule[]>([])
const invalidFieldProps = ref<string[]>([])
const selectedResumeTemplateCode = ref<ResumeTemplateCode>('ATS_SINGLE_COLUMN')
const pendingResumeTemplateCode = ref<ResumeTemplateCode>('ATS_SINGLE_COLUMN')
const previewAccent = ref<ResumeAccent>('default')
const previewZoom = ref(0.88)
const presentationConfig = ref<ResumePresentationConfig>(createDefaultResumePresentation())
const resumeAtsTemplates = ref<ResumeAtsTemplateVO[]>([])
const templateRegistryError = ref('')
const deliveryRefreshKey = ref(0)
let resumeLoadGeneration = 0
let resumeSaveOperationGeneration = 0
let projectWriteOperationGeneration = 0
const resumeAccentOptions: Array<{ value: ResumeAccent; label: string }> = [
  { value: 'default', label: '默认黑' },
  { value: 'blue', label: '蓝色' },
  { value: 'green', label: '绿色' },
  { value: 'purple', label: '紫色' },
  { value: 'orange', label: '橙色' },
  { value: 'red', label: '红色' },
  { value: 'slate', label: '石板灰' },
  { value: 'black', label: '纯黑' }
]
const mobileWorkspaceTabs = ['edit', 'review', 'ai', 'preview'] as const
const isTemplateUnlocked = (template: ResumeTemplateOption) =>
  isResumeTemplateUnlocked(template, gameProfile?.streakDays || 0)

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
    selectMobileWorkspaceTab
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

const resumeDocument = useResumeDocument({
  projects: () => projects.value,
  presentation: () => presentationConfig.value
})

const skillsSection = computed(() => resumeDocument.document.value.sections
  .find((section) => section.builtinKey === 'skills'))

const skillGroups = computed<ResumeSkillGroupItem[]>(() => (
  skillsSection.value && skillsSection.value.kind === 'skills'
    ? skillsSection.value.content.groups
    : []
))

// 分组结构只有文档能表达；扁平关键词串继续供校验、完成度和导出使用，
// 但只在用户真正编辑分组时改写，避免打开编辑器就重排用户手写的关键词顺序。
const applySkillGroups = (groups: ResumeSkillGroupItem[]) => {
  const section = skillsSection.value
  if (!section) return
  resumeDocument.replace(updateSectionGroups(resumeDocument.document.value, section.id, groups))
  form.skills = resumeDocument.legacy.value.skillStack
  clearResolvedValidation('skills', form.skills)
}

watch(() => form.skills, (value) => {
  if ((value || '') === resumeDocument.legacy.value.skillStack) return
  resumeDocument.syncLegacy({ skillStack: value })
})

const builtinSection = (key: string) => resumeDocument.document.value.sections
  .find((section) => section.builtinKey === key)

const summaryBlocks = computed<ResumeBlock[]>(() => {
  const section = builtinSection('summary')
  return section && section.kind === 'text' ? section.content.blocks : []
})

// 摘要块由文档持有：击键只替换目标块，避免每次输入都按标点重切分整段、丢掉光标位置。
const applySummaryBlocks = (blocks: ResumeBlock[]) => {
  const section = builtinSection('summary')
  if (!section || section.kind !== 'text') return
  resumeDocument.replace(updateSectionBlocks(resumeDocument.document.value, section.id, blocks))
  form.summary = resumeDocument.legacy.value.summary
}

const sameAsDocument = () => {
  const legacy = resumeDocument.legacy.value
  return (form.realName || '') === legacy.realName
    && (form.email || '') === legacy.email
    && (form.phone || '') === legacy.phone
    && (form.targetPosition || '') === legacy.targetPosition
    && (form.summary || '') === legacy.summary
}

// 保存时服务器会用文档投影覆盖扁平列，所以这些输入必须回流进文档，否则编辑会被上一次的内容盖掉。
watch(
  [() => form.realName, () => form.email, () => form.phone, () => form.targetPosition, () => form.summary],
  () => {
    if (sameAsDocument()) return
    resumeDocument.syncLegacy({
      realName: form.realName,
      email: form.email,
      phone: form.phone,
      targetPosition: form.targetPosition,
      summary: form.summary
    })
    // 摘要文本由外部写入（AI 采纳、历史回退、上传解析）时会被重新切分，表单需要接受切分结果。
    form.summary = resumeDocument.legacy.value.summary
  }
)

// 自定义分区完全由文档表达：顺序即数组位置，隐藏即 visible=false。
const customSections = computed<CustomSection[]>(() =>
  resumeDocument.document.value.sections.filter(
    (section): section is CustomSection => !section.builtinKey
  )
)

const customSectionQuota = computed(() => MAX_CUSTOM_SECTIONS - customSections.value.length)
const isCustomSectionPane = computed(() =>
  customSections.value.some((section) => section.id === activeWorkshopModule.value)
)
const hiddenPaneIds = computed(() => [
  ...presentationConfig.value.hiddenModules,
  ...customSections.value.filter((section) => !section.visible).map((section) => section.id)
])

const customSectionDone = (section: CustomSection) => section.variant === 'text'
  ? (section.content.blocks || []).some((block) => block.text.trim().length > 0)
  : (section.content.items || []).length > 0

const addCustomSectionPane = (variant: 'text' | 'entry') => {
  if (customSectionQuota.value <= 0) return
  resumeDocument.addCustomSection({ variant })
  const created = customSections.value[customSections.value.length - 1]
  if (created) {
    activeWorkshopModule.value = created.id
    inspectorMode.value = 'edit'
    mobileWorkspaceTab.value = 'edit'
  }
}

const renameCustomSection = (sectionId: string, title: string) =>
  resumeDocument.renameSection(sectionId, title)

const removeCustomSectionPane = (sectionId: string) => {
  if (activeWorkshopModule.value === sectionId) activeWorkshopModule.value = 'resume-basic'
  resumeDocument.removeSection(sectionId)
}

const applyCustomSectionBlocks = (sectionId: string, blocks: ResumeBlock[]) =>
  resumeDocument.replace(updateSectionBlocks(resumeDocument.document.value, sectionId, blocks))

const applyCustomSectionItems = (sectionId: string, items: ResumeEntryItem[]) =>
  resumeDocument.replace(updateSectionItems(resumeDocument.document.value, sectionId, items))

const workItems = computed<ResumeEntryItem[]>(() => {
  const section = builtinSection('experience')
  return section && section.kind === 'entry' ? section.content.items : []
})

const educationItems = computed<ResumeEntryItem[]>(() => {
  const section = builtinSection('education')
  return section && section.kind === 'entry' ? section.content.items : []
})

const applyEntryItems = (
  key: 'experience' | 'education',
  items: ResumeEntryItem[],
  writeField: (value: string) => void
) => {
  const section = builtinSection(key)
  if (!section || (section.kind !== 'entry' && section.kind !== 'custom')) return
  resumeDocument.replace(updateSectionItems(resumeDocument.document.value, section.id, items))
  writeField(key === 'experience'
    ? resumeDocument.legacy.value.workExperience
    : resumeDocument.legacy.value.educationExperience)
}

watch([() => form.workSummary, () => form.education], () => {
  const legacy = resumeDocument.legacy.value
  if ((form.workSummary || '') === legacy.workExperience && (form.education || '') === legacy.educationExperience) {
    return
  }
  resumeDocument.syncLegacy({
    workExperience: form.workSummary,
    educationExperience: form.education
  })
})

const optimizeForm = reactive<ResumeOptimizeRequestDTO>(createDefaultOptimizeForm())

const rules: FormRules<ResumeCreateDTO> = {
  resumeName: [{ required: true, message: '请输入简历名称', trigger: 'blur' }],
  skills: [{ required: true, message: '请输入技术栈', trigger: 'blur' }]
}

const sectionByFormField: Record<string, ResumeWorkbenchModule> = {
  resumeName: 'resume-basic',
  realName: 'resume-basic',
  email: 'resume-basic',
  phone: 'resume-basic',
  summary: 'resume-basic',
  targetPosition: 'resume-target',
  skills: 'resume-skills',
  workSummary: 'resume-experience',
  education: 'resume-experience'
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

const hasResumeContentStarted = computed(() => Boolean(
  form.resumeName?.trim()
  || form.realName?.trim()
  || form.email?.trim()
  || form.phone?.trim()
  || form.targetPosition?.trim()
  || form.summary?.trim()
  || form.skills?.trim()
  || form.workSummary?.trim()
  || form.education?.trim()
  || projects.value.length
))

const sectionNavItems = computed(() => {
  const items: Array<{
    id: string
    label: string
    done: boolean
    invalid: boolean
  }> = [
    {
      id: 'resume-basic',
      label: '基本信息',
      done: Boolean(form.resumeName?.trim() && form.realName?.trim()),
      invalid: invalidSectionIds.value.includes('resume-basic')
    },
    {
      id: 'resume-target',
      label: '求职意向',
      done: Boolean(form.targetPosition?.trim()),
      invalid: invalidSectionIds.value.includes('resume-target')
    },
    {
      id: 'resume-skills',
      label: '技能栈',
      done: Boolean(form.skills?.trim()),
      invalid: invalidSectionIds.value.includes('resume-skills')
    },
    {
      id: 'resume-projects',
      label: '项目经历',
      done: projects.value.length > 0,
      invalid: invalidSectionIds.value.includes('resume-projects')
    },
    {
      id: 'resume-experience',
      label: '教育经历',
      done: Boolean(form.workSummary?.trim() || form.education?.trim()),
      invalid: invalidSectionIds.value.includes('resume-experience')
    }
  ]
  const order = presentationConfig.value.moduleOrder
  const panes = [
    ...items
      .sort((left, right) => order.indexOf(left.id) - order.indexOf(right.id))
      .map((item) => ({ ...item, kind: 'module' as const })),
    ...customSections.value.map((section) => ({
      id: section.id,
      label: section.title,
      done: customSectionDone(section),
      invalid: false,
      kind: 'custom' as const
    }))
  ]
  // 模块与自定义分区各自成群：跨类型的排序由文档顺序决定，导航条不承诺它。
  return panes.map((pane, index) => ({
    id: pane.id,
    label: pane.label,
    done: pane.done,
    invalid: pane.invalid,
    movableUp: index > 0 && panes[index - 1].kind === pane.kind,
    movableDown: index < panes.length - 1 && panes[index + 1].kind === pane.kind
  }))
})

const sectionsForWorkshopModule: Record<ResumeWorkbenchModule, Array<'summary' | 'skills' | 'projects' | 'experience' | 'education'>> = {
  'resume-basic': ['summary'],
  'resume-target': [],
  'resume-skills': ['skills'],
  'resume-projects': ['projects'],
  'resume-experience': ['experience', 'education']
}

const moveWorkshopModule = (id: string, delta: -1 | 1) => {
  const sections = resumeDocument.document.value.sections
  const sectionIndex = sections.findIndex((section) => section.id === id && !section.builtinKey)
  if (sectionIndex >= 0) {
    const neighbor = sections[sectionIndex + delta]
    if (!neighbor || neighbor.builtinKey) return
    resumeDocument.moveSection(id, sectionIndex + delta)
    return
  }
  if (!presentationConfig.value.moduleOrder.includes(id)) return
  const order = [...presentationConfig.value.moduleOrder]
  const currentIndex = order.indexOf(id)
  const nextIndex = currentIndex + delta
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= order.length) return
  const [moved] = order.splice(currentIndex, 1)
  order.splice(nextIndex, 0, moved)
  presentationConfig.value = normalizeResumePresentation({
    ...presentationConfig.value,
    moduleOrder: order,
    sectionOrder: order.flatMap((moduleId) =>
      sectionsForWorkshopModule[moduleId as ResumeWorkbenchModule] || []
    ),
    overrides: {
      ...presentationConfig.value.overrides,
      sectionOrder: true
    }
  })
}

const toggleWorkshopModule = (id: string, currentlyHidden: boolean) => {
  const isCustomSection = customSections.value.some((section) => section.id === id)
  if (isCustomSection) {
    resumeDocument.toggleSectionVisible(id)
    if (!currentlyHidden && activeWorkshopModule.value === id) activeWorkshopModule.value = 'resume-basic'
    return
  }
  if (
    id === 'resume-basic'
    || id === 'resume-target'
    || !presentationConfig.value.moduleOrder.includes(id)
  ) return
  const hiddenModules = currentlyHidden
    ? presentationConfig.value.hiddenModules.filter((item) => item !== id)
    : Array.from(new Set([...presentationConfig.value.hiddenModules, id]))
  const presentationSections = sectionsForWorkshopModule[id as ResumeWorkbenchModule] || []
  const hiddenSections = currentlyHidden
    ? presentationConfig.value.hiddenSections.filter(
      (item) => !presentationSections.includes(item)
    )
    : Array.from(new Set([
      ...presentationConfig.value.hiddenSections,
      ...presentationSections
    ]))
  presentationConfig.value = normalizeResumePresentation({
    ...presentationConfig.value,
    hiddenModules,
    hiddenSections,
    overrides: {
      ...presentationConfig.value.overrides,
      hiddenSections: true
    }
  })
  if (!currentlyHidden && activeWorkshopModule.value === id) {
    activeWorkshopModule.value = sectionNavItems.value.find(
      (item) => !hiddenModules.includes(item.id)
    )?.id || 'resume-basic'
  }
}

const activeWorkshopModuleMeta = computed(() => {
  const modules = {
    'resume-basic': {
      title: '基本信息',
      description: '先把真实身份和能证明的个人摘要写清楚。'
    },
    'resume-target': {
      title: '求职意向',
      description: '目标岗位会决定摘要、技能和项目的排序重点。'
    },
    'resume-skills': {
      title: '技能栈',
      description: '按语言、框架、中间件、数据库和工程实践优先级整理。'
    },
    'resume-projects': {
      title: '项目经历',
      description: '把背景、职责、技术决策和量化结果写成可追问的证据。'
    },
    'resume-experience': {
      title: '教育经历',
      description: '补齐经历上下文和教育信息，让整份简历可被完整理解。'
    }
  } as const

  const custom = customSections.value.find((section) => section.id === activeWorkshopModule.value)
  if (custom) {
    return {
      title: custom.title,
      description: '这个分区只属于这份简历，预览与导出按文档顺序呈现它。'
    }
  }
  return modules[activeWorkshopModule.value as ResumeWorkbenchModule] || modules['resume-basic']
})

const selectableResumeTemplateOptions = computed(() => {
  const activeCodes = new Set(
    resumeAtsTemplates.value
      .filter((template) => !template.status || template.status === 'ACTIVE')
      .map((template) => template.templateCode)
  )
  const source = activeCodes.size
    ? resumeTemplateOptions.filter((template) =>
      !template.code.startsWith('ATS_') || activeCodes.has(template.code)
    )
    : resumeTemplateOptions
  return source.length ? source : resumeTemplateOptions.slice(0, 3)
})

const activeResumeTemplate = computed(() =>
  resumeAtsTemplates.value.find((template) =>
    template.templateCode === selectedResumeTemplateCode.value
    && (!template.status || template.status === 'ACTIVE')
  )
)

const selectedResumeTemplateLabel = computed(() =>
  `${activeResumeTemplate.value?.templateName
    || selectableResumeTemplateOptions.value.find((item) => item.code === selectedResumeTemplateCode.value)?.name
    || '极光绿'} · v${activeResumeTemplate.value?.templateVersion || presentationConfig.value.templateVersion || 1}`
)

const splitTextTags = (value?: string) =>
  (value || '')
    .split(/[，,、\n/|]+/)
    .map((item) => item.trim())
    .filter(Boolean)

const skillTags = computed(() => splitTextTags(form.skills).slice(0, 18))
const selectedInlineProject = computed(() => {
  const projectId = selectedInlineProjectId.value
  return projects.value.find((project) => project.projectId === projectId) || projects.value[0] || null
})
const inlineProjectTechTags = computed(() =>
  splitTextTags(selectedInlineProject.value?.techStack).slice(0, 8)
)
const inlineProjectOriginalStatement = computed(() => {
  const project = selectedInlineProject.value
  return project?.responsibility ||
    project?.coreFeatures ||
    project?.technicalChallenges ||
    project?.technicalDifficulties ||
    project?.projectBackground ||
    project?.description ||
    '先补一条真实的项目职责或技术决策'
})
const inlineProjectSuggestedStatement = computed(() => {
  const project = selectedInlineProject.value
  return project?.optimizationResult ||
    project?.optimizationResults ||
    '保存真实项目内容后，可生成一条需要人工核实的量化表达建议。'
})

const projectSection = computed(() => {
  const section = builtinSection('projects')
  return section && section.kind === 'project' ? section : null
})

const EMPTY_PROJECT_FIELDS: ResumeProjectItem['fields'] = {
  background: [],
  coreFeatures: [],
  technicalChallenges: [],
  outcome: [],
  supplement: []
}

const inlineProjectItem = computed<ResumeProjectItem | null>(() => {
  const project = selectedInlineProject.value
  if (!project) return null
  const items = projectSection.value?.content.items || []
  // 失败重投的本地草稿还没进服务器文档，合成一条让行内编辑器始终有内容可写。
  return items.find((item) => item.serverId === project.projectId)
    || projectToDocumentItem(project, items.length)
})

const inlineProjectFields = computed(() => inlineProjectItem.value?.fields || EMPTY_PROJECT_FIELDS)

/**
 * 服务器项目行至今成对存储历史别名列（technicalDifficulties / optimizationResults / projectPeriod…），
 * 保存载荷又按「别名优先」取值，所以写回时必须成对赋值，否则旧别名会盖掉刚编辑的内容。
 */
const writeProjectedProject = (target: ResumeProjectVO, source: ResumeProjectVO) => {
  target.projectBackground = source.projectBackground || ''
  target.description = source.projectBackground || ''
  target.coreFeatures = source.coreFeatures || ''
  target.technicalChallenges = source.technicalChallenges || ''
  target.technicalDifficulties = source.technicalChallenges || ''
  target.optimizationResult = source.optimizationResult || ''
  target.optimizationResults = source.optimizationResult || ''
  target.extraInfo = source.extraInfo || ''
}

const patchInlineProject = (changes: Partial<ResumeProjectVO>) => {
  const project = selectedInlineProject.value
  if (!project) return
  Object.assign(project, changes)
  if (changes.projectTime !== undefined) project.projectPeriod = changes.projectTime
}

const setInlineProjectName = (value: unknown) =>
  patchInlineProject({ projectName: String(value ?? '').trim() })

const setInlineProjectPeriod = (value: unknown) =>
  patchInlineProject({ projectTime: String(value ?? '').trim() })

const applyProjectFields = (fields: ResumeProjectItem['fields']) => {
  const section = projectSection.value
  const item = inlineProjectItem.value
  const project = selectedInlineProject.value
  if (!section || !item || !project) return
  const items = section.content.items
  const nextItems = items.some((entry) => entry.id === item.id)
    ? items.map((entry) => (entry.id === item.id ? { ...entry, fields } : entry))
    : [...items, { ...item, fields }]
  resumeDocument.replace(updateProjectItems(resumeDocument.document.value, section.id, nextItems))
  const projected = resumeDocument.legacy.value.projects.find((entry) => entry.projectId === project.projectId)
  if (projected) writeProjectedProject(project, projected)
}

const projectRowsSignature = (list: ResumeProjectVO[]) => JSON.stringify(list.map((project) => [
  project.projectId,
  project.projectName || '',
  project.projectTime || '',
  project.role || project.responsibility || '',
  project.techStack || '',
  project.projectBackground || '',
  project.coreFeatures || '',
  project.technicalChallenges || '',
  project.optimizationResult || '',
  project.extraInfo || ''
]))

watch(
  projects,
  () => {
    if (projectRowsSignature(projects.value) === projectRowsSignature(resumeDocument.legacy.value.projects)) {
      return
    }
    resumeDocument.syncLegacy({}, projects.value)
  },
  { deep: true }
)

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
  projects: projects.value,
  presentationConfig: presentationConfig.value
}))

const resumeDocumentDraft = computed(() => ({
  ...resumeDeliveryDraft.value,
  resumeName: form.resumeName
}))
const savedResumeSignature = ref('')
/**
 * 键序无关的稳定序列化：同一份文档可能来自客户端合成或服务器规范化，
 * 键序不同不代表内容不同，否则每次打开都会被误判成“有未保存改动”。
 */
const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record).sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}
const createResumeDraftSignature = (
  formValue: ResumeCreateDTO,
  projectsValue: ResumeProjectVO[],
  presentationValue: ResumePresentationConfig,
  documentValue?: ResumeDocumentV2 | null
) => stableStringify({
  title: formValue.resumeName,
  realName: formValue.realName,
  email: formValue.email,
  phone: formValue.phone,
  targetPosition: formValue.targetPosition,
  summary: formValue.summary,
  skillStack: formValue.skills || formValue.skillStack,
  workExperience: formValue.workSummary || formValue.workExperience,
  educationExperience: formValue.education || formValue.educationExperience,
  projects: projectsValue,
  presentationConfig: presentationValue,
  document: documentValue || null,
  isDefault: formValue.isDefault
})
const resumeDraftSignature = computed(() =>
  createResumeDraftSignature(form, projects.value, presentationConfig.value, resumeDocument.document.value)
)
const resumeHistory = useResumeHistory(30)
const historyApplying = ref(false)
let resumeHistoryTimer: ReturnType<typeof setTimeout> | undefined
const createResumeHistorySnapshot = () => JSON.stringify({
  form: { ...form },
  projects: projects.value,
  presentationConfig: presentationConfig.value,
  document: resumeDocument.document.value
})
const restoreResumeHistorySnapshot = (snapshot?: string) => {
  if (!snapshot) return
  try {
    const value = JSON.parse(snapshot) as {
      form?: ResumeCreateDTO
      projects?: ResumeProjectVO[]
      presentationConfig?: ResumePresentationConfig
      document?: ResumeDocumentV2
    }
    historyApplying.value = true
    Object.assign(form, createDefaultResumeForm(), value.form || {})
    projects.value = Array.isArray(value.projects)
      ? value.projects.map((project) => ({ ...project }))
      : []
    // 文档是这一步的真相：扁平列只是它的投影，回退必须整体替换文档。
    if (value.document) resumeDocument.replace(value.document)
    presentationConfig.value = normalizeResumePresentation(value.presentationConfig)
    selectedResumeTemplateCode.value = presentationConfig.value.templateCode as ResumeTemplateCode
    pendingResumeTemplateCode.value = selectedResumeTemplateCode.value
    previewAccent.value = presentationConfig.value.accentColor
    saveError.value = ''
    void nextTick(() => {
      historyApplying.value = false
    })
  } catch {
    historyApplying.value = false
    ElMessage.warning('这一步编辑历史无法恢复，已保留当前内容。')
  }
}
const undoResumeEdit = () => restoreResumeHistorySnapshot(resumeHistory.undo())
const redoResumeEdit = () => restoreResumeHistorySnapshot(resumeHistory.redo())
const hasUnsavedResumeChanges = computed(() => {
  if (isEdit.value) {
    return !savedResumeSignature.value || savedResumeSignature.value !== resumeDraftSignature.value
  }
  // 新建态没有服务器基线，文档又完全由扁平字段合成，所以只看扁平字段。
  return hasResumeContentStarted.value
    || createResumeDraftSignature(form, projects.value, presentationConfig.value, null)
      !== createResumeDraftSignature(createDefaultResumeForm(), [], createDefaultResumePresentation(), null)
})
// A draft write clears the server-side default flag, so the default resume keeps the explicit save.
const resumeAutosave = useResumeAutosave({
  enabled: () => isEdit.value
    && !saving.value
    && form.isDefault !== 1
    && hasUnsavedResumeChanges.value,
  run: () => handleSave('draft', { silent: true })
})

watch(resumeDraftSignature, () => {
  if (isEdit.value) resumeAutosave.schedule()
})

const documentSaveStatus = computed(() => {
  if (saving.value) return resumeAutosave.status.value === 'saving' ? '自动保存中' : '保存中'
  if (!isEdit.value) return hasResumeContentStarted.value ? '未保存，尚未创建简历' : '新建草稿，尚未保存'
  return hasUnsavedResumeChanges.value ? '有未保存改动' : '已保存'
})

const handleResumeBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!hasUnsavedResumeChanges.value) return
  event.preventDefault()
  event.returnValue = ''
}

onBeforeRouteLeave(async () => {
  if (saving.value) {
    ElMessage.warning('简历正在保存，请等待保存完成后再离开。')
    return false
  }
  if (!hasUnsavedResumeChanges.value) return true

  try {
    await ElMessageBox.confirm(
      '当前简历还有未保存改动，离开后这些内容会丢失。',
      '确认离开编辑页',
      {
        type: 'warning',
        confirmButtonText: '离开',
        cancelButtonText: '继续编辑',
        distinguishCancelAndClose: true
      }
    )
    return true
  } catch {
    return false
  }
})

onMounted(() => {
  window.addEventListener('beforeunload', handleResumeBeforeUnload)
})

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
    const storedTemplate = selectableResumeTemplateOptions.value.find(
      (item) => item.code === preference.templateCode
    )
    if (storedTemplate && isTemplateUnlocked(storedTemplate)) {
      selectedResumeTemplateCode.value = storedTemplate.code
      presentationConfig.value = normalizeResumePresentation({
        ...presentationConfig.value,
        templateCode: storedTemplate.code,
        sectionOrder: resumeTemplateSectionOrder(storedTemplate.code)
      })
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

const openTemplateGallery = () => {
  pendingResumeTemplateCode.value = selectedResumeTemplateCode.value
  templateGalleryVisible.value = true
}

const closeTemplateGallery = () => {
  pendingResumeTemplateCode.value = selectedResumeTemplateCode.value
  templateGalleryVisible.value = false
}

const applyPendingTemplate = () => {
  const template = selectableResumeTemplateOptions.value.find(
    (item) => item.code === pendingResumeTemplateCode.value
  )
  if (!template || !isTemplateUnlocked(template)) return
  selectedResumeTemplateCode.value = template.code
  presentationConfig.value = mergeResumeTemplatePresentation(
    presentationConfig.value,
    resumeAtsTemplates.value.find((item) => item.templateCode === template.code) || {
      templateCode: template.code,
      templateVersion: 1
    }
  )
  templateGalleryVisible.value = false
}

const projectsWithResult = computed(() =>
  projects.value.filter((project) => Boolean(project.optimizationResult || project.optimizationResults)).length
)
const exportChecklistItems = computed(() => buildResumeExportChecks({
  ...resumeDocumentDraft.value,
  templateCode: selectedResumeTemplateCode.value,
  isSaved: isEdit.value && !hasUnsavedResumeChanges.value
}))
const exportReadyCount = computed(() =>
  exportChecklistItems.value.filter((item) => item.state === 'PASS').length
)

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
  const moduleId = sectionId === 'resume-summary'
    ? 'resume-basic'
    : sectionId

  if (customSections.value.some((section) => section.id === sectionId)) {
    activeWorkshopModule.value = sectionId
    inspectorMode.value = 'edit'
    mobileWorkspaceTab.value = 'edit'
  }

  if (
    moduleId === 'resume-basic'
    || moduleId === 'resume-target'
    || moduleId === 'resume-skills'
    || moduleId === 'resume-projects'
    || moduleId === 'resume-experience'
  ) {
    activeWorkshopModule.value = moduleId
    inspectorMode.value = 'edit'
    mobileWorkspaceTab.value = 'edit'
  }

  void nextTick(() => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

const getValidationFieldProps = (failure: unknown) => {
  const fields = (failure as Partial<FormValidateFailure> | null)?.fields
  return fields && typeof fields === 'object' ? Object.keys(fields) : []
}

const getSectionForField = (fieldProp: string) => {
  const directSection = sectionByFormField[fieldProp]
  if (directSection) return directSection

  const rootField = fieldProp.split(/[.[\]]/)[0]
  return sectionByFormField[rootField]
}

const focusFirstInvalidField = (fieldProp: string) => {
  const field = formRef.value?.getField?.(fieldProp)
  const control = field?.$el?.querySelector<HTMLElement>(
    'input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )
  control?.focus()
}

const handleFormValidationFailure = async (failure: unknown) => {
  const fieldProps = getValidationFieldProps(failure)
  const sections = Array.from(new Set(
    fieldProps
      .map(getSectionForField)
      .filter((section): section is ResumeWorkbenchModule => Boolean(section))
  ))
  invalidFieldProps.value = fieldProps
  invalidSectionIds.value = sections

  const firstField = fieldProps.find((fieldProp) => getSectionForField(fieldProp))
  if (!firstField) return

  const section = getSectionForField(firstField)
  if (section) focusSection(section)
  await nextTick()
  formRef.value?.scrollToField?.(firstField)
  focusFirstInvalidField(firstField)
}

const clearResolvedValidation = (fieldProp: string, value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return
  invalidFieldProps.value = invalidFieldProps.value.filter((item) => item !== fieldProp)
  invalidSectionIds.value = Array.from(new Set(
    invalidFieldProps.value
      .map(getSectionForField)
      .filter((section): section is ResumeWorkbenchModule => Boolean(section))
  ))
}

watch(resumeDraftSignature, () => {
  if (saveError.value) saveError.value = ''
  if (historyApplying.value) return
  if (resumeHistoryTimer) clearTimeout(resumeHistoryTimer)
  resumeHistoryTimer = setTimeout(() => {
    resumeHistory.push(createResumeHistorySnapshot())
  }, 450)
})

function selectMobileWorkspaceTab(tab: 'edit' | 'review' | 'ai' | 'preview') {
  mobileWorkspaceTab.value = tab
  inspectorMode.value = tab === 'preview' ? 'edit' : tab
  if (tab === 'edit') activeWorkbenchStep.value = 'fill'
  if (tab === 'review') activeWorkbenchStep.value = 'review'
  if (tab === 'preview') activeWorkbenchStep.value = 'preview'
}

const setInspectorMode = (mode: 'edit' | 'review' | 'ai') => {
  inspectorMode.value = mode
  selectMobileWorkspaceTab(mode)
  if (mode === 'edit') activeWorkbenchStep.value = 'fill'
  if (mode === 'review') activeWorkbenchStep.value = 'review'
}

const handlePresentationConfigUpdate = (nextConfig: ResumePresentationConfig) => {
  const normalized = normalizeResumePresentation(nextConfig)
  presentationConfig.value = normalized
  selectedResumeTemplateCode.value = normalized.templateCode as ResumeTemplateCode
  pendingResumeTemplateCode.value = selectedResumeTemplateCode.value
  previewAccent.value = normalized.accentColor
}

const openPreviewStep = () => {
  selectMobileWorkspaceTab('preview')
}

watch(mobileWorkspaceTab, (tab) => {
  if (tab === 'preview') {
    activeWorkbenchStep.value = 'preview'
  } else if (activeWorkbenchStep.value === 'preview') {
    activeWorkbenchStep.value = 'fill'
  }
})

const liveFeedbackItems = computed(() => [
  {
    label: '实时预览',
    title: hasPreviewContent.value ? '中间 A4 已同步当前填写内容' : '先写姓名、岗位或项目，中间会生成纸张预览',
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

const failedProjectDraftStorageKey = (targetResumeId: number) =>
  `codecoachai:resume:${targetResumeId}:failed-project-drafts`

const readFailedProjectDrafts = (targetResumeId: number): ResumeProjectVO[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.sessionStorage.getItem(failedProjectDraftStorageKey(targetResumeId))
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter((project): project is ResumeProjectVO =>
      Boolean(project)
      && typeof project === 'object'
      && Number((project as ResumeProjectVO).projectId) < 0
      && Boolean(String((project as ResumeProjectVO).projectName || '').trim())
    )
  } catch {
    return []
  }
}

const writeFailedProjectDrafts = (targetResumeId: number, drafts: ResumeProjectVO[]) => {
  if (typeof window === 'undefined') return
  const storageKey = failedProjectDraftStorageKey(targetResumeId)
  if (!drafts.length) {
    window.sessionStorage.removeItem(storageKey)
    return
  }
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(drafts))
  } catch {
    // Session storage is a recovery aid; the in-page draft remains usable if it is unavailable.
  }
}

const removeFailedProjectDraft = (targetResumeId: number, projectId: number) => {
  writeFailedProjectDrafts(
    targetResumeId,
    readFailedProjectDrafts(targetResumeId).filter((project) => project.projectId !== projectId)
  )
}

const persistDraftProjects = async (
  createdResumeId: number,
  projectSnapshot: ResumeProjectVO[],
  isCurrentOperation: () => boolean
) => {
  let failedCount = 0
  const failedProjects: ResumeProjectVO[] = []
  const createdProjects: Array<{ draftId: number; project: ResumeProjectVO }> = []
  for (const project of projectSnapshot) {
    if (!isCurrentOperation()) {
      return { failedCount, failedProjects, createdProjects, stale: true }
    }
    try {
      const payload = toProjectPayload(project)
      if (project.projectId < 0) {
        const createdProject = await createResumeProjectApi(createdResumeId, payload)
        createdProjects.push({ draftId: project.projectId, project: createdProject })
      } else {
        await updateResumeProjectApi(createdResumeId, project.projectId, payload)
      }
    } catch {
      failedCount++
      if (project.projectId < 0) {
        failedProjects.push(project)
      }
    }
  }
  return { failedCount, failedProjects, createdProjects, stale: !isCurrentOperation() }
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
  historyApplying.value = true
  if (resumeHistoryTimer) clearTimeout(resumeHistoryTimer)
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
  inspectorMode.value = 'edit'
  activeWorkshopModule.value = 'resume-basic'
  selectedResumeTemplateCode.value = 'ATS_SINGLE_COLUMN'
  pendingResumeTemplateCode.value = 'ATS_SINGLE_COLUMN'
  previewAccent.value = 'default'
  previewZoom.value = 0.88
  presentationConfig.value = createDefaultResumePresentation()
  resumeAtsTemplates.value = []
  templateRegistryError.value = ''
  templateGalleryVisible.value = false
  deliveryWorkbenchVisible.value = false
  savedResumeSignature.value = ''
  resumeDocument.hydrate(null)
  resumeHistory.reset()
  detailError.value = ''
  saveError.value = ''
  loading.value = false
  deliveryRefreshKey.value += 1
  void nextTick(() => {
    formRef.value?.clearValidate?.()
    historyApplying.value = false
  })
}

const applyDetail = (detail: ResumeDetailVO) => {
  historyApplying.value = true
  if (resumeHistoryTimer) clearTimeout(resumeHistoryTimer)
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
  presentationConfig.value = normalizeResumePresentation(detail.presentationConfig)
  selectedResumeTemplateCode.value = presentationConfig.value.templateCode as ResumeTemplateCode
  pendingResumeTemplateCode.value = selectedResumeTemplateCode.value
  previewAccent.value = presentationConfig.value.accentColor
  if (!optimizeForm.targetPosition) {
    optimizeForm.targetPosition = detail.targetPosition || ''
  }
  const storedFailedProjects = readFailedProjectDrafts(detail.id)
  const serverProjects = detail.projects || []
  const serverProjectIds = new Set(serverProjects.map((project) => project.projectId))
  projects.value = serverProjects
  resumeDocument.hydrate(detail)
  projects.value = [
    ...serverProjects,
    ...storedFailedProjects.filter((project) => !serverProjectIds.has(project.projectId))
  ]
  resumeHistory.reset(createResumeHistorySnapshot())
  void nextTick(() => {
    historyApplying.value = false
    // 载入时表单与文档投影会做一次性对齐（例如技能分隔符），这一轮排期的自动保存要作废：
    // 基线在对齐之后重取，否则每次打开都会写一条没人改过的草稿。
    resumeAutosave.cancel()
    savedResumeSignature.value = resumeDraftSignature.value
  })
}

const fetchResumeTemplateRegistry = async (
  requestGeneration = resumeLoadGeneration,
  targetResumeId = resumeId.value
) => {
  try {
    const templates = await getResumeAtsTemplatesApi()
    if (!isCurrentResumeRoute(requestGeneration, targetResumeId)) return
    resumeAtsTemplates.value = (templates || []).filter((template) =>
      !template.status || template.status === 'ACTIVE'
    )
    templateRegistryError.value = ''
    if (targetResumeId) return
    const currentRegistryTemplate = resumeAtsTemplates.value.find(
      (template) => template.templateCode === selectedResumeTemplateCode.value
    )
    if (currentRegistryTemplate) {
      return
    } else if (selectableResumeTemplateOptions.value[0]) {
      selectedResumeTemplateCode.value = selectableResumeTemplateOptions.value[0].code
      presentationConfig.value = mergeResumeTemplatePresentation(
        presentationConfig.value,
        resumeAtsTemplates.value.find((template) =>
          template.templateCode === selectedResumeTemplateCode.value
        ) || {}
      )
    }
  } catch (error) {
    if (isCurrentResumeRoute(requestGeneration, targetResumeId)) {
      templateRegistryError.value = getErrorMessage(error, '模板列表暂不可用，已保留当前模板设置。')
    }
  }
}

const fetchDetail = async (targetResumeId: number, requestGeneration: number) => {
  loading.value = true
  detailError.value = ''
  try {
    const nextDetail = await getResumeDetailApi(targetResumeId)
    if (requestGeneration !== resumeLoadGeneration) return
    applyDetail(nextDetail)
    // AI 优化记录属于增强信息，不能阻塞简历编辑和实时预览进入可用状态。
    void fetchOptimizeRecords(targetResumeId, requestGeneration)
  } catch (error) {
    if (requestGeneration === resumeLoadGeneration) {
      detailError.value = getErrorMessage(error, '简历详情加载失败，请返回简历管理重试。')
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
  if (hasUnsavedResumeChanges.value) {
    ElMessage.warning('当前内容尚未保存。请先保存简历，再基于最新稳定版本生成 AI 建议。')
    return
  }
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
    const existingVersions = await getResumeVersionsApi(savedResumeId)
    const shouldCreate = forceCreate || existingVersions.length === 0
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

const validateSaveMode = async (mode: 'draft' | 'complete') => {
  if (!formRef.value) return false
  if (mode === 'draft') {
    if (form.resumeName?.trim()) {
      invalidFieldProps.value = []
      invalidSectionIds.value = []
      return true
    }
    await handleFormValidationFailure({
      fields: {
        resumeName: [{ message: '请输入简历名称' }]
      }
    })
    ElMessage.warning('保存草稿前请先填写简历名称。')
    return false
  }
  try {
    await formRef.value.validate()
    invalidFieldProps.value = []
    invalidSectionIds.value = []
    return true
  } catch (failure) {
    await handleFormValidationFailure(failure)
    return false
  }
}

const draftSaveMessage = (detail: ResumeDetailVO) => {
  const missing = (detail.missingSections || []).slice(0, 3)
  const suffix = missing.length ? `，待补充：${missing.join('、')}` : ''
  return `草稿已保存（${detail.completionPercent ?? completion.value}%）${suffix}`
}

const handleSave = async (mode: 'draft' | 'complete' = 'complete', options: { silent?: boolean } = {}) => {
  if (saving.value || !formRef.value) return
  const operationGeneration = ++resumeSaveOperationGeneration
  const requestGeneration = resumeLoadGeneration
  const editingResumeId = resumeId.value
  const presentationSnapshot = normalizeResumePresentation({
    ...presentationConfig.value,
    templateVersion: activeResumeTemplate.value?.templateVersion
      || presentationConfig.value.templateVersion
  })
  const formSnapshot: ResumeCreateDTO = {
    ...form,
    saveAsDraft: mode === 'draft',
    presentationConfig: presentationSnapshot,
    document: resumeDocument.document.value
  }
  const projectSnapshot = projects.value.map((project) => ({ ...project }))
  const saveSnapshotSignature = createResumeDraftSignature(
    formSnapshot,
    projectSnapshot,
    presentationSnapshot,
    formSnapshot.document
  )
  const shouldCreateVersion = mode === 'complete'
  const isCurrentOperation = () => (
    operationGeneration === resumeSaveOperationGeneration
    && isCurrentResumeRoute(requestGeneration, editingResumeId)
  )

  saving.value = true
  saveError.value = ''
  try {
    if (!(await validateSaveMode(mode))) return
    if (!isCurrentOperation()) return

    if (editingResumeId) {
      const updated = await updateResumeApi(editingResumeId, formSnapshot)
      if (!isCurrentOperation()) return
      const projectResult = await persistDraftProjects(
        editingResumeId,
        projectSnapshot,
        isCurrentOperation
      )
      if (projectResult.stale || !isCurrentOperation()) return
      writeFailedProjectDrafts(editingResumeId, projectResult.failedProjects)
      if (projectResult.failedCount) {
        saveError.value = `简历基础信息已保存，但 ${projectResult.failedCount} 条项目未保存成功，请修复后重试。`
        ElMessage.warning(saveError.value)
        return
      }
      if (mode === 'complete' && formSnapshot.isDefault === 1 && !updated.draft) {
        await setDefaultResumeApi(editingResumeId)
        if (!isCurrentOperation()) return
      } else if (mode === 'complete' && formSnapshot.isDefault === 0 && !updated.draft) {
        await clearDefaultResumeApi(editingResumeId)
        if (!isCurrentOperation()) return
      }
      const stableVersionReady = mode === 'complete'
        ? await ensureStableVersionAfterSave(editingResumeId, shouldCreateVersion, isCurrentOperation)
        : true
      if (stableVersionReady === null || !isCurrentOperation()) return
      const changedDuringSave = resumeDraftSignature.value !== saveSnapshotSignature
      if (!options.silent) {
        ElMessage.success(
          changedDuringSave
            ? '点击保存时的内容已保存，期间的新改动仍未保存，请继续保存。'
            : mode === 'draft'
              ? draftSaveMessage(updated)
              : (stableVersionReady ? '简历与新稳定版本已保存' : '简历已保存')
        )
      }
      saveError.value = ''
      if (!changedDuringSave) {
        await reloadCurrentResume()
        if (!isCurrentOperation()) return
        deliveryRefreshKey.value += 1
      }
    } else {
      const created = await createResumeApi(formSnapshot)
      if (!isCurrentOperation()) return
      const projectResult = await persistDraftProjects(
        created.id,
        projectSnapshot,
        isCurrentOperation
      )
      if (projectResult.stale || !isCurrentOperation()) return
      writeFailedProjectDrafts(created.id, projectResult.failedProjects)
      if (projectResult.failedCount) {
        saveError.value = `简历已创建，但 ${projectResult.failedCount} 条项目未保存成功，请进入编辑页修复后再创建稳定版本。`
        ElMessage.warning(saveError.value)
      }
      if (mode === 'complete' && formSnapshot.isDefault === 1 && !created.draft) {
        await setDefaultResumeApi(created.id)
        if (!isCurrentOperation()) return
      } else if (mode === 'complete' && formSnapshot.isDefault === 0 && !created.draft) {
        await clearDefaultResumeApi(created.id)
        if (!isCurrentOperation()) return
      }
      const stableVersionReady = mode === 'complete' && projectResult.failedCount === 0
        ? await ensureStableVersionAfterSave(created.id, true, isCurrentOperation)
        : true
      if (stableVersionReady === null || !isCurrentOperation()) return
      ElMessage.success(mode === 'draft'
        ? draftSaveMessage(created)
        : (stableVersionReady && projectResult.failedCount === 0
          ? '简历与初始稳定版本已创建'
          : '简历已创建，项目仍需修复后才能生成稳定版本'))
      if (projectResult.failedCount === 0 && stableVersionReady) {
        saveError.value = ''
      }
      await router.replace(`/resumes/${created.id}/edit`)
    }
  } catch (error) {
    if (isCurrentOperation()) {
      saveError.value = getErrorMessage(error, '保存失败，请检查网络后重试。')
      ElMessage.error(saveError.value)
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

const selectInlineProject = (projectId: number) => {
  selectedInlineProjectId.value = projectId
}

const toProjectPayload = (project: ResumeProjectVO): ResumeProjectDTO => ({
  projectName: project.projectName.trim(),
  projectTime: project.projectTime || project.projectPeriod || '',
  projectPeriod: project.projectPeriod || project.projectTime || '',
  projectBackground: project.projectBackground || project.description || '',
  description: project.description || project.projectBackground || '',
  techStack: project.techStack || '',
  responsibility: project.responsibility || project.role || '',
  role: project.role || project.responsibility || '',
  coreFeatures: project.coreFeatures || '',
  highlights: project.highlights || '',
  technicalChallenges: project.technicalChallenges || project.technicalDifficulties || '',
  technicalDifficulties: project.technicalDifficulties || project.technicalChallenges || '',
  optimizationResult: project.optimizationResult || project.optimizationResults || '',
  optimizationResults: project.optimizationResults || project.optimizationResult || '',
  extraInfo: project.extraInfo || '',
  sort: project.sort ?? project.sortOrder ?? 0,
  sortOrder: project.sortOrder ?? project.sort ?? 0
})

const handleSaveInlineProject = async () => {
  const project = selectedInlineProject.value
  if (!project || projectSaving.value) return
  if (!project.projectName.trim()) {
    ElMessage.warning('请先填写项目名称')
    return
  }

  const operationGeneration = ++projectWriteOperationGeneration
  const requestGeneration = resumeLoadGeneration
  const targetResumeId = resumeId.value
  const targetProjectId = project.projectId
  const projectPayload = toProjectPayload(project)
  const isCurrentOperation = () => (
    operationGeneration === projectWriteOperationGeneration
    && isCurrentResumeRoute(requestGeneration, targetResumeId)
  )

  projectSaving.value = true
  try {
    if (!targetResumeId) {
      projects.value = projects.value.map((item) => (
        item.projectId === targetProjectId ? toProjectDraft(projectPayload, targetProjectId) : item
      ))
      ElMessage.success('项目草稿已更新，保存简历后会一起创建')
      return
    }

    if (targetProjectId < 0) {
      await createResumeProjectApi(targetResumeId, projectPayload)
    } else {
      await updateResumeProjectApi(targetResumeId, targetProjectId, projectPayload)
    }
    if (!isCurrentOperation()) return
    if (targetProjectId < 0) {
      removeFailedProjectDraft(targetResumeId, targetProjectId)
    }
    ElMessage.success('项目经历已保存')
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

const openDeliveryChecks = async () => {
  activeWorkbenchStep.value = 'export'
  if (!isEdit.value || !resumeId.value) {
    ElMessage.warning('请先保存简历，再进行版本、分页和导出检查')
    return
  }
  deliveryWorkbenchVisible.value = true
  await nextTick()
}

const openPdfExport = async () => {
  if (!isEdit.value || !resumeId.value) {
    ElMessage.warning('请先保存简历，再导出稳定版本的 PDF')
    return
  }
  if (hasUnsavedResumeChanges.value) {
    ElMessage.warning('当前有未保存改动，请先保存简历再导出 PDF')
    return
  }
  await openDeliveryChecks()
  await deliveryWorkbenchRef.value?.createExport('PDF')
}

const enlargePreview = async () => {
  previewZoom.value = Math.min(1.12, Math.max(previewZoom.value, 1))
  mobileWorkspaceTab.value = 'preview'
  await nextTick()
  document.getElementById('resume-panel-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const openProjectEvidenceCreate = (project: ResumeProjectVO) => {
  if (!resumeId.value || project.projectId <= 0) return
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
    if (targetProjectId && targetProjectId > 0) {
      await updateResumeProjectApi(targetResumeId, targetProjectId, projectPayload)
    } else {
      await createResumeProjectApi(targetResumeId, projectPayload)
    }
    if (!isCurrentOperation()) return
    if (targetProjectId && targetProjectId < 0) {
      removeFailedProjectDraft(targetResumeId, targetProjectId)
    }
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
  if (projectSnapshot.projectId < 0) {
    if (!isCurrentOperation()) return
    projects.value = projectsSnapshot.filter((item) => item.projectId !== projectSnapshot.projectId)
    removeFailedProjectDraft(targetResumeId, projectSnapshot.projectId)
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

watch(selectedResumeTemplateCode, (templateCode) => {
  if (presentationConfig.value.templateCode === templateCode) return
  const registryTemplate = resumeAtsTemplates.value.find(
    (template) => template.templateCode === templateCode
  )
  presentationConfig.value = normalizeResumePresentation({
    ...presentationConfig.value,
    templateCode,
    templateVersion: registryTemplate?.templateVersion
      || presentationConfig.value.templateVersion
      || 1
  })
})

watch(previewAccent, (accentColor) => {
  presentationConfig.value = normalizeResumePresentation({
    ...presentationConfig.value,
    accentColor
  })
})

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
    void fetchResumeTemplateRegistry(requestGeneration, nextResumeId)
    resumeHistory.reset(createResumeHistorySnapshot())
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
  window.removeEventListener('beforeunload', handleResumeBeforeUnload)
  if (resumeHistoryTimer) clearTimeout(resumeHistoryTimer)
})
</script>

<style scoped lang="scss">
.resume-editor {
  --resume-template-paper: #ffffff;
  --resume-paper-border: #d4dbe4;
  --resume-paper-line: #9aa7b5;
  --resume-paper-default: #1b1b18;
  --resume-paper-blue: #3b82f6;
  --resume-paper-green: #1f6f5c;
  --resume-paper-slate: #57534e;
  --resume-paper-red: #ef4444;
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

.resume-workbench-shell {
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

.resume-workbench-editor {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.resume-workbench-editor > .edit-card,
.resume-workbench-editor > .project-section {
  grid-column: 1 / -1;
}

.resume-workbench-inspector {
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
.resume-workbench-preview,
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

.resume-workbench-preview {
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
    background: #1b1b18;
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
      background: var(--resume-paper-slate);
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
      background: #e3e0da;
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
    background: var(--resume-paper-default);
    box-shadow: 0 0 0 1px var(--user-border);
    cursor: pointer;

    &.is-blue { background: #3b82f6; }
    &.is-green { background: #1f6f5c; }
    &.is-purple { background: #8b5cf6; }
    &.is-orange { background: #f97316; }
    &.is-red { background: #ef4444; }
    &.is-slate { background: #57534e; }
    &.is-black { background: #000000; }

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

.preview-layout-controls {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--user-border);
  border-radius: 7px;
  background: var(--user-control-bg);

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--user-text-muted);
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background: var(--user-surface-raised);
      color: var(--user-primary);
      outline: 0;
    }
  }
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
  .resume-workbench-shell {
    grid-template-columns: minmax(0, 1fr) minmax(440px, 1fr);
  }

  .resume-workbench-inspector {
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

  .resume-workbench-shell {
    display: block;
  }

  .resume-workbench-preview {
    position: static;
    height: min(780px, calc(100dvh - 160px));
    max-height: min(780px, calc(100dvh - 160px));
    overflow: visible;
  }

  .resume-paper-wrap {
    flex: 1 1 auto;
    min-height: 0;
  }

  .resume-workbench-inspector {
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

  .resume-workbench-editor,
  .resume-workbench-inspector,
  .form-grid,
  .completion-list,
  .diagnostic-list,
  .section-nav,
  .rewrite-diff {
    grid-template-columns: 1fr;
  }

  .resume-workbench-editor > .edit-card {
    order: -3;
  }

  .resume-workbench-editor > .ai-writing-card {
    order: -2;
  }

  .resume-workbench-editor > .section-nav-card {
    order: -1;
  }

  .editor-section,
  .resume-workbench-preview,
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
    border: 1px solid var(--arena-line);
    border-radius: var(--arena-radius-card);
    background: var(--arena-grn-soft);
    box-shadow: var(--arena-shadow-subtle);

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
  .resume-workbench-preview,
  .side-panel,
  .resume-template-strip {
    border: 1.5px solid var(--arena-line);
    border-radius: var(--arena-radius-card);
    box-shadow: var(--arena-shadow-subtle);
  }

  .live-feedback-strip {
    background: #ffffff;

    article {
      padding: 14px 16px;
    }
  }

  .resume-workbench-shell {
    grid-template-columns: 200px 360px minmax(0, 1fr);
    gap: 18px;
  }

  .resume-template-strip {
    padding: 14px 16px;
    background: #ffffff;
  }

  .resume-template-strip__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;

    h2 {
      margin: 4px 0 0;
      color: var(--resume-text);
      font-size: 17px;
      font-weight: 900;
    }

    p {
      margin: 4px 0 0;
      color: var(--resume-muted);
      font-size: 12px;
    }
  }

  .resume-template-strip .preview-customizer {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    margin-bottom: 0;
  }

  .resume-template-strip .template-selector {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .resume-template-strip .preview-controls {
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
  }

  .resume-workbench-editor {
    grid-column: 3;
    grid-row: 1;
    grid-template-columns: 1fr;
  }

  .resume-workbench-preview {
    grid-column: 2;
    grid-row: 1 / span 2;
    position: sticky;
    top: 18px;
    align-self: start;
  }

  .resume-workbench-preview .preview-toolbar__status {
    display: none;
  }

  .resume-workbench-inspector {
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
    border-color: rgba(111, 92, 147, 0.28);
    background: var(--arena-vio-soft);
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

  .resume-workbench-preview {
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

:deep(.resume-project-dialog .el-dialog) {
  display: flex;
  max-height: min(90dvh, 860px);
  flex-direction: column;
  overflow: hidden;
}

:deep(.resume-project-dialog .el-dialog__header) {
  flex: none;
  margin-right: 0;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--arena-line);
}

:deep(.resume-project-dialog .el-dialog__body) {
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 20px 24px;
}

:deep(.resume-project-dialog .el-dialog__footer) {
  flex: none;
  padding: 14px 24px 18px;
  border-top: 1px solid var(--arena-line);
  background: var(--user-surface);
}

@media (max-width: 760px) {
  :deep(.resume-project-dialog .el-dialog) {
    max-height: calc(100dvh - 24px);
  }

  :deep(.resume-project-dialog .el-dialog__header) {
    padding: 16px 18px 12px;
  }

  :deep(.resume-project-dialog .el-dialog__body) {
    padding: 16px 18px;
  }

  :deep(.resume-project-dialog .el-dialog__footer) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 12px 18px calc(12px + env(safe-area-inset-bottom));

    .el-button {
      width: 100%;
      margin: 0;
    }
  }
}

@media (max-width: 1180px) {
  .arena-resume-studio {
    .resume-workbench-shell {
      grid-template-columns: minmax(310px, 0.8fr) minmax(0, 1fr);
    }

    .resume-workbench-editor {
      grid-column: 2;
    }

    .resume-workbench-preview {
      grid-column: 1;
    }

    .resume-workbench-inspector {
      position: static;
      grid-column: 1 / -1;
      grid-row: 2;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .resume-template-strip .preview-customizer {
      grid-template-columns: 1fr;
    }

    .resume-template-strip .preview-controls {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }
}

@media (max-width: 820px) {
  .arena-resume-studio {
    padding: 16px 14px calc(28px + var(--user-mobile-nav-height, 0px));

    .resume-workbench-shell {
      grid-template-columns: 1fr;
    }

    .resume-workbench-editor,
    .resume-workbench-preview,
    .resume-workbench-inspector {
      position: static;
      grid-column: auto;
      grid-row: auto;
    }

    .resume-workbench-inspector {
      grid-template-columns: 1fr;
    }

    .resume-template-strip__head {
      flex-direction: column;
      gap: 8px;
    }

    .resume-template-strip .template-selector {
      grid-template-columns: 1fr;
    }

    .resume-template-strip .preview-controls {
      align-items: flex-start;
      flex-direction: column;
    }

    .resume-workbench-preview {
      order: 2;
    }
  }
}

// 方向 D 1:1 简历工坊。旧的工作台样式保留给业务表单与弹窗，
// 这里以原型的 modules / preview / editor 网格接管页面构图。
.arena-resume-studio {
  // Direction D keeps the workshop inside the same reading column as the
  // prototype page. A wider canvas makes the preview/editor relationship
  // look disconnected from the primary navigation.
  width: min(1060px, calc(100% - 64px));
  margin-inline: auto !important;
  padding: 28px 0 42px;
  gap: 18px;

  .resume-workshop-hero {
    min-height: 70px;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;

    h1 {
      margin: 0;
      color: var(--arena-ink);
      font-size: 23px;
      font-weight: 900;
      line-height: 1.25;
    }

    p {
      margin: 6px 0 0;
      color: var(--arena-sub);
      font-size: 13.5px;
    }
  }

  .resume-workshop-hero__completion {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 11px;
    padding: 11px 18px;
    border: 1.5px solid var(--arena-line);
    border-radius: var(--arena-radius-card);
    background: #ffffff;
    box-shadow: var(--arena-shadow-subtle);
  }

  .resume-document-status {
    display: grid;
    min-width: 76px;
    gap: 3px;

    span {
      color: var(--arena-mut);
      font-size: 11px;
      line-height: 1.2;
    }

    strong {
      color: var(--arena-ink);
      font-size: 13px;
      font-weight: 850;
      line-height: 1.25;
    }

    strong.is-warning {
      color: #9a5a10;
    }
  }

  .resume-workshop-ring {
    display: grid;
    width: 48px;
    height: 48px;
    place-items: center;
    border-radius: 50%;

    > div {
      display: grid;
      width: 38px;
      height: 38px;
      place-items: center;
      border-radius: 50%;
      background: #ffffff;
    }

    strong {
      color: var(--arena-ink);
      font-size: 12px;
      font-weight: 900;
    }
  }

  .resume-workshop-hero__copy {
    display: grid;
    gap: 3px;
    min-width: 128px;

    strong {
      color: var(--arena-ink);
      font-size: 12px;
      font-weight: 800;
    }

    span {
      color: var(--arena-mut);
      font-size: 11.5px;
      white-space: nowrap;
    }

    b {
      color: var(--arena-amber);
      font-weight: 800;
    }
  }

  .resume-workshop-hero__completion :deep(.el-button) {
    min-height: 40px;
    margin-left: 3px;
    border-radius: var(--arena-radius-btn);
    font-size: 13px;
  }

  .live-feedback-strip,
  .mobile-feedback-details,
  .ai-writing-card {
    display: none;
  }

  .resume-template-strip {
    padding: 14px 18px;
    border-radius: var(--arena-radius-card);
    background: #ffffff;
  }

  .resume-template-strip__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;
    cursor: pointer;
    list-style: none;

    h2 {
      margin: 0;
      color: var(--arena-ink);
      font-size: 13px;
      font-weight: 800;
    }

    div > span {
      display: block;
      margin-top: 3px;
      color: var(--arena-mut);
      font-size: 11.5px;
    }
  }

  .resume-template-strip__head::-webkit-details-marker {
    display: none;
  }

  .resume-template-strip:not([open]) > .resume-template-strip__head {
    margin-bottom: 0;
  }

  .resume-template-strip__body {
    padding-top: 12px;
    border-top: 1px solid var(--arena-line);
  }

  .export-check-list {
    margin-bottom: 14px;
  }

  .resume-template-strip__hint {
    color: var(--arena-mut);
    font-size: 11.5px;
  }

  .resume-template-strip .preview-customizer {
    display: block;
    margin: 0;
  }

  .resume-template-strip .preview-controls {
    display: none;
  }

  .resume-template-strip .template-selector {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(188px, 1fr));
    gap: 12px;
  }

  .resume-template-strip .template-selector > button {
    position: relative;
    display: grid;
    grid-template-columns: 68px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: start;
    min-height: 0;
    padding: 10px;
    border: 1.5px solid var(--arena-line);
    border-radius: 10px;
    background: #ffffff;
    color: var(--arena-sub);
    text-align: left;

    .template-thumb {
      width: 68px;
      height: 92px;
      border: 1.5px solid var(--arena-line);
      border-radius: 7px;
      background: #ffffff;
      box-shadow: var(--arena-shadow-subtle);
    }

    .template-copy {
      display: grid;
      gap: 4px;
      min-width: 0;
    }

    strong {
      color: var(--arena-sub);
      font-size: 12px;
      font-weight: 800;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }

    small {
      display: block;
      margin: 0;
      overflow: visible;
      color: var(--arena-mut);
      font-size: 10.5px;
      line-height: 1.45;
      text-overflow: clip;
      white-space: normal;
      overflow-wrap: anywhere;
    }

    .template-facts {
      display: grid;
      gap: 4px;
      margin: 3px 0 0;
    }

    .template-facts div {
      display: grid;
      grid-template-columns: 50px minmax(0, 1fr);
      gap: 5px;
      min-width: 0;
      font-size: 10px;
      line-height: 1.42;
    }

    .template-facts dt {
      color: var(--arena-mut);
      font-weight: 700;
    }

    .template-facts dd {
      min-width: 0;
      margin: 0;
      color: var(--arena-sub);
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    > svg {
      margin-top: 1px;
      padding: 2px;
      border-radius: 50%;
      background: #ffffff;
      color: var(--arena-grn);
    }

    &:hover .template-thumb,
    &:focus-visible .template-thumb {
      border-color: var(--arena-grn);
      outline: 0;
    }

    &.active {
      border-color: var(--arena-grn);
      background: var(--arena-grn-soft);

      .template-thumb {
        border-color: var(--arena-grn);
        box-shadow: 0 0 0 3px var(--arena-grn-soft);
      }

      strong {
        color: var(--arena-grn-d);
      }
    }

    &.locked .template-thumb {
      opacity: 0.62;
      filter: grayscale(0.12);
    }
  }

  .resume-workbench-shell {
    grid-template-columns: 200px 360px minmax(0, 1fr);
    gap: 18px;
    align-items: start;
  }

  .export-check-list {
    grid-template-columns: 1fr;
    gap: 8px;
    margin-top: 12px;
  }

  .export-check-item {
    display: grid;
    gap: 5px;
    min-width: 0;
    padding: 9px 10px;
    border: 1px solid var(--arena-line);
    border-radius: 8px;
    background: #ffffff;

    p {
      margin: 0;
      color: var(--arena-sub);
      font-size: 11px;
      line-height: 1.55;
      overflow-wrap: anywhere;
    }

    &.is-pass {
      border-color: #d5e8e0;
    }

    &.is-warning {
      border-color: #e8c898;
      background: #fffaf1;
    }
  }

  .export-check-item__head {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    min-width: 0;

    svg {
      flex: 0 0 auto;
      margin-top: 1px;
      color: var(--arena-mut);
    }

    strong {
      min-width: 0;
      flex: 1 1 auto;
      color: var(--arena-ink);
      font-size: 11.5px;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    span {
      flex: 0 0 auto;
      padding: 2px 5px;
      border-radius: 999px;
      background: var(--arena-grn-soft);
      color: var(--arena-grn-d);
      font-size: 9px;
      font-weight: 800;
      line-height: 1.3;
    }
  }

  .export-check-item.is-pass .export-check-item__head svg {
    color: var(--arena-grn);
  }

  .export-check-item.is-warning .export-check-item__head svg {
    color: #9a5a10;
  }

  .resume-workbench-inspector {
    grid-column: 1;
    grid-row: 1;
    align-content: start;
    gap: 0;
    padding: 0;
  }

  .resume-workbench-inspector > .side-panel:not(.section-nav-card) {
    display: none;
  }

  .resume-workbench-inspector > .export-check-panel {
    display: grid;
    margin-top: 12px;
    padding: 12px;
  }

  .export-check-panel .full-button {
    min-height: 42px;
    height: auto;
    padding-block: 8px;
    line-height: 1.4;
    white-space: normal;
  }

  .section-nav-card {
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  .section-nav-card .panel-kicker {
    display: none;
  }

  .section-nav {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
    margin: 0;
  }

  .section-nav button {
    position: relative;
    display: flex;
    min-height: 48px;
    padding: 10px 12px 14px;
    border: 1.5px solid var(--arena-line);
    border-radius: 12px;
    background: #ffffff;
    color: var(--arena-ink);
    font-size: 12.5px;
    font-weight: 800;
    text-align: left;

    svg {
      color: var(--arena-amber);
    }

    &::after {
      position: absolute;
      right: 12px;
      bottom: 8px;
      left: 42px;
      height: 4px;
      border-radius: 999px;
      background: var(--arena-line);
      content: '';
    }

    &.done {
      border-color: #d5e8e0;
      background: #ffffff;

      svg {
        color: var(--arena-grn);
      }

      &::after {
        background: var(--arena-grn);
      }
    }

    &.active {
      border-color: var(--arena-grn);
      background: var(--arena-grn-soft);
      box-shadow: none;

      &::after {
        right: 42px;
        background: var(--arena-grn);
      }
    }
  }

  .resume-workbench-preview {
    grid-column: 2;
    grid-row: 1;
    height: auto;
    max-height: none;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  .preview-toolbar {
    align-items: center;
    margin: 0 0 8px;

    h2 {
      color: var(--arena-ink);
      font-size: 12.5px;
      font-weight: 800;
    }

    p {
      display: none;
    }
  }

  .resume-preview-page-chip {
    padding: 4px 9px;
    border-radius: 999px;
    background: var(--arena-grn-soft);
    color: var(--arena-grn-d);
    font-size: 10px;
    font-weight: 800;
  }

  .resume-paper-wrap {
    padding: 0;
    border-radius: 14px;
    background: transparent;
  }

  .resume-paper-stage {
    transform-origin: top center;
  }

  .resume-workbench-editor {
    grid-column: 3;
    grid-row: 1;
    gap: 14px;
  }

  .resume-workbench-editor > .edit-card,
  .resume-workbench-editor > .project-section {
    min-height: 27rem;
    padding: 20px 22px;
    border-radius: var(--arena-radius-card);
  }

  .edit-card .section-heading {
    margin-bottom: 14px;
  }

  .edit-card .section-icon {
    display: none;
  }

  .edit-card .section-heading h2,
  .project-section .section-heading h2 {
    color: var(--arena-ink);
    font-size: 15px;
    font-weight: 900;
  }

  .edit-card .section-heading p,
  .project-section .section-heading p {
    color: var(--arena-sub);
    font-size: 12px;
  }

  .editor-block {
    padding-top: 0;
    border-top: 0;
  }

  .editor-block + .editor-block {
    margin-top: 0;
  }

  .custom-section {
    padding: 14px 18px 18px;
  }

  .project-section {
    display: flex;
    flex-direction: column;
  }

  .project-section .project-header {
    align-items: flex-start;
  }

  .project-section .project-header :deep(.el-button) {
    min-height: 40px;
    border-radius: var(--arena-radius-btn);
  }

  .project-header__actions {
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }

  .project-switcher {
    display: flex;
    gap: 8px;
    margin: 2px 0 14px;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: thin;
  }

  .project-switcher button {
    display: grid;
    flex: 0 0 min(190px, 48%);
    gap: 3px;
    min-width: 0;
    padding: 10px 11px;
    border: 1.5px solid var(--arena-line);
    border-radius: 10px;
    background: #ffffff;
    color: var(--arena-sub);
    text-align: left;
    cursor: pointer;
    transition: border-color 160ms ease, background-color 160ms ease;

    span,
    small {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    span {
      color: var(--arena-ink);
      font-size: 12px;
      font-weight: 800;
    }

    small {
      color: var(--arena-mut);
      font-size: 10.5px;
      line-height: 1.35;
    }

    &:hover,
    &:focus-visible {
      border-color: var(--arena-grn);
      outline: 0;
    }

    &.active {
      border-color: var(--arena-grn);
      background: var(--arena-grn-soft);
    }
  }

  .inline-project-editor {
    display: grid;
    gap: 12px;
  }

  .inline-project-editor :deep(.el-form-item) {
    margin: 0;
  }

  .inline-project-editor :deep(.el-form-item__label) {
    padding-bottom: 6px;
    color: var(--arena-sub);
    font-size: 11.5px;
    font-weight: 800;
    line-height: 1.3;
  }


  .inline-project-editor__meta {
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(128px, 0.7fr);
    gap: 12px;
  }


  .inline-project-skills {
    display: grid;
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 8px;
    align-items: start;
    margin: 12px 0 0;
  }

  .inline-project-skills > span {
    padding-top: 5px;
    color: var(--arena-sub);
    font-size: 11.5px;
    font-weight: 800;
  }

  .inline-project-skills > div {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    min-width: 0;
  }

  .inline-project-skills :deep(.el-tag) {
    max-width: 100%;
    border-color: #d5e8e0;
    border-radius: 999px;
    background: var(--arena-grn-soft);
    color: var(--arena-grn-d);
    font-weight: 700;
  }

  .workshop-ai-rewrite {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    margin: 14px 0;
    padding: 13px 14px;
    border: 1.5px dashed var(--arena-vio);
    border-radius: 14px;
    background: rgba(124, 92, 252, 0.05);
  }

  .workshop-ai-rewrite > div {
    display: grid;
    gap: 5px;
    min-width: 0;
  }

  .workshop-ai-rewrite span {
    color: var(--arena-vio);
    font-size: 10.5px;
    font-weight: 800;
  }

  .workshop-ai-rewrite strong {
    color: var(--arena-ink);
    font-size: 13px;
  }

  .workshop-ai-rewrite p {
    margin: 0;
    color: var(--arena-sub);
    font-size: 11.5px;
    line-height: 1.55;
  }

  .workshop-ai-rewrite__before {
    color: var(--arena-mut) !important;
  }

  .workshop-ai-rewrite__after {
    color: var(--arena-ink) !important;
    font-weight: 700;
  }

  .workshop-ai-rewrite > .workshop-ai-rewrite__actions {
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .workshop-ai-rewrite :deep(.el-button) {
    flex: 0 0 auto;
    min-height: 38px;
    border-radius: 12px;
    font-size: 12px;
  }

  .project-list {
    flex: 1;
  }

  .project-empty :deep(.el-button) {
    margin-top: 6px;
    border-radius: var(--arena-radius-btn);
  }

  .resume-preview-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin-top: 10px;
  }

  .resume-preview-actions :deep(.el-button) {
    min-height: 38px;
    margin: 0;
    border-color: var(--arena-line);
    border-radius: var(--arena-radius-btn);
    background: #ffffff;
    color: var(--arena-sub);
    font-size: 12px;
    font-weight: 800;
  }

  .resume-preview-actions :deep(.el-button:hover),
  .resume-preview-actions :deep(.el-button:focus-visible) {
    border-color: var(--arena-grn);
    color: var(--arena-grn-d);
  }

  .project-card {
    padding: 12px;
    border-color: var(--arena-line);
    border-radius: 13px;
    background: #ffffff;
  }

  .resume-delivery-details {
    overflow: hidden;
    border: 1.5px solid var(--arena-line);
    border-radius: var(--arena-radius-card);
    background: #ffffff;
  }

  .resume-delivery-details > summary {
    min-height: 50px;
    padding: 16px 18px;
    color: var(--arena-sub);
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
  }
}

@media (max-width: 1180px) {
  .arena-resume-studio {
    width: min(100%, 1060px);
    padding-inline: 24px;

    .resume-workbench-shell {
      grid-template-columns: 180px minmax(300px, 0.9fr) minmax(0, 1fr);
      gap: 14px;
    }

    .resume-template-strip .template-selector {
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    }
  }
}

@media (max-width: 1020px) {
  .arena-resume-studio {
    .resume-workbench-shell {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 0;
      align-items: start;
    }

    .resume-workbench-inspector {
      display: none;
    }

    .workspace-tabs {
      display: flex;
    }

    .resume-workbench-editor {
      grid-column: 1;
      grid-row: 1;
    }

    .resume-workbench-preview {
      grid-column: 1;
      grid-row: 1;
      height: auto;
      max-height: none;
    }

    .resume-template-strip .template-selector {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      padding: 3px;
      scroll-snap-type: x proximity;
    }

    .resume-template-strip .template-selector > button {
      flex: 0 0 min(290px, 82vw);
      scroll-snap-align: start;
    }
  }
}

@media (max-width: 720px) {
  .arena-resume-studio {
    width: 100%;
    padding: 18px 14px calc(26px + var(--user-mobile-nav-height, 60px) + env(safe-area-inset-bottom));
    gap: 14px;

    .resume-workshop-hero {
      align-items: flex-start;
    }

    .resume-workshop-hero h1 {
      font-size: 22px;
    }

    .resume-workshop-hero p {
      display: none;
    }

    .resume-workshop-hero__completion {
      gap: 7px;
      padding: 0;
      border: 0;
      background: transparent;
      box-shadow: none;
    }

    .resume-workshop-ring,
    .resume-workshop-hero__copy,
    .resume-document-status {
      display: none;
    }

    .resume-workshop-hero__completion :deep(.el-button) {
      min-height: 38px;
      margin: 0;
      padding-inline: 12px;
    }

    .resume-template-strip {
      padding: 13px 14px;
    }

    .resume-template-strip__hint {
      display: none;
    }

    .resume-template-strip .template-selector {
      gap: 10px;
    }

    .resume-template-strip .template-selector > button {
      grid-template-columns: 58px minmax(0, 1fr) auto;
      flex-basis: min(272px, 84vw);
      padding: 9px;

      .template-thumb {
        width: 58px;
        height: 80px;
      }

      .template-facts div {
        grid-template-columns: 46px minmax(0, 1fr);
      }
    }

    .resume-workbench-preview {
      height: auto;
      max-height: none;
    }

    .resume-paper-wrap {
      overflow: hidden;
    }

    .resume-paper-stage {
      transform-origin: top left;
    }

    .resume-workbench-shell {
      grid-template-columns: minmax(0, 1fr);
      gap: 0;
    }

    .preview-toolbar {
      display: grid;
      gap: 6px;
      margin-bottom: 8px;

      h2 {
        font-size: 11px;
        line-height: 1.35;
      }

      p {
        display: none;
      }
    }

    .resume-preview-page-chip {
      justify-self: start;
      padding: 3px 6px;
      font-size: 9px;
    }

    .resume-preview-actions {
      grid-template-columns: 1fr;
    }

    .resume-preview-actions :deep(.el-button) {
      min-height: 34px;
      padding-inline: 6px;
      font-size: 10px;
      white-space: normal;
    }

    .resume-workbench-editor > .edit-card,
    .resume-workbench-editor > .project-section {
      min-height: 0;
      padding: 16px;
    }

    .project-section .project-header {
      gap: 10px;
    }

    .project-header__actions {
      width: 100%;
    }

    .project-header__actions :deep(.el-button) {
      flex: 1 1 0;
    }

    .workshop-ai-rewrite {
      flex-direction: column;
      gap: 10px;
    }

    .workshop-ai-rewrite > .workshop-ai-rewrite__actions {
      width: 100%;
    }

    .workshop-ai-rewrite__actions :deep(.el-button) {
      flex: 1 1 0;
    }

    .inline-project-editor__meta,
    .inline-project-skills {
      grid-template-columns: 1fr;
    }

    .inline-project-skills > span {
      padding-top: 0;
    }

    .resume-preview-actions {
      gap: 8px;
    }
  }
}

// Resume workbench v2. This final scoped layer owns only the resume editor route.
.resume-workbench-page.resume-editor {
  --resume-workbench-bg: #edebe7;
  --resume-workbench-surface: #ffffff;
  --resume-workbench-surface-soft: #f0efeb;
  --resume-workbench-line: #e3e0da;
  --resume-workbench-line-strong: #c9c4bb;
  --resume-workbench-text: #1a1917;
  --resume-workbench-text-soft: #57534e;
  --resume-workbench-muted: #6e6963;
  --resume-workbench-accent: #1f6f5c;
  --resume-workbench-accent-strong: #1a5e4e;
  --resume-workbench-accent-soft: #eaf2ef;
  --resume-workbench-success: #1f6f5c;
  --resume-workbench-success-soft: #eaf2ef;
  --resume-workbench-warning: #b4690e;
  width: 100%;
  max-width: none;
  display: flex;
  flex-direction: column;
  min-height: calc(100dvh - 62px);
  height: calc(100dvh - 62px);
  padding: 0;
  overflow: hidden;
  background: var(--resume-workbench-bg);
  color: var(--resume-workbench-text);

  .workspace-tabs {
    display: none;
  }

  .resume-save-error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 18px;
    border-bottom: 1px solid color-mix(in srgb, var(--resume-workbench-warning) 45%, var(--resume-workbench-line));
    background: var(--user-warning-soft);
    color: var(--user-warning-text, var(--user-warning));

    b {
      display: block;
      font-size: 12px;
    }

    p {
      margin: 3px 0 0;
      font-size: 11px;
      line-height: 1.45;
    }

    :deep(.el-button) {
      flex: 0 0 auto;
      margin: 0;
      border-radius: 6px;
    }
  }

  .resume-workbench-shell {
    display: grid;
    flex: 1 1 auto;
    grid-template-columns: 220px minmax(0, 1fr) minmax(360px, 420px);
    grid-template-rows: minmax(0, 1fr);
    gap: 0;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    background: var(--resume-workbench-bg);
  }

  .resume-workbench-pane--preview,
  .resume-workbench-pane--editor,
  .resume-workbench-pane--inspector {
    position: static;
    top: auto;
    align-self: stretch;
    min-width: 0;
    min-height: 0;
    height: 100%;
    margin: 0;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .resume-workbench-pane--preview {
    position: relative;
    top: auto;
    grid-column: 2;
    grid-row: 1;
    display: flex;
    flex-direction: column;
    max-height: 100%;
    padding: 0;
    overflow: hidden;
    background: var(--resume-workbench-bg);
  }

  .preview-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    min-height: 55px;
    padding: 0 18px;
    border-bottom: 1px solid var(--resume-workbench-line);
    background: var(--resume-workbench-surface);

    > div:first-child {
      display: flex;
      align-items: baseline;
      min-width: 0;
      gap: 8px;
    }

    > div:first-child > span {
      color: var(--resume-workbench-muted);
      font-size: 11px;
    }

    h2 {
      overflow: hidden;
      margin: 0;
      color: var(--resume-workbench-text);
      font-size: 13px;
      font-weight: 700;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .preview-toolbar__actions {
    display: flex;
    align-items: center;
    gap: 8px;

    > button {
      min-height: 32px;
      padding: 0 10px;
      border: 1px solid var(--resume-workbench-line-strong);
      border-radius: 6px;
      background: var(--resume-workbench-surface);
      color: var(--resume-workbench-text-soft);
      font: inherit;
      font-size: 11.5px;
      font-weight: 650;
      cursor: pointer;

      &:hover,
      &:focus-visible {
        border-color: var(--resume-workbench-accent);
        color: var(--resume-workbench-accent);
        outline: 0;
      }
    }
  }

  .zoom-control {
    display: grid;
    grid-template-columns: 30px 48px 30px;
    align-items: center;
    min-height: 32px;
    overflow: hidden;
    border: 1px solid var(--resume-workbench-line-strong);
    border-radius: 6px;
    background: var(--resume-workbench-surface);

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 30px;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--resume-workbench-muted);
      cursor: pointer;

      &:hover,
      &:focus-visible {
        background: var(--resume-workbench-surface-soft);
        color: var(--resume-workbench-accent);
        outline: 0;
      }

      &:disabled {
        cursor: not-allowed;
        opacity: 0.38;
      }
    }

    span {
      color: var(--resume-workbench-text-soft);
      font-size: 10.5px;
      font-variant-numeric: tabular-nums;
      text-align: center;
    }
  }

  .resume-paper-wrap {
    display: block;
    flex: 1 1 auto;
    min-height: 0;
    max-height: none;
    padding: 24px 32px 38px;
    overflow: auto;
    background: var(--resume-workbench-bg);
    scrollbar-gutter: stable both-edges;
  }

  .resume-paper-stage {
    width: 100%;
    min-width: 0;
    max-width: 100%;
    margin: 0 auto;
    transform-origin: top center;
    zoom: var(--resume-preview-zoom);

    > * {
      margin-inline: auto;
    }
  }

  .resume-preview-actions {
    display: flex;
    align-items: center;
    min-height: 52px;
    gap: 8px;
    padding: 8px 16px;
    border-top: 1px solid var(--resume-workbench-line);
    background: var(--resume-workbench-surface);

    :deep(.el-button) {
      min-height: 32px;
      margin: 0;
      border-radius: 6px;
      font-size: 11.5px;
    }

    .resume-preview-page-chip {
      margin-left: auto;
      color: var(--resume-workbench-muted);
      font-size: 10.5px;
    }
  }

  .resume-workbench-pane--editor,
  .resume-workbench-pane--inspector {
    grid-column: 3;
    grid-row: 1;
    align-content: start;
    max-height: 100%;
    padding: 0;
    overflow: auto;
    border-left: 1px solid var(--resume-workbench-line);
    background: var(--resume-workbench-surface);
    scrollbar-gutter: stable;
  }

  .resume-workbench-pane--editor {
    display: flex;
    flex-direction: column;

    > .editor-section {
      order: 1;
    }

    > .ai-writing-card {
      order: 2;
    }
  }

  .resume-inspector-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 18px;
    border-bottom: 1px solid var(--resume-workbench-line);
    background: var(--resume-workbench-surface);

    > div {
      min-width: 0;
    }

    &__eyebrow {
      color: var(--resume-workbench-muted);
      font-size: 10.5px;
    }

    h1 {
      margin: 4px 0 0;
      color: var(--resume-workbench-text);
      font-size: 17px;
      line-height: 1.25;
    }

    p {
      max-width: 280px;
      margin: 5px 0 0;
      color: var(--resume-workbench-muted);
      font-size: 11.5px;
      line-height: 1.5;
    }
  }

  .resume-inspector-header__template {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 6px;
    min-height: 32px;
    max-width: 160px;
    padding: 0 9px;
    border: 1px solid var(--resume-workbench-line);
    border-radius: 6px;
    background: var(--resume-workbench-surface);
    color: var(--resume-workbench-text-soft);
    font: inherit;
    font-size: 11px;
    cursor: pointer;

    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &:hover,
    &:focus-visible {
      border-color: var(--resume-workbench-accent);
      color: var(--resume-workbench-accent);
      outline: 0;
    }
  }

  .resume-workbench-pane--inspector {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .resume-workbench-pane--inspector > .side-panel:not(.section-nav-card) {
    display: block;
  }

  .resume-workbench-pane--inspector > .export-check-panel {
    margin-top: 0;
    padding: 16px 18px;
  }

  .resume-inspector-heading,
  .section-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin: 0;
    padding: 18px 18px 14px;
    border-bottom: 1px solid var(--resume-workbench-line);
    background: var(--resume-workbench-surface);
  }

  .resume-inspector-heading {
    position: sticky;
    top: 0;
    z-index: 2;

    > div {
      min-width: 0;
    }

    span {
      color: var(--resume-workbench-muted);
      font-size: 10.5px;
    }

    h2 {
      margin: 4px 0 0;
      color: var(--resume-workbench-text);
      font-size: 15px;
    }

    button {
      min-height: 30px;
      padding: 0 9px;
      border: 1px solid var(--resume-workbench-line);
      border-radius: 6px;
      background: var(--resume-workbench-surface);
      color: var(--resume-workbench-text-soft);
      font: inherit;
      font-size: 11px;
      cursor: pointer;
    }
  }

  .section-heading {
    position: sticky;
    top: 0;
    z-index: 2;

    .section-icon {
      display: none;
    }

    h2 {
      margin: 0;
      color: var(--resume-workbench-text);
      font-size: 15px;
    }

    p {
      margin: 5px 0 0;
      color: var(--resume-workbench-muted);
      font-size: 11.5px;
      line-height: 1.55;
    }
  }

  .content-card,
  .side-panel,
  .editor-section {
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  .editor-section {
    padding: 0;
  }

  .resume-form,
  .inline-project-editor {
    display: grid;
    gap: 0;
    padding: 4px 18px 18px;
  }

  .editor-block {
    padding: 13px 0 3px;
    border-bottom: 1px solid var(--resume-workbench-line);

    &:last-child {
      border-bottom: 0;
    }
  }

  .block-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    color: var(--resume-workbench-text);
    font-size: 12px;
    font-weight: 700;
  }

  .form-grid,
  .inline-project-editor__meta {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 10px;
  }

  :deep(.el-form-item) {
    margin-bottom: 13px;
  }

  :deep(.el-form-item__label) {
    height: auto;
    margin-bottom: 6px;
    color: var(--resume-workbench-text-soft);
    font-size: 11.5px;
    font-weight: 650;
    line-height: 1.35;
  }

  :deep(.el-input__wrapper),
  :deep(.el-textarea__inner),
  :deep(.el-input-number) {
    border-radius: 6px;
    box-shadow: 0 0 0 1px var(--resume-workbench-line-strong) inset;
  }

  :deep(.el-input__wrapper:hover),
  :deep(.el-textarea__inner:hover),
  :deep(.el-input__wrapper.is-focus),
  :deep(.el-textarea__inner:focus) {
    box-shadow: 0 0 0 1px var(--resume-workbench-accent) inset;
  }

  .form-actions {
    position: sticky;
    bottom: 0;
    z-index: 2;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 11px 18px;
    border-top: 1px solid var(--resume-workbench-line);
    background: var(--resume-workbench-surface);
  }

  .draft-save-hint {
    margin-right: auto;
    color: var(--resume-workbench-muted);
    font-size: 11px;
    line-height: 32px;
  }

  .ai-writing-card {
    margin: 0;
    padding: 13px 18px 16px;
    border-top: 1px solid var(--resume-workbench-line);
    background: var(--resume-workbench-surface-soft);

    h3 {
      margin: 8px 0 4px;
      color: var(--resume-workbench-text);
      font-size: 13px;
    }

    > p {
      margin: 0;
      color: var(--resume-workbench-muted);
      font-size: 11px;
      line-height: 1.55;
    }

    .prompt-list {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .prompt-card {
      min-height: 86px;
    }
  }

  .panel-kicker {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--resume-workbench-accent);
    font-size: 10.5px;
    font-weight: 700;
  }

  .prompt-list {
    display: grid;
    gap: 6px;
    margin-top: 11px;
  }

  .prompt-card {
    display: grid;
    gap: 3px;
    padding: 10px;
    border: 1px solid var(--resume-workbench-line);
    border-radius: 6px;
    background: var(--resume-workbench-surface);
    color: var(--resume-workbench-text);
    font: inherit;
    text-align: left;
    cursor: pointer;

    span,
    small {
      color: var(--resume-workbench-muted);
      font-size: 10.5px;
    }

    strong {
      font-size: 11.5px;
    }

    &:hover,
    &:focus-visible {
      border-color: var(--resume-workbench-accent);
      outline: 0;
    }
  }

  .project-section {
    padding: 0;
  }

  .project-header__actions,
  .workshop-ai-rewrite__actions {
    display: flex;
    gap: 7px;
  }

  .project-switcher {
    display: flex;
    gap: 4px;
    padding: 10px 18px 0;
    overflow-x: auto;

    button {
      flex: 0 0 auto;
      min-width: 120px;
      padding: 8px 9px;
      border: 1px solid var(--resume-workbench-line);
      border-radius: 6px;
      background: var(--resume-workbench-surface);
      color: var(--resume-workbench-muted);
      font: inherit;
      text-align: left;
      cursor: pointer;

      span,
      small {
        display: block;
      }

      span {
        color: var(--resume-workbench-text);
        font-size: 11.5px;
        font-weight: 650;
      }

      small {
        margin-top: 3px;
        font-size: 10px;
      }

      &.active {
        border-color: var(--resume-workbench-accent);
        background: var(--resume-workbench-accent-soft);
      }
    }
  }

  .workshop-ai-rewrite,
  .project-empty {
    margin: 0 18px 18px;
    padding: 13px;
    border: 1px solid var(--resume-workbench-line);
    border-radius: 7px;
    background: var(--resume-workbench-surface-soft);
  }

  .project-empty {
    display: grid;
    justify-items: start;
    gap: 8px;

    h3,
    p {
      margin: 0;
    }

    p {
      color: var(--resume-workbench-muted);
      font-size: 11.5px;
      line-height: 1.55;
    }
  }

  .side-panel {
    margin: 0;
    padding: 16px 18px;
    border-bottom: 1px solid var(--resume-workbench-line);

    h3,
    p {
      margin-top: 0;
    }

    h3 {
      color: var(--resume-workbench-text);
      font-size: 13px;
    }

    > p {
      color: var(--resume-workbench-muted);
      font-size: 11px;
      line-height: 1.55;
    }
  }

  .completion-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: var(--resume-workbench-text-soft);
    font-size: 11.5px;

    strong {
      color: var(--resume-workbench-accent);
    }
  }

  .completion-list,
  .diagnostic-list,
  .gap-list,
  .evidence-list,
  .optimize-records,
  .rewrite-list {
    display: grid;
    gap: 7px;
    margin-top: 10px;
  }

  .completion-list > span,
  .diagnostic-list > span,
  .evidence-list > div,
  .export-check-item,
  .gap-list article,
  .record-row,
  .rewrite-list article {
    min-width: 0;
    padding: 9px 10px;
    border: 1px solid var(--resume-workbench-line);
    border-radius: 6px;
    background: var(--resume-workbench-surface-soft);
  }

  .completion-list > span,
  .diagnostic-list > span {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--resume-workbench-muted);
    font-size: 11px;

    &.done {
      color: var(--resume-workbench-success);
    }
  }

  .export-check-item__head {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--resume-workbench-text);
    font-size: 11px;

    > span {
      margin-left: auto;
      color: var(--resume-workbench-muted);
      font-size: 9.5px;
    }
  }

  .export-check-item p,
  .gap-list p {
    margin: 5px 0 0;
    color: var(--resume-workbench-muted);
    font-size: 10.5px;
    line-height: 1.5;
  }

  .full-button {
    width: 100%;
    margin-top: 10px;
  }

  .optimize-form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 10px;
  }

  .optimize-form :deep(.el-form-item:first-child),
  .optimize-form :deep(.el-form-item:last-child) {
    grid-column: 1 / -1;
  }

  .record-row {
    display: grid;
    gap: 3px;
    color: var(--resume-workbench-text);
    font: inherit;
    text-align: left;
    cursor: pointer;

    small {
      color: var(--resume-workbench-muted);
      font-size: 10px;
    }
  }

  .rewrite-toolbar,
  .rewrite-head,
  .score-line,
  .capability-item,
  .sse-progress__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .rewrite-diff {
    display: grid;
    gap: 7px;
    margin-top: 7px;

    p {
      margin: 3px 0 0;
      font-size: 10.5px;
      line-height: 1.5;
    }

    span {
      color: var(--resume-workbench-muted);
      font-size: 9.5px;
    }
  }

  .ai-empty,
  .sse-progress,
  .optimize-result {
    margin-top: 11px;
    padding: 10px;
    border: 1px solid var(--resume-workbench-line);
    border-radius: 6px;
    background: var(--resume-workbench-surface-soft);
    color: var(--resume-workbench-muted);
    font-size: 11px;
  }

  .resume-editor-state {
    margin: auto;
  }
}

:global(.resume-delivery-dialog) {
  --el-dialog-border-radius: 8px;
}

:global(.resume-delivery-dialog .el-dialog__body) {
  max-height: min(800px, calc(100dvh - 150px));
  padding: 0 18px 18px;
  overflow: auto;
}

@media (max-width: 1180px) {
  .resume-workbench-page.resume-editor {
    .resume-workbench-shell {
      grid-template-columns: 64px minmax(0, 1fr) 340px;
    }
  }
}

@media (max-width: 1260px) {
  .resume-workbench-page.resume-editor {
    height: auto;
    min-height: calc(100dvh - 62px);
    overflow: visible;

    .workspace-tabs {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      min-height: 44px;
      padding: 5px;
      border-bottom: 1px solid var(--resume-workbench-line);
      background: var(--resume-workbench-surface);

      button {
        min-width: 108px;
        min-height: 32px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--resume-workbench-muted);
        font: inherit;
        font-size: 12px;
        font-weight: 650;
        cursor: pointer;

        &.active {
          background: var(--resume-workbench-accent-soft);
          color: var(--resume-workbench-accent);
        }
      }
    }

    .resume-workbench-shell {
      display: block;
      width: 100%;
      min-height: 0;
      max-width: 100%;
      overflow-x: hidden;
    }

    .resume-workbench-editor,
    .resume-workbench-inspector,
    .resume-workbench-preview {
      position: static;
      width: 100%;
      min-width: 0;
      max-width: 100%;
      height: min(780px, calc(100dvh - var(--resume-mobile-workbench-chrome)));
      max-height: min(780px, calc(100dvh - var(--resume-mobile-workbench-chrome)));
      border-left: 0;
      overflow: auto;
    }

    .resume-paper-wrap {
      flex: 1 1 auto;
      min-height: 0;
      padding-inline: 18px;
      overflow-x: hidden;
    }

    .resume-paper-stage {
      width: 100%;
      min-width: 0;
      max-width: 100%;
      zoom: 1;
    }
  }
}

@media (max-width: 720px) {
  .resume-workbench-page.resume-editor {
    --resume-mobile-workbench-chrome: 196px;

    min-height: calc(100dvh - 54px);

    .resume-workbench-editor,
    .resume-workbench-inspector,
    .resume-workbench-preview {
      height: auto;
      min-height: calc(100dvh - var(--resume-mobile-workbench-chrome));
      max-height: none;
    }

    .preview-toolbar {
      padding-inline: 12px;
    }

    .resume-save-error {
      align-items: flex-start;
      flex-direction: column;
      gap: 8px;
      padding-inline: 14px;
    }

    .preview-toolbar > div:first-child > span,
    .preview-toolbar__actions > button {
      display: none;
    }

    .resume-paper-wrap {
      min-height: calc(100dvh - 298px);
      padding: 14px 8px 24px;
    }

    .resume-preview-actions {
      flex-wrap: wrap;
      padding-inline: 12px;
    }

    .resume-preview-actions .resume-preview-page-chip {
      width: 100%;
      margin: 0;
    }

    .form-grid,
    .inline-project-editor__meta,
    .optimize-form {
      grid-template-columns: 1fr;
    }

    .optimize-form :deep(.el-form-item) {
      grid-column: auto;
    }

    .section-heading,
    .resume-inspector-heading {
      padding-inline: 14px;
    }

    .resume-form,
    .inline-project-editor {
      padding-inline: 14px;
    }

    .project-header {
      align-items: stretch;
      flex-direction: column;
    }

    .project-header__actions {
      width: 100%;
    }

    .project-header__actions :deep(.el-button) {
      flex: 1 1 0;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .resume-workbench-page.resume-editor {
    .prompt-card,
    .project-switcher button,
    .preview-toolbar button {
      transition: none;
    }
  }
}

// Content-level constraints. Panel placement and collapse states are owned by
// ResumeWorkbenchShell.vue.
.resume-workbench-page.resume-editor {
  --resume-mobile-workbench-chrome: 212px;
  gap: 0;

  .resume-workbench-module-tabs {
    flex: 0 0 auto;
    padding-inline: 16px;
    border-bottom: 1px solid var(--resume-workbench-line, var(--user-border));
    background: var(--resume-workbench-surface, var(--user-surface));
  }

  .preview-toolbar {
    min-width: 0;

    > div:first-child {
      flex: 1 1 auto;
      overflow: hidden;
    }
  }

  .preview-toolbar__actions {
    flex: 0 0 auto;
  }

  .resume-paper-wrap {
    box-sizing: border-box;
    min-width: 0;
    max-width: 100%;
    overscroll-behavior: contain;
  }
}

@media (max-width: 1380px) and (min-width: 1261px) {
  .resume-workbench-page.resume-editor {
    .resume-paper-wrap {
      padding-inline: 18px;
    }
  }
}

@media (max-width: 1260px) {
  .resume-workbench-page.resume-editor {
    .workspace-tabs {
      display: flex;
    }

    .resume-paper-stage {
      zoom: var(--resume-preview-zoom);
    }

    .resume-workbench-pane--editor > .ai-writing-card .prompt-list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
}

@media (max-width: 720px) {
  .resume-workbench-page.resume-editor {
    .resume-workbench-pane--editor > .ai-writing-card .prompt-list {
      grid-template-columns: 1fr;
    }
  }
}
</style>
