<template>
  <div class="ability-map page-shell" v-loading="loading">
    <section class="growth-hero">
      <div class="growth-hero__main">
        <div class="eyebrow">
          <Map :size="16" />
          Java 后端成长地图
        </div>
        <h1>能力图谱</h1>
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

    <section class="signal-grid" aria-label="能力图谱总览">
      <article class="signal-card">
        <span>已评估能力点</span>
        <strong>{{ abilityMap.assessedSkillCount }}/{{ abilityMap.totalSkillCount }}</strong>
        <em>{{ assessedRatioText }}</em>
      </article>
      <article class="signal-card signal-card--weak">
        <span>薄弱项</span>
        <strong>{{ abilityMap.hasTrainingData ? abilityMap.weakSkillCount : '未评估' }}</strong>
        <em>{{ weakSignalText }}</em>
      </article>
      <article class="signal-card signal-card--usable">
        <span>强项/可用项</span>
        <strong>{{ abilityMap.hasTrainingData ? usableSkills.length : '未评估' }}</strong>
        <em>{{ usableSignalText }}</em>
      </article>
      <article class="signal-card">
        <span>证据</span>
        <strong>{{ totalEvidenceCount }}</strong>
        <em>{{ totalEvidenceCount ? '来自训练评估记录' : '等待训练沉淀' }}</em>
      </article>
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

    <section v-else class="map-workspace">
      <aside class="domain-rail">
        <div class="section-title">
          <span>能力域</span>
          <em>{{ abilityMap.domains.length }} 个方向</em>
        </div>
        <button
          v-for="domain in abilityMap.domains"
          :key="domain.domainCode"
          class="domain-item"
          :class="{ active: domain.domainCode === activeDomainCode }"
          type="button"
          @click="activeDomainCode = domain.domainCode"
        >
          <span>{{ safeDomainName(domain) }}</span>
          <strong>{{ domain.assessedCount }}/{{ domain.totalCount }}</strong>
          <small>{{ domainWeakText(domain) }}</small>
        </button>
      </aside>

      <main class="domain-panel">
        <header class="domain-panel__head">
          <div>
            <span>当前能力域</span>
            <h2>{{ activeDomainName }}</h2>
            <p>{{ activeDomainSummary }}</p>
          </div>
          <el-button plain type="primary" @click="startDomainTraining(activeDomain)">
            <Play :size="15" />
            训练本域
          </el-button>
        </header>

        <section class="growth-map-card" aria-label="成长地图阶段">
          <div class="section-title">
            <span>成长地图</span>
            <em>{{ growthMapMeta }}</em>
          </div>
          <div class="growth-stage-track">
            <article
              v-for="stage in growthStages"
              :key="stage.title"
              class="growth-stage"
              :class="{ active: stage.active }"
            >
              <span class="growth-stage__node">{{ stage.step }}</span>
              <div>
                <strong>{{ stage.title }}</strong>
                <em>{{ stage.desc }}</em>
              </div>
            </article>
          </div>
        </section>

        <div class="domain-map-strip">
          <article v-for="item in domainMilestones" :key="item.label" :class="['milestone', item.tone]">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <em>{{ item.hint }}</em>
          </article>
        </div>

        <section class="current-shortfall-card" :class="{ 'is-muted': !abilityMap.hasTrainingData }">
          <div class="section-title">
            <span>当前短板</span>
            <em>{{ currentShortfallMeta }}</em>
          </div>
          <strong>{{ currentShortfallTitle }}</strong>
          <p>{{ currentShortfallDescription }}</p>
          <div v-if="currentShortfallSkill" class="current-shortfall-card__meta">
            <span>训练对象：{{ safeSkillName(currentShortfallSkill) }}</span>
            <span>状态：{{ honestStatusLabel(currentShortfallSkill) }}</span>
          </div>
          <div class="current-shortfall-card__actions">
            <el-button
              :type="currentShortfallSkill && abilityMap.hasTrainingData ? 'primary' : 'default'"
              plain
              @click="startCurrentShortfallTraining"
            >
              <Play :size="14" />
              {{ currentShortfallActionLabel }}
            </el-button>
          </div>
        </section>

        <aside v-if="abilityMap.hasTrainingData" class="insight-panel">
          <section class="insight-card">
            <div class="section-title">
              <span>优先薄弱项</span>
              <em>{{ `${weakSkills.length} 项` }}</em>
            </div>
            <div v-if="weakSkills.length" class="priority-list">
              <button
                v-for="skill in weakSkills.slice(0, 3)"
                :key="skill.code"
                type="button"
                class="priority-item"
                @click="startSkillTraining(skill)"
              >
                <span>{{ safeSkillName(skill) }}</span>
                <small>{{ skill.evidenceCount || 0 }} 条证据 · {{ confidenceText(skill) }}</small>
              </button>
            </div>
            <p v-else class="insight-muted">{{ weakPanelEmptyText }}</p>
          </section>

          <section class="insight-card">
            <div class="section-title">
              <span>已可用能力</span>
              <em>{{ `${usableSkills.length} 项` }}</em>
            </div>
            <div v-if="usableSkills.length" class="chip-list">
              <span v-for="skill in usableSkills.slice(0, 8)" :key="skill.code">{{ safeSkillName(skill) }}</span>
            </div>
            <p v-else class="insight-muted">{{ usablePanelEmptyText }}</p>
          </section>

          <section class="insight-card">
            <div class="section-title">
              <span>训练路径</span>
              <em>下一步</em>
            </div>
            <ol class="training-path">
              <li v-for="item in trainingPath" :key="item.title">
                <CheckCircle2 :size="15" />
                <div>
                  <strong>{{ item.title }}</strong>
                  <span>{{ item.desc }}</span>
                </div>
              </li>
            </ol>
          </section>
        </aside>

        <aside class="next-training-card next-training-card--mobile" :class="{ 'is-muted': !abilityMap.hasTrainingData }">
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

        <div v-if="activeDomain?.skills?.length" class="skill-grid">
          <article
            v-for="skill in activeDomain.skills"
            :key="skill.code"
            class="skill-card"
            :class="skillCardClass(skill)"
          >
            <div class="skill-card__head">
              <div>
                <strong>{{ safeSkillName(skill) }}</strong>
                <span>{{ safeSkillDomainName(skill) }}</span>
              </div>
              <el-tag effect="plain" :type="statusTagType(skill.status)">
                {{ honestStatusLabel(skill) }}
              </el-tag>
            </div>

            <p>{{ skillSummary(skill) }}</p>

            <div class="skill-evidence-row">
              <span>
                <BookOpenCheck :size="14" />
                证据 {{ skill.evidenceCount || 0 }}
              </span>
              <span>
                <Clock3 :size="14" />
                {{ formatDate(skill.lastEvaluatedAt) }}
              </span>
              <span>
                <ShieldCheck :size="14" />
                {{ confidenceText(skill) }}
              </span>
            </div>

            <el-button class="skill-action" :type="skill.status === 'WEAK' ? 'primary' : 'default'" plain @click="startSkillTraining(skill)">
              <Play :size="14" />
              训练这个能力点
            </el-button>
          </article>
        </div>
        <el-empty v-else description="当前能力域还没有能力点" />
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  CircleHelp,
  Clock3,
  FolderOpen,
  Map,
  Play,
  ShieldCheck,
  Target
} from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { getAbilityMapApi } from '@/api/abilityMap'
import { normalizeAbilityMap, statusLabel, statusTagType } from '@/features/ability-map'
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
const weakSkills = computed(() => abilityMap.value.hasTrainingData ? allSkills.value.filter((skill) => skill.status === 'WEAK') : [])
const usableSkills = computed(() =>
  abilityMap.value.hasTrainingData
    ? allSkills.value.filter((skill) => ['COMPETENT', 'STRONG'].includes(String(skill.status)))
    : []
)
const totalEvidenceCount = computed(() => allSkills.value.reduce((total, skill) => total + (skill.evidenceCount || 0), 0))
const assessedRatioText = computed(() => {
  if (!abilityMap.value.totalSkillCount) return '等待能力目录'
  const ratio = Math.round((abilityMap.value.assessedSkillCount / abilityMap.value.totalSkillCount) * 100)
  return `${ratio}% 已有训练记录`
})
const weakSignalText = computed(() => {
  if (!abilityMap.value.hasTrainingData) return '训练后再判断'
  if (weakSkills.value.length) return '建议优先专项训练'
  return '暂无薄弱结论'
})
const usableSignalText = computed(() => {
  if (!abilityMap.value.hasTrainingData) return '训练后再判断'
  if (usableSkills.value.length) return '可用于面试表达'
  return '继续积累证据'
})
const activeDomainSummary = computed(() => {
  const domain = activeDomain.value
  if (!domain) return '完成训练后，这里会展示能力点状态、证据和下一步。'
  if (!abilityMap.value.hasTrainingData) return `${domain.totalCount || domain.skills.length} 个能力点尚未形成训练评估。`
  return `${domain.assessedCount || 0} 个已评估，${domain.weakCount || 0} 个薄弱项，优先从证据最少或状态薄弱的能力开始。`
})
const activeDomainUsableSkills = computed(() =>
  abilityMap.value.hasTrainingData
    ? (activeDomain.value?.skills || []).filter((skill) => ['COMPETENT', 'STRONG'].includes(String(skill.status)))
    : []
)
const activeDomainWeakSkills = computed(() =>
  abilityMap.value.hasTrainingData
    ? (activeDomain.value?.skills || []).filter((skill) => skill.status === 'WEAK')
    : []
)
const domainMilestones = computed(() => [
  {
    label: '已评估',
    value: `${activeDomain.value?.assessedCount || 0}/${activeDomain.value?.totalCount || activeDomain.value?.skills.length || 0}`,
    hint: abilityMap.value.hasTrainingData ? '有训练记录' : '尚未形成结论',
    tone: 'tone-info'
  },
  {
    label: '薄弱',
    value: abilityMap.value.hasTrainingData ? String(activeDomain.value?.weakCount || 0) : '未评估',
    hint: abilityMap.value.hasTrainingData ? '可直接训练' : '不生成判断',
    tone: 'tone-danger'
  },
  {
    label: '可用',
    value: abilityMap.value.hasTrainingData ? String(activeDomainUsableSkills.value.length) : '未评估',
    hint: abilityMap.value.hasTrainingData ? '面试可调用' : '等待证据',
    tone: 'tone-success'
  }
])
const recommendedSkill = computed(() => {
  if (abilityMap.value.hasTrainingData && weakSkills.value.length) return weakSkills.value[0]
  return activeDomain.value?.skills?.[0] || allSkills.value[0]
})
const currentShortfallSkill = computed(() =>
  activeDomainWeakSkills.value[0] || activeDomain.value?.skills?.find((skill) => !skill.evidenceCount) || activeDomain.value?.skills?.[0]
)
const growthMapMeta = computed(() => {
  if (!activeDomain.value) return '等待能力域'
  if (!abilityMap.value.hasTrainingData) return '先建立证据'
  if (activeDomainWeakSkills.value.length) return '优先修补短板'
  return '继续补齐证据'
})
const growthStages = computed(() => {
  const total = activeDomain.value?.totalCount || activeDomain.value?.skills.length || 0
  const assessed = activeDomain.value?.assessedCount || 0
  const shortfall = currentShortfallSkill.value ? safeSkillName(currentShortfallSkill.value) : activeDomainName.value

  if (!abilityMap.value.hasTrainingData) {
    return [
      { step: '1', title: '能力目录', desc: `${total} 个能力点待验证`, active: true },
      { step: '2', title: '完成训练', desc: '先生成真实答题证据', active: false },
      { step: '3', title: '定位短板', desc: '有评估后再推荐训练', active: false }
    ]
  }

  return [
    { step: '1', title: '能力目录', desc: `${total} 个能力点`, active: false },
    { step: '2', title: '证据评估', desc: `${assessed}/${total} 已评估`, active: !activeDomainWeakSkills.value.length },
    {
      step: '3',
      title: activeDomainWeakSkills.value.length ? '短板训练' : '下一步训练',
      desc: `进入 ${shortfall}`,
      active: true
    }
  ]
})
const currentShortfallMeta = computed(() => {
  if (!activeDomain.value) return '等待能力域'
  if (!abilityMap.value.hasTrainingData) return '未评估'
  if (activeDomainWeakSkills.value.length) return `${activeDomainWeakSkills.value.length} 个薄弱项`
  return '继续补证据'
})
const currentShortfallTitle = computed(() => {
  if (!activeDomain.value) return '先选择一个能力域'
  if (!abilityMap.value.hasTrainingData) return '当前短板尚未评估'
  if (activeDomainWeakSkills.value[0]) return safeSkillName(activeDomainWeakSkills.value[0])
  if (currentShortfallSkill.value) return `补齐证据：${safeSkillName(currentShortfallSkill.value)}`
  return '暂无明确短板'
})
const currentShortfallDescription = computed(() => {
  if (!activeDomain.value) return '能力目录加载后，会在这里给出当前能力域的训练入口。'
  if (!abilityMap.value.hasTrainingData) return '这里不会把未评估能力当成薄弱或强项。先完成一组训练，再用真实证据判断短板。'
  if (activeDomainWeakSkills.value[0]) return safeSkillSummary(activeDomainWeakSkills.value[0], '该能力点已有薄弱结论，建议优先用专项题补齐。')
  return '当前能力域没有明确薄弱结论，优先训练证据较少的能力点，避免结论过早。'
})
const currentShortfallActionLabel = computed(() => abilityMap.value.hasTrainingData && activeDomainWeakSkills.value.length ? '训练当前短板' : '训练本域')
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
const weakPanelEmptyText = computed(() => abilityMap.value.hasTrainingData ? '当前没有薄弱项结论，继续训练证据较少的能力点。' : '暂无训练评估数据，不能判断薄弱项。')
const usablePanelEmptyText = computed(() => abilityMap.value.hasTrainingData ? '暂时没有可标记为强项或合格的能力点。' : '暂无训练评估数据，不能判断强项。')
const trainingPath = computed(() => {
  if (!abilityMap.value.hasTrainingData) {
    return [
      { title: '完成一组专项题', desc: '先让能力点产生真实训练记录。' },
      { title: '查看评估证据', desc: '用证据数、最后评估和可信度判断下一步。' },
      { title: '回到图谱复盘', desc: '再决定薄弱项训练或面试巩固。' }
    ]
  }
  return [
    { title: weakSkills.value.length ? '先补薄弱项' : '继续补证据', desc: weakSkills.value.length ? '从薄弱能力点进入专项练习。' : '优先练证据少的能力点。' },
    { title: '沉淀项目说法', desc: '把训练暴露的问题补到项目证据里。' },
    { title: '进入模拟面试', desc: '用可用能力完成下一轮表达巩固。' }
  ]
})

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

const skillSummary = (skill: AbilitySkillNodeVO) => {
  if (!abilityMap.value.hasTrainingData || skill.status === 'UNASSESSED') {
    return sanitizeMojibakeText(skill.description, fallbackSkillDescription(skill))
  }
  return safeSkillSummary(skill, '已有训练记录，但暂无摘要。建议继续用专项训练补齐证据。')
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

const startCurrentShortfallTraining = () => {
  if (currentShortfallSkill.value) {
    startSkillTraining(currentShortfallSkill.value)
    return
  }
  startDomainTraining(activeDomain.value)
}

const startRecommendedTraining = () => {
  if (recommendedSkill.value) {
    startSkillTraining(recommendedSkill.value)
    return
  }
  router.push('/questions/practice')
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
  align-items: start;
}

.domain-rail,
.domain-panel,
.insight-panel {
  min-width: 0;
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
  display: grid;
  position: relative;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  &::before {
    position: absolute;
    top: 18px;
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

  &::before {
    position: absolute;
    top: 12px;
    bottom: 12px;
    left: 5px;
    width: 2px;
    border-radius: 999px;
    background: var(--user-primary);
    content: '';
  }
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
      top: 16px;
      bottom: 16px;
      left: 26px;
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
</style>
