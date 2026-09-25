import { onMounted, ref } from 'vue';

export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'cms.theme';

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    return 'light';
  }

  return typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

export function useTheme() {
  const theme = ref<Theme>('light');

  function setTheme(nextTheme: Theme): void {
    theme.value = nextTheme;
    applyTheme(nextTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      return;
    }
  }

  function toggleTheme(): void {
    setTheme(theme.value === 'dark' ? 'light' : 'dark');
  }

  onMounted(() => setTheme(readTheme()));

  return { theme, toggleTheme };
}
