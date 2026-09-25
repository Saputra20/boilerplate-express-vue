<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  modelValue?: string;
  id?: string;
  label?: string;
  name?: string;
  error?: string;
  errorId?: string;
  disabled?: boolean;
  ariaDescribedby?: string;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const visible = ref(false);
</script>

<template>
  <label class="block">
    <span v-if="label" class="block text-sm font-medium text-cms-foreground">{{ label }}</span>
    <span class="relative mt-2 block">
      <input
        :id="id"
        :value="modelValue"
        :name="name"
        :type="visible ? 'text' : 'password'"
        autocomplete="current-password"
        :disabled="disabled"
        :aria-invalid="Boolean(error)"
        :aria-describedby="ariaDescribedby"
        class="block min-h-11 w-full rounded-cms-sm border bg-cms-surface px-3 pr-16 text-sm text-cms-foreground outline-none placeholder:text-cms-muted focus-visible:border-cms-focus focus-visible:ring-2 focus-visible:ring-cms-focus disabled:cursor-not-allowed disabled:opacity-60"
        :class="error ? 'border-cms-destructive' : 'border-cms-border'"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <button
        type="button"
        class="absolute inset-y-0 right-2 my-auto min-h-9 px-2 text-xs font-semibold text-cms-muted outline-none hover:text-cms-foreground focus-visible:ring-2 focus-visible:ring-cms-focus"
        :aria-label="visible ? 'Hide password' : 'Show password'"
        @click="visible = !visible"
      >
        {{ visible ? 'Hide' : 'Show' }}
      </button>
    </span>
    <span v-if="error" :id="errorId" class="mt-1 block text-sm text-cms-destructive" role="alert">{{
      error
    }}</span>
  </label>
</template>
