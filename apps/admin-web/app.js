const API_BASE = window.KITABU_API_BASE || "https://app.kitabu.ai";
const TOKEN_KEY = "kitabu.admin.accessToken";
const REFRESH_KEY = "kitabu.admin.refreshToken";
const USER_KEY = "kitabu.admin.user";
const REFRESH_MS = 30000;

const grades = ["Grade 4", "Grade 6", "Grade 9", "Form 4"];
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
    teacherAssignments: [],
    quizBank: null
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
      if (state.route === "subjects") loadCurriculumGrade().then(renderRoute);
      if (state.route === "quiz") loadQuizBankGrade().then(renderRoute);
    });
  });
}

function showLogin() {
  app.classList.add("auth-mode");
  loginPanel.hidden = false;
  content.hidden = true;
  pageTitle.textContent = "Admin Portal";
  pageSub.textContent = "Sign in to manage Kitabu AI.";
  setSync("Signed out", "Authentication required", "error");
}

function showApp() {
  app.classList.remove("auth-mode");
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
    if (state.route === "subjects") await loadCurriculumGrade();
    if (state.route === "quiz") await loadQuizBankGrade();
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

async function loadCurriculumGrade(grade = currentCurriculumGrade()) {
  try {
    const query = new URLSearchParams({ grade });
    state.data.curriculum = await api(`/curriculum?${query.toString()}`);
  } catch (error) {
    state.data.curriculum = { grade, subjects: [], error: error.message || "Unable to load curriculum." };
  }
}

async function loadQuizBankGrade(grade = currentCurriculumGrade()) {
  try {
    const query = new URLSearchParams({ grade, limit: "100" });
    state.data.quizBank = await api(`/quiz-bank?${query.toString()}`);
  } catch (error) {
    state.data.quizBank = { grade, questions: [], error: error.message || "Unable to load QuizBank." };
  }
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
    sales: ["Sales Agents", "Live school owner and onboarding contacts."],
    teacher: ["Teacher's Portal", "Student performance and assignment workflows."],
    parents: ["Parents' Portal", "Parent-facing learner health and progress view."],
    chatbot: ["Chatbot Agent", "AI usage, engaged subjects, and flagged content."],
    tutor: ["Tutor Agent", "Live AI usage and spend analytics."],
    quickfacts: ["QuickFacts Agent", "Live AI usage and spend analytics."],
    homework: ["Homework Agent", "Live assignment assistance analytics."],
    assessment: ["Assessment Agent", "Live assessment and AI analytics."],
    career: ["Career Coach Agent", "Live career guidance AI analytics."],
    quiz: ["Quiz Arena", "Live QuizBank fallback questions by grade."],
    pilots: ["Pilots", "School pilot onboarding and launch readiness."],
    pricing: ["Pricing", "School packages, discounts, and in-app announcements."],
    settings: ["Settings", "Live sync, backend, and admin session controls."]
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

function usersForSelectedGrade() {
  return state.data.users.filter(user => state.selectedGrade === "All Grades" || user.grade === state.selectedGrade);
}

function recentUsers(days = 30) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return state.data.users.filter(user => {
    const createdAt = Date.parse(user.createdAt || "");
    return Number.isFinite(createdAt) && createdAt >= cutoff;
  });
}

function monthBuckets(count = 4) {
  const buckets = [];
  const now = new Date();
  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    buckets.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleString("en", { month: "short" }),
      value: 0
    });
  }
  return buckets;
}

function monthlyCounts(records, field, count = 4) {
  const buckets = monthBuckets(count);
  const byKey = new Map(buckets.map(bucket => [bucket.key, bucket]));
  records.forEach(record => {
    const value = record[field];
    if (!value) return;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const bucket = byKey.get(key);
    if (bucket) bucket.value += 1;
  });
  return {
    labels: buckets.map(bucket => bucket.label),
    values: buckets.map(bucket => bucket.value)
  };
}

function revenueSeries() {
  const rows = state.data.billing?.revenueByPlan || [];
  if (rows.length) {
    return {
      labels: rows.map(row => String(row.plan_code || "plan")),
      values: rows.map(row => Number(row.revenue_ksh_cents || 0) / 100)
    };
  }
  const schools = state.data.schools.slice(0, 6);
  return {
    labels: schools.map(school => school.name.split(" ")[0] || "School"),
    values: schools.map(school => Number(school.pricing?.effectivePriceKsh || 0))
  };
}

function subjectRowsFromAssignments() {
  const counts = new Map();
  state.data.teacherAssignments.forEach(assignment => {
    const subject = assignment.subject || "Unassigned";
    counts.set(subject, (counts.get(subject) || 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, raw: count }))
    .sort((left, right) => right.raw - left.raw);
}

function subjectRowsFromCurriculum() {
  const current = state.data.curriculum?.subjects || [];
  return current
    .map(subject => ({
      label: subject.subjectName,
      raw: (subject.strands || []).reduce((sum, strand) => sum + Number((strand.subStrands || []).length || 0), 0)
    }))
    .filter(row => row.raw > 0)
    .sort((left, right) => right.raw - left.raw);
}

function toPercentageRows(rows) {
  const total = rows.reduce((sum, row) => sum + Number(row.raw || 0), 0) || 1;
  return rows.map(row => ({
    label: row.label,
    value: Math.max(1, Math.round((Number(row.raw || 0) / total) * 100))
  }));
}

function liveSubjectUsageRows() {
  const rows = subjectRowsFromAssignments();
  return toPercentageRows(rows.length ? rows : subjectRowsFromCurriculum());
}

function assignmentScoreRows() {
  return state.data.teacherAssignments
    .filter(assignment => Number(assignment.averageScore || 0) > 0)
    .slice(0, 6)
    .map(assignment => ({
      label: assignment.subject || assignment.title || "Assignment",
      value: Number(assignment.averageScore || 0)
    }));
}

function schoolOwnerRows() {
  return state.data.schools.map(school => ({
    id: school.id,
    name: school.principal || school.name,
    email: school.email || "-",
    phone: school.phone || "-",
    schools: school.name,
    revenue: Number(school.pricing?.effectivePriceKsh || 0),
    students: Number(school.totalStudents || 0)
  }));
}

function renderDashboard() {
  const visibleUsers = usersForSelectedGrade();
  const users = visibleUsers.length || state.data.users.length;
  const active = visibleUsers.filter(user => user.status === "Active" || user.status === "Online").length || activeUsers();
  const schools = state.data.schools.length;
  const revenue = revenueSignal();
  const subjectRows = liveSubjectUsageRows();
  const userGrowth = monthlyCounts(state.data.users, "createdAt");
  const revenueData = revenueSeries();
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
      ${metric("New Users", recentUsers().length, "Added in last 30 days", "amber")}
      ${metric("Revenue", money(revenue), "Paid and assigned plans", "red")}
    </div>
    <div class="two-col">
      ${panel("User Growth", lineChart(userGrowth.values, userGrowth.labels, "#8179d6"))}
      ${panel("Revenue", barChart(revenueData.values, revenueData.labels, "#76c99f"))}
    </div>
    <div class="two-col">
      ${panel("Subject Usage", pieLegend(subjectRows))}
      ${panel("Live Admin Feed", liveAdminFeed())}
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
  const rows = liveSubjectUsageRows();
  const scoreRows = assignmentScoreRows();
  const grade = currentCurriculumGrade();
  const curriculum = state.data.curriculum?.grade === grade ? state.data.curriculum : null;
  const curriculumSubjects = curriculumSubjectOptions();
  const bestScore = scoreRows[0];
  return `
    <div class="toolbar">
      <div class="filters">
        ${selectHtml("timeRange", ["This Year", "Last Year", "Last 30 Days", "Last 7 Days"], state.timeRange)}
        ${selectHtml("selectedGrade", grades, grade)}
      </div>
    </div>
    <div class="metric-grid three">
      ${metric("Most Active Subject", rows[0]?.label || "No live subject data", rows[0] ? `${rows[0].value}%` : "0%", "blue")}
      ${metric("Least Active Subject", rows[rows.length - 1]?.label || "No live subject data", rows.length ? `${rows[rows.length - 1].value}%` : "0%", "green")}
      ${metric("Best Assignment Average", bestScore?.label || "No scored assignments", bestScore ? percent(bestScore.value) : "0%", "red")}
    </div>
    <div class="two-col">
      ${panel("Subject Engagement", pieLegend(rows))}
      ${panel("Assignment Averages", barChart(scoreRows.map(row => row.value), scoreRows.map(row => row.label), "#8179d6"))}
    </div>
    <div class="panel">
      <div class="panel-header">
        <div><h2>Curriculum by Grade</h2><p>${escapeHtml(curriculum?.error || `Loaded from /curriculum for ${grade}.`)}</p></div>
        <button class="primary-button" data-modal="curriculum">Edit Curriculum</button>
      </div>
      ${table(["Subject", "Strands", "Status", "Action"], curriculumSubjects.map(subject => [
        escapeHtml(subject.subjectName),
        Number(subject.strands?.length || 0).toLocaleString(),
        curriculum && !curriculum.error ? "<span class='status-pill green'>Loaded</span>" : "<span class='status-pill gray'>Pending</span>",
        `<div class="table-actions"><button class="ghost-button" data-curriculum-subject="${escapeHtml(subject.subjectId)}">Open</button></div>`
      ]))}
    </div>
  `;
}

function renderUsers() {
  const filtered = filteredUsers();
  const created = monthlyCounts(filtered, "createdAt");
  const active = monthlyCounts(filtered.filter(user => user.lastActiveAt), "lastActiveAt");
  const recent = filtered.filter(user => {
    const createdAt = Date.parse(user.createdAt || "");
    return Number.isFinite(createdAt) && createdAt >= Date.now() - 30 * 24 * 60 * 60 * 1000;
  });
  return `
    <div class="toolbar">
      <div class="filters">
        ${selectHtml("selectedGrade", ["All Grades", ...grades], state.selectedGrade)}
        <input id="searchInput" value="${escapeHtml(state.search)}" placeholder="Search Users..." />
      </div>
    </div>
    <div class="metric-grid three">
      ${metric("Total Users", filtered.length, "Live user records", "soft-blue")}
      ${metric("Active Users", filtered.filter(user => user.status === "Active" || user.status === "Online").length, "Verified accounts", "soft-green")}
      ${metric("New Users", recent.length, "Added in last 30 days", "soft-yellow")}
    </div>
    <div class="two-col">
      ${panel("User Acquisition", barChart(created.values, created.labels, "#8179d6"))}
      ${panel("Active Users", lineChart(active.values, active.labels, "#76c99f"))}
    </div>
    <div class="panel">
      ${table(["Name", "Email", "School", "Grade", "Status", "Last Active", "Actions"], filtered.map(user => [
        escapeHtml(user.name),
        escapeHtml(user.email),
        escapeHtml(user.school || "-"),
        escapeHtml(user.grade || "-"),
        `<span class="status-pill ${user.color === "green" ? "green" : "gray"}">${escapeHtml(user.status)}</span>`,
        escapeHtml(user.lastActive || "-"),
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
  const owners = schoolOwnerRows();
  const topOwner = [...owners].sort((left, right) => right.revenue - left.revenue)[0];
  const lowOwner = [...owners].sort((left, right) => left.revenue - right.revenue)[0];
  return `
    <div class="toolbar"><div></div><div class="filters">${selectHtml("timeRange", ["This Year", "Last 30 Days", "Last 7 Days"], state.timeRange)}</div></div>
    <div class="metric-grid three">
      ${metric("School Owners", owners.length, "Live school contacts", "soft-blue")}
      ${metric("Highest Revenue Owner", topOwner?.name || "No data", topOwner ? money(topOwner.revenue) : "KSh 0", "soft-green")}
      ${metric("Lowest Revenue Owner", lowOwner?.name || "No data", lowOwner ? money(lowOwner.revenue) : "KSh 0", "soft-red")}
    </div>
    <div class="panel">
      ${table(["Owner", "Email", "Phone", "School", "Students", "Revenue", "Actions"], owners.map(owner => [
        escapeHtml(owner.name),
        escapeHtml(owner.email),
        escapeHtml(owner.phone),
        escapeHtml(owner.schools),
        Number(owner.students || 0).toLocaleString(),
        money(owner.revenue),
        `<div class="table-actions"><button class="primary-button" data-school="${owner.id}">View More</button></div>`
      ]))}
    </div>
  `;
}

function renderTeacher() {
  const students = state.data.teacherStudents;
  const assignments = state.data.teacherAssignments;
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
        escapeHtml(student.trend || student.performanceTrend || "Stable"),
        `<div class="table-actions"><button class="primary-button" data-teacher-student="${escapeHtml(student.id || student.name)}">View More</button></div>`
      ]))}
    </div>
    <div class="panel">
      <div class="panel-header"><div><h2>Assignments</h2><p>${assignments.length} live assignments from /teacher/assignments.</p></div></div>
      ${table(["Title", "Subject", "Grade", "Submitted", "Average", "Due"], assignments.map(assignment => [
        escapeHtml(assignment.title),
        escapeHtml(assignment.subject),
        escapeHtml(assignment.gradeLevel || "-"),
        `${Number(assignment.submittedCount || 0).toLocaleString()} / ${Number(assignment.totalStudents || 0).toLocaleString()}`,
        percent(assignment.averageScore || 0),
        escapeHtml(assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : "-")
      ]))}
    </div>
  `;
}

function renderParents() {
  const student = state.data.teacherStudents.find(item => state.selectedGrade === "All Grades" || item.grade === state.selectedGrade) || state.data.teacherStudents[0];
  const user = filteredUsers()[0] || state.data.users[0];
  const name = student?.name || user?.name || "No learner selected";
  const grade = student?.grade || user?.grade || "-";
  const score = Number(student?.assessmentScore || 0);
  const homework = Number(student?.homeworkCompletion || 0);
  const health = Math.round((score + homework) / 2);
  const scoreRows = assignmentScoreRows();
  return `
    <div class="panel">
      <div class="panel-header"><div><h2>${escapeHtml(name)}'s Health Meter</h2><p>Derived from live teacher student performance and assignment data.</p></div></div>
      <div class="health-meter">${gauge(health)}</div>
      <div class="kpi-stack">
        <div class="kpi-row"><strong>Grade</strong><span>${escapeHtml(grade)}</span></div>
        <div class="kpi-row"><strong>Assessment Average</strong><span>${percent(score)}</span></div>
        <div class="kpi-row"><strong>Homework Completion</strong><span>${percent(homework)}</span></div>
      </div>
      ${table(["Subject", "Average Score"], scoreRows.map(row => [escapeHtml(row.label), percent(row.value)]))}
    </div>
    ${panel("Assignment Scores by Subject", barChart(scoreRows.map(row => row.value), scoreRows.map(row => row.label), "#8179d6"))}
  `;
}

function renderAgent() {
  const ai = state.data.ai || {};
  const topFeatures = ai.topFeatures || [];
  const featureLabels = topFeatures.slice(0, 3).map(row => String(row.feature || "").replaceAll("_", " ")) || [];
  const featureValues = topFeatures.slice(0, 3).map(row => Math.max(1, Number(row.spend_ksh_cents || 0) / 100));
  return `
    <div class="two-col">
      ${panel("AI Spend by Feature", barChart(featureValues, featureLabels, "#10bfa4"))}
      ${panel("AI Spend by School", barChart((ai.costBySchool || []).slice(0, 6).map(row => Number(row.spend_ksh_cents || 0) / 100), (ai.costBySchool || []).slice(0, 6).map(row => row.name || "School"), "#8179d6"))}
    </div>
    <div class="panel">
      <div class="panel-header"><div><h2>Flagged Content</h2><p>${Number(ai.blockedEvents || 0)} blocked AI events from live analytics.</p></div></div>
      ${table(["Metric", "Value"], [
        ["Blocked AI events", Number(ai.blockedEvents || 0).toLocaleString()],
        ["Tracked features", Number((ai.topFeatures || []).length).toLocaleString()],
        ["Tracked users", Number((ai.topUsers || []).length).toLocaleString()]
      ])}
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
      <div class="panel-header"><div><h2>${name}</h2><p>Live AI analytics from /admin/analytics/ai-usage.</p></div></div>
      ${table(["Feature", "Spend"], (ai.topFeatures || []).map(row => [
        escapeHtml(String(row.feature || "").replaceAll("_", " ")),
        money(Number(row.spend_ksh_cents || 0) / 100)
      ]))}
    </div>
  `;
}

function renderQuiz() {
  const grade = currentCurriculumGrade();
  const quizBank = state.data.quizBank?.grade === grade ? state.data.quizBank : null;
  const questions = quizBank?.questions || [];
  const subjectsInBank = new Set(questions.map(question => question.subjectId || question.subject || "Unassigned"));
  return `
    <div class="toolbar"><div class="filters">${selectHtml("selectedGrade", grades, grade)}</div></div>
    <div class="metric-grid three">
      ${metric("Fallback Questions", questions.length, `Loaded for ${grade}`, "blue")}
      ${metric("Covered Subjects", subjectsInBank.size, "QuizBank subjects", "green")}
      ${metric("Correct Answers", questions.filter(question => question.correctAnswer !== undefined && question.correctAnswer !== null).length, "Labelled answer keys", "amber")}
    </div>
    <div class="panel">
      <div class="panel-header"><div><h2>QuizBank</h2><p>${escapeHtml(quizBank?.error || "Live fallback questions used by QuizMe, Quiz, and games.")}</p></div></div>
      ${table(["Subject", "Question", "Answer"], questions.slice(0, 25).map(question => [
        escapeHtml(question.subjectName || question.subjectId || "-"),
        escapeHtml(question.text || question.question || "-"),
        escapeHtml(String(question.correctAnswer ?? question.answer ?? "-"))
      ]))}
    </div>
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
  const user = state.user || {};
  return `
    <div class="metric-grid three">
      ${metric("Signed-in Admin", user.email || "Unknown", (user.roles || []).join(", ") || "No role", "blue")}
      ${metric("API Base", API_BASE.replace(/^https?:\/\//, ""), "Shared backend", "green")}
      ${metric("Last Sync", state.lastSync ? state.lastSync.toLocaleTimeString() : "Not synced", "30-second refresh", "amber")}
    </div>
    <div class="panel">
      ${table(["Area", "Live Status"], [
        ["Users", `${state.data.users.length} records loaded`],
        ["Schools", `${state.data.schools.length} records loaded`],
        ["Teacher portal", `${state.data.teacherStudents.length} students, ${state.data.teacherAssignments.length} assignments`],
        ["Curriculum", state.data.curriculum ? `${state.data.curriculum.subjects?.length || 0} subjects loaded for ${state.data.curriculum.grade}` : "Load Subjects page to hydrate"],
        ["QuizBank", state.data.quizBank ? `${state.data.quizBank.questions?.length || 0} questions loaded for ${state.data.quizBank.grade}` : "Load Quiz Arena to hydrate"]
      ])}
    </div>
    <div class="panel"><button class="danger-button" id="signOutButton">Sign out</button></div>
  `;
}

function liveAdminFeed() {
  return `<div class="next-list">
    ${nextCard("Users", `${state.data.users.length} live records, ${activeUsers()} active`)}
    ${nextCard("Schools", `${state.data.schools.length} schools, ${totalStudents()} students`)}
    ${nextCard("Teacher portal", `${state.data.teacherStudents.length} students, ${state.data.teacherAssignments.length} assignments`)}
    ${nextCard("AI analytics", `${state.data.ai?.topFeatures?.length || 0} tracked features, ${state.data.ai?.blockedEvents || 0} blocked events`)}
    ${nextCard("Billing", `${state.data.billing?.activeSubscriptions || 0} active subscriptions, ${money(revenueSignal())} revenue signal`)}
  </div>`;
}

function nextCard(title, body) {
  return `<div class="next-card"><strong>${title}</strong><span>${body}</span></div>`;
}

function bindRouteEvents() {
  document.querySelectorAll("[data-route-control]").forEach(el => {
    el.addEventListener("change", async event => {
      state[event.target.dataset.routeControl] = event.target.value;
      if (state.route === "subjects" && event.target.dataset.routeControl === "selectedGrade") {
        renderRoute();
        await loadCurriculumGrade(event.target.value);
        renderRoute();
        return;
      }
      if (state.route === "quiz" && event.target.dataset.routeControl === "selectedGrade") {
        renderRoute();
        await loadQuizBankGrade(event.target.value);
        renderRoute();
        return;
      }
      renderRoute();
    });
  });
  const search = document.getElementById("searchInput");
  if (search) search.addEventListener("input", event => { state.search = event.target.value; renderRoute(); });
  document.querySelectorAll("[data-school]").forEach(button => button.addEventListener("click", () => showSchool(button.dataset.school)));
  document.querySelectorAll("[data-user]").forEach(button => button.addEventListener("click", () => showUser(button.dataset.user)));
  document.querySelectorAll("[data-teacher-student]").forEach(button => button.addEventListener("click", () => showTeacherStudent(button.dataset.teacherStudent)));
  document.querySelectorAll("[data-pilot]").forEach(button => button.addEventListener("click", () => showPilot(button.dataset.pilot)));
  document.querySelectorAll("[data-curriculum-subject]").forEach(button => button.addEventListener("click", () => openModal("Curriculum Editor", curriculumForm(button.dataset.curriculumSubject))));
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
  const assignmentsForGrade = state.data.teacherAssignments.filter(item => !user.grade || user.grade === "N/A" || item.gradeLevel === user.grade);
  openModal(user.name, `
    <div class="kpi-stack">
      <div class="kpi-row"><strong>School</strong><span>${escapeHtml(user.school || "-")}</span></div>
      <div class="kpi-row"><strong>Grade</strong><span>${escapeHtml(user.grade || "-")}</span></div>
      <div class="kpi-row"><strong>Email</strong><span>${escapeHtml(user.email || "-")}</span></div>
      <div class="kpi-row"><strong>Status</strong><span>${escapeHtml(user.status || "-")}</span></div>
      <div class="kpi-row"><strong>Created</strong><span>${escapeHtml(user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-")}</span></div>
      <div class="kpi-row"><strong>Last Active</strong><span>${escapeHtml(user.lastActive || "-")}</span></div>
      <div class="kpi-row"><strong>Assignments in Grade</strong><span>${assignmentsForGrade.length.toLocaleString()}</span></div>
    </div>
  `, "small");
}

function showTeacherStudent(id) {
  const student = state.data.teacherStudents.find(item => item.id === id);
  if (!student) return;
  const rows = state.data.teacherAssignments
    .filter(assignment => assignment.gradeLevel === student.grade)
    .map(assignment => [
      escapeHtml(assignment.subject),
      percent(assignment.averageScore || 0),
      `${Number(assignment.submittedCount || 0).toLocaleString()} / ${Number(assignment.totalStudents || 0).toLocaleString()} submitted`
    ]);
  openModal(`${student.name} - ${student.grade}`, table(["Subject", "Average Score", "Assignment Progress"], rows));
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
      let shouldClose = false;
      let shouldReload = false;
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
          shouldClose = true;
          shouldReload = true;
        }
        if (form.dataset.kind === "discount") {
          await api("/admin/discounts", { method: "POST", body: {
            name: formData.name,
            type: formData.type,
            amount: Number(formData.amount),
            isActive: formData.isActive === "true"
          }});
          shouldClose = true;
          shouldReload = true;
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
          shouldClose = true;
          shouldReload = true;
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
          shouldClose = true;
          shouldReload = true;
        }
        if (form.dataset.kind === "assignment") {
          const draft = parseGeneratedAssignment(formData.draft);
          await api("/teacher/assignments", { method: "POST", body: {
            title: draft.title,
            subject: formData.subject,
            description: draft.description,
            gradeLevel: formData.grade,
            dueDate: toIsoDateTime(formData.dueDate),
            questions: normalizeAssignmentQuestions(draft.questions)
          }});
          shouldClose = true;
          shouldReload = true;
        }
        if (form.dataset.kind === "curriculum-import") {
          const file = form.querySelector("input[name='pdf']")?.files?.[0];
          if (!file) throw new Error("Choose a PDF file to import.");
          const subjectOption = form.querySelector("select[name='subjectId']")?.selectedOptions?.[0];
          state.selectedGrade = formData.grade;
          state.data.curriculum = await api("/curriculum/import/pdf", { method: "POST", body: {
            grade: formData.grade,
            subjectId: formData.subjectId,
            subjectName: subjectOption?.dataset.subjectName || subjectOption?.textContent || formData.subjectId,
            fileName: file.name,
            mimeType: file.type || "application/pdf",
            base64Data: await fileToBase64(file)
          }});
          shouldClose = true;
        }
        if (shouldClose) closeModal();
        if (shouldReload) await loadAll(true);
        else renderRoute();
      } catch (error) {
        const errorEl = form.querySelector(".error-text");
        if (errorEl) errorEl.textContent = error.message;
      }
    });
  });
  const generate = document.getElementById("generateAssignment");
  if (generate) generate.addEventListener("click", () => generateAssignmentDraft(generate.form));
  const regenerate = document.getElementById("regenerateAssignment");
  if (regenerate) regenerate.addEventListener("click", () => generateAssignmentDraft(regenerate.form));
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
  return `<form data-kind="assignment" class="form-grid">
    <label>Grade ${selectField("grade", grades, "Grade 4")}</label>
    <label>Subject ${selectField("subject", subjects, "Mathematics")}</label>
    <label class="wide">Due Date <input name="dueDate" type="datetime-local" /></label>
    <label class="wide">Topic / Instructions <textarea name="topic" required placeholder="Example: 10 questions on fractions with a short marking guide."></textarea></label>
    <button class="primary-button wide" id="generateAssignment" type="button">Generate with AI</button>
    <label class="wide">Editable Draft JSON <textarea id="assignmentOutput" name="draft" required placeholder="Generate a draft, then edit the JSON before publishing."></textarea></label>
    <p class="error-text wide"></p>
    <div class="button-row wide"><button class="ghost-button" id="regenerateAssignment" type="button">Re-Generate</button><button class="success-button" type="submit">Publish</button></div>
  </form>`;
}

function curriculumForm(selectedSubjectId = "") {
  const grade = currentCurriculumGrade();
  const curriculumSubjects = curriculumSubjectOptions();
  const selected = selectedSubjectId || curriculumSubjects[0]?.subjectId || subjectIdFromName(subjects[0]);
  return `<form data-kind="curriculum-import" class="form-grid">
      <label>Grade ${selectField("grade", grades, grade)}</label>
      <label>Subject <select name="subjectId">${curriculumSubjects.map(subject => `<option value="${escapeHtml(subject.subjectId)}" data-subject-name="${escapeHtml(subject.subjectName)}" ${subject.subjectId === selected ? "selected" : ""}>${escapeHtml(subject.subjectName)}</option>`).join("")}</select></label>
      <label class="wide">PDF File <input name="pdf" type="file" accept="application/pdf" required /></label>
      <p class="error-text wide"></p>
      <button class="primary-button wide" type="submit">Import PDF Curriculum</button>
    </form>
    <div class="tabs">${grades.map(item => `<button class="tab-button ${item === grade ? "active" : ""}" type="button">${item}</button>`).join("")}</div>
    ${table(["Subject", "Strands", "State"], curriculumSubjects.map(subject => [
      escapeHtml(subject.subjectName),
      Number(subject.strands?.length || 0).toLocaleString(),
      "<span class='status-pill green'>Ready</span>"
    ]))}`;
}

async function generateAssignmentDraft(form) {
  const errorEl = form.querySelector(".error-text");
  const output = document.getElementById("assignmentOutput");
  const button = document.getElementById("generateAssignment");
  const formData = Object.fromEntries(new FormData(form).entries());
  errorEl.textContent = "";
  button.disabled = true;
  try {
    const response = await api("/ai/generate-text", { method: "POST", body: {
      prompt: assignmentPrompt(formData),
      responseMimeType: "application/json",
      feature: "assignment_generation"
    }});
    const draft = parseGeneratedAssignment(response.text);
    output.value = JSON.stringify(draft, null, 2);
  } catch (error) {
    errorEl.textContent = error.message || "Unable to generate assignment.";
  } finally {
    button.disabled = false;
  }
}

function assignmentPrompt(input) {
  return `Create a homework assignment for ${input.grade} ${input.subject}.
Additional Topic/Details: ${input.topic || "Comprehensive Review"}

The assignment must include:
1. A creative title.
2. A short description.
3. Questions mixed between MCQ, TRUE_FALSE, and SHORT_ANSWER types.
4. If the details specify a number of questions, generate exactly that many; otherwise generate 8 questions.

Return pure JSON only:
{
  "title": "string",
  "description": "string",
  "questions": [
    {
      "id": 1,
      "type": "MCQ",
      "text": "string",
      "options": ["string"],
      "correctAnswer": "string",
      "explanation": "string"
    }
  ]
}`;
}

function parseGeneratedAssignment(value) {
  const parsed = typeof value === "string" ? JSON.parse(sanitizeJsonPayload(value)) : value;
  const draft = parsed.assignment || parsed;
  if (!draft.title || !draft.description || !Array.isArray(draft.questions)) {
    throw new Error("Assignment draft must include title, description, and questions.");
  }
  return {
    title: String(draft.title).trim(),
    description: String(draft.description).trim(),
    questions: normalizeAssignmentQuestions(draft.questions)
  };
}

function normalizeAssignmentQuestions(questions) {
  const allowed = new Set(["MCQ", "TRUE_FALSE", "SHORT_ANSWER", "ESSAY"]);
  const normalized = questions
    .map((question, index) => ({
      id: Number.isInteger(Number(question.id)) ? Number(question.id) : index + 1,
      type: allowed.has(String(question.type || "").toUpperCase()) ? String(question.type).toUpperCase() : "SHORT_ANSWER",
      text: String(question.text || question.prompt || "").trim(),
      options: Array.isArray(question.options) ? question.options.map(option => String(option)) : undefined,
      correctAnswer: typeof question.correctAnswer === "boolean" ? question.correctAnswer : question.correctAnswer ? String(question.correctAnswer) : undefined,
      explanation: question.explanation ? String(question.explanation) : undefined
    }))
    .filter(question => question.text);
  if (!normalized.length) throw new Error("Assignment must include at least one question.");
  return normalized;
}

function sanitizeJsonPayload(value) {
  const trimmed = String(value || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  return start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
}

function toIsoDateTime(value) {
  return value ? new Date(value).toISOString() : undefined;
}

function currentCurriculumGrade() {
  return grades.includes(state.selectedGrade) ? state.selectedGrade : grades[0];
}

function curriculumSubjectOptions() {
  const current = state.data.curriculum?.grade === currentCurriculumGrade() ? state.data.curriculum.subjects : [];
  if (current?.length) return current;
  return subjects.map(subjectName => ({
    subjectId: subjectIdFromName(subjectName),
    subjectName,
    strands: []
  }));
}

function subjectIdFromName(name) {
  const known = {
    "Social Studies": "social_studies",
    "Computer Science": "computer_science"
  };
  return known[name] || String(name).trim().toLowerCase().replaceAll(" ", "_");
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.onerror = () => reject(new Error("Unable to read PDF file."));
    reader.readAsDataURL(file);
  });
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
