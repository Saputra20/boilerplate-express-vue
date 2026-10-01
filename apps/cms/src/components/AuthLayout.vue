<script setup lang="ts">
import CmsIcon from './CmsIcon.vue';
import { useTheme } from '../composables/useTheme';

defineProps<{ titleId: string }>();

const { theme, toggleTheme } = useTheme();
</script>

<template>
  <main class="min-h-screen bg-cms-shell-surface lg:flex">
    <section class="flex min-h-screen w-full flex-col px-6 py-6 sm:px-10 lg:w-1/2 lg:px-12">
      <header class="flex justify-end">
        <button
          type="button"
          class="grid size-10 place-items-center rounded-lg text-cms-muted outline-none transition-colors hover:bg-cms-muted-surface focus-visible:ring-2 focus-visible:ring-cms-focus"
          :aria-label="theme === 'dark' ? 'Use light theme' : 'Use dark theme'"
          @click="toggleTheme"
        >
          <CmsIcon :name="theme === 'dark' ? 'sun' : 'moon'" />
        </button>
      </header>

      <section :aria-labelledby="titleId" class="flex flex-1 items-center justify-center py-12">
        <div class="w-full max-w-md">
          <slot />
        </div>
      </section>
    </section>

    <aside
      class="relative hidden min-h-screen w-1/2 place-items-center overflow-hidden bg-[#161950] px-10 text-white dark:bg-white/[0.05] lg:grid"
      aria-label="CMS branding"
    >
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:48px_48px]"
      />
      <div class="relative z-10 flex max-w-sm flex-col items-center text-center">
        <span
          class="mb-6 grid size-16 place-items-center rounded-2xl border border-white/15 bg-white/10 text-2xl font-semibold text-white"
          aria-hidden="true"
          >C</span
        >
        <p class="text-2xl font-semibold">Content management</p>
        <p class="mt-3 text-sm leading-6 text-white/60">
          A clear workspace for managing your content and access.
        </p>
      </div>
    </aside>
  </main>
</template>
