import { getData, updateData, uid, resetData } from "./storage.js";
import { currentUser, login, logout, register, dashboardFor, guard } from "./auth.js";
import { initTheme, toggleTheme } from "./theme.js";
import { availableSlots, formatDate, monthGrid, downloadIcs } from "./calendar.js";
import { checkReminders, remindersStart, requestNotificationPermission } from "./reminders.js";
import { toast, modal } from "./ui.js";

initTheme();
const root = document.querySelector("#app");
const page = document.body.dataset.page || "home";
const redirect = guard(page);

const pageFiles = {
  home: "../index.html", "login.html": "login.html", "register.html": "register.html", "advisors.html": "advisors.html",
  "advisor-profile.html": "advisor-profile.html", "booking.html": "booking.html", "student-dashboard.html": "student-dashboard.html",
  "appointments.html": "appointments.html", "calendar.html": "calendar.html", "teacher-dashboard.html": "teacher-dashboard.html",
  "admin-dashboard.html": "admin-dashboard.html", "about.html": "about.html", "feedback.html": "feedback.html",
  "profile.html": "profile.html", "404.html": "404.html"
};
function linkTo(target, params = {}) {
  const file = pageFiles[target] || target;
  const url = new URL(location.href);
  const inside = /\/pages\//.test(url.pathname);
  let base = inside ? file : (target === "home" ? "index.html" : `pages/${file}`);
  if (inside && target === "home") base = "../index.html";
  const query = new URLSearchParams(params).toString();
  return `${base}${query ? `?${query}` : ""}`;
}
if (redirect) location.replace(linkTo(redirect));
else { renderShell(); renderPage(); remindersStart(); }
function esc(value = "") { return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }
function initials(name = "Advisor") { return name.split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase(); }
function findAdvisor(id) { return getData().advisors.find(advisor => advisor.id === id); }
function statusClass(status) { return `status-${String(status).toLowerCase()}`; }
function statusBadge(status) { return `<span class="badge ${statusClass(status)}">${esc(status)}</span>`; }
function advisorLink(advisor) { return linkTo("advisor-profile.html", { id: advisor.id }); }
function loggedInUser() { return currentUser(); }

function renderShell() {
  const activeUser = loggedInUser();
  const dashboard = activeUser ? dashboardFor(activeUser.role) : "login.html";
  const notifications = activeUser ? getData().notifications.filter(note => note.userId === activeUser.id) : [];
  const unread = notifications.filter(note => !note.read).length;
  root.innerHTML = `
    <header class="site-header"><div class="container header-inner">
      <a class="brand" href="${linkTo("home")}"><span class="brand-mark" aria-hidden="true">L</span><span>LPU-Advisor<span class="brand-accent">HUB</span></span></a>
      <button class="nav-toggle icon-button" aria-label="Open navigation" aria-expanded="false">☰</button>
      <nav class="main-nav" aria-label="Main navigation">
        <a href="${linkTo("advisors.html")}">Find an advisor</a>
        ${activeUser ? `<a href="${linkTo(dashboard)}">Dashboard</a><a href="${linkTo("appointments.html")}">Appointments</a>` : `<a href="${linkTo("about.html")}">About</a>`}
        <a href="${linkTo("feedback.html")}">Feedback</a>
      </nav>
      <div class="header-actions">
        <button class="icon-button notification-button" aria-label="Notifications, ${unread} unread" aria-expanded="false" data-action="notifications">♧${unread ? `<span class="notification-count">${unread}</span>` : ""}</button>
        <button class="icon-button" aria-label="Toggle color theme" title="Toggle color theme" data-action="theme">◐</button>
        ${activeUser ? `<a class="header-user" href="${linkTo("profile.html")}">${esc(activeUser.name.split(" ")[0])}</a><button class="button button-small button-secondary" data-action="logout">Log out</button>` : `<a class="button button-small button-secondary" href="${linkTo("login.html")}">Log in</a>`}
      </div>
      <div class="notification-panel" hidden><div class="notification-head"><strong>Notifications</strong><button class="text-button" data-action="read-notifications">Mark all read</button></div>
        ${notifications.length ? notifications.slice().reverse().slice(0, 8).map(note => `<div class="notification-item ${note.read ? "" : "unread"}">${esc(note.text)}</div>`).join("") : `<p class="muted small">You're all caught up.</p>`}
        <button class="text-button" data-action="browser-notifications">Enable browser notifications</button>
      </div>
    </div></header>
    <main id="main-content" class="container page-main"></main>
    <footer class="site-footer"><div class="container footer-inner"><a class="brand footer-brand" href="${linkTo("home")}"><span class="brand-mark">L</span><span>LPU-Advisor<span class="brand-accent">HUB</span></span></a><p>Practical guidance for your next step.</p><div class="footer-links"><a href="${linkTo("about.html")}">About</a><a href="${linkTo("feedback.html")}">Feedback</a><a href="${linkTo("profile.html")}">Your profile</a></div><small>© ${new Date().getFullYear()} LPU-AdvisorHUB · Demo experience</small></div></footer>`;
  const toggle = root.querySelector(".nav-toggle");
  toggle.addEventListener("click", () => { const nav = root.querySelector(".main-nav"); const expanded = toggle.getAttribute("aria-expanded") === "true"; toggle.setAttribute("aria-expanded", String(!expanded)); nav.classList.toggle("nav-open", !expanded); });
}

function advisorCard(advisor) {
  return `<article class="card advisor-card"><a class="avatar avatar-large" href="${advisorLink(advisor)}" aria-label="View ${esc(advisor.name)} profile">${initials(advisor.name)}</a><div class="advisor-card-content"><div class="card-topline"><span class="eyebrow">${esc(advisor.subject)}</span><span class="rating">★ ${Number(advisor.rating || 0).toFixed(1)}</span></div><h3><a href="${advisorLink(advisor)}">${esc(advisor.name)}</a></h3><p class="muted">${esc(advisor.bio)}</p><div class="advisor-meta"><span>${advisor.experience || "New"} ${advisor.experience === 1 ? "year" : "years"} experience</span><span>30 min · Online or in-person</span></div><a class="button button-secondary button-full" href="${advisorLink(advisor)}">View profile</a></div></article>`;
}
function getAppointmentsFor(userId) { return getData().appointments.filter(item => item.studentId === userId); }
function appointmentCard(item, opts = {}) {
  const data = getData(); const advisor = data.advisors.find(a => a.id === item.advisorId); const student = data.users.find(u => u.id === item.studentId);
  const canCancel = !["Completed", "Cancelled", "Declined"].includes(item.status) && new Date(item.start).getTime() - Date.now() >= 2 * 3600000;
  return `<article class="card appointment-card"><div class="appointment-card-head"><div><p class="eyebrow">${opts.teacher ? `Student: ${esc(student?.name || "Unknown")}` : `Advisor: ${esc(advisor?.name || "Unknown")}`}</p><h3>${esc(item.reason)}</h3></div>${statusBadge(item.status)}</div><p class="appointment-date">${formatDate(item.start)}</p><p class="muted">${esc(item.mode)} · ${esc(item.details)}</p>
    ${item.notes && item.status === "Completed" ? `<p class="note-preview"><strong>Session notes:</strong> ${esc(item.notes)}</p>` : ""}
    <div class="button-row compact"><button class="button button-small button-secondary" data-action="appointment-details" data-id="${item.id}">Details</button>
    ${item.status === "Confirmed" || item.status === "Pending" ? `<button class="button button-small button-secondary" data-action="add-calendar" data-id="${item.id}">Add to calendar</button>` : ""}
    ${opts.teacher && item.status === "Pending" ? `<button class="button button-small button-primary" data-action="accept" data-id="${item.id}">Accept</button><button class="button button-small button-danger" data-action="decline" data-id="${item.id}">Decline</button>` : ""}
    ${opts.teacher && item.status === "Confirmed" ? `<button class="button button-small button-primary" data-action="complete" data-id="${item.id}">Mark completed</button><button class="button button-small button-secondary" data-action="session-notes" data-id="${item.id}">Add notes</button>` : ""}
    ${canCancel && !opts.teacher ? `<button class="button button-small button-danger" data-action="cancel-booking" data-id="${item.id}">Cancel</button><a class="button button-small button-secondary" href="${linkTo("booking.html", { advisor: item.advisorId })}">Reschedule</a>` : ""}
    </div></article>`;
}

function renderPage() {
  const main = root.querySelector("#main-content");
  const views = {
    home: renderHome, login: renderLogin, register: renderRegister, advisors: renderAdvisors, "advisor-profile": renderAdvisorProfile,
    booking: renderBooking, "student-dashboard": renderStudentDashboard, appointments: renderAppointments, calendar: renderCalendar,
    "teacher-dashboard": renderTeacherDashboard, "admin-dashboard": renderAdminDashboard, about: renderAbout, feedback: renderFeedback,
    profile: renderProfile, "404": renderNotFound
  };
  (views[page] || renderNotFound)(main);
}

function renderHome(main) {
  const advisors = getData().advisors.filter(a => a.active && a.approved).slice(0, 3);
  main.innerHTML = `<section class="hero"><div class="hero-copy"><span class="eyebrow">Your next step starts here</span><h1>Make progress with the right guidance.</h1><p>Book one-on-one sessions with experienced LPU advisors for academics, careers, projects, and more.</p><div class="button-row"><a href="${linkTo("advisors.html")}" class="button button-cta">Book a session</a><a href="${linkTo("login.html")}" class="button button-secondary">Log in</a></div><div class="trust-line"><span>✓ No-cost demo bookings</span><span>✓ Flexible session modes</span></div></div><div class="hero-panel"><div class="hero-panel-icon">✦</div><p class="eyebrow">Advice that moves you forward</p><h2>One conversation can make a difference.</h2><p class="muted">Choose an advisor, find a time that works, and focus on what matters to you.</p><a class="text-link" href="${linkTo("about.html")}">How it works <span aria-hidden="true">→</span></a></div></section>
  <section class="section-block"><div class="section-heading"><div><span class="eyebrow">Simple by design</span><h2>How it works</h2></div><a class="text-link" href="${linkTo("about.html")}">Learn more →</a></div><div class="steps-grid"><article class="step-card"><span class="step-number">01</span><h3>Find your advisor</h3><p>Explore advisors by subject, expertise, availability, and student ratings.</p></article><article class="step-card"><span class="step-number">02</span><h3>Choose a time</h3><p>Pick an available slot, meeting format, and the topic you want to discuss.</p></article><article class="step-card"><span class="step-number">03</span><h3>Make it count</h3><p>Get a reminder, meet your advisor, and leave with a practical next step.</p></article></div></section>
  <section class="section-block"><div class="section-heading"><div><span class="eyebrow">Meet your guides</span><h2>Featured advisors</h2></div><a class="text-link" href="${linkTo("advisors.html")}">See all advisors →</a></div><div class="advisor-grid">${advisors.map(advisorCard).join("")}</div></section>
  <section class="cta-strip"><div><span class="eyebrow">Start when you're ready</span><h2>Small steps can open new doors.</h2></div><a href="${linkTo("advisors.html")}" class="button button-cta">Book a session</a></section>
  <section class="section-block link-section"><h2>Explore LPU-AdvisorHUB</h2><div class="quick-link-grid"><a class="quick-link-card" href="${linkTo("about.html")}"><strong>About us</strong><span>Our mission and approach →</span></a><a class="quick-link-card" href="${linkTo("feedback.html")}"><strong>Feedback</strong><span>Share your experience →</span></a><a class="quick-link-card" href="${linkTo("login.html")}"><strong>Login</strong><span>Continue to your account →</span></a><a class="quick-link-card" href="${linkTo("register.html")}"><strong>Register</strong><span>Create your account →</span></a></div></section>`;
}

function renderLogin(main) {
  main.innerHTML = `<div class="auth-layout"><section class="auth-aside"><span class="eyebrow">Welcome back</span><h1>Good guidance starts with a conversation.</h1><p>Sign in to manage your sessions and keep your next step in view.</p><div class="demo-box"><strong>Demo credentials</strong><span>Student: student@demo.com / student123</span><span>Teacher: teacher@demo.com / teacher123</span><span>Admin: admin@demo.com / admin123</span></div></section><section class="card form-card"><h2>Log in</h2><p class="muted">Use your LPU-AdvisorHUB account.</p><form id="login-form" novalidate><div class="field"><label for="login-role">I am a</label><select id="login-role" name="role" required><option value="student">Student</option><option value="teacher">Teacher / Advisor</option><option value="admin">Admin</option></select></div><div class="field"><label for="login-email">Email address</label><input id="login-email" name="email" type="email" autocomplete="username" required></div><div class="field"><label for="login-password">Password</label><input id="login-password" name="password" type="password" autocomplete="current-password" required></div><p class="form-message" aria-live="polite"></p><button class="button button-primary button-full" type="submit">Log in</button></form><p class="form-foot">New here? <a href="${linkTo("register.html")}">Create an account</a></p><p class="small muted">Demo only: passwords are stored in this browser. Real apps need a secure backend and password hashing.</p></section></div>`;
}
function renderRegister(main) {
  main.innerHTML = `<div class="narrow-layout"><section class="page-heading"><span class="eyebrow">Join the community</span><h1>Create your account</h1><p>Students can book sessions. Teachers can apply to share their expertise.</p></section><section class="card form-card"><form id="register-form" novalidate><div class="field"><label for="reg-role">Account type</label><select name="role" id="reg-role"><option value="student">Student</option><option value="teacher">Teacher / Advisor</option></select></div><div class="field"><label for="reg-name">Full name</label><input id="reg-name" name="name" autocomplete="name" required minlength="2"></div><div class="field"><label for="reg-email">Email address</label><input id="reg-email" name="email" type="email" autocomplete="email" required></div><div class="field"><label for="reg-password">Password</label><input id="reg-password" name="password" type="password" minlength="6" autocomplete="new-password" required><small>Use at least 6 characters.</small></div><div class="teacher-fields" hidden><div class="field"><label for="reg-subject">Subject / expertise</label><input id="reg-subject" name="subject"></div><div class="field"><label for="reg-bio">Short bio</label><textarea id="reg-bio" name="bio" rows="3"></textarea></div><div class="field"><label for="reg-qualifications">Qualifications</label><input id="reg-qualifications" name="qualifications"></div><p class="small muted">Teacher profiles need admin approval before they appear to students.</p></div><p class="form-message" aria-live="polite"></p><button class="button button-primary button-full" type="submit">Create account</button></form><p class="form-foot">Already registered? <a href="${linkTo("login.html")}">Log in</a></p></section></div>`;
}

function renderAdvisors(main) {
  const advisors = getData().advisors.filter(a => a.active && a.approved);
  const subjects = [...new Set(advisors.map(a => a.subject))].sort();
  main.innerHTML = `<section class="page-heading"><span class="eyebrow">Find your guide</span><h1>Meet the advisors</h1><p>Browse by expertise, availability, and student rating.</p></section><section class="filter-panel card"><div class="field"><label for="advisor-search">Search advisors</label><input id="advisor-search" type="search" placeholder="Name, subject, or expertise"></div><div class="field"><label for="advisor-subject">Subject</label><select id="advisor-subject"><option value="">All subjects</option>${subjects.map(s => `<option>${esc(s)}</option>`).join("")}</select></div><div class="field"><label for="advisor-availability">Availability</label><select id="advisor-availability"><option value="">Any day</option>${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(day => `<option value="${day}">${day}</option>`).join("")}</select></div><div class="field"><label for="advisor-rating">Minimum rating</label><select id="advisor-rating"><option value="0">Any rating</option><option value="4.5">4.5+</option><option value="4">4.0+</option></select></div></section><p id="advisor-result-count" class="muted small"></p><div id="advisor-results" class="advisor-grid"></div>`;
  const update = () => {
    const query = main.querySelector("#advisor-search").value.toLowerCase();
    const subject = main.querySelector("#advisor-subject").value; const day = main.querySelector("#advisor-availability").value; const rating = Number(main.querySelector("#advisor-rating").value);
    const filtered = advisors.filter(a => (!query || `${a.name} ${a.subject} ${a.bio}`.toLowerCase().includes(query)) && (!subject || a.subject === subject) && (!day || a.availability.some(slot => slot.day === day)) && a.rating >= rating);
    main.querySelector("#advisor-results").innerHTML = filtered.length ? filtered.map(advisorCard).join("") : `<div class="empty-state"><span class="empty-icon">⌕</span><h3>No advisors match those filters</h3><p>Try a different search or clear a filter.</p></div>`;
    main.querySelector("#advisor-result-count").textContent = `${filtered.length} advisor${filtered.length === 1 ? "" : "s"} available`;
  };
  main.querySelectorAll("#advisor-search,#advisor-subject,#advisor-availability,#advisor-rating").forEach(el => el.addEventListener(el.tagName === "INPUT" ? "input" : "change", update)); update();
}

function renderAdvisorProfile(main) {
  const advisor = findAdvisor(new URLSearchParams(location.search).get("id")) || getData().advisors.find(a => a.active && a.approved);
  if (!advisor) { renderNotFound(main); return; }
  const reviews = getData().feedback.filter(item => item.visible && (item.category === "Advisor" || item.category === "Session"));
  const slots = [...new Set((advisor.availability || []).map(s => s.day))].map(day => `<span class="availability-chip">${day}</span>`).join("");
  main.innerHTML = `<div class="profile-layout"><section class="card advisor-profile-card"><div class="profile-identity"><div class="avatar avatar-xl">${initials(advisor.name)}</div><div><span class="eyebrow">${esc(advisor.subject)}</span><h1>${esc(advisor.name)}</h1><div class="rating">★ ${Number(advisor.rating || 0).toFixed(1)} <span class="muted">· ${reviews.length} student reviews</span></div></div></div><p>${esc(advisor.bio)}</p><div class="profile-facts"><div><span class="eyebrow">Experience</span><strong>${advisor.experience} years</strong></div><div><span class="eyebrow">Session length</span><strong>30 minutes</strong></div><div><span class="eyebrow">Format</span><strong>Online or in-person</strong></div></div><h2>About ${esc(advisor.name.split(" ")[0])}</h2><p>${esc(advisor.qualifications?.join ? advisor.qualifications.join(" · ") : advisor.qualifications || "LPU advisor")}</p><h2>Weekly availability</h2><div class="availability-list">${slots || `<span class="muted">New availability is being added.</span>`}</div><h2>Student feedback</h2>${reviews.length ? reviews.slice(0, 3).map(review => `<blockquote class="review"><span class="rating">${"★".repeat(review.rating)}</span><p>${esc(review.message)}</p></blockquote>`).join("") : `<p class="muted">Be the first to share feedback after a session.</p>`}</section><aside class="card booking-aside"><span class="eyebrow">Ready to get started?</span><h2>Book a session</h2><p class="muted">Select a time that suits you. You can meet online or in person.</p><a href="${linkTo("booking.html", { advisor: advisor.id })}" class="button button-cta button-full">Book a session</a><p class="small muted">Sessions are 30 minutes. Cancellation is available up to 2 hours before start.</p></aside></div>`;
}

function renderBooking(main) {
  const data = getData(); const advisorParam = new URLSearchParams(location.search).get("advisor");
  const advisors = data.advisors.filter(a => a.active && a.approved);
  if (!loggedInUser()) { main.innerHTML = `<section class="empty-state"><h1>Log in to book a session</h1><p>Student accounts can reserve available advisor sessions.</p><a class="button button-primary" href="${linkTo("login.html")}">Log in</a></section>`; return; }
  if (loggedInUser().role !== "student") { main.innerHTML = `<section class="empty-state"><h1>Student booking</h1><p>Booking sessions is available from a student account.</p><a href="${linkTo(dashboardFor(loggedInUser().role))}" class="button button-secondary">Go to dashboard</a></section>`; return; }
  main.innerHTML = `<section class="page-heading"><span class="eyebrow">Plan your session</span><h1>Book an advisor</h1><p>Choose an available slot and tell your advisor what you'd like to work on.</p></section><section class="card form-card booking-form-card"><form id="booking-form" novalidate><div class="form-grid"><div class="field"><label for="book-advisor">Advisor</label><select id="book-advisor" name="advisor" required><option value="">Choose an advisor</option>${advisors.map(a => `<option value="${a.id}" ${a.id === advisorParam ? "selected" : ""}>${esc(a.name)} · ${esc(a.subject)}</option>`).join("")}</select></div><div class="field"><label for="book-date">Date</label><input id="book-date" name="date" type="date" required min="${new Date().toISOString().slice(0, 10)}"></div></div><div class="field"><label for="book-time">Available time</label><select id="book-time" name="time" required disabled><option value="">Choose an advisor and date first</option></select></div><div class="form-grid"><div class="field"><label for="book-mode">Meeting mode</label><select id="book-mode" name="mode"><option>Online</option><option>In-person</option></select></div><div class="field"><label for="book-reason">Meeting reason</label><select id="book-reason" name="reason" required>${["Academic doubt","Career guidance","Project help","Placement prep","Personal development","Other"].map(r => `<option>${r}</option>`).join("")}</select></div></div><div class="field"><label for="book-details">Specific requirements or details</label><textarea id="book-details" name="details" rows="4" required minlength="10" placeholder="What would you like your advisor to know before you meet?"></textarea><small>At least 10 characters so your advisor can prepare.</small></div><div id="booking-summary" class="summary-box" hidden></div><p class="form-message" aria-live="polite"></p><button class="button button-cta" type="submit">Review and confirm booking</button></form></section>`;
  const advisorInput = main.querySelector("#book-advisor"), dateInput = main.querySelector("#book-date"), timeInput = main.querySelector("#book-time");
  const slotsUpdate = () => {
    const advisor = findAdvisor(advisorInput.value);
    if (!advisor || !dateInput.value) { timeInput.innerHTML = `<option value="">Choose an advisor and date first</option>`; timeInput.disabled = true; return; }
    const slots = availableSlots(advisor, dateInput.value);
    timeInput.innerHTML = `<option value="">Select a time</option>${slots.map(slot => `<option value="${slot.time}" ${slot.disabled ? "disabled" : ""}>${slot.time}${slot.disabled ? " · unavailable" : ""}</option>`).join("")}`;
    timeInput.disabled = !slots.some(slot => !slot.disabled);
    if (timeInput.disabled) timeInput.innerHTML = `<option value="">No available slots on this date</option>`;
  };
  advisorInput.addEventListener("change", slotsUpdate); dateInput.addEventListener("change", slotsUpdate); slotsUpdate();
}

function renderStudentDashboard(main) {
  const active = loggedInUser(); const all = getAppointmentsFor(active.id); const upcoming = all.filter(a => ["Pending","Confirmed"].includes(a.status) && new Date(a.start) > new Date()).sort((a,b) => new Date(a.start)-new Date(b.start));
  const next = upcoming[0]; const completed = all.filter(a => a.status === "Completed").length; const advisorCount = getData().advisors.filter(a => a.active && a.approved).length;
  main.innerHTML = `<section class="dashboard-welcome"><div><span class="eyebrow">Student dashboard</span><h1>Good to see you, ${esc(active.name.split(" ")[0])}.</h1><p class="muted">Keep your plans moving with a little guidance.</p></div><a class="button button-cta" href="${linkTo("advisors.html")}">Book a session</a></section><div class="stats-grid"><article class="stat-card"><span>Upcoming sessions</span><strong>${upcoming.length}</strong><small>Scheduled or awaiting confirmation</small></article><article class="stat-card"><span>Sessions completed</span><strong>${completed}</strong><small>Your progress, one conversation at a time</small></article><article class="stat-card"><span>Advisors available</span><strong>${advisorCount}</strong><small>Across different areas of expertise</small></article></div>${next ? `<section class="next-session card"><div><span class="eyebrow">Next session · ${esc(findAdvisor(next.advisorId)?.name || "Advisor")}</span><h2>${formatDate(next.start)}</h2><p>${esc(next.reason)} · ${esc(next.mode)}</p></div><div class="countdown" data-countdown="${next.start}"></div></section>` : `<div class="empty-inline"><strong>No upcoming sessions yet.</strong><a href="${linkTo("advisors.html")}">Find an advisor →</a></div>`}<section class="section-block dashboard-section"><div class="section-heading"><h2>Your upcoming sessions</h2><a class="text-link" href="${linkTo("appointments.html")}">View appointment history →</a></div><div class="appointment-grid">${upcoming.length ? upcoming.map(item => appointmentCard(item)).join("") : `<div class="empty-state"><h3>Your next step starts here.</h3><p>Book a session with an advisor when you're ready.</p><a class="button button-primary" href="${linkTo("advisors.html")}">Explore advisors</a></div>`}</div></section><section class="section-block"><div class="section-heading"><h2>Quick links</h2></div><div class="quick-link-grid"><a class="quick-link-card" href="${linkTo("calendar.html")}"><strong>My calendar</strong><span>See your sessions by date →</span></a><a class="quick-link-card" href="${linkTo("profile.html")}"><strong>Edit profile</strong><span>Keep your account up to date →</span></a><a class="quick-link-card" href="${linkTo("feedback.html")}"><strong>Share feedback</strong><span>Help us improve the experience →</span></a></div></section>`;
  updateCountdowns();
}

function renderAppointments(main) {
  const active = loggedInUser(); const appointments = getAppointmentsFor(active.id);
  const advisors = [...new Set(appointments.map(a => a.advisorId))].map(findAdvisor).filter(Boolean);
  main.innerHTML = `<section class="page-heading"><span class="eyebrow">Your sessions</span><h1>Appointment history</h1><p>Review upcoming and past sessions in one place.</p></section><section class="filter-panel card history-filters"><div class="field"><label for="history-search">Search</label><input id="history-search" type="search" placeholder="Advisor, reason, or details"></div><div class="field"><label for="history-status">Status</label><select id="history-status"><option value="">All statuses</option>${["Pending","Confirmed","Completed","Cancelled","Declined"].map(s=>`<option>${s}</option>`).join("")}</select></div><div class="field"><label for="history-advisor">Advisor</label><select id="history-advisor"><option value="">All advisors</option>${advisors.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join("")}</select></div><div class="field"><label for="history-from">From</label><input id="history-from" type="date"></div><div class="field"><label for="history-to">To</label><input id="history-to" type="date"></div><div class="field"><label for="history-sort">Sort</label><select id="history-sort"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></div></section><div id="history-results" class="appointment-grid"></div>`;
  const update = () => {
    const query = main.querySelector("#history-search").value.toLowerCase(), status = main.querySelector("#history-status").value, advisorId = main.querySelector("#history-advisor").value, from = main.querySelector("#history-from").value, to = main.querySelector("#history-to").value;
    const sort = main.querySelector("#history-sort").value;
    const matches = appointments.filter(item => {
      const advisor = findAdvisor(item.advisorId);
      return (!status || item.status === status) && (!advisorId || item.advisorId === advisorId) && (!query || `${advisor?.name} ${item.reason} ${item.details}`.toLowerCase().includes(query)) && (!from || item.start.slice(0,10) >= from) && (!to || item.start.slice(0,10) <= to);
    }).sort((a,b) => (new Date(a.start)-new Date(b.start)) * (sort === "newest" ? -1 : 1));
    main.querySelector("#history-results").innerHTML = matches.length ? matches.map(item => appointmentCard(item)).join("") : `<div class="empty-state"><h3>No sessions found</h3><p>Try changing a filter, or book your first appointment.</p><a href="${linkTo("advisors.html")}" class="button button-secondary">Browse advisors</a></div>`;
  };
  main.querySelectorAll(".history-filters input,.history-filters select").forEach(el => el.addEventListener(el.tagName === "INPUT" && el.type === "search" ? "input" : "change", update)); update();
}

let calendarCursor = new Date();
function renderCalendar(main) {
  const active = loggedInUser();
  main.innerHTML = `<section class="page-heading"><span class="eyebrow">Plan your time</span><h1>Session calendar</h1><p>See your appointments by month or focus on this week's schedule.</p></section><div class="calendar-toolbar"><div class="button-row"><button class="button button-secondary button-small" data-action="calendar-prev" aria-label="Previous month">←</button><button class="button button-secondary button-small" data-action="calendar-today">Today</button><button class="button button-secondary button-small" data-action="calendar-next" aria-label="Next month">→</button></div><h2 id="calendar-month-label"></h2><div class="button-row"><button class="button button-small button-secondary" data-action="calendar-view" data-view="month">Month</button><button class="button button-small button-secondary" data-action="calendar-view" data-view="week">Week</button></div></div><div id="calendar-container" class="card calendar-card"></div><div class="calendar-legend"><span><i class="legend-dot status-confirmed"></i>Confirmed</span><span><i class="legend-dot status-pending"></i>Pending</span><span><i class="legend-dot status-completed"></i>Completed</span><span><i class="legend-dot status-cancelled"></i>Cancelled / declined</span></div>`;
  renderCalendarGrid(main, active, "month");
}
function renderCalendarGrid(main, active, view) {
  main.dataset.calendarView = view;
  const label = main.querySelector("#calendar-month-label"); const box = main.querySelector("#calendar-container");
  label.textContent = calendarCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  let appointments = getData().appointments.filter(item => active.role === "student" ? item.studentId === active.id : item.advisorId && getData().advisors.find(a => a.id === item.advisorId)?.teacherId === active.id);
  if (view === "week") {
    const start = new Date(calendarCursor); start.setDate(start.getDate() - start.getDay()); start.setHours(0,0,0,0);
    const dates = Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d;});
    box.innerHTML = `<div class="week-list">${dates.map(day => { const key = day.toDateString(); const items=appointments.filter(item=>new Date(item.start).toDateString()===key).sort((a,b)=>new Date(a.start)-new Date(b.start)); return `<section class="week-day"><h3>${day.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"})}${key===new Date().toDateString()?` <span class="today-label">Today</span>`:""}</h3>${items.length?items.map(item=>calendarEvent(item,active)).join(""):`<p class="muted small">No sessions</p>`}</section>`;}).join("")}</div>`;
    return;
  }
  const dates = monthGrid(calendarCursor.getFullYear(), calendarCursor.getMonth());
  box.innerHTML = `<div class="month-grid">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(day=>`<div class="calendar-weekday">${day}</div>`).join("")}${dates.map(day=>{const key=day.toDateString();const events=appointments.filter(item=>new Date(item.start).toDateString()===key);return `<div class="calendar-day ${day.getMonth()!==calendarCursor.getMonth()?"outside-month":""} ${key===new Date().toDateString()?"today":""}"><span class="day-number">${day.getDate()}</span>${events.slice(0,3).map(item=>calendarEvent(item,active)).join("")}${events.length>3?`<span class="more-events">+${events.length-3} more</span>`:""}</div>`;}).join("")}</div>`;
}
function calendarEvent(item, active) {
  const data = getData(), advisor = data.advisors.find(a=>a.id===item.advisorId), student = data.users.find(u=>u.id===item.studentId);
  return `<button class="calendar-event ${statusClass(item.status)}" data-action="calendar-details" data-id="${item.id}" title="${esc(item.reason)}">${new Date(item.start).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})} · ${esc(active.role==="student"?advisor?.name||"Advisor":student?.name||"Student")}</button>`;
}

function renderTeacherDashboard(main) {
  const active = loggedInUser(); const data = getData(); const advisor = data.advisors.find(a=>a.teacherId===active.id);
  const incoming = data.appointments.filter(item=>advisor && item.advisorId===advisor.id).sort((a,b)=>new Date(a.start)-new Date(b.start));
  const pending = incoming.filter(a=>a.status==="Pending").length;
  main.innerHTML = `<section class="dashboard-welcome"><div><span class="eyebrow">Advisor workspace</span><h1>Welcome, ${esc(active.name.split(" ")[0])}.</h1><p class="muted">Manage your profile, availability, and student sessions.</p></div>${advisor ? `<a href="${advisorLink(advisor)}" class="button button-secondary">Preview public profile</a>` : ""}</section>${!advisor ? `<div class="empty-state"><h2>Your advisor profile is being reviewed</h2><p>You can edit your account while an admin reviews your listing.</p><a class="button button-secondary" href="${linkTo("profile.html")}">Edit profile</a></div>` : `<div class="stats-grid"><article class="stat-card"><span>Incoming requests</span><strong>${pending}</strong><small>Waiting for your response</small></article><article class="stat-card"><span>Confirmed sessions</span><strong>${incoming.filter(a=>a.status==="Confirmed").length}</strong><small>Upcoming meetings</small></article><article class="stat-card"><span>Completed</span><strong>${incoming.filter(a=>a.status==="Completed").length}</strong><small>Sessions you've wrapped up</small></article></div><div class="teacher-layout"><section class="teacher-main"><div class="section-heading"><h2>Student sessions</h2><a class="text-link" href="${linkTo("calendar.html")}">Open calendar →</a></div><div class="appointment-grid">${incoming.length?incoming.map(item=>appointmentCard(item,{teacher:true})).join(""):`<div class="empty-state"><h3>No sessions yet</h3><p>Approved availability will show up to students.</p></div>`}</div></section><aside class="card availability-editor"><span class="eyebrow">Your schedule</span><h2>Manage availability</h2><p class="small muted">Add weekly time slots, one-off availability, or block a date.</p><form id="availability-form"><div class="field"><label for="weekly-day">Weekly day</label><select id="weekly-day" name="day">${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=>`<option>${d}</option>`).join("")}</select></div><div class="field"><label for="weekly-time">Time</label><input id="weekly-time" name="time" type="time" required></div><button class="button button-secondary button-full" type="submit" data-kind="weekly">Add weekly slot</button><div class="divider"></div><div class="field"><label for="oneoff-date">One-off date</label><input id="oneoff-date" name="date" type="date" min="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label for="oneoff-time">One-off time</label><input id="oneoff-time" name="oneoffTime" type="time"></div><button class="button button-secondary button-full" type="submit" data-kind="oneoff">Add one-off slot</button><div class="divider"></div><div class="field"><label for="block-date">Block a day</label><input id="block-date" name="blockDate" type="date" min="${new Date().toISOString().slice(0,10)}"></div><button class="button button-secondary button-full" type="submit" data-kind="block">Block selected day</button></form><h3 class="availability-subhead">Current weekly slots</h3><div class="slot-list">${(advisor.availability||[]).map((slot,index)=>`<span class="slot-chip">${slot.day} ${slot.time}<button aria-label="Remove ${slot.day} ${slot.time}" data-action="remove-weekly" data-index="${index}">×</button></span>`).join("")||`<p class="muted small">No weekly slots yet.</p>`}</div><h3 class="availability-subhead">Blocked dates</h3><div class="slot-list">${(advisor.blockedDays||[]).map(date=>`<span class="slot-chip">${date}<button aria-label="Unblock ${date}" data-action="unblock-date" data-date="${date}">×</button></span>`).join("")||`<p class="muted small">No blocked dates.</p>`}</div></aside></div><section class="card form-card profile-edit-inline"><h2>Public advisor profile</h2><form id="teacher-profile-form"><div class="form-grid"><div class="field"><label for="teacher-subject">Subject / expertise</label><input id="teacher-subject" name="subject" required value="${esc(advisor.subject)}"></div><div class="field"><label for="teacher-qualifications">Qualifications</label><input id="teacher-qualifications" name="qualifications" value="${esc((advisor.qualifications||[]).join ? advisor.qualifications.join(", ") : advisor.qualifications||"")}"></div></div><div class="field"><label for="teacher-bio">Bio</label><textarea id="teacher-bio" name="bio" rows="3" required>${esc(advisor.bio)}</textarea></div><button class="button button-primary">Save profile</button></form></section>`}`;
  if (advisor) {
    main.querySelector("#weekly-time").removeAttribute("required");
    const editor = main.querySelector(".availability-editor");
    const oneOffMarkup = `<h3 class="availability-subhead">One-off slots</h3><div class="slot-list">${(advisor.oneOff||[]).map((slot,index)=>`<span class="slot-chip">${esc(slot.date)} ${esc(slot.time)}<button aria-label="Remove ${esc(slot.date)} ${esc(slot.time)}" data-action="remove-oneoff" data-index="${index}">×</button></span>`).join("")||`<p class="muted small">No one-off slots yet.</p>`}</div>`;
    editor.querySelector("form").insertAdjacentHTML("afterend", oneOffMarkup);
  }
}

function renderAdminDashboard(main) {
  const data = getData(); const users = data.users; const appointments = data.appointments; const advisors = data.advisors;
  main.innerHTML = `<section class="dashboard-welcome"><div><span class="eyebrow">Administration</span><h1>Hub overview</h1><p class="muted">Manage accounts, advisor listings, sessions, and feedback.</p></div><div class="button-row"><button class="button button-secondary" data-action="export-json">Export JSON</button><button class="button button-secondary" data-action="export-csv">Export appointments CSV</button></div></section><div class="stats-grid"><article class="stat-card"><span>Users</span><strong>${users.length}</strong><small>${users.filter(u=>u.role==="student").length} students · ${users.filter(u=>u.role==="teacher").length} teachers</small></article><article class="stat-card"><span>Appointments</span><strong>${appointments.length}</strong><small>${appointments.filter(a=>["Pending","Confirmed"].includes(a.status)).length} active / pending</small></article><article class="stat-card"><span>Advisor listings</span><strong>${advisors.filter(a=>a.active&&a.approved).length}</strong><small>${advisors.filter(a=>!a.approved).length} awaiting approval</small></article><article class="stat-card"><span>Feedback</span><strong>${data.feedback.length}</strong><small>${data.feedback.filter(f=>!f.visible).length} awaiting moderation</small></article></div><section class="section-block admin-section"><div class="section-heading"><h2>Manage users</h2><input id="admin-user-search" class="compact-search" type="search" placeholder="Search users"></div><div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Approval</th><th>Account</th><th>Actions</th></tr></thead><tbody id="admin-user-rows">${users.map(adminUserRow).join("")}</tbody></table></div></section><section class="section-block admin-section"><div class="section-heading"><h2>Advisor listings</h2></div><div class="table-wrap"><table><thead><tr><th>Advisor</th><th>Subject</th><th>Rating</th><th>Listing</th><th>Action</th></tr></thead><tbody>${advisors.map(a=>`<tr><td>${esc(a.name)}</td><td>${esc(a.subject)}</td><td>★ ${Number(a.rating||0).toFixed(1)}</td><td>${a.approved?"Approved":"Pending approval"} · ${a.active?"Active":"Inactive"}</td><td><button class="button button-small button-secondary" data-action="toggle-advisor" data-id="${a.id}">${a.approved?"Hide listing":"Approve listing"}</button></td></tr>`).join("")}</tbody></table></div></section><section class="section-block admin-section"><div class="section-heading"><h2>All appointments</h2></div><div class="table-wrap"><table><thead><tr><th>Student</th><th>Advisor</th><th>Date</th><th>Status</th><th>Action</th></tr></thead><tbody>${appointments.map(item=>`<tr><td>${esc(users.find(u=>u.id===item.studentId)?.name||"Unknown")}</td><td>${esc(advisors.find(a=>a.id===item.advisorId)?.name||"Unknown")}</td><td>${formatDate(item.start)}</td><td>${statusBadge(item.status)}</td><td>${!["Cancelled","Completed"].includes(item.status)?`<button class="button button-small button-danger" data-action="admin-cancel" data-id="${item.id}">Cancel</button>`:"—"}</td></tr>`).join("")}</tbody></table></div></section><section class="section-block admin-section"><div class="section-heading"><h2>Feedback moderation</h2></div><div class="feedback-admin-list">${data.feedback.length?data.feedback.slice().reverse().map(f=>`<article class="card feedback-admin-item"><div><strong>${esc(users.find(u=>u.id===f.userId)?.name||"User")}</strong> · ${esc(f.category)} · <span class="rating">${"★".repeat(f.rating)}</span>${f.visible?`<span class="badge status-confirmed">Visible</span>`:`<span class="badge status-pending">Needs review</span>`}<p>${esc(f.message)}</p></div><button class="button button-small button-secondary" data-action="moderate-feedback" data-id="${f.id}">${f.visible?"Hide":"Publish"}</button></article>`).join(""):`<p class="empty-inline">No feedback submitted.</p>`}</div></section><section class="section-block danger-zone"><h2>Demo data</h2><p>Reset users, appointments, advisors, and feedback to the original sample data.</p><button class="button button-danger" data-action="reset-data">Reset demo data</button></section>`;
  const appointmentTable = main.querySelectorAll(".admin-section")[2]?.querySelector("tbody");
  if (appointmentTable) appointments.forEach((item, index) => {
    const cell = appointmentTable.rows[index]?.cells[4];
    if (cell) cell.insertAdjacentHTML("beforeend", ` <button class="button button-small button-secondary" data-action="admin-reassign" data-id="${item.id}">Reassign</button>`);
  });
  const search = main.querySelector("#admin-user-search");
  search.addEventListener("input", () => { const q=search.value.toLowerCase(); main.querySelector("#admin-user-rows").innerHTML=users.filter(u=>`${u.name} ${u.email} ${u.role}`.toLowerCase().includes(q)).map(adminUserRow).join("")||`<tr><td colspan="6" class="muted">No matching users.</td></tr>`; });
}
function adminUserRow(u) {
  return `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${u.approved===false?`<span class="badge status-pending">Pending</span>`:`Approved`}</td><td>${u.active===false?`<span class="badge status-cancelled">Suspended</span>`:`Active`}</td><td class="table-actions">${u.role==="teacher"&&u.approved===false?`<button class="button button-small button-primary" data-action="approve-user" data-id="${u.id}">Approve</button>`:""}<button class="button button-small button-secondary" data-action="suspend-user" data-id="${u.id}">${u.active===false?"Restore":"Suspend"}</button><button class="button button-small button-danger" data-action="delete-user" data-id="${u.id}">Delete</button></td></tr>`;
}

function renderAbout(main) {
  main.innerHTML = `<section class="page-heading"><span class="eyebrow">About the hub</span><h1>Guidance that meets you where you are.</h1><p>LPU-AdvisorHUB makes it easier for students to access practical, personal support throughout their university journey.</p></section><section class="about-mission card"><div><span class="eyebrow">Our mission</span><h2>Make the next step feel possible.</h2></div><p>Every student deserves someone who can listen, share experience, and help turn a question into a plan. We bring students and advisors together for focused conversations—whether the topic is an academic challenge, a career decision, or a project idea.</p></section><section class="section-block"><div class="section-heading"><h2>How it works</h2></div><div class="steps-grid"><article class="step-card"><span class="step-number">01</span><h3>Choose a guide</h3><p>Find an advisor whose experience matches what you want to explore.</p></article><article class="step-card"><span class="step-number">02</span><h3>Book a session</h3><p>Pick an available time and share a little context ahead of your meeting.</p></article><article class="step-card"><span class="step-number">03</span><h3>Take action</h3><p>Get personal guidance and leave with a useful next step.</p></article></div></section><section class="section-block"><div class="section-heading"><h2>A community of guides</h2></div><div class="team-grid">${getData().advisors.filter(a=>a.active&&a.approved).slice(0,3).map(a=>`<article class="card team-card"><span class="avatar">${initials(a.name)}</span><h3>${esc(a.name)}</h3><p class="eyebrow">${esc(a.subject)}</p><p class="muted">${esc(a.bio)}</p></article>`).join("")}</div></section><section class="section-block"><div class="section-heading"><h2>Frequently asked questions</h2></div><div class="faq-list"><details><summary>Who can book a session?</summary><p>Students with a LPU-AdvisorHUB account can book available sessions. Create a student account to get started.</p></details><details><summary>Are sessions online or in person?</summary><p>Each booking lets you choose online or in-person. Confirm the meeting details with your advisor before your session.</p></details><details><summary>Can I cancel or change a booking?</summary><p>You can cancel up to two hours before a session. To request another time, book a new available slot after cancelling.</p></details><details><summary>How do I become an advisor?</summary><p>Register as a teacher and complete your expertise profile. An admin must approve your listing before it appears to students.</p></details></div></section><div class="centered"><a class="button button-cta" href="${linkTo("advisors.html")}">Explore advisors</a></div>`;
}

function renderFeedback(main) {
  const active = loggedInUser();
  main.innerHTML = `<div class="narrow-layout"><section class="page-heading"><span class="eyebrow">Help us improve</span><h1>Share your feedback</h1><p>Your feedback helps us make student support more useful.</p></section><section class="card form-card"><div id="feedback-content">${active ? `<form id="feedback-form" novalidate><div class="field"><label for="feedback-rating">Your rating</label><select id="feedback-rating" name="rating" required><option value="">Choose a rating</option><option value="5">★★★★★ — Excellent</option><option value="4">★★★★☆ — Very good</option><option value="3">★★★☆☆ — Good</option><option value="2">★★☆☆☆ — Could be better</option><option value="1">★☆☆☆☆ — Needs improvement</option></select></div><div class="field"><label for="feedback-category">Feedback about</label><select id="feedback-category" name="category"><option>Platform</option><option>Advisor</option><option>Session</option><option>Other</option></select></div><div class="field"><label for="feedback-message">Your message</label><textarea id="feedback-message" name="message" rows="5" required minlength="10" placeholder="What worked well, or what could be improved?"></textarea></div><p class="form-message" aria-live="polite"></p><button class="button button-primary">Send feedback</button><p class="small muted">Feedback is reviewed by the admin before it appears publicly.</p></form>` : `<div class="empty-state"><h2>Log in to share feedback</h2><p>Your account helps us understand and respond to your experience.</p><a href="${linkTo("login.html")}" class="button button-primary">Log in</a></div>`}</div></section></div>`;
}

function renderProfile(main) {
  const active = loggedInUser();
  main.innerHTML = `<section class="page-heading"><span class="eyebrow">Account settings</span><h1>Your profile</h1><p>Update your account information.</p></section><section class="card form-card profile-form-card"><form id="profile-form"><div class="field"><label for="profile-name">Full name</label><input id="profile-name" name="name" value="${esc(active.name)}" required minlength="2"></div><div class="field"><label>Email address</label><input value="${esc(active.email)}" disabled><small>Email cannot be changed in this demo.</small></div>${active.role==="student"?`<div class="form-grid"><div class="field"><label for="profile-program">Program</label><input id="profile-program" name="program" value="${esc(active.program||"")}"></div><div class="field"><label for="profile-year">Year of study</label><input id="profile-year" name="year" value="${esc(active.year||"")}"></div></div>`:""}${active.role==="teacher"?`<div class="field"><label for="profile-subject">Subject / expertise</label><input id="profile-subject" name="subject" value="${esc(active.subject||"")}"></div>`:""}<p class="form-message" aria-live="polite"></p><button class="button button-primary">Save changes</button></form></section>`;
}
function renderNotFound(main) {
  main.innerHTML = `<section class="empty-state not-found"><span class="eyebrow">404 · Page not found</span><h1>That page isn't here.</h1><p>The link may be out of date, or the page may have moved.</p><a class="button button-primary" href="${linkTo("home")}">Go to home</a></section>`;
}

function showFormMessage(form, message, error = false) { const el=form.querySelector(".form-message"); if(el){el.textContent=message;el.classList.toggle("is-error",error);} }
function values(form) { return Object.fromEntries(new FormData(form).entries()); }
function submitLogin(form) {
  const v=values(form);
  if(!v.email.trim()||!v.password) return showFormMessage(form,"Enter your email and password.",true);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) return showFormMessage(form,"Enter a valid email address.",true);
  try { const account=login(v.email,v.password,v.role); checkReminders(true); toast(`Welcome back, ${account.name.split(" ")[0]}.`); location.href=linkTo(dashboardFor(account.role)); }
  catch(error) { showFormMessage(form,error.message,true); }
}
function submitRegister(form) {
  const v=values(form);
  if(!v.name?.trim()||v.name.trim().length<2) return showFormMessage(form,"Enter your full name (at least 2 characters).",true);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v.email||"").trim())) return showFormMessage(form,"Enter a valid email address.",true);
  if((v.password||"").length<6) return showFormMessage(form,"Choose a password with at least 6 characters.",true);
  if(v.role==="teacher"&&(!v.subject?.trim()||!v.bio?.trim()||!v.qualifications?.trim())) return showFormMessage(form,"Complete the teacher expertise, bio, and qualifications fields.",true);
  try {
    const account=register(v);
    if(account.role==="teacher") { toast("Account created. Your advisor listing is awaiting admin approval."); location.href=linkTo("login.html"); }
    else { login(account.email,account.password,account.role); toast("Your student account is ready."); location.href=linkTo("student-dashboard.html"); }
  } catch(error) { showFormMessage(form,error.message,true); }
}
function submitBooking(form) {
  const v=values(form); const advisor=findAdvisor(v.advisor);
  if(!advisor||!v.date||!v.time||v.details.trim().length<10) return showFormMessage(form,"Choose an advisor, date, available time, and add at least 10 characters of detail.",true);
  const start=new Date(`${v.date}T${v.time}:00`);
  if(start<=new Date()||availableSlots(advisor,v.date).find(slot=>slot.time===v.time)?.disabled) return showFormMessage(form,"That time is no longer available. Please choose another slot.",true);
  const summary=document.createElement("div");
  summary.innerHTML=`<p><strong>Advisor:</strong> ${esc(advisor.name)}</p><p><strong>When:</strong> ${formatDate(start.toISOString())}</p><p><strong>Meeting:</strong> ${esc(v.mode)} · ${esc(v.reason)}</p><p><strong>Your note:</strong> ${esc(v.details)}</p>`;
  modal({title:"Review your booking",body:summary,confirmText:"Confirm booking",confirmClass:"button-cta",onConfirm:()=>{
    try { updateData(data=>{ if(data.appointments.some(item=>item.advisorId===advisor.id&&item.start===start.toISOString()&&!["Cancelled","Declined"].includes(item.status))) throw new Error("That slot was just booked. Please choose another."); data.appointments.push({id:uid("appointment"),studentId:loggedInUser().id,advisorId:advisor.id,start:start.toISOString(),mode:v.mode,reason:v.reason,details:v.details.trim(),status:"Pending",createdAt:new Date().toISOString(),notes:""}); }); toast("Booking request sent to your advisor."); location.href=linkTo("student-dashboard.html"); }
    catch(error){showFormMessage(form,error.message,true);toast(error.message,"error");}
  }});
}
function submitFeedback(form) {
  const v=values(form);
  if(!v.rating||v.message.trim().length<10) return showFormMessage(form,"Select a rating and write at least 10 characters.",true);
  updateData(data=>data.feedback.push({id:uid("feedback"),userId:loggedInUser().id,rating:Number(v.rating),category:v.category,message:v.message.trim(),createdAt:new Date().toISOString(),visible:false}));
  document.querySelector("#feedback-content").innerHTML=`<div class="thank-you-state"><span class="success-mark">✓</span><h2>Thank you for sharing.</h2><p>Your feedback is saved and will be reviewed by our admin team.</p><a class="text-link" href="${linkTo("home")}">Back to home →</a></div>`;
}
function submitProfile(form) {
  const v=values(form);
  updateData(data=>{const account=data.users.find(item=>item.id===loggedInUser().id);Object.assign(account,{name:v.name.trim()});if(v.program!==undefined)Object.assign(account,{program:v.program.trim(),year:v.year.trim()});if(v.subject!==undefined)account.subject=v.subject.trim();const advisor=data.advisors.find(a=>a.teacherId===account.id);if(advisor){advisor.name=account.name;advisor.subject=account.subject;advisor.bio=account.bio;advisor.qualifications=account.qualifications?[account.qualifications]:[];}});
  toast("Profile saved."); showFormMessage(form,"Your profile has been updated.");
}

function performAction(button) {
  const action=button.dataset.action, id=button.dataset.id;
  const changeStatus=(status)=>updateData(data=>{const appointment=data.appointments.find(item=>item.id===id);if(appointment)appointment.status=status;});
  if(action==="theme"){const mode=toggleTheme();toast(`Switched to ${mode} mode.`);return;}
  if(action==="logout"){logout();toast("You have been logged out.");location.href=linkTo("home");return;}
  if(action==="notifications"){const panel=root.querySelector(".notification-panel");panel.hidden=!panel.hidden;button.setAttribute("aria-expanded",String(!panel.hidden));return;}
  if(action==="read-notifications"){updateData(data=>data.notifications.forEach(note=>{if(note.userId===loggedInUser()?.id)note.read=true;}));renderShell();renderPage();return;}
  if(action==="browser-notifications"){requestNotificationPermission();return;}
  if(action==="appointment-details"||action==="calendar-details"){const item=getData().appointments.find(a=>a.id===id);if(!item)return;const data=getData();const advisor=data.advisors.find(a=>a.id===item.advisorId);const student=data.users.find(u=>u.id===item.studentId);modal({title:"Session details",body:`${item.reason} · ${item.status} · ${formatDate(item.start)} · ${advisor?.name||"Advisor"} · ${student?.name||"Student"} · ${item.mode}. ${item.details}${item.notes?` Notes: ${item.notes}`:""}`,confirmText:"Close"});return;}
  if(action==="add-calendar"){const item=getData().appointments.find(a=>a.id===id);downloadIcs(item,findAdvisor(item.advisorId),getData().users.find(u=>u.id===item.studentId));toast("Calendar file downloaded.");return;}
  if(action==="cancel-booking"||action==="admin-cancel"){const item=getData().appointments.find(a=>a.id===id);if(action==="cancel-booking"&&new Date(item.start).getTime()-Date.now()<2*3600000){toast("Sessions can only be cancelled at least 2 hours before they start.","error");return;}modal({title:"Cancel this session?",body:"The booking will be cancelled and its time slot will become available again.",confirmText:"Cancel session",danger:true,onConfirm:()=>{changeStatus("Cancelled");toast("Session cancelled.");renderPage();}});return;}
  if(action==="accept"||action==="decline"||action==="complete"){changeStatus(({accept:"Confirmed",decline:"Declined",complete:"Completed"})[action]);toast(({accept:"Session request accepted.",decline:"Session request declined.",complete:"Session marked complete."})[action]);renderPage();return;}
  if(action==="session-notes"){const item=getData().appointments.find(a=>a.id===id);const field=document.createElement("textarea");field.rows=4;field.value=item.notes||"";field.placeholder="Add a short private note about this session.";modal({title:"Session notes",body:field,confirmText:"Save notes",onConfirm:()=>{updateData(data=>{const appointment=data.appointments.find(a=>a.id===id);if(appointment)appointment.notes=field.value.trim();});toast("Session notes saved.");renderPage();}});return;}
  if(action==="calendar-prev"||action==="calendar-next"){calendarCursor.setMonth(calendarCursor.getMonth()+(action==="calendar-prev"?-1:1));renderCalendarGrid(root.querySelector("#main-content"),loggedInUser(),root.querySelector("#main-content").dataset.calendarView);return;}
  if(action==="calendar-today"){calendarCursor=new Date();renderCalendarGrid(root.querySelector("#main-content"),loggedInUser(),root.querySelector("#main-content").dataset.calendarView);return;}
  if(action==="calendar-view"){renderCalendarGrid(root.querySelector("#main-content"),loggedInUser(),button.dataset.view);return;}
  if(action==="remove-weekly"){const advisor=getData().advisors.find(a=>a.teacherId===loggedInUser().id);updateData(data=>data.advisors.find(a=>a.id===advisor.id).availability.splice(Number(button.dataset.index),1));toast("Weekly availability removed.");renderPage();return;}
  if(action==="remove-oneoff"){const advisor=getData().advisors.find(a=>a.teacherId===loggedInUser().id);updateData(data=>data.advisors.find(a=>a.id===advisor.id).oneOff.splice(Number(button.dataset.index),1));toast("One-off slot removed.");renderPage();return;}
  if(action==="unblock-date"){const advisor=getData().advisors.find(a=>a.teacherId===loggedInUser().id);updateData(data=>{const item=data.advisors.find(a=>a.id===advisor.id);item.blockedDays=item.blockedDays.filter(date=>date!==button.dataset.date);});toast("Date unblocked.");renderPage();return;}
  if(action==="approve-user"||action==="suspend-user"||action==="delete-user"){
    const target=getData().users.find(u=>u.id===id);if(!target)return;
    if(action==="approve-user"){updateData(data=>{const account=data.users.find(u=>u.id===id);account.approved=true;const advisor=data.advisors.find(a=>a.teacherId===id);if(advisor)advisor.approved=true;});toast("Teacher account approved.");renderPage();return;}
    if(target.id===loggedInUser().id){toast("You cannot suspend or delete the account currently signed in.","error");return;}
    if(action==="suspend-user"){updateData(data=>{const account=data.users.find(u=>u.id===id);account.active=account.active===false;const advisor=data.advisors.find(a=>a.teacherId===id);if(advisor)advisor.active=account.active;});toast(target.active===false?"Account restored.":"Account suspended.");renderPage();return;}
    modal({title:"Delete this account?",body:`Delete ${target.name}'s account? Existing appointment records will remain for audit history.`,confirmText:"Delete account",danger:true,onConfirm:()=>{updateData(data=>{data.users=data.users.filter(u=>u.id!==id);data.advisors=data.advisors.filter(a=>a.teacherId!==id);});toast("Account deleted.");renderPage();}});return;
  }
  if(action==="toggle-advisor"){updateData(data=>{const advisor=data.advisors.find(a=>a.id===id);if(advisor.approved)advisor.active=!advisor.active;else{advisor.approved=true;advisor.active=true;}});toast("Advisor listing updated.");renderPage();return;}
  if(action==="admin-reassign"){
    const item=getData().appointments.find(a=>a.id===id);if(!item)return;
    const select=document.createElement("select");
    select.setAttribute("aria-label","Choose a new advisor");
    select.innerHTML=getData().advisors.filter(a=>a.approved&&a.active).map(a=>`<option value="${esc(a.id)}" ${a.id===item.advisorId?"selected":""}>${esc(a.name)} · ${esc(a.subject)}</option>`).join("");
    const body=document.createElement("div");body.append(Object.assign(document.createElement("p"),{textContent:"Keep the appointment time and assign it to another active advisor."}),select);
    modal({title:"Reassign appointment",body,confirmText:"Save reassignment",onConfirm:()=>{
      const newAdvisorId=select.value;
      try { updateData(data=>{const appointment=data.appointments.find(a=>a.id===id);if(data.appointments.some(a=>a.id!==id&&a.advisorId===newAdvisorId&&a.start===appointment.start&&!["Cancelled","Declined"].includes(a.status)))throw new Error("That advisor already has a booking at this time.");appointment.advisorId=newAdvisorId;});toast("Appointment reassigned.");renderPage(); }
      catch(error){toast(error.message,"error");}
    }});return;
  }
  if(action==="moderate-feedback"){updateData(data=>{const item=data.feedback.find(f=>f.id===id);item.visible=!item.visible;});toast("Feedback moderation updated.");renderPage();return;}
  if(action==="export-json"){download("lpu-advisorhub-data.json",JSON.stringify(getData(),null,2),"application/json");toast("JSON data exported.");return;}
  if(action==="export-csv"){const data=getData();const rows=[["id","student","advisor","start","status","mode","reason","details"],...data.appointments.map(item=>[item.id,data.users.find(u=>u.id===item.studentId)?.name||"",data.advisors.find(a=>a.id===item.advisorId)?.name||"",item.start,item.status,item.mode,item.reason,item.details])];download("lpu-advisorhub-appointments.csv",rows.map(row=>row.map(cell=>`"${String(cell||"").replace(/"/g,'""')}"`).join(",")).join("\r\n"),"text/csv");toast("Appointment CSV exported.");return;}
  if(action==="reset-data"){modal({title:"Reset all demo data?",body:"This replaces all browser data with the original demo accounts, sessions, and feedback. This cannot be undone.",confirmText:"Reset data",danger:true,onConfirm:()=>{resetData();logout();toast("Demo data restored.");location.href=linkTo("home");}});}
}
function download(filename,content,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);}
function updateCountdowns(){root.querySelectorAll("[data-countdown]").forEach(el=>{const gap=new Date(el.dataset.countdown)-Date.now();if(gap<=0){el.textContent="Starting now";return;}const days=Math.floor(gap/86400000),hours=Math.floor(gap%86400000/3600000),minutes=Math.floor(gap%3600000/60000);el.innerHTML=`<strong>${days?`${days}d `:""}${hours}h ${minutes}m</strong><span>until your session</span>`;});}
setInterval(updateCountdowns,60000);

root.addEventListener("click",event=>{const button=event.target.closest("[data-action]");if(button){event.preventDefault();performAction(button);}});
root.addEventListener("submit",event=>{
  const form=event.target; const id=form.id; if(!id)return;
  event.preventDefault();
  if(id==="login-form")submitLogin(form);
  if(id==="register-form")submitRegister(form);
  if(id==="booking-form")submitBooking(form);
  if(id==="feedback-form")submitFeedback(form);
  if(id==="profile-form")submitProfile(form);
  if(id==="teacher-profile-form"){const v=values(form),account=loggedInUser();updateData(data=>{const advisor=data.advisors.find(a=>a.teacherId===account.id);Object.assign(advisor,{subject:v.subject.trim(),bio:v.bio.trim(),qualifications:v.qualifications.split(",").map(x=>x.trim()).filter(Boolean)});const u=data.users.find(x=>x.id===account.id);Object.assign(u,{subject:advisor.subject,bio:advisor.bio,qualifications:v.qualifications});});toast("Advisor profile updated.");renderPage();}
  if(id==="availability-form"){
    const kind=event.submitter?.dataset.kind,v=values(form),advisor=getData().advisors.find(a=>a.teacherId===loggedInUser().id);
    if(!advisor){toast("No advisor listing is linked to this account.","error");return;}
    if(kind==="weekly"&&!v.time){toast("Choose a weekly time.","error");return;}
    if(kind==="oneoff"&&(!v.date||!v.oneoffTime)){toast("Choose both a date and time for the one-off slot.","error");return;}
    if(kind==="block"&&!v.blockDate){toast("Choose a date to block.","error");return;}
    try { updateData(data=>{const item=data.advisors.find(a=>a.id===advisor.id);if(kind==="weekly"){if(!item.availability.some(s=>s.day===v.day&&s.time===v.time))item.availability.push({day:v.day,time:v.time});}if(kind==="oneoff"){if(!item.oneOff.some(s=>s.date===v.date&&s.time===v.oneoffTime))item.oneOff.push({date:v.date,time:v.oneoffTime});}if(kind==="block"){if(!item.blockedDays.includes(v.blockDate))item.blockedDays.push(v.blockDate);}}); }
    catch(error){toast(error.message,"error");return;}
    toast(kind==="weekly"?"Weekly slot added.":kind==="oneoff"?"One-off slot added.":"Date blocked.");renderPage();
  }
});
root.addEventListener("change",event=>{
  if(event.target.id==="reg-role"){const teacher=event.target.value==="teacher";const fields=root.querySelector(".teacher-fields");fields.hidden=!teacher;fields.querySelectorAll("input,textarea").forEach(input=>input.required=teacher);}
});
document.addEventListener("keydown",event=>{if(event.key==="Escape"){const panel=root.querySelector(".notification-panel");if(panel)panel.hidden=true;}});
