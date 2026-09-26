<script setup lang="ts">
withDefaults(defineProps<{ title?: string; description?: string }>(), {
  title: undefined,
  description: undefined,
});
</script>

<template>
  <section class="rounded-2xl border border-cms-border bg-cms-surface">
    <header
      v-if="title || description || $slots.actions"
      class="flex items-start justify-between gap-4 border-b border-cms-border px-6 py-5"
    >
      <div>
        <h2 v-if="title" class="text-base font-medium text-cms-foreground">{{ title }}</h2>
        <p v-if="description" class="mt-1 text-sm text-cms-muted">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="shrink-0"><slot name="actions" /></div>
    </header>
    <div class="p-4 sm:p-6"><slot /></div>
  </section>
</template>
