# Step 08 — Sound Effects Pack

Status: Accepted
Depends on: 06 (settings persistence)

## Goal

Expand the single end-of-timer alarm into a small sound engine that
increases classroom engagement: selectable end-of-timer "voices",
final-countdown ticks, optional UI feedback clicks, a volume/mute
control, and a test button. All sounds are synthesized with the Web
Audio API — no audio files, no new dependencies.

## Sound engine refactor

- Extract a `SoundEngine` (plain object/functions inside the existing
  IIFE, same style as the rest of `app.js`) that owns the
  `AudioContext`:
  - Lazy creation on first user interaction (browser autoplay policy).
    If `window.AudioContext || window.webkitAudioContext` is missing,
    all sound functions return silently — the visual alert still fires.
  - `resume()` a suspended context before scheduling (existing pattern).
  - Single master `GainNode` controlled by the volume/mute settings so
    all voices scale together. Schedule-based voices keep their
    per-note relative envelope, multiplied by master gain.
- Voices (pure functions, each scheduling its own oscillators):

### End-of-timer alarm voices (`alarmVoice` setting)

| Voice | Description |
|---|---|
| `alarm` (default) | Current severe two-tone pattern: 6 rapid square-wave blasts alternating 740 Hz / 554 Hz, then a long 880 Hz blast (exact existing pattern in `playAlertSound`). |
| `bell` | School bell: repeated ~1568 Hz (G6) square/triangle hits with metallic overtone (e.g. 1568 + 2093 Hz layered), ~1.5 s, repeating twice. |
| `chime` | Gentle chime: 3–4 descending sine notes (e.g. C6 → G5 → E5), soft attack/decay, ~2 s total. |
| `fanfare` | Short ascending triad arpeggio (e.g. C5-E5-G5-C6) in a bright triangle/square mix, ~1.5 s. |

- Only the selected voice plays at zero. Unknown stored value → `alarm`.

### Final-countdown ticks (`finalTicks` setting, default on)

- During the **last 10 seconds** of a countdown, play a short soft tick
  (short 1000 Hz sine, ~60 ms, low gain) once per second, aligned with
  the display update in `tick()`.
- Ticks play only while the countdown is running (not when idle at
  10 s, not after pause/resume into the window — resume inside the
  last 10 s resumes ticking).
- Ticks do not fire in stopwatch mode and do not fire while the
  zero-alert is active.

### UI click sounds (`uiClicks` setting, default off)

- Soft ~30–50 ms blip (short sine, ~600 Hz, quiet) on:
  - Start (also resume), Pause, Reset, and preset selection.
- No click for keyboard shortcuts performed via typing-guard exclusions
  is needed; Space/R/F shortcuts produce the same clicks via the same
  underlying `start()`/`pause()`/`reset()` calls.
- No click on the fullscreen or language buttons (they are not
  timer-flow actions).
- Default **off** so the upgrade does not surprise existing users.

## Volume and mute

- A small **Sound panel** below the Controls card (or inside it, row
  2): volume slider (`#sound-volume`, 0–100, default 70), mute
  checkbox/toggle button (`#sound-mute`, default unmuted), alarm voice
  select or segmented buttons (`#alarm-voice`: Alarm / School bell /
  Gentle chime / Fanfare — labels translated per Spec 07), and a
  **Test sound** button (`#btn-test-sound`).
- Test button plays the currently selected alarm voice at the current
  volume (and is unmuted for the preview, then returns to the previous
  mute state). It must not change timer state.
- Slider changes apply immediately (master gain), persist via Spec 06.
- Mute is reflected in the UI (icon/checkbox state).

## Interaction with existing alert flow

- `playAlertSound()` becomes a dispatcher that calls the selected voice
  in the sound engine. The alert visual flow (`.timer-alert-active`,
  banner, 5 s auto-stop, stop-on-next-action) is unchanged.
- Fire-once-per-zero-transition guard (`alertActive`) unchanged.
- If the selected voice fails to schedule (no AudioContext, etc.), the
  error is swallowed exactly as today.

## Acceptance criteria

1. Each of the four alarm voices is audible and clearly distinct when
   selected and tested; the default (`alarm`) sounds identical to the
   current app.
2. Ticks are audible exactly once per second during the final 10 s and
   stop at zero when the alarm takes over.
3. Volume slider, mute, and Test button work; settings survive reload.
4. With muted audio or no AudioContext support, the visual alert still
   fires and the app never throws.
5. No network requests are made for sounds (all synthesized).
