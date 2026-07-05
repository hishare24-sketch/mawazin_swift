<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseCheckbox from '@/components/ui/BaseCheckbox.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import ThemeCustomizer from '@/components/shared/ThemeCustomizer.vue'
import AccountPlanPage from '@/modules/account/pages/AccountPlanPage.vue'
import PublicProfileManagePage from '@/modules/profile/pages/PublicProfileManagePage.vue'
import { ACCOUNT_TIER_META, useAccountPlanStore } from '@/stores/AccountPlanStore'
import { useAuthStore } from '@/stores/AuthStore'
import { usePublicProfileStore } from '@/stores/PublicProfileStore'

// ===== مركز الإعدادات — كل تحكم الحساب من مكان واحد، ديناميكي وقابل للبحث =====
const { locale } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const plan = useAccountPlanStore()
const pub = usePublicProfileStore()

// —— التبويب مربوط بالرابط: /settings?tab=… (روابط عميقة قابلة للمشاركة) ——
type SettingsTab = 'general' | 'publicProfile' | 'plan' | 'preferences' | 'notifications' | 'privacy' | 'integrations'
const VALID_TABS: SettingsTab[] = ['general', 'publicProfile', 'plan', 'preferences', 'notifications', 'privacy', 'integrations']
const tab = ref<SettingsTab>(VALID_TABS.includes(route.query.tab as SettingsTab) ? route.query.tab as SettingsTab : 'general')
watch(() => route.query.tab, (v) => {
  if (VALID_TABS.includes(v as SettingsTab))
    tab.value = v as SettingsTab
})
watch(tab, v => router.replace({ query: { ...route.query, tab: v } }))

// —— بحث الإعدادات: يقفز بك للقسم الصحيح ——
interface SettingEntry { label: string, tab: SettingsTab, icon: string }
const SETTINGS_INDEX: SettingEntry[] = [
  { label: 'الاسم والبريد وكلمة المرور', tab: 'general', icon: 'mdi-account-outline' },
  { label: 'قصتي المهنية والمسمى التسويقي', tab: 'publicProfile', icon: 'mdi-card-account-details-star-outline' },
  { label: 'روابط LinkedIn وGitHub والشبكات', tab: 'publicProfile', icon: 'mdi-link-variant' },
  { label: 'ثيم صفحتي وألوانها وشكل صورتي', tab: 'publicProfile', icon: 'mdi-palette-swatch-outline' },
  { label: 'حالتي المهنية (متاح للعمل) وعبارتي المؤثرة', tab: 'publicProfile', icon: 'mdi-account-badge-outline' },
  { label: 'نقاط القوة وترتيب أقسام صفحتي', tab: 'publicProfile', icon: 'mdi-sort' },
  { label: 'زر جدولة مقابلة على صفحتي', tab: 'publicProfile', icon: 'mdi-calendar-clock-outline' },
  { label: 'الإنجازات ومعرض الأعمال والمهارات الظاهرة', tab: 'publicProfile', icon: 'mdi-rocket-launch-outline' },
  { label: 'إظهار وإخفاء أقسام صفحتي العامة', tab: 'publicProfile', icon: 'mdi-eye-settings-outline' },
  { label: 'إشراف تعليقات الزوار', tab: 'publicProfile', icon: 'mdi-comment-check-outline' },
  { label: 'ترقية الباقة والمزايا والأسعار', tab: 'plan', icon: 'mdi-crown-outline' },
  { label: 'حدود الاستبيانات والتفويض', tab: 'plan', icon: 'mdi-gauge' },
  { label: 'الثيم والألوان والوضع الداكن', tab: 'preferences', icon: 'mdi-palette-outline' },
  { label: 'اللغة وحجم الخط', tab: 'preferences', icon: 'mdi-translate' },
  { label: 'أنواع الإشعارات ووسيلتها', tab: 'notifications', icon: 'mdi-bell-outline' },
  { label: 'خصوصية الملف والتوصيات والنتائج', tab: 'privacy', icon: 'mdi-shield-lock-outline' },
  { label: 'الحسابات المرتبطة (LinkedIn/GitHub/Google)', tab: 'integrations', icon: 'mdi-connection' },
]
const searchQuery = ref('')
const searchOpen = ref(false)
const filteredSettings = computed(() => {
  const q = searchQuery.value.trim()
  return q ? SETTINGS_INDEX.filter(e => e.label.includes(q)) : SETTINGS_INDEX
})
function pickSetting(e: SettingEntry) {
  tab.value = e.tab
  searchQuery.value = ''
  searchOpen.value = false
}

const TAB_META: { value: SettingsTab, label: string, icon: string }[] = [
  { value: 'general', label: 'الحساب', icon: 'mdi-account-outline' },
  { value: 'publicProfile', label: 'صفحتي التعريفية', icon: 'mdi-card-account-details-star-outline' },
  { value: 'plan', label: 'باقتي', icon: 'mdi-crown-outline' },
  { value: 'preferences', label: 'المظهر واللغة', icon: 'mdi-palette-outline' },
  { value: 'notifications', label: 'الإشعارات', icon: 'mdi-bell-outline' },
  { value: 'privacy', label: 'الخصوصية', icon: 'mdi-shield-lock-outline' },
  { value: 'integrations', label: 'التكامل', icon: 'mdi-connection' },
]

/** شارة حيّة بجانب بعض التبويبات — الإعدادات تتنفس مع بياناتك */
function tabBadge(t: SettingsTab): string | null {
  if (t === 'publicProfile')
    return `${pub.strength.score}%`
  if (t === 'plan')
    return ACCOUNT_TIER_META[plan.tier].label
  return null
}

// General
const name = ref(authStore.authUser?.name ?? '')
const email = ref(authStore.authUser?.email ?? '')
const phone = ref(authStore.authUser?.phone ?? '')

// Preferences
const fontSize = ref('medium')
const FONT_SIZES = [{ value: 'small', label: 'صغير' }, { value: 'medium', label: 'متوسط' }, { value: 'large', label: 'كبير' }]

// Notifications
const notif = ref({
  endorsements: true,
  messages: true,
  opportunities: true,
  wishes: true,
  reminders: false,
  surveys: false,
})
const NOTIF_TYPES: { key: keyof typeof notif.value, label: string }[] = [
  { key: 'opportunities', label: 'فرص جديدة' },
  { key: 'wishes', label: 'رغبات واردة' },
  { key: 'endorsements', label: 'توصيات' },
  { key: 'messages', label: 'رسائل' },
  { key: 'reminders', label: 'تذكيرات' },
  { key: 'surveys', label: 'استبيانات' },
]
const notifChannel = ref<string[]>(['in_app', 'email'])
const NOTIF_CHANNELS = [
  { value: 'in_app', label: 'داخل المنصة' },
  { value: 'email', label: 'بريد إلكتروني' },
  { value: 'whatsapp', label: 'واتساب' },
]

// Privacy (7 settings)
const privacy = ref([
  { label: 'ظهور الملف الشخصي', value: 'public' },
  { label: 'ظهور التوصيات', value: 'companies' },
  { label: 'ظهور نتائج الاختبارات', value: 'private' },
  { label: 'ظهور الرغبات الواردة', value: 'private' },
  { label: 'ظهور السير الذاتية', value: 'public' },
  { label: 'إشعارات التواصل', value: 'public' },
  { label: 'مشاركة البيانات للتحليل', value: 'public' },
])
const privacyOptions = [
  { value: 'public', title: 'عام' },
  { value: 'companies', title: 'لأصحاب العمل' },
  { value: 'private', title: 'خاص' },
]

// Integrations
const integrations = ref([
  { name: 'LinkedIn', icon: 'mdi-linkedin', connected: true },
  { name: 'GitHub', icon: 'mdi-github', connected: false },
  { name: 'Google', icon: 'mdi-google', connected: true },
])

function toggleLocale(val: string) {
  locale.value = val as 'ar' | 'en'
}
</script>

<template>
  <div>
    <PageHeader title="الإعدادات" subtitle="كل تحكم حسابك من مكان واحد — ابحث أو تنقّل بين الأقسام" icon="mdi-cog-outline">
      <template #actions>
        <div class="relative" style="min-width: 260px">
          <BaseInput
            v-model="searchQuery"
            placeholder="ابحث في الإعدادات..."
            prefix-icon="mdi-magnify"
            @focus="searchOpen = true"
          />
          <template v-if="searchOpen">
            <div class="fixed inset-0 z-40" @click="searchOpen = false" />
            <div class="dd-panel absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-ui border-ui bg-surface py-1 shadow-lg">
              <button
                v-for="e in filteredSettings"
                :key="e.label"
                type="button"
                class="menu-row"
                @click="pickSetting(e)"
              >
                <BaseIcon :name="e.icon" :size="18" class="text-muted" />
                <span>{{ e.label }}</span>
              </button>
              <div v-if="!filteredSettings.length" class="px-4 py-2 text-sm text-muted">لا نتائج</div>
            </div>
          </template>
        </div>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 gap-5 md:grid-cols-[220px_1fr]">
      <!-- تنقّل جانبي على الشاشات الواسعة، أفقي على الموبايل -->
      <aside class="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
        <button
          v-for="t in TAB_META"
          :key="t.value"
          type="button"
          class="settings-tab"
          :class="{ 'is-active': tab === t.value }"
          @click="tab = t.value"
        >
          <BaseIcon :name="t.icon" :size="18" />
          <span>{{ t.label }}</span>
          <BaseChip v-if="tabBadge(t.value)" color="brand" class="ms-auto">{{ tabBadge(t.value) }}</BaseChip>
        </button>
      </aside>

      <div>
        <!-- General -->
        <BaseCard v-if="tab === 'general'">
          <h3 class="mb-4 font-bold text-content">معلومات الحساب</h3>
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <BaseInput v-model="name" label="الاسم" />
            <BaseInput v-model="email" label="البريد الإلكتروني" type="email" />
            <BaseInput v-model="phone" label="رقم الجوال" />
          </div>
          <div class="my-4 border-t border-ui" />
          <h3 class="mb-3 font-bold text-content">كلمة المرور</h3>
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <BaseInput label="كلمة المرور الحالية" type="password" />
            <BaseInput label="كلمة المرور الجديدة" type="password" />
          </div>
          <div class="mt-4 flex justify-end">
            <BaseButton variant="accent">
              <BaseIcon name="mdi-content-save" :size="18" />
              حفظ التغييرات
            </BaseButton>
          </div>
        </BaseCard>

        <!-- صفحتي التعريفية (الإدارة الكاملة داخل الإعدادات) -->
        <PublicProfileManagePage v-else-if="tab === 'publicProfile'" embedded />

        <!-- باقتي (باقة الحساب الموحّدة داخل الإعدادات) -->
        <AccountPlanPage v-else-if="tab === 'plan'" embedded />

        <!-- Preferences -->
        <template v-else-if="tab === 'preferences'">
          <ThemeCustomizer class="mb-4" max-width="100%" />
          <BaseCard>
            <h3 class="mb-4 font-bold text-content">التفضيلات</h3>
            <div class="mb-4">
              <div class="mb-2 text-sm font-medium text-content">اللغة</div>
              <div class="seg">
                <button
                  v-for="l in [{ value: 'ar', label: 'العربية' }, { value: 'en', label: 'English' }]"
                  :key="l.value"
                  type="button"
                  class="seg-btn"
                  :class="{ 'is-active': locale === l.value }"
                  @click="toggleLocale(l.value)"
                >{{ l.label }}</button>
              </div>
            </div>
            <div>
              <div class="mb-2 text-sm font-medium text-content">حجم الخط</div>
              <div class="seg">
                <button
                  v-for="f in FONT_SIZES"
                  :key="f.value"
                  type="button"
                  class="seg-btn"
                  :class="{ 'is-active': fontSize === f.value }"
                  @click="fontSize = f.value"
                >{{ f.label }}</button>
              </div>
            </div>
          </BaseCard>
        </template>

        <!-- Notifications -->
        <BaseCard v-else-if="tab === 'notifications'">
          <h3 class="mb-2 font-bold text-content">أنواع الإشعارات</h3>
          <BaseSwitch
            v-for="n in NOTIF_TYPES"
            :key="n.key"
            v-model="notif[n.key]"
            :label="n.label"
          />
          <div class="my-4 border-t border-ui" />
          <h3 class="mb-2 font-bold text-content">وسيلة الإشعار</h3>
          <div class="flex flex-wrap gap-4">
            <BaseCheckbox
              v-for="c in NOTIF_CHANNELS"
              :key="c.value"
              v-model="notifChannel"
              :value="c.value"
              :label="c.label"
            />
          </div>
        </BaseCard>

        <!-- Privacy -->
        <BaseCard v-else-if="tab === 'privacy'">
          <h3 class="mb-4 font-bold text-content">إعدادات الخصوصية</h3>
          <div
            v-for="(s, i) in privacy"
            :key="i"
            class="flex flex-wrap items-center justify-between gap-2 py-2"
          >
            <span class="text-sm text-content">{{ s.label }}</span>
            <div class="seg">
              <button
                v-for="opt in privacyOptions"
                :key="opt.value"
                type="button"
                class="seg-btn"
                :class="{ 'is-active': s.value === opt.value }"
                @click="s.value = opt.value"
              >{{ opt.title }}</button>
            </div>
          </div>
        </BaseCard>

        <!-- Integrations -->
        <BaseCard v-else-if="tab === 'integrations'">
          <h3 class="mb-4 font-bold text-content">الحسابات المرتبطة</h3>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div
              v-for="ig in integrations"
              :key="ig.name"
              class="rounded-ui border-ui p-4 text-center"
            >
              <BaseIcon :name="ig.icon" :size="40" class="mb-2 text-content" />
              <div class="mb-2 text-sm font-bold text-content">{{ ig.name }}</div>
              <BaseButton :variant="ig.connected ? 'outline' : 'brand'" size="sm" block>
                {{ ig.connected ? 'فصل' : 'ربط' }}
              </BaseButton>
            </div>
          </div>
        </BaseCard>
      </div>
    </div>
  </div>
</template>
