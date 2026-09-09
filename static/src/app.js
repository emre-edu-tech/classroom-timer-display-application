// Step 3 — Timer Logic (vanilla JS, no frameworks, no persistence).
// Step 4 — Alert Behavior at zero: Web Audio chime + visual flash/pulse.
//
// Element IDs come from Step 2 markup in templates/index.html:
//   #countdown-display, #task-label (free text, untouched by JS),
//   #duration-minutes, #duration-seconds,
//   #preset-5m, #preset-10m, #preset-15m,
//   #btn-start, #btn-pause, #btn-reset,
//   #timer-stage, #alert-banner (Step 4 visual alert hooks).
//
// Edge-case choices (per spec, either option allowed):
//   - Starting with a zero/empty duration IGNORES the click (no countdown,
//     display stays at 00:00). It does not crash.
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
  // Step 4 visual-alert hooks (may be null in older markup — guarded below).
  var stageEl = document.getElementById("timer-stage");
  var bannerEl = document.getElementById("alert-banner");

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
    if (remainingSeconds <= 0) {
      // Fresh start (or restart after finishing): pick up the duration
      // currently in the inputs.
      lastSetSeconds = readDurationInputs();
      if (lastSetSeconds <= 0) {
        // Zero/empty duration: ignore the click, stay at 00:00.
        remainingSeconds = 0;
        render();
        return;
      }
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
  }

  // Wire up controls. Task label (#task-label) is intentionally left alone:
  // free-text, editable at any time, independent of timer state, in-memory only.
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

  Object.keys(presetButtons).forEach(function (id) {
    var btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", function () {
        applyPreset(presetButtons[id]);
      });
    }
  });

  // Init: display reflects the duration inputs (default 10:00 in markup).
  lastSetSeconds = readDurationInputs();
  remainingSeconds = lastSetSeconds;
  render();
})();
