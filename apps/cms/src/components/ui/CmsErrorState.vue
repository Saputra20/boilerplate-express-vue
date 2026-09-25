<script setup lang="ts">
defineProps<{ title?: string; message: string; retryable?: boolean }>();
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <div
    class="rounded-cms-md border border-cms-destructive/30 bg-red-50 p-5 text-cms-destructive dark:bg-red-950/30"
    role="alert"
  >
    <h2 class="text-base font-semibold">{{ title ?? 'Something went wrong' }}</h2>
    <p class="mt-2 text-sm">{{ message }}</p>
    <button
      v-if="retryable"
      type="button"
      class="mt-4 min-h-10 rounded-cms-sm border border-current px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-cms-focus"
      @click="emit('retry')"
    >
      Try again
    </button>
  </div>
</template>
