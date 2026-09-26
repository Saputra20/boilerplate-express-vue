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
    <span v-if="label" class="mb-1.5 block text-sm font-medium text-cms-foreground">{{
      label
    }}</span>
    <input
      :id="id"
      :value="modelValue"
      :name="name"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-invalid="Boolean(error)"
      :aria-describedby="[ariaDescribedby, error && errorId].filter(Boolean).join(' ') || undefined"
      class="block h-11 w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm text-cms-foreground shadow-cms-card outline-none placeholder:text-cms-muted focus:border-[#9cb9ff] focus:ring-[3px] focus:ring-cms-primary/10 disabled:cursor-not-allowed disabled:bg-cms-muted-surface disabled:opacity-70 dark:bg-[#101828] dark:focus:border-[#252dae]"
      :class="error ? 'border-cms-destructive' : 'border-cms-border'"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <span v-if="error" :id="errorId" class="mt-1 block text-sm text-cms-destructive" role="alert">
      {{ error }}
    </span>
  </label>
</template>
