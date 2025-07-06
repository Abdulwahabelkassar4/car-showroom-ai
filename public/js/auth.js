const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    
    const name = this.username.value.trim();
    const email = this.email.value.trim();
    const password = this.password.value.trim();
    const address =this.address.value.trim();
    const errorDiv = document.getElementById('registerError');

    // Clear previous error
    errorDiv.textContent = '';

    // ✅ Validation
    if (name.length < 3) {
      errorDiv.textContent = 'Name must be at least 3 characters long.';
      return;
    }

    if (!email.includes('@') || email.length < 5) {
      errorDiv.textContent = 'Enter a valid email.';
      return;
    }

    if (password.length < 6) {
      errorDiv.textContent = 'Password must be at least 6 characters long.';
      return;
    }
    if (address.length < 20) {
      errorDiv.textContent = 'Enter a valid address.';
      return;
    }
    // 🔁 Send API request
    const res = await fetch('/api/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, email, password, address })
});

const data = await res.json();

if (data.success && data.redirect) {
  window.location.href = data.redirect;
} else {
  errorDiv.textContent = data.error || 'Registration failed.';
}

  });
}


document.getElementById('loginForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = this.email.value.trim();
    const password = this.password.value.trim();
    const errorDiv = document.getElementById('loginError');
  
    errorDiv.textContent = '';
  
    if (!email.includes(('@')) || email.length < 11) {
      errorDiv.textContent = 'Enter a valid email.';
      return;
    }
  
    if (password.length < 6) {
      errorDiv.textContent = 'Password must be at least 6 characters long.';
      return;
    }
  
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
  
    const data = await res.json();
    if (data.success) {
      window.location.href = data.role === 'admin' ? '/admin/dashboard' : '/';
    } else {
      errorDiv.textContent = data.error || 'Login failed';
    }
  });
  