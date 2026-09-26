import { describe, expect, it } from 'vitest';
import { filterNavigationItems, navigationItems, type NavigationItem } from '../src/navigation';

const items: readonly NavigationItem[] = [
  { label: 'Home', to: '/' },
  { label: 'Reports', to: '/reports', permission: 'fixture.reports.read' },
];

describe('permission-aware navigation', () => {
  it('keeps ungated and permitted items visible', () => {
    expect(
      filterNavigationItems(items, (permission) => permission === 'fixture.reports.read'),
    ).toEqual(items);
  });

  it('hides gated items when permission is absent or unresolved', () => {
    expect(filterNavigationItems(items, () => false)).toEqual([items[0]]);
  });

  it('gates Users navigation with the backend user.read permission', () => {
    expect(navigationItems.find((item) => item.to === '/users')).toMatchObject({
      label: 'Users',
      permission: 'user.read',
    });
    expect(
      filterNavigationItems(navigationItems, (permission) => permission === 'user.read'),
    ).toContainEqual(expect.objectContaining({ to: '/users' }));
  });

  it('gates Home navigation with the backend dashboard.read permission', () => {
    expect(navigationItems.find((item) => item.to === '/')).toMatchObject({
      label: 'Home',
      permission: 'dashboard.read',
    });
    expect(
      filterNavigationItems(navigationItems, (permission) => permission === 'dashboard.read'),
    ).toContainEqual(expect.objectContaining({ to: '/' }));
  });
});
