<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()

const features = [
  { icon: 'mdi-briefcase-search-outline', title: 'مطابقة ذكية', desc: 'نرشّح لك الفرص الأنسب بنسب تطابق مبنية على الذكاء الاصطناعي.' },
  { icon: 'mdi-file-account-outline', title: 'منشئ السيرة الذكي', desc: 'سير ذاتية احترافية بخمسة قوالب ولغات متعددة في دقائق.' },
  { icon: 'mdi-account-star-outline', title: 'توصيات موثّقة', desc: 'تزكيات من زملاء ومدراء سابقين كأصول رقمية موثوقة.' },
  { icon: 'mdi-hand-heart-outline', title: 'التوظيف المزدوج', desc: 'اعرض نفسك، ودع الجهات تُبدي رغبتها فيك.' },
  { icon: 'mdi-clipboard-check-outline', title: 'مركز التقييم', desc: 'اختبارات مهارية وشخصية وألعاب تفاعلية تثبت قدراتك.' },
  { icon: 'mdi-robot-happy-outline', title: 'مساعد ذكي', desc: 'مرشد مهني يرافقك في كل خطوة من رحلتك.' },
]

const stats = [
  { value: '+12K', label: 'باحث عن عمل' },
  { value: '+3K', label: 'فرصة منشورة' },
  { value: '+8K', label: 'توصية موثّقة' },
  { value: '82%', label: 'دقة المطابقة' },
]
</script>

<template>
  <div class="bg-background">
    <!-- Top bar -->
    <VAppBar flat color="surface" height="70" class="px-4">
      <div class="d-flex align-center ga-2">
        <VAvatar color="primary" size="40" rounded="lg">
          <VIcon icon="mdi-briefcase-account" color="white" />
        </VAvatar>
        <span class="text-h6 font-weight-bold d-none d-sm-block">{{ t('app.name') }}</span>
      </div>
      <VSpacer />
      <VBtn variant="text" class="d-none d-sm-inline-flex" @click="router.push({ name: 'explore-opportunities' })">استكشف الفرص</VBtn>
      <VBtn variant="text" @click="router.push({ name: 'login' })">{{ t('auth.login') }}</VBtn>
      <VBtn color="accent" class="ms-2" @click="router.push({ name: 'register' })">{{ t('auth.register') }}</VBtn>
    </VAppBar>

    <!-- Hero -->
    <section class="brand-gradient text-white py-16 px-4">
      <VContainer>
        <VRow align="center">
          <VCol cols="12" md="7">
            <h1 class="text-h3 text-md-h2 font-weight-bold mb-4" style="line-height: 1.3">
              رحلة حياة مهنية ذكية، مستدامة، ومتطوّرة
            </h1>
            <p class="text-h6 font-weight-regular opacity-90 mb-6" style="max-width: 560px">
              منصة توظيف متعددة الأبعاد تجمع الباحثين والجهات والموصين والمدربين في نظام بيئي واحد مدعوم بالذكاء الاصطناعي.
            </p>
            <div class="d-flex flex-wrap ga-3">
              <VBtn color="accent" size="x-large" prepend-icon="mdi-rocket-launch-outline" @click="router.push({ name: 'register' })">
                ابدأ الآن مجاناً
              </VBtn>
              <VBtn variant="outlined" color="white" size="x-large" @click="router.push({ name: 'explore-opportunities' })">
                استكشف الفرص
              </VBtn>
            </div>
          </VCol>
          <VCol cols="12" md="5" class="d-none d-md-flex justify-center">
            <VIcon icon="mdi-account-network-outline" size="260" class="opacity-25" />
          </VCol>
        </VRow>
      </VContainer>
    </section>

    <!-- Stats -->
    <VContainer class="py-10">
      <VRow>
        <VCol v-for="s in stats" :key="s.label" cols="6" md="3" class="text-center">
          <div class="text-h4 font-weight-bold text-primary">{{ s.value }}</div>
          <div class="text-body-2 text-medium-emphasis">{{ s.label }}</div>
        </VCol>
      </VRow>
    </VContainer>

    <!-- Features -->
    <VContainer class="py-10">
      <div class="text-center mb-10">
        <h2 class="text-h4 font-weight-bold mb-2">لماذا منظومتنا؟</h2>
        <p class="text-body-1 text-medium-emphasis">قيمة حقيقية لكل طرف، تستمر معك حتى بعد التوظيف</p>
      </div>
      <VRow>
        <VCol v-for="f in features" :key="f.title" cols="12" sm="6" md="4">
          <VCard class="pa-6 h-100" hover>
            <VAvatar color="secondary" variant="tonal" size="56" rounded="lg" class="mb-4">
              <VIcon :icon="f.icon" size="30" />
            </VAvatar>
            <h3 class="text-h6 font-weight-bold mb-2">{{ f.title }}</h3>
            <p class="text-body-2 text-medium-emphasis mb-0">{{ f.desc }}</p>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>

    <!-- CTA -->
    <VContainer class="py-12">
      <VCard class="brand-gradient text-white pa-10 text-center">
        <h2 class="text-h4 font-weight-bold mb-3">جاهز لبدء رحلتك المهنية؟</h2>
        <p class="text-body-1 opacity-90 mb-6">انضم لآلاف الباحثين والجهات على المنصة اليوم</p>
        <VBtn color="accent" size="x-large" prepend-icon="mdi-account-plus-outline" @click="router.push({ name: 'register' })">
          إنشاء حساب مجاني
        </VBtn>
      </VCard>
    </VContainer>

    <!-- Footer -->
    <VFooter color="primary" class="text-white justify-center py-6">
      <span class="text-body-2 opacity-80">© 2026 {{ t('app.name') }} — جميع الحقوق محفوظة</span>
    </VFooter>
  </div>
</template>
