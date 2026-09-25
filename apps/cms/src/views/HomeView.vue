<script setup lang="ts">
import CmsCard from '../components/ui/CmsCard.vue';
</script>

<template>
  <section aria-labelledby="home-title" class="mx-auto w-full max-w-6xl">
    <CmsCard>
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-cms-primary">Workspace</p>
      <h2
        id="home-title"
        class="mt-3 text-2xl font-semibold tracking-tight text-cms-foreground sm:text-3xl"
      >
        Your CMS workspace is ready
      </h2>
      <p class="mt-3 max-w-2xl text-sm leading-6 text-cms-muted">
        Approved feature modules will appear here as they are added to the workspace.
      </p>
    </CmsCard>
  </section>
</template>
