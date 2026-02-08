console.log("dashboard.js is running");

let CURRENT_FILTER = "active";            
let CURRENT_VIEW = "list";               
let CAL_DAYS = 7;
let CAL_ANCHOR = isoToday();
let STATS_CHART = null;

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/auth.html";
    return;
  }

  setupLogout();
  setupProfileSave();
  setupCreateHabit();
  setupHabitActions();
  setupHabitsTabs();

  init();
});

async function init() {
  try {
    const meResp = await apiRequest("/api/users/me");
    const user = meResp.user || meResp;
    renderProfile(user);

    document.getElementById("edit-username").value = user.username || "";
    document.getElementById("edit-email").value = user.email || "";
    document.getElementById("edit-timezone").value = user.timezone || "UTC";
  } catch (e) {
    console.error("Profile load error:", e);
    localStorage.clear();
    window.location.href = "/auth.html";
    return;
  }
  await refreshHabits();
}

function isoToday() {
  const d = new Date();
  return d.toLocaleDateString("sv-SE");
}

function addDaysISO(iso, delta) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function setupHabitsTabs() {
  const activeBtn = document.getElementById("filterActiveBtn");
  const archivedBtn = document.getElementById("filterArchivedBtn");
  const calendarBtn = document.getElementById("filterCalendarBtn");
  const statsBtn = document.getElementById("filterStatsBtn"); 
  const addHabitBtn = document.getElementById("addHabitBtn");
  const calendarControls = document.getElementById("calendarControls");

  const calPrevBtn = document.getElementById("calPrevBtn");
  const calNextBtn = document.getElementById("calNextBtn");
  const calTodayBtn = document.getElementById("calTodayBtn");
  const calDaysSelect = document.getElementById("calDaysSelect");

  function setBtnInactive(btn) {
    if (!btn) return;
    btn.classList.remove("btn-secondary");
    btn.classList.add("btn-outline-secondary");
  }

  function setBtnActive(btn) {
    if (!btn) return;
    btn.classList.remove("btn-outline-secondary");
    btn.classList.add("btn-secondary");
  }

  function paintTabs() {
  [activeBtn, archivedBtn, calendarBtn, statsBtn].forEach(b => {
    if (!b) return;
    b.classList.replace("btn-secondary", "btn-outline-secondary");
  });

  if (CURRENT_VIEW === "calendar") {
    calendarBtn?.classList.replace("btn-outline-secondary", "btn-secondary");
  } else if (CURRENT_VIEW === "stats") {
    statsBtn?.classList.replace("btn-outline-secondary", "btn-secondary");
  } else {
    const target = (CURRENT_FILTER === "active") ? activeBtn : archivedBtn;
    target?.classList.replace("btn-outline-secondary", "btn-secondary");
  }

  const isAddingAllowed = (CURRENT_VIEW === "list" && CURRENT_FILTER === "active");
  if (addHabitBtn) {
    addHabitBtn.disabled = !isAddingAllowed;
    addHabitBtn.classList.toggle("disabled", !isAddingAllowed);
  }

  if (calendarControls) {
    calendarControls.classList.toggle("d-none", CURRENT_VIEW !== "calendar");
    calendarControls.classList.toggle("d-flex", CURRENT_VIEW === "calendar");
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
    CAL_DAYS = clampInt(parseInt(calDaysSelect.value, 10), 1, 30);
    await refreshHabits();
  });

  paintTabs();
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

        if (action === "archive") await apiRequest(`/api/habits/${id}/archive`, { method: "POST" });
        else if (action === "unarchive") await apiRequest(`/api/habits/${id}/unarchive`, { method: "POST" });
        else if (action === "delete") {
          if (confirm("Delete this habit?")) await apiRequest(`/api/habits/${id}`, { method: "DELETE" });
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
        } else {
          await apiRequest(`/api/habits/${habitId}/checkins/${date}`, {
            method: "PUT",
            body: { value: 1, note: "" },
          });
        }
        await refreshHabits();
      } catch (err) {
        alert("Ошибка: " + err.message);
      }
    }
  });
}

async function refreshHabits() {
  if (CURRENT_VIEW === "calendar") await renderCalendarView();
  else if (CURRENT_VIEW === "stats") await renderStatsView();
  else await renderListView();
}

async function renderListView() {
  const box = document.getElementById("habits-container");
  box.innerHTML = `<p class="text-center text-muted mt-4">Loading...</p>`;

  const data = await apiRequest(`/api/habits?status=${CURRENT_FILTER}&limit=50`);
  const habits = normalizeHabitsArray(data);

  document.getElementById("habits-count").textContent = habits.length;

  if (!habits.length) {
    box.innerHTML = `<p class="text-center text-muted mt-4">No ${CURRENT_FILTER} habits found.</p>`;
    return;
  }

  box.innerHTML = habits.map(renderHabitCard).join("");
}

function renderHabitCard(h) {
  const goalText = h.goal?.unit ? `${h.goal.target} ${h.goal.unit}` : `${h.goal?.target || 1}`;
  const isArchived = h.status === "archived";

  return `
    <div class="habit-card" style="border-left: 5px solid ${h.color || "#6c63ff"}">
      <div class="habit-main">
        <p class="habit-title">${escapeHtml(h.name)}</p>
        <p class="habit-sub">${escapeHtml(h.description || "")}</p>
        <div class="habit-meta-row">
          <span class="meta-badge">${h.frequency}</span>
          <span class="meta-sep">|</span>
          <span class="meta-item"><span class="meta-label">Goal:</span> ${goalText}</span>
        </div>
      </div>
      <div class="habit-actions">
        <button data-action="${isArchived ? "unarchive" : "archive"}" data-id="${h._id}" class="btn btn-sm btn-outline-secondary rounded-pill">
          ${isArchived ? "Unarchive" : "Archive"}
        </button>
        <button data-action="delete" data-id="${h._id}" class="btn btn-sm btn-outline-danger rounded-pill">Delete</button>
      </div>
    </div>`;
}

async function renderCalendarView() {
  const box = document.getElementById("habits-container");
  box.innerHTML = `<p class="text-center text-muted mt-4">Loading calendar...</p>`;

  const data = await apiRequest(
    `/api/habits/daily?date=${encodeURIComponent(CAL_ANCHOR)}&days=${CAL_DAYS}`
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
          const color = isDone ? h.color || "#6c63ff" : "";

          return `
            <button type="button"
              class="cal-cell ${isDone ? "is-done" : ""}"
              style="${color ? `background:${color};border-color:${color};` : ""} opacity: ${
            isTarget ? 1 : 0.2
          }"
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
            <div class="text-muted" style="font-size:0.7rem">${h.frequency}</div>
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

  try {
    const days = 7;
    const data = await apiRequest(`/api/stats/overview?days=${days}`);

    const overview = data.overview || data;
    const totalHabits = overview.totalHabits ?? 0;
    const totalCheckins = overview.totalCheckins ?? 0;
    const completionRate = overview.completionRate ?? 0; 
    const bestStreak = overview.bestStreak ?? 0;
    const currentStreak = overview.currentStreak ?? 0;

    const ratePct =
      completionRate > 1 ? Math.round(completionRate) : Math.round(completionRate * 100);

    box.innerHTML = `
      <div class="p-3">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <h4 class="m-0">Statistics</h4>
          <span class="text-muted small">Last ${days} days</span>
        </div>

        <div class="row g-3">
          <div class="col-12 col-md-4">
            <div class="p-3 bg-white rounded-4 shadow-sm">
              <div class="text-muted small">Habits</div>
              <div class="fs-3 fw-bold">${totalHabits}</div>
            </div>
          </div>

          <div class="col-12 col-md-4">
            <div class="p-3 bg-white rounded-4 shadow-sm">
              <div class="text-muted small">Check-ins</div>
              <div class="fs-3 fw-bold">${totalCheckins}</div>
            </div>
          </div>

          <div class="col-12 col-md-4">
            <div class="p-3 bg-white rounded-4 shadow-sm">
              <div class="text-muted small">Completion</div>
              <div class="fs-3 fw-bold">${ratePct}%</div>
            </div>
          </div>

          <div class="col-12 col-md-6">
            <div class="p-3 bg-white rounded-4 shadow-sm">
              <div class="text-muted small">Current streak</div>
              <div class="fs-3 fw-bold">${currentStreak}</div>
            </div>
          </div>

          <div class="col-12 col-md-6">
            <div class="p-3 bg-white rounded-4 shadow-sm">
              <div class="text-muted small">Best streak</div>
              <div class="fs-3 fw-bold">${bestStreak}</div>
            </div>
          </div>
        </div>

        ${
          Array.isArray(overview.byDay)
            ? renderByDayBars(overview.byDay)
            : `<div class="text-muted small mt-3">
                Tip: add <code>overview.byDay</code> from backend to show a chart.
              </div>`
        }
      </div>
    `;
  } catch (e) {
    console.error("Stats load error:", e);
    box.innerHTML = `
      <div class="p-3">
        <h4>Statistics</h4>
        <div class="alert alert-warning mt-3">
          Stats endpoint is not ready or returned error: <b>${escapeHtml(e.message)}</b><br/>
          Create backend route: <code>GET /api/stats/overview?days=7</code>
        </div>
      </div>`;
  }
}

function renderByDayBars(byDay) {
  const max = Math.max(
    1,
    ...byDay.map((d) => (d.total ? (d.done / d.total) * 100 : 0))
  );

  const bars = byDay
    .map((d) => {
      const pct = d.total ? Math.round((d.done / d.total) * 100) : 0;
      const w = Math.round((pct / max) * 100);
      return `
        <div class="d-flex align-items-center gap-2 mb-2">
          <div class="text-muted small" style="width:90px">${escapeHtml(d.date)}</div>
          <div class="flex-grow-1 bg-light rounded-pill" style="height:10px;overflow:hidden;">
            <div style="width:${w}%;height:10px;background:#6c63ff;"></div>
          </div>
          <div class="text-muted small" style="width:44px;text-align:right">${pct}%</div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="mt-4">
      <div class="fw-semibold mb-2">Daily completion</div>
      <div class="bg-white rounded-4 shadow-sm p-3">
        ${bars}
      </div>
    </div>
  `;
}

async function createHabit() {
  const errEl = document.getElementById("habit-error");
  errEl?.classList.add("d-none");

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

  const payload = {
    name,
    description: document.getElementById("habit-desc").value.trim(),
    frequency,
    color: document.getElementById("habit-color").value,
    startDate: document.getElementById("habit-startDate").value,
    schedule: { daysOfWeek: frequency === "custom" ? selectedDays : [] },
    goal: {
      type: "count",
      target: parseInt(document.getElementById("habit-target").value || "1", 10),
      unit: document.getElementById("habit-unit").value.trim(),
    },
    status: "active",
  };

  try {
    const createdHabitResp = await apiRequest("/api/habits", {
      method: "POST",
      body: payload,
    });

    const createdHabit = createdHabitResp?.habit || createdHabitResp;
    console.log("HABIT CREATED:", createdHabit);

    const reminder = collectReminderData();
    console.log("REMINDER PAYLOAD:", reminder);

    if (reminder) {
      try {
        await apiRequest(`/api/reminders/habits/${createdHabit._id}/reminders`, {
          method: "POST",
          body: reminder,
        });
        console.log("REMINDER CREATED");
      } catch (e) {
        console.error("REMINDER CREATE ERROR:", e);
        alert("Habit created, but reminder was not saved");
      }
    }

    const modalEl = document.getElementById("addHabitModal");
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    modalInstance?.hide();

    document.getElementById("createHabitForm").reset();
    document.getElementById("custom-days-container").classList.add("d-none");
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
  document.getElementById("user-name").textContent = user.username || "—";
  document.getElementById("user-email").textContent = user.email || "";
  document.getElementById("user-timezone").textContent = `Timezone: ${user.timezone || "UTC"}`;
  renderAvatar(user);
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

function setupLogout() {
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "/";
  });
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

function normalizeHabitsArray(data) {
  return Array.isArray(data) ? data : data.habits || data.items || [];
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (m) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m];
  });
}

function clampInt(n, min, max) {
  return Math.max(min, Math.min(max, isNaN(n) ? min : n));
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

function collectReminderData() {
  const time = document.getElementById("reminder-time")?.value;
  if (!time) return null;

  const days = Array.from(document.querySelectorAll(".reminder-day:checked")).map((cb) =>
    Number(cb.value)
  );

  return {
    time,
    daysOfWeek: days,
    enabled: document.getElementById("reminder-enabled").checked,
    note: document.getElementById("reminder-note").value || "",
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

async function renderStatsView() {
  const box = document.getElementById("habits-container");
  box.innerHTML = `<p class="text-center text-muted mt-4">Loading stats...</p>`;

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

  const ov = resp?.overview || {};
  const byDayRaw = Array.isArray(ov.byDay) ? ov.byDay : [];
  const byDay = byDayRaw.map(d => ({
    ...d,
    rate: (d.total && d.total > 0) ? (d.done / d.total) : 0
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
          <div class="bg-white rounded-4 shadow-sm p-3">
            <div class="text-muted small">Completion</div>
            <div class="fs-3 fw-bold">${completionPercent}%</div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="bg-white rounded-4 shadow-sm p-3">
            <div class="text-muted small">Current streak</div>
            <div class="fs-3 fw-bold">${ov.currentStreak ?? 0}</div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="bg-white rounded-4 shadow-sm p-3">
            <div class="text-muted small">Best streak</div>
            <div class="fs-3 fw-bold">${ov.bestStreak ?? 0}</div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="bg-white rounded-4 shadow-sm p-3">
            <div class="text-muted small">Total habits</div>
            <div class="fs-3 fw-bold">${ov.totalHabits ?? 0}</div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-4 shadow-sm p-3 mb-3">
        <div class="fw-semibold mb-2">Daily completion %</div>
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

  renderStatsChart(byDay.slice(-30));  
  renderHeatmapYear(2026, byDay);
}

function renderStatsChart(byDay) {
  const canvas = document.getElementById("statsChart");
  if (!canvas) return;

  const labels = byDay.map(x => (x.date || "").slice(5)); 
  const rates = byDay.map(x => Math.round((x.rate || 0) * 100));

  if (STATS_CHART) STATS_CHART.destroy();

  STATS_CHART = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "Completion %", data: rates }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: { y: { beginAtZero: true, max: 100 } }
    }
  });
}

function renderHeatmap(byDay) {
  const wrap = document.getElementById("heatmapWrap");
  if (!wrap) return;

  if (!Array.isArray(byDay) || byDay.length === 0) {
    wrap.innerHTML = `<div class="text-muted small">No data yet. Make some check-ins and refresh.</div>`;
    return;
  }

  const items = byDay
    .map(d => ({
      date: d.date,
      done: d.done ?? 0,
      total: d.total ?? 0,
      rate: d.total ? (d.done / d.total) : 0
    }))
    .filter(x => x.date);

  const start = new Date(items[0].date + "T00:00:00");
  const end = new Date(items[items.length - 1].date + "T00:00:00");
  const mondayIndex = (d) => (d.getDay() + 6) % 7; 
  const gridStart = new Date(start);
  gridStart.setDate(gridStart.getDate() - mondayIndex(gridStart));

  const gridEnd = new Date(end);
  gridEnd.setDate(gridEnd.getDate() + (6 - mondayIndex(gridEnd)));

  const map = new Map(items.map(x => [x.date, x]));
  const cellSize = 34;   
  const gap = 10;
  const weeks = [];

  for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 7)) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(d);
      day.setDate(day.getDate() + i);
      const iso = day.toISOString().slice(0, 10);
      week.push({ iso, day });
    }
    weeks.push(week);
  }

  const monthLabels = [];
  for (let w = 0; w < weeks.length; w++) {
    const week = weeks[w];
    const firstOfMonth = week.find(x => x.day.getDate() === 1);
    if (firstOfMonth) {
      monthLabels.push({
        weekIndex: w,
        label: firstOfMonth.day.toLocaleString("en-US", { month: "short" })
      });
    }
  }

  const dowLabels = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  function level(rate) {
    if (rate >= 0.75) return 4;
    if (rate >= 0.50) return 3;
    if (rate >= 0.25) return 2;
    if (rate > 0) return 1;
    return 0;
  }

  function color(lvl) {
    return (
      lvl === 4 ? "#6d28d9" :
      lvl === 3 ? "#8b5cf6" :
      lvl === 2 ? "#c4b5fd" :
      lvl === 1 ? "#ede9fe" :
      "#f3f4f6"
    );
  }

  const monthRow = `
    <div style="display:flex;align-items:center;gap:${gap}px;margin-left:46px;margin-bottom:10px;">
      ${weeks.map((_, w) => {
        const m = monthLabels.find(x => x.weekIndex === w);
        return `<div style="width:${cellSize}px;text-align:left;font-size:14px;color:#6b7280;">${m ? m.label : ""}</div>`;
      }).join("")}
    </div>
  `;

  const rows = dowLabels.map((dow, rowIdx) => {
    const cells = weeks.map((week) => {
      const { iso } = week[rowIdx];
      const it = map.get(iso);
      const r = it ? it.rate : 0;
      const lvl = it ? level(r) : 0;

      const title = it
        ? `${iso}: ${Math.round(r * 100)}% (${it.done}/${it.total})`
        : iso;

      return `
        <div title="${escapeHtml(title)}"
             style="
               width:${cellSize}px;height:${cellSize}px;
               border-radius:12px;
               background:${color(lvl)};
               border:2px solid rgba(0,0,0,0.06);
               display:flex;align-items:center;justify-content:center;
               font-weight:700;color:#9ca3af;
             ">
          ${new Date(iso + "T00:00:00").getDate()}
        </div>
      `;
    }).join("");

    return `
      <div style="display:flex;align-items:center;gap:${gap}px;margin-bottom:${gap}px;">
        <div style="width:46px;color:#6b7280;font-weight:700;">${dow}</div>
        ${cells}
      </div>
    `;
  }).join("");

  const daysCount = items.length;

  wrap.innerHTML = `
    <div style="overflow-x:auto;">
      ${monthRow}
      <div style="min-width:${46 + weeks.length * (cellSize + gap)}px;">
        ${rows}
      </div>
      <div class="text-muted small mt-2">Showing ${daysCount} days</div>
    </div>
  `;
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
  if (rate >= 0.75) return "#6c63ff";   
  if (rate >= 0.5)  return "#8b83ff";
  if (rate >= 0.25) return "#c7c3ff";
  if (rate > 0)     return "#ecebff";
  return "#f3f4f6";
}

function renderHeatmapYear(year, byDay) {
  const wrap = document.getElementById("heatmapWrap");
  if (!wrap) return;

  const map = new Map();
  (byDay || []).forEach((x) => {
    if (!x?.date) return;
    const rate = x.total ? x.done / x.total : 0;
    map.set(x.date.slice(0, 10), { rate, done: x.done || 0, total: x.total || 0 });
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

  const monthHeaderCells = weeks.map((_, idx) => {
    const found = monthStarts.find(ms => ms.weekIndex === idx);
    return `<div class="hm-month">${found ? monthNames[found.m] : ""}</div>`;
  }).join("");

  const dowLabels = ["Mo","Tu","We","Th","Fr","Sa","Su"];
  const rowsHtml = dowLabels.map((dow, row) => {
    const cells = weeks.map((weekStart) => {
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
        </div>
      `;
    }).join("");

    return `
      <div class="hm-row">
        <div class="hm-dow">${dow}</div>
        <div class="hm-grid" style="grid-template-columns: repeat(${weeks.length}, var(--hm-cell));">
          ${cells}
        </div>
      </div>
    `;
  }).join("");

  wrap.innerHTML = `
    <div class="hm-wrap">
      <div class="hm-months" style="grid-template-columns: 42px repeat(${weeks.length}, var(--hm-cell));">
        <div></div>
        ${monthHeaderCells}
      </div>
      ${rowsHtml}
    </div>
  `;
}