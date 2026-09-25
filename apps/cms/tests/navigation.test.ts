import { describe, expect, it } from 'vitest';
import { filterNavigationItems, type NavigationItem } from '../src/navigation';

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
});
