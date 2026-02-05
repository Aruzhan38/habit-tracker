const authError = document.getElementById('authError');

function showAuthError(msg) {
  if (!authError) return;
  authError.textContent = msg;
  authError.classList.remove('d-none');
}

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (authError) authError.classList.add('d-none');

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showAuthError(data.message || data.error || 'Login failed');
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user || {}));
    
    window.location.href = '/dashboard.html';
  } catch (err) {
    console.error(err);
    showAuthError('Server connection error');
  }
});

document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (authError) authError.classList.add('d-none');

  const username = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showAuthError(data.message || data.error || 'Registration failed');
      return;
    }

    const loginTabBtn = document.querySelector('#tab-login');
    const tab = new bootstrap.Tab(loginTabBtn);
    tab.show();
  } catch (err) {
    console.error(err);
    showAuthError('Server connection error');
  }
});