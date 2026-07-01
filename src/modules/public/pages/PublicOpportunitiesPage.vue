<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PublicTopBar from '@/components/shared/PublicTopBar.vue'
import { mockOpportunities } from '@/modules/opportunities/services/mockOpportunities'
import { EMPLOYMENT_TYPE_LABELS } from '@/modules/opportunities/interfaces/Opportunity'

const router = useRouter()
const search = ref('')

const filtered = computed(() => mockOpportunities.filter(o =>
  !search.value || o.title.includes(search.value) || o.company.includes(search.value),
))
</script>

<template>
  <div class="bg-background" style="min-height: 100vh">
    <PublicTopBar />
    <VContainer class="py-8">
      <div class="text-center mb-6">
        <h1 class="text-h4 font-weight-bold mb-2">استكشف الفرص</h1>
        <p class="text-body-1 text-medium-emphasis">تصفّح عيّنة من الفرص المتاحة — سجّل لمشاهدة التفاصيل الكاملة والتقديم</p>
      </div>

      <VCard class="pa-4 mb-5 mx-auto" max-width="640">
        <VTextField
          v-model="search"
          placeholder="ابحث عن مسمى وظيفي أو شركة..."
          prepend-inner-icon="mdi-magnify"
          hide-details
          clearable
        />
      </VCard>

      <VRow>
        <VCol v-for="opp in filtered" :key="opp.id" cols="12" sm="6" md="4">
          <VCard class="pa-4 d-flex flex-column" height="100%">
            <div class="d-flex align-center ga-3 mb-2">
              <VAvatar color="primary" variant="tonal" rounded="lg"><VIcon icon="mdi-domain" /></VAvatar>
              <div>
                <div class="text-subtitle-1 font-weight-bold">{{ opp.title }}</div>
                <div class="text-body-2 text-medium-emphasis">{{ opp.company }}</div>
              </div>
            </div>
            <div class="d-flex flex-wrap ga-2 my-2">
              <VChip size="small" variant="tonal" prepend-icon="mdi-map-marker-outline">{{ opp.location }}</VChip>
              <VChip size="small" variant="tonal" prepend-icon="mdi-briefcase-outline">{{ EMPLOYMENT_TYPE_LABELS[opp.type] }}</VChip>
            </div>
            <VDivider class="my-3" />
            <div class="d-flex align-center justify-space-between mt-auto">
              <VChip color="secondary" variant="tonal" size="small" prepend-icon="mdi-lock-outline">التفاصيل بعد التسجيل</VChip>
              <VBtn color="accent" size="small" @click="router.push({ name: 'register' })">سجّل للتقديم</VBtn>
            </div>
          </VCard>
        </VCol>
      </VRow>

      <VCard class="brand-gradient text-white pa-8 text-center mt-8" theme="darkTheme">
        <h2 class="text-h5 font-weight-bold mb-2">شاهد كل الفرص وتقدّم بنقرة</h2>
        <p class="text-body-2 opacity-90 mb-4">أنشئ حساباً مجانياً واحصل على ترشيحات ذكية تناسب مهاراتك</p>
        <VBtn color="accent" size="large" @click="router.push({ name: 'register' })">إنشاء حساب مجاني</VBtn>
      </VCard>
    </VContainer>
  </div>
</template>
