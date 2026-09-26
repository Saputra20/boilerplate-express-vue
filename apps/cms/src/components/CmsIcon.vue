<script setup lang="ts">
withDefaults(
  defineProps<{
    name:
      | 'home'
      | 'folder'
      | 'shield'
      | 'users'
      | 'menu'
      | 'sun'
      | 'moon'
      | 'chevron-down'
      | 'logout'
      | 'close'
      | 'eye'
      | 'eye-off'
      | 'dots'
      | 'search'
      | 'edit'
      | 'trash';
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
    <path
      v-else-if="name === 'folder'"
      d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z"
    />
    <path v-else-if="name === 'shield'" d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3Z" />
    <path
      v-else-if="name === 'users'"
      d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2m16 0v-2a4 4 0 0 0-3-3.87M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-7.87a4 4 0 0 1 0 7.75"
    />
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
    <path
      v-else-if="name === 'eye'"
      d="M2.5 12s3.2-6 9.5-6 9.5 6 9.5 6-3.2 6-9.5 6-9.5-6-9.5-6Zm6.5 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z"
    />
    <path
      v-else-if="name === 'eye-off'"
      d="m3 3 18 18M10.6 6.2A10.5 10.5 0 0 1 12 6c6.3 0 9.5 6 9.5 6a15.2 15.2 0 0 1-3 3.4M6.2 6.2C3.8 7.8 2.5 12 2.5 12s3.2 6 9.5 6c1.2 0 2.3-.2 3.3-.6M9.9 9.9a3 3 0 0 0 4.2 4.2"
    />
    <path
      v-else-if="name === 'search'"
      d="m20 20-4.5-4.5m2-5.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
    />
    <path v-else-if="name === 'edit'" d="m14 5 5 5M4 20l4.4-.9L19 8.5 15.5 5 5 15.5 4 20Z" />
    <path v-else-if="name === 'trash'" d="M4 7h16m-10 4v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" />
    <path v-else-if="name === 'dots'" d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="3.5" />
    <path v-else d="m6 6 12 12M18 6 6 18" />
  </svg>
</template>
