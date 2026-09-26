<script setup lang="ts">
import { computed } from 'vue';
import { filterNavigationItems, navigationItems } from '../navigation';
import { useAuthStore } from '../stores/auth';
import CmsIcon from './CmsIcon.vue';

withDefaults(defineProps<{ mobile?: boolean; collapsed?: boolean }>(), {
  mobile: false,
  collapsed: false,
});

const emit = defineEmits<{ navigate: [] }>();
const auth = useAuthStore();
const visibleNavigationItems = computed(() => filterNavigationItems(navigationItems, auth.can));
</script>

<template>
  <nav aria-label="Primary navigation" class="flex h-full flex-col">
    <div
      class="flex min-h-20 items-start px-5 py-6"
      :class="collapsed ? 'justify-center' : 'justify-between'"
    >
      <RouterLink
        v-if="!collapsed"
        to="/"
        class="flex min-w-0 items-center gap-3"
        aria-label="CMS home"
        @click="emit('navigate')"
      >
        <span
          class="grid size-8 shrink-0 place-items-center rounded-lg bg-cms-primary text-sm font-bold text-cms-primary-contrast"
          aria-hidden="true"
          >C</span
        >
        <div class="min-w-0">
          <p class="truncate text-base font-semibold text-cms-foreground">CMS</p>
          <p class="mt-0.5 truncate text-xs text-cms-muted">Content workspace</p>
        </div>
      </RouterLink>
      <span
        v-else
        class="grid size-8 place-items-center rounded-lg bg-cms-primary text-sm font-bold text-cms-primary-contrast"
        aria-label="CMS"
        >C</span
      >
      <button
        v-if="mobile"
        type="button"
        class="grid min-h-11 min-w-11 place-items-center rounded-cms-sm text-cms-muted outline-none transition-colors hover:bg-cms-muted-surface hover:text-cms-foreground focus-visible:ring-2 focus-visible:ring-cms-focus"
        aria-label="Close navigation menu"
        @click="emit('navigate')"
      >
        <CmsIcon name="close" />
      </button>
    </div>
    <div
      class="mb-4 flex items-center px-5 text-xs font-medium uppercase leading-5 tracking-wide text-cms-muted"
      :class="collapsed ? 'justify-center' : 'justify-start'"
    >
      <span v-if="!collapsed">Menu</span>
      <span v-else aria-hidden="true">···</span>
    </div>
    <ul class="flex flex-col gap-1 overflow-y-auto px-5 pb-6">
      <li v-for="item in visibleNavigationItems" :key="item.to">
        <RouterLink
          :to="item.to"
          class="group flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-cms-foreground outline-none transition-colors hover:bg-cms-muted-surface focus-visible:ring-2 focus-visible:ring-cms-focus dark:text-gray-300 dark:hover:bg-white/5"
          exact-active-class="bg-cms-primary-soft text-cms-primary-hover hover:bg-cms-primary-soft dark:bg-cms-primary/[0.12] dark:text-cms-primary-light dark:hover:bg-cms-primary/[0.12]"
          :class="collapsed ? 'justify-center px-0' : ''"
          :data-mobile-nav-link="mobile ? true : undefined"
          :aria-label="collapsed ? item.label : undefined"
          :title="collapsed ? item.label : undefined"
          @click="emit('navigate')"
        >
          <CmsIcon v-if="item.icon" :name="item.icon" :size="20" />
          <span v-if="!collapsed">{{ item.label }}</span>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
