<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { z } from 'zod';
import { ApiError } from '../api/client';
import AuthLayout from '../components/AuthLayout.vue';
import FeedbackState from '../components/FeedbackState.vue';
import { sanitizeReturnTo } from '../router/return-to';
import { useAuthStore } from '../stores/auth';
import CmsButton from '../components/ui/CmsButton.vue';
import CmsInput from '../components/ui/CmsInput.vue';
import CmsPasswordInput from '../components/ui/CmsPasswordInput.vue';

const loginFormSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

type FieldName = 'email' | 'password';
type FormErrors = Partial<Record<FieldName, string>>;

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const form = reactive({ email: '', password: '' });
const errors = reactive<FormErrors>({});
const formError = ref<string | null>(null);
const formErrorKind = ref<'error' | 'unavailable'>('error');
const isSubmitting = ref(false);
const firstInvalidField = ref<FieldName | null>(null);

const returnTo = computed(() => sanitizeReturnTo(route.query.returnTo));

function clearErrors(): void {
  errors.email = undefined;
  errors.password = undefined;
  formError.value = null;
  formErrorKind.value = 'error';
  firstInvalidField.value = null;
}

function applyValidationErrors(): boolean {
  const result = loginFormSchema.safeParse(form);
  if (result.success) return true;

  clearErrors();
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if ((field === 'email' || field === 'password') && !errors[field])
      errors[field] = issue.message;
  }
  firstInvalidField.value = errors.email ? 'email' : 'password';
  void nextTick(() => document.getElementById(`login-${firstInvalidField.value}`)?.focus());
  return false;
}

function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Unable to sign in. Try again.';
  if (error.status === 401) return 'Unable to sign in with those credentials.';
  if (error.status === 429) return 'Too many sign-in attempts. Try again later.';
  if (error.kind === 'network' || error.kind === 'timeout') {
    return 'Sign-in is unavailable. Check your connection and try again.';
  }
  return 'Unable to sign in. Try again.';
}

async function submit(): Promise<void> {
  if (isSubmitting.value || !applyValidationErrors()) return;

  isSubmitting.value = true;
  clearErrors();
  try {
    await auth.login({ email: form.email, password: form.password });
    await router.replace(returnTo.value);
  } catch (error) {
    formErrorKind.value =
      error instanceof ApiError && (error.kind === 'network' || error.kind === 'timeout')
        ? 'unavailable'
        : 'error';
    formError.value = errorMessage(error);
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(async () => {
  if (auth.isAuthenticated()) {
    await router.replace('/');
    return;
  }
  await auth.restore();
  if (auth.isAuthenticated()) await router.replace('/');
});
</script>

<template>
  <AuthLayout title-id="login-title">
    <div class="mb-8">
      <h1 id="login-title" class="mb-2 text-3xl font-semibold text-cms-foreground sm:text-4xl">
        Sign in
      </h1>
      <p class="text-sm text-cms-muted">Enter your email and password to sign in.</p>
    </div>

    <FeedbackState v-if="formError" class="mb-5" :kind="formErrorKind" :message="formError" />

    <form class="space-y-5" novalidate @submit.prevent="submit">
      <CmsInput
        id="login-email"
        v-model="form.email"
        label="Email"
        name="email"
        type="email"
        placeholder="name@example.com"
        error-id="login-email-error"
        :error="errors.email"
        :disabled="isSubmitting"
      />
      <CmsPasswordInput
        id="login-password"
        v-model="form.password"
        label="Password"
        name="password"
        placeholder="Enter your password"
        error-id="login-password-error"
        :error="errors.password"
        :disabled="isSubmitting"
      />
      <div class="flex justify-end">
        <RouterLink
          to="/forgot-password"
          class="inline-flex min-h-11 items-center px-1 text-sm font-medium text-cms-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-cms-focus"
        >
          Forgot password?
        </RouterLink>
      </div>
      <CmsButton
        type="submit"
        class="min-h-12 w-full py-3 font-medium shadow-cms-card"
        :loading="isSubmitting"
      >
        {{ isSubmitting ? 'Signing in…' : 'Sign in' }}
      </CmsButton>
    </form>
  </AuthLayout>
</template>
