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
  return labels[String(status || 'UNASSESSED')] || String(status || '未评估')
}

export const statusTagType = (status?: AbilityStatus) => {
  const types: Record<string, 'info' | 'warning' | 'success' | 'primary' | 'danger'> = {
    UNASSESSED: 'info',
    WEAK: 'danger',
    BASIC: 'warning',
    COMPETENT: 'primary',
    STRONG: 'success'
  }
  return types[String(status || 'UNASSESSED')] || 'info'
}

export const normalizeAbilityMap = (data?: AbilityMapInput | null): AbilityMapVO => {
  const domains = (data?.domains || []).map((domain) => {
    const skills = (domain.skills || []).map((skill) => normalizeSkill(skill))
    return {
      domainCode: domain.domainCode || '',
      domainName: domain.domainName || domain.domainCode || '',
      totalCount: domain.totalCount ?? skills.length,
      assessedCount: domain.assessedCount ?? skills.filter((skill) => skill.status !== 'UNASSESSED').length,
      weakCount: domain.weakCount ?? skills.filter((skill) => skill.status === 'WEAK').length,
      skills
    }
  })
  const allSkills = domains.flatMap((domain) => domain.skills)
  const assessedSkillCount = data?.assessedSkillCount ?? allSkills.filter((skill) => skill.status !== 'UNASSESSED').length
  return {
    userId: data?.userId,
    totalSkillCount: data?.totalSkillCount ?? allSkills.length,
    assessedSkillCount,
    weakSkillCount: data?.weakSkillCount ?? allSkills.filter((skill) => skill.status === 'WEAK').length,
    strongSkillCount: data?.strongSkillCount ?? allSkills.filter((skill) => skill.status === 'STRONG').length,
    hasTrainingData: data?.hasTrainingData ?? assessedSkillCount > 0,
    domains
  }
}

const normalizeSkill = (skill: Partial<AbilitySkillNodeVO>): AbilitySkillNodeVO => ({
  id: skill.id,
  code: skill.code || '',
  name: skill.name || skill.code || '',
  domainCode: skill.domainCode || '',
  domainName: skill.domainName || skill.domainCode || '',
  description: skill.description || '',
  sortOrder: skill.sortOrder ?? 0,
  status: skill.status || 'UNASSESSED',
  evidenceCount: skill.evidenceCount ?? 0,
  lastEvaluatedAt: skill.lastEvaluatedAt,
  confidence: skill.confidence || 'UNKNOWN',
  summary: skill.summary || ''
})
