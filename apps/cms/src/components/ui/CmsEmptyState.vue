<script setup lang="ts">
defineProps<{ title: string; message: string }>();
</script>

<template>
  <div
    class="rounded-cms-md border border-dashed border-cms-border bg-cms-surface px-6 py-10 text-center"
  >
    <h2 class="text-base font-semibold text-cms-foreground">{{ title }}</h2>
    <p class="mt-2 text-sm text-cms-muted">{{ message }}</p>
    <slot />
  </div>
</template>
