# Step 07 — i18n: EN/TR Language Switcher with Flags

Status: Accepted
Depends on: 06 (settings persistence, for storing the choice)

## Goal

The UI is fully available in English and Turkish. A switcher with
country-flag buttons lives in the header; the choice persists across
page loads. All user-visible strings come from a dictionary in JS —
no duplicated HTML and no backend involvement.

## UI

- Two buttons in the header, next to the fullscreen button:
  - `🇬🇧 EN` → switches to English.
  - `🇹🇷 TR` → switches to Turkish.
- Layout: replace the current decorative `<span class="hidden w-28">`
  spacer on the left with the language switcher so the header stays
  balanced (switcher left, title center, fullscreen right).
- Buttons reuse the existing pill-button styling
  (`rounded-xl border border-slate-700 bg-slate-800 ...`). The active
  language is visually indicated (e.g. `ring-2 ring-sky-400` or
  brighter background). Flag emoji are inline text; no image assets.
- IDs: `#lang-en`, `#lang-tr` (wrapper `#lang-switcher` optional).

## String inventory (single source of truth in `static/src/app.js`)

An `I18N` object keyed by language code with the same keys per language:

| Key | English | Turkish |
|---|---|---|
| `title` | Classroom Timer | Sınıf Süreölçeri |
| `currentTask` | Current task | Güncel görev |
| `taskPlaceholder` | Type the current task… | Güncel görevi yazın… |
| `minutesSeconds` | minutes : seconds | dakika : saniye |
| `timesUp` | Time’s up! | Süre doldu! |
| `duration` | Duration | Süre |
| `min` | Min | Dak |
| `sec` | Sec | San |
| `quickSet` | Quick set | Hızlı ayar |
| `preset5m` | 5 min | 5 dk |
| `preset10m` | 10 min | 10 dk |
| `preset15m` | 15 min | 15 dk |
| `controls` | Controls | Kontroller |
| `start` | Start | Başlat |
| `pause` | Pause | Duraklat |
| `reset` | Reset | Sıfırla |
| `fullscreen` | ⛶ Fullscreen | ⛶ Tam ekran |
| `exitFullscreen` | × Exit fullscreen | × Tam ekrandan çık |
| `toggleFullscreenTitle` | Toggle fullscreen (F) | Tam ekranı aç/kapat (F) |
| `toggleFullscreenAria` | Toggle fullscreen | Tam ekranı aç/kapat |
| `footerHelp` | Set a duration, then Start. Shortcuts: … | Bir süre ayarlayın, ardından Başlat’a basın. Kısayollar: … |

Notes:

- The `<title>` tag uses `title` as well.
- `footerHelp` is composed from `start`, `pause`/`reset`-style short
  labels or a dedicated sentence template per language — exact copy may
  be adjusted during implementation, but the sentence structure
  (not English word order) must be natural Turkish.
- Duration numeric inputs (`value="10"` / `value="0"`) are not text and
  are not translated.
- The alert banner (`#alert-banner`) currently contains
  `Time&rsquo;s up!`; it is set from `timesUp` so switching languages
  updates any visible banner.

## Mechanics

- `applyLanguage(lang)`:
  1. Looks up `I18N[lang]` (fallback to `en` for unknown values).
  2. Sets `textContent` (or `value`/`placeholder`/`title`/`aria-label`
     for inputs/buttons) of every mapped element.
  3. Sets `document.documentElement.lang = lang`
     (`"en"` / `"tr"`).
  4. Sets `document.title`.
  5. Marks the active switcher button.
  6. Re-runs the fullscreen label sync (`syncFullscreenLabel`) so the
     button text matches the new language and current fullscreen state.
- `applyLanguage` is idempotent and safe to call at any time (running
  timer state is not affected).
- Init: restore the persisted language (see Spec 06, `ct-settings.language`)
  or default `"en"`, then call `applyLanguage`.
- The language switcher buttons do not stop or reset a running timer.

## Persistence

- `language` field of the `ct-settings` blob (Spec 06). Default `"en"`.
- Writes are debounced/best-effort per Spec 06 (must not throw if
  localStorage is unavailable).

## Edge cases

- Unknown stored language value → fall back to `"en"`.
- Missing elements (older markup) → guarded `null` checks like the rest
  of `app.js`.
- Switching language while the zero-alert banner is visible must
  re-translate the visible banner text.

## Acceptance criteria

1. Clicking 🇹🇷 TR translates every visible string, the `<title>`, the
   alert banner, and the fullscreen button; `html[lang="tr"]` is set.
2. Reloading the page restores the last chosen language.
3. The running countdown, its remaining seconds, and timer state are
   unaffected by switching languages.
4. If localStorage is unavailable, the app defaults to English and
   throws no errors.
