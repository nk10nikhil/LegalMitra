# Accessibility Baseline (WCAG 2.1 AA)

This checklist captures the baseline implemented in LegalMitra and the minimum regression checks for future PRs.

## Implemented Baseline

- Skip-link is available globally to jump to main content.
- Keyboard focus is visible via `:focus-visible` styles.
- Primary navigation has an explicit `aria-label`.
- Form controls in language switcher are labeled.
- Color contrast baseline uses existing design tokens and high-contrast text defaults.

## PR Checklist

- [ ] All interactive elements are keyboard reachable and operable.
- [ ] Focus order is logical and no keyboard traps are introduced.
- [ ] Inputs have accessible labels or `aria-label`/`aria-labelledby`.
- [ ] Status updates/toasts are informative and not color-only.
- [ ] New pages preserve heading hierarchy (`h1` then nested levels).
- [ ] Critical flows are tested with screen reader quick pass (NVDA/VoiceOver).

## Recommended CI Addition (future)

Add `axe-core` based checks for key pages (`/`, `/dashboard`, `/dashboard/cases/[id]`).
