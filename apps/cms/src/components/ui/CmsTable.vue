<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useSlots } from 'vue';
import CmsIcon from '../CmsIcon.vue';
import CmsButton from './CmsButton.vue';

const pageSizeOptions = [10, 20, 30, 50, 100];
const props = defineProps<{
  title: string;
  totalRecords: number;
  page: number;
  pageSize: number;
  itemLabel: string;
  searchTerm: string;
  searchLabel: string;
  showState?: boolean;
  activeFilterCount?: number;
}>();

const emit = defineEmits<{
  'update:pageSize': [pageSize: number];
  'update:searchTerm': [searchTerm: string];
  search: [];
  'filter-open': [];
  'filter-apply': [];
  'filter-reset': [];
  'filter-close': [];
}>();

const slots = useSlots();
const filterGroup = ref<HTMLElement | null>(null);
const filterPopover = ref<HTMLElement | null>(null);
const filtersOpen = ref(false);
const hasFilters = computed(() => Boolean(slots.filters));
const firstRecord = computed(() =>
  props.totalRecords === 0 ? 0 : (props.page - 1) * props.pageSize + 1,
);
const lastRecord = computed(() => Math.min(props.page * props.pageSize, props.totalRecords));
let searchTimer: ReturnType<typeof setTimeout> | undefined;

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
  document.removeEventListener('click', handleDocumentClick);
  document.removeEventListener('keydown', handleDocumentKeydown);
});

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleDocumentKeydown);
});

function updatePageSize(event: Event): void {
  emit('update:pageSize', Number((event.target as HTMLSelectElement).value));
}

function updateSearchTerm(event: Event): void {
  emit('update:searchTerm', (event.target as HTMLInputElement).value);
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => emit('search'), 300);
}

function submitSearch(): void {
  if (searchTimer) clearTimeout(searchTimer);
  emit('search');
}

async function toggleFilters(): Promise<void> {
  if (filtersOpen.value) {
    closeFilters(true);
    return;
  }
  filtersOpen.value = true;
  emit('filter-open');
  await nextTick();
  filterPopover.value
    ?.querySelector<HTMLElement>('select, input, button, [tabindex]:not([tabindex="-1"])')
    ?.focus();
}

function closeFilters(restoreFocus = false): void {
  if (!filtersOpen.value) return;
  filtersOpen.value = false;
  emit('filter-close');
  if (restoreFocus) {
    void nextTick(() =>
      filterGroup.value?.querySelector<HTMLButtonElement>('[data-filter-trigger]')?.focus(),
    );
  }
}

function applyFilters(): void {
  emit('filter-apply');
  closeFilters(true);
}

function handleDocumentClick(event: MouseEvent): void {
  if (event.target instanceof Node && !filterGroup.value?.contains(event.target)) closeFilters();
}

function handleDocumentKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && filtersOpen.value) {
    event.preventDefault();
    closeFilters(true);
  }
}
</script>

<template>
  <section class="rounded-2xl border border-cms-border bg-cms-surface">
    <header class="border-b border-cms-border px-6 py-5 sm:px-8 sm:py-6">
      <h2 class="text-lg font-semibold text-cms-foreground">{{ title }}</h2>
    </header>

    <div class="p-4 sm:p-5 lg:p-6">
      <div class="relative rounded-2xl border border-cms-border">
        <div
          class="flex flex-col gap-4 border-b border-cms-border px-4 py-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6"
        >
          <div class="flex flex-wrap items-center gap-3">
            <label class="flex items-center gap-3 text-sm font-medium text-cms-muted">
              <span>Show</span>
              <select
                :value="pageSize"
                aria-label="Entries per page"
                class="h-12 rounded-lg border border-cms-border bg-cms-surface px-3 text-sm font-medium text-cms-foreground shadow-cms-card outline-none focus-visible:ring-2 focus-visible:ring-cms-focus"
                @change="updatePageSize"
              >
                <option v-for="size in pageSizeOptions" :key="size" :value="size">
                  {{ size }}
                </option>
              </select>
              <span>entries</span>
            </label>
          </div>

          <div
            class="flex w-full min-w-0 items-center gap-3 sm:ml-auto sm:min-w-[20rem] sm:max-w-[32rem] sm:flex-1 sm:justify-end"
          >
            <div v-if="hasFilters" ref="filterGroup" class="relative shrink-0">
              <CmsButton
                data-filter-trigger
                variant="outline"
                :aria-expanded="filtersOpen"
                :aria-controls="`table-filters-${itemLabel}`"
                @click="toggleFilters"
              >
                <CmsIcon name="filter" :size="18" />
                <span>Filter</span>
                <span
                  v-if="activeFilterCount"
                  class="min-w-5 rounded-full bg-cms-muted-surface px-1.5 text-center text-xs text-cms-muted"
                  aria-label="Active filters"
                  >{{ activeFilterCount }}</span
                >
              </CmsButton>
              <div
                v-if="filtersOpen"
                :id="`table-filters-${itemLabel}`"
                ref="filterPopover"
                role="region"
                aria-label="Table filters"
                class="absolute left-0 top-full z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-cms-border bg-cms-surface p-4 shadow-cms-lg sm:w-80"
              >
                <h3 class="mb-4 text-sm font-semibold text-cms-foreground">Filters</h3>
                <slot name="filters" />
                <div class="mt-5 flex justify-end gap-2 border-t border-cms-border pt-4">
                  <CmsButton variant="ghost" @click="emit('filter-reset')">Reset</CmsButton>
                  <CmsButton @click="applyFilters">Apply</CmsButton>
                </div>
              </div>
            </div>

            <form class="relative min-w-0 flex-1" role="search" @submit.prevent="submitSearch">
              <label class="sr-only" :for="`table-search-${itemLabel}`">{{ searchLabel }}</label>
              <input
                :id="`table-search-${itemLabel}`"
                :value="searchTerm"
                type="search"
                :aria-label="searchLabel"
                placeholder="Search..."
                class="h-12 w-full rounded-lg border border-cms-border bg-cms-surface py-3 pl-11 pr-4 text-sm text-cms-foreground shadow-cms-card outline-none placeholder:text-cms-muted focus-visible:ring-2 focus-visible:ring-cms-focus"
                @input="updateSearchTerm"
              />
              <CmsIcon
                name="search"
                class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cms-muted"
                :size="20"
              />
            </form>
          </div>
        </div>

        <div v-if="showState" class="border-b border-cms-border px-4 py-8 sm:px-6 sm:py-12">
          <slot name="state" />
        </div>

        <template v-else>
          <div class="overflow-x-auto">
            <table
              class="w-full min-w-[40rem] border-collapse text-left text-sm [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-cms-muted-surface [&_td]:align-middle [&_td+td]:border-l [&_td+td]:border-cms-border/60 [&_th]:whitespace-nowrap [&_th+th]:border-l [&_th+th]:border-cms-border/60"
            >
              <slot />
            </table>
          </div>
        </template>

        <footer
          class="flex flex-col gap-3 border-t border-cms-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
        >
          <p class="text-sm text-cms-muted" aria-live="polite">
            Showing {{ firstRecord }} to {{ lastRecord }} of {{ totalRecords }} {{ itemLabel }}
          </p>
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </section>
</template>
