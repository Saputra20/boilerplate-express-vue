<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { z } from 'zod';
import { ApiError } from '../api/client';
import FeedbackState from '../components/FeedbackState.vue';
import { sanitizeReturnTo } from '../router/return-to';
import { useAuthStore } from '../stores/auth';
import CmsIcon from '../components/CmsIcon.vue';
import { useTheme } from '../composables/useTheme';
import CmsCard from '../components/ui/CmsCard.vue';
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
const { theme, toggleTheme } = useTheme();
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
  <main class="min-h-screen bg-cms-background px-4 py-6 sm:px-6 sm:py-10">
    <div
      class="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col justify-between gap-10"
    >
      <header class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span
            class="grid size-10 place-items-center rounded-cms-md bg-cms-primary text-sm font-bold text-cms-primary-contrast"
            >C</span
          >
          <div>
            <p class="text-sm font-semibold text-cms-foreground">CMS</p>
            <p class="text-xs text-cms-muted">Admin workspace</p>
          </div>
        </div>
        <button
          type="button"
          class="grid min-h-11 min-w-11 place-items-center rounded-cms-sm border border-cms-border text-cms-muted outline-none hover:bg-cms-muted-surface focus-visible:ring-2 focus-visible:ring-cms-focus"
          :aria-label="theme === 'dark' ? 'Use light theme' : 'Use dark theme'"
          @click="toggleTheme"
        >
          <CmsIcon :name="theme === 'dark' ? 'sun' : 'moon'" />
        </button>
      </header>

      <section aria-labelledby="login-title" class="mx-auto w-full max-w-md">
        <CmsCard>
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-cms-primary">
            Welcome back
          </p>
          <h1
            id="login-title"
            class="mt-3 text-2xl font-semibold tracking-tight text-cms-foreground"
          >
            Sign in to CMS
          </h1>
          <p class="mt-2 text-sm leading-6 text-cms-muted">
            Use your approved account to continue.
          </p>

          <FeedbackState v-if="formError" class="mt-5" :kind="formErrorKind" :message="formError" />

          <form class="mt-6 space-y-5" novalidate @submit.prevent="submit">
            <CmsInput
              id="login-email"
              v-model="form.email"
              label="Email"
              name="email"
              type="email"
              error-id="login-email-error"
              :error="errors.email"
              :disabled="isSubmitting"
            />
            <CmsPasswordInput
              id="login-password"
              v-model="form.password"
              label="Password"
              name="password"
              error-id="login-password-error"
              :error="errors.password"
              :disabled="isSubmitting"
            />
            <CmsButton type="submit" class="w-full" :loading="isSubmitting">
              {{ isSubmitting ? 'Signing in…' : 'Sign in' }}
            </CmsButton>
          </form>
        </CmsCard>
      </section>
      <p class="text-center text-xs text-cms-muted">Secure access for authorized CMS users.</p>
    </div>
  </main>
</template>
