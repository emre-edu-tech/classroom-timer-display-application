# Step 4 — Alert Behavior at Zero

Goal: when the countdown (built in Step 3) reaches `00:00`, trigger both
a sound and a visual change. Both are required, not either/or.

## Requirements

- **Sound alert:** an audible sound plays once the countdown hits zero.
  A short beep/chime is enough — either a small bundled audio file played
  via an HTML `<audio>` element, or a tone generated with the Web Audio
  API (no external file needed). Either approach is fine; a generated
  tone avoids needing to source/license an audio asset.
- **Visual alert:** a clear visual change on reaching zero — e.g. the
  background flashing a color, the countdown display pulsing/changing
  color, or similar. Should be obvious from across the room, not subtle.
- **Stopping the alert:** decide and implement a clear way for the alert
  to end — e.g. it plays/flashes for a few seconds and then stops
  automatically, or it continues until the teacher clicks Reset (or any
  button). Pick one behavior and make it consistent; a few seconds of
  auto-stop is a reasonable default if you're unsure.
- **No repeat mid-countdown:** the alert should only fire once, exactly
  when the countdown transitions to zero — not on every render tick.

## Tasks

1. Hook into the point in Step 3's countdown logic where the time reaches
   zero and trigger both effects from there.
2. Implement the sound (bundled short audio file or Web Audio tone).
3. Implement the visual effect using Tailwind/CSS classes toggled via JS
   (e.g. adding/removing a class that animates the background or text).
4. Implement whatever stop condition you chose above.

## Acceptance criteria
- Letting a countdown run to zero reliably plays a sound AND shows a
  visible change, every time, with no double-firing.
- The alert clearly resolves (auto-stops or stops on next action) rather
  than running indefinitely in a way that would be disruptive.
