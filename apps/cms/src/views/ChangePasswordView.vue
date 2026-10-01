<script setup lang="ts">
import { nextTick, onBeforeUnmount, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { z } from 'zod';
import { ApiError } from '../api/client';
import AuthLayout from '../components/AuthLayout.vue';
import FeedbackState from '../components/FeedbackState.vue';
import CmsButton from '../components/ui/CmsButton.vue';
import CmsPasswordInput from '../components/ui/CmsPasswordInput.vue';
import { sanitizeReturnTo } from '../router/return-to';
import { useAuthStore } from '../stores/auth';

const formSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: z.string().superRefine((value, context) => {
      const length = Array.from(value).length;
      if (length < 12 || length > 128) {
        context.addIssue({
          code: 'custom',
          message: 'Password must be 12 to 128 Unicode code points.',
        });
      }
    }),
    confirmation: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmation, {
    path: ['confirmation'],
    message: 'The passwords must match.',
  });

type Field = 'currentPassword' | 'newPassword' | 'confirmation';
const fieldIds: Record<Field, string> = {
  currentPassword: 'change-current-password',
  newPassword: 'change-new-password',
  confirmation: 'change-password-confirmation',
};

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const form = reactive({ currentPassword: '', newPassword: '', confirmation: '' });
const errors = reactive<Partial<Record<Field, string>>>({});
const formError = ref<string | null>(null);
const isSubmitting = ref(false);
let isActive = true;

function clearSensitiveState(): void {
  form.currentPassword = '';
  form.newPassword = '';
  form.confirmation = '';
}

onBeforeUnmount(() => {
  isActive = false;
  clearSensitiveState();
});

function clearErrors(): void {
  errors.currentPassword = undefined;
  errors.newPassword = undefined;
  errors.confirmation = undefined;
  formError.value = null;
}

function validate(): boolean {
  clearErrors();
  const result = formSchema.safeParse(form);
  if (result.success) return true;

  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (
      (field === 'currentPassword' || field === 'newPassword' || field === 'confirmation') &&
      !errors[field]
    ) {
      errors[field] = issue.message;
    }
  }
  const validationOrder: Field[] = ['currentPassword', 'newPassword', 'confirmation'];
  const firstInvalid = validationOrder.find((field) => errors[field]);
  if (firstInvalid) void nextTick(() => document.getElementById(fieldIds[firstInvalid])?.focus());
  return false;
}

function requestError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'invalid_current_password') {
      errors.currentPassword = 'That current password is incorrect.';
      return '';
    }
    if (error.code === 'password_policy_violation') {
      errors.newPassword = 'Password must be 12 to 128 Unicode code points.';
      return '';
    }
    if (error.code === 'password_unchanged') {
      errors.newPassword = 'Choose a password different from your current password.';
      return '';
    }
    if (error.code === 'password_change_not_required')
      return 'Your account no longer requires a password change.';
    if (error.status === 429) return 'Too many attempts. Try again later.';
  }
  return 'Unable to change your password. Check your connection and try again.';
}

async function submit(): Promise<void> {
  if (isSubmitting.value || !validate()) return;
  isSubmitting.value = true;
  try {
    await auth.changePassword({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await returnToLogin();
      isSubmitting.value = false;
      return;
    }
    if (error instanceof ApiError && error.code === 'password_change_not_required') {
      try {
        await auth.reloadIdentity();
        if (isActive && auth.identity?.mustChangePassword === false) {
          clearSensitiveState();
          await router.replace(authenticatedLandingPath());
        } else if (isActive) {
          formError.value = 'Your account status could not be confirmed. Try again.';
        }
      } catch {
        if (isActive) formError.value = 'Your account status could not be confirmed. Try again.';
      }
    } else if (isActive) {
      formError.value = requestError(error) || null;
    }
    isSubmitting.value = false;
    return;
  }

  clearSensitiveState();
  try {
    await auth.reloadIdentity();
    if (!isActive) return;
    if (auth.identity?.mustChangePassword !== false) {
      formError.value =
        'Your password changed, but your account status could not be confirmed. Reload to try again.';
      return;
    }
    await router.replace(authenticatedLandingPath());
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await returnToLogin();
      return;
    }
    if (isActive) {
      formError.value =
        'Your password changed, but your account status could not be confirmed. Reload to try again.';
    }
  } finally {
    isSubmitting.value = false;
  }
}

async function logout(): Promise<void> {
  await auth.logout().catch(() => undefined);
  await router.replace('/login');
}

function authenticatedLandingPath(): string {
  const destination = sanitizeReturnTo(route.query.returnTo);
  return destination === '/change-password' ? '/' : destination;
}

function passwordChangeReturnPath(): string {
  const destination = authenticatedLandingPath();
  return destination === '/'
    ? '/change-password'
    : `/change-password?returnTo=${encodeURIComponent(destination)}`;
}

async function returnToLogin(): Promise<void> {
  clearSensitiveState();
  auth.clearSession();
  await router.replace({ name: 'login', query: { returnTo: passwordChangeReturnPath() } });
}
</script>

<template>
  <AuthLayout title-id="change-password-title">
    <section>
      <div class="mb-8">
        <h1
          id="change-password-title"
          class="mb-2 text-3xl font-semibold text-cms-foreground sm:text-4xl"
        >
          Change your password
        </h1>
        <p class="text-sm leading-6 text-cms-muted">
          Set a new password to continue to the CMS. Use 12 to 128 Unicode code points; spaces are
          allowed.
        </p>
      </div>

      <FeedbackState v-if="formError" class="mb-5" kind="error" :message="formError" />

      <form class="space-y-5" novalidate @submit.prevent="submit">
        <CmsPasswordInput
          :id="fieldIds.currentPassword"
          v-model="form.currentPassword"
          label="Current password"
          name="currentPassword"
          autocomplete="current-password"
          error-id="change-current-password-error"
          :error="errors.currentPassword"
          :disabled="isSubmitting"
        />
        <CmsPasswordInput
          :id="fieldIds.newPassword"
          v-model="form.newPassword"
          label="New password"
          name="newPassword"
          autocomplete="new-password"
          error-id="change-new-password-error"
          :error="errors.newPassword"
          :disabled="isSubmitting"
        />
        <CmsPasswordInput
          :id="fieldIds.confirmation"
          v-model="form.confirmation"
          label="Confirm new password"
          name="confirmation"
          autocomplete="new-password"
          error-id="change-password-confirmation-error"
          :error="errors.confirmation"
          :disabled="isSubmitting"
        />
        <CmsButton
          type="submit"
          class="min-h-12 w-full py-3 font-medium shadow-cms-card"
          :loading="isSubmitting"
        >
          {{ isSubmitting ? 'Updating password…' : 'Change password' }}
        </CmsButton>
      </form>

      <button
        type="button"
        class="mt-4 inline-flex min-h-11 items-center px-1 text-sm font-medium text-cms-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-cms-focus dark:text-cms-primary-light"
        @click="logout"
      >
        Sign out
      </button>
    </section>
  </AuthLayout>
</template>
