<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { landingFor } from '@/services/roles'
import { useAuthStore } from '@/stores/AuthStore'
import { authService, realAuthEnabled } from '../services/AuthService'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const error = ref('')

const required = (v: string) => !!v || 'هذا الحقل مطلوب'
const emailRule = (v: string) => /.+@.+\..+/.test(v) || 'البريد الإلكتروني غير صحيح'

async function submit() {
  error.value = ''
  if (!email.value || !password.value) {
    error.value = 'يرجى إدخال البريد وكلمة المرور'
    return
  }
  isLoading.value = true
  try {
    const user = await authService.login({ email: email.value, password: password.value })
    authStore.setAuthUser(user)
    // مالك دورين نشطين فأكثر يهبط على المركز الموحّد؛ أحادي الدور على لوحته مباشرة
    const redirect = route.query.redirect as string | undefined
    if (redirect)
      router.push(redirect)
    else
      router.push({ name: landingFor(authStore.role, authStore.activeRoles.length) })
  }
  catch (e) {
    error.value = (e as Error).message || 'فشل تسجيل الدخول. تحقق من بياناتك.'
  }
  finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div>
    <h2 class="text-h4 font-weight-bold mb-1">
      {{ t('auth.login') }}
    </h2>
    <p class="text-body-1 text-medium-emphasis mb-6">
      {{ t('auth.loginSubtitle') }}
    </p>

    <VAlert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">
      {{ error }}
    </VAlert>

    <VForm @submit.prevent="submit">
      <VTextField
        v-model="email"
        :label="t('auth.email')"
        type="email"
        prepend-inner-icon="mdi-email-outline"
        :rules="[required, emailRule]"
        class="mb-3"
      />

      <VTextField
        v-model="password"
        :label="t('auth.password')"
        :type="showPassword ? 'text' : 'password'"
        prepend-inner-icon="mdi-lock-outline"
        :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
        :rules="[required]"
        @click:append-inner="showPassword = !showPassword"
      />

      <div class="d-flex align-center justify-space-between my-2">
        <VCheckbox :label="t('auth.rememberMe')" density="compact" hide-details color="secondary" />
        <a class="text-secondary text-decoration-none text-body-2 cursor-pointer">
          {{ t('auth.forgotPassword') }}
        </a>
      </div>

      <VBtn
        type="submit"
        color="accent"
        size="large"
        block
        :loading="isLoading"
        class="mt-2"
      >
        {{ t('auth.login') }}
      </VBtn>
    </VForm>

    <div class="text-center mt-6 text-body-2">
      {{ t('auth.noAccount') }}
      <RouterLink :to="{ name: 'register' }" class="text-secondary font-weight-bold text-decoration-none">
        {{ t('auth.register') }}
      </RouterLink>
    </div>

    <VAlert type="info" variant="tonal" density="compact" class="mt-6 text-caption">
      <template v-if="realAuthEnabled">
        الحسابات حقيقية الآن (Supabase) — أنشئ حسابًا جديدًا أو ادخل بحساب سجّلته سابقًا.
      </template>
      <template v-else>
        تجربة: أدخل أي بريد وكلمة مرور. لتجربة دور آخر اكتب كلمة company أو admin داخل البريد.
      </template>
    </VAlert>
  </div>
</template>
