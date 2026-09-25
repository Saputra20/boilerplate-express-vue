<script setup lang="ts">
withDefaults(
  defineProps<{
    name: 'home' | 'menu' | 'sun' | 'moon' | 'chevron-down' | 'logout' | 'close';
    size?: number;
  }>(),
  { size: 20 },
);
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-if="name === 'home'" d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z" />
    <path v-else-if="name === 'menu'" d="M4 6h16M4 12h16M4 18h16" />
    <path
      v-else-if="name === 'sun'"
      d="M12 3v2m0 14v2M5.64 5.64l1.42 1.42m9.9 9.9 1.4 1.4M3 12h2m14 0h2M5.64 18.36l1.42-1.42m9.9-9.9 1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
    />
    <path
      v-else-if="name === 'moon'"
      d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z"
    />
    <path v-else-if="name === 'chevron-down'" d="m6 9 6 6 6-6" />
    <path
      v-else-if="name === 'logout'"
      d="M10 5H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h5m5-4 4-4-4-4m4 4H9"
    />
    <path v-else d="m6 6 12 12M18 6 6 18" />
  </svg>
</template>
