const parserSchemaLabels: Record<string, string> = {
  schemaVersion: '解析版本',
  basicInfo: '基本信息',
  name: '姓名',
  realName: '姓名',
  gender: '性别',
  age: '年龄',
  phone: '电话',
  mobile: '电话',
  email: '邮箱',
  location: '所在地',
  city: '城市',
  targetPosition: '目标岗位',
  expectedSalary: '期望薪资',
  summary: '个人摘要',
  skills: '技能',
  skillTags: '技能标签',
  workExperiences: '工作经历',
  workExperience: '工作经历',
  company: '公司',
  position: '职位',
  period: '时间范围',
  responsibilities: '职责',
  achievements: '成果',
  projectExperiences: '项目经历',
  projectExperience: '项目经历',
  projectName: '项目名称',
  background: '项目背景',
  role: '项目角色',
  coreFeatures: '核心功能',
  technicalDifficulties: '技术难点',
  technicalChallenges: '技术难点',
  optimizationResults: '优化结果',
  optimizationResult: '优化结果',
  techStack: '技术栈',
  educationExperiences: '教育经历',
  educationExperience: '教育经历',
  education: '教育经历',
  school: '学校',
  degree: '学历',
  major: '专业',
  graduationYear: '毕业年份',
  description: '说明',
  startDate: '开始时间',
  endDate: '结束时间',
  advantages: '优势',
  certificates: '证书',
  languages: '语言能力'
}

export interface ResumeParserSchemaField {
  label: string
  known: boolean
  rawKey?: string
}

export const describeResumeParserSchemaField = (key: string): ResumeParserSchemaField => {
  const rawKey = String(key || '').trim()
  const label = parserSchemaLabels[rawKey]
  if (label) {
    return { label, known: true }
  }
  return {
    label: '未识别字段',
    known: false,
    rawKey
  }
}

export const resumeParserSchemaLabel = (key: string) =>
  describeResumeParserSchemaField(key).label

export const isKnownResumeParserSchemaKey = (key: string) =>
  describeResumeParserSchemaField(key).known
