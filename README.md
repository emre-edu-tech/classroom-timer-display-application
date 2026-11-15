# Classroom Timer App

A Flask-based Class Timer Application. Backend is intentionally minimal —
a single `/` route renders the timer page; all countdown logic runs in
vanilla JS in the browser. User preferences (task label, duration) are
persisted in the browser's `localStorage` — there is still no backend
storage or database (see [Settings persistence](#settings-persistence)
below).

## Local dev setup

```powershell
# 1. Create and activate the virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# 2. Install Python dependencies (pinned — see requirements.txt)
pip install -r requirements.txt

# 3. Install Node dependencies (Tailwind CSS v3 build tooling)
npm install

# 4. Start the Tailwind watcher (rebuilds static/dist/output.css on change)
npm run watch-css

# 5. In a second terminal, run the app (venv activated)
flask run
# or: python app.py
```

> **Warning for AI agents (and careful humans):** all Python package
> installs must happen **inside the virtual environment** — never run a
> bare `pip install` against the global interpreter, even "just to test
> something quickly". If a dependency seems missing, activate the venv
> (or create it from `requirements.txt`); a global install must be
> undone with `pip uninstall` afterwards. See `AGENTS.md` for details.

Open http://127.0.0.1:5000 — editing `static/src/input.css` or adding a
Tailwind class to `templates/index.html` and rebuilding visibly changes
the page, which confirms the pipeline works.

### Keyboard shortcuts (mid-class use)

| Key     | Action               |
| ------- | -------------------- |
| `Space` | Start / Pause toggle |
| `R`     | Reset                |
| `F`     | Toggle fullscreen    |

Shortcuts are ignored while typing in the task label or duration inputs
(and in any select/textarea), so they never interfere with text entry.
`Space` on a focused button is left to the button's native activation to
avoid double-toggling.

## Settings persistence (localStorage)

The teacher's choices survive page refreshes via a single, versioned
`localStorage` blob — no cookies, no backend calls, no other storage keys.

- **Key:** `ct-settings` (one JSON object; `version: 1` for painless
  future migrations).
- **Restored on load:** the task label text (`lastTaskLabel`) and the
  duration inputs (`lastDuration` — the countdown display initializes
  from them exactly as it does from the markup defaults).
- **Written on:** duration input changes and preset clicks (immediate),
  and task-label typing (debounced ~300 ms to avoid per-keystroke JSON
  churn). When Start normalizes an empty Min/Sec field to `0`, the
  normalized duration is persisted too.
- **Empty duration fields:** pressing Start with an empty Min and/or Sec
  input sets the empty field(s) to `0` visibly and shows a transient
  hint under the inputs; if the result is still `00:00`, nothing starts
  but the hint explains why (no more silent dead clicks).
- **Not persisted:** running/paused state and current remaining seconds —
  a refresh always restarts the timer at the persisted duration, at rest.
  Fullscreen state cannot and should not be persisted.

The schema also reserves fields (`language`, `volume`, `muted`,
`alarmVoice`, `finalTicks`, `uiClicks`, `celebrate`, `mode`) for the
upcoming Phase B features (language switcher, sound pack, celebration,
stopwatch) so those can be added without a migration. They sit at their
defaults until those features exist.

Robustness guarantees (per `docs/specs/06-settings-persistence.md`):

- Every storage access is wrapped in `try/catch` — localStorage never
  throws an uncaught error (Safari private mode, disabled storage, quota).
- With localStorage unavailable, everything still works in-session; every
  save is a silent no-op and nothing is surfaced to the user.
- Corrupt/unparseable JSON is treated as absent: defaults are applied and
  the first save overwrites the blob. Invalid field values (out-of-range
  volume, unknown enum values, wrong types) silently fall back to defaults.

## Production build

The production server does **not** run an npm build step — it serves the
committed CSS file directly. So before every deploy:

```powershell
# Minified (non-watch) Tailwind build
npm run build-css -- --minify

# Commit the result — static/dist/output.css is tracked in git on purpose
git add static/dist/output.css
git commit -m "Rebuild production CSS"
```

`static/dist/output.css` must never be added to `.gitignore` (only
`venv/`, `node_modules/`, `__pycache__/` and similar local artifacts are
ignored).

`requirements.txt` pins `Flask==3.1.2` (verified against the local venv;
transitive deps — click, Jinja2, Werkzeug, etc. — resolve from that pin),
so the server environment matches local dev after `pip install -r
requirements.txt`.

## Plesk + Phusion Passenger notes

- `wsgi.py` already exists at the project root and exposes `application`
  (imported from `app.py`). **Do not recreate or restructure it** — point
  Passenger at it as is. It also prepends the project root (and the
  `venv` site-packages, when present) to `sys.path`.
- Deploy the whole project directory as the domain's document root
  (e.g. `/var/www/vhosts/example.com/httpdocs`), so `wsgi.py` sits
  directly in the document root. In the Plesk Python app settings for the
  domain, set the startup file to `wsgi.py` and the interpreter to the
  project's `venv/bin/python`.
- Equivalent raw Nginx + Passenger directives (proxy mode disabled):

  ```text
  passenger_enabled on;
  passenger_app_type wsgi;
  passenger_startup_file wsgi.py;
  passenger_app_root /var/www/vhosts/example.com/httpdocs;
  passenger_python /var/www/vhosts/example.com/httpdocs/venv/bin/python;
  ```

- After deploying, `touch tmp/restart.txt` to restart the Passenger app.
