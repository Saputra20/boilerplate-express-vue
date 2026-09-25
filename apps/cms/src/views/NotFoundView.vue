<template>
  <main class="grid min-h-screen place-items-center bg-cms-background px-cms-6 py-cms-8">
    <section aria-labelledby="not-found-title" class="w-full max-w-md">
      <p class="text-sm font-medium text-cms-muted">404</p>
      <h1 id="not-found-title" class="mt-cms-2 text-2xl font-semibold tracking-tight text-cms-foreground">
        Page not found
      </h1>
      <p class="mt-cms-2 text-sm leading-6 text-cms-muted">This page is not available in the CMS.</p>
      <RouterLink
        to="/"
        class="mt-cms-6 inline-flex min-h-11 items-center rounded-cms-md border border-cms-border bg-cms-surface px-cms-4 text-sm font-medium text-cms-muted outline-none hover:bg-cms-muted-surface focus-visible:ring-2 focus-visible:ring-cms-focus focus-visible:ring-offset-2"
      >
        Back to Home
      </RouterLink>
    </section>
  </main>
</template>
