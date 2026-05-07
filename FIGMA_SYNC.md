# Figma ↔ Code Sync Workflow

## Overview

This project uses a Claude-mediated sync workflow: you edit designs in Figma, share the file link with Claude, and Claude reads the Figma file via MCP to update the code.

## Setup

### 1. Figma MCP (already configured)

The Figma Remote MCP server is connected. On first use, you'll be prompted to authenticate with your Figma account.

### 2. Create Your Figma File

Create a new Figma file called **"Audiobook Marker"** with three pages:

- **Tokens** — color swatches and text samples for reference
- **Components** — UI components as Figma components
- **Screens** — assembled dark and light screen variants (390×844 frame)

---

## Color Styles to Create

Use Figma's slash-naming convention. These names map directly to CSS variables (see `design-tokens.json`).

### Core Colors

| Figma Style Name | Dark Value | Light Value |
|---|---|---|
| `dark/bg` | `#0d0d0f` | — |
| `dark/surface` | `#16161a` | — |
| `dark/surface2` | `#1e1e24` | — |
| `dark/border` | `#FFFFFF` at 7% opacity | — |
| `dark/text` | `#f0ede8` | — |
| `dark/muted` | `#f0ede8` at 40% opacity | — |
| `dark/accent` | `#e8a45a` | — |
| `dark/red` | `#e85a5a` | — |
| `dark/green` | `#5ab87a` | — |
| `light/bg` | — | `#f7f4ef` |
| `light/surface` | — | `#eeeae3` |
| `light/surface2` | — | `#e6e1d9` |
| `light/border` | — | `#000000` at 9% opacity |
| `light/text` | — | `#1c1a17` |
| `light/muted` | — | `#1c1a17` at 45% opacity |
| `light/accent` | — | `#c47333` |
| `light/red` | — | `#c0392b` |
| `light/green` | — | `#1e8449` |

### UI Colors

| Figma Style Name | Dark Value | Light Value |
|---|---|---|
| `dark/topbar-bg` | `#0d0d0f` at 85% | — |
| `dark/btn-border` | `#FFFFFF` at 15% | — |
| `dark/btn-border-hover` | `#FFFFFF` at 20% | — |
| `dark/accent-bg` | `#e8a45a` at 10% | — |
| `dark/accent-bg-hover` | `#e8a45a` at 18% | — |
| `dark/listen-dot-bg` | `#f0ede8` at 30% | — |
| `light/topbar-bg` | — | `#f7f4ef` at 85% |
| `light/btn-border` | — | `#000000` at 15% |
| `light/btn-border-hover` | — | `#000000` at 20% |
| `light/accent-bg` | — | `#c47333` at 10% |
| `light/accent-bg-hover` | — | `#c47333` at 18% |
| `light/listen-dot-bg` | — | `#1c1a17` at 30% |

---

## Text Styles to Create

| Figma Style Name | Font | Size | Weight | Other |
|---|---|---|---|---|
| `heading/title` | Playfair Display | 20px | SemiBold | spacing: -0.01em |
| `heading/modal` | Playfair Display | 18px | Regular | — |
| `heading/logo` | Playfair Display | 14px | Regular | spacing: 0.15em, UPPERCASE |
| `heading/card-title` | Playfair Display | 12px | SemiBold | line-height: 1.35 |
| `heading/cover-letter` | Playfair Display | 34px | Regular Italic | — |
| `body/base` | DM Sans | 13px | Regular | line-height: 1.55 |
| `body/small` | DM Sans | 12px | Regular | spacing: 0.04em |
| `body/tiny` | DM Sans | 11px | Regular | spacing: 0.04em |
| `body/micro` | DM Sans | 10px | Regular | spacing: 0.08em, UPPERCASE |
| `body/nano` | DM Sans | 9px | Medium | spacing: 0.07em, UPPERCASE |

---

## Components to Create

1. **Topbar** — 52px tall, full width. Logo left, Library button + theme toggle right
2. **Cover** — 200×200px, 10px radius. Placeholder state (icon + "drop a file" text)
3. **BookInfo** — title (heading/title) + author (body/base, muted color)
4. **Player** — 320px wide: progress bar (3px), time row, control buttons
5. **PlayButton** — 52px circle, text-color bg, accent on hover
6. **AddNoteButton** — pill (20px radius), mic icon + "Add note". Recording variant with accent border
7. **Drawer** — bottom sheet with 18px top radius, pill handle, title + count badge, annotation list
8. **AnnotationItem** — timestamp (accent) + text + delete button
9. **Toast** — pill notification. Variants: default, error (red border), success (green border)
10. **LibraryModal** — 540px wide, grid of BookCards
11. **BookCard** — colored cover (3:4 aspect) + info section
12. **ListenIndicator** — dot + label, corner-positioned

---

## How to Sync

### Quick Sync (update colors/typography)

Share your Figma file link with Claude and say:

> Read the Figma file at [FIGMA LINK]. Compare its color styles and text styles against design-tokens.json. For each difference, show the Figma value vs the current code value, then update the CSS variable in styles.css and update design-tokens.json to match.

### Component Sync (update layout/structure)

> Read the component [COMPONENT NAME] from Figma file at [FIGMA LINK]. Compare it to the current HTML/CSS and update the code to match the new design. Only modify styles.css and index.html — do not change JavaScript behavior.

### New Component

> Read the component [NAME] from Figma file at [FIGMA LINK]. Generate the HTML and CSS for it, matching the project's existing patterns (CSS custom properties, DM Sans body font, etc).

---

## Key Files

| File | Role |
|---|---|
| `styles.css` | All CSS — theme variables at top, component styles below |
| `design-tokens.json` | Reference map: Figma style names ↔ CSS variables ↔ values |
| `index.html` | HTML structure |

## Rules

- All theme-dependent values are CSS custom properties defined in `:root` (dark) and `[data-theme="light"]`
- Figma style names use slash-naming (`dark/bg`, `light/accent`) matching the `figma` field in design-tokens.json
- No build tools — this is a static site served with `npx serve`
- Claude reads Figma via MCP, proposes changes, you approve
