# Step 10 — End-of-Timer Celebration

Status: Accepted
Depends on: 08 (sound voices / master gain), 06 (settings).

## Goal

When a task completes on time (countdown reaches zero), fire a brief,
rewarding celebration — a confetti burst plus a celebratory sound —
so finishing feels positive rather than only punitive. The existing
alert (alarm + red flash) remains for when the teacher wants a plain
"time's up" signal; the celebration layers on top of the zero
transition.

## Trigger

- Fired exactly once per `>0 → 0` countdown transition, at the same
  point the existing `triggerAlertOnce()` fires (same guard against
  double-firing).
- Countdown mode only — never in stopwatch mode.
- Runs for a fixed ~4 s (the same window as `ALERT_DURATION_MS = 5000`
  minus overlap with the alarm tail; implementation may use the same
  5 s timer). Dismissed early by any next action, same as the alert.

## Confetti

- A lightweight, dependency-free canvas confetti (~80–150 particles):
  - A `<canvas id="confetti-canvas">` overlaying `#timer-stage`
    (absolutely positioned, `pointer-events: none`,
    `aria-hidden="true"`, sized to the stage via JS on fire).
  - Particles: small rectangles/circles in a fixed festive palette
    (e.g. emerald, amber, sky, rose, violet), random spin, gravity +
    horizontal drift, fading out over the burst window.
  - Origin: burst from the top-center area of the stage (falling
    downward) — reads as "celebration" rather than "explosion".
  - Canvas is hidden/cleared and the animation loop (single
    `requestAnimationFrame` loop) cancelled when done or dismissed.
- Performance: total lifetime ≤ ~4 s, one canvas, no libraries, no
  images. Must run smoothly on a 1280×720 projector machine.
- If canvas or rAF is unavailable, silently skip (sound still plays).

## Celebration sound

- New setting `celebrate` (on/off, default **on**) and a fixed
  celebration voice: a short bright ascending arpeggio/glissando
  (distinct from all alarm voices — e.g. C5→E5→G5→C6→E6 with a
  sparkle-like second layer), ~1.5 s, routed through the master gain
  (respects volume/mute per Spec 08).
- Layering with the alarm: the celebration sound plays immediately at
  zero; the selected alarm voice starts ~1.2 s later so the two do not
  overlap into noise. If the `alarm` voice is set to `chime` or
  `celebrate` is off, no special layering is needed beyond the normal
  alarm timing.
- Only the alarm selected in the Sound panel plays after the
  celebration flourish — the alarm behavior itself is unchanged.

## Dismissal rules (same as the alert)

- Start / Pause / Reset / preset / duration input all cancel the
  confetti loop and clear the canvas immediately.
- Auto-stop after the burst window clears the canvas.

## Acceptance criteria

1. Completing a countdown shows a single confetti burst plus the
   celebration flourish, then the selected alarm.
2. Any control press stops the celebration instantly.
3. Mute/volume settings apply to the celebration sound.
4. No celebration or sound occurs in stopwatch mode.
5. Zero dependencies added; canvas is invisible and inert when idle.
