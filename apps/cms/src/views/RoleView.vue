<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '../api/client';
import type { Role } from '../api/types';
import CmsIcon from '../components/CmsIcon.vue';
import CmsButton from '../components/ui/CmsButton.vue';
import CmsEmptyState from '../components/ui/CmsEmptyState.vue';
import CmsModal from '../components/ui/CmsModal.vue';
import CmsPagination from '../components/ui/CmsPagination.vue';
import CmsTable from '../components/ui/CmsTable.vue';
import CmsSortableHeader from '../components/ui/CmsSortableHeader.vue';
import CmsBadge from '../components/ui/CmsBadge.vue';
import FeedbackState from '../components/FeedbackState.vue';
import CmsLoadingState from '../components/ui/CmsLoadingState.vue';
import { cmsApiClient, useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const roles = ref<Role[]>([]);
const page = ref(1);
const pageSize = ref(10);
const totalPages = ref(0);
const total = ref(0);
const search = ref('');
const sort = ref<'name.asc' | 'name.desc' | 'createdAt.asc' | 'createdAt.desc'>('createdAt.desc');
const loading = ref(true);
const error = ref<string | null>(null);
const deleteError = ref<string | null>(null);
const deleteOpen = ref(false);
const deleting = ref(false);
const deletingRole = ref<Role | null>(null);

const canCreate = computed(() => auth.can('role.create'));
const canUpdate = computed(() => auth.can('role.update'));
const canDelete = computed(() => auth.can('role.delete'));
const isEmpty = computed(() => !loading.value && !error.value && roles.value.length === 0);

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const response = await cmsApiClient.listRoles({
      page: page.value,
      limit: pageSize.value,
      search: search.value || undefined,
      sort: sort.value,
    });
    roles.value = response.items;
    totalPages.value = response.pagination.totalPages;
    total.value = response.pagination.total;
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'Unable to load roles.';
  } finally {
    loading.value = false;
  }
}

function openDelete(role: Role): void {
  deletingRole.value = role;
  deleteError.value = null;
  deleteOpen.value = true;
}

async function remove(): Promise<void> {
  if (!deletingRole.value) return;
  deleting.value = true;
  deleteError.value = null;
  try {
    await cmsApiClient.deleteRole(deletingRole.value.id);
    deleteOpen.value = false;
    if (roles.value.length === 1 && page.value > 1) page.value--;
    await load();
  } catch (cause) {
    deleteError.value = cause instanceof ApiError ? cause.message : 'Unable to delete role.';
  } finally {
    deleting.value = false;
  }
}

function searchRoles(): void {
  page.value = 1;
  void load();
}
function changePageSize(nextPageSize: number): void {
  pageSize.value = nextPageSize;
  page.value = 1;
  void load();
}
function toggleSort(field: 'name' | 'createdAt'): void {
  const [currentField, direction] = sort.value.split('.');
  const nextDirection = currentField === field && direction === 'asc' ? 'desc' : 'asc';
  sort.value = `${field}.${nextDirection}` as typeof sort.value;
  page.value = 1;
  void load();
}
function changePage(next: number): void {
  page.value = next;
  void load();
}
onMounted(() => void load());
</script>

<template>
  <section class="w-full">
    <div v-if="canCreate" class="mb-4 flex flex-wrap items-center justify-end gap-3">
      <CmsButton @click="router.push('/roles/create')">Add role</CmsButton>
    </div>
    <CmsTable
      title="Roles"
      :total-records="total"
      :page="page"
      :page-size="pageSize"
      item-label="roles"
      :search-term="search"
      search-label="Search roles"
      :show-state="Boolean(error) || loading || isEmpty"
      @update:search-term="search = $event"
      @update:page-size="changePageSize"
      @search="searchRoles"
    >
      <template #state>
        <FeedbackState v-if="error" kind="error" :message="error" retryable @retry="load" />
        <CmsLoadingState v-else-if="loading" />
        <CmsEmptyState
          v-else
          variant="plain"
          title="No roles found"
          message="Create a role or adjust your search."
        />
      </template>
      <thead class="border-b border-cms-border">
        <tr>
          <CmsSortableHeader
            label="Role"
            :direction="sort.startsWith('name.') ? (sort.endsWith('.asc') ? 'asc' : 'desc') : null"
            @sort="toggleSort('name')"
          />
          <th scope="col" class="px-5 py-3 text-left text-sm font-medium text-cms-muted sm:px-6">
            Permissions
          </th>
          <th scope="col" class="px-5 py-3 text-right text-sm font-medium text-cms-muted sm:px-6">
            Actions
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-cms-border">
        <tr v-for="role in roles" :key="role.id">
          <td class="px-5 py-4">
            <div class="flex flex-wrap items-center gap-2">
              <RouterLink
                :to="{ name: 'role-detail', params: { id: role.id } }"
                class="inline-flex min-h-11 items-center font-medium text-cms-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cms-focus dark:text-cms-focus"
              >
                {{ role.name }}
              </RouterLink>
              <CmsBadge v-if="role.code === 'admin'">Protected role</CmsBadge>
            </div>
            <p class="mt-1 font-mono text-xs text-cms-muted">{{ role.code }}</p>
            <p v-if="role.description" class="mt-1 text-xs text-cms-muted">
              {{ role.description }}
            </p>
          </td>
          <td class="px-5 py-4">
            <details v-if="role.permissionCodes.length" class="group">
              <summary
                class="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg text-sm text-cms-foreground hover:text-cms-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cms-focus [&::-webkit-details-marker]:hidden"
              >
                {{ role.permissionCodes.length }}
                {{ role.permissionCodes.length === 1 ? 'permission' : 'permissions' }}
                <CmsIcon
                  name="chevron-down"
                  :size="16"
                  class="text-cms-muted transition-transform group-open:rotate-180"
                />
              </summary>
              <ul class="grid max-w-xl grid-cols-1 gap-x-4 gap-y-1 pb-1 pt-2 sm:grid-cols-2">
                <li
                  v-for="code in role.permissionCodes"
                  :key="code"
                  class="break-all font-mono text-xs text-cms-muted"
                >
                  {{ code }}
                </li>
              </ul>
            </details>
            <span v-else class="text-sm text-cms-muted">No permissions assigned</span>
          </td>
          <td class="px-5 py-4">
            <div class="flex justify-end gap-1">
              <RouterLink
                :to="{ name: 'role-detail', params: { id: role.id } }"
                class="grid min-h-11 min-w-11 place-items-center rounded-lg text-cms-muted outline-none hover:bg-cms-muted-surface hover:text-cms-foreground focus-visible:ring-2 focus-visible:ring-cms-focus"
                :aria-label="`View details for role ${role.name}`"
              >
                <CmsIcon name="eye" />
              </RouterLink>
              <button
                v-if="canUpdate && role.code !== 'admin'"
                type="button"
                class="grid min-h-11 min-w-11 place-items-center rounded-lg text-cms-muted outline-none hover:bg-cms-muted-surface hover:text-cms-foreground focus-visible:ring-2 focus-visible:ring-cms-focus"
                :aria-label="`Edit role ${role.name}`"
                @click="router.push(`/roles/${role.id}/edit`)"
              >
                <CmsIcon name="edit" />
              </button>
              <button
                v-if="canDelete && role.code !== 'admin'"
                type="button"
                class="grid min-h-11 min-w-11 place-items-center rounded-lg text-cms-muted outline-none hover:bg-cms-muted-surface hover:text-cms-destructive focus-visible:ring-2 focus-visible:ring-cms-focus"
                :aria-label="`Delete role ${role.name}`"
                @click="openDelete(role)"
              >
                <CmsIcon name="trash" />
              </button>
            </div>
          </td>
        </tr>
      </tbody>
      <template #footer>
        <CmsPagination :page="page" :total-pages="totalPages" @change="changePage" />
      </template>
    </CmsTable>

    <CmsModal :open="deleteOpen" title="Delete role" @close="deleteOpen = false">
      <p class="text-sm leading-6 text-cms-muted">
        Delete <strong class="text-cms-foreground">{{ deletingRole?.name }}</strong
        >? Roles assigned to users cannot be deleted.
      </p>
      <p v-if="deleteError" role="alert" class="mt-4 text-sm text-cms-destructive">
        {{ deleteError }}
      </p>
      <template #footer>
        <CmsButton variant="outline" @click="deleteOpen = false">Cancel</CmsButton>
        <CmsButton variant="destructive" :loading="deleting" @click="remove">
          Delete role
        </CmsButton>
      </template>
    </CmsModal>
  </section>
</template>
