<script setup lang="ts">
import { nextTick, onBeforeUnmount, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { z } from 'zod';
import { ApiError } from '../api/client';
import CmsCard from '../components/ui/CmsCard.vue';
import CmsButton from '../components/ui/CmsButton.vue';
import CmsPasswordInput from '../components/ui/CmsPasswordInput.vue';
import FeedbackState from '../components/FeedbackState.vue';
import { PASSWORD_POLICY_MESSAGE, passwordPolicySchema } from '../forms/password-policy';
import { useAuthStore } from '../stores/auth';

const formSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: passwordPolicySchema,
    confirmation: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmation, {
    path: ['confirmation'],
    message: 'The passwords must match.',
  });

type Field = 'currentPassword' | 'newPassword' | 'confirmation';
const fieldIds: Record<Field, string> = {
  currentPassword: 'self-service-current-password',
  newPassword: 'self-service-new-password',
  confirmation: 'self-service-password-confirmation',
};

const auth = useAuthStore();
const router = useRouter();
const form = reactive({ currentPassword: '', newPassword: '', confirmation: '' });
const errors = reactive<Partial<Record<Field, string>>>({});
const formError = ref<string | null>(null);
const success = ref(false);
const isSubmitting = ref(false);

function clearSensitiveState(): void {
  form.currentPassword = '';
  form.newPassword = '';
  form.confirmation = '';
}

onBeforeUnmount(clearSensitiveState);

function clearErrors(): void {
  errors.currentPassword = undefined;
  errors.newPassword = undefined;
  errors.confirmation = undefined;
  formError.value = null;
  success.value = false;
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
  const invalidField: Field | undefined = (
    ['currentPassword', 'newPassword', 'confirmation'] as const
  ).find((field) => errors[field]);
  if (invalidField) void nextTick(() => document.getElementById(fieldIds[invalidField])?.focus());
  return false;
}

function requestError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'invalid_current_password') {
      errors.currentPassword = 'That current password is incorrect.';
      return '';
    }
    if (error.code === 'password_policy_violation') {
      errors.newPassword = PASSWORD_POLICY_MESSAGE;
      return '';
    }
    if (error.code === 'password_unchanged') {
      errors.newPassword = 'Choose a password different from your current password.';
      return '';
    }
    if (error.status === 429) return 'Too many attempts. Try again later.';
  }
  return 'Unable to change your password. Check your connection and try again.';
}

async function handleRequiredPasswordChange(): Promise<void> {
  try {
    await auth.reloadIdentity();
    if (auth.identity?.mustChangePassword === true) {
      clearSensitiveState();
      await router.replace('/change-password');
      return;
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await returnToLogin();
      return;
    }
  }
  formError.value = 'Your account requires a password change before this action can continue.';
}

async function returnToLogin(): Promise<void> {
  clearSensitiveState();
  auth.clearSession();
  await router.replace({
    name: 'login',
    query: { returnTo: '/settings/change-password' },
  });
}

async function submit(): Promise<void> {
  if (isSubmitting.value || !validate()) return;
  isSubmitting.value = true;
  try {
    await auth.changeCurrentUserPassword({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    });
    clearSensitiveState();
    success.value = true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await returnToLogin();
      return;
    }
    if (error instanceof ApiError && error.code === 'password_change_required') {
      await handleRequiredPasswordChange();
      return;
    }
    formError.value = requestError(error) || null;
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <section class="w-full max-w-3xl">
    <CmsCard
      title="Update password"
      description="Choose a new password for your account. Use 12 to 128 Unicode code points; spaces are allowed."
    >
      <FeedbackState v-if="formError" class="mb-5" kind="error" :message="formError" />
      <p v-if="success" class="mb-5 text-sm font-medium text-cms-success-strong" role="status">
        Your password has been changed.
      </p>

      <form class="space-y-5" novalidate @submit.prevent="submit">
        <CmsPasswordInput
          :id="fieldIds.currentPassword"
          v-model="form.currentPassword"
          label="Current password"
          name="currentPassword"
          autocomplete="current-password"
          error-id="self-service-current-password-error"
          :error="errors.currentPassword"
          :disabled="isSubmitting"
        />
        <CmsPasswordInput
          :id="fieldIds.newPassword"
          v-model="form.newPassword"
          label="New password"
          name="newPassword"
          autocomplete="new-password"
          error-id="self-service-new-password-error"
          :error="errors.newPassword"
          :disabled="isSubmitting"
        />
        <CmsPasswordInput
          :id="fieldIds.confirmation"
          v-model="form.confirmation"
          label="Confirm new password"
          name="confirmation"
          autocomplete="new-password"
          error-id="self-service-password-confirmation-error"
          :error="errors.confirmation"
          :disabled="isSubmitting"
        />
        <div class="flex justify-end">
          <CmsButton type="submit" :loading="isSubmitting">
            {{ isSubmitting ? 'Updating password…' : 'Change password' }}
          </CmsButton>
        </div>
      </form>
    </CmsCard>
  </section>
</template>
