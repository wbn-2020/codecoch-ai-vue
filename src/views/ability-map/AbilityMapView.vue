<template>
  <div class="arena arena-ability ability-map page-shell" v-loading="loading">
    <section class="growth-hero ability-summary">
      <div class="growth-hero__main">
        <div class="eyebrow">
          <Map :size="16" />
          技能树 · 已点亮 {{ abilityMap.assessedSkillCount }} / {{ abilityMap.totalSkillCount }}
        </div>
        <h1>你的技能树 <span aria-hidden="true">🌳</span></h1>
        <p>
          把训练记录、能力状态和证据沉淀放到同一张地图里，先看哪些能力已经可用，再决定下一组题练什么。
        </p>
        <div class="hero-actions">
          <el-button @click="router.push('/project-evidence')">
            <FolderOpen :size="16" />
            补项目证据
          </el-button>
          <el-button type="primary" @click="startDomainTraining(activeDomain)">
            <Play :size="16" />
            开始专项训练
          </el-button>
        </div>
      </div>

      <aside class="next-training-card next-training-card--desktop" :class="{ 'is-muted': !abilityMap.hasTrainingData }">
        <div class="next-training-card__label">
          <Target :size="16" />
          下一组训练建议
        </div>
        <h2>{{ nextTrainingTitle }}</h2>
        <p>{{ nextTrainingDescription }}</p>
        <div class="next-training-card__meta">
          <span>
            <BookOpenCheck :size="15" />
            {{ nextTrainingMeta }}
          </span>
          <span>
            <ShieldCheck :size="15" />
            {{ trainingTrustText }}
          </span>
        </div>
        <el-button type="primary" size="large" @click="startRecommendedTraining">
          {{ nextTrainingActionLabel }}
          <ArrowRight :size="16" />
        </el-button>
      </aside>
    </section>

    <el-alert
      v-if="!loading && !abilityMap.hasTrainingData"
      class="honesty-alert"
      type="info"
      :closable="false"
      show-icon
      title="暂无训练评估数据：当前只展示能力点目录，不生成强项、薄弱项或训练结论。"
    />

    <section v-if="loadError" class="load-error-card">
      <div>
        <AlertTriangle :size="18" />
        <strong>能力图谱暂时加载失败</strong>
        <p>{{ loadError }}</p>
      </div>
      <el-button type="primary" plain :loading="loading" @click="fetchAbilityMap">重试</el-button>
    </section>

    <section v-else-if="!abilityMap.domains.length && !loading" class="empty-map-card">
      <CircleHelp :size="28" />
      <h2>还没有能力点目录</h2>
      <p>完成一次题库训练或模拟面试后，这里会逐步形成能力图谱。</p>
      <el-button type="primary" @click="router.push('/questions/practice')">先做一组训练</el-button>
    </section>

    <section v-else class="ability-tree-layout">
      <header class="ability-tree-head">
        <div>
          <span>技能树 · 已点亮 {{ abilityMap.assessedSkillCount }} / {{ abilityMap.totalSkillCount }}</span>
          <h2>你的技能树</h2>
          <p>未评估项保持未点亮，不用猜测；优先补齐能同时提升战力和岗位覆盖的能力。</p>
        </div>
        <div class="ability-formula">
          <div
            class="ability-formula__ring"
            :style="{ background: `conic-gradient(var(--arena-grn) 0 ${abilityPower}%, var(--arena-line) ${abilityPower}% 100%)` }"
          >
            <span>{{ abilityPower }}</span>
          </div>
          <p v-if="abilityMap.hasTrainingData">战力 = 简历 30% + 岗位 20%<br />训练 30% + 面试 20%</p>
          <p v-else>暂无训练评估<br />尚未生成战力结论</p>
        </div>
      </header>

      <div class="ability-node-board">
        <template v-for="(domain, index) in abilityMap.domains" :key="domain.domainCode">
          <section
            class="ability-domain-card"
            :class="{ active: domain.domainCode === activeDomainCode }"
          >
            <button class="ability-domain-head" type="button" @click="activeDomainCode = domain.domainCode">
              <span>
                <strong>{{ safeDomainName(domain) }}</strong>
                <small>{{ domainWeakText(domain) }}</small>
              </span>
              <em>{{ domain.assessedCount }}/{{ domain.totalCount }}</em>
            </button>
            <div class="ability-node-grid">
              <button
                v-for="skill in domain.skills"
                :key="skill.code"
                class="ability-node"
                :class="skillCardClass(skill)"
                type="button"
                :aria-label="`训练${safeSkillName(skill)}`"
                @click="startSkillTraining(skill)"
              >
                <span class="ability-node__icon" :class="`is-${skillNodeState(skill)}`">{{ skillNodeIcon(skill) }}</span>
                <div class="ability-node__body">
                  <strong>{{ safeSkillName(skill) }}</strong>
                  <div class="ability-node__meter">
                    <i :style="{ width: `${skillScore(skill)}%` }"></i>
                  </div>
                </div>
                <b>{{ skillScore(skill) }}</b>
              </button>
            </div>
          </section>

          <aside v-if="index === abilityActionInsertIndex" class="ability-action-rail">
            <section class="priority-action-card" :class="{ 'is-muted': !abilityMap.hasTrainingData }">
              <div class="priority-action-card__label">
                <Target :size="16" />
                最高性价比
              </div>
              <h2>{{ nextTrainingTitle }}</h2>
              <p>{{ nextTrainingDescription }}</p>
              <div class="priority-action-card__meta">
                <span><BookOpenCheck :size="14" />{{ nextTrainingMeta }}</span>
                <span><ShieldCheck :size="14" />{{ trainingTrustText }}</span>
              </div>
              <el-button type="primary" @click="startRecommendedTraining">
                {{ nextTrainingActionLabel }}
                <ArrowRight :size="16" />
              </el-button>
            </section>

            <section class="ability-evidence-card">
              <div class="ability-evidence-card__head">
                <span>评分依据</span>
                <ShieldCheck :size="15" />
              </div>
              <strong>{{ totalEvidenceCount }} 条训练证据</strong>
              <p>
                {{ abilityMap.hasTrainingData
                  ? '评分来自题目训练和面试报告；没有证据的节点不会被判定为强项或薄弱项。'
                  : '完成一次训练后，这里会展示真实的评估依据。' }}
              </p>
              <el-button plain @click="router.push('/questions/practice')">
                去补一组训练
                <ArrowRight :size="15" />
              </el-button>
            </section>
          </aside>
        </template>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CircleHelp,
  FolderOpen,
  Map,
  Play,
  ShieldCheck,
  Target
} from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { getAbilityMapApi } from '@/api/abilityMap'
import { normalizeAbilityMap, statusLabel } from '@/features/ability-map'
import type { AbilityDomainVO, AbilityMapVO, AbilitySkillNodeVO } from '@/types/abilityMap'
import { getErrorMessage } from '@/utils/error'

const router = useRouter()
const loading = ref(false)
const loadError = ref('')
const activeDomainCode = ref('')
const abilityMap = ref<AbilityMapVO>(normalizeAbilityMap())

const domainFallbackCopy: Record<string, string> = {
  JAVA_CORE: 'Java 基础',
  COLLECTION: '集合框架',
  CONCURRENCY: '并发编程',
  JVM: 'JVM 与调优',
  MYSQL: 'MySQL 数据库',
  REDIS: 'Redis 缓存',
  SPRING: 'Spring / Spring Boot',
  MYBATIS: 'MyBatis',
  MICROSERVICE: '微服务',
  MESSAGE_QUEUE: '消息队列',
  DISTRIBUTED: '分布式系统',
  SYSTEM_DESIGN: '系统设计',
  PROJECT_EXPRESSION: '项目表达',
  ENGINEERING: '工程实践'
}

const skillFallbackCopy: Record<string, { name: string; description: string }> = {
  JAVA_CORE: {
    name: 'Java 基础',
    description: '覆盖语法、面向对象、异常、泛型、IO 和常用 JDK 能力。'
  },
  COLLECTION_HASHMAP: {
    name: '集合框架',
    description: '覆盖 List、Map、HashMap、ConcurrentHashMap 和集合选型。'
  },
  JUC_THREAD_POOL: {
    name: '并发编程',
    description: '覆盖线程、锁、线程池、AQS、并发容器和可见性问题。'
  },
  JVM_MEMORY_GC: {
    name: 'JVM 与 GC',
    description: '覆盖内存模型、类加载、GC、调优和故障排查。'
  },
  MYSQL_INDEX_TX: {
    name: 'MySQL 索引与事务',
    description: '覆盖索引、事务、锁、执行计划和 SQL 优化。'
  },
  REDIS_CACHE: {
    name: 'Redis 缓存',
    description: '覆盖缓存设计、数据结构、持久化、分布式锁和高可用。'
  },
  SPRING_BOOT: {
    name: 'Spring / Spring Boot',
    description: '覆盖 IoC、AOP、事务、自动配置和 Web 开发。'
  },
  MYBATIS_ORM: {
    name: 'MyBatis',
    description: '覆盖 Mapper、动态 SQL、分页、缓存和常见坑。'
  },
  MICROSERVICE: {
    name: '微服务',
    description: '覆盖服务拆分、注册发现、配置、网关、限流和熔断。'
  },
  MESSAGE_QUEUE: {
    name: '消息队列',
    description: '覆盖异步解耦、可靠消息、顺序、幂等和积压治理。'
  },
  DISTRIBUTED_SYSTEM: {
    name: '分布式系统',
    description: '覆盖一致性、分布式事务、分布式锁、CAP 和高可用。'
  },
  SYSTEM_DESIGN: {
    name: '系统设计',
    description: '覆盖架构分层、容量估算、扩展性、可用性和取舍表达。'
  },
  PROJECT_EXPRESSION: {
    name: '项目表达',
    description: '覆盖项目背景、职责、难点、方案、结果和复盘表达。'
  },
  ENGINEERING_PRACTICE: {
    name: '工程实践',
    description: '覆盖测试、日志、监控、发布、代码质量和协作规范。'
  }
}

const skillFallbackPatterns = [
  { pattern: /JAVA|JDK|OOP/, copy: skillFallbackCopy.JAVA_CORE },
  { pattern: /COLLECTION|HASH|MAP|LIST|SET/, copy: skillFallbackCopy.COLLECTION_HASHMAP },
  { pattern: /JUC|THREAD|LOCK|AQS|CONCURRENT/, copy: skillFallbackCopy.JUC_THREAD_POOL },
  { pattern: /JVM|GC|MEMORY|CLASSLOAD/, copy: skillFallbackCopy.JVM_MEMORY_GC },
  { pattern: /MYSQL|SQL|INDEX|TX|TRANSACTION/, copy: skillFallbackCopy.MYSQL_INDEX_TX },
  { pattern: /REDIS|CACHE/, copy: skillFallbackCopy.REDIS_CACHE },
  { pattern: /SPRING|BOOT|MVC|IOC|AOP/, copy: skillFallbackCopy.SPRING_BOOT },
  { pattern: /MYBATIS|ORM|MAPPER/, copy: skillFallbackCopy.MYBATIS_ORM },
  { pattern: /MICRO|SERVICE|GATEWAY|NACOS|DUBBO/, copy: skillFallbackCopy.MICROSERVICE },
  { pattern: /MQ|QUEUE|KAFKA|ROCKET|RABBIT/, copy: skillFallbackCopy.MESSAGE_QUEUE },
  { pattern: /DISTRIBUTED|CAP|CONSISTENCY|LOCK/, copy: skillFallbackCopy.DISTRIBUTED_SYSTEM },
  { pattern: /DESIGN|ARCH|SYSTEM/, copy: skillFallbackCopy.SYSTEM_DESIGN },
  { pattern: /PROJECT|EXPRESSION|RESUME/, copy: skillFallbackCopy.PROJECT_EXPRESSION },
  { pattern: /ENGINEER|TEST|LOG|MONITOR|DEPLOY/, copy: skillFallbackCopy.ENGINEERING_PRACTICE }
]

const domainFallbackPatterns = [
  { pattern: /JAVA|JDK|OOP/, name: domainFallbackCopy.JAVA_CORE },
  { pattern: /COLLECTION|HASH|MAP|LIST|SET/, name: domainFallbackCopy.COLLECTION },
  { pattern: /CONCURRENCY|JUC|THREAD|LOCK|AQS/, name: domainFallbackCopy.CONCURRENCY },
  { pattern: /JVM|GC|MEMORY/, name: domainFallbackCopy.JVM },
  { pattern: /MYSQL|SQL|DATABASE|DB/, name: domainFallbackCopy.MYSQL },
  { pattern: /REDIS|CACHE/, name: domainFallbackCopy.REDIS },
  { pattern: /SPRING|BOOT|MVC/, name: domainFallbackCopy.SPRING },
  { pattern: /MYBATIS|ORM|MAPPER/, name: domainFallbackCopy.MYBATIS },
  { pattern: /MICRO|SERVICE|GATEWAY|DUBBO/, name: domainFallbackCopy.MICROSERVICE },
  { pattern: /MQ|QUEUE|KAFKA|ROCKET|RABBIT/, name: domainFallbackCopy.MESSAGE_QUEUE },
  { pattern: /DISTRIBUTED|CAP|CONSISTENCY/, name: domainFallbackCopy.DISTRIBUTED },
  { pattern: /DESIGN|ARCH|SYSTEM/, name: domainFallbackCopy.SYSTEM_DESIGN },
  { pattern: /PROJECT|EXPRESSION|RESUME/, name: domainFallbackCopy.PROJECT_EXPRESSION },
  { pattern: /ENGINEER|TEST|LOG|MONITOR|DEPLOY/, name: domainFallbackCopy.ENGINEERING }
]

const replacementCharCode = 0xfffd
const euroSignCode = 0x20ac
const privateUseStart = 0xe000
const privateUseEnd = 0xf8ff
const latin1MojibakeCodePoints = new Set([
  0x00c3,
  0x00c2,
  0x00e4,
  0x00e5,
  0x00e6,
  0x00e7,
  0x00e8,
  0x00e9,
  0x00ef,
  0x00bd,
  0x00be,
  0x00a4,
  0x00d0,
  0x00d1
])
const suspiciousMojibakeFragments = [
  '锟',
  '鑳',
  '鍥',
  '捐',
  '氨',
  '璁',
  '粌',
  '钖',
  '杽',
  '鏆',
  '绱㈠紩',
  '瑕嗙洊',
  '寮€',
  '佹',
  '€?'
]
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
const replacementMojibakeText = String.fromCodePoint(0x951f, 0x65a4, 0x62f7)
const euroQuestionMojibakeText = String.fromCodePoint(euroSignCode, 0x3f)

const normalizeCodeKey = (value?: string) => String(value || '').trim().toUpperCase()
const readableCodeText = (code: string, fallback: string) => {
  if (!code) return fallback
  return code.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

const looksLikeMojibake = (value?: string) => {
  const text = String(value || '').trim()
  if (!text) return false
  if (text.includes(replacementMojibakeText)) return true
  if (text.includes(euroQuestionMojibakeText)) return true
  if (suspiciousMojibakeFragments.some((fragment) => text.includes(fragment))) return true
  let rareCount = 0
  for (const char of text) {
    const codePoint = char.codePointAt(0)
    if (codePoint === replacementCharCode) return true
    if (codePoint === euroSignCode) return true
    if (typeof codePoint === 'number' && latin1MojibakeCodePoints.has(codePoint)) return true
    if (typeof codePoint === 'number' && codePoint >= privateUseStart && codePoint <= privateUseEnd) return true
    if (typeof codePoint === 'number' && rareMojibakeCodePoints.has(codePoint)) rareCount += 1
  }
  return rareCount >= 2
}

const sanitizeMojibakeText = (value: unknown, fallback: string) => {
  const text = String(value || '').trim()
  if (!text || looksLikeMojibake(text)) return fallback
  return text
}

const fallbackDomainName = (domain?: Pick<AbilityDomainVO, 'domainCode'> | Pick<AbilitySkillNodeVO, 'domainCode'>) => {
  const code = normalizeCodeKey(domain?.domainCode)
  return domainFallbackCopy[code] || domainFallbackPatterns.find((item) => item.pattern.test(code))?.name || readableCodeText(code, '未命名能力域')
}

const fallbackSkillName = (skill?: Pick<AbilitySkillNodeVO, 'code'>) => {
  const code = normalizeCodeKey(skill?.code)
  return skillFallbackCopy[code]?.name || skillFallbackPatterns.find((item) => item.pattern.test(code))?.copy.name || readableCodeText(code, '未命名能力点')
}

const fallbackSkillDescription = (skill?: Pick<AbilitySkillNodeVO, 'code'>) => {
  const code = normalizeCodeKey(skill?.code)
  return skillFallbackCopy[code]?.description || skillFallbackPatterns.find((item) => item.pattern.test(code))?.copy.description || '围绕这个能力点做一组专项训练，先沉淀真实训练证据。'
}

const safeDomainName = (domain?: AbilityDomainVO) =>
  sanitizeMojibakeText(domain?.domainName, fallbackDomainName(domain))

const safeSkillName = (skill?: AbilitySkillNodeVO) =>
  sanitizeMojibakeText(skill?.name, fallbackSkillName(skill))

const safeSkillDomainName = (skill?: AbilitySkillNodeVO) =>
  sanitizeMojibakeText(skill?.domainName, fallbackDomainName(skill))

const safeSkillSummary = (skill: AbilitySkillNodeVO, fallback?: string) => {
  const summary = sanitizeMojibakeText(skill.summary, '')
  if (summary) return summary
  return sanitizeMojibakeText(skill.description, fallback || fallbackSkillDescription(skill))
}

const sanitizeAbilityMap = (data?: AbilityMapVO | null): AbilityMapVO => {
  const normalized = normalizeAbilityMap(data)
  return {
    ...normalized,
    domains: normalized.domains.map((domain) => ({
      ...domain,
      domainName: safeDomainName(domain),
      skills: (domain.skills || []).map((skill) => ({
        ...skill,
        name: safeSkillName(skill),
        domainName: safeSkillDomainName(skill),
        description: sanitizeMojibakeText(skill.description, fallbackSkillDescription(skill)),
        summary: skill.summary ? sanitizeMojibakeText(skill.summary, '') : ''
      }))
    }))
  }
}

const activeDomain = computed(() =>
  abilityMap.value.domains.find((domain) => domain.domainCode === activeDomainCode.value) ||
  abilityMap.value.domains[0]
)

const activeDomainName = computed(() => safeDomainName(activeDomain.value) || '能力点')
const allSkills = computed(() => abilityMap.value.domains.flatMap((domain) => domain.skills || []))
const abilityActionInsertIndex = computed(() => Math.min(5, Math.max(0, abilityMap.value.domains.length - 1)))
const weakSkills = computed(() => abilityMap.value.hasTrainingData ? allSkills.value.filter((skill) => skill.status === 'WEAK') : [])
const totalEvidenceCount = computed(() => allSkills.value.reduce((total, skill) => total + (skill.evidenceCount || 0), 0))
const recommendedSkill = computed(() => {
  if (abilityMap.value.hasTrainingData && weakSkills.value.length) return weakSkills.value[0]
  return activeDomain.value?.skills?.[0] || allSkills.value[0]
})
const nextTrainingTitle = computed(() => {
  if (!allSkills.value.length) return '先建立能力目录'
  if (!abilityMap.value.hasTrainingData) return '先完成一次专项训练，建立评估证据'
  if (recommendedSkill.value && weakSkills.value.length) return `优先训练：${safeSkillName(recommendedSkill.value)}`
  return '保持专项训练，补齐证据链'
})
const nextTrainingDescription = computed(() => {
  if (!allSkills.value.length) return '当前没有可训练的能力点，请先进入题库完成一组基础训练。'
  if (!abilityMap.value.hasTrainingData) return '目前没有训练数据，页面不会推断强弱。先围绕当前能力域做题，让图谱有真实证据。'
  if (recommendedSkill.value && weakSkills.value.length) {
    return safeSkillSummary(recommendedSkill.value, '这个能力点已被评估为薄弱，建议用专项题组补齐概念、方案和项目表达。')
  }
  return '当前没有明确薄弱项，建议继续训练证据较少的能力点，避免把“未评估”误当作“已掌握”。'
})
const nextTrainingMeta = computed(() => {
  if (!recommendedSkill.value) return '通用训练'
  return `${recommendedSkill.value.evidenceCount || 0} 条证据 · ${formatDate(recommendedSkill.value.lastEvaluatedAt)}`
})
const trainingTrustText = computed(() => {
  if (!abilityMap.value.hasTrainingData) return '暂无强弱结论'
  return recommendedSkill.value ? confidenceText(recommendedSkill.value) : '可信度待确认'
})
const nextTrainingActionLabel = computed(() => abilityMap.value.hasTrainingData && weakSkills.value.length ? '训练薄弱项' : '开始训练')

const fetchAbilityMap = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const result = await getAbilityMapApi()
    abilityMap.value = sanitizeAbilityMap(result)
    activeDomainCode.value = activeDomainCode.value || abilityMap.value.domains[0]?.domainCode || ''
  } catch (error) {
    loadError.value = getErrorMessage(error, '能力图谱暂时加载失败')
  } finally {
    loading.value = false
  }
}

const domainWeakText = (domain: AbilityDomainVO) => {
  if (!abilityMap.value.hasTrainingData) return '未评估'
  if (domain.weakCount) return `${domain.weakCount} 个薄弱项`
  return '暂无薄弱项'
}

const honestStatusLabel = (skill: AbilitySkillNodeVO) => {
  if (!abilityMap.value.hasTrainingData || skill.status === 'UNASSESSED') return '未评估'
  return statusLabel(skill.status)
}

const confidenceText = (skill: AbilitySkillNodeVO) => {
  if (!abilityMap.value.hasTrainingData || !skill.evidenceCount) return '待训练验证'
  const labels: Record<string, string> = {
    UNKNOWN: '可信度待确认',
    LOW: '可信度低',
    MEDIUM: '可信度中',
    HIGH: '可信度高'
  }
  return labels[String(skill.confidence || 'UNKNOWN')] || String(skill.confidence || '可信度待确认')
}

const formatDate = (value?: string) => {
  if (!value) return '未评估'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit'
  })
}

const skillCardClass = (skill: AbilitySkillNodeVO) => {
  if (!abilityMap.value.hasTrainingData || skill.status === 'UNASSESSED') return 'is-unassessed'
  return `is-${String(skill.status).toLowerCase()}`
}

const skillScore = (skill: AbilitySkillNodeVO) => {
  if (!abilityMap.value.hasTrainingData || skill.status === 'UNASSESSED') return 0
  const scores: Record<string, number> = {
    WEAK: 32,
    BASIC: 58,
    COMPETENT: 74,
    STRONG: 88
  }
  return scores[String(skill.status).toUpperCase()] || 0
}

const abilityPower = computed(() => {
  if (!allSkills.value.length || !abilityMap.value.hasTrainingData) return 0
  return Math.round(allSkills.value.reduce((total, skill) => total + skillScore(skill), 0) / allSkills.value.length)
})

const practiceQueryForSkill = (skill?: AbilitySkillNodeVO) => {
  const keyword = skill ? safeSkillName(skill) : activeDomainName.value
  return {
    mode: 'category',
    keyword,
    skillName: keyword,
    sourceType: 'SKILL_PROFILE',
    trustStatus: abilityMap.value.hasTrainingData && (skill?.evidenceCount || 0) > 0 ? 'VERIFIED' : 'PARTIAL'
  }
}

const startDomainTraining = (domain?: AbilityDomainVO) => {
  const keyword = domain ? safeDomainName(domain) : activeDomainName.value
  router.push({
    path: '/questions/practice',
    query: {
      mode: 'category',
      keyword,
      skillName: keyword,
      sourceType: 'SKILL_PROFILE',
      trustStatus: abilityMap.value.hasTrainingData ? 'PARTIAL' : 'FALLBACK'
    }
  })
}

const startSkillTraining = (skill: AbilitySkillNodeVO) => {
  router.push({
    path: '/questions/practice',
    query: practiceQueryForSkill(skill)
  })
}

const startRecommendedTraining = () => {
  if (recommendedSkill.value) {
    startSkillTraining(recommendedSkill.value)
    return
  }
  router.push('/questions/practice')
}

/** 技能树节点状态：已解锁 / 修炼中 / 未解锁 */
const skillNodeState = (skill: AbilitySkillNodeVO) => {
  if (!abilityMap.value.hasTrainingData || skill.status === 'UNASSESSED') return 'locked'
  if (skill.status === 'WEAK') return 'training'
  return 'unlocked'
}
const skillNodeIcon = (skill: AbilitySkillNodeVO) => {
  const state = skillNodeState(skill)
  if (state === 'unlocked') return '✓'
  if (state === 'training') return '⚡'
  return '🔒'
}

onMounted(fetchAbilityMap)
</script>

<style scoped lang="scss">
.ability-map {
  min-width: 0;
  overflow-x: hidden;
  color: var(--app-text);

  :deep(.el-button) {
    max-width: 100%;
    min-height: 34px;
    height: auto;
    white-space: normal;
  }

  :deep(.el-tag) {
    max-width: 100%;
    height: auto;
    min-height: 24px;
    white-space: normal;
  }
}

.growth-hero,
.signal-card,
.domain-rail,
.domain-panel,
.load-error-card,
.empty-map-card {
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  background: var(--user-surface);
  box-shadow: none;
}

.growth-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 14px;
  padding: 18px;
  background: var(--user-surface);
}

.growth-hero__main {
  min-width: 0;

  h1 {
    margin: 10px 0 0;
    color: var(--app-text);
    font-size: 32px;
    line-height: 1.18;
  }

  p {
    max-width: 760px;
    margin: 12px 0 0;
    color: var(--app-text-muted);
    line-height: 1.7;
  }
}

.eyebrow,
.hero-actions,
.next-training-card__label,
.next-training-card__meta,
.section-title,
.skill-evidence-row,
.load-error-card > div,
.training-path li {
  display: flex;
  align-items: center;
  gap: 8px;
}

.eyebrow {
  color: var(--user-primary);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.hero-actions {
  flex-wrap: wrap;
  margin-top: 22px;
}

.next-training-card {
  display: grid;
  align-content: start;
  gap: 14px;
  padding: 20px;
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
  background: var(--user-warning-soft);

  h2,
  p {
    margin: 0;
  }

  h2 {
    color: var(--app-text);
    font-size: 22px;
    line-height: 1.35;
  }

  p {
    color: var(--user-text-muted);
    line-height: 1.7;
  }

  &.is-muted {
    border-color: rgba(37, 99, 235, 0.22);
    background: var(--user-primary-soft);
  }
}

.next-training-card__label {
  color: var(--user-warning);
  font-size: 13px;
  font-weight: 800;
}

.next-training-card__meta {
  flex-wrap: wrap;

  span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--user-text-muted);
    font-size: 12px;
  }
}

.next-training-card--mobile {
  display: none;
}

.signal-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.signal-card {
  padding: 12px 14px;

  span,
  em,
  strong {
    display: block;
  }

  span {
    color: var(--app-text-muted);
    font-size: 13px;
  }

  strong {
    margin-top: 8px;
    color: var(--app-text);
    font-size: 28px;
    line-height: 1.1;
  }

  em {
    margin-top: 8px;
    color: var(--user-text-muted);
    font-style: normal;
    font-size: 12px;
  }
}

.signal-card--weak {
  border-color: rgba(239, 68, 68, 0.2);
  background: var(--user-danger-soft);
}

.signal-card--usable {
  border-color: rgba(22, 163, 74, 0.2);
  background: var(--user-success-soft);
}

.honesty-alert {
  margin-top: -2px;
}

.load-error-card,
.empty-map-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 20px;
}

.load-error-card {
  color: var(--user-danger);
  background: var(--user-danger-soft);

  p {
    margin: 4px 0 0;
    color: var(--user-danger);
  }
}

.empty-map-card {
  flex-direction: column;
  justify-content: center;
  min-height: 220px;
  text-align: center;

  h2,
  p {
    margin: 0;
  }

  p {
    color: var(--app-text-muted);
  }
}

.map-workspace {
  display: grid;
  grid-template-columns: clamp(220px, 18vw, 240px) minmax(0, 1fr);
  gap: 14px;
  align-items: stretch;
}

.domain-rail-shell,
.domain-rail,
.domain-panel,
.insight-panel {
  min-width: 0;
}

.domain-rail-shell {
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);
}

.domain-rail {
  position: sticky;
  top: 80px;
  display: grid;
  gap: 8px;
  max-height: calc(100vh - 96px);
  padding: 12px;
  overflow-y: auto;
  scrollbar-gutter: stable;
  border: 0 !important;
  border-radius: 7px;
  background: transparent !important;
  box-shadow: none !important;
}

.section-title {
  justify-content: space-between;
  gap: 12px;

  span {
    color: var(--app-text);
    font-size: 14px;
    font-weight: 800;
  }

  em {
    color: var(--app-text-muted);
    font-style: normal;
    font-size: 12px;
  }
}

.domain-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px 10px;
  min-width: 0;
  width: 100%;
  padding: 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--app-text);
  cursor: pointer;
  text-align: left;

  span,
  small {
    overflow-wrap: anywhere;
  }

  strong {
    color: var(--user-primary);
    font-size: 13px;
  }

  small {
    grid-column: 1 / -1;
    color: var(--app-text-muted);
    font-size: 12px;
  }

  &.active,
  &:hover {
    border-color: rgba(37, 99, 235, 0.36);
    background: var(--user-primary-soft);
  }
}

.domain-panel {
  padding: 18px;
}

.domain-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;

  span {
    color: var(--user-primary);
    font-size: 12px;
    font-weight: 800;
  }

  h2,
  p {
    margin: 0;
  }

  h2 {
    margin-top: 4px;
    font-size: 22px;
  }

  p {
    margin-top: 8px;
    color: var(--app-text-muted);
    line-height: 1.6;
  }
}

.growth-map-card {
  display: grid;
  gap: 14px;
  margin-bottom: 14px;
  padding: 14px;
  border: 1px solid rgba(37, 99, 235, 0.18);
  border-radius: 8px;
  background: var(--user-surface-muted);
}

.growth-stage-track {
  --growth-stage-node-center: 27px;
  display: grid;
  position: relative;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  &::before {
    position: absolute;
    top: var(--growth-stage-node-center);
    right: 16%;
    left: 16%;
    height: 2px;
    border-radius: 999px;
    background: var(--user-primary-border);
    content: '';
  }
}

.growth-stage {
  display: grid;
  position: relative;
  z-index: 1;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  min-width: 0;
  padding: 10px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);

  strong,
  em {
    display: block;
    overflow-wrap: anywhere;
  }

  strong {
    color: var(--app-text);
    font-size: 13px;
  }

  em {
    margin-top: 3px;
    color: var(--app-text-muted);
    font-style: normal;
    font-size: 12px;
    line-height: 1.45;
  }

  &.active {
    border-color: rgba(37, 99, 235, 0.34);
    background: var(--user-primary-soft);
  }
}

.growth-stage__node {
  display: inline-grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 2px solid var(--user-bg-panel);
  border-radius: 999px;
  background: var(--user-primary);
  color: var(--user-primary-contrast);
  font-size: 13px;
  font-weight: 800;
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.26);
}

.growth-stage:not(.active) .growth-stage__node {
  background: #94a3b8;
  box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.28);
}

.domain-map-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.current-shortfall-card {
  display: grid;
  gap: 10px;
  margin-bottom: 14px;
  padding: 14px;
  border: 1px solid rgba(37, 99, 235, 0.2);
  border-radius: 8px;
  background: var(--user-surface-muted);

  > strong {
    color: var(--app-text);
    font-size: 18px;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }

  p {
    margin: 0;
    color: var(--app-text-muted);
    line-height: 1.6;
    overflow-wrap: anywhere;
  }

  .el-button {
    justify-self: start;
  }

  &.is-muted {
    border-color: rgba(148, 163, 184, 0.24);
    background: var(--user-surface-muted);
  }
}

.current-shortfall-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  span {
    min-width: 0;
    padding: 5px 8px;
    border-radius: 8px;
    background: var(--user-primary-soft);
    color: var(--user-primary);
    font-size: 12px;
    overflow-wrap: anywhere;
  }
}

.current-shortfall-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.milestone {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface-muted);

  span,
  strong,
  em {
    display: block;
  }

  span,
  em {
    color: var(--app-text-muted);
    font-size: 12px;
  }

  strong {
    margin-top: 6px;
    color: var(--app-text);
    font-size: 22px;
  }

  em {
    margin-top: 4px;
    font-style: normal;
  }
}

.tone-danger {
  border-color: rgba(239, 68, 68, 0.2);
  background: var(--user-danger-soft);
}

.tone-success {
  border-color: rgba(22, 163, 74, 0.2);
  background: var(--user-success-soft);
}

.skill-grid {
  display: grid;
  position: relative;
  grid-template-columns: 1fr;
  gap: 10px;
  padding-left: 18px;
}

.skill-card {
  display: flex;
  position: relative;
  min-width: 0;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);

  &::before {
    position: absolute;
    z-index: 1;
    top: 20px;
    left: -18px;
    width: 12px;
    height: 12px;
    border: 3px solid var(--user-bg-panel);
    border-radius: 999px;
    background: var(--user-primary);
    box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.28);
    content: '';
  }

  &:not(:last-child)::after {
    position: absolute;
    z-index: 0;
    top: 26px;
    left: -13px;
    width: 2px;
    height: calc(100% + 10px);
    border-radius: 999px;
    background: var(--user-primary);
    content: '';
  }

  p {
    margin: 0;
    color: var(--app-text-muted);
    line-height: 1.65;
    overflow-wrap: anywhere;
  }
}

.skill-card.is-weak {
  border-color: rgba(239, 68, 68, 0.24);
  background: var(--user-danger-soft);

  &::before {
    background: #ef4444;
    box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.28);
  }
}

.skill-card.is-strong,
.skill-card.is-competent {
  border-color: rgba(22, 163, 74, 0.22);
  background: var(--user-success-soft);

  &::before {
    background: #16a34a;
    box-shadow: 0 0 0 1px rgba(22, 163, 74, 0.28);
  }
}

.skill-card.is-unassessed {
  background: var(--user-surface-muted);

  &::before {
    background: #94a3b8;
    box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.28);
  }
}

.skill-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  > div {
    min-width: 0;
  }

  strong,
  span {
    display: block;
    overflow-wrap: anywhere;
  }

  strong {
    color: var(--app-text);
    font-size: 16px;
  }

  span {
    margin-top: 4px;
    color: var(--app-text-muted);
    font-size: 12px;
  }
}

.skill-evidence-row {
  flex-wrap: wrap;
  gap: 8px 10px;

  span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: var(--user-text-muted);
    font-size: 12px;
  }
}

.skill-action {
  align-self: flex-start;
}

.insight-panel {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  margin-bottom: 14px;
  overflow: hidden;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface-muted);
}

.insight-card {
  display: grid;
  align-content: start;
  gap: 10px;
  min-width: 0;
  padding: 14px;
}

.insight-card + .insight-card {
  border-left: 1px solid var(--user-border);
}

.priority-list {
  display: grid;
  gap: 8px;
}

.priority-item {
  display: grid;
  gap: 4px;
  width: 100%;
  padding: 10px;
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  background: var(--user-danger-soft);
  color: var(--app-text);
  cursor: pointer;
  text-align: left;

  span,
  small {
    overflow-wrap: anywhere;
  }

  span {
    font-weight: 800;
  }

  small {
    color: var(--app-text-muted);
    font-size: 12px;
  }
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  span {
    max-width: 100%;
    padding: 6px 9px;
    border-radius: 8px;
    background: var(--user-success-soft);
    color: var(--user-success);
    font-size: 12px;
    overflow-wrap: anywhere;
  }
}

.insight-muted {
  margin: 0;
  color: var(--app-text-muted);
  line-height: 1.6;
}

.training-path {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    align-items: flex-start;
  }

  svg {
    flex: 0 0 auto;
    margin-top: 2px;
    color: #16a34a;
  }

  strong,
  span {
    display: block;
  }

  strong {
    color: var(--app-text);
    font-size: 13px;
  }

  span {
    margin-top: 3px;
    color: var(--app-text-muted);
    font-size: 12px;
    line-height: 1.5;
  }
}

@media (max-width: 1180px) {
  .growth-hero,
  .map-workspace {
    grid-template-columns: 1fr;
  }

  .domain-rail {
    position: static;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    max-height: none;
    overflow: visible;
  }

  .domain-rail .section-title {
    grid-column: 1 / -1;
  }
}

@media (max-width: 860px) {
  .ability-map {
    display: flex;
    flex-direction: column;
  }

  .map-workspace {
    order: 1;
  }

  .growth-hero {
    order: 2;
  }

  .signal-grid {
    order: 3;
  }

  .honesty-alert,
  .load-error-card,
  .empty-map-card {
    order: 4;
  }

  .growth-hero__main,
  .next-training-card--desktop {
    display: none;
  }

  .growth-hero {
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
  }

  .next-training-card--mobile {
    display: grid;
    margin-bottom: 14px;
  }

  .domain-rail {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    overflow: visible;
    padding: 8px;
  }

  .domain-rail .section-title {
    display: none;
  }

  .domain-item {
    width: 100%;
    min-width: 0;
  }

  .signal-grid,
  .domain-map-strip {
    grid-template-columns: 1fr;
  }

  .insight-panel {
    grid-template-columns: 1fr;
  }

  .insight-card + .insight-card {
    border-top: 1px solid var(--user-border);
    border-left: 0;
  }

  .growth-stage-track {
    grid-template-columns: 1fr;

    &::before {
      top: var(--growth-stage-node-center);
      bottom: var(--growth-stage-node-center);
      left: var(--growth-stage-node-center);
      width: 2px;
      height: auto;
      background: var(--user-primary-border);
    }
  }

  .domain-panel__head,
  .skill-card__head,
  .load-error-card {
    flex-direction: column;
    align-items: stretch;
  }

  .skill-action,
  .current-shortfall-card__actions .el-button,
  .domain-panel__head .el-button,
  .next-training-card .el-button {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .growth-hero {
    padding: 0;
  }

  .growth-hero__main h1 {
    font-size: 28px;
  }

  .domain-rail {
    grid-template-columns: 1fr;
    margin: 0 -2px;
  }

  .next-training-card,
  .growth-map-card,
  .current-shortfall-card,
  .domain-panel,
  .insight-card {
    padding: 14px;
  }

  .domain-panel__head h2 {
    font-size: 20px;
  }

  .skill-grid {
    padding-left: 14px;
  }

  .skill-card::before {
    left: -15px;
  }

  .skill-card:not(:last-child)::after {
    left: -10px;
  }
}

.domain-panel {
  background: var(--user-surface);
}

.domain-item {
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    transform 0.18s ease;

  &.active {
    box-shadow: inset 3px 0 0 var(--user-primary);
  }

  &:hover {
    transform: translateY(-1px);
  }
}

.skill-card {
  box-shadow: none;

  &.is-weak::before {
    background: var(--cc-danger);
    box-shadow: none;
  }

  &.is-strong::before,
  &.is-competent::before {
    background: var(--cc-success);
    box-shadow: none;
  }

  &.is-unassessed::before {
    background: var(--user-text-muted);
    box-shadow: none;
  }
}

@media (max-width: 860px) {
  .domain-rail {
    border-radius: var(--user-radius-sm);
    background: var(--user-surface-muted);
  }
}

// ---- 战力雷达与技能树（游戏化增量样式，暗色霓虹） ----
.power-radar-card {
  padding: 16px 18px;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-sm);
  background: var(--user-surface);
}

.power-radar {
  margin-top: 12px;
  display: grid;
  grid-template-columns: minmax(0, 340px) 1fr;
  gap: 18px;
  align-items: center;
}

.power-radar__svg {
  width: 100%;
  height: auto;
  display: block;
}

.power-radar__ring {
  fill: none;
  stroke: rgba(148, 163, 184, 0.18);
  stroke-width: 1;
}

.power-radar__axis {
  stroke: rgba(148, 163, 184, 0.14);
  stroke-width: 1;
}

.power-radar__value {
  fill: rgba(23, 178, 106, 0.22);
  stroke: #2fd27d;
  stroke-width: 1.6;
  filter: drop-shadow(0 0 6px rgba(47, 210, 125, 0.35));
}

.power-radar__label {
  font-size: 10px;
  font-weight: 700;
  fill: rgba(203, 213, 225, 0.75);
}

.power-radar__side {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.power-radar__stat {
  padding: 10px 13px;
  border-radius: 10px;
  background: rgba(148, 163, 184, 0.08);

  span {
    display: block;
    font-size: 10.5px;
    font-weight: 700;
    color: rgba(203, 213, 225, 0.6);
  }

  strong {
    display: block;
    margin-top: 3px;
    font-size: 14px;
    color: #f8fafc;
  }

  &.is-weak strong {
    color: #f7b955;
  }

  &.is-strong strong {
    color: #2fd27d;
  }
}

.power-radar__hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  color: rgba(203, 213, 225, 0.55);
}

.skill-tree-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 2px 0 10px;

  span {
    font-size: 12.5px;
    font-weight: 800;
    color: #e5edf8;
  }

  em {
    font-size: 11px;
    font-style: normal;
    color: rgba(203, 213, 225, 0.6);
  }
}

.skill-card {
  position: relative;
}

.skill-node-icon {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 26px;
  height: 26px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  background: rgba(148, 163, 184, 0.12);

  &.is-unlocked {
    background: rgba(47, 210, 125, 0.16);
    color: #2fd27d;
  }

  &.is-training {
    background: rgba(247, 144, 9, 0.16);
    color: #f7b955;
  }

  &.is-locked {
    color: rgba(203, 213, 225, 0.5);
  }
}

.skill-card__head {
  padding-right: 34px;
}

@media (max-width: 900px) {
  .power-radar {
    grid-template-columns: 1fr;
  }
}

// 方向 D · 能力图谱。数据结论保持原有“未评估即未评估”的边界，改为可点亮的技能树视觉。
.arena-ability {
  width: min(1060px, 100%);
  margin: 0 auto;
  padding: 28px 24px 46px;
  gap: 16px;

  .growth-hero,
  .signal-card,
  .power-radar-card,
  .domain-rail-shell,
  .domain-panel,
  .growth-map-card,
  .current-shortfall-card,
  .insight-card,
  .skill-card {
    border: 1.5px solid var(--arena-line);
    border-radius: var(--arena-radius-card);
    background: #ffffff;
    box-shadow: 0 2px 4px rgba(21, 33, 27, 0.04);
  }

  .growth-hero {
    border-color: #b9e7cd;
    background: linear-gradient(135deg, #f0fbf4, #ffffff 72%);

    h1 {
      font-size: 28px;
      font-weight: 900;
    }
  }

  .eyebrow,
  .section-title span,
  .next-training-card__label {
    color: var(--arena-grn-d);
  }

  .next-training-card {
    border: 1.5px solid #b9e7cd;
    border-radius: var(--arena-radius-card);
    background: linear-gradient(135deg, #f0fbf4, #ffffff 76%);
    box-shadow: 0 2px 4px rgba(21, 33, 27, 0.04);
  }

  .signal-card {
    border-radius: 14px;
    background: #ffffff;

    &.signal-card--weak {
      border-color: #f3ddc0;
      background: #fffaf2;
    }

    &.signal-card--usable {
      border-color: #b9e7cd;
      background: #f5fcf7;
    }
  }

  .power-radar-card {
    padding: 18px;
  }

  .power-radar__ring,
  .power-radar__axis {
    stroke: #dce4dd;
  }

  .power-radar__value {
    fill: rgba(23, 178, 106, 0.18);
    stroke: var(--arena-grn);
    filter: none;
  }

  .power-radar__label {
    fill: var(--arena-sub);
  }

  .power-radar__stat {
    border-radius: 13px;
    background: #f5f7f4;

    span {
      color: var(--arena-sub);
    }

    strong {
      color: var(--arena-ink);
    }

    &.is-weak strong {
      color: #b4560a;
    }

    &.is-strong strong {
      color: var(--arena-grn-d);
    }
  }

  .power-radar__hint,
  .skill-tree-head em {
    color: var(--arena-mut);
  }

  .skill-tree-head span {
    color: var(--arena-ink);
  }

  .domain-rail {
    background: #f8faf8;
  }

  .domain-item {
    border-radius: 13px;

    &.active {
      background: var(--arena-grn-soft);
      box-shadow: inset 3px 0 0 var(--arena-grn);
    }
  }

  .skill-card {
    border-radius: 14px;
    box-shadow: none;
  }

  .skill-node-icon {
    background: #f2f4f2;

    &.is-unlocked {
      background: var(--arena-grn-soft);
      color: var(--arena-grn-d);
    }

    &.is-training {
      background: var(--arena-amber-soft);
      color: var(--arena-amber);
    }

    &.is-locked {
      color: var(--arena-mut);
    }
  }

  :deep(.el-button--primary) {
    border-color: var(--arena-grn);
    background: var(--arena-grn);
    box-shadow: 0 4px 0 var(--arena-grn-d);
    font-weight: 800;
  }
}

@media (max-width: 760px) {
  .arena-ability {
    padding: 16px 14px calc(28px + var(--user-mobile-nav-height, 0px));
  }
}

// 方向 D · 技能树布局。节点分组与状态展示保持页面任务聚焦。
.arena-ability {
  .honesty-alert {
    display: none;
  }

  .growth-hero {
    display: none;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
  }

  .growth-hero__main h1 {
    margin-top: 7px;
    color: var(--arena-ink);
    font-size: 26px;
    font-weight: 900;
    line-height: 1.25;
  }

  .growth-hero__main > p,
  .growth-hero__main .hero-actions,
  .next-training-card--desktop {
    display: none;
  }

  .growth-hero__main {
    min-width: 0;
  }

  .ability-summary {
    width: min(100%, 1060px);
    margin: 0 auto;
  }

  .ability-tree-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
    align-items: start;
  }

  .ability-tree-panel {
    min-width: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  .ability-tree-head {
    grid-column: 1 / -1;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 14px;

    > div:first-child {
      min-width: 0;
    }

    > span,
    span {
      color: var(--arena-grn-d);
      font-size: 12px;
      font-weight: 800;
    }

    h2,
    p {
      margin: 0;
    }

    p {
      display: none;
    }

    h2 {
      display: block;
      margin-top: 6px;
      color: var(--arena-ink);
      font-size: 26px;
      font-weight: 900;
      line-height: 1.25;
    }
  }

  .ability-node-board {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    align-items: start;
    min-width: 0;
  }

  .ability-formula {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 10px;
    min-width: 212px;
    padding: 9px 12px;
    border: 1px solid var(--arena-line);
    border-radius: 13px;
    background: #f8faf8;

    &__ring {
      display: grid;
      width: 52px;
      aspect-ratio: 1;
      flex: 0 0 auto;
      place-items: center;
      border-radius: 50%;

      span {
        display: grid;
        width: 41px;
        aspect-ratio: 1;
        place-items: center;
        border-radius: 50%;
        background: #ffffff;
        color: var(--arena-grn-d);
        font-size: 14px;
        font-weight: 900;
      }
    }

    p {
      display: block;
      margin: 0;
      color: var(--arena-mut);
      font-size: 11px;
      font-weight: 600;
      line-height: 1.5;
    }
  }

  .ability-domain-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .ability-domain-card {
    min-width: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
  }

  .ability-domain-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    padding: 0 0 9px;
    border: 0;
    border-bottom: 1px solid var(--arena-line);
    background: transparent;
    color: var(--arena-ink);
    text-align: left;
    cursor: pointer;

    span,
    strong,
    small {
      display: block;
    }

    strong {
      font-size: 14px;
      font-weight: 900;
    }

    small {
      margin-top: 3px;
      color: var(--arena-mut);
      font-size: 11px;
      line-height: 1.4;
    }

    em {
      flex: 0 0 auto;
      padding: 4px 7px;
      border-radius: 999px;
      background: var(--arena-grn-soft);
      color: var(--arena-grn-d);
      font-size: 11px;
      font-style: normal;
      font-weight: 800;
    }
  }

  .ability-node-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
    padding-top: 11px;
  }

  .ability-node {
    display: grid;
    position: relative;
    grid-template-columns: 28px minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
    min-width: 0;
    padding: 10px 12px;
    border: 1.5px solid var(--arena-line);
    border-radius: 14px;
    background: #ffffff;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.15s ease, transform 0.15s ease;

    &:hover,
    &:focus-visible {
      border-color: var(--arena-grn);
      transform: translateY(-1px);
    }

    &:focus-visible {
      outline: 2px solid var(--arena-grn);
      outline-offset: 2px;
    }

    &.is-weak {
      border-color: #f3ddc0;
      background: #fffaf2;
    }

    &.is-strong,
    &.is-competent {
      border-color: #b9e7cd;
      background: #f5fcf7;
    }

    &.is-unassessed {
      background: #f5f7f4;
    }

    > b {
      color: var(--arena-sub);
      font-size: 11px;
    }
  }

  .ability-node__icon {
    display: inline-grid;
    width: 28px;
    height: 28px;
    place-items: center;
    border-radius: 9px;
    background: #eef2ee;
    color: var(--arena-mut);
    font-size: 12px;
    font-weight: 900;

    &.is-unlocked {
      background: var(--arena-grn-soft);
      color: var(--arena-grn-d);
    }

    &.is-training {
      background: var(--arena-amber-soft);
      color: var(--arena-amber);
    }
  }

  .ability-node__body {
    min-width: 0;

    strong {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    strong {
      color: var(--arena-ink);
      font-size: 12px;
    }

  }

  .ability-node__meter {
    height: 4px;
    margin-top: 7px;
    overflow: hidden;
    border-radius: 999px;
    background: var(--arena-line);

    i {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--arena-grn), var(--arena-lime));
    }
  }

  .ability-action-rail {
    display: grid;
    grid-column: span 2;
    grid-row: span 2;
    align-content: start;
    gap: 14px;
    min-width: 0;
  }

  .priority-action-card,
  .ability-evidence-card {
    display: grid;
    gap: 12px;
    padding: 18px;
    border: 1.5px solid #f3ddc0;
    border-radius: var(--arena-radius-card);
    background: linear-gradient(135deg, #fff7ec, #ffffff 76%);
    box-shadow: 0 2px 4px rgba(21, 33, 27, 0.04);
  }

  .priority-action-card {
    &.is-muted {
      border-color: var(--arena-line);
      background: #f8faf8;
    }

    h2,
    p {
      margin: 0;
    }

    h2 {
      color: var(--arena-ink);
      font-size: 19px;
      font-weight: 900;
      line-height: 1.35;
    }

    p {
      color: var(--arena-sub);
      font-size: 13px;
      line-height: 1.65;
    }
  }

  .priority-action-card__label,
  .priority-action-card__meta span,
  .ability-evidence-card__head {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .priority-action-card__label {
    color: var(--arena-amber);
    font-size: 12px;
    font-weight: 900;
  }

  .priority-action-card__meta {
    display: grid;
    gap: 6px;

    span {
      color: var(--arena-sub);
      font-size: 11px;
    }
  }

  .ability-evidence-card {
    border-color: #d7ccff;
    background: linear-gradient(135deg, var(--arena-vio-soft), #ffffff 76%);

    strong {
      color: var(--arena-ink);
      font-size: 18px;
    }

    p {
      margin: 0;
      color: var(--arena-sub);
      font-size: 12px;
      line-height: 1.6;
    }
  }

  .ability-evidence-card__head {
    justify-content: space-between;
    color: var(--arena-vio);
    font-size: 12px;
    font-weight: 900;
  }

  :deep(.el-button--primary) {
    border-color: var(--arena-grn);
    background: var(--arena-grn);
    box-shadow: 0 4px 0 var(--arena-grn-d);
    font-weight: 800;
  }
}

@media (max-width: 860px) {
  .arena-ability {
    .growth-hero__main {
      display: block;
    }

    .growth-hero {
      display: block;
    }

    .next-training-card--desktop {
      display: none;
    }

    .ability-tree-layout {
      grid-template-columns: 1fr;
    }

    .ability-node-board {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .ability-action-rail {
      grid-column: 1 / -1;
      grid-row: auto;
    }
  }
}

@media (max-width: 560px) {
  .arena-ability {
    .ability-tree-head {
      flex-direction: column;
    }

    .ability-formula {
      width: 100%;
      text-align: left;
    }

    .ability-node-grid {
      grid-template-columns: 1fr;
    }

    .ability-node-board {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .ability-action-rail {
      grid-column: 1 / -1;
    }
  }
}
</style>
