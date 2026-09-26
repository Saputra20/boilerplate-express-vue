<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ApiError } from '../api/client';
import type { ManagedUser, Role } from '../api/types';
import { cmsApiClient, useAuthStore } from '../stores/auth';
import CmsBadge from '../components/ui/CmsBadge.vue';
import CmsButton from '../components/ui/CmsButton.vue';
import CmsEmptyState from '../components/ui/CmsEmptyState.vue';
import CmsIcon from '../components/CmsIcon.vue';
import CmsInput from '../components/ui/CmsInput.vue';
import CmsLoadingState from '../components/ui/CmsLoadingState.vue';
import CmsModal from '../components/ui/CmsModal.vue';
import CmsPagination from '../components/ui/CmsPagination.vue';
import CmsSelect from '../components/ui/CmsSelect.vue';
import CmsTable from '../components/ui/CmsTable.vue';
import CmsSortableHeader from '../components/ui/CmsSortableHeader.vue';
import FeedbackState from '../components/FeedbackState.vue';

const auth = useAuthStore();
const users = ref<ManagedUser[]>([]);
const roles = ref<Role[]>([]);
const page = ref(1);
const pageSize = ref(10);
const totalPages = ref(0);
const total = ref(0);
const search = ref('');
const statusFilter = ref<'all' | 'active' | 'disabled'>('all');
const sort = ref<'email.asc' | 'email.desc' | 'createdAt.asc' | 'createdAt.desc'>('createdAt.desc');
const loading = ref(true);
const error = ref<string | null>(null);
const formError = ref<string | null>(null);
const modalOpen = ref(false);
const detailOpen = ref(false);
const deleteOpen = ref(false);
const saving = ref(false);
const deleting = ref(false);
const loadingRoles = ref(false);
const selected = ref<ManagedUser | null>(null);
const editing = ref<ManagedUser | null>(null);
const form = reactive({ email: '', roleId: '', status: 'active' as 'active' | 'disabled' });

const canCreate = computed(() => auth.can('user.create'));
const canUpdate = computed(() => auth.can('user.update'));
const canDelete = computed(() => auth.can('user.delete'));
const isEmpty = computed(() => !loading.value && error.value === null && users.value.length === 0);

async function loadUsers(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const response = await cmsApiClient.listUsers({
      page: page.value,
      limit: pageSize.value,
      search: search.value || undefined,
      status: statusFilter.value === 'all' ? undefined : statusFilter.value,
      sort: sort.value,
    });
    users.value = response.items;
    totalPages.value = response.pagination.totalPages;
    total.value = response.pagination.total;
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'Unable to load users.';
  } finally {
    loading.value = false;
  }
}

async function loadRoles(): Promise<void> {
  loadingRoles.value = true;
  try {
    const response = await cmsApiClient.listRoles({ page: 1, limit: 100, sort: 'name.asc' });
    roles.value = response.items;
  } catch (cause) {
    formError.value = cause instanceof ApiError ? cause.message : 'Unable to load roles.';
  } finally {
    loadingRoles.value = false;
  }
}

async function openCreate(): Promise<void> {
  selected.value = null;
  editing.value = null;
  Object.assign(form, { email: '', roleId: '', status: 'active' });
  formError.value = null;
  modalOpen.value = true;
  await loadRoles();
}

async function openEdit(user: ManagedUser): Promise<void> {
  selected.value = null;
  editing.value = user;
  Object.assign(form, {
    email: user.email,
    roleId: user.role?.id ?? '',
    status: user.status,
  });
  formError.value = null;
  modalOpen.value = true;
  await loadRoles();
}

async function save(): Promise<void> {
  saving.value = true;
  formError.value = null;
  try {
    if (editing.value) {
      await cmsApiClient.updateUser(editing.value.id, {
        email: form.email,
        roleId: form.roleId,
        status: form.status,
      });
    } else {
      await cmsApiClient.createUser({ email: form.email, roleId: form.roleId });
    }
    modalOpen.value = false;
    await loadUsers();
  } catch (cause) {
    formError.value = cause instanceof ApiError ? cause.message : 'Unable to save user.';
  } finally {
    saving.value = false;
  }
}

async function openDetails(user: ManagedUser): Promise<void> {
  try {
    selected.value = await cmsApiClient.getUser(user.id);
    detailOpen.value = true;
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'Unable to load user details.';
  }
}

function openDelete(user: ManagedUser): void {
  selected.value = user;
  formError.value = null;
  deleteOpen.value = true;
}

async function remove(): Promise<void> {
  if (!selected.value) return;
  deleting.value = true;
  formError.value = null;
  try {
    await cmsApiClient.deleteUser(selected.value.id);
    deleteOpen.value = false;
    if (users.value.length === 1 && page.value > 1) page.value -= 1;
    await loadUsers();
  } catch (cause) {
    formError.value = cause instanceof ApiError ? cause.message : 'Unable to delete user.';
  } finally {
    deleting.value = false;
  }
}

function searchUsers(): void {
  page.value = 1;
  void loadUsers();
}
function changeFilters(): void {
  page.value = 1;
  void loadUsers();
}
function changePageSize(nextPageSize: number): void {
  pageSize.value = nextPageSize;
  page.value = 1;
  void loadUsers();
}
function toggleSort(field: 'email' | 'createdAt'): void {
  const [currentField, direction] = sort.value.split('.');
  const nextDirection = currentField === field && direction === 'asc' ? 'desc' : 'asc';
  sort.value = `${field}.${nextDirection}` as typeof sort.value;
  page.value = 1;
  void loadUsers();
}
function changePage(nextPage: number): void {
  page.value = nextPage;
  void loadUsers();
}
function formatDate(value: Date | null): string {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(value) : '—';
}

onMounted(() => void loadUsers());
</script>

<template>
  <section class="w-full">
    <div v-if="canCreate" class="mb-4 flex flex-wrap items-center justify-end gap-3">
      <CmsButton @click="openCreate">Add user</CmsButton>
    </div>
    <CmsTable
      title="Users"
      :total-records="total"
      :page="page"
      :page-size="pageSize"
      item-label="users"
      :search-term="search"
      search-label="Search users by email"
      :show-state="Boolean(error) || loading || isEmpty"
      @update:search-term="search = $event"
      @update:page-size="changePageSize"
      @search="searchUsers"
    >
      <template #filters>
        <CmsSelect v-model="statusFilter" class="min-w-36" label="Status" @change="changeFilters">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </CmsSelect>
      </template>
      <template #state>
        <FeedbackState v-if="error" kind="error" :message="error" retryable @retry="loadUsers" />
        <CmsLoadingState v-else-if="loading" />
        <CmsEmptyState
          v-else
          variant="plain"
          title="No users found"
          message="Create a user or adjust your search and filters."
        />
      </template>
      <thead class="border-b border-cms-border">
        <tr>
          <CmsSortableHeader
            label="User"
            :direction="sort.startsWith('email.') ? (sort.endsWith('.asc') ? 'asc' : 'desc') : null"
            @sort="toggleSort('email')"
          />
          <th scope="col" class="px-5 py-3 text-left text-sm font-medium text-cms-muted sm:px-6">
            Role
          </th>
          <th scope="col" class="px-5 py-3 text-left text-sm font-medium text-cms-muted sm:px-6">
            Status
          </th>
          <CmsSortableHeader
            label="Created"
            :direction="
              sort.startsWith('createdAt.') ? (sort.endsWith('.asc') ? 'asc' : 'desc') : null
            "
            @sort="toggleSort('createdAt')"
          />
          <th scope="col" class="px-5 py-3 text-right text-sm font-medium text-cms-muted sm:px-6">
            Actions
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-cms-border">
        <tr v-for="user in users" :key="user.id">
          <td class="px-5 py-4">
            <button
              type="button"
              class="text-left font-medium text-cms-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cms-focus"
              @click="openDetails(user)"
            >
              {{ user.email }}
            </button>
            <p class="mt-1 text-xs text-cms-muted">
              {{ user.emailVerifiedAt ? 'Email verified' : 'Email not verified' }}
            </p>
          </td>
          <td class="px-5 py-4">
            <span v-if="user.role" class="text-sm text-cms-foreground">{{ user.role.name }}</span
            ><span v-else class="text-sm text-cms-muted">No role</span>
          </td>
          <td class="px-5 py-4">
            <CmsBadge :variant="user.status === 'active' ? 'success' : 'neutral'">{{
              user.status === 'active' ? 'Active' : 'Disabled'
            }}</CmsBadge>
          </td>
          <td class="px-5 py-4 text-sm text-cms-muted">{{ formatDate(user.createdAt) }}</td>
          <td class="px-5 py-4">
            <div class="flex justify-end gap-1">
              <button
                v-if="canDelete"
                type="button"
                class="grid min-h-11 min-w-11 place-items-center rounded-lg text-cms-muted outline-none hover:bg-cms-muted-surface hover:text-cms-destructive focus-visible:ring-2 focus-visible:ring-cms-focus"
                :aria-label="`Delete user ${user.email}`"
                @click="openDelete(user)"
              >
                <CmsIcon name="trash" />
              </button>
              <button
                v-if="canUpdate"
                type="button"
                class="grid min-h-11 min-w-11 place-items-center rounded-lg text-cms-muted outline-none hover:bg-cms-muted-surface hover:text-cms-foreground focus-visible:ring-2 focus-visible:ring-cms-focus"
                :aria-label="`Edit user ${user.email}`"
                @click="openEdit(user)"
              >
                <CmsIcon name="edit" />
              </button>
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
      :title="editing ? 'Edit user' : 'Add user'"
      @close="modalOpen = false"
      ><form class="space-y-4" @submit.prevent="save">
        <CmsInput v-model="form.email" label="Email" type="email" required /><CmsSelect
          v-model="form.roleId"
          label="Role"
          required
          :disabled="loadingRoles"
        >
          <option value="" disabled>
            {{ loadingRoles ? 'Loading roles…' : 'Select a role' }}
          </option>
          <option v-for="role in roles" :key="role.id" :value="role.id">
            {{ role.name }}
          </option> </CmsSelect
        ><CmsSelect v-if="editing" v-model="form.status" label="Status">
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </CmsSelect>
        <p v-else class="rounded-cms-sm bg-cms-muted-surface p-3 text-sm text-cms-muted">
          A default password will be assigned. The user must change it at first login.
        </p>
        <p v-if="formError" role="alert" class="text-sm text-cms-destructive">{{ formError }}</p>
        <div class="flex justify-end gap-3">
          <CmsButton type="button" variant="outline" @click="modalOpen = false">Cancel</CmsButton
          ><CmsButton type="submit" :loading="saving" :disabled="loadingRoles || roles.length === 0"
            >Save user</CmsButton
          >
        </div>
      </form></CmsModal
    >

    <CmsModal :open="detailOpen" title="User details" @close="detailOpen = false"
      ><dl v-if="selected" class="grid gap-4 sm:grid-cols-2">
        <div>
          <dt class="text-xs font-semibold uppercase text-cms-muted">Email</dt>
          <dd class="mt-1 break-all text-sm text-cms-foreground">{{ selected.email }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase text-cms-muted">Status</dt>
          <dd class="mt-1 text-sm text-cms-foreground">
            {{ selected.status === 'active' ? 'Active' : 'Disabled' }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase text-cms-muted">Role</dt>
          <dd class="mt-1 text-sm text-cms-foreground">{{ selected.role?.name ?? 'No role' }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase text-cms-muted">Email verification</dt>
          <dd class="mt-1 text-sm text-cms-foreground">
            {{ formatDate(selected.emailVerifiedAt) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase text-cms-muted">Last login</dt>
          <dd class="mt-1 text-sm text-cms-foreground">{{ formatDate(selected.lastLoginAt) }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase text-cms-muted">Created</dt>
          <dd class="mt-1 text-sm text-cms-foreground">{{ formatDate(selected.createdAt) }}</dd>
        </div>
        <p v-if="selected.mustChangePassword" class="sm:col-span-2 text-sm text-cms-muted">
          Password change is required at first login.
        </p>
      </dl>
      <template #footer
        ><CmsButton variant="outline" @click="detailOpen = false">Close</CmsButton></template
      ></CmsModal
    >

    <CmsModal :open="deleteOpen" title="Delete user" @close="deleteOpen = false"
      ><p class="text-sm leading-6 text-cms-muted">
        Delete <strong class="text-cms-foreground">{{ selected?.email }}</strong
        >? This will disable the account and revoke its active sessions.
      </p>
      <p v-if="formError" role="alert" class="mt-4 text-sm text-cms-destructive">{{ formError }}</p>
      <template #footer
        ><CmsButton variant="outline" @click="deleteOpen = false">Cancel</CmsButton
        ><CmsButton variant="destructive" :loading="deleting" @click="remove"
          >Delete user</CmsButton
        ></template
      ></CmsModal
    >
  </section>
</template>
