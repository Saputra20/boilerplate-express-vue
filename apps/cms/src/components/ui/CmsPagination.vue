<script setup lang="ts">
defineProps<{ page: number; totalPages: number }>();
const emit = defineEmits<{ change: [page: number] }>();
</script>

<template>
  <nav
    v-if="totalPages > 1"
    aria-label="Pagination"
    class="flex items-center justify-between gap-4 border-t border-cms-border px-5 py-4 text-sm sm:px-6"
  >
    <button
      type="button"
      class="min-h-10 rounded-cms-sm border border-cms-border px-3 text-cms-muted outline-none hover:bg-cms-muted-surface disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-cms-focus"
      :disabled="page <= 1"
      @click="emit('change', page - 1)"
    >
      Previous
    </button>
    <span class="text-cms-muted">Page {{ page }} of {{ totalPages }}</span>
    <button
      type="button"
      class="min-h-10 rounded-cms-sm border border-cms-border px-3 text-cms-muted outline-none hover:bg-cms-muted-surface disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-cms-focus"
      :disabled="page >= totalPages"
      @click="emit('change', page + 1)"
    >
      Next
    </button>
  </nav>
</template>
