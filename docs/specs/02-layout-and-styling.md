# Step 2 — Layout & Styling

Goal: the full visual layout of the app, styled with Tailwind, projector-
friendly. Buttons and inputs exist and look right but aren't wired up to
any behavior yet — that's Step 3.

## Layout requirements

- **Full-screen, high-contrast design** meant to be read from across a
  classroom. Dark background with light, large text works well for
  projectors — but use your judgment on an appealing look.
- **Big countdown display** — the dominant element on the page, large
  enough to read from the back of a room (think 15-20% of viewport
  height for the digits).
- **Current task label** — a text input, editable in place, displayed
  prominently near the countdown (e.g. above it). Empty by default.
- **Duration input** — a simple way to enter/select a countdown length
  (e.g. minute/second number inputs, or a few quick-set buttons like
  "5 min / 10 min / 15 min" alongside a custom option). Your call on
  the exact control, optimizing for fast use between class activities.
- **Controls** — Start, Pause, and Reset buttons, clearly distinguishable
  (e.g. color-coded), sized for a quick click/tap.
- **No sound/visual-alert elements need to be built yet** — just leave
  room in the layout for something to visually change later (Step 4
  will hook into this).

## Tasks

1. Build out the full markup in `templates/index.html` using Tailwind
   utility classes only (no custom CSS files beyond what Step 1 set up).
2. Give every element that Step 3's JS will need to control a stable
   `id` (e.g. `#countdown-display`, `#task-label`, `#btn-start`,
   `#btn-pause`, `#btn-reset`, `#duration-minutes`, `#duration-seconds`).
3. Make sure the layout holds up at typical projector resolutions
   (1920x1080 and 1280x720) — test both if possible.
4. Buttons/inputs can be non-functional placeholders — clicking them
   should do nothing yet. Don't add JS event listeners in this step.

## Acceptance criteria
- The page looks finished and readable from a distance, with no
  functionality wired up.
- All interactive elements have the `id`s Step 3 will need.
- No JavaScript logic exists yet beyond whatever Tailwind's tooling
  requires.
