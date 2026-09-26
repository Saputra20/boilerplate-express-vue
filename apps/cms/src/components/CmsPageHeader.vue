<script setup lang="ts">
defineProps<{ title: string }>();
</script>

<template>
  <header class="mb-6 flex flex-wrap items-center justify-between gap-3">
    <div class="min-w-0">
      <h1 class="text-2xl font-semibold text-cms-foreground">{{ title }}</h1>
    </div>
    <nav aria-label="Breadcrumb">
      <ol class="flex items-center gap-1.5 text-sm">
        <li>
          <RouterLink
            to="/"
            class="inline-flex items-center gap-1.5 text-cms-muted hover:text-cms-foreground"
          >
            Home
            <span aria-hidden="true" class="text-base leading-none">›</span>
          </RouterLink>
        </li>
        <li aria-current="page" class="text-cms-foreground">{{ title }}</li>
      </ol>
    </nav>
  </header>
</template>
