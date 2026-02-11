console.log("dashboard.js is running");

let CURRENT_FILTER = "active";
let CURRENT_VIEW = "list";
let CAL_DAYS = 7;
let CAL_ANCHOR = null;
let STATS_CHART = null;
let TAGS = [];
let CURRENT_TAG = null;
let CURRENT_USER = null;
let TODAY_DONE_MAP = new Map();

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/auth.html";
    return;
  }

  document.getElementById("saveEditHabitBtn")?.addEventListener("click", async () => {
    try {
      await saveEditedHabit();
    } catch (e) {
      alert(e.message);
    }
  });

  document.getElementById("edit-habit-frequency")?.addEventListener("change", (e) => {
    const container = document.getElementById("edit-custom-days-container");
    container?.classList.toggle("d-none", e.target.value !== "custom");
  });

  document.getElementById("cancelPremiumBtn")?.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to cancel Premium?")) return;

    try {
      const res = await apiRequest("/api/users/downgrade", {
        method: "POST"
      });

      alert("You are now on Free plan");
      CURRENT_USER = res.user;

      renderProfile(CURRENT_USER);

    } catch (e) {
      alert("Error: " + e.message);
    }
  });

  setupLogout();
  setupProfileSave();
  setupCreateTag();
  setupCreateHabit();
  setupHabitActions();
  setupHabitsTabs();
  setupShop();

  init();
});

async function init() {
  try {
    const meResp = await apiRequest("/api/users/me");
    const user = meResp.user || meResp;
    CURRENT_USER = user;
    CAL_ANCHOR = isoToday();
    const isPremium = !!(user.isPremium || user.plan === "premium" || user.role === "premium");
    CURRENT_USER.isPremium = isPremium;

    renderProfile(user);

    document.getElementById("edit-username").value = user.username || "";
    document.getElementById("edit-email").value = user.email || "";
    document.getElementById("edit-timezone").value = user.timezone || "UTC";

    applySavedTheme();
    ensureGamificationState();
    renderGamificationUI();
  } catch (e) {
    console.error("Profile load error:", e);
    localStorage.clear();
    window.location.href = "/auth.html";
    return;
  }

  await loadTags();
  await refreshHabits();
}

function isPremiumUser() {
  return !!(CURRENT_USER?.isPremium || CURRENT_USER?.plan === "premium" || CURRENT_USER?.role === "premium");
}

function isoToday() {
  const tz = CURRENT_USER?.timezone || "Asia/Almaty";
  return new Intl.DateTimeFormat("sv-SE", { timeZone: tz }).format(new Date());
}

function addDaysISO(iso, delta) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

function clampInt(n, min, max) {
  return Math.max(min, Math.min(max, isNaN(n) ? min : n));
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (m) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m];
  });
}

function normalizeHabitsArray(data) {
  return Array.isArray(data) ? data : data.habits || data.items || [];
}

function animateNumber(el, to, options = {}) {
  if (!el) return;

  const { duration = 900, suffix = "", from = 0, easing = "easeOut" } = options;

  const start = Number.isFinite(from) ? from : 0;
  const target = Number.isFinite(to) ? to : 0;
  const startTime = performance.now();

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = easing === "easeOut" ? easeOutCubic(progress) : progress;
    const value = Math.round(start + (target - start) * eased);
    el.textContent = String(value) + suffix;

    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function userKey() {
  const id = CURRENT_USER?._id || CURRENT_USER?.id || "anon";
  return `ht:${id}`;
}

function ensureGamificationState() {
  const key = userKey() + ":game";
  const raw = localStorage.getItem(key);
  if (raw) return;
  const state = { xp: 0, coins: 0, theme: null, purchases: {} };
  localStorage.setItem(key, JSON.stringify(state));
}

function loadGame() {
  ensureGamificationState();
  const key = userKey() + ":game";
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return { xp: 0, coins: 0, theme: null, purchases: {} };
  }
}

function saveGame(next) {
  const key = userKey() + ":game";
  localStorage.setItem(key, JSON.stringify(next));
}

function levelFromXp(xp) {
  const thresholds = [
    { name: "Beginner", min: 0 },
    { name: "Consistent", min: 250 },
    { name: "Pro", min: 650 },
    { name: "Elite", min: 1200 },
  ];
  let cur = thresholds[0];
  for (const t of thresholds) if (xp >= t.min) cur = t;
  const next = thresholds.find((t) => t.min > cur.min) || null;
  const curMin = cur.min;
  const nextMin = next ? next.min : curMin + 400;
  const span = Math.max(1, nextMin - curMin);
  const progress = Math.min(1, Math.max(0, (xp - curMin) / span));
  return { level: cur.name, progress, nextAt: nextMin };
}

function renderGamificationUI() {
  const g = loadGame();
  const lv = levelFromXp(g.xp || 0);

  const xpValue = document.getElementById("xpValue");
  const coinsValue = document.getElementById("coinsValue");
  const xpBarFill = document.getElementById("xpBarFill");
  const userStatus = document.getElementById("user-status");
  const navLevelPill = document.getElementById("navLevelPill");
  const shopCoins = document.getElementById("shopCoins");

  if (xpValue) xpValue.textContent = String(g.xp || 0);
  if (coinsValue) coinsValue.textContent = String(g.coins || 0);
  if (shopCoins) shopCoins.textContent = String(g.coins || 0);

  if (xpBarFill) xpBarFill.style.width = `${Math.round(lv.progress * 100)}%`;
  if (userStatus) userStatus.textContent = lv.level;
  if (navLevelPill) navLevelPill.textContent = lv.level;
}

function addReward({ xp = 0, coins = 0 } = {}) {
  const g = loadGame();
  g.xp = Math.max(0, (g.xp || 0) + xp);
  g.coins = Math.max(0, (g.coins || 0) + coins);
  saveGame(g);
  renderGamificationUI();
}

function setThemeColor(color) {
  document.documentElement.style.setProperty("--accent", color);
  const g = loadGame();
  g.theme = color;
  saveGame(g);
  renderGamificationUI();
}

function applySavedTheme() {
  const g = loadGame();
  if (g.theme) document.documentElement.style.setProperty("--accent", g.theme);
}

function getIconMap() {
  const key = userKey() + ":icons";
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

function setHabitIcon(habitId, icon) {
  const key = userKey() + ":icons";
  const map = getIconMap();
  map[habitId] = icon;
  localStorage.setItem(key, JSON.stringify(map));
}

function iconForHabit(h) {
  const map = getIconMap();
  const id = h?._id || h?.id;
  if (id && map[id]) return map[id];

  const name = String(h?.name || "").toLowerCase();
  const desc = String(h?.description || "").toLowerCase();
  const txt = name + " " + desc;

  if (/(water|drink|cup|литр|су)/i.test(txt)) return "💧";
  if (/(study|read|book|learn|оқу|уч)/i.test(txt)) return "📚";
  if (/(run|gym|workout|спорт|жүгір)/i.test(txt)) return "🏃‍♀️";
  if (/(sleep|bed|ұйқы|сон)/i.test(txt)) return "😴";
  if (/(medit|yoga|breath|тыныс|медит)/i.test(txt)) return "🧘";
  if (/(food|eat|diet|meal|тамақ|еда)/i.test(txt)) return "🥗";
  if (/(clean|room|wash|убор|таза)/i.test(txt)) return "🧹";
  if (/(write|journal|note|күнделік|письм)/i.test(txt)) return "📝";
  return "🎯";
}

function isDueToday(h) {
  const freq = (h?.frequency || "").toLowerCase();
  const today = new Date();
  const dow = today.getDay();
  if (freq === "daily") return true;

  const schedule = h?.schedule?.daysOfWeek;
  if (Array.isArray(schedule) && schedule.length) return schedule.includes(dow);

  if (freq === "weekly") {
    const sd = h?.startDate ? new Date(String(h.startDate).slice(0, 10) + "T12:00:00") : null;
    if (sd && !isNaN(sd.getTime())) return sd.getDay() === dow;
    return dow === 1;
  }

  return false;
}

function getTodayDone(h) {
  const id = String(h?._id || "");
  if (!id) return false;
  return TODAY_DONE_MAP.get(id) === true;
}

async function refreshTodayDoneMap() {
  TODAY_DONE_MAP = new Map();
  try {
    const today = isoToday();
    const data = await apiRequest(`/api/habits/daily?date=${encodeURIComponent(today)}&days=1`);
    const habits = Array.isArray(data?.habits) ? data.habits : [];
    for (const hh of habits) {
      const habitId = String(hh?.habitId || "");
      const cell = Array.isArray(hh?.cells) ? hh.cells[0] : null;
      const done = !!cell?.completed;
      if (habitId) TODAY_DONE_MAP.set(habitId, done);
    }
  } catch {
    TODAY_DONE_MAP = new Map();
  }
}

function hideKpis() {
  const row = document.getElementById("kpiRow");
  if (row) row.innerHTML = "";
}

async function loadAndRenderKpis() {
  if (CURRENT_VIEW !== "list") {
    hideKpis();
    return;
  }

  const row = document.getElementById("kpiRow");
  if (!row) return;

  row.innerHTML = `
    <div class="col-12">
      <div class="text-muted small">Loading dashboard...</div>
    </div>
  `;

  try {
    const stats = await apiRequest("/api/stats/overview?days=7");
    const overview = stats.overview || stats || {};
    renderKpisFromOverview(overview);
  } catch (e) {
    hideKpis();
    console.warn("KPI load failed:", e.message);
  }
}

function renderProfile(user) {
  document.getElementById("user-name").textContent = user.username || "—";
  document.getElementById("user-email").textContent = user.email || "";
  document.getElementById("user-timezone").textContent = `Timezone: ${user.timezone || "UTC"}`;

  renderAvatar(user);
  renderGamificationUI();
  renderBilling(user); 

  const plan = String(user.plan || "free").toLowerCase();
  const pill = document.getElementById("planPill");
  const sub = document.getElementById("planSubtext");
  const cancelBtn = document.getElementById("cancelPremiumBtn");

  if (pill) {
    const isPrem = plan === "premium";
    pill.textContent = isPrem ? "Premium" : "Free";
    pill.classList.toggle("bg-primary", isPrem);
    pill.classList.toggle("text-white", isPrem);
    pill.classList.toggle("bg-light", !isPrem);
    pill.classList.toggle("text-dark", !isPrem);
  }

  if (sub) {
    sub.textContent = plan === "premium"
      ? "Premium plan is active"
      : "Free plan (limited features)";
  }

  if (cancelBtn) {
    cancelBtn.classList.toggle("d-none", plan !== "premium");
  }

  if (cancelBtn) {
  if (user.plan === "premium") {
          cancelBtn.classList.remove("d-none");
  } else {
      cancelBtn.classList.add("d-none");
  }
  }

}

function renderBilling(user) {
  const container = document.getElementById("billingSection");
  if (!container) return;

  const cards = user.billing?.cards || [];

  if (!cards.length) {
    container.innerHTML = `
      <button class="btn btn-outline-primary rounded-pill"
              data-bs-toggle="modal"
              data-bs-target="#addCardModal">
        Add new card
      </button>
    `;
    return;
  }

  container.innerHTML =
    cards.map(c => `
      <div class="billing-card-line mb-2">
        💳 **** **** **** ${c.last4}
      </div>
    `).join("") +
    `
      <button class="btn btn-sm btn-outline-secondary rounded-pill mt-2"
              data-bs-toggle="modal"
              data-bs-target="#addCardModal">
        Add new card
      </button>
    `;
}

function renderKpisFromOverview(overview) {
  const el = document.getElementById("kpiRow");
  if (!el) return;

  const totalHabits = overview.totalHabits ?? 0;
  const completionRate = overview.completionRate ?? 0;
  const bestStreak = overview.bestStreak ?? 0;
  const currentStreak = overview.currentStreak ?? 0;

  const weeklyPct = Math.round((completionRate || 0) * 100);

  let todayPct = 0;
  if (Array.isArray(overview.byDay) && overview.byDay.length) {
    const last = overview.byDay[overview.byDay.length - 1];
    todayPct = last.total ? Math.round((last.done / last.total) * 100) : 0;
  }

  el.innerHTML = `
    <div class="col-6 col-lg-3">
      <div class="kpi-card2">
        <div class="kpi-top">
          <span class="kpi-label2">Today progress</span>
          <span class="kpi-chip" id="kpiTodayChip">0%</span>
        </div>
        <div class="kpi-value2" id="kpiTodayValue">0%</div>
        <div class="kpi-sub2">Today</div>
      </div>
    </div>

    <div class="col-6 col-lg-3">
      <div class="kpi-card2">
        <div class="kpi-top">
          <span class="kpi-label2">Current streak</span>
          <span class="kpi-chip">🔥</span>
        </div>
        <div class="kpi-value2" id="kpiCurrentStreak">0</div>
        <div class="kpi-sub2">days</div>
      </div>
    </div>

    <div class="col-6 col-lg-3">
      <div class="kpi-card2">
        <div class="kpi-top">
          <span class="kpi-label2">Best streak</span>
          <span class="kpi-chip">🏆</span>
        </div>
        <div class="kpi-value2" id="kpiBestStreak">0</div>
        <div class="kpi-sub2">days</div>
      </div>
    </div>

    <div class="col-6 col-lg-3">
      <div class="kpi-card2">
        <div class="kpi-top">
          <span class="kpi-label2">Weekly completion</span>
          <span class="kpi-chip" id="kpiHabitsChip">${totalHabits} habits</span>
        </div>
        <div class="kpi-value2" id="kpiWeeklyValue">0%</div>
        <div class="kpi-sub2">last 7 days</div>
      </div>
    </div>
  `;

  animateNumber(document.getElementById("kpiTodayValue"), todayPct, { suffix: "%", duration: 900 });
  animateNumber(document.getElementById("kpiTodayChip"), todayPct, { suffix: "%", duration: 650 });
  animateNumber(document.getElementById("kpiCurrentStreak"), currentStreak, { duration: 750 });
  animateNumber(document.getElementById("kpiBestStreak"), bestStreak, { duration: 750 });
  animateNumber(document.getElementById("kpiWeeklyValue"), weeklyPct, { suffix: "%", duration: 900 });
}

async function refreshHabits() {
  await loadAndRenderKpis();
  if (CURRENT_VIEW === "list") await refreshTodayDoneMap();

  if (CURRENT_VIEW === "calendar") await renderCalendarView();
  else if (CURRENT_VIEW === "stats") await renderStatsView();
  else await renderListView();
}

function setupHabitsTabs() {
  const activeBtn = document.getElementById("filterActiveBtn");
  const archivedBtn = document.getElementById("filterArchivedBtn");
  const calendarBtn = document.getElementById("filterCalendarBtn");
  const statsBtn = document.getElementById("filterStatsBtn");

  const addHabitBtn = document.getElementById("addHabitBtn");

  const calendarControls = document.getElementById("calendarControls");
  const statsControls = document.getElementById("statsControls");

  const calPrevBtn = document.getElementById("calPrevBtn");
  const calNextBtn = document.getElementById("calNextBtn");
  const calTodayBtn = document.getElementById("calTodayBtn");
  const calDaysSelect = document.getElementById("calDaysSelect");
  const calDaysCustomWrap = document.getElementById("calDaysCustomWrap");
  const calDaysCustom = document.getElementById("calDaysCustom");

  function paintTabs() {
    [activeBtn, archivedBtn, calendarBtn, statsBtn].forEach((b) => {
      if (!b) return;
      b.classList.remove("btn-secondary");
      b.classList.add("btn-outline-secondary");
    });

    if (CURRENT_VIEW === "calendar") {
      calendarBtn?.classList.remove("btn-outline-secondary");
      calendarBtn?.classList.add("btn-secondary");
    } else if (CURRENT_VIEW === "stats") {
      statsBtn?.classList.remove("btn-outline-secondary");
      statsBtn?.classList.add("btn-secondary");
    } else {
      const target = CURRENT_FILTER === "active" ? activeBtn : archivedBtn;
      target?.classList.remove("btn-outline-secondary");
      target?.classList.add("btn-secondary");
    }

    const isAddingAllowed = CURRENT_VIEW === "list" && CURRENT_FILTER === "active";
    if (addHabitBtn) {
      addHabitBtn.disabled = !isAddingAllowed;
      addHabitBtn.classList.toggle("disabled", !isAddingAllowed);
    }

    if (calendarControls) {
      calendarControls.classList.toggle("d-none", CURRENT_VIEW !== "calendar");
      calendarControls.classList.toggle("d-flex", CURRENT_VIEW === "calendar");
    }

    if (statsControls) {
      statsControls.classList.toggle("d-none", CURRENT_VIEW !== "stats");
      statsControls.classList.toggle("d-flex", CURRENT_VIEW === "stats");
    }
  }

  activeBtn?.addEventListener("click", async () => {
    CURRENT_VIEW = "list";
    CURRENT_FILTER = "active";
    paintTabs();
    await refreshHabits();
  });

  archivedBtn?.addEventListener("click", async () => {
    CURRENT_VIEW = "list";
    CURRENT_FILTER = "archived";
    paintTabs();
    await refreshHabits();
  });

  calendarBtn?.addEventListener("click", async () => {
    CURRENT_VIEW = "calendar";
    CURRENT_FILTER = "active";
    paintTabs();
    await refreshHabits();
  });

  statsBtn?.addEventListener("click", async () => {
    CURRENT_VIEW = "stats";
    CURRENT_FILTER = "active";
    paintTabs();
    await refreshHabits();
  });

  calPrevBtn?.addEventListener("click", async () => {
    CAL_ANCHOR = addDaysISO(CAL_ANCHOR, -CAL_DAYS);
    await refreshHabits();
  });

  calNextBtn?.addEventListener("click", async () => {
    CAL_ANCHOR = addDaysISO(CAL_ANCHOR, CAL_DAYS);
    await refreshHabits();
  });

  calTodayBtn?.addEventListener("click", async () => {
    CAL_ANCHOR = isoToday();
    await refreshHabits();
  });

  calDaysSelect?.addEventListener("change", async () => {
    if (calDaysSelect.value === "custom") {
      calDaysCustomWrap?.classList.remove("d-none");
      const raw = parseInt(calDaysCustom?.value || "7", 10);
      CAL_DAYS = clampInt(raw, 1, 30);
    } else {
      calDaysCustomWrap?.classList.add("d-none");
      CAL_DAYS = clampInt(parseInt(calDaysSelect.value, 10), 1, 30);
    }
    await refreshHabits();
  });

  calDaysCustom?.addEventListener("input", async () => {
    if (calDaysSelect?.value !== "custom") return;
    const raw = parseInt(calDaysCustom.value || "7", 10);
    CAL_DAYS = clampInt(raw, 1, 30);
    await refreshHabits();
  });

  paintTabs();
}

async function openEditHabit(habitId) {
  try {
    const data = await apiRequest(`/api/habits/${habitId}`);
    const h = data.habit || data;

    document.getElementById("edit-habit-name").value = h.name || "";
    document.getElementById("edit-habit-desc").value = h.description || "";
    document.getElementById("edit-habit-frequency").value = h.frequency || "daily";
    document.getElementById("edit-habit-color").value = h.color || "#6c63ff";
    document.getElementById("edit-habit-target").value = h.goal?.target || 1;
    document.getElementById("edit-habit-unit").value = h.goal?.unit || "";
    document.getElementById("edit-habit-startDate").value =
      h.startDate ? h.startDate.slice(0, 10) : "";

    const days = h.schedule?.daysOfWeek || [];
    document.querySelectorAll(".edit-day-checkbox").forEach(cb => {
      cb.checked = days.includes(Number(cb.value));
    });

    document
      .getElementById("edit-custom-days-container")
      .classList.toggle("d-none", h.frequency !== "custom");

    document.getElementById("saveEditHabitBtn").dataset.id = habitId;

    new bootstrap.Modal(document.getElementById("editHabitModal")).show();
  } catch (e) {
    alert("Failed to load habit for edit: " + e.message);
  }
}

function setupHabitActions() {
  const box = document.getElementById("habits-container");
  if (!box) return;

  box.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (btn) {
      const id = btn.dataset.id;
      const action = btn.dataset.action;

      try {
        btn.disabled = true;

        if (action === "archive") {
          await apiRequest(`/api/habits/${id}/archive`, { method: "POST" });
        }
        else if (action === "unarchive") {
          await apiRequest(`/api/habits/${id}/unarchive`, { method: "POST" });
        }
        else if (action === "delete") {
          if (confirm("Delete this habit?")) {
            await apiRequest(`/api/habits/${id}`, { method: "DELETE" });
          }
        }
        else if (action === "edit") {
          await openEditHabit(id);
        }

        await refreshHabits();
      } catch (err) {
        alert(err.message);
      } finally {
        btn.disabled = false;
      }
      return;
    }

    const cell = e.target.closest("[data-cal-cell]");
    if (cell) {
      if (cell.dataset.disabled === "true") return;

      const habitId = cell.dataset.habitId;
      const date = cell.dataset.date;
      const done = cell.dataset.done === "1";

      try {
        if (done) {
          await apiRequest(`/api/habits/${habitId}/checkins/${date}`, { method: "DELETE" });
          addReward({ xp: -10, coins: -1 });
        } else {
          await apiRequest(`/api/habits/${habitId}/checkins/${date}`, {
            method: "PUT",
            body: { value: 1, note: "" },
          });
          addReward({ xp: 10, coins: 1 });
        }
        await refreshHabits();
      } catch (err) {
        alert("Ошибка: " + err.message);
      }
    }
  });
}

async function renderListView() {
  const box = document.getElementById("habits-container");
  box.innerHTML = `<p class="text-center text-muted mt-4">Loading...</p>`;

  const tagQuery = CURRENT_TAG ? `&tag=${encodeURIComponent(CURRENT_TAG)}` : "";
  const data = await apiRequest(`/api/habits?status=${CURRENT_FILTER}${tagQuery}&limit=50`);
  const habits = normalizeHabitsArray(data);

  document.getElementById("habits-count").textContent = habits.length;

  if (!habits.length) {
    box.innerHTML = `<p class="text-center text-muted mt-4">No ${CURRENT_FILTER} habits found.</p>`;
    return;
  }

  box.innerHTML = habits.map(renderHabitCard).join("");

  document.querySelectorAll(".habit-progress > div").forEach((bar) => {
    const pct = clampInt(parseInt(bar.dataset.pct || "0", 10), 0, 100);
    requestAnimationFrame(() => (bar.style.width = pct + "%"));
  });
}

function renderHabitCard(h) {
  const isArchived = h.status === "archived";
  const due = isDueToday(h);
  const doneToday = getTodayDone(h);
  const icon = iconForHabit(h);

  const target = clampInt(parseInt(h?.goal?.target || "1", 10), 1, 1000000);
  const unit = String(h?.goal?.unit || "").trim();
  const doneCount = doneToday ? 1 : 0;
  const pct = Math.round((Math.min(target, doneCount) / target) * 100);

  const statusPill = doneToday
    ? `<span class="due-pill due-done">Done today</span>`
    : due
      ? `<span class="due-pill due-yes">Due today</span>`
      : `<span class="due-pill due-no">Not scheduled</span>`;

  const goalText = unit ? `${doneCount}/${target} ${escapeHtml(unit)}` : `${doneCount}/${target}`;

  const picker = `
    <div class="dropdown icon-dd">
      <button class="btn btn-sm btn-light border rounded-pill px-2" data-bs-toggle="dropdown" aria-expanded="false" title="Icon">😊</button>
      <ul class="dropdown-menu">
        ${["💧","📚","🏃‍♀️","😴","🧘","🥗","🧹","📝","🎯"].map((ic) => `
          <li>
            <button class="dropdown-item" data-action="pickIcon" data-id="${h._id}" data-icon="${ic}">${ic}</button>
          </li>
        `).join("")}
      </ul>
    </div>
  `;

  return `
    <div class="habit-card" style="border-left: 7px solid ${h.color || "var(--accent)"}">
      <div class="habit-left">
        <div class="habit-icon" style="background: rgba(0,0,0,0.03)">${icon}</div>
        <div class="habit-main">
          <div class="d-flex align-items-start justify-content-between gap-2">
            <div>
              <p class="habit-title">${escapeHtml(h.name)}</p>
              <p class="habit-sub">${escapeHtml(h.description || "")}</p>
            </div>
            ${picker}
          </div>

          <div class="habit-mini">
            <span class="badge-soft">${escapeHtml(h.frequency || "")}</span>
            ${statusPill}
          </div>

          <div class="habit-progress-wrap">
            <div class="habit-progress-top">
              <span>Progress</span>
              <span>${goalText}</span>
            </div>
            <div class="habit-progress">
              <div data-pct="${pct}" style="background:${h.color || "var(--accent)"}"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="habit-actions">
        <button data-action="edit" data-id="${h._id}"
                class="btn btn-sm btn-outline-primary rounded-pill">
          Edit
        </button>

        <button data-action="${isArchived ? "unarchive" : "archive"}" data-id="${h._id}"
                class="btn btn-sm btn-outline-secondary rounded-pill">
          ${isArchived ? "Unarchive" : "Archive"}
        </button>

        <button data-action="delete" data-id="${h._id}"
                class="btn btn-sm btn-outline-danger rounded-pill">
          Delete
        </button>
      </div>
    </div>`;
}

async function renderCalendarView() {
  const box = document.getElementById("habits-container");
  box.innerHTML = `<p class="text-center text-muted mt-4">Loading calendar...</p>`;

  const tagQuery = CURRENT_TAG ? `&tag=${encodeURIComponent(CURRENT_TAG)}` : "";
  const data = await apiRequest(
    `/api/habits/daily?date=${encodeURIComponent(CAL_ANCHOR)}&days=${CAL_DAYS}${tagQuery}`
  );

  const dates = data.dates || [];
  const habits = data.habits || [];

  document.getElementById("habits-count").textContent = habits.length;

  if (!habits.length) {
    box.innerHTML = `<p class="text-center text-muted mt-4">No active habits to track 🎯</p>`;
    return;
  }

  const header = dates
    .map((d) => {
      const dt = new Date(d + "T00:00:00");
      return `
        <div class="cal-head text-center">
          <div class="fw-semibold">${dt.toLocaleDateString("en-US", { weekday: "short" })}</div>
          <div class="small text-muted">${dt.toLocaleDateString("en-US", { day: "2-digit" })}</div>
        </div>`;
    })
    .join("");

  const rows = habits
    .map((h) => {
      const cells = (h.cells || [])
        .map((c) => {
          const isDone = !!c.completed;
          const isTarget = c.isTargetDay !== false;
          const color = isDone ? h.color || "var(--accent)" : "";

          return `
            <button type="button"
              class="cal-cell ${isDone ? "is-done" : ""}"
              style="${color ? `background:${color};border-color:${color};` : ""} opacity:${isTarget ? 1 : 0.2}"
              data-cal-cell="1"
              data-habit-id="${h.habitId}"
              data-date="${c.date}"
              data-done="${isDone ? 1 : 0}"
              data-disabled="${!isTarget}"
              aria-label="Toggle completion">
            </button>`;
        })
        .join("");

      return `
        <div class="cal-row">
          <div class="cal-name">
            <div class="fw-bold text-truncate" title="${escapeHtml(h.name)}">${escapeHtml(h.name)}</div>
            <div class="text-muted" style="font-size:0.7rem">${escapeHtml(h.frequency || "")}</div>
          </div>
          <div class="cal-grid" style="grid-template-columns: repeat(${dates.length}, 1fr)">
            ${cells}
          </div>
        </div>`;
    })
    .join("");

  box.innerHTML = `
    <div class="calendar-wrap">
      <div class="cal-top text-muted small mb-2">
        Showing <span class="fw-bold">${dates[0]}</span> – <span class="fw-bold">${dates[dates.length - 1]}</span>
      </div>
      <div class="cal-head-row">
        <div class="cal-head-left text-muted small">Habit</div>
        <div class="cal-head-grid" style="grid-template-columns: repeat(${dates.length}, 1fr)">${header}</div>
      </div>
      <div class="cal-body">${rows}</div>
    </div>`;
}

async function renderStatsView() {
  const box = document.getElementById("habits-container");
  box.innerHTML = `<p class="text-center text-muted mt-4">Loading stats...</p>`;
  const isPremium = CURRENT_USER?.plan === "premium";
  const lockIcon = document.getElementById("statsLockIcon");
  if (lockIcon) {
    lockIcon.classList.toggle("d-none", isPremium);
  }

  let resp;
  try {
    resp = await apiRequest(`/api/stats/overview?days=365`);
  } catch (e) {
    box.innerHTML = `
      <div class="alert alert-warning">
        Stats error: <b>${escapeHtml(e.message)}</b><br/>
        Expected: <code>GET /api/stats/overview?days=365</code>
      </div>`;
    return;
  }

  const ov = resp?.overview || resp || {};
  const byDayRaw = Array.isArray(ov.byDay) ? ov.byDay : [];
  const byDay = byDayRaw.map((d) => ({
    ...d,
    date: (d.date || "").slice(0, 10),
    rate: d.total && d.total > 0 ? d.done / d.total : 0,
  }));

  const completionPercent = Math.round((ov.completionRate || 0) * 100);

  box.innerHTML = `
    <div class="p-2">
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h4 class="fw-bold m-0">Statistics</h4>
        <div class="text-muted small">Based on your check-ins (completions)</div>
      </div>

      <div class="row g-3 mb-3">
        <div class="col-6 col-lg-3">
          <div class="bg-white rounded-4 shadow-sm p-3 stat-card">
            <div class="stat-title">Completion</div>
            <div class="stat-value">${completionPercent}%</div>
            <div class="stat-sub">overall</div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="bg-white rounded-4 shadow-sm p-3 stat-card">
            <div class="stat-title">Current streak</div>
            <div class="stat-value">${ov.currentStreak ?? 0}</div>
            <div class="stat-sub">days</div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="bg-white rounded-4 shadow-sm p-3 stat-card">
            <div class="stat-title">Best streak</div>
            <div class="stat-value">${ov.bestStreak ?? 0}</div>
            <div class="stat-sub">days</div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="bg-white rounded-4 shadow-sm p-3 stat-card">
            <div class="stat-title">Total habits</div>
            <div class="stat-value">${ov.totalHabits ?? 0}</div>
            <div class="stat-sub">tracked</div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-4 shadow-sm p-3 mb-3">
        <div class="d-flex justify-content-between align-items-center gap-2 mb-2">
          <div class="fw-semibold" id="statsChartTitle">Daily completion %</div>

          <select id="statsRange" class="form-select form-select-sm" style="width:auto">
            <option value="daily" selected>Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <canvas id="statsChart" height="120"></canvas>
      </div>

      <div class="bg-white rounded-4 shadow-sm p-3">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <div class="fw-semibold">Calendar</div>
        </div>

        <div id="heatmapWrap"></div>

        <div class="text-muted small mt-2">
          Darker = higher completion
        </div>
      </div>
    </div>
  `;

  const select = document.getElementById("statsRange");
  select?.addEventListener("change", () => renderRange(select.value));

  renderRange("daily");

  if (!isPremiumUser()) {
    lockPremiumSection("heatmapWrap", openPremiumModal);
  }

  function aggregateByWeek(arr) {
    function getISOWeekKey(dateStr) {
      const d = new Date(dateStr + "T12:00:00");
      const day = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - day + 3);
      const firstThu = new Date(d.getFullYear(), 0, 4);
      const firstDay = (firstThu.getDay() + 6) % 7;
      firstThu.setDate(firstThu.getDate() - firstDay + 3);
      const week = 1 + Math.round((d - firstThu) / (7 * 24 * 3600 * 1000));
      const year = d.getFullYear();
      return `${year}-W${String(week).padStart(2, "0")}`;
    }

    const map = new Map();
    for (const x of arr) {
      if (!x?.date) continue;
      const key = getISOWeekKey(x.date.slice(0, 10));
      const cur = map.get(key) || { key, done: 0, total: 0 };
      cur.done += x.done || 0;
      cur.total += x.total || 0;
      map.set(key, cur);
    }

    return Array.from(map.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((w) => ({
        date: w.key,
        done: w.done,
        total: w.total,
        rate: w.total ? w.done / w.total : 0,
      }));
  }

  function aggregateByMonth(arr) {
    const map = new Map();
    for (const d of arr) {
      const key = (d.date || "").slice(0, 7);
      if (!key) continue;
      const cur = map.get(key) || { key, done: 0, total: 0 };
      cur.done += d.done || 0;
      cur.total += d.total || 0;
      map.set(key, cur);
    }
    return Array.from(map.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((m) => ({
        date: m.key,
        done: m.done,
        total: m.total,
        rate: m.total ? m.done / m.total : 0,
      }));
  }

  function renderRange(range) {
    const title = document.getElementById("statsChartTitle");
    const START_DATE = "2026-01-01";
    const dailyFrom2026 = byDay.filter((d) => d.date >= START_DATE);

    if (range === "daily") {
      title && (title.textContent = "Daily completion %");
      renderStatsChart(dailyFrom2026);
      renderHeatmapYear(2026, byDay);
      return;
    }

    if (range === "weekly") {
      title && (title.textContent = "Weekly completion %");
      renderStatsChart(aggregateByWeek(dailyFrom2026));
      renderHeatmapYear(2026, byDay);
      return;
    }

    if (range === "monthly") {
      title && (title.textContent = "Monthly completion %");
      renderStatsChart(aggregateByMonth(dailyFrom2026));
      renderHeatmapYear(2026, byDay);
      return;
    }
  }
}

function renderStatsChart(byDay) {
  const canvas = document.getElementById("statsChart");
  if (!canvas || typeof Chart === "undefined") return;

  const labels = byDay.map((x) => (x.date || "").slice(5));
  const rates = byDay.map((x) => Math.round((x.rate || 0) * 100));

  if (STATS_CHART) STATS_CHART.destroy();

  STATS_CHART = new Chart(canvas, {
    type: "bar",
    data: { labels, datasets: [{ label: "Completion %", data: rates }] },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: { y: { beginAtZero: true, max: 100 } },
    },
  });
}

function isoDateLocal(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeekMonday(d) {
  const x = new Date(d);
  const jsDay = x.getDay();
  const diff = (jsDay + 6) % 7;
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function colorForRate(rate) {
  const base = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#6c63ff";
  if (rate >= 0.75) return base;
  if (rate >= 0.5) return "rgba(108,99,255,.72)";
  if (rate >= 0.25) return "rgba(108,99,255,.35)";
  if (rate > 0) return "rgba(108,99,255,.16)";
  return "#f3f4f6";
}

function renderHeatmapYear(year, byDay) {
  const wrap = document.getElementById("heatmapWrap");
  if (!wrap) return;

  const map = new Map();
  (byDay || []).forEach((x) => {
    if (!x?.date) return;
    const date = x.date.slice(0, 10);
    const rate = x.total ? x.done / x.total : 0;
    map.set(date, { rate, done: x.done || 0, total: x.total || 0 });
  });

  const yearStart = new Date(`${year}-01-01T00:00:00`);
  const yearEnd = new Date(`${year}-12-31T00:00:00`);
  const gridStart = startOfWeekMonday(yearStart);
  const gridEnd = addDays(startOfWeekMonday(addDays(yearEnd, 6)), 6);

  const weeks = [];
  for (let d = new Date(gridStart); d <= gridEnd; d = addDays(d, 7)) {
    weeks.push(new Date(d));
  }

  const monthStarts = [];
  for (let m = 0; m < 12; m++) {
    const first = new Date(year, m, 1);
    const weekIndex = Math.floor((startOfWeekMonday(first) - gridStart) / (7 * 24 * 3600 * 1000));
    monthStarts.push({ m, weekIndex });
  }

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const monthHeaderCells = weeks
    .map((_, idx) => {
      const found = monthStarts.find((ms) => ms.weekIndex === idx);
      return `<div class="hm-month">${found ? monthNames[found.m] : ""}</div>`;
    })
    .join("");

  const dowLabels = ["Mo","Tu","We","Th","Fr","Sa","Su"];

  const rowsHtml = dowLabels
    .map((dow, row) => {
      const cells = weeks
        .map((weekStart) => {
          const day = addDays(weekStart, row);
          const iso = isoDateLocal(day);

          const inYear = day >= yearStart && day <= yearEnd;
          const data = map.get(iso);
          const rate = data ? data.rate : 0;

          const bg = inYear ? colorForRate(rate) : "transparent";
          const border = inYear ? "rgba(0,0,0,0.06)" : "transparent";
          const text = inYear ? day.getDate() : "";

          const title = inYear
            ? `${iso}: ${Math.round(rate * 100)}% (${data ? data.done : 0}/${data ? data.total : 0})`
            : "";

          return `
            <div class="hm-cell"
              title="${escapeHtml(title)}"
              style="background:${bg};border-color:${border};opacity:${inYear ? 1 : 0}">
              ${text}
            </div>`;
        })
        .join("");

      return `
        <div class="hm-row">
          <div class="hm-dow">${dow}</div>
          <div class="hm-grid" style="grid-template-columns: repeat(${weeks.length}, var(--hm-cell));">
            ${cells}
          </div>
        </div>`;
    })
    .join("");

  wrap.innerHTML = `
    <div class="hm-wrap">
      <div class="hm-months" style="grid-template-columns: 42px repeat(${weeks.length}, var(--hm-cell));">
        <div></div>
        ${monthHeaderCells}
      </div>
      ${rowsHtml}
    </div>`;
}

function lockPremiumSection(wrapperId, onClick) {
  const wrap = document.getElementById(wrapperId);
  if (!wrap) return;
  if (wrap.closest(".premium-locked")) return;

  const parent = wrap.parentElement;
  if (!parent) return;

  const locked = document.createElement("div");
  locked.className = "premium-locked";

  const blur = document.createElement("div");
  blur.className = "premium-blur";
  blur.appendChild(wrap);

  const overlay = document.createElement("div");
  overlay.className = "premium-overlay";
  overlay.innerHTML = `
    <div>
      <div class="premium-badge">PREMIUM</div>
      <p class="premium-title">Calendar Heatmap is locked</p>
      <p class="premium-sub">Click to compare plans and unlock</p>
    </div>
  `;

  overlay.addEventListener("click", onClick);

  locked.appendChild(blur);
  locked.appendChild(overlay);

  parent.appendChild(locked);
}

function openPremiumModal() {
  const el = document.getElementById("premiumModal");
  if (!el) return;
  const modal = bootstrap.Modal.getOrCreateInstance(el);
  modal.show();
}

function setupCreateHabit() {
  document.getElementById("createHabitForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await createHabit();
  });

  document.getElementById("habit-frequency")?.addEventListener("change", (e) => {
    const container = document.getElementById("custom-days-container");
    if (container) container.classList.toggle("d-none", e.target.value !== "custom");
  });
}

async function createHabit() {
  const errEl = document.getElementById("habit-error");
  errEl?.classList.add("d-none");

  const selectedTags = Array.from(document.querySelectorAll(".habit-tag-checkbox:checked")).map(
    (cb) => cb.value
  );

  const name = document.getElementById("habit-name").value.trim();
  const frequency = document.getElementById("habit-frequency").value;

  const selectedDays = Array.from(document.querySelectorAll(".day-checkbox:checked")).map((cb) =>
    parseInt(cb.value, 10)
  );

  if (!name) {
    if (errEl) {
      errEl.textContent = "Name is required";
      errEl.classList.remove("d-none");
    }
    return;
  }

  if (!selectedTags.length) {
    if (errEl) {
      errEl.textContent = "Select at least one tag";
      errEl.classList.remove("d-none");
    }
    return;
  }

  const payload = {
    name,
    description: document.getElementById("habit-desc").value.trim(),
    frequency,
    color: document.getElementById("habit-color").value,
    startDate: document.getElementById("habit-startDate").value,
    schedule: { daysOfWeek: frequency === "custom" ? selectedDays : [] },
    tags: selectedTags,
    goal: {
      type: "count",
      target: parseInt(document.getElementById("habit-target").value || "1", 10),
      unit: document.getElementById("habit-unit").value.trim(),
    },
    status: "active",
  };

  try {
    const createdHabitResp = await apiRequest("/api/habits", { method: "POST", body: payload });
    const createdHabit = createdHabitResp?.habit || createdHabitResp;

    const icon = document.getElementById("habit-icon")?.value || "🎯";
    if (createdHabit?._id) setHabitIcon(createdHabit._id, icon);

    const reminder = collectReminderData();
    if (reminder) {
      try {
        await apiRequest(`/api/reminders/habits/${createdHabit._id}/reminders`, {
          method: "POST",
          body: reminder,
        });
      } catch (e) {
        console.error("REMINDER CREATE ERROR:", e);
        alert("Habit created, but reminder was not saved");
      }
    }

    const modalEl = document.getElementById("addHabitModal");
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    modalInstance?.hide();

    document.getElementById("createHabitForm").reset();
    document.getElementById("custom-days-container")?.classList.add("d-none");
    document.querySelectorAll(".habit-tag-checkbox").forEach((cb) => (cb.checked = false));
    resetReminderForm();

    CURRENT_VIEW = "list";
    CURRENT_FILTER = "active";
    await refreshHabits();
  } catch (e) {
    if (errEl) {
      errEl.textContent = e.message;
      errEl.classList.remove("d-none");
    } else {
      alert(e.message);
    }
  }
}

function setupProfileSave() {
  document.getElementById("saveProfileBtn")?.addEventListener("click", async () => {
    const ok = document.getElementById("profile-success");
    const avatarFile = document.getElementById("avatarFile");

    try {
      if (avatarFile?.files?.[0]) {
        const updated = await uploadAvatar(avatarFile.files[0]);
        renderProfile(updated);
        avatarFile.value = "";
      }

      const payload = {
        username: document.getElementById("edit-username").value.trim(),
        email: document.getElementById("edit-email").value.trim(),
        timezone: document.getElementById("edit-timezone").value.trim() || "UTC",
      };

      const resp = await apiRequest("/api/users/me", { method: "PATCH", body: payload });
      renderProfile(resp.user || resp);

      ok?.classList.remove("d-none");
      setTimeout(() => ok?.classList.add("d-none"), 2000);
    } catch (e) {
      alert(e.message);
    }
  });
}

function renderProfile(user) {
  const badge = document.getElementById("premiumBadge");
  if (badge) {
    badge.classList.toggle("d-none", user.plan !== "premium");
  }
  document.getElementById("user-name").textContent = user.username || "—";
  document.getElementById("user-email").textContent = user.email || "";
  document.getElementById("user-timezone").textContent = `Timezone: ${user.timezone || "UTC"}`;
  renderAvatar(user);
  renderGamificationUI();
  renderBilling(user);
}

function renderAvatar(user) {
  const img = document.getElementById("avatar-img");
  const fb = document.getElementById("avatar-fallback");
  if (!fb || !img) return;

  fb.textContent = (user.username || "U")[0].toUpperCase();

  if (user.avatarUrl) {
    img.src = user.avatarUrl + "?v=" + Date.now();
    img.classList.remove("d-none");
    fb.classList.add("d-none");
  } else {
    img.classList.add("d-none");
    fb.classList.remove("d-none");
  }
}

async function uploadAvatar(file) {
  const form = new FormData();
  form.append("avatar", file);

  const res = await fetch("/api/users/me/avatar", {
    method: "POST",
    headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    body: form,
  });

  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.user;
}

function setupLogout() {
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "/";
  });
}

function collectReminderData() {
  const time = document.getElementById("reminder-time")?.value;
  if (!time) return null;

  const days = Array.from(document.querySelectorAll(".reminder-day:checked")).map((cb) =>
    Number(cb.value)
  );

  return {
    time,
    daysOfWeek: days,
    enabled: document.getElementById("reminder-enabled")?.checked ?? true,
    note: document.getElementById("reminder-note")?.value || "",
  };
}

function resetReminderForm() {
  const t = document.getElementById("reminder-time");
  const n = document.getElementById("reminder-note");
  const en = document.getElementById("reminder-enabled");

  if (t) t.value = "";
  if (n) n.value = "";
  if (en) en.checked = true;

  document.querySelectorAll(".reminder-day").forEach((cb) => (cb.checked = false));
}

async function loadTags() {
  try {
    TAGS = await apiRequest("/api/tags");
    renderTagsFilter();
  } catch (e) {
    console.error("Tags load error", e);
  }
}

function setupCreateTag() {
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("#createTagBtn");
    if (!btn) return;

    const errEl = document.getElementById("tag-error");
    errEl?.classList.add("d-none");

    const nameEl = document.getElementById("new-tag-name");
    const colorEl = document.getElementById("new-tag-color");

    const name = nameEl?.value?.trim();
    const color = colorEl?.value || "#22c55e";

    if (!name) {
      if (errEl) {
        errEl.textContent = "Tag name is required";
        errEl.classList.remove("d-none");
      }
      return;
    }

    try {
      btn.disabled = true;
      await apiRequest("/api/tags", { method: "POST", body: { name, color } });
      if (nameEl) nameEl.value = "";
      await loadTags();
      renderTagsInHabitForm();
    } catch (e2) {
      console.error("Create tag error:", e2);
      if (errEl) {
        errEl.textContent = e2.message || "Failed to create tag";
        errEl.classList.remove("d-none");
      }
    } finally {
      btn.disabled = false;
    }
  });
}

function renderTagsFilter() {
  const box = document.getElementById("tagsFilter");
  if (!box) return;

  box.innerHTML = `
    <li>
      <button class="dropdown-item ${!CURRENT_TAG ? "active" : ""}" data-tag="">
        All
      </button>
    </li>
    ${TAGS.map(
      (t) => `
      <li>
        <button class="dropdown-item ${CURRENT_TAG === t._id ? "active" : ""}"
                data-tag="${t._id}">
          <span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:${t.color};margin-right:8px;"></span>
          ${escapeHtml(t.name)}
        </button>
      </li>`
    ).join("")}
  `;

  box.querySelectorAll("button[data-tag]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const tag = btn.dataset.tag || "";
      CURRENT_TAG = tag ? tag : null;
      await refreshHabits();
    });
  });
}

function renderTagsInHabitForm() {
  const box = document.getElementById("habitTags");
  if (!box) return;

  if (!Array.isArray(TAGS) || TAGS.length === 0) {
    box.innerHTML = `<div class="text-muted small">No tags yet</div>`;
    return;
  }

  box.innerHTML = TAGS.map(
    (t) => `
      <label class="btn btn-sm btn-outline-secondary rounded-pill">
        <input type="checkbox" class="habit-tag-checkbox d-none" value="${t._id}">
        ${escapeHtml(t.name)}
      </label>
    `
  ).join("");

  box.querySelectorAll("label").forEach((label) => {
    const input = label.querySelector("input");
    input.addEventListener("change", () => {
      label.classList.toggle("btn-primary", input.checked);
      label.classList.toggle("btn-outline-secondary", !input.checked);
    });
  });
}

function setupShop() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".shop-item");
    if (!btn) return;

    const type = btn.dataset.shop;
    const value = btn.dataset.value || "";
    const cost = clampInt(parseInt(btn.dataset.cost || "0", 10), 0, 999999);

    const err = document.getElementById("shopError");
    const ok = document.getElementById("shopOk");
    err?.classList.add("d-none");
    ok?.classList.add("d-none");

    const g = loadGame();
    if (cost > (g.coins || 0)) {
      if (err) {
        err.textContent = "Not enough coins";
        err.classList.remove("d-none");
      }
      return;
    }

    if (type === "theme") {
      const isPremium = CURRENT_USER?.plan === "premium";

      if (!isPremium && cost > 0) {
        const modal = new bootstrap.Modal(document.getElementById("premiumModal"));
        modal.show();
        return;
      }

      g.coins = Math.max(0, (g.coins || 0) - cost);
      g.purchases = g.purchases || {};
      g.purchases[`theme:${value}`] = true;
      saveGame(g);
      setThemeColor(value);

      if (ok) ok.classList.remove("d-none");
      setTimeout(() => ok?.classList.add("d-none"), 1200);
      return;
    }
  });

  const shopModal = document.getElementById("shopModal");
  shopModal?.addEventListener("shown.bs.modal", () => {
    renderGamificationUI();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("addHabitModal");
  if (!modal) return;

  modal.addEventListener("shown.bs.modal", () => {
    renderTagsInHabitForm();
  });
});

document.addEventListener("click", async (e) => {
  if (e.target.id === "upgradeBtn") {
    try {
      await apiRequest("/api/users/upgrade", { method: "POST" });

      alert("Welcome to Premium 🎉");
      location.reload();
    } catch (err) {
      alert(err.message);
    }
  }
});

function onlyDigits(s) {
  return (s || "").replace(/\D/g, "");
}

function formatCardNumber(v) {
  const d = onlyDigits(v).slice(0, 16);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function updateCardPreview() {
  const num = onlyDigits(document.getElementById("cardNumber")?.value);
  const last4 = (num || "").slice(-4) || "0000";
  const name = (document.getElementById("cardName")?.value || "YOUR NAME").toUpperCase();

  const mm = onlyDigits(document.getElementById("cardExpMM")?.value || "").slice(0, 2) || "MM";
  const yy = onlyDigits(document.getElementById("cardExpYY")?.value || "").slice(0, 2) || "YY";

  const elLast4 = document.getElementById("previewLast4");
  const elName = document.getElementById("previewName");
  const elMM = document.getElementById("previewMM");
  const elYY = document.getElementById("previewYY");

  if (elLast4) elLast4.textContent = last4;
  if (elName) elName.textContent = name;
  if (elMM) elMM.textContent = mm;
  if (elYY) elYY.textContent = yy;
}

document.addEventListener("DOMContentLoaded", () => {
  const n = document.getElementById("cardNumber");
  const mm = document.getElementById("cardExpMM");
  const yy = document.getElementById("cardExpYY");
  const cvc = document.getElementById("cardCvc");
  const name = document.getElementById("cardName");
  const save = document.getElementById("saveCardBtn");

  if (!save) return;

  n?.addEventListener("input", () => {
    n.value = formatCardNumber(n.value);
    updateCardPreview();
  });

  [mm, yy, cvc].forEach((el) => {
    el?.addEventListener("input", () => {
      el.value = onlyDigits(el.value).slice(0, el === cvc ? 4 : 2);
      updateCardPreview();
    });
  });

  name?.addEventListener("input", updateCardPreview);

  updateCardPreview();

  save.addEventListener("click", async (e) => {
    e.preventDefault();

    try {
      if (!window.api || typeof window.api.post !== "function") {
        alert("API helper not loaded. Check /js/api.js is included before dashboard.js");
        return;
      }

      const number = onlyDigits(n?.value).slice(0, 16);
      const expMonthRaw = onlyDigits(mm?.value).slice(0, 2);
      const expYearRaw = onlyDigits(yy?.value).slice(0, 2);

      if (number.length !== 16) return alert("Enter 16-digit card number");
      if (expMonthRaw.length !== 2 || expYearRaw.length !== 2) return alert("Invalid expiry date");

      const expMonthNum = parseInt(expMonthRaw, 10);
      if (Number.isNaN(expMonthNum) || expMonthNum < 1 || expMonthNum > 12) {
        return alert("Invalid expiry month");
      }

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      const expYearNum = 2000 + parseInt(expYearRaw, 10); // YY -> 20YY
      if (expYearNum < currentYear) return alert("Invalid expiry year");
      if (expYearNum === currentYear && expMonthNum < currentMonth) return alert("Card is expired");

      const payload = {
        number,
        expMonth: pad2(expMonthNum),
        expYear: String(expYearNum),
      };

      await window.api.post("/api/billing/cards", payload);

      const mEl = document.getElementById("addCardModal");
      if (mEl) bootstrap.Modal.getOrCreateInstance(mEl).hide();

      alert("Card saved ✅");
      location.reload();
    } catch (err) {
      console.error("Save card error:", err);
      alert(`Save failed: ${err?.message || "Check console"}`);
    }
  });
});