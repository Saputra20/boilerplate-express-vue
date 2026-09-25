<script setup lang="ts">
import CmsIcon from './CmsIcon.vue';
import CmsProfileMenu from './CmsProfileMenu.vue';
import { useTheme } from '../composables/useTheme';

defineProps<{ drawerOpen: boolean }>();

const emit = defineEmits<{ openNavigation: [] }>();
const { theme, toggleTheme } = useTheme();
</script>

<template>
  <header
    class="sticky top-0 z-20 flex min-h-20 items-center justify-between border-b border-cms-border bg-cms-surface/95 px-4 backdrop-blur sm:px-6"
  >
    <div class="flex items-center gap-3">
      <button
        type="button"
        class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-cms-sm border border-cms-border text-cms-muted outline-none hover:bg-cms-muted-surface focus-visible:ring-2 focus-visible:ring-cms-focus md:hidden"
        aria-controls="mobile-navigation"
        :aria-expanded="drawerOpen"
        :aria-label="drawerOpen ? 'Close navigation menu' : 'Open navigation menu'"
        @click="emit('openNavigation')"
      >
        <CmsIcon name="menu" />
      </button>
      <span class="text-sm font-semibold text-cms-foreground sm:hidden">CMS</span>
      <div class="hidden sm:block">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-cms-primary">CMS</p>
        <p class="text-xs font-medium uppercase tracking-[0.16em] text-cms-muted">Workspace</p>
        <p class="mt-1 text-sm font-semibold text-cms-foreground">Content management</p>
      </div>
    </div>
    <div class="flex items-center gap-2 sm:gap-3">
      <button
        type="button"
        class="grid min-h-11 min-w-11 place-items-center rounded-cms-sm text-cms-muted outline-none hover:bg-cms-muted-surface hover:text-cms-foreground focus-visible:ring-2 focus-visible:ring-cms-focus"
        :aria-label="theme === 'dark' ? 'Use light theme' : 'Use dark theme'"
        :title="theme === 'dark' ? 'Use light theme' : 'Use dark theme'"
        @click="toggleTheme"
      >
        <CmsIcon :name="theme === 'dark' ? 'sun' : 'moon'" />
      </button>
      <CmsProfileMenu />
    </div>
  </header>
</template>
