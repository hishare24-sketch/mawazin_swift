import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNotificationsStore } from './NotificationsStore'

// ST-NOTIF: متجر الإشعارات — البذرة/غير المقروء، push، القراءة، ترحيل actionTo، تلف JSON

describe('NotificationsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('seeds notifications and counts unread', () => {
    const store = useNotificationsStore()
    expect(store.notifications.length).toBeGreaterThan(0)
    const unread = store.notifications.filter(n => !n.read).length
    expect(store.unreadCount).toBe(unread)
    expect(unread).toBeGreaterThan(0)
  })

  it('push prepends an unread notification', () => {
    const store = useNotificationsStore()
    const before = store.unreadCount
    store.push({ icon: 'mdi-bell', color: 'info', title: 'جديد', body: 'نصّ', category: 'system' })
    expect(store.notifications[0].title).toBe('جديد')
    expect(store.notifications[0].read).toBe(false)
    expect(store.unreadCount).toBe(before + 1)
  })

  it('markAllRead / markRead / toggleRead update read state', () => {
    const store = useNotificationsStore()
    store.markAllRead()
    expect(store.unreadCount).toBe(0)

    const id = store.notifications[0].id
    store.toggleRead(id)
    expect(store.unreadCount).toBe(1)
    store.markRead(id)
    expect(store.unreadCount).toBe(0)
  })

  it('migrates stored rows lacking actionTo from the matching seed', () => {
    // جلسة قديمة: إشعار seed id=1 بلا actionTo (ما قبل ميزة الإجراء المباشر)
    localStorage.setItem('notifications', JSON.stringify([
      { id: 1, icon: 'x', color: 'primary', title: 'قديم', body: 'ب', time: 'أمس', read: false, category: 'opportunity' },
    ]))
    setActivePinia(createPinia())
    const store = useNotificationsStore()
    expect(store.notifications[0].actionTo).toBe('/opportunities/1') // اكتسبها من الـseed
  })

  it('falls back to seed when stored JSON is corrupt', () => {
    localStorage.setItem('notifications', '[[[broken')
    setActivePinia(createPinia())
    const store = useNotificationsStore()
    expect(store.notifications.length).toBeGreaterThan(0)
  })
})
