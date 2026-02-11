async function apiRequest(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  const token = localStorage.getItem('token');
  if (token) headers.Authorization = `Bearer ${token}`;

  if (!isForm) headers['Content-Type'] = 'application/json';

  const res = await fetch(path, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  if (!res.ok) {
    const err = new Error((data && (data.message || data.error)) || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

function escapeHtml(s) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

window.api = {
  async request(path, options = {}) {
    const token = localStorage.getItem("token");
    const headers = {
      ...(options.headers || {}),
      "Content-Type": "application/json",
    };
    if (token) headers.Authorization = "Bearer " + token;

    const res = await fetch(path, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || "Request failed");
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  },

  get(path) {
    return this.request(path, { method: "GET" });
  },
  post(path, body) {
    return this.request(path, { method: "POST", body: JSON.stringify(body) });
  },
  patch(path, body) {
    return this.request(path, { method: "PATCH", body: JSON.stringify(body) });
  },
  del(path) {
    return this.request(path, { method: "DELETE" });
  },
};