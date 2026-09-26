<template>
  <main
    class="relative grid min-h-screen place-items-center overflow-hidden bg-cms-background px-6 py-10"
  >
    <section aria-labelledby="not-found-title" class="w-full max-w-[472px] text-center">
      <h1
        id="not-found-title"
        class="mb-8 text-6xl font-bold tracking-tight text-cms-foreground sm:text-7xl"
      >
        404
      </h1>
      <p class="text-base text-cms-muted sm:text-lg">This page is not available in the CMS.</p>
      <RouterLink
        to="/"
        class="mt-6 inline-flex min-h-11 items-center rounded-lg border border-cms-border bg-cms-surface px-5 py-3 text-sm font-medium text-cms-foreground shadow-cms-card outline-none hover:bg-cms-muted-surface focus-visible:ring-2 focus-visible:ring-cms-focus focus-visible:ring-offset-2"
      >
        Back to Home
      </RouterLink>
    </section>
  </main>
</template>
