<script setup lang="ts">
defineProps<{ open: boolean; title: string }>();
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"
      role="presentation"
      @click.self="emit('close')"
    >
      <section
        class="w-full max-w-lg rounded-cms-md border border-cms-border bg-cms-surface shadow-cms-lg"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <header class="flex items-center justify-between border-b border-cms-border px-5 py-4">
          <h2 class="text-base font-semibold text-cms-foreground">{{ title }}</h2>
          <button
            type="button"
            class="min-h-10 rounded-cms-sm px-3 text-sm text-cms-muted outline-none hover:bg-cms-muted-surface focus-visible:ring-2 focus-visible:ring-cms-focus"
            aria-label="Close dialog"
            @click="emit('close')"
          >
            Close
          </button>
        </header>
        <div class="p-5 sm:p-6"><slot /></div>
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
