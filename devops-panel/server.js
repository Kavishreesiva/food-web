const express = require("express");
const path = require("path");
const { exec } = require("child_process");

const app = express();
const PORT = 3000;
const DEPLOYMENT_NAME = "food-web";
const MAX_EVENTS = 80;

const events = [];

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function addEvent(type, message, level = "info") {
  const event = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    level,
    message,
    timestamp: new Date().toISOString(),
  };

  events.unshift(event);
  if (events.length > MAX_EVENTS) events.pop();
  return event;
}

function runKubectl(command) {
  return new Promise((resolve, reject) => {
    exec(
      command,
      {
        timeout: 15000,
        maxBuffer: 1024 * 1024,
        shell: "/bin/sh",
      },
      (error, stdout, stderr) => {
        if (error) {
          const message = stderr || error.message || "kubectl command failed";
          reject(new Error(message.trim()));
          return;
        }

        resolve(stdout);
      }
    );
  });
}

function getImageVersion(pods) {
  const image = pods
    .flatMap((pod) => pod.spec?.containers || [])
    .map((container) => container.image)
    .find(Boolean);

  if (!image) return "unknown";

  const lastSegment = image.split("/").pop() || image;
  if (!lastSegment.includes(":")) return "latest";

  return lastSegment.split(":").pop() || "unknown";
}

function isPodRunning(pod) {
  return pod.status?.phase === "Running";
}

function isFoodWebPod(pod) {
  const labels = pod.metadata?.labels || {};
  return labels.app === DEPLOYMENT_NAME;
}

function getPodReason(pod) {
  const waitingReason = (pod.status?.containerStatuses || [])
    .map((container) => container.state?.waiting?.reason)
    .find(Boolean);

  return waitingReason || pod.status?.reason || pod.status?.phase || "Unknown";
}

app.get("/status", async (req, res) => {
  try {
    const output = await runKubectl("kubectl get pods -o json");
    const podList = JSON.parse(output);
    const pods = Array.isArray(podList.items) ? podList.items : [];
    const deploymentPods = pods.filter(isFoodWebPod);
    const activePods = deploymentPods.filter(isPodRunning);
    const failedPodItems = deploymentPods.filter((pod) => !isPodRunning(pod));
    const totalPods = activePods.length;
    const runningPods = activePods.length;
    const failedPods = failedPodItems.length;
    const health = totalPods === 0 ? 0 : Math.round((runningPods / totalPods) * 100);
    const status = totalPods > 0 && runningPods === totalPods ? "Healthy" : "Degraded";

    addEvent(
      "status",
      `${status}: ${runningPods}/${totalPods} active pods running, ${failedPods} failed pods detected.`,
      status === "Healthy" ? "success" : "warning"
    );

    res.json({
      status,
      totalPods,
      runningPods,
      failedPods,
      health,
      deployment: DEPLOYMENT_NAME,
      version: getImageVersion(activePods),
      failedPodDetails: failedPodItems.map((pod) => ({
        name: pod.metadata?.name || "unknown",
        phase: pod.status?.phase || "Unknown",
        reason: getPodReason(pod),
      })),
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    addEvent("error", `Status check failed: ${error.message}`, "error");
    res.status(500).json({
      status: "Degraded",
      totalPods: 0,
      runningPods: 0,
      failedPods: 0,
      health: 0,
      deployment: DEPLOYMENT_NAME,
      version: "unknown",
      failedPodDetails: [],
      lastUpdated: new Date().toISOString(),
      error: error.message,
    });
  }
});

app.get("/logs", (req, res) => {
  res.json({
    logs: events,
    lastUpdated: new Date().toISOString(),
  });
});

app.post("/cleanup", async (req, res) => {
  try {
    const output = await runKubectl("kubectl delete pod --field-selector=status.phase!=Running");
    const message = output.trim() || "No non-running pods found to clean up.";

    addEvent("recovery", `Cluster cleanup completed. ${message}`, "success");
    res.json({
      success: true,
      deployment: DEPLOYMENT_NAME,
      message,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    addEvent("error", `Cleanup failed: ${error.message}`, "error");
    res.status(500).json({
      success: false,
      deployment: DEPLOYMENT_NAME,
      message: "Failed to clean up non-running pods",
      error: error.message,
      lastUpdated: new Date().toISOString(),
    });
  }
});

app.post("/restart", async (req, res) => {
  try {
    const output = await runKubectl(`kubectl rollout restart deployment ${DEPLOYMENT_NAME}`);
    const message = output.trim() || `Restart triggered for deployment ${DEPLOYMENT_NAME}`;

    addEvent("restart", message, "success");
    res.json({
      success: true,
      deployment: DEPLOYMENT_NAME,
      message,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    addEvent("error", `Restart failed: ${error.message}`, "error");
    res.status(500).json({
      success: false,
      deployment: DEPLOYMENT_NAME,
      message: "Failed to restart deployment",
      error: error.message,
      lastUpdated: new Date().toISOString(),
    });
  }
});

addEvent("system", `DevOps Control Panel initialized for ${DEPLOYMENT_NAME}.`, "info");

app.listen(PORT, () => {
  console.log(`DevOps Control Panel running at http://localhost:${PORT}`);
});
