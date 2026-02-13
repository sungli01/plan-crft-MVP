/**
 * Persist generation state in localStorage so users can leave and come back.
 */

const STORAGE_KEY = "plancraft_generating";

export interface GeneratingState {
  projectId: string;
  projectTitle?: string;
  startedAt: string; // ISO
  status: "generating" | "completed" | "failed";
}

export function saveGeneratingState(state: GeneratingState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota exceeded etc – ignore
  }
}

export function loadGeneratingState(): GeneratingState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const state: GeneratingState = JSON.parse(raw);
    // Expire after 30 minutes
    if (Date.now() - new Date(state.startedAt).getTime() > 30 * 60 * 1000) {
      clearGeneratingState();
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

export function clearGeneratingState() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Request browser notification permission and show a notification.
 */
export function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

export function showBrowserNotification(title: string, body: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon: "/favicon.ico" });
    } catch {
      // Safari / mobile may throw
    }
  }
}
