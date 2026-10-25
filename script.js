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
    const saved = JSON.parse(localStorage.getItem('cozyFocusStates') || '{}');
    if (saved.day === today ()) completed = saved.completed || 0;
} catch {}

function save () {
    try {
        localStorage.setItem('cozyFocusStats', JSON.stringify({ day: today(), completed}));
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
    $('time').textContent = `${$('time').textContent.content} • cozy focus`;
    $('progress').setAttribute('aria-valuenow', pct);
    $('count').textContent = `${completed} / 4`;
    $('toggle').textContent = interval ? 'Ⅱ pause' : '▶ start';
    $('pet').classList.toggle('sleepy', ode !== 'focus');
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
        b.setAttribute('ariva-pressed', active);
    });

    $('pet').classList.remove('happy');
    say(mode === 'focus' ? 'u got this! one task at a time <3' : 'rest those paws, u earned it! 🐾');
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
        say('yay, u did it!');
    } else {
        say('all rested? ur bunny is ready!');
    }

    render();

    try {
        if ('notification' in window && Notification.permission == 'granted') {
            new Notification('cozy pomopet 🐰', {
                body: mode === 'focus' ? 'focus complete! time 4 a break!' : 'break! ready 2 focus?'

            });
        }
    } catch {}

    try {
        
    }

}

