const detectBtn = document.getElementById("detectBtn");
const stopBtn = document.getElementById("stopBtn");
const confirmBtn = document.getElementById("confirmBtn");
const rejectBtn = document.getElementById("rejectBtn");
const exportBtn = document.getElementById("exportBtn");
const exportHtmlBtn = document.getElementById("exportHtmlBtn");
const unfollowBtn = document.getElementById("unfollowBtn");
const manualModeBtn = document.getElementById("manualModeBtn");
const clearBtn = document.getElementById("clearBtn");
const statusEl = document.getElementById("status");
const statusIcon = document.getElementById("statusIcon");
const safetyPanel = document.getElementById("safetyPanel");
const safetyTitle = document.getElementById("safetyTitle");
const safetyText = document.getElementById("safetyText");
const safetyPauseBtn = document.getElementById("safetyPauseBtn");
const safetyResetBtn = document.getElementById("safetyResetBtn");
const progressWrap = document.getElementById("progressWrap");
const progressBar = document.getElementById("progressBar");
const statsEl = document.getElementById("stats");
const statFollowing = document.getElementById("statFollowing");
const statFollowers = document.getElementById("statFollowers");
const statNotBack = document.getElementById("statNotBack");
const listEl = document.getElementById("list");
const accountBox = document.getElementById("accountBox");
const accountAvatar = document.getElementById("accountAvatar");
const accountTitle = document.getElementById("accountTitle");
const accountMeta = document.getElementById("accountMeta");
const confirmBox = document.getElementById("confirmBox");
const confirmTitle = document.querySelector(".confirm-title");
const stepDetect = document.getElementById("stepDetect");
const stepConfirm = document.getElementById("stepConfirm");
const stepAnalyze = document.getElementById("stepAnalyze");
const reportBtn = document.getElementById("reportBtn");
const contactLink = document.getElementById("contactLink");
const CONTACT_EMAIL = "soporte@example.invalid";
const APP_VERSION = chrome?.runtime?.getManifest ? chrome.runtime.getManifest().version : "2.6.0";
const versionLabel = document.getElementById("versionLabel");
const reportModal = document.getElementById("reportModal");
const reportBackdrop = document.getElementById("reportBackdrop");
const reportClose = document.getElementById("reportClose");
const reportCancel = document.getElementById("reportCancel");
const reportSend = document.getElementById("reportSend");
const reportUsername = document.getElementById("reportUsername");
const reportUserEmail = document.getElementById("reportUserEmail");
const reportProblem = document.getElementById("reportProblem");
const reportUsernameLabel = document.getElementById("reportUsernameLabel");
const reportEmailLabel = document.getElementById("reportEmailLabel");
const reportProblemLabel = document.getElementById("reportProblemLabel");
const reportTitle = document.getElementById("reportTitle");
const reportHint = document.getElementById("reportHint");
const unfollowModal = document.getElementById("unfollowModal");
const unfollowBackdrop = document.getElementById("unfollowBackdrop");
const unfollowClose = document.getElementById("unfollowClose");
const unfollowCancel = document.getElementById("unfollowCancel");
const unfollowStart = document.getElementById("unfollowStart");
const unfollowLimit = document.getElementById("unfollowLimit");
const unfollowAcceptRisk = document.getElementById("unfollowAcceptRisk");
const unfollowTitle = document.getElementById("unfollowTitle");
const unfollowLimitLabel = document.getElementById("unfollowLimitLabel");
const unfollowRiskText = document.getElementById("unfollowRiskText");
const unfollowRiskLabel = document.getElementById("unfollowRiskLabel");
const unfollowHint = document.getElementById("unfollowHint");
const welcomeBox = document.getElementById("welcomeBox");
const welcomeStart = document.getElementById("welcomeStart");
const welcomeTitle = document.getElementById("welcomeTitle");
const welcomeText = document.getElementById("welcomeText");
const langToggle = document.getElementById("langToggle");
const themeToggle = document.getElementById("themeToggle");
const WELCOME_KEY = "ig_unfollowers_welcome_seen_v1";
const SETTINGS_KEY = "ig_unfollowers_ui_settings_v1";
const MANUAL_MODE_KEY = "ig_unfollowers_manual_mode_v1";
if (versionLabel) versionLabel.textContent = `v${APP_VERSION}`;
const versionPill = document.getElementById("versionPill");
if (versionPill) versionPill.textContent = `v${APP_VERSION}`;

let currentState = null;
let previousConfirmedCount = 0;
let renderedListMode = "";
let renderedUserRows = new Map();
let uiSettings = { lang: "es", theme: "dark" };
let manualMode = false;

const I18N = {
  es: {
    appTitle: "No me siguen",
    subtitle: "Compatible con Chrome y Edge",
    detectStep: "Detectar",
    confirmStep: "Confirmar",
    analyzeStep: "Analizar",
    detect: "Analizar cuenta",
    continueAnalysis: "Continuar",
    stop: "Parar",
    exportTxt: "Exportar TXT",
    exportHtml: "Exportar HTML",
    unfollow: "Autom\u00e1tico",
    manual: "Manual",
    manualOpen: "Abrir perfil",
    manualUnfollow: "Dejar de seguir",
    manualUnfollowOne: "Dejando de seguir a @{username}...",
    manualOn: "Manual activo",
    manualDone: "Revisado manual",
    unfollowDone: "Dejado de seguir",
    unfollowPending: "Procesando",
    unfollowError: "Error al dejar de seguir",
    clear: "Limpiar",
    report: "Reportar",
    support: "Soporte",
    safetyTitle: "Seguridad",
    safetyOk: "Pausas activas. Instagram puede limitar el análisis automático.",
    safetyLocked: "Pausa de seguridad activa hasta {time}. Automatico bloqueado.",
    safetyPause: "Pausa 48h",
    accountLabel: "Cuenta",
    unknownId: "desconocido",
    confirmQuestion: "\u00bfAnalizar esta cuenta?",
    yes: "Si",
    no: "No",
    followingMeta: "seguidos",
    followersMeta: "seguidores",
    welcomeTitle: "Bienvenido",
    welcomeText: "Compatible con Chrome y Edge. Solo analiza la cuenta de Instagram iniciada en este navegador. Tus resultados se guardan localmente y no recopilamos datos personales; usamos datos minimos para detectar fallos, abuso o uso anormal de la extension.",
    start: "Empezar",
    langButton: "EN",
    lightButton: "Claro",
    darkButton: "Oscuro",
    ready: "Listo.",
    noResults: "Sin resultados.",
    confirming: "Confirmá la cuenta.",
    waitingConfirm: "Esperando confirmación.",
    analyzing: "Analizando...",
    detecting: "Detectando...",
    detectingAccount: "Detectando cuenta activa",
    done: "Listo.",
    downloading: "Descargando...",
    stopped: "Detenido.",
    stoppedAnalysis: "Análisis detenido.",
    pausedReport: "Pausado. Podés reportar.",
    pausedSafety: "Pausado por seguridad.",
    followingLabel: "Sigue",
    followersLabel: "Seguidores",
    notBackLabel: "No siguen",
    reportTitle: "Reportar problema",
    reportUsername: "Usuario de Instagram",
    reportEmail: "Correo de contacto",
    reportProblem: "Problema",
    reportPlaceholder: "Describe que ocurrio",
    reportHint: "Se abrira Gmail con el reporte listo para enviar a soporte.",
    send: "Enviar",
    cancel: "Cancelar",
    unfollowTitle: "Confirmar unfollow",
    unfollowLimitLabel: "Cantidad a dejar de seguir",
    unfollowRiskText: "Modo seguro: recomendado 5 personas por dia, maximo conservador 12 por 24h. Si Instagram muestra aviso, limite o verificacion, la extension bloquea automatico por 48h.",
    unfollowRiskAccept: "Entiendo que automatico tiene riesgo y acepto usarlo con limites conservadores.",
    continue: "Continuar",
    unfollowHint: "La extension hara pausas entre acciones, pero el uso final queda bajo tu responsabilidad.",
    startingAnalysis: "Iniciando analisis...",
    resumingAnalysis: "Continuando analisis...",
    stopping: "Deteniendo...",
    preparingTxt: "Preparando TXT...",
    preparingHtml: "Preparando HTML...",
    txtReady: "TXT generado. Resultado disponible.",
    htmlReady: "HTML generado. Resultado disponible.",
    invalidUnfollowLimit: "Indica una cantidad valida para unfollow.",
    confirmRisk: "Confirma que entiendes el riesgo antes de continuar.",
    startingUnfollow: "Iniciando unfollow con limites...",
    alreadyRunning: "Ya hay una tarea en curso.",
  },
  en: {
    appTitle: "Unfollowers",
    subtitle: "Compatible with Chrome and Edge",
    detectStep: "Detect",
    confirmStep: "Confirm",
    analyzeStep: "Analyze",
    detect: "Analyze account",
    continueAnalysis: "Continue",
    stop: "Stop",
    exportTxt: "Export TXT",
    exportHtml: "Export HTML",
    unfollow: "Automatic",
    manual: "Manual",
    manualOpen: "Open profile",
    manualUnfollow: "Unfollow",
    manualUnfollowOne: "Unfollowing @{username}...",
    manualOn: "Manual mode on",
    manualDone: "Manual review",
    unfollowDone: "Unfollowed",
    unfollowPending: "Processing",
    unfollowError: "Unfollow failed",
    clear: "Clear",
    report: "Report",
    support: "Support",
    safetyTitle: "Safety",
    safetyOk: "Pauses are active. Instagram may limit automated analysis.",
    safetyLocked: "Safety pause active until {time}. Automatic mode is blocked.",
    safetyPause: "Pause 48h",
    accountLabel: "Account",
    unknownId: "unknown",
    confirmQuestion: "Analyze this account?",
    yes: "Yes",
    no: "No",
    followingMeta: "following",
    followersMeta: "followers",
    welcomeTitle: "Welcome",
    welcomeText: "Compatible with Chrome and Edge. It only analyzes the Instagram account signed in on this browser. Your results stay local and we do not collect personal data; only minimal data is used to detect errors, abuse, or abnormal extension use.",
    start: "Start",
    langButton: "ES",
    lightButton: "Light",
    darkButton: "Dark",
    ready: "Ready.",
    noResults: "No results.",
    confirming: "Confirm the account.",
    waitingConfirm: "Waiting for confirmation.",
    analyzing: "Analyzing...",
    detecting: "Detecting...",
    detectingAccount: "Detecting active account",
    done: "Done.",
    downloading: "Downloading...",
    stopped: "Stopped.",
    stoppedAnalysis: "Analysis stopped.",
    pausedReport: "Paused. You can report it.",
    pausedSafety: "Paused for safety.",
    followingLabel: "Following",
    followersLabel: "Followers",
    notBackLabel: "Not back",
    reportTitle: "Report an issue",
    reportUsername: "Instagram username",
    reportEmail: "Contact email",
    reportProblem: "Issue",
    reportPlaceholder: "Describe what happened",
    reportHint: "Gmail will open with the report ready to send to support.",
    send: "Send",
    cancel: "Cancel",
    unfollowTitle: "Confirm unfollow",
    unfollowLimitLabel: "People to unfollow",
    unfollowRiskText: "Safe mode: recommended 5 people per day, conservative maximum 12 per 24h. If Instagram shows a warning, limit, or verification, the extension blocks automatic mode for 48h.",
    unfollowRiskAccept: "I understand automatic mode has risk and accept using it with conservative limits.",
    continue: "Continue",
    unfollowHint: "The extension will pause between actions, but final use is your responsibility.",
    startingAnalysis: "Starting analysis...",
    resumingAnalysis: "Resuming analysis...",
    stopping: "Stopping...",
    preparingTxt: "Preparing TXT...",
    preparingHtml: "Preparing HTML...",
    txtReady: "TXT generated. Result available.",
    htmlReady: "HTML generated. Result available.",
    invalidUnfollowLimit: "Enter a valid unfollow amount.",
    confirmRisk: "Confirm that you understand the risk before continuing.",
    startingUnfollow: "Starting unfollow with limits...",
    alreadyRunning: "A task is already running.",
  },
};

function tr(key) {
  return I18N[uiSettings.lang]?.[key] || I18N.es[key] || key;
}

function getActiveTabContext() {
  return new Promise((resolve) => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs?.[0] || {};
        resolve({
          tabId: Number.isFinite(tab.id) ? tab.id : null,
          incognito: Boolean(tab.incognito),
          url: tab.url || "",
        });
      });
    } catch (_) {
      resolve({ tabId: null, incognito: false, url: "" });
    }
  });
}

function setLabelPrefix(label, text) {
  if (!label) return;
  const first = Array.from(label.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
  if (first) first.textContent = `${text}\n        `;
  else label.insertBefore(document.createTextNode(`${text}\n        `), label.firstChild);
}

function setCheckboxLabel(label, input, text) {
  if (!label || !input) return;
  label.textContent = "";
  label.appendChild(input);
  label.appendChild(document.createTextNode(` ${text}`));
}

function localizedMessage(message, fallbackKey) {
  const fallback = tr(fallbackKey);
  const text = String(message || "").trim();
  if (!text) return fallback;
  if (uiSettings.lang === "es") return text;
  const exact = {
    "Listo.": "ready",
    "Datos eliminados.": "ready",
    "Cuenta descartada.": "ready",
    "Detectando...": "detecting",
    "Analizando...": "analyzing",
    "Descargando...": "downloading",
    "Detenido.": "stopped",
    "An\u00e1lisis detenido.": "stoppedAnalysis",
    "Pausado. Pod\u00e9s reportar.": "pausedReport",
    "Pausado. Puedes reportar.": "pausedReport",
    "Pausado por seguridad.": "pausedSafety",
  };
  if (exact[text]) return tr(exact[text]);
  return text
    .replace(/^Listo\./, tr("ready"))
    .replace(/^Listo:/, "Done:")
    .replace(/^Datos eliminados\./, tr("ready"))
    .replace(/^Cuenta descartada\./, tr("ready"))
    .replace(/^Detectando\.\.\./, tr("detecting"))
    .replace(/^Analizando\.\.\./, tr("analyzing"))
    .replace(/^Descargando\.\.\./, tr("downloading"))
    .replace(/^Detenido\./, tr("stopped"))
    .replace(/^Pausado\./, "Paused.");
}

async function sendMessage(type, payload = {}) {
  const context = await getActiveTabContext();
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, context, ...payload }, (response) => {
      const err = chrome.runtime.lastError;
      if (err) return reject(new Error(err.message));
      resolve(response);
    });
  });
}

function storageLocalGet(key) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(key, (data) => resolve(data || {}));
    } catch (_) {
      resolve({});
    }
  });
}

function storageLocalSet(data) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.set(data, () => resolve());
    } catch (_) {
      resolve();
    }
  });
}

async function maybeShowWelcome() {
  const data = await storageLocalGet(WELCOME_KEY);
  if (data[WELCOME_KEY]) return;
  welcomeBox?.classList.add("open");
  welcomeBox?.setAttribute("aria-hidden", "false");
}

async function closeWelcome() {
  await storageLocalSet({ [WELCOME_KEY]: true });
  welcomeBox?.classList.remove("open");
  welcomeBox?.setAttribute("aria-hidden", "true");
}

function applyUiSettings() {
  document.body.dataset.theme = uiSettings.theme;
  document.documentElement.lang = uiSettings.lang;
  document.querySelector("h1").textContent = tr("appTitle");
  document.querySelector(".subtitle").textContent = tr("subtitle");
  stepDetect.textContent = tr("detectStep");
  stepConfirm.textContent = tr("confirmStep");
  stepAnalyze.textContent = tr("analyzeStep");
  detectBtn.textContent = tr("detect");
  stopBtn.textContent = tr("stop");
  if (confirmTitle) confirmTitle.textContent = tr("confirmQuestion");
  if (confirmBtn) confirmBtn.textContent = tr("yes");
  if (rejectBtn) rejectBtn.textContent = tr("no");
  exportBtn.textContent = tr("exportTxt");
  exportHtmlBtn.textContent = tr("exportHtml");
  if (unfollowBtn) unfollowBtn.textContent = tr("unfollow");
  if (manualModeBtn) manualModeBtn.textContent = manualMode ? tr("manualOn") : tr("manual");
  clearBtn.textContent = tr("clear");
  if (reportBtn) reportBtn.textContent = tr("report");
  if (contactLink) contactLink.textContent = tr("support");
  if (welcomeTitle) welcomeTitle.textContent = tr("welcomeTitle");
  if (welcomeText) welcomeText.textContent = tr("welcomeText");
  if (welcomeStart) welcomeStart.textContent = tr("start");
  if (reportTitle) reportTitle.textContent = tr("reportTitle");
  setLabelPrefix(reportUsernameLabel, tr("reportUsername"));
  setLabelPrefix(reportEmailLabel, tr("reportEmail"));
  setLabelPrefix(reportProblemLabel, tr("reportProblem"));
  if (reportUsername) reportUsername.placeholder = uiSettings.lang === "en" ? "@username" : "@usuario";
  if (reportUserEmail) reportUserEmail.placeholder = uiSettings.lang === "en" ? "your-email@email.com" : "tu-correo@email.com";
  if (reportProblem) reportProblem.placeholder = tr("reportPlaceholder");
  if (reportSend) reportSend.textContent = tr("send");
  if (reportCancel) reportCancel.textContent = tr("cancel");
  if (reportHint) reportHint.textContent = tr("reportHint");
  if (unfollowTitle) unfollowTitle.textContent = tr("unfollowTitle");
  setLabelPrefix(unfollowLimitLabel, tr("unfollowLimitLabel"));
  if (unfollowRiskText) unfollowRiskText.textContent = tr("unfollowRiskText");
  setCheckboxLabel(unfollowRiskLabel, unfollowAcceptRisk, tr("unfollowRiskAccept"));
  if (unfollowStart) unfollowStart.textContent = tr("continue");
  if (unfollowCancel) unfollowCancel.textContent = tr("cancel");
  if (unfollowHint) unfollowHint.textContent = tr("unfollowHint");
  if (safetyTitle) safetyTitle.textContent = tr("safetyTitle");
  if (safetyPauseBtn) safetyPauseBtn.textContent = tr("safetyPause");
  if (langToggle) langToggle.textContent = tr("langButton");
  if (themeToggle) themeToggle.textContent = uiSettings.theme === "dark" ? tr("lightButton") : tr("darkButton");
  langToggle?.classList.toggle("active", uiSettings.lang === "en");
  themeToggle?.classList.toggle("active", uiSettings.theme === "light");
  document.querySelector("#statFollowing + .label").textContent = tr("followingLabel");
  document.querySelector("#statFollowers + .label").textContent = tr("followersLabel");
  document.querySelector("#statNotBack + .label").textContent = tr("notBackLabel");
}

async function loadUiSettings() {
  const data = await storageLocalGet(SETTINGS_KEY);
  const manualData = await storageLocalGet(MANUAL_MODE_KEY);
  uiSettings = {
    lang: data[SETTINGS_KEY]?.lang === "en" ? "en" : "es",
    theme: data[SETTINGS_KEY]?.theme === "light" ? "light" : "dark",
  };
  manualMode = Boolean(manualData[MANUAL_MODE_KEY]);
  applyUiSettings();
}

async function saveUiSettings() {
  await storageLocalSet({ [SETTINGS_KEY]: uiSettings });
}

function fmt(value) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString("es-ES") : String(value);
}

function profileUrlForUsername(username) {
  const clean = String(username || "").replace(/^@+/, "").trim();
  return clean ? `https://www.instagram.com/${clean}/` : "https://www.instagram.com/";
}

function openOfficialUrl(url) {
  if (chrome?.tabs?.create) {
    chrome.tabs.create({ url });
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

function setAvatarContent(container, src, fallbackText = "@") {
  container.innerHTML = "";
  container.classList.remove("missing");
  const cleanSrc = String(src || "").replace(/&amp;/g, "&").trim();
  if (cleanSrc) {
    const img = document.createElement("img");
    img.src = cleanSrc;
    img.alt = fallbackText;
    img.referrerPolicy = "no-referrer";
    img.loading = "eager";
    img.onload = () => container.classList.remove("missing");
    img.onerror = () => {
      container.innerHTML = "";
      container.textContent = fallbackText;
      container.classList.add("missing");
      container.title = "Instagram no entregó la foto de perfil. Usá Reportar si persiste.";
    };
    container.appendChild(img);
  } else {
    container.textContent = fallbackText;
    container.classList.add("missing");
    container.title = "Foto de perfil pendiente.";
  }
}

function reportBody(state = currentState, fallback = "", form = {}) {
  const safe = state || {};
  const username = String(form.username || safe.account?.username || "").replace(/^@+/, "").trim();
  return [
    "Reporte de extensión IG - No me siguen",
    "",
    `Versión: ${APP_VERSION}`,
    `Instagram: ${username ? "@" + username : ""}`,
    `Correo de contacto: ${form.email || ""}`,
    `Estado: ${safe.status || "sin_estado"}`,
    `Fase: ${safe.phase || "sin_fase"}`,
    `Mensaje: ${safe.message || fallback || ""}`,
    `Detalle interno: ${safe.error || fallback || ""}`,
    `Cuenta detectada: ${safe.account?.username ? "@" + safe.account.username : safe.account?.id || ""}`,
        `Revisados: ${safe.counts?.checked ?? safe.result?.checked ?? ""}`,
        `Confirmados: ${safe.counts?.notFollowingBack ?? safe.result?.notFollowingBack?.length ?? ""}`,
    "",
    "Problema:",
    form.problem || "",
  ].join("\n");
}

function openUrlInTab(url) {
  try {
    if (chrome?.tabs?.create) {
      chrome.tabs.create({ url }, () => {
        if (chrome.runtime.lastError) window.open(url, "_blank", "noopener,noreferrer");
      });
      return;
    }
  } catch (_) {}
  window.open(url, "_blank", "noopener,noreferrer");
}

function openReportModal(fallback = "") {
  if (!reportModal) return;
  const accountUsername = currentState?.account?.username ? `@${currentState.account.username}` : "";
  if (reportUsername && !reportUsername.value) reportUsername.value = accountUsername;
  if (reportProblem && !reportProblem.value) {
    const msg = currentState?.error || currentState?.message || fallback || "";
    reportProblem.value = msg ? (uiSettings.lang === "en" ? `Detected issue: ${localizedMessage(msg, "pausedReport")}` : `Problema detectado: ${msg}`) : "";
  }
  reportModal.classList.add("open");
  reportModal.setAttribute("aria-hidden", "false");
  setTimeout(() => (reportProblem || reportUsername)?.focus(), 0);
}

function closeReportModal() {
  if (!reportModal) return;
  reportModal.classList.remove("open");
  reportModal.setAttribute("aria-hidden", "true");
}

function pendingUnfollowCount(state = currentState) {
  return (state?.result?.notFollowingBack || []).filter((user) => user.id && !user.unfollowedAt && user.unfollowStatus !== "done").length;
}

function canResumeAnalysis(state = currentState) {
  return Boolean(state?.resumeAvailable && ["cancelled", "error"].includes(state.status));
}

function formatDateTime(value) {
  const date = new Date(Number(value || 0));
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleString(uiSettings.lang === "en" ? "en-US" : "es-ES", { dateStyle: "short", timeStyle: "short" });
}

function isSafetyLocked(state = currentState) {
  return Boolean(state?.safety?.locked && Number(state.safety.lockedUntil || 0) > Date.now());
}

function renderSafety(state = currentState) {
  if (!safetyPanel || !safetyText) return;
  safetyPanel.style.display = "block";
  safetyPanel.classList.remove("risk", "locked");
  if (safetyResetBtn) safetyResetBtn.style.display = isSafetyLocked(state) ? "inline-block" : "none";
  if (isSafetyLocked(state)) {
    safetyPanel.classList.add("locked");
    safetyText.textContent = state.safety.guard === "manual"
      ? (uiSettings.lang === "en" ? "Manual pause applies to automatic unfollow; analysis remains available until " : "La pausa manual bloquea dejar de seguir automáticamente; puedes analizar. Termina el ") + formatDateTime(state.safety.lockedUntil) + "."
      : (state.safety.reason || tr("pausedSafety")) + " " + tr("safetyLocked").replace("{time}", formatDateTime(state.safety.lockedUntil));
    return;
  }
  safetyPanel.classList.add("risk");
  safetyText.textContent = tr("safetyOk");
}

function openUnfollowModal() {
  if (!unfollowModal) return;
  if (isSafetyLocked()) {
    setStatus(tr("safetyLocked").replace("{time}", formatDateTime(currentState?.safety?.lockedUntil)), "error");
    return;
  }
  const pending = pendingUnfollowCount();
  if (unfollowLimit) {
    unfollowLimit.max = String(Math.min(12, Math.max(1, pending)));
    unfollowLimit.value = String(Math.min(5, Math.max(1, pending || 1)));
  }
  if (unfollowAcceptRisk) unfollowAcceptRisk.checked = false;
  unfollowModal.classList.add("open");
  unfollowModal.setAttribute("aria-hidden", "false");
  setTimeout(() => unfollowLimit?.focus(), 0);
}

function closeUnfollowModal() {
  if (!unfollowModal) return;
  unfollowModal.classList.remove("open");
  unfollowModal.setAttribute("aria-hidden", "true");
}

function sendReport() {
  const form = {
    username: String(reportUsername?.value || "").trim(),
    email: String(reportUserEmail?.value || "").trim(),
    problem: String(reportProblem?.value || "").trim(),
  };
  const username = form.username || currentState?.account?.username || "sin_usuario";
  const subject = `Reporte IG No me siguen v${APP_VERSION} - ${username}`;
  const body = reportBody(currentState, "", form);
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(CONTACT_EMAIL)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  openUrlInTab(gmailUrl);
  closeReportModal();
}

function setStatus(text, kind = "") {
  statusEl.textContent = text || "";
  statusEl.className = `status ${kind}`.trim();
  if (statusIcon) {
    const spinning = kind === "loading" || kind === "warn";
    statusIcon.className = `status-icon ${spinning ? "spin" : kind}`.trim();
  }
}


function showRecoverableError(message = "") {
  currentState = { ...(currentState || { status: "idle" }), status: "error", error: message || currentState?.error || currentState?.message || "" };
  setStatus(tr("pausedReport"), "error");
  if (reportBtn) reportBtn.disabled = false;
  setButtons(currentState);
}

function showEmpty(text) {
  renderedListMode = "empty";
  renderedUserRows = new Map();
  listEl.innerHTML = "";
  const empty = document.createElement("div");
  empty.className = "empty";
  empty.textContent = text;
  listEl.appendChild(empty);
}

function showLoading(text, rows = 3) {
  renderedListMode = "loading";
  renderedUserRows = new Map();
  listEl.innerHTML = "";
  const box = document.createElement("div");
  box.className = "skeleton";
  const label = document.createElement("div");
  label.className = "empty";
  label.style.padding = "8px 0 4px";
  label.textContent = text;
  box.appendChild(label);
  for (let i = 0; i < rows; i++) {
    const row = document.createElement("div");
    row.className = "sk-row";
    box.appendChild(row);
  }
  listEl.appendChild(box);
}

function hasResultToShow(result) {
  return Boolean(result && Array.isArray(result.notFollowingBack) && result.notFollowingBack.length > 0);
}

function hasExportableResult(result) {
  return hasResultToShow(result);
}

function addUserRows(fragment, users, limit = 3000) {
  const visibleUsers = users.slice(0, limit);
  for (const user of visibleUsers) {
    const item = document.createElement("div");
    item.className = "list-item";

    const avatar = document.createElement("div");
    avatar.className = "mini-avatar";

    const wrapper = document.createElement("div");
    wrapper.className = "item-main";

    const username = String(user.username || "usuario_sin_username").replace(/^@+/, "");
    const officialUrl = user.profileUrl || profileUrlForUsername(username);

    const link = document.createElement("a");
    link.className = "user-link";
    link.href = officialUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = `@${username}`;
    link.title = officialUrl;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      openOfficialUrl(officialUrl);
    });

    const sub = document.createElement("a");
    sub.className = "url-line";
    sub.href = officialUrl;
    sub.target = "_blank";
    sub.rel = "noreferrer";
    sub.textContent = officialUrl;
    sub.title = officialUrl;
    sub.addEventListener("click", (event) => {
      event.preventDefault();
      openOfficialUrl(officialUrl);
    });

    wrapper.appendChild(link);
    wrapper.appendChild(sub);

    if (user.fullName) {
      const name = document.createElement("div");
      name.className = "item-sub";
      name.textContent = user.fullName;
      wrapper.appendChild(name);
    }

    setAvatarContent(avatar, user.profilePicData || user.profilePic, "@");
    item.appendChild(avatar);
    item.appendChild(wrapper);
    fragment.appendChild(item);
  }

  if (users.length > visibleUsers.length) {
    const note = document.createElement("div");
    note.className = "empty";
    note.textContent = `Mostrando ${visibleUsers.length}/${users.length}. Exporta el TXT para ver todo.`;
    fragment.appendChild(note);
  }
}

function resultUserKey(user) {
  return String(user?.id || user?.username || "").trim();
}

function unfollowBadgeText(user) {
  if (user.unfollowStatus === "done" || user.unfollowedAt) return tr("unfollowDone");
  if (user.unfollowStatus === "pending") return tr("unfollowPending");
  if (user.unfollowStatus === "error") return user.unfollowError || tr("unfollowError");
  return "";
}

function updateUserRow(row, user) {
  const badge = row.querySelector(".badge");
  const text = unfollowBadgeText(user);
  if (!text) {
    badge.style.display = "none";
    badge.textContent = "";
    badge.className = "badge";
  } else {
    badge.style.display = "inline-flex";
    badge.textContent = text;
    badge.className = `badge ${user.unfollowStatus === "error" ? "error" : user.unfollowStatus === "pending" ? "pending" : "done"}`;
  }

  const manualOpenBtn = row.querySelector(".manual-open-btn");
  if (manualOpenBtn) {
    manualOpenBtn.style.display = manualMode ? "inline-flex" : "none";
    manualOpenBtn.textContent = user.manualReviewedAt ? tr("manualDone") : tr("manualOpen");
  }

  const manualUnfollowBtn = row.querySelector(".manual-unfollow-btn");
  if (manualUnfollowBtn) {
    const done = user.unfollowedAt || user.unfollowStatus === "done";
    const pending = user.unfollowStatus === "pending";
    manualUnfollowBtn.style.display = manualMode && !done ? "inline-flex" : "none";
    manualUnfollowBtn.textContent = tr("manualUnfollow");
    manualUnfollowBtn.disabled = pending;
  }
}

function createUserRow(user) {
  const fragment = document.createDocumentFragment();
  addUserRows(fragment, [user], 1);
  const row = fragment.firstElementChild;
  const wrapper = row.querySelector(".item-main");
  const actions = document.createElement("div");
  actions.className = "item-actions";
  const badge = document.createElement("span");
  badge.className = "badge";
  badge.style.display = "none";
  actions.appendChild(badge);

  const manualOpenBtn = document.createElement("button");
  manualOpenBtn.type = "button";
  manualOpenBtn.className = "mini-action manual-open-btn";
  manualOpenBtn.style.display = "none";
  manualOpenBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const username = String(user.username || "usuario_sin_username").replace(/^@+/, "");
    openOfficialUrl(user.profileUrl || profileUrlForUsername(username));
    manualOpenBtn.textContent = tr("manualDone");
    await sendMessage("MARK_MANUAL_REVIEWED", { id: user.id, username });
  });
  actions.appendChild(manualOpenBtn);

  const manualUnfollowBtn = document.createElement("button");
  manualUnfollowBtn.type = "button";
  manualUnfollowBtn.className = "mini-action danger manual-unfollow-btn";
  manualUnfollowBtn.style.display = "none";
  manualUnfollowBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const username = String(user.username || "usuario_sin_username").replace(/^@+/, "");
    manualUnfollowBtn.disabled = true;
    setStatus(tr("manualUnfollowOne").replace("{username}", username), "loading");
    try {
      const response = await sendMessage("START_UNFOLLOW", { limit: 1, target: { id: user.id, username }, overrideRisk: false });
      if (!response?.ok) throw new Error(response?.error || "No se pudo iniciar unfollow.");
      if (response.alreadyRunning) {
        manualUnfollowBtn.disabled = false;
        setStatus(tr("alreadyRunning"), "warn");
      }
    } catch (err) {
      manualUnfollowBtn.disabled = false;
      showRecoverableError(err.message);
    }
  });
  actions.appendChild(manualUnfollowBtn);
  wrapper.appendChild(actions);
  updateUserRow(row, user);
  return row;
}

function resetResultList() {
  listEl.innerHTML = "";
  renderedUserRows = new Map();
  renderedListMode = "result";

  const title = document.createElement("div");
  title.className = "section-title";
  title.id = "resultTitle";
  listEl.appendChild(title);

  const note = document.createElement("div");
  note.className = "note";
  note.id = "resultNote";
  listEl.appendChild(note);

  const rows = document.createElement("div");
  rows.id = "resultRows";
  listEl.appendChild(rows);
}

function renderResult(result, status) {
  const confirmed = Array.isArray(result?.notFollowingBack) ? result.notFollowingBack : [];
  const checked = Number(result?.checked || currentState?.counts?.checked || 0);
  const total = Number(currentState?.counts?.following || currentState?.account?.followingCount || 0);
  const unresolved = Number(result?.unresolved || currentState?.counts?.unresolved || 0);
  const shouldStickToBottom = listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 18;

  if (renderedListMode !== "result" || confirmed.length < renderedUserRows.size) resetResultList();

  const titleLive = document.getElementById("resultTitle");
  const noteLive = document.getElementById("resultNote");
  const rowsLive = document.getElementById("resultRows");
  titleLive.textContent = uiSettings.lang === "en" ? `Not following back (${confirmed.length})` : `No te siguen (${confirmed.length})`;
  if (status === "running") {
    noteLive.textContent = uiSettings.lang === "en" ? `Checked: ${fmt(checked)}/${fmt(total)}` : `Revisados: ${fmt(checked)}/${fmt(total)}`;
  } else if (status === "unfollowing") {
    const u = currentState?.unfollow || {};
    noteLive.textContent = uiSettings.lang === "en"
      ? `Unfollowing: ${fmt(u.done || 0)}/${fmt(u.total || 0)} - limit ${fmt(u.quota?.windowCount || 0)}/${fmt(u.quota?.windowLimit || 29)} every 3h`
      : `Dejando de seguir: ${fmt(u.done || 0)}/${fmt(u.total || 0)} - l\u00edmite ${fmt(u.quota?.windowCount || 0)}/${fmt(u.quota?.windowLimit || 29)} cada 3h`;
  } else if (status === "cancelled") {
    noteLive.textContent = uiSettings.lang === "en" ? `Stopped - ${fmt(confirmed.length)} confirmed` : `Detenido - ${fmt(confirmed.length)} confirmados`;
  } else if (unresolved) {
    noteLive.textContent = uiSettings.lang === "en" ? `Done - ${fmt(unresolved)} unknown` : `Listo - ${fmt(unresolved)} sin dato`;
  } else {
    noteLive.textContent = uiSettings.lang === "en" ? "Confirmed: you follow them and they do not follow you back." : "Confirmados: vos los segu\u00eds y no te siguen.";
  }

  let emptyLive = document.getElementById("resultEmpty");
  if (confirmed.length) {
    if (emptyLive) emptyLive.remove();
    const visibleUsers = confirmed.slice(0, 3000);
    for (const user of visibleUsers) {
      const key = resultUserKey(user);
      if (!key) continue;
      const existing = renderedUserRows.get(key);
      if (existing) {
        updateUserRow(existing, user);
      } else {
        const row = createUserRow(user);
        renderedUserRows.set(key, row);
        rowsLive.appendChild(row);
      }
    }
  } else {
    if (!emptyLive) {
      emptyLive = document.createElement("div");
      emptyLive.id = "resultEmpty";
      emptyLive.className = "empty";
      rowsLive.appendChild(emptyLive);
    }
    emptyLive.textContent = status === "running"
      ? (uiSettings.lang === "en" ? "Waiting for confirmed users." : "Esperando confirmados.")
      : (uiSettings.lang === "en" ? "No confirmed users." : "Sin confirmados.");
  }

  if (confirmed.length > previousConfirmedCount || shouldStickToBottom) {
    listEl.scrollTop = listEl.scrollHeight;
  }
  previousConfirmedCount = confirmed.length;
  return;

  listEl.innerHTML = "";
  const fragment = document.createDocumentFragment();

  const title = document.createElement("div");
  title.className = "section-title";
  title.textContent = `No te siguen (${confirmed.length})`;
  fragment.appendChild(title);

  const note = document.createElement("div");
  note.className = "note";
  if (status === "running") {
    note.textContent = `Revisados: ${fmt(checked)}/${fmt(total)}`;
  } else if (status === "cancelled") {
    note.textContent = `Detenido · ${fmt(confirmed.length)} confirmados`;
  } else if (unresolved) {
    note.textContent = `Listo · ${fmt(unresolved)} sin dato`;
  } else {
    note.textContent = "Confirmados: vos los seguís y no te siguen.";
  }
  fragment.appendChild(note);

  if (confirmed.length) {
    addUserRows(fragment, confirmed, 3000);
  } else {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = status === "running"
      ? "Esperando confirmados."
      : "Sin confirmados.";
    fragment.appendChild(empty);
  }

  listEl.appendChild(fragment);
  if (confirmed.length > previousConfirmedCount || shouldStickToBottom) {
    listEl.scrollTop = listEl.scrollHeight;
  }
  previousConfirmedCount = confirmed.length;
}

function progressPercent(state) {
  if (!state) return 0;
  if (state.status === "done" || state.status === "downloading") return 100;
  if (state.status === "detecting") return 8;
  if (state.status === "awaiting_confirm") return 12;
  if (state.status === "unfollowing") {
    const u = state.unfollow || {};
    return u.total > 0 ? Math.min(98, 8 + ((u.done || 0) / u.total) * 90) : 8;
  }
  const progress = state.progress || {};
  const phase = progress.phase || state.phase;
  const count = Number(progress.count || 0);
  const total = Number(progress.total || 0);
  if (phase === "following") return total > 0 ? Math.min(45, 12 + (count / total) * 33) : Math.min(45, 12 + Number(progress.page || 0) * 2);
  if (phase === "checking") return total > 0 ? Math.min(98, 48 + (count / total) * 50) : Math.min(98, 48 + Number(progress.page || 0) * 2);
  return 5;
}

function activeStepFor(state) {
  const status = state?.status || "idle";
  if (status === "detecting" || status === "idle" || status === "cancelled" || status === "error") return "detect";
  if (status === "awaiting_confirm") return "confirm";
  return "analyze";
}

function renderSteps(state) {
  const active = activeStepFor(state);
  stepDetect.classList.toggle("active", active === "detect");
  stepConfirm.classList.toggle("active", active === "confirm");
  stepAnalyze.classList.toggle("active", active === "analyze");
}

function renderAccount(account, needsConfirm) {
  if (!account) {
    accountBox.style.display = "none";
    confirmBox.style.display = "none";
    return;
  }
  accountBox.style.display = "block";
  confirmBox.style.display = needsConfirm ? "block" : "none";
  const username = account.username ? `@${account.username}` : `ID ${account.id || tr("unknownId")}`;
  accountTitle.textContent = username;
  setAvatarContent(accountAvatar, account.profilePicData || account.profilePic, account.username ? account.username[0].toUpperCase() : "@");
  const parts = [];
  parts.push(`${fmt(account.followingCount)} ${tr("followingMeta")}`);
  parts.push(`${fmt(account.followerCount)} ${tr("followersMeta")}`);
  accountMeta.textContent = parts.join(" · ");
}

function renderStats(counts, account) {
  const hasCounts = Boolean(counts || account);
  statsEl.style.display = hasCounts ? "flex" : "none";
  if (!hasCounts) return;
  statFollowing.textContent = fmt(counts?.following ?? account?.followingCount);
  statFollowers.textContent = fmt(counts?.followers ?? account?.followerCount);
  statNotBack.textContent = fmt(counts?.notFollowingBack);
}

function setButtons(state) {
  const status = state?.status || "idle";
  const hasResult = hasExportableResult(state?.result);
  const busy = status === "detecting" || status === "running" || status === "downloading" || status === "unfollowing";
  const waitingConfirm = status === "awaiting_confirm";
  detectBtn.disabled = busy || waitingConfirm;
  detectBtn.textContent = canResumeAnalysis(state) ? tr("continueAnalysis") : tr("detect");
  stopBtn.disabled = !(status === "detecting" || status === "running" || status === "unfollowing");
  confirmBtn.disabled = !waitingConfirm;
  rejectBtn.disabled = !waitingConfirm;
  exportBtn.disabled = !(hasResult && ["running", "done", "cancelled", "error", "unfollowing"].includes(status));
  exportHtmlBtn.disabled = !(hasResult && ["running", "done", "cancelled", "error", "unfollowing"].includes(status));
  if (manualModeBtn) {
    manualModeBtn.disabled = !(hasResult && pendingUnfollowCount(state) > 0 && ["done", "cancelled", "error"].includes(status));
    manualModeBtn.textContent = manualMode ? tr("manualOn") : tr("manual");
  }
  if (unfollowBtn) {
    unfollowBtn.disabled = isSafetyLocked(state) || !(hasResult && pendingUnfollowCount(state) > 0 && ["done", "cancelled", "error"].includes(status));
  }
  clearBtn.disabled = !(status === "done" || status === "error" || status === "cancelled" || status === "downloading" || waitingConfirm);
  if (reportBtn) reportBtn.disabled = false;
}


function renderState(state) {
  currentState = state || { status: "idle" };
  renderSteps(currentState);

  const status = currentState.status || "idle";
  const needsConfirm = status === "awaiting_confirm";
  renderAccount(currentState.account, needsConfirm);
  renderStats(currentState.counts, currentState.account);
  renderSafety(currentState);
  progressBar.style.width = `${progressPercent(currentState)}%`;
  progressWrap.style.display = ["detecting", "awaiting_confirm", "running", "done", "downloading", "unfollowing"].includes(status) ? "block" : "none";

  if (status === "idle") {
    setStatus(localizedMessage(currentState.message, "ready"));
    previousConfirmedCount = 0;
    showEmpty(tr("noResults"));
  } else if (status === "detecting") {
    setStatus(localizedMessage(currentState.message, "detecting"), "loading");
    showLoading(tr("detectingAccount"), 3);
  } else if (status === "awaiting_confirm") {
    setStatus(tr("confirming"), "warn");
    showEmpty(tr("waitingConfirm"));
  } else if (status === "running") {
    setStatus(localizedMessage(currentState.message, "analyzing"), "loading");
    if (currentState.result) renderResult(currentState.result, status);
    else showLoading(tr("analyzing"), 4);
  } else if (status === "done") {
    setStatus(localizedMessage(currentState.message, "done"), "ok");
    renderResult(currentState.result, status);
  } else if (status === "downloading") {
    setStatus(localizedMessage(currentState.message, "downloading"), "loading");
    renderResult(currentState.result, status);
  } else if (status === "unfollowing") {
    setStatus(localizedMessage(currentState.message, "startingUnfollow"), "loading");
    renderResult(currentState.result, status);
  } else if (status === "cancelled") {
    setStatus(localizedMessage(currentState.message, "stopped"), "warn");
    if (currentState.result) renderResult(currentState.result, status);
    else showEmpty(tr("stoppedAnalysis"));
  } else if (status === "error") {
    setStatus(localizedMessage(currentState.error || currentState.message, "pausedReport"), "error");
    if (currentState.result) renderResult(currentState.result, status);
    else showEmpty(tr("pausedSafety"));
  }
  setButtons(currentState);
}

async function loadState() {
  try {
    const response = await sendMessage("GET_STATE");
    if (!response?.ok) throw new Error(response?.error || "No se pudo leer el estado.");
    renderState(response.state);
  } catch (err) {
    showRecoverableError(err.message);
  }
}

async function clearState(message = "Datos eliminados.") {
  try {
    const response = await sendMessage("CLEAR_STATE");
    if (!response?.ok) throw new Error(response?.error || "No se pudo limpiar.");
    previousConfirmedCount = 0;
    renderState({ status: "idle", message });
  } catch (err) {
    showRecoverableError(err.message);
  }
}

detectBtn.addEventListener("click", async () => {
  const status = currentState?.status;
  if (status === "awaiting_confirm") return;
  detectBtn.disabled = true;
  const resume = canResumeAnalysis(currentState);
  setStatus(resume ? tr("resumingAnalysis") : tr("detecting"), "loading");
  showLoading(resume ? tr("resumingAnalysis") : tr("detectingAccount"), 3);
  try {
    const response = await sendMessage(resume ? "RESUME_ANALYSIS" : "DETECT_ACCOUNT", resume ? {} : { autoStart: true });
    if (!response?.ok) throw new Error(response?.error || "No se pudo detectar.");
    if (response.alreadyRunning) setStatus(tr("alreadyRunning"), "warn");
  } catch (err) {
    showRecoverableError(err.message);
  }
});

confirmBtn.addEventListener("click", async () => {
  confirmBtn.disabled = true;
  rejectBtn.disabled = true;
  setStatus(tr("startingAnalysis"), "loading");
  try {
    const response = await sendMessage("START_ANALYSIS");
    if (!response?.ok) throw new Error(response?.error || "No se pudo iniciar.");
    if (response.alreadyRunning) setStatus(tr("alreadyRunning"), "warn");
  } catch (err) {
    showRecoverableError(err.message);
  }
});

rejectBtn.addEventListener("click", async () => {
  await clearState(tr("ready"));
});

stopBtn.addEventListener("click", async () => {
  stopBtn.disabled = true;
  setStatus(tr("stopping"), "loading");
  try {
    const response = await sendMessage("STOP_ANALYSIS");
    if (!response?.ok) throw new Error(response?.error || "No se pudo detener.");
  } catch (err) {
    showRecoverableError(err.message);
  }
});

exportBtn.addEventListener("click", async () => {
  exportBtn.disabled = true;
  setStatus(tr("preparingTxt"), "loading");
  try {
    const response = await sendMessage("EXPORT");
    if (!response?.ok) throw new Error(response?.error || "No se pudo exportar.");
    setStatus(tr("txtReady"), "ok");
    setButtons(currentState);
  } catch (err) {
    showRecoverableError(err.message);
  }
});

exportHtmlBtn.addEventListener("click", async () => {
  exportHtmlBtn.disabled = true;
  setStatus(tr("preparingHtml"), "loading");
  try {
    const response = await sendMessage("EXPORT_HTML");
    if (!response?.ok) throw new Error(response?.error || "No se pudo exportar HTML.");
    setStatus(tr("htmlReady"), "ok");
    setButtons(currentState);
  } catch (err) {
    showRecoverableError(err.message);
  }
});

unfollowBtn?.addEventListener("click", async () => {
  openUnfollowModal();
});

manualModeBtn?.addEventListener("click", async () => {
  manualMode = !manualMode;
  await storageLocalSet({ [MANUAL_MODE_KEY]: manualMode });
  if (manualModeBtn) manualModeBtn.textContent = manualMode ? tr("manualOn") : tr("manual");
  const users = currentState?.result?.notFollowingBack || [];
  for (const user of users) {
    const row = renderedUserRows.get(resultUserKey(user));
    if (row) updateUserRow(row, user);
  }
});

unfollowStart?.addEventListener("click", async () => {
  const limit = Math.floor(Number(unfollowLimit?.value || 0));
  if (!Number.isFinite(limit) || limit < 1) {
    setStatus(tr("invalidUnfollowLimit"), "warn");
    return;
  }
  if (!unfollowAcceptRisk?.checked) {
    setStatus(tr("confirmRisk"), "warn");
    return;
  }
  const pending = pendingUnfollowCount();
  const safeLimit = Math.min(limit, 12, Math.max(1, pending));
  closeUnfollowModal();
  if (unfollowBtn) unfollowBtn.disabled = true;
  setStatus(tr("startingUnfollow"), "loading");
  try {
    const response = await sendMessage("START_UNFOLLOW", { limit: safeLimit, overrideRisk: true });
    if (!response?.ok) throw new Error(response?.error || "No se pudo iniciar unfollow.");
    if (response.alreadyRunning) setStatus(tr("alreadyRunning"), "warn");
  } catch (err) {
    showRecoverableError(err.message);
  }
});

safetyPauseBtn?.addEventListener("click", async () => {
  setStatus(uiSettings.lang === "en" ? "Activating safety pause..." : "Activando pausa de seguridad...", "loading");
  try {
    const response = await sendMessage("SAFETY_PAUSE");
    if (!response?.ok) throw new Error(response?.error || "No se pudo activar la pausa.");
    const until = response.lock?.until;
    currentState = {
      ...(currentState || { status: "idle" }),
      safety: { locked: true, lockedUntil: until, reason: response.lock?.reason || "" },
      message: tr("safetyLocked").replace("{time}", formatDateTime(until)),
    };
    renderState(currentState);
  } catch (err) {
    showRecoverableError(err.message);
  }
});

unfollowBackdrop?.addEventListener("click", closeUnfollowModal);
unfollowClose?.addEventListener("click", closeUnfollowModal);
unfollowCancel?.addEventListener("click", closeUnfollowModal);
welcomeStart?.addEventListener("click", closeWelcome);
langToggle?.addEventListener("click", async () => {
  uiSettings.lang = uiSettings.lang === "es" ? "en" : "es";
  applyUiSettings();
  if (currentState) renderState(currentState);
  await saveUiSettings();
});
themeToggle?.addEventListener("click", async () => {
  uiSettings.theme = uiSettings.theme === "dark" ? "light" : "dark";
  applyUiSettings();
  await saveUiSettings();
});

clearBtn.addEventListener("click", async () => {
  await clearState(tr("ready"));
});

reportBtn?.addEventListener("click", () => openReportModal(currentState?.error || currentState?.message || ""));
contactLink?.addEventListener("click", (event) => {
  event.preventDefault();
  openReportModal("");
});
reportBackdrop?.addEventListener("click", closeReportModal);
reportClose?.addEventListener("click", closeReportModal);
reportCancel?.addEventListener("click", closeReportModal);
reportSend?.addEventListener("click", sendReport);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeReportModal();
    closeUnfollowModal();
  }
});
window.addEventListener("error", (event) => {
  try { showRecoverableError(event?.message || "Fallo del popup"); } catch (_) {}
});
window.addEventListener("unhandledrejection", (event) => {
  const reason = event?.reason;
  try { showRecoverableError(reason?.message || String(reason || "Fallo interno")); } catch (_) {}
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "STATE") renderState(msg.state);
  if (msg.type === "CLEARED") renderState({ status: "idle", message: tr("ready") });
});

loadUiSettings()
  .then(loadState)
  .then(maybeShowWelcome);

// Abre el análisis local en una pestaña sin acceder a Instagram.
document.getElementById("localAnalysisBtn")?.addEventListener("click", () => chrome.tabs.create({ url: chrome.runtime.getURL("local.html") }));

safetyResetBtn?.addEventListener("click", async () => {
  if (!window.confirm("Comprueba primero Instagram. Si aparece un límite, aviso o verificación, no quites la pausa. ¿Ya lo revisaste y deseas quitarla?")) return;
  try { const response = await sendMessage("CLEAR_SAFETY_LOCK"); if (!response?.ok) throw new Error(response?.error || "No se pudo quitar la pausa."); await loadState(); }
  catch (err) { showRecoverableError(err.message); }
});
