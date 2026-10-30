import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "";
process.env.JWT_SECRET = "device-flow-test-secret";
process.env.SEED_ADMIN_PASSWORD = "device-flow-admin-password";
process.env.SEED_ENGINEER_PASSWORD = "device-flow-engineer-password";
process.env.SEED_VIEWER_PASSWORD = "device-flow-viewer-password";

async function run() {
  const [{ createApp }, { initializeStorage }] = await Promise.all([
    import("../app"),
    import("../data/store")
  ]);
  await initializeStorage();
  const server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@klinthru.local", password: "device-flow-admin-password" })
    });
    assert.equal(loginResponse.status, 200);
    const { token } = await loginResponse.json() as { token: string };
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const deviceInput = {
      deviceId: "FLOW-CHECK-001",
      deviceType: "Pressure Transmitter",
      pipelineOrLocation: "Unassigned",
      status: "Active",
      latestReadingOrState: "Not commissioned",
      unit: "bar"
    };

    const createResponse = await fetch(`${baseUrl}/api/devices`, {
      method: "POST", headers, body: JSON.stringify(deviceInput)
    });
    assert.equal(createResponse.status, 201);
    const created = await createResponse.json() as { deviceId: string; isDemoData: boolean };
    assert.equal(created.deviceId, deviceInput.deviceId);
    assert.equal(created.isDemoData, false, "Registration must always create real devices");

    const devicesResponse = await fetch(`${baseUrl}/api/devices`, { headers });
    assert.equal(devicesResponse.status, 200);
    const devices = await devicesResponse.json() as Array<{ deviceId: string; isDemoData: boolean }>;
    const assignable = devices.filter((device) => !device.isDemoData);
    assert.ok(assignable.some((device) => device.deviceId === deviceInput.deviceId));
    const demoDevices = devices.filter((device) => device.isDemoData);
    assert.ok(assignable.every((device) => !device.isDemoData));
    assert.deepEqual(
      assignable.map((device) => device.deviceId).sort(),
      devices.filter((device) => !device.isDemoData).map((device) => device.deviceId).sort(),
      "Assignable device selection must exclude demo records when demo records are present"
    );
    assert.ok(demoDevices.every((device) => !assignable.includes(device)));

    const assignmentResponse = await fetch(`${baseUrl}/api/sensor-assignments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        sensorId: deviceInput.deviceId,
        sensorCategory: "Internal Process Sensors",
        sensorName: deviceInput.deviceType,
        sensorDeviceType: deviceInput.deviceType,
        pipelineOrAsset: "Pipeline Test",
        installationLocation: "Section A",
        installationType: "Inline",
        valuesMeasured: "Pressure",
        measurementUnit: "bar",
        installationDate: "2026-09-15",
        dataSource: "Manual",
        assignmentStatus: "Active",
        notes: "Memory-only integration check"
      })
    });
    assert.equal(assignmentResponse.status, 201);
    const assignment = await assignmentResponse.json() as { sensorId: string; sensorName: string };
    assert.equal(assignment.sensorId, deviceInput.deviceId);
    assert.equal(assignment.sensorName, deviceInput.deviceType);

    const duplicateResponse = await fetch(`${baseUrl}/api/devices`, {
      method: "POST", headers, body: JSON.stringify(deviceInput)
    });
    assert.equal(duplicateResponse.status, 409);
    console.log("Device registration flow passed: register -> list -> exclude demo -> create assignment -> reject duplicate.");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

void run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
