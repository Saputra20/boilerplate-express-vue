<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'neutral' | 'success' | 'warning' | 'danger' }>(), {
  variant: 'neutral',
});
</script>

<template>
  <span
    class="inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium"
    :class="{
      'bg-gray-100 text-gray-700 dark:bg-white/[0.03] dark:text-gray-300': variant === 'neutral',
      'bg-cms-success-soft text-cms-success-strong dark:bg-cms-success-bright/15 dark:text-cms-success-light':
        variant === 'success',
      'bg-cms-warning-soft text-cms-warning-strong dark:bg-cms-warning-bright/15 dark:text-cms-warning-light':
        variant === 'warning',
      'bg-cms-danger-soft text-cms-danger-strong dark:bg-cms-danger-bright/15 dark:text-cms-danger-light':
        variant === 'danger',
    }"
    ><slot
  /></span>
</template>
