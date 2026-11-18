import { getData } from "./storage.js";
export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function availableSlots(advisor, date) {
  const day = DAYS[new Date(`${date}T12:00:00`).getDay()];
  const data = getData();
  const options = [...(advisor.availability || []).filter(slot => slot.day === day).map(slot => slot.time),
    ...(advisor.oneOff || []).filter(slot => slot.date === date).map(slot => slot.time)].filter((time, index, list) => list.indexOf(time) === index);
  const blocked = (advisor.blockedDays || []).includes(date);
  return options.sort().map(time => {
    const start = new Date(`${date}T${time}:00`);
    const booked = data.appointments.some(item => item.advisorId === advisor.id && item.start === start.toISOString() && !["Cancelled", "Declined"].includes(item.status));
    return { time, disabled: blocked || booked || start <= new Date() };
  });
}
export function formatDate(value, options = { dateStyle: "medium", timeStyle: "short" }) { return new Intl.DateTimeFormat(undefined, options).format(new Date(value)); }
export function downloadIcs(appointment, advisor, student) {
  const start = new Date(appointment.start), end = new Date(start.getTime() + 30 * 60000);
  const stamp = date => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const escape = text => String(text || "").replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
  const content = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//LPU AdvisorHUB//EN", "BEGIN:VEVENT", `UID:${appointment.id}@lpu-advisorhub`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${escape(`Advisor session with ${advisor?.name || "Advisor"}`)}`, `DESCRIPTION:${escape(`${appointment.reason}: ${appointment.details || ""} (Student: ${student?.name || "Student"})`)}`, `LOCATION:${escape(appointment.mode)}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "advisor-session.ics"; link.click(); URL.revokeObjectURL(link.href);
}
export function monthGrid(year, month) {
  const first = new Date(year, month, 1); const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; });
}
