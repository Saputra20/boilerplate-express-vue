<script setup lang="ts">
import { computed } from 'vue';

const emit = defineEmits<{ change: [page: number] }>();

const props = defineProps<{ page: number; totalPages: number }>();
const visiblePages = computed(() => {
  const start = Math.max(1, Math.min(props.page - 2, props.totalPages - 4));
  const end = Math.min(props.totalPages, start + 4);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
});
</script>

<template>
  <nav
    v-if="totalPages > 0"
    aria-label="Pagination"
    class="flex flex-wrap items-center justify-end gap-2 text-sm"
  >
    <button
      type="button"
      class="min-h-11 rounded-lg border border-cms-border bg-cms-surface px-4 font-medium text-cms-muted outline-none transition-colors hover:bg-cms-muted-surface disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-cms-focus"
      :disabled="page <= 1 || totalPages <= 1"
      @click="emit('change', page - 1)"
    >
      Previous
    </button>
    <button
      v-for="visiblePage in visiblePages"
      :key="visiblePage"
      type="button"
      class="min-h-11 min-w-11 rounded-lg px-3 font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-cms-focus"
      :class="
        visiblePage === page
          ? 'bg-[#ecf3ff] text-cms-primary dark:bg-cms-primary/[0.12]'
          : 'text-cms-foreground hover:bg-cms-muted-surface'
      "
      :aria-label="`Go to page ${visiblePage}`"
      :aria-current="visiblePage === page ? 'page' : undefined"
      @click="emit('change', visiblePage)"
    >
      {{ visiblePage }}
    </button>
    <button
      type="button"
      class="min-h-11 rounded-lg border border-cms-border bg-cms-surface px-4 font-medium text-cms-foreground outline-none transition-colors hover:bg-cms-muted-surface disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-cms-focus"
      :disabled="page >= totalPages || totalPages <= 1"
      @click="emit('change', page + 1)"
    >
      Next
    </button>
  </nav>
</template>
