const KEY = "lpu-advisorhub-v1";

const advisorSeed = [
  ["Aarav Sharma", "Computer Science", 8, 4.9, "Aarav helps students turn complex programming concepts into practical skills. His sessions focus on data structures, web development, and interview readiness.", ["Mon", "Wed", "Fri"]],
  ["Meera Nair", "Career Guidance", 10, 4.8, "Meera works with students to find a clear career direction, build confidence, and make thoughtful choices about internships and further study.", ["Tue", "Thu", "Sat"]],
  ["Rohan Gupta", "Mathematics", 6, 4.7, "Rohan makes challenging mathematical ideas easier to approach, from calculus and statistics to problem-solving strategies.", ["Mon", "Tue", "Thu"]],
  ["Simran Kaur", "Business & Management", 9, 4.9, "Simran brings industry experience in business strategy and helps students connect classroom theory to real projects.", ["Wed", "Thu", "Fri"]],
  ["Kabir Verma", "Placement Prep", 7, 4.8, "Kabir supports students with interview practice, resume feedback, communication, and practical placement preparation.", ["Mon", "Wed", "Sat"]],
  ["Ananya Iyer", "Project Guidance", 5, 4.6, "Ananya mentors student teams through project planning, research methods, presentation skills, and thoughtful iteration.", ["Tue", "Fri", "Sat"]]
].map((item, index) => ({
  id: `advisor-${index + 1}`, name: item[0], subject: item[1], experience: item[2], rating: item[3], bio: item[4],
  qualifications: ["LPU Faculty", "Student-focused mentor"], teacherId: index === 0 ? "teacher-demo" : `faculty-${index + 1}`,
  availability: item[5].flatMap(day => ["10:00", "11:30", "14:00", "15:30"].map(time => ({ day, time }))),
  oneOff: [], blockedDays: [], approved: true, active: true
}));

function dateAtOffset(days, hour, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function seed() {
  const users = [
    { id: "admin-demo", name: "Hub Admin", email: "admin@demo.com", password: "admin123", role: "admin", active: true, approved: true },
    { id: "student-demo", name: "Demo Student", email: "student@demo.com", password: "student123", role: "student", active: true, approved: true, program: "B.Tech Computer Science", year: "2nd year" },
    { id: "teacher-demo", name: "Aarav Sharma", email: "teacher@demo.com", password: "teacher123", role: "teacher", active: true, approved: true, subject: "Computer Science", bio: advisorSeed[0].bio, qualifications: "M.Tech Computer Science" },
    { id: "student-2", name: "Priya Singh", email: "priya@demo.com", password: "student123", role: "student", active: true, approved: true, program: "BBA", year: "3rd year" },
    { id: "student-3", name: "Dev Patel", email: "dev@demo.com", password: "student123", role: "student", active: true, approved: true, program: "B.Tech IT", year: "1st year" }
  ];
  for (let i = 1; i < advisorSeed.length; i++) users.push({
    id: `faculty-${i + 1}`, name: advisorSeed[i].name, email: `advisor${i + 1}@demo.com`, password: "teacher123",
    role: "teacher", active: true, approved: true, subject: advisorSeed[i].subject, bio: advisorSeed[i].bio, qualifications: "Faculty advisor"
  });
  return {
    users, advisors: advisorSeed,
    appointments: [
      { id: "appointment-demo-1", studentId: "student-demo", advisorId: "advisor-1", start: dateAtOffset(1, 11), mode: "Online", reason: "Academic doubt", details: "Review recursion and practice problems.", status: "Confirmed", createdAt: new Date().toISOString(), notes: "" },
      { id: "appointment-demo-2", studentId: "student-demo", advisorId: "advisor-2", start: dateAtOffset(3, 14), mode: "In-person", reason: "Career guidance", details: "Explore internship paths.", status: "Pending", createdAt: new Date().toISOString(), notes: "" },
      { id: "appointment-demo-3", studentId: "student-2", advisorId: "advisor-1", start: dateAtOffset(-7, 10), mode: "Online", reason: "Project help", details: "Discussed project scope.", status: "Completed", createdAt: dateAtOffset(-9, 12), notes: "Good progress." }
    ],
    feedback: [
      { id: "feedback-1", userId: "student-2", rating: 5, category: "Advisor", message: "The session helped me break down a difficult topic into manageable steps.", createdAt: dateAtOffset(-2, 12), visible: true },
      { id: "feedback-2", userId: "student-demo", rating: 4, category: "Platform", message: "Booking was straightforward and the reminders are useful.", createdAt: dateAtOffset(-1, 12), visible: true }
    ],
    notifications: [], theme: null
  };
}

export function getData() {
  let data;
  try { data = JSON.parse(localStorage.getItem(KEY)); } catch (error) { console.error("Could not read saved AdvisorHUB data.", error); }
  if (!data || !Array.isArray(data.users) || !Array.isArray(data.appointments)) {
    data = seed();
    saveData(data);
  }
  return data;
}

export function saveData(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); }
  catch (error) { console.error("Could not save AdvisorHUB data.", error); throw new Error("Your browser could not save this change. Check available storage."); }
}

export function updateData(mutator) {
  const data = getData();
  mutator(data);
  saveData(data);
  return data;
}
export function uid(prefix = "item") { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
export function resetData() { saveData(seed()); }
export function exportData() { return getData(); }
