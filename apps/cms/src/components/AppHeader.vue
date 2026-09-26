<script setup lang="ts">
import CmsIcon from './CmsIcon.vue';
import CmsProfileMenu from './CmsProfileMenu.vue';
import { useTheme } from '../composables/useTheme';

defineProps<{ sidebarCollapsed: boolean; mobileNavigationOpen: boolean }>();

const emit = defineEmits<{ toggleNavigation: [] }>();
const { theme, toggleTheme } = useTheme();
</script>

<template>
  <header
    class="sticky top-0 z-20 flex min-h-16 w-full border-cms-border bg-cms-shell-surface xl:min-h-[4.75rem] xl:border-b"
  >
    <div class="flex w-full flex-col items-center justify-between xl:flex-row xl:px-6">
      <div
        class="flex w-full items-center justify-between gap-2 border-b border-cms-border px-3 py-3 sm:gap-4 xl:justify-between xl:border-b-0 xl:px-0 xl:py-4"
      >
        <div class="flex min-w-0 items-center gap-3">
          <button
            id="navigation-toggle-mobile"
            type="button"
            class="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-2 text-cms-muted outline-none transition-colors hover:bg-cms-muted-surface focus-visible:ring-2 focus-visible:ring-cms-focus xl:hidden"
            aria-controls="primary-navigation"
            :aria-expanded="mobileNavigationOpen"
            :aria-label="mobileNavigationOpen ? 'Close navigation menu' : 'Open navigation menu'"
            @click="emit('toggleNavigation')"
          >
            <CmsIcon :name="mobileNavigationOpen ? 'close' : 'menu'" :size="22" />
            <span class="text-xs font-medium">{{ mobileNavigationOpen ? 'Close' : 'Menu' }}</span>
          </button>
          <button
            id="navigation-toggle-desktop"
            type="button"
            class="hidden size-11 shrink-0 items-center justify-center rounded-lg border border-cms-border text-cms-muted outline-none transition-colors hover:bg-cms-muted-surface focus-visible:ring-2 focus-visible:ring-cms-focus xl:flex"
            aria-controls="primary-navigation"
            :aria-expanded="!sidebarCollapsed"
            :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
            @click="emit('toggleNavigation')"
          >
            <CmsIcon name="menu" :size="18" />
          </button>
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-cms-foreground">Content workspace</p>
            <p class="hidden text-xs text-cms-muted sm:block">CMS administration</p>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            class="grid size-10 place-items-center rounded-lg text-cms-muted outline-none transition-colors hover:bg-cms-muted-surface focus-visible:ring-2 focus-visible:ring-cms-focus"
            :aria-label="theme === 'dark' ? 'Use light theme' : 'Use dark theme'"
            :title="theme === 'dark' ? 'Use light theme' : 'Use dark theme'"
            @click="toggleTheme"
          >
            <CmsIcon :name="theme === 'dark' ? 'sun' : 'moon'" :size="20" />
          </button>
          <CmsProfileMenu />
        </div>
      </div>
    </div>
  </header>
</template>
