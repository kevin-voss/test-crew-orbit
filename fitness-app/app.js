const STORAGE_KEY = 'orbitFitness.v1';

/** @typedef {{ id: string, type: string, durationMin: number, notes: string, at: string }} Activity */

/** @returns {{ activities: Activity[] }} */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { activities: [] };
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.activities)) return { activities: [] };
    return { activities: data.activities };
  } catch {
    return { activities: [] };
  }
}

/** @param {{ activities: Activity[] }} state */
function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function todayKey() {
  return new Date().toDateString();
}

/** @param {Activity[]} activities */
function todayStats(activities) {
  const key = todayKey();
  let minutes = 0;
  let sessions = 0;
  for (const a of activities) {
    if (new Date(a.at).toDateString() === key) {
      minutes += a.durationMin;
      sessions += 1;
    }
  }
  return { minutes, sessions };
}

/** @returns {HTMLElement} */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/** @type {Activity[]} */
let activities = loadState().activities;

const workoutForm = document.getElementById('workout-form');
const workoutType = document.getElementById('workout-type');
const workoutDuration = document.getElementById('workout-duration');
const workoutNotes = document.getElementById('workout-notes');
const activityList = document.getElementById('activity-list');
const emptyState = document.getElementById('empty-state');
const statMinutes = document.getElementById('stat-minutes');
const statSessions = document.getElementById('stat-sessions');
const clearAllBtn = document.getElementById('clear-all');

const tabButtons = document.querySelectorAll('.tabs button[role="tab"]');
const panelLog = document.getElementById('panel-log');
const panelTimer = document.getElementById('panel-timer');

const timerPhase = document.getElementById('timer-phase');
const timerClock = document.getElementById('timer-clock');
const timerWork = document.getElementById('timer-work');
const timerRest = document.getElementById('timer-rest');
const timerRounds = document.getElementById('timer-rounds');
const timerStart = document.getElementById('timer-start');
const timerPause = document.getElementById('timer-pause');
const timerReset = document.getElementById('timer-reset');

function persist() {
  saveState({ activities });
}

function updateStats() {
  const { minutes, sessions } = todayStats(activities);
  statMinutes.textContent = String(minutes);
  statSessions.textContent = String(sessions);
}

/** @param {Activity} activity */
function formatWhen(activity) {
  const d = new Date(activity.at);
  return `${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

function renderList() {
  activityList.innerHTML = '';
  const sorted = [...activities].sort((a, b) => new Date(b.at) - new Date(a.at));

  if (!sorted.length) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  for (const activity of sorted) {
    const li = el('li', 'activity-item');
    const main = document.createDocumentFragment();

    main.appendChild(
      Object.assign(document.createElement('strong'), {
        textContent: `${activity.type} · ${activity.durationMin} min`,
      }),
    );

    const meta = el('div', 'activity-meta', formatWhen(activity));
    main.appendChild(meta);

    if (activity.notes) {
      main.appendChild(el('span', 'activity-notes', activity.notes));
    }

    const del = Object.assign(document.createElement('button'), {
      type: 'button',
      className: 'delete-entry',
      textContent: 'Remove',
      title: 'Remove this entry',
    });
    del.addEventListener('click', () => {
      activities = activities.filter((x) => x.id !== activity.id);
      persist();
      renderList();
      updateStats();
    });

    li.appendChild(main);
    li.appendChild(del);
    activityList.appendChild(li);
  }
}

function randomId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

workoutForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const type = workoutType.value;
  const durationMin = Number(workoutDuration.value);
  const notes = (workoutNotes.value || '').trim();
  if (!Number.isFinite(durationMin) || durationMin < 1) return;

  activities.push({
    id: randomId(),
    type,
    durationMin,
    notes,
    at: new Date().toISOString(),
  });
  persist();
  workoutNotes.value = '';
  renderList();
  updateStats();
});

clearAllBtn.addEventListener('click', () => {
  if (!activities.length) return;
  if (window.confirm('Remove all logged sessions from this device?')) {
    activities = [];
    persist();
    renderList();
    updateStats();
  }
});

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const panelId = btn.dataset.panel;
    tabButtons.forEach((b) => {
      const selected = b === btn;
      b.setAttribute('aria-selected', String(selected));
    });
    panelLog.hidden = panelId !== 'panel-log';
    panelTimer.hidden = panelId !== 'panel-timer';
    panelLog.classList.toggle('panel--active', panelId === 'panel-log');
    panelTimer.classList.toggle('panel--active', panelId === 'panel-timer');
  });
});

let timerRemaining = 0;
let timerIntervalId = /** @type {ReturnType<typeof setInterval>|null} */ (null);
let paused = false;
/** @type {'idle'|'work'|'rest'|'done'} */
let timerMode = 'idle';
let roundIndex = 0;
/** @type {number} */
let workSec = 45;
/** @type {number} */
let restSec = 15;
/** @type {number} */
let totalRounds = 8;

function pad2(n) {
  return n < 10 ? `0${n}` : String(n);
}

function fmtClock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${pad2(m)}:${pad2(s)}`;
}

function syncTimerInputs() {
  workSec = Math.max(10, Number(timerWork.value) || 45);
  restSec = Math.max(5, Number(timerRest.value) || 15);
  totalRounds = Math.max(1, Math.min(99, Number(timerRounds.value) || 8));
}

function stopTicker() {
  if (timerIntervalId != null) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
}

function applyTimerUI() {
  timerClock.textContent = fmtClock(Math.max(0, timerRemaining));
  if (timerMode === 'done') timerPhase.textContent = 'Finished';
  else if (timerMode === 'idle') timerPhase.textContent = 'Ready';
  else if (timerMode === 'work') timerPhase.textContent = `Work · round ${roundIndex} / ${totalRounds}`;
  else timerPhase.textContent = `Rest · round ${roundIndex} / ${totalRounds}`;

  const running = timerIntervalId != null && !paused;
  timerPause.disabled = timerMode === 'idle' || timerMode === 'done';
  timerStart.disabled = running && !paused;
  timerStart.textContent = paused ? 'Resume' : 'Start';
}

function advancePhase() {
  if (timerMode === 'work') {
    timerMode = 'rest';
    timerRemaining = restSec;
  } else if (timerMode === 'rest') {
    if (roundIndex >= totalRounds) {
      timerMode = 'done';
      timerRemaining = 0;
      stopTicker();
      paused = false;
      applyTimerUI();
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Intervals complete');
        }
      } catch {
        /* ignore */
      }
      return;
    }
    timerMode = 'work';
    roundIndex += 1;
    timerRemaining = workSec;
  }
}

function tick() {
  if (paused) return;
  if (timerRemaining > 0) {
    timerRemaining -= 1;
    applyTimerUI();
    return;
  }
  if (timerMode === 'done') {
    stopTicker();
    applyTimerUI();
    return;
  }
  advancePhase();
  applyTimerUI();
}

function startIntervals() {
  stopTicker();
  paused = false;
  syncTimerInputs();
  if (timerMode === 'idle' || timerMode === 'done') {
    timerMode = 'work';
    roundIndex = 1;
    timerRemaining = workSec;
  }
  applyTimerUI();
  timerIntervalId = setInterval(tick, 1000);
}

timerStart.addEventListener('click', () => {
  if (paused && timerMode !== 'idle' && timerMode !== 'done') {
    paused = false;
    if (!timerIntervalId) timerIntervalId = setInterval(tick, 1000);
    applyTimerUI();
    return;
  }
  startIntervals();
});

timerPause.addEventListener('click', () => {
  if (timerMode === 'idle' || timerMode === 'done') return;
  if (paused) {
    paused = false;
    timerIntervalId = setInterval(tick, 1000);
  } else {
    paused = true;
    stopTicker();
    timerIntervalId = null;
  }
  applyTimerUI();
});

timerReset.addEventListener('click', () => {
  stopTicker();
  paused = false;
  timerMode = 'idle';
  timerRemaining = 0;
  roundIndex = 0;
  applyTimerUI();
});

['timer-work', 'timer-rest', 'timer-rounds'].forEach((id) => {
  document.getElementById(id).addEventListener('change', syncTimerInputs);
});

updateStats();
renderList();
applyTimerUI();
