# Step 11 — Stopwatch (Count-Up) Mode

Status: Accepted
Depends on: 06 (settings persists mode), 09 (visuals must not fire),
10 (celebration must not fire), 08 (no ticks).

## Goal

Add an alternative count-up mode for open-ended classroom activities:
the same big display and the same Start/Pause/Reset controls count
*up* from 00:00 instead of down. Mode is switched with a visible
toggle and persists across reloads.

## Mode toggle UI

- A segmented toggle above or beside the duration card:
  - `#mode-countdown` → label "Countdown" / "Geri sayım"
  - `#mode-stopwatch` → label "Stopwatch" / "Süreölçer"
  (labels translated per Spec 07; visual style matches preset pills,
  active state clearly marked).
- Switching mode is allowed at any time (idle, running, or paused) and
  behaves like a Reset of the display in the new mode:
  - Stops any running interval, cancels alert/celebration/confetti,
    and sets the display to the new mode's resting value
    (countdown: last-set duration; stopwatch: 00:00).
  - Duration inputs and presets are hidden or disabled in stopwatch
    mode (recommended: hide the duration card and show only the
    stopwatch stage; simplest robust option is disabling the card with
    reduced opacity). The task label remains editable in both modes.

## Behavior in stopwatch mode

- Start: begins counting up from 00:00 (or resumes a paused elapsed
  value). Uses the same 1 s `setInterval` tick.
- Pause: freezes the elapsed value; Start resumes it.
- Reset: returns display to 00:00.
- Elapsed time display: `MM:SS` via the existing `formatMMSS`; hours
  are unlikely in classroom use, but values > 59:59 render as larger
  minute counts (e.g. `75:30`) — same as the countdown's existing
  behavior for long durations.
- At zero and while counting up:
  - No alarm, no alert banner, no flash, no celebration, no confetti.
  - No final-countdown ticks, no pressure colors, no progress bar
    (Specs 08/09/10 conditions).
- `alertActive` / visual-alert state is never entered in stopwatch mode.

## Shared code approach

- One `tick()`-style function with a `mode` check, or two thin tick
  functions over shared start/pause/reset plumbing — implementation
  choice, but: existing countdown behavior, edge cases, and shortcuts
  must be byte-for-byte unchanged when in countdown mode.
- `lastSetSeconds` continues to track countdown settings even in
  stopwatch mode, so switching back to countdown restores the previous
  duration exactly as Reset would.

## Keyboard shortcuts

- Unchanged: Space = start/pause (works in both modes), R = reset
  (in stopwatch mode: back to 00:00), F = fullscreen.

## Persistence

- `mode` field of `ct-settings` (`"countdown"` | `"stopwatch"`,
  default `"countdown"`) per Spec 06.

## Acceptance criteria

1. Toggle switches modes in one click and the display always ends in a
   valid resting state for the chosen mode.
2. Stopwatch counts up 00:00 → 00:01 → …, pauses/resumes correctly,
   and resets to 00:00.
3. No sounds/visuals that belong to the countdown (alarm, ticks,
   pressure colors, celebration) ever fire in stopwatch mode.
4. Switching back to countdown mode restores the last-set duration and
   behaves identically to the pre-feature countdown.
5. Mode survives a page reload.
