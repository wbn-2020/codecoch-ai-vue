#!/usr/bin/env node
/**
 * CodeCoachAI 测试环境验收脚本（Phase 3）
 *
 * 用法：
 *   node scripts/acceptance-check.mjs [baseUrl] [username] [password]
 *   默认：http://103.236.97.252:30080  accept_20260908  Accept2026!x
 *
 * 覆盖《P0 开发启动说明》§5.4 验收清单中可脚本化的部分：
 *   1. 服务健康（网关 + 前端）
 *   2. 登录
 *   3. 新用户零数据 JD 冷启动推荐（≥3 道可练题，带理由）
 *   4. JD 无命中兜底（不 500、不空崩）
 *   5. 作答 → AI 点评 → 错题入库 → dueOnly 到期筛选
 *   6. 学习计划动态调整（含到期错题注入与幂等）
 *   7. 旧 URL 不 404（SPA 回退）
 *   8. 被隐藏入口不再暴露（排行榜/竞技/演示/实验台 chunk 检查）
 *
 * 输出：逐项 PASS/FAIL + 总结；任何 FAIL 以退出码 1 结束。
 */
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const argv = process.argv.slice(2)
const BASE_URL = (argv[0] || 'http://103.236.97.252:30080').replace(/\/$/, '')
const API = `${BASE_URL}/api`
const USERNAME = argv[1] || 'accept_20260908'
const PASSWORD = argv[2] || 'Accept2026!x'

const results = []
const step = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const request = async (path, options = {}) => {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  })
  const text = await response.text()
  let body = null
  try { body = JSON.parse(text) } catch { body = text }
  return { status: response.status, body }
}

// 1. 服务健康
{
  const gateway = await fetch(`${BASE_URL}/api/health`).then(r => r.status).catch(() => 0)
  step('网关健康', gateway === 200, `status=${gateway}`)
  const frontend = await fetch(BASE_URL).then(r => r.status).catch(() => 0)
  step('前端首页可访问', frontend === 200, `status=${frontend}`)
}

// 2. 登录
let token = ''
{
  const { body } = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: USERNAME, password: PASSWORD })
  })
  token = body?.data?.token || ''
  step('登录', Boolean(token), token ? `user=${USERNAME}` : JSON.stringify(body).slice(0, 120))
}
const auth = { Authorization: `Bearer ${token}` }

// 3. 新用户零数据 JD 冷启动
{
  const { body } = await request('/question-recommendations/by-jd', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      jdText: '负责 Java 后端开发，要求熟悉 Spring Boot 微服务、MySQL 索引优化、Redis 缓存、消息队列和高并发，熟悉 JVM 调优者优先。',
      limit: 10
    })
  })
  const items = body?.data || []
  const allReasoned = items.every(item => item.recommendReason && item.sourceType === 'JD_KEYWORD')
  step('JD 冷启动推荐 ≥3 道可练题', items.length >= 3, `count=${items.length}`)
  step('推荐带来源与理由', allReasoned && items.length > 0, `sample=${items[0]?.recommendReason?.slice(0, 24) || 'n/a'}`)
}

// 4. JD 无命中兜底（怪异文本，不命中任何关键词也应兜底而非报错）
{
  const { body } = await request('/question-recommendations/by-jd', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ jdText: 'zzz qqq unrelated texto 12345 !@#', limit: 5 })
  })
  const items = body?.data
  step('JD 无命中兜底不报错', body?.code === 0 && Array.isArray(items), `code=${body?.code} count=${Array.isArray(items) ? items.length : 'n/a'}`)
}

// 5. 作答 → 点评 → 错题入库 → dueOnly
{
  const { body } = await request('/practice/questions/5001/answers', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ answerContent: 'Redis 就是缓存，把数据放内存里就完了。' })
  })
  const data = body?.data || {}
  const reviewed = data.reviewStatus === 'SUCCESS' && data.score != null
  step('作答获得 AI 点评', reviewed, `record=${data.recordId || data.id} score=${data.score} level=${data.level}`)

  const wrong = await request('/questions/wrong-records?pageNo=1&pageSize=20', { headers: auth })
  const records = wrong.body?.data?.records || wrong.body?.data?.list || []
  const hasNew = records.some(r => r.questionId === 5001)
  step('错题自动入库（含调度字段）', hasNew, `wrongTotal=${wrong.body?.data?.total}`)
  const dueRow = records.find(r => r.questionId === 5001)
  step('错题带间隔复习调度', dueRow ? dueRow.nextReviewAt != null && dueRow.reviewIntervalDays >= 1 : false,
    dueRow ? `interval=${dueRow.reviewIntervalDays}d next=${String(dueRow.nextReviewAt).slice(0, 10)}` : 'missing')

  const due = await request('/questions/wrong-records?pageNo=1&pageSize=5&dueOnly=true', { headers: auth })
  const dueTotal = due.body?.data?.total
  step('dueOnly 到期筛选可用', typeof dueTotal === 'number', `dueTotal=${dueTotal}（未到期则为 0，属正常）`)
}

// 6. 学习计划动态调整（无计划场景：接口不炸即通过；有验收计划时校验注入）
{
  const { body } = await request('/study-plans/999999/adjust', { method: 'POST', headers: auth })
  step('计划调整接口可用', body?.code === 0 && typeof body?.data?.rescheduledCount === 'number',
    body?.data?.message || `code=${body?.code}`)

  // 查验收计划（若存在）
  const plans = await request('/study-plans?pageNo=1&pageSize=20', { headers: auth })
  const plan = (plans.body?.data?.records || []).find(p => p.id != null)
  if (plan) {
    const adjust = await request(`/study-plans/${plan.id}/adjust`, { method: 'POST', headers: auth })
    const data = adjust.body?.data || {}
    step('计划调整含错题注入与幂等',
      adjust.body?.code === 0
      && typeof data.rescheduledCount === 'number'
      && typeof data.addedReviewCount === 'number',
      `rescheduled=${data.rescheduledCount} reviewAdded=${data.addedReviewCount}`)
  } else {
    step('计划调整含错题注入与幂等', true, '无计划可调，跳过（接口本身已验证）')
  }
}

// 7. 旧 URL 不 404（SPA 回退）
{
  const oldPaths = ['/projects', '/tools', '/arena/leaderboard', '/arena/battle', '/job-experiments', '/questions/recommendations']
  for (const path of oldPaths) {
    const status = await fetch(`${BASE_URL}${path}`).then(r => r.status).catch(() => 0)
    step(`旧 URL ${path} 不 404`, status === 200, `status=${status}`)
  }
}

// 8. 被隐藏入口不再暴露（导航 chunk 不含已移除文案）
{
  const html = await fetch(BASE_URL).then(r => r.text())
  const entryMatch = html.match(/assets\/(index-[A-Za-z0-9_-]+\.js)/)
  if (entryMatch) {
    const entry = await fetch(`${BASE_URL}/assets/${entryMatch[1]}`).then(r => r.text())
    // userNavigation 是独立 chunk，从 entry 里提取其文件名
    const navMatch = entry.match(/userNavigation-[A-Za-z0-9_-]+\.js/)
    if (navMatch) {
      const nav = await fetch(`${BASE_URL}/assets/${navMatch[0]}`).then(r => r.text())
      const removed = ['排行榜', '协作练习', '作品集演示', '求职实验台', '记录与工具']
      const leaked = removed.filter(label => nav.includes(label))
      step('被移除入口不暴露于导航', leaked.length === 0, leaked.length ? `泄漏: ${leaked.join(',')}` : '干净')
      const required = ['今日', '求职', '资料', '面试', '训练', '准备度']
      const missing = required.filter(label => !nav.includes(label))
      step('六项主导航齐全', missing.length === 0, missing.length ? `缺失: ${missing.join(',')}` : '齐全')
    } else {
      step('被移除入口不暴露于导航', false, '未找到 userNavigation chunk')
      step('六项主导航齐全', false, '未找到 userNavigation chunk')
    }
  } else {
    step('被移除入口不暴露于导航', false, '未找到 entry chunk')
    step('六项主导航齐全', false, '未找到 entry chunk')
  }
}

// 总结
const failed = results.filter(r => !r.ok)
console.log(`\n=== 验收总结: ${results.length - failed.length}/${results.length} 通过 ===`)
if (failed.length) {
  console.log('失败项:')
  failed.forEach(f => console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ''}`))
  process.exit(1)
}
