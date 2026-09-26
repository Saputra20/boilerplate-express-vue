<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import AppHeader from './AppHeader.vue';
import AppNavigation from './AppNavigation.vue';
import CmsPageHeader from './CmsPageHeader.vue';

const sidebarCollapsed = ref(false);
const sidebarHovered = ref(false);
const mobileNavigationOpen = ref(false);
const route = useRoute();

const sidebarExpanded = () => !sidebarCollapsed.value || sidebarHovered.value;

function toggleNavigation(): void {
  if (window.innerWidth >= 1280) {
    sidebarCollapsed.value = !sidebarCollapsed.value;
    return;
  }

  mobileNavigationOpen.value = !mobileNavigationOpen.value;
  if (mobileNavigationOpen.value) {
    void nextTick(() => document.querySelector<HTMLElement>('[data-mobile-nav-link]')?.focus());
  }
}

function closeMobileNavigation(): void {
  mobileNavigationOpen.value = false;
  void nextTick(() => document.getElementById('navigation-toggle-mobile')?.focus());
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && mobileNavigationOpen.value) closeMobileNavigation();
}

function expandSidebarOnHover(): void {
  if (window.innerWidth >= 1280) sidebarHovered.value = true;
}

function handleResize(): void {
  sidebarHovered.value = false;
  if (window.innerWidth >= 1280) mobileNavigationOpen.value = false;
}

onMounted(() => {
  window.addEventListener('resize', handleResize);
  window.addEventListener('keydown', handleKeydown);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div class="min-h-screen bg-cms-background font-cms-sans text-cms-foreground xl:flex">
    <button
      v-if="mobileNavigationOpen"
      type="button"
      class="fixed inset-0 z-30 bg-black/40 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white xl:hidden"
      aria-label="Dismiss navigation overlay"
      @click="closeMobileNavigation"
    />
    <aside
      id="primary-navigation"
      class="fixed inset-y-0 left-0 z-40 flex w-[18.125rem] flex-col border-r border-cms-border bg-cms-shell-surface transition-[transform,width] duration-300 ease-in-out xl:translate-x-0"
      :class="[
        mobileNavigationOpen ? 'max-xl:translate-x-0' : 'max-xl:-translate-x-full',
        sidebarExpanded() ? 'xl:w-[18.125rem]' : 'xl:w-[5.625rem]',
      ]"
      :role="mobileNavigationOpen ? 'dialog' : undefined"
      :aria-modal="mobileNavigationOpen ? 'true' : undefined"
      aria-label="Primary navigation"
      @mouseenter="expandSidebarOnHover"
      @mouseleave="sidebarHovered = false"
    >
      <AppNavigation
        :collapsed="!mobileNavigationOpen && sidebarCollapsed && !sidebarHovered"
        :mobile="mobileNavigationOpen"
        @navigate="closeMobileNavigation"
      />
    </aside>

    <div
      id="application-content"
      class="min-h-screen flex-1 transition-[margin] duration-300 ease-in-out"
      :class="sidebarExpanded() ? 'xl:ml-[18.125rem]' : 'xl:ml-[5.625rem]'"
      :inert="mobileNavigationOpen ? 'true' : undefined"
    >
      <AppHeader
        :sidebar-collapsed="sidebarCollapsed"
        :mobile-navigation-open="mobileNavigationOpen"
        @toggle-navigation="toggleNavigation"
      />

      <main
        id="main-content"
        class="mx-auto min-h-[calc(100vh-4rem)] w-full max-w-[1536px] px-4 pb-20 pt-4 md:px-6 md:pb-6 md:pt-6"
      >
        <CmsPageHeader v-if="route.meta.title" :title="route.meta.title" />
        <RouterView />
      </main>
    </div>
  </div>
</template>
