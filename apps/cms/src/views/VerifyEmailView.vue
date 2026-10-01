<script lang="ts">
import { cmsApiClient } from '../stores/auth';

const verificationRequests = new Map<string, Promise<void>>();

function verifyOnce(value: string): Promise<void> {
  const existingRequest = verificationRequests.get(value);
  if (existingRequest) return existingRequest;

  const request = Promise.resolve().then(() => cmsApiClient.verifyEmail({ token: value }));
  verificationRequests.set(value, request);
  void request.then(
    () => {
      if (verificationRequests.get(value) === request) verificationRequests.delete(value);
    },
    () => {
      if (verificationRequests.get(value) === request) verificationRequests.delete(value);
    },
  );
  return request;
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { ApiError } from '../api/client';
import AuthLayout from '../components/AuthLayout.vue';

const expiredCode = 'verification_token_expired';
const invalidCode = 'invalid_or_used_verification_token';

const route = useRoute();
const router = useRouter();
const token = ref(
  typeof route.query.token === 'string' && route.query.token.length > 0 ? route.query.token : null,
);
const state = ref<'verifying' | 'verified' | 'expired' | 'invalid' | 'failed'>(
  token.value ? 'verifying' : 'invalid',
);
const isActive = ref(true);
const hasTokenQuery = Object.prototype.hasOwnProperty.call(route.query, 'token');
let verificationStarted = false;

function clearToken(): void {
  isActive.value = false;
  token.value = null;
}

onBeforeRouteLeave(clearToken);
onBeforeUnmount(clearToken);

async function verify(): Promise<void> {
  if (verificationStarted) return;
  verificationStarted = true;

  const capturedToken = token.value;
  try {
    if (hasTokenQuery) {
      await router.replace({
        path: route.path,
        query: Object.fromEntries(Object.entries(route.query).filter(([key]) => key !== 'token')),
        hash: route.hash,
      });
    }
    if (!isActive.value) return;
    if (capturedToken === null) return;

    await verifyOnce(capturedToken);
    if (isActive.value) state.value = 'verified';
  } catch (error) {
    if (!isActive.value) return;
    if (error instanceof ApiError && error.code === expiredCode) {
      state.value = 'expired';
    } else if (error instanceof ApiError && error.code === invalidCode) {
      state.value = 'invalid';
    } else {
      state.value = 'failed';
    }
  } finally {
    token.value = null;
  }
}

void verify();
</script>

<template>
  <AuthLayout title-id="verify-email-title">
    <section v-if="state === 'verifying'" role="status" aria-live="polite">
      <h1
        id="verify-email-title"
        class="mb-2 text-3xl font-semibold text-cms-foreground sm:text-4xl"
      >
        Verifying your email
      </h1>
      <p class="text-sm leading-6 text-cms-muted">
        Please wait while we check your verification link.
      </p>
    </section>

    <section v-else-if="state === 'verified'" role="status" aria-live="polite">
      <h1
        id="verify-email-title"
        class="mb-2 text-3xl font-semibold text-cms-foreground sm:text-4xl"
      >
        Email verified
      </h1>
      <p class="mb-6 text-sm leading-6 text-cms-muted">
        Your email address is verified. You can now sign in.
      </p>
      <RouterLink
        to="/login"
        class="inline-flex min-h-11 items-center rounded-lg px-1 text-sm font-medium text-cms-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-cms-focus dark:text-cms-primary-light"
      >
        Go to sign in
      </RouterLink>
    </section>

    <section v-else-if="state === 'expired'">
      <h1
        id="verify-email-title"
        class="mb-2 text-3xl font-semibold text-cms-foreground sm:text-4xl"
      >
        Verification link expired
      </h1>
      <p class="mb-6 text-sm leading-6 text-cms-muted">
        This verification link has expired. Use the process that sent the email to request another
        verification link.
      </p>
      <RouterLink
        to="/login"
        class="inline-flex min-h-11 items-center rounded-lg px-1 text-sm font-medium text-cms-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-cms-focus dark:text-cms-primary-light"
      >
        Go to sign in
      </RouterLink>
    </section>

    <section v-else-if="state === 'invalid'">
      <h1
        id="verify-email-title"
        class="mb-2 text-3xl font-semibold text-cms-foreground sm:text-4xl"
      >
        Verification link unavailable
      </h1>
      <p class="mb-6 text-sm leading-6 text-cms-muted">
        This verification link can't be used. It may be incomplete or may have already been used.
      </p>
      <RouterLink
        to="/login"
        class="inline-flex min-h-11 items-center rounded-lg px-1 text-sm font-medium text-cms-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-cms-focus dark:text-cms-primary-light"
      >
        Go to sign in
      </RouterLink>
    </section>

    <section v-else>
      <h1
        id="verify-email-title"
        class="mb-2 text-3xl font-semibold text-cms-foreground sm:text-4xl"
      >
        We couldn't verify your email
      </h1>
      <p class="mb-6 text-sm leading-6 text-cms-muted" role="alert" aria-live="assertive">
        Verification couldn't be completed. Reopen the link from your email to try again later.
      </p>
      <RouterLink
        to="/login"
        class="inline-flex min-h-11 items-center rounded-lg px-1 text-sm font-medium text-cms-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-cms-focus dark:text-cms-primary-light"
      >
        Go to sign in
      </RouterLink>
    </section>
  </AuthLayout>
</template>
