<script setup lang="ts">
import { computed } from 'vue';

type FeedbackKind = 'error' | 'unavailable' | 'denied';

const props = defineProps<{
  kind: FeedbackKind;
  message: string;
  retryable?: boolean;
}>();

const emit = defineEmits<{ retry: [] }>();

const title = computed(() => {
  if (props.kind === 'denied') return 'Access denied';
  if (props.kind === 'unavailable') return 'Service unavailable';
  return 'Something went wrong';
});

const toneClasses = computed(() => {
  if (props.kind === 'denied') {
    return 'border-cms-warning/30 bg-amber-50 text-cms-warning';
  }
  if (props.kind === 'unavailable') {
    return 'border-cms-border bg-cms-muted-surface text-cms-muted';
  }
  return 'border-cms-destructive/30 bg-red-50 text-cms-destructive';
});
</script>

<template>
  <div class="rounded-cms-sm border p-cms-3 text-sm" :class="toneClasses" role="alert" aria-live="assertive">
    <p class="font-semibold">{{ title }}</p>
    <p class="mt-cms-1">{{ message }}</p>
    <button
      v-if="retryable"
      type="button"
      class="mt-cms-3 min-h-11 rounded-cms-sm border border-current px-cms-3 font-medium outline-none focus-visible:ring-2 focus-visible:ring-cms-focus focus-visible:ring-offset-2"
      @click="emit('retry')"
    >
      Try again
    </button>
  </div>
</template>
