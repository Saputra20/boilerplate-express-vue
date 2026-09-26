<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    direction?: 'asc' | 'desc' | null;
  }>(),
  { direction: null },
);

const emit = defineEmits<{ sort: [] }>();
</script>

<template>
  <th
    scope="col"
    class="px-5 py-3 text-left text-sm font-medium text-cms-muted sm:px-6"
    :aria-sort="direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'"
  >
    <button
      type="button"
      class="inline-flex min-h-8 w-full items-center justify-between gap-3 rounded outline-none hover:text-cms-foreground focus-visible:ring-2 focus-visible:ring-cms-focus"
      :aria-label="`Sort by ${label}${direction === 'asc' ? ', ascending' : direction === 'desc' ? ', descending' : ''}`"
      @click="emit('sort')"
    >
      <span>{{ label }}</span>
      <svg
        class="size-3.5 shrink-0"
        :class="direction ? 'text-cms-primary' : 'text-cms-muted/50'"
        viewBox="0 0 12 16"
        fill="none"
        aria-hidden="true"
      >
        <path d="m2 6 4-4 4 4M2 10l4 4 4-4" stroke="currentColor" stroke-width="1.5" />
      </svg>
    </button>
  </th>
</template>
