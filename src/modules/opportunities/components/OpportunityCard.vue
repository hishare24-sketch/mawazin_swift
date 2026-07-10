<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Opportunity } from '../interfaces/Opportunity'
import { EMPLOYMENT_TYPE_LABELS, formatSalary } from '../interfaces/Opportunity'
import { useSavedStore } from '@/stores/SavedStore'
import { useApplicationsStore } from '@/stores/ApplicationsStore'
import { useProfileStore } from '@/stores/ProfileStore'
import { matchScore } from '@/services/matching'
import { opportunityMatchProfile, seekerMatchProfile } from '@/services/matchProfile'
import { useSectorContext } from '@/composables/useSectorContext'
import { matchColor } from '@/utils/match'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseChip from '@/components/ui/BaseChip.vue'
import BaseIcon from '@/components/ui/BaseIcon.vue'
import BaseAvatar from '@/components/ui/BaseAvatar.vue'
import BaseProgressBar from '@/components/ui/BaseProgressBar.vue'

const props = defineProps<{ opportunity: Opportunity }>()
const router = useRouter()
const savedStore = useSavedStore()
const applicationsStore = useApplicationsStore()
const profile = useProfileStore()
const sector = useSectorContext()

const isSaved = computed(() => savedStore.isSaved(props.opportunity.id))
const isApplied = computed(() => applicationsStore.hasApplied(props.opportunity.id))

// نسبة التطابق الحيّة — يحسبها محرّك المطابقة من ملف الباحث الحقيقي (لا رقم مبذور).
// القطاع من سياق المستخدم (matchInput) إن صرّح، وإلا يُشتقّ من المهارات احتياطًا.
const matchRate = computed(() => matchScore(
  seekerMatchProfile({
    skills: profile.skills.map(s => s.name),
    city: profile.prefs.location,
    opportunityType: profile.prefs.preferred_employment_types[0],
    ...sector.matchInput(),
  }),
  opportunityMatchProfile(props.opportunity),
).score)

function openDetails() {
  router.push({ name: 'opportunity-details', params: { id: props.opportunity.id } })
}
</script>

<template>
  <BaseCard class="flex h-full flex-col">
    <div class="mb-2 flex items-start justify-between">
      <div class="flex items-center gap-3">
        <BaseAvatar color="brand" :size="46" tonal square>
          <span class="text-lg font-bold">{{ opportunity.companyInitial }}</span>
        </BaseAvatar>
        <div>
          <div class="font-bold">
            {{ opportunity.title }}
          </div>
          <div class="text-sm text-muted">
            {{ opportunity.company }}
          </div>
        </div>
      </div>
      <div class="flex items-center gap-1">
        <BaseChip v-if="opportunity.isNew" color="accent">
          جديد
        </BaseChip>
        <button
          class="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-surfalt"
          :style="{ color: isSaved ? 'rgb(var(--v-theme-accent))' : 'rgba(var(--v-theme-on-surface), 0.6)' }"
          :aria-label="isSaved ? 'إزالة الحفظ' : 'حفظ'"
          @click.stop="savedStore.toggle(opportunity.id)"
        >
          <BaseIcon :name="isSaved ? 'mdi-bookmark' : 'mdi-bookmark-outline'" :size="22" />
        </button>
      </div>
    </div>

    <div class="my-2 flex flex-wrap gap-2">
      <BaseChip color="neutral">
        <BaseIcon name="mdi-map-marker-outline" :size="14" /> {{ opportunity.city }}
      </BaseChip>
      <BaseChip color="neutral">
        <BaseIcon name="mdi-briefcase-outline" :size="14" /> {{ EMPLOYMENT_TYPE_LABELS[opportunity.type] }}
      </BaseChip>
    </div>

    <div class="mb-2 flex items-center gap-1 text-sm text-muted">
      <BaseIcon name="mdi-cash" :size="16" /> {{ formatSalary(opportunity.salaryMin, opportunity.salaryMax) }}
    </div>

    <!-- Match rate -->
    <div class="mt-1">
      <div class="mb-1 flex justify-between text-xs">
        <span class="text-muted">نسبة التطابق الذكي</span>
        <span class="font-bold" :style="{ color: `rgb(var(--v-theme-${matchColor(matchRate)}))` }">
          {{ matchRate }}%
        </span>
      </div>
      <BaseProgressBar :value="matchRate" :color="matchColor(matchRate)" :height="6" />
    </div>

    <div class="mt-4 flex items-center justify-between pt-2">
      <span class="flex items-center gap-1 text-xs text-muted">
        <BaseIcon name="mdi-account-multiple-outline" :size="16" /> {{ opportunity.applicants }} متقدم
      </span>
      <span class="text-xs text-muted">{{ opportunity.postedAt }}</span>
    </div>

    <div class="my-3 border-t border-ui" />

    <div class="mt-auto flex gap-2">
      <BaseButton v-if="isApplied" variant="tonal-emerald" size="sm" class="flex-1" @click="openDetails">
        <BaseIcon name="mdi-check" :size="18" /> تم التقديم
      </BaseButton>
      <BaseButton v-else variant="accent" size="sm" class="flex-1" @click="openDetails">
        تقدّم الآن
      </BaseButton>
      <BaseButton variant="outline" size="sm" @click="openDetails">
        التفاصيل
      </BaseButton>
    </div>
  </BaseCard>
</template>
