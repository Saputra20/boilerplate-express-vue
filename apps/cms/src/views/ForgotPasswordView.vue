<script setup lang="ts">
import { nextTick, reactive, ref } from 'vue';
import { z } from 'zod';
import { ApiError } from '../api/client';
import AuthLayout from '../components/AuthLayout.vue';
import FeedbackState from '../components/FeedbackState.vue';
import CmsButton from '../components/ui/CmsButton.vue';
import CmsInput from '../components/ui/CmsInput.vue';
import { cmsApiClient } from '../stores/auth';

const forgotPasswordSchema = z.object({ email: z.email('Enter a valid email address') }).strict();
const form = reactive({ email: '' });
const emailError = ref<string | undefined>();
const formError = ref<string | null>(null);
const formErrorKind = ref<'error' | 'unavailable'>('error');
const isSubmitting = ref(false);
const isAccepted = ref(false);

function validate(): boolean {
  const result = forgotPasswordSchema.safeParse(form);
  emailError.value = result.success ? undefined : result.error.issues[0]?.message;
  if (result.success) return true;

  void nextTick(() => document.getElementById('forgot-password-email')?.focus());
  return false;
}

function clearFormError(): void {
  formError.value = null;
  formErrorKind.value = 'error';
}

function applyRequestError(error: unknown): void {
  if (!(error instanceof ApiError)) {
    formErrorKind.value = 'error';
    formError.value = 'Unable to submit your request. Try again.';
    return;
  }

  if (error.status === 429) {
    formErrorKind.value = 'error';
    formError.value = 'Too many requests. Try again later.';
    return;
  }

  if (error.kind === 'network' || error.kind === 'timeout') {
    formErrorKind.value = 'unavailable';
    formError.value = 'Password recovery is unavailable. Check your connection and try again.';
    return;
  }

  formErrorKind.value = 'error';
  formError.value = 'Unable to submit your request. Check the email and try again.';
}

async function submit(): Promise<void> {
  if (isSubmitting.value || isAccepted.value || !validate()) return;

  isSubmitting.value = true;
  clearFormError();
  try {
    await cmsApiClient.requestPasswordReset({ email: form.email });
    isAccepted.value = true;
  } catch (error) {
    applyRequestError(error);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <AuthLayout title-id="forgot-password-title">
    <template v-if="isAccepted">
      <section role="status" aria-live="polite">
        <div class="mb-8">
          <h1
            id="forgot-password-title"
            class="mb-2 text-3xl font-semibold text-cms-foreground sm:text-4xl"
          >
            Check your email
          </h1>
          <p class="text-sm leading-6 text-cms-muted">
            If the account is eligible for a password reset, a reset email will be sent.
          </p>
        </div>
        <RouterLink
          to="/login"
          class="inline-flex min-h-11 items-center rounded-lg px-1 text-sm font-medium text-cms-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-cms-focus"
        >
          Back to sign in
        </RouterLink>
      </section>
    </template>

    <template v-else>
      <div class="mb-8">
        <h1
          id="forgot-password-title"
          class="mb-2 text-3xl font-semibold text-cms-foreground sm:text-4xl"
        >
          Forgot password
        </h1>
        <p class="text-sm leading-6 text-cms-muted">
          Enter your email address. If the account is eligible, we will send a password reset link.
        </p>
      </div>

      <FeedbackState v-if="formError" class="mb-5" :kind="formErrorKind" :message="formError" />

      <form class="space-y-5" novalidate @submit.prevent="submit">
        <CmsInput
          id="forgot-password-email"
          v-model="form.email"
          label="Email"
          name="email"
          type="email"
          placeholder="name@example.com"
          error-id="forgot-password-email-error"
          :error="emailError"
          :disabled="isSubmitting"
        />
        <CmsButton
          id="forgot-password-submit"
          type="submit"
          class="min-h-12 w-full py-3 font-medium shadow-cms-card"
          :loading="isSubmitting"
        >
          {{ isSubmitting ? 'Sending request…' : 'Send reset link' }}
        </CmsButton>
      </form>

      <RouterLink
        to="/login"
        class="mt-4 inline-flex min-h-11 items-center rounded-lg px-1 text-sm font-medium text-cms-muted underline-offset-4 hover:text-cms-foreground hover:underline focus-visible:ring-2 focus-visible:ring-cms-focus"
      >
        Back to sign in
      </RouterLink>
    </template>
  </AuthLayout>
</template>
