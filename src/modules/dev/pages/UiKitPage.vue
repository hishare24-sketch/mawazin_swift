<script setup lang="ts">
import { useTheme } from 'vuetify'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseBadge from '@/components/ui/BaseBadge.vue'
import BaseDropdown from '@/components/ui/BaseDropdown.vue'
import { ref } from 'vue'
import BaseProgressRing from '@/components/ui/BaseProgressRing.vue'
import BaseProgressBar from '@/components/ui/BaseProgressBar.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseCheckbox from '@/components/ui/BaseCheckbox.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseSlider from '@/components/ui/BaseSlider.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSnackbar from '@/components/ui/BaseSnackbar.vue'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'
import BaseDrawer from '@/components/ui/BaseDrawer.vue'

const demoModal = ref(false)
const demoSnack = ref(false)
const demoDrawer = ref(false)
const demoSwitch = ref(true)
const demoText = ref('')
const demoCheck = ref(true)
const demoMulti = ref<string[]>(['a'])
const demoSelect = ref<string | null>(null)
const demoRange = ref(40)

// معرض مكوّنات الأساس (Tailwind) — أداة تحقّق أثناء ترحيل المرحلة 5.
// نعرضها بجانب VBtn من Vuetify للتأكد من تطابق الثيم والتعايش.
const theme = useTheme()
function toggle() {
  theme.change(theme.global.current.value.dark ? 'lightTheme' : 'darkTheme')
}
</script>

<template>
  <div class="min-h-screen bg-bg p-6 text-content" style="direction: rtl">
    <div class="mx-auto max-w-3xl space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">
          معرض مكوّنات الأساس — Tailwind
        </h1>
        <BaseButton variant="outline" size="sm" @click="toggle">
          تبديل الوضع
        </BaseButton>
      </div>

      <BaseCard>
        <h2 class="mb-3 text-lg font-semibold">
          الأزرار (BaseButton)
        </h2>
        <div class="flex flex-wrap gap-3">
          <BaseButton variant="brand">
            أساسي
          </BaseButton>
          <BaseButton variant="accent">
            CTA
          </BaseButton>
          <BaseButton variant="emerald">
            زمردي
          </BaseButton>
          <BaseButton variant="outline">
            محدّد
          </BaseButton>
          <BaseButton variant="ghost">
            شبح
          </BaseButton>
          <BaseButton variant="brand" loading>
            تحميل
          </BaseButton>
          <BaseButton variant="brand" disabled>
            معطّل
          </BaseButton>
        </div>
        <div class="mt-3 flex items-center gap-3">
          <BaseButton size="sm">
            صغير
          </BaseButton>
          <BaseButton size="md">
            متوسط
          </BaseButton>
          <BaseButton size="lg">
            كبير
          </BaseButton>
        </div>
      </BaseCard>

      <BaseCard>
        <h2 class="mb-3 text-lg font-semibold">
          الرقائق (BaseChip)
        </h2>
        <div class="flex flex-wrap gap-2">
          <BaseChip color="brand">
            أساسي
          </BaseChip>
          <BaseChip color="emerald">
            AI
          </BaseChip>
          <BaseChip color="success">
            نجاح
          </BaseChip>
          <BaseChip color="warning">
            تحذير
          </BaseChip>
          <BaseChip color="error">
            خطأ
          </BaseChip>
          <BaseChip color="info">
            معلومة
          </BaseChip>
          <BaseChip color="neutral">
            محايد
          </BaseChip>
        </div>
      </BaseCard>

      <BaseCard>
        <h2 class="mb-3 text-lg font-semibold">
          الأيقونات + الأفاتار + الشارات (BaseIcon / BaseAvatar / BaseBadge)
        </h2>
        <div class="flex flex-wrap items-center gap-4">
          <BaseIcon name="mdi-briefcase-account" :size="28" class="text-brand" />
          <BaseIcon name="mdi-bell-outline" :size="28" />
          <BaseAvatar color="brand" :size="40">
            أ
          </BaseAvatar>
          <BaseAvatar color="emerald" :size="40" tonal>
            ب
          </BaseAvatar>
          <BaseAvatar color="warning" :size="40" square>
            <BaseIcon name="mdi-account" :size="22" />
          </BaseAvatar>
          <BaseBadge :content="5" color="error">
            <BaseIcon name="mdi-message-outline" :size="28" />
          </BaseBadge>
          <BaseBadge dot color="accent">
            <BaseIcon name="mdi-bell-outline" :size="28" />
          </BaseBadge>
          <BaseBadge :content="3" inline color="brand">
            رسائل
          </BaseBadge>
        </div>
      </BaseCard>

      <BaseCard>
        <h2 class="mb-3 text-lg font-semibold">
          حقول النماذج (BaseInput / BaseCheckbox)
        </h2>
        <div class="space-y-3">
          <BaseInput v-model="demoText" label="الاسم" prefix-icon="mdi-account-outline" placeholder="اكتب اسمك" />
          <BaseInput label="بريد بخطأ" prefix-icon="mdi-email-outline" error="البريد الإلكتروني غير صحيح" />
          <div class="flex flex-wrap items-center gap-4">
            <BaseCheckbox v-model="demoCheck" label="تذكّرني" />
            <BaseCheckbox v-model="demoMulti" value="a" label="خيار أ" />
            <BaseCheckbox v-model="demoMulti" value="b" label="خيار ب" />
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <BaseSelect
              v-model="demoSelect"
              :items="[{ value: 'a', title: 'خيار أ' }, { value: 'b', title: 'خيار ب' }, { value: 'c', title: 'خيار ج' }]"
              placeholder="اختر..."
              clearable
            />
            <div class="flex items-center gap-2">
              <span class="text-muted text-xs whitespace-nowrap">القيمة {{ demoRange }}</span>
              <BaseSlider v-model="demoRange" :min="0" :max="100" :step="5" class="flex-1" />
            </div>
          </div>
          <p class="text-muted text-xs">نص: «{{ demoText }}» · مفرد: {{ demoCheck }} · متعدّد: [{{ demoMulti.join(', ') }}] · اختيار: {{ demoSelect ?? '—' }}</p>
        </div>
      </BaseCard>

      <BaseCard>
        <h2 class="mb-3 text-lg font-semibold">
          مؤشّرات التقدّم (BaseProgressRing / BaseProgressBar)
        </h2>
        <div class="flex flex-wrap items-center gap-6">
          <BaseProgressRing :value="77" color="success">
            <span class="text-lg font-bold">77</span>
          </BaseProgressRing>
          <BaseProgressRing :value="45" color="warning">
            <span class="text-lg font-bold">45</span>
          </BaseProgressRing>
          <BaseProgressRing :value="90" :size="60" :width="6" color="primary">
            <span class="text-sm font-bold">90</span>
          </BaseProgressRing>
          <div class="flex-1 space-y-3" style="min-width: 200px">
            <BaseProgressBar :value="94" color="success" />
            <BaseProgressBar :value="72" color="secondary" />
            <BaseProgressBar :value="40" color="warning" />
          </div>
        </div>
      </BaseCard>

      <BaseCard>
        <h2 class="mb-3 text-lg font-semibold">
          النافذة والإشعار (BaseModal / BaseSnackbar)
        </h2>
        <div class="flex flex-wrap gap-3">
          <BaseButton variant="brand" @click="demoModal = true">افتح نافذة</BaseButton>
          <BaseButton variant="emerald" @click="demoSnack = true">أظهر إشعارًا</BaseButton>
        </div>
        <BaseModal v-model="demoModal" title="نافذة تجريبية">
          <p class="text-sm">تُغلق بالنقر على الخلفية أو Escape أو زر الإغلاق.</p>
          <template #actions>
            <BaseButton variant="ghost" @click="demoModal = false">إلغاء</BaseButton>
            <BaseButton variant="brand" @click="demoModal = false">تم</BaseButton>
          </template>
        </BaseModal>
        <BaseSnackbar v-model="demoSnack" color="success" :timeout="3000">تمّ الحفظ بنجاح!</BaseSnackbar>
      </BaseCard>

      <BaseCard>
        <h2 class="mb-3 text-lg font-semibold">
          المفتاح والدرج (BaseSwitch / BaseDrawer)
        </h2>
        <div class="flex flex-wrap items-center gap-4">
          <BaseSwitch v-model="demoSwitch" label="تفعيل" />
          <span class="text-muted text-xs">الحالة: {{ demoSwitch ? 'مُفعّل' : 'مُطفأ' }}</span>
          <BaseButton variant="outline" size="sm" @click="demoDrawer = true">افتح الدرج الجانبي</BaseButton>
        </div>
        <BaseDrawer v-model="demoDrawer" :width="300">
          <div class="p-4">
            <h3 class="mb-2 font-bold">درج جانبي</h3>
            <p class="text-sm text-muted">يظهر من الجهة المنطقية، ويُغلق بالخلفية أو Escape.</p>
            <BaseButton variant="brand" size="sm" class="mt-3" @click="demoDrawer = false">إغلاق</BaseButton>
          </div>
        </BaseDrawer>
      </BaseCard>

      <BaseCard>
        <h2 class="mb-3 text-lg font-semibold">
          القائمة المنسدلة (BaseDropdown)
        </h2>
        <BaseDropdown align="start">
          <template #trigger="{ toggle }">
            <BaseButton variant="outline" size="sm" @click="toggle">
              افتح القائمة
            </BaseButton>
          </template>
          <template #default="{ close }">
            <div class="min-w-[200px] py-1">
              <button class="menu-row" @click="close">
                <BaseIcon name="mdi-account-outline" :size="20" />
                <span>الملف الشخصي</span>
              </button>
              <button class="menu-row" @click="close">
                <BaseIcon name="mdi-cog-outline" :size="20" />
                <span>الإعدادات</span>
              </button>
              <div class="my-1 border-t border-ui" />
              <button class="menu-row" style="color: rgb(var(--v-theme-error))" @click="close">
                <BaseIcon name="mdi-logout" :size="20" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </template>
        </BaseDropdown>
        <p class="text-muted mt-2 text-xs">
          تُغلق بالنقر خارجها أو Escape.
        </p>
      </BaseCard>

      <BaseCard>
        <h2 class="mb-3 text-lg font-semibold">
          مقارنة مع Vuetify (تطابق الثيم + التعايش)
        </h2>
        <div class="flex flex-wrap items-center gap-3">
          <BaseButton variant="brand">
            Tailwind
          </BaseButton>
          <VBtn color="primary">
            Vuetify
          </VBtn>
          <span class="text-muted text-sm">يجب أن يتطابق اللونان مع الثيم الحالي</span>
        </div>
      </BaseCard>
    </div>
  </div>
</template>
