# Handoff: FreshBrain Login Page

## Overview
Login screen for FreshBrain (Indonesian B2B SaaS). Redesigned from a single centered card layout into a split-screen layout: left panel carries brand/marketing, right panel holds the login form.

## About the Design Files
The bundled file (`FreshBrain-Login.html`) is a **design reference built in HTML** — a prototype showing intended look, layout, and copy. It is not production code to copy directly. Recreate this design in the target codebase's existing environment (React, Vue, etc.) using its established components/patterns, or choose the most appropriate framework if none exists yet.

## Fidelity
High-fidelity. Colors, typography, spacing, and copy are final; treat measurements and hex values below as source of truth.

## Screens / Views

### Login
**Purpose**: User enters email + password to sign in.

**Layout**: Full-viewport CSS grid, two columns, ratio `1.1fr / 1fr`, `min-height: 100vh`.

**Left panel** (brand):
- Background: linear-gradient 160deg, `#0f2942` → `#153a5c` (45%) → `#1c6fb0`
- Subtle dotted texture overlay (radial-gradient dots, 15% opacity, 28px grid)
- Padding: 56px 64px, flex column, `justify-content: space-between`
- Logo row: 30px circle mark (`#8ec9f0`) + "FreshBrain" wordmark, 19px/700, white
- Headline: "One brain. Everything fresh." — 44px/700, line-height 1.15, white with "brain." and "fresh." in `#7fd0ff`
- Subhead: 16px, `#bcdcf2`, line-height 1.6, max-width 460px
- Footer: "MEMAHAMI BISNIS ANDA" label (11px, uppercase, letter-spacing 0.12em, `#8fb9d6`) above three product marks (Fresh Factory, Fresh Commerce, Frex) at 15-16px, `#dceefb`/`#7fd0ff`

**Right panel** (form):
- White background, flex column centered, padding 64px 88px
- Language toggle top-right: ID/EN pill switch, `#f1f4f7` track, active state white bg + shadow
- Form column max-width 380px, centered
- Heading "Selamat datang kembali" 26px/700 `#0f2942`; subtext 14px `#7a8794`
- Inputs: label 13px/600 `#334`, field 13px padding, 1px solid `#dde3ea`, border-radius 10px, 14px text
- "Lupa kata sandi?" link right-aligned, 13px/600, `#1c6fb0`
- Primary button "Masuk": full width, `#1c6fb0` bg, white text 15px/700, border-radius 10px, shadow `0 8px 20px -6px rgba(28,111,176,0.5)`
- Footer copyright: 12px `#a0abb6`, centered

## Interactions & Behavior
- ID/EN toggle switches active pill styling (no functional locale logic implemented in prototype).
- No client-side validation implemented in prototype — add per app standards (required email format, password min length, error states below inputs).
- Add standard focus states on inputs/buttons (prototype omits explicit focus rings — use codebase defaults).

## State Management
- `email`, `password` string state
- `locale`: 'ID' | 'EN'
- `isSubmitting`, `error` for auth flow (to be wired to real auth)

## Design Tokens
**Colors**
- Navy dark: `#0f2942`
- Navy mid: `#153a5c`
- Blue primary: `#1c6fb0`
- Blue light accent: `#7fd0ff`
- Blue pale text: `#bcdcf2`, `#8fb9d6`, `#dceefb`
- Body text: `#0f2942` (headings), `#334` (labels), `#7a8794` (subtext), `#a0abb6` (footer/muted)
- Borders: `#dde3ea`
- Neutral bg: `#f1f4f7`

**Typography**: Helvetica Neue / Helvetica / Arial, sans-serif. Headline 44px/700, section heading 26px/700, body 14-16px, labels 13px/600, micro text 11-12px.

**Radius**: 10px (inputs/buttons), 6-8px (pill toggle)

**Shadow**: `0 8px 20px -6px rgba(28,111,176,0.5)` on primary button; `0 1px 2px rgba(0,0,0,0.08)` on active toggle pill.

## Assets
- Logo mark: placeholder circle SVG (`#8ec9f0`) — replace with real FreshBrain logo asset.
- Product marks (Fresh Factory, Fresh Commerce, Frex): text-based placeholders — replace with real logo assets if available.

## Files
- `FreshBrain-Login.html` — full design reference (single self-contained file, inline styles).
