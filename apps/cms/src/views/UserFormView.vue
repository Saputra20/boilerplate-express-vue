<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '../api/client';
import type { ManagedUser, Role } from '../api/types';
import CmsButton from '../components/ui/CmsButton.vue';
import CmsCard from '../components/ui/CmsCard.vue';
import CmsInput from '../components/ui/CmsInput.vue';
import CmsLoadingState from '../components/ui/CmsLoadingState.vue';
import CmsSelect from '../components/ui/CmsSelect.vue';
import FeedbackState from '../components/FeedbackState.vue';
import { cmsApiClient } from '../stores/auth';

const props = defineProps<{ mode: 'create' | 'edit'; userId?: string }>();

const router = useRouter();
const user = ref<ManagedUser | null>(null);
const roles = ref<Role[]>([]);
const loading = ref(true);
const loadError = ref<string | null>(null);
const formError = ref<string | null>(null);
const saving = ref(false);
let loadGeneration = 0;

const editing = computed(() => props.mode === 'edit');
const form = reactive({ email: '', roleId: '', status: 'active' as 'active' | 'disabled' });

function resetForm(): void {
  Object.assign(form, { email: '', roleId: '', status: 'active' });
}

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof ApiError ? cause.message : fallback;
}

async function loadForm(): Promise<void> {
  const generation = ++loadGeneration;
  loading.value = true;
  loadError.value = null;
  formError.value = null;
  user.value = null;
  roles.value = [];
  resetForm();

  try {
    const roleRequest = cmsApiClient.listRoles({ page: 1, limit: 100, sort: 'name.asc' }).then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    const userRequest =
      editing.value && props.userId
        ? cmsApiClient.getUser(props.userId).then(
            (value) => ({ value }),
            (error: unknown) => ({ error }),
          )
        : Promise.resolve({ value: null });
    const [roleResult, userResult] = await Promise.all([roleRequest, userRequest]);
    if (generation !== loadGeneration) return;

    if ('error' in userResult) {
      loadError.value =
        userResult.error instanceof ApiError && userResult.error.status === 404
          ? 'User not found.'
          : errorMessage(userResult.error, 'Unable to load user details.');
      return;
    }
    if ('error' in roleResult) {
      loadError.value = errorMessage(roleResult.error, 'Unable to load roles.');
      return;
    }

    roles.value = roleResult.value.items;
    user.value = userResult.value;
    if (userResult.value) {
      Object.assign(form, {
        email: userResult.value.email,
        roleId: userResult.value.role?.id ?? '',
        status: userResult.value.status,
      });
    }
  } finally {
    if (generation === loadGeneration) loading.value = false;
  }
}

async function save(): Promise<void> {
  saving.value = true;
  formError.value = null;
  try {
    if (editing.value && props.userId) {
      await cmsApiClient.updateUser(props.userId, {
        email: form.email,
        roleId: form.roleId,
        status: form.status,
      });
    } else {
      await cmsApiClient.createUser({ email: form.email, roleId: form.roleId });
    }
    await router.push('/users');
  } catch (cause) {
    formError.value = errorMessage(cause, 'Unable to save user.');
  } finally {
    saving.value = false;
  }
}

watch(
  () => [props.mode, props.userId] as const,
  () => void loadForm(),
  { immediate: true },
);
</script>

<template>
  <section class="user-form w-full">
    <div class="w-full space-y-5">
      <CmsLoadingState v-if="loading" />

      <template v-else-if="loadError">
        <FeedbackState
          kind="error"
          :message="loadError"
          :retryable="loadError !== 'User not found.'"
          @retry="loadForm"
        />
        <div class="flex justify-end">
          <CmsButton variant="outline" @click="router.push('/users')">Cancel</CmsButton>
        </div>
      </template>

      <form v-else class="space-y-5" @submit.prevent="save">
        <CmsCard title="User information">
          <div class="space-y-4">
            <CmsInput v-model="form.email" name="email" label="Email" type="email" required />
            <CmsSelect
              v-model="form.roleId"
              name="roleId"
              label="Role"
              required
              :disabled="roles.length === 0 || saving"
            >
              <option value="" disabled>Select a role</option>
              <option v-for="role in roles" :key="role.id" :value="role.id">
                {{ role.name }}
              </option>
            </CmsSelect>
            <p v-if="roles.length === 0" class="text-sm text-cms-muted" role="status">
              No roles are available.
            </p>
            <CmsSelect v-if="editing" v-model="form.status" name="status" label="Status">
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </CmsSelect>
            <p v-else class="rounded-cms-sm bg-cms-muted-surface p-3 text-sm text-cms-muted">
              A default password will be assigned. The user must change it at first login.
            </p>
          </div>
        </CmsCard>

        <p v-if="formError" role="alert" class="text-sm text-cms-destructive">
          {{ formError }}
        </p>
        <div class="flex flex-wrap justify-end gap-3">
          <CmsButton
            type="button"
            variant="outline"
            :disabled="saving"
            @click="router.push('/users')"
          >
            Cancel
          </CmsButton>
          <CmsButton type="submit" :loading="saving" :disabled="roles.length === 0">
            {{ editing ? 'Update user' : 'Create user' }}
          </CmsButton>
        </div>
      </form>
    </div>
  </section>
</template>
