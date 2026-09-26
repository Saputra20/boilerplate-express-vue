<script setup lang="ts">
import { ref } from 'vue';

defineProps<{ label: string }>();

const dropdown = ref<HTMLDetailsElement | null>(null);

function closeAfterAction(event: MouseEvent): void {
  if (event.target instanceof Element && event.target.closest('a, button')) {
    closeDropdown();
  }
}

function closeDropdown(): void {
  dropdown.value?.removeAttribute('open');
  dropdown.value?.querySelector<HTMLElement>('summary')?.focus();
}
</script>

<template>
  <details ref="dropdown" class="group relative" @keydown.esc.prevent="closeDropdown">
    <summary
      :aria-label="label"
      class="list-none cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-cms-focus [&::-webkit-details-marker]:hidden"
    >
      <slot name="trigger" />
    </summary>
    <div
      class="absolute right-0 top-full z-40 mt-2 min-w-48 rounded-2xl border border-cms-border bg-cms-surface p-3 shadow-cms-lg"
      @click="closeAfterAction"
    >
      <slot />
    </div>
  </details>
</template>
