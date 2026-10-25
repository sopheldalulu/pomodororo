
"use strict";


document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const buttons = [...document.querySelectorAll("[data-mode]")];

  const modes = {
    focus: 25,
    short: 5,
    long: 15
  };

  let mode = "focus";
  let remaining = modes.focus * 60;
  let endAt = null;
  let interval = null;
  let completed = 0;

  const requiredIds = [
    "time",
    "progress",
    "fill",
    "count",
    "toggle",
    "reset",
    "apply",
    "pet",
    "message",
    "focusMinutes",
    "shortMinutes",
    "longMinutes"
  ];

  const missing = requiredIds.filter((id) => !$(id));

  if (missing.length > 0) {
    console.error("Pomopet: Missing HTML elements:", missing);
    return;
  }

  function today() {
    const now = new Date();

    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0")
    ].join("-");
  }

  try {
    const saved = JSON.parse(
      localStorage.getItem("cozyFocusStats") || "{}"
    );

    if (saved.day === today()) {
      completed = Number(saved.completed) || 0;
    }
  } catch (error) {
    console.warn("Could not load saved sessions:", error);
  }

  function save() {
    try {
      localStorage.setItem(
        "cozyFocusStats",
        JSON.stringify({
          day: today(),
          completed: completed
        })
      );
    } catch (error) {
      console.warn("Could not save sessions:", error);
    }
  }

  function duration() {
    return modes[mode] * 60;
  }

  function stop() {
    if (interval !== null) {
      clearInterval(interval);
    }

    interval = null;
    endAt = null;
  }

  
  function render() {
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);

    const timeText =
      String(minutes).padStart(2, "0") +
      ":" +
      String(seconds).padStart(2, "0");

    $("time").textContent = timeText;

    document.title = timeText + " • Cozy Pomopet";

    const total = duration();

    const percent = Math.min(
      100,
      Math.max(0, Math.round((1 - remaining / total) * 100))
    );

    $("fill").style.width = percent + "%";

    $("progress").setAttribute(
      "aria-valuenow",
      String(percent)
    );

    $("count").textContent = completed + " / 4";

    $("toggle").textContent =
      interval !== null ? "Ⅱ pause" : "▶ start";

    $("pet").classList.toggle("sleepy", mode !== "focus");

    buttons.forEach((button) => {
      const active = button.dataset.mode === mode;

      button.classList.toggle("active", active);

      button.setAttribute(
        "aria-pressed",
        String(active)
      );
    });
  }

  function say(message) {
    $("message").textContent = message;
  }

  
  function select(nextMode) {
    if (!(nextMode in modes)) {
      return;
    }

    stop();

    mode = nextMode;
    remaining = duration();

    $("pet").classList.remove("happy");

    if (mode === "focus") {
      say("You got this! One task at a time ♡");
    } else if (mode === "short") {
      say("Take a little breather, bunny! ☁️");
    } else {
      say("You earned a cozy long break! 🌙");
    }

    render();
  }

  
  function playSound() {
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) {
        return;
      }

      const ctx = new AudioContextClass();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = 660;

      gain.gain.setValueAtTime(0.08, ctx.currentTime);

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + 0.35
      );

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.35);

      oscillator.onended = () => {
        ctx.close().catch(() => {});
      };
    } catch (error) {
      console.warn("Sound unavailable:", error);
    }
  }

  
  function sendNotification() {
    try {
      if (
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification("Cozy Pomopet 🐰", {
          body:
            mode === "focus"
              ? "Focus complete! Time for a break."
              : "Break complete! Ready to focus?"
        });
      }
    } catch (error) {
      console.warn("Notification unavailable:", error);
    }
  }

  
  function finish() {
    stop();

    remaining = 0;

    $("pet").classList.add("happy");

    if (mode === "focus") {
      completed += 1;
      save();

      if (completed % 4 === 0) {
        say("4 sessions done! Enjoy a long break! 🎉");
      } else {
        say("Yay! You did it! Proud of you! 🎉");
      }
    } else {
      say("All rested? Your bunny is ready! 🌷");
    }

    render();
    playSound();
    sendNotification();
  }

  
  function tick() {
    if (endAt === null) {
      return;
    }

    remaining = Math.max(
      0,
      Math.ceil((endAt - Date.now()) / 1000)
    );

    if (remaining <= 0) {
      finish();
    } else {
      render();
    }
  }

  
  $("toggle").addEventListener("click", () => {
    if (interval !== null) {
      tick();

      if (interval === null) {
        return;
      }

      stop();

      say("A little pause is okay ♡");
      render();
      return;
    }

    if (remaining <= 0) {
      remaining = duration();
    }

    endAt = Date.now() + remaining * 1000;

    interval = setInterval(tick, 250);

    $("pet").classList.remove("happy");

    if (mode === "focus") {
      say("Shhh… bunny is focusing with you 🍓");
    } else {
      say("Breathe in, breathe out ☁️");
    }

    render();

    
    try {
      if (
        "Notification" in window &&
        Notification.permission === "default" &&
        window.isSecureContext
      ) {
        const result = Notification.requestPermission();

        if (result && typeof result.catch === "function") {
          result.catch(() => {});
        }
      }
    } catch (error) {
      console.warn("Notification permission unavailable:", error);
    }
  });

  
  $("reset").addEventListener("click", () => {
    select(mode);
    say("Fresh start! Your bunny believes in you ♡");
  });

  
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      select(button.dataset.mode);
    });
  });

  
  $("apply").addEventListener("click", () => {
    const inputs = [
      ["focus", "focusMinutes", 180],
      ["short", "shortMinutes", 60],
      ["long", "longMinutes", 120]
    ];

    const updatedModes = {};

    
    for (const [name, id, max] of inputs) {
      const raw = $(id).value.trim();
      const value = Number(raw);

      if (
        raw === "" ||
        !Number.isInteger(value) ||
        value < 1 ||
        value > max
      ) {
        alert(
          "Please enter 1–" +
          max +
          " minutes for " +
          name +
          "."
        );

        $(id).focus();
        return;
      }

      updatedModes[name] = value;
    }

    Object.assign(modes, updatedModes);

    select(mode);

    say("New timer settings saved! 🌷");
  });

 
  render();

  console.log("Pomopet controls loaded successfully.");
});
