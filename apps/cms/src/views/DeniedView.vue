<template>
  <section aria-labelledby="denied-title" class="w-full">
    <div
      class="rounded-xl border border-[#f79009]/40 bg-[#fffaeb] p-4 text-[#b54708] dark:border-[#f79009]/30 dark:bg-[#f79009]/15 dark:text-[#fdb022]"
    >
      <h1 id="denied-title" class="text-lg font-semibold">Access denied</h1>
      <p class="mt-1 text-sm leading-6">You do not have access to this area.</p>
      <RouterLink
        to="/"
        class="mt-4 inline-flex min-h-10 items-center rounded-lg border border-current px-4 py-2.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-cms-focus focus-visible:ring-offset-2"
      >
        Back to Home
      </RouterLink>
    </div>
  </section>
</template>
