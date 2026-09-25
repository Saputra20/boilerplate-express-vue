<script setup lang="ts">
defineProps<{
  modelValue?: string;
  label?: string;
  name?: string;
  error?: string;
  disabled?: boolean;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<template>
  <label class="block">
    <span v-if="label" class="block text-sm font-medium text-cms-foreground">{{ label }}</span>
    <select
      :value="modelValue"
      :name="name"
      :disabled="disabled"
      :aria-invalid="Boolean(error)"
      class="mt-2 block min-h-11 w-full rounded-cms-sm border bg-cms-surface px-3 text-sm text-cms-foreground outline-none focus-visible:border-cms-focus focus-visible:ring-2 focus-visible:ring-cms-focus disabled:cursor-not-allowed disabled:opacity-60"
      :class="error ? 'border-cms-destructive' : 'border-cms-border'"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <slot />
    </select>
    <span v-if="error" class="mt-1 block text-sm text-cms-destructive" role="alert">{{
      error
    }}</span>
  </label>
</template>
