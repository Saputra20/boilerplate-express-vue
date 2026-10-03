<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '../api/client';
import type { AuditDetail } from '../api/types';
import FeedbackState from '../components/FeedbackState.vue';
import CmsBadge from '../components/ui/CmsBadge.vue';
import CmsButton from '../components/ui/CmsButton.vue';
import CmsCard from '../components/ui/CmsCard.vue';
import CmsEmptyState from '../components/ui/CmsEmptyState.vue';
import CmsLoadingState from '../components/ui/CmsLoadingState.vue';
import { cmsApiClient } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const event = ref<AuditDetail | null>(null);
const loading = ref(true);
let requestGeneration = 0;
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

function actorLabel(value: AuditDetail): string {
  if (value.actor.type === 'system') return 'System';
  if (!value.actor.available) return 'Actor unavailable';
  return value.actor.displayName || value.actor.email || 'Actor unavailable';
}

function targetLabel(value: AuditDetail): string {
  if (value.resource.type === null || value.resource.id === null)
    return 'No single target resource';
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
</script>

<template>
  <section aria-labelledby="audit-event-title" class="w-full space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <CmsButton variant="outline" @click="router.push('/audit-trail')"
        >Back to audit trail</CmsButton
      >
      <p class="text-sm text-cms-muted">Read-only event detail</p>
    </div>

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
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0">
          <h2 id="audit-event-title" class="break-words text-xl font-semibold text-cms-foreground">
            {{ event.label }}
          </h2>
          <p class="mt-1 break-all font-mono text-xs text-cms-muted">{{ event.eventType }}</p>
        </div>
        <CmsBadge :variant="outcomeVariant(event.outcome)">{{ event.outcome }}</CmsBadge>
      </header>

      <CmsCard title="Event details">
        <dl class="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          <div>
            <dt class="text-sm text-cms-muted">Actor</dt>
            <dd class="mt-1 break-words font-medium text-cms-foreground">
              {{ actorLabel(event) }}
            </dd>
            <dd v-if="event.actor.email" class="mt-1 break-all text-sm text-cms-muted">
              {{ event.actor.email }}
            </dd>
            <dd v-if="event.actor.id" class="mt-1 break-all font-mono text-xs text-cms-muted">
              {{ event.actor.id }}
            </dd>
          </div>
          <div>
            <dt class="text-sm text-cms-muted">Target</dt>
            <dd class="mt-1 break-words font-medium text-cms-foreground">
              {{ targetLabel(event) }}
            </dd>
          </div>
          <div>
            <dt class="text-sm text-cms-muted">Occurred</dt>
            <dd class="mt-1 break-words font-medium text-cms-foreground">
              {{ formatWib(event.createdAt) }}
            </dd>
          </div>
          <div>
            <dt class="text-sm text-cms-muted">Request ID</dt>
            <dd class="mt-1 break-all font-mono text-xs text-cms-foreground">
              {{ event.requestId ?? 'Not recorded' }}
            </dd>
          </div>
        </dl>
      </CmsCard>

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

      <CmsCard v-if="event.exportSummary" title="Export summary">
        <dl class="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          <div>
            <dt class="text-sm text-cms-muted">Rows exported</dt>
            <dd class="mt-1 font-medium tabular-nums text-cms-foreground">
              {{ event.exportSummary.rowCount.toLocaleString() }}
            </dd>
          </div>
          <div>
            <dt class="text-sm text-cms-muted">Search applied</dt>
            <dd class="mt-1 font-medium text-cms-foreground">
              {{ event.exportSummary.searchApplied ? 'Yes' : 'No' }}
            </dd>
          </div>
          <div>
            <dt class="text-sm text-cms-muted">Date range</dt>
            <dd class="mt-1 break-words text-sm text-cms-foreground">
              {{ formatWib(event.exportSummary.from) }} to {{ formatWib(event.exportSummary.to) }}
            </dd>
          </div>
          <div>
            <dt class="text-sm text-cms-muted">Filters</dt>
            <dd class="mt-1 break-words text-sm text-cms-foreground">
              <span v-if="!Object.values(event.exportSummary.filters).some(Boolean)">None</span>
              <span v-else>
                {{
                  Object.entries(event.exportSummary.filters)
                    .filter(([, value]) => value)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(', ')
                }}
              </span>
            </dd>
          </div>
        </dl>
      </CmsCard>
    </template>
  </section>
</template>
