# Step 06 — Settings Persistence (localStorage)

Status: Accepted
Foundation for: 07 (language), 08 (sound settings), 10 (celebrate flag),
11 (mode).

## Goal

Remember the teacher's choices across page refreshes. Today, refreshing
the page resets everything; this feature adds a single, versioned
localStorage blob and a safe read/write helper. There is still no
backend persistence — the browser's localStorage is the only store.

## Storage schema

Single key: **`ct-settings`**, value: JSON object.

```json
{
  "version": 1,
  "language": "en",            // "en" | "tr"                       (Spec 07)
  "volume": 70,                // 0–100 integer                    (Spec 08)
  "muted": false,              // boolean                          (Spec 08)
  "alarmVoice": "alarm",       // "alarm"|"bell"|"chime"|"fanfare"  (Spec 08)
  "finalTicks": true,          // boolean, last-10s ticks          (Spec 08)
  "uiClicks": false,           // boolean, start/pause/reset blips (Spec 08)
  "celebrate": true,           // boolean, confetti + flourish     (Spec 10)
  "mode": "countdown",         // "countdown" | "stopwatch"        (Spec 11)
  "lastTaskLabel": "",         // string, task label text
  "lastDuration": { "m": 10, "s": 0 }  // last-set countdown duration
}
```

- `version` enables painless future migrations (missing fields in
  older blobs are filled from defaults; unknown fields are kept).
- `lastTaskLabel` restores the task input value on load (the current
  app deliberately leaves the label in-memory only; persistence is an
  explicit improvement accepted in the scope).
- `lastDuration` restores the two number inputs on load; the display
  initializes to it exactly as it does today from the markup defaults.

## Helper API (inside `app.js`)

- `loadSettings()` → merges stored JSON over `DEFAULTS` with per-field
  validation (type/range checks per field: clamp volume to 0–100,
  whitelist enums for `language`/`alarmVoice`/`mode`, coerce booleans).
  Invalid values fall back to defaults silently.
- `saveSettings()` → serializes the current in-memory settings object
  and writes it. Called on every relevant change (language switch,
  slider input, toggle, voice change, task-label `input` (debounced
  ~300 ms), duration change, mode switch). Writes are small; frequent
  writes are fine, but the debounced label write avoids per-keystroke
  JSON churn.
- All access wrapped in `try/catch` — **localStorage must never throw
  an uncaught error** (Safari private mode, disabled storage, quota).
  If storage is unavailable, the app runs with in-memory defaults for
  the session and every save is a no-op.

## Load order (init)

1. Parse/validate `ct-settings` (or use defaults if absent/corrupt).
2. Apply settings to the DOM/engine in this order:
   duration inputs + display → language (Spec 07 `applyLanguage`) →
   sound settings (Spec 08) → mode (Spec 11).
   Language after duration so translated placeholders/labels win.
3. Corrupt/unparseable JSON → treat as absent (defaults), and
   overwrite on first save.

## Non-persisted state (unchanged)

- Running/paused state and current remaining/elapsed seconds: a
  refresh always restarts the session at the persisted (or default)
  duration, at rest.
- Fullscreen state: cannot and should not be persisted.

## Acceptance criteria

1. Change language, volume, alarm voice, toggles, task label, and
   duration → reload → all are restored.
2. Corrupt `ct-settings` does not break the app (defaults applied).
3. With localStorage disabled/unavailable, every feature still works
   in-session and no errors are thrown or surfaced to the user.
4. No cookies, no backend calls, no new storage keys beyond
   `ct-settings` (the i18n spec's earlier `ct-lang` proposal is
   superseded by this blob).
