<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ApiError } from '../api/client';
import type { ManagedUser } from '../api/types';
import FeedbackState from '../components/FeedbackState.vue';
import CmsBadge from '../components/ui/CmsBadge.vue';
import CmsCard from '../components/ui/CmsCard.vue';
import CmsEmptyState from '../components/ui/CmsEmptyState.vue';
import CmsIcon from '../components/CmsIcon.vue';
import CmsLoadingState from '../components/ui/CmsLoadingState.vue';
import { cmsApiClient, useAuthStore } from '../stores/auth';

const props = defineProps<{ userId: string }>();
const auth = useAuthStore();
const user = ref<ManagedUser | null>(null);
const loading = ref(true);
const error = ref<'not-found' | 'denied' | 'unavailable' | null>(null);
const canUpdate = computed(() => auth.can('user.update'));
const statusLabel = computed(() => (user.value?.status === 'active' ? 'Active' : 'Disabled'));
let requestGeneration = 0;

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(value);
}

function formatDateTime(value: Date): string {
  return `${new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Asia/Jakarta',
  }).format(value)} WIB`;
}

async function load(): Promise<void> {
  const generation = ++requestGeneration;
  loading.value = true;
  error.value = null;
  user.value = null;
  try {
    const result = await cmsApiClient.getUser(props.userId);
    if (generation === requestGeneration) user.value = result;
  } catch (cause) {
    if (generation !== requestGeneration) return;
    error.value =
      cause instanceof ApiError && cause.status === 404
        ? 'not-found'
        : cause instanceof ApiError && cause.status === 403
          ? 'denied'
          : 'unavailable';
  } finally {
    if (generation === requestGeneration) loading.value = false;
  }
}

watch(
  () => props.userId,
  () => void load(),
  { immediate: true },
);
</script>

<template>
  <section aria-label="User details" class="w-full space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <RouterLink
        to="/users"
        class="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-cms-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cms-focus dark:text-cms-focus"
      >
        <CmsIcon name="arrow-left" :size="18" />
        Back to Users
      </RouterLink>
      <nav aria-label="Breadcrumb">
        <ol class="flex items-center gap-1.5 text-sm">
          <li>
            <RouterLink to="/" class="text-cms-muted hover:text-cms-foreground">Home</RouterLink>
            <span aria-hidden="true" class="px-1.5 text-cms-muted">›</span>
          </li>
          <li aria-current="page" class="text-cms-foreground">User details</li>
        </ol>
      </nav>
    </div>

    <h1 class="text-2xl font-semibold tracking-tight text-cms-foreground">User details</h1>

    <CmsLoadingState v-if="loading" />
    <CmsEmptyState
      v-else-if="error === 'not-found'"
      title="User not found"
      message="This user is unavailable."
    />
    <FeedbackState
      v-else-if="error"
      :kind="error === 'denied' ? 'denied' : 'unavailable'"
      :message="
        error === 'denied'
          ? 'You do not have permission to view this user.'
          : 'Unable to load user details. Try again.'
      "
      :retryable="error !== 'denied'"
      @retry="load"
    />
    <template v-else-if="user">
      <div class="space-y-5">
        <CmsCard>
          <div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex min-w-0 items-center gap-4">
              <div
                aria-hidden="true"
                class="flex size-14 shrink-0 items-center justify-center rounded-full bg-cms-primary/10 text-xl font-semibold text-cms-primary dark:text-cms-focus"
              >
                {{ user.email.slice(0, 1).toUpperCase() }}
              </div>
              <div class="min-w-0 space-y-1">
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="break-all text-lg font-semibold text-cms-foreground">
                    {{ user.email }}
                  </h2>
                  <CmsBadge :variant="user.status === 'active' ? 'success' : 'neutral'">
                    {{ statusLabel }}
                  </CmsBadge>
                </div>
                <p class="text-sm text-cms-muted">{{ user.role?.name ?? 'No role assigned' }}</p>
                <p class="text-sm text-cms-muted">Created {{ formatDate(user.createdAt) }}</p>
              </div>
            </div>
            <RouterLink
              v-if="canUpdate"
              :to="{ name: 'user-edit', params: { id: user.id } }"
              class="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg border border-cms-border bg-cms-surface px-4 py-2.5 text-sm font-medium text-cms-foreground shadow-cms-card hover:bg-cms-muted-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cms-focus sm:self-auto"
            >
              <CmsIcon name="edit" :size="18" />
              Edit user
            </RouterLink>
          </div>
        </CmsCard>

        <CmsCard title="User information">
          <dl class="divide-y divide-cms-border">
            <div
              class="grid gap-1 py-3 first:pt-0 sm:grid-cols-[minmax(9rem,0.8fr)_minmax(0,1.6fr)] sm:gap-4"
            >
              <dt class="text-sm text-cms-muted">Email</dt>
              <dd class="break-all text-sm font-medium text-cms-foreground">{{ user.email }}</dd>
            </div>
            <div class="grid gap-1 py-3 sm:grid-cols-[minmax(9rem,0.8fr)_minmax(0,1.6fr)] sm:gap-4">
              <dt class="text-sm text-cms-muted">Email verification</dt>
              <dd>
                <CmsBadge :variant="user.emailVerifiedAt ? 'success' : 'neutral'">
                  {{ user.emailVerifiedAt ? 'Verified' : 'Not verified' }}
                </CmsBadge>
              </dd>
            </div>
            <div class="grid gap-1 py-3 sm:grid-cols-[minmax(9rem,0.8fr)_minmax(0,1.6fr)] sm:gap-4">
              <dt class="text-sm text-cms-muted">Role</dt>
              <dd class="text-sm font-medium text-cms-foreground">
                {{ user.role?.name ?? 'No role assigned' }}
              </dd>
            </div>
            <div class="grid gap-1 py-3 sm:grid-cols-[minmax(9rem,0.8fr)_minmax(0,1.6fr)] sm:gap-4">
              <dt class="text-sm text-cms-muted">Created</dt>
              <dd class="text-sm font-medium text-cms-foreground">
                {{ formatDateTime(user.createdAt) }}
                <span class="mt-0.5 block text-xs font-normal text-cms-muted">UTC+07:00</span>
              </dd>
            </div>
            <div
              class="grid gap-1 py-3 last:pb-0 sm:grid-cols-[minmax(9rem,0.8fr)_minmax(0,1.6fr)] sm:gap-4"
            >
              <dt class="text-sm text-cms-muted">Last login</dt>
              <dd class="text-sm font-medium text-cms-foreground">
                <template v-if="user.lastLoginAt">
                  {{ formatDateTime(user.lastLoginAt) }}
                  <span class="mt-0.5 block text-xs font-normal text-cms-muted">UTC+07:00</span>
                </template>
                <span v-else class="text-cms-muted">Never logged in</span>
              </dd>
            </div>
          </dl>
        </CmsCard>
      </div>
    </template>
  </section>
</template>
