import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { resolveBackendRoot } from './workspace-paths.mjs'

const frontendRoot = process.cwd()
const backendRoot = resolveBackendRoot(frontendRoot)

const files = {
  interviewTypes: path.join(frontendRoot, 'src/types/interview.ts'),
  interviewApi: path.join(frontendRoot, 'src/api/interview.ts'),
  reportView: path.join(frontendRoot, 'src/views/interview/InterviewReportView.vue'),
  createView: path.join(frontendRoot, 'src/views/interview/InterviewCreateView.vue'),
  interviewReportVo: path.join(backendRoot, 'codecoachai-interview/src/main/java/com/codecoachai/interview/domain/vo/InterviewReportVO.java'),
  interviewService: path.join(backendRoot, 'codecoachai-interview/src/main/java/com/codecoachai/interview/service/impl/InterviewServiceImpl.java'),
  aiService: path.join(backendRoot, 'codecoachai-ai/src/main/java/com/codecoachai/ai/service/impl/AiServiceImpl.java')
}

const content = Object.fromEntries(
  await Promise.all(Object.entries(files).map(async ([key, file]) => [key, await readFile(file, 'utf8')]))
)

const failures = []
const expect = (condition, message) => {
  if (!condition) failures.push(message)
}
const hasAll = (text, needles) => needles.every((needle) => text.includes(needle))

expect(hasAll(content.createView, [
  'targetJobId',
  'skillProfileId',
  'matchReportId',
  'createInterviewByJobTargetApi'
]), 'Interview create flow should keep passing targetJobId, skillProfileId, and matchReportId')

expect(hasAll(content.interviewReportVo, [
  'private String targetJobTitle',
  'private String targetCompanyName',
  'private String jdEvidenceSummary',
  'private List<InterviewReportMissingSkillVO> missingSkills'
]), 'Backend InterviewReportVO should expose non-raw JD target context and missing skills')

expect(hasAll(content.interviewService, [
  'enrichReportWithJdContext',
  'setTargetJobId(session.getTargetJobId())',
  'resumeFeignClient.getSkillProfile',
  'setMissingSkills',
  'setJdEvidenceSummary'
]), 'Interview report service should enrich report VO from session and skill profile context')

expect(hasAll(content.aiService, [
  'dto.getSkillGapContext()',
  'dto.getTargetJobId()',
  'dto.getSkillProfileId()',
  'dto.getMatchReportId()',
  'skillGapContext'
]), 'AI report prompt variables should consume JD and skill gap context')

expect(hasAll(content.interviewTypes, [
  'export interface InterviewReportMissingSkillVO',
  'targetJobId?: number',
  'skillProfileId?: number',
  'matchReportId?: number',
  'targetJobTitle?: string',
  'targetCompanyName?: string',
  'jdEvidenceSummary?: string',
  'missingSkills?: InterviewReportMissingSkillVO[]'
]), 'Frontend InterviewReportVO type should include JD context and missing skill rows')

expect(hasAll(content.interviewApi, [
  'targetJobTitle:',
  'targetCompanyName:',
  'jdEvidenceSummary:',
  'missingSkills: normalizeMissingSkills'
]), 'Frontend report normalization should map JD context from backend response')

expect(hasAll(content.reportView, [
  'jdAlignmentCards',
  'missingSkillRows',
  'goTargetJobAnalysis',
  'goSkillProfile',
  'goJdGapPractice',
  'target-job-alignment',
  'missing-skill-list'
]), 'Interview report page should display target-job alignment, missing skills, and JD follow-up actions')

if (failures.length) {
  console.error(`Phase 9 JD interview customization checks failed: ${failures.length}`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Phase 9 JD interview customization checks passed.')
