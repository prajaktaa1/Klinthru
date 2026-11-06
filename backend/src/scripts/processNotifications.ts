import { runNotificationScheduler } from "../superAdmin/notifications";
import { env } from "../config/env";

if (!env.notificationWorkerEnabled) {
  console.log("Notification worker disabled. Set NOTIFICATION_WORKER_ENABLED=true only after migration and workflow approval.");
  process.exit(0);
}

runNotificationScheduler().then(count => {
  console.log(`Processed ${count} due notification deliveries.`);
}).catch(error => {
  console.error(error instanceof Error ? error.message : "Notification scheduler failed.");
  process.exitCode = 1;
});
