<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'neutral' | 'success' | 'warning' | 'danger' }>(), {
  variant: 'neutral',
});
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
    :class="{
      'bg-cms-muted-surface text-cms-muted': variant === 'neutral',
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200':
        variant === 'success',
      'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200': variant === 'warning',
      'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200': variant === 'danger',
    }"
    ><slot
  /></span>
</template>
