console.log("dashboard.js is running");

let CURRENT_FILTER = "active"; 
let CURRENT_VIEW = "list"; 
let CAL_DAYS = 7;
let CAL_ANCHOR = isoToday(); 

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
  return d.toLocaleDateString('sv-SE'); 
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
  const addHabitBtn = document.getElementById("addHabitBtn");
  const calendarControls = document.getElementById("calendarControls");
  
  const calPrevBtn = document.getElementById("calPrevBtn");
  const calNextBtn = document.getElementById("calNextBtn");
  const calTodayBtn = document.getElementById("calTodayBtn");
  const calDaysSelect = document.getElementById("calDaysSelect");

  function paintTabs() {
    [activeBtn, archivedBtn, calendarBtn].forEach(b => {
      if (!b) return;
      b.classList.replace("btn-secondary", "btn-outline-secondary");
    });

    if (CURRENT_VIEW === "calendar") {
      calendarBtn?.classList.replace("btn-outline-secondary", "btn-secondary");
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

  activeBtn?.addEventListener("click", async () => { CURRENT_VIEW = "list"; CURRENT_FILTER = "active"; paintTabs(); await refreshHabits(); });
  archivedBtn?.addEventListener("click", async () => { CURRENT_VIEW = "list"; CURRENT_FILTER = "archived"; paintTabs(); await refreshHabits(); });
  calendarBtn?.addEventListener("click", async () => { CURRENT_VIEW = "calendar"; CURRENT_FILTER = "active"; paintTabs(); await refreshHabits(); });

  calPrevBtn?.addEventListener("click", async () => { CAL_ANCHOR = addDaysISO(CAL_ANCHOR, -CAL_DAYS); await refreshHabits(); });
  calNextBtn?.addEventListener("click", async () => { CAL_ANCHOR = addDaysISO(CAL_ANCHOR, CAL_DAYS); await refreshHabits(); });
  calTodayBtn?.addEventListener("click", async () => { CAL_ANCHOR = isoToday(); await refreshHabits(); });
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
      } catch (err) { alert(err.message); } 
      finally { btn.disabled = false; }
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
            body: { value: 1, note: "" }
          });
        }
        await refreshHabits(); 
      } catch (err) { alert("Ошибка: " + err.message); }
    }
  });
}

async function renderCalendarView() {
  const box = document.getElementById("habits-container");
  box.innerHTML = `<p class="text-center text-muted mt-4">Loading calendar...</p>`;

  const data = await apiRequest(`/api/habits/daily?date=${encodeURIComponent(CAL_ANCHOR)}&days=${CAL_DAYS}`);
  const dates = data.dates || [];
  const habits = data.habits || [];

  document.getElementById("habits-count").textContent = habits.length;

  if (!habits.length) {
    box.innerHTML = `<p class="text-center text-muted mt-4">No active habits to track 🎯</p>`;
    return;
  }

  const header = dates.map(d => {
    const dt = new Date(d + "T00:00:00");
    return `
      <div class="cal-head text-center">
        <div class="fw-semibold">${dt.toLocaleDateString("en-US", { weekday: "short" })}</div>
        <div class="small text-muted">${dt.toLocaleDateString("en-US", { day: "2-digit" })}</div>
      </div>`;
  }).join("");

  const rows = habits.map(h => {
    const cells = (h.cells || []).map(c => {
      const isDone = !!c.completed;
      const isTarget = c.isTargetDay !== false;
      const color = isDone ? (h.color || "#6c63ff") : "";
      
      return `
        <button type="button"
          class="cal-cell ${isDone ? "is-done" : ""}"
          style="${color ? `background:${color};border-color:${color};` : ""} opacity: ${isTarget ? 1 : 0.2}"
          data-cal-cell="1"
          data-habit-id="${h.habitId}"
          data-date="${c.date}"
          data-done="${isDone ? 1 : 0}"
          data-disabled="${!isTarget}"
          aria-label="Toggle completion">
        </button>`;
    }).join("");

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
  }).join("");

  box.innerHTML = `
    <div class="calendar-wrap">
      <div class="cal-top text-muted small mb-2">
        Showing <span class="fw-bold">${dates[0]}</span> – <span class="fw-bold">${dates[dates.length-1]}</span>
      </div>
      <div class="cal-head-row">
        <div class="cal-head-left text-muted small">Habit</div>
        <div class="cal-head-grid" style="grid-template-columns: repeat(${dates.length}, 1fr)">${header}</div>
      </div>
      <div class="cal-body">${rows}</div>
    </div>`;
}

async function refreshHabits() {
  if (CURRENT_VIEW === "calendar") await renderCalendarView();
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
  const isArchived = (h.status === "archived");
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
        <button data-action="${isArchived?'unarchive':'archive'}" data-id="${h._id}" class="btn btn-sm btn-outline-secondary rounded-pill">
          ${isArchived?'Unarchive':'Archive'}
        </button>
        <button data-action="delete" data-id="${h._id}" class="btn btn-sm btn-outline-danger rounded-pill">Delete</button>
      </div>
    </div>`;
}

async function createHabit() {
  const errEl = document.getElementById("habit-error");
  errEl.classList.add("d-none");

  const name = document.getElementById("habit-name").value.trim();
  const frequency = document.getElementById("habit-frequency").value;

  const selectedDays = Array.from(document.querySelectorAll(".day-checkbox:checked"))
    .map(cb => parseInt(cb.value, 10));

  if (!name) {
    errEl.textContent = "Name is required";
    errEl.classList.remove("d-none");
    return;
  }

  const payload = {
    name,
    description: document.getElementById("habit-desc").value.trim(),
    frequency: frequency,
    color: document.getElementById("habit-color").value,
    startDate: document.getElementById("habit-startDate").value,
    schedule: {
      daysOfWeek: frequency === "custom" ? selectedDays : []
    },
    goal: {
      type: "count",
      target: parseInt(document.getElementById("habit-target").value || "1", 10),
      unit: document.getElementById("habit-unit").value.trim(),
    },
    status: "active"
  };

  try {
    const createdHabitResp = await apiRequest("/api/habits", {
    method: "POST",
    body: payload,
  });

  const createdHabit = createdHabitResp.habit || createdHabitResp;
  console.log("HABIT CREATED:", createdHabit);

  const reminder = collectReminderData();
  console.log("REMINDER PAYLOAD:", reminder);

  if (reminder) {
    try {
      const r = await apiRequest(`/api/reminders/habits/${createdHabit._id}/reminders`, {
  method: "POST",
  body: reminder,
});
      console.log("REMINDER CREATED:", r);
      resetReminderForm();
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
    errEl.textContent = e.message;
    errEl.classList.remove("d-none");
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
      ok.classList.remove("d-none");
      setTimeout(() => ok.classList.add("d-none"), 2000);
    } catch (e) { alert(e.message); }
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
  fb.textContent = (user.username || "U")[0].toUpperCase();
  if (user.avatarUrl) {
    img.src = user.avatarUrl + "?v=" + Date.now();
    img.classList.remove("d-none"); fb.classList.add("d-none");
  } else {
    img.classList.add("d-none"); fb.classList.remove("d-none");
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
}
document.getElementById('habit-frequency')?.addEventListener('change', (e) => {
  const container = document.getElementById('custom-days-container');
  if (container) {
    container.classList.toggle('d-none', e.target.value !== 'custom');
  }
});

function normalizeHabitsArray(data) {
  return Array.isArray(data) ? data : (data.habits || data.items || []);
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"}[m]));
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

  const days = Array.from(document.querySelectorAll(".reminder-day:checked"))
    .map(cb => Number(cb.value));

  return {
    time,
    daysOfWeek: days,
    enabled: document.getElementById("reminder-enabled").checked,
    note: document.getElementById("reminder-note").value || ""
  };
}

function resetReminderForm() {
  document.getElementById("reminder-time").value = "";
  document.getElementById("reminder-note").value = "";
  document.getElementById("reminder-enabled").checked = true;
  document.querySelectorAll(".reminder-day").forEach(cb => cb.checked = false);
}