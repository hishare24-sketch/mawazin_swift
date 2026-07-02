<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import StatCard from '@/components/shared/StatCard.vue'
import { useExpertRolesStore } from '@/stores/ExpertRolesStore'

// لوحة المرشد المهني — علاقات طويلة الأمد لا جلسات مفردة
const store = useExpertRolesStore()
const snackbar = ref('')

const programDialog = ref(false)
const newProgram = ref({ name: '', duration: 'شهري', price: 400, seats: 8 })
function saveProgram() {
  if (!newProgram.value.name.trim())
    return
  store.addProgram({ ...newProgram.value, name: newProgram.value.name.trim() })
  programDialog.value = false
  snackbar.value = 'أُنشئ البرنامج وأصبح متاحًا للاشتراك'
}

function logSession(clientId: number, name: string) {
  store.bumpClientProgress(clientId)
  snackbar.value = `سُجّلت جلسة إرشاد مع ${name} (+10% تقدم)`
}
</script>

<template>
  <div>
    <PageHeader title="لوحة المرشد المهني" subtitle="رافق عملاءك في رحلات مهنية طويلة الأمد" icon="mdi-compass-outline" />

    <VRow class="mb-2">
      <VCol cols="6" md="4"><StatCard title="عملاء نشطون" :value="store.coachStats.clients" icon="mdi-account-heart-outline" color="primary" /></VCol>
      <VCol cols="6" md="4"><StatCard title="دخل شهري متكرر" :value="`${store.coachStats.monthlyRecurring} ر.س`" icon="mdi-cash-sync" color="success" /></VCol>
      <VCol cols="12" md="4"><StatCard title="متوسط تقدم العملاء" :value="`${store.coachStats.avgProgress}%`" icon="mdi-trending-up" color="secondary" /></VCol>
    </VRow>

    <VRow>
      <!-- عملائي -->
      <VCol cols="12" md="7">
        <VCard class="pa-5">
          <h2 class="text-subtitle-1 font-weight-bold mb-3">رحلات عملائي</h2>
          <div v-for="c in store.state.coachClients" :key="c.id" class="mb-4">
            <div class="d-flex align-center ga-3 mb-1">
              <VAvatar color="primary" variant="tonal"><span class="font-weight-bold">{{ c.initial }}</span></VAvatar>
              <div class="flex-grow-1">
                <div class="text-body-2 font-weight-bold">{{ c.name }}</div>
                <div class="text-caption text-medium-emphasis">{{ c.goal }}</div>
              </div>
              <VBtn size="x-small" color="secondary" variant="tonal" prepend-icon="mdi-video-outline" @click="logSession(c.id, c.name)">جلسة الآن</VBtn>
            </div>
            <div class="d-flex align-center ga-2">
              <VProgressLinear :model-value="c.progress" color="primary" height="8" rounded class="flex-grow-1" />
              <span class="text-caption font-weight-bold">{{ c.progress }}%</span>
            </div>
            <div class="text-caption text-medium-emphasis mt-1">
              <VIcon icon="mdi-calendar-clock-outline" size="12" /> الجلسة القادمة: {{ c.nextSession }} · {{ c.program }}
            </div>
          </div>
        </VCard>
      </VCol>

      <!-- برامجي -->
      <VCol cols="12" md="5">
        <VCard class="pa-5">
          <div class="d-flex align-center justify-space-between mb-3">
            <h2 class="text-subtitle-1 font-weight-bold">برامج الاشتراك</h2>
            <VBtn size="small" color="accent" variant="tonal" prepend-icon="mdi-plus" @click="programDialog = true">برنامج</VBtn>
          </div>
          <VCard v-for="p in store.state.coachPrograms" :key="p.id" variant="outlined" class="pa-3 mb-2">
            <div class="text-body-2 font-weight-bold">{{ p.name }}</div>
            <div class="text-caption text-medium-emphasis mb-1">{{ p.duration }} · {{ p.price }} ر.س/شهر</div>
            <div class="d-flex align-center ga-2">
              <VProgressLinear :model-value="(p.enrolled / p.seats) * 100" color="secondary" height="6" rounded class="flex-grow-1" />
              <span class="text-caption">{{ p.enrolled }}/{{ p.seats }}</span>
            </div>
          </VCard>
          <p class="text-caption text-medium-emphasis mt-2">نموذج العمل: اشتراك شهري يخلق علاقة وولاءً طويل الأمد.</p>
        </VCard>
      </VCol>
    </VRow>

    <VDialog v-model="programDialog" max-width="420">
      <VCard class="pa-2">
        <VCardTitle>برنامج إرشادي جديد</VCardTitle>
        <VCardText>
          <VTextField v-model="newProgram.name" label="اسم البرنامج" class="mb-3" />
          <VSelect v-model="newProgram.duration" :items="['شهري', 'ربع سنوي', 'نصف سنوي']" label="المدة" class="mb-3" />
          <VTextField v-model.number="newProgram.price" type="number" label="السعر الشهري (ر.س)" class="mb-3" />
          <VTextField v-model.number="newProgram.seats" type="number" label="عدد المقاعد" />
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="programDialog = false">إلغاء</VBtn>
          <VBtn color="accent" variant="flat" :disabled="!newProgram.name.trim()" @click="saveProgram">إنشاء</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar :model-value="!!snackbar" color="success" location="top" timeout="2500" @update:model-value="snackbar = ''">
      {{ snackbar }}
    </VSnackbar>
  </div>
</template>
