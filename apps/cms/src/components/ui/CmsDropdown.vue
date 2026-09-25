<template>
  <details class="relative">
    <summary class="list-none cursor-pointer outline-none [&::-webkit-details-marker]:hidden">
      <slot name="trigger" />
    </summary>
    <div
      class="absolute right-0 top-full z-40 mt-2 min-w-48 rounded-cms-md border border-cms-border bg-cms-surface p-2 shadow-cms-lg"
    >
      <slot />
    </div>
  </details>
</template>
