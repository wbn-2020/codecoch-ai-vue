import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { resolveBackendRoot } from './workspace-paths.mjs'

const frontendRoot = process.cwd()
const javaRoot = resolveBackendRoot(frontendRoot)

const files = {
  javaService: path.join(javaRoot, 'codecoachai-ai/src/main/java/com/codecoachai/ai/agent/service/impl/JobCoachAgentServiceImpl.java'),
  javaController: path.join(javaRoot, 'codecoachai-ai/src/main/java/com/codecoachai/ai/agent/controller/InnerAgentController.java'),
  javaNotifier: path.join(javaRoot, 'codecoachai-question/src/main/java/com/codecoachai/question/service/impl/AgentBusinessActionNotifier.java'),
  javaPracticeService: path.join(javaRoot, 'codecoachai-question/src/main/java/com/codecoachai/question/service/impl/PracticeServiceImpl.java'),
  javaQuestionService: path.join(javaRoot, 'codecoachai-question/src/main/java/com/codecoachai/question/service/impl/QuestionServiceImpl.java'),
  javaQuestionTest: path.join(javaRoot, 'codecoachai-question/src/test/java/com/codecoachai/question/service/impl/QuestionServiceImplTest.java'),
  javaPracticeTest: path.join(javaRoot, 'codecoachai-question/src/test/java/com/codecoachai/question/service/impl/PracticeServiceImplTest.java'),
  vueTypes: path.join(frontendRoot, 'src/types/question.ts'),
  vueApi: path.join(frontendRoot, 'src/api/question.ts'),
  vueView: path.join(frontendRoot, 'src/views/question/QuestionPracticeSessionView.vue')
}

const [service, controller, notifier, practiceService, questionService, questionTest, practiceTest, vueTypes, vueApi, vueView] = await Promise.all([
  readFile(files.javaService, 'utf8'),
  readFile(files.javaController, 'utf8'),
  readFile(files.javaNotifier, 'utf8'),
  readFile(files.javaPracticeService, 'utf8'),
  readFile(files.javaQuestionService, 'utf8'),
  readFile(files.javaQuestionTest, 'utf8'),
  readFile(files.javaPracticeTest, 'utf8'),
  readFile(files.vueTypes, 'utf8'),
  readFile(files.vueApi, 'utf8'),
  readFile(files.vueView, 'utf8')
])

const failures = []
const expect = (cond, msg) => { if (!cond) failures.push(msg) }

expect(service.includes('completeBusinessAction'), 'Java service should implement completeBusinessAction')
expect(service.includes('.eq(AgentTask::getTaskType, taskType)'), 'Java service should match by task type')
expect(service.includes('TARGET_JOB'), 'Java service should bind related biz type TARGET_JOB')
expect(service.includes('findBusinessActionTask'), 'Java service should have task lookup helper')
expect(
  controller.includes('@RequestMapping("/inner/agent")') &&
    controller.includes('@PostMapping("/job-coach/business-actions/complete")'),
  'Inner agent controller should expose business-action completion endpoint'
)
expect(notifier.includes('completeQuestionPractice(Long userId, Long targetJobId, Long evidenceBizId)'), 'Notifier should complete question practice with user/job context')
expect(notifier.includes('event.setRelatedBizType("TARGET_JOB")'), 'Notifier should send TARGET_JOB related biz type')
expect(notifier.includes('event.setRelatedBizId(targetJobId)'), 'Notifier should send target job id as related biz id')
expect(practiceService.includes('agentBusinessActionNotifier.completeQuestionPractice'), 'Practice service should notify agent best-effort')
expect(questionService.includes('agentBusinessActionNotifier.completeQuestionPractice'), 'Question service should notify agent best-effort')
expect(questionTest.includes('submitAnswerCompletesAgentPracticeTaskWhenTargetJobContextExists'), 'Question service test should cover agent linkage')
expect(practiceTest.includes('submitCompletesAgentQuestionPracticeTaskWhenTargetJobContextExists'), 'Practice service test should cover agent linkage')
expect(vueTypes.includes('targetJobId?: number'), 'Question types should include targetJobId')
expect(vueTypes.includes('agentTaskCompleted?: boolean'), 'Question types should expose agentTaskCompleted')
expect(vueApi.includes('targetJobId: data.targetJobId'), 'Question API should transmit targetJobId')
expect(vueView.includes('routeTargetJobId'), 'Practice session view should read targetJobId from route')
expect(vueView.includes('targetJobId: routeTargetJobId.value'), 'Practice session view should send targetJobId when submitting answer')
expect(vueView.includes('agentTaskCompleted'), 'Practice session view should render agent task completion feedback')
expect(vueView.includes('agent-sync-alert__meta'), 'Practice session view should display agent task id/status details')
expect(vueView.includes('lastResult.agentTaskStatus'), 'Practice session view should show agent task status')

if (failures.length) {
  console.error(`Phase 6 linkage check failed: ${failures.length}`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Phase 6 linkage check passed.')
