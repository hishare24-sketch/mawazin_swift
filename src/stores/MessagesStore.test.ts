import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMessagesStore } from './MessagesStore'

// ST-MSG: متجر الرسائل — البذرة/غير المقروء، markRead، send، محادثة جديدة، تلف JSON

describe('MessagesStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('seeds conversations and sums unread', () => {
    const store = useMessagesStore()
    expect(store.conversations.length).toBeGreaterThan(0)
    const sum = store.conversations.reduce((s, c) => s + c.unread, 0)
    expect(store.totalUnread).toBe(sum)
    expect(sum).toBeGreaterThan(0)
  })

  it('markRead zeroes the conversation unread counter', () => {
    const store = useMessagesStore()
    const conv = store.conversations.find(c => c.unread > 0)!
    store.markRead(conv.id)
    expect(conv.unread).toBe(0)
  })

  it('send appends my message and ignores blank text', () => {
    const store = useMessagesStore()
    const conv = store.conversations[0]
    const before = conv.messages.length

    store.send(conv.id, '  ')
    expect(conv.messages.length).toBe(before) // فارغ → تجاهل

    store.send(conv.id, 'مرحبًا')
    expect(conv.messages.length).toBe(before + 1)
    expect(conv.messages.at(-1)).toMatchObject({ from: 'me', text: 'مرحبًا' })
  })

  it('startConversation prepends a new unread conversation', () => {
    const store = useMessagesStore()
    const c = store.startConversation('زائر الصفحة', 'زائر', 'أوّل رسالة')
    expect(store.conversations[0].id).toBe(c.id)
    expect(c.unread).toBe(1)
    expect(c.messages[0]).toMatchObject({ from: 'them', text: 'أوّل رسالة' })
    expect(c.initial).toBe('ز')
  })

  it('falls back to seed when stored JSON is corrupt', () => {
    localStorage.setItem('conversations', 'oops!]')
    setActivePinia(createPinia())
    const store = useMessagesStore()
    expect(store.conversations.length).toBeGreaterThan(0)
  })
})
