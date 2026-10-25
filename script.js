const $ = (id) => document.getElementById(id);
const buttons = [...document.querySelectorAll('[data-mode]')];
const modes = { focus: 25, short: 5, long: 15 };

let mode = 'focus';
let remaining = 1500;
let endAt = null;
let interval = null;
let completed = 0;

const today = () => new Date().toLocaleDateString('en-CA');

try {
  const saved = JSON.parse(localStorage.getItem('cozyFocusStats') || '{}');
  if (saved.day === today()) completed = saved.completed || 0;
} catch {}

function save() {
  try {
    localStorage.setItem('cozyFocusStats', JSON.stringify({ day: today(), completed }));
  } catch {}
}

function duration() {
  return modes[mode] * 60;
}

function stop() {
  if (interval) clearInterval(interval);
  interval = null;
  endAt = null;
}

function render() {
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  $('time').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  document.title = `${$('time').textContent} • Cozy Focus`;

  const pct = Math.min(100, Math.max(0, Math.round((1 - remaining / duration()) * 100)));
  $('fill').style.width = pct + '%';
  $('progress').setAttribute('aria-valuenow', pct);
  $('count').textContent = `${completed} / 4`;
  $('toggle').textContent = interval ? 'Ⅱ Pause' : '▶ Start';
  $('pet').classList.toggle('sleepy', mode !== 'focus');
}

function say(message) {
  $('message').textContent = message;
}

function select(next) {
  stop();
  mode = next;
  remaining = duration();

  buttons.forEach((b) => {
    const active = b.dataset.mode === mode;
    b.classList.toggle('active', active);
    b.setAttribute('aria-pressed', active);
  });

  $('pet').classList.remove('happy');
  say(mode === 'focus' ? 'You got this! One task at a time ♡' : 'Rest those paws. You earned it! 🐾');
  render();
}

function finish() {
  stop();
  remaining = 0;
  render();
  $('pet').classList.add('happy');

  if (mode === 'focus') {
    completed++;
    save();
    say('Yay! You did it! Proud of you! 🎉');
  } else {
    say('All rested? Your bunny is ready! 🌷');
  }

  render();

  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Cozy Focus 🐰', {
        body: mode === 'focus' ? 'Focus complete! Time for a break.' : 'Break complete! Ready to focus?'
      });
    }
  } catch {}

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + .35);
  } catch {}
}

function tick() {
  remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
  if (!remaining) finish();
  else render();
}

$('toggle').addEventListener('click', () => {
  if (interval) {
    tick();
    stop();
    say('A little pause is okay ♡');
    render();
    return;
  }

  if (remaining === 0) remaining = duration();
  endAt = Date.now() + remaining * 1000;
  interval = setInterval(tick, 250);
  $('pet').classList.remove('happy');
  say(mode === 'focus' ? 'Shhh… bunny is focusing with you 🍓' : 'Breathe in, breathe out ☁️');
  render();

  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
});

$('reset').addEventListener('click', () => select(mode));
buttons.forEach((b) => b.addEventListener('click', () => select(b.dataset.mode)));

$('apply').addEventListener('click', () => {
  for (const [name, id, max] of [
    ['focus', 'focusMinutes', 180],
    ['short', 'shortMinutes', 60],
    ['long', 'longMinutes', 120]
  ]) {
    const n = Number($(id).value);
    if (!Number.isInteger(n) || n < 1 || n > max) {
      alert(`Please enter 1–${max} minutes for ${name}.`);
      return;
    }
    modes[name] = n;
  }

  select(mode);
  say('New timer settings saved! 🌷');
});

render();
