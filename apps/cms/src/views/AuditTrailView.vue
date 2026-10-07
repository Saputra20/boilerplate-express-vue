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
import CmsIcon from '../components/CmsIcon.vue';
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
const pageSize = ref<10 | 20 | 50 | 100>(10);
const total = ref(0);
const totalPages = ref(0);
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
const firstRecord = computed(() => (page.value - 1) * pageSize.value + 1);
const lastRecord = computed(() => firstRecord.value + events.value.length - 1);
const canExport = computed(() => auth.can('audit.read') && auth.can('audit.export'));
const eventTypes = auditEventTypeSchema.options;
const resourceTypes = ['category', 'role', 'user'] as const;

function toInstant(value: string, endOfDay = false): string | undefined {
  if (!value) return undefined;
  const suffix = endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z';
  return new Date(`${value}${suffix}`).toISOString();
}

function buildQuery(withPagination: boolean, queryPage = 1): AuditEventQuery {
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
    query.page = queryPage;
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

async function loadPage(requestedPage: number): Promise<void> {
  const generation = ++requestGeneration;
  page.value = requestedPage;
  loading.value = true;
  error.value = null;
  try {
    const response = await cmsApiClient.listAuditEvents(buildQuery(true, requestedPage));
    if (generation !== requestGeneration) return;
    if (response.pagination.totalPages > 0 && requestedPage > response.pagination.totalPages) {
      void loadPage(response.pagination.totalPages);
      return;
    }
    events.value = response.items;
    page.value = response.pagination.page;
    total.value = response.pagination.total;
    totalPages.value = response.pagination.totalPages;
  } catch (cause) {
    if (generation !== requestGeneration) return;
    error.value = errorState(cause);
  } finally {
    if (generation === requestGeneration) loading.value = false;
  }
}

function applyFilters(): void {
  void loadPage(1);
}

function resetFilters(): void {
  Object.assign(filters, emptyFilters());
  applyFilters();
}

function goNext(): void {
  if (page.value >= totalPages.value || loading.value) return;
  void loadPage(page.value + 1);
}

function goPrevious(): void {
  if (page.value <= 1 || loading.value) return;
  void loadPage(page.value - 1);
}

function changePageSize(value: string): void {
  const nextSize = Number(value);
  if (nextSize !== 10 && nextSize !== 20 && nextSize !== 50 && nextSize !== 100) return;
  pageSize.value = nextSize as 10 | 20 | 50 | 100;
  void loadPage(1);
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

onMounted(() => void loadPage(1));
</script>

<template>
  <section aria-label="Audit Trail" class="w-full space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm text-cms-muted">Event times are shown in WIB (UTC+07:00).</p>
      <CmsButton v-if="canExport" :loading="exporting" :disabled="loading" @click="exportCsv">
        Export CSV
      </CmsButton>
    </div>

    <p v-if="exportError" class="text-sm text-cms-destructive" role="alert">{{ exportError }}</p>

    <CmsCard>
      <form class="space-y-4" @submit.prevent="applyFilters">
        <h2 class="text-base font-medium text-cms-foreground">Filters</h2>
        <fieldset>
          <legend class="sr-only">Date range and search</legend>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <CmsInput v-model="filters.from" label="From date (UTC)" type="date" />
            <CmsInput v-model="filters.to" label="To date (UTC)" type="date" />
            <div class="xl:col-span-2">
              <CmsInput
                id="audit-search"
                v-model="filters.q"
                label="Search actor or target (2–120 characters)"
                placeholder="Name, resource type, or ID"
                :max-length="120"
              />
            </div>
          </div>
        </fieldset>

        <fieldset class="border-t border-cms-border pt-4">
          <legend class="sr-only">Exact filters</legend>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <CmsInput v-model="filters.actorId" label="Actor ID" placeholder="User UUID" />
            <CmsSelect v-model="filters.action" label="Action">
              <option value="">All actions</option>
              <option v-for="eventType in eventTypes" :key="eventType" :value="eventType">
                {{ auditEventLabels[eventType] }}
              </option>
            </CmsSelect>
            <CmsSelect v-model="filters.resourceType" label="Resource type">
              <option value="">All resources</option>
              <option
                v-for="resourceType in resourceTypes"
                :key="resourceType"
                :value="resourceType"
              >
                {{ resourceType }}
              </option>
            </CmsSelect>
            <CmsInput v-model="filters.resourceId" label="Resource ID" />
            <CmsSelect v-model="filters.outcome" label="Outcome">
              <option value="">All outcomes</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
            </CmsSelect>
          </div>
        </fieldset>

        <div class="flex flex-wrap gap-3 pt-1 sm:justify-end">
          <CmsButton type="submit">Apply filters</CmsButton>
          <CmsButton type="button" variant="outline" @click="resetFilters">Clear filters</CmsButton>
        </div>
      </form>
    </CmsCard>

    <CmsCard title="Events">
      <FeedbackState
        v-if="error"
        :kind="error.kind"
        :message="error.message"
        :retryable="error.kind !== 'denied'"
        @retry="loadPage(page)"
      />
      <CmsLoadingState v-else-if="loading" />
      <CmsEmptyState
        v-else-if="isEmpty"
        variant="plain"
        title="No audit events found"
        message="Try different dates or filters."
      />
      <div v-else class="overflow-hidden rounded-2xl border border-cms-border">
        <ul aria-label="Audit events" class="divide-y divide-cms-border px-4 sm:px-5 2xl:hidden">
          <li v-for="event in events" :key="event.id" class="py-4">
            <div class="flex items-start justify-between gap-3">
              <RouterLink
                :to="{ name: 'audit-event', params: { id: event.id } }"
                class="inline-flex min-h-11 min-w-0 flex-col justify-center font-medium text-cms-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cms-focus dark:text-cms-focus"
              >
                <span>{{ event.label }}</span>
                <span class="mt-0.5 break-words font-mono text-xs font-normal text-cms-muted">{{
                  event.eventType
                }}</span>
              </RouterLink>
              <CmsBadge class="shrink-0 capitalize" :variant="outcomeVariant(event.outcome)">
                {{ event.outcome }}
              </CmsBadge>
            </div>
            <dl class="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt class="text-xs font-medium text-cms-muted">Actor</dt>
                <dd class="mt-1 min-w-0 break-words font-medium text-cms-foreground">
                  {{ actorLabel(event) }}
                </dd>
                <dd
                  v-if="actorEmail(event)"
                  class="mt-0.5 [overflow-wrap:anywhere] text-xs text-cms-muted"
                >
                  {{ actorEmail(event) }}
                </dd>
              </div>
              <div>
                <dt class="text-xs font-medium text-cms-muted">Target</dt>
                <dd class="mt-1 [overflow-wrap:anywhere] text-cms-foreground">
                  {{ targetLabel(event) }}
                </dd>
              </div>
              <div class="sm:col-span-2">
                <dt class="text-xs font-medium text-cms-muted">Occurred</dt>
                <dd class="mt-1 [overflow-wrap:anywhere] text-cms-foreground">
                  {{ formatWib(event.createdAt) }}
                </dd>
              </div>
            </dl>
            <RouterLink
              :to="{ name: 'audit-event', params: { id: event.id } }"
              class="mt-3 inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-cms-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cms-focus dark:text-cms-focus"
              :aria-label="`View details for ${event.label}`"
            >
              View details
            </RouterLink>
          </li>
        </ul>
        <div class="hidden overflow-x-auto 2xl:block">
          <table
            class="w-full min-w-[56rem] border-collapse text-left text-sm [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-cms-muted-surface [&_td]:align-middle [&_td+td]:border-l [&_td+td]:border-cms-border/60 [&_th]:whitespace-nowrap [&_th+th]:border-l [&_th+th]:border-cms-border/60"
          >
            <caption class="sr-only">
              Audit event history
            </caption>
            <thead class="border-b border-cms-border">
              <tr>
                <th scope="col" class="px-5 py-3 font-medium text-cms-muted">Action</th>
                <th scope="col" class="px-5 py-3 font-medium text-cms-muted">Actor</th>
                <th scope="col" class="px-5 py-3 font-medium text-cms-muted">Target</th>
                <th scope="col" class="px-5 py-3 font-medium text-cms-muted">Outcome</th>
                <th scope="col" class="px-5 py-3 font-medium text-cms-muted">Occurred</th>
                <th scope="col" class="px-5 py-3 text-right font-medium text-cms-muted">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-cms-border">
              <tr v-for="event in events" :key="event.id">
                <td class="max-w-[14rem] px-5 py-4">
                  <RouterLink
                    :to="{ name: 'audit-event', params: { id: event.id } }"
                    class="inline-flex min-h-11 items-center font-medium text-cms-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cms-focus dark:text-cms-focus sm:min-h-0"
                  >
                    {{ event.label }}
                  </RouterLink>
                  <p class="mt-1 break-all font-mono text-xs text-cms-muted">
                    {{ event.eventType }}
                  </p>
                </td>
                <td class="max-w-[16rem] px-5 py-4">
                  <p class="break-words font-medium text-cms-foreground">{{ actorLabel(event) }}</p>
                  <p v-if="actorEmail(event)" class="mt-1 break-all text-xs text-cms-muted">
                    {{ actorEmail(event) }}
                  </p>
                </td>
                <td class="max-w-[18rem] break-words px-5 py-4 text-cms-muted">
                  {{ targetLabel(event) }}
                </td>
                <td class="px-5 py-4">
                  <CmsBadge :variant="outcomeVariant(event.outcome)">{{ event.outcome }}</CmsBadge>
                </td>
                <td class="min-w-[13rem] whitespace-nowrap px-5 py-4 text-cms-muted">
                  {{ formatWib(event.createdAt) }}
                </td>
                <td class="px-5 py-4">
                  <RouterLink
                    :to="{ name: 'audit-event', params: { id: event.id } }"
                    class="ml-auto flex h-11 w-11 items-center justify-center rounded-lg text-cms-muted outline-none hover:bg-cms-muted-surface hover:text-cms-foreground focus-visible:ring-2 focus-visible:ring-cms-focus"
                    :aria-label="`View details for ${event.label}`"
                  >
                    <CmsIcon name="eye" />
                  </RouterLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <footer
          class="flex flex-col gap-3 border-t border-cms-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
        >
          <p class="text-sm text-cms-muted" aria-live="polite">
            Showing {{ firstRecord }} to {{ lastRecord }} of {{ total }} events
          </p>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <label
              class="flex min-h-11 items-center justify-between gap-2 text-sm text-cms-muted sm:justify-start"
            >
              <span>Rows per page</span>
              <select
                :value="pageSize"
                aria-label="Rows per page"
                class="h-11 rounded-lg border border-cms-border bg-cms-surface px-3 text-cms-foreground outline-none focus-visible:ring-2 focus-visible:ring-cms-focus"
                @change="changePageSize(($event.target as HTMLSelectElement).value)"
              >
                <option :value="10">10</option>
                <option :value="20">20</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
            </label>
            <div class="flex gap-2">
              <CmsButton
                class="flex-1 sm:flex-none"
                variant="outline"
                :disabled="page <= 1"
                @click="goPrevious"
                >Previous</CmsButton
              >
              <CmsButton
                class="flex-1 sm:flex-none"
                variant="outline"
                :disabled="page >= totalPages"
                @click="goNext"
                >Next</CmsButton
              >
            </div>
          </div>
        </footer>
      </div>
    </CmsCard>
  </section>
</template>
