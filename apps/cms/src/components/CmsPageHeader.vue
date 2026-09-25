<script setup lang="ts">
defineProps<{ title: string; description?: string }>();
</script>

<template>
  <header class="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <nav aria-label="Breadcrumb" class="mb-2 text-xs font-medium text-cms-muted">
        <ol class="flex items-center gap-2">
          <li>CMS</li>
          <li aria-hidden="true">/</li>
          <li class="text-cms-foreground">{{ title }}</li>
        </ol>
      </nav>
      <h1 class="text-2xl font-semibold tracking-tight text-cms-foreground sm:text-3xl">
        {{ title }}
      </h1>
      <p v-if="description" class="mt-2 text-sm text-cms-muted">{{ description }}</p>
    </div>
    <slot />
  </header>
</template>
