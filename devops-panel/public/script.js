const statusBadge = document.getElementById("statusBadge");
const statusText = document.getElementById("statusText");
const statusValue = document.getElementById("statusValue");
const statusHint = document.getElementById("statusHint");
const runningPods = document.getElementById("runningPods");
const totalPods = document.getElementById("totalPods");
const failedPods = document.getElementById("failedPods");
const healthValue = document.getElementById("healthValue");
const deploymentName = document.getElementById("deploymentName");
const deploymentChip = document.getElementById("deploymentChip");
const versionValue = document.getElementById("versionValue");
const lastUpdated = document.getElementById("lastUpdated");
const refreshBtn = document.getElementById("refreshBtn");
const restartBtn = document.getElementById("restartBtn");
const fixBtn = document.getElementById("fixBtn");
const loader = document.getElementById("loader");
const toast = document.getElementById("toast");
const errorPanel = document.getElementById("errorPanel");
const errorMessage = document.getElementById("errorMessage");
const recoveryBanner = document.getElementById("recoveryBanner");
const recoveryText = document.getElementById("recoveryText");
const failedPodList = document.getElementById("failedPodList");
const activityFeed = document.getElementById("activityFeed");
const systemLogs = document.getElementById("systemLogs");
const logCount = document.getElementById("logCount");

let toastTimer;
let loadingCount = 0;

function setLoading(isLoading) {
  loadingCount += isLoading ? 1 : -1;
  if (loadingCount < 0) loadingCount = 0;

  loader.classList.toggle("hidden", loadingCount === 0);
  refreshBtn.disabled = loadingCount > 0;
}

function formatTime(value) {
  if (!value) return "--";

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}

function formatLogTime(value) {
  if (!value) return "--:--:--";

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function showToast(message, type = "info") {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.style.borderColor = type === "error" ? "rgba(255, 82, 119, 0.55)" : "rgba(53, 244, 155, 0.45)";
  toast.classList.remove("hidden");
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 3400);
}

function renderFailedPods(pods) {
  failedPodList.innerHTML = "";

  if (!pods || pods.length === 0) {
    return;
  }

  pods.slice(0, 4).forEach((pod) => {
    const item = document.createElement("div");
    item.className = "failed-item";
    item.innerHTML = `<strong>${pod.name}</strong><span>${pod.reason}</span>`;
    failedPodList.appendChild(item);
  });
}

function renderStatus(data) {
  const normalized = data.status === "Healthy" ? "healthy" : "degraded";
  statusBadge.className = `status-badge ${normalized}`;
  statusText.textContent = data.status;
  statusValue.textContent = data.status;
  statusHint.textContent =
    data.status === "Healthy"
      ? "All active food-web pods are running. Failed historical pods are isolated from health scoring."
      : "No active running food-web pods were found. Recovery action may be required.";

  runningPods.textContent = data.runningPods;
  totalPods.textContent = data.totalPods;
  failedPods.textContent = data.failedPods || 0;
  healthValue.textContent = data.health || 0;
  deploymentName.textContent = data.deployment;
  deploymentChip.textContent = data.deployment;
  versionValue.textContent = data.version || "unknown";
  lastUpdated.textContent = formatTime(data.lastUpdated);

  recoveryBanner.classList.toggle("hidden", !data.failedPods);
  recoveryText.textContent = `${data.failedPods || 0} failed pod${data.failedPods === 1 ? "" : "s"} waiting for cleanup.`;
  renderFailedPods(data.failedPodDetails || []);

  if (data.error) {
    errorMessage.textContent = data.error;
    errorPanel.classList.remove("hidden");
  } else {
    errorPanel.classList.add("hidden");
  }
}

function renderLogs(logs) {
  activityFeed.innerHTML = "";
  systemLogs.innerHTML = "";
  logCount.textContent = `${logs.length} event${logs.length === 1 ? "" : "s"}`;

  logs.slice(0, 12).forEach((event) => {
    const item = document.createElement("div");
    item.className = "activity-item";
    item.innerHTML = `
      <div class="activity-meta">
        <span>${event.type}</span>
        <span>${formatLogTime(event.timestamp)}</span>
      </div>
      <div class="activity-message">${event.message}</div>
    `;
    activityFeed.appendChild(item);
  });

  logs.slice(0, 40).reverse().forEach((event) => {
    const line = document.createElement("div");
    line.className = `log-line ${event.level}`;
    line.textContent = `[${formatLogTime(event.timestamp)}] ${event.level.toUpperCase()} ${event.type}: ${event.message}`;
    systemLogs.appendChild(line);
  });

  systemLogs.scrollTop = systemLogs.scrollHeight;
}

async function refreshLogs() {
  try {
    const response = await fetch("/logs");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Log request failed");
    }

    renderLogs(data.logs || []);
  } catch (error) {
    renderLogs([
      {
        type: "error",
        level: "error",
        message: error.message,
        timestamp: new Date().toISOString(),
      },
    ]);
  }
}

async function refreshStatus() {
  setLoading(true);

  try {
    const response = await fetch("/status");
    const data = await response.json();
    renderStatus(data);

    if (!response.ok) {
      throw new Error(data.error || "Status request failed");
    }
  } catch (error) {
    renderStatus({
      status: "Degraded",
      totalPods: 0,
      runningPods: 0,
      failedPods: 0,
      health: 0,
      deployment: "food-web",
      version: "unknown",
      failedPodDetails: [],
      lastUpdated: new Date().toISOString(),
      error: error.message,
    });
    showToast(error.message, "error");
  } finally {
    setLoading(false);
    refreshLogs();
  }
}

async function restartDeployment() {
  restartBtn.disabled = true;
  setLoading(true);

  try {
    const response = await fetch("/restart", { method: "POST" });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || "Restart failed");
    }

    showToast("Deployment restarted");
    await refreshStatus();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    restartBtn.disabled = false;
    setLoading(false);
  }
}

async function fixCluster() {
  fixBtn.disabled = true;
  setLoading(true);

  try {
    const response = await fetch("/cleanup", { method: "POST" });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || "Cleanup failed");
    }

    showToast("Cluster cleaned");
    await refreshStatus();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    fixBtn.disabled = false;
    setLoading(false);
  }
}

refreshBtn.addEventListener("click", refreshStatus);
restartBtn.addEventListener("click", restartDeployment);
fixBtn.addEventListener("click", fixCluster);

refreshStatus();
refreshLogs();
setInterval(refreshStatus, 3000);
setInterval(refreshLogs, 3000);
