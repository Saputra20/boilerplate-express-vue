<script setup lang="ts">
import { computed } from 'vue';
import { filterNavigationItems, navigationItems } from '../navigation';
import { useAuthStore } from '../stores/auth';
import CmsIcon from './CmsIcon.vue';

withDefaults(defineProps<{ mobile?: boolean; collapsed?: boolean }>(), {
  mobile: false,
  collapsed: false,
});

const emit = defineEmits<{ navigate: []; toggleCollapse: [] }>();
const auth = useAuthStore();
const visibleNavigationItems = computed(() => filterNavigationItems(navigationItems, auth.can));
</script>

<template>
  <nav aria-label="Primary navigation" class="flex h-full flex-col">
    <div
      class="flex min-h-20 items-center border-b border-cms-border px-4"
      :class="collapsed ? 'justify-center' : 'justify-between'"
    >
      <div v-if="!collapsed" class="min-w-0">
        <p class="truncate text-base font-semibold tracking-tight text-cms-foreground">CMS</p>
        <p class="mt-1 text-xs text-cms-muted">Admin workspace</p>
      </div>
      <span
        v-else
        class="grid size-9 place-items-center rounded-cms-md bg-cms-primary text-sm font-bold text-cms-primary-contrast"
        >C</span
      >
      <button
        v-if="!mobile"
        type="button"
        class="grid min-h-10 min-w-10 place-items-center rounded-cms-sm text-cms-muted outline-none hover:bg-cms-muted-surface hover:text-cms-foreground focus-visible:ring-2 focus-visible:ring-cms-focus"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="emit('toggleCollapse')"
      >
        <CmsIcon name="menu" :size="18" />
      </button>
    </div>
    <div
      v-if="!collapsed"
      class="px-4 pb-2 pt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-cms-muted"
    >
      Workspace
    </div>
    <ul class="flex flex-col gap-1 px-3 py-2">
      <li v-for="item in visibleNavigationItems" :key="item.to">
        <RouterLink
          :to="item.to"
          class="group flex min-h-11 items-center gap-3 rounded-cms-sm px-3 text-sm font-medium text-cms-muted outline-none transition-colors hover:bg-cms-muted-surface hover:text-cms-foreground focus-visible:ring-2 focus-visible:ring-cms-focus"
          active-class="bg-cms-primary text-cms-primary-contrast hover:bg-cms-primary hover:text-cms-primary-contrast"
          :class="collapsed ? 'justify-center' : ''"
          :data-mobile-nav-link="mobile ? true : undefined"
          :aria-label="collapsed ? item.label : undefined"
          :title="collapsed ? item.label : undefined"
          @click="emit('navigate')"
        >
          <CmsIcon v-if="item.icon" :name="item.icon" :size="19" />
          <span v-if="!collapsed">{{ item.label }}</span>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
