<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ApiError } from '../api/client';
import type { DashboardSummary } from '../api/types';
import FeedbackState from '../components/FeedbackState.vue';
import CmsIcon from '../components/CmsIcon.vue';
import CmsCard from '../components/ui/CmsCard.vue';
import CmsEmptyState from '../components/ui/CmsEmptyState.vue';
import CmsLoadingState from '../components/ui/CmsLoadingState.vue';
import { cmsApiClient } from '../stores/auth';

const summary = ref<DashboardSummary | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const metrics = computed(() => {
  if (!summary.value) return [];
  return [
    { label: 'Total users', value: summary.value.users.total, icon: 'users' as const },
    { label: 'Active users', value: summary.value.users.active, icon: 'users' as const },
    { label: 'Roles', value: summary.value.roles.total, icon: 'shield' as const },
    { label: 'Active categories', value: summary.value.categories.active, icon: 'folder' as const },
  ];
});

const recordGroups = computed(() => {
  if (!summary.value) return [];
  const records = [
    { label: 'Users', value: summary.value.users.total, detail: 'Accounts', route: '/users' },
    { label: 'Roles', value: summary.value.roles.total, detail: 'Access roles', route: '/roles' },
    {
      label: 'Categories',
      value: summary.value.categories.total,
      detail: 'Content categories',
      route: '/categories',
    },
  ];
  const maxValue = Math.max(...records.map((record) => record.value), 1);
  return records.map((record) => ({ ...record, share: (record.value / maxValue) * 100 }));
});

const activeShare = computed(() => {
  if (!summary.value || summary.value.users.total === 0) return 0;
  return (summary.value.users.active / summary.value.users.total) * 100;
});

const hasRecords = computed(
  () =>
    summary.value !== null &&
    (summary.value.users.total > 0 ||
      summary.value.roles.total > 0 ||
      summary.value.categories.total > 0),
);

async function loadSummary(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    summary.value = await cmsApiClient.getDashboardSummary();
  } catch (cause) {
    error.value =
      cause instanceof ApiError ? cause.message : 'Unable to load the dashboard summary.';
  } finally {
    loading.value = false;
  }
}

onMounted(() => void loadSummary());
</script>

<template>
  <section aria-label="Dashboard summary" class="grid grid-cols-12 gap-4 md:gap-6">
    <FeedbackState
      v-if="error"
      class="col-span-12"
      kind="error"
      :message="error"
      retryable
      @retry="loadSummary"
    />
    <CmsLoadingState v-else-if="loading" class="col-span-12" />

    <template v-else-if="summary">
      <div class="col-span-12 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
        <article
          v-for="metric in metrics"
          :key="metric.label"
          class="rounded-2xl border border-cms-border bg-cms-surface p-5 md:p-6"
        >
          <div
            class="flex size-12 items-center justify-center rounded-xl bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/90"
          >
            <CmsIcon :name="metric.icon" :size="24" />
          </div>
          <div class="mt-5 flex items-end justify-between">
            <div>
              <p class="text-sm text-cms-muted">{{ metric.label }}</p>
              <p class="mt-2 text-3xl font-bold tabular-nums text-cms-foreground">
                {{ metric.value.toLocaleString() }}
              </p>
            </div>
          </div>
        </article>
      </div>

      <CmsEmptyState
        v-if="!hasRecords"
        class="col-span-12"
        title="No workspace records yet"
        message="Users, roles, and categories will appear in this summary when they exist."
      />

      <template v-else>
        <CmsCard title="Workspace records" class="col-span-12 xl:col-span-7">
          <div class="space-y-6">
            <div v-for="record in recordGroups" :key="record.label">
              <div class="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p class="text-sm font-medium text-cms-foreground">{{ record.label }}</p>
                  <p class="mt-0.5 text-xs text-cms-muted">{{ record.detail }}</p>
                </div>
                <div class="flex items-center gap-4">
                  <span class="text-sm font-semibold tabular-nums text-cms-foreground">{{
                    record.value.toLocaleString()
                  }}</span>
                  <RouterLink
                    :to="record.route"
                    class="text-sm font-medium text-cms-primary hover:text-[#3641f5]"
                    :aria-label="`View ${record.label.toLowerCase()}`"
                    >View</RouterLink
                  >
                </div>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  class="h-full rounded-full bg-cms-primary transition-[width]"
                  :style="{ width: `${record.share}%` }"
                  :aria-label="`${record.label}: ${record.value} records`"
                  role="img"
                />
              </div>
            </div>
          </div>
        </CmsCard>

        <CmsCard title="Account status" class="col-span-12 xl:col-span-5">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-sm text-cms-muted">Active accounts</p>
              <p class="mt-2 text-3xl font-semibold tabular-nums text-cms-foreground">
                {{ summary.users.active.toLocaleString() }}
              </p>
            </div>
            <p
              class="rounded-full bg-cms-success-soft px-3 py-1 text-xs font-medium text-cms-success-strong dark:bg-cms-success-bright/15 dark:text-cms-success-light"
            >
              {{ Math.round(activeShare) }}% active
            </p>
          </div>
          <div class="mt-6 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              class="h-full rounded-full bg-cms-success-bright dark:bg-cms-success-light"
              :style="{ width: `${activeShare}%` }"
              role="img"
              :aria-label="`${summary.users.active} active users out of ${summary.users.total}`"
            />
          </div>
          <dl class="mt-5 grid grid-cols-2 gap-4 border-t border-cms-border pt-5">
            <div>
              <dt class="text-sm text-cms-muted">Active</dt>
              <dd class="mt-1 text-lg font-semibold tabular-nums text-cms-foreground">
                {{ summary.users.active.toLocaleString() }}
              </dd>
            </div>
            <div>
              <dt class="text-sm text-cms-muted">Disabled</dt>
              <dd class="mt-1 text-lg font-semibold tabular-nums text-cms-foreground">
                {{ summary.users.disabled.toLocaleString() }}
              </dd>
            </div>
          </dl>
        </CmsCard>
      </template>
    </template>
  </section>
</template>
