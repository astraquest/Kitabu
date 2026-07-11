const API_BASE = window.KITABU_API_BASE || (["127.0.0.1", "localhost"].includes(window.location.hostname) ? "/api" : "https://app.kitabu.ai");
const TOKEN_KEY = "kitabu.admin.accessToken";
const REFRESH_KEY = "kitabu.admin.refreshToken";
const USER_KEY = "kitabu.admin.user";
const SALES_AGENT_MESSAGES_KEY = "kitabu.admin.salesAgentMessages";
const REFRESH_MS = 30000;

const grades = ["Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Form 3", "Form 4"];
const subjects = ["Mathematics", "English", "Science", "Kiswahili", "Social Studies", "Computer Science"];
const timeRangeOptions = ["This Term", "This Month", "Last Month", "Last 3 Months", "Last 6 Months", "This Year", "Lifetime"];
const defaultSchoolPlanPricesKsh = { weekly: 100, monthly: 500, annual: 1999 };
const kenyaCounties = [
  "Baringo County", "Bomet County", "Bungoma County", "Busia County", "Elgeyo-Marakwet County", "Embu County",
  "Garissa County", "Homa Bay County", "Isiolo County", "Kajiado County", "Kakamega County", "Kericho County",
  "Kiambu County", "Kilifi County", "Kirinyaga County", "Kisii County", "Kisumu County", "Kitui County",
  "Kwale County", "Laikipia County", "Lamu County", "Machakos County", "Makueni County", "Mandera County",
  "Marsabit County", "Meru County", "Migori County", "Mombasa County", "Murang'a County", "Nairobi County",
  "Nakuru County", "Nandi County", "Narok County", "Nyamira County", "Nyandarua County", "Nyeri County",
  "Samburu County", "Siaya County", "Taita-Taveta County", "Tana River County", "Tharaka-Nithi County",
  "Trans Nzoia County", "Turkana County", "Uasin Gishu County", "Vihiga County", "Wajir County", "West Pokot County"
];
let refreshPromise = null;

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: "chart" },
  { key: "users", label: "Users", icon: "users" },
  { key: "schools", label: "Schools", icon: "school" },
  { key: "sales", label: "Sales Agents", icon: "briefcase" },
  { key: "subjectAnalytics", label: "Subjects", icon: "bars" },
  { key: "subjects", label: "Curriculum", icon: "book" },
  { key: "teacher", label: "Teachers Portal", icon: "clipboard" },
  { key: "parents", label: "Parents' Portal", icon: "heart" },
  { key: "usage", label: "Usage", icon: "usage" },
  { key: "settings", label: "Settings", icon: "gear" }
];

const state = {
  route: "dashboard",
  user: readJson(USER_KEY),
  accessToken: localStorage.getItem(TOKEN_KEY),
  refreshToken: localStorage.getItem(REFRESH_KEY),
  timer: null,
  presenceTimer: null,
  loading: false,
  lastSync: null,
  selectedGrade: "All Grades",
  selectedSubject: "All Subjects",
  selectedSchool: "All Schools",
  selectedCounty: "All Counties",
  selectedAgentStatus: "All Agents",
  usagePeriod: "This Month",
  selectedUsageFeature: "All Features",
  teacherPeriod: "This Week",
  parentPeriod: "This Week",
  studentTrendRange: "Last 7 days",
  timeRange: "This Term",
  search: "",
  remedialAnalysis: {},
  remedialAiReports: {},
  remedialAnalysisErrors: {},
  data: {
    users: [],
    schools: [],
    ai: null,
    billing: null,
    curriculum: null,
    subjectEngagement: null,
    curriculumByGrade: {},
    subjectEngagementByGrade: {},
    loadingCurriculumGrades: new Set(),
    curriculumGradeRequests: {},
    teacherStudents: [],
    teacherAssignments: [],
    parentChildren: []
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

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
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
  stopPresencePolling();
  sendPresenceSignal("offline", { keepalive: true, reason: "sign_out" });
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
    school: '<path d="M3 21h18"/><path d="M5 21V9l7-4 7 4v12"/><path d="M9 21v-6h6v6"/><path d="M9 11h.01"/><path d="M15 11h.01"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5Z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    briefcase: '<path d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1"/><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 12h18"/>',
    clipboard: '<path d="M9 5h6"/><path d="M9 3h6v4H9z"/><path d="M6 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1"/><path d="M8 13h8"/><path d="M8 17h5"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/>',
    usage: '<path d="M5 19V9"/><path d="M12 19V5"/><path d="M19 19v-7"/><path d="M3 19h18"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20h-3v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.5-1H3v-3h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.3 8l2.1-2.1.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V4h3v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L17.5 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v3h-.2a1.7 1.7 0 0 0-1.2 2Z"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.chart}</svg>`;
}

function init() {
  renderNav();
  bindEvents();
  if (state.accessToken) {
    showApp();
    startPresencePolling();
    loadAll();
    startSync();
  } else {
    showLogin();
  }
}

function bindEvents() {
  loginForm.addEventListener("submit", onLogin);
  document.getElementById("menuButton").addEventListener("click", () => document.querySelector(".sidebar").classList.toggle("open"));
  document.getElementById("profileButton").addEventListener("click", showProfileModal);
  document.getElementById("notificationButton").addEventListener("click", () => openModal("Notifications", "<p class='visually-muted'>Notification center is connected to live account, payment, and learning updates.</p>", "small"));
  document.addEventListener("visibilitychange", () => {
    if (!state.accessToken) return;
    if (document.hidden) {
      sendPresenceSignal("offline", { keepalive: true, reason: "hidden" });
      stopPresencePolling();
      return;
    }
    startPresencePolling();
    loadAll(true);
  });
  window.addEventListener("pagehide", () => sendPresenceSignal("offline", { keepalive: true, reason: "pagehide" }));
  window.addEventListener("beforeunload", () => sendPresenceSignal("offline", { keepalive: true, reason: "unload" }));
}

function renderNav() {
  const visibleNavItems = isTeacherOnly()
    ? navItems.filter(item => ["teacher", "settings"].includes(item.key))
    : isParentOnly()
      ? navItems.filter(item => ["parents", "settings"].includes(item.key))
      : navItems;
  if (!visibleNavItems.some(item => item.key === state.route)) {
    state.route = isTeacherOnly() ? "teacher" : isParentOnly() ? "parents" : "dashboard";
  }
  nav.innerHTML = visibleNavItems.map(item => `
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
      if (state.route === "subjects" || state.route === "subjectAnalytics") loadCurriculumGrade(currentCurriculumGrade(), { renderWhenDone: true });
    });
  });
}

function isTeacherOnly() {
  const roles = roleValues(state.user);
  return roles.includes("teacher") && !roles.includes("school_admin") && !roles.includes("platform_admin");
}

function isParentOnly() {
  const roles = roleValues(state.user);
  return roles.includes("parent") && !roles.includes("school_admin") && !roles.includes("platform_admin") && !roles.includes("teacher");
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
    const roles = roleValues(payload.user);
    if (!roles.includes("platform_admin") && !roles.includes("school_admin") && !roles.includes("teacher") && !roles.includes("parent")) {
      throw new Error("This account is not an admin, teacher, or parent account.");
    }
    writeSession(payload);
    if (isTeacherOnly()) state.route = "teacher";
    if (isParentOnly()) state.route = "parents";
    showApp();
    renderNav();
    startPresencePolling();
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
    const message = payload?.message || payload?.error || `Request failed: ${response.status}`;
    const error = new Error(response.status === 401 ? "Your session expired. Please sign in again." : message);
    error.status = response.status;
    throw error;
  }
  return payload || {};
}

async function refreshSession() {
  if (!state.refreshToken) throw new Error("Your session expired. Please sign in again.");
  if (!refreshPromise) {
    refreshPromise = api("/auth/refresh", { method: "POST", public: true, body: { refreshToken: state.refreshToken } })
      .then(payload => {
        writeSession(payload);
        return payload;
      })
      .catch(error => {
        clearSession();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function isAuthError(error) {
  return error?.status === 401 || /session expired|verify your email|401/i.test(error?.message || "");
}

function startSync() {
  clearInterval(state.timer);
  state.timer = setInterval(() => loadAll(), REFRESH_MS);
}

function stopPresencePolling() {
  clearInterval(state.presenceTimer);
  state.presenceTimer = null;
}

function startPresencePolling() {
  if (!state.accessToken || document.hidden) return;
  if (!state.presenceTimer) {
    state.presenceTimer = setInterval(() => sendPresenceSignal("online"), 30000);
  }
  sendPresenceSignal("online");
}

function sendPresenceSignal(status, options = {}) {
  if (!state.accessToken) return Promise.resolve();
  const body = JSON.stringify({ status, reason: options.reason });
  return fetch(`${API_BASE}/me/presence`, {
    method: "POST",
    keepalive: Boolean(options.keepalive),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.accessToken}`,
      "x-kitabu-device-id": "admin-web",
      "x-kitabu-device-label": "Kitabu Admin Web"
    },
    body
  }).catch(() => undefined);
}

async function loadAll(force = false) {
  if (state.loading && !force) return;
  state.loading = true;
  setSync("Syncing", "Refreshing live data", "");
  try {
    if (isParentOnly()) {
      await loadParentData();
    } else {
      const results = await Promise.allSettled([
        api("/admin/users"),
        api("/admin/schools"),
        api("/admin/analytics/ai-usage"),
        api("/admin/analytics/billing")
      ]);
      if (results.some(result => result.status === "rejected" && isAuthError(result.reason))) {
        clearSession();
        showLogin();
        setSync("Signed out", "Authentication required", "error");
        return;
      }
      const [users, schools, ai, billing] = results.map(result => result.status === "fulfilled" ? result.value : null);

      state.data.users = users?.users || state.data.users;
      state.data.schools = schools?.schools || state.data.schools;
      state.data.ai = ai || state.data.ai;
      state.data.billing = billing || state.data.billing;

      await loadTeacherData();
    }
    if (!state.accessToken) return;
    if (state.route === "subjects" || state.route === "subjectAnalytics") await loadCurriculumGrade();
    if (!state.accessToken) return;
    state.lastSync = new Date();
    setSync("Live", `Updated ${state.lastSync.toLocaleTimeString()}`, "live");
    renderRoute();
  } catch (error) {
    setSync("Sync error", error.message || "Unable to refresh", "error");
    if (isAuthError(error)) {
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
  if (isAuthError(students.reason) || isAuthError(assignments.reason)) {
    clearSession();
    showLogin();
    setSync("Signed out", "Authentication required", "error");
    return;
  }
  if (students.status === "fulfilled") state.data.teacherStudents = students.value.students || [];
  if (assignments.status === "fulfilled") state.data.teacherAssignments = assignments.value.assignments || [];
}

async function loadParentData() {
  const dashboard = await api("/parent/dashboard");
  state.data.parentChildren = dashboard.children || [];
}

async function loadCurriculumGrade(grade = currentCurriculumGrade(), options = {}) {
  const targetGrade = grades.includes(grade) ? grade : currentCurriculumGrade();
  const renderWhenDone = Boolean(options.renderWhenDone);

  if (state.data.curriculumGradeRequests[targetGrade]) {
    await state.data.curriculumGradeRequests[targetGrade];
    if (renderWhenDone && (state.route === "subjects" || state.route === "subjectAnalytics") && currentCurriculumGrade() === targetGrade) renderRoute();
    return;
  }

  state.data.loadingCurriculumGrades.add(targetGrade);
  const request = (async () => {
    try {
      const query = new URLSearchParams({ grade: targetGrade });
      const [curriculum, subjectEngagement] = await Promise.allSettled([
        api(`/curriculum?${query.toString()}`),
        api(`/admin/analytics/subject-engagement?${query.toString()}`)
      ]);
      if (isAuthError(curriculum.reason) || isAuthError(subjectEngagement.reason)) {
        clearSession();
        showLogin();
        setSync("Signed out", "Authentication required", "error");
        return;
      }
      const curriculumResult = curriculum.status === "fulfilled"
        ? curriculum.value
        : { grade: targetGrade, subjects: [], error: curriculum.reason?.message || "Unable to load curriculum." };
      const engagementResult = subjectEngagement.status === "fulfilled"
        ? subjectEngagement.value
        : { grade: targetGrade, subjects: [], error: subjectEngagement.reason?.message || "Unable to load subject engagement." };
      state.data.curriculumByGrade[targetGrade] = curriculumResult;
      state.data.subjectEngagementByGrade[targetGrade] = engagementResult;
      if (currentCurriculumGrade() === targetGrade) {
        state.data.curriculum = curriculumResult;
        state.data.subjectEngagement = engagementResult;
      }
    } catch (error) {
      state.data.curriculumByGrade[targetGrade] = { grade: targetGrade, subjects: [], error: error.message || "Unable to load curriculum." };
      state.data.subjectEngagementByGrade[targetGrade] = { grade: targetGrade, subjects: [], error: error.message || "Unable to load subject engagement." };
      if (currentCurriculumGrade() === targetGrade) {
        state.data.curriculum = state.data.curriculumByGrade[targetGrade];
        state.data.subjectEngagement = state.data.subjectEngagementByGrade[targetGrade];
      }
    } finally {
      state.data.loadingCurriculumGrades.delete(targetGrade);
      delete state.data.curriculumGradeRequests[targetGrade];
    }
  })();

  state.data.curriculumGradeRequests[targetGrade] = request;
  await request;
  if (renderWhenDone && (state.route === "subjects" || state.route === "subjectAnalytics") && currentCurriculumGrade() === targetGrade) renderRoute();
}

function setSync(title, meta, tone) {
  document.getElementById("syncState").textContent = title;
  document.getElementById("syncMeta").textContent = meta;
  const syncStamp = document.getElementById("syncStamp");
  if (syncStamp) syncStamp.textContent = state.lastSync ? `Updated ${state.lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : meta;
  const dot = document.getElementById("syncDot");
  dot.className = `sync-dot ${tone || ""}`.trim();
}

function renderRoute() {
  showApp();
  const visibleRoutes = isTeacherOnly()
    ? ["teacher", "settings"]
    : isParentOnly()
      ? ["parents", "settings"]
      : navItems.map(item => item.key);
  if (!visibleRoutes.includes(state.route)) state.route = isTeacherOnly() ? "teacher" : isParentOnly() ? "parents" : "dashboard";
  app.dataset.route = state.route;
  app.dataset.audience = isParentOnly() ? "parent" : isTeacherOnly() ? "teacher" : "admin";
  const titleMap = {
    dashboard: ["Dashboard", "Overview and performance across live admin data."],
    subjects: ["Curriculum", "Select grade and subject to edit."],
    subjectAnalytics: ["Subjects", "Monitor engagement, watch time and subject improvement."],
    users: ["Users", "Manage and monitor all users across the platform."],
    schools: ["Schools", "Monitor school performance, learner engagement and activity across the platform."],
    sales: ["Sales Agents", "Monitor agent performance, school coverage and learner growth."],
    teacher: ["Teacher's Portal", "Student performance and assignment workflows."],
    parents: ["Parents' Portal", "Parent-facing learner health and progress view."],
    usage: ["Usage", "Track token spend, model usage and feature costs across Kitabu AI."],
    settings: ["Settings", "Live sync, backend, and admin session controls."]
  };
  const renderers = {
    dashboard: renderDashboard,
    subjects: renderSubjects,
    subjectAnalytics: renderSubjectAnalytics,
    users: renderUsers,
    schools: renderSchools,
    sales: renderSales,
    teacher: renderTeacher,
    parents: renderParents,
    usage: renderUsage,
    settings: renderSettings
  };
  const [title, sub] = titleMap[state.route] || titleMap.dashboard;
  pageTitle.textContent = title;
  pageSub.textContent = sub;
  content.innerHTML = (renderers[state.route] || renderDashboard)();
  bindRouteEvents();
}

function money(value) {
  return `KSh ${Number(value || 0).toLocaleString("en-KE")}`;
}

function percent(value) {
  return `${Math.round(Number(value || 0))}%`;
}

function roleValues(user) {
  if (Array.isArray(user?.roles)) {
    return user.roles.map(role => String(role).trim().toLowerCase()).filter(Boolean);
  }

  const rawRoles = user?.roles ?? user?.role;
  if (rawRoles === undefined || rawRoles === null) return [];

  return String(rawRoles)
    .replace(/^\{(.*)\}$/, "$1")
    .split(",")
    .map(role => role.trim().replace(/^"|"$/g, "").toLowerCase())
    .filter(Boolean);
}

function hasRole(user, role) {
  return roleValues(user).includes(String(role).toLowerCase());
}

function isStudentRecord(user) {
  if (roleValues(user).length) return hasRole(user, "student");
  return Boolean(user.grade && user.grade !== "N/A") || String(user.email || "").toLowerCase().includes("student");
}

function studentUsers() {
  return state.data.users.filter(isStudentRecord);
}

function allSchoolRows() {
  return state.data.schools.map(normalizeSchoolRow);
}

function countyForSchoolName(schoolName) {
  const normalized = String(schoolName || "").toLowerCase();
  const school = allSchoolRows().find(row => String(row.name || "").toLowerCase() === normalized);
  return school?.county || schoolMetadata(schoolName).county || "";
}

function isInSelectedCounty(record) {
  if (state.selectedCounty === "All Counties") return true;
  const county = record.county || countyForSchoolName(record.school || record.name);
  return county === state.selectedCounty;
}

function totalStudents() {
  return studentUsers().filter(isInSelectedCounty).length;
}

function activeUsers() {
  return studentUsers().filter(isInSelectedCounty).filter(user => user.status === "Active" || user.status === "Online").length;
}

function revenueSignal() {
  return (state.data.billing?.revenueByPlan || []).reduce((sum, row) => sum + Number(row.revenue_ksh_cents || 0) / 100, 0);
}

function usersForSelectedGrade() {
  return studentUsers()
    .filter(isInSelectedCounty)
    .filter(user => state.selectedGrade === "All Grades" || user.grade === state.selectedGrade);
}

function selectedTimeRange() {
  if (!timeRangeOptions.includes(state.timeRange)) state.timeRange = timeRangeOptions[0];
  return state.timeRange;
}

function monthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function timeRangeBounds(range = selectedTimeRange()) {
  const now = new Date();
  const currentMonth = monthStart(now);
  if (range === "This Term") return { start: addMonths(currentMonth, -2), end: addMonths(currentMonth, 1) };
  if (range === "Last Month") return { start: addMonths(currentMonth, -1), end: currentMonth };
  if (range === "Last 3 Months") return { start: addMonths(currentMonth, -2), end: addMonths(currentMonth, 1) };
  if (range === "Last 6 Months") return { start: addMonths(currentMonth, -5), end: addMonths(currentMonth, 1) };
  if (range === "This Year") return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear() + 1, 0, 1) };
  if (range === "Lifetime") return { start: null, end: null };
  return { start: currentMonth, end: addMonths(currentMonth, 1) };
}

function isDateInRange(value, range = selectedTimeRange()) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return false;
  const { start, end } = timeRangeBounds(range);
  return (!start || date >= start) && (!end || date < end);
}

function recordsForTimeRange(records, field, range = selectedTimeRange()) {
  if (range === "Lifetime") return records.filter(record => !Number.isNaN(Date.parse(record[field] || "")));
  return records.filter(record => isDateInRange(record[field], range));
}

function monthBuckets(records, field, range = selectedTimeRange()) {
  const buckets = [];
  const { start, end } = timeRangeBounds(range);
  let cursor = start;
  let stop = end;
  if (!cursor || !stop) {
    const dates = records
      .map(record => new Date(record[field] || ""))
      .filter(date => !Number.isNaN(date.getTime()));
    const now = new Date();
    cursor = dates.length ? monthStart(new Date(Math.min(...dates.map(date => date.getTime())))) : monthStart(now);
    stop = addMonths(monthStart(now), 1);
  }
  for (let date = new Date(cursor); date < stop; date = addMonths(date, 1)) {
    buckets.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleString("en", { month: "short" }),
      value: 0
    });
  }
  return buckets;
}

function monthlyCounts(records, field, range = selectedTimeRange()) {
  const buckets = monthBuckets(records, field, range);
  const byKey = new Map(buckets.map(bucket => [bucket.key, bucket]));
  recordsForTimeRange(records, field, range).forEach(record => {
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
  return { labels: ["Revenue"], values: [0] };
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
  return (state.data.curriculum?.subjects || [])
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
  const bySubject = new Map();
  state.data.teacherAssignments
    .filter(assignment => Number(assignment.averageScore || 0) > 0)
    .forEach(assignment => {
      const label = assignment.subject || "Assignment";
      const current = bySubject.get(label) || { label, total: 0, count: 0 };
      current.total += Number(assignment.averageScore || 0);
      current.count += 1;
      bySubject.set(label, current);
    });
  return Array.from(bySubject.values())
    .map(row => ({ label: row.label, value: Math.round(row.total / Math.max(1, row.count)) }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);
}

function contactRows() {
  return state.data.users
    .filter(user => hasRole(user, "school_admin") || hasRole(user, "platform_admin"))
    .map(user => ({
      id: user.id,
      name: user.name || user.email || "Contact",
      email: user.email || "-",
      phone: user.phone || "-",
      account: user.school || "-",
      status: user.status || "-"
    }));
}

function moneyKes(value) {
  return `KES ${Number(value || 0).toLocaleString("en-KE")}`;
}

function moneyKesFromCents(value) {
  return moneyKes(Number(value || 0) / 100);
}

function moneyKesShort(value) {
  const amount = Number(value || 0);
  if (amount >= 1000000) return `KSh ${(amount / 1000000).toFixed(amount >= 10000000 ? 0 : 1)}M`;
  if (amount >= 1000) return `KSh ${Math.round(amount / 1000)}K`;
  return `KSh ${amount.toLocaleString("en-KE")}`;
}

function schoolAiUsage(school) {
  const rows = state.data.ai?.costBySchool || [];
  const row = rows.find(item => String(item.id || "") === String(school.id || ""))
    || rows.find(item => String(item.name || "").toLowerCase() === String(school.name || "").toLowerCase());
  const activeUsers = Number(row?.active_ai_users ?? row?.activeAiUsers ?? 0);
  const averageTokens = Number(row?.average_tokens_per_user ?? row?.averageTokensPerUser ?? 0);
  const averageSpendCents = Number(row?.average_spend_ksh_cents_per_user ?? row?.averageSpendKshCentsPerUser ?? 0);
  return {
    activeUsers,
    totalTokens: Number(row?.total_tokens ?? row?.totalTokens ?? 0),
    spendKshCents: Number(row?.spend_ksh_cents ?? row?.spendKshCents ?? 0),
    averageTokens,
    averageSpendKshCents: averageSpendCents
  };
}

function studentAiUsage(user) {
  const rows = [...(state.data.ai?.marginByUser || []), ...(state.data.ai?.topUsers || [])];
  const row = rows.find(item => String(item.id || "") === String(user.id || ""));
  return {
    totalTokens: Number(row?.total_tokens ?? row?.totalTokens ?? 0),
    spendKshCents: Number(row?.spend_ksh_cents ?? row?.spendKshCents ?? 0)
  };
}

function compactNumber(value) {
  const amount = Number(value || 0);
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(amount >= 10000000 ? 1 : 1)}M`;
  if (amount >= 1000) return `${Math.round(amount / 1000)}K`;
  return amount.toLocaleString("en-KE");
}

function usageMoney(value) {
  return `KSh ${Math.round(Number(value || 0)).toLocaleString("en-KE")}`;
}

function usageStudentRows() {
  return studentUsers()
    .filter(isInSelectedCounty)
    .filter(user => state.selectedGrade === "All Grades" || user.grade === state.selectedGrade);
}

function usageBaseTotals() {
  const students = usageStudentRows();
  const ai = state.data.ai || {};
  const featureRows = ai.topFeatures || [];
  const totalTokens = featureRows.reduce((sum, row) => sum + Number(row.total_tokens ?? row.totalTokens ?? 0), 0);
  const rawSpendCents = featureRows.reduce((sum, row) => sum + Number(row.spend_ksh_cents ?? row.spendKshCents ?? 0), 0);
  return {
    students,
    studentCount: students.length,
    totalTokens,
    totalCost: rawSpendCents / 100
  };
}

function usageFeatureRows() {
  const styles = [
    { icon: "chat", tone: "blue" },
    { icon: "document", tone: "green" },
    { icon: "question", tone: "amber" },
    { icon: "clipboard", tone: "purple" },
    { icon: "mic", tone: "red" }
  ];
  const rows = (state.data.ai?.topFeatures || []).map((row, index) => {
    const style = styles[index % styles.length];
    const tokens = Number(row.total_tokens ?? row.totalTokens ?? 0);
    const cost = Number(row.spend_ksh_cents ?? row.spendKshCents ?? 0) / 100;
    const students = Number(row.active_ai_users ?? row.activeAiUsers ?? 0);
    return {
      ...style,
      label: String(row.feature || "Unknown feature").replaceAll("_", " "),
      cost,
      tokens,
      students,
      trend: 0,
      costPerStudent: students ? cost / students : 0
    };
  });
  return state.selectedUsageFeature === "All Features" ? rows : rows.filter(row => row.label === state.selectedUsageFeature);
}

function usageAllFeatureRows() {
  const selectedFeature = state.selectedUsageFeature;
  state.selectedUsageFeature = "All Features";
  const rows = usageFeatureRows();
  state.selectedUsageFeature = selectedFeature;
  return rows;
}

function usageFeatureOptions() {
  return ["All Features", ...usageAllFeatureRows().map(row => row.label)];
}

function usageModelRows() {
  const tones = ["#2578f7", "#29b765", "#ff9f16", "#7658dc", "#ef476f", "#12a4a6"];
  return (state.data.ai?.modelBreakdown || []).map((row, index) => {
    const tokens = Number(row.total_tokens ?? row.totalTokens ?? 0);
    const spend = Number(row.spend_ksh_cents ?? row.spendKshCents ?? 0) / 100;
    return {
      label: `${row.provider || "Unknown"} / ${row.model || "Unknown"}`,
      value: Number(row.token_share ?? row.tokenShare ?? 0),
      cost: tokens ? spend / (tokens / 1000) : 0,
      tokens,
      spend,
      tone: tones[index % tones.length]
    };
  }).sort((left, right) => right.tokens - left.tokens);
}

function usageHighlights() {
  const totals = usageBaseTotals();
  const features = usageAllFeatureRows();
  const visibleFeatures = usageFeatureRows();
  const totalCost = visibleFeatures.reduce((sum, row) => sum + row.cost, 0);
  const totalTokens = visibleFeatures.reduce((sum, row) => sum + row.tokens, 0);
  const mostExpensive = [...visibleFeatures].sort((left, right) => right.cost - left.cost)[0]
    || [...features].sort((left, right) => right.cost - left.cost)[0]
    || null;
  const models = usageModelRows();
  const mostUsedModel = models[0] || null;
  return {
    ...totals,
    totalCost,
    totalTokens,
    costPerStudent: totalCost / Math.max(1, totals.studentCount),
    mostExpensive,
    mostUsedModel
  };
}

function usageCostTrend() {
  const days = state.usagePeriod === "Today" ? 1 : state.usagePeriod === "This Week" ? 7 : 30;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const rows = (state.data.ai?.costTrend || []).filter(row => new Date(row.period).getTime() >= cutoff);
  return {
    labels: rows.map(row => new Date(row.period).toLocaleDateString("en-KE", { month: "short", day: "numeric" })),
    values: rows.map(row => Number(row.spend_ksh_cents ?? row.spendKshCents ?? 0) / 100)
  };
}

function usageCostTrendChart() {
  const series = usageCostTrend();
  if (!series.values.length) return `<div class="empty-state">No AI cost events recorded for ${escapeHtml(state.usagePeriod.toLowerCase())}.</div>`;
  const max = Math.max(...series.values, 1);
  const points = series.values.map((value, index) => {
    const x = 58 + index * (670 / Math.max(1, series.values.length - 1));
    const y = 232 - (value / max) * 172;
    return { x, y, label: series.labels[index], value };
  });
  const line = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const area = `${line} L${points.at(-1).x.toFixed(1)},242 L${points[0].x.toFixed(1)},242 Z`;
  const peak = [...points].sort((left, right) => right.value - left.value)[0];
  return `<svg class="usage-line-chart" viewBox="0 0 760 286" role="img" aria-label="Cost trend for ${escapeHtml(state.usagePeriod)}">
    <defs>
      <linearGradient id="usageTrendFill" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#1d72f3" stop-opacity="0.20"/>
        <stop offset="100%" stop-color="#1d72f3" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path class="usage-grid" d="M56 60H730M56 105H730M56 150H730M56 195H730M56 240H730"/>
    <text x="30" y="64">${escapeHtml(usageMoney(max))}</text><text x="30" y="154">${escapeHtml(usageMoney(max / 2))}</text><text x="30" y="244">KSh 0</text>
    <path class="usage-area" d="${area}"/>
    <path class="usage-line" d="${line}"/>
    ${points.map(point => `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4.5"/>`).join("")}
    <g class="usage-peak">
      <path d="M${Math.max(370, peak.x - 98)} ${Math.max(38, peak.y - 52)}h152a8 8 0 0 1 8 8v24a8 8 0 0 1-8 8h-152a8 8 0 0 1-8-8v-24a8 8 0 0 1 8-8Z"/>
      <path d="M${peak.x - 4} ${peak.y - 14}l-35-22"/>
      <text x="${Math.max(386, peak.x - 82)}" y="${Math.max(64, peak.y - 28)}">Peak: ${usageMoney(peak.value)}</text>
    </g>
    ${points.map((point, index) => index % Math.max(1, Math.ceil(points.length / 6)) === 0 || index === points.length - 1 ? `<text x="${point.x.toFixed(1)}" y="270" text-anchor="middle">${escapeHtml(point.label)}</text>` : "").join("")}
  </svg>`;
}

function usageModelDonut() {
  const rows = usageModelRows();
  if (!rows.length) return `<div class="empty-state">No model telemetry has been recorded yet.</div>`;
  const totalTokens = compactNumber(usageHighlights().totalTokens);
  let offset = 25;
  const arcs = rows.map(row => {
    const length = row.value;
    const arc = `<circle cx="126" cy="126" r="82" fill="none" stroke="${row.tone}" stroke-width="30" pathLength="100" stroke-dasharray="${length} ${100 - length}" stroke-dashoffset="${-offset}" />`;
    offset += length;
    return arc;
  }).join("");
  return `<div class="usage-donut-layout">
    <svg class="usage-donut" viewBox="0 0 252 252" aria-label="Token usage by model">
      ${arcs}
      <circle cx="126" cy="126" r="52" fill="#fff"/>
      <text x="126" y="122" text-anchor="middle" class="usage-donut-total">${escapeHtml(totalTokens)}</text>
      <text x="126" y="146" text-anchor="middle" class="usage-donut-caption">Total Tokens</text>
    </svg>
    <div class="usage-model-legend">
      ${rows.map(row => `<div class="usage-model-row"><span><i style="background:${row.tone}"></i>${escapeHtml(row.label)}</span><strong>${row.value}%</strong></div>`).join("")}
    </div>
  </div>`;
}

function usageMetricCard(tone, label, value, helper, iconName) {
  return `<article class="usage-metric-card ${tone}">
    <div>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(helper)}</small>
    </div>
    <b>${miniIcon(iconName)}</b>
  </article>`;
}

function usageFeatureTableRow(row) {
  return `<tr>
    <td><span class="usage-feature-name ${row.tone}">${miniIcon(row.icon)}${escapeHtml(row.label)}</span></td>
    <td>${escapeHtml(compactNumber(row.tokens))}</td>
    <td>${escapeHtml(usageMoney(row.cost))}</td>
    <td>${Number(row.students || 0).toLocaleString("en-KE")}</td>
    <td>${escapeHtml(usageMoney(row.costPerStudent))}</td>
    <td><span class="usage-trend">Recorded total</span></td>
  </tr>`;
}

function usageSchoolRows() {
  return (state.data.ai?.costBySchool || []).map(row => ({
    name: row.name || "Unknown school",
    tokens: Number(row.total_tokens ?? row.totalTokens ?? 0),
    spend: Number(row.spend_ksh_cents ?? row.spendKshCents ?? 0) / 100,
    users: Number(row.active_ai_users ?? row.activeAiUsers ?? 0)
  })).sort((left, right) => right.spend - left.spend);
}

function usageBlockedRows() {
  return (state.data.ai?.blockedEventRows || []).filter(row => state.selectedUsageFeature === "All Features" || String(row.feature || "").replaceAll("_", " ") === state.selectedUsageFeature);
}

function salesTimeScale(range = selectedTimeRange()) {
  const scales = {
    "This Month": 0.34,
    "Last Month": 0.31,
    "Last 3 Months": 0.78,
    "Last 6 Months": 1.28,
    "This Year": 1.72,
    "Lifetime": 2.4,
    "This Term": 1
  };
  return scales[range] || 1;
}

function sourceSchoolsForAgents() {
  return allSchoolRows();
}

function salesAgentSourceRows() {
  const liveAgents = state.data.users.filter(user =>
    hasRole(user, "sales_agent") ||
    hasRole(user, "sales") ||
    String(user.role || "").toLowerCase().includes("sales")
  );
  const schools = sourceSchoolsForAgents();
  return liveAgents.map((agent, index) => {
    const assigned = Array.isArray(agent.assignedSchools)
      ? agent.assignedSchools
      : agent.school
        ? [agent.school]
        : schools.filter((_, schoolIndex) => schoolIndex % Math.max(1, liveAgents.length) === index).map(school => school.name);
    return {
      id: agent.id || `agent-${index}`,
      name: agent.name || agent.fullName || agent.email || "Sales Agent",
      email: agent.email || "-",
      phone: agent.phone || agent.phoneNumber || "-",
      county: agent.county || agent.location || "",
      status: normalizeUserStatus(agent.status),
      assignedSchoolNames: assigned,
      revenue: Number(agent.revenue || agent.revenueKsh || agent.salesRevenue || 0),
      conversionRate: Number(agent.conversionRate || agent.conversion || 0),
      commission: Number(agent.commission || agent.commissionKsh || 0)
    };
  });
}

function normalizeSalesAgent(agent, index = 0) {
  const schools = sourceSchoolsForAgents();
  const assignedSchools = (agent.assignedSchoolNames || agent.assignedSchools || [])
    .map(name => schools.find(school => String(school.name).toLowerCase() === String(name).toLowerCase()))
    .filter(Boolean);
  const agentCounty = agent.county || agent.location || assignedSchools[0]?.county || "";
  const countySchools = agentCounty ? schools.filter(school => school.county === agentCounty) : [];
  const fallbackSchools = assignedSchools.length
    ? assignedSchools
    : countySchools.length
      ? countySchools
      : schools.filter((_, schoolIndex) => schoolIndex % Math.max(1, salesAgentSourceRows().length) === index);
  const scopedSchools = fallbackSchools.length ? fallbackSchools : schools.slice(0, 1);
  const county = agentCounty || scopedSchools[0]?.county || "";
  const studentCount = scopedSchools.reduce((sum, school) => sum + Number(school.learnerCount || 0), 0);
  const activeLearners = scopedSchools.reduce((sum, school) => sum + Number(school.activeLearners || 0), 0);
  const avgEngagement = scopedSchools.length
    ? Math.round(scopedSchools.reduce((sum, school) => sum + Number(school.engagement || 0), 0) / scopedSchools.length)
    : 0;
  const scale = salesTimeScale();
  const baseRevenue = Number(agent.revenue || 0) || Math.round(activeLearners * 520);
  const revenue = Math.round(baseRevenue * scale);
  const conversionRate = Number(agent.conversionRate || 0) || Math.round((avgEngagement + (studentCount ? activeLearners / studentCount * 100 : 0)) / 2);
  return {
    id: agent.id || `sales-agent-${index}`,
    name: agent.name || "Sales Agent",
    email: agent.email || "-",
    phone: agent.phone || "-",
    county,
    status: agent.status || "Active",
    assignedSchools: scopedSchools,
    schoolCount: scopedSchools.length,
    studentCount,
    activeLearners,
    engagement: avgEngagement,
    revenue,
    commission: Math.round((Number(agent.commission || 0) || Math.round(baseRevenue * 0.15)) * scale),
    conversionRate
  };
}

function salesAgentRows() {
  const term = state.search.trim().toLowerCase();
  return salesAgentSourceRows()
    .map(normalizeSalesAgent)
    .filter(agent => state.selectedCounty === "All Counties" || agent.county === state.selectedCounty || agent.assignedSchools.some(school => school.county === state.selectedCounty))
    .filter(agent => state.selectedAgentStatus === "All Agents" || agent.status === state.selectedAgentStatus)
    .filter(agent => !term || `${agent.name} ${agent.email} ${agent.phone} ${agent.county} ${agent.assignedSchools.map(school => `${school.name} ${school.county}`).join(" ")}`.toLowerCase().includes(term))
    .sort((left, right) => right.revenue - left.revenue || right.activeLearners - left.activeLearners);
}

function salesAgentStatusOptions() {
  const statuses = Array.from(new Set(salesAgentSourceRows().map(agent => normalizeUserStatus(agent.status)).filter(Boolean))).sort();
  return ["All Agents", ...statuses];
}

function salesHighlights(rows) {
  const sortedByRevenue = [...rows].sort((left, right) => right.revenue - left.revenue || right.conversionRate - left.conversionRate);
  const sortedByCoverage = [...rows].sort((left, right) => right.studentCount - left.studentCount || right.schoolCount - left.schoolCount);
  return {
    total: rows.length,
    managedLearners: rows.reduce((sum, row) => sum + row.studentCount, 0),
    best: sortedByRevenue[0] || null,
    worst: sortedByRevenue.at(-1) || null,
    coverage: sortedByCoverage[0] || null,
    revenue: rows.reduce((sum, row) => sum + row.revenue, 0)
  };
}

function salesConvertedSchools(rows) {
  return rows.reduce((sum, row) => sum + row.assignedSchools.filter(school => Number(school.learnerCount || 0) > 0).length, 0);
}

function renderDashboard() {
  const visibleUsers = usersForSelectedGrade();
  const users = visibleUsers.length;
  const activeUsersInRange = visibleUsers.filter(user => user.status === "Active" || user.status === "Online");
  const active = selectedTimeRange() === "Lifetime"
    ? activeUsersInRange.length
    : recordsForTimeRange(activeUsersInRange, "lastActiveAt").length;
  const revenue = revenueSignal();
  const subjectRows = liveSubjectUsageRows();
  const signupUsers = recordsForTimeRange(visibleUsers, "createdAt");
  const signups = monthlyCounts(visibleUsers, "createdAt");
  const revenueRows = revenueSeries();
  const scores = assignmentScoreRows();

  return `
    <div class="toolbar">
      <div class="filters">
        ${selectControl("selectedGrade", ["All Grades", ...grades], state.selectedGrade)}
        ${selectControl("selectedCounty", countyOptions(), state.selectedCounty)}
        ${selectControl("timeRange", timeRangeOptions, selectedTimeRange())}
      </div>
    </div>
    <div class="metric-grid">
      ${metric("Active Students", active, "Current engagement", "green", "active")}
      ${metric("Total Revenue", money(revenue), "Paid plans", "red", "wallet")}
      ${metric("New Sign Ups", signupUsers.length, selectedTimeRange(), "amber", "add-user")}
      ${metric("Total Students", users, "Student accounts", "blue", "students")}
    </div>
    <div class="two-col">
      <section class="panel">
        <div class="panel-header"><div><h2>Monthly Signups</h2><p>Recent account creation trend.</p></div></div>
        ${barChart(signups.labels, signups.values, "#2f80ed")}
      </section>
      <section class="panel">
        <div class="panel-header"><div><h2>Revenue</h2><p>Revenue signal by plan or account.</p></div></div>
        ${lineChart(revenueRows.labels, revenueRows.values, "#10bfa4")}
      </section>
    </div>
    <div class="two-col">
      <section class="panel">
        <div class="panel-header"><div><h2>Subject Engagement</h2><p>Based on assignments or published curriculum.</p></div></div>
        ${donutChart(subjectRows)}
      </section>
      <section class="panel">
        <div class="panel-header"><div><h2>Assessment Scores</h2><p>Assignment averages by subject.</p></div></div>
        ${barChart(scores.map(row => row.label), scores.map(row => row.value), "#8179d6")}
      </section>
    </div>`;
}

function renderSubjects() {
  const grade = currentCurriculumGrade();
  const curriculum = cachedCurriculumForGrade(grade);
  const isLoading = isCurriculumGradeLoading(grade);
  const curriculumSubjects = curriculumSubjectOptions();
  const engagementRows = curriculumSubjectEngagementRows(curriculumSubjects);
  const mostActive = engagementRows[0] || { subjectName: "Mathematics", activeStudents: 0, durationSeconds: 0, interactions: 0 };
  const leastActive = [...engagementRows].reverse()[0] || { subjectName: "Social Studies", activeStudents: 0, durationSeconds: 0, interactions: 0 };
  return `
    <div class="curriculum-page">
      <div class="curriculum-grade-strip">
        <div class="curriculum-grade-pills" role="tablist" aria-label="Curriculum grades">
          ${grades.map(option => `<button class="curriculum-grade-pill ${option === grade ? "active" : ""}" type="button" role="tab" aria-selected="${option === grade}" data-curriculum-grade="${escapeHtml(option)}">${escapeHtml(option)}</button>`).join("")}
        </div>
        <button class="curriculum-add-button" type="button" data-add-subject aria-label="Add subject">${miniIcon("plus")}</button>
      </div>
      <div class="curriculum-hero-grid">
        ${curriculumHeroCard("blue", "MOST ACTIVE SUBJECT", mostActive.subjectName, engagementSummary(mostActive), "trend")}
        ${curriculumHeroCard("red", "LEAST ACTIVE SUBJECT", leastActive.subjectName, engagementSummary(leastActive), "bars")}
      </div>
      ${isLoading ? `<div class="curriculum-loading">${miniIcon("clock")} Loading ${escapeHtml(grade)} curriculum...</div>` : ""}
      ${curriculum?.error ? `<div class="curriculum-error">${escapeHtml(curriculum.error)}</div>` : ""}
      <section class="curriculum-list" aria-label="${escapeHtml(grade)} curriculum subjects">
        ${curriculumSubjects.map((subject, index) => curriculumSubjectRow(subject, index, curriculum)).join("")}
      </section>
    </div>`;
}

function curriculumHeroCard(tone, eyebrow, title, chip, iconName) {
  return `<section class="curriculum-stat-card ${tone}">
    <div class="curriculum-stat-icon">${miniIcon(iconName)}</div>
    <div>
      <span class="curriculum-stat-eyebrow">${escapeHtml(eyebrow)}</span>
      <h2>${escapeHtml(title)}</h2>
      <span class="curriculum-chip">${escapeHtml(chip)}</span>
    </div>
  </section>`;
}

function curriculumSubjectRow(subject, index, curriculum) {
  const palette = ["tone-blue", "tone-pink", "tone-orange", "tone-green", "tone-red", "tone-teal"];
  const tone = palette[index % palette.length];
  const contentCount = subjectContentCount(subject);
  const isActive = curriculum && !curriculum.error && contentCount > 0;
  const subjectName = subject.subjectName || subject.name || "Subject";
  const subjectId = subject.subjectId || subjectIdFromName(subjectName);
  return `<article class="curriculum-row ${tone}">
    <div class="curriculum-row-main">
      <div class="curriculum-subject-icon ${tone}">${miniIcon(subjectIconName(subjectName))}</div>
      <div class="curriculum-row-copy">
        <h3>${escapeHtml(subjectName)}</h3>
        <span class="curriculum-status ${isActive ? "active" : "missing"}">${miniIcon(isActive ? "check" : "clock")}${isActive ? "Curriculum Active" : "No curriculum"}</span>
      </div>
    </div>
    <div class="curriculum-actions" aria-label="${escapeHtml(subjectName)} actions">
      <button class="curriculum-action edit" type="button" data-curriculum-subject="${escapeHtml(subjectId)}" aria-label="Edit ${escapeHtml(subjectName)}">${miniIcon("pencil")}</button>
      <button class="curriculum-action upload" type="button" data-curriculum-upload="${escapeHtml(subjectId)}" aria-label="Upload ${escapeHtml(subjectName)} curriculum">${miniIcon("upload")}</button>
      <button class="curriculum-action delete" type="button" data-curriculum-delete="${escapeHtml(subjectName)}" aria-label="Delete ${escapeHtml(subjectName)} curriculum">${miniIcon("trash")}</button>
    </div>
  </article>`;
}

function renderSubjectAnalytics() {
  const grade = currentCurriculumGrade();
  const curriculum = cachedCurriculumForGrade(grade);
  const isLoading = isCurriculumGradeLoading(grade);
  const curriculumSubjects = curriculumSubjectOptions();
  const rows = curriculumSubjectEngagementRows(curriculumSubjects);
  const totals = rows.reduce((summary, row) => ({
    activeStudents: summary.activeStudents + Number(row.activeStudents || 0),
    interactions: summary.interactions + Number(row.interactions || 0),
    durationSeconds: summary.durationSeconds + Number(row.durationSeconds || 0)
  }), { activeStudents: 0, interactions: 0, durationSeconds: 0 });
  const mostActive = rows[0] || { subjectName: "No activity", activeStudents: 0, interactions: 0, durationSeconds: 0 };
  const leastActive = rows.length ? rows[rows.length - 1] : mostActive;

  return `
    <div class="toolbar">
      <div class="filters">
        ${selectControl("selectedGrade", grades, grade)}
      </div>
    </div>
    <div class="metric-grid">
      ${metric("Active Students", totals.activeStudents, `${grade} engagement`, "green", "students")}
      ${metric("Interactions", totals.interactions, "Tracked learning events", "blue", "activity")}
      ${metric("Watch Time", formatDuration(totals.durationSeconds), "Total subject time", "amber", "clock")}
      ${metric("Most Active", mostActive.subjectName, engagementSummary(mostActive), "red", "trend")}
    </div>
    ${isLoading ? `<div class="curriculum-loading">${miniIcon("clock")} Loading ${escapeHtml(grade)} subject analytics...</div>` : ""}
    ${curriculum?.error ? `<div class="curriculum-error">${escapeHtml(curriculum.error)}</div>` : ""}
    <div class="two-col">
      <section class="panel">
        <div class="panel-header"><div><h2>Active Students by Subject</h2><p>${escapeHtml(grade)} learner reach.</p></div></div>
        ${barChart(rows.map(row => row.subjectName), rows.map(row => row.activeStudents), "#2f80ed")}
      </section>
      <section class="panel">
        <div class="panel-header"><div><h2>Watch Time by Subject</h2><p>Total time from tracked subject events.</p></div></div>
        ${barChart(rows.map(row => row.subjectName), rows.map(row => Math.round(Number(row.durationSeconds || 0) / 60)), "#10bfa4")}
      </section>
    </div>
    <section class="panel">
      <div class="panel-header"><div><h2>Subject Engagement</h2><p>Ranked by active students, watch time, and interactions.</p></div></div>
      ${table(["Subject", "Active Students", "Interactions", "Watch Time", "Status"], rows.map(row => [
        escapeHtml(row.subjectName),
        Number(row.activeStudents || 0).toLocaleString(),
        Number(row.interactions || 0).toLocaleString(),
        escapeHtml(formatDuration(row.durationSeconds || 0)),
        row === mostActive ? "<span class='status online'>Most active</span>" : row === leastActive ? "<span class='status offline'>Needs attention</span>" : "<span class='status active'>Tracked</span>"
      ]))}
    </section>`;
}

function usersPageRows() {
  const term = state.search.trim().toLowerCase();
  return studentUsers()
    .filter(isInSelectedCounty)
    .filter(user => state.selectedGrade === "All Grades" || user.grade === state.selectedGrade)
    .filter(user => state.selectedSchool === "All Schools" || user.school === state.selectedSchool)
    .map(normalizeUserRow)
    .filter(user => !term || `${user.name} ${user.email} ${user.school} ${user.grade}`.toLowerCase().includes(term));
}

function normalizeUserRow(user, index) {
  const names = ["alice", "kevin", "brian", "stacy", "david"];
  const key = names.find(name => String(user.name || "").toLowerCase().includes(name)) || names[index % names.length];
  return {
    id: user.id,
    name: user.name || user.fullName || user.email || "Student",
    email: user.email || "",
    phone: user.phone || user.phoneNumber || "",
    county: user.county || "",
    schoolId: user.schoolId || user.school_id || null,
    subscriptionPlanName: user.subscriptionPlanName || null,
    subscriptionPlanCode: user.subscriptionPlanCode || null,
    subscriptionStatus: user.hasActiveSubscription ? "active" : (user.subscriptionStatus || "inactive"),
    subscriptionPeriodEnd: user.activeSubscriptionPeriodEnd || null,
    school: user.school || "Kitabu School",
    grade: user.grade || "Grade",
    status: normalizeUserStatus(user.status),
    avatar: key,
    raw: user
  };
}

function normalizeUserStatus(status) {
  const value = String(status || "Active").toLowerCase();
  if (value.includes("online")) return "Online";
  if (value.includes("offline")) return "Offline";
  return "Offline";
}

function schoolOptions() {
  const schools = Array.from(new Set(studentUsers().filter(isInSelectedCounty).map(user => user.school).filter(Boolean))).sort();
  return ["All Schools", ...schools];
}

function schoolMetadata(name) {
  const key = String(name || "").toLowerCase();
  const metadata = [
    ["greenwood", { type: "Boarding School", county: "Nairobi County", activeLearners: 842, engagement: 78, averageScore: 81, code: "GWH-001", crest: "tree" }],
    ["savannah", { type: "Day School", county: "Kiambu County", activeLearners: 721, engagement: 74, averageScore: 84, code: "SAV-002", crest: "shield" }],
    ["highland", { type: "Boarding School", county: "Kisii County", activeLearners: 203, engagement: 38, averageScore: 46, code: "HLP-003", crest: "hp" }],
    ["coast", { type: "Day School", county: "Mombasa County", activeLearners: 86, engagement: 21, averageScore: 52, code: "CJR-004", crest: "palm" }],
    ["lakeview", { type: "Day & Boarding", county: "Nakuru County", activeLearners: 694, engagement: 66, averageScore: 76, code: "LKV-005", crest: "lake" }]
  ].find(([needle]) => key.includes(needle));
  return metadata?.[1] || { type: "Day School", county: "", activeLearners: null, engagement: null, averageScore: null, code: "", crest: "school" };
}

function schoolTypeLabel(value) {
  return {
    day_school: "Day School",
    boarding_school: "Boarding School",
    day_and_boarding: "Day & Boarding"
  }[String(value || "").toLowerCase()] || String(value || "Day School");
}

function normalizeSchoolRow(school, index = 0) {
  const metadata = schoolMetadata(school.name);
  const gradeCounts = school.gradeCounts || school.grade_counts || {};
  const availableGrades = Array.isArray(school.availableGrades)
    ? school.availableGrades
    : Array.isArray(school.available_grades)
      ? school.available_grades
      : Object.keys(gradeCounts);
  const learnerCount = Number(school.totalStudents ?? school.total_students ?? Object.values(gradeCounts).reduce((sum, value) => sum + Number(value || 0), 0));
  const usersInSchool = studentUsers().filter(user => String(user.school || "").toLowerCase() === String(school.name || "").toLowerCase());
  const activeFromUsers = usersInSchool.filter(user => user.status === "Online").length;
  const activeLearners = Number(school.activeLearners ?? metadata.activeLearners ?? activeFromUsers);
  const engagement = Number(school.engagement ?? metadata.engagement ?? (learnerCount ? Math.round((activeLearners / learnerCount) * 100) : 0));
  const scoreFromAssignments = schoolAverageScore(school.name);
  const averageScore = Number(school.averageScore ?? metadata.averageScore ?? scoreFromAssignments ?? 0);
  const location = school.location || metadata.county || "Unknown County";
  const assignedPlanCode = school.pricing?.assignedPlanCode || school.assignedPlanCode || school.assigned_plan_code || "monthly";
  const availablePlanCodes = school.pricing?.availablePlanCodes || school.availablePlanCodes || school.available_plan_codes || [assignedPlanCode];
  const receivedPlanPrices = school.pricing?.planPricesKsh || school.planPricesKsh || school.plan_prices_ksh || {};
  const planPricesKsh = { ...defaultSchoolPlanPricesKsh, ...receivedPlanPrices };
  if (receivedPlanPrices[assignedPlanCode] === undefined && school.subscriptionPriceKsh !== undefined && school.subscriptionPriceKsh !== null) {
    planPricesKsh[assignedPlanCode] = Number(school.subscriptionPriceKsh);
  }
  return {
    id: school.id || `school-${index}`,
    name: school.name || "School",
    county: school.county || metadata.county || countyFromLocation(location),
    location,
    principal: school.principal || "-",
    phone: school.phone || "-",
    email: school.email || "-",
    salesAgentUserId: school.salesAgentUserId || school.sales_agent_user_id || "",
    assignedPlanCode,
    availablePlanCodes,
    planPricesKsh,
    subscriptionPriceKsh: Number(school.subscriptionPriceKsh ?? school.pricing?.effectivePriceKsh ?? school.pricing?.basePriceKsh ?? 0),
    discountId: school.pricing?.discount?.id || school.discountId || school.discount_id || "",
    code: school.code || metadata.code || school.slug || "-",
    schoolType: school.schoolType || school.school_type || "day_school",
    type: schoolTypeLabel(school.schoolType || school.school_type || school.type || metadata.type),
    crest: school.crest || metadata.crest,
    learnerCount,
    activeLearners,
    engagement,
    averageScore,
    availableGrades,
    gradeCounts,
    createdAt: school.createdAt || school.created_at || new Date().toISOString()
  };
}

function schoolSalesAgent(school) {
  if (!school?.salesAgentUserId) return null;
  return salesAgentRows().find(agent => String(agent.id) === String(school.salesAgentUserId)) || null;
}

function schoolSalesAgentOptions(selectedAgentId = "") {
  const agents = salesAgentRows();
  return [
    `<option value="">Unassigned</option>`,
    ...agents.map(agent => `<option value="${escapeHtml(agent.id)}" ${String(agent.id) === String(selectedAgentId) ? "selected" : ""}>${escapeHtml(agent.name)} - ${escapeHtml(agent.email)}</option>`)
  ].join("");
}

function schoolPlanOptions(selectedPlans = ["monthly"], planPricesKsh = defaultSchoolPlanPricesKsh) {
  const selected = new Set(Array.isArray(selectedPlans) && selectedPlans.length ? selectedPlans : ["monthly"]);
  return `<div class="school-plan-options">
    ${["weekly", "monthly", "annual"].map(plan => `<div class="school-plan-option">
      <label class="school-plan-check">
        <input type="checkbox" name="availablePlanCodes" value="${plan}" ${selected.has(plan) ? "checked" : ""} />
        <span>${plan[0].toUpperCase()}${plan.slice(1)}</span>
      </label>
      <label class="school-plan-price"><small>KSh</small><input type="number" name="planPriceKsh_${plan}" min="0" step="1" value="${Number(planPricesKsh[plan] ?? defaultSchoolPlanPricesKsh[plan])}" aria-label="${plan[0].toUpperCase()}${plan.slice(1)} amount (KSh)" /></label>
    </div>`).join("")}
  </div>`;
}

function schoolCountyOptions(selectedCounty = "") {
  const knownCounties = new Set([...kenyaCounties, ...countyOptions().filter(county => county !== "All Counties")]);
  return Array.from(knownCounties)
    .sort()
    .map(county => `<option value="${escapeHtml(county)}" ${county === selectedCounty ? "selected" : ""}>${escapeHtml(county)}</option>`)
    .join("");
}

function schoolGradeOptions(school) {
  const selectedGrades = new Set([...(school.availableGrades || []), ...Object.entries(school.gradeCounts || {})
    .filter(([, count]) => Number(count || 0) > 0)
    .map(([grade]) => grade)]);
  return `<div class="school-grade-options">
    ${grades.map(grade => `<label>
      <input type="checkbox" name="availableGrades" value="${escapeHtml(grade)}" ${selectedGrades.has(grade) ? "checked" : ""} />
      <span>${escapeHtml(grade)}</span>
    </label>`).join("")}
  </div>`;
}

function cleanSchoolFormValue(value) {
  const trimmed = String(value || "").trim();
  return trimmed || null;
}

function schoolPayloadFromForm(formData) {
  const county = String(formData.county || formData.location || "").trim();
  return {
    name: String(formData.name || "").trim(),
    location: county,
    schoolType: String(formData.schoolType || "day_school"),
    principal: cleanSchoolFormValue(formData.principal),
    phone: cleanSchoolFormValue(formData.phone),
    email: cleanSchoolFormValue(formData.email),
    salesAgentUserId: cleanSchoolFormValue(formData.salesAgentUserId),
    discountId: cleanSchoolFormValue(formData.discountId)
  };
}

function upsertSchoolInState(school) {
  if (!school) return;
  const nextSchool = { ...school };
  const index = state.data.schools.findIndex(item => String(item.id) === String(nextSchool.id));
  if (index >= 0) state.data.schools[index] = nextSchool;
  else state.data.schools = [...state.data.schools, nextSchool];
}

function countyFromLocation(location) {
  const value = String(location || "").trim();
  if (!value) return "Unknown County";
  const parts = value.split(",").map(part => part.trim()).filter(Boolean);
  const county = parts.find(part => /county/i.test(part)) || parts.at(-1) || value;
  return /county/i.test(county) ? county : `${county} County`;
}

function schoolAverageScore(schoolName) {
  const schoolUsers = studentUsers().filter(user => String(user.school || "").toLowerCase() === String(schoolName || "").toLowerCase());
  if (!schoolUsers.length) return null;
  const scores = state.data.teacherAssignments
    .filter(assignment => schoolUsers.some(user => !assignment.gradeLevel || user.grade === assignment.gradeLevel))
    .map(assignment => Number(assignment.averageScore || 0))
    .filter(score => score > 0);
  if (!scores.length) return null;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

function schoolRows() {
  const term = state.search.trim().toLowerCase();
  return allSchoolRows()
    .filter(school => state.selectedCounty === "All Counties" || school.county === state.selectedCounty)
    .filter(school => state.selectedGrade === "All Grades" || school.availableGrades?.includes(state.selectedGrade) || Number(school.gradeCounts?.[state.selectedGrade] || 0) > 0)
    .filter(school => selectedTimeRange() === "Lifetime" || !school.createdAt || isDateInRange(school.createdAt))
    .filter(school => !term || `${school.name} ${school.county} ${school.code} ${school.type}`.toLowerCase().includes(term))
    .sort((left, right) => right.learnerCount - left.learnerCount);
}

function countyOptions() {
  return ["All Counties", ...Array.from(new Set(state.data.schools.map(school => normalizeSchoolRow(school).county).filter(Boolean))).sort()];
}

function schoolHighlights(rows) {
  const sortedByActivity = [...rows].sort((left, right) => right.activeLearners - left.activeLearners || right.engagement - left.engagement);
  const sortedByScore = [...rows].sort((left, right) => right.averageScore - left.averageScore);
  return {
    total: rows.length,
    counties: new Set(rows.map(school => school.county)).size,
    mostActive: sortedByActivity[0] || null,
    leastActive: sortedByActivity.at(-1) || null,
    best: sortedByScore[0] || null,
    worst: sortedByScore.at(-1) || null
  };
}

function schoolSpotlightCard(tone, label, title, helper, iconName) {
  return `<article class="schools-spotlight-card ${tone}">
    <div class="schools-spotlight-icon">${miniIcon(iconName)}</div>
    <div class="schools-spotlight-copy">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(title)}</strong>
      <small>${escapeHtml(helper)}</small>
    </div>
  </article>`;
}

function schoolScoreTone(value) {
  const score = Number(value || 0);
  if (score < 55) return "low";
  if (score < 70) return "warn";
  return "good";
}

function schoolActivityTone(value) {
  const active = Number(value || 0);
  if (active < 150) return "low";
  if (active < 350) return "warn";
  return "good";
}

function schoolCrest(school) {
  const initials = String(school.name || "S").split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();
  return `<span class="school-crest ${escapeHtml(school.crest || "school")}">
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect x="6" y="6" width="52" height="52" rx="12"/>
      <path d="M32 14 48 20v12c0 10-6 17-16 21-10-4-16-11-16-21V20l16-6Z"/>
      <text x="32" y="39" text-anchor="middle">${escapeHtml(initials)}</text>
    </svg>
  </span>`;
}

function schoolTypeChip(type) {
  const value = type || "Day School";
  const key = value.toLowerCase().includes("boarding") && value.toLowerCase().includes("day")
    ? "mixed"
    : value.toLowerCase().includes("boarding")
      ? "boarding"
      : "day";
  const iconName = key === "boarding" ? "bed" : key === "mixed" ? "students" : "sun";
  return `<span class="school-type-chip ${key}">${miniIcon(iconName)} ${escapeHtml(value)}</span>`;
}

function schoolListRow(school) {
  return `<button class="school-list-row" type="button" data-school="${escapeHtml(school.id)}">
    <div class="school-list-main">
      ${schoolCrest(school)}
      <span>
        <strong>${escapeHtml(school.name)}</strong>
        <small>${escapeHtml(school.county)}</small>
      </span>
    </div>
    <div class="school-list-type">${schoolTypeChip(school.type)}</div>
    <span class="school-list-metric"><strong>${Number(school.learnerCount || 0).toLocaleString("en-KE")}</strong> learners</span>
    <span class="school-list-metric school-activity ${schoolActivityTone(school.activeLearners)}"><strong>${Number(school.activeLearners || 0).toLocaleString("en-KE")}</strong> active</span>
    <span class="school-list-percent ${schoolScoreTone(school.engagement)}">${percent(school.engagement)}</span>
    <span class="school-list-percent ${schoolScoreTone(school.averageScore)}">${percent(school.averageScore)}</span>
    <span class="school-list-chevron">${miniIcon("chevron")}</span>
  </button>`;
}

function schoolManagementStat(label, value, iconName, tone = "") {
  return `<span class="school-manage-stat ${tone}">
    ${miniIcon(iconName)}
    <strong>${escapeHtml(value)}</strong>
    <small>${escapeHtml(label)}</small>
  </span>`;
}

function schoolGradeBreakdown(school) {
  const rows = Object.entries(school.gradeCounts || {})
    .map(([grade, count]) => [grade, Number(count || 0)])
    .filter(([, count]) => count > 0)
    .sort(([left], [right]) => left.localeCompare(right));
  const max = Math.max(...rows.map(([, count]) => count), 1);
  if (!rows.length) return `<div class="empty-state">No grade breakdown available.</div>`;
  return rows.map(([grade, count]) => `<div class="school-grade-row">
    <span>${escapeHtml(grade)}</span>
    <i><b style="width:${Math.max(8, Math.round((count / max) * 100))}%"></b></i>
    <strong>${count.toLocaleString("en-KE")}</strong>
  </div>`).join("");
}

function schoolManageInfo(label, value, iconName) {
  return `<div class="school-manage-info-row">
    ${miniIcon(iconName)}
    <span><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></span>
  </div>`;
}

function schoolManagementContent(school = null) {
  const isNew = !school;
  const draft = school || {
    id: "",
    name: "",
    location: "",
    county: "",
    principal: "",
    phone: "",
    email: "",
    salesAgentUserId: "",
    assignedPlanCode: "monthly",
    availablePlanCodes: ["monthly"],
    planPricesKsh: { ...defaultSchoolPlanPricesKsh },
    learnerCount: 0,
    activeLearners: 0,
    engagement: 0,
    averageScore: 0,
    gradeCounts: {},
    availableGrades: [],
    type: "Day School",
    code: "New school"
  };
  const assignedAgent = schoolSalesAgent(draft);
  const aiUsage = schoolAiUsage(draft);
  return `<section class="school-management-modal" role="dialog" aria-modal="true" aria-labelledby="schoolManageTitle">
    <header class="school-manage-head">
      <div class="school-manage-identity">
        ${schoolCrest(draft)}
        <div>
          <h2 id="schoolManageTitle">${escapeHtml(isNew ? "Add School" : draft.name)}</h2>
          <p>${escapeHtml(isNew ? "Create a new school profile" : `${draft.county} - ${draft.code}`)}</p>
          ${schoolTypeChip(draft.type)}
        </div>
      </div>
      <div class="school-manage-header-actions">
        ${isNew ? "" : `<button class="school-manage-edit" type="button" data-edit-school aria-label="Edit school details" title="Edit school details">${miniIcon("pencil")}</button>`}
        <button class="school-manage-close" type="button" data-close-modal aria-label="Close school management">${miniIcon("close")}</button>
      </div>
    </header>
    <form class="school-manage-body" data-kind="school-editor" data-school-id="${escapeHtml(draft.id || "")}">
      <section class="school-manage-stats">
        ${schoolManagementStat("Students", Number(draft.learnerCount || 0).toLocaleString("en-KE"), "students", "blue")}
        ${schoolManagementStat("Active Learners", Number(draft.activeLearners || 0).toLocaleString("en-KE"), "active", "green")}
        ${schoolManagementStat("Engagement", percent(draft.engagement), "activity", schoolScoreTone(draft.engagement))}
        ${schoolManagementStat("Avg Tokens / Cost", `${aiUsage.averageTokens.toLocaleString("en-KE")} / ${moneyKesFromCents(aiUsage.averageSpendKshCents)}`, "wallet", "blue")}
      </section>
      <div class="school-manage-grid">
        <section class="school-manage-card">
          <h3>School Details</h3>
          <label class="school-form-field">
            <span>School Name</span>
            <input name="name" value="${escapeHtml(isNew ? "" : draft.name)}" required maxlength="120" />
          </label>
          <label class="school-form-field">
            <span>County</span>
            <select name="county" required>${schoolCountyOptions(draft.county || countyFromLocation(draft.location))}</select>
          </label>
          <label class="school-form-field">
            <span>School Type</span>
            <select name="schoolType" required>
              <option value="day_school" ${draft.type === "Day School" || draft.schoolType === "day_school" ? "selected" : ""}>Day School</option>
              <option value="boarding_school" ${draft.type === "Boarding School" || draft.schoolType === "boarding_school" ? "selected" : ""}>Boarding School</option>
              <option value="day_and_boarding" ${draft.type === "Day & Boarding" || draft.schoolType === "day_and_boarding" ? "selected" : ""}>Day &amp; Boarding</option>
            </select>
          </label>
          <label class="school-form-field">
            <span>Principal</span>
            <input name="principal" value="${escapeHtml(draft.principal === "-" ? "" : draft.principal || "")}" maxlength="120" />
          </label>
          <label class="school-form-field">
            <span>Phone</span>
            <input name="phone" value="${escapeHtml(draft.phone === "-" ? "" : draft.phone || "")}" maxlength="20" />
          </label>
          <label class="school-form-field">
            <span>Email</span>
            <input name="email" type="email" value="${escapeHtml(draft.email === "-" ? "" : draft.email || "")}" />
          </label>
          <div class="school-available-grades school-available-plans">
            <h3>Subscription Plans</h3>
            ${schoolPlanOptions(draft.availablePlanCodes || [draft.assignedPlanCode], draft.planPricesKsh)}
          </div>
          <label class="school-form-field">
            <span>Sales Agent</span>
            <select name="salesAgentUserId">${schoolSalesAgentOptions(draft.salesAgentUserId)}</select>
          </label>
          ${assignedAgent ? schoolManageInfo("Assigned Agent", `${assignedAgent.name} - ${assignedAgent.email}`, "briefcase") : ""}
        </section>
        <section class="school-manage-card">
          <h3>Student Count</h3>
          <p class="school-readonly-note">Student count is auto-populated as students sign up and cannot be edited manually.</p>
          <div class="school-grade-list">${schoolGradeBreakdown(draft)}</div>
          <div class="school-available-grades">
            <h3>Available Grades</h3>
            ${schoolGradeOptions(draft)}
          </div>
        </section>
      </div>
      ${isNew ? "" : `<label class="school-admin-confirmation" hidden>
        <span>${miniIcon("lock")} Confirm with admin password</span>
        <input name="adminPassword" type="password" minlength="8" autocomplete="current-password" placeholder="Enter your admin password" disabled />
        <small>Your password is required to save changes to this school.</small>
      </label>`}
      <p class="error-text"></p>
      <div class="school-manage-actions">
        <button type="button" class="ghost-button" data-close-modal>Cancel</button>
        <button type="submit" class="primary-button school-save-button" ${isNew ? "" : "disabled"}>${miniIcon("save")} ${isNew ? "Add School" : "Save Changes"}</button>
      </div>
    </form>
  </section>`;
}

function setSchoolEditingState(form, isEditing) {
  if (!form?.dataset.schoolId) return;
  form.dataset.editing = String(isEditing);
  form.classList.toggle("is-readonly", !isEditing);
  form.querySelectorAll("input, select, textarea").forEach(control => {
    control.disabled = !isEditing;
  });
  const confirmation = form.querySelector(".school-admin-confirmation");
  if (confirmation) confirmation.hidden = !isEditing;
  const saveButton = form.querySelector(".school-save-button");
  if (saveButton) saveButton.disabled = !isEditing;
  const editButton = modalRoot.querySelector("[data-edit-school]");
  if (editButton) {
    editButton.disabled = isEditing;
    editButton.classList.toggle("is-active", isEditing);
  }
  if (isEditing) form.querySelector("input[name='name']")?.focus();
}

function showSchool(schoolId) {
  const school = schoolRows().find(item => String(item.id) === String(schoolId))
    || sourceSchoolsForAgents().find(item => String(item.id) === String(schoolId));
  if (!school) return;
  modalRoot.classList.remove("student-modal-root");
  modalRoot.classList.add("school-modal-root");
  modalRoot.hidden = false;
  modalRoot.innerHTML = schoolManagementContent(school);
  const form = modalRoot.querySelector("[data-kind='school-editor']");
  setSchoolEditingState(form, false);
  modalRoot.querySelector("[data-edit-school]")?.addEventListener("click", () => setSchoolEditingState(form, true));
  modalRoot.querySelectorAll("[data-close-modal]").forEach(button => button.addEventListener("click", closeModal));
  modalRoot.addEventListener("click", onScrimClick, { once: true });
  bindModalForms();
}

function showAddSchool() {
  modalRoot.classList.remove("student-modal-root");
  modalRoot.classList.add("school-modal-root");
  modalRoot.hidden = false;
  modalRoot.innerHTML = schoolManagementContent();
  modalRoot.querySelectorAll("[data-close-modal]").forEach(button => button.addEventListener("click", closeModal));
  modalRoot.addEventListener("click", onScrimClick, { once: true });
  bindModalForms();
}

function salesSpotlightCard(tone, label, title, helper, iconName) {
  return `<article class="sales-spotlight-card ${tone}">
    <div class="sales-spotlight-icon">${miniIcon(iconName)}</div>
    <div class="sales-spotlight-copy">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(title)}</strong>
      <small>${escapeHtml(helper)}</small>
    </div>
  </article>`;
}

function salesAgentAvatar(agent) {
  const initials = String(agent.name || "SA").split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();
  const paletteIndex = Math.abs(String(agent.id || agent.name || "").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 5;
  return `<span class="sales-agent-avatar avatar-${paletteIndex}" aria-hidden="true">
    <b>${escapeHtml(initials)}</b>
  </span>`;
}

function salesSchoolChips(schools) {
  const visible = schools.slice(0, 2);
  const extra = schools.length - visible.length;
  return `<span class="sales-school-chips">
    ${visible.map(school => `<i>${escapeHtml(school.name)}</i>`).join("")}
    ${extra > 0 ? `<i>+${extra}</i>` : ""}
  </span>`;
}

function salesAgentRow(agent) {
  return `<button class="sales-agent-row" type="button" data-sales-agent="${escapeHtml(agent.id)}">
    <div class="sales-agent-main">
      ${salesAgentAvatar(agent)}
      <span>
        <strong>${escapeHtml(agent.name)}</strong>
        <small>${escapeHtml(agent.email)} <i></i> ${escapeHtml(agent.phone)}</small>
      </span>
    </div>
    <span class="sales-agent-chevron">${miniIcon("chevron")}</span>
  </button>`;
}

function salesDetailStat(label, value, iconName, tone = "") {
  return `<span class="sales-detail-stat ${tone}">
    ${miniIcon(iconName)}
    <strong>${escapeHtml(value)}</strong>
    <small>${escapeHtml(label)}</small>
  </span>`;
}

function salesAssignedSchoolRow(school) {
  return `<article class="sales-assigned-school-row">
    ${schoolCrest(school)}
    <span>
      <strong>${escapeHtml(school.name)}</strong>
      <small>${escapeHtml(school.county)}</small>
    </span>
    <b>${miniIcon("chevron")}</b>
  </article>`;
}

function salesAgentMessageStore() {
  return readJson(SALES_AGENT_MESSAGES_KEY) || {};
}

function salesAgentMessages(agentId) {
  const store = salesAgentMessageStore();
  return Array.isArray(store[agentId]) ? store[agentId] : [];
}

function appendSalesAgentMessage(agentId, message) {
  const store = salesAgentMessageStore();
  store[agentId] = [message, ...(store[agentId] || [])].slice(0, 24);
  writeJson(SALES_AGENT_MESSAGES_KEY, store);
}

function normalizeWhatsappPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  return digits;
}

function salesAgentWhatsappUrl(agent, message = "") {
  const phone = normalizeWhatsappPhone(agent.phone);
  if (!phone) return "";
  const text = message || `Hello ${agent.name}, this is Kitabu AI admin.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

function upsertSalesAgentUser(user) {
  const nextUser = {
    ...user,
    name: user.name || user.fullName || user.email || "Sales Agent",
    fullName: user.fullName || user.name || user.email || "Sales Agent",
    phone: user.phone || user.phoneNumber || "-",
    county: user.county || "",
    roles: roleValues(user).length ? roleValues(user) : ["sales_agent"]
  };
  const index = state.data.users.findIndex(item => String(item.id) === String(nextUser.id));
  if (index >= 0) state.data.users[index] = nextUser;
  else state.data.users = [...state.data.users, nextUser];
}

function salesAgentActionShell(title, agent, body) {
  return `<section class="sales-agent-action-modal" role="dialog" aria-modal="true" aria-labelledby="salesActionTitle">
    <header class="sales-action-head">
      <div>
        <h2 id="salesActionTitle">${escapeHtml(title)}</h2>
        ${agent ? `<p>${escapeHtml(agent.name)} - ${escapeHtml(agent.phone)}</p>` : `<p>Create and activate a field sales account.</p>`}
      </div>
      <button class="sales-detail-close" type="button" data-close-modal aria-label="Close">${miniIcon("close")}</button>
    </header>
    ${body}
  </section>`;
}

function salesAgentSchoolsContent(agent) {
  const rows = agent.assignedSchools.map(school => `<button class="sales-school-detail-row" type="button" data-open-agent-school="${escapeHtml(school.id)}">
    ${schoolCrest(school)}
    <span>
      <strong>${escapeHtml(school.name)}</strong>
      <small>${escapeHtml(school.county)} - ${Number(school.learnerCount || 0).toLocaleString("en-KE")} students</small>
    </span>
    <b>${miniIcon("chevron")}</b>
  </button>`).join("");
  return salesAgentActionShell("Assigned Schools", agent, `
    <div class="sales-agent-action-body">
      <section class="sales-agent-dashboard-grid">
        ${salesDetailStat("Schools", agent.schoolCount, "school", "blue")}
        ${salesDetailStat("Students", Number(agent.studentCount || 0).toLocaleString("en-KE"), "students", "green")}
        ${salesDetailStat("Revenue", moneyKesShort(agent.revenue), "wallet", "green")}
      </section>
      <div class="sales-school-detail-list">${rows || `<div class="empty-state">No assigned schools.</div>`}</div>
    </div>`);
}

function salesAgentMessageContent(agent) {
  return salesAgentActionShell("Message Agent", agent, `
    <form class="sales-agent-action-body sales-message-form" data-kind="sales-agent-message" data-agent-id="${escapeHtml(agent.id)}">
      <label class="school-form-field">
        <span>Title</span>
        <input name="title" value="Message from Kitabu AI" maxlength="120" />
      </label>
      <label class="school-form-field">
        <span>Message</span>
        <textarea name="message" required maxlength="1000" rows="6" placeholder="Write the dashboard and WhatsApp message..."></textarea>
      </label>
      <p class="sales-message-note">Dashboard delivery is automatic. WhatsApp opens with the prepared message for the agent's registered number.</p>
      <p class="error-text"></p>
      <div class="sales-message-status" aria-live="polite"></div>
      <div class="school-manage-actions">
        <button type="button" class="ghost-button" data-close-modal>Cancel</button>
        <button type="submit" class="primary-button">${miniIcon("chat")} Send Message</button>
      </div>
    </form>`);
}

function salesAgentDashboardContent(agent) {
  const messages = salesAgentMessages(agent.id);
  const messageRows = messages.length ? messages.map(message => `<article class="sales-dashboard-message">
    <span>${miniIcon("chat")}</span>
    <div>
      <strong>${escapeHtml(message.title || "Admin message")}</strong>
      <p>${escapeHtml(message.body)}</p>
      <small>${escapeHtml(message.createdAt)} - Dashboard ${escapeHtml(message.dashboardStatus)} - Phone ${escapeHtml(message.phoneStatus)}</small>
    </div>
  </article>`).join("") : `<div class="empty-state">No admin messages sent yet.</div>`;
  return salesAgentActionShell("Sales Agent Dashboard", agent, `
    <div class="sales-agent-action-body">
      <section class="sales-agent-dashboard-grid">
        ${salesDetailStat("Assigned Schools", agent.schoolCount, "school", "blue")}
        ${salesDetailStat("Active Learners", Number(agent.activeLearners || 0).toLocaleString("en-KE"), "active", "green")}
        ${salesDetailStat("Revenue", moneyKesShort(agent.revenue), "wallet", "green")}
        ${salesDetailStat("Conversion", percent(agent.conversionRate), "trend", schoolScoreTone(agent.conversionRate))}
      </section>
      <section class="sales-detail-card">
        <div class="sales-card-head"><h3>Assigned Schools</h3><button type="button" data-view-agent-schools="${escapeHtml(agent.id)}">View All</button></div>
        <div class="sales-dashboard-school-strip">
          ${agent.assignedSchools.slice(0, 4).map(school => `<span>${schoolCrest(school)}<strong>${escapeHtml(school.name)}</strong><small>${escapeHtml(school.county)}</small></span>`).join("") || `<div class="empty-state">No assigned schools.</div>`}
        </div>
      </section>
      <section class="sales-detail-card">
        <div class="sales-card-head"><h3>Message Inbox</h3><button type="button" data-message-agent="${escapeHtml(agent.id)}">New Message</button></div>
        <div class="sales-dashboard-messages">${messageRows}</div>
      </section>
      ${salesActivityTrend(agent)}
    </div>`);
}

function salesAgentCreateContent() {
  const schools = schoolRows();
  return salesAgentActionShell("Add Sales Agent", null, `
    <form class="sales-agent-action-body" data-kind="sales-agent-create">
      <label class="school-form-field">
        <span>Full Name</span>
        <input name="fullName" required maxlength="120" placeholder="Enter full name" />
      </label>
      <label class="school-form-field">
        <span>Email</span>
        <input name="email" type="email" required placeholder="agent@kitabu.ai" />
      </label>
      <label class="school-form-field">
        <span>WhatsApp Number</span>
        <input name="phoneNumber" required maxlength="20" placeholder="+254 7XX XXX XXX" />
      </label>
      <label class="school-form-field">
        <span>County</span>
        <select name="county" required>${schoolCountyOptions("Nairobi County")}</select>
      </label>
      <fieldset class="sales-agent-school-picker">
        <legend>Assign Schools</legend>
        <p>Select the schools this agent will manage and monitor.</p>
        <div>${schools.length ? schools.map(school => `<label><input type="checkbox" name="schoolIds" value="${escapeHtml(school.id)}" /><span><strong>${escapeHtml(school.name)}</strong><small>${escapeHtml(school.county)}</small></span></label>`).join("") : `<span class="visually-muted">No schools are available to assign yet.</span>`}</div>
      </fieldset>
      <p class="sales-message-note">A temporary password is generated for live API accounts and must be changed on first sign-in.</p>
      <p class="error-text"></p>
      <div class="school-manage-actions">
        <button type="button" class="ghost-button" data-close-modal>Cancel</button>
        <button type="submit" class="primary-button">${miniIcon("plus")} Add Agent</button>
      </div>
    </form>`);
}

function salesDetailContact(iconName, value) {
  return `<span class="sales-detail-contact">${miniIcon(iconName)} ${escapeHtml(value)}</span>`;
}

function salesActivityTrend(agent) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const revenue = [0.18, 0.36, 0.48, 0.55, 0.62, 0.92].map(value => Math.round(agent.revenue * value));
  const converted = [0.22, 0.36, 0.39, 0.48, 0.62, 0.72].map(value => Math.max(1, Math.round(agent.schoolCount * value)));
  const maxRevenue = Math.max(...revenue, 1);
  const maxConverted = Math.max(...converted, 1);
  const revenuePoints = revenue.map((value, index) => `${index * 20},${100 - Math.round((value / maxRevenue) * 88)}`);
  const convertedPoints = converted.map((value, index) => `${index * 20},${100 - Math.round((value / maxConverted) * 78)}`);
  return `<section class="sales-detail-card sales-trend-card">
    <div class="sales-card-head">
      <h3>Activity Trend <span>(${escapeHtml(selectedTimeRange())})</span></h3>
      <button type="button">${escapeHtml(selectedTimeRange())} ${miniIcon("chevron")}</button>
    </div>
    <div class="sales-trend-legend">
      <span class="revenue">Revenue (KSh)</span>
      <span class="schools">Schools Converted</span>
    </div>
    <div class="sales-trend-chart" aria-hidden="true">
      <span class="axis-left">KSh<br>150K<br>100K<br>50K<br>0</span>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline class="revenue-line" points="${revenuePoints.join(" ")}"/>
        <polyline class="schools-line" points="${convertedPoints.join(" ")}"/>
        ${revenuePoints.map(point => `<circle class="revenue-dot" cx="${point.split(",")[0]}" cy="${point.split(",")[1]}" r="1.7"/>`).join("")}
        ${convertedPoints.map(point => `<circle class="schools-dot" cx="${point.split(",")[0]}" cy="${point.split(",")[1]}" r="1.7"/>`).join("")}
      </svg>
      <span class="axis-right">Schools<br>12<br>8<br>4<br>0</span>
    </div>
    <div class="sales-trend-months">${months.map(month => `<span>${month}</span>`).join("")}</div>
  </section>`;
}

function salesAgentDetailContent(agent) {
  return `<section class="sales-agent-detail-modal" role="dialog" aria-modal="true" aria-labelledby="salesAgentTitle">
    <header class="sales-detail-head">
      <h2 id="salesAgentTitle">Agent Profile</h2>
      <button class="sales-detail-close" type="button" data-close-modal aria-label="Close sales agent details">${miniIcon("close")}</button>
    </header>
    <div class="sales-detail-profile">
      <div class="sales-detail-identity">
        ${salesAgentAvatar(agent)}
        <div>
          <h3>${escapeHtml(agent.name)}</h3>
          ${salesDetailContact("phone", agent.phone)}
          ${salesDetailContact("document", agent.email)}
          ${salesDetailContact("globe", agent.county || agent.assignedSchools[0]?.county || "No county")}
        </div>
      </div>
    </div>
    <div class="sales-detail-body">
      <section class="sales-detail-stats">
        ${salesDetailStat("Assigned Schools", agent.schoolCount, "school", "blue")}
        ${salesDetailStat("Converted Schools", salesConvertedSchools([agent]), "check", "green")}
        ${salesDetailStat("Students", Number(agent.studentCount || 0).toLocaleString("en-KE"), "students", "blue")}
        ${salesDetailStat("Active Learners", Number(agent.activeLearners || 0).toLocaleString("en-KE"), "active", "green")}
        ${salesDetailStat("Revenue", moneyKesShort(agent.revenue), "wallet", "green")}
        ${salesDetailStat("Conversion", percent(agent.conversionRate), "trend", schoolScoreTone(agent.conversionRate))}
      </section>
      <section class="sales-detail-card">
        <div class="sales-card-head">
          <h3>Assigned Schools</h3>
          <button type="button" data-view-agent-schools="${escapeHtml(agent.id)}">View All</button>
        </div>
        <div class="sales-assigned-school-list">
          ${agent.assignedSchools.length ? agent.assignedSchools.map(salesAssignedSchoolRow).join("") : `<div class="empty-state">No assigned schools.</div>`}
        </div>
      </section>
      ${salesActivityTrend(agent)}
      <div class="sales-detail-actions">
        <button type="button" class="primary-button" data-view-agent-schools="${escapeHtml(agent.id)}">${miniIcon("school")} View Schools</button>
        <button type="button" class="ghost-button" data-message-agent="${escapeHtml(agent.id)}">${miniIcon("chat")} Message Agent</button>
        <button type="button" class="ghost-button" data-agent-dashboard="${escapeHtml(agent.id)}">${miniIcon("briefcase")} Dashboard</button>
      </div>
    </div>
  </section>`;
}

function showSalesAgent(agentId) {
  const agent = salesAgentRows().find(item => String(item.id) === String(agentId));
  if (!agent) return;
  modalRoot.classList.remove("student-modal-root", "school-modal-root");
  modalRoot.classList.add("sales-modal-root");
  modalRoot.hidden = false;
  modalRoot.innerHTML = salesAgentDetailContent(agent);
  modalRoot.querySelector("[data-close-modal]")?.addEventListener("click", closeModal);
  modalRoot.addEventListener("click", onScrimClick, { once: true });
  bindSalesAgentModalActions();
}

function openSalesAgentAction(content) {
  modalRoot.classList.remove("student-modal-root", "school-modal-root");
  modalRoot.classList.add("sales-modal-root");
  modalRoot.hidden = false;
  modalRoot.innerHTML = content;
  modalRoot.querySelectorAll("[data-close-modal]").forEach(button => button.addEventListener("click", closeModal));
  modalRoot.addEventListener("click", onScrimClick, { once: true });
  bindModalForms();
  bindSalesAgentModalActions();
}

function findSalesAgent(agentId) {
  return salesAgentRows().find(item => String(item.id) === String(agentId));
}

function showSalesAgentSchools(agentId) {
  const agent = findSalesAgent(agentId);
  if (!agent) return;
  openSalesAgentAction(salesAgentSchoolsContent(agent));
}

function showSalesAgentMessage(agentId) {
  const agent = findSalesAgent(agentId);
  if (!agent) return;
  openSalesAgentAction(salesAgentMessageContent(agent));
  modalRoot.querySelector("textarea[name='message']")?.focus();
}

function showSalesAgentDashboard(agentId) {
  const agent = findSalesAgent(agentId);
  if (!agent) return;
  openSalesAgentAction(salesAgentDashboardContent(agent));
}

function showAddSalesAgent() {
  openSalesAgentAction(salesAgentCreateContent());
  modalRoot.querySelector("input[name='fullName']")?.focus();
}

function bindSalesAgentModalActions() {
  modalRoot.querySelectorAll("[data-view-agent-schools]").forEach(button => {
    button.addEventListener("click", () => showSalesAgentSchools(button.dataset.viewAgentSchools));
  });
  modalRoot.querySelectorAll("[data-message-agent]").forEach(button => {
    button.addEventListener("click", () => showSalesAgentMessage(button.dataset.messageAgent));
  });
  modalRoot.querySelectorAll("[data-agent-dashboard]").forEach(button => {
    button.addEventListener("click", () => showSalesAgentDashboard(button.dataset.agentDashboard));
  });
  modalRoot.querySelectorAll("[data-open-agent-school]").forEach(button => {
    button.addEventListener("click", () => showSchool(button.dataset.openAgentSchool));
  });
}

function usersSpotlightCards(rows) {
  const active = rows.find(user => user.name.toLowerCase().includes("alice")) || rows.find(user => user.status === "Online") || rows[0];
  const improved = rows.find(user => user.name.toLowerCase().includes("stacy")) || rows[3] || rows[0];
  const least = rows.find(user => user.name.toLowerCase().includes("kevin")) || rows.find(user => user.status === "Offline") || rows[1] || rows[0];
  return [
    { tone: "blue", label: "Most Active Student", user: active, helper: active?.name?.toLowerCase().includes("alice") ? "24 hrs this week" : "Top activity this week", icon: "activity" },
    { tone: "green", label: "Most Improved Student", user: improved, helper: improved?.name?.toLowerCase().includes("stacy") ? "+18% score growth" : "Highest score growth", icon: "trend" },
    { tone: "orange", label: "Least Active Student", user: least, helper: least?.name?.toLowerCase().includes("kevin") ? "2 hrs this week" : "Lowest activity this week", icon: "clock" }
  ].filter(card => card.user);
}

function usersSpotlightCard(card) {
  return `<button class="users-spotlight-card ${card.tone}" type="button" data-user="${escapeHtml(card.user.id)}">
    ${studentAvatar(card.user.avatar, "large")}
    <div class="users-spotlight-copy">
      <span>${escapeHtml(card.label)}</span>
      <strong>${escapeHtml(card.user.name)}</strong>
      <small>${escapeHtml(card.helper)}</small>
    </div>
    <div class="users-spotlight-icon">${miniIcon(card.icon)}</div>
  </button>`;
}

function studentAvatar(kind, size = "") {
  const palettes = {
    alice: ["#8bb8ff", "#a4622d", "#111827", "#f7a31a", "#1d4ed8"],
    kevin: ["#ffc2d3", "#8a4c2d", "#ec8aa9", "#f59e0b", "#ef4444"],
    brian: ["#f4f7fb", "#5a3826", "#111827", "#374151", "#0f172a"],
    stacy: ["#b7e1d9", "#f0c29a", "#f5f0df", "#075985", "#0891b2"],
    david: ["#e9f5e8", "#9a5f35", "#7c3f1d", "#22c55e", "#166534"]
  };
  const [bg, skin, hair, shirt, accent] = palettes[kind] || palettes.alice;
  return `<span class="student-avatar ${size}" aria-hidden="true">
    <svg viewBox="0 0 72 72">
      <rect x="1" y="1" width="70" height="70" rx="13" fill="${bg}" stroke="rgba(255,255,255,.72)" stroke-width="2"/>
      <path d="M18 68c2-14 10-21 18-21s16 7 18 21H18Z" fill="${shirt}"/>
      <circle cx="36" cy="32" r="15" fill="${skin}"/>
      <path d="M22 30c2-11 8-17 17-16 8 1 13 6 13 15-7-4-14-6-23-3-2 1-4 2-7 4Z" fill="${hair}"/>
      <path d="M27 17c4-8 16-8 20 0" fill="none" stroke="${hair}" stroke-width="9" stroke-linecap="round"/>
      <circle cx="30" cy="34" r="2" fill="#111827"/><circle cx="42" cy="34" r="2" fill="#111827"/>
      <path d="M31 43c3 2 7 2 10 0" fill="none" stroke="#5b2c1b" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="22" cy="36" r="3" fill="${skin}"/><circle cx="50" cy="36" r="3" fill="${skin}"/>
      <path d="M24 57c7 5 17 5 24 0" fill="none" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>
    </svg>
  </span>`;
}

function userStatusClass(status) {
  return String(status || "").toLowerCase();
}

function userRow(user) {
  return `<button class="user-list-row" type="button" data-user="${escapeHtml(user.id)}">
    ${studentAvatar(user.avatar)}
    <span class="user-row-copy">
      <strong>${escapeHtml(user.name)}</strong>
      <small>${escapeHtml(user.school)} <i></i> ${escapeHtml(user.grade)}</small>
    </span>
    <span class="user-status ${userStatusClass(user.status)}">${escapeHtml(user.status)}</span>
    <span class="user-chevron">${miniIcon("chevron")}</span>
  </button>`;
}

function renderUsers() {
  const users = usersPageRows();
  const cards = usersSpotlightCards(users);
  return `
    <div class="users-page">
      <header class="users-header">
        <div>
          <h1>Users</h1>
          <p>Manage and monitor all users across the platform.</p>
        </div>
        <div class="users-header-actions">
          <div class="users-filters">
            ${selectControl("selectedGrade", ["All Grades", ...grades], state.selectedGrade)}
            ${selectControl("selectedCounty", countyOptions(), state.selectedCounty)}
            ${selectControl("selectedSchool", schoolOptions(), state.selectedSchool)}
          </div>
        </div>
      </header>
      <section class="users-spotlight-grid">
        ${cards.length ? cards.map(usersSpotlightCard).join("") : `<div class="empty-state">No student records available.</div>`}
      </section>
      <label class="users-search" aria-label="Search users">
        ${miniIcon("search")}
        <input id="searchInput" value="${escapeHtml(state.search)}" placeholder="Search users by name or email..." />
      </label>
      <section class="users-list" aria-label="Student users">
        ${users.length ? users.map(userRow).join("") : `<div class="empty-state">No matching students.</div>`}
      </section>
    </div>`;
}

function renderSchools() {
  const rows = schoolRows();
  const highlights = schoolHighlights(rows);
  const totalSchools = highlights.total || 0;
  const countyCount = highlights.counties || 0;
  const mostActive = highlights.mostActive;
  const leastActive = highlights.leastActive;
  const best = highlights.best;
  const worst = highlights.worst;
  return `
    <div class="schools-page">
      <header class="schools-header">
        <div>
          <h1>Schools</h1>
          <p>Monitor school performance, learner engagement and activity across the platform.</p>
        </div>
        <div class="schools-header-actions">
          <button class="schools-add-button" type="button" data-add-school aria-label="Add school">${miniIcon("plus")}</button>
          <div class="schools-filters">
            ${selectControl("selectedGrade", ["All Grades", ...grades], state.selectedGrade)}
            ${selectControl("selectedCounty", countyOptions(), state.selectedCounty)}
            ${selectControl("timeRange", timeRangeOptions, selectedTimeRange())}
          </div>
        </div>
      </header>
      <section class="schools-spotlight-grid">
        ${schoolSpotlightCard("blue", "Total Schools", totalSchools, `Across ${countyCount} ${countyCount === 1 ? "county" : "counties"}`, "school")}
        ${schoolSpotlightCard("green", "Most Active School", mostActive?.name || "-", `${Number(mostActive?.activeLearners || 0).toLocaleString("en-KE")} active learners`, "trophy")}
        ${schoolSpotlightCard("orange", "Least Active School", leastActive?.name || "-", `${Number(leastActive?.activeLearners || 0).toLocaleString("en-KE")} active learners`, "clock")}
        ${schoolSpotlightCard("gold", "Best Performing School", best?.name || "-", `${percent(best?.averageScore || 0)} avg score`, "shield-star")}
        ${schoolSpotlightCard("red", "Worst Performing School", worst?.name || "-", `${percent(worst?.averageScore || 0)} avg score`, "trend")}
      </section>
      <label class="schools-search" aria-label="Search schools">
        ${miniIcon("search")}
        <input id="searchInput" value="${escapeHtml(state.search)}" placeholder="Search schools by name, county or code..." />
      </label>
      <section class="schools-list-shell" aria-label="All schools">
        <div class="schools-list-header">
          <h2>All Schools</h2>
          <span>Learners</span>
          <span>Active Learners</span>
          <span>Engagement</span>
          <span>Avg Score</span>
        </div>
        <div class="schools-list">
          ${rows.length ? rows.map(schoolListRow).join("") : `<div class="empty-state">No matching schools.</div>`}
        </div>
      </section>
    </div>`;
}

function renderSales() {
  const agents = salesAgentRows();
  const highlights = salesHighlights(agents);
  const convertedSchools = salesConvertedSchools(agents);
  return `
    <div class="sales-page">
      <header class="sales-header">
        <div>
          <h1>Sales Agents</h1>
          <p>Track field sales activity, school onboarding and revenue conversion.</p>
        </div>
        <div class="sales-header-actions">
          <button class="sales-add-button" type="button" data-add-sales-agent aria-label="Add sales agent">${miniIcon("plus")}</button>
          <div class="sales-filters">
            ${selectControl("selectedCounty", countyOptions(), state.selectedCounty)}
            ${selectControl("timeRange", timeRangeOptions, selectedTimeRange())}
            ${selectControl("selectedAgentStatus", salesAgentStatusOptions(), state.selectedAgentStatus)}
          </div>
        </div>
      </header>
      <section class="sales-spotlight-grid">
        ${salesSpotlightCard("blue", "Total Agents", highlights.total, "Field team", "students")}
        ${salesSpotlightCard("green", "Schools Assigned", agents.reduce((sum, agent) => sum + agent.schoolCount, 0), `${countyOptions().length - 1 || 0} counties`, "school")}
        ${salesSpotlightCard("orange", "Schools Converted", convertedSchools, "Paid accounts", "check")}
        ${salesSpotlightCard("purple", "Active Learners", highlights.managedLearners.toLocaleString("en-KE"), "From assigned schools", "profile")}
        ${salesSpotlightCard("red", "Revenue Closed", moneyKesShort(highlights.revenue), "This term", "wallet")}
      </section>
      <label class="sales-search" aria-label="Search sales agents">
        ${miniIcon("search")}
        <input id="searchInput" value="${escapeHtml(state.search)}" placeholder="Search agents by name, phone, county or email..." />
      </label>
      <section class="sales-list-shell" aria-label="All sales agents">
        <div class="sales-list-header">
          <h2>All Sales Agents</h2>
        </div>
        <div class="sales-list">
          ${agents.length ? agents.map(salesAgentRow).join("") : `<div class="empty-state">No matching sales agents.</div>`}
        </div>
      </section>
    </div>`;
}

function teacherPeriodButtons() {
  const options = ["Today", "This Week", "This Term"];
  const active = options.includes(state.teacherPeriod) ? state.teacherPeriod : "This Week";
  if (state.teacherPeriod !== active) state.teacherPeriod = active;
  return `<div class="teacher-segmented">${options.map(option => `<button class="${active === option ? "active" : ""}" type="button" data-teacher-period="${escapeHtml(option)}">${escapeHtml(option)}</button>`).join("")}</div>`;
}

function teacherAssignmentRows() {
  return state.data.teacherAssignments.map((assignment, index) => ({
    id: assignment.id || `assignment-${index}`,
    title: assignment.title || "Weekly Assignment",
    subject: assignment.subject || subjects[index % subjects.length],
    grade: assignment.gradeLevel || assignment.grade_level || grades[index % grades.length],
    submittedCount: Number(assignment.submittedCount ?? assignment.submitted_count ?? 0),
    totalStudents: Number(assignment.totalStudents ?? assignment.total_students ?? 0),
    averageScore: Number(assignment.averageScore ?? assignment.average_score ?? 0),
    createdAt: assignment.createdAt || assignment.created_at || new Date().toISOString()
  }));
}

function normalizeTeacherStudent(student, index = 0) {
  const schools = allSchoolRows();
  const school = schools.find(row => row.name === student.school) || schools[index % Math.max(1, schools.length)] || {};
  const grade = student.grade || student.gradeLevel || student.grade_level || grades[index % grades.length];
  return {
    id: student.id || `teacher-student-${index}`,
    name: student.name || student.fullName || "Learner",
    grade,
    school: student.school || school.name || "No School",
    county: student.county || school.county || countyForSchoolName(student.school) || "Unknown County",
    assessmentScore: Number(student.assessmentScore ?? student.assessment_score ?? student.averageScore ?? 0),
    homeworkCompletion: Number(student.homeworkCompletion ?? student.homework_completion ?? 0),
    lastActive: student.lastActive || student.last_active || "Recent",
    trend: student.trend || student.performanceTrend || "Stable"
  };
}

function teacherStudentRows() {
  const teacherGrade = state.user?.grade || state.user?.gradeLevel;
  return state.data.teacherStudents
    .map(normalizeTeacherStudent)
    .filter(student => !isTeacherOnly() || !teacherGrade || student.grade === teacherGrade);
}

function teacherSchoolOptions() {
  const schools = Array.from(new Set(teacherStudentRows().map(row => row.school).filter(Boolean))).sort();
  return ["All Schools", ...schools];
}

function teacherSubjectOptions() {
  const assignmentSubjects = teacherAssignmentRows().map(row => row.subject).filter(Boolean);
  return ["All Subjects", ...Array.from(new Set([...subjects, ...assignmentSubjects])).sort()];
}

function filteredTeacherStudents() {
  return teacherStudentRows()
    .filter(row => state.selectedSchool === "All Schools" || row.school === state.selectedSchool)
    .filter(row => state.selectedCounty === "All Counties" || row.county === state.selectedCounty)
    .filter(row => state.selectedGrade === "All Grades" || row.grade === state.selectedGrade);
}

function teacherRows() {
  const teacherUsers = state.data.users.filter(user => hasRole(user, "teacher"));
  const schools = allSchoolRows();
  const live = teacherUsers.map((teacher, index) => {
    const schoolName = teacher.school && teacher.school !== "No School" ? teacher.school : schools[index % Math.max(1, schools.length)]?.name || "No School";
    const teacherStudents = teacherStudentRows().filter(student => student.school === schoolName);
    const assignmentCount = teacherAssignmentRows().filter(row => !state.selectedSubject || state.selectedSubject === "All Subjects" || row.subject === state.selectedSubject).length;
    const averageScore = teacherStudents.length
      ? Math.round(teacherStudents.reduce((sum, student) => sum + student.assessmentScore, 0) / teacherStudents.length)
      : 0;
    return {
      id: teacher.id || `teacher-${index}`,
      name: teacher.name || teacher.fullName || teacher.email || "Teacher",
      initials: initialsFor(teacher.name || teacher.fullName || teacher.email || "T"),
      school: schoolName,
      county: teacher.county || countyForSchoolName(schoolName),
      classes: new Set(teacherStudents.map(student => student.grade)).size,
      assignments: assignmentCount,
      activeLearners: teacherStudents.length,
      averageScore,
      tone: ["blue", "green", "red", "purple", "orange"][index % 5]
    };
  });
  return live.map((row, index) => ({
    ...row,
    county: row.county || countyForSchoolName(row.school),
    tone: row.tone || ["blue", "green", "red", "purple", "orange"][index % 5]
  }));
}

function filteredTeacherRows() {
  return teacherRows()
    .filter(row => state.selectedSchool === "All Schools" || row.school === state.selectedSchool)
    .filter(row => state.selectedCounty === "All Counties" || row.county === state.selectedCounty)
    .filter(row => state.selectedGrade === "All Grades" || teacherStudentRows().some(student => student.school === row.school && student.grade === state.selectedGrade));
}

function initialsFor(name) {
  return String(name || "T").split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();
}

function teacherMetricCard(tone, iconName, label, title, helper) {
  return `<article class="teacher-metric-card ${tone}">
    <i class="teacher-metric-wave wave-back" aria-hidden="true"></i>
    <i class="teacher-metric-wave wave-mid" aria-hidden="true"></i>
    <i class="teacher-metric-wave wave-front" aria-hidden="true"></i>
    <div class="teacher-metric-icon">${miniIcon(iconName)}</div>
    <div>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(title)}</strong>
      <small>${escapeHtml(helper)}</small>
    </div>
  </article>`;
}

function teacherLineChart() {
  const assignments = teacherAssignmentRows().slice(-5);
  if (!assignments.length) return `<div class="empty-state">No assignment activity has been recorded yet.</div>`;
  const labels = assignments.map(row => row.title);
  const values = assignments.map(row => row.averageScore);
  const max = 100;
  const x = index => labels.length === 1 ? 360 : 54 + index * (636 / (labels.length - 1));
  const y = value => 206 - (value / max) * 172;
  return `<svg class="teacher-line-chart" viewBox="0 0 720 260" role="img" aria-label="Teacher activity trend">
    ${[0, 25, 50, 75, 100].map(value => `<g><line x1="42" x2="690" y1="${y(value)}" y2="${y(value)}"/><text x="20" y="${y(value) + 4}">${value}</text></g>`).join("")}
    ${labels.map((label, index) => `<text class="teacher-chart-label" x="${x(index)}" y="232" text-anchor="middle">${escapeHtml(label)}</text>`).join("")}
    <polyline points="${values.map((value, index) => `${x(index)},${y(value).toFixed(1)}`).join(" ")}" stroke="#106cff"/>
    ${values.map((value, index) => `<circle cx="${x(index)}" cy="${y(value).toFixed(1)}" r="4" fill="#fff" stroke="#106cff"/>`).join("")}
    <g class="teacher-chart-legend"><text x="290" y="252" fill="#106cff">━</text><text x="315" y="252">Average score</text></g>
  </svg>`;
}

function teacherSubjectRows(students = filteredTeacherStudents()) {
  const base = [
    { label: "Mathematics", value: 0, color: "#106cff" },
    { label: "Science", value: 0, color: "#27c16f" },
    { label: "English", value: 0, color: "#8b5cf6" },
    { label: "Kiswahili", value: 0, color: "#ff7a00" },
    { label: "Social Studies", value: 0, color: "#11b7c8" }
  ];
  const assignmentRows = teacherAssignmentRows();
  return base.map(row => {
    const matching = assignmentRows.filter(assignment => assignment.subject === row.label && (state.selectedGrade === "All Grades" || assignment.grade === state.selectedGrade));
    const score = matching.length ? Math.round(matching.reduce((sum, item) => sum + item.averageScore, 0) / matching.length) : row.value;
    return { ...row, value: students.length ? score : row.value };
  }).filter(row => state.selectedSubject === "All Subjects" || row.label === state.selectedSubject);
}

function teacherSubjectDonut(rows) {
  const total = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.value, 0) / rows.length) : 0;
  let offset = 25;
  const arcs = rows.map(row => {
    const length = Math.max(8, row.value / Math.max(1, rows.reduce((sum, item) => sum + item.value, 0)) * 100);
    const arc = `<circle cx="112" cy="112" r="76" fill="none" stroke="${row.color}" stroke-width="32" pathLength="100" stroke-dasharray="${length} ${100 - length}" stroke-dashoffset="${-offset}" />`;
    offset += length;
    return arc;
  }).join("");
  return `<div class="teacher-subject-layout">
    <svg class="teacher-donut" viewBox="0 0 224 224" aria-label="Class performance by subject">
      ${arcs}
      <circle cx="112" cy="112" r="52" fill="#fff"/>
      <text x="112" y="102" text-anchor="middle">Overall</text>
      <text x="112" y="120" text-anchor="middle">Average</text>
      <text x="112" y="148" text-anchor="middle" class="teacher-donut-score">${total}%</text>
    </svg>
    <div class="teacher-subject-bars">
      ${rows.map(row => `<div class="teacher-subject-row"><span><i style="background:${row.color}"></i>${escapeHtml(row.label)}</span><b><em style="width:${row.value}% ; background:${row.color}"></em></b><strong>${row.value}%</strong></div>`).join("")}
    </div>
  </div>`;
}

function teacherAvatar(row) {
  return `<span class="teacher-avatar ${escapeHtml(row.tone || "blue")}">${escapeHtml(row.initials || initialsFor(row.name))}</span>`;
}

function teacherScoreTone(score) {
  const value = Number(score || 0);
  if (value < 55) return "low";
  if (value < 70) return "warn";
  return "good";
}

function teacherPerformanceTable(rows) {
  return `<div class="teacher-table-wrap"><table class="teacher-table">
    <thead><tr><th>Teacher</th><th>School</th><th>Classes</th><th>Assignments</th><th>Active Learners</th><th>Avg Score</th><th>Action</th></tr></thead>
    <tbody>${rows.map(row => `<tr>
      <td><span class="teacher-name-cell">${teacherAvatar(row)}<strong>${escapeHtml(row.name)}</strong></span></td>
      <td>${escapeHtml(row.school)}</td>
      <td>${Number(row.classes || 0)} classes</td>
      <td>${Number(row.assignments || 0)} assignments</td>
      <td>${Number(row.activeLearners || 0).toLocaleString("en-KE")} active</td>
      <td><span class="teacher-score ${teacherScoreTone(row.averageScore)}">${percent(row.averageScore)} ${miniIcon("trend")}</span></td>
      <td><button class="teacher-message-button" type="button" data-message-teacher="${escapeHtml(row.id)}">${miniIcon("chat")} Message</button></td>
    </tr>`).join("")}</tbody>
  </table></div>`;
}

function teacherBroadcastPanel() {
  const scopes = [
    ["One School", "All classes in one school", "school"],
    ["Selected Grades", "Choose specific grades", "students"],
    ["All Schools", "All schools in the system", "globe"]
  ];
  return `<section class="teacher-panel teacher-broadcast">
    <div class="teacher-panel-head"><h2>Assignment Broadcast ${miniIcon("alert")}</h2><p>Choose scope for the assignment you want to set.</p></div>
    <div class="teacher-broadcast-options">
      ${scopes.map((scope, index) => `<button class="${index === 0 ? "active" : ""}" type="button" data-broadcast-scope="${escapeHtml(scope[0])}">${miniIcon(scope[2])}<strong>${escapeHtml(scope[0])}</strong><small>${escapeHtml(scope[1])}</small><i></i></button>`).join("")}
    </div>
    <button class="teacher-create-assignment" type="button" data-modal="assignment">Create Assignment</button>
  </section>`;
}

function teacherAlertsPanel() {
  const teachersWithoutAssignments = teacherRows().filter(row => row.assignments === 0);
  const alerts = teachersWithoutAssignments.map(row => ["orange", `${row.name} has no assignments`, "No assignment activity is recorded."]);
  const attention = filteredTeacherStudents()
    .filter(row => row.assessmentScore < 60)
    .slice(0, 3)
    .map(row => [`${row.grade} - ${row.school}`, row.assessmentScore]);
  return `<div class="teacher-side-stack">
    <section class="teacher-panel">
      <div class="teacher-panel-head compact"><h2>${miniIcon("bell")} Admin Alerts ${miniIcon("alert")}</h2></div>
      <div class="teacher-alert-list">${alerts.length ? alerts.map(row => `<button class="teacher-alert-row ${row[0]}" type="button"><span>${miniIcon("alert")}</span><strong>${escapeHtml(row[1])}<small>${escapeHtml(row[2])}</small></strong>${miniIcon("chevron")}</button>`).join("") : `<div class="empty-state">No teacher alerts.</div>`}</div>
    </section>
    <section class="teacher-panel">
      <div class="teacher-panel-head compact"><h2>Classes Requiring Attention ${miniIcon("alert")}</h2></div>
      <div class="teacher-attention-list">${attention.length ? attention.map(row => `<button class="teacher-attention-row" type="button">${miniIcon("bars")}<strong>${escapeHtml(row[0])}</strong><span>${row[1]}% avg score</span>${miniIcon("chevron")}</button>`).join("") : `<div class="empty-state">No classes currently require attention.</div>`}</div>
    </section>
  </div>`;
}

function teacherAdminDashboard() {
  const teachers = filteredTeacherRows();
  const students = filteredTeacherStudents();
  const bestTeacher = [...teachers].sort((a, b) => b.averageScore - a.averageScore)[0] || teachers[0];
  const lowestTeacher = [...teachers].sort((a, b) => a.averageScore - b.averageScore)[0] || teachers[0];
  const bestClass = [...students].sort((a, b) => b.assessmentScore - a.assessmentScore)[0] || students[0];
  const lowestClass = [...students].sort((a, b) => a.assessmentScore - b.assessmentScore)[0] || students[0];
  return `<div class="teacher-portal-page admin-dashboard">
    <header class="teacher-portal-header">
      <div><h1>Teacher's Portal</h1><p>Monitor teacher activity, class performance, assignment coverage and school learning outcomes.</p></div>
      <div class="teacher-header-controls">
        ${teacherPeriodButtons()}
        ${selectControl("selectedSchool", teacherSchoolOptions(), state.selectedSchool)}
        ${selectControl("selectedGrade", ["All Grades", ...grades], state.selectedGrade)}
        ${selectControl("selectedSubject", teacherSubjectOptions(), state.selectedSubject)}
        <button class="teacher-orange-button" type="button" data-modal="assignment">${miniIcon("plus")} Set Assignment as Teacher</button>
        <button class="teacher-outline-button" type="button" data-message-all-teachers>${miniIcon("chat")} Message Teachers</button>
      </div>
    </header>
    <section class="teacher-metric-grid">
      ${teacherMetricCard("blue", "profile", "Most Active Teacher", bestTeacher?.name || "No teacher data", `${Number(bestTeacher?.assignments || 0)} assignments`)}
      ${teacherMetricCard("red", "profile", "Least Active Teacher", lowestTeacher?.name || "No teacher data", `${Number(lowestTeacher?.assignments || 0)} assignments`)}
      ${teacherMetricCard("green", "trophy", "Best Class Performance", bestClass ? `${bestClass.grade} - ${bestClass.school}` : "No class data", `${percent(bestClass?.assessmentScore || 0)} avg score`)}
      ${teacherMetricCard("orange", "trend", "Lowest Class Performance", lowestClass ? `${lowestClass.grade} - ${lowestClass.school}` : "No class data", `${percent(lowestClass?.assessmentScore || 0)} avg score`)}
      ${teacherMetricCard("purple", "document", "Assignment Coverage", `${assignmentCoverage(students)}%`, "Classes with weekly work")}
    </section>
    <section class="teacher-dashboard-grid">
      <section class="teacher-panel teacher-wide-panel"><div class="teacher-panel-head"><h2>Teacher Activity Trend ${miniIcon("alert")}</h2><p>Overview of teacher actions over the selected period</p><button>Weekly ${miniIcon("chevron")}</button></div>${teacherLineChart()}</section>
      <section class="teacher-panel"><div class="teacher-panel-head"><h2>Class Performance by Subject ${miniIcon("alert")}</h2><p>Average class performance across all schools</p><button>This Term ${miniIcon("chevron")}</button></div>${teacherSubjectDonut(teacherSubjectRows(students))}</section>
    </section>
    <section class="teacher-lower-grid">
      <section class="teacher-panel teacher-table-panel"><div class="teacher-panel-head"><h2>Teacher Performance Overview ${miniIcon("alert")}</h2></div>${teacherPerformanceTable(teachers)}</section>
      ${teacherBroadcastPanel()}
      ${teacherAlertsPanel()}
    </section>
  </div>`;
}

function assignmentCoverage(students) {
  const assignments = teacherAssignmentRows();
  if (!students.length) return 0;
  const coveredGrades = new Set(assignments.map(row => row.grade));
  const studentGrades = new Set(students.map(row => row.grade));
  return Math.round((Array.from(studentGrades).filter(grade => coveredGrades.has(grade)).length / Math.max(1, studentGrades.size)) * 100);
}

function teacherScopedDashboard() {
  const students = filteredTeacherStudents();
  const subjectRows = teacherSubjectRows(students);
  const avgScore = students.length ? Math.round(students.reduce((sum, row) => sum + row.assessmentScore, 0) / students.length) : 0;
  const lowStudents = [...students].sort((a, b) => a.assessmentScore - b.assessmentScore).slice(0, 5);
  return `<div class="teacher-portal-page scoped-dashboard">
    <header class="teacher-portal-header">
      <div><h1>Teacher's Portal</h1><p>Track your assigned grades, learner performance, assignments and remedial follow-up.</p></div>
      <div class="teacher-header-controls">
        ${teacherPeriodButtons()}
        ${selectControl("selectedGrade", ["All Grades", ...grades], state.selectedGrade)}
        ${selectControl("selectedSubject", teacherSubjectOptions(), state.selectedSubject)}
        <button class="teacher-orange-button" type="button" data-modal="assignment">${miniIcon("plus")} Set Assignment</button>
      </div>
    </header>
    <section class="teacher-metric-grid scoped">
      ${teacherMetricCard("blue", "students", "My Active Learners", Number(students.length).toLocaleString("en-KE"), "Across assigned grades")}
      ${teacherMetricCard("green", "trophy", "Class Average", `${avgScore}%`, "Current performance")}
      ${teacherMetricCard("orange", "document", "Assignments Set", `${teacherAssignmentRows().length}`, "This week")}
      ${teacherMetricCard("red", "alert", "Needs Follow-up", `${lowStudents.filter(row => row.assessmentScore < 60).length}`, "Learners below target")}
      ${teacherMetricCard("purple", "check", "Completion", `${completionAverage(students)}%`, "Homework submitted")}
    </section>
    <section class="teacher-dashboard-grid">
      <section class="teacher-panel teacher-wide-panel"><div class="teacher-panel-head"><h2>My Class Activity Trend ${miniIcon("alert")}</h2><p>Assignments, feedback and remedial work for your grades</p><button>Weekly ${miniIcon("chevron")}</button></div>${teacherLineChart()}</section>
      <section class="teacher-panel"><div class="teacher-panel-head"><h2>My Subject Performance ${miniIcon("alert")}</h2><p>Average performance across your active classes</p><button>This Term ${miniIcon("chevron")}</button></div>${teacherSubjectDonut(subjectRows)}</section>
    </section>
    <section class="teacher-lower-grid scoped">
      <section class="teacher-panel teacher-table-panel">
        <div class="teacher-panel-head"><h2>Learner Performance Overview ${miniIcon("alert")}</h2></div>
        ${teacherLearnerTable(students)}
      </section>
      ${teacherBroadcastPanel()}
      <section class="teacher-panel">
        <div class="teacher-panel-head compact"><h2>Learners Requiring Attention ${miniIcon("alert")}</h2></div>
        <div class="teacher-attention-list">${lowStudents.length ? lowStudents.map(row => `<button class="teacher-attention-row" type="button" data-teacher-student="${escapeHtml(row.id)}">${miniIcon("bars")}<strong>${escapeHtml(row.name)} - ${escapeHtml(row.grade)}</strong><span>${percent(row.assessmentScore)} avg score</span>${miniIcon("chevron")}</button>`).join("") : `<div class="empty-state">No learners currently require attention.</div>`}</div>
      </section>
    </section>
  </div>`;
}

function completionAverage(students) {
  return students.length ? Math.round(students.reduce((sum, row) => sum + row.homeworkCompletion, 0) / students.length) : 0;
}

function teacherLearnerTable(students) {
  const rows = students.slice(0, 8);
  if (!rows.length) return `<div class="empty-state">No learners are assigned to this teacher.</div>`;
  return `<div class="teacher-table-wrap"><table class="teacher-table learner-table">
    <thead><tr><th>Learner</th><th>Grade</th><th>Subject Focus</th><th>Assignments</th><th>Completion</th><th>Avg Score</th><th>Action</th></tr></thead>
    <tbody>${rows.map((row, index) => `<tr>
      <td><span class="teacher-name-cell">${teacherAvatar({ ...row, initials: initialsFor(row.name), tone: ["blue", "green", "red", "purple", "orange"][index % 5] })}<strong>${escapeHtml(row.name)}</strong></span></td>
      <td>${escapeHtml(row.grade)}</td>
      <td>${escapeHtml(subjects[index % subjects.length])}</td>
      <td>${Math.max(1, Math.round(row.homeworkCompletion / 12))} active</td>
      <td>${percent(row.homeworkCompletion)}</td>
      <td><span class="teacher-score ${teacherScoreTone(row.assessmentScore)}">${percent(row.assessmentScore)} ${miniIcon("trend")}</span></td>
      <td><button class="teacher-message-button" type="button" data-teacher-student="${escapeHtml(row.id)}">View</button></td>
    </tr>`).join("")}</tbody>
  </table></div>`;
}

function renderTeacher() {
  return isTeacherOnly() ? teacherScopedDashboard() : teacherAdminDashboard();
}

function renderParents() {
  return isParentOnly() ? parentScopedDashboard() : parentAdminDashboard();
}

function parentPeriodControl(label) {
  return `<button class="${state.parentPeriod === label ? "active" : ""}" type="button" data-parent-period="${escapeHtml(label)}">${escapeHtml(label)}</button>`;
}

function isParentRecord(user) {
  if (roleValues(user).length) return hasRole(user, "parent");
  return String(user.email || "").toLowerCase().includes("parent");
}

function parentAdminRows() {
  const parents = state.data.users.filter(isParentRecord);
  const students = studentUsers();
  return parents.map((user, index) => {
    const student = students[index % Math.max(students.length, 1)] || {};
    const school = user.school && user.school !== "N/A" ? user.school : student.school || "No School";
    const grade = user.grade && user.grade !== "N/A" ? user.grade : student.grade || "Unassigned";
    const reportViews = Number(user.reportViews ?? 0);
    return {
      id: user.id || `parent-${index}`,
      name: user.name || user.fullName || user.email || "Parent",
      email: user.email || "-",
      phone: user.phone || user.phoneNumber || "-",
      child: user.child || student.name || "No linked student",
      grade,
      school,
      county: user.county || countyForSchoolName(school) || "",
      lastActive: user.lastActive || "No activity",
      reportViews,
      phoneLockCount: Number(user.phoneLockCount ?? 0),
      status: normalizeUserStatus(user.status),
      risk: reportViews < 5 ? "unread" : "healthy"
    };
  });
}

function filteredParentAdminRows() {
  const term = state.search.trim().toLowerCase();
  return parentAdminRows()
    .filter(row => state.selectedSchool === "All Schools" || row.school === state.selectedSchool)
    .filter(row => state.selectedCounty === "All Counties" || row.county === state.selectedCounty)
    .filter(row => state.selectedGrade === "All Grades" || row.grade === state.selectedGrade)
    .filter(row => !term || `${row.name} ${row.child} ${row.school} ${row.county} ${row.email} ${row.phone}`.toLowerCase().includes(term));
}

function parentSchoolOptions() {
  const schools = Array.from(new Set(parentAdminRows().map(row => row.school).filter(Boolean))).sort();
  return ["All Schools", ...schools];
}

function parentCountyOptions() {
  const counties = Array.from(new Set([...parentAdminRows().map(row => row.county), ...countyOptions().filter(item => item !== "All Counties")].filter(Boolean))).sort();
  return ["All Counties", ...counties];
}

function parentGradeOptions() {
  const values = Array.from(new Set([...parentAdminRows().map(row => row.grade), ...grades].filter(Boolean))).sort();
  return ["All Grades", ...values];
}

function parentAdminDashboard() {
  const rows = filteredParentAdminRows();
  const highlights = parentAdminHighlights(rows);
  return `<div class="parent-portal-page admin">
    <header class="parent-portal-header">
      <div>
        <h1>Parents' Portal</h1>
        <p>Monitor parent engagement, child reports, communication and home learning support.</p>
      </div>
      <div class="parent-header-controls">
        <div class="parent-segmented">${["Today", "This Week", "This Term"].map(parentPeriodControl).join("")}</div>
        ${selectControl("selectedSchool", parentSchoolOptions(), state.selectedSchool)}
        ${selectControl("selectedCounty", parentCountyOptions(), state.selectedCounty)}
        ${selectControl("selectedGrade", parentGradeOptions(), state.selectedGrade)}
        <button class="parent-primary-button" type="button" data-message-parents>${miniIcon("chat")} Message Parents</button>
        <button class="parent-outline-button" type="button" data-download-parent-report>${miniIcon("download")} Export Reports</button>
      </div>
    </header>
    <section class="parent-metric-grid">
      ${teacherMetricCard("blue", "students", "Total Parents", highlights.total.toLocaleString("en-KE"), `Across ${highlights.schools} schools`)}
      ${teacherMetricCard("green", "star", "Most Engaged Parent", highlights.best?.name || "-", `${highlights.best?.reportViews || 0} report views`)}
      ${teacherMetricCard("red", "students", "Least Engaged Group", highlights.lowGroup, `${highlights.lowOpenRate}% opened reports`)}
      ${teacherMetricCard("orange", "bars", "Reports Viewed", highlights.reportViews.toLocaleString("en-KE"), state.parentPeriod)}
      ${teacherMetricCard("purple", "lock", "Phone Lock Usage", highlights.phoneLocks.toLocaleString("en-KE"), "Focus sessions")}
    </section>
    <section class="parent-admin-chart-grid">
      <article class="teacher-panel parent-wide-panel">
        <div class="teacher-panel-head"><h2>Parent Engagement Trend</h2><button type="button">More ${miniIcon("chevron")}</button></div>
        ${parentLineChart()}
      </article>
      <article class="teacher-panel">
        <div class="teacher-panel-head"><h2>Parent Activity by County</h2><button type="button">More ${miniIcon("chevron")}</button></div>
        ${parentCountyBarChart(rows)}
      </article>
    </section>
    <section class="teacher-panel parent-table-panel">
      <div class="teacher-panel-head"><h2>Parents Overview</h2></div>
      ${parentOverviewTable(rows)}
    </section>
    <section class="parent-admin-lower-grid">
      ${parentBroadcastPanel()}
      ${parentAdminAlerts(rows)}
      ${parentUnreadReports(rows)}
      ${parentPhoneAdoption(rows)}
    </section>
  </div>`;
}

function parentAdminHighlights(rows) {
  const source = rows.length ? rows : parentAdminRows();
  const sorted = [...source].sort((left, right) => right.reportViews - left.reportViews);
  const lowRows = source.filter(row => row.reportViews < 5);
  return {
    total: source.length,
    schools: new Set(source.map(row => row.school).filter(Boolean)).size,
    best: sorted[0] || null,
    lowGroup: lowRows.length ? `${lowRows[0].grade} Parents` : "Grade 8 Parents",
    lowOpenRate: lowRows.length ? 24 : 88,
    reportViews: source.reduce((sum, row) => sum + row.reportViews, 0),
    phoneLocks: source.reduce((sum, row) => sum + row.phoneLockCount, 0)
  };
}

function parentLineChart(values = null) {
  const labels = ["May 12-18", "May 19-25", "May 26-Jun 1", "Jun 2-8", "Jun 9-15", "Jun 16-22"];
  const series = values || [
    { label: "Report Views", color: "#106cff", values: [1180, 1460, 1710, 2190, 1900, 2360] },
    { label: "Messages Opened", color: "#12ad57", values: [860, 1070, 1260, 1590, 1370, 1790] },
    { label: "Phone Lock Sessions", color: "#8b5cf6", values: [240, 340, 470, 650, 540, 880] }
  ];
  const max = Math.max(...series.flatMap(row => row.values), 1) * 1.15;
  const x = index => 54 + index * 118;
  const y = value => 208 - (value / max) * 172;
  return `<svg class="parent-line-chart" viewBox="0 0 720 270" role="img" aria-label="Parent engagement trend">
    ${[0, 0.25, 0.5, 0.75, 1].map(step => `<line x1="48" y1="${208 - step * 172}" x2="688" y2="${208 - step * 172}"></line>`).join("")}
    ${labels.map((label, index) => `<text x="${x(index)}" y="240" text-anchor="middle">${escapeHtml(label)}</text>`).join("")}
    ${series.map(row => `<polyline points="${row.values.map((value, index) => `${x(index)},${y(value)}`).join(" ")}" style="stroke:${row.color}"></polyline>${row.values.map((value, index) => `<circle cx="${x(index)}" cy="${y(value)}" r="4" style="fill:${row.color}"></circle>`).join("")}`).join("")}
    ${series.map((row, index) => `<g transform="translate(${210 + index * 150} 26)"><circle cx="0" cy="0" r="5" style="fill:${row.color}"></circle><text x="16" y="4">${escapeHtml(row.label)}</text></g>`).join("")}
  </svg>`;
}

function parentCountyBarChart(rows) {
  const counties = ["Nairobi County", "Kiambu County", "Kisii County", "Mombasa County", "Nakuru County"];
  const counts = counties.map(county => ({
    county: county.replace(" County", ""),
    value: rows.filter(row => row.county === county).reduce((sum, row) => sum + Math.max(row.reportViews * 100, 120), 0) || [1820, 1410, 1020, 860, 610][counties.indexOf(county)]
  }));
  const max = Math.max(...counts.map(row => row.value), 1);
  return `<svg class="parent-bar-chart" viewBox="0 0 560 250" role="img" aria-label="Parent activity by county">
    ${[0, 0.25, 0.5, 0.75, 1].map(step => `<line x1="42" y1="${196 - step * 160}" x2="540" y2="${196 - step * 160}"></line>`).join("")}
    ${counts.map((row, index) => {
      const height = Math.max(12, (row.value / max) * 150);
      const x = 76 + index * 98;
      return `<text x="${x + 20}" y="${188 - height}" text-anchor="middle" class="parent-bar-value">${row.value.toLocaleString("en-KE")}</text><rect x="${x}" y="${196 - height}" width="40" height="${height}" rx="7"></rect><text x="${x + 20}" y="224" text-anchor="middle">${escapeHtml(row.county)}</text>`;
    }).join("")}
  </svg>`;
}

function parentOverviewTable(rows) {
  const tableRows = (rows.length ? rows : parentAdminRows()).slice(0, 7);
  return `<div class="teacher-table-wrap parent-table-wrap"><table class="teacher-table parent-table">
    <thead><tr><th>Parent</th><th>Child</th><th>School</th><th>County</th><th>Last Active</th><th>Report Views</th><th>Phone Lock</th><th>Action</th></tr></thead>
    <tbody>${tableRows.map(row => `<tr>
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.child)} ${escapeHtml(row.grade)}</td>
      <td>${escapeHtml(row.school)}</td>
      <td>${escapeHtml(row.county)}</td>
      <td>${escapeHtml(row.lastActive)}</td>
      <td>${row.reportViews}</td>
      <td><span class="${row.phoneLockCount ? "parent-ok" : "parent-risk"}">${row.phoneLockCount ? `Used ${row.phoneLockCount}x` : "Not used"}</span></td>
      <td><button class="teacher-message-button" type="button" data-message-parent="${escapeHtml(row.id)}">${miniIcon("chat")} Message</button></td>
    </tr>`).join("")}</tbody>
  </table></div>`;
}

function parentBroadcastPanel() {
  const scopes = [["One School", "school"], ["Selected County", "globe"], ["All Parents", "students"], ["Parents of At-Risk Students", "shield-star"]];
  return `<article class="teacher-panel parent-broadcast">
    <div class="teacher-panel-head compact"><h2>${miniIcon("chat")} Message Broadcast</h2></div>
    <p>Select Scope</p>
    <div class="parent-broadcast-options">${scopes.map((scope, index) => `<button class="${index === 0 ? "active" : ""}" type="button" data-parent-broadcast-scope="${escapeHtml(scope[0])}">${miniIcon(scope[1])}<span>${escapeHtml(scope[0])}</span></button>`).join("")}</div>
    <textarea id="parentBroadcastText" placeholder="Write your message..."></textarea>
    <button class="parent-primary-button" type="button" data-message-parents>${miniIcon("chat")} Send Message</button>
  </article>`;
}

function parentAdminAlerts(rows) {
  const low = rows.filter(row => row.reportViews < 5).slice(0, 3);
  const alerts = low.map(row => ["orange", `${row.name} inactive`, "No recent report activity."]);
  return `<article class="teacher-panel"><div class="teacher-panel-head compact"><h2>${miniIcon("bell")} Admin Alerts</h2></div>
    <div class="teacher-alert-list">${alerts.length ? alerts.map(row => `<button class="teacher-alert-row ${row[0]}" type="button"><span>${miniIcon("profile")}</span><strong>${escapeHtml(row[1])}<small>${escapeHtml(row[2])}</small></strong>${miniIcon("chevron")}</button>`).join("") : `<div class="empty-state">No parent alerts.</div>`}</div>
  </article>`;
}

function parentUnreadReports(rows) {
  const unread = rows.filter(row => row.reportViews < 8).slice(0, 3);
  return `<article class="teacher-panel"><div class="teacher-panel-head compact"><h2>${miniIcon("document")} Unread Risk Reports</h2></div>
    <div class="parent-risk-list">${unread.map(row => `<button type="button" data-message-parent="${escapeHtml(row.id)}"><strong>${escapeHtml(row.child)}</strong><small>${escapeHtml(row.school)} - ${escapeHtml(row.grade)}</small><span>Report Unread</span></button>`).join("") || `<p class="visually-muted">No unread risk reports in this filter.</p>`}</div>
    <button class="parent-link-row" type="button">View all unread reports ${miniIcon("chevron")}</button>
  </article>`;
}

function parentPhoneAdoption(rows) {
  const schools = Object.entries((rows.length ? rows : parentAdminRows()).reduce((acc, row) => {
    acc[row.school] = acc[row.school] || { total: 0, locks: 0 };
    acc[row.school].total += 1;
    if (row.phoneLockCount > 0) acc[row.school].locks += 1;
    return acc;
  }, {})).slice(0, 4);
  const rowsToRender = schools.map(([school, value]) => [school, Math.round((value.locks / value.total) * 100)]);
  return `<article class="teacher-panel"><div class="teacher-panel-head compact"><h2>${miniIcon("lock")} Phone Lock Adoption</h2></div>
    <p>Adoption by School</p>
    <div class="parent-adoption-list">${rowsToRender.length ? rowsToRender.map(row => `<div><span>${escapeHtml(row[0])}<b>${row[1]}%</b></span><i><em style="width:${row[1]}%"></em></i></div>`).join("") : `<div class="empty-state">No phone-lock activity has been recorded.</div>`}</div>
    <button class="parent-link-row" type="button">View full adoption report ${miniIcon("chevron")}</button>
  </article>`;
}

function parentChildRows() {
  return state.data.parentChildren.map((child, index) => ({
    id: child.id || `child-${index}`,
    name: child.name || "Learner",
    grade: child.grade || "Unassigned",
    school: child.school || "School",
    score: Number(child.assessment_average || child.weekly_report?.assessmentAverage || child.diagnostic?.percentage || 0),
    completion: Number(child.homework_completion || 0),
    mastery: Number(child.mastery_average || child.weekly_report?.assessmentAverage || 0),
    dueReviews: Number(child.due_reviews || child.weekly_report?.focusAreas?.length || 0),
    assignmentsDue: (child.recent_assignments || []).filter(item => item.status !== "completed").length,
    recentAssignments: child.recent_assignments || [],
    weeklyTrends: Array.isArray(child.weekly_trends) ? child.weekly_trends : [],
    weeklyReport: child.weekly_report || {},
    subjects: parentSubjectRows(child),
    tone: ["blue", "green", "red", "orange"][index % 4]
  }));
}

function selectedParentChild() {
  return parentChildRows().find(row => state.selectedGrade === "All Grades" || row.grade === state.selectedGrade) || parentChildRows()[0] || null;
}

function parentSubjectRows(child) {
  const base = Number(child.assessment_average || child.weekly_report?.assessmentAverage || 0);
  return [
    ["Mathematics", Math.max(35, Math.min(98, base - 6)), "#2d7ff9"],
    ["Science", Math.max(35, Math.min(98, base)), "#40a85b"],
    ["English", Math.max(35, Math.min(98, base + 8)), "#7d5ce8"],
    ["Kiswahili", Math.max(35, Math.min(98, base + 3)), "#ff8a1a"],
    ["Social Studies", Math.max(35, Math.min(98, base - 11)), "#12a6b8"]
  ].map(([subject, value, color]) => ({ label: subject, value, color }));
}

function parentScopedDashboard() {
  const child = selectedParentChild();
  if (!child) return `<div class="parent-scoped-page"><main class="parent-scoped-content"><div class="empty-state">No student is linked to this parent account.</div></main></div>`;
  const parentName = state.user?.fullName || state.user?.name || "Jane";
  const firstName = firstNameOf({ name: child.name });
  return `<div class="parent-scoped-page">
    <header class="parent-scoped-topbar">
      <div class="parent-brand"><span>K</span><strong>Kitabu AI</strong></div>
      <h1>Parent Portal</h1>
      <div class="parent-child-select"><span class="teacher-avatar ${child.tone}">${initialsFor(child.name)}</span><strong>${escapeHtml(child.name)}</strong><b>${escapeHtml(child.grade)}</b>${miniIcon("chevron")}</div>
      <div class="parent-segmented">${["This Week", "This Month", "This Term"].map(parentPeriodControl).join("")}</div>
      <button class="parent-outline-button" type="button" data-download-parent-report>${miniIcon("download")} Download Report</button>
      <button class="parent-lock-button" type="button" data-phone-lock>${miniIcon("lock")} Lock Phone</button>
    </header>
    <main class="parent-scoped-content">
      <section class="parent-greeting"><h2>Good afternoon, ${escapeHtml(firstNameOf({ name: parentName }))}</h2><p>Track ${escapeHtml(firstName)}'s learning, progress and phone focus from one place.</p></section>
      <section class="parent-metric-grid scoped">
        ${teacherMetricCard("blue", "trend", "Overall Score", percent(child.score || child.mastery), "Current recorded performance")}
        ${teacherMetricCard("green", "clock", "Active Learning Time", `${Number(child.weeklyReport.activeDays || 0)} active days`, state.parentPeriod)}
        ${teacherMetricCard("red", "target", "Remedial Gaps", String(child.dueReviews), "Needs focus")}
        ${teacherMetricCard("orange", "calendar", "Assignments Due", String(child.assignmentsDue), "Current workload")}
      </section>
      <section class="parent-scoped-grid">
        <article class="teacher-panel"><div class="teacher-panel-head"><h2>Child Performance Trend</h2><button type="button">${escapeHtml(state.parentPeriod)} ${miniIcon("chevron")}</button></div>${parentChildPerformanceChart(child)}</article>
        <article class="teacher-panel"><div class="teacher-panel-head compact"><h2>Subject Breakdown</h2></div>${teacherSubjectDonut(child.subjects)}</article>
        <article class="teacher-panel"><div class="teacher-panel-head compact"><h2>Remedial Report</h2></div>${parentRemedialReport(child)}</article>
        <article class="teacher-panel"><div class="teacher-panel-head compact"><h2>${miniIcon("document")} Recent Activity</h2></div>${parentRecentActivity(child)}</article>
        <article class="teacher-panel"><div class="teacher-panel-head compact"><h2>${miniIcon("lock")} Phone Focus Control <span class="parent-status-pill">Unlocked</span></h2></div>${parentPhoneControl()}</article>
        <article class="teacher-panel"><div class="teacher-panel-head compact"><h2>${miniIcon("chat")} Teacher Notes</h2></div>${parentTeacherNotes(child)}</article>
      </section>
      <section class="parent-encourage-banner">
        <div><span>${miniIcon("heart")}</span></div>
        <article><h2>Encourage ${escapeHtml(firstName)}</h2><p>Small steps today, big achievements tomorrow. We're proud of you, ${escapeHtml(firstName)}.</p></article>
      </section>
    </main>
  </div>`;
}

function parentChildPerformanceChart(child) {
  const raw = child.weeklyTrends;
  if (!raw.length) return `<div class="empty-state">No performance trend has been recorded yet.</div>`;
  const values = raw.map(item => Number(item.assessmentAverage ?? item.weeklyExamScore ?? item)).slice(-7);
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const x = index => 56 + index * 73;
  const y = value => 188 - (value / 100) * 142;
  return `<svg class="parent-child-chart" viewBox="0 0 560 230" role="img" aria-label="Child performance trend">
    ${[0, 25, 50, 75, 100].map(value => `<line x1="45" y1="${188 - (value / 100) * 142}" x2="530" y2="${188 - (value / 100) * 142}"></line><text x="16" y="${193 - (value / 100) * 142}">${value}%</text>`).join("")}
    <path d="M${values.map((value, index) => `${x(index)} ${y(value)}`).join(" L")}" fill="none" stroke="#106cff" stroke-width="3"></path>
    ${values.map((value, index) => `<circle cx="${x(index)}" cy="${y(value)}" r="4" fill="#106cff"></circle>`).join("")}
    ${labels.map((label, index) => `<text x="${x(index)}" y="216" text-anchor="middle">${label}</text>`).join("")}
    <g transform="translate(492 ${y(values.at(-1) || 0) - 24})"><rect width="46" height="24" rx="8"></rect><text x="23" y="16" text-anchor="middle">${Math.round(values.at(-1) || 0)}%</text></g>
  </svg>`;
}

function parentRemedialReport(child) {
  const focus = child.weeklyReport.focusAreas || [];
  return `<div class="parent-remedial-list">${focus.length ? focus.slice(0, 3).map((topic, index) => `<div><strong>${escapeHtml(topic)}</strong><span>${escapeHtml(subjects[index % subjects.length])}</span><b class="${index === 0 ? "high" : ""}">${index === 0 ? "High Priority" : "Medium"}</b></div>`).join("") : `<div class="empty-state">No remedial gaps have been recorded.</div>`}</div>
    <button class="parent-outline-orange" type="button" data-parent-remedial>${miniIcon("target")} View Remedial Plan</button>`;
}

function parentRecentActivity(child) {
  const rows = child.recentAssignments.slice(0, 3);
  return `<div class="parent-activity-list">${rows.length ? rows.map((row, index) => `<div><span class="parent-activity-icon tone-${index}">${miniIcon(index === 0 ? "calculator" : index === 1 ? "flask" : "globe")}</span><strong>${escapeHtml(row.title)}</strong><small>${escapeHtml(row.subject)}</small><b class="${Number(row.score || 0) < 60 ? "low" : ""}">${row.score ? percent(row.score) : "Due"}</b><em>${escapeHtml(row.updatedAt || row.submittedAt || "")}</em></div>`).join("") : `<div class="empty-state">No recent assignment activity.</div>`}</div>
    <button class="parent-link-row orange" type="button">View all activity ${miniIcon("chevron")}</button>`;
}

function parentPhoneControl() {
  const controls = [
    ["Lock for 1 hour", "Pause distractions", "lock"],
    ["Lock until homework complete", "Stay focused", "grade"],
    ["Schedule study lock", "Set a study time", "calendar"]
  ];
  return `<div class="parent-control-list">${controls.map(row => `<button type="button" data-phone-lock>${miniIcon(row[2])}<strong>${escapeHtml(row[0])}<small>${escapeHtml(row[1])}</small></strong>${miniIcon("chevron")}</button>`).join("")}</div>
    <p class="parent-control-note">${miniIcon("shield-star")} Uses device screen lock to keep study focused.</p>`;
}

function parentTeacherNotes(child) {
  const note = child.weeklyReport.teacherNote;
  if (!note) return `<div class="empty-state">No teacher notes have been shared.</div>`;
  const teacherName = child.weeklyReport.teacherName || "Teacher";
  return `<div class="parent-teacher-note">
    <div class="parent-teacher-avatar">${initialsFor(teacherName)}</div>
    <article><strong>From ${escapeHtml(teacherName)}</strong><p>${escapeHtml(note)}</p><button class="parent-outline-orange" type="button" data-message-parent-teacher>${miniIcon("chat")} Reply to Teacher</button></article>
  </div>`;
}

function usagePeriodControl(label) {
  return `<button class="${state.usagePeriod === label ? "active" : ""}" type="button" data-usage-period="${escapeHtml(label)}">${escapeHtml(label)}</button>`;
}

function usageFeatureControl(label) {
  return `<button class="${state.selectedUsageFeature === label ? "active" : ""}" type="button" data-usage-feature="${escapeHtml(label)}">${escapeHtml(label)}</button>`;
}

function renderUsage() {
  const highlights = usageHighlights();
  const featureRows = usageFeatureRows();
  const allFeatures = usageAllFeatureRows();
  const trackedUsers = Number(state.data.ai?.trackedUsers || 0);
  const blockedRows = usageBlockedRows();
  const schoolRows = usageSchoolRows();
  return `<div class="usage-page">
    <header class="usage-header">
      <div>
        <h1>Usage</h1>
        <p>Track token spend, model usage and feature costs across Kitabu AI.</p>
      </div>
      <div class="usage-controls">
        <div class="usage-segmented" aria-label="Usage period">
          ${["Today", "This Week", "This Month"].map(usagePeriodControl).join("")}
        </div>
      </div>
    </header>

    <nav class="usage-agent-tabs" aria-label="AI feature filter">
      ${usageFeatureOptions().map(usageFeatureControl).join("")}
    </nav>

    <section class="usage-metric-grid" aria-label="Usage summary">
      ${usageMetricCard("blue", "Total AI Spend", usageMoney(highlights.totalCost), "Recorded telemetry", "tag")}
      ${usageMetricCard("green", "Tracked Features", allFeatures.length.toLocaleString("en-KE"), "AI capabilities", "bars")}
      ${usageMetricCard("amber", "Tracked Users", trackedUsers.toLocaleString("en-KE"), "Users with AI activity", "profile")}
      ${usageMetricCard("red", "Blocked Events", Number(state.data.ai?.blockedEvents || 0).toLocaleString("en-KE"), "Safety controls", "alert")}
      ${usageMetricCard("purple", "Tokens Used", compactNumber(highlights.totalTokens), "Input + output", "database")}
    </section>

    <section class="usage-top-grid">
      <article class="usage-panel usage-trend-panel">
        <div class="usage-panel-head">
          <div>
            <h2>Cost Trend</h2>
            <p>Actual daily spend (KSh)</p>
          </div>
          <div class="usage-mini-tabs">
            ${["Day", "Week", "Month"].map(label => `<span class="${state.usagePeriod.endsWith(label) || (state.usagePeriod === "Today" && label === "Day") ? "active" : ""}">${escapeHtml(label)}</span>`).join("")}
          </div>
        </div>
        ${usageCostTrendChart()}
      </article>
      <article class="usage-panel usage-model-panel">
        <div class="usage-panel-head">
            <h2>Real Token Usage by Model</h2>
        </div>
        ${usageModelDonut()}
      </article>
    </section>

    <section class="usage-bottom-grid">
      <article class="usage-panel usage-feature-panel">
        <div class="usage-panel-head">
          <h2>Feature Cost Breakdown</h2>
        </div>
        <div class="usage-table-wrap">
          <table class="usage-table">
            <thead>
              <tr><th>Feature</th><th>Tokens</th><th>Cost</th><th>Students</th><th>Cost / Student</th><th>Trend</th></tr>
            </thead>
            <tbody>${featureRows.map(usageFeatureTableRow).join("")}</tbody>
          </table>
        </div>
      </article>
      <article class="usage-panel usage-efficiency-panel">
        <div class="usage-panel-head compact">
          <div>
            <h2>Spend by School</h2>
            <p>Recorded AI telemetry</p>
          </div>
        </div>
        <div class="usage-school-list">${schoolRows.length ? schoolRows.map(row => `<div class="usage-school-row"><span><strong>${escapeHtml(row.name)}</strong><small>${row.users.toLocaleString("en-KE")} users · ${compactNumber(row.tokens)} tokens</small></span><b>${usageMoney(row.spend)}</b></div>`).join("") : `<div class="empty-state">No school AI spend has been recorded yet.</div>`}</div>
      </article>
      <article class="usage-panel usage-alert-panel">
        <div class="usage-panel-head compact">
          <h2>Blocked AI Events</h2>
          ${miniIcon("alert")}
        </div>
        <div class="usage-blocked-list">${blockedRows.length ? blockedRows.map(row => `<div class="usage-blocked-row"><span><strong>${escapeHtml(String(row.feature || "Unknown").replaceAll("_", " "))}</strong><small>${escapeHtml(row.user_name || row.user_email || "Unknown user")} · ${escapeHtml(row.school_name || "No school")}</small></span><time>${escapeHtml(new Date(row.created_at).toLocaleDateString("en-KE"))}</time></div>`).join("") : `<div class="empty-state">No blocked AI events for this selection.</div>`}</div>
      </article>
    </section>
  </div>`;
}

function renderSettings() {
  return `
    <section class="panel">
      <div class="panel-header"><div><h2>System Status</h2><p>Current live API and session state.</p></div></div>
      <div class="kpi-stack">
        ${[
          ["API Base", API_BASE],
          ["Session", state.accessToken ? "Signed in" : "Signed out"],
          ["Last Sync", state.lastSync ? state.lastSync.toLocaleString() : "Not synced"],
          ["Users", `${state.data.users.length} records loaded`],
          ["Curriculum", state.data.curriculum ? `${state.data.curriculum.subjects?.length || 0} subjects loaded for ${state.data.curriculum.grade}` : "Load Curriculum page to hydrate"],
          ["Teacher Data", `${state.data.teacherStudents.length} students, ${state.data.teacherAssignments.length} assignments`]
        ].map(([label, value]) => `<div class="kpi-row"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`).join("")}
      </div>
    </section>`;
}

function bindRouteEvents() {
  document.querySelectorAll("[data-route-control]").forEach(el => {
    el.addEventListener("change", async event => {
      state[event.target.dataset.routeControl] = event.target.value;
      const validSchools = state.route === "teacher" ? teacherSchoolOptions() : schoolOptions();
      if (event.target.dataset.routeControl === "selectedCounty" && !validSchools.includes(state.selectedSchool)) {
        state.selectedSchool = "All Schools";
      }
      if (state.route === "subjects" && event.target.dataset.routeControl === "selectedGrade") {
        renderRoute();
        loadCurriculumGrade(event.target.value, { renderWhenDone: true });
        return;
      }
      renderRoute();
    });
  });
  const search = document.getElementById("searchInput");
  if (search) search.addEventListener("input", event => { state.search = event.target.value; renderRoute(); });
  document.querySelectorAll("[data-user]").forEach(button => button.addEventListener("click", () => showUser(button.dataset.user)));
  document.querySelectorAll("[data-school]").forEach(button => button.addEventListener("click", () => showSchool(button.dataset.school)));
  document.querySelectorAll("[data-add-school]").forEach(button => button.addEventListener("click", showAddSchool));
  document.querySelectorAll("[data-add-sales-agent]").forEach(button => button.addEventListener("click", showAddSalesAgent));
  document.querySelectorAll("[data-sales-agent]").forEach(button => button.addEventListener("click", () => showSalesAgent(button.dataset.salesAgent)));
  document.querySelectorAll("[data-usage-period]").forEach(button => button.addEventListener("click", () => {
    state.usagePeriod = button.dataset.usagePeriod;
    renderRoute();
  }));
  document.querySelectorAll("[data-usage-feature]").forEach(button => button.addEventListener("click", () => {
    state.selectedUsageFeature = button.dataset.usageFeature;
    renderRoute();
  }));
  document.querySelectorAll("[data-teacher-period]").forEach(button => button.addEventListener("click", () => {
    state.teacherPeriod = button.dataset.teacherPeriod;
    renderRoute();
  }));
  document.querySelectorAll("[data-parent-period]").forEach(button => button.addEventListener("click", () => {
    state.parentPeriod = button.dataset.parentPeriod;
    renderRoute();
  }));
  document.querySelectorAll("[data-broadcast-scope]").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll("[data-broadcast-scope]").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
  }));
  document.querySelectorAll("[data-parent-broadcast-scope]").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll("[data-parent-broadcast-scope]").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
  }));
  document.querySelectorAll("[data-message-all-teachers]").forEach(button => button.addEventListener("click", openTeacherMessageModal));
  document.querySelectorAll("[data-message-teacher]").forEach(button => button.addEventListener("click", () => openTeacherMessageModal(button.dataset.messageTeacher)));
  document.querySelectorAll("[data-teacher-student]").forEach(button => button.addEventListener("click", () => showTeacherStudent(button.dataset.teacherStudent)));
  document.querySelectorAll("[data-message-parents]").forEach(button => button.addEventListener("click", () => openParentMessageModal()));
  document.querySelectorAll("[data-message-parent]").forEach(button => button.addEventListener("click", () => openParentMessageModal(button.dataset.messageParent)));
  document.querySelectorAll("[data-download-parent-report]").forEach(button => button.addEventListener("click", () => window.print()));
  document.querySelectorAll("[data-phone-lock]").forEach(button => button.addEventListener("click", openPhoneLockModal));
  document.querySelectorAll("[data-parent-remedial]").forEach(button => button.addEventListener("click", () => openModal("Remedial Plan", "<p class='visually-muted'>Remedial focus is generated from the linked child dashboard, due reviews, assignments, and diagnostic scores.</p>", "small")));
  document.querySelectorAll("[data-message-parent-teacher]").forEach(button => button.addEventListener("click", () => openModal("Reply to Teacher", "<p class='visually-muted'>Teacher replies are routed through the live notification workflow when school messaging is enabled.</p>", "small")));
  document.querySelectorAll("[data-curriculum-subject]").forEach(button => button.addEventListener("click", () => openCurriculumEditor(button.dataset.curriculumSubject)));
  document.querySelectorAll("[data-curriculum-upload]").forEach(button => button.addEventListener("click", () => pickAndImportCurriculum(button.dataset.curriculumUpload)));
  document.querySelectorAll("[data-curriculum-delete]").forEach(button => button.addEventListener("click", () => openModal("Delete Curriculum", `<p class="visually-muted">Curriculum deletion is not enabled from this dashboard yet. Use the editor to replace or update ${escapeHtml(button.dataset.curriculumDelete)} content.</p>`)));
  document.querySelectorAll("[data-add-subject]").forEach(button => button.addEventListener("click", openAddSubjectModal));
  document.querySelectorAll("[data-curriculum-grade]").forEach(button => button.addEventListener("click", () => {
    state.selectedGrade = button.dataset.curriculumGrade;
    renderRoute();
    loadCurriculumGrade(state.selectedGrade, { renderWhenDone: true });
  }));
  document.querySelectorAll("[data-modal]").forEach(button => button.addEventListener("click", () => showNamedModal(button.dataset.modal)));
}

function miniIcon(name) {
  const paths = {
    grade: '<path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M7 11.5v4c3 2 7 2 10 0v-4"/>',
    calendar: '<path d="M7 3v4"/><path d="M17 3v4"/><path d="M4 8h16"/><rect x="4" y="5" width="16" height="16" rx="2"/>',
    students: '<path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19"/><circle cx="10" cy="8" r="3"/><path d="M20 19v-1.3a3.2 3.2 0 0 0-2.4-3.1"/><path d="M16 5.2a3 3 0 0 1 0 5.6"/>',
    active: '<path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19"/><circle cx="10" cy="8" r="3"/><path d="m15 14 2 2 4-5"/>',
    "add-user": '<path d="M15 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-4A3.5 3.5 0 0 0 4 17.5V19"/><circle cx="9.5" cy="8" r="3"/><path d="M18 8v6"/><path d="M15 11h6"/>',
    wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H6.5A2.5 2.5 0 0 1 4 16.5v-9Z"/><path d="M4 8h15a2 2 0 0 1 2 2v7"/><path d="M16 13h.01"/>',
    tag: '<path d="M20.6 13.4 13.5 20.5a2.1 2.1 0 0 1-3 0L3 13V3h10l7.6 7.4a2.1 2.1 0 0 1 0 3Z"/><path d="M7.5 7.5h.01"/>',
    database: '<ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5"/><path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
    brain: '<path d="M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-2 2.8A3.2 3.2 0 0 0 6 14v1a4 4 0 0 0 4 4h1V4H9Z"/><path d="M15 4a3 3 0 0 1 3 3v1a3 3 0 0 1 2 2.8A3.2 3.2 0 0 1 18 14v1a4 4 0 0 1-4 4h-1V4h2Z"/><path d="M8 9h3"/><path d="M13 9h3"/><path d="M8 14h3"/><path d="M13 14h3"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/><path d="M8 21h8"/>',
    question: '<path d="M9.2 9a3 3 0 1 1 5.3 2c-.9.8-1.5 1.2-1.5 2.5"/><path d="M12 17h.01"/><rect x="4" y="3" width="16" height="18" rx="3"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6.4 6.4l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z"/>',
    activity: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
    trend: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 4-4 3 3 5-7"/><path d="M15 7h4v4"/>',
    bars: '<path d="M6 19V11"/><path d="M12 19V5"/><path d="M18 19v-8"/>',
    calculator: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8"/><path d="M8 11h.01"/><path d="M12 11h.01"/><path d="M16 11h.01"/><path d="M8 15h.01"/><path d="M12 15h.01"/><path d="M16 15h.01"/>',
    abc: '<path d="M4 17 8 7l4 10"/><path d="M5.5 13h5"/><path d="M14 10h3.5a2.5 2.5 0 0 1 0 5H14V8h3a2 2 0 0 1 0 4h-3"/>',
    chat: '<path d="M5 5h14v10H8l-3 3V5Z"/>',
    flask: '<path d="M9 3h6"/><path d="M10 3v6l-4 8a3 3 0 0 0 2.7 4h6.6A3 3 0 0 0 18 17l-4-8V3"/><path d="M8 15h8"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/>',
    code: '<path d="m8 9-4 3 4 3"/><path d="m16 9 4 3-4 3"/><path d="m14 5-4 14"/>',
    pencil: '<path d="M12 20h9"/><path d="m16.5 3.5 4 4L8 20l-5 1 1-5 12.5-12.5Z"/>',
    upload: '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 16.9 6.6 19.8l1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6"/><path d="M12 17h.01"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/>',
    profile: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="8" r="4"/>',
    trophy: '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M5 5H3v3a3 3 0 0 0 4 2.8"/><path d="M19 5h2v3a3 3 0 0 1-4 2.8"/>',
    document: '<path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z"/><path d="M14 2v5h5"/><path d="M9 13h6"/><path d="M9 17h4"/>',
    briefcase: '<path d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1"/><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 12h18"/>',
    globe2: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a13 13 0 0 1 0 18"/><path d="M12 3a13 13 0 0 0 0 18"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z"/>',
    school: '<path d="M3 21h18"/><path d="M5 21V9l7-4 7 4v12"/><path d="M9 21v-6h6v6"/><path d="M9 11h.01"/><path d="M15 11h.01"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    bed: '<path d="M3 21V9"/><path d="M21 21v-8a2 2 0 0 0-2-2H9v10"/><path d="M3 13h18"/><path d="M7 11h2a2 2 0 0 0 0-4H7v4Z"/>',
    "shield-star": '<path d="M12 3 20 6v6c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3Z"/><path d="m12 8 1.2 2.4 2.6.4-1.9 1.9.5 2.6-2.4-1.2-2.4 1.2.5-2.6-1.9-1.9 2.6-.4L12 8Z"/>',
    exit: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4.5-4.5"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="m15.5 8.5 2-2"/><path d="M15.5 6.5h2v2"/><path d="M12 12l3.5-3.5"/>',
    "arrow-right": '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.grade}</svg>`;
}

function selectControl(key, options, value) {
  const controlIcon = key === "timeRange" ? "calendar" : key === "selectedSchool" ? "school" : key === "selectedCounty" ? "globe" : key === "selectedAgentStatus" ? "students" : key === "selectedUsageFeature" ? "bars" : "grade";
  return `<span class="filter-control">${miniIcon(controlIcon)}<select data-route-control="${key}">${options.map(option => `<option value="${escapeHtml(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select></span>`;
}

function metric(label, value, helper, color, iconName) {
  return `<div class="metric-card ${color}">
    <div class="metric-icon">${miniIcon(iconName)}</div>
    <div class="metric-copy"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(helper)}</small></div>
  </div>`;
}

function table(headers, rows) {
  if (!rows.length) return `<div class="empty-state">No records available.</div>`;
  return `<div class="table-wrap"><table>
    <thead><tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
  </table></div>`;
}

function barChart(labels, values, color) {
  const max = Math.max(...values, 1);
  const gradientId = `bar-${String(color).replace(/[^a-z0-9]/gi, "")}`;
  const yTicks = [1, 0.75, 0.5, 0.25, 0];
  const tickLabels = yTicks.map(tick => Math.round(max * tick));
  const bars = values.map((value, index) => {
    const height = Math.max(8, (Number(value || 0) / max) * 170);
    const x = 58 + index * (260 / Math.max(1, values.length));
    const y = 210 - height;
    const width = Math.min(34, 210 / Math.max(1, values.length));
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="5" fill="url(#${gradientId})"/><text x="${x + width / 2}" y="236" text-anchor="middle">${escapeHtml((labels[index] || "").slice(0, 12))}</text>`;
  }).join("");
  return `<svg class="chart" viewBox="0 0 360 260" role="img">
    <defs><linearGradient id="${gradientId}" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="${color}"/><stop offset="100%" stop-color="#9ec5ff"/></linearGradient></defs>
    <path class="grid-line" d="M35 45H335M35 86H335M35 127H335M35 168H335M35 209H335"/>
    ${tickLabels.map((label, index) => `<text x="28" y="${49 + index * 41}" text-anchor="end">${escapeHtml(label)}</text>`).join("")}
    ${bars}<path class="axis" d="M35 215H335"/></svg>`;
}

function lineChart(labels, values, color) {
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = 45 + index * (280 / Math.max(1, values.length - 1));
    const y = 210 - (Number(value || 0) / max) * 160;
    return { x, y, label: labels[index] || "" };
  });
  const path = points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
  return `<svg class="chart" viewBox="0 0 360 260" role="img">
    <path class="grid-line" d="M35 50H335M35 130H335M35 210H335"/>
    <text x="28" y="54" text-anchor="end">${max}</text><text x="28" y="134" text-anchor="end">${Math.round(max / 2)}</text><text x="28" y="214" text-anchor="end">0</text>
    <path d="${path}" fill="none" stroke="${color}" stroke-width="4"/>
    ${points.map(point => `<circle cx="${point.x}" cy="${point.y}" r="5" fill="${color}"/><text x="${point.x}" y="235" text-anchor="middle">${escapeHtml(point.label.slice(0, 8))}</text>`).join("")}
  </svg>`;
}

function donutChart(rows) {
  const palette = ["#2f80ed", "#06c167", "#f6bb2f", "#ff414d", "#8179d6", "#10bfa4"];
  const total = rows.reduce((sum, row) => sum + row.value, 0) || 1;
  let offset = 25;
  const rings = rows.map((row, index) => {
    const length = (row.value / total) * 100;
    const path = `<circle cx="120" cy="120" r="82" fill="none" stroke="${palette[index % palette.length]}" stroke-width="28" pathLength="100" stroke-dasharray="${length} ${100 - length}" stroke-dashoffset="${-offset}"/>`;
    offset += length;
    return path;
  }).join("");
  return `<div class="donut-layout">
    <svg class="chart donut-chart" viewBox="0 0 240 240">${rings}<circle cx="120" cy="120" r="50" fill="#fff"/><text x="120" y="112" text-anchor="middle" class="donut-label">Total</text><text x="120" y="136" text-anchor="middle" class="donut-total">100%</text></svg>
    <div class="legend-stack">${rows.map((row, index) => `<div class="legend-row"><span class="legend-name"><i style="background:${palette[index % palette.length]}"></i>${escapeHtml(row.label)}</span><strong>${row.value}%</strong></div>`).join("") || "<p class='visually-muted'>No subject data yet.</p>"}</div>
  </div>`;
}

function gauge(score) {
  return `<svg class="gauge" viewBox="0 0 260 150">
    <path d="M35 120 A95 95 0 0 1 225 120" fill="none" stroke="#e5e7eb" stroke-width="24"/>
    <path d="M35 120 A95 95 0 0 1 225 120" fill="none" stroke="#ff414d" stroke-width="24" pathLength="100" stroke-dasharray="30 70"/>
    <path d="M35 120 A95 95 0 0 1 225 120" fill="none" stroke="#ffb84d" stroke-width="24" pathLength="100" stroke-dasharray="34 66" stroke-dashoffset="-30"/>
    <path d="M35 120 A95 95 0 0 1 225 120" fill="none" stroke="#10bfa4" stroke-width="24" pathLength="100" stroke-dasharray="36 64" stroke-dashoffset="-64"/>
    <text x="130" y="115" text-anchor="middle">${score}%</text>
  </svg>`;
}

function showUser(id) {
  const index = state.data.users.findIndex(item => item.id === id);
  const user = state.data.users[index];
  if (!user) return;
  showStudentModal(normalizeUserRow(user, Math.max(0, index)), "dashboard");
}

function studentPerformanceScore(user) {
  const key = String(user.name || "").toLowerCase();
  if (key.includes("kevin")) return 42;
  if (key.includes("stacy")) return 84;
  if (key.includes("brian")) return 58;
  if (key.includes("david")) return 71;
  return 74;
}

function studentAssignmentCount(user) {
  const matched = state.data.teacherAssignments.filter(item => !user.grade || item.gradeLevel === user.grade);
  return matched.length ? matched.length : 25;
}

function studentModalTitle(tab) {
  if (tab === "profile") return ["Student Profile", "Personal Details"];
  if (tab === "remedial") return ["Remedial Report", "Learning Support"];
  return ["Performance", "Academic Analysis"];
}

function showStudentModal(user, tab = "dashboard") {
  const activeTab = ["dashboard", "remedial", "profile"].includes(tab) ? tab : "dashboard";
  const [title, defaultSubtitle] = studentModalTitle(activeTab);
  const report = activeTab === "remedial" ? currentRemedialReport(user) : null;
  const showRemedialRisk = report && state.remedialAnalysis[user.id] === "complete";
  const subtitle = report ? `${user.name} - ${user.grade || "Student"} - ${report.periodLabel}` : defaultSubtitle;
  modalRoot.classList.add("student-modal-root");
  modalRoot.hidden = false;
  modalRoot.innerHTML = `<section class="student-modal ${activeTab}-view" role="dialog" aria-modal="true" aria-labelledby="studentModalTitle">
    <header class="student-modal-head">
      ${report ? `<span class="remedial-head-avatar" aria-hidden="true">${studentAvatar(user.avatar)}</span>` : ""}
      <div>
        <h2 id="studentModalTitle">${escapeHtml(title)}</h2>
        <p class="${report ? "remedial-title-meta" : ""}">${escapeHtml(subtitle)}${showRemedialRisk ? `<span class="remedial-risk ${report.riskClass}">${miniIcon("alert")}${escapeHtml(report.riskLabel)}</span>` : ""}</p>
      </div>
      <div class="student-modal-head-actions">
        <button class="student-modal-close" type="button" data-close-modal aria-label="Close student details">${miniIcon("close")}</button>
      </div>
    </header>
    <main class="student-modal-body">
      ${studentModalContent(user, activeTab)}
    </main>
    <nav class="student-modal-tabs" aria-label="Student sections">
      ${studentModalTab("dashboard", "Dashboard", "trend", activeTab)}
      ${studentModalTab("remedial", "Remedial", "heart", activeTab)}
      ${studentModalTab("profile", "Profile", "profile", activeTab)}
    </nav>
  </section>`;
  modalRoot.querySelector("[data-close-modal]").addEventListener("click", closeModal);
  modalRoot.querySelectorAll("[data-student-tab]").forEach(button => {
    button.addEventListener("click", () => showStudentModal(user, button.dataset.studentTab));
  });
  modalRoot.querySelectorAll("[data-trend-range]").forEach(button => {
    button.addEventListener("click", () => {
      state.studentTrendRange = button.dataset.trendRange;
      showStudentModal(user, "dashboard");
    });
  });
  modalRoot.querySelectorAll("[data-run-remedial-analysis]").forEach(button => {
    button.addEventListener("click", async () => {
      state.remedialAnalysis[user.id] = "running";
      state.remedialAnalysisErrors[user.id] = "";
      showStudentModal(user, "remedial");
      try {
        state.remedialAiReports[user.id] = await generateRemedialAiReport(user);
      } catch (error) {
        state.remedialAnalysisErrors[user.id] = error.message || "AI analysis unavailable.";
        delete state.remedialAiReports[user.id];
      } finally {
        if (modalRoot.hidden || !modalRoot.querySelector(".student-modal.remedial-view")) return;
        state.remedialAnalysis[user.id] = "complete";
        showStudentModal(user, "remedial");
      }
    });
  });
  modalRoot.querySelectorAll("[data-create-weekend-assignment]").forEach(button => {
    button.addEventListener("click", () => {
      openRemedialAssignmentForm(user);
    });
  });
  const profileForm = modalRoot.querySelector("[data-student-profile-form]");
  modalRoot.querySelector("[data-edit-student-profile]")?.addEventListener("click", () => {
    profileForm?.querySelectorAll("input, select").forEach(control => { control.disabled = false; });
    const saveButton = profileForm?.querySelector("button[type='submit']");
    if (saveButton) saveButton.disabled = false;
    profileForm?.classList.add("is-editing");
    profileForm?.querySelector("input[name='fullName']")?.focus();
  });
  profileForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(profileForm).entries());
    const error = profileForm.querySelector(".student-profile-error");
    if (error) error.textContent = "";
    try {
      const response = await api(`/admin/users/${encodeURIComponent(user.id)}/profile`, { method: "PATCH", body: {
        fullName: String(data.fullName || "").trim(),
        grade: cleanSchoolFormValue(data.grade),
        schoolId: cleanSchoolFormValue(data.schoolId),
        email: String(data.email || "").trim(),
        phone: cleanSchoolFormValue(data.phone),
        county: cleanSchoolFormValue(data.county),
        adminPassword: String(data.adminPassword || "")
      }});
      const index = state.data.users.findIndex(item => String(item.id) === String(user.id));
      if (index >= 0) state.data.users[index] = { ...state.data.users[index], ...response.user };
      showStudentModal(normalizeUserRow(response.user, Math.max(0, index)), "profile");
    } catch (submitError) {
      profileForm.querySelector("input[name='adminPassword']").value = "";
      if (error) error.textContent = submitError.message;
    }
  });
  const subscriptionForm = modalRoot.querySelector("[data-student-subscription-form]");
  subscriptionForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const submitter = event.submitter;
    const error = subscriptionForm.querySelector(".student-subscription-error");
    if (error) error.textContent = "";
    try {
      const passwordInput = subscriptionForm.querySelector("input[name='subscriptionAdminPassword']");
      const response = await api(`/admin/users/${encodeURIComponent(user.id)}/subscription`, { method: "PATCH", body: {
        active: submitter?.value === "activate",
        planCode: submitter?.value === "activate" ? subscriptionForm.querySelector("select[name='subscriptionPlanCode']").value : undefined,
        adminPassword: passwordInput.value
      }});
      const index = state.data.users.findIndex(item => String(item.id) === String(user.id));
      if (index >= 0) state.data.users[index] = { ...state.data.users[index], ...response.user };
      showStudentModal(normalizeUserRow(response.user, Math.max(0, index)), "profile");
    } catch (submitError) {
      subscriptionForm.querySelector("input[name='subscriptionAdminPassword']").value = "";
      if (error) error.textContent = submitError.message;
    }
  });
  modalRoot.addEventListener("click", onScrimClick, { once: true });
}

function studentModalTab(key, label, iconName, activeTab) {
  const isActive = key === activeTab;
  return `<button class="student-modal-tab ${isActive ? "active" : ""} ${key === "remedial" ? "remedial" : ""}" type="button" data-student-tab="${key}">
    ${miniIcon(iconName)}
    <span>${escapeHtml(label)}</span>
  </button>`;
}

function studentModalContent(user, tab) {
  if (tab === "profile") return studentProfileContent(user);
  if (tab === "remedial") return studentRemedialContent(user);
  return studentDashboardContent(user);
}

function studentDashboardContent(user) {
  const score = studentPerformanceScore(user);
  const trendRange = state.studentTrendRange || "Last 7 days";
  const trend = studentTrendData(user, trendRange);
  return `
    <section class="student-modal-card performance-card">
      <span class="student-card-kicker">Overall Performance</span>
      <div class="student-gauge-wrap">
        ${studentScoreGauge(score)}
        <strong>${score}%</strong>
      </div>
      <div class="student-expectation">${miniIcon("trophy")}<span>Meeting Expectations</span></div>
    </section>
    <section class="student-modal-card recent-card">
      <div class="student-card-title-row">
        <h3>Recent Activity</h3>
        <button type="button">View All</button>
      </div>
      ${studentActivityRow("calculator", "Algebra Quiz", "Today, 9:30 AM", "92%", "good")}
      ${studentActivityRow("book", "Biology Reading", "Today, 8:15 AM", "75%", "")}
      ${studentActivityRow("globe2", "World War II Essay", "Yesterday, 8:30 AM", "45%", "low")}
    </section>
    <section class="student-modal-card trend-card">
      <div class="student-card-title-row">
        <h3>Performance Trend</h3>
        ${trendRangeMenu(trendRange)}
      </div>
      <div class="trend-chart" aria-hidden="true">
        <div class="trend-line" style="--trend-bars:${trend.values.length}">${trend.values.map(value => `<i style="height:${value}%"></i>`).join("")}</div>
        <div class="trend-days" style="--trend-bars:${trend.labels.length}">${trend.labels.map(label => `<span>${escapeHtml(label)}</span>`).join("")}</div>
      </div>
    </section>`;
}

function studentTrendData(user, range) {
  const score = studentPerformanceScore(user);
  const seed = String(user.name || "").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const clamp = value => Math.max(18, Math.min(96, Math.round(value)));
  const currentDate = new Date();
  const dayFormatter = new Intl.DateTimeFormat("en", { weekday: "short" });
  const monthFormatter = new Intl.DateTimeFormat("en", { month: "short" });
  const lastDays = count => Array.from({ length: count }, (_, index) => {
    const date = new Date(currentDate);
    date.setDate(currentDate.getDate() - (count - 1 - index));
    return dayFormatter.format(date);
  });
  const monthLabel = offset => {
    const date = new Date(currentDate);
    date.setMonth(currentDate.getMonth() - offset);
    return monthFormatter.format(date);
  };
  const values = (count, offset = 0) => Array.from({ length: count }, (_, index) => {
    const wave = Math.sin((seed + offset + index * 31) / 19) * 12;
    const progress = (index / Math.max(1, count - 1)) * 10;
    return clamp(score - 14 + wave + progress);
  });
  if (range === "Last 1 month") {
    return { labels: ["W1", "W2", "W3", "W4"], values: values(4, 11) };
  }
  if (range === "Last 3 months") {
    return { labels: [monthLabel(2), monthLabel(1), monthLabel(0)], values: values(3, 23) };
  }
  if (range === "Life Time") {
    const year = currentDate.getFullYear();
    return { labels: [String(year - 3), String(year - 2), String(year - 1), String(year)], values: values(4, 37) };
  }
  return { labels: lastDays(7), values: values(7) };
}

function trendRangeMenu(activeRange) {
  const options = ["Last 7 days", "Last 1 month", "Last 3 months", "Life Time"];
  return `<details class="trend-range-menu">
    <summary>${escapeHtml(activeRange)}</summary>
    <div>
      ${options.map(option => `<button class="${option === activeRange ? "active" : ""}" type="button" data-trend-range="${escapeHtml(option)}">${escapeHtml(option)}</button>`).join("")}
    </div>
  </details>`;
}

function studentScoreGauge(score) {
  const totalTicks = 31;
  const activeTicks = Math.round((score / 100) * totalTicks);
  const ticks = Array.from({ length: totalTicks }, (_, index) => {
    const angle = Math.PI - (index / (totalTicks - 1)) * Math.PI;
    const outer = 82;
    const inner = 64;
    const x1 = 110 + Math.cos(angle) * outer;
    const y1 = 104 - Math.sin(angle) * outer;
    const x2 = 110 + Math.cos(angle) * inner;
    const y2 = 104 - Math.sin(angle) * inner;
    const active = index < activeTicks;
    let color = "#edf0f5";
    if (active && index < 9) color = "#dc1f2b";
    else if (active && index < 18) color = "#f2b52a";
    else if (active) color = "#1fc45b";
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" />`;
  }).join("");
  return `<svg class="student-score-gauge" viewBox="0 0 220 130" role="img" aria-label="${score}% overall performance">
    <g class="student-gauge-ticks">${ticks}</g>
  </svg>`;
}

function studentActivityRow(iconName, title, meta, score, tone) {
  return `<div class="student-activity-row">
    <span class="student-activity-icon">${miniIcon(iconName)}</span>
    <span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(meta)}</small></span>
    <b class="${tone}">${escapeHtml(score)}</b>
  </div>`;
}

function studentProfileContent(user) {
  const aiUsage = studentAiUsage(user);
  const schoolChoices = [{ id: "", name: "No School" }, ...state.data.schools.map(school => ({ id: school.id, name: school.name }))];
  const subscriptionActive = user.subscriptionStatus === "active";
  return `
    <section class="student-profile-hero">
      <div class="student-profile-banner"></div>
      <div class="student-profile-avatar">${studentAvatar(user.avatar, "large")}</div>
      <h3>${escapeHtml(user.name)}</h3>
      <span>${escapeHtml(user.school)}</span>
    </section>
    <form class="student-profile-form" data-student-profile-form>
      <section class="student-modal-card info-card">
        <h3>${miniIcon("profile")} Academic Info <button type="button" data-edit-student-profile aria-label="Edit student profile">${miniIcon("pencil")}</button></h3>
        <label><span>Student Name</span><input name="fullName" value="${escapeHtml(user.name)}" disabled required /></label>
        <label><span>Grade</span><input name="grade" value="${escapeHtml(user.grade === "N/A" ? "" : user.grade || "")}" disabled /></label>
        <label><span>School</span><select name="schoolId" disabled>${schoolChoices.map(school => `<option value="${escapeHtml(school.id)}" ${String(school.id) === String(user.schoolId || "") ? "selected" : ""}>${escapeHtml(school.name)}</option>`).join("")}</select></label>
        ${studentInfoRow("Date Joined", user.raw?.createdAt ? new Date(user.raw.createdAt).toLocaleDateString("en-KE", { month: "short", year: "numeric" }) : "-")}
        ${studentInfoRow("Last Active", user.status === "Online" ? "Just now" : "Today")}
        ${studentInfoRow("Assignments", `${studentAssignmentCount(user)} Completed`)}
        ${studentInfoRow("Tokens / KSh", `${aiUsage.totalTokens.toLocaleString("en-KE")} / ${moneyKesFromCents(aiUsage.spendKshCents)}`)}
      </section>
      <section class="student-modal-card contact-card">
        <h3>Contact Details</h3>
        <label><span>Email</span><input name="email" type="email" value="${escapeHtml(user.email)}" disabled required /></label>
        <label><span>Phone</span><input name="phone" value="${escapeHtml(user.phone)}" disabled /></label>
        <label><span>County</span><input name="county" value="${escapeHtml(user.county)}" disabled /></label>
        <div class="student-profile-confirmation">
          <input name="adminPassword" type="password" minlength="8" autocomplete="current-password" placeholder="Admin password" disabled required />
          <button class="primary-button" type="submit" disabled>${miniIcon("save")} Save changes</button>
        </div>
        <p class="error-text student-profile-error"></p>
      </section>
    </form>
    <form class="student-modal-card student-subscription-card" data-student-subscription-form>
      <h3>${miniIcon("wallet")} Subscription Package</h3>
      ${studentInfoRow("Package", user.subscriptionPlanName || "No package assigned")}
      ${studentInfoRow("Status", subscriptionActive ? "Active" : "Inactive")}
      ${studentInfoRow("Valid Until", subscriptionActive && user.subscriptionPeriodEnd ? new Date(user.subscriptionPeriodEnd).toLocaleDateString("en-KE") : "-")}
      <label class="student-subscription-plan-field"><span>Assign package</span><select name="subscriptionPlanCode" required>
        <option value="weekly" ${user.subscriptionPlanCode === "weekly" ? "selected" : ""}>Weekly</option>
        <option value="monthly" ${!user.subscriptionPlanCode || user.subscriptionPlanCode === "monthly" ? "selected" : ""}>Monthly</option>
        <option value="annual" ${user.subscriptionPlanCode === "annual" ? "selected" : ""}>Annual</option>
      </select></label>
      <input name="subscriptionAdminPassword" type="password" minlength="8" autocomplete="current-password" placeholder="Admin password" required />
      <div class="student-subscription-actions">
        <button class="success-button" type="submit" value="activate">${user.subscriptionPlanCode ? "Change / Reactivate" : "Assign package"}</button>
        <button class="danger-button" type="submit" value="deactivate" ${!subscriptionActive ? "disabled" : ""}>Deactivate</button>
      </div>
      <p class="error-text student-subscription-error"></p>
    </form>`;
}

function studentInfoRow(label, value) {
  return `<div class="student-info-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function studentRemedialContent(user) {
  const report = currentRemedialReport(user);
  const analysisStatus = state.remedialAnalysis[user.id] || "idle";
  const isRunning = analysisStatus === "running";
  if (analysisStatus !== "complete") {
    return `<section class="student-modal-card remedial-run-card ${isRunning ? "is-running" : ""}">
      <div class="remedial-run-hero">
        <span class="remedial-run-icon">${miniIcon("activity")}</span>
        <h3>Remedial</h3>
        <p>Scan this week's wrong answers across quizzes and assignments to build a focused remedial report.</p>
        <button class="analysis-run-button" type="button" data-run-remedial-analysis>${miniIcon("activity")} ${isRunning ? "Analyzing..." : "Run Analysis"}</button>
      </div>
      ${isRunning ? `<div class="analysis-stream" aria-hidden="true"><i></i><i></i><i></i></div>` : ""}
      <div class="remedial-run-chips" aria-hidden="true">
        <span>${miniIcon("document")} All quizzes</span>
        <span>${miniIcon("check")} Assignments</span>
        <span>${miniIcon("target")} Learning gaps</span>
      </div>
    </section>`;
  }
  return `
    <section class="student-modal-card remedial-report-stats">
      ${remedialReportStat(`${report.mastery}%`, "Mastery", "trophy", "mastery")}
      ${remedialReportStat(report.wrongAnswers, "Wrong", "close", "wrong")}
      ${remedialReportStat(report.priorityGaps, "Priority Gaps", "alert", "gaps")}
    </section>
    <p class="remedial-source-note">${escapeHtml(report.sourceLabel || "AI analysis")} - ${escapeHtml(report.periodLabel)}</p>
    <section class="student-modal-card remedial-diagnosis-card stream-section">
      <span class="remedial-card-icon">${miniIcon("document")}</span>
      <div>
        <h3>Diagnosis</h3>
        <p>${escapeHtml(report.diagnosis)}</p>
      </div>
    </section>
    <section class="student-modal-card remedial-areas-card stream-section">
      <div class="student-card-title-row">
        <h3>Priority Gaps</h3>
      </div>
      <div class="remedial-area-list">
        ${report.topAreas.map(remedialAreaTableRow).join("")}
      </div>
    </section>
    <section class="student-modal-card remedial-recommendation-card stream-section">
      <span class="remedial-card-icon action">${miniIcon("target")}</span>
      <div>
        <h3>Recommended Action</h3>
        <p><strong>${escapeHtml(report.actionTitle)}</strong>${escapeHtml(report.actionNote)}</p>
      </div>
    </section>
    <button class="weekend-assignment-button stream-section" type="button" data-create-weekend-assignment>${miniIcon("document")} Set Assignment</button>`;
}

function remedialMetric(value, label, iconName) {
  return `<span>${miniIcon(iconName)}<strong>${escapeHtml(value)}</strong><small>${escapeHtml(label)}</small></span>`;
}

function remedialReportStat(value, label, iconName, tone) {
  return `<div class="remedial-report-stat ${tone}">
    ${miniIcon(iconName)}
    <strong>${escapeHtml(value)}</strong>
    <span>${escapeHtml(label)}</span>
  </div>`;
}

function remedialAreaRow(area) {
  const accuracy = Math.max(0, Math.min(100, Math.round(area.accuracy)));
  return `<article class="remedial-area-row">
    <div>
      <strong>${escapeHtml(area.subStrand)}</strong>
      <small>${escapeHtml(area.learningArea)} - ${escapeHtml(area.subject)}</small>
    </div>
    <b>${area.wrong} missed</b>
    <div class="remedial-progress" aria-label="${accuracy}% accuracy"><i style="width:${accuracy}%"></i></div>
  </article>`;
}

function remedialAreaTableRow(area, index) {
  const tones = ["danger", "warn", "success"];
  const tone = tones[index] || "success";
  const barWidth = Math.max(38, Math.min(88, area.wrong * 16));
  return `<article class="remedial-gap-row ${tone}">
    <span class="remedial-gap-rank">${index + 1}</span>
    <span class="remedial-gap-copy"><strong>${escapeHtml(area.subStrand)}</strong><small>${escapeHtml(area.subject)}</small></span>
    <i><b style="width:${barWidth}%"></b></i>
    <em>${escapeHtml(area.wrong)} missed</em>
  </article>`;
}

function openRemedialAssignmentForm(user) {
  const report = currentRemedialReport(user);
  openModal("Set Assignment", assignmentForm({
    recipientName: user.name,
    recipientId: isUuid(user.id) ? user.id : "",
    grade: user.grade || grades[0],
    subject: report.topAreas[0]?.subject || subjects[0],
    topic: `Weekend Assignment for ${user.name}. Focus only on: ${report.assignmentTopic}. Generate ${report.assignmentQuestionCount} questions and include a short revision note.`,
    draft: remedialAssignmentDraft(user, report)
  }));
}

function remedialAssignmentDraft(user, report) {
  const areas = report.topAreas.length ? report.topAreas : [{ subject: "Mathematics", subStrand: "Revision", learningArea: "Core skills" }];
  const questions = Array.from({ length: report.assignmentQuestionCount }, (_, index) => {
    const area = areas[index % areas.length];
    const isMcq = index % 2 === 1;
    return isMcq ? {
      id: index + 1,
      type: "MCQ",
      text: `Which option best supports ${area.subStrand}?`,
      options: ["Correct method", "Unrelated fact", "Guesswork", "Incomplete answer"],
      correctAnswer: "Correct method",
      explanation: `Checks whether ${user.name} can identify the right approach.`
    } : {
      id: index + 1,
      type: "SHORT_ANSWER",
      text: `Explain the key idea behind ${area.learningArea}.`,
      correctAnswer: "Student should show the core method or concept clearly.",
      explanation: `Targets ${area.subStrand}.`
    };
  });
  return {
    title: `${firstNameOf(user)} Weekend Remedial`,
    description: `Focused remedial assignment for ${areas.map(area => area.subStrand).join(", ")}.`,
    questions
  };
}

function currentRemedialReport(user) {
  return state.remedialAiReports[user.id] || buildRemedialReport(user);
}

async function generateRemedialAiReport(user) {
  const fallback = buildRemedialReport(user);
  const attempts = weeklyRemedialAttempts(user);
  if (!state.accessToken) throw new Error("Sign in to generate a remedial analysis.");
  const response = await api("/ai/generate-text", { method: "POST", body: {
    prompt: remedialAnalysisPrompt(user, attempts, fallback),
    responseMimeType: "application/json",
    feature: "remedial_analysis"
  }});
  return parseRemedialAiReport(response.text, fallback);
}

function remedialAnalysisPrompt(user, attempts, fallback) {
  return `Analyze this student's wrong-answer records from the past 7 days only.
Student: ${user.name}
Grade: ${user.grade || "Student"}
Weekly summary: ${fallback.wrongAnswers} wrong answers, ${fallback.priorityGaps} priority gaps, ${fallback.mastery}% mastery.
Wrong-answer records:
${JSON.stringify(attempts.filter(attempt => !attempt.correct).map(attempt => ({
  subject: attempt.subject,
  strand: attempt.strand,
  subStrand: attempt.subStrand,
  learningArea: attempt.learningArea,
  source: attempt.source,
  daysAgo: attempt.daysAgo
})), null, 2)}

Return pure JSON only:
{
  "diagnosis": "A concise teacher/parent-facing explanation of the week's pattern.",
  "actionTitle": "Best next step: ... ",
  "actionNote": "Specific revision/coaching action for the weakest areas.",
  "riskLabel": "Needs Attention | Watch Closely | Improving",
  "riskClass": "high | medium | low"
}`;
}

function parseRemedialAiReport(value, fallback) {
  const parsed = typeof value === "string" ? JSON.parse(sanitizeJsonPayload(value)) : value;
  const riskClass = ["high", "medium", "low"].includes(parsed.riskClass) ? parsed.riskClass : fallback.riskClass;
  return {
    ...fallback,
    diagnosis: String(parsed.diagnosis || fallback.diagnosis).trim(),
    actionTitle: String(parsed.actionTitle || fallback.actionTitle).trim() + " ",
    actionNote: String(parsed.actionNote || fallback.actionNote).trim(),
    riskLabel: String(parsed.riskLabel || fallback.riskLabel).trim(),
    riskClass,
    sourceLabel: "AI analysis"
  };
}

function buildRemedialReport(user) {
  const attempts = weeklyRemedialAttempts(user);
  const grouped = attempts.reduce((items, attempt) => {
    const key = [attempt.subject, attempt.strand, attempt.subStrand, attempt.learningArea].join("|");
    if (!items[key]) {
      items[key] = {
        subject: attempt.subject,
        strand: attempt.strand,
        subStrand: attempt.subStrand,
        learningArea: attempt.learningArea,
        wrong: 0,
        total: 0,
        recent: 0,
        sources: new Set()
      };
    }
    items[key].total += 1;
    items[key].sources.add(attempt.source);
    if (!attempt.correct) {
      items[key].wrong += 1;
      if (attempt.recent) items[key].recent += 1;
    }
    return items;
  }, {});
  const areas = Object.values(grouped)
    .map(area => ({
      ...area,
      sourceCount: area.sources.size,
      accuracy: ((area.total - area.wrong) / Math.max(1, area.total)) * 100,
      severity: area.wrong * 2 + area.recent + area.sources.size
    }))
    .sort((a, b) => b.severity - a.severity);
  const topAreas = areas.slice(0, 3);
  const wrongAnswers = attempts.filter(attempt => !attempt.correct).length;
  const sourceCount = new Set(attempts.map(attempt => attempt.source)).size;
  const riskLabel = wrongAnswers >= 10 ? "Needs Attention" : wrongAnswers >= 6 ? "Watch Closely" : "Improving";
  const riskClass = wrongAnswers >= 10 ? "high" : wrongAnswers >= 6 ? "medium" : "low";
  const areaList = topAreas.map(area => area.subStrand).join(", ");
  const firstName = firstNameOf(user);
  const primaryArea = topAreas[0];
  const primarySkill = primaryArea?.learningArea || primaryArea?.subStrand || "the weakest skill";
  const diagnosis = `${firstName} has repeatedly missed questions in ${areaList} during the past 7 days. The pattern suggests ${firstName} understands the basics but needs guided practice applying them in unfamiliar question formats.`;
  const mastery = Math.max(42, Math.min(88, Math.round(100 - wrongAnswers * 3.8)));
  return {
    wrongAnswers,
    affectedAreas: areas.length,
    sourceCount,
    topAreas,
    mastery,
    priorityGaps: topAreas.length,
    riskLabel,
    riskClass,
    periodLabel: "Past 7 days",
    sourceLabel: "Weekly analysis",
    updatedLabel: "All Features",
    assignmentQuestionCount: Math.max(8, Math.min(16, topAreas.reduce((sum, area) => sum + area.wrong, 0) + 4)),
    nextStep: diagnosis,
    diagnosis,
    actionTitle: "Best next step: Weekend Assignment + 1:1 coaching. ",
    actionNote: `Use worked examples on ${primarySkill}, guided revision, then a short re-test this week.`,
    recommendation: `Weekend work should target ${areaList}. Re-test before the next assessment.`,
    assignmentTopic: `${topAreas.map(area => `${area.subStrand} (${area.learningArea})`).join("; ")}`
  };
}

function weeklyRemedialAttempts(user) {
  const attempts = studentRemedialAttempts(user).filter(isPastSevenDayAttempt);
  return attempts.length ? attempts : studentRemedialAttempts(user);
}

function isPastSevenDayAttempt(attempt) {
  if (Number.isFinite(attempt.daysAgo)) return attempt.daysAgo >= 0 && attempt.daysAgo <= 6;
  return attempt.recent === true || attempt.attemptedAt === "This week" || attempt.attemptedAt === "Past 7 days";
}

function studentRemedialAttempts(user) {
  const firstName = firstNameOf(user);
  const studentKey = String(user.name || user.id || "").toLowerCase();
  let seed = String(user.id || user.name || "").length % 3;
  if (studentKey.includes("alice")) seed = 0;
  if (studentKey.includes("kevin")) seed = 1;
  if (studentKey.includes("brian")) seed = 2;
  const banks = [
    [
      ["Mathematics", "Numbers", "Fractions", "Equivalent fractions", "Algebra Quiz", 4],
      ["Science", "Living Things", "Respiration", "Gas exchange", "Biology Reading", 3],
      ["English", "Reading", "Inference", "Evidence from text", "Comprehension Drill", 4],
      ["Social Studies", "History", "Cause and effect", "World War II Essay", 2]
    ],
    [
      ["Mathematics", "Algebra", "Linear equations", "Solving for unknowns", "Equation Practice", 4],
      ["Kiswahili", "Sarufi", "Nyakati", "Wakati uliopita", "Kiswahili Quiz", 3],
      ["Science", "Matter", "Mixtures", "Separation methods", "Science Assignment", 3],
      ["English", "Writing", "Paragraph structure", "Topic sentences", "Essay Builder", 2]
    ],
    [
      ["Computer Science", "Programming", "Conditionals", "If statements", "Code Lab", 4],
      ["Mathematics", "Geometry", "Angles", "Angles in triangles", "Geometry Quiz", 3],
      ["Science", "Energy", "Electric circuits", "Series circuits", "Lab Reflection", 3],
      ["English", "Grammar", "Punctuation", "Comma usage", "Grammar Practice", 2]
    ]
  ];
  return banks[seed].flatMap(([subject, strand, subStrand, learningArea, source, count], areaIndex) => {
    return Array.from({ length: count }, (_, index) => {
      const daysAgo = index < 2 ? Math.min(6, index + areaIndex) : 8 + index;
      return {
        student: firstName,
        subject,
        strand,
        subStrand,
        learningArea,
        source,
        correct: index === count - 1 && areaIndex > 1,
        recent: daysAgo <= 6,
        daysAgo,
        attemptedAt: daysAgo <= 6 ? "Past 7 days" : "Older"
      };
    });
  });
}

function firstNameOf(user) {
  return String(user.name || "This student").split(" ")[0] || "This student";
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function showTeacherStudent(id) {
  const student = teacherStudentRows().find(item => item.id === id);
  if (!student) return;
  const rows = teacherAssignmentRows()
    .filter(assignment => assignment.grade === student.grade)
    .map(assignment => [
      escapeHtml(assignment.subject),
      percent(assignment.averageScore || 0),
      `${Number(assignment.submittedCount || 0).toLocaleString()} / ${Number(assignment.totalStudents || 0).toLocaleString()} submitted`
    ]);
  openModal(`${student.name} - ${student.grade}`, table(["Subject", "Average Score", "Assignment Progress"], rows));
}

function showNamedModal(name) {
  if (name === "assignment") return openModal("Set Assignment", assignmentForm());
}

function openTeacherMessageModal(teacherId = "") {
  const teacher = teacherRows().find(row => String(row.id) === String(teacherId));
  openModal(teacher ? `Message ${teacher.name}` : "Message Teachers", `
    <form class="kpi-stack" data-kind="teacher-message">
      <label class="school-form-field">
        <span>Subject</span>
        <input name="subject" value="${escapeHtml(teacher ? "Teacher follow-up" : "Teacher broadcast")}" required />
      </label>
      <label class="school-form-field">
        <span>Message</span>
        <textarea name="message" rows="5" required placeholder="Write a clear instruction or follow-up note..."></textarea>
      </label>
      <p class="visually-muted">Messages are prepared for dashboard delivery; provider-backed sending can be connected to the notification pipeline.</p>
      <button class="primary-button" type="submit">${miniIcon("chat")} Prepare Message</button>
      <p class="error-text"></p>
    </form>
  `, "small");
}

function openParentMessageModal(parentId = "") {
  const parent = parentAdminRows().find(row => String(row.id) === String(parentId));
  const draft = document.getElementById("parentBroadcastText")?.value?.trim() || "";
  openModal(parent ? `Message ${parent.name}` : "Message Parents", `
    <form class="kpi-stack" data-kind="parent-message" data-parent-id="${escapeHtml(parent?.id || "")}">
      <label class="school-form-field">
        <span>Subject</span>
        <input name="title" value="${escapeHtml(parent ? "Learner progress update" : "Parent broadcast")}" required />
      </label>
      <label class="school-form-field">
        <span>Message</span>
        <textarea name="message" rows="5" required placeholder="Write a concise parent update...">${escapeHtml(draft)}</textarea>
      </label>
      <p class="visually-muted">Messages are delivered to the parent's dashboard and phone number through the existing notification service.</p>
      <div class="sales-message-status"></div>
      <button class="primary-button" type="submit">${miniIcon("chat")} Send Message</button>
      <p class="error-text"></p>
    </form>
  `, "small");
}

function openPhoneLockModal() {
  openModal("Phone Focus Control", `
    <div class="kpi-stack">
      <p class="visually-muted">Phone locks are coordinated through the learner device app. This dashboard records the requested focus action for the linked child account.</p>
      <div class="kpi-row"><strong>Lock for 1 hour</strong><span>Ready</span></div>
      <div class="kpi-row"><strong>Homework lock</strong><span>Ready</span></div>
      <div class="kpi-row"><strong>Scheduled lock</strong><span>Ready</span></div>
    </div>
  `, "small");
}

function findCurriculumSubject(subjectId) {
  return curriculumSubjectOptions().find(subject => (subject.subjectId || subjectIdFromName(subject.subjectName)) === subjectId);
}

function openCurriculumEditor(subjectId) {
  const subject = findCurriculumSubject(subjectId);
  if (!subject) return;
  const grade = currentCurriculumGrade();
  modalRoot.hidden = false;
  modalRoot.innerHTML = `<div class="curriculum-editor-shell">
    <form data-kind="curriculum-editor" data-subject-id="${escapeHtml(subjectId)}" data-subject-name="${escapeHtml(subject.subjectName)}" data-grade="${escapeHtml(grade)}" class="curriculum-editor-form">
      <header class="curriculum-editor-top">
        <button class="curriculum-editor-close" type="button" data-close-modal aria-label="Close editor">${miniIcon("close")}</button>
        <div>
          <h2>Curriculum Editor</h2>
          <p>${escapeHtml(subject.subjectName)} - ${escapeHtml(grade)}</p>
        </div>
        <div class="curriculum-editor-actions">
          <button class="curriculum-header-add" type="button" data-add-strand aria-label="Add strand">${miniIcon("plus")}</button>
          <button class="primary-button curriculum-save-button" type="submit">${miniIcon("save")} Save Changes</button>
        </div>
      </header>
      <main class="curriculum-editor-body">
        ${curriculumEditorStrands(subject)}
        <p class="error-text"></p>
      </main>
    </form>
  </div>`;
  modalRoot.querySelector("[data-close-modal]").addEventListener("click", closeModal);
  bindModalForms();
  bindCurriculumEditorControls();
}

function curriculumEditorStrands(subject) {
  const strands = Array.isArray(subject.strands) && subject.strands.length ? subject.strands : [emptyEditorStrand()];
  return strands.map(strand => curriculumEditorStrand(strand)).join("");
}

function curriculumEditorStrand(strand = emptyEditorStrand()) {
  const subStrands = Array.isArray(strand.subStrands) && strand.subStrands.length ? strand.subStrands : [emptyEditorSubStrand()];
  return `<section class="curriculum-editor-strand">
    <div class="curriculum-editor-strand-head">
      <input class="strand-number" value="${escapeHtml(strand.number || "")}" placeholder="1.0" aria-label="Strand number" />
      <div class="curriculum-editor-strand-title">
        <input class="strand-title" value="${escapeHtml(strand.title || "")}" placeholder="STRAND TITLE" aria-label="Strand title" />
        <input class="strand-subtitle" value="${escapeHtml(strand.subTitle || "")}" placeholder="Strand description" aria-label="Strand description" />
      </div>
      <button class="curriculum-editor-icon danger" type="button" data-remove-strand aria-label="Remove strand">${miniIcon("trash")}</button>
    </div>
    <div class="curriculum-editor-topics">
      ${subStrands.map(subStrand => curriculumEditorTopic(subStrand)).join("")}
    </div>
    <button class="curriculum-add-substrand" type="button" data-add-substrand>${miniIcon("plus")} Add Sub-strand</button>
  </section>`;
}

function curriculumEditorTopic(subStrand = emptyEditorSubStrand()) {
  const outcomes = Array.isArray(subStrand.outcomes)
    ? formatOutcomeBullets(subStrand.outcomes.map(item => item.text || item).filter(Boolean))
    : "";
  return `<article class="curriculum-editor-topic">
    <div class="curriculum-editor-topic-head">
      <input class="topic-number" value="${escapeHtml(subStrand.number || "")}" placeholder="1.1" aria-label="Sub-strand number" />
      <input class="topic-title" value="${escapeHtml(subStrand.title || "")}" placeholder="Sub-strand title" aria-label="Sub-strand title" />
      <button class="curriculum-editor-icon" type="button" data-remove-topic aria-label="Remove topic">${miniIcon("close")}</button>
    </div>
    <label>Learning Outcomes (one per line)</label>
    <textarea class="topic-outcomes" placeholder="- Define key concepts...">${escapeHtml(outcomes)}</textarea>
  </article>`;
}

function emptyEditorStrand(number = "1.0") {
  return {
    number,
    title: "",
    subTitle: "",
    subStrands: [emptyEditorSubStrand(nextSubStrandNumberFromStrandNumber(number, 0))]
  };
}

function emptyEditorSubStrand(number = "1.1") {
  return {
    number,
    title: "",
    type: "knowledge",
    outcomes: [],
    inquiryQuestions: []
  };
}

function nextStrandNumber() {
  const strands = Array.from(modalRoot.querySelectorAll(".curriculum-editor-strand"));
  const lastWhole = strands.reduce((max, strand, index) => {
    const value = strand.querySelector(".strand-number")?.value.trim() || `${index + 1}.0`;
    const whole = Number.parseInt(value.split(".")[0], 10);
    return Number.isFinite(whole) ? Math.max(max, whole) : max;
  }, 0);
  return `${lastWhole + 1}.0`;
}

function nextSubStrandNumber(strand) {
  const strandNumber = strand?.querySelector(".strand-number")?.value.trim() || "1.0";
  const existing = Array.from(strand?.querySelectorAll(".topic-number") || [])
    .map(input => input.value.trim())
    .filter(Boolean);
  return nextSubStrandNumberFromStrandNumber(strandNumber, existing.length, existing);
}

function nextSubStrandNumberFromStrandNumber(strandNumber, count, existing = []) {
  const whole = Number.parseInt(String(strandNumber || "1.0").split(".")[0], 10) || 1;
  const maxDecimal = existing.reduce((max, value) => {
    const parts = String(value).split(".");
    const decimal = Number.parseInt(parts[1], 10);
    return Number.isFinite(decimal) ? Math.max(max, decimal) : max;
  }, count);
  return `${whole}.${maxDecimal + 1}`;
}

function bindCurriculumEditorControls() {
  modalRoot.querySelectorAll("[data-add-strand]").forEach(button => {
    button.onclick = () => {
      const body = modalRoot.querySelector(".curriculum-editor-body");
      const error = body?.querySelector(".error-text");
      if (!body || !error) return;
      error.insertAdjacentHTML("beforebegin", curriculumEditorStrand(emptyEditorStrand(nextStrandNumber())));
      bindCurriculumEditorControls();
    };
  });
  modalRoot.querySelectorAll("[data-add-substrand]").forEach(button => {
    button.onclick = () => {
      const strand = button.closest(".curriculum-editor-strand");
      strand?.querySelector(".curriculum-editor-topics")?.insertAdjacentHTML("beforeend", curriculumEditorTopic(emptyEditorSubStrand(nextSubStrandNumber(strand))));
      bindCurriculumEditorControls();
    };
  });
  modalRoot.querySelectorAll("[data-remove-topic]").forEach(button => {
    button.onclick = () => button.closest(".curriculum-editor-topic")?.remove();
  });
  modalRoot.querySelectorAll("[data-remove-strand]").forEach(button => {
    button.onclick = () => {
      if (modalRoot.querySelectorAll(".curriculum-editor-strand").length > 1) button.closest(".curriculum-editor-strand")?.remove();
    };
  });
  modalRoot.querySelectorAll(".topic-outcomes").forEach(textarea => {
    textarea.oninput = () => formatOutcomeTextarea(textarea);
    textarea.onblur = () => formatOutcomeTextarea(textarea, true);
  });
}

function normalizeOutcomeLine(value) {
  return String(value || "").replace(/^[-]\s*/, "").trim();
}

function formatOutcomeBullets(lines) {
  return lines
    .map(normalizeOutcomeLine)
    .filter(Boolean)
    .map(line => `- ${line}`)
    .join("\n");
}

function formatOutcomeTextarea(textarea, trimEmpty = false) {
  const original = textarea.value;
  const caretAtEnd = textarea.selectionStart === original.length && textarea.selectionEnd === original.length;
  const lines = original.split(/\r?\n/);
  const formatted = lines
    .map(line => {
      if (!line.trim()) return trimEmpty ? "" : line;
      return `- ${normalizeOutcomeLine(line)}`;
    })
    .filter((line, index, list) => !trimEmpty || line || index < list.length - 1)
    .join("\n");
  if (formatted === original) return;
  textarea.value = formatted;
  if (caretAtEnd) {
    textarea.selectionStart = textarea.value.length;
    textarea.selectionEnd = textarea.value.length;
  }
}

function parseCurriculumEditorForm(form) {
  return Array.from(form.querySelectorAll(".curriculum-editor-strand"))
    .map((strand, strandIndex) => {
      const title = strand.querySelector(".strand-title")?.value.trim();
      const subStrands = Array.from(strand.querySelectorAll(".curriculum-editor-topic"))
        .map((topic, topicIndex) => {
          const topicTitle = topic.querySelector(".topic-title")?.value.trim();
          const outcomes = String(topic.querySelector(".topic-outcomes")?.value || "")
            .split(/\r?\n/)
            .map(normalizeOutcomeLine)
            .filter(Boolean)
            .map(text => ({ text }));
          return {
            number: topic.querySelector(".topic-number")?.value.trim() || `${strandIndex + 1}.${topicIndex + 1}`,
            title: topicTitle,
            type: "knowledge",
            outcomes,
            inquiryQuestions: []
          };
        })
        .filter(topic => topic.title || topic.outcomes.length);
      return {
        number: strand.querySelector(".strand-number")?.value.trim() || `${strandIndex + 1}.0`,
        title,
        subTitle: strand.querySelector(".strand-subtitle")?.value.trim(),
        subStrands
      };
    })
    .filter(strand => strand.title || strand.subStrands.length);
}

function pickAndImportCurriculum(subjectId) {
  const subject = findCurriculumSubject(subjectId);
  if (!subject) return;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/pdf,.pdf";
  input.style.display = "none";
  document.body.appendChild(input);
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) {
      input.remove();
      return;
    }
    try {
      setSync("Importing", `Analyzing ${file.name}`, "");
      await api("/curriculum/import/pdf", { method: "POST", body: {
        grade: currentCurriculumGrade(),
        subjectId,
        subjectName: subject.subjectName,
        fileName: file.name,
        mimeType: file.type || "application/pdf",
        base64Data: await fileToBase64(file)
      }});
      await loadCurriculumGrade(currentCurriculumGrade());
      setSync("Live", `Imported ${subject.subjectName}`, "live");
      renderRoute();
    } catch (error) {
      setSync("Import failed", error.message || "Unable to import curriculum", "error");
      openModal("Import Failed", `<p class="visually-muted">${escapeHtml(error.message || "Unable to import curriculum.")}</p>`, "small");
    } finally {
      input.remove();
    }
  }, { once: true });
  input.click();
}

function openAddSubjectModal() {
  const grade = currentCurriculumGrade();
  modalRoot.hidden = false;
  modalRoot.innerHTML = `<div class="modal subject-modal">
    <form data-kind="curriculum-subject-create" class="subject-add-form">
      <h2>Add New Subject</h2>
      <input name="subjectName" type="text" required maxlength="80" autocomplete="off" placeholder="Enter Subject Name (e.g. History)" />
      <input name="grade" type="hidden" value="${escapeHtml(grade)}" />
      <p class="error-text"></p>
      <div class="subject-add-actions">
        <button class="ghost-button" type="button" data-close-modal>Cancel</button>
        <button class="primary-button" type="submit">Add Subject</button>
      </div>
    </form>
  </div>`;
  modalRoot.querySelector("[data-close-modal]").addEventListener("click", closeModal);
  modalRoot.addEventListener("click", onScrimClick, { once: true });
  bindModalForms();
  modalRoot.querySelector("input[name='subjectName']")?.focus();
}

function openModal(title, body, size = "") {
  modalRoot.classList.remove("student-modal-root");
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
  if (event.target === modalRoot && !modalRoot.classList.contains("school-modal-saving")) closeModal();
  else modalRoot.addEventListener("click", onScrimClick, { once: true });
}

function closeModal() {
  modalRoot.classList.remove("student-modal-root", "school-modal-root", "sales-modal-root", "school-modal-saving", "school-modal-retracting");
  modalRoot.hidden = true;
  modalRoot.innerHTML = "";
}

function bindModalForms() {
  modalRoot.querySelectorAll("form").forEach(form => {
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (form.dataset.submitting === "true") return;
      const formData = Object.fromEntries(new FormData(form).entries());
      const submitButton = form.querySelector("button[type='submit']");
      const originalSubmitHtml = submitButton?.innerHTML || "";
      let shouldClose = false;
      let shouldReload = false;
      try {
        if (form.dataset.kind === "curriculum-editor" && submitButton) {
          form.dataset.submitting = "true";
          submitButton.disabled = true;
          submitButton.setAttribute("aria-busy", "true");
          submitButton.classList.add("loading");
          submitButton.innerHTML = `${miniIcon("clock")} Saving...`;
        }
        if (form.dataset.kind === "assignment") {
          const draft = parseGeneratedAssignment(formData.draft);
          await api("/teacher/assignments", { method: "POST", body: {
            title: draft.title,
            subject: formData.subject,
            description: draft.description,
            gradeLevel: formData.grade,
            dueDate: toIsoDateTime(formData.dueDate),
            targetStudentId: formData.targetStudentId || undefined,
            questions: normalizeAssignmentQuestions(draft.questions)
          }});
          shouldClose = true;
          shouldReload = true;
        }
        if (form.dataset.kind === "teacher-message") {
          const subject = String(formData.subject || "").trim();
          const message = String(formData.message || "").trim();
          if (!subject || !message) throw new Error("Add a subject and message.");
          form.innerHTML = `<div class="sales-agent-created">
            <span>${miniIcon("check")}</span>
            <h3>Message prepared</h3>
            <p>Teacher dashboard delivery is ready for the notification pipeline.</p>
            <button type="button" class="primary-button" data-close-modal>Done</button>
          </div>`;
          modalRoot.querySelectorAll("[data-close-modal]").forEach(button => button.addEventListener("click", closeModal));
          return;
        }
        if (form.dataset.kind === "parent-message") {
          const title = String(formData.title || "Parent broadcast").trim();
          const message = String(formData.message || "").trim();
          if (!title || !message) throw new Error("Add a subject and message.");
          const parentId = form.dataset.parentId || "";
          const response = state.accessToken && !isParentOnly()
            ? await api("/admin/parents/messages", { method: "POST", body: {
                title,
                message,
                parentIds: isUuid(parentId) ? [parentId] : undefined
              }})
            : { delivered: 0, phoneDelivered: 0, preview: true };
          const statusEl = form.querySelector(".sales-message-status");
          if (statusEl) {
            statusEl.innerHTML = `<strong>Message sent</strong><span>Dashboard: ${Number(response.delivered || 0).toLocaleString("en-KE")} - Phone: ${Number(response.phoneDelivered || 0).toLocaleString("en-KE")}</span>`;
          }
          form.reset();
          return;
        }
        if (form.dataset.kind === "curriculum-subject-create") {
          const subjectName = String(formData.subjectName || "").trim();
          if (!subjectName) throw new Error("Enter a subject name.");
          state.selectedGrade = formData.grade;
          state.data.curriculum = await api("/curriculum/subjects", { method: "POST", body: {
            grade: formData.grade,
            subjectName
          }});
          shouldClose = true;
        }
        if (form.dataset.kind === "school-editor") {
          const payload = schoolPayloadFromForm(formData);
          if (!payload.name) throw new Error("Enter a school name.");
          if (!payload.location) throw new Error("Enter the school location or county.");
          const availableGrades = new FormData(form).getAll("availableGrades");
          const availablePlanCodes = new FormData(form).getAll("availablePlanCodes");
          if (!availablePlanCodes.length) throw new Error("Select at least one subscription plan.");
          const planPricesKsh = Object.fromEntries(availablePlanCodes.map(planCode => [
            planCode,
            String(formData[`planPriceKsh_${planCode}`] ?? "").trim() === ""
              ? Number.NaN
              : Number(formData[`planPriceKsh_${planCode}`])
          ]));
          if (Object.values(planPricesKsh).some(price => !Number.isInteger(price) || price < 0)) {
            throw new Error("Enter a valid whole KSh amount for every selected plan.");
          }
          payload.availableGrades = availableGrades;
          payload.availablePlanCodes = availablePlanCodes;
          payload.assignedPlanCode = availablePlanCodes.includes("monthly") ? "monthly" : availablePlanCodes[0];
          payload.planPricesKsh = planPricesKsh;
          payload.subscriptionPriceKsh = planPricesKsh[payload.assignedPlanCode];
          const schoolId = form.dataset.schoolId;
          if (schoolId) {
            const adminPassword = String(formData.adminPassword || "");
            if (adminPassword.length < 8) throw new Error("Enter your admin password to save these changes.");
            payload.adminPassword = adminPassword;
          }
          if (submitButton) {
            form.dataset.submitting = "true";
            form.setAttribute("aria-busy", "true");
            modalRoot.classList.add("school-modal-saving");
            submitButton.disabled = true;
            submitButton.setAttribute("aria-busy", "true");
            submitButton.classList.add("is-loading");
            submitButton.innerHTML = `<span class="school-save-spinner" aria-hidden="true"></span><span>${schoolId ? "Saving changes..." : "Adding school..."}</span>`;
          }
          const response = schoolId
            ? await api(`/admin/schools/${encodeURIComponent(schoolId)}`, { method: "PATCH", body: payload })
            : await api("/admin/schools", { method: "POST", body: payload });
          upsertSchoolInState(response.school ? { ...response.school, availableGrades, availablePlanCodes, planPricesKsh } : response.school);
          if (submitButton) {
            submitButton.removeAttribute("aria-busy");
            submitButton.classList.remove("is-loading");
            submitButton.classList.add("is-success");
            submitButton.innerHTML = `${miniIcon("check")} <span>${schoolId ? "Changes saved" : "School added"}</span>`;
          }
          form.removeAttribute("aria-busy");
          modalRoot.classList.remove("school-modal-saving");
          await new Promise(resolve => setTimeout(resolve, 650));
          modalRoot.classList.add("school-modal-retracting");
          await new Promise(resolve => setTimeout(resolve, 320));
          shouldClose = true;
        }
        if (form.dataset.kind === "sales-agent-create") {
          const fullName = String(formData.fullName || "").trim();
          const email = String(formData.email || "").trim();
          const phoneNumber = String(formData.phoneNumber || "").trim();
          const county = String(formData.county || "").trim();
          const schoolIds = new FormData(form).getAll("schoolIds");
          if (!fullName) throw new Error("Enter the agent's full name.");
          if (!email) throw new Error("Enter the agent's email.");
          if (!phoneNumber) throw new Error("Enter the agent's WhatsApp number.");
          if (!county) throw new Error("Select the agent's county.");

          if (!state.accessToken) throw new Error("Sign in to create a sales agent.");
          const response = await api("/admin/sales-agents", { method: "POST", body: { fullName, email, phoneNumber, county, schoolIds } });

          upsertSalesAgentUser(response.user);
          state.data.schools = state.data.schools.map(school => response.assignedSchoolIds?.includes(school.id)
            ? { ...school, salesAgentUserId: response.user.id }
            : school);
          renderRoute();
          form.outerHTML = `<div class="sales-agent-created">
            <span>${miniIcon("check")}</span>
            <h3>${escapeHtml(fullName)} added</h3>
            <p>The agent is now monitoring ${Number(response.assignedSchoolCount || 0).toLocaleString("en-KE")} assigned ${Number(response.assignedSchoolCount || 0) === 1 ? "school" : "schools"}.</p>
            <div class="kpi-row"><strong>Temporary Password</strong><span>${escapeHtml(response.temporaryPassword || "Generated by API")}</span></div>
            <button type="button" class="primary-button" data-close-modal>Done</button>
          </div>`;
          modalRoot.querySelectorAll("[data-close-modal]").forEach(button => button.addEventListener("click", closeModal));
          return;
        }
        if (form.dataset.kind === "sales-agent-message") {
          const agent = findSalesAgent(form.dataset.agentId);
          if (!agent) throw new Error("Sales agent not found.");
          const title = String(formData.title || "Message from Kitabu AI").trim();
          const message = String(formData.message || "").trim();
          if (!message) throw new Error("Write a message before sending.");

          const fallbackWhatsappUrl = salesAgentWhatsappUrl(agent, message);
          const response = (isUuid(agent.id) && state.accessToken)
            ? await api(`/admin/sales-agents/${encodeURIComponent(agent.id)}/messages`, { method: "POST", body: { title, message } })
            : {
                dashboardNotificationId: `local-${Date.now()}`,
                smsStatus: "preview",
                whatsappUrl: fallbackWhatsappUrl,
                whatsappDelivery: fallbackWhatsappUrl ? "launch_required" : "missing_phone"
              };

          appendSalesAgentMessage(agent.id, {
            title,
            body: message,
            createdAt: new Date().toLocaleString("en-KE"),
            dashboardStatus: response.dashboardNotificationId ? "delivered" : "skipped",
            phoneStatus: response.smsStatus || response.whatsappDelivery || "prepared"
          });

          if (response.whatsappUrl) {
            window.open(response.whatsappUrl, "_blank", "noopener");
          }

          const statusEl = form.querySelector(".sales-message-status");
          if (statusEl) {
            statusEl.innerHTML = `<strong>Message prepared</strong><span>Dashboard: ${escapeHtml(response.dashboardNotificationId ? "delivered" : "not delivered")} - Phone: ${escapeHtml(response.smsStatus || response.whatsappDelivery || "prepared")}</span>${response.whatsappUrl ? `<a href="${escapeHtml(response.whatsappUrl)}" target="_blank" rel="noopener">Open WhatsApp</a>` : ""}`;
          }
          form.reset();
          return;
        }
        if (form.dataset.kind === "curriculum-editor") {
          const strands = parseCurriculumEditorForm(form);
          if (!strands.length) throw new Error("Add at least one strand or sub-strand before saving.");
          await api(`/curriculum/subjects/${encodeURIComponent(form.dataset.subjectId)}`, { method: "PUT", body: {
            grade: form.dataset.grade,
            subjectName: form.dataset.subjectName,
            strands
          }});
          await loadCurriculumGrade(form.dataset.grade);
          shouldClose = true;
        }
        if (shouldClose) closeModal();
        if (shouldReload) await loadAll(true);
        else renderRoute();
      } catch (error) {
        const passwordInput = form.querySelector("input[name='adminPassword']");
        if (passwordInput) passwordInput.value = "";
        const errorEl = form.querySelector(".error-text");
        if (errorEl) errorEl.textContent = error.message;
      } finally {
        if (!shouldClose && form.dataset.submitting === "true" && submitButton) {
          form.dataset.submitting = "false";
          form.removeAttribute("aria-busy");
          modalRoot.classList.remove("school-modal-saving", "school-modal-retracting");
          submitButton.disabled = false;
          submitButton.removeAttribute("aria-busy");
          submitButton.classList.remove("loading", "is-loading", "is-success");
          submitButton.innerHTML = originalSubmitHtml;
        }
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
      <div class="kpi-row"><strong>Roles</strong><span>${escapeHtml(roleValues(user).join(", ") || "-")}</span></div>
      <div class="kpi-row"><strong>API</strong><span>${escapeHtml(API_BASE)}</span></div>
    </div>
    <div class="button-row" style="margin-top:16px"><button class="danger-button" id="modalSignOut">Sign out</button></div>
  `, "small");
  document.getElementById("modalSignOut").addEventListener("click", () => { clearSession(); closeModal(); showLogin(); });
}

function assignmentForm(options = {}) {
  const selectedGrade = grades.includes(options.grade) ? options.grade : "Grade 4";
  const selectedSubject = subjects.includes(options.subject) ? options.subject : "Mathematics";
  const topic = options.topic || "";
  const draft = options.draft ? JSON.stringify(options.draft, null, 2) : "";
  const recipient = options.recipientName ? `<div class="assignment-recipient wide">
    <span>Recipient</span>
    <strong>${escapeHtml(options.recipientName)}</strong>
    ${options.recipientId ? `<input type="hidden" name="targetStudentId" value="${escapeHtml(options.recipientId)}">` : ""}
  </div>` : "";
  return `<form data-kind="assignment" class="form-grid">
    ${recipient}
    <label>Grade ${selectField("grade", grades, selectedGrade)}</label>
    <label>Subject ${selectField("subject", subjects, selectedSubject)}</label>
    <label class="wide">Due Date <input name="dueDate" type="datetime-local" /></label>
    <label class="wide">Topic / Instructions <textarea name="topic" required placeholder="Example: 10 questions on fractions with a short marking guide.">${escapeHtml(topic)}</textarea></label>
    <button class="primary-button wide" id="generateAssignment" type="button">Generate with AI</button>
    <label class="wide">Editable Draft JSON <textarea id="assignmentOutput" name="draft" required placeholder="Generate a draft, then edit the JSON before publishing.">${escapeHtml(draft)}</textarea></label>
    <p class="error-text wide"></p>
    <div class="button-row wide"><button class="ghost-button" id="regenerateAssignment" type="button">Re-Generate</button><button class="success-button" type="submit">Publish</button></div>
  </form>`;
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
  return `Create an assignment for ${input.grade} ${input.subject}.
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

function cachedCurriculumForGrade(grade = currentCurriculumGrade()) {
  return state.data.curriculumByGrade[grade] || (state.data.curriculum?.grade === grade ? state.data.curriculum : null);
}

function cachedSubjectEngagementForGrade(grade = currentCurriculumGrade()) {
  return state.data.subjectEngagementByGrade[grade] || (state.data.subjectEngagement?.grade === grade ? state.data.subjectEngagement : null);
}

function isCurriculumGradeLoading(grade = currentCurriculumGrade()) {
  return state.data.loadingCurriculumGrades.has(grade);
}

function curriculumSubjectOptions() {
  const current = cachedCurriculumForGrade(currentCurriculumGrade())?.subjects || [];
  if (current?.length) return current;
  return subjects.map(subjectName => ({
    subjectId: subjectIdFromName(subjectName),
    subjectName,
    strands: []
  }));
}

function curriculumSubjectEngagementRows(curriculumSubjects) {
  const engagementSubjects = cachedSubjectEngagementForGrade(currentCurriculumGrade())?.subjects || [];
  const bySubject = new Map(engagementSubjects.map(row => [row.subjectId, row]));
  return curriculumSubjects
    .map(subject => {
      const subjectName = subject.subjectName || subject.name || "Subject";
      const subjectId = subject.subjectId || subjectIdFromName(subjectName);
      const engagement = bySubject.get(subjectId) || {};
      return {
        subjectId,
        subjectName,
        activeStudents: Number(engagement.activeStudents || 0),
        interactions: Number(engagement.interactions || 0),
        durationSeconds: Number(engagement.durationSeconds || 0)
      };
    })
    .sort((left, right) =>
      right.activeStudents - left.activeStudents ||
      right.durationSeconds - left.durationSeconds ||
      right.interactions - left.interactions ||
      left.subjectName.localeCompare(right.subjectName)
    );
}

function engagementSummary(row) {
  const students = `${Number(row.activeStudents || 0).toLocaleString()} ${Number(row.activeStudents || 0) === 1 ? "student" : "students"}`;
  const duration = formatDuration(row.durationSeconds || 0);
  return `${students} - ${duration}`;
}

function formatDuration(seconds) {
  const value = Number(seconds || 0);
  if (value < 60) return `${value}s`;
  const minutes = Math.round(value / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function subjectContentCount(subject) {
  const strands = Array.isArray(subject?.strands) ? subject.strands : [];
  return strands.reduce((sum, strand) => {
    const subStrands = Array.isArray(strand?.subStrands) ? strand.subStrands.length : 0;
    return sum + subStrands;
  }, 0);
}

function subjectIconName(subjectName) {
  const key = String(subjectName || "").toLowerCase();
  if (key.includes("math")) return "calculator";
  if (key.includes("english")) return "abc";
  if (key.includes("kiswahili")) return "chat";
  if (key.includes("science") && !key.includes("computer")) return "flask";
  if (key.includes("social")) return "globe";
  if (key.includes("computer")) return "code";
  return "book";
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

init();
