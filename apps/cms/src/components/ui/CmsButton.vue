<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'icon';
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
    class="inline-flex min-h-11 items-center justify-center gap-2 rounded-cms-sm px-4 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-cms-focus focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    :class="{
      'bg-cms-primary text-cms-primary-contrast hover:brightness-110': variant === 'primary',
      'bg-cms-muted-surface text-cms-foreground hover:brightness-95': variant === 'secondary',
      'border border-cms-border bg-cms-surface text-cms-foreground hover:bg-cms-muted-surface':
        variant === 'outline',
      'bg-cms-destructive text-white hover:brightness-110': variant === 'destructive',
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
