
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
  let focusSessionStarted = false;

  let bunnyName = "Mochi";
  let carrots = 0;
  let totalFed = 0;
  let happiness = 70;
  let lastHappinessUpdate = Date.now();
  let munchTimeout = null;

  const HAPPINESS_DECAY_INTERVAL = 6 * 60 * 60 * 1000;
  const HAPPINESS_DECAY_AMOUNT = 15;

  function clampHappiness(value) {
    return Math.max(0, Math.min(100, value));
  }

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
      completed = Math.max(
        0,
        Math.floor(Number(savedStats.completed) || 0)
      );
    }

    const savedBunny = JSON.parse(
      localStorage.getItem("cozyPomopetBunny") || "{}"
    );

    if (
      typeof savedBunny.name === "string" &&
      savedBunny.name.trim()
    ) {
      bunnyName = savedBunny.name.slice(0, 20);
    }

    carrots = Math.max(
      0,
      Math.floor(Number(savedBunny.carrots) || 0)
    );

    totalFed = Math.max(
      0,
      Math.floor(Number(savedBunny.totalFed) || 0)
    );

    if (Number.isFinite(savedBunny.happiness)) {
      happiness = clampHappiness(savedBunny.happiness);
    }

    if (
      Number.isFinite(savedBunny.lastHappinessUpdate) &&
      savedBunny.lastHappinessUpdate > 0 &&
      savedBunny.lastHappinessUpdate <= Date.now()
    ) {
      lastHappinessUpdate = savedBunny.lastHappinessUpdate;
    }
  } catch (error) {
    console.warn("Could not load saved progress:", error);
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
      console.warn("Could not save sessions:", error);
    }
  }

  function saveBunny() {
    try {
      localStorage.setItem(
        "cozyPomopetBunny",
        JSON.stringify({
          name: bunnyName,
          carrots,
          totalFed,
          happiness: clampHappiness(happiness),
          lastHappinessUpdate
        })
      );
    } catch (error) {
      console.warn("Could not save bunny:", error);
    }
  }

  function say(message) {
    const messageElement = $("message");

    if (messageElement) {
      messageElement.textContent = message;
    }
  }

  function renderBunny() {
    const nameDisplay = $("bunnyDisplay");
    const carrotDisplay = $("carrots");
    const feedButton = $("feedBunny");

    if (nameDisplay) {
      nameDisplay.textContent = bunnyName + " 🐰 ✎";
    }

    if (carrotDisplay) {
      carrotDisplay.textContent = carrots;
    }

    if (feedButton) {
      feedButton.disabled = carrots < 1;
    }
  }

  function renderHappiness() {
    happiness = clampHappiness(happiness);

    const value = $("happinessValue");
    const fill = $("happinessFill");
    const meter = $("happinessMeter");
    const mood = $("happinessMood");

    if (value) {
      value.textContent = `${happiness} / 100`;
    }

    if (fill) {
      fill.style.width = `${happiness}%`;
      fill.style.height = "100%";
      fill.style.display = "block";

      if (happiness >= 50) {
        fill.style.background =
          "linear-gradient(90deg, #f5a1b9, #d98aa8)";
      } else if (happiness >= 25) {
        fill.style.background =
          "linear-gradient(90deg, #f8c78b, #efa36f)";
      } else {
        fill.style.background =
          "linear-gradient(90deg, #e8b1b1, #d98585)";
      }
    }

    if (meter) {
      meter.setAttribute(
        "aria-valuenow",
        String(happiness)
      );
    }

    if (mood) {
      if (happiness >= 80) {
        mood.textContent = "super happy! 🥰";
      } else if (happiness >= 50) {
        mood.textContent = "feeling cozy ♡";
      } else if (happiness >= 25) {
        mood.textContent = "a little lonely 🥺";
      } else {
        mood.textContent = "needs some love 🥕";
      }
    }
  }

  function updateHappinessDecay() {
    const now = Date.now();

    const elapsed = Math.max(
      0,
      now - lastHappinessUpdate
    );

    const periods = Math.floor(
      elapsed / HAPPINESS_DECAY_INTERVAL
    );

    if (periods > 0) {
      happiness = clampHappiness(
        happiness - periods * HAPPINESS_DECAY_AMOUNT
      );

      lastHappinessUpdate +=
        periods * HAPPINESS_DECAY_INTERVAL;

      saveBunny();
      renderHappiness();
    }
  }

  function changeHappiness(amount) {
    updateHappinessDecay();

    happiness = clampHappiness(happiness + amount);

    saveBunny();
    renderHappiness();
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

    const pct = Math.min(
      100,
      Math.max(
        0,
        Math.round(
          (1 - remaining / duration()) * 100
        )
      )
    );

    $("fill").style.width = pct + "%";

    $("progress").setAttribute(
      "aria-valuenow",
      String(pct)
    );

    $("count").textContent = `${completed} / 4`;

    $("toggle").textContent =
      interval !== null ? "Ⅱ pause" : "▶ start";

    $("pet").classList.toggle(
      "sleepy",
      mode !== "focus"
    );

    buttons.forEach((button) => {
      const active = button.dataset.mode === mode;

      button.classList.toggle("active", active);

      button.setAttribute(
        "aria-pressed",
        String(active)
      );
    });

    renderBunny();
    renderHappiness();
  }

  function select(nextMode) {
    if (!(nextMode in modes)) {
      return;
    }

    if (interval !== null) {
      tick();
    }

    const cancelled =
      mode === "focus" &&
      focusSessionStarted &&
      remaining > 0;

    if (cancelled) {
      changeHappiness(-5);
    }

    focusSessionStarted = false;

    stop();

    mode = nextMode;
    remaining = duration();

    $("pet").classList.remove(
      "happy",
      "munching"
    );

    if (mode === "focus") {
      say(`${bunnyName} believes in you! ♡`);
    } else if (mode === "short") {
      say(`${bunnyName} says take a lil break ☁️`);
    } else {
      say(`${bunnyName} says you earned some rest 🌙`);
    }

    render();

    if (cancelled) {
      say(`${bunnyName} lost 5 happiness 💔`);
    }
  }

  function playSound() {
    try {
      const AudioClass =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioClass) {
        return;
      }

      const ctx = new AudioClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = 660;

      gain.gain.setValueAtTime(
        0.08,
        ctx.currentTime
      );

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
      console.warn("Audio unavailable:", error);
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
              ? "You earned a carrot! 🥕"
              : "Break finished! Ready to study?"
        });
      }
    } catch (error) {
      console.warn(
        "Notifications unavailable:",
        error
      );
    }
  }

  function finish() {
    if (endAt === null) {
      return;
    }

    focusSessionStarted = false;

    stop();

    remaining = 0;

    $("pet").classList.add("happy");

    if (mode === "focus") {
      completed += 1;
      carrots += 1;

      saveStats();
      saveBunny();

      render();

      if (completed % 4 === 0) {
        say(
          `YAY! ${bunnyName} earned a carrot! 🥕 Long break time!`
        );
      } else {
        say(
          `YAY! ${bunnyName} earned 1 carrot! 🥕`
        );
      }

      console.log(
        "Focus complete. Carrots:",
        carrots
      );
    } else {
      render();

      say(
        `${bunnyName} is ready to study again! 🌷`
      );
    }

    playSound();
    sendNotification();
  }

  function tick() {
    if (endAt === null) {
      return;
    }

    remaining = Math.max(
      0,
      Math.ceil(
        (endAt - Date.now()) / 1000
      )
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

      say(
        `${bunnyName} is waiting patiently ♡`
      );

      render();
      return;
    }

    if (remaining <= 0) {
      remaining = duration();
    }

    endAt = Date.now() + remaining * 1000;

    interval = setInterval(tick, 250);

    if (mode === "focus") {
      focusSessionStarted = true;
    }

    $("pet").classList.remove(
      "happy",
      "munching"
    );

    if (mode === "focus") {
      say(
        `Shhh… ${bunnyName} is studying with you 🍓`
      );
    } else {
      say(`${bunnyName} is resting ☁️`);
    }

    render();

    try {
      if (
        "Notification" in window &&
        Notification.permission === "default" &&
        window.isSecureContext
      ) {
        const result =
          Notification.requestPermission();

        if (
          result &&
          typeof result.catch === "function"
        ) {
          result.catch(() => {});
        }
      }
    } catch (error) {
      console.warn(
        "Notification permission unavailable:",
        error
      );
    }
  });

  $("reset").addEventListener("click", () => {
    const wasUnfinished =
      mode === "focus" &&
      focusSessionStarted &&
      remaining > 0;

    select(mode);

    if (!wasUnfinished) {
      say("Fresh start! You got this ♡");
    }
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
        alert(
          `Please enter 1–${max} minutes for ${name}.`
        );

        $(id).focus();
        return;
      }

      updated[name] = n;
    }

    Object.assign(modes, updated);

    const wasUnfinished =
      mode === "focus" &&
      focusSessionStarted &&
      remaining > 0;

    select(mode);

    if (!wasUnfinished) {
      say(
        "New timer settings saved for this visit! 🌷"
      );
    }
  });

  function openRename() {
    $("renameRow").hidden = false;
    $("bunnyDiplay").hidden = true;
    $("bunnyName").value = bunnyName;
    $("bunnyName").focus();
    $("bunnyName").select();
  }

  function closeRename() {
    $("renameRow").hidden = true;
    $("bunnyDisplay").hidden = false;
  }
  
  function saveName() {
    const newName = $("bunnyName").value.trim();
    
    if (!newName) {
      say("your bunny needs a name!");
      return;
    }
    bunnyName = newName.slice(0, 20);
    saveBunny();
    renderBunny();
    closeRename();
    say(`hi! my name is ${bunnyName}!`);
  }

  $("bunnyDisplay").addEventListener("click", openRename);
  $("saveName").addEventListener("click", saveName);
  $("cancelName").addEventListener("click", closeRename);

  $("bunnyName").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      saveName();
    }
    if (event.key === "Escape") {
      closeRename();
    }
  });

  $("feedBunny").addEventListener("click", () => {
    updateHappinessDecay();

    if (carrots < 1) {
      say(
        `${bunnyName} needs a carrot! Finish a focus sesh 🥕`
      );
      return;
    }

    if (happiness >= 100) {
      say(
        `${bunnyName} is already super happy! Save your carrot! 💗`
      );
      return;
    }

    happiness = clampHappiness(
      happiness + 20
    );

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

    pet.classList.add(
      "munching",
      "happy"
    );

    say(
      `*nom nom nom* ${bunnyName} is happier! 🥕💕`
    );

    munchTimeout = setTimeout(() => {
      pet.classList.remove("munching");

      if (interval !== null) {
        pet.classList.remove("happy");
      }

      munchTimeout = null;
    }, 1200);

    
      "Happiness after feeding:",
      happiness
    );
  });

  updateHappinessDecay();

  render();

  setInterval(() => {
    updateHappinessDecay();
    renderHappiness();
  }, 60000);

  document.addEventListener(
    "visibilitychange",
    () => {
      if (!document.hidden) {
        updateHappinessDecay();
        renderHappiness();
      }
    }
  );

  
const todoForm = $("todoForm");
const todoInput = $("todoInput");
const todoList = $("todoList");
const todoProgress = $("todoProgress");
const clearCompleted = $("clearCompleted");

let todos = [];

try {
  const savedTodos = JSON.parse(
    localStorage.getItem("cozyPomopetTodos") || "[]"
  );

  if (Array.isArray(savedTodos)) {
    todos = savedTodos.filter(
      item =>
        item &&
        typeof item.id === "string" &&
        typeof item.text === "string" &&
        typeof item.done === "boolean"
    );
  }
} catch (error) {
  console.warn("Could not load tasks:", error);
}

function saveTodos() {
  try {
    localStorage.setItem(
      "cozyPomopetTodos",
      JSON.stringify(todos)
    );
  } catch (error) {
    console.warn("Could not save tasks:", error);
  }
}

function renderTodos() {
  todoList.replaceChildren();

  todos.forEach((todo) => {
    const item = document.createElement("li");
    item.className = "todo-item";

    if (todo.done) {
      item.classList.add("completed");
    }

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.done;
    checkbox.setAttribute(
      "aria-label",
      `Complete ${todo.text}`
    );

    checkbox.addEventListener("change", () => {
      todo.done = checkbox.checked;
      saveTodos();
      renderTodos();
    });

    const text = document.createElement("span");
    text.className = "todo-text";
    text.textContent = todo.text;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "todo-delete";
    deleteButton.textContent = "×";
    deleteButton.setAttribute(
      "aria-label",
      `Delete ${todo.text}`
    );

    deleteButton.addEventListener("click", () => {
      todos = todos.filter(t => t.id !== todo.id);
      saveTodos();
      renderTodos();
    });

    item.append(checkbox, text, deleteButton);
    todoList.appendChild(item);
  });

  const doneCount = todos.filter(t => t.done).length;

  todoProgress.textContent =
    `${doneCount} of ${todos.length} done ♡`;

  clearCompleted.disabled = doneCount === 0;
}

todoForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = todoInput.value.trim();

  if (!text) return;

  todos.push({
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
    text: text.slice(0, 100),
    done: false
  });

  todoInput.value = "";

  saveTodos();
  renderTodos();
  todoInput.focus();
});

clearCompleted.addEventListener("click", () => {
  todos = todos.filter(todo => !todo.done);
  saveTodos();
  renderTodos();
});

renderTodos();




  console.log("Cozy Pomopet loaded! 🐰");
});
