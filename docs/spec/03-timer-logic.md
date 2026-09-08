# Step 3 — Timer Logic

Goal: wire up the countdown behavior in vanilla JS against the markup
built in Step 2. No sound/visual alert yet — that's Step 4.

## Behavior requirements

- **Set duration:** reading the duration input(s) built in Step 2 (minutes/
  seconds fields or quick-set buttons) sets the starting time.
- **Start:** begins counting down from the set duration, updating the
  display every second in `mm:ss` format.
- **Pause:** stops the countdown in place; clicking Start again (or a
  Resume state) continues from where it left off, not from the beginning.
- **Reset:** stops any running countdown and returns the display to the
  last-set duration (or blank/zero — your call, but be consistent), ready
  to be started again. This is how the teacher moves to the next phase
  of class, per the "single countdown, manually reset each phase"
  requirement — there is no auto-advancing sequence.
- **Current task label:** the text field from Step 2 should be freely
  editable at any time, independent of the timer's running state. Nothing
  is saved anywhere — it's just an in-memory text field (no persistence,
  per the overview).
- **Edge cases to handle:**
  - Starting with a zero/empty duration shouldn't crash — either ignore
    the click or treat it as an instant zero (your call, note which you
    picked).
  - Rapid clicking Start/Pause shouldn't create multiple overlapping
    intervals — make sure only one countdown timer runs at a time.

## Tasks

1. Add a `<script>` (or a linked `static/src/app.js`) implementing the
   above using `setInterval`/`clearInterval` (or an equivalent), reading
   from and writing to the element `id`s established in Step 2.
2. Keep the JS plain and readable — no build step, no bundler, no
   frameworks.

## Acceptance criteria
- Start/Pause/Reset behave as described, including resuming from a pause
  rather than restarting.
- The display updates every second and never goes negative.
- No sound or visual alert fires yet when the timer hits zero — it should
  just stop at `00:00`. That's Step 4.
