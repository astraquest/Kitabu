const API_BASE = window.KITABU_API_BASE || "https://app.kitabu.ai";
const TOKEN_KEY = "kitabu.admin.accessToken";
const REFRESH_KEY = "kitabu.admin.refreshToken";
const USER_KEY = "kitabu.admin.user";
const REFRESH_MS = 30000;

const grades = ["Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];
const subjects = ["Mathematics", "English", "Science", "Kiswahili", "Social Studies", "Computer Science"];

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: "chart" },
  { key: "schools", label: "Schools", icon: "school" },
  { key: "subjects", label: "Subjects", icon: "book" },
  { key: "users", label: "Users", icon: "users" },
  { key: "sales", label: "Sales Agents", icon: "briefcase", next: true },
  { key: "teacher", label: "Teacher's Portal", icon: "clipboard", next: true },
  { key: "parents", label: "Parents' Portal", icon: "heart", next: true },
  { key: "chatbot", label: "Chatbot Agent", icon: "message", next: true },
  { key: "tutor", label: "Tutor Agent", icon: "spark", next: true },
  { key: "quickfacts", label: "QuickFacts Agent", icon: "bolt", next: true },
  { key: "homework", label: "Homework Agent", icon: "edit", next: true },
  { key: "assessment", label: "Assessment Agent", icon: "check", next: true },
  { key: "career", label: "Career Coach Agent", icon: "path", next: true },
  { key: "quiz", label: "Quiz Arena", icon: "target", next: true },
  { key: "pilots", label: "Pilots", icon: "rocket" },
  { key: "pricing", label: "Pricing", icon: "wallet" },
  { key: "settings", label: "Settings", icon: "gear", next: true }
];

const state = {
  route: "dashboard",
  user: readJson(USER_KEY),
  accessToken: localStorage.getItem(TOKEN_KEY),
  refreshToken: localStorage.getItem(REFRESH_KEY),
  timer: null,
  loading: false,
  lastSync: null,
  selectedGrade: "All Grades",
  timeRange: "This Year",
  search: "",
  data: {
    users: [],
    schools: [],
    plans: [],
    discounts: [],
    announcements: [],
    ai: null,
    billing: null,
    curriculum: null,
    teacherStudents: [],
    teacherAssignments: []
  }
};

const app = document.getElementById("app");
const nav = document.getElementById("nav");
const content = document.getElementById("content");
const pageTitle = document.getElementById("pageTitle");
const pageSub = document.getElementById("pageSub");
const loginPanel = document.getElementById("loginPanel");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const modalRoot = document.getElementById("modalRoot");

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function writeSession(payload) {
  state.accessToken = payload.accessToken;
  state.refreshToken = payload.refreshToken || state.refreshToken;
  state.user = payload.user;
  localStorage.setItem(TOKEN_KEY, state.accessToken);
  if (state.refreshToken) localStorage.setItem(REFRESH_KEY, state.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(state.user));
}

function clearSession() {
  state.accessToken = null;
  state.refreshToken = null;
  state.user = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

function icon(name) {
  const paths = {
    chart: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16v-5"/><path d="M12 16V8"/><path d="M16 16v-7"/>',
    school: '<path d="m3 10 9-6 9 6-9 6-9-6Z"/><path d="M7 13v4c3 2 7 2 10 0v-4"/><path d="M21 10v6"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5Z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    briefcase: '<path d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1"/><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 12h18"/>',
    clipboard: '<path d="M9 5h6"/><path d="M9 3h6v4H9z"/><path d="M6 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1"/><path d="M8 13h8"/><path d="M8 17h5"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/>',
    message: '<path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>',
    spark: '<path d="m12 3 1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3Z"/><path d="m19 15 .9 2.6L22 18.5l-2.1.9L19 22l-.9-2.6-2.1-.9 2.1-.9L19 15Z"/>',
    bolt: '<path d="M13 2 3 14h8l-1 8 11-14h-8l0-6Z"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/>',
    check: '<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    path: '<path d="M4 19c5-7 11-7 16-14"/><path d="M15 5h5v5"/><circle cx="5" cy="19" r="2"/><circle cx="12" cy="12" r="2"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    rocket: '<path d="M4.5 16.5c-1.2 1.2-1.5 3-1.5 3s1.8-.3 3-1.5"/><path d="M9 15 6 12c2-5 6-8 12-9 1 6-4 10-9 12Z"/><path d="M9 15v4l3-3"/><path d="M6 12H2l3-3"/><circle cx="15" cy="7" r="1.5"/>',
    wallet: '<path d="M19 7V6a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6"/><path d="M16 14h.01"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20h-3v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.5-1H3v-3h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.3 8l2.1-2.1.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V4h3v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L17.5 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v3h-.2a1.7 1.7 0 0 0-1.2 2Z"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.chart}</svg>`;
}

function init() {
  renderNav();
  bindEvents();
  if (state.accessToken) {
    showApp();
    loadAll();
    startSync();
  } else {
    showLogin();
  }
}

function bindEvents() {
  loginForm.addEventListener("submit", onLogin);
  document.getElementById("refreshButton").addEventListener("click", () => loadAll(true));
  document.getElementById("menuButton").addEventListener("click", () => document.querySelector(".sidebar").classList.toggle("open"));
  document.getElementById("profileButton").addEventListener("click", showProfileModal);
  document.getElementById("notificationButton").addEventListener("click", () => openModal("Notifications", "<p class='visually-muted'>Notification center is next in line. Live usage, payment, and school updates are already reflected on each module.</p>", "small"));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && state.accessToken) loadAll(true);
  });
}

function renderNav() {
  nav.innerHTML = navItems.map(item => `
    <button class="nav-item ${state.route === item.key ? "active" : ""}" data-route="${item.key}" type="button">
      ${icon(item.icon)}
      <span>${item.label}</span>
    </button>
  `).join("");
  nav.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
      state.route = button.dataset.route;
      document.querySelector(".sidebar").classList.remove("open");
      renderNav();
      renderRoute();
    });
  });
}

function showLogin() {
  loginPanel.hidden = false;
  content.hidden = true;
  pageTitle.textContent = "Admin Portal";
  pageSub.textContent = "Sign in to manage Kitabu AI.";
  setSync("Signed out", "Authentication required", "error");
}

function showApp() {
  loginPanel.hidden = true;
  content.hidden = false;
}

async function onLogin(event) {
  event.preventDefault();
  loginError.textContent = "";
  const email = document.getElementById("emailInput").value.trim();
  const password = document.getElementById("passwordInput").value;
  try {
    const payload = await api("/auth/login", { method: "POST", public: true, body: { email, password } });
    const roles = payload.user?.roles || [];
    if (!roles.includes("platform_admin") && !roles.includes("school_admin")) {
      throw new Error("This account is not an admin account.");
    }
    writeSession(payload);
    showApp();
    await loadAll(true);
    startSync();
  } catch (error) {
    loginError.textContent = error.message || "Unable to sign in.";
  }
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (!options.public && state.accessToken) headers.Authorization = `Bearer ${state.accessToken}`;
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  let payload = null;
  const text = await response.text();
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = { message: text }; }
  }
  if (response.status === 401 && state.refreshToken && !options.public && !options.retrying) {
    await refreshSession();
    return api(path, { ...options, retrying: true });
  }
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `Request failed: ${response.status}`);
  }
  return payload || {};
}

async function refreshSession() {
  const payload = await api("/auth/refresh", { method: "POST", public: true, body: { refreshToken: state.refreshToken } });
  writeSession(payload);
}

function startSync() {
  clearInterval(state.timer);
  state.timer = setInterval(() => loadAll(), REFRESH_MS);
}

async function loadAll(force = false) {
  if (state.loading && !force) return;
  state.loading = true;
  setSync("Syncing", "Refreshing live data", "");
  try {
    const platformCalls = [
      api("/admin/users"),
      api("/admin/schools"),
      api("/admin/subscription-plans"),
      api("/admin/discounts"),
      api("/admin/announcements"),
      api("/admin/analytics/ai-usage"),
      api("/admin/analytics/billing")
    ];
    const results = await Promise.allSettled(platformCalls);
    const [users, schools, plans, discounts, announcements, ai, billing] = results.map(result => result.status === "fulfilled" ? result.value : null);

    state.data.users = users?.users || state.data.users;
    state.data.schools = schools?.schools || state.data.schools;
    state.data.plans = plans?.plans || state.data.plans;
    state.data.discounts = discounts?.discounts || state.data.discounts;
    state.data.announcements = announcements?.announcements || state.data.announcements;
    state.data.ai = ai || state.data.ai;
    state.data.billing = billing || state.data.billing;

    await loadTeacherData();
    state.lastSync = new Date();
    setSync("Live", `Updated ${state.lastSync.toLocaleTimeString()}`, "live");
    renderRoute();
  } catch (error) {
    setSync("Sync error", error.message || "Unable to refresh", "error");
    if (error.message.includes("401") || error.message.includes("Verify")) {
      clearSession();
      showLogin();
    }
  } finally {
    state.loading = false;
  }
}

async function loadTeacherData() {
  const [students, assignments] = await Promise.allSettled([
    api("/teacher/students"),
    api("/teacher/assignments")
  ]);
  if (students.status === "fulfilled") state.data.teacherStudents = students.value.students || [];
  if (assignments.status === "fulfilled") state.data.teacherAssignments = assignments.value.assignments || [];
}

function setSync(title, meta, tone) {
  document.getElementById("syncState").textContent = title;
  document.getElementById("syncMeta").textContent = meta;
  const dot = document.getElementById("syncDot");
  dot.className = `sync-dot ${tone || ""}`.trim();
}

function renderRoute() {
  showApp();
  const titleMap = {
    dashboard: ["Dashboard", "Overview and performance across the same admin data used by mobile."],
    schools: ["Schools", "Manage partner schools, grades, pilots, and enrollment."],
    subjects: ["Subjects", "Curriculum and subject management by grade."],
    users: ["Users", "Search, filter, and inspect live user records."],
    sales: ["Sales Agents", "Next in line from desktop reference screens."],
    teacher: ["Teacher's Portal", "Student performance and assignment workflows."],
    parents: ["Parents' Portal", "Parent-facing learner health and progress view."],
    chatbot: ["Chatbot Agent", "AI usage, engaged subjects, and flagged content."],
    tutor: ["Tutor Agent", "Next in line agent analytics."],
    quickfacts: ["QuickFacts Agent", "Next in line agent analytics."],
    homework: ["Homework Agent", "Next in line assignment assistance analytics."],
    assessment: ["Assessment Agent", "Next in line assessment analytics."],
    career: ["Career Coach Agent", "Next in line career guidance analytics."],
    quiz: ["Quiz Arena", "Next in line game and quiz analytics."],
    pilots: ["Pilots", "School pilot onboarding and launch readiness."],
    pricing: ["Pricing", "School packages, discounts, and in-app announcements."],
    settings: ["Settings", "Operational controls queued for the admin portal."]
  };
  const [title, sub] = titleMap[state.route] || titleMap.dashboard;
  pageTitle.textContent = title;
  pageSub.textContent = sub;
  const renderers = {
    dashboard: renderDashboard,
    schools: renderSchools,
    subjects: renderSubjects,
    users: renderUsers,
    sales: renderSales,
    teacher: renderTeacher,
    parents: renderParents,
    chatbot: renderAgent,
    tutor: () => renderNextAgent("Tutor Agent"),
    quickfacts: () => renderNextAgent("QuickFacts Agent"),
    homework: () => renderNextAgent("Homework Agent"),
    assessment: () => renderNextAgent("Assessment Agent"),
    career: () => renderNextAgent("Career Coach Agent"),
    quiz: renderQuiz,
    pilots: renderPilots,
    pricing: renderPricing,
    settings: renderSettings
  };
  content.innerHTML = renderers[state.route]();
  bindRouteEvents();
}

function money(value) {
  return `KSh ${Number(value || 0).toLocaleString("en-KE")}`;
}

function percent(value) {
  return `${Math.round(Number(value || 0))}%`;
}

function totalStudents() {
  return state.data.schools.reduce((sum, school) => sum + Number(school.totalStudents || 0), 0);
}

function activeUsers() {
  return state.data.users.filter(user => user.status === "Active" || user.status === "Online").length;
}

function revenueSignal() {
  const schoolRevenue = state.data.schools.reduce((sum, school) => sum + Number(school.pricing?.effectivePriceKsh || 0), 0);
  const billingRevenue = (state.data.billing?.revenueByPlan || []).reduce((sum, row) => sum + Number(row.revenue_ksh_cents || 0) / 100, 0);
  return billingRevenue || schoolRevenue;
}

function renderDashboard() {
  const users = state.data.users.length;
  const active = activeUsers();
  const schools = state.data.schools.length;
  const revenue = revenueSignal();
  const subjectRows = subjectUsageRows();
  return `
    <div class="toolbar">
      <div class="filters">
        ${selectHtml("timeRange", ["This Year", "Last Year", "Last 30 Days", "Last 7 Days"], state.timeRange)}
        ${selectHtml("selectedGrade", ["All Grades", ...grades], state.selectedGrade)}
      </div>
    </div>
    <div class="metric-grid">
      ${metric("Total Users", users || totalStudents(), "Accounts and students", "blue")}
      ${metric("Active Users", active, "Verified active accounts", "green")}
      ${metric("New Users", Math.max(0, Math.round(users * 0.09)), "Recent additions", "amber")}
      ${metric("Revenue", money(revenue), "Paid and assigned plans", "red")}
    </div>
    <div class="two-col">
      ${panel("User Growth", lineChart([500, 700, 1020, Math.max(1220, users || 1200)], ["Jan", "Feb", "Mar", "Apr"], "#8179d6"))}
      ${panel("Revenue", barChart([2000, 2500, 3050, Math.max(3600, Math.round(revenue / 10) || 3600)], ["Jan", "Feb", "Mar", "Apr"], "#76c99f"))}
    </div>
    <div class="two-col">
      ${panel("Subject Usage", pieLegend(subjectRows))}
      ${panel("Admin Queue", nextLineItems())}
    </div>
  `;
}

function renderSchools() {
  const schools = sortedSchools();
  const mostActive = schools[0];
  const leastActive = [...schools].sort((a, b) => Number(a.totalStudents || 0) - Number(b.totalStudents || 0))[0];
  return `
    <div class="metric-grid three">
      ${metric("Most Active School", mostActive?.name || "No data", `${mostActive?.totalStudents || 0} students`, "blue")}
      ${metric("Highest Enrollment", mostActive?.name || "No data", `${mostActive?.totalStudents || 0} students`, "green")}
      ${metric("Least Active School", leastActive?.name || "No data", `${leastActive?.totalStudents || 0} students`, "red")}
    </div>
    <div class="panel">
      <div class="panel-header">
        <div><h2>School List</h2><p>${schools.length} live school records</p></div>
        <button class="primary-button" data-modal="school-form">Add School</button>
      </div>
      <div class="filters"><input id="searchInput" value="${escapeHtml(state.search)}" placeholder="Search for a school..." /></div>
      ${table(["School", "Location", "Students", "Pilot", "Actions"], schools.map(school => [
        escapeHtml(school.name),
        escapeHtml(school.location || "-"),
        Number(school.totalStudents || 0).toLocaleString(),
        `<span class="status-pill">${formatStatus(school.pilot?.status || "not_enrolled")}</span>`,
        `<div class="table-actions"><button class="primary-button" data-school="${school.id}">View Details</button></div>`
      ]))}
    </div>
  `;
}

function sortedSchools() {
  const term = state.search.trim().toLowerCase();
  return [...state.data.schools]
    .filter(school => !term || `${school.name} ${school.location}`.toLowerCase().includes(term))
    .sort((a, b) => Number(b.totalStudents || 0) - Number(a.totalStudents || 0));
}

function renderSubjects() {
  const rows = subjectUsageRows();
  return `
    <div class="toolbar">
      <div class="filters">
        ${selectHtml("timeRange", ["This Year", "Last Year", "Last 30 Days", "Last 7 Days"], state.timeRange)}
      </div>
    </div>
    <div class="metric-grid three">
      ${metric("Most Active Subject", rows[0]?.label || "Mathematics", `${rows[0]?.value || 25}%`, "blue")}
      ${metric("Least Active Subject", rows[rows.length - 1]?.label || "Geography", `${rows[rows.length - 1]?.value || 8}%`, "green")}
      ${metric("Most Improved Subject", "Computer Science", "10% this period", "red")}
    </div>
    <div class="two-col">
      ${panel("Subject Engagement", pieLegend(rows))}
      ${panel("Hours Spent", barChart([26, 20, 15, 10, 8, 12, 10], ["Math", "Science", "English", "History", "Geo", "CS", "Business"], "#8179d6"))}
    </div>
    <div class="panel">
      <div class="panel-header">
        <div><h2>Curriculum by Grade</h2><p>Subject replacement uses the same curriculum endpoint as mobile.</p></div>
        <button class="primary-button" data-modal="curriculum">Edit Curriculum</button>
      </div>
      <div class="filters">${selectHtml("selectedGrade", grades, state.selectedGrade === "All Grades" ? grades[0] : state.selectedGrade)}</div>
      ${table(["Subject", "Status", "Action"], subjects.map(subject => [
        subject,
        "<span class='status-pill green'>Active</span>",
        `<div class="table-actions"><button class="ghost-button" data-curriculum-subject="${subject}">Open</button></div>`
      ]))}
    </div>
  `;
}

function renderUsers() {
  const filtered = filteredUsers();
  return `
    <div class="toolbar">
      <div class="filters">
        ${selectHtml("selectedGrade", ["All Grades", ...grades], state.selectedGrade)}
        <input id="searchInput" value="${escapeHtml(state.search)}" placeholder="Search Users..." />
      </div>
    </div>
    <div class="metric-grid three">
      ${metric("Total Users", state.data.users.length, "Live user records", "soft-blue")}
      ${metric("Active Users", activeUsers(), "Verified accounts", "soft-green")}
      ${metric("New Users", Math.max(0, Math.round(state.data.users.length * 0.09)), "Recent additions", "soft-yellow")}
    </div>
    <div class="two-col">
      ${panel("User Acquisition", barChart([500, 700, 1020, 1240], ["Jan", "Feb", "Mar", "Apr"], "#8179d6"))}
      ${panel("Active Users", lineChart([500, 700, 1020, 1240], ["Jan", "Feb", "Mar", "Apr"], "#76c99f"))}
    </div>
    <div class="panel">
      ${table(["Name", "Email", "School", "Grade", "Status", "Actions"], filtered.map(user => [
        escapeHtml(user.name),
        escapeHtml(user.email),
        escapeHtml(user.school || "-"),
        escapeHtml(user.grade || "-"),
        `<span class="status-pill ${user.color === "green" ? "green" : "gray"}">${escapeHtml(user.status)}</span>`,
        `<div class="table-actions"><button class="primary-button" data-user="${user.id}">View More</button></div>`
      ]))}
    </div>
  `;
}

function filteredUsers() {
  const term = state.search.trim().toLowerCase();
  return state.data.users.filter(user => {
    const matchesSearch = !term || `${user.name} ${user.email} ${user.school}`.toLowerCase().includes(term);
    const matchesGrade = state.selectedGrade === "All Grades" || user.grade === state.selectedGrade;
    return matchesSearch && matchesGrade;
  });
}

function renderSales() {
  return `
    <div class="toolbar"><div></div><div class="filters">${selectHtml("timeRange", ["This Year", "Last 30 Days", "Last 7 Days"], state.timeRange)}</div></div>
    <div class="metric-grid three">
      ${metric("All Sales Agents", 50, "Onboarding team", "soft-blue")}
      ${metric("Highest Earning Agent", "Alice Johnson", "KSh 500,000", "soft-green")}
      ${metric("Lowest Earning Agent", "Bob Smith", "KSh 50,000", "soft-red")}
    </div>
    <div class="panel">
      ${table(["Name", "Email", "Phone", "Schools", "Actions"], [
        ["Alice Johnson", "alice@example.com", "123-456-7891", "School A, School B", '<div class="table-actions"><button class="primary-button" data-agent="alice">View More</button></div>'],
        ["Bob Smith", "bob@example.com", "123-456-7892", "School C", '<div class="table-actions"><button class="primary-button" data-agent="bob">View More</button></div>']
      ])}
    </div>
  `;
}

function renderTeacher() {
  const students = state.data.teacherStudents.length ? state.data.teacherStudents : demoTeacherStudents();
  return `
    <div class="toolbar">
      <div class="filters"><input id="searchInput" value="${escapeHtml(state.search)}" placeholder="Search by name" />${selectHtml("selectedGrade", ["All Grades", ...grades], state.selectedGrade)}</div>
      <button class="primary-button" data-modal="assignment">Set Assignment</button>
    </div>
    <div class="panel">
      <div class="panel-header"><div><h2>Student Performance</h2><p>Teacher records are loaded from the same teacher endpoints used by the app when the signed-in admin can access them.</p></div></div>
      ${table(["Name", "Grade", "Assessment Score", "Homework Completion", "Last Active", "Performance Trend", "Actions"], students.map(student => [
        escapeHtml(student.name || student.fullName || "Student"),
        escapeHtml(student.gradeLevel || student.grade || "-"),
        percent(student.averageScore || student.assessmentScore || 0),
        percent(student.homeworkCompletion || 0),
        escapeHtml(student.lastActive || "Recent"),
        escapeHtml(student.performanceTrend || "Stable"),
        `<div class="table-actions"><button class="primary-button" data-teacher-student="${escapeHtml(student.id || student.name)}">View More</button></div>`
      ]))}
    </div>
  `;
}

function renderParents() {
  const user = filteredUsers()[0] || state.data.users[0] || { name: "John Doe", grade: "Grade 6" };
  return `
    <div class="panel">
      <div class="panel-header"><div><h2>${escapeHtml(user.name)}'s Health Meter</h2><p>Parent module is next in line. It will reuse parent child dashboard data once exposed to admin scope.</p></div></div>
      <div class="health-meter">${gauge(74)}</div>
      <div class="kpi-stack">
        <div class="kpi-row"><strong>Grade</strong><span>${escapeHtml(user.grade || "Grade 6")}</span></div>
        <div class="kpi-row"><strong>Time Spent on App</strong><span>5 hours/week</span></div>
      </div>
      ${table(["Subject", "Score (%)"], [["Math", 85], ["English", 92], ["Science", 45]])}
    </div>
    ${panel("Time Spent per Subject", barChart([2, 1.5, 1], ["Math", "English", "Science"], "#8179d6"))}
  `;
}

function renderAgent() {
  const ai = state.data.ai || {};
  const topFeatures = ai.topFeatures || [];
  const featureLabels = topFeatures.slice(0, 3).map(row => String(row.feature || "").replaceAll("_", " ")) || [];
  const featureValues = topFeatures.slice(0, 3).map(row => Math.max(1, Number(row.spend_ksh_cents || 0) / 100));
  const flags = [
    ["Inappropriate language", "User123", "2025-03-10"],
    ["Off-topic questions", "User456", "2025-03-12"],
    ["Spam content", "User789", "2025-03-13"]
  ];
  return `
    <div class="two-col">
      ${panel("Most Engaged Subjects", barChart(featureValues.length ? featureValues : [120, 90, 75], featureLabels.length ? featureLabels : ["Math", "Science", "English"], "#10bfa4"))}
      ${panel("Daily Chat Time (hrs)", barChart([1.5, 2, 1.8, 2.2, 1.4, 2.5, 1], ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], "#8179d6"))}
    </div>
    <div class="panel">
      <div class="panel-header"><div><h2>Flagged Content</h2><p>${Number(ai.blockedEvents || 0)} blocked AI events from live analytics.</p></div></div>
      ${table(["Content", "Flagged By", "Date"], flags)}
    </div>
  `;
}

function renderNextAgent(name) {
  const ai = state.data.ai || {};
  return `
    <div class="metric-grid three">
      ${metric("Top Users", (ai.topUsers || []).length, "Live AI spend records", "blue")}
      ${metric("Blocked Events", Number(ai.blockedEvents || 0), "Safety events", "red")}
      ${metric("Tracked Features", (ai.topFeatures || []).length, "Feature spend", "green")}
    </div>
    <div class="panel">
      <div class="panel-header"><div><h2>${name}</h2><p>This module is next in line from the desktop screenshots. Live AI analytics are already connected.</p></div></div>
      ${table(["Feature", "Spend"], (ai.topFeatures || []).map(row => [
        escapeHtml(String(row.feature || "").replaceAll("_", " ")),
        money(Number(row.spend_ksh_cents || 0) / 100)
      ]))}
    </div>
  `;
}

function renderQuiz() {
  return `
    <div class="metric-grid three">
      ${metric("Quiz Sessions", 0, "Next in line", "blue")}
      ${metric("Completion Rate", "0%", "Awaiting analytics endpoint", "green")}
      ${metric("Average Score", "0%", "Awaiting analytics endpoint", "amber")}
    </div>
    <div class="panel"><h2>Quiz Arena</h2><p>Queued after the source-of-truth admin modules. This screen is present so the desktop navigation matches the planned admin surface.</p></div>
  `;
}

function renderPilots() {
  const schools = state.data.schools;
  return `
    <div class="metric-grid three">
      ${metric("Active", schools.filter(s => s.pilot?.status === "active").length, "Live pilots", "blue")}
      ${metric("Onboarding", schools.filter(s => s.pilot?.status === "onboarding").length, "In setup", "amber")}
      ${metric("Engaged", schools.reduce((sum, s) => sum + Number(s.pilot?.metrics?.engagedStudents || 0), 0), "Students", "green")}
    </div>
    <div class="panel">
      ${table(["School", "Status", "Stage", "Target", "Engaged", "Actions"], schools.map(school => [
        escapeHtml(school.name),
        `<span class="status-pill">${formatStatus(school.pilot?.status || "not_enrolled")}</span>`,
        `${school.pilot?.onboardingStage || 0}/4`,
        Number(school.pilot?.targetStudents || 0).toLocaleString(),
        Number(school.pilot?.metrics?.engagedStudents || 0).toLocaleString(),
        `<div class="table-actions"><button class="primary-button" data-pilot="${school.id}">Update Pilot</button></div>`
      ]))}
    </div>
  `;
}

function renderPricing() {
  const billing = state.data.billing || {};
  return `
    <div class="metric-grid three">
      ${metric("Active Subscriptions", Number(billing.activeSubscriptions || 0), "Paid accounts", "blue")}
      ${metric("Failed Payments", Number(billing.failedPayments || 0), "Needs follow-up", "red")}
      ${metric("Revenue Signal", money(revenueSignal()), "Payments and school plans", "green")}
    </div>
    <div class="two-col">
      <div class="panel">
        <div class="panel-header"><div><h2>School Pricing</h2><p>Assign packages and discounts to schools.</p></div><button class="primary-button" data-modal="school-form">Add School</button></div>
        ${table(["School", "Plan", "Effective Price", "Actions"], state.data.schools.map(s => [
          escapeHtml(s.name),
          escapeHtml(s.pricing?.assignedPlanName || "No package"),
          money(s.pricing?.effectivePriceKsh || 0),
          `<div class="table-actions"><button class="ghost-button" data-school-price="${s.id}">Edit</button></div>`
        ]))}
      </div>
      <div class="panel">
        <div class="panel-header"><div><h2>Reusable Discounts</h2><p>Create and manage school discounts.</p></div><button class="primary-button" data-modal="discount">Add Discount</button></div>
        ${table(["Discount", "Type", "Amount", "Status"], state.data.discounts.map(d => [
          escapeHtml(d.name),
          escapeHtml(d.type),
          d.type === "percentage" ? `${d.amount}%` : money(d.amount),
          `<span class="status-pill ${d.isActive ? "green" : "gray"}">${d.isActive ? "Active" : "Paused"}</span>`
        ]))}
      </div>
    </div>
    <div class="panel">
      <div class="panel-header"><div><h2>Hero Announcements</h2><p>In-app announcements shared with mobile.</p></div><button class="primary-button" data-modal="announcement">Add Announcement</button></div>
      ${table(["Title", "Message", "Target", "Status"], state.data.announcements.map(a => [
        escapeHtml(a.title),
        escapeHtml(a.message),
        escapeHtml(a.ctaTarget || "-"),
        `<span class="status-pill ${a.isActive ? "green" : "gray"}">${a.isActive ? "Active" : "Inactive"}</span>`
      ]))}
    </div>
  `;
}

function renderSettings() {
  return `
    <div class="next-list">
      ${nextCard("Admin profile", "Session, password rotation, and TOTP enforcement controls.")}
      ${nextCard("Notifications", "Desktop alerts for school, payment, and safety events.")}
      ${nextCard("Audit log", "Admin actions and production readiness checks.")}
    </div>
    <div class="panel"><button class="danger-button" id="signOutButton">Sign out</button></div>
  `;
}

function nextLineItems() {
  return `<div class="next-list">
    ${["Sales Agents", "Teacher's Portal", "Parents' Portal", "AI Agent Monitoring", "Quiz Arena", "Settings"].map(label => nextCard(label, "Queued from attached desktop screens after source-of-truth mobile features.")).join("")}
  </div>`;
}

function nextCard(title, body) {
  return `<div class="next-card"><strong>${title}</strong><span>${body}</span></div>`;
}

function bindRouteEvents() {
  document.querySelectorAll("[data-route-control]").forEach(el => {
    el.addEventListener("change", event => {
      state[event.target.dataset.routeControl] = event.target.value;
      renderRoute();
    });
  });
  const search = document.getElementById("searchInput");
  if (search) search.addEventListener("input", event => { state.search = event.target.value; renderRoute(); });
  document.querySelectorAll("[data-school]").forEach(button => button.addEventListener("click", () => showSchool(button.dataset.school)));
  document.querySelectorAll("[data-user]").forEach(button => button.addEventListener("click", () => showUser(button.dataset.user)));
  document.querySelectorAll("[data-agent]").forEach(button => button.addEventListener("click", () => showAgent(button.dataset.agent)));
  document.querySelectorAll("[data-teacher-student]").forEach(button => button.addEventListener("click", () => showTeacherStudent(button.dataset.teacherStudent)));
  document.querySelectorAll("[data-pilot]").forEach(button => button.addEventListener("click", () => showPilot(button.dataset.pilot)));
  document.querySelectorAll("[data-modal]").forEach(button => button.addEventListener("click", () => showNamedModal(button.dataset.modal)));
  const signOut = document.getElementById("signOutButton");
  if (signOut) signOut.addEventListener("click", () => { clearSession(); clearInterval(state.timer); showLogin(); });
}

function selectHtml(key, options, value) {
  return `<select data-route-control="${key}">${options.map(option => `<option value="${escapeHtml(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select>`;
}

function metric(label, value, meta, tone) {
  return `<div class="metric-card ${tone}"><div><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong><small>${escapeHtml(meta || "")}</small></div></div>`;
}

function panel(title, body) {
  return `<div class="panel"><h2>${escapeHtml(title)}</h2>${body}</div>`;
}

function table(headers, rows) {
  if (!rows || rows.length === 0) return `<div class="empty-state">No live records available yet.</div>`;
  return `<div class="table-wrap"><table><thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function barChart(values, labels, color) {
  const max = Math.max(...values, 1);
  const width = 600;
  const height = 250;
  const chartH = 180;
  const gap = 18;
  const barW = Math.max(24, (width - 80 - gap * (values.length - 1)) / values.length);
  return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img">
    <line class="axis" x1="50" y1="20" x2="50" y2="200"></line><line class="axis" x1="50" y1="200" x2="${width - 20}" y2="200"></line>
    ${[0, 0.25, 0.5, 0.75, 1].map(t => `<line class="grid-line" x1="50" y1="${200 - chartH * t}" x2="${width - 20}" y2="${200 - chartH * t}"></line><text x="12" y="${205 - chartH * t}">${Math.round(max * t)}</text>`).join("")}
    ${values.map((value, index) => {
      const h = (value / max) * chartH;
      const x = 65 + index * (barW + gap);
      return `<rect x="${x}" y="${200 - h}" width="${barW}" height="${h}" rx="6" fill="${color}"></rect><text x="${x + barW / 2}" y="224" text-anchor="middle">${escapeHtml(labels[index] || "")}</text>`;
    }).join("")}
  </svg>`;
}

function lineChart(values, labels, color) {
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = 50 + index * (500 / Math.max(1, values.length - 1));
    const y = 200 - (value / max) * 175;
    return [x, y];
  });
  const d = points.map((point, index) => `${index === 0 ? "M" : "L"}${point[0]},${point[1]}`).join(" ");
  return `<svg class="chart" viewBox="0 0 600 250" role="img">
    <line class="axis" x1="50" y1="20" x2="50" y2="200"></line><line class="axis" x1="50" y1="200" x2="560" y2="200"></line>
    ${[0, 0.25, 0.5, 0.75, 1].map(t => `<line class="grid-line" x1="50" y1="${200 - 175 * t}" x2="560" y2="${200 - 175 * t}"></line><text x="12" y="${205 - 175 * t}">${Math.round(max * t)}</text>`).join("")}
    <path d="${d}" fill="none" stroke="${color}" stroke-width="3"></path>
    ${points.map(point => `<circle cx="${point[0]}" cy="${point[1]}" r="4" fill="#fff" stroke="${color}" stroke-width="2"></circle>`).join("")}
    ${labels.map((label, index) => `<text x="${50 + index * (500 / Math.max(1, labels.length - 1))}" y="224" text-anchor="middle">${escapeHtml(label)}</text>`).join("")}
  </svg>`;
}

function pieLegend(rows) {
  const colors = ["#8179d6", "#76c99f", "#ffcf6b", "#ff7a2f", "#258fde", "#10bfa4", "#f6bb2f"];
  return `<div class="two-col" style="align-items:center;grid-template-columns:260px 1fr">
    <svg class="chart" viewBox="0 0 220 220" style="height:220px">
      ${pieSlices(rows.map(row => row.value), colors)}
    </svg>
    <div class="kpi-stack">
      ${rows.map((row, index) => `<div class="kpi-row"><strong><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${colors[index % colors.length]};margin-right:8px"></span>${escapeHtml(row.label)}</strong><span>${row.value}%</span></div>`).join("")}
    </div>
  </div>`;
}

function pieSlices(values, colors) {
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  let angle = -90;
  return values.map((value, index) => {
    const slice = (value / total) * 360;
    const path = describeArc(110, 110, 75, angle, angle + slice);
    angle += slice;
    return `<path d="${path}" fill="none" stroke="${colors[index % colors.length]}" stroke-width="42"></path>`;
  }).join("");
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx, cy, r, angle) {
  const radians = (angle - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(radians), y: cy + r * Math.sin(radians) };
}

function gauge(score) {
  return `<svg class="gauge" viewBox="0 0 260 145" role="img" aria-label="Health score ${score}%">
    <path d="M35 120 A95 95 0 0 1 225 120" fill="none" stroke="#e5e7eb" stroke-width="24" pathLength="100"/>
    <path d="M35 120 A95 95 0 0 1 225 120" fill="none" stroke="#ff414d" stroke-width="24" pathLength="100" stroke-dasharray="30 70"/>
    <path d="M35 120 A95 95 0 0 1 225 120" fill="none" stroke="#ffb84d" stroke-width="24" pathLength="100" stroke-dasharray="34 66" stroke-dashoffset="-30"/>
    <path d="M35 120 A95 95 0 0 1 225 120" fill="none" stroke="#10bfa4" stroke-width="24" pathLength="100" stroke-dasharray="36 64" stroke-dashoffset="-64"/>
    <text x="130" y="115" text-anchor="middle">${score}%</text>
  </svg>`;
}

function subjectUsageRows() {
  return [
    { label: "Math", value: 25 },
    { label: "Science", value: 20 },
    { label: "English", value: 15 },
    { label: "History", value: 10 },
    { label: "Geography", value: 8 },
    { label: "Business", value: 12 },
    { label: "Computer Science", value: 10 }
  ];
}

function demoTeacherStudents() {
  return [
    { id: "john", name: "John Doe", grade: "Grade 6", assessmentScore: 85, homeworkCompletion: 90, lastActive: "2 days ago", performanceTrend: "Improving" },
    { id: "jane", name: "Jane Smith", grade: "Grade 7", assessmentScore: 78, homeworkCompletion: 85, lastActive: "1 day ago", performanceTrend: "Stable" },
    { id: "michael", name: "Michael Brown", grade: "Grade 8", assessmentScore: 92, homeworkCompletion: 95, lastActive: "3 hours ago", performanceTrend: "Excellent" }
  ];
}

function showSchool(id) {
  const school = state.data.schools.find(item => item.id === id);
  if (!school) return;
  openModal(school.name, `
    <div class="kpi-stack">
      <div class="kpi-row"><strong>Location</strong><span>${escapeHtml(school.location || "-")}</span></div>
      <div class="kpi-row"><strong>Principal</strong><span>${escapeHtml(school.principal || "-")}</span></div>
      <div class="kpi-row"><strong>Total Students</strong><span>${Number(school.totalStudents || 0).toLocaleString()}</span></div>
      <div class="kpi-row"><strong>Engagement Rate</strong><span>${percent(school.pilot?.metrics?.averageMastery || 0)}</span></div>
      <div class="kpi-row"><strong>Plan</strong><span>${escapeHtml(school.pricing?.assignedPlanName || "No package")}</span></div>
    </div>
    <h3>Grade distribution</h3>
    ${table(["Grade", "Students"], Object.entries(school.gradeCounts || {}).map(([grade, count]) => [escapeHtml(grade), Number(count).toLocaleString()]))}
  `, "small");
}

function showUser(id) {
  const user = state.data.users.find(item => item.id === id);
  if (!user) return;
  openModal(user.name, `
    <div class="kpi-stack">
      <div class="kpi-row"><strong>School</strong><span>${escapeHtml(user.school || "-")}</span></div>
      <div class="kpi-row"><strong>Grade</strong><span>${escapeHtml(user.grade || "-")}</span></div>
      <div class="kpi-row"><strong>Email</strong><span>${escapeHtml(user.email || "-")}</span></div>
      <div class="kpi-row"><strong>Status</strong><span>${escapeHtml(user.status || "-")}</span></div>
      <div class="kpi-row"><strong>Total Time Spent</strong><span>15 hours</span></div>
      <div class="kpi-row"><strong>Assignments Attempted</strong><span>25</span></div>
    </div>
  `, "small");
}

function showAgent(id) {
  const name = id === "alice" ? "Alice Johnson" : "Bob Smith";
  openModal(name, `
    <h3>Schools Onboarded</h3>
    <p>School A - 416 students</p>
    <p>School B - 337 students</p>
  `, "small");
}

function showTeacherStudent(id) {
  const student = demoTeacherStudents().find(item => item.id === id) || demoTeacherStudents()[0];
  openModal(`${student.name} - ${student.grade}`, table(["Subject", "Score (%)", "Assessment"], [
    ["Math", "90%", "Exceeding Expectations"],
    ["English", "85%", "Exceeding Expectations"],
    ["Science", "80%", "Exceeding Expectations"]
  ]));
}

function showPilot(id) {
  const school = state.data.schools.find(item => item.id === id);
  if (!school) return;
  openModal(`Pilot: ${school.name}`, pilotForm(school));
}

function showNamedModal(name) {
  if (name === "assignment") return openModal("Set Assignment", assignmentForm());
  if (name === "school-form") return openModal("School", schoolForm(), "small");
  if (name === "discount") return openModal("Discount", discountForm(), "small");
  if (name === "announcement") return openModal("Announcement", announcementForm(), "small");
  if (name === "curriculum") return openModal("Curriculum Editor", curriculumForm());
}

function openModal(title, body, size = "") {
  modalRoot.hidden = false;
  modalRoot.innerHTML = `<div class="modal ${size}">
    <div class="modal-head"><h2>${escapeHtml(title)}</h2><button class="modal-close" aria-label="Close dialog">X</button></div>
    <div>${body}</div>
  </div>`;
  modalRoot.querySelector(".modal-close").addEventListener("click", closeModal);
  modalRoot.addEventListener("click", onScrimClick, { once: true });
  bindModalForms();
}

function onScrimClick(event) {
  if (event.target === modalRoot) closeModal();
  else modalRoot.addEventListener("click", onScrimClick, { once: true });
}

function closeModal() {
  modalRoot.hidden = true;
  modalRoot.innerHTML = "";
}

function bindModalForms() {
  modalRoot.querySelectorAll("form").forEach(form => {
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const formData = Object.fromEntries(new FormData(form).entries());
      try {
        if (form.dataset.kind === "school") {
          await api("/admin/schools", { method: "POST", body: {
            name: formData.name,
            location: formData.location,
            principal: formData.principal || null,
            phone: formData.phone || null,
            email: formData.email || null,
            assignedPlanCode: formData.assignedPlanCode || "monthly",
            discountId: formData.discountId || null
          }});
        }
        if (form.dataset.kind === "discount") {
          await api("/admin/discounts", { method: "POST", body: {
            name: formData.name,
            type: formData.type,
            amount: Number(formData.amount),
            isActive: formData.isActive === "true"
          }});
        }
        if (form.dataset.kind === "announcement") {
          await api("/admin/announcements", { method: "POST", body: {
            title: formData.title,
            message: formData.message,
            ctaLabel: formData.ctaLabel || null,
            ctaTarget: formData.ctaTarget,
            startsAt: formData.startsAt || undefined,
            endsAt: formData.endsAt || null,
            isActive: formData.isActive === "true"
          }});
        }
        if (form.dataset.kind === "pilot") {
          await api(`/admin/schools/${form.dataset.schoolId}/pilot`, { method: "PATCH", body: {
            status: formData.status,
            startDate: formData.startDate || null,
            endDate: formData.endDate || null,
            targetStudents: Number(formData.targetStudents || 0),
            onboardingStage: Number(formData.onboardingStage || 0),
            notes: formData.notes || null
          }});
        }
        closeModal();
        await loadAll(true);
      } catch (error) {
        const errorEl = form.querySelector(".error-text");
        if (errorEl) errorEl.textContent = error.message;
      }
    });
  });
  const generate = document.getElementById("generateAssignment");
  if (generate) generate.addEventListener("click", () => {
    document.getElementById("assignmentOutput").value = "Generated assignment draft: five CBC-aligned questions with marking guide and remediation notes.";
  });
}

function showProfileModal() {
  const user = state.user || {};
  openModal(user.fullName || "Admin", `
    <div class="kpi-stack">
      <div class="kpi-row"><strong>Email</strong><span>${escapeHtml(user.email || "-")}</span></div>
      <div class="kpi-row"><strong>Roles</strong><span>${escapeHtml((user.roles || []).join(", ") || "-")}</span></div>
      <div class="kpi-row"><strong>API</strong><span>${escapeHtml(API_BASE)}</span></div>
    </div>
    <div class="button-row" style="margin-top:16px"><button class="danger-button" id="modalSignOut">Sign out</button></div>
  `, "small");
  document.getElementById("modalSignOut").addEventListener("click", () => { clearSession(); closeModal(); showLogin(); });
}

function schoolForm() {
  return `<form data-kind="school" class="form-grid">
    <label>Name <input name="name" required /></label>
    <label>Location <input name="location" required /></label>
    <label>Principal <input name="principal" /></label>
    <label>Phone <input name="phone" /></label>
    <label>Email <input name="email" type="email" /></label>
    <label>Plan ${selectField("assignedPlanCode", ["weekly", "monthly", "annual"], "monthly")}</label>
    <label class="wide">Discount ${selectField("discountId", ["", ...state.data.discounts.map(d => d.id)], "")}</label>
    <p class="error-text wide"></p>
    <button class="primary-button wide" type="submit">Save School</button>
  </form>`;
}

function discountForm() {
  return `<form data-kind="discount" class="form-grid">
    <label class="wide">Name <input name="name" required /></label>
    <label>Type ${selectField("type", ["percentage", "fixed_ksh"], "percentage")}</label>
    <label>Amount <input name="amount" type="number" min="1" required value="10" /></label>
    <label class="wide">Status ${selectField("isActive", ["true", "false"], "true")}</label>
    <p class="error-text wide"></p>
    <button class="primary-button wide" type="submit">Save Discount</button>
  </form>`;
}

function announcementForm() {
  return `<form data-kind="announcement" class="form-grid">
    <label class="wide">Title <input name="title" required /></label>
    <label class="wide">Message <textarea name="message" required></textarea></label>
    <label>CTA Label <input name="ctaLabel" /></label>
    <label>CTA Target ${selectField("ctaTarget", ["ask_tutor", "manage_subscription", "homework_list", "bookshelf_view"], "ask_tutor")}</label>
    <label>Starts At <input name="startsAt" placeholder="2026-06-20T09:00:00.000Z" /></label>
    <label>Ends At <input name="endsAt" /></label>
    <label class="wide">Status ${selectField("isActive", ["true", "false"], "true")}</label>
    <p class="error-text wide"></p>
    <button class="primary-button wide" type="submit">Save Announcement</button>
  </form>`;
}

function pilotForm(school) {
  const pilot = school.pilot || {};
  return `<form data-kind="pilot" data-school-id="${school.id}" class="form-grid">
    <label>Status ${selectField("status", ["not_enrolled", "onboarding", "active", "paused", "completed"], pilot.status || "not_enrolled")}</label>
    <label>Onboarding Stage <input name="onboardingStage" type="number" min="0" max="4" value="${pilot.onboardingStage || 0}" /></label>
    <label>Target Students <input name="targetStudents" type="number" min="0" value="${pilot.targetStudents || 0}" /></label>
    <label>Start Date <input name="startDate" type="date" value="${pilot.startDate || ""}" /></label>
    <label>End Date <input name="endDate" type="date" value="${pilot.endDate || ""}" /></label>
    <label class="wide">Notes <textarea name="notes">${escapeHtml(pilot.notes || "")}</textarea></label>
    <p class="error-text wide"></p>
    <button class="primary-button wide" type="submit">Save Pilot</button>
  </form>`;
}

function assignmentForm() {
  return `<form class="form-grid">
    <label>Grade ${selectField("grade", grades, "Grade 4")}</label>
    <label>Subject ${selectField("subject", subjects, "Mathematics")}</label>
    <label class="wide">Upload File <input name="file" type="file" /></label>
    <button class="primary-button wide" id="generateAssignment" type="button">Generate with AI</button>
    <label class="wide">Assignment Details <textarea id="assignmentOutput" placeholder="Enter assignment details for AI generation..."></textarea></label>
    <div class="button-row wide"><button class="ghost-button" type="button">Re-Generate</button><button class="warning-button" type="button">Edit</button><button class="success-button" type="button">Send</button></div>
  </form>`;
}

function curriculumForm() {
  return `<div class="tabs">${grades.map((grade, index) => `<button class="tab-button ${index === 0 ? "active" : ""}">${grade}</button>`).join("")}</div>
    ${table(["Subject", "Source", "State"], subjects.map(subject => [subject, "API / manual editor", "<span class='status-pill green'>Ready</span>"]))}`;
}

function selectField(name, options, value) {
  return `<select name="${name}">${options.map(option => `<option value="${escapeHtml(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option || "None")}</option>`).join("")}</select>`;
}

function formatStatus(value) {
  return String(value).split("_").map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

init();
