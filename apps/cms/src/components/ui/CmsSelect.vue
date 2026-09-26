<script setup lang="ts">
defineProps<{
  modelValue?: string;
  label?: string;
  name?: string;
  error?: string;
  errorId?: string;
  ariaDescribedby?: string;
  disabled?: boolean;
  required?: boolean;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: string]; change: [value: string] }>();
</script>

<template>
  <label class="block">
    <span v-if="label" class="mb-1.5 block text-sm font-medium text-cms-foreground">{{
      label
    }}</span>
    <select
      :value="modelValue"
      :name="name"
      :disabled="disabled"
      :required="required"
      :aria-invalid="Boolean(error)"
      :aria-describedby="[ariaDescribedby, error && errorId].filter(Boolean).join(' ') || undefined"
      class="block h-11 w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm text-cms-foreground shadow-cms-card outline-none focus:border-[#9cb9ff] focus:ring-[3px] focus:ring-cms-primary/10 disabled:cursor-not-allowed disabled:bg-cms-muted-surface disabled:opacity-70 dark:bg-[#101828] dark:focus:border-[#252dae]"
      :class="error ? 'border-cms-destructive' : 'border-cms-border'"
      @change="
        emit('update:modelValue', ($event.target as HTMLSelectElement).value);
        emit('change', ($event.target as HTMLSelectElement).value);
      "
    >
      <slot />
    </select>
    <span v-if="error" :id="errorId" class="mt-1 block text-sm text-cms-destructive" role="alert">
      {{ error }}
    </span>
  </label>
</template>
