# Component Reference

> Repeated DOM patterns detected by structural analysis. Each component appeared 3+ times.

## Detected Components

| Component | Category | Instances | Key Classes |
|-----------|----------|-----------|-------------|
| **Flex** | card | 5× | `.flex`, `.gap-2.5`, `.grow` |
| **Div** | unknown | 4× |  |
| **Truncate** | unknown | 4× | `.truncate` |
| **Flex** | card | 3× | `.flex`, `.gap-1.5`, `.items-center` |

## Cards

### Flex

**Instances found:** 5

**CSS classes:** `.flex` `.gap-2.5` `.grow` `.items-center` `.min-w-0`

**HTML structure:**

```html
<div class="flex min-w-0 grow items-center gap-2.5"><div class="truncate">New chat</div></div>
```

**Base styles (from design tokens):**

```css
.flex {
  background: #e8e8e8;
  border: 1px solid #5d5d5d;
  border-radius: 16px;
  padding: 8px;
}```

### Flex

**Instances found:** 3

**CSS classes:** `.flex` `.gap-1.5` `.items-center` `.min-w-0`

**HTML structure:**

```html
<div class="flex min-w-0 items-center gap-1.5"><div class="flex items-center justify-center [opacity:var(--menu-item-icon-opacity,1)] icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" aria-hidden="true" class="icon"><use href="/cdn/assets/sprites-core-df3050c8.svg#3a5c87" fill="currentColor"></use></svg></div><div class="flex min-w-0 grow items-center gap-2.5"><div class="truncate">New chat</div></div></div>
```

**Base styles (from design tokens):**

```css
.flex {
  background: #e8e8e8;
  border: 1px solid #5d5d5d;
  border-radius: 16px;
  padding: 8px;
}```

## Other Components

### Div

**Instances found:** 4

**HTML structure:**

```html
<div class="" data-state="closed"><div tabindex="0" data-fill="" class="group __menu-item hoverable gap-1.5" data-sidebar-keep-open="true" data-state="closed" data-sidebar-item="true"><div class="flex items-center justify-center [opacity:var(--menu-item-icon-opacity,1)] icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" aria-hidden="true" class="icon"><use href="/cdn/assets/sprites-core-df3050c8.svg#ac6d36" fill="currentColor"></use></svg></div><span class="sr-only">Search chats</span></div></div>
```

**Base styles (from design tokens):**

```css
.div {
  background: #e8e8e8;
  padding: 4px;
}```

### Truncate

**Instances found:** 4

**CSS classes:** `.truncate`

**HTML structure:**

```html
<div class="truncate">New chat</div>
```

**Base styles (from design tokens):**

```css
.truncate {
  background: #e8e8e8;
  padding: 4px;
}```

## Component Rules

- Match class names exactly from the patterns above
- Each component instance must be visually identical to others of its type
- Do not add extra wrappers or change the DOM structure
- Use `#5d5d5d` for all dividers within components

