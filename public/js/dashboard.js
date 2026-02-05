console.log("dashboard.js is running");

let CURRENT_FILTER = "active"; 

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
  setupHabitsFilter();

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

  await safeLoadHabits();
}


function setupLogout() {
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "/";
  });
}

function setupHabitsFilter() {
  const activeBtn = document.getElementById("filterActiveBtn");
  const archivedBtn = document.getElementById("filterArchivedBtn");
  const addHabitBtn = document.getElementById("addHabitBtn");

  function paint() {
    if (CURRENT_FILTER === "active") {
      activeBtn.classList.add("btn-secondary");
      activeBtn.classList.remove("btn-outline-secondary");

      archivedBtn.classList.add("btn-outline-secondary");
      archivedBtn.classList.remove("btn-secondary");

      addHabitBtn.disabled = false;
      addHabitBtn.classList.remove("disabled");
    } else {
      archivedBtn.classList.add("btn-secondary");
      archivedBtn.classList.remove("btn-outline-secondary");

      activeBtn.classList.add("btn-outline-secondary");
      activeBtn.classList.remove("btn-secondary");

      addHabitBtn.disabled = true;
      addHabitBtn.classList.add("disabled");
    }
  }

  activeBtn?.addEventListener("click", async () => {
    CURRENT_FILTER = "active";
    paint();
    await safeLoadHabits();
  });

  archivedBtn?.addEventListener("click", async () => {
    CURRENT_FILTER = "archived";
    paint();
    await safeLoadHabits();
  });

  paint();
}

function setupProfileSave() {
  const saveBtn = document.getElementById("saveProfileBtn");
  const avatarFile = document.getElementById("avatarFile");

  saveBtn?.addEventListener("click", async () => {
    const err = document.getElementById("profile-error");
    const ok = document.getElementById("profile-success");
    err.classList.add("d-none");
    ok.classList.add("d-none");

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

      Object.keys(payload).forEach((k) => !payload[k] && delete payload[k]);

      const resp = await apiRequest("/api/users/me", {
        method: "PATCH",
        body: payload,
      });

      renderProfile(resp.user || resp);

      ok.classList.remove("d-none");
      setTimeout(() => ok.classList.add("d-none"), 1200);
    } catch (e) {
      err.textContent = e.message;
      err.classList.remove("d-none");
    }
  });
}

function setupCreateHabit() {
  const form = document.getElementById("createHabitForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await createHabit();
  });
}

function setupHabitActions() {
  const box = document.getElementById("habits-container");
  if (!box) return;

  box.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;

    try {
      btn.disabled = true;

      if (action === "archive") {
        await archiveHabit(id);
      } else if (action === "unarchive") {
        await unarchiveHabit(id);
      } else if (action === "delete") {
        if (confirm("Delete this habit?")) {
          await deleteHabit(id);
        }
      }
    } catch (err) {
      alert(err.message || "Action failed");
    } finally {
      btn.disabled = false;
    }
  });
}


function renderProfile(user) {
  document.getElementById("user-name").textContent = user.username || "—";
  document.getElementById("user-email").textContent = user.email || "";
  document.getElementById("user-timezone").textContent =
    user.timezone ? `Timezone: ${user.timezone}` : "Timezone: UTC";
  renderAvatar(user);
}

function renderAvatar(user) {
  const img = document.getElementById("avatar-img");
  const fb = document.getElementById("avatar-fallback");

  const letter = (user.username || user.email || "U").trim()[0]?.toUpperCase() || "U";
  fb.textContent = letter;

  if (user.avatarUrl) {
    img.src = user.avatarUrl + "?v=" + Date.now();
    img.classList.remove("d-none");
    fb.classList.add("d-none");
  } else {
    img.classList.add("d-none");
    fb.classList.remove("d-none");
  }
}


async function safeLoadHabits() {
  try {
    await loadHabits();
  } catch (e) {
    console.error("Habits load failed:", e);
    document.getElementById("habits-container").innerHTML = `
      <div class="alert alert-danger">Habits load failed: ${escapeHtml(e.message || "")}</div>`;
  }
}

async function loadHabits() {
  const box = document.getElementById("habits-container");
  box.innerHTML = `<p class="text-center text-muted mt-4">Loading...</p>`;

  const data = await apiRequest(`/api/habits?status=${CURRENT_FILTER}&limit=50`);

  let habits = [];
  if (Array.isArray(data)) habits = data;
  else if (Array.isArray(data.habits)) habits = data.habits;
  else if (Array.isArray(data.items)) habits = data.items;

  document.getElementById("habits-count").textContent = habits.length;

  if (!habits.length) {
    box.innerHTML =
      CURRENT_FILTER === "archived"
        ? `<p class="text-center text-muted mt-4">No archived habits yet 📦</p>`
        : `<p class="text-center text-muted mt-4">No habits yet. Create your first one 🎯</p>`;
    return;
  }

  box.innerHTML = habits.map(renderHabitCard).join("");
}

function renderHabitCard(h) {
  const freq = formatFrequency(h.frequency);
  const goal = h.goal?.target ?? 1;
  const unit = (h.goal?.unit || "").trim();
  const goalText = unit ? `${goal} ${unit}` : `${goal}`;
  const start = h.startDate ? formatDate(h.startDate) : "";

  const status = (h.status || "").toLowerCase();
  const isArchived = status === "archived";

  return `
    <div class="habit-card" style="border-left-color:${escapeHtml(h.color || "#6c63ff")}">
      <div class="habit-main">
        <p class="habit-title">${escapeHtml(h.name)}</p>
        <p class="habit-sub">${escapeHtml(h.description || "")}</p>

        <div class="habit-meta-row">
          <span class="meta-badge">${escapeHtml(freq)}</span>

          <span class="meta-sep">|</span>
          <span class="meta-item"><span class="meta-label">Goal:</span> <span class="meta-value">${escapeHtml(goalText)}</span></span>

          ${start ? `<span class="meta-sep">|</span>
          <span class="meta-item"><span class="meta-label">Start:</span> <span class="meta-value">${escapeHtml(start)}</span></span>` : ""}
        </div>
      </div>

      <div class="habit-actions">
        ${
          isArchived
            ? `<button data-action="unarchive" data-id="${escapeHtml(h._id)}" class="btn btn-sm btn-outline-secondary rounded-pill">
                 Unarchive
               </button>`
            : `<button data-action="archive" data-id="${escapeHtml(h._id)}" class="btn btn-sm btn-outline-secondary rounded-pill">
                 Archive
               </button>`
        }

        <button data-action="delete" data-id="${escapeHtml(h._id)}" class="btn btn-sm btn-outline-danger rounded-pill">
          Delete
        </button>
      </div>
    </div>
  `;
}


async function createHabit() {
  const errEl = document.getElementById("habit-error");
  errEl.classList.add("d-none");

  const name = document.getElementById("habit-name").value.trim();
  const description = document.getElementById("habit-desc").value.trim();
  const frequency = document.getElementById("habit-frequency").value;
  const color = document.getElementById("habit-color").value;
  const startDate = document.getElementById("habit-startDate").value;
  const target = parseInt(document.getElementById("habit-target").value || "1", 10);
  const unit = document.getElementById("habit-unit").value.trim();

  if (!name) {
    errEl.textContent = "Name is required";
    errEl.classList.remove("d-none");
    return;
  }

  try {
    await apiRequest("/api/habits", {
      method: "POST",
      body: {
        name,
        description,
        frequency,
        color,
        startDate,
        goal: { target: Math.max(target, 1), unit },
      },
    });

    const modalEl = document.getElementById("addHabitModal");
    bootstrap.Modal.getInstance(modalEl)?.hide();

    document.getElementById("createHabitForm")?.reset();

    CURRENT_FILTER = "active";
    setupHabitsFilter();
    await safeLoadHabits();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.classList.remove("d-none");
  }
}

async function archiveHabit(id) {
  await apiRequest(`/api/habits/${id}/archive`, { method: "POST" });
  await safeLoadHabits();
}

async function unarchiveHabit(id) {
  await apiRequest(`/api/habits/${id}/unarchive`, { method: "POST" });
  await safeLoadHabits();
}

async function deleteHabit(id) {
  await apiRequest(`/api/habits/${id}`, { method: "DELETE" });
  await safeLoadHabits();
}


function formatFrequency(f) {
  const v = (f || "daily").toLowerCase();
  if (v === "daily") return "Daily";
  if (v === "weekly") return "Weekly";
  if (v === "custom") return "Custom";
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function formatDate(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function uploadAvatar(file) {
  if (file.size > 2 * 1024 * 1024) throw new Error("File too large (max 2MB)");
  if (!file.type.startsWith("image/")) throw new Error("Only images allowed");

  const form = new FormData();
  form.append("avatar", file);

  const res = await fetch("/api/users/me/avatar", {
    method: "POST",
    headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Upload failed");
  return data.user;
}