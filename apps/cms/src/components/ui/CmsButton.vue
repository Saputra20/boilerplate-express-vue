<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost' | 'icon';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    loading?: boolean;
  }>(),
  { variant: 'primary', type: 'button', disabled: false, loading: false },
);
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-cms-focus focus-visible:ring-offset-2 focus-visible:ring-offset-cms-surface disabled:cursor-not-allowed disabled:opacity-50"
    :class="{
      'bg-cms-primary text-cms-primary-contrast shadow-cms-card hover:bg-cms-primary-hover':
        variant === 'primary',
      'bg-cms-muted-surface text-cms-foreground hover:brightness-95': variant === 'secondary',
      'border border-cms-border bg-cms-surface text-cms-foreground shadow-cms-card hover:bg-cms-muted-surface':
        variant === 'outline',
      'bg-cms-destructive text-cms-destructive-contrast shadow-cms-card hover:brightness-110':
        variant === 'destructive',
      'text-cms-muted hover:bg-cms-muted-surface hover:text-cms-foreground': variant === 'ghost',
      'min-w-11 px-2': variant === 'icon',
    }"
  >
    <span
      v-if="loading"
      aria-hidden="true"
      class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
    <slot />
  </button>
</template>
