import { signInCustomer, checkIsAdmin, friendlyAuthError, watchAuth } from './auth.js';

watchAuth(async (user) => {
  if (user && await checkIsAdmin(user.uid)) {
    window.location.href = 'index.html';
  }
});

document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const errEl = document.getElementById('adminLoginError');
  errEl.textContent = '';
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    const user = await signInCustomer({ email: form.email.value, password: form.password.value });
    const admin = await checkIsAdmin(user.uid);
    if (!admin) {
      errEl.textContent = 'This account does not have admin access.';
      btn.disabled = false;
      return;
    }
    window.location.href = 'index.html';
  } catch (err) {
    errEl.textContent = friendlyAuthError(err);
    btn.disabled = false;
  }
});
