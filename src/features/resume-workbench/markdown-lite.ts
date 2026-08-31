import { ALLOWED_LINK_PROTOCOLS } from '@/features/resume-workbench/document'

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const safeHref = (url: string): string | null => {
  const trimmed = url.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed, 'https://placeholder.invalid')
    const isRelativeish = !/^[a-z]+:/i.test(trimmed)
    if (isRelativeish) return null
    return ALLOWED_LINK_PROTOCOLS.includes(parsed.protocol) ? trimmed : null
  } catch {
    return null
  }
}

/** 渲染 markdown-lite 子集：**粗体**、*斜体*、[文字](链接)；其余按纯文本转义。 */
export const renderMarkdownInline = (text: string): string => {
  const linkPattern = /\[([^\]]*)\]\(([^)\s]*)\)/g
  let html = ''
  let cursor = 0
  for (const match of text.matchAll(linkPattern)) {
    const index = match.index ?? 0
    html += renderEmphasis(escapeHtml(text.slice(cursor, index)))
    const label = renderEmphasis(escapeHtml(match[1] || match[2] || ''))
    const href = safeHref(match[2] || '')
    html += href
      ? `<a href="${escapeHtml(href)}" rel="noopener noreferrer nofollow" target="_blank">${label}</a>`
      : label
    cursor = index + match[0].length
  }
  html += renderEmphasis(escapeHtml(text.slice(cursor)))
  return html
}

const renderEmphasis = (escaped: string): string =>
  escaped
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(（【])\*([^*\n]+)\*(?=[\s)）】.,，。;；!！?？:]|$)/g, '$1<em>$2</em>')
    .replace(/(^|[\s(（【])_([^_\n]+)_(?=[\s)）】.,，。;；!！?？:]|$)/g, '$1<em>$2</em>')

/** 去掉 markdown-lite 标记得到 ATS 纯文本。链接保留文字；includeLinkTarget 时追加 “文字 (url)”。 */
export const stripMarkdownInline = (text: string, includeLinkTarget = false): string => {
  const linkPattern = /\[([^\]]*)\]\(([^)\s]*)\)/g
  const stripped = text.replace(linkPattern, (_full, label: string, url: string) => {
    const visible = label || url || ''
    if (!includeLinkTarget || !safeHref(url || '')) return visible
    return visible && url ? `${visible} (${url})` : visible
  })
  return stripped
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[\s(（【])\*([^*\n]+)\*(?=[\s)）】.,，。;；!！?？:]|$)/g, '$2')
    .replace(/(^|[\s(（【])_([^_\n]+)_(?=[\s)）】.,，。;；!！?？:]|$)/g, '$2')
}

export interface PlainLine {
  kind: 'line' | 'bullet' | 'ordered'
  text: string
}

/** 渲染模型：块列表 → 行序列（ATS 单栏投影与服务器共用同一约定）。 */
export const toPlainLines = <T extends { kind: 'line' | 'bullet' | 'ordered'; text: string }>(
  blocks: T[],
  includeLinkTarget = false
): PlainLine[] =>
  blocks
    .map((block) => ({ kind: block.kind, text: stripMarkdownInline(block.text, includeLinkTarget) }))
    .filter((line) => line.text.length > 0)
