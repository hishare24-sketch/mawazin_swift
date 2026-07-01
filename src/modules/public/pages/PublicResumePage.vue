<script setup lang="ts">
import { useRouter } from 'vue-router'
import PublicTopBar from '@/components/shared/PublicTopBar.vue'

const router = useRouter()

const resume = {
  name: 'أحمد المنصور',
  title: 'مطوّر واجهات أمامية',
  location: 'الرياض',
  email: 'ahmed@example.com',
  summary: 'مطوّر واجهات أمامية بخبرة 5 سنوات في بناء تطبيقات ويب حديثة وعالية الأداء باستخدام Vue.js و TypeScript. شغوف بتجربة المستخدم والحلول القابلة للتوسّع.',
  skills: ['Vue.js', 'TypeScript', 'Vuetify', 'Node.js', 'REST API', 'UI/UX'],
  experiences: [
    { title: 'مطوّر واجهات أمامية أول', company: 'شركة تقنية المستقبل', period: '2022 - الآن' },
    { title: 'مطوّر ويب', company: 'استوديو رؤية', period: '2019 - 2022' },
  ],
  education: [{ degree: 'بكالوريوس علوم حاسب', school: 'جامعة الملك سعود', year: '2019' }],
}
</script>

<template>
  <div class="bg-background" style="min-height: 100vh">
    <PublicTopBar />
    <VContainer class="py-8" style="max-width: 800px">
      <VCard class="pa-0 overflow-hidden">
        <!-- Header -->
        <div class="brand-gradient text-white pa-6">
          <div class="d-flex align-center ga-4">
            <VAvatar color="rgba(255,255,255,0.2)" size="80"><span class="text-h4 font-weight-bold">أ</span></VAvatar>
            <div>
              <h1 class="text-h4 font-weight-bold">{{ resume.name }}</h1>
              <div class="text-h6 font-weight-regular opacity-90">{{ resume.title }}</div>
              <div class="text-body-2 opacity-80 mt-1">
                <VIcon icon="mdi-map-marker-outline" size="14" /> {{ resume.location }} ·
                <VIcon icon="mdi-email-outline" size="14" /> {{ resume.email }}
              </div>
            </div>
          </div>
        </div>

        <div class="pa-6">
          <!-- Summary -->
          <div class="text-caption font-weight-bold text-primary mb-1">الملخص المهني</div>
          <p class="text-body-2 text-medium-emphasis mb-5">{{ resume.summary }}</p>

          <!-- Skills -->
          <div class="text-caption font-weight-bold text-primary mb-2">المهارات</div>
          <div class="d-flex flex-wrap ga-2 mb-5">
            <VChip v-for="s in resume.skills" :key="s" color="secondary" variant="tonal" size="small">{{ s }}</VChip>
          </div>

          <!-- Experience -->
          <div class="text-caption font-weight-bold text-primary mb-2">الخبرات العملية</div>
          <VTimeline side="end" density="compact" align="start" class="mb-4">
            <VTimelineItem v-for="exp in resume.experiences" :key="exp.title" dot-color="primary" size="small">
              <div class="text-body-2 font-weight-bold">{{ exp.title }}</div>
              <div class="text-caption text-secondary">{{ exp.company }} · {{ exp.period }}</div>
            </VTimelineItem>
          </VTimeline>

          <!-- Education -->
          <div class="text-caption font-weight-bold text-primary mb-2">التعليم</div>
          <div v-for="ed in resume.education" :key="ed.degree" class="text-body-2">
            <span class="font-weight-bold">{{ ed.degree }}</span> — {{ ed.school }} ({{ ed.year }})
          </div>
        </div>
      </VCard>

      <!-- Actions -->
      <div class="d-flex flex-wrap justify-center ga-3 mt-5">
        <VBtn color="primary" variant="outlined" prepend-icon="mdi-message-outline" @click="router.push({ name: 'register' })">
          التواصل مع صاحب السيرة
        </VBtn>
        <VBtn color="accent" prepend-icon="mdi-download">تحميل PDF</VBtn>
      </div>
    </VContainer>
  </div>
</template>
