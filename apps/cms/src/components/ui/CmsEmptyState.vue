<script setup lang="ts">
withDefaults(defineProps<{ title: string; message: string; variant?: 'card' | 'plain' }>(), {
  variant: 'card',
});
</script>

<template>
  <div
    class="text-center"
    :class="
      variant === 'card'
        ? 'rounded-2xl border border-cms-border bg-cms-surface px-6 py-10'
        : 'px-2 py-2'
    "
  >
    <h2 class="text-base font-semibold text-cms-foreground">{{ title }}</h2>
    <p class="mt-2 text-sm text-cms-muted">{{ message }}</p>
    <slot />
  </div>
</template>
