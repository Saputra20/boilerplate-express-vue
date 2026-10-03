<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ApiError } from '../api/client';
import {
  auditEventLabels,
  auditEventTypeSchema,
  type AuditEventExportQuery,
  type AuditEventQuery,
  type AuditEventType,
  type AuditListItem,
} from '../api/types';
import FeedbackState from '../components/FeedbackState.vue';
import CmsBadge from '../components/ui/CmsBadge.vue';
import CmsButton from '../components/ui/CmsButton.vue';
import CmsCard from '../components/ui/CmsCard.vue';
import CmsEmptyState from '../components/ui/CmsEmptyState.vue';
import CmsInput from '../components/ui/CmsInput.vue';
import CmsLoadingState from '../components/ui/CmsLoadingState.vue';
import CmsSelect from '../components/ui/CmsSelect.vue';
import { cmsApiClient, useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const events = ref<AuditListItem[]>([]);
const loading = ref(true);
const exporting = ref(false);
const error = ref<{ kind: 'error' | 'unavailable' | 'denied'; message: string } | null>(null);
const exportError = ref<string | null>(null);
const page = ref(1);
const pageSize = ref<20 | 50 | 100>(20);
const cursor = ref<string | undefined>();
const nextCursor = ref<string | null>(null);
const cursorHistory = ref<Array<string | undefined>>([]);
let requestGeneration = 0;

const emptyFilters = () => ({
  from: '',
  to: '',
  actorId: '',
  action: '' as AuditEventType | '',
  resourceType: '',
  resourceId: '',
  outcome: '' as '' | 'success' | 'failure',
  q: '',
});

const filters = reactive(emptyFilters());
const isEmpty = computed(() => !loading.value && error.value === null && events.value.length === 0);
const canExport = computed(() => auth.can('audit.read') && auth.can('audit.export'));
const eventTypes = auditEventTypeSchema.options;
const resourceTypes = ['category', 'role', 'user'] as const;

function toInstant(value: string, endOfDay = false): string | undefined {
  if (!value) return undefined;
  const suffix = endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z';
  return new Date(`${value}${suffix}`).toISOString();
}

function buildQuery(withPagination: boolean, queryCursor?: string): AuditEventQuery {
  const query: AuditEventQuery = {
    from: toInstant(filters.from),
    to: toInstant(filters.to, true),
    actorId: filters.actorId.trim() || undefined,
    action: filters.action || undefined,
    resourceType: filters.resourceType || undefined,
    resourceId: filters.resourceId.trim() || undefined,
    outcome: filters.outcome || undefined,
    q: filters.q.trim() || undefined,
  };
  if (withPagination) {
    query.limit = pageSize.value;
    query.cursor = queryCursor;
  }
  return query;
}

function errorState(cause: unknown): { kind: 'error' | 'unavailable' | 'denied'; message: string } {
  if (cause instanceof ApiError && cause.status === 403) {
    return { kind: 'denied', message: 'You do not have permission to view the audit trail.' };
  }
  if (
    cause instanceof ApiError &&
    (cause.kind === 'network' || cause.kind === 'timeout' || (cause.status ?? 0) >= 500)
  ) {
    return { kind: 'unavailable', message: 'Audit trail is unavailable. Try again.' };
  }
  return { kind: 'error', message: 'Unable to load the audit trail. Try again.' };
}

async function loadPage(
  requestedCursor: string | undefined,
  requestedPage: number,
  requestedHistory: Array<string | undefined>,
): Promise<void> {
  const generation = ++requestGeneration;
  cursor.value = requestedCursor;
  page.value = requestedPage;
  cursorHistory.value = requestedHistory;
  loading.value = true;
  error.value = null;
  try {
    const response = await cmsApiClient.listAuditEvents(buildQuery(true, requestedCursor));
    if (generation !== requestGeneration) return;
    events.value = response.items;
    nextCursor.value = response.pagination.nextCursor;
  } catch (cause) {
    if (generation !== requestGeneration) return;
    error.value = errorState(cause);
  } finally {
    if (generation === requestGeneration) loading.value = false;
  }
}

function applyFilters(): void {
  void loadPage(undefined, 1, []);
}

function resetFilters(): void {
  Object.assign(filters, emptyFilters());
  applyFilters();
}

function goNext(): void {
  if (!nextCursor.value || loading.value) return;
  void loadPage(nextCursor.value, page.value + 1, [...cursorHistory.value, cursor.value]);
}

function goPrevious(): void {
  if (page.value <= 1 || loading.value) return;
  void loadPage(
    cursorHistory.value[cursorHistory.value.length - 1],
    page.value - 1,
    cursorHistory.value.slice(0, -1),
  );
}

function changePageSize(value: string): void {
  const nextSize = Number(value);
  if (nextSize !== 20 && nextSize !== 50 && nextSize !== 100) return;
  pageSize.value = nextSize;
  void loadPage(undefined, 1, []);
}

function actorLabel(event: AuditListItem): string {
  if (event.actor.type === 'system') return 'System';
  if (!event.actor.available) return 'Actor unavailable';
  return event.actor.displayName || event.actor.email || 'Actor unavailable';
}

function actorEmail(event: AuditListItem): string | null {
  if (event.actor.type === 'system' || !event.actor.available) return null;
  return event.actor.email;
}

function targetLabel(event: AuditListItem): string {
  if (event.resource.type === null || event.resource.id === null) return 'Export summary';
  return `${event.resource.type} · ${event.resource.id}`;
}

function formatWib(value: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}:${part('second')} WIB (UTC+07:00)`;
}

function outcomeVariant(outcome: AuditListItem['outcome']): 'success' | 'danger' {
  return outcome === 'success' ? 'success' : 'danger';
}

function downloadBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'audit-trail.csv';
  link.click();
  URL.revokeObjectURL(url);
}

async function exportCsv(): Promise<void> {
  exporting.value = true;
  exportError.value = null;
  try {
    const query: AuditEventExportQuery = buildQuery(false);
    downloadBlob(await cmsApiClient.exportAuditEvents(query));
  } catch (cause) {
    exportError.value =
      cause instanceof ApiError && cause.status === 403
        ? 'You do not have permission to export the audit trail.'
        : 'Unable to export the audit trail. Try again.';
  } finally {
    exporting.value = false;
  }
}

onMounted(() => void loadPage(undefined, 1, []));
</script>

<template>
  <section aria-labelledby="audit-trail-title" class="w-full space-y-5">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <h2 id="audit-trail-title" class="text-lg font-semibold text-cms-foreground">
          Read-only history
        </h2>
        <p class="mt-1 max-w-2xl text-sm text-cms-muted">
          Approved CMS changes from generic audit history. Times show WIB (UTC+07:00).
        </p>
      </div>
      <CmsButton v-if="canExport" :loading="exporting" :disabled="loading" @click="exportCsv">
        Export CSV
      </CmsButton>
    </div>

    <p v-if="exportError" class="text-sm text-cms-destructive" role="alert">{{ exportError }}</p>

    <CmsCard title="Filter audit history" description="Dates use UTC boundaries.">
      <form
        class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
        @submit.prevent="applyFilters"
      >
        <CmsInput v-model="filters.from" label="From date (UTC)" type="date" />
        <CmsInput v-model="filters.to" label="To date (UTC)" type="date" />
        <CmsInput v-model="filters.actorId" label="Actor ID" placeholder="User UUID" />
        <CmsSelect v-model="filters.action" label="Action">
          <option value="">All actions</option>
          <option v-for="eventType in eventTypes" :key="eventType" :value="eventType">
            {{ auditEventLabels[eventType] }}
          </option>
        </CmsSelect>
        <CmsSelect v-model="filters.resourceType" label="Resource type">
          <option value="">All resources</option>
          <option v-for="resourceType in resourceTypes" :key="resourceType" :value="resourceType">
            {{ resourceType }}
          </option>
        </CmsSelect>
        <CmsInput v-model="filters.resourceId" label="Resource ID" />
        <CmsSelect v-model="filters.outcome" label="Outcome">
          <option value="">All outcomes</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
        </CmsSelect>
        <CmsInput
          v-model="filters.q"
          label="Search actor or target"
          placeholder="At least 2 characters"
        />
        <div class="flex flex-wrap items-end gap-3 md:col-span-2 xl:col-span-4">
          <CmsButton type="submit">Apply filters</CmsButton>
          <CmsButton type="button" variant="outline" @click="resetFilters">Reset filters</CmsButton>
        </div>
      </form>
    </CmsCard>

    <CmsCard title="Audit events">
      <FeedbackState
        v-if="error"
        :kind="error.kind"
        :message="error.message"
        :retryable="error.kind !== 'denied'"
        @retry="loadPage(cursor, page, cursorHistory)"
      />
      <CmsLoadingState v-else-if="loading" />
      <CmsEmptyState
        v-else-if="isEmpty"
        variant="plain"
        title="No audit events found"
        message="Try different dates or filters."
      />
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[64rem] border-collapse text-left text-sm">
          <caption class="sr-only">
            Audit event history
          </caption>
          <thead class="border-b border-cms-border">
            <tr>
              <th scope="col" class="px-4 py-3 font-medium text-cms-muted">Action</th>
              <th scope="col" class="px-4 py-3 font-medium text-cms-muted">Actor</th>
              <th scope="col" class="px-4 py-3 font-medium text-cms-muted">Target</th>
              <th scope="col" class="px-4 py-3 font-medium text-cms-muted">Outcome</th>
              <th scope="col" class="px-4 py-3 font-medium text-cms-muted">Occurred</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-cms-border">
            <tr v-for="event in events" :key="event.id" class="hover:bg-cms-muted-surface">
              <td class="max-w-[14rem] px-4 py-4 align-top">
                <RouterLink
                  :to="{ name: 'audit-event', params: { id: event.id } }"
                  class="inline-flex min-h-11 items-center font-medium text-cms-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cms-focus dark:text-cms-focus sm:min-h-0"
                >
                  {{ event.label }}
                </RouterLink>
                <p class="mt-1 break-all font-mono text-xs text-cms-muted">{{ event.eventType }}</p>
              </td>
              <td class="max-w-[16rem] px-4 py-4 align-top">
                <p class="break-words font-medium text-cms-foreground">{{ actorLabel(event) }}</p>
                <p v-if="actorEmail(event)" class="mt-1 break-all text-xs text-cms-muted">
                  {{ actorEmail(event) }}
                </p>
              </td>
              <td class="max-w-[18rem] px-4 py-4 align-top break-words text-cms-muted">
                {{ targetLabel(event) }}
              </td>
              <td class="px-4 py-4 align-top">
                <CmsBadge :variant="outcomeVariant(event.outcome)">{{ event.outcome }}</CmsBadge>
              </td>
              <td class="min-w-[13rem] px-4 py-4 align-top whitespace-nowrap text-cms-muted">
                {{ formatWib(event.createdAt) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        v-if="!loading && error === null && events.length > 0"
        class="mt-5 flex flex-col gap-3 border-t border-cms-border pt-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-sm text-cms-muted" aria-live="polite">
          Page {{ page }}, {{ events.length }} events shown
        </p>
        <div class="flex flex-wrap gap-2">
          <CmsButton variant="outline" :disabled="page <= 1" @click="goPrevious"
            >Previous</CmsButton
          >
          <CmsButton variant="outline" :disabled="nextCursor === null" @click="goNext"
            >Next</CmsButton
          >
          <label class="flex min-h-11 items-center gap-2 text-sm text-cms-muted">
            <span>Rows</span>
            <select
              :value="pageSize"
              aria-label="Rows per page"
              class="h-11 rounded-lg border border-cms-border bg-cms-surface px-3 text-cms-foreground outline-none focus-visible:ring-2 focus-visible:ring-cms-focus"
              @change="changePageSize(($event.target as HTMLSelectElement).value)"
            >
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </label>
        </div>
      </div>
    </CmsCard>
  </section>
</template>
