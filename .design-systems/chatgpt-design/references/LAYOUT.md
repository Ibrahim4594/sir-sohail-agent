# Layout Reference

> Auto-extracted from live DOM. Use this to understand how the site is structured spatially.

## Spacing System

**Base grid:** 4px

**Scale:** `4, 6, 8, 10, 12, 16, 20, 24, 40, 60, 64` px

| Spacing | Semantic Use |
|---------|-------------|
| 4px | Tight — within a component |
| 8px | Medium — between sibling items |
| 16px | Wide — between sections |
| 32px | Vast — major section breaks |

## Flex Layouts

| Element | Direction | Justify | Align | Gap | Children |
|---------|-----------|---------|-------|-----|----------|
| `div.flex.h-svh` | column | — | — | — | 2 |
| `div.relative.z-0` | row | — | — | — | 1 |
| `div.relative.flex` | row | — | — | — | 2 |
| `div.@container/main.relative` | column | — | — | — | 1 |
| `div.relative.flex` | column | — | — | — | 2 |
| `div.@w-sm/main:[scrollbar-gutter:var(--stage-scroll-gutter)]` | column | — | — | — | 2 |
| `header#page-header.draggable.no-draggable-children` | row | space-between | center | — | 3 |
| `nav.group/scrollport.relative` | column | — | — | — | 9 |
| `div.pointer-events-none!.flex` | row | — | center | — | 2 |
| `div.flex.items-center` | row | center | center | 12px | 2 |
| `div#thread.group/thread.flex` | column | — | — | — | 1 |
| `div.flex.items-center` | row | — | center | 8px | 1 |
| `div.flex.items-center` | row | end | center | — | 1 |
| `div.composer-parent.flex` | column | — | — | — | 2 |
| `div#thread-bottom-container.sticky.bottom-0` | column | — | — | — | 4 |

## Grid Layouts

| Element | Template Columns | Gap | Children |
|---------|-----------------|-----|----------|
| `div.bg-token-bg-primary.dark:bg-token-bg-elevated-primary` | `36px 636.312px 75.6875px` | — | 3 |

## Structural Containers

### `<header>` (`header#page-header.draggable.no-draggable-children`)

```
display:          flex
flex-direction:   row
justify-content:  space-between
align-items:      center
padding:          8px
children:         3
```

### `<main>` (`main#main.min-h-0.flex-1`)

```
display:          block
children:         1
```

### `<nav>` (`nav.group/scrollport.relative`)

```
display:          flex
flex-direction:   column
justify-content:  —
align-items:      —
children:         9
```

## Layout Rules

- **Container max-width:** `768px` — always center with `margin: auto`
- Primary layout system: **Flexbox**
- Secondary layout system: **CSS Grid** (used for card grids and multi-column layouts)
- Every spacing value must be a multiple of **4px**
- Never use arbitrary margin/padding values outside the spacing scale

