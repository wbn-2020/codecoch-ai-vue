import type { ResumeContactItem, ResumeDocumentV2 } from './document'

/**
 * 魔方简历式「基础字段 / 自定义字段」编辑操作：
 * phone/email 的值走旧扁平字段（渲染模型从 draft 映射），
 * document.basics.contacts 只承载自定义联系人，这里只操作这一层。
 */

export const updateBasics = (
  document: ResumeDocumentV2,
  patch: Partial<Pick<ResumeDocumentV2['basics'], 'name' | 'headline'>> & {
    avatar?: Partial<ResumeDocumentV2['basics']['avatar']>
  }
): ResumeDocumentV2 => ({
  ...document,
  basics: {
    ...document.basics,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.headline !== undefined ? { headline: patch.headline } : {}),
    ...(patch.avatar
      ? {
        avatar: {
          url: '',
          visible: true,
          shape: 'ROUNDED',
          position: 'LEFT',
          ...document.basics.avatar,
          ...patch.avatar
        }
      }
      : {})
  }
})

export const updateContact = (
  document: ResumeDocumentV2,
  contactId: string,
  patch: Partial<Omit<ResumeContactItem, 'id'>>
): ResumeDocumentV2 => ({
  ...document,
  basics: {
    ...document.basics,
    contacts: document.basics.contacts.map((contact) =>
      contact.id === contactId ? { ...contact, ...patch } : contact
    )
  }
})

export const addContact = (
  document: ResumeDocumentV2,
  contact: Omit<ResumeContactItem, 'id'>
): ResumeDocumentV2 => ({
  ...document,
  basics: {
    ...document.basics,
    contacts: [...document.basics.contacts, { ...contact, id: `ct-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }]
  }
})

export const removeContact = (document: ResumeDocumentV2, contactId: string): ResumeDocumentV2 => ({
  ...document,
  basics: {
    ...document.basics,
    contacts: document.basics.contacts.filter((contact) => contact.id !== contactId)
  }
})

export const reorderContacts = (document: ResumeDocumentV2, orderedIds: string[]): ResumeDocumentV2 => {
  const map = new Map(document.basics.contacts.map((contact) => [contact.id, contact]))
  const ordered = orderedIds
    .map((id) => map.get(id))
    .filter((contact): contact is ResumeContactItem => Boolean(contact))
  const rest = document.basics.contacts.filter((contact) => !orderedIds.includes(contact.id))
  return {
    ...document,
    basics: {
      ...document.basics,
      contacts: [...ordered, ...rest]
    }
  }
}
