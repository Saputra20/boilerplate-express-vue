<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ApiError } from '../api/client';
import type { PermissionCatalogItem, Role } from '../api/types';
import CmsIcon from '../components/CmsIcon.vue';
import CmsButton from '../components/ui/CmsButton.vue';
import CmsEmptyState from '../components/ui/CmsEmptyState.vue';
import CmsInput from '../components/ui/CmsInput.vue';
import CmsLoadingState from '../components/ui/CmsLoadingState.vue';
import CmsModal from '../components/ui/CmsModal.vue';
import CmsPagination from '../components/ui/CmsPagination.vue';
import CmsTable from '../components/ui/CmsTable.vue';
import CmsSortableHeader from '../components/ui/CmsSortableHeader.vue';
import CmsBadge from '../components/ui/CmsBadge.vue';
import FeedbackState from '../components/FeedbackState.vue';
import { cmsApiClient, useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const roles = ref<Role[]>([]);
const permissions = ref<PermissionCatalogItem[]>([]);
const page = ref(1);
const pageSize = ref(10);
const totalPages = ref(0);
const total = ref(0);
const search = ref('');
const sort = ref<'name.asc' | 'name.desc' | 'createdAt.asc' | 'createdAt.desc'>('createdAt.desc');
const loading = ref(true);
const error = ref<string | null>(null);
const formError = ref<string | null>(null);
const modalOpen = ref(false);
const deleteOpen = ref(false);
const saving = ref(false);
const deleting = ref(false);
const editing = ref<Role | null>(null);
const form = reactive({ code: '', name: '', description: '', permissionCodes: [] as string[] });

const canCreate = computed(() => auth.can('role.create'));
const canUpdate = computed(() => auth.can('role.update'));
const canDelete = computed(() => auth.can('role.delete'));
const isEmpty = computed(() => !loading.value && !error.value && roles.value.length === 0);

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const [response, catalog] = await Promise.all([
      cmsApiClient.listRoles({
        page: page.value,
        limit: pageSize.value,
        search: search.value || undefined,
        sort: sort.value,
      }),
      cmsApiClient.listPermissionCatalog(),
    ]);
    roles.value = response.items;
    totalPages.value = response.pagination.totalPages;
    total.value = response.pagination.total;
    permissions.value = catalog;
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'Unable to load roles.';
  } finally {
    loading.value = false;
  }
}

function openCreate(): void {
  editing.value = null;
  Object.assign(form, { code: '', name: '', description: '', permissionCodes: [] });
  formError.value = null;
  modalOpen.value = true;
}

function openEdit(role: Role): void {
  editing.value = role;
  Object.assign(form, {
    code: role.code,
    name: role.name,
    description: role.description ?? '',
    permissionCodes: [...role.permissionCodes],
  });
  formError.value = null;
  modalOpen.value = true;
}

async function save(): Promise<void> {
  saving.value = true;
  formError.value = null;
  try {
    const description = form.description || null;
    if (editing.value) {
      await cmsApiClient.updateRole(editing.value.id, {
        name: form.name,
        description,
        permissionCodes: form.permissionCodes,
      });
    } else {
      await cmsApiClient.createRole({
        code: form.code,
        name: form.name,
        description,
        permissionCodes: form.permissionCodes,
      });
    }
    modalOpen.value = false;
    await load();
  } catch (cause) {
    formError.value = cause instanceof ApiError ? cause.message : 'Unable to save role.';
  } finally {
    saving.value = false;
  }
}

function openDelete(role: Role): void {
  editing.value = role;
  formError.value = null;
  deleteOpen.value = true;
}

async function remove(): Promise<void> {
  if (!editing.value) return;
  deleting.value = true;
  formError.value = null;
  try {
    await cmsApiClient.deleteRole(editing.value.id);
    deleteOpen.value = false;
    if (roles.value.length === 1 && page.value > 1) page.value--;
    await load();
  } catch (cause) {
    formError.value = cause instanceof ApiError ? cause.message : 'Unable to delete role.';
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
function togglePermission(code: string, checked: boolean): void {
  form.permissionCodes = checked
    ? [...new Set([...form.permissionCodes, code])]
    : form.permissionCodes.filter((item) => item !== code);
}
onMounted(() => void load());
</script>

<template>
  <section class="w-full">
    <div v-if="canCreate" class="mb-4 flex flex-wrap items-center justify-end gap-3">
      <CmsButton @click="openCreate">Add role</CmsButton>
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
            Permission codes
          </th>
          <th scope="col" class="px-5 py-3 text-right text-sm font-medium text-cms-muted sm:px-6">
            Actions
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-cms-border">
        <tr v-for="role in roles" :key="role.id">
          <td class="px-5 py-4">
            <p class="font-medium text-cms-foreground">{{ role.name }}</p>
            <p class="mt-1 font-mono text-xs text-cms-muted">{{ role.code }}</p>
            <p v-if="role.description" class="mt-1 text-xs text-cms-muted">
              {{ role.description }}
            </p>
          </td>
          <td class="px-5 py-4">
            <div class="flex max-w-xl flex-wrap gap-1.5">
              <span
                v-for="code in role.permissionCodes"
                :key="code"
                class="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-xs font-medium text-gray-600 dark:bg-white/[0.03] dark:text-gray-400"
                >{{ code }}</span
              ><span v-if="!role.permissionCodes.length" class="text-xs text-cms-muted"
                >No permissions assigned</span
              >
            </div>
          </td>
          <td class="px-5 py-4">
            <div class="flex justify-end gap-1">
              <CmsBadge v-if="role.code === 'admin'">Protected role</CmsBadge>
              <template v-else>
                <button
                  v-if="canDelete"
                  type="button"
                  class="grid min-h-11 min-w-11 place-items-center rounded-lg text-cms-muted outline-none hover:bg-cms-muted-surface hover:text-cms-destructive focus-visible:ring-2 focus-visible:ring-cms-focus"
                  :aria-label="`Delete role ${role.name}`"
                  @click="openDelete(role)"
                >
                  <CmsIcon name="trash" />
                </button>
                <button
                  v-if="canUpdate"
                  type="button"
                  class="grid min-h-11 min-w-11 place-items-center rounded-lg text-cms-muted outline-none hover:bg-cms-muted-surface hover:text-cms-foreground focus-visible:ring-2 focus-visible:ring-cms-focus"
                  :aria-label="`Edit role ${role.name}`"
                  @click="openEdit(role)"
                >
                  <CmsIcon name="edit" />
                </button>
              </template>
            </div>
          </td>
        </tr>
      </tbody>
      <template #footer>
        <CmsPagination :page="page" :total-pages="totalPages" @change="changePage" />
      </template>
    </CmsTable>

    <CmsModal
      :open="modalOpen"
      :title="editing ? 'Edit role' : 'Add role'"
      @close="modalOpen = false"
      ><form class="space-y-4" @submit.prevent="save">
        <CmsInput v-if="!editing" v-model="form.code" label="Code" required /><CmsInput
          v-model="form.name"
          label="Name"
          required
        /><CmsInput v-model="form.description" label="Description" placeholder="Optional" />
        <fieldset
          class="max-h-64 space-y-1 overflow-y-auto rounded-cms-sm border border-cms-border p-3"
        >
          <legend class="px-1 text-sm font-medium text-cms-foreground">Permissions</legend>
          <label
            v-for="permission in permissions"
            :key="permission.id"
            class="flex min-h-10 items-start gap-3 py-2 text-sm"
            ><input
              type="checkbox"
              class="mt-1 size-4 accent-cms-primary focus-visible:ring-2 focus-visible:ring-cms-focus"
              :checked="form.permissionCodes.includes(permission.code)"
              @change="
                togglePermission(permission.code, ($event.target as HTMLInputElement).checked)
              "
            /><span
              ><span class="font-mono text-xs">{{ permission.code }}</span
              ><span v-if="permission.description" class="mt-0.5 block text-xs text-cms-muted">{{
                permission.description
              }}</span></span
            ></label
          >
          <p v-if="permissions.length === 0" class="text-sm text-cms-muted">
            No permissions are available.
          </p>
        </fieldset>
        <p v-if="formError" role="alert" class="text-sm text-cms-destructive">{{ formError }}</p>
        <div class="flex justify-end gap-3">
          <CmsButton type="button" variant="outline" @click="modalOpen = false">Cancel</CmsButton
          ><CmsButton type="submit" :loading="saving">Save role</CmsButton>
        </div>
      </form></CmsModal
    >

    <CmsModal :open="deleteOpen" title="Delete role" @close="deleteOpen = false"
      ><p class="text-sm leading-6 text-cms-muted">
        Delete <strong class="text-cms-foreground">{{ editing?.name }}</strong
        >? Roles assigned to users cannot be deleted.
      </p>
      <p v-if="formError" role="alert" class="mt-4 text-sm text-cms-destructive">{{ formError }}</p>
      <template #footer
        ><CmsButton variant="outline" @click="deleteOpen = false">Cancel</CmsButton
        ><CmsButton variant="destructive" :loading="deleting" @click="remove"
          >Delete role</CmsButton
        ></template
      ></CmsModal
    >
  </section>
</template>
