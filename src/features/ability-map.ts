import type { AbilityDomainVO, AbilityMapVO, AbilitySkillNodeVO, AbilityStatus } from '@/types/abilityMap'

type AbilitySkillInput = Partial<AbilitySkillNodeVO>
type AbilityDomainInput = Omit<Partial<AbilityDomainVO>, 'skills'> & {
  skills?: AbilitySkillInput[]
}
type AbilityMapInput = Omit<Partial<AbilityMapVO>, 'domains'> & {
  domains?: AbilityDomainInput[]
}

export const statusLabel = (status?: AbilityStatus) => {
  const labels: Record<string, string> = {
    UNASSESSED: '未评估',
    WEAK: '薄弱',
    BASIC: '基础',
    COMPETENT: '合格',
    STRONG: '强项'
  }
  const safeStatus = safeCode(status, 'UNASSESSED')
  return labels[safeStatus] || '未评估'
}

export const statusTagType = (status?: AbilityStatus) => {
  const types: Record<string, 'info' | 'warning' | 'success' | 'primary' | 'danger'> = {
    UNASSESSED: 'info',
    WEAK: 'danger',
    BASIC: 'warning',
    COMPETENT: 'primary',
    STRONG: 'success'
  }
  return types[safeCode(status, 'UNASSESSED')] || 'info'
}

const replacementCharCode = 0xfffd
const euroSignCode = 0x20ac
const privateUseStart = 0xe000
const privateUseEnd = 0xf8ff
const rareMojibakeCodePoints = new Set([
  0x9225,
  0x9227,
  0x9286,
  0x9358,
  0x935a,
  0x935d,
  0x9369,
  0x937a,
  0x93b5,
  0x93b6,
  0x93c2,
  0x93c4,
  0x93c6,
  0x93c8,
  0x93c9,
  0x93cd,
  0x9410,
  0x9413,
  0x9422,
  0x9436,
  0x9473,
  0x951b,
  0x951f
])

const DOMAIN_NAME_MAP: Record<string, string> = {
  JAVA_CORE: 'Java 基础',
  JAVA_BASIC: 'Java 基础',
  JAVA: 'Java 基础',
  COLLECTION: '集合框架',
  COLLECTIONS: '集合与数据结构',
  DATA_STRUCTURE: '数据结构',
  ALGORITHM: '算法与复杂度',
  JVM: 'JVM 与性能',
  CONCURRENCY: '并发编程',
  THREADING: '并发编程',
  SPRING: 'Spring 生态',
  SPRING_BOOT: 'Spring Boot',
  DATABASE: '数据库',
  MYSQL: 'MySQL',
  REDIS: 'Redis',
  CACHE: '缓存设计',
  MESSAGE_QUEUE: '消息队列',
  MQ: '消息队列',
  DISTRIBUTED: '分布式系统',
  DISTRIBUTED_SYSTEM: '分布式系统',
  MICROSERVICE: '微服务治理',
  SYSTEM_DESIGN: '系统设计',
  PROJECT: '项目表达',
  PROJECT_EXPRESSION: '项目表达',
  ENGINEERING: '工程实践',
  ENGINEERING_PRACTICE: '工程实践',
  COMMUNICATION: '面试表达'
}

const SKILL_NAME_MAP: Record<string, string> = {
  JAVA_CORE: 'Java 基础',
  JAVA_BASIC: 'Java 基础',
  COLLECTION: '集合框架',
  COLLECTION_HASHMAP: 'HashMap 与集合选型',
  COLLECTIONS: '集合与数据结构',
  JAVA_COLLECTIONS: '集合与数据结构',
  DATA_STRUCTURE: '数据结构',
  ALGORITHM: '算法与复杂度',
  JVM: 'JVM 与性能分析',
  JVM_MEMORY_GC: 'JVM 内存与 GC',
  CONCURRENCY: '并发编程',
  JUC_THREAD_POOL: '线程池与并发工具',
  THREAD_POOL: '线程池',
  SPRING: 'Spring 核心机制',
  SPRING_BOOT: 'Spring Boot 实战',
  MYSQL: 'MySQL 查询与索引',
  MYSQL_INDEX_TX: 'MySQL 索引与事务',
  REDIS: 'Redis 缓存设计',
  REDIS_CACHE: 'Redis 缓存设计',
  MESSAGE_QUEUE: '消息队列可靠性',
  MQ: '消息队列可靠性',
  DISTRIBUTED_LOCK: '分布式锁',
  DISTRIBUTED_SYSTEM: '分布式系统设计',
  TRANSACTION: '事务与一致性',
  MYBATIS_ORM: 'MyBatis 映射与 SQL',
  MICROSERVICE: '微服务治理',
  SYSTEM_DESIGN: '系统设计表达',
  PROJECT: '项目证据表达',
  PROJECT_EXPRESSION: '项目证据表达',
  ENGINEERING_PRACTICE: '工程实践'
}

const isMojibake = (value?: unknown) => {
  if (typeof value !== 'string') return false
  let rareCount = 0
  for (const char of value) {
    const codePoint = char.codePointAt(0)
    if (codePoint === replacementCharCode) return true
    if (codePoint === euroSignCode) return true
    if (typeof codePoint === 'number' && codePoint >= privateUseStart && codePoint <= privateUseEnd) return true
    if (typeof codePoint === 'number' && rareMojibakeCodePoints.has(codePoint)) rareCount += 1
  }
  return rareCount >= 2
}

const safeCode = (value: unknown, fallback = '') => {
  const text = typeof value === 'string' ? value.trim() : ''
  return text && !isMojibake(text) ? text : fallback
}

const safeText = (value: unknown, fallback: string) => {
  const text = typeof value === 'string' ? value.trim() : ''
  return text && !isMojibake(text) ? text : fallback
}

const codeKey = (value?: unknown) => safeCode(value).toUpperCase()

const domainFallbackName = (domainCode?: unknown) =>
  DOMAIN_NAME_MAP[codeKey(domainCode)] || '能力方向'

const skillFallbackName = (skillCode?: unknown, domainCode?: unknown) =>
  SKILL_NAME_MAP[codeKey(skillCode)] || DOMAIN_NAME_MAP[codeKey(domainCode)] || '能力点目录'

export const normalizeAbilityMap = (data?: AbilityMapInput | null): AbilityMapVO => {
  const domains = (data?.domains || []).map((domain) => {
    const domainCode = safeCode(domain.domainCode)
    const domainName = safeText(domain.domainName, domainFallbackName(domainCode))
    const skills = (domain.skills || []).map((skill) => normalizeSkill(skill, domainCode, domainName))
    return {
      domainCode,
      domainName,
      totalCount: domain.totalCount ?? skills.length,
      assessedCount: domain.assessedCount ?? skills.filter((skill) => skill.status !== 'UNASSESSED').length,
      weakCount: domain.weakCount ?? skills.filter((skill) => skill.status === 'WEAK').length,
      skills
    }
  })
  const allSkills = domains.flatMap((domain) => domain.skills)
  const assessedSkillCount = data?.assessedSkillCount ?? allSkills.filter((skill) => skill.status !== 'UNASSESSED').length
  const hasTrainingData = data?.hasTrainingData ?? assessedSkillCount > 0

  if (data?.hasTrainingData === false) {
    const unassessedDomains = domains.map((domain) => ({
      ...domain,
      assessedCount: 0,
      weakCount: 0,
      skills: domain.skills.map((skill) => ({
        ...skill,
        status: 'UNASSESSED',
        evidenceCount: 0,
        lastEvaluatedAt: undefined,
        confidence: 'UNKNOWN',
        summary: ''
      }))
    }))

    return {
      userId: data?.userId,
      totalSkillCount: data?.totalSkillCount ?? allSkills.length,
      assessedSkillCount: 0,
      weakSkillCount: 0,
      strongSkillCount: 0,
      hasTrainingData: false,
      domains: unassessedDomains
    }
  }

  return {
    userId: data?.userId,
    totalSkillCount: data?.totalSkillCount ?? allSkills.length,
    assessedSkillCount,
    weakSkillCount: data?.weakSkillCount ?? allSkills.filter((skill) => skill.status === 'WEAK').length,
    strongSkillCount: data?.strongSkillCount ?? allSkills.filter((skill) => skill.status === 'STRONG').length,
    hasTrainingData,
    domains
  }
}

const normalizeSkill = (
  skill: Partial<AbilitySkillNodeVO>,
  fallbackDomainCode = '',
  fallbackDomainName = '能力方向'
): AbilitySkillNodeVO => ({
  id: skill.id,
  code: safeCode(skill.code),
  name: safeText(skill.name, skillFallbackName(skill.code, skill.domainCode || fallbackDomainCode)),
  domainCode: safeCode(skill.domainCode, fallbackDomainCode),
  domainName: safeText(skill.domainName, fallbackDomainName),
  description: safeText(skill.description, '当前能力点描述暂不可用，先按能力目录进入训练。'),
  sortOrder: skill.sortOrder ?? 0,
  status: safeCode(skill.status, 'UNASSESSED'),
  evidenceCount: skill.evidenceCount ?? 0,
  lastEvaluatedAt: skill.lastEvaluatedAt,
  confidence: safeCode(skill.confidence, 'UNKNOWN'),
  summary: safeText(skill.summary, '')
})
