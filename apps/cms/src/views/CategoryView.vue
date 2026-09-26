<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ApiError } from '../api/client';
import type { Category } from '../api/types';
import { cmsApiClient } from '../stores/auth';
import { useAuthStore } from '../stores/auth';
import CmsBadge from '../components/ui/CmsBadge.vue';
import CmsButton from '../components/ui/CmsButton.vue';
import CmsCheckbox from '../components/ui/CmsCheckbox.vue';
import CmsEmptyState from '../components/ui/CmsEmptyState.vue';
import CmsInput from '../components/ui/CmsInput.vue';
import CmsLoadingState from '../components/ui/CmsLoadingState.vue';
import CmsModal from '../components/ui/CmsModal.vue';
import CmsPagination from '../components/ui/CmsPagination.vue';
import CmsTable from '../components/ui/CmsTable.vue';
import CmsSortableHeader from '../components/ui/CmsSortableHeader.vue';
import FeedbackState from '../components/FeedbackState.vue';

const auth = useAuthStore();
const categories = ref<Category[]>([]);
const page = ref(1);
const pageSize = ref(10);
const totalPages = ref(0);
const total = ref(0);
const search = ref('');
const sort = ref<'name.asc' | 'name.desc' | 'createdAt.asc' | 'createdAt.desc'>('createdAt.desc');
const loading = ref(true);
const error = ref<string | null>(null);
const saving = ref(false);
const deleting = ref(false);
const formError = ref<string | null>(null);
const modalOpen = ref(false);
const deleteModalOpen = ref(false);
const editing = ref<Category | null>(null);
const form = reactive({ name: '', slug: '', description: '', isActive: true });

const canCreate = computed(() => auth.can('category.create'));
const canUpdate = computed(() => auth.can('category.update'));
const canDelete = computed(() => auth.can('category.delete'));
const isEmpty = computed(
  () => !loading.value && error.value === null && categories.value.length === 0,
);

function resetForm(category?: Category): void {
  editing.value = category ?? null;
  form.name = category?.name ?? '';
  form.slug = category?.slug ?? '';
  form.description = category?.description ?? '';
  form.isActive = category?.isActive ?? true;
  formError.value = null;
}

async function loadCategories(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const response = await cmsApiClient.listCategories({
      page: page.value,
      limit: pageSize.value,
      search: search.value || undefined,
      sort: sort.value,
    });
    categories.value = response.items;
    totalPages.value = response.pagination.totalPages;
    total.value = response.pagination.total;
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'Unable to load categories.';
  } finally {
    loading.value = false;
  }
}

function openCreate(): void {
  resetForm();
  modalOpen.value = true;
}

function openEdit(category: Category): void {
  resetForm(category);
  modalOpen.value = true;
}

async function save(): Promise<void> {
  saving.value = true;
  formError.value = null;
  try {
    const payload = {
      name: form.name,
      slug: form.slug,
      description: form.description || null,
      isActive: form.isActive,
    };
    if (editing.value) await cmsApiClient.updateCategory(editing.value.id, payload);
    else await cmsApiClient.createCategory(payload);
    modalOpen.value = false;
    await loadCategories();
  } catch (cause) {
    formError.value = cause instanceof ApiError ? cause.message : 'Unable to save category.';
  } finally {
    saving.value = false;
  }
}

function openDelete(category: Category): void {
  editing.value = category;
  deleteModalOpen.value = true;
}

async function remove(): Promise<void> {
  if (!editing.value) return;
  deleting.value = true;
  formError.value = null;
  try {
    await cmsApiClient.deleteCategory(editing.value.id);
    deleteModalOpen.value = false;
    if (categories.value.length === 1 && page.value > 1) page.value -= 1;
    await loadCategories();
  } catch (cause) {
    formError.value = cause instanceof ApiError ? cause.message : 'Unable to delete category.';
  } finally {
    deleting.value = false;
  }
}

function submitSearch(): void {
  page.value = 1;
  void loadCategories();
}

function changePage(nextPage: number): void {
  page.value = nextPage;
  void loadCategories();
}

function changePageSize(nextPageSize: number): void {
  pageSize.value = nextPageSize;
  page.value = 1;
  void loadCategories();
}

function toggleNameSort(): void {
  const nextDirection = sort.value === 'name.asc' ? 'desc' : 'asc';
  sort.value = `name.${nextDirection}`;
  page.value = 1;
  void loadCategories();
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(value);
}

onMounted(() => void loadCategories());
</script>

<template>
  <section class="w-full">
    <div v-if="canCreate" class="mb-4 flex flex-wrap items-center justify-end gap-3">
      <CmsButton @click="openCreate">Add category</CmsButton>
    </div>

    <CmsTable
      title="Categories"
      :total-records="total"
      :page="page"
      :page-size="pageSize"
      item-label="categories"
      :search-term="search"
      search-label="Search categories by name or slug"
      :show-state="Boolean(error) || loading || isEmpty"
      @update:search-term="search = $event"
      @update:page-size="changePageSize"
      @search="submitSearch"
    >
      <template #state>
        <FeedbackState
          v-if="error"
          kind="error"
          :message="error"
          retryable
          @retry="loadCategories"
        />
        <CmsLoadingState v-else-if="loading" />
        <CmsEmptyState
          v-else
          variant="plain"
          title="No categories found"
          message="Create a category or adjust your search."
        />
      </template>
      <thead class="border-b border-cms-border">
        <tr>
          <CmsSortableHeader
            label="Name"
            :direction="sort.startsWith('name.') ? (sort.endsWith('.asc') ? 'asc' : 'desc') : null"
            @sort="toggleNameSort"
          />
          <th scope="col" class="px-5 py-3 text-left text-sm font-medium text-cms-muted sm:px-6">
            Slug
          </th>
          <th scope="col" class="px-5 py-3 text-left text-sm font-medium text-cms-muted sm:px-6">
            Status
          </th>
          <th scope="col" class="px-5 py-3 text-left text-sm font-medium text-cms-muted sm:px-6">
            Updated
          </th>
          <th scope="col" class="px-5 py-3 text-right text-sm font-medium text-cms-muted sm:px-6">
            Actions
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-cms-border">
        <tr v-for="category in categories" :key="category.id">
          <td class="px-5 py-4">
            <p class="font-medium text-cms-foreground">{{ category.name }}</p>
            <p v-if="category.description" class="mt-1 max-w-xs truncate text-xs text-cms-muted">
              {{ category.description }}
            </p>
          </td>
          <td class="px-5 py-4 font-mono text-xs text-cms-muted">{{ category.slug }}</td>
          <td class="px-5 py-4">
            <CmsBadge :variant="category.isActive ? 'success' : 'neutral'">{{
              category.isActive ? 'Active' : 'Inactive'
            }}</CmsBadge>
          </td>
          <td class="px-5 py-4 text-sm text-cms-muted">{{ formatDate(category.updatedAt) }}</td>
          <td class="px-5 py-4">
            <div class="flex justify-end gap-1">
              <button
                v-if="canDelete"
                type="button"
                class="grid min-h-11 min-w-11 place-items-center rounded-lg text-cms-muted outline-none hover:bg-cms-muted-surface hover:text-cms-destructive focus-visible:ring-2 focus-visible:ring-cms-focus"
                :aria-label="`Delete category ${category.name}`"
                @click="openDelete(category)"
              >
                <CmsIcon name="trash" />
              </button>
              <button
                v-if="canUpdate"
                type="button"
                class="grid min-h-11 min-w-11 place-items-center rounded-lg text-cms-muted outline-none hover:bg-cms-muted-surface hover:text-cms-foreground focus-visible:ring-2 focus-visible:ring-cms-focus"
                :aria-label="`Edit category ${category.name}`"
                @click="openEdit(category)"
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
      :title="editing ? 'Edit category' : 'Add category'"
      @close="modalOpen = false"
    >
      <form class="space-y-4" @submit.prevent="save">
        <CmsInput v-model="form.name" label="Name" required />
        <CmsInput v-model="form.slug" label="Slug" required />
        <CmsInput v-model="form.description" label="Description" placeholder="Optional" />
        <CmsCheckbox v-model="form.isActive" label="Active" />
        <p v-if="formError" class="text-sm text-cms-destructive" role="alert">{{ formError }}</p>
        <div class="flex justify-end gap-3">
          <CmsButton type="button" variant="outline" @click="modalOpen = false">Cancel</CmsButton
          ><CmsButton type="submit" :loading="saving">Save category</CmsButton>
        </div>
      </form>
    </CmsModal>

    <CmsModal :open="deleteModalOpen" title="Delete category" @close="deleteModalOpen = false">
      <p class="text-sm leading-6 text-cms-muted">
        Delete <strong class="text-cms-foreground">{{ editing?.name }}</strong
        >? This removes it from the category list.
      </p>
      <p v-if="formError" class="mt-4 text-sm text-cms-destructive" role="alert">{{ formError }}</p>
      <template #footer
        ><CmsButton variant="outline" @click="deleteModalOpen = false">Cancel</CmsButton
        ><CmsButton variant="destructive" :loading="deleting" @click="remove"
          >Delete category</CmsButton
        ></template
      >
    </CmsModal>
  </section>
</template>
