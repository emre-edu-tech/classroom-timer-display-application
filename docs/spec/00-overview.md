# Classroom Timer/Display — Project Overview

Read this file once before Step 1. You don't need to re-paste it into later
sessions — Opencode will have the growing codebase on disk by then, so each
step file only needs to describe what's new.

## What this app is
A single-screen web app for a classroom projector/computer. It shows a big
countdown timer and a free-text "current task" label. The teacher controls
it from the same computer it's displayed on — no second device, no remote
control, no student interaction.

## Confirmed requirements
- **One countdown at a time.** The teacher sets a duration, starts it, and
  manually resets/re-enters a new duration for the next phase of class.
  No auto-advancing sequence of segments — keep this out of scope.
- **No persistence.** Nothing is saved to a database or between page loads.
  A page refresh resetting everything to blank is fine and expected.
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
- **No database.** Do not add SQLite or any storage layer — this app has
  no persistence requirement.
- **Virtual environment:** always create and use a Python venv for this
  project (`python -m venv venv`).
- **Entry points:** local dev entry file is `app.py`. A separate `wsgi.py`
  is added later (Step 5) for Plesk + Phusion Passenger deployment — don't
  create it before then.
- **Deployment target:** Plesk-managed VPS, Nginx + Phusion Passenger.

## Step map
1. `01-project-scaffolding.md` — Flask skeleton, venv, Tailwind build pipeline
2. `02-layout-and-styling.md` — static markup + Tailwind styling, no JS yet
3. `03-timer-logic.md` — countdown behavior in vanilla JS
4. `04-alert-behavior.md` — sound + visual alert at zero
5. `05-polish-and-deployment.md` — fullscreen, keyboard shortcuts, Passenger setup

Feed these to Opencode one at a time, in order, each in its own session.
