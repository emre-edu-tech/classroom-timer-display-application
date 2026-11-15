# Agent notes

Guidance for AI coding agents working in this repository, and for anyone
setting the project up from scratch.

## Package installation rule (critical)

**Never install Python packages into the global/interpreter-wide
environment. Never run `pip install` without an activated virtual
environment — not even "just to test something quickly".**

- This project, like every Flask project here, uses the venv mechanism:
  create/activate it (see the Local dev setup section of `README.md`),
  then install **only inside it** (`pip install -r requirements.txt`).
- If Flask or another dependency appears to be missing, the correct fix
  is to activate the project venv (or create it from `requirements.txt`)
  — **not** a global install. A global install pollutes the user's
  machine-level Python and must be cleaned up afterwards.
- If a global install happened by mistake, `pip uninstall <package> -y`
  must be run to restore the previous state, and the user informed.
- Node packages (`npm`) are project-local (`package.json`) and are fine
  to install in the project directory.

## Running the app

- Dev server: `flask run` or `python app.py` inside the activated venv.
  `app.py` serves on **http://127.0.0.1:8001** (port 8001, not the
  README's 5000 default — see app.py).
- `requirements.txt` pins Flask; install from it inside the venv.

## Build/style conventions

- `static/src/app.js` is served directly — no JS build step. Keep the
  existing ES5 style (`var`, function declarations, single IIFE).
- Tailwind CSS is pre-built into `static/dist/output.css`, which is
  committed on purpose. After adding new utility classes, rebuild with
  the minified production build:
  `npm run build-css -- --minify`.
- Spec documents live in `docs/specs/` — check the relevant spec before
  implementing a feature, and update it when behavior changes.
