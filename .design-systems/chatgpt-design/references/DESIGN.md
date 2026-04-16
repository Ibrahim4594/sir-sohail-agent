# chatgpt DESIGN.md

> Auto-generated design system — reverse-engineered via static analysis by skillui.
> Frameworks: None detected
> Colors: 7 · Fonts: 1 · Components: 0
> Icon library: not detected · State: not detected
> Primary theme: light · Dark mode toggle: no · Motion: none

## Visual Reference

**Match this design exactly** — study colors, fonts, spacing, and component shapes before writing any UI code.

![chatgpt Homepage](../screenshots/homepage.png)

---

## 1. Visual Theme & Atmosphere

This is a **light-themed** interface with a neutral, approachable feel. The light background emphasizes content clarity. Typography uses **OpenAI Sans** throughout — a clean, modern choice that maintains consistency. Spacing follows a **4px base grid** (compact density), with scale: 4, 6, 8, 10, 12, 16, 20, 24px.

---

## 2. Color Palette & Roles

| Token | Hex | Role | Use |
|---|---|---|---|
| background | `#ffffff` | background | Page background, darkest surface |
| surface | `#e8e8e8` | surface | Card and panel backgrounds |
| text-primary | `#0d0d0d` | text-primary | Headings and body text |
| text-muted | `#8f8f8f` | text-muted | Captions, placeholders, secondary info |
| border | `#5d5d5d` | border | Dividers, card borders, outlines |
| unknown | `#000000` | unknown | Palette color |
| unknown | `#9b9b9b` | unknown | Palette color |

### CSS Variable Tokens

```css
--bg-primary: #fff;
--bg-primary-inverted: #000;
--bg-secondary: #e8e8e8;
--bg-secondary-surface: #f9f9f9;
--bg-elevated-primary: #fff;
--bg-elevated-secondary: #f9f9f9;
--bg-accent-static: var(--blue-400);
--border-default: #0d0d0d1a;
--border-heavy: #0d0d0d26;
--border-light: #0d0d0d0d;
--border-extra-light: var(--border-light);
--border-status-warning: var(--orange-50);
--border-status-error: var(--red-50);
--text-primary: #0d0d0d;
--text-secondary: #5d5d5d;
--text-accent: var(--blue-200);
--icon-primary: #0d0d0d;
--icon-secondary: #5d5d5d;
--icon-accent: var(--blue-400);
--interactive-bg-primary-default: #0d0d0d;
```


---

## 3. Typography Rules

**Font Stack:**
- **OpenAI Sans** — Heading 1, Heading 2, Heading 3, Body, Caption

| Role | Font | Size | Weight |
|---|---|---|---|
| Heading 1 | OpenAI Sans | 48px / 3rem | 700 |
| Heading 2 | OpenAI Sans | 32px / 2rem | 600 |
| Heading 3 | OpenAI Sans | 24px / 1.5rem | 600 |
| Body | OpenAI Sans | 16px / 1rem | 400 |
| Caption | OpenAI Sans | 12px / 0.75rem | 400 |

**Typographic Rules:**
- Use **OpenAI Sans** for all text — do not mix font families
- Maintain consistent hierarchy: no more than 3-4 font sizes per screen
- Headings use bold (600-700), body uses regular (400)
- Line height: 1.5 for body text, 1.2 for headings
- Use color and opacity for secondary hierarchy, not additional font sizes


---

## 4. Component Stylings

No components detected. Scan `src/components/` or `components/` to populate this section.

---

## 5. Layout Principles

- **Base spacing unit:** 4px
- **Spacing scale:** 4, 6, 8, 10, 12, 16, 20, 24, 40, 60, 64
- **Border radius:** 8px, 10px, 16px, 28px

**Spacing as Meaning:**
| Spacing | Use |
|---|---|
| 4-8px | Tight: related items within a group |
| 12-16px | Medium: between groups |
| 24-32px | Wide: between sections |
| 48px+ | Vast: major section breaks |


---

## 6. Depth & Elevation

### Flat — subtle depth hints

- `rgba(0, 0, 0, 0) 0px 1px 0px 0px`
- `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgb(13, 13, 13) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px`

### Overlay — full-screen overlays, top-level dialogs

- `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.04) 0px 4px 4px 0px, rgba(0, 0, 0, 0.04) 0px 4px 80px 8px, rgba(0, 0, 0, 0.62) 0px 0px 1px 0px`



---

## 8. Do's and Don'ts

### Do's

- Use `#ffffff` as the primary page background
- Use **OpenAI Sans** for all UI text
- Follow the **4px** spacing grid for all margins, padding, and gaps
- Use the defined shadow tokens for elevation — see Section 6
- Use border-radius from the scale: 8px, 10px, 16px, 28px

### Don'ts

- Don't introduce colors outside this palette — extend the design tokens first
- Don't mix font families — use OpenAI Sans consistently
- Don't use arbitrary spacing values — stick to multiples of 4px
- Don't create custom box-shadow values outside the system tokens
- Don't use gradients — the design uses solid colors only
- Don't use arbitrary border-radius values — pick from the defined scale
- Don't use backdrop-blur or blur effects

### Anti-Patterns (detected from codebase)

- No gradient backgrounds
- No blur or backdrop-blur effects
- No zebra striping on tables/lists


---

## 9. Responsive Behavior

No breakpoints detected. Consider adding responsive breakpoints to the design system.

---

## 10. Agent Prompt Guide

Use these as starting points when building new UI:

### Build a Card

```
Background: #e8e8e8
Border: 1px solid #5d5d5d
Radius: 16px
Padding: 16px
Font: OpenAI Sans
Use shadow tokens from Section 6.
```

### Build a Button

```
Primary: bg var(--accent), text white
Ghost: bg transparent, border #5d5d5d
Padding: 8px 16px
Radius: 16px
Hover: opacity 0.9 or lighter shade
Focus: ring with var(--accent)
```

### Build a Page Layout

```
Background: #ffffff
Max-width: 1280px, centered
Grid: 4px base
Responsive: mobile-first, breakpoints from Section 9
```

### Build a Stats Card

```
Surface: #e8e8e8
Label: #8f8f8f (muted, 12px, uppercase)
Value: #0d0d0d (primary, 24-32px, bold)
Status: use success/warning/danger from Section 2
```

### Build a Form

```
Input bg: #ffffff
Input border: 1px solid #5d5d5d
Focus: border-color var(--accent)
Label: #8f8f8f 12px
Spacing: 16px between fields
Radius: 16px
```

### General Component

```
1. Read DESIGN.md Sections 2-6 for tokens
2. Colors: only from palette
3. Font: OpenAI Sans, type scale from Section 3
4. Spacing: 4px grid
5. Components: match patterns from Section 4
6. Elevation: shadow tokens
```
