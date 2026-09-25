<script setup lang="ts">
defineProps<{ modelValue?: boolean; label: string; name?: string; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();
</script>

<template>
  <label class="inline-flex min-h-11 items-center gap-3 text-sm text-cms-foreground">
    <input
      :checked="modelValue"
      :name="name"
      type="checkbox"
      :disabled="disabled"
      class="size-4 rounded border-cms-border text-cms-primary accent-cms-primary focus-visible:ring-2 focus-visible:ring-cms-focus"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    {{ label }}
  </label>
</template>
