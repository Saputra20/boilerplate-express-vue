<script setup lang="ts">
import { computed } from 'vue';
import type { PermissionCatalogItem } from '../api/types';

type PermissionGroup = {
  key: string;
  label: string;
  permissions: Array<PermissionCatalogItem & { actionLabel: string }>;
};

const props = defineProps<{
  catalog: PermissionCatalogItem[];
  modelValue: string[];
  readOnly?: boolean;
}>();
const emit = defineEmits<{ 'update:modelValue': [codes: string[]] }>();

const groups = computed(() => {
  const grouped = new Map<string, PermissionGroup>();

  for (const permission of props.catalog) {
    const separator = permission.code.indexOf('.');
    const hasResourceAndAction = separator > 0 && separator < permission.code.length - 1;
    const resource = hasResourceAndAction ? permission.code.slice(0, separator) : 'other';
    const action = hasResourceAndAction ? permission.code.slice(separator + 1) : permission.code;
    const label = resource === 'other' ? 'Other' : titleCase(resource);
    const group = grouped.get(resource) ?? { key: resource, label, permissions: [] };
    group.permissions.push({ ...permission, actionLabel: titleCase(action) });
    grouped.set(resource, group);
  }

  return [...grouped.values()].sort((left, right) => left.label.localeCompare(right.label));
});

function titleCase(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function isSelected(code: string): boolean {
  return props.modelValue.includes(code);
}

function togglePermission(code: string, checked: boolean): void {
  emit(
    'update:modelValue',
    checked
      ? [...new Set([...props.modelValue, code])]
      : props.modelValue.filter((selected) => selected !== code),
  );
}

function groupSelected(group: PermissionGroup): boolean {
  return group.permissions.every((permission) => isSelected(permission.code));
}

function toggleGroup(group: PermissionGroup): void {
  const groupCodes = new Set(group.permissions.map((permission) => permission.code));
  const next = groupSelected(group)
    ? props.modelValue.filter((code) => !groupCodes.has(code))
    : [...new Set([...props.modelValue, ...groupCodes])];
  emit('update:modelValue', next);
}
</script>

<template>
  <div class="space-y-6">
    <p class="text-sm text-cms-muted">
      {{
        readOnly
          ? 'Assigned permissions are checked.'
          : 'Choose the permissions this role can use. Permissions are grouped by their resource.'
      }}
    </p>

    <div v-if="groups.length" class="space-y-5">
      <section
        v-for="group in groups"
        :key="group.key"
        class="min-w-0 border-t border-cms-border pt-4 first:border-t-0 first:pt-0"
        :aria-labelledby="`permission-group-${group.key}`"
      >
        <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h3
            :id="`permission-group-${group.key}`"
            class="text-sm font-semibold text-cms-foreground"
          >
            {{ group.label }}
          </h3>
          <button
            v-if="!readOnly"
            type="button"
            class="min-h-11 rounded-lg px-3 text-sm font-medium text-cms-primary outline-none hover:bg-cms-primary-soft focus-visible:ring-2 focus-visible:ring-cms-focus dark:text-cms-primary-light dark:hover:bg-cms-muted-surface"
            :aria-label="`${groupSelected(group) ? 'Clear' : 'Select all'} ${group.label} permissions`"
            :aria-pressed="groupSelected(group)"
            @click="toggleGroup(group)"
          >
            {{ groupSelected(group) ? 'Clear all' : 'Select all' }}
          </button>
        </div>

        <ul class="mt-2 grid min-w-0 gap-1 sm:grid-cols-2">
          <li v-for="permission in group.permissions" :key="permission.id" class="min-w-0">
            <label
              class="flex min-h-11 min-w-0 items-center gap-3 rounded-lg px-2 py-2 text-sm text-cms-foreground"
              :class="readOnly ? '' : 'cursor-pointer hover:bg-cms-muted-surface'"
            >
              <input
                type="checkbox"
                class="size-5 shrink-0 rounded border border-cms-muted accent-cms-primary focus-visible:ring-2 focus-visible:ring-cms-focus disabled:opacity-100 dark:bg-cms-muted-surface"
                :value="permission.code"
                :checked="isSelected(permission.code)"
                :disabled="readOnly"
                @change="
                  togglePermission(permission.code, ($event.target as HTMLInputElement).checked)
                "
              />
              <span class="min-w-0">
                <span class="block font-medium">{{ permission.actionLabel }}</span>
                <span class="block break-all font-mono text-xs text-cms-muted">{{
                  permission.code
                }}</span>
                <span v-if="permission.description" class="block text-xs text-cms-muted">{{
                  permission.description
                }}</span>
              </span>
            </label>
          </li>
        </ul>
      </section>
    </div>

    <p v-else class="text-sm text-cms-muted">No permissions are available.</p>
  </div>
</template>
