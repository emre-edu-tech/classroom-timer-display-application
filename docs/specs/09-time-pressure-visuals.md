# Step 09 — Time-Pressure Visuals

Status: Accepted
Depends on: none hard (standalone), but ships after 08.

## Goal

Make urgency visible at a glance from the back of the classroom: the
countdown display shifts color as time runs low, and a slim progress
bar under the digits depletes smoothly. No rebuild-dependent Tailwind
classes — everything toggles via plain CSS classes added/removed by JS
(same pattern as `.timer-alert-active`).

## Color transitions on `#countdown-display`

| Phase | Condition (remaining) | Text color |
|---|---|---|
| Normal | > 60 s | white (existing `text-white`) |
| Warning | ≤ 60 s and > 30 s | amber ~ `#fbbf24` |
| Critical | ≤ 30 s (and > 0) | red ~ `#f87171` |
| Alert (zero) | 0, alert active | existing pulse animation (unchanged) |

- Implementation: three CSS classes `timer-warning`, `timer-critical`
  (and reuse absence of both for "normal") defined in the
  `<style>` block of `templates/index.html`, e.g.:

  ```css
  #countdown-display.timer-warning  { color: #fbbf24; }
  #countdown-display.timer-critical { color: #f87171; }
  ```

  Color overrides must win over the `text-white` utility (specificity
  of `#id.class` suffices). A `transition: color 0.4s ease` smooths
  the shift.

- `updatePressureClass()` runs on every `render()`:
  - Removes both classes, then adds the one matching
    `remainingSeconds`.
  - In stopwatch mode (Spec 11) the display is always "normal"
    (white); pressure classes never apply.
  - Classes are also cleared when the display is reset/idle at a full
    duration or zero.

## Progress bar

- A new element `#timer-progress` below `#countdown-display` (above the
  `minutes : seconds` caption): a full-width rounded track
  (`h-1.5 bg-slate-800 rounded-full overflow-hidden`) containing a fill
  `<div id="timer-progress-fill">`.
- Fill width = percentage of time remaining relative to the duration
  of the current countdown session (`remainingSeconds /
  sessionTotalSeconds * 100`, clamped 0–100).
  - `sessionTotalSeconds` is captured at the moment a countdown starts
    from zero/full (i.e. `lastSetSeconds` at fresh Start). Pause/resume
    does not recompute it. Reset recomputes it from the current inputs.
- Fill color follows the same phase colors (normal = sky/emerald, then
  amber, then red) via the same class mechanism on the fill element.
- Smooth depletion: `transition: width 0.9s linear` (roughly matching
  the 1 s tick) so the bar does not visibly jump each second. When a
  new countdown starts or Reset is pressed, the width change is instant
  enough that the transition does not look broken; if it does, the
  implementation may temporarily disable the transition on restore.
- Hidden (or empty) when: stopwatch mode, idle-before-first-start with
  no session, and always during the zero alert (bar shows 0%).
- The bar is non-interactive (`aria-hidden="true"`), purely decorative.

## Interaction with existing visuals

- The zero alert (`.timer-alert-active` flash/pulse, banner) is
  unchanged and takes precedence at zero.
- Pause keeps the current color and bar position frozen.
- Presets / duration input changes while idle update the bar to the new
  full value (same rules as `applyPreset` / `onDurationInput` staging:
  a running countdown is not disturbed).

## Acceptance criteria

1. Display turns amber crossing 60 s and red crossing 30 s, only while
   counting down, and returns to white on Reset / new start.
2. Bar always equals remaining fraction of the started session and
   reaches 0 exactly when the timer hits 00:00.
3. Stopwatch mode never shows pressure colors or the bar.
4. No Tailwind rebuild is required for the color/animation logic; the
   final production rebuild still happens per Spec 00.
