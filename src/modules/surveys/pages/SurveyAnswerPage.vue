<script setup lang="ts">
import { computed, ref } from 'vue'

// Public respondent view (inside/outside platform via link)
type Stage = 'welcome' | 'questions' | 'thanks'

interface SurveyQuestion {
  id: number
  text: string
  type: 'single' | 'scale' | 'text'
  options?: string[]
}

const survey = {
  title: 'استبيان رضا المرشحين',
  sender: 'شركة تقنية المستقبل',
  estimated: '3 دقائق',
  questions: [
    { id: 1, text: 'كيف تقيّم سرعة الرد على طلبك؟', type: 'scale' },
    { id: 2, text: 'هل كانت عملية التوظيف واضحة؟', type: 'single', options: ['نعم، واضحة تماماً', 'واضحة نوعاً ما', 'غير واضحة'] },
    { id: 3, text: 'ما الذي يمكن تحسينه في تجربتك؟', type: 'text' },
  ] as SurveyQuestion[],
}

const stage = ref<Stage>('welcome')
const currentIndex = ref(0)
const answers = ref<Record<number, string | number>>({})

const current = computed(() => survey.questions[currentIndex.value])
const progress = computed(() => ((currentIndex.value + 1) / survey.questions.length) * 100)
const isLast = computed(() => currentIndex.value === survey.questions.length - 1)
const hasAnswer = computed(() => answers.value[current.value.id] !== undefined && answers.value[current.value.id] !== '')

function setAnswer(val: string | number) {
  answers.value[current.value.id] = val
}
function next() {
  if (isLast.value)
    stage.value = 'thanks'
  else currentIndex.value++
}
function prev() {
  if (currentIndex.value > 0)
    currentIndex.value--
}
</script>

<template>
  <VContainer class="fill-height py-10" style="min-height: 100vh">
    <VRow justify="center" class="w-100">
      <VCol cols="12" sm="10" md="7" lg="6">
        <!-- Brand -->
        <div class="text-center mb-6">
          <VAvatar color="primary" size="56" rounded="lg" class="mb-2">
            <VIcon icon="mdi-poll" color="white" size="30" />
          </VAvatar>
          <div class="text-h6 font-weight-bold">منظومة التوظيف الذكية</div>
        </div>

        <VCard class="pa-6">
          <!-- Welcome -->
          <div v-if="stage === 'welcome'" class="text-center">
            <h1 class="text-h5 font-weight-bold mb-2">{{ survey.title }}</h1>
            <p class="text-body-2 text-medium-emphasis mb-1">من: {{ survey.sender }}</p>
            <VChip prepend-icon="mdi-clock-outline" size="small" class="mb-5">
              الوقت المقدّر: {{ survey.estimated }}
            </VChip>
            <p class="text-body-2 text-medium-emphasis mb-6">
              إجاباتك تساعدنا على تحسين تجربة التوظيف. شكراً لوقتك!
            </p>
            <VBtn color="accent" size="large" block prepend-icon="mdi-play" @click="stage = 'questions'">
              ابدأ
            </VBtn>
          </div>

          <!-- Questions -->
          <div v-else-if="stage === 'questions'">
            <div class="d-flex justify-space-between text-caption mb-1">
              <span class="text-medium-emphasis">السؤال {{ currentIndex + 1 }} من {{ survey.questions.length }}</span>
            </div>
            <VProgressLinear :model-value="progress" color="accent" height="6" rounded class="mb-5" />

            <div class="text-h6 font-weight-bold mb-4">{{ current.text }}</div>

            <!-- Scale -->
            <div v-if="current.type === 'scale'" class="d-flex justify-space-between ga-2 mb-2">
              <VBtn
                v-for="n in 5"
                :key="n"
                :variant="answers[current.id] === n ? 'flat' : 'outlined'"
                :color="answers[current.id] === n ? 'primary' : undefined"
                size="large"
                class="flex-grow-1"
                @click="setAnswer(n)"
              >
                {{ n }}
              </VBtn>
            </div>

            <!-- Single choice -->
            <div v-else-if="current.type === 'single'" class="d-flex flex-column ga-2">
              <VCard
                v-for="opt in current.options"
                :key="opt"
                :variant="answers[current.id] === opt ? 'flat' : 'outlined'"
                :color="answers[current.id] === opt ? 'primary' : undefined"
                class="pa-3 cursor-pointer"
                @click="setAnswer(opt)"
              >
                {{ opt }}
              </VCard>
            </div>

            <!-- Text -->
            <VTextarea
              v-else
              :model-value="String(answers[current.id] ?? '')"
              rows="4"
              placeholder="اكتب إجابتك هنا..."
              @update:model-value="setAnswer($event)"
            />

            <div class="d-flex justify-space-between mt-5">
              <VBtn variant="outlined" :disabled="currentIndex === 0" prepend-icon="mdi-arrow-right" @click="prev">
                السابق
              </VBtn>
              <VBtn color="accent" :disabled="!hasAnswer" :append-icon="isLast ? 'mdi-check' : 'mdi-arrow-left'" @click="next">
                {{ isLast ? 'إرسال' : 'التالي' }}
              </VBtn>
            </div>
          </div>

          <!-- Thanks -->
          <div v-else class="text-center py-6">
            <VAvatar color="success" variant="tonal" size="80" class="mb-3">
              <VIcon icon="mdi-check-circle-outline" size="48" />
            </VAvatar>
            <h2 class="text-h5 font-weight-bold mb-2">شكراً لك!</h2>
            <p class="text-body-2 text-medium-emphasis">
              تم تسجيل إجاباتك بنجاح. نقدّر مساهمتك في تحسين المنصة.
            </p>
          </div>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>
