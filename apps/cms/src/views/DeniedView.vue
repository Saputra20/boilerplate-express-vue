<template>
  <section aria-labelledby="denied-title" class="mx-auto w-full max-w-2xl">
    <div class="rounded-cms-md border border-cms-warning/30 bg-amber-50 p-cms-6 text-cms-warning">
      <h1 id="denied-title" class="text-2xl font-semibold tracking-tight">Access denied</h1>
      <p class="mt-cms-2 text-sm leading-6">You do not have access to this area.</p>
      <RouterLink
        to="/"
        class="mt-cms-6 inline-flex min-h-11 items-center rounded-cms-sm border border-current px-cms-4 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-cms-focus focus-visible:ring-offset-2"
      >
        Back to Home
      </RouterLink>
    </div>
  </section>
</template>
