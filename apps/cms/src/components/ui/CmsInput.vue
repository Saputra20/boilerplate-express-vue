<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue?: string;
    id?: string;
    label?: string;
    name?: string;
    type?: string;
    placeholder?: string;
    error?: string;
    disabled?: boolean;
    ariaDescribedby?: string;
    errorId?: string;
  }>(),
  {
    modelValue: '',
    id: undefined,
    label: undefined,
    name: undefined,
    type: 'text',
    placeholder: undefined,
    error: undefined,
    disabled: false,
    ariaDescribedby: undefined,
    errorId: undefined,
  },
);

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<template>
  <label class="block">
    <span v-if="label" class="block text-sm font-medium text-cms-foreground">{{ label }}</span>
    <input
      :id="id"
      :value="modelValue"
      :name="name"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-invalid="Boolean(error)"
      :aria-describedby="ariaDescribedby"
      class="mt-2 block min-h-11 w-full rounded-cms-sm border bg-cms-surface px-3 text-sm text-cms-foreground outline-none placeholder:text-cms-muted focus-visible:border-cms-focus focus-visible:ring-2 focus-visible:ring-cms-focus disabled:cursor-not-allowed disabled:opacity-60"
      :class="error ? 'border-cms-destructive' : 'border-cms-border'"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <span v-if="error" :id="errorId" class="mt-1 block text-sm text-cms-destructive" role="alert">{{
      error
    }}</span>
  </label>
</template>
