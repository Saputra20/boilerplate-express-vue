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
  <main class="min-h-screen bg-cms-shell-surface lg:flex">
    <section class="flex min-h-screen w-full flex-col px-6 py-6 sm:px-10 lg:w-1/2 lg:px-12">
      <header class="flex justify-end">
        <button
          type="button"
          class="grid size-10 place-items-center rounded-lg text-cms-muted outline-none transition-colors hover:bg-cms-muted-surface focus-visible:ring-2 focus-visible:ring-cms-focus"
          :aria-label="theme === 'dark' ? 'Use light theme' : 'Use dark theme'"
          @click="toggleTheme"
        >
          <CmsIcon :name="theme === 'dark' ? 'sun' : 'moon'" />
        </button>
      </header>

      <section aria-labelledby="login-title" class="flex flex-1 items-center justify-center py-12">
        <div class="w-full max-w-md">
          <div class="mb-8">
            <h1
              id="login-title"
              class="mb-2 text-3xl font-semibold text-cms-foreground sm:text-4xl"
            >
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
            <CmsButton
              type="submit"
              class="min-h-12 w-full py-3 font-medium shadow-cms-card"
              :loading="isSubmitting"
            >
              {{ isSubmitting ? 'Signing in…' : 'Sign in' }}
            </CmsButton>
          </form>
        </div>
      </section>
    </section>

    <aside
      class="relative hidden min-h-screen w-1/2 place-items-center overflow-hidden bg-[#161950] px-10 text-white dark:bg-white/[0.05] lg:grid"
      aria-label="CMS branding"
    >
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:48px_48px]"
      />
      <div class="relative z-10 flex max-w-sm flex-col items-center text-center">
        <span
          class="mb-6 grid size-16 place-items-center rounded-2xl border border-white/15 bg-white/10 text-2xl font-semibold text-white"
          aria-hidden="true"
          >C</span
        >
        <p class="text-2xl font-semibold">Content management</p>
        <p class="mt-3 text-sm leading-6 text-white/60">
          A clear workspace for managing your content and access.
        </p>
      </div>
    </aside>
  </main>
</template>
