# Classroom Timer/Display — Project Overview (merged)

Read this file once before Step 1. You don't need to re-paste it into later
sessions — Opencode will have the growing codebase on disk by then, so each
step file only needs to describe what's new.

This overview covers the whole history of the project in two phases:

- **Phase A — initial build (Steps 01–05).** The app as originally shipped.
- **Phase B — improvement round 1 (Steps 06–11).** Accepted feature upgrades.

Each step file is independently shippable; feed them to Opencode one at a
time, in order, each in its own session.

## What this app is

A single-screen web app for a classroom projector/computer. It shows a big
countdown timer and a free-text "current task" label. The teacher controls
it from the same computer it's displayed on — no second device, no remote
control, no student interaction.

## Confirmed requirements

- **One countdown at a time.** The teacher sets a duration, starts it, and
  manually resets/re-enters a new duration for the next phase of class.
  No auto-advancing sequence of segments — keep this out of scope.
- **No persistence (Phase A).** Nothing is saved to a database or between
  page loads. A page refresh resetting everything to blank is fine and
  expected. (Phase B relaxes this for *user preferences only* — see Step 06;
  still no database, no backend storage.)
- **Current task label is free text** — a plain editable text field, not a
  dropdown or preset list.
- **On reaching zero:** play a sound AND trigger a visual change (e.g. a
  flash or background color shift). Both, not just one.
- **Single device.** Controls (start/pause/reset, duration input, task
  label) and the big display live on the same screen. No WebSockets, no
  second "display-only" page, no sync logic needed.

## Tech stack & conventions (apply in every step)

- **Backend:** Python Flask — kept minimal, this app barely needs one route.
- **Styling:** Tailwind CSS v3 (npm-based build, not the CDN/play version).
- **Frontend logic:** Vanilla JS. No frameworks, no build step for JS itself.
- **No database.** Do not add SQLite or any storage layer.
- **No audio files.** All sounds are synthesized via the Web Audio API.
- **Virtual environment:** always create and use a Python venv for this
  project (`python -m venv venv`).
- **Entry points:** local dev entry file is `app.py`. A separate `wsgi.py`
  was added in Step 5 for Plesk + Phusion Passenger deployment — don't
  recreate or restructure it.
- **Deployment target:** Plesk-managed VPS, Nginx + Phusion Passenger.
- **Custom CSS-class toggling** for alert/visual effects lives in the
  `<style>` block of `templates/index.html` (pattern: `.timer-alert-active`),
  so most visual features do not require a Tailwind rebuild.
- **Graceful degradation everywhere.** If localStorage, AudioContext, or the
  Fullscreen API is unavailable, the timer keeps working; failures are
  silent and never break the countdown.

## Step map

### Phase A — initial build

1. `01-project-scaffolding.md` — Flask skeleton, venv, Tailwind build pipeline
2. `02-layout-and-styling.md` — static markup + Tailwind styling, no JS yet
3. `03-timer-logic.md` — countdown behavior in vanilla JS
4. `04-alert-behavior.md` — sound + visual alert at zero
5. `05-polish-and-deployment.md` — fullscreen, keyboard shortcuts, Passenger setup

### Phase B — improvement round 1

6. `06-settings-persistence.md` — localStorage settings blob (foundation)
7. `07-i18n-language-switcher.md` — EN/TR switcher with flag buttons
8. `08-sound-effects-pack.md` — alarm voices, final ticks, UI clicks, volume
9. `09-time-pressure-visuals.md` — color transitions + progress bar
10. `10-end-celebration.md` — confetti + celebration sound at zero
11. `11-stopwatch-mode.md` — count-up mode with persistent toggle

## Phase B scope details

Accepted features:

| # | Feature | Spec |
|---|---|---|
| 6 | Settings persistence via localStorage | `06-settings-persistence.md` |
| 7 | Language switcher EN/TR with flag buttons | `07-i18n-language-switcher.md` |
| 8 | Sound effects pack (alarm voices, ticks, UI clicks, volume) | `08-sound-effects-pack.md` |
| 9 | Time-pressure visuals (color transitions + progress bar) | `09-time-pressure-visuals.md` |
| 10 | End-of-timer celebration (confetti + fanfare) | `10-end-celebration.md` |
| 11 | Stopwatch (count-up) mode | `11-stopwatch-mode.md` |

Rejected / deferred (not in this round; may be reconsidered later, and none
of the accepted features should be designed in a way that blocks them):

- Custom teacher-editable preset buttons + ±1:00 quick adjust.
- Task queue / lesson sequence with auto-advance.
- Display options (light theme, hide-seconds, live clock).
- Random student picker.

### Shared decisions for Phase B

1. **Frontend-only.** No new Python dependencies, no backend changes.
   `app.py` and `wsgi.py` remain untouched.
2. **No audio files.** All sounds are synthesized via the Web Audio API
   (existing approach), keeping the repo light.
3. **Persistence via a single settings blob.** Step 06 is the foundation:
   it defines the `ct-settings` localStorage schema used by Steps 07, 08,
   10 and 11.
4. **Plain CSS-class toggling for alert/visual effects** (see conventions
   above). A production rebuild (`npm run build-css -- --minify`) is still
   run at the end of the round because markup changes.
5. **Existing IDs and behavior are preserved.** `#countdown-display`,
   `#task-label`, `#duration-minutes`, `#duration-seconds`,
   `#preset-5m/10m/15m`, `#btn-start`, `#btn-pause`, `#btn-reset`,
   `#btn-fullscreen`, `#timer-stage`, `#alert-banner` keep their roles.
   Zero/empty start is ignored; Reset returns to the last-set duration;
   resume does not re-read inputs.
6. **Keyboard shortcuts unchanged:** Space = start/pause, R = reset,
   F = fullscreen, ignored while typing in text fields.

### Phase B implementation order

Each step is committed and shippable on its own:

1. **Step 06 — Settings persistence** (foundation for everything below).
2. **Step 07 — i18n / language switcher.**
3. **Step 08 — Sound effects pack.**
4. **Step 09 — Time-pressure visuals.**
5. **Step 10 — End celebration.**
6. **Step 11 — Stopwatch mode.**

End-of-round tasks: update `README.md` (features, shortcuts, localStorage
behavior), run production CSS build (`npm run build-css -- --minify`),
verify `static/dist/output.css` is still committed (never gitignored).

## Non-goals (this round)

- Server-side state, multi-room/URL-based timers, or user accounts.
- Replacing the vanilla JS stack with a framework.
- Changing the deployment model (Plesk + Phusion Passenger + `wsgi.py`).
- Accessibility overhaul beyond keeping the current roles/labels intact
  and translating them.
