export type NavigationItem = {
  label: string;
  to: string;
  icon?: 'home';
  permission?: string;
};

export const navigationItems: readonly NavigationItem[] = [
  { label: 'Home', to: '/', icon: 'home' },
];

export function filterNavigationItems(
  items: readonly NavigationItem[],
  can: (permission: string) => boolean,
): NavigationItem[] {
  return items.filter((item) => item.permission === undefined || can(item.permission));
}
