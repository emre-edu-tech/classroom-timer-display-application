# Step 5 — Polish & Deployment Prep

Goal: final usability touches, then prepare the app for the Plesk +
Phusion Passenger deployment target. This is the last step.

## Polish tasks

1. **Fullscreen mode** — add a button (or keyboard shortcut) that requests
   fullscreen via the browser's Fullscreen API, so the app can fill the
   projector screen with no browser chrome.
2. **Keyboard shortcuts** (optional but nice for quick use mid-class) —
   e.g. Space to start/pause, R to reset. Make sure typing in the task
   label or duration inputs doesn't accidentally trigger these (only
   listen when focus isn't in a text field).
3. **Visual pass** — check spacing, contrast, and responsiveness once
   more now that everything is wired up together; fix anything that
   looks off now that real interaction is in play.

## Deployment prep (Plesk + Phusion Passenger)

1. **`wsgi.py` already exists** (created manually, ready for Plesk +
   Phusion Passenger). Do not recreate, overwrite, or restructure it in
   this step — leave it as is. Only touch it if something else in this
   step genuinely requires a change (e.g. the Flask app's import path
   changed), and even then, edit rather than regenerate from scratch.
2. Add a short `README.md` (or a section in the existing one) covering:
   - Local dev setup: venv activation, `pip install -r requirements.txt`,
     `npm install`, running the Tailwind watcher, running `flask run`.
   - Production build: running the Tailwind build in non-watch/minified
     mode locally and committing the resulting `static/dist/output.css`
     before deploying (per Step 1 — this file is tracked in git, not
     gitignored). The server serves this committed file directly; it
     doesn't run an npm build step.
   - Any Plesk/Passenger-specific notes (e.g. where `wsgi.py` needs to
     live relative to the domain's document root, per your hosting
     panel's Python app settings).
3. Double check `requirements.txt` is complete and pinned so the server
   environment matches local dev.

## Acceptance criteria
- Fullscreen works and looks clean with no browser UI visible.
- Keyboard shortcuts (if implemented) don't interfere with typing in the
  task label or duration fields.
- `wsgi.py` is untouched (or only minimally edited if truly necessary)
  and still ready to point Passenger at.
- README has enough detail that future-you (or Opencode, in a future
  session) can redeploy without re-deriving the setup from scratch.
