export type NavigationItem = {
  label: string;
  to: string;
  icon?: 'home' | 'folder' | 'shield' | 'users';
  permission?: string;
};

export const navigationItems: readonly NavigationItem[] = [
  { label: 'Home', to: '/', icon: 'home', permission: 'dashboard.read' },
  { label: 'Categories', to: '/categories', icon: 'folder', permission: 'category.read' },
  { label: 'Roles', to: '/roles', icon: 'shield', permission: 'role.read' },
  { label: 'Users', to: '/users', icon: 'users', permission: 'user.read' },
];

export function filterNavigationItems(
  items: readonly NavigationItem[],
  can: (permission: string) => boolean,
): NavigationItem[] {
  return items.filter((item) => item.permission === undefined || can(item.permission));
}
