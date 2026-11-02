
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

  // Bunny data
  let bunnyName = "Mochi";
  let carrots = 0;
  let totalFed = 0;
  let munchTimeout = null;

  function today() {
    const d = new Date();
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-");
  }


  try {
    const savedStats = JSON.parse(
      localStorage.getItem("cozyFocusStats") || "{}"
    );

    if (savedStats.day === today()) {
      completed = Number(savedStats.completed) || 0;
    }

    const savedBunny = JSON.parse(
      localStorage.getItem("cozyPomopetBunny") || "{}"
    );

    if (typeof savedBunny.name === "string") {
      bunnyName = savedBunny.name || "Mochi";
    }

    carrots = Math.max(
      0,
      Math.floor(Number(savedBunny.carrots) || 0)
    );

    totalFed = Math.max(
      0,
      Math.floor(Number(savedBunny.totalFed) || 0)
    );
  } catch (error) {
    console.warn("Could not load saved progress", error);
  }

  function saveStats() {
    try {
      localStorage.setItem(
        "cozyFocusStats",
        JSON.stringify({
          day: today(),
          completed
        })
      );
    } catch (error) {
      console.warn("Could not save sessions", error);
    }
  }

  function saveBunny() {
    try {
      localStorage.setItem(
        "cozyPomopetBunny",
        JSON.stringify({
          name: bunnyName,
          carrots,
          totalFed
        })
      );
    } catch (error) {
      console.warn("Could not save bunny", error);
    }
  }

  function say(message) {
    $("message").textContent = message;
  }

  function renderBunny() {
    const nameDisplay = document.getElementById("bunnyDisplay");
    const carrotDisplay = document.getElementById("carrots");
    const feedButton = document.getElementById("feedBunny");
    if (nameDisplay) {
      nameDisplay.textContent = bunnyName + " 🐰";
    }
    if (carrotDisplay) {
      carrotDisplay.textContent = carrots;
    }
    if (feedButton) {
      feedButton.disabled = carrots < 1;
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
      String(minutes).padStart(2, "0") + ":" +
      String(seconds).padStart(2, "0");

    $("time").textContent = timeText;
    document.title = timeText + " • Cozy Pomopet";

    const pct = Math.min(
      100,
      Math.max(
        0,
        Math.round((1 - remaining / duration()) * 100)
      )
    );

    $("fill").style.width = pct + "%";
    $("progress").setAttribute("aria-valuenow", pct);

    $("count").textContent = `${completed} / 4`;

    $("toggle").textContent =
      interval !== null ? "Ⅱ pause" : "▶ start";

    $("pet").classList.toggle("sleepy", mode !== "focus");

    buttons.forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    renderBunny();
  }

  function select(nextMode) {
    if (!(nextMode in modes)) return;

    stop();
    mode = nextMode;
    remaining = duration();

    $("pet").classList.remove("happy", "munching");

    if (mode === "focus") {
      say(`${bunnyName} believes in you! ♡`);
    } else if (mode === "short") {
      say(`${bunnyName} says take a lil break ☁️`);
    } else {
      say(`${bunnyName} says you earned some rest 🌙`);
    }

    render();
  }

  function playSound() {
    try {
      const AudioClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioClass) return;

      const ctx = new AudioClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = 660;

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + 0.35
      );

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);

      osc.onended = () => {
        ctx.close().catch(() => {});
      };
    } catch (error) {
      console.warn("Audio unavailable", error);
    }
  }

  function sendNotification() {
    try {
      if (
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification("Cozy Pomopet 🐰", {
          body: mode === "focus"
            ? "You earned a carrot! 🥕"
            : "Break finished! Ready to study?"
        });
      }
    } catch (error) {
      console.warn("Notifications unavailable", error);
    }
  }


function finish() {
  // Prevent the timer from completing more than once.
  if (endAt === null) return;

  stop();
  remaining = 0;

  $("pet").classList.add("happy");

  if (mode === "focus") {
    // Reward one carrot for a completed study session.
    completed += 1;
    carrots += 1;

    saveStats();
    saveBunny();

    render();
    renderHappiness();

    say(`YAY! ${bunnyName} earned 1 carrot! 🥕`);

    console.log("Focus session completed!");
    console.log("Carrot balance:", carrots);
  } else {
    render();
    say(`${bunnyName} is ready to study again! 🌷`);
  }

  playSound();
  sendNotification();
}


  function tick() {
    if (endAt === null) return;

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

      if (interval === null) return;

      stop();
      say(`${bunnyName} is waiting patiently ♡`);
      render();
      return;
    }

    if (remaining === 0) {
      remaining = duration();
    }

    endAt = Date.now() + remaining * 1000;
    interval = setInterval(tick, 250);

    $("pet").classList.remove("happy", "munching");

    say(
      mode === "focus"
        ? `Shhh… ${bunnyName} is studying with you 🍓`
        : `${bunnyName} is resting ☁️`
    );

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
      console.warn("Notification permission unavailable", error);
    }
  });

  
  $("reset").addEventListener("click", () => {
    select(mode);
    say("Fresh start! You got this ♡");
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

    const updated = {};

    for (const [name, id, max] of inputs) {
      const raw = $(id).value.trim();
      const n = Number(raw);

      if (
        raw === "" ||
        !Number.isInteger(n) ||
        n < 1 ||
        n > max
      ) {
        alert(`Please enter 1–${max} minutes for ${name}.`);
        $(id).focus();
        return;
      }

      updated[name] = n;
    }

    Object.assign(modes, updated);
    select(mode);
    say("New timer settings saved for this visit! 🌷");
  });

  // NEW: Name your bunny
  function saveName() {
    const newName = $("bunnyName").value.trim();

    if (!newName) {
      say("Your bunny needs a name! ♡");
      return;
    }

    bunnyName = newName.slice(0, 20);
    $("bunnyName").value = "";

    saveBunny();
    renderBunny();

    say(`Hi! My name is ${bunnyName}! 🐰💕`);
  }

  $("saveName").addEventListener("click", saveName);

  $("bunnyName").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      saveName();
    }
  });

  // NEW: Feed the bunny with an earned carrot
  $("feedBunny").addEventListener("click", () => {
    if (carrots < 1) {
      say(`${bunnyName} needs a carrot! Finish a focus sesh 🥕`);
      return;
    }

    updateHappinessDecay();
    happiness = Math.min(100, happiness + 20);
    carrots -= 1;
    totalFed += 1;

    saveBunny();
    renderBunny();
    renderHappiness();

    const pet = $("pet");
    if (munchTimeout !== null) {
      clearTimeout(munchTimeout);
    }

    pet.classList.remove("munching");
    void pet.offsetWidth;
    pet.classList.add("munching", "happy");

    say(`*nom nom nom* ${bunnyName} is happier! 🥕💕`);

    munchTimeout = setTimeout(() => {
      pet.classList.remove("munching");

      if (interval !== null) {
        pet.classList.remove("happy");
      }

      munchTimeout = null;
    }, 1200);
    console.log("Happiness after feeding:", happiness);
  });

  // Initialize everything
  render();

  console.log("Cozy Pomopet loaded! 🐰");
});
