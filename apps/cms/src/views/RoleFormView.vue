<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '../api/client';
import type { PermissionCatalogItem, Role } from '../api/types';
import CmsButton from '../components/ui/CmsButton.vue';
import CmsCard from '../components/ui/CmsCard.vue';
import CmsInput from '../components/ui/CmsInput.vue';
import CmsLoadingState from '../components/ui/CmsLoadingState.vue';
import FeedbackState from '../components/FeedbackState.vue';
import RolePermissionSelector from '../components/RolePermissionSelector.vue';
import { cmsApiClient } from '../stores/auth';

const props = defineProps<{ mode: 'create' | 'edit'; roleId?: string }>();

const router = useRouter();
const role = ref<Role | null>(null);
const permissions = ref<PermissionCatalogItem[]>([]);
const loading = ref(true);
const loadError = ref<string | null>(null);
const formError = ref<string | null>(null);
const saving = ref(false);
let loadGeneration = 0;

const editing = computed(() => props.mode === 'edit');
const form = reactive({ code: '', name: '', description: '', permissionCodes: [] as string[] });

function resetForm(): void {
  Object.assign(form, { code: '', name: '', description: '', permissionCodes: [] });
}

async function loadForm(): Promise<void> {
  const generation = ++loadGeneration;
  loading.value = true;
  loadError.value = null;
  formError.value = null;
  role.value = null;
  resetForm();

  try {
    const catalogRequest = cmsApiClient.listPermissionCatalog().then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    const roleRequest =
      editing.value && props.roleId
        ? cmsApiClient.getRole(props.roleId).then(
            (value) => ({ value }),
            (error: unknown) => ({ error }),
          )
        : Promise.resolve({ value: null });
    const [catalogResult, roleResult] = await Promise.all([catalogRequest, roleRequest]);
    if (generation !== loadGeneration) return;

    if ('error' in roleResult) {
      loadError.value =
        roleResult.error instanceof ApiError && roleResult.error.status === 404
          ? 'Role not found.'
          : roleResult.error instanceof ApiError
            ? roleResult.error.message
            : 'Unable to load role details.';
      return;
    }
    if ('error' in catalogResult) throw catalogResult.error;

    permissions.value = catalogResult.value;
    role.value = roleResult.value;
    const currentRole = roleResult.value;
    if (currentRole) {
      Object.assign(form, {
        code: currentRole.code,
        name: currentRole.name,
        description: currentRole.description ?? '',
        permissionCodes: [...currentRole.permissionCodes],
      });
    }
  } catch (cause) {
    if (generation !== loadGeneration) return;
    loadError.value = cause instanceof ApiError ? cause.message : 'Unable to load permissions.';
  } finally {
    if (generation === loadGeneration) loading.value = false;
  }
}

async function save(): Promise<void> {
  saving.value = true;
  formError.value = null;
  try {
    const description = form.description || null;
    if (editing.value && props.roleId) {
      await cmsApiClient.updateRole(props.roleId, {
        name: form.name,
        description,
        permissionCodes: form.permissionCodes,
      });
    } else {
      await cmsApiClient.createRole({
        code: form.code,
        name: form.name,
        description,
        permissionCodes: form.permissionCodes,
      });
    }
    await router.push('/roles');
  } catch (cause) {
    formError.value = cause instanceof ApiError ? cause.message : 'Unable to save role.';
  } finally {
    saving.value = false;
  }
}

watch(
  () => [props.mode, props.roleId] as const,
  () => void loadForm(),
  { immediate: true },
);
</script>

<template>
  <section class="role-form w-full">
    <div class="w-full space-y-5">
      <CmsLoadingState v-if="loading" />

      <template v-else-if="loadError">
        <FeedbackState
          kind="error"
          :message="loadError"
          :retryable="loadError !== 'Role not found.'"
          @retry="loadForm"
        />
        <div class="flex justify-end">
          <CmsButton variant="outline" @click="router.push('/roles')">Cancel</CmsButton>
        </div>
      </template>

      <form v-else class="space-y-5" @submit.prevent="save">
        <CmsCard title="Role information">
          <div class="space-y-4">
            <div v-if="!editing">
              <CmsInput
                v-model="form.code"
                name="code"
                label="Code"
                required
                pattern="[a-z][a-z0-9_]*"
                :max-length="64"
                title="Use lowercase letters, numbers, and underscores; start with a letter."
                aria-describedby="role-code-help"
              />
              <p id="role-code-help" class="mt-1 text-xs text-cms-muted">
                Start with a lowercase letter; use lowercase letters, numbers, and underscores only
                (64 characters maximum).
              </p>
            </div>
            <div v-else>
              <p class="mb-1.5 text-sm font-medium text-cms-foreground">Code</p>
              <p
                class="min-h-11 rounded-lg border border-cms-border bg-cms-muted-surface px-4 py-3 font-mono text-sm text-cms-muted"
              >
                {{ role?.code }}
              </p>
              <p class="mt-1 text-xs text-cms-muted">Role code cannot be changed.</p>
            </div>
            <CmsInput v-model="form.name" name="name" label="Name" required />
            <CmsInput
              v-model="form.description"
              name="description"
              label="Description"
              placeholder="Optional"
            />
          </div>
        </CmsCard>

        <CmsCard title="Permissions">
          <RolePermissionSelector v-model="form.permissionCodes" :catalog="permissions" />
        </CmsCard>

        <p v-if="formError" role="alert" class="text-sm text-cms-destructive">
          {{ formError }}
        </p>
        <div class="flex flex-wrap justify-end gap-3">
          <CmsButton
            type="button"
            variant="outline"
            :disabled="saving"
            @click="router.push('/roles')"
          >
            Cancel
          </CmsButton>
          <CmsButton type="submit" :loading="saving">
            {{ editing ? 'Update role' : 'Create role' }}
          </CmsButton>
        </div>
      </form>
    </div>
  </section>
</template>

<style scoped>
.role-form :deep(input:not([type='checkbox'])) {
  border-color: var(--cms-color-muted);
}

.role-form :deep(input:not([type='checkbox']):focus-visible) {
  border-color: var(--cms-color-focus);
  outline: 2px solid var(--cms-color-focus);
  outline-offset: 2px;
}
</style>
