import { currentUser } from "./auth.js";
import { getData, updateData, uid } from "./storage.js";
import { formatDate } from "./calendar.js";
import { toast } from "./ui.js";

export function checkReminders(showToast = false) {
  const user = currentUser(); if (!user) return;
  const now = Date.now(); const horizon = now + 24 * 3600000;
  const data = getData();
  const upcoming = data.appointments.filter(item => item.studentId === user.id && item.status === "Confirmed" && new Date(item.start).getTime() > now && new Date(item.start).getTime() <= horizon);
  const fresh = [];
  updateData(state => {
    for (const appointment of upcoming) {
      const hours = (new Date(appointment.start).getTime() - now) / 3600000;
      const threshold = hours <= 1 ? "1h" : "24h";
      const key = `${appointment.id}-${threshold}`;
      if (!state.notifications.some(note => note.key === key && note.userId === user.id)) {
        state.notifications.push({ id: uid("notice"), key, userId: user.id, appointmentId: appointment.id, text: `Session with ${state.advisors.find(a => a.id === appointment.advisorId)?.name || "your advisor"} ${threshold === "1h" ? "starts within an hour" : "is coming up within 24 hours"} (${formatDate(appointment.start)}).`, read: false, createdAt: new Date().toISOString() });
        fresh.push(state.notifications[state.notifications.length - 1]);
      }
    }
  });
  if (showToast && upcoming.length) toast(`You have ${upcoming.length} upcoming session${upcoming.length === 1 ? "" : "s"} in the next 24 hours.`);
  if ("Notification" in window && Notification.permission === "granted") {
    fresh.forEach(note => new Notification("LPU-AdvisorHUB session reminder", { body: note.text }));
  }
  return fresh;
}
export function remindersStart() { checkReminders(); setInterval(() => checkReminders(), 60000); }
export async function requestNotificationPermission() {
  if (!("Notification" in window)) { toast("Browser notifications are not supported here.", "error"); return; }
  const result = await Notification.requestPermission();
  toast(result === "granted" ? "Browser notifications enabled." : "Notification permission was not granted.", result === "granted" ? "success" : "error");
}
