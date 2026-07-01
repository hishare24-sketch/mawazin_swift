<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTheme } from 'vuetify'
import PageHeader from '@/components/shared/PageHeader.vue'
import { useAuthStore } from '@/stores/AuthStore'

const { locale } = useI18n()
const theme = useTheme()
const authStore = useAuthStore()

const tab = ref('general')

// General
const name = ref(authStore.authUser?.name ?? '')
const email = ref(authStore.authUser?.email ?? '')
const phone = ref(authStore.authUser?.phone ?? '')

// Preferences
const appearance = ref(theme.global.current.value.dark ? 'dark' : 'light')
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

function applyAppearance(val: string) {
  appearance.value = val
  theme.global.name.value = val === 'dark' ? 'darkTheme' : 'lightTheme'
}
function toggleLocale(val: string) {
  locale.value = val as 'ar' | 'en'
}
</script>

<template>
  <div>
    <PageHeader title="الإعدادات" subtitle="خصّص حسابك وتفضيلاتك" icon="mdi-cog-outline" />

    <VTabs v-model="tab" color="primary" class="mb-4" show-arrows>
      <VTab value="general" prepend-icon="mdi-account-outline">الحساب</VTab>
      <VTab value="preferences" prepend-icon="mdi-tune">التفضيلات</VTab>
      <VTab value="notifications" prepend-icon="mdi-bell-outline">الإشعارات</VTab>
      <VTab value="privacy" prepend-icon="mdi-shield-lock-outline">الخصوصية</VTab>
      <VTab value="integrations" prepend-icon="mdi-connection">التكامل</VTab>
      <VTab value="subscription" prepend-icon="mdi-crown-outline">الاشتراك</VTab>
    </VTabs>

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

      <!-- Preferences -->
      <VWindowItem value="preferences">
        <VCard class="pa-5">
          <h3 class="text-subtitle-1 font-weight-bold mb-4">التفضيلات</h3>
          <div class="mb-4">
            <div class="text-body-2 font-weight-medium mb-2">اللغة</div>
            <VBtnToggle :model-value="locale" mandatory color="primary" variant="outlined" @update:model-value="toggleLocale">
              <VBtn value="ar">العربية</VBtn>
              <VBtn value="en">English</VBtn>
            </VBtnToggle>
          </div>
          <div class="mb-4">
            <div class="text-body-2 font-weight-medium mb-2">المظهر</div>
            <VBtnToggle :model-value="appearance" mandatory color="primary" variant="outlined" @update:model-value="applyAppearance">
              <VBtn value="light" prepend-icon="mdi-weather-sunny">فاتح</VBtn>
              <VBtn value="dark" prepend-icon="mdi-weather-night">داكن</VBtn>
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

      <!-- Subscription -->
      <VWindowItem value="subscription">
        <VCard class="pa-5">
          <h3 class="text-subtitle-1 font-weight-bold mb-4">الباقة والاشتراك</h3>
          <VCard class="brand-gradient pa-5 mb-4" theme="darkTheme">
            <div class="d-flex align-center justify-space-between flex-wrap ga-3">
              <div>
                <div class="text-caption opacity-80">باقتك الحالية</div>
                <div class="text-h5 font-weight-bold">الباقة الاحترافية</div>
                <div class="text-body-2 opacity-80">تتجدد في 2026-08-01</div>
              </div>
              <VBtn color="accent">ترقية الباقة</VBtn>
            </div>
          </VCard>
          <div class="text-body-2 font-weight-bold mb-2">طرق الدفع</div>
          <VCard variant="outlined" class="pa-3 d-flex align-center ga-3">
            <VIcon icon="mdi-credit-card-outline" />
            <span class="text-body-2">•••• •••• •••• 4242</span>
            <VSpacer />
            <VBtn variant="text" size="small">تعديل</VBtn>
          </VCard>
        </VCard>
      </VWindowItem>
    </VWindow>
  </div>
</template>
