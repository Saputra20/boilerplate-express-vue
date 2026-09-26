<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import CmsIcon from '../CmsIcon.vue';

const props = defineProps<{ open: boolean; title: string }>();
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLElement | null>(null);
let previouslyFocused: HTMLElement | null = null;

function focusableElements(): HTMLElement[] {
  return Array.from(
    dialog.value?.querySelectorAll<HTMLElement>(
      'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    ) ?? [],
  );
}

function handleKeydown(event: KeyboardEvent): void {
  if (!props.open) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    emit('close');
    return;
  }
  if (event.key !== 'Tab') return;
  const elements = focusableElements();
  if (elements.length === 0) {
    event.preventDefault();
    return;
  }
  const first = elements[0];
  const last = elements[elements.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      previouslyFocused =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      window.addEventListener('keydown', handleKeydown);
      await nextTick();
      focusableElements()[0]?.focus();
    } else {
      window.removeEventListener('keydown', handleKeydown);
      previouslyFocused?.focus();
      previouslyFocused = null;
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown));
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[99999] grid place-items-center overflow-y-auto bg-gray-400/50 p-4 backdrop-blur-[4px] dark:bg-gray-950/80"
      role="presentation"
      @click.self="emit('close')"
    >
      <section
        ref="dialog"
        class="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-cms-border bg-cms-surface shadow-cms-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cms-modal-title"
      >
        <header
          class="flex items-center justify-between border-b border-cms-border px-5 py-4 sm:px-6"
        >
          <h2 id="cms-modal-title" class="text-lg font-semibold text-cms-foreground">
            {{ title }}
          </h2>
          <button
            type="button"
            class="grid size-11 place-items-center rounded-full bg-gray-100 text-cms-muted outline-none hover:bg-gray-200 focus-visible:ring-2 focus-visible:ring-cms-focus dark:bg-white/[0.05] dark:hover:bg-white/[0.07]"
            aria-label="Close dialog"
            @click="emit('close')"
          >
            <CmsIcon name="close" :size="20" />
            <span class="sr-only">Close</span>
          </button>
        </header>
        <div class="p-4 sm:p-6"><slot /></div>
        <footer
          v-if="$slots.footer"
          class="flex justify-end gap-3 border-t border-cms-border px-5 py-4"
        >
          <slot name="footer" />
        </footer>
      </section>
    </div>
  </Teleport>
</template>
