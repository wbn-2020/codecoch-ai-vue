import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { resolveBackendRoot } from './workspace-paths.mjs'

const frontendRoot = process.cwd()
const backendRoot = resolveBackendRoot(frontendRoot)

const files = {
  candidateBuilder: path.join(backendRoot, 'codecoachai-ai/src/main/java/com/codecoachai/ai/agent/service/impl/CandidateTaskBuilderImpl.java'),
  contextBuilder: path.join(backendRoot, 'codecoachai-ai/src/main/java/com/codecoachai/ai/agent/service/impl/AgentContextBuilderImpl.java'),
  resumeCareerService: path.join(backendRoot, 'codecoachai-resume/src/main/java/com/codecoachai/resume/service/impl/V4ResumeCareerServiceImpl.java'),
  innerApplicationController: path.join(backendRoot, 'codecoachai-resume/src/main/java/com/codecoachai/resume/controller/InnerJobApplicationController.java'),
  agentTaskAction: path.join(frontendRoot, 'src/utils/agentTaskAction.ts'),
  agentToday: path.join(frontendRoot, 'src/views/agent/AgentTodayView.vue'),
  agentTasks: path.join(frontendRoot, 'src/views/agent/AgentTaskListView.vue'),
  agentRunDetail: path.join(frontendRoot, 'src/views/agent/AgentRunDetailView.vue'),
  jobCoachHome: path.join(frontendRoot, 'src/views/user/JobCoachHomeView.vue'),
  agentTypes: path.join(frontendRoot, 'src/types/agent.ts')
}

const content = Object.fromEntries(
  await Promise.all(Object.entries(files).map(async ([key, file]) => [key, await readFile(file, 'utf8')]))
)

const failures = []
const expect = (condition, message) => {
  if (!condition) failures.push(message)
}
const hasAll = (text, needles) => needles.every((needle) => text.includes(needle))

expect(hasAll(content.candidateBuilder, [
  'applicationFollowUpTasks(context)',
  'AgentTaskTypeEnum.APPLICATION_FOLLOW_UP.name()',
  '"JOB_APPLICATION"',
  'application.getId()',
  '"/applications"',
  'applicationFollowUpRank'
]), 'Backend candidate builder should generate application follow-up tasks linked to job applications')

expect(hasAll(content.contextBuilder, [
  'resolveApplications(userId, targetJob.getId(), context)',
  'resumeFeignClient.listAgentApplications(userId, targetJobId)',
  'setFollowUpOverdue',
  'setFollowUpDueToday'
]), 'Agent context builder should include application follow-up context')

expect(hasAll(content.resumeCareerService, [
  'AGENT_APPLICATION_ACTIVE_STATUSES',
  'listAgentApplicationContextForUser',
  'JobApplication::getTargetJobId',
  'fillFollowUpState'
]), 'Resume service should expose active application follow-up context for Agent')

expect(content.innerApplicationController.includes('@RequestMapping("/inner/applications")'), 'Resume inner application context endpoint should exist')
expect(content.agentTypes.includes("| 'APPLICATION_FOLLOW_UP'"), 'Frontend AgentTaskType should include application follow-up')

expect(hasAll(content.agentTaskAction, [
  'export const isAgentJobApplicationTask',
  "return type === 'APPLICATION_FOLLOW_UP' || bizType === 'JOB_APPLICATION'",
  'export const validAgentTaskActionUrl',
  "if (isAgentJobApplicationTask(task)) return path === TASK_CENTER_PATH || path.startsWith('/applications')",
  'export const hasAgentTaskActionEntry',
  'export const buildAgentTaskActionPath',
  'if (isAgentJobApplicationTask(task)) {',
  "path = actionUrl && path !== TASK_CENTER_PATH ? path : '/applications'",
  'appendTaskContext(params, task)'
]), 'Frontend Agent task action helper should route application follow-up tasks to applications')

expect(hasAll(content.agentToday, [
  "from '@/utils/agentTaskAction'",
  'isAgentJobApplicationTask',
  'hasAgentTaskActionEntry',
  "buildAgentTaskActionPath(task, '/agent/today')",
  "APPLICATION_FOLLOW_UP: '投递跟进'",
  "JOB_APPLICATION: '投递进度'",
  'goAction(buildAgentTaskActionPath(startedTask || task'
]), 'Agent Today should use shared helper for application follow-up task routing')

expect(hasAll(content.agentTasks, [
  "from '@/utils/agentTaskAction'",
  'isAgentJobApplicationTask',
  'hasAgentTaskActionEntry',
  'buildAgentTaskActionPath(task)',
  "{ label: '投递跟进', value: 'APPLICATION_FOLLOW_UP' }",
  "APPLICATION_FOLLOW_UP: '投递跟进'",
  "JOB_APPLICATION: '投递进度'",
  'goAction(buildAgentTaskActionPath(startedTask || task))',
  "label: isAgentJobApplicationTask(task) ? '查看投递进度' : '打开任务入口'"
]), 'Agent Task Center should filter, label, start, and recover application follow-up tasks')

expect(hasAll(content.jobCoachHome, [
  "from '@/utils/agentTaskAction'",
  'isAgentJobApplicationTask',
  'hasAgentTaskActionEntry',
  "buildAgentTaskActionPath(task, '/agent/today')",
  "APPLICATION_FOLLOW_UP: '投递跟进'",
  "APPLICATION_FOLLOW_UP: '查看投递进度并补充沟通记录。'",
  "if (isAgentJobApplicationTask(task)) return '把投递状态和下一次跟进沉淀回今日计划'",
  "if (isAgentJobApplicationTask(task)) return { icon: Briefcase, tone: 'tone-green' }",
  "label: isAgentJobApplicationTask(task) ? '查看投递进度' : '打开任务入口'"
]), 'Job Coach Home should display and route application follow-up tasks')

expect(hasAll(content.agentRunDetail, [
  "buildAgentTaskActionPath(task, '/agent/tasks')",
  "APPLICATION_FOLLOW_UP: '投递跟进'"
]), 'Agent run detail should label application follow-up tasks')

if (failures.length) {
  console.error(`Phase 8 application follow-up checks failed: ${failures.length}`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Phase 8 application follow-up checks passed.')
