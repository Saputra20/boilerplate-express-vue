<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ApiError } from '../api/client';
import type { PermissionCatalogItem, Role } from '../api/types';
import FeedbackState from '../components/FeedbackState.vue';
import RolePermissionSelector from '../components/RolePermissionSelector.vue';
import CmsBadge from '../components/ui/CmsBadge.vue';
import CmsCard from '../components/ui/CmsCard.vue';
import CmsEmptyState from '../components/ui/CmsEmptyState.vue';
import CmsInput from '../components/ui/CmsInput.vue';
import CmsLoadingState from '../components/ui/CmsLoadingState.vue';
import { cmsApiClient } from '../stores/auth';

const props = defineProps<{ roleId: string }>();
const role = ref<Role | null>(null);
const permissions = ref<PermissionCatalogItem[]>([]);
const unlistedCodes = computed(() => {
  const catalogCodes = new Set(permissions.value.map((permission) => permission.code));
  return role.value?.permissionCodes.filter((code) => !catalogCodes.has(code)) ?? [];
});
const loading = ref(true);
const error = ref<'not-found' | 'denied' | 'unavailable' | null>(null);
let requestGeneration = 0;

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(value);
}

async function load(): Promise<void> {
  const generation = ++requestGeneration;
  loading.value = true;
  error.value = null;
  role.value = null;
  try {
    const [roleResult, catalogResult] = await Promise.allSettled([
      cmsApiClient.getRole(props.roleId),
      cmsApiClient.listPermissionCatalog(),
    ]);
    if (roleResult.status === 'rejected') throw roleResult.reason;
    if (catalogResult.status === 'rejected') throw catalogResult.reason;
    if (generation === requestGeneration) {
      role.value = roleResult.value;
      permissions.value = catalogResult.value;
    }
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
  () => props.roleId,
  () => void load(),
  { immediate: true },
);
</script>

<template>
  <section aria-label="Role details" class="w-full space-y-5">
    <RouterLink
      to="/roles"
      class="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-cms-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cms-focus dark:text-cms-focus"
    >
      Back to Roles
    </RouterLink>

    <CmsLoadingState v-if="loading" />
    <CmsEmptyState
      v-else-if="error === 'not-found'"
      title="Role not found"
      message="This role is unavailable."
    />
    <FeedbackState
      v-else-if="error"
      :kind="error === 'denied' ? 'denied' : 'unavailable'"
      :message="
        error === 'denied'
          ? 'You do not have permission to view this role.'
          : 'Unable to load role details. Try again.'
      "
      :retryable="error !== 'denied'"
      @retry="load"
    />
    <template v-else-if="role">
      <header class="flex flex-wrap items-center gap-3">
        <h2 class="break-words text-xl font-semibold text-cms-foreground">{{ role.name }}</h2>
        <CmsBadge v-if="role.code === 'admin'">Protected role</CmsBadge>
      </header>

      <CmsCard title="Role information">
        <div class="space-y-4">
          <CmsInput :model-value="role.code" label="Code" read-only />
          <CmsInput :model-value="role.name" label="Name" read-only />
          <CmsInput :model-value="role.description ?? ''" label="Description" read-only />
        </div>
      </CmsCard>

      <CmsCard title="Permissions">
        <RolePermissionSelector
          :model-value="role.permissionCodes"
          :catalog="permissions"
          read-only
        />
        <div v-if="unlistedCodes.length" class="mt-5 border-t border-cms-border pt-4">
          <p class="text-sm font-medium text-cms-foreground">Other assigned codes</p>
          <ul class="mt-2 grid gap-2 sm:grid-cols-2">
            <li v-for="code in unlistedCodes" :key="code" class="break-all font-mono text-sm">
              {{ code }}
            </li>
          </ul>
        </div>
      </CmsCard>

      <dl class="flex flex-wrap gap-x-8 gap-y-3 text-sm text-cms-muted">
        <div class="flex gap-2">
          <dt>Created</dt>
          <dd class="text-cms-foreground">{{ formatDate(role.createdAt) }}</dd>
        </div>
        <div class="flex gap-2">
          <dt>Updated</dt>
          <dd class="text-cms-foreground">{{ formatDate(role.updatedAt) }}</dd>
        </div>
      </dl>
    </template>
  </section>
</template>
