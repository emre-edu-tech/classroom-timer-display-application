// Step 3 — Timer Logic (vanilla JS, no frameworks).
// Step 4 — Alert Behavior at zero: Web Audio chime + visual flash/pulse.
// Step 5 — Polish: Fullscreen API toggle + keyboard shortcuts (Space/R/F).
// Step 6 — Settings Persistence: versioned localStorage blob `ct-settings`
//   (task label + duration restored on load; foundation for Specs 07/08/10/11).
//
// Element IDs come from Step 2 markup in templates/index.html:
//   #countdown-display, #task-label (free text, persisted per Step 6),
//   #duration-minutes, #duration-seconds,
//   #preset-5m, #preset-10m, #preset-15m,
//   #btn-start, #btn-pause, #btn-reset,
//   #btn-fullscreen (Step 5),
//   #timer-stage, #alert-banner (Step 4 visual alert hooks).
//
// Edge-case choices (per spec, either option allowed):
//   - Starting with a zero/empty duration does not run a countdown
//     (display stays at 00:00; no crash). Empty fields are normalized
//     to 0 and a transient hint explains why Start did nothing.
//   - Reset returns the display to the last-set duration, ready to start again.
// Step 4 stop-condition choice: the alert auto-stops after ~5 seconds AND
//   stops immediately on any next action (Start/Pause/Reset/preset/input).

(function () {
  "use strict";

  var displayEl = document.getElementById("countdown-display");
  var minutesEl = document.getElementById("duration-minutes");
  var secondsEl = document.getElementById("duration-seconds");
  var startBtn = document.getElementById("btn-start");
  var pauseBtn = document.getElementById("btn-pause");
  var resetBtn = document.getElementById("btn-reset");
  // Step 5 fullscreen toggle (may be null in older markup — guarded below).
  var fullscreenBtn = document.getElementById("btn-fullscreen");
  // Step 4 visual-alert hooks (may be null in older markup — guarded below).
  var stageEl = document.getElementById("timer-stage");
  var bannerEl = document.getElementById("alert-banner");
  // Step 6 persistence hook for the task label input.
  var taskLabelEl = document.getElementById("task-label");
  // Duration-validation hint (transient message under the inputs).
  var durationHintEl = document.getElementById("duration-hint");

  var presetButtons = {
    "preset-5m": 5 * 60,
    "preset-10m": 10 * 60,
    "preset-15m": 15 * 60,
  };

  // Last duration set via inputs/presets (seconds). Reset restores this.
  var lastSetSeconds = 0;
  // Seconds left in the current countdown.
  var remainingSeconds = 0;
  // setInterval handle, or null when not running. Single interval only.
  var intervalId = null;

  // Step 4 — alert state. alertTimeoutId auto-stops the visual effect;
  // alertActive guards against double-firing within one zero transition.
  var audioCtx = null;
  var alertTimeoutId = null;
  var alertActive = false;
  var ALERT_DURATION_MS = 5000;

  // ---- Step 6: settings persistence (localStorage) ----
  //
  // One versioned JSON blob under a single key: `ct-settings`. The
  // fields reserved for Specs 07 (language), 08 (sound), 10 (celebrate)
  // and 11 (mode) already exist in the schema with their defaults so
  // those steps can flip them without a migration. Unknown fields read
  // from storage are kept (never dropped) to be forward-compatible.
  //
  // All storage access is wrapped in try/catch: localStorage must never
  // throw an uncaught error (Safari private mode, disabled storage,
  // quota). If storage is unavailable the app runs with in-memory
  // defaults for the session and every save is a silent no-op.

  var STORAGE_KEY = "ct-settings";
  var SETTINGS_VERSION = 1;

  var DEFAULTS = {
    version: SETTINGS_VERSION,
    language: "en",            // "en" | "tr"                       (Spec 07)
    volume: 70,                // 0-100 integer                     (Spec 08)
    muted: false,              // boolean                           (Spec 08)
    alarmVoice: "alarm",       // "alarm"|"bell"|"chime"|"fanfare"  (Spec 08)
    finalTicks: true,          // boolean, last-10s ticks           (Spec 08)
    uiClicks: false,           // boolean, start/pause/reset blips  (Spec 08)
    celebrate: true,           // boolean, confetti + flourish      (Spec 10)
    mode: "countdown",         // "countdown" | "stopwatch"         (Spec 11)
    lastTaskLabel: "",         // string, task label text
    lastDuration: { m: 10, s: 0 }, // last-set countdown duration
  };

  // Probe storage once at startup (setItem is what fails in Safari
  // private mode, not merely accessing the object).
  var storageOk = (function () {
    try {
      var probe = "__ct_probe__";
      window.localStorage.setItem(probe, probe);
      window.localStorage.removeItem(probe);
      return true;
    } catch (e) {
      return false;
    }
  })();

  // In-memory settings object, filled at init from loadSettings().
  var settings = null;

  function deepCopyDefaults() {
    // DEFAULTS is flat except lastDuration; a manual copy is enough
    // (avoids JSON round-trip on the hot path).
    return {
      version: DEFAULTS.version,
      language: DEFAULTS.language,
      volume: DEFAULTS.volume,
      muted: DEFAULTS.muted,
      alarmVoice: DEFAULTS.alarmVoice,
      finalTicks: DEFAULTS.finalTicks,
      uiClicks: DEFAULTS.uiClicks,
      celebrate: DEFAULTS.celebrate,
      mode: DEFAULTS.mode,
      lastTaskLabel: DEFAULTS.lastTaskLabel,
      lastDuration: {
        m: DEFAULTS.lastDuration.m,
        s: DEFAULTS.lastDuration.s,
      },
    };
  }

  // Integer coercion + clamping. Non-numeric input -> fallback;
  // out-of-range numbers are clamped into range (per-field policy).
  function clampInt(value, min, max, fallback) {
    var n = value;
    if (typeof n !== "number" || !isFinite(n)) {
      n = parseInt(n, 10);
    }
    if (isNaN(n)) {
      return fallback;
    }
    if (n < min) {
      return min;
    }
    if (n > max) {
      return max;
    }
    return n;
  }

  // Boolean coercion: real booleans pass through; 0/1 and "true"/"false"
  // strings are coerced; anything else falls back to the default.
  function coerceBool(value, fallback) {
    if (typeof value === "boolean") {
      return value;
    }
    if (value === 0 || value === 1) {
      return Boolean(value);
    }
    if (typeof value === "string") {
      if (value === "true") {
        return true;
      }
      if (value === "false") {
        return false;
      }
    }
    return fallback;
  }

  // Enum whitelist. Unknown values silently fall back to the default.
  function whitelist(value, allowed, fallback) {
    for (var i = 0; i < allowed.length; i++) {
      if (value === allowed[i]) {
        return value;
      }
    }
    return fallback;
  }

  // Read + validate the stored blob. Merges stored JSON over DEFAULTS
  // with per-field type/range checks; corrupt or unparseable JSON is
  // treated as absent (defaults applied; first save overwrites it).
  function loadSettings() {
    var merged = deepCopyDefaults();
    var raw = null;
    if (storageOk) {
      try {
        raw = window.localStorage.getItem(STORAGE_KEY);
      } catch (e) {
        raw = null;
      }
    }
    if (typeof raw === "string" && raw.length > 0) {
      try {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          // Keep unknown fields (forward compatibility), then
          // re-validate every known field over the merge.
          Object.keys(parsed).forEach(function (key) {
            merged[key] = parsed[key];
          });
          if (typeof merged.version !== "number" || !isFinite(merged.version)) {
            merged.version = DEFAULTS.version;
          }
          merged.language = whitelist(
            merged.language, ["en", "tr"], DEFAULTS.language
          );
          merged.volume = clampInt(
            merged.volume, 0, 100, DEFAULTS.volume
          );
          merged.muted = coerceBool(merged.muted, DEFAULTS.muted);
          merged.alarmVoice = whitelist(
            merged.alarmVoice,
            ["alarm", "bell", "chime", "fanfare"],
            DEFAULTS.alarmVoice
          );
          merged.finalTicks = coerceBool(merged.finalTicks, DEFAULTS.finalTicks);
          merged.uiClicks = coerceBool(merged.uiClicks, DEFAULTS.uiClicks);
          merged.celebrate = coerceBool(merged.celebrate, DEFAULTS.celebrate);
          merged.mode = whitelist(
            merged.mode, ["countdown", "stopwatch"], DEFAULTS.mode
          );
          merged.lastTaskLabel =
            typeof merged.lastTaskLabel === "string"
              ? merged.lastTaskLabel
              : DEFAULTS.lastTaskLabel;
          var ld =
            merged.lastDuration && typeof merged.lastDuration === "object"
              ? merged.lastDuration
              : DEFAULTS.lastDuration;
          merged.lastDuration = {
            m: clampInt(ld.m, 0, 999, DEFAULTS.lastDuration.m),
            s: clampInt(ld.s, 0, 59, DEFAULTS.lastDuration.s),
          };
        }
      } catch (e) {
        // Corrupt/unparseable -> treat as absent: defaults only.
        merged = deepCopyDefaults();
      }
    }
    return merged;
  }

  // Serialize the current in-memory settings object and write it.
  // No-op (silent) when storage is unavailable; never throws.
  function saveSettings() {
    if (!storageOk) {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      // Quota hit or storage became unavailable mid-session — the app
      // keeps running on the in-memory values.
    }
  }

  function toInt(value, fallback) {
    var n = parseInt(value, 10);
    if (isNaN(n)) {
      return fallback;
    }
    return n;
  }

  // Read the duration inputs -> total seconds, clamped to >= 0.
  // Minutes: 0..999, Seconds: 0..59 (clamped so "90" can't go negative/weird).
  function readDurationInputs() {
    var minutes = toInt(minutesEl ? minutesEl.value : "", 0);
    var seconds = toInt(secondsEl ? secondsEl.value : "", 0);
    if (minutes < 0 || isNaN(minutes)) {
      minutes = 0;
    }
    if (minutes > 999) {
      minutes = 999;
    }
    if (seconds < 0 || isNaN(seconds)) {
      seconds = 0;
    }
    if (seconds > 59) {
      seconds = 59;
    }
    return minutes * 60 + seconds;
  }

  // Empty-field normalization (Step 6 addendum): an EMPTY min/sec field
  // already reads as 0 in memory, but the input itself stayed blank and
  // a zero-duration Start failed silently. Write "0" into the empty
  // field(s) so the user SEES the value Start will actually use.
  // Returns how many fields were fixed (0, 1 or 2).
  function normalizeEmptyDurationFields() {
    var fixed = 0;
    if (minutesEl && String(minutesEl.value).trim() === "") {
      minutesEl.value = "0";
      fixed += 1;
    }
    if (secondsEl && String(secondsEl.value).trim() === "") {
      secondsEl.value = "0";
      fixed += 1;
    }
    return fixed;
  }

  // "Empty field was set to 0." / "Empty fields were set to 0."
  function correctedFieldsMessage(fixedFields) {
    return (
      "Empty field" + (fixedFields === 2 ? "s were" : " was") + " set to 0."
    );
  }

  // Transient validation hint under the duration inputs (auto-hides,
  // role="status" so screen readers announce it; never a modal and
  // never blocks the timer). Failures are silently ignored.
  var hintTimeoutId = null;
  var HINT_DURATION_MS = 4000;

  function showDurationHint(message) {
    if (!durationHintEl) {
      return;
    }
    durationHintEl.textContent = message;
    durationHintEl.classList.remove("hidden");
    if (hintTimeoutId !== null) {
      clearTimeout(hintTimeoutId);
    }
    hintTimeoutId = setTimeout(function () {
      hintTimeoutId = null;
      durationHintEl.classList.add("hidden");
    }, HINT_DURATION_MS);
  }

  function formatMMSS(totalSeconds) {
    var clamped = Math.max(0, totalSeconds);
    var m = Math.floor(clamped / 60);
    var s = clamped % 60;
    var mStr = String(m).padStart(2, "0");
    var sStr = String(s).padStart(2, "0");
    return mStr + ":" + sStr;
  }

  function render() {
    if (displayEl) {
      displayEl.textContent = formatMMSS(remainingSeconds);
    }
  }

  function isRunning() {
    return intervalId !== null;
  }

  function stopInterval() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  // ---- Step 4: alert helpers ----

  function isAlertActive() {
    return alertActive;
  }

  // Harsh two-tone warning alarm via the Web Audio API (no audio file).
  // Plays once per zero transition; failures (e.g. no AudioContext) are
  // silently ignored so the visual alert still shows.
  function playAlertSound() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        return;
      }
      if (!audioCtx) {
        audioCtx = new AC();
      }
      if (audioCtx.state === "suspended") {
        // resume() returns a promise on modern browsers; ignore result.
        audioCtx.resume();
      }
      var startAt = audioCtx.currentTime + 0.02;
      // Severe warning pattern: 6 rapid square-wave blasts alternating
      // high/low (740Hz / 554Hz — dissonant tritone-ish pair that reads
      // as "warning", not "notification"), plus one final long blast.
      // Square waves carry much better across a noisy classroom than
      // a soft sine chime.
      var pattern = [
        { freq: 740, dur: 0.18, gap: 0.22 },
        { freq: 554, dur: 0.18, gap: 0.22 },
        { freq: 740, dur: 0.18, gap: 0.22 },
        { freq: 554, dur: 0.18, gap: 0.22 },
        { freq: 740, dur: 0.18, gap: 0.22 },
        { freq: 554, dur: 0.18, gap: 0.30 },
        { freq: 880, dur: 0.50, gap: 0.00 },
      ];
      var t0 = startAt;
      pattern.forEach(function (step) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(step.freq, t0);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.4, t0 + 0.015);
        gain.gain.setValueAtTime(0.4, t0 + Math.max(0.015, step.dur - 0.03));
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + step.dur);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(t0);
        osc.stop(t0 + step.dur + 0.02);
        t0 += step.dur + step.gap;
      });
    } catch (e) {
      // No sound available — visual alert still fires below.
    }
  }

  function startVisualAlert() {
    if (stageEl) {
      stageEl.classList.add("timer-alert-active");
    }
    if (displayEl) {
      displayEl.classList.add("timer-alert-active");
    }
    if (bannerEl) {
      bannerEl.classList.remove("hidden");
    }
  }

  function stopAlert() {
    alertActive = false;
    if (alertTimeoutId !== null) {
      clearTimeout(alertTimeoutId);
      alertTimeoutId = null;
    }
    if (stageEl) {
      stageEl.classList.remove("timer-alert-active");
    }
    if (displayEl) {
      displayEl.classList.remove("timer-alert-active");
    }
    if (bannerEl) {
      if (!bannerEl.classList.contains("hidden")) {
        bannerEl.classList.add("hidden");
      }
    }
  }

  // Fire sound + visual exactly once per transition to zero, then
  // auto-stop the visual after ALERT_DURATION_MS so it never runs
  // indefinitely. Calling stopAlert() (any button/input) ends it sooner.
  function triggerAlertOnce() {
    if (alertActive) {
      return;
    }
    alertActive = true;
    playAlertSound();
    startVisualAlert();
    if (alertTimeoutId !== null) {
      clearTimeout(alertTimeoutId);
    }
    alertTimeoutId = setTimeout(stopAlert, ALERT_DURATION_MS);
  }

  function tick() {
    if (remainingSeconds <= 0) {
      // Already at zero — stop, clamp, never go negative. No re-fire:
      // the alert only fires on the >0 -> 0 transition below.
      remainingSeconds = 0;
      stopInterval();
      render();
      return;
    }
    remainingSeconds -= 1;
    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      stopInterval();
      render();
      triggerAlertOnce();
      return;
    }
    render();
  }

  function start() {
    // Guard against rapid clicking: only one interval may run at a time.
    if (isRunning()) {
      return;
    }
    // Any new Start dismisses a lingering zero alert (next-action stop).
    stopAlert();
    // Empty min/sec fields are normalized to 0 IN THE DOM on EVERY Start
    // press (fresh start AND resume), so the visible inputs always match
    // the value the timer will use. A live edit while idle stages the
    // coerced value in remainingSeconds, which would otherwise take the
    // resume path below and leave the input blank.
    var fixedFields = normalizeEmptyDurationFields();
    if (remainingSeconds <= 0) {
      // Fresh start (or restart after finishing): pick up the duration
      // currently in the inputs.
      lastSetSeconds = readDurationInputs();
      if (lastSetSeconds <= 0) {
        // Zero duration: no countdown, display stays at 00:00 — but the
        // click is no longer ignored silently; say why it did nothing.
        showDurationHint(
          "Enter a duration greater than 00:00 to start." +
            (fixedFields > 0 ? " " + correctedFieldsMessage(fixedFields) : "")
        );
        if (minutesEl) {
          minutesEl.focus();
        }
        remainingSeconds = 0;
        render();
        return;
      }
    }
    if (fixedFields > 0) {
      // Start proceeds (fresh or resume); tell the user what was
      // auto-corrected and keep the settings blob in sync.
      showDurationHint(correctedFieldsMessage(fixedFields));
      persistDuration();
    }
    if (remainingSeconds <= 0) {
      remainingSeconds = lastSetSeconds;
      render();
    }
    // Otherwise remainingSeconds > 0 while paused -> resume in place,
    // deliberately NOT re-reading the inputs so we continue where we left off.
    intervalId = setInterval(tick, 1000);
  }

  function pause() {
    stopInterval();
    stopAlert();
  }

  function reset() {
    stopInterval();
    stopAlert();
    // Return to the last-set duration so the teacher can restart the same
    // phase or type a new duration and press Start/Reset. Re-read inputs here
    // so a freshly typed value is picked up even without a change event.
    lastSetSeconds = readDurationInputs();
    remainingSeconds = lastSetSeconds;
    render();
  }

  function applyPreset(totalSeconds) {
    var m = Math.floor(totalSeconds / 60);
    var s = totalSeconds % 60;
    if (minutesEl) {
      minutesEl.value = String(m);
    }
    if (secondsEl) {
      secondsEl.value = String(s);
    }
    var oldSet = lastSetSeconds;
    lastSetSeconds = totalSeconds;
    // Don't disturb a running countdown or a paused-mid-countdown value;
    // stage the preset for Reset / the next fresh Start. When idle, reflect it now.
    if (!isRunning()) {
      if (remainingSeconds <= 0 || remainingSeconds === oldSet) {
        // New duration chosen while the zero alert shows: dismiss the
        // alert so the staged value is clearly visible.
        stopAlert();
        remainingSeconds = lastSetSeconds;
      }
      render();
    }
    persistDuration();
  }

  // Step 6: remember the last-set duration in the settings blob.
  // lastSetSeconds is already normalized (clamped by readDurationInputs
  // and presets), so splitting it back into m/s is always in range.
  function persistDuration() {
    settings.lastDuration = {
      m: Math.floor(lastSetSeconds / 60),
      s: lastSetSeconds % 60,
    };
    saveSettings();
  }

  function onDurationInput() {
    var newTotal = readDurationInputs();
    var oldSet = lastSetSeconds;
    lastSetSeconds = newTotal;
    if (!isRunning()) {
      // Idle (showing old set value or zero): live-update to the new value.
      // Paused mid-countdown (0 < remaining != old set): leave remaining
      // alone so Start resumes in place; new value is staged for Reset.
      if (remainingSeconds <= 0 || remainingSeconds === oldSet) {
        stopAlert();
        remainingSeconds = newTotal;
      }
      render();
    }
    persistDuration();
  }

  // Wire up controls. Task label (#task-label) is free text, editable at
  // any time and independent of timer state; since Step 6 it is persisted
  // to the settings blob, debounced ~300 ms so typing never causes
  // per-keystroke JSON churn.
  var labelSaveTimerId = null;

  function queueLabelSave() {
    if (labelSaveTimerId !== null) {
      clearTimeout(labelSaveTimerId);
    }
    labelSaveTimerId = setTimeout(function () {
      labelSaveTimerId = null;
      settings.lastTaskLabel = taskLabelEl ? taskLabelEl.value : "";
      saveSettings();
    }, 300);
  }

  if (startBtn) {
    startBtn.addEventListener("click", start);
  }
  if (pauseBtn) {
    pauseBtn.addEventListener("click", pause);
  }
  if (resetBtn) {
    resetBtn.addEventListener("click", reset);
  }

  if (minutesEl) {
    minutesEl.addEventListener("input", onDurationInput);
    minutesEl.addEventListener("change", onDurationInput);
  }
  if (secondsEl) {
    secondsEl.addEventListener("input", onDurationInput);
    secondsEl.addEventListener("change", onDurationInput);
  }

  if (taskLabelEl) {
    taskLabelEl.addEventListener("input", queueLabelSave);
  }

  Object.keys(presetButtons).forEach(function (id) {
    var btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", function () {
        applyPreset(presetButtons[id]);
      });
    }
  });

  // ---- Step 5: fullscreen + keyboard shortcuts ----

  function isFullscreen() {
    return Boolean(
      document.fullscreenElement || document.webkitFullscreenElement
    );
  }

  // Toggle projector fullscreen via the Fullscreen API. Failures
  // (e.g. unsupported browser, denied request) are silently ignored
  // so the timer itself never breaks.
  function toggleFullscreen() {
    try {
      if (isFullscreen()) {
        if (document.exitFullscreen) {
          var p = document.exitFullscreen();
          if (p && typeof p.catch === "function") {
            p.catch(function () {});
          }
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      } else {
        var el = document.documentElement;
        if (el.requestFullscreen) {
          var r = el.requestFullscreen();
          if (r && typeof r.catch === "function") {
            r.catch(function () {});
          }
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen();
        }
      }
    } catch (e) {
      // Fullscreen unavailable — ignore, timer keeps working.
    }
  }

  function syncFullscreenLabel() {
    if (fullscreenBtn) {
      fullscreenBtn.textContent = isFullscreen()
        ? "\u00d7 Exit fullscreen"
        : "\u26f6 Fullscreen";
    }
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", toggleFullscreen);
  }
  document.addEventListener("fullscreenchange", syncFullscreenLabel);
  document.addEventListener("webkitfullscreenchange", syncFullscreenLabel);
  syncFullscreenLabel();

  // Keyboard shortcuts for mid-class use: Space = start/pause toggle,
  // R = reset, F = fullscreen. Ignored while focus is in a text field
  // (task label, duration inputs), a select, textarea, or any
  // contentEditable element, so typing never triggers timer actions.
  // Space on a focused button is also left to the browser's native
  // button activation to avoid double-toggling.
  function isTypingTarget(target) {
    if (!target) {
      return false;
    }
    var tag = (target.tagName || "").toUpperCase();
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
      return true;
    }
    if (target.isContentEditable) {
      return true;
    }
    return false;
  }

  function toggleStartPause() {
    if (isRunning()) {
      pause();
    } else {
      start();
    }
  }

  document.addEventListener("keydown", function (e) {
    if (e.defaultPrevented) {
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }
    var target = e.target;
    if (isTypingTarget(target)) {
      return;
    }
    var key = e.key;
    if (key === " " || key === "Spacebar") {
      // Let a focused button handle Space natively (click), otherwise
      // it would both click AND toggle.
      if (target && (target.tagName || "").toUpperCase() === "BUTTON") {
        return;
      }
      e.preventDefault();
      toggleStartPause();
    } else if (key === "r" || key === "R") {
      e.preventDefault();
      reset();
    } else if (key === "f" || key === "F") {
      e.preventDefault();
      toggleFullscreen();
    }
  });

  // Init — Step 6 load order:
  //   1. Parse/validate `ct-settings` (defaults if absent/corrupt).
  //   2. Apply to DOM/engine in order: duration inputs + display ->
  //      language (Spec 07 applyLanguage) -> sound (Spec 08) -> mode
  //      (Spec 11). Language runs after duration so translated
  //      placeholders/labels win — those steps hook in below.
  //   3. Corrupt/unparseable JSON was treated as absent (defaults), so
  //      the first save overwrites it.
  // Persisted but not yet applied here: language/volume/muted/alarmVoice/
  // finalTicks/uiClicks/celebrate/mode — no UI for them exists until
  // Specs 07/08/10/11 land; their defaults sit in the blob meanwhile.
  settings = loadSettings();

  if (minutesEl) {
    minutesEl.value = String(settings.lastDuration.m);
  }
  if (secondsEl) {
    secondsEl.value = String(settings.lastDuration.s);
  }
  // (Spec 07: applyLanguage(settings.language) goes here.)
  // (Spec 08: sound settings apply goes here.)
  // (Spec 11: mode apply goes here.)

  // Restore the task label (in-memory only in earlier steps).
  if (taskLabelEl && settings.lastTaskLabel) {
    taskLabelEl.value = settings.lastTaskLabel;
  }

  // Display reflects the duration inputs (restored or markup default).
  lastSetSeconds = readDurationInputs();
  remainingSeconds = lastSetSeconds;
  render();
})();
