<script setup lang="ts">
import { nextTick, onBeforeUnmount, reactive, ref } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { z } from 'zod';
import { ApiError } from '../api/client';
import AuthLayout from '../components/AuthLayout.vue';
import FeedbackState from '../components/FeedbackState.vue';
import CmsButton from '../components/ui/CmsButton.vue';
import CmsPasswordInput from '../components/ui/CmsPasswordInput.vue';
import { cmsApiClient } from '../stores/auth';

const passwordResetTokenErrorCode = 'invalid_or_expired_password_reset_token';

const resetFormSchema = z
  .object({
    password: z.string().superRefine((value, context) => {
      const codePointLength = Array.from(value).length;
      if (codePointLength < 12 || codePointLength > 128) {
        context.addIssue({
          code: 'custom',
          message: 'Password must be 12 to 128 Unicode code points.',
        });
      }
    }),
    confirmation: z.string(),
  })
  .refine((value) => value.password === value.confirmation, {
    path: ['confirmation'],
    message: 'The passwords must match.',
  });

type FieldName = 'password' | 'confirmation';
type FormErrors = Partial<Record<FieldName, string>>;

const route = useRoute();
const router = useRouter();
const token = ref(typeof route.query.token === 'string' ? route.query.token : null);
const form = reactive({ password: '', confirmation: '' });
const errors = reactive<FormErrors>({});
const formError = ref<string | null>(null);
const isSubmitting = ref(false);
const isInvalidToken = ref(false);
const isComplete = ref(false);

if (Object.prototype.hasOwnProperty.call(route.query, 'token')) {
  const query = { ...route.query };
  delete query.token;
  void router.replace({ path: route.path, query, hash: route.hash });
}

function clearSensitiveState(): void {
  token.value = null;
  form.password = '';
  form.confirmation = '';
}

onBeforeRouteLeave(clearSensitiveState);
onBeforeUnmount(clearSensitiveState);

function clearErrors(): void {
  errors.password = undefined;
  errors.confirmation = undefined;
  formError.value = null;
}

function validate(): boolean {
  clearErrors();
  const result = resetFormSchema.safeParse(form);
  if (result.success) return true;

  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if ((field === 'password' || field === 'confirmation') && !errors[field]) {
      errors[field] = issue.message;
    }
  }

  const firstInvalidField: FieldName = errors.password ? 'password' : 'confirmation';
  const inputId =
    firstInvalidField === 'password' ? 'reset-password' : 'reset-password-confirmation';
  void nextTick(() => document.getElementById(inputId)?.focus());
  return false;
}

function applyRequestError(error: unknown): void {
  if (error instanceof ApiError && error.code === passwordResetTokenErrorCode) {
    token.value = null;
    isInvalidToken.value = true;
    return;
  }

  if (error instanceof ApiError && error.status === 429) {
    formError.value = 'Too many reset attempts. Try again later.';
    return;
  }

  formError.value = 'Unable to reset your password. Check the fields and try again.';
}

async function submit(): Promise<void> {
  if (isSubmitting.value || token.value === null || !validate()) return;

  isSubmitting.value = true;
  clearErrors();
  try {
    await cmsApiClient.confirmPasswordReset({ token: token.value, password: form.password });
    token.value = null;
    form.password = '';
    form.confirmation = '';
    isComplete.value = true;
  } catch (error) {
    applyRequestError(error);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <AuthLayout title-id="reset-password-title">
    <template v-if="isComplete">
      <section role="status" aria-live="polite">
        <div class="mb-8">
          <h1
            id="reset-password-title"
            class="mb-2 text-3xl font-semibold text-cms-foreground sm:text-4xl"
          >
            Password reset complete
          </h1>
          <p class="text-sm leading-6 text-cms-muted">
            Your password has been changed and your active sessions have been revoked. Sign in with
            your new password.
          </p>
        </div>
        <RouterLink
          to="/login"
          class="inline-flex min-h-11 items-center rounded-lg px-1 text-sm font-medium text-cms-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-cms-focus dark:text-cms-primary-light"
        >
          Return to sign in
        </RouterLink>
      </section>
    </template>

    <template v-else-if="token === null || isInvalidToken">
      <section>
        <div class="mb-8">
          <h1
            id="reset-password-title"
            class="mb-2 text-3xl font-semibold text-cms-foreground sm:text-4xl"
          >
            {{ isInvalidToken ? 'This reset link is no longer valid' : 'Reset link unavailable' }}
          </h1>
          <p class="text-sm leading-6 text-cms-muted">
            This link is missing, expired, or has already been used. Request a new reset link to
            continue.
          </p>
        </div>
        <RouterLink
          to="/forgot-password"
          class="inline-flex min-h-11 items-center rounded-lg px-1 text-sm font-medium text-cms-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-cms-focus dark:text-cms-primary-light"
        >
          Request a new reset link
        </RouterLink>
      </section>
    </template>

    <template v-else>
      <div class="mb-8">
        <h1
          id="reset-password-title"
          class="mb-2 text-3xl font-semibold text-cms-foreground sm:text-4xl"
        >
          Set a new password
        </h1>
        <p class="text-sm leading-6 text-cms-muted">
          Use 12 to 128 Unicode code points. Spaces are allowed.
        </p>
      </div>

      <FeedbackState v-if="formError" class="mb-5" kind="error" :message="formError" />

      <form class="space-y-5" novalidate @submit.prevent="submit">
        <CmsPasswordInput
          id="reset-password"
          v-model="form.password"
          label="New password"
          name="password"
          autocomplete="new-password"
          error-id="reset-password-error"
          :error="errors.password"
          :disabled="isSubmitting"
        />
        <CmsPasswordInput
          id="reset-password-confirmation"
          v-model="form.confirmation"
          label="Confirm new password"
          name="confirmation"
          autocomplete="new-password"
          error-id="reset-password-confirmation-error"
          :error="errors.confirmation"
          :disabled="isSubmitting"
        />
        <CmsButton
          id="reset-password-submit"
          type="submit"
          class="min-h-12 w-full py-3 font-medium shadow-cms-card"
          :loading="isSubmitting"
        >
          {{ isSubmitting ? 'Updating password…' : 'Reset password' }}
        </CmsButton>
      </form>
    </template>
  </AuthLayout>
</template>
