import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { syncPrivateDoc } from '@/services/cloudSync'

// ===== تفضيلات الحساب — الإشعارات + الخصوصية + حجم الخط =====
// كانت مراجع محليّة صوريّة في مركز الإعدادات لا تُحفَظ. الآن مخزن حقيقيّ:
// localStorage فورًا + مزامنة سحابيّة عبر account-states (بجلسة حقيقيّة).

export interface NotifPrefs {
  opportunities: boolean
  wishes: boolean
  endorsements: boolean
  messages: boolean
  reminders: boolean
  surveys: boolean
}

export type PrivacyLevel = 'public' | 'companies' | 'private'
export type PrivacyKey = 'profile' | 'testimonials' | 'testResults' | 'incomingWishes' | 'resumes' | 'contact' | 'dataSharing'
export type FontSize = 'small' | 'medium' | 'large'

interface PrefsSnapshot {
  notifications: NotifPrefs
  notifChannels: string[]
  privacy: Record<PrivacyKey, PrivacyLevel>
  fontSize: FontSize
}

const STORAGE = 'accountPrefs'

const DEFAULTS: PrefsSnapshot = {
  notifications: { opportunities: true, wishes: true, endorsements: true, messages: true, reminders: false, surveys: false },
  notifChannels: ['in_app', 'email'],
  privacy: {
    profile: 'public',
    testimonials: 'companies',
    testResults: 'private',
    incomingWishes: 'private',
    resumes: 'public',
    contact: 'public',
    dataSharing: 'public',
  },
  fontSize: 'medium',
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

function load(): PrefsSnapshot {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE) ?? '{}') as Partial<PrefsSnapshot>
    const base = clone(DEFAULTS)
    return {
      notifications: { ...base.notifications, ...raw.notifications },
      notifChannels: Array.isArray(raw.notifChannels) ? raw.notifChannels : base.notifChannels,
      privacy: { ...base.privacy, ...raw.privacy },
      fontSize: raw.fontSize ?? base.fontSize,
    }
  }
  catch {
    return clone(DEFAULTS)
  }
}

export const useAccountPrefsStore = defineStore('accountPrefs', () => {
  const init = load()
  const notifications = ref<NotifPrefs>(init.notifications)
  const notifChannels = ref<string[]>(init.notifChannels)
  const privacy = ref<Record<PrivacyKey, PrivacyLevel>>(init.privacy)
  const fontSize = ref<FontSize>(init.fontSize)

  function snapshot(): PrefsSnapshot {
    return {
      notifications: notifications.value,
      notifChannels: notifChannels.value,
      privacy: privacy.value,
      fontSize: fontSize.value,
    }
  }

  watch([notifications, notifChannels, privacy, fontSize], () => {
    localStorage.setItem(STORAGE, JSON.stringify(snapshot()))
  }, { deep: true })

  // مزامنة سحابيّة خاصّة — بجلسة حقيقيّة فقط (محايدة في المحاكاة)
  const { status: syncStatus } = syncPrivateDoc({
    store: 'accountPrefs',
    snapshot,
    apply: (incoming) => {
      const d = incoming as Partial<PrefsSnapshot>
      if (d.notifications)
        notifications.value = { ...notifications.value, ...d.notifications }
      if (Array.isArray(d.notifChannels))
        notifChannels.value = d.notifChannels
      if (d.privacy)
        privacy.value = { ...privacy.value, ...d.privacy }
      if (d.fontSize)
        fontSize.value = d.fontSize
    },
    source: [notifications, notifChannels, privacy, fontSize],
  })

  return { notifications, notifChannels, privacy, fontSize, syncStatus }
})
