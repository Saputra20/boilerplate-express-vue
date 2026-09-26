<script setup lang="ts">
import { ref } from 'vue';
import CmsIcon from '../CmsIcon.vue';

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
    <span v-if="label" class="mb-1.5 block text-sm font-medium text-cms-foreground">{{
      label
    }}</span>
    <span class="relative block">
      <input
        :id="id"
        :value="modelValue"
        :name="name"
        :type="visible ? 'text' : 'password'"
        autocomplete="current-password"
        :disabled="disabled"
        :aria-invalid="Boolean(error)"
        :aria-describedby="
          [ariaDescribedby, error && errorId].filter(Boolean).join(' ') || undefined
        "
        class="block h-11 w-full rounded-lg border bg-transparent px-4 py-2.5 pr-12 text-sm text-cms-foreground shadow-cms-card outline-none placeholder:text-cms-muted focus:border-[#9cb9ff] focus:ring-[3px] focus:ring-cms-primary/10 disabled:cursor-not-allowed disabled:bg-cms-muted-surface disabled:opacity-70 dark:bg-[#101828] dark:focus:border-[#252dae]"
        :class="error ? 'border-cms-destructive' : 'border-cms-border'"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <button
        type="button"
        class="absolute inset-y-0 right-1 my-auto grid size-9 place-items-center rounded-lg text-cms-muted outline-none hover:text-cms-foreground focus-visible:ring-2 focus-visible:ring-cms-focus"
        :aria-label="visible ? 'Hide password' : 'Show password'"
        @click="visible = !visible"
      >
        <CmsIcon :name="visible ? 'eye-off' : 'eye'" :size="20" />
      </button>
    </span>
    <span v-if="error" :id="errorId" class="mt-1 block text-sm text-cms-destructive" role="alert">
      {{ error }}
    </span>
  </label>
</template>
