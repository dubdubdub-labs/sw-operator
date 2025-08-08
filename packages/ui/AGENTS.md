# @repo/ui

## shadcn/ui everything

This package contains all base shadcn/ui components and associated hooks, utils, and tailwind css styles. Our `@repo/ui/styles/globals.css` file contains all of the default CSS variables used by shadcn/ui (`radius`, `background`, `foreground`, `card`, etc.; it even includes the `dark` variants for all CSS variables).

We should *always* use shadcn/ui components, and always use the default CSS variables. We should RARELY use arbitraty values for colors, spacing, etc. If we would like to extend the existing theme, we should add new variables to the `@repo/ui/styles/globals.css` file with clear documentation for their recommended usage.

## Modern `radix-ui` import

Instead of importing from dozens of `@radix-ui/react-[component]` packages, we have adopted the modern, unified import from `radix-ui` (which is a single package that contains all of the components). As of June 2025, this is the new, recommended way to import `radix-ui` components now per shadcn/ui's documentation (see [here](https://ui.shadcn.com/docs/changelog#june-2025---radix-ui)). We likely do not need to import any new base components and we should NEVER change back to the old `@radix-ui/react-[component]` imports.

## Tailwind v4 Adoption

We have adopted Tailwind CSS v4 (released January 22, 2025) (read more [here](./docs/TAILWIND_CSS_V4.md)). Tailwind v4 is more simple and performant than v3. Tailwind v4 does not require a config file - it features CSS-first configuration. Instead of a `tailwind.config.js` file, we configure customizations directly in our CSS file (see `@repo/ui/styles/globals.css`). We should NEVER try to use the old `tailwind.config.js` file.
