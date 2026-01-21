const loginScreen = document.getElementById("login-screen");
const appScreen = document.getElementById("app-screen");
const alertScreen = document.getElementById("alert-screen");
const loginForm = document.getElementById("login-form");
const userBadge = document.getElementById("user-badge");
const alertText = document.getElementById("alert-text");
const statusPill = document.getElementById("status-pill");
const activityList = document.getElementById("activity-list");
const pauseReason = document.getElementById("pause-reason");
const pauseInput = document.getElementById("pause-input");
const reportSent = document.getElementById("report-sent");

const btnActivate = document.getElementById("btn-activate");
const btnPause = document.getElementById("btn-pause");
const btnResume = document.getElementById("btn-resume");
const btnDeactivate = document.getElementById("btn-deactivate");
const btnPresent = document.getElementById("btn-present");
const alertTimer = document.getElementById("alert-timer");
const alertStatus = document.getElementById("alert-status");
const alertSent = document.getElementById("alert-sent");

let userProfile = { lastName: "", firstName: "", agentCode: "" };
let alertInterval = null;
let alertTick = null;
let alertStart = null;
let mailSent = false;

const ALERT_FREQUENCY_MS = 60_000;
const ORANGE_THRESHOLD = 60;
const RED_THRESHOLD = 300;

const formatTime = (date) => {
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${hours} h ${minutes}`;
};

const addActivity = (text) => {
  const item = document.createElement("li");
  item.textContent = `${formatTime(new Date())} : ${text}`;
  activityList.prepend(item);
};

const showScreen = (screen) => {
  [loginScreen, appScreen].forEach((element) => element.classList.remove("active"));
  screen.classList.add("active");
};

const resetButtons = () => {
  btnActivate.classList.remove("hidden");
  btnPause.classList.add("hidden");
  btnResume.classList.add("hidden");
  btnDeactivate.classList.add("hidden");
  pauseReason.classList.add("hidden");
  reportSent.classList.add("hidden");
};

const setStatus = (value) => {
  statusPill.textContent = value;
};

const stopAlertInterval = () => {
  if (alertInterval) {
    clearInterval(alertInterval);
    alertInterval = null;
  }
};

const resetAlert = () => {
  if (alertTick) {
    clearInterval(alertTick);
    alertTick = null;
  }
  mailSent = false;
  alertStart = null;
  alertTimer.textContent = "00 : 00";
  alertTimer.style.borderColor = "var(--lime)";
  btnPresent.style.background = "var(--lime)";
  btnPresent.style.color = "#1a2b23";
  alertStatus.textContent = "EN ATTENTE";
  alertSent.classList.add("hidden");
};

const updateAlertColors = (elapsedSeconds) => {
  if (elapsedSeconds < ORANGE_THRESHOLD) {
    alertTimer.style.borderColor = "var(--lime)";
    btnPresent.style.background = "var(--lime)";
    alertStatus.textContent = "EN ATTENTE";
    return;
  }
  if (elapsedSeconds < RED_THRESHOLD) {
    alertTimer.style.borderColor = "var(--amber)";
    btnPresent.style.background = "var(--amber)";
    alertStatus.textContent = "ANOMALIE";
    return;
  }
  alertTimer.style.borderColor = "#ff0000";
  btnPresent.style.background = "var(--danger)";
  alertStatus.textContent = "CRITIQUE";
};

const sendAlertEmail = async (elapsedLabel) => {
  if (mailSent) return;
  mailSent = true;
  alertSent.classList.remove("hidden");
  try {
    await fetch("/api/send_alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        last_name: userProfile.lastName,
        first_name: userProfile.firstName,
        agent_code: userProfile.agentCode,
        elapsed: elapsedLabel,
      }),
    });
  } catch (error) {
    console.error("Erreur envoi mail", error);
  }
};

const startAlertTimer = () => {
  resetAlert();
  alertStart = Date.now();
  alertScreen.classList.remove("hidden");

  alertTick = setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - alertStart) / 1000);
    const minutes = `${Math.floor(elapsedSeconds / 60)}`.padStart(2, "0");
    const seconds = `${elapsedSeconds % 60}`.padStart(2, "0");
    alertTimer.textContent = `${minutes} : ${seconds}`;
    updateAlertColors(elapsedSeconds);

    if (elapsedSeconds >= RED_THRESHOLD) {
      sendAlertEmail(`${minutes}:${seconds}`);
    }
  }, 1000);
};

const startAlertInterval = () => {
  stopAlertInterval();
  alertInterval = setInterval(() => {
    startAlertTimer();
  }, ALERT_FREQUENCY_MS);
};

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  userProfile = {
    lastName: formData.get("last_name").trim(),
    firstName: formData.get("first_name").trim(),
    agentCode: formData.get("agent_code").trim(),
  };

  if (!userProfile.lastName || !userProfile.firstName || !userProfile.agentCode) {
    return;
  }

  userBadge.textContent = `${userProfile.lastName} ${userProfile.firstName}`;
  alertText.textContent = `${userProfile.lastName} ${userProfile.firstName}, confirmez votre présence`;
  addActivity("connexion");
  showScreen(appScreen);
});

btnActivate.addEventListener("click", () => {
  setStatus("ACTIF");
  btnActivate.classList.add("hidden");
  btnPause.classList.remove("hidden");
  btnDeactivate.classList.remove("hidden");
  pauseReason.classList.add("hidden");
  reportSent.classList.add("hidden");
  addActivity("surveillance activée");
  startAlertInterval();
});

btnPause.addEventListener("click", () => {
  setStatus("PAUSE");
  btnPause.classList.add("hidden");
  btnResume.classList.remove("hidden");
  pauseReason.classList.remove("hidden");
  addActivity("surveillance mise en pause");
  stopAlertInterval();
});

btnResume.addEventListener("click", () => {
  if (!pauseInput.value.trim()) {
    pauseInput.focus();
    return;
  }
  setStatus("ACTIF");
  btnResume.classList.add("hidden");
  btnPause.classList.remove("hidden");
  pauseReason.classList.add("hidden");
  pauseInput.value = "";
  addActivity("surveillance reprise");
  startAlertInterval();
});

btnDeactivate.addEventListener("click", () => {
  setStatus("INACTIF");
  resetButtons();
  addActivity("surveillance terminée");
  stopAlertInterval();
  reportSent.classList.remove("hidden");
});

btnPresent.addEventListener("click", () => {
  alertScreen.classList.add("hidden");
  resetAlert();
  addActivity("présence confirmée");
});

window.addEventListener("beforeunload", () => {
  stopAlertInterval();
  resetAlert();
});
