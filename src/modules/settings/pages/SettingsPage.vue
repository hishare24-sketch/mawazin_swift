<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
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
const { mdAndUp } = useDisplay()
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
const search = ref<SettingEntry | null>(null)
watch(search, (v) => {
  if (v) {
    tab.value = v.tab
    search.value = null
  }
})

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

// Notifications
const notif = ref({
  endorsements: true,
  messages: true,
  opportunities: true,
  wishes: true,
  reminders: false,
  surveys: false,
})
const notifChannel = ref(['in_app', 'email'])

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
        <VAutocomplete
          v-model="search"
          :items="SETTINGS_INDEX"
          item-title="label"
          return-object
          placeholder="ابحث في الإعدادات..."
          prepend-inner-icon="mdi-magnify"
          density="compact"
          hide-details
          clearable
          style="min-width: 260px"
        >
          <template #item="{ props, item }">
            <VListItem v-bind="props" :prepend-icon="item.raw.icon" density="compact" />
          </template>
        </VAutocomplete>
      </template>
    </PageHeader>

    <VRow>
      <!-- تنقّل جانبي على الشاشات الواسعة، أفقي على الموبايل -->
      <VCol cols="12" md="3" lg="2">
        <VTabs v-model="tab" :direction="mdAndUp ? 'vertical' : 'horizontal'" color="primary" :show-arrows="!mdAndUp">
          <VTab v-for="t in TAB_META" :key="t.value" :value="t.value" :prepend-icon="t.icon" class="justify-start">
            {{ t.label }}
            <VChip v-if="tabBadge(t.value)" size="x-small" color="primary" variant="tonal" label class="ms-1">{{ tabBadge(t.value) }}</VChip>
          </VTab>
        </VTabs>
      </VCol>

      <VCol cols="12" md="9" lg="10">
        <VWindow v-model="tab">
          <!-- General -->
          <VWindowItem value="general">
            <VCard class="pa-5">
              <h3 class="text-subtitle-1 font-weight-bold mb-4">معلومات الحساب</h3>
              <VRow dense>
                <VCol cols="12" md="6"><VTextField v-model="name" label="الاسم" /></VCol>
                <VCol cols="12" md="6"><VTextField v-model="email" label="البريد الإلكتروني" type="email" /></VCol>
                <VCol cols="12" md="6"><VTextField v-model="phone" label="رقم الجوال" /></VCol>
              </VRow>
              <VDivider class="my-4" />
              <h3 class="text-subtitle-1 font-weight-bold mb-3">كلمة المرور</h3>
              <VRow dense>
                <VCol cols="12" md="6"><VTextField label="كلمة المرور الحالية" type="password" /></VCol>
                <VCol cols="12" md="6"><VTextField label="كلمة المرور الجديدة" type="password" /></VCol>
              </VRow>
              <div class="d-flex justify-end mt-3">
                <VBtn color="accent" prepend-icon="mdi-content-save">حفظ التغييرات</VBtn>
              </div>
            </VCard>
          </VWindowItem>

          <!-- صفحتي التعريفية (الإدارة الكاملة داخل الإعدادات) -->
          <VWindowItem value="publicProfile">
            <PublicProfileManagePage embedded />
          </VWindowItem>

          <!-- باقتي (باقة الحساب الموحّدة داخل الإعدادات) -->
          <VWindowItem value="plan">
            <AccountPlanPage embedded />
          </VWindowItem>

          <!-- Preferences -->
          <VWindowItem value="preferences">
            <ThemeCustomizer class="mb-4" max-width="100%" />
            <VCard class="pa-5">
              <h3 class="text-subtitle-1 font-weight-bold mb-4">التفضيلات</h3>
              <div class="mb-4">
                <div class="text-body-2 font-weight-medium mb-2">اللغة</div>
                <VBtnToggle :model-value="locale" mandatory color="primary" variant="outlined" @update:model-value="toggleLocale">
                  <VBtn value="ar">العربية</VBtn>
                  <VBtn value="en">English</VBtn>
                </VBtnToggle>
              </div>
              <div>
                <div class="text-body-2 font-weight-medium mb-2">حجم الخط</div>
                <VBtnToggle v-model="fontSize" mandatory color="primary" variant="outlined">
                  <VBtn value="small">صغير</VBtn>
                  <VBtn value="medium">متوسط</VBtn>
                  <VBtn value="large">كبير</VBtn>
                </VBtnToggle>
              </div>
            </VCard>
          </VWindowItem>

          <!-- Notifications -->
          <VWindowItem value="notifications">
            <VCard class="pa-5">
              <h3 class="text-subtitle-1 font-weight-bold mb-2">أنواع الإشعارات</h3>
              <VSwitch v-model="notif.opportunities" label="فرص جديدة" color="secondary" hide-details />
              <VSwitch v-model="notif.wishes" label="رغبات واردة" color="secondary" hide-details />
              <VSwitch v-model="notif.endorsements" label="توصيات" color="secondary" hide-details />
              <VSwitch v-model="notif.messages" label="رسائل" color="secondary" hide-details />
              <VSwitch v-model="notif.reminders" label="تذكيرات" color="secondary" hide-details />
              <VSwitch v-model="notif.surveys" label="استبيانات" color="secondary" hide-details />
              <VDivider class="my-4" />
              <h3 class="text-subtitle-1 font-weight-bold mb-2">وسيلة الإشعار</h3>
              <VSelect
                v-model="notifChannel"
                :items="[{ value: 'in_app', title: 'داخل المنصة' }, { value: 'email', title: 'بريد إلكتروني' }, { value: 'whatsapp', title: 'واتساب' }]"
                multiple
                chips
              />
            </VCard>
          </VWindowItem>

          <!-- Privacy -->
          <VWindowItem value="privacy">
            <VCard class="pa-5">
              <h3 class="text-subtitle-1 font-weight-bold mb-4">إعدادات الخصوصية</h3>
              <div v-for="(s, i) in privacy" :key="i" class="d-flex align-center justify-space-between flex-wrap ga-2 py-2">
                <span class="text-body-2">{{ s.label }}</span>
                <VBtnToggle v-model="s.value" mandatory density="compact" color="primary" variant="outlined">
                  <VBtn v-for="opt in privacyOptions" :key="opt.value" :value="opt.value" size="small">{{ opt.title }}</VBtn>
                </VBtnToggle>
              </div>
            </VCard>
          </VWindowItem>

          <!-- Integrations -->
          <VWindowItem value="integrations">
            <VCard class="pa-5">
              <h3 class="text-subtitle-1 font-weight-bold mb-4">الحسابات المرتبطة</h3>
              <VRow>
                <VCol v-for="ig in integrations" :key="ig.name" cols="12" sm="4">
                  <VCard variant="outlined" class="pa-4 text-center">
                    <VIcon :icon="ig.icon" size="40" class="mb-2" />
                    <div class="text-body-2 font-weight-bold mb-2">{{ ig.name }}</div>
                    <VBtn :color="ig.connected ? 'error' : 'primary'" :variant="ig.connected ? 'outlined' : 'flat'" size="small" block>
                      {{ ig.connected ? 'فصل' : 'ربط' }}
                    </VBtn>
                  </VCard>
                </VCol>
              </VRow>
            </VCard>
          </VWindowItem>
        </VWindow>
      </VCol>
    </VRow>
  </div>
</template>
