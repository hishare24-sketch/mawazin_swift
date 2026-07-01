<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { UserRole } from '@/interfaces/Auth'
import { useAuthStore } from '@/stores/AuthStore'
import { authService } from '../services/AuthService'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const roleOptions: { value: UserRole, icon: string }[] = [
  { value: 'seeker', icon: 'mdi-account-search' },
  { value: 'company', icon: 'mdi-domain' },
  { value: 'endorser', icon: 'mdi-account-star' },
]

const role = ref<UserRole>('seeker')
const name = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const passwordConfirm = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const error = ref('')

const required = (v: string) => !!v || 'هذا الحقل مطلوب'

async function submit() {
  error.value = ''
  if (!name.value || !email.value || !password.value) {
    error.value = 'يرجى تعبئة الحقول المطلوبة'
    return
  }
  if (password.value !== passwordConfirm.value) {
    error.value = 'كلمتا المرور غير متطابقتين'
    return
  }
  isLoading.value = true
  try {
    const user = await authService.register({
      name: name.value,
      email: email.value,
      phone: phone.value,
      password: password.value,
      password_confirmation: passwordConfirm.value,
      role: role.value,
    })
    authStore.setAuthUser(user)
    // New seekers see the onboarding wizard; others go to their dashboard
    if (user.role === 'seeker')
      router.push({ name: 'onboarding' })
    else
      router.push({ name: 'dashboard' })
  }
  catch {
    error.value = 'تعذّر إنشاء الحساب. حاول مرة أخرى.'
  }
  finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div>
    <h2 class="text-h4 font-weight-bold mb-1">
      {{ t('auth.register') }}
    </h2>
    <p class="text-body-1 text-medium-emphasis mb-5">
      {{ t('auth.registerSubtitle') }}
    </p>

    <VAlert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">
      {{ error }}
    </VAlert>

    <!-- Role selector -->
    <div class="text-body-2 font-weight-bold mb-2">
      {{ t('auth.selectRole') }}
    </div>
    <VRow class="mb-2" dense>
      <VCol v-for="opt in roleOptions" :key="opt.value" cols="4">
        <VCard
          :color="role === opt.value ? 'primary' : undefined"
          :variant="role === opt.value ? 'flat' : 'outlined'"
          class="text-center pa-3 cursor-pointer"
          @click="role = opt.value"
        >
          <VIcon :icon="opt.icon" size="28" :color="role === opt.value ? 'white' : 'primary'" />
          <div class="text-caption mt-1" :class="role === opt.value ? 'text-white' : ''">
            {{ t(`roles.${opt.value}`) }}
          </div>
        </VCard>
      </VCol>
    </VRow>

    <VForm @submit.prevent="submit">
      <VTextField
        v-model="name"
        :label="t('auth.name')"
        prepend-inner-icon="mdi-account-outline"
        :rules="[required]"
        class="mb-3"
      />
      <VTextField
        v-model="email"
        :label="t('auth.email')"
        type="email"
        prepend-inner-icon="mdi-email-outline"
        :rules="[required]"
        class="mb-3"
      />
      <VTextField
        v-model="phone"
        :label="t('auth.phone')"
        prepend-inner-icon="mdi-phone-outline"
        class="mb-3"
      />
      <VTextField
        v-model="password"
        :label="t('auth.password')"
        :type="showPassword ? 'text' : 'password'"
        prepend-inner-icon="mdi-lock-outline"
        :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
        :rules="[required]"
        class="mb-3"
        @click:append-inner="showPassword = !showPassword"
      />
      <VTextField
        v-model="passwordConfirm"
        :label="t('auth.confirmPassword')"
        :type="showPassword ? 'text' : 'password'"
        prepend-inner-icon="mdi-lock-check-outline"
        :rules="[required]"
      />

      <VBtn
        type="submit"
        color="accent"
        size="large"
        block
        :loading="isLoading"
        class="mt-4"
      >
        {{ t('auth.register') }}
      </VBtn>
    </VForm>

    <div class="text-center mt-5 text-body-2">
      {{ t('auth.haveAccount') }}
      <RouterLink :to="{ name: 'login' }" class="text-secondary font-weight-bold text-decoration-none">
        {{ t('auth.login') }}
      </RouterLink>
    </div>
  </div>
</template>
