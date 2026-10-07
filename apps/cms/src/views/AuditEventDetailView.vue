<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ApiError } from '../api/client';
import type { AuditDetail } from '../api/types';
import CmsIcon from '../components/CmsIcon.vue';
import FeedbackState from '../components/FeedbackState.vue';
import CmsBadge from '../components/ui/CmsBadge.vue';
import CmsButton from '../components/ui/CmsButton.vue';
import CmsCard from '../components/ui/CmsCard.vue';
import CmsEmptyState from '../components/ui/CmsEmptyState.vue';
import CmsLoadingState from '../components/ui/CmsLoadingState.vue';
import { cmsApiClient } from '../stores/auth';

const route = useRoute();
const event = ref<AuditDetail | null>(null);
const loading = ref(true);
const copiedField = ref<'actor' | 'request' | null>(null);
const copyErrorField = ref<'actor' | 'request' | null>(null);
let requestGeneration = 0;
let copyFeedbackTimer: number | undefined;
const error = ref<{ kind: 'error' | 'unavailable' | 'denied'; message: string } | null>(null);

const changeEntries = computed(() => {
  const changes = event.value?.changes;
  if (!changes?.available) return [];
  const keys = new Set([...Object.keys(changes.before ?? {}), ...Object.keys(changes.after ?? {})]);
  return [...keys].sort().map((key) => ({
    key,
    before: changes.before?.[key],
    after: changes.after?.[key],
  }));
});

const exportFilterKeys = ['action', 'actorId', 'resourceType', 'resourceId', 'outcome'] as const;
const exportFilterLabels = {
  action: 'Action',
  actorId: 'Actor ID',
  resourceType: 'Resource type',
  resourceId: 'Resource ID',
  outcome: 'Outcome',
};
const activeExportFilters = computed(() => {
  const filters = event.value?.exportSummary?.filters;
  if (!filters) return [];
  return exportFilterKeys.flatMap((key) =>
    filters[key] ? [{ label: exportFilterLabels[key], value: filters[key] }] : [],
  );
});

function actorLabel(value: AuditDetail): string {
  if (value.actor.type === 'system') return 'System';
  if (!value.actor.available) return 'Actor unavailable';
  return value.actor.displayName || value.actor.email || 'Actor unavailable';
}

function targetLabel(value: AuditDetail): string {
  if (value.exportSummary && (value.resource.type === null || value.resource.id === null)) {
    return 'Export summary';
  }
  if (value.resource.type === null || value.resource.id === null) return 'No single resource';
  return `${value.resource.type} · ${value.resource.id}`;
}

function formatValue(value: unknown): string {
  if (value === undefined) return 'Not recorded';
  if (value === null) return 'None';
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) {
    return value.join(', ');
  }
  return 'Unavailable';
}

function formatWib(value: Date): { dateTime: string; timeZone: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? '';
  return {
    dateTime: `${part('day')} ${part('month')} ${part('year')}, ${part('hour')}:${part('minute')}:${part('second')} WIB`,
    timeZone: 'UTC+07:00',
  };
}

async function copyId(value: string, field: 'actor' | 'request'): Promise<void> {
  window.clearTimeout(copyFeedbackTimer);
  copiedField.value = null;
  copyErrorField.value = null;
  try {
    await navigator.clipboard.writeText(value);
    copiedField.value = field;
  } catch {
    copyErrorField.value = field;
  }
  copyFeedbackTimer = window.setTimeout(() => {
    copiedField.value = null;
    copyErrorField.value = null;
  }, 3000);
}

function outcomeVariant(outcome: AuditDetail['outcome']): 'success' | 'danger' {
  return outcome === 'success' ? 'success' : 'danger';
}

function errorState(cause: unknown): { kind: 'error' | 'unavailable' | 'denied'; message: string } {
  if (cause instanceof ApiError && cause.status === 403) {
    return { kind: 'denied', message: 'You do not have permission to view this audit event.' };
  }
  if (cause instanceof ApiError && cause.status === 404) {
    return { kind: 'error', message: 'This audit event is unavailable.' };
  }
  if (
    cause instanceof ApiError &&
    (cause.kind === 'network' || cause.kind === 'timeout' || (cause.status ?? 0) >= 500)
  ) {
    return { kind: 'unavailable', message: 'Audit trail is unavailable. Try again.' };
  }
  return { kind: 'error', message: 'Unable to load this audit event. Try again.' };
}

async function load(): Promise<void> {
  const generation = ++requestGeneration;
  loading.value = true;
  error.value = null;
  event.value = null;
  window.clearTimeout(copyFeedbackTimer);
  copiedField.value = null;
  copyErrorField.value = null;
  const id = String(route.params.id);
  try {
    const result = await cmsApiClient.getAuditEvent(id);
    if (generation === requestGeneration) event.value = result;
  } catch (cause) {
    if (generation === requestGeneration) error.value = errorState(cause);
  } finally {
    if (generation === requestGeneration) loading.value = false;
  }
}

watch(
  () => String(route.params.id),
  () => void load(),
  { immediate: true },
);

onBeforeUnmount(() => window.clearTimeout(copyFeedbackTimer));
</script>

<template>
  <section aria-label="Audit event detail" class="w-full space-y-5">
    <RouterLink
      to="/audit-trail"
      class="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-cms-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cms-focus dark:text-cms-focus"
    >
      <CmsIcon name="arrow-left" :size="18" />
      Back to Audit Trail
    </RouterLink>

    <header class="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <h1 class="text-2xl font-semibold text-cms-foreground">Audit Event</h1>
      <nav aria-label="Breadcrumb">
        <ol class="flex items-center gap-1.5 text-sm">
          <li>
            <RouterLink to="/" class="text-cms-muted hover:text-cms-foreground">Home</RouterLink>
            <span aria-hidden="true" class="px-1.5 text-cms-muted">›</span>
          </li>
          <li aria-current="page" class="text-cms-foreground">Audit Event</li>
        </ol>
      </nav>
    </header>

    <FeedbackState
      v-if="error"
      :kind="error.kind"
      :message="error.message"
      :retryable="error.kind !== 'denied' && error.message !== 'This audit event is unavailable.'"
      @retry="load"
    />
    <CmsLoadingState v-else-if="loading" />
    <CmsEmptyState
      v-else-if="event === null"
      title="Audit event unavailable"
      message="This event may be hidden or no longer available."
    />
    <template v-else>
      <section
        aria-label="Event summary"
        class="flex items-start gap-4 rounded-2xl border border-cms-primary/15 bg-cms-primary-soft/40 p-4 dark:border-cms-primary/40 dark:bg-cms-primary/10 sm:gap-5 sm:p-6"
      >
        <div
          class="grid size-12 shrink-0 place-items-center rounded-xl bg-cms-surface text-cms-primary sm:size-14"
        >
          <CmsIcon name="download" :size="24" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 class="break-words text-lg font-semibold text-cms-foreground sm:text-xl">
              {{ event.label }}
            </h2>
            <CmsBadge :variant="outcomeVariant(event.outcome)">
              {{ event.outcome === 'success' ? 'Success' : 'Failure' }}
            </CmsBadge>
          </div>
          <p class="mt-1 break-all font-mono text-sm text-cms-muted">{{ event.eventType }}</p>
          <div class="mt-3 flex items-start gap-2 text-sm">
            <CmsIcon name="calendar" :size="18" class="mt-0.5 shrink-0 text-cms-muted" />
            <p class="min-w-0">
              <span class="font-medium text-cms-foreground">{{
                formatWib(event.createdAt).dateTime
              }}</span>
              <span class="ml-2 text-cms-muted">{{ formatWib(event.createdAt).timeZone }}</span>
            </p>
          </div>
        </div>
      </section>

      <div
        class="grid items-start gap-5"
        :class="event.exportSummary ? 'xl:grid-cols-2' : 'max-w-3xl'"
      >
        <CmsCard title="Event details">
          <dl class="divide-y divide-cms-border text-sm">
            <div class="grid gap-1 py-4 first:pt-0 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
              <dt class="text-cms-muted">Actor</dt>
              <dd class="min-w-0">
                <p class="break-words font-medium text-cms-foreground">{{ actorLabel(event) }}</p>
                <p
                  v-if="event.actor.email && event.actor.email !== actorLabel(event)"
                  class="mt-1 break-all text-cms-muted"
                >
                  {{ event.actor.email }}
                </p>
              </dd>
            </div>
            <div
              v-if="event.actor.id"
              class="grid gap-1 py-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4"
            >
              <dt class="text-cms-muted">Actor ID</dt>
              <dd class="min-w-0">
                <div class="flex min-w-0 items-center gap-2">
                  <code
                    class="min-w-0 flex-1 break-all rounded-lg bg-cms-muted-surface px-3 py-2 font-mono text-xs text-cms-foreground"
                    >{{ event.actor.id }}</code
                  >
                  <CmsButton
                    variant="icon"
                    :aria-label="copiedField === 'actor' ? 'Actor ID copied' : 'Copy actor ID'"
                    @click="copyId(event.actor.id, 'actor')"
                  >
                    <CmsIcon name="copy" :size="18" />
                  </CmsButton>
                </div>
                <p
                  v-if="copiedField === 'actor'"
                  role="status"
                  class="mt-1 text-xs text-cms-success-strong"
                >
                  Actor ID copied
                </p>
                <p
                  v-else-if="copyErrorField === 'actor'"
                  role="status"
                  class="mt-1 text-xs text-cms-danger"
                >
                  Could not copy. Select the ID to copy it manually.
                </p>
              </dd>
            </div>
            <div class="grid gap-1 py-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
              <dt class="text-cms-muted">Target</dt>
              <dd class="min-w-0 break-words font-medium text-cms-foreground">
                {{ targetLabel(event) }}
              </dd>
            </div>
            <div class="grid gap-1 py-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
              <dt class="text-cms-muted">Occurred</dt>
              <dd class="min-w-0">
                <p class="break-words font-medium text-cms-foreground">
                  {{ formatWib(event.createdAt).dateTime }}
                </p>
                <p class="mt-1 text-xs text-cms-muted">{{ formatWib(event.createdAt).timeZone }}</p>
              </dd>
            </div>
            <div class="grid gap-1 pb-0 pt-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
              <dt class="text-cms-muted">Request ID</dt>
              <dd v-if="event.requestId" class="min-w-0">
                <div class="flex min-w-0 items-center gap-2">
                  <code
                    class="min-w-0 flex-1 break-all rounded-lg bg-cms-muted-surface px-3 py-2 font-mono text-xs text-cms-foreground"
                    >{{ event.requestId }}</code
                  >
                  <CmsButton
                    variant="icon"
                    :aria-label="
                      copiedField === 'request' ? 'Request ID copied' : 'Copy request ID'
                    "
                    @click="copyId(event.requestId, 'request')"
                  >
                    <CmsIcon name="copy" :size="18" />
                  </CmsButton>
                </div>
                <p
                  v-if="copiedField === 'request'"
                  role="status"
                  class="mt-1 text-xs text-cms-success-strong"
                >
                  Request ID copied
                </p>
                <p
                  v-else-if="copyErrorField === 'request'"
                  role="status"
                  class="mt-1 text-xs text-cms-danger"
                >
                  Could not copy. Select the ID to copy it manually.
                </p>
              </dd>
              <dd v-else class="text-cms-muted">Not recorded</dd>
            </div>
          </dl>
        </CmsCard>

        <CmsCard v-if="event.exportSummary" title="Export summary">
          <div
            v-if="event.outcome === 'success'"
            role="status"
            class="mb-5 flex gap-3 rounded-lg border border-cms-success-strong/20 bg-cms-success-soft/60 p-4 dark:border-cms-success-bright/30 dark:bg-cms-success-bright/15"
          >
            <CmsIcon
              name="check-circle"
              :size="20"
              class="mt-0.5 shrink-0 text-cms-success-strong dark:text-cms-success-light"
            />
            <div>
              <p class="text-sm font-medium text-cms-success-strong dark:text-cms-success-light">
                Export completed successfully
              </p>
              <p v-if="event.exportSummary.rowCount === 0" class="mt-1 text-sm text-cms-foreground">
                The export process finished, but no records matched the selected criteria.
              </p>
            </div>
          </div>
          <div class="border-b border-cms-border pb-4">
            <p class="text-sm text-cms-muted">Rows exported</p>
            <p class="mt-1 text-3xl font-semibold tabular-nums text-cms-foreground sm:text-4xl">
              {{ event.exportSummary.rowCount.toLocaleString() }}
            </p>
          </div>
          <dl class="divide-y divide-cms-border text-sm">
            <div class="grid gap-1 py-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
              <dt class="text-cms-muted">Search applied</dt>
              <dd class="font-medium text-cms-foreground">
                {{ event.exportSummary.searchApplied ? 'Yes' : 'No' }}
              </dd>
            </div>
            <div class="grid gap-1 py-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
              <dt class="text-cms-muted">From</dt>
              <dd class="min-w-0">
                <p class="break-words font-medium text-cms-foreground">
                  {{ formatWib(event.exportSummary.from).dateTime }}
                </p>
                <p class="mt-1 text-xs text-cms-muted">
                  {{ formatWib(event.exportSummary.from).timeZone }}
                </p>
              </dd>
            </div>
            <div class="grid gap-1 py-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
              <dt class="text-cms-muted">To</dt>
              <dd class="min-w-0">
                <p class="break-words font-medium text-cms-foreground">
                  {{ formatWib(event.exportSummary.to).dateTime }}
                </p>
                <p class="mt-1 text-xs text-cms-muted">
                  {{ formatWib(event.exportSummary.to).timeZone }}
                </p>
              </dd>
            </div>
            <div class="grid gap-1 pb-0 pt-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
              <dt class="text-cms-muted">Filters</dt>
              <dd v-if="activeExportFilters.length === 0" class="text-cms-foreground">None</dd>
              <dd v-else class="min-w-0">
                <dl class="space-y-2">
                  <div v-for="filter in activeExportFilters" :key="filter.label">
                    <dt class="text-xs text-cms-muted">{{ filter.label }}</dt>
                    <dd class="break-all text-cms-foreground">{{ filter.value }}</dd>
                  </div>
                </dl>
              </dd>
            </div>
          </dl>
        </CmsCard>
      </div>

      <CmsCard v-if="event.changes" title="Changes">
        <CmsEmptyState
          v-if="!event.changes.available"
          variant="plain"
          title="Change details unavailable"
          message="This event does not contain an approved change snapshot."
        />
        <div v-else-if="changeEntries.length === 0" class="text-sm text-cms-muted">
          No field changes recorded.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[34rem] border-collapse text-left text-sm">
            <caption class="sr-only">
              Approved field changes
            </caption>
            <thead class="border-b border-cms-border">
              <tr>
                <th scope="col" class="px-4 py-3 font-medium text-cms-muted">Field</th>
                <th scope="col" class="px-4 py-3 font-medium text-cms-muted">Before</th>
                <th scope="col" class="px-4 py-3 font-medium text-cms-muted">After</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-cms-border">
              <tr v-for="entry in changeEntries" :key="entry.key">
                <th
                  scope="row"
                  class="max-w-[12rem] break-words px-4 py-4 align-top font-mono text-xs text-cms-foreground"
                >
                  {{ entry.key }}
                </th>
                <td class="max-w-[22rem] break-words px-4 py-4 align-top text-cms-muted">
                  {{ formatValue(entry.before) }}
                </td>
                <td class="max-w-[22rem] break-words px-4 py-4 align-top text-cms-muted">
                  {{ formatValue(entry.after) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CmsCard>
    </template>
  </section>
</template>
