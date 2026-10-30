const { execSync } = require("node:child_process");

const PORTS = [4000, 4002];

function listListeningPids(port) {
  try {
    const output = execSync(`netstat -ano -p tcp`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });

    return [...new Set(
      output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.includes("LISTENING"))
        .filter((line) => line.includes(`:${port}`))
        .map((line) => line.split(/\s+/).at(-1))
        .filter((value) => value && /^\d+$/.test(value))
    )];
  } catch (error) {
    console.warn(`Could not inspect port ${port}: ${error.message}`);
    return [];
  }
}

function stopPid(pid, port) {
  try {
    execSync(`taskkill /PID ${pid} /F`, {
      stdio: ["ignore", "ignore", "ignore"]
    });
    console.log(`Freed port ${port} by stopping PID ${pid}.`);
  } catch (error) {
    console.warn(`Could not stop PID ${pid} on port ${port}: ${error.message}`);
  }
}

for (const port of PORTS) {
  const pids = listListeningPids(port);
  if (pids.length === 0) {
    console.log(`Port ${port} is available.`);
    continue;
  }

  for (const pid of pids) {
    stopPid(pid, port);
  }
}
