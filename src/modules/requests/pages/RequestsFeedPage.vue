<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/shared/PageHeader.vue'
import { KIND_META, useRequestsStore } from '@/stores/RequestsStore'
import type { RequestKind } from '@/stores/RequestsStore'
import { ai } from '@/services/ai'
import EmptyState from '@/components/shared/EmptyState.vue'

const router = useRouter()
const store = useRequestsStore()

const search = ref('')
const searchFocused = ref(false)
const suggestions = computed(() => (searchFocused.value ? ai.searchSuggestions(search.value) : []))

const kinds = Object.keys(KIND_META) as RequestKind[]
const selectedKinds = ref<RequestKind[]>([])
const selectedField = ref<string | null>(null)
const remoteOnly = ref(false)
const maxWeeks = ref(20)
const minBudget = ref(0)
const smartSort = ref(true)

function toggleKind(k: RequestKind) {
  selectedKinds.value = selectedKinds.value.includes(k)
    ? selectedKinds.value.filter(x => x !== k)
    : [...selectedKinds.value, k]
}

const filtered = computed(() => {
  let list = store.requests.filter((r) => {
    if (search.value.trim() && !`${r.title} ${r.org} ${r.field} ${r.skills.join(' ')}`.includes(search.value.trim()))
      return false
    if (selectedKinds.value.length && !selectedKinds.value.includes(r.kind))
      return false
    if (selectedField.value && r.field !== selectedField.value)
      return false
    if (remoteOnly.value && !r.remote)
      return false
    if (r.durationWeeks > maxWeeks.value)
      return false
    if (r.budgetValue < minBudget.value)
      return false
    return true
  })
  list = smartSort.value ? [...list].sort((a, b) => b.matchRate - a.matchRate) : list
  return list
})

function matchColor(v: number) {
  if (v >= 85)
    return 'success'
  if (v >= 70)
    return 'accent'
  return 'warning'
}

function applySuggestion(s: string) {
  search.value = s
  searchFocused.value = false
}
function onSearchBlur() {
  // delay so a suggestion click (mousedown) registers before the list closes
  setTimeout(() => (searchFocused.value = false), 200)
}
function open(id: number) {
  router.push({ name: 'request-details', params: { id } })
}
</script>

<template>
  <div>
    <PageHeader
      title="سوق الطلبات"
      subtitle="وظائف ومشاريع واستشارات ومهمات — مرتّبة بذكاء حسب تطابقك"
      icon="mdi-storefront-outline"
    >
      <template #actions>
        <VBtn variant="tonal" color="secondary" prepend-icon="mdi-file-send-outline" :to="{ name: 'my-requests' }">
          طلباتي المقدّمة
        </VBtn>
      </template>
    </PageHeader>

    <!-- Smart search -->
    <div class="position-relative mb-4">
      <VTextField
        v-model="search"
        placeholder="ابحث: مشاريع Vue، استشارة معمارية، مهمة قصيرة..."
        prepend-inner-icon="mdi-magnify"
        variant="solo"
        density="comfortable"
        hide-details
        clearable
        @focus="searchFocused = true"
        @blur="onSearchBlur"
      >
        <template #append-inner>
          <VChip color="secondary" size="small" label prepend-icon="mdi-robot-happy-outline">بحث ذكي</VChip>
        </template>
      </VTextField>

      <!-- AI live suggestions -->
      <VExpandTransition>
        <VCard v-if="searchFocused && suggestions.length" class="position-absolute w-100 mt-1" style="z-index: 10" elevation="6">
          <VList density="compact">
            <VListSubheader class="text-caption">
              <VIcon icon="mdi-robot-happy-outline" size="16" class="me-1" /> اقتراحات ذكية
            </VListSubheader>
            <VListItem
              v-for="(s, i) in suggestions"
              :key="i"
              prepend-icon="mdi-magnify"
              :title="s"
              @mousedown="applySuggestion(s)"
            />
          </VList>
        </VCard>
      </VExpandTransition>
    </div>

    <VRow>
      <!-- Filters -->
      <VCol cols="12" md="3">
        <VCard class="pa-4">
          <div class="d-flex align-center justify-space-between mb-3">
            <span class="text-subtitle-2 font-weight-bold">فلترة</span>
            <VIcon icon="mdi-filter-variant" size="18" />
          </div>

          <div class="text-caption font-weight-bold mb-2">نوع الطلب</div>
          <div class="d-flex flex-wrap ga-1 mb-4">
            <VChip
              v-for="k in kinds"
              :key="k"
              :color="selectedKinds.includes(k) ? KIND_META[k].color : undefined"
              :variant="selectedKinds.includes(k) ? 'flat' : 'outlined'"
              size="small"
              :prepend-icon="KIND_META[k].icon"
              @click="toggleKind(k)"
            >
              {{ KIND_META[k].label }}
            </VChip>
          </div>

          <VSelect
            v-model="selectedField"
            :items="store.fields"
            label="المجال"
            density="compact"
            variant="outlined"
            clearable
            hide-details
            class="mb-4"
          />

          <div class="text-caption font-weight-bold mb-1">المدة (حتى {{ maxWeeks }} أسبوع)</div>
          <VSlider v-model="maxWeeks" :min="1" :max="20" :step="1" color="accent" hide-details class="mb-3" />

          <div class="text-caption font-weight-bold mb-1">حد أدنى للمقابل ({{ minBudget.toLocaleString('en-US') }} ريال)</div>
          <VSlider v-model="minBudget" :min="0" :max="50000" :step="2500" color="secondary" hide-details class="mb-3" />

          <VSwitch v-model="remoteOnly" label="عن بُعد فقط" color="primary" density="compact" hide-details />
        </VCard>

        <!-- AI proactive alert -->
        <VAlert color="secondary" variant="tonal" density="comfortable" class="mt-3" border="start">
          <template #prepend><VIcon icon="mdi-bell-ring-outline" /></template>
          <span class="text-caption">يوجد طلب جديد من «شركة تقنية المستقبل» قد يعجبك — تطابق 94%.</span>
        </VAlert>
      </VCol>

      <!-- Results -->
      <VCol cols="12" md="9">
        <div class="d-flex align-center justify-space-between mb-3">
          <span class="text-body-2 text-medium-emphasis">{{ filtered.length }} طلب</span>
          <VBtn
            :variant="smartSort ? 'flat' : 'outlined'"
            :color="smartSort ? 'secondary' : undefined"
            size="small"
            prepend-icon="mdi-auto-fix"
            @click="smartSort = !smartSort"
          >
            {{ smartSort ? 'مرتّب بالتطابق الذكي' : 'ترتيب افتراضي' }}
          </VBtn>
        </div>

        <VRow>
          <VCol v-for="r in filtered" :key="r.id" cols="12" sm="6">
            <VCard class="pa-4 h-100 d-flex flex-column cursor-pointer" @click="open(r.id)">
              <div class="d-flex align-start justify-space-between mb-2">
                <div class="d-flex align-center ga-2">
                  <VChip :color="KIND_META[r.kind].color" size="x-small" label :prepend-icon="KIND_META[r.kind].icon">
                    {{ KIND_META[r.kind].label }}
                  </VChip>
                  <VChip v-if="r.isNew" color="accent" size="x-small" label>جديد</VChip>
                </div>
                <VTooltip text="سبب التطابق: مهاراتك المُثبتة تغطّي المتطلبات الأساسية" location="top">
                  <template #activator="{ props }">
                    <VChip v-bind="props" :color="matchColor(r.matchRate)" size="small" label>
                      {{ r.matchRate }}% تطابق
                    </VChip>
                  </template>
                </VTooltip>
              </div>

              <div class="text-subtitle-1 font-weight-bold mb-1">{{ r.title }}</div>
              <div class="text-caption text-medium-emphasis mb-3">{{ r.org }} · {{ r.field }}</div>

              <div class="d-flex flex-wrap ga-1 mb-3 flex-grow-1">
                <VChip size="x-small" variant="tonal" prepend-icon="mdi-map-marker-outline">{{ r.remote ? 'عن بُعد' : r.city }}</VChip>
                <VChip size="x-small" variant="tonal" prepend-icon="mdi-clock-outline">{{ r.duration }}</VChip>
                <VChip size="x-small" variant="tonal" prepend-icon="mdi-cash">{{ r.budget }}</VChip>
              </div>

              <div class="d-flex align-center justify-space-between">
                <span class="text-caption text-medium-emphasis">{{ r.applicants }} متقدم · {{ r.postedAt }}</span>
                <VChip v-if="store.hasApplied(r.id)" color="success" size="x-small" label prepend-icon="mdi-check">مقدّم</VChip>
                <VIcon v-else icon="mdi-arrow-left-circle-outline" color="accent" />
              </div>
            </VCard>
          </VCol>
        </VRow>

        <VCard v-if="!filtered.length">
          <EmptyState
            icon="mdi-magnify-close"
            title="لا طلبات مطابقة"
            description="وسّع نطاق المدة أو المقابل، أو أزل بعض الفلاتر لعرض المزيد."
          />
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>
