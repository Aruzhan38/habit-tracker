document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (res.ok) {
            const data = await res.json();
            
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            if (data.user.role === 'admin') {
                window.location.href = '/admin.html';
            } else {
                window.location.href = '/index.html';
            }
        } else {
            const data = await res.json();
            alert(data.message || 'Login failed');
        }
    } catch (err) {
        console.error('Auth error:', err);
        alert('Server connection error');
    }
});


document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await res.json(); 

        if (res.ok) {
            const firstTabEl = document.querySelector('#tab-login');
            const firstTab = new bootstrap.Tab(firstTabEl);
            firstTab.show();
        } else {
            alert(data.message || 'Registration failed');
        }
    } catch (err) {
        console.error('Reg error:', err);
        alert('Server connection error');
    }
});