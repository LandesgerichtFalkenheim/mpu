// Helper
function $(id) {
  return document.getElementById(id);
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $(id).classList.add("active");
}

// Globaler State
let state = {
  currentRole: null,
  currentCourtCaseId: null,
  currentClinicCaseId: null,
  currentRoadsideCaseId: null,
  cases: []
};

let nextCaseId = 1;
let pendingRole = null;

// Rollenlabel
function setRoleLabel() {
  const map = {
    court: "Landesgericht Falkenheim",
    clinic: "RKF / Uniklinikum",
    roadside: "Pannendienst Falkenheim"
  };
  $("currentRoleLabel").textContent = state.currentRole ? map[state.currentRole] : "";
}

// LOGIN FLOW
function loginAs(role) {
  pendingRole = role;
  $("authUser").value = getRoleUsername(role);
  $("authPass").value = "";
  showScreen("screen-auth");
}

function getRoleUsername(role) {
  switch (role) {
    case "court": return "Landesgericht Falkenheim";
    case "clinic": return "RKF / Uniklinikum";
    case "roadside": return "Pannendienst Falkenheim";
    default: return "Unbekannt";
  }
}

function submitLogin(e) {
  e.preventDefault();
  const pass = $("authPass").value;
  if (pass !== "Test1234") {
    alert("Falsches Passwort!");
    return;
  }

  state.currentRole = pendingRole;
  setRoleLabel();

  if (pendingRole === "court") showScreen("screen-court-menu");
  if (pendingRole === "clinic") showScreen("screen-clinic-menu");
  if (pendingRole === "roadside") showScreen("screen-roadside-menu");

  pendingRole = null;
}

function logout() {
  state.currentRole = null;
  setRoleLabel();
  showScreen("screen-login");
}

// LANDESGERICHT

function backToCourtMenu() {
  showScreen("screen-court-menu");
}

function createNewMpu(e) {
  e.preventDefault();
  const firstName = $("mpuFirstName").value.trim();
  const lastName = $("mpuLastName").value.trim();
  const fileNumber = $("mpuFileNumber").value.trim();
  const reason = $("mpuReason").value.trim();
  const target = $("mpuTarget").value;

  const id = nextCaseId++;

  state.cases.push({
    id,
    firstName,
    lastName,
    fileNumber,
    reason,
    target,
    status: "mpu_open", // mpu_open, mpu_done, roadside_open, roadside_done, closed
    clinicResult: null,
    roadsideResult: null
  });

  $("mpuFirstName").value = "";
  $("mpuLastName").value = "";
  $("mpuFileNumber").value = "";
  $("mpuReason").value = "";

  alert("MPU wurde an die Klinik übermittelt.");
  backToCourtMenu();
}

function showCourtNewMpuForm() {
  showScreen("screen-court-new-mpu");
}

function showCourtOpenCases() {
  const list = $("courtOpenList");
  list.innerHTML = "";
  state.cases
    .filter(c => c.status !== "closed")
    .forEach(c => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${c.fileNumber} – ${c.lastName}, ${c.firstName}</span>
        <button onclick="openCourtCase(${c.id})">Details</button>
      `;
      list.appendChild(li);
    });
  showScreen("screen-court-open-cases");
}

function showCourtClosedCases() {
  const list = $("courtClosedList");
  list.innerHTML = "";
  state.cases
    .filter(c => c.status === "closed")
    .forEach(c => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${c.fileNumber} – ${c.lastName}, ${c.firstName}</span>
        <button onclick="openCourtCase(${c.id})">Details</button>
      `;
      list.appendChild(li);
    });
  showScreen("screen-court-closed-cases");
}

function statusLabel(status) {
  switch (status) {
    case "mpu_open": return "MPU offen";
    case "mpu_done": return "MPU abgeschlossen – Fahrprüfung ausstehend";
    case "roadside_open": return "Fahrprüfung offen";
    case "roadside_done": return "Fahrprüfung abgeschlossen – Entscheidung ausstehend";
    case "closed": return "Akte abgeschlossen";
    default: return status;
  }
}

function openCourtCase(id) {
  const c = state.cases.find(x => x.id === id);
  if (!c) return;
  state.currentCourtCaseId = id;

  $("courtCaseDetail").innerHTML = `
    <p><strong>Name:</strong> ${c.firstName} ${c.lastName}</p>
    <p><strong>Aktenzeichen:</strong> ${c.fileNumber}</p>
    <p><strong>Begründung:</strong> ${c.reason}</p>
    <p><strong>Status:</strong> ${statusLabel(c.status)}</p>
    <p><strong>MPU-Ergebnis:</strong> ${c.clinicResult ?? "Noch nicht vorhanden"}</p>
    <p><strong>Fahrprüfung:</strong> ${c.roadsideResult ?? "Noch nicht vorhanden"}</p>
  `;

  const actions = $("courtCaseActions");
  actions.innerHTML = "";

  if (c.status === "mpu_done" && !c.roadsideResult) {
    const btn = document.createElement("button");
    btn.textContent = "Fahrprüfung für Pannendienst anlegen";
    btn.onclick = () => createRoadsideForCase(id);
    actions.appendChild(btn);
  }

  if (c.status === "roadside_done") {
    const btn = document.createElement("button");
    btn.textContent = "Akte abschließen";
    btn.onclick = () => closeCase(id);
    actions.appendChild(btn);
  }

  showScreen("screen-court-case-detail");
}

function createRoadsideForCase(id) {
  const c = state.cases.find(x => x.id === id);
  if (!c) return;
  c.status = "roadside_open";
  alert("Fahrprüfung für den Pannendienst wurde angelegt.");
  openCourtCase(id);
}

function closeCase(id) {
  const c = state.cases.find(x => x.id === id);
  if (!c) return;
  c.status = "closed";
  alert("Akte wurde abgeschlossen.");
  showCourtClosedCases();
}

// KLINIK – MPU EINZELFRAGEN + NOTIZEN

const clinicQuestions = [
  { q: "Wie schätzen Sie Ihr aktuelles Fahrverhalten ein?", note: "" },
  { q: "Gab es in letzter Zeit Situationen, die Sie überfordert haben?", note: "" },
  { q: "Wie gehen Sie mit Stress im Straßenverkehr um?", note: "" }
];

let clinicIndex = 0;

function backToClinicMenu() {
  showScreen("screen-clinic-menu");
}

function showClinicOpenMpus() {
  const list = $("clinicOpenList");
  list.innerHTML = "";
  state.cases
    .filter(c => c.status === "mpu_open")
    .forEach(c => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${c.fileNumber} – ${c.lastName}, ${c.firstName}</span>
        <button onclick="openClinicCase(${c.id})">Akte öffnen</button>
      `;
      list.appendChild(li);
    });
  showScreen("screen-clinic-open");
}

function showClinicClosedMpus() {
  const list = $("clinicClosedList");
  list.innerHTML = "";
  state.cases
    .filter(c => c.status === "mpu_done")
    .forEach(c => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${c.fileNumber} – ${c.lastName}, ${c.firstName}</span>
        <button onclick="openClinicCase(${c.id})">Akte öffnen</button>
      `;
      list.appendChild(li);
    });
  showScreen("screen-clinic-closed");
}

function openClinicCase(id) {
  const c = state.cases.find(x => x.id === id);
  if (!c) return;
  state.currentClinicCaseId = id;

  $("clinicExamQuestion").innerHTML = `
    <div class="clinic-screen">
      <p><strong>Name:</strong> ${c.firstName} ${c.lastName}</p>
      <p><strong>Aktenzeichen:</strong> ${c.fileNumber}</p>
      <p>Um die MPU zu starten, klicke auf „Untersuchung starten“.</p>
    </div>
  `;

  $("clinicExamControls").innerHTML = `
    <button class="primary" onclick="startClinicExam(${id})">Untersuchung starten</button>
  `;

  showScreen("screen-clinic-exam");
}

function startClinicExam(id) {
  state.currentClinicCaseId = id;
  clinicIndex = 0;
  showClinicQuestion();
}

function showClinicQuestion() {
  const q = clinicQuestions[clinicIndex];

  $("clinicExamQuestion").innerHTML = `
    <div class="clinic-screen">
      <h3>Frage ${clinicIndex + 1} von ${clinicQuestions.length}</h3>
      <p>${q.q}</p>
      <textarea id="clinicNote" placeholder="Notizen des Mediziners...">${q.note}</textarea>
    </div>
  `;

  $("clinicExamControls").innerHTML = `
    <button class="primary" onclick="nextClinicQuestion()">Weiter</button>
  `;
}

function nextClinicQuestion() {
  clinicQuestions[clinicIndex].note = $("clinicNote").value;
  clinicIndex++;

  if (clinicIndex >= clinicQuestions.length) {
    showClinicFinish();
    return;
  }

  showClinicQuestion();
}

function showClinicFinish() {
  $("clinicExamQuestion").innerHTML = `
    <div class="clinic-screen">
      <h3>MPU-Auswertung</h3>
      <p>Bitte Ergebnis auswählen:</p>
    </div>
  `;

  $("clinicExamControls").innerHTML = `
    <button class="primary" onclick="finishClinic(true)">Bestanden</button>
    <button class="secondary" onclick="finishClinic(false)">Nicht bestanden</button>
  `;
}

function finishClinic(passed) {
  const c = state.cases.find(x => x.id === state.currentClinicCaseId);
  if (!c) return;
  c.clinicResult = passed ? "Bestanden" : "Nicht bestanden";
  c.status = "mpu_done";
  alert("MPU-Ergebnis gespeichert und an das Gericht übermittelt (Simulation).");
  showClinicClosedMpus();
}

function cancelClinicExam() {
  backToClinicMenu();
}

// PANNENDIENST – TÜV-STYLE

const tuvTheory = [
  {
    q: "Was bedeutet ein Stoppschild?",
    a: ["Vollständig anhalten", "Langsam rollen", "Nur schauen"]
  },
  {
    q: "Wie verhalten Sie sich im Kreisverkehr?",
    a: ["Vorfahrt achten", "Innen überholen", "Immer hupen"]
  },
  {
    q: "Wie sichern Sie eine Unfallstelle?",
    a: ["Warnblinker + Warndreieck", "Nur stehen bleiben", "Gar nichts tun"]
  }
];

const tuvDriving = [
  "Einparken längs",
  "Gefahrenbremsung",
  "Spurwechsel auf der Landstraße"
];

let tuvIndex = 0;
let tuvPhase = "theory"; // theory -> driving

function backToRoadsideMenu() {
  showScreen("screen-roadside-menu");
}

function showRoadsideOpenTests() {
  const list = $("roadsideOpenList");
  list.innerHTML = "";
  state.cases
    .filter(c => c.status === "roadside_open")
    .forEach(c => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${c.fileNumber} – ${c.lastName}, ${c.firstName}</span>
        <button onclick="startRoadsideTest(${c.id})">Prüfung starten</button>
      `;
      list.appendChild(li);
    });
  showScreen("screen-roadside-open");
}

function showRoadsideClosedTests() {
  const list = $("roadsideClosedList");
  list.innerHTML = "";
  state.cases
    .filter(c => c.status === "roadside_done")
    .forEach(c => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${c.fileNumber} – ${c.lastName}, ${c.firstName}</span>
      `;
      list.appendChild(li);
    });
  showScreen("screen-roadside-closed");
}

function startRoadsideTest(id) {
  state.currentRoadsideCaseId = id;
  tuvIndex = 0;
  tuvPhase = "theory";
  showTuvQuestion();
  showScreen("screen-roadside-test");
}

function showTuvQuestion() {
  const q = tuvTheory[tuvIndex];

  $("roadsideTestContent").innerHTML = `
    <div class="tuv-green">
      <h3>Theoriefrage ${tuvIndex + 1} von ${tuvTheory.length}</h3>
      <p>${q.q}</p>
      ${q.a.map((ans, i) => `
        <label class="mc-option">
          <input type="radio" name="mc" value="${i}">
          ${ans}
        </label>
      `).join("")}
      <button class="primary" onclick="nextTuvQuestion()">Weiter</button>
    </div>
  `;
}

function nextTuvQuestion() {
  const selected = document.querySelector("input[name='mc']:checked");
  if (!selected) {
    alert("Bitte eine Antwort auswählen.");
    return;
  }

  tuvIndex++;

  if (tuvIndex >= tuvTheory.length) {
    tuvPhase = "driving";
    tuvIndex = 0;
    showTuvDriving();
    return;
  }

  showTuvQuestion();
}

function showTuvDriving() {
  const task = tuvDriving[tuvIndex];

  $("roadsideTestContent").innerHTML = `
    <div class="tuv-green">
      <h3>Fahrprüfung – Aufgabe ${tuvIndex + 1} von ${tuvDriving.length}</h3>
      <p>${task}</p>
      <button class="primary" onclick="nextTuvDriving()">Weiter</button>
    </div>
  `;
}

function nextTuvDriving() {
  tuvIndex++;

  if (tuvIndex >= tuvDriving.length) {
    showTuvFinish();
    return;
  }

  showTuvDriving();
}

function showTuvFinish() {
  $("roadsideTestContent").innerHTML = `
    <div class="tuv-green">
      <h3>Fahrprüfung abgeschlossen</h3>
      <p>Bitte Ergebnis auswählen:</p>
      <button class="primary" onclick="finishTuv(true)">Bestanden</button>
      <button class="secondary" onclick="finishTuv(false)">Nicht bestanden</button>
    </div>
  `;
}

function finishTuv(passed) {
  const c = state.cases.find(x => x.id === state.currentRoadsideCaseId);
  if (!c) return;
  c.roadsideResult = passed ? "Bestanden" : "Nicht bestanden";
  c.status = "roadside_done";
  alert("Fahrprüfung wurde an das Landesgericht übermittelt (Simulation).");
  showRoadsideClosedTests();
}

function cancelRoadsideTest() {
  backToRoadsideMenu();
}

// Init
showScreen("screen-login");
setRoleLabel();
