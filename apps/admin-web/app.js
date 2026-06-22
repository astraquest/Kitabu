const API_BASE = window.KITABU_API_BASE || (["127.0.0.1", "localhost"].includes(window.location.hostname) ? "/api" : "https://app.kitabu.ai");
const TOKEN_KEY = "kitabu.admin.accessToken";
const REFRESH_KEY = "kitabu.admin.refreshToken";
const USER_KEY = "kitabu.admin.user";
const REFRESH_MS = 30000;

const grades = ["Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Form 3", "Form 4"];
const subjects = ["Mathematics", "English", "Science", "Kiswahili", "Social Studies", "Computer Science"];
const timeRangeOptions = ["This Term", "This Month", "Last Month", "Last 3 Months", "Last 6 Months", "This Year", "Lifetime"];
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

function isLocalPreviewRoute() {
  const host = window.location.hostname;
  return new URLSearchParams(window.location.search).get("preview") === "users"
    && (host === "127.0.0.1" || host === "localhost" || host === "");
}

function previewUsers() {
  return [
    { id: "preview-alice", name: "Alice Wambui", email: "alice@example.com", school: "Greenwood High", grade: "Grade 10", status: "Online", roles: ["student"] },
    { id: "preview-kevin", name: "Kevin Otieno", email: "kevin@student.kitabu.ai", school: "Highland Prep", grade: "Form 2", status: "Offline", roles: ["student"] },
    { id: "preview-brian", name: "Brian Njoroge", email: "brian@student.kitabu.ai", school: "Savannah Academy", grade: "Grade 9", status: "Offline", roles: ["student"] },
    { id: "preview-stacy", name: "Stacy Achieng", email: "stacy@student.kitabu.ai", school: "Greenwood High", grade: "Grade 10", status: "Offline", roles: ["student"] },
    { id: "preview-david", name: "David Kamau", email: "david@student.kitabu.ai", school: "Coast Junior", grade: "Grade 8", status: "Online", roles: ["student"] }
  ];
}

function previewSchools() {
  return [
    { id: "preview-greenwood", name: "Greenwood High", location: "Nairobi County", principal: "Mr. Kamau", phone: "+254 711 000 000", email: "info@greenwood.ac.ke", totalStudents: 1240, gradeCounts: { "Grade 10": 420, "Grade 9": 380, "Grade 8": 440 }, schoolType: "Boarding School", activeLearners: 842, engagement: 78, averageScore: 81, code: "GWH-001" },
    { id: "preview-savannah", name: "Savannah Academy", location: "Kiambu County", principal: "Ms. Njeri", phone: "+254 722 000 000", email: "admin@savannah.ac.ke", totalStudents: 980, gradeCounts: { "Grade 10": 310, "Grade 9": 330, "Grade 8": 340 }, schoolType: "Day School", activeLearners: 721, engagement: 74, averageScore: 84, code: "SAV-002" },
    { id: "preview-highland", name: "Highland Prep", location: "Kisii County", principal: "Mr. Otieno", phone: "+254 733 000 000", email: "office@highland.ac.ke", totalStudents: 690, gradeCounts: { "Form 2": 220, "Grade 9": 210, "Grade 8": 260 }, schoolType: "Boarding School", activeLearners: 203, engagement: 38, averageScore: 46, code: "HLP-003" },
    { id: "preview-coast", name: "Coast Junior", location: "Mombasa County", principal: "Mrs. Amina", phone: "+254 744 000 000", email: "hello@coastjunior.ac.ke", totalStudents: 420, gradeCounts: { "Grade 8": 140, "Grade 7": 150, "Grade 6": 130 }, schoolType: "Day School", activeLearners: 86, engagement: 21, averageScore: 52, code: "CJR-004" },
    { id: "preview-lakeview", name: "Lakeview School", location: "Nakuru County", principal: "Dr. Mwangi", phone: "+254 755 000 000", email: "info@lakeview.ac.ke", totalStudents: 1110, gradeCounts: { "Grade 10": 370, "Grade 9": 360, "Grade 8": 380 }, schoolType: "Day & Boarding", activeLearners: 694, engagement: 66, averageScore: 76, code: "LKV-005" }
  ];
}

function previewSalesAgents() {
  return [
    { id: "preview-agent-alice", name: "Alice Johnson", email: "alice.agent@kitabu.ai", phone: "+254 701 200 101", status: "Online", assignedSchoolNames: ["Greenwood High", "Savannah Academy"], revenue: 500000, conversionRate: 82, commission: 75000 },
    { id: "preview-agent-grace", name: "Grace Wanjiku", email: "grace.agent@kitabu.ai", phone: "+254 701 200 102", status: "Online", assignedSchoolNames: ["Lakeview School"], revenue: 365000, conversionRate: 71, commission: 54800 },
    { id: "preview-agent-james", name: "James Mwangi", email: "james.agent@kitabu.ai", phone: "+254 701 200 103", status: "Active", assignedSchoolNames: ["Highland Prep"], revenue: 140000, conversionRate: 44, commission: 21000 },
    { id: "preview-agent-bob", name: "Bob Smith", email: "bob.agent@kitabu.ai", phone: "+254 701 200 104", status: "Offline", assignedSchoolNames: ["Coast Junior"], revenue: 50000, conversionRate: 18, commission: 7500 }
  ];
}

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
  if (isLocalPreviewRoute()) {
    state.route = "users";
    state.user = { fullName: "Preview Admin", email: "preview@kitabu.ai", roles: ["platform_admin"] };
    state.data.users = previewUsers();
    state.data.schools = previewSchools();
    state.lastSync = new Date("2026-06-22T12:57:00");
    showApp();
    setSync("Live System", "All systems operational", "live");
    renderNav();
    renderRoute();
    return;
  }
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
  document.getElementById("refreshButton").addEventListener("click", () => loadAll(true));
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
  if (!navItems.some(item => item.key === state.route)) state.route = "dashboard";
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
      if (state.route === "subjects" || state.route === "subjectAnalytics") loadCurriculumGrade(currentCurriculumGrade(), { renderWhenDone: true });
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
  if (!state.accessToken || isLocalPreviewRoute() || document.hidden) return;
  if (!state.presenceTimer) {
    state.presenceTimer = setInterval(() => sendPresenceSignal("online"), 30000);
  }
  sendPresenceSignal("online");
}

function sendPresenceSignal(status, options = {}) {
  if (!state.accessToken || isLocalPreviewRoute()) return Promise.resolve();
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
  if (!navItems.some(item => item.key === state.route)) state.route = "dashboard";
  app.dataset.route = state.route;
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

function hasRole(user, role) {
  return (user.roles || []).some(item => String(item).toLowerCase() === role);
}

function isStudentRecord(user) {
  if (Array.isArray(user.roles) && user.roles.length) return hasRole(user, "student");
  return Boolean(user.grade && user.grade !== "N/A") || String(user.email || "").toLowerCase().includes("student");
}

function studentUsers() {
  return state.data.users.filter(isStudentRecord);
}

function allSchoolRows() {
  return (state.data.schools.length ? state.data.schools : previewSchools()).map(normalizeSchoolRow);
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

function usagePeriodScale() {
  const scales = { Today: 0.09, "This Week": 0.34, "This Month": 1 };
  return scales[state.usagePeriod] || 1;
}

function usageStudentRows() {
  return studentUsers()
    .filter(isInSelectedCounty)
    .filter(user => state.selectedGrade === "All Grades" || user.grade === state.selectedGrade);
}

function usageBaseTotals() {
  const students = usageStudentRows();
  const ai = state.data.ai || {};
  const userRows = [...(ai.marginByUser || []), ...(ai.topUsers || [])];
  const schoolRows = ai.costBySchool || [];
  const rawTokens = [...userRows, ...schoolRows].reduce((sum, row) => sum + Number(row.total_tokens ?? row.totalTokens ?? 0), 0);
  const rawSpendCents = [...userRows, ...schoolRows].reduce((sum, row) => sum + Number(row.spend_ksh_cents ?? row.spendKshCents ?? 0), 0);
  const fallbackStudents = Math.max(1, students.length || studentUsers().length || 46);
  const totalTokens = rawTokens || fallbackStudents * 278000;
  const tokenEstimatedCost = totalTokens / 695;
  const totalCost = rawSpendCents > 0 ? rawSpendCents / 100 : tokenEstimatedCost || fallbackStudents * 400.4;
  return {
    students,
    studentCount: fallbackStudents,
    totalTokens,
    totalCost
  };
}

function usageFeatureRows() {
  const totals = usageBaseTotals();
  const scale = usagePeriodScale();
  const featureMix = [
    { label: "AI Tutor Chat", icon: "chat", tone: "blue", tokenShare: 0.45, costShare: 0.43, students: 0.91, trend: 12 },
    { label: "Remedial Reports", icon: "document", tone: "green", tokenShare: 0.17, costShare: 0.17, students: 0.30, trend: 8 },
    { label: "Quiz Generation", icon: "question", tone: "amber", tokenShare: 0.13, costShare: 0.12, students: 0.64, trend: -4 },
    { label: "Assignment Marking", icon: "clipboard", tone: "purple", tokenShare: 0.10, costShare: 0.10, students: 0.37, trend: 3 },
    { label: "Voice Tutor", icon: "mic", tone: "red", tokenShare: 0.15, costShare: 0.18, students: 0.13, trend: 19 }
  ];
  const rows = featureMix.map(row => {
    const tokens = Math.round(totals.totalTokens * row.tokenShare * scale);
    const cost = Math.round(totals.totalCost * row.costShare * scale) || Math.round(tokens / 695);
    const students = Math.max(1, Math.round(totals.studentCount * row.students));
    return {
      ...row,
      cost,
      tokens,
      students,
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
  const rows = [
    { label: "GPT-5.4 Mini", value: 68, cost: 24.6, tone: "#2578f7" },
    { label: "Gemini 3 Flash", value: 18, cost: 36.8, tone: "#29b765" },
    { label: "GPT-4.1 Mini", value: 9, cost: 42.1, tone: "#ff9f16" },
    { label: "Local SLM", value: 5, cost: 12.4, tone: "#7658dc" }
  ];
  return rows.sort((left, right) => right.value - left.value);
}

function usageHighlights() {
  const totals = usageBaseTotals();
  const scale = usagePeriodScale();
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
    scale,
    totalCost,
    totalTokens,
    costPerStudent: totalCost / Math.max(1, totals.studentCount),
    mostExpensive,
    mostUsedModel
  };
}

function usageCostTrend() {
  const { totalCost } = usageHighlights();
  const labels = state.usagePeriod === "Today"
    ? ["6 AM", "9 AM", "12 PM", "3 PM", "6 PM", "9 PM"]
    : state.usagePeriod === "This Week"
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : ["May 24", "May 29", "Jun 3", "Jun 8", "Jun 13", "Jun 18", "Jun 23"];
  const shape = labels.length === 6
    ? [0.13, 0.2, 0.36, 0.54, 0.77, 0.92]
    : labels.length === 7
      ? [0.18, 0.26, 0.38, 0.31, 0.52, 0.7, 0.61]
      : [0.16, 0.19, 0.25, 0.29, 0.38, 0.47, 0.36, 0.58, 0.66, 0.5, 0.61, 0.72, 0.68, 0.78, 0.7, 0.6, 0.54, 0.46, 0.4];
  return {
    labels,
    values: shape.map(value => Math.max(1, Math.round(totalCost * value / Math.max(1, labels.length / 3))))
  };
}

function usageCostTrendChart() {
  const series = usageCostTrend();
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
    <text x="30" y="64">1,500</text><text x="30" y="109">1,200</text><text x="30" y="154">900</text><text x="30" y="199">600</text><text x="30" y="244">0</text>
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

function usageEfficiencyRows() {
  return [...usageModelRows()].sort((left, right) => left.cost - right.cost);
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
  const trendTone = row.trend >= 0 ? "up" : "down";
  return `<tr>
    <td><span class="usage-feature-name ${row.tone}">${miniIcon(row.icon)}${escapeHtml(row.label)}</span></td>
    <td>${escapeHtml(compactNumber(row.tokens))}</td>
    <td>${escapeHtml(usageMoney(row.cost))}</td>
    <td>${Number(row.students || 0).toLocaleString("en-KE")}</td>
    <td>${escapeHtml(usageMoney(row.costPerStudent))}</td>
    <td><span class="usage-trend ${trendTone}">${miniIcon("trend")}${row.trend >= 0 ? "Up" : "Down"} ${Math.abs(row.trend)}%</span></td>
  </tr>`;
}

function usageAlertRows() {
  const features = usageAllFeatureRows();
  const expensive = [...features].sort((left, right) => right.trend - left.trend)[0] || features[0];
  const stable = features.find(row => row.trend < 10 && row.trend >= 0) || features[1] || expensive;
  const model = usageModelRows()[0];
  return [
    { tone: "high", icon: "trend", title: `${expensive.label} cost rising`, body: `Up ${Math.abs(expensive.trend)}% vs last period`, badge: "High" },
    { tone: "medium", icon: "clock", title: `${stable.label} cost stable`, body: "Within normal range", badge: "Medium" },
    { tone: "low", icon: "check", title: `${model.label} within budget`, body: `${model.value}% of calls - On track`, badge: "Low" }
  ];
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
  if (!liveAgents.length) return previewSalesAgents();
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
      phone: agent.phone || "-",
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
  const fallbackSchools = assignedSchools.length
    ? assignedSchools
    : schools.filter((_, schoolIndex) => schoolIndex % Math.max(1, salesAgentSourceRows().length) === index);
  const scopedSchools = fallbackSchools.length ? fallbackSchools : schools.slice(0, 1);
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
    .filter(agent => state.selectedCounty === "All Counties" || agent.assignedSchools.some(school => school.county === state.selectedCounty))
    .filter(agent => state.selectedAgentStatus === "All Agents" || agent.status === state.selectedAgentStatus)
    .filter(agent => !term || `${agent.name} ${agent.email} ${agent.phone} ${agent.assignedSchools.map(school => `${school.name} ${school.county}`).join(" ")}`.toLowerCase().includes(term))
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
  return {
    id: school.id || `school-${index}`,
    name: school.name || "School",
    county: school.county || metadata.county || countyFromLocation(location),
    location,
    principal: school.principal || "-",
    phone: school.phone || "-",
    email: school.email || "-",
    salesAgentUserId: school.salesAgentUserId || school.sales_agent_user_id || "",
    assignedPlanCode: school.pricing?.assignedPlanCode || school.assignedPlanCode || school.assigned_plan_code || "monthly",
    subscriptionPriceKsh: Number(school.subscriptionPriceKsh ?? school.pricing?.effectivePriceKsh ?? school.pricing?.basePriceKsh ?? 0),
    discountId: school.pricing?.discount?.id || school.discountId || school.discount_id || "",
    code: school.code || metadata.code || school.slug || "-",
    type: school.schoolType || school.type || metadata.type,
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

function schoolPlanOptions(selectedPlan = "monthly") {
  return ["weekly", "monthly", "annual"]
    .map(plan => `<option value="${plan}" ${plan === selectedPlan ? "selected" : ""}>${plan[0].toUpperCase()}${plan.slice(1)}</option>`)
    .join("");
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
    principal: cleanSchoolFormValue(formData.principal),
    phone: cleanSchoolFormValue(formData.phone),
    email: cleanSchoolFormValue(formData.email),
    salesAgentUserId: cleanSchoolFormValue(formData.salesAgentUserId),
    assignedPlanCode: formData.assignedPlanCode || "monthly",
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
  return ["All Counties", ...Array.from(new Set((state.data.schools.length ? state.data.schools : previewSchools()).map(school => normalizeSchoolRow(school).county).filter(Boolean))).sort()];
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
    subscriptionPriceKsh: 500,
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
      <button class="school-manage-close" type="button" data-close-modal aria-label="Close school management">${miniIcon("close")}</button>
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
          <label class="school-form-field">
            <span>Subscription Plan</span>
            <select name="assignedPlanCode">${schoolPlanOptions(draft.assignedPlanCode)}</select>
          </label>
          <label class="school-form-field">
            <span>Subscription Price (KSh)</span>
            <input name="subscriptionPriceKsh" type="number" min="0" step="1" value="${Number(draft.subscriptionPriceKsh || 0)}" />
          </label>
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
      <p class="error-text"></p>
      <div class="school-manage-actions">
        <button type="button" class="ghost-button" data-close-modal>Cancel</button>
        <button type="submit" class="primary-button">${miniIcon("save")} ${isNew ? "Add School" : "Save Changes"}</button>
      </div>
    </form>
  </section>`;
}

function showSchool(schoolId) {
  const school = schoolRows().find(item => String(item.id) === String(schoolId))
    || sourceSchoolsForAgents().find(item => String(item.id) === String(schoolId));
  if (!school) return;
  modalRoot.classList.remove("student-modal-root");
  modalRoot.classList.add("school-modal-root");
  modalRoot.hidden = false;
  modalRoot.innerHTML = schoolManagementContent(school);
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
          ${salesDetailContact("globe", agent.assignedSchools[0]?.county || "No county")}
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
          <button type="button">View All</button>
        </div>
        <div class="sales-assigned-school-list">
          ${agent.assignedSchools.length ? agent.assignedSchools.map(salesAssignedSchoolRow).join("") : `<div class="empty-state">No assigned schools.</div>`}
        </div>
      </section>
      ${salesActivityTrend(agent)}
      <div class="sales-detail-actions">
        <button type="button" class="primary-button">${miniIcon("school")} View Schools</button>
        <button type="button" class="ghost-button">${miniIcon("chat")} Message Agent</button>
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

function renderTeacher() {
  const students = state.data.teacherStudents;
  return `
    <div class="toolbar">
      <button class="primary-button" data-modal="assignment">Set Assignment</button>
    </div>
    <section class="panel">
      <div class="panel-header"><div><h2>Students</h2><p>Live teacher performance data.</p></div></div>
      ${table(["Name", "Grade", "Assessment Score", "Completion", "Last Active", "Trend", "Actions"], students.map(student => [
        escapeHtml(student.name || student.fullName || "Student"),
        escapeHtml(student.gradeLevel || student.grade || "-"),
        percent(student.averageScore || student.assessmentScore || 0),
        percent(student.homeworkCompletion || 0),
        escapeHtml(student.lastActive || "Recent"),
        escapeHtml(student.trend || student.performanceTrend || "Stable"),
        `<div class="table-actions"><button class="primary-button" data-teacher-student="${escapeHtml(student.id || student.name)}">View</button></div>`
      ]))}
    </section>`;
}

function renderParents() {
  const student = state.data.teacherStudents.find(item => state.selectedGrade === "All Grades" || item.grade === state.selectedGrade) || state.data.teacherStudents[0];
  const name = student?.name || state.user?.name || "No learner selected";
  const grade = student?.grade || state.user?.grade || "-";
  const score = Number(student?.assessmentScore || 0);
  const completion = Number(student?.homeworkCompletion || 0);
  const health = Math.round((score + completion) / 2);
  return `
    <div class="toolbar"><div class="filters">${selectControl("selectedGrade", ["All Grades", ...grades], state.selectedGrade)}</div></div>
    <section class="panel">
      <div class="panel-header"><div><h2>${escapeHtml(name)}'s Health Meter</h2><p>Derived from live learner performance and assignment data.</p></div></div>
      <div class="two-col">
        <div class="health-meter">${gauge(health)}</div>
        <div class="kpi-stack">
          <div class="kpi-row"><strong>Grade</strong><span>${escapeHtml(grade)}</span></div>
          <div class="kpi-row"><strong>Assessment Score</strong><span>${percent(score)}</span></div>
          <div class="kpi-row"><strong>Completion</strong><span>${percent(completion)}</span></div>
          <div class="kpi-row"><strong>Overall Health</strong><span>${percent(health)}</span></div>
        </div>
      </div>
    </section>`;
}

function usagePeriodControl(label) {
  return `<button class="${state.usagePeriod === label ? "active" : ""}" type="button" data-usage-period="${escapeHtml(label)}">${escapeHtml(label)}</button>`;
}

function renderUsage() {
  const highlights = usageHighlights();
  const featureRows = usageFeatureRows();
  const allFeatures = usageAllFeatureRows();
  const mostExpensive = highlights.mostExpensive || allFeatures[0];
  const mostUsedModel = highlights.mostUsedModel || usageModelRows()[0];
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
        ${selectControl("selectedGrade", ["All Grades", ...grades], state.selectedGrade)}
        ${selectControl("selectedUsageFeature", usageFeatureOptions(), state.selectedUsageFeature)}
      </div>
    </header>

    <section class="usage-metric-grid" aria-label="Usage summary">
      ${usageMetricCard("blue", "Total Cost", usageMoney(highlights.totalCost), state.usagePeriod.toLowerCase(), "tag")}
      ${usageMetricCard("green", "Cost Per Student", usageMoney(highlights.costPerStudent), "Selected average", "profile")}
      ${usageMetricCard("amber", "Tokens Used", compactNumber(highlights.totalTokens), "Input + output", "database")}
      ${usageMetricCard("red", "Most Expensive Feature", mostExpensive?.label || "-", mostExpensive ? usageMoney(mostExpensive.cost) : "-", "chat")}
      ${usageMetricCard("purple", "Most Used Model", mostUsedModel?.label || "-", mostUsedModel ? `${mostUsedModel.value}% of calls` : "-", "brain")}
    </section>

    <section class="usage-top-grid">
      <article class="usage-panel usage-trend-panel">
        <div class="usage-panel-head">
          <div>
            <h2>Cost Trend</h2>
            <p>KSh</p>
          </div>
          <div class="usage-mini-tabs">
            ${["Day", "Week", "Month"].map(label => `<span class="${state.usagePeriod.endsWith(label) || (state.usagePeriod === "Today" && label === "Day") ? "active" : ""}">${escapeHtml(label)}</span>`).join("")}
          </div>
        </div>
        ${usageCostTrendChart()}
      </article>
      <article class="usage-panel usage-model-panel">
        <div class="usage-panel-head">
          <h2>Token Usage by Model</h2>
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
            <h2>Model Efficiency</h2>
            <p>Cost per 1K useful answers (KSh)</p>
          </div>
        </div>
        <div class="usage-efficiency-list">
          ${usageEfficiencyRows().map((row, index) => `<div class="usage-efficiency-row">
            <b style="background:${row.tone}">${index + 1}</b>
            <span><strong>${escapeHtml(row.label)}</strong><i><em style="width:${Math.min(100, Math.round((row.cost / 80) * 100))}%; background:${row.tone}"></em></i></span>
            <small>${usageMoney(row.cost)}</small>
          </div>`).join("")}
        </div>
        <p class="usage-footnote">${miniIcon("alert")} Lower cost = higher efficiency</p>
      </article>
      <article class="usage-panel usage-alert-panel">
        <div class="usage-panel-head compact">
          <h2>Alerts</h2>
          ${miniIcon("bell")}
        </div>
        <div class="usage-alert-list">
          ${usageAlertRows().map(row => `<div class="usage-alert ${row.tone}">
            ${miniIcon(row.icon)}
            <span><strong>${escapeHtml(row.title)}</strong><small>${escapeHtml(row.body)}</small></span>
            <b>${escapeHtml(row.badge)}</b>
          </div>`).join("")}
        </div>
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
      if (event.target.dataset.routeControl === "selectedCounty" && !schoolOptions().includes(state.selectedSchool)) {
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
  document.querySelectorAll("[data-sales-agent]").forEach(button => button.addEventListener("click", () => showSalesAgent(button.dataset.salesAgent)));
  document.querySelectorAll("[data-usage-period]").forEach(button => button.addEventListener("click", () => {
    state.usagePeriod = button.dataset.usagePeriod;
    renderRoute();
  }));
  document.querySelectorAll("[data-teacher-student]").forEach(button => button.addEventListener("click", () => showTeacherStudent(button.dataset.teacherStudent)));
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
        state.remedialAiReports[user.id] = {
          ...buildRemedialReport(user),
          sourceLabel: "Local fallback"
        };
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
  return `
    <section class="student-profile-hero">
      <div class="student-profile-banner"></div>
      <div class="student-profile-avatar">${studentAvatar(user.avatar, "large")}</div>
      <h3>${escapeHtml(user.name)}</h3>
      <span>${escapeHtml(user.school)}</span>
    </section>
    <section class="student-modal-card info-card">
      <h3>${miniIcon("profile")} Academic Info</h3>
      ${studentInfoRow("Grade", user.grade || "-")}
      ${studentInfoRow("Date Joined", "Jan 2024")}
      ${studentInfoRow("Last Active", user.status === "Online" ? "Just now" : "Today")}
      ${studentInfoRow("Assignments", `${studentAssignmentCount(user)} Completed`)}
      ${studentInfoRow("Tokens / KSh", `${aiUsage.totalTokens.toLocaleString("en-KE")} / ${moneyKesFromCents(aiUsage.spendKshCents)}`)}
    </section>
    <section class="student-modal-card contact-card">
      <h3>Contact Details</h3>
      ${studentInfoRow("Email", user.email || `${user.name.split(" ")[0].toLowerCase()}@example.com`)}
      ${studentInfoRow("Phone", "+254 700 000 000")}
    </section>`;
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
  if (isLocalPreviewRoute() || !state.accessToken) {
    await new Promise(resolve => window.setTimeout(resolve, 650));
    return { ...fallback, sourceLabel: "Preview analysis" };
  }
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

function showNamedModal(name) {
  if (name === "assignment") return openModal("Set Assignment", assignmentForm());
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
  if (event.target === modalRoot) closeModal();
  else modalRoot.addEventListener("click", onScrimClick, { once: true });
}

function closeModal() {
  modalRoot.classList.remove("student-modal-root", "school-modal-root", "sales-modal-root");
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
          const subscriptionPriceKsh = Number(formData.subscriptionPriceKsh || 0);
          payload.availableGrades = availableGrades;
          payload.subscriptionPriceKsh = subscriptionPriceKsh;
          const schoolId = form.dataset.schoolId;
          const response = schoolId
            ? await api(`/admin/schools/${encodeURIComponent(schoolId)}`, { method: "PATCH", body: payload })
            : await api("/admin/schools", { method: "POST", body: payload });
          upsertSchoolInState(response.school ? { ...response.school, availableGrades, subscriptionPriceKsh } : response.school);
          shouldClose = true;
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
        const errorEl = form.querySelector(".error-text");
        if (errorEl) errorEl.textContent = error.message;
      } finally {
        if (!shouldClose && form.dataset.kind === "curriculum-editor" && submitButton) {
          form.dataset.submitting = "false";
          submitButton.disabled = false;
          submitButton.removeAttribute("aria-busy");
          submitButton.classList.remove("loading");
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
      <div class="kpi-row"><strong>Roles</strong><span>${escapeHtml((user.roles || []).join(", ") || "-")}</span></div>
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
