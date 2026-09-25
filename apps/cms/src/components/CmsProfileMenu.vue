<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import CmsIcon from './CmsIcon.vue';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const open = ref(false);

function close(): void {
  open.value = false;
}

function handleDocumentClick(event: MouseEvent): void {
  const target = event.target;
  if (target instanceof Element && !target.closest('[data-profile-menu]')) close();
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close();
}

async function logout(): Promise<void> {
  close();
  await auth.logout();
  await router.replace('/login');
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleKeydown);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div class="relative" data-profile-menu>
    <button
      type="button"
      class="flex min-h-11 items-center gap-3 rounded-cms-md px-2 outline-none transition hover:bg-cms-muted-surface focus-visible:ring-2 focus-visible:ring-cms-focus"
      aria-haspopup="menu"
      :aria-expanded="open"
      aria-label="Open profile menu"
      @click.stop="open = !open"
    >
      <span
        class="grid size-9 place-items-center rounded-full bg-cms-primary text-sm font-semibold text-cms-primary-contrast"
      >
        {{ auth.identity?.email.slice(0, 1).toUpperCase() ?? 'U' }}
      </span>
      <span class="hidden text-left sm:block">
        <span class="block max-w-40 truncate text-sm font-semibold text-cms-foreground">{{
          auth.identity?.email ?? 'User'
        }}</span>
        <span class="block text-xs text-cms-muted">{{ auth.identity?.roles[0] ?? 'Member' }}</span>
      </span>
      <CmsIcon name="chevron-down" :size="16" class="text-cms-muted" />
    </button>

    <div
      v-if="open"
      class="absolute right-0 top-full z-50 mt-2 w-64 rounded-cms-md border border-cms-border bg-cms-surface p-2 shadow-cms-lg"
      role="menu"
    >
      <div class="border-b border-cms-border px-3 py-2">
        <p class="truncate text-sm font-semibold text-cms-foreground">
          {{ auth.identity?.email ?? 'User' }}
        </p>
        <p class="mt-1 text-xs text-cms-muted">
          {{ auth.identity?.userId ?? 'Authenticated account' }}
        </p>
      </div>
      <button
        type="button"
        class="mt-1 flex min-h-11 w-full items-center gap-3 rounded-cms-sm px-3 text-sm text-cms-muted outline-none hover:bg-cms-muted-surface hover:text-cms-foreground focus-visible:ring-2 focus-visible:ring-cms-focus"
        role="menuitem"
        @click="logout"
      >
        <CmsIcon name="logout" :size="18" />
        Sign out
      </button>
    </div>
  </div>
</template>
