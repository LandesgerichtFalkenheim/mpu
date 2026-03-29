// Simple in-memory "database" (kann später durch Backend ersetzt werden)
let state = {
  currentRole: null,
  currentCourtCaseId: null,
  currentClinicCaseId: null,
  currentClinicExamIndex: 0,
  currentRoadsideCaseId: null,
  roadsideTimer: null,
  roadsideRemainingSeconds: 45 * 60,
  cases: [], // MPU-Fälle
  notifications: []
};

let nextCaseId = 1;

// Beispiel-Fragen für MPU
const clinicQuestions = [
  "Beschreiben Sie eine Situation, in der Sie im Straßenverkehr überfordert waren.",
  "Wie gehen Sie mit Stress im Straßenverkehr um?",
  "Welche Rolle spielt Alkohol in Ihrem Alltag?",
  "Was haben Sie aus Ihrem Verkehrsverstoß gelernt?",
  "Wie würden Sie Ihr aktuelles Fahrverhalten einschätzen?"
];

// Beispiel-Theoriefragen & Fahraufgaben
const roadsideTheoryQuestions = [
  "Was bedeutet ein Stoppschild?",
  "Wie verhalten Sie sich im Kreisverkehr?",
  "Wann müssen Sie den Blinker setzen?",
  "Was ist der Mindestabstand auf der Autobahn?",
  "Wie reagieren Sie bei Blaulicht und Martinshorn?",
  "Was prüfen Sie vor Fahrtantritt am Fahrzeug?",
  "Wie verhalten Sie sich an einem Zebrastreifen?",
  "Was bedeutet die gelbe Ampelphase?",
  "Wie sichern Sie eine Unfallstelle ab?",
  "Wann müssen Sie Winterreifen benutzen?"
];

const roadsideDriveTasks = [
  "Anfahren am Berg",
  "Einparken (längs)",
  "Einparken (quer)",
  "Gefahrenbremsung",
  "Spurwechsel auf der Landstraße"
];

function $(id) {
  return document.getElementById(id);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

function setRoleLabel() {
  const map = {
    court: "Landesgericht Falkenheim",
    clinic: "RKF / Uniklinikum",
    roadside: "Pannendienst Falkenheim"
  };
  $('currentRoleLabel').textContent = state.currentRole ? map[state.currentRole] : "";
}

function loginAs(role) {
  state.currentRole = role;
  setRoleLabel();
  if (role === 'court') showScreen('screen-court-menu');
  if (role === 'clinic') showScreen('screen-clinic-menu');
  if (role === 'roadside') showScreen('screen-roadside-menu');
}

function logout() {
  state.currentRole = null;
  setRoleLabel();
  showScreen('screen-login');
}

// COURT

function backToCourtMenu() {
  showScreen('screen-court-menu');
}

function showCourtNewMpuForm() {
  showScreen('screen-court-new-mpu');
}

function createNewMpu(e) {
  e.preventDefault();
  const firstName = $('mpuFirstName').value.trim();
  const lastName = $('mpuLastName').value.trim();
  const fileNumber = $('mpuFileNumber').value.trim();
  const reason = $('mpuReason').value.trim();
  const target = $('mpuTarget').value;

  const id = nextCaseId++;
  const createdAt = new Date();
  const deadline = new Date(createdAt.getTime() + 21 * 24 * 60 * 60 * 1000);

  state.cases.push({
    id,
    firstName,
    lastName,
    fileNumber,
    reason,
    target,
    status: 'mpu_open', // mpu_open, mpu_done, roadside_open, roadside_done, closed
    clinicResult: null,
    roadsideResult: null,
    createdAt,
    deadline
  });

  $('mpuFirstName').value = '';
  $('mpuLastName').value = '';
  $('mpuFileNumber').value = '';
  $('mpuReason').value = '';

  alert('MPU wurde an die Klinik übermittelt.');
  backToCourtMenu();
}

function showCourtOpenCases() {
  const list = $('courtOpenList');
  list.innerHTML = '';
  state.cases
    .filter(c => c.status !== 'closed')
    .forEach(c => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${c.fileNumber} – ${c.lastName}, ${c.firstName}</span>
        <button onclick="openCourtCase(${c.id})">Details</button>
      `;
      list.appendChild(li);
    });
  showScreen('screen-court-open-cases');
}

function showCourtClosedCases() {
  const list = $('courtClosedList');
  list.innerHTML = '';
  state.cases
    .filter(c => c.status === 'closed')
    .forEach(c => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${c.fileNumber} – ${c.lastName}, ${c.firstName}</span>
        <button onclick="openCourtCase(${c.id})">Details</button>
      `;
      list.appendChild(li);
    });
  showScreen('screen-court-closed-cases');
}

function openCourtCase(id) {
  const c = state.cases.find(x => x.id === id);
  if (!c) return;
  state.currentCourtCaseId = id;

  const detail = $('courtCaseDetail');
  const deadlineStr = c.deadline.toLocaleDateString('de-DE');
  detail.innerHTML = `
    <p><strong>Name:</strong> ${c.firstName} ${c.lastName}</p>
    <p><strong>Aktenzeichen:</strong> ${c.fileNumber}</p>
    <p><strong>Begründung:</strong> ${c.reason}</p>
    <p><strong>Status:</strong> ${statusLabel(c.status)}</p>
    <p><strong>Frist:</strong> ${deadlineStr}</p>
    <p><strong>MPU-Ergebnis:</strong> ${c.clinicResult ?? 'Noch nicht vorhanden'}</p>
    <p><strong>Fahrprüfung:</strong> ${c.roadsideResult ?? 'Noch nicht vorhanden'}</p>
  `;

  const actions = $('courtCaseActions');
  actions.innerHTML = '';

  if (c.status === 'mpu_done' && !c.roadsideResult) {
    const btn = document.createElement('button');
    btn.textContent = 'Fahrprüfung für Pannendienst anlegen';
    btn.onclick = () => createRoadsideForCase(id);
    actions.appendChild(btn);
  }

  if (c.status === 'roadside_done') {
    const btn = document.createElement('button');
    btn.textContent = 'Antrag prüfen und Akte abschließen';
    btn.onclick = () => closeCase(id);
    actions.appendChild(btn);
  }

  const notifBtn = document.createElement('button');
  notifBtn.textContent = 'Erinnerungen anzeigen';
  notifBtn.className = 'secondary';
  notifBtn.onclick = () => showNotifications();
  actions.appendChild(notifBtn);

  showScreen('screen-court-case-detail');
}

function statusLabel(status) {
  switch (status) {
    case 'mpu_open': return 'MPU offen';
    case 'mpu_done': return 'MPU abgeschlossen – Fahrprüfung ausstehend';
    case 'roadside_open': return 'Fahrprüfung offen';
    case 'roadside_done': return 'Fahrprüfung abgeschlossen – Entscheidung ausstehend';
    case 'closed': return 'Akte abgeschlossen';
    default: return status;
  }
}

function createRoadsideForCase(id) {
  const c = state.cases.find(x => x.id === id);
  if (!c) return;
  c.status = 'roadside_open';
  alert('Fahrprüfung für den Pannendienst wurde angelegt.');
  openCourtCase(id);
}

function closeCase(id) {
  const c = state.cases.find(x => x.id === id);
  if (!c) return;
  c.status = 'closed';
  alert('Akte wurde abgeschlossen.');
  showCourtClosedCases();
}

function showNotifications() {
  const list = $('notificationList');
  list.innerHTML = '';
  generateNotifications();
  state.notifications.forEach(n => {
    const li = document.createElement('li');
    li.textContent = n;
    list.appendChild(li);
  });
  showScreen('screen-notifications');
}

function generateNotifications() {
  state.notifications = [];
  const now = new Date();
  state.cases.forEach(c => {
    if (c.status !== 'closed') {
      const diffDays = Math.floor((now - c.createdAt) / (1000 * 60 * 60 * 24));
      if (diffDays >= 7 && diffDays < 14) {
        state.notifications.push(`Erinnerung (1. Woche): Antrag ${c.fileNumber} ist noch offen.`);
      } else if (diffDays >= 14 && diffDays < 21) {
        state.notifications.push(`Erinnerung (2. Woche): Antrag ${c.fileNumber} ist noch offen.`);
      } else if (diffDays >= 21) {
        state.notifications.push(`Frist überschritten: Antrag ${c.fileNumber} ist seit über 3 Wochen offen.`);
      }
    }
  });
}

// CLINIC

function backToClinicMenu() {
  showScreen('screen-clinic-menu');
}

function showClinicOpenMpus() {
  const list = $('clinicOpenList');
  list.innerHTML = '';
  state.cases
    .filter(c => c.status === 'mpu_open')
    .forEach(c => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${c.fileNumber} – ${c.lastName}, ${c.firstName}</span>
        <button onclick="openClinicCase(${c.id})">Akte öffnen</button>
      `;
      list.appendChild(li);
    });
  showScreen('screen-clinic-open');
}

function showClinicClosedMpus() {
  const list = $('clinicClosedList');
  list.innerHTML = '';
  state.cases
    .filter(c => c.status === 'mpu_done')
    .forEach(c => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${c.fileNumber} – ${c.lastName}, ${c.firstName}</span>
        <button onclick="openClinicCase(${c.id})">Akte öffnen</button>
      `;
      list.appendChild(li);
    });
  showScreen('screen-clinic-closed');
}

function openClinicCase(id) {
  const c = state.cases.find(x => x.id === id);
  if (!c) return;
  state.currentClinicCaseId = id;

  const detail = $('clinicCaseDetail');
  detail.innerHTML = `
    <p><strong>Name:</strong> ${c.firstName} ${c.lastName}</p>
    <p><strong>Aktenzeichen:</strong> ${c.fileNumber}</p>
    <p><strong>Personenbezogene Daten:</strong> Vollständig sichtbar (Simulation)</p>
    <p><strong>Status:</strong> ${statusLabel(c.status)}</p>
  `;

  const actions = $('clinicCaseActions');
  actions.innerHTML = '';

  if (c.status === 'mpu_open') {
    const btn = document.createElement('button');
    btn.textContent = 'Untersuchung starten';
    btn.onclick = () => startClinicExam(id);
    actions.appendChild(btn);
  }

  if (c.status === 'mpu_done') {
    const btn = document.createElement('button');
    btn.textContent = 'Ergebnis abgeben';
    btn.onclick = () => submitClinicResult(id);
    actions.appendChild(btn);
  }

  showScreen('screen-clinic-case-detail');
}

function startClinicExam(id) {
  state.currentClinicCaseId = id;
  state.currentClinicExamIndex = 0;
  showClinicExamQuestion();
  showScreen('screen-clinic-exam');
}

function showClinicExamQuestion() {
  const idx = state.currentClinicExamIndex;
  if (idx >= clinicQuestions.length) {
    const result = confirm('Alle Fragen gestellt. MPU bestanden? OK = bestanden, Abbrechen = nicht bestanden');
    const c = state.cases.find(x => x.id === state.currentClinicCaseId);
    if (!c) return;
    c.clinicResult = result ? 'Bestanden' : 'Nicht bestanden';
    c.status = 'mpu_done';
    alert('MPU-Auswertung gespeichert.');
    showClinicClosedMpus();
    return;
  }
  $('clinicExamQuestion').textContent = clinicQuestions[idx];
  const controls = $('clinicExamControls');
  controls.innerHTML = '';
  const btnNext = document.createElement('button');
  btnNext.textContent = 'Nächste Frage';
  btnNext.onclick = () => {
    state.currentClinicExamIndex++;
    showClinicExamQuestion();
  };
  controls.appendChild(btnNext);
}

function cancelClinicExam() {
  showClinicOpenMpus();
}

// Ergebnis abgeben (hier nur Info, da Ergebnis schon gesetzt wurde)
function submitClinicResult(id) {
  alert('Ergebnis wurde an das Landesgericht übermittelt (Simulation).');
  showClinicClosedMpus();
}

// ROADSIDE

function backToRoadsideMenu() {
  showScreen('screen-roadside-menu');
}

function showRoadsideOpenTests() {
  const list = $('roadsideOpenList');
  list.innerHTML = '';
  state.cases
    .filter(c => c.status === 'roadside_open')
    .forEach(c => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${c.fileNumber} – ${c.lastName}, ${c.firstName}</span>
        <button onclick="startRoadsideTest(${c.id})">Prüfung starten</button>
      `;
      list.appendChild(li);
    });
  showScreen('screen-roadside-open');
}

function showRoadsideClosedTests() {
  const list = $('roadsideClosedList');
  list.innerHTML = '';
  state.cases
    .filter(c => c.status === 'roadside_done')
    .forEach(c => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${c.fileNumber} – ${c.lastName}, ${c.firstName}</span>
      `;
      list.appendChild(li);
    });
  showScreen('screen-roadside-closed');
}

function startRoadsideTest(id) {
  state.currentRoadsideCaseId = id;
  state.roadsideRemainingSeconds = 45 * 60;
  renderRoadsideTest();
  startRoadsideTimer();
  showScreen('screen-roadside-test');
}

function renderRoadsideTest() {
  const container = $('roadsideTestContent');
  container.innerHTML = '';

  const theoryTitle = document.createElement('h3');
  theoryTitle.textContent = 'Theoriefragen (10)';
  container.appendChild(theoryTitle);

  roadsideTheoryQuestions.slice(0, 10).forEach((q, i) => {
    const p = document.createElement('p');
    p.textContent = `${i + 1}. ${q}`;
    container.appendChild(p);
  });

  const driveTitle = document.createElement('h3');
  driveTitle.textContent = 'Fahrprüfungsaufgaben (5)';
  container.appendChild(driveTitle);

  roadsideDriveTasks.slice(0, 5).forEach((t, i) => {
    const label = document.createElement('label');
    label.innerHTML = `
      ${i + 1}. ${t}<br>
      <select>
        <option>Bewertung wählen</option>
        <option>Sehr gut</option>
        <option>Gut</option>
        <option>Ausreichend</option>
        <option>Nicht bestanden</option>
      </select>
    `;
    container.appendChild(label);
  });
}

function startRoadsideTimer() {
  if (state.roadsideTimer) clearInterval(state.roadsideTimer);
  state.roadsideTimer = setInterval(() => {
    state.roadsideRemainingSeconds--;
    if (state.roadsideRemainingSeconds <= 0) {
      clearInterval(state.roadsideTimer);
      alert('Die 45 Minuten sind abgelaufen. Prüfung wird automatisch beendet.');
      finishRoadsideTest();
    }
    updateRoadsideTimerLabel();
  }, 1000);
}

function updateRoadsideTimerLabel() {
  const sec = state.roadsideRemainingSeconds;
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  $('roadsideTimer').textContent = `Verbleibende Zeit: ${m}:${s}`;
}

function finishRoadsideTest() {
  if (state.roadsideTimer) clearInterval(state.roadsideTimer);
  const passed = confirm('Fahrprüfung bestanden? OK = bestanden, Abbrechen = nicht bestanden');
  const c = state.cases.find(x => x.id === state.currentRoadsideCaseId);
  if (!c) return;
  c.roadsideResult = passed ? 'Bestanden' : 'Nicht bestanden';
  c.status = 'roadside_done';
  alert('Fahrprüfung wurde an das Landesgericht übermittelt (Simulation).');
  showRoadsideClosedTests();
}

function cancelRoadsideTest() {
  if (state.roadsideTimer) clearInterval(state.roadsideTimer);
  showRoadsideOpenTests();
}

// Init
showScreen('screen-login');
