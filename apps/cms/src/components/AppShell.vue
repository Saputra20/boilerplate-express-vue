<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AppHeader from './AppHeader.vue';
import AppNavigation from './AppNavigation.vue';
import CmsPageHeader from './CmsPageHeader.vue';
import { useRoute } from 'vue-router';

const drawerOpen = ref(false);
const sidebarCollapsed = ref(false);
const route = useRoute();
function closeDrawer() {
  drawerOpen.value = false;
  void nextTick(() =>
    document.querySelector<HTMLButtonElement>('[aria-controls="mobile-navigation"]')?.focus(),
  );
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && drawerOpen.value) closeDrawer();
}

watch(drawerOpen, (isOpen) => {
  if (isOpen) {
    void nextTick(() => document.querySelector<HTMLElement>('[data-mobile-nav-link]')?.focus());
  }
});

onMounted(() => window.addEventListener('keydown', handleKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown));
</script>

<template>
  <div class="min-h-screen bg-cms-background font-cms-sans text-cms-foreground">
    <aside
      class="fixed inset-y-0 left-0 z-30 hidden border-r border-cms-border bg-cms-surface transition-[width] duration-200 md:block"
      :class="sidebarCollapsed ? 'w-20' : 'w-64'"
    >
      <AppNavigation
        :collapsed="sidebarCollapsed"
        @toggle-collapse="sidebarCollapsed = !sidebarCollapsed"
      />
    </aside>

    <div
      class="min-h-screen transition-[padding] duration-200"
      :class="sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'"
    >
      <AppHeader :drawer-open="drawerOpen" @open-navigation="drawerOpen = true" />

      <div
        v-if="drawerOpen"
        class="fixed inset-0 z-40 bg-cms-foreground/30 md:hidden"
        aria-hidden="true"
        @click="closeDrawer"
      />
      <aside
        v-if="drawerOpen"
        id="mobile-navigation"
        class="fixed inset-y-0 left-0 z-50 w-[min(20rem,85vw)] border-r border-cms-border bg-cms-surface shadow-xl md:hidden"
        aria-label="Mobile navigation"
        aria-modal="true"
        role="dialog"
      >
        <AppNavigation mobile @navigate="closeDrawer" />
      </aside>

      <main
        id="main-content"
        class="min-h-[calc(100vh-5rem)] px-4 py-7 sm:px-6 lg:px-8"
        :inert="drawerOpen"
      >
        <CmsPageHeader
          v-if="route.meta.title"
          :title="route.meta.title"
          :description="route.meta.description"
        />
        <RouterView />
      </main>
    </div>
  </div>
</template>
