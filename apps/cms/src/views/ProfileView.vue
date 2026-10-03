<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '../api/client';
import { updateCurrentProfileRequestSchema } from '../api/types';
import FeedbackState from '../components/FeedbackState.vue';
import CmsButton from '../components/ui/CmsButton.vue';
import CmsCard from '../components/ui/CmsCard.vue';
import CmsInput from '../components/ui/CmsInput.vue';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const form = reactive({ displayName: '' });
const originalDisplayName = ref<string | null>(null);
const displayNameError = ref<string | null>(null);
const formError = ref<string | null>(null);
const success = ref(false);
const isLoading = ref(true);
const isSubmitting = ref(false);
const loadFailed = ref(false);

function clearFeedback(): void {
  displayNameError.value = null;
  formError.value = null;
  success.value = false;
}

async function handleFailure(error: unknown, fallback: string): Promise<void> {
  if (error instanceof ApiError && error.status === 401) {
    auth.clearSession();
    await router.replace({ name: 'login', query: { returnTo: '/profile' } });
    return;
  }
  if (error instanceof ApiError && error.code === 'password_change_required') {
    formError.value = 'Your account requires a password change before you can update your profile.';
    return;
  }
  if (error instanceof ApiError && error.status === 429) {
    formError.value = 'Too many requests. Wait a moment, then try again.';
    return;
  }
  formError.value = fallback;
}

async function loadProfile(): Promise<void> {
  isLoading.value = true;
  loadFailed.value = false;
  formError.value = null;
  try {
    await auth.reloadIdentity();
    originalDisplayName.value = auth.identity?.displayName ?? null;
    form.displayName = originalDisplayName.value ?? '';
  } catch (error) {
    await handleFailure(error, 'We could not load your profile. Try again.');
    loadFailed.value = true;
  } finally {
    isLoading.value = false;
  }
}

async function submit(): Promise<void> {
  if (isSubmitting.value) return;
  clearFeedback();
  const result = updateCurrentProfileRequestSchema.safeParse(form);
  if (!result.success) {
    displayNameError.value = result.error.issues[0]?.message ?? 'Enter a valid display name.';
    document.getElementById('profile-display-name')?.focus();
    return;
  }

  if (result.data.displayName === originalDisplayName.value) {
    form.displayName = result.data.displayName;
    return;
  }

  isSubmitting.value = true;
  try {
    await auth.updateCurrentUserProfile({ displayName: result.data.displayName });
    originalDisplayName.value = auth.identity?.displayName ?? result.data.displayName;
    form.displayName = originalDisplayName.value ?? '';
    success.value = true;
  } catch (error) {
    await handleFailure(
      error,
      'We could not save your profile. Check your connection and try again.',
    );
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(() => void loadProfile());
</script>

<template>
  <section class="w-full max-w-3xl">
    <p v-if="isLoading" class="py-4 text-sm text-cms-muted" role="status">Loading your profile…</p>
    <FeedbackState
      v-else-if="loadFailed"
      class="mb-5"
      kind="error"
      :message="formError ?? 'We could not load your profile. Try again.'"
      retryable
      @retry="loadProfile"
    />
    <CmsCard
      v-else
      title="Profile details"
      description="Update the name shown with your account. Your email and access are managed separately."
    >
      <FeedbackState
        v-if="formError"
        class="mb-5"
        kind="error"
        :message="formError"
        retryable
        @retry="loadProfile"
      />
      <p v-if="success" class="mb-5 text-sm font-medium text-cms-success-strong" role="status">
        Your profile has been saved.
      </p>

      <form class="space-y-6" novalidate @submit.prevent="submit">
        <div>
          <CmsInput
            id="profile-display-name"
            v-model="form.displayName"
            label="Display name"
            name="displayName"
            placeholder="Your display name"
            :required="true"
            :error="displayNameError ?? undefined"
            error-id="profile-display-name-error"
            aria-describedby="profile-display-name-hint"
            :disabled="isSubmitting"
            @update:model-value="clearFeedback"
          />
          <p id="profile-display-name-hint" class="mt-1.5 text-sm text-cms-muted">
            Use 1 to 80 characters. Spaces at the beginning and end are removed when saved.
          </p>
        </div>

        <div class="border-t border-cms-border pt-5">
          <h2 class="mb-4 text-sm font-semibold text-cms-foreground">Read-only account details</h2>
          <dl class="grid min-w-0 gap-x-8 gap-y-4 sm:grid-cols-2">
            <div class="min-w-0">
              <dt class="text-sm text-cms-muted">Email</dt>
              <dd class="mt-1 break-words text-sm font-medium text-cms-foreground">
                {{ auth.identity?.email ?? '—' }}
              </dd>
            </div>
            <div class="min-w-0">
              <dt class="text-sm text-cms-muted">Roles</dt>
              <dd class="mt-1 break-words text-sm font-medium text-cms-foreground">
                {{ auth.identity?.roles.join(', ') || 'No roles assigned' }}
              </dd>
            </div>
            <div class="min-w-0 sm:col-span-2">
              <dt class="text-sm text-cms-muted">Permissions</dt>
              <dd class="mt-1 break-words text-sm text-cms-foreground [overflow-wrap:anywhere]">
                {{ auth.identity?.effectivePermissions.join(', ') || 'No permissions assigned' }}
              </dd>
            </div>
          </dl>
        </div>

        <div class="flex justify-end border-t border-cms-border pt-5">
          <CmsButton type="submit" :loading="isSubmitting">
            {{ isSubmitting ? 'Saving…' : 'Save changes' }}
          </CmsButton>
        </div>
      </form>
    </CmsCard>
  </section>
</template>
