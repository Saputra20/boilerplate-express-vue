---
name: ui-styling
description: Implement framework-compatible UI styling with Tailwind CSS, accessible component patterns, responsive layouts, and theme customization. Project default: Vue 3 + Vite + Tailwind CSS. React, shadcn/ui, and Radix guidance is optional reference material only and is never an automatic project dependency.
argument-hint: "[component or layout]"
license: MIT
metadata:
  author: claudekit
  version: "1.0.0"
---

# UI Styling Skill

Styling implementation skill for framework-compatible UI. `frontend-patterns` owns Vue architecture; `design-system` owns tokens and specifications; this skill owns CSS, layout, states, and styling implementation only.

## Reference

- Tailwind CSS: https://tailwindcss.com/docs

## When to Use This Skill

Use when:
- Implementing styling in the repository's Vue 3 + Vite + Tailwind stack
- Implementing accessible components (dialogs, forms, tables, navigation)
- Styling with utility-first CSS approach
- Creating responsive, mobile-first layouts
- Implementing dark mode and theme customization
- Applying existing design-system tokens and component specifications
- Generating visual designs, posters, or brand materials
- Rapid prototyping with immediate visual feedback
- Adding complex UI patterns (data tables, charts, command palettes)

## Core Stack

### Component Layer: Existing Project Components
- Use existing Vue components and native semantic HTML first.
- Keep component behavior in Vue feature modules.
- Do not install React, shadcn/ui, Radix UI, or another component library for this skill.
- Treat shadcn/Radix material below as optional external reference only; it is not automatic routing.

### Styling Layer: Tailwind CSS
- Utility-first CSS framework
- Build-time processing with zero runtime overhead
- Mobile-first responsive design
- Consistent design tokens (colors, spacing, typography)
- Automatic dead code elimination

### Visual Design Layer: Canvas
- Museum-quality visual compositions
- Philosophy-driven design approach
- Sophisticated visual communication
- Minimal text, maximum visual impact
- Systematic patterns and refined aesthetics

## Quick Start

### Component + Styling Setup

**Project default:** use existing Vue and Tailwind configuration. Do not install a component library as part of styling work.

Use Vue SFCs with existing project components and utility classes:
```vue
<template>
  <section class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    <article class="transition-shadow hover:shadow-lg">
      <h2 class="text-2xl font-bold">Analytics</h2>
      <p class="mt-4 text-slate-600">View your metrics</p>
      <button class="mt-4 w-full">View details</button>
    </article>
  </section>
</template>
```

### Alternative: Tailwind-Only Setup

**Vite projects:**
```bash
npm install -D tailwindcss @tailwindcss/vite
```

```javascript
// vite.config.ts
import tailwindcss from '@tailwindcss/vite'
export default { plugins: [tailwindcss()] }
```

```css
/* src/index.css */
@import "tailwindcss";
```

## Component Styling Guidance

Use existing Vue components and native semantic HTML first. Keep component behavior in `frontend-patterns`; use this skill for class composition, layout, states, and visual treatment.

See the shadcn references only when an existing project explicitly uses compatible shadcn components. They are not project defaults.

Covers:
- Form & input components (Button, Input, Select, Checkbox, Date Picker, Form validation)
- Layout & navigation (Card, Tabs, Accordion, Navigation Menu)
- Overlays & dialogs (Dialog, Drawer, Popover, Toast, Command)
- Feedback & status (Alert, Progress, Skeleton)
- Display components (Table, Data Table, Avatar, Badge)

## Theme & Customization

**Theme configuration, CSS variables, dark mode implementation, and component customization.**

See: `references/tailwind-customization.md` and project `design-system` references.

Covers:
- Dark mode setup with project theme state
- CSS variable system
- Color customization and palettes
- Component variant customization
- Theme toggle implementation

## Accessibility Patterns

**ARIA patterns, keyboard navigation, screen reader support, and accessible component usage.**

See: `references/shadcn-accessibility.md` only as optional reference when an existing compatible component library is already approved.

Covers:
- Existing Vue accessibility patterns and semantic HTML
- Keyboard navigation patterns
- Focus management
- Screen reader announcements
- Form validation accessibility

## Tailwind Utilities

**Core utility classes for layout, spacing, typography, colors, borders, and shadows.**

See: `references/tailwind-utilities.md`

Covers:
- Layout utilities (Flexbox, Grid, positioning)
- Spacing system (padding, margin, gap)
- Typography (font sizes, weights, alignment, line height)
- Colors and backgrounds
- Borders and shadows
- Arbitrary values for custom styling

## Responsive Design

**Mobile-first breakpoints, responsive utilities, and adaptive layouts.**

See: `references/tailwind-responsive.md`

Covers:
- Mobile-first approach
- Breakpoint system (sm, md, lg, xl, 2xl)
- Responsive utility patterns
- Container queries
- Max-width queries
- Custom breakpoints

## Tailwind Customization

**Config file structure, custom utilities, plugins, and theme extensions.**

See: `references/tailwind-customization.md`

Covers:
- @theme directive for custom tokens
- Custom colors and fonts
- Spacing and breakpoint extensions
- Custom utility creation
- Custom variants
- Layer organization (@layer base, components, utilities)
- Apply directive for component extraction

## Visual Design System

**Canvas-based design philosophy, visual communication principles, and sophisticated compositions.**

See: `references/canvas-design-system.md`

Covers:
- Design philosophy approach
- Visual communication over text
- Systematic patterns and composition
- Color, form, and spatial design
- Minimal text integration
- Museum-quality execution
- Multi-page design systems

## Utility Scripts

**Python automation for component installation and configuration generation.**

### tailwind_config_gen.py
Generate tailwind.config.js with custom theme:
```bash
python scripts/tailwind_config_gen.py --colors brand:blue --fonts display:Inter
```

## Best Practices

1. **Component Composition**: Build complex UIs from simple, composable primitives
2. **Utility-First Styling**: Use Tailwind classes directly; extract components only for true repetition
3. **Mobile-First Responsive**: Start with mobile styles, layer responsive variants
4. **Accessibility-First**: Use semantic HTML, visible focus states, labels, keyboard access, and project-compatible components.
5. **Design Tokens**: Use consistent spacing scale, color palettes, typography system
6. **Dark Mode Consistency**: Apply dark variants to all themed elements
7. **Performance**: Leverage automatic CSS purging, avoid dynamic class names
8. **TypeScript**: Use full type safety for better DX
9. **Visual Hierarchy**: Let composition guide attention, use spacing and color intentionally
10. **Expert Craftsmanship**: Every detail matters - treat UI as a craft

## Reference Navigation

**Component Library**
- `references/shadcn-components.md` - Optional external reference only
- `references/shadcn-theming.md` - Optional external reference only
- `references/shadcn-accessibility.md` - Optional external reference only

**Styling System**
- `references/tailwind-utilities.md` - Core utility classes
- `references/tailwind-responsive.md` - Responsive design
- `references/tailwind-customization.md` - Configuration and extensions

**Visual Design**
- `references/canvas-design-system.md` - Design philosophy and canvas workflows

**Automation**
- `scripts/tailwind_config_gen.py` - Config generation

## Common Patterns

**Form with validation:**

Use a Vue form component, visible labels, Zod validation where applicable, and inline error states. Do not add a form library as part of styling work.

**Responsive layout with dark mode:**
```vue
<template>
  <div class="min-h-screen bg-white px-4 py-8 dark:bg-gray-900">
    <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <article class="border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white">Content</h3>
      </article>
    </div>
  </div>
</template>
```

## Resources

- Tailwind CSS Docs: https://tailwindcss.com
