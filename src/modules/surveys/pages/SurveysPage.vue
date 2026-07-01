<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'

const router = useRouter()

const surveyTypes = [
  { id: 1, name: 'تقييم وظيفي', desc: 'تقييم أداء المرشح من مديره السابق', icon: 'mdi-star-check-outline', color: 'primary' },
  { id: 2, name: 'توصية مهنية', desc: 'جمع توصيات من زملاء العمل', icon: 'mdi-account-star-outline', color: 'secondary' },
  { id: 3, name: 'رضا المرشح', desc: 'انطباع المرشح عن عملية التوظيف', icon: 'mdi-emoticon-happy-outline', color: 'success' },
  { id: 4, name: 'رضا جهة التوظيف', desc: 'تقييم جودة الترشيحات وسرعة الإنجاز', icon: 'mdi-domain', color: 'info' },
  { id: 5, name: 'تحليل شخصية', desc: 'فهم السمات الشخصية للباحث', icon: 'mdi-head-cog-outline', color: 'accent' },
  { id: 6, name: 'احتياجات السوق', desc: 'مهارات مطلوبة، رواتب، اتجاهات', icon: 'mdi-chart-line', color: 'warning' },
  { id: 7, name: 'جودة الخدمة', desc: 'تقييم تجربة المستخدم مع المنصة', icon: 'mdi-thumb-up-outline', color: 'primary' },
  { id: 8, name: 'التدريب والتطوير', desc: 'احتياجات المستخدمين من دورات', icon: 'mdi-school-outline', color: 'secondary' },
]

const activeSurveys = [
  { name: 'رضا المرشحين - يونيو', type: 'رضا المرشح', responses: 47, completion: 82, avgTime: '3:12' },
  { name: 'احتياجات سوق التقنية', type: 'احتياجات السوق', responses: 128, completion: 64, avgTime: '5:40' },
]

const dialog = ref(false)
const selectedType = ref<string | null>(null)

function createSurvey(name: string) {
  selectedType.value = name
  dialog.value = true
}
</script>

<template>
  <div>
    <PageHeader
      title="الاستبيانات التفاعلية"
      subtitle="ثمانية أنواع ذكية مدعومة بالذكاء الاصطناعي"
      icon="mdi-poll"
    />

    <h3 class="text-h6 font-weight-bold mb-3">أنشئ استبياناً جديداً</h3>
    <VRow class="mb-5">
      <VCol v-for="s in surveyTypes" :key="s.id" cols="12" sm="6" md="3">
        <VCard class="pa-4 text-center cursor-pointer h-100" @click="createSurvey(s.name)">
          <VAvatar :color="s.color" variant="tonal" size="52" rounded="lg" class="mb-2">
            <VIcon :icon="s.icon" size="28" />
          </VAvatar>
          <div class="text-subtitle-2 font-weight-bold">{{ s.name }}</div>
          <div class="text-caption text-medium-emphasis">{{ s.desc }}</div>
        </VCard>
      </VCol>
    </VRow>

    <h3 class="text-h6 font-weight-bold mb-3">الاستبيانات النشطة</h3>
    <VCard>
      <VTable>
        <thead>
          <tr>
            <th class="text-start">الاستبيان</th>
            <th class="text-start">النوع</th>
            <th class="text-start">المستجيبون</th>
            <th class="text-start">نسبة الإكمال</th>
            <th class="text-start">متوسط الوقت</th>
            <th class="text-start">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in activeSurveys" :key="s.name">
            <td class="font-weight-bold">{{ s.name }}</td>
            <td>{{ s.type }}</td>
            <td>{{ s.responses }}</td>
            <td style="min-width: 140px">
              <VProgressLinear :model-value="s.completion" color="success" height="16" rounded>
                <span class="text-caption text-white">{{ s.completion }}%</span>
              </VProgressLinear>
            </td>
            <td>{{ s.avgTime }}</td>
            <td>
              <VBtn variant="text" size="small" color="primary" prepend-icon="mdi-chart-box-outline" @click="router.push({ name: 'survey-analysis', params: { id: 1 } })">
                التحليل
              </VBtn>
              <VBtn variant="text" size="small" prepend-icon="mdi-eye-outline" @click="router.push({ name: 'survey-answer', params: { token: 'demo' } })">
                معاينة
              </VBtn>
            </td>
          </tr>
        </tbody>
      </VTable>
    </VCard>

    <!-- Create dialog -->
    <VDialog v-model="dialog" max-width="600" persistent>
      <VCard class="pa-2">
        <VCardTitle class="d-flex justify-space-between align-center">
          <span>إنشاء استبيان: {{ selectedType }}</span>
          <VBtn icon="mdi-close" variant="text" size="small" @click="dialog = false" />
        </VCardTitle>
        <VCardText>
          <VTextField label="عنوان الاستبيان" class="mb-2" />
          <VTextarea label="وصف مختصر" rows="2" class="mb-2" />
          <VSelect
            label="الجمهور المستهدف"
            :items="['داخل المنصة', 'بريد إلكتروني', 'واتساب', 'رابط عام']"
            class="mb-2"
          />
          <VBtn color="secondary" variant="tonal" block prepend-icon="mdi-robot-happy-outline" class="mb-2">
            توليد الأسئلة تلقائياً بالذكاء الاصطناعي
          </VBtn>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="dialog = false">إلغاء</VBtn>
          <VBtn color="accent" @click="dialog = false">إنشاء وإرسال</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
