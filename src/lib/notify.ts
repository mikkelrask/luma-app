import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

let permissionChecked = false;

export async function notifyJobDone(label: string, ok: boolean) {
  try {
    if (!permissionChecked) {
      permissionChecked = true;
      let granted = await isPermissionGranted();
      if (!granted) {
        granted = (await requestPermission()) === "granted";
      }
      if (!granted) return;
    }
    sendNotification({
      title: ok ? "Job finished" : "Job failed",
      body: `${label} ${ok ? "completed" : "failed"}.`,
    });
  } catch {
    /* notifications are best-effort */
  }
}