import { getData, updateData } from "./storage.js";

const SESSION_KEY = "lpu-advisorhub-session";
// Demo-only authentication stores credentials in the browser; real apps need a secure backend and password hashing.
export function currentUser() {
  const id = localStorage.getItem(SESSION_KEY);
  return id ? getData().users.find(user => user.id === id && user.active !== false) || null : null;
}
export function login(email, password, role) {
  const user = getData().users.find(item => item.email.toLowerCase() === email.trim().toLowerCase() && item.password === password && item.role === role && item.active !== false);
  if (!user) throw new Error("We couldn't match those details to an active account.");
  if (user.approved === false) throw new Error("This account is awaiting admin approval.");
  localStorage.setItem(SESSION_KEY, user.id);
  return user;
}
export function register(values) {
  let createdUser;
  updateData(data => {
    if (data.users.some(item => item.email.toLowerCase() === values.email.trim().toLowerCase())) throw new Error("An account with this email already exists.");
    const newUser = { id: `user-${Date.now().toString(36)}`, name: values.name.trim(), email: values.email.trim().toLowerCase(), password: values.password, role: values.role, active: true, approved: values.role !== "teacher", createdAt: new Date().toISOString() };
    if (values.role === "teacher") Object.assign(newUser, { subject: values.subject.trim(), bio: values.bio.trim(), qualifications: values.qualifications.trim() });
    data.users.push(newUser);
    if (values.role === "teacher") data.advisors.push({ id: `advisor-${newUser.id}`, teacherId: newUser.id, name: newUser.name, subject: newUser.subject, experience: 0, rating: 0, bio: newUser.bio, qualifications: [newUser.qualifications], availability: [], oneOff: [], blockedDays: [], approved: false, active: true });
    createdUser = newUser;
  });
  return createdUser;
}
export function logout() { localStorage.removeItem(SESSION_KEY); }
export function dashboardFor(role) { return ({ student: "student-dashboard.html", teacher: "teacher-dashboard.html", admin: "admin-dashboard.html" })[role] || "login.html"; }
export function guard(page) {
  const user = currentUser();
  const required = page === "student-dashboard" || page === "appointments" || page === "calendar" || page === "profile" ? "student" :
    page === "teacher-dashboard" ? "teacher" : page === "admin-dashboard" ? "admin" : null;
  if (required && (!user || user.role !== required)) return dashboardFor(user?.role);
  return null;
}
