// ==========================================================
// ADMIN PANEL LOGIC (admin/index.html)
// ==========================================================

import { db } from './firebase-config.js';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { watchAuth, signOutUser, checkIsAdmin } from './auth.js';
import { uploadImageFile } from './storage-upload.js';

let products = [];
let orders = [];
let vouchers = [];
let heroSlides = [];

/* ---------------- Auth gate ---------------- */
watchAuth(async (user) => {
  if (!user) { window.location.href = 'login.html'; return; }
  const admin = await checkIsAdmin(user.uid);
  if (!admin) {
    alert('This account does not have admin access.');
    await signOutUser();
    window.location.href = 'login.html';
    return;
  }
  document.getElementById('adminUser').textContent = user.email;
  startListeners();
});

document.getElementById('signOutBtn').addEventListener('click', () => signOutUser());

/* ---------------- Tabs ---------------- */
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
    document.getElementById('panel-' + btn.dataset.tab).style.display = 'block';
    document.getElementById('adminTitle').textContent = btn.textContent;
  });
});

/* ---------------- Live data ---------------- */
function startListeners() {
  onSnapshot(collection(db, 'products'), (snap) => {
    products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderProducts();
    renderStats();
  });
  onSnapshot(collection(db, 'orders'), (snap) => {
    orders = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    renderOrders();
    renderStats();
  });
  onSnapshot(collection(db, 'vouchers'), (snap) => {
    vouchers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderVouchers();
  });
  onSnapshot(collection(db, 'heroSlides'), (snap) => {
    heroSlides = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    renderHeroSlides();
  });
}

function renderStats() {
  document.getElementById('statProducts').textContent = products.length;
  document.getElementById('statOrders').textContent = orders.length;
  // Only fulfilled orders count toward total sales — this stays in sync
  // automatically since it's recalculated every time an order's status changes.
  const revenue = orders
    .filter(o => o.status === 'fulfilled')
    .reduce((s, o) => s + (o.total || 0), 0);
  document.getElementById('statRevenue').textContent = 'PKR ' + revenue.toLocaleString();
  const pending = orders.filter(o => o.status === 'pending').length;
  document.getElementById('statPending').textContent = pending;
}

/* ---------------- Products ---------------- */
function renderProducts() {
  const tbody = document.getElementById('productsBody');
  if (products.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">No products yet. Click "Add product" to create one.</td></tr>`;
    return;
  }
  tbody.innerHTML = products.map(p => `
    <tr>
      <td><img class="thumb-sm" src="${p.imageUrl || ''}" alt="" onerror="this.style.visibility='hidden'"></td>
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.category || '—')}</td>
      <td>PKR ${Number(p.price || 0).toLocaleString()}</td>
      <td class="row-actions">
        <button class="btn small outline" data-edit="${p.id}">Edit</button>
        <button class="btn small danger" data-del="${p.id}">Delete</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openProductModal(b.dataset.edit)));
  tbody.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
    if (confirm('Delete this product?')) await deleteDoc(doc(db, 'products', b.dataset.del));
  }));
}

function openProductModal(id) {
  const p = id ? products.find(x => x.id === id) : null;
  document.getElementById('productModalTitle').textContent = p ? 'Edit product' : 'Add product';
  const form = document.getElementById('productForm');
  form.reset();
  form.dataset.editId = p ? p.id : '';
  if (p) {
    form.name.value = p.name || '';
    form.category.value = p.category || '';
    form.price.value = p.price || '';
    form.sizes.value = (p.sizes || []).join(', ');
    form.imageUrl.value = p.imageUrl || '';
    form.description.value = p.description || '';
  }
  document.getElementById('productModalOverlay').classList.add('open');
}
document.getElementById('addProductBtn').addEventListener('click', () => openProductModal(null));
document.getElementById('productModalClose').addEventListener('click', () =>
  document.getElementById('productModalOverlay').classList.remove('open'));

document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const errEl = document.getElementById('productFormError');
  const saveBtn = document.getElementById('productSaveBtn');
  errEl.textContent = '';

  // An uploaded file (if chosen) wins over a typed URL.
  const file = form.imageFile.files[0];
  let imageUrl = form.imageUrl.value.trim();
  if (file) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Uploading image…';
    try {
      imageUrl = await uploadImageFile(file, 'products');
    } catch (err) {
      console.error(err);
      errEl.textContent = 'Image upload failed — check Firebase Storage is turned on (see README).';
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save product';
      return;
    }
  }

  const data = {
    name: form.name.value.trim(),
    category: form.category.value.trim(),
    price: Number(form.price.value),
    sizes: form.sizes.value.split(',').map(s => s.trim()).filter(Boolean),
    imageUrl,
    description: form.description.value.trim()
  };
  if (form.dataset.editId) {
    await updateDoc(doc(db, 'products', form.dataset.editId), data);
  } else {
    await addDoc(collection(db, 'products'), { ...data, createdAt: serverTimestamp() });
  }
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save product';
  document.getElementById('productModalOverlay').classList.remove('open');
  showToast('Product saved');
});

/* ---------------- Orders ---------------- */
function renderOrders() {
  const tbody = document.getElementById('ordersBody');
  if (orders.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="6">No orders yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td>${escapeHtml(o.customer?.name || '—')}<br><span style="color:var(--grey); font-size:12px;">${escapeHtml(o.customer?.email || '')}</span></td>
      <td>${(o.items || []).length} item(s)</td>
      <td>${escapeHtml(o.voucherCode || '—')}</td>
      <td>PKR ${Number(o.total || 0).toLocaleString()}</td>
      <td><span class="badge ${o.status === 'fulfilled' ? 'fulfilled' : 'pending'}">${escapeHtml(o.status || 'pending')}</span></td>
      <td class="row-actions">
        <button class="btn small outline" data-toggle="${o.id}" data-status="${o.status}">
          ${o.status === 'fulfilled' ? 'Mark pending' : 'Mark fulfilled'}
        </button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-toggle]').forEach(b => b.addEventListener('click', async () => {
    const next = b.dataset.status === 'fulfilled' ? 'pending' : 'fulfilled';
    await updateDoc(doc(db, 'orders', b.dataset.toggle), { status: next });
  }));
}

/* ---------------- Vouchers ---------------- */
function renderVouchers() {
  const tbody = document.getElementById('vouchersBody');
  if (vouchers.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="4">No vouchers yet. Click "Add voucher" to create one.</td></tr>`;
    return;
  }
  tbody.innerHTML = vouchers.map(v => `
    <tr>
      <td>${escapeHtml(v.id)}</td>
      <td>${v.type === 'percent' ? v.value + '% off' : 'PKR ' + Number(v.value).toLocaleString() + ' off'}</td>
      <td><span class="badge ${v.active === false ? 'pending' : 'fulfilled'}">${v.active === false ? 'Inactive' : 'Active'}</span></td>
      <td class="row-actions">
        <button class="btn small outline" data-vtoggle="${v.id}" data-active="${v.active !== false}">
          ${v.active === false ? 'Activate' : 'Deactivate'}
        </button>
        <button class="btn small danger" data-vdel="${v.id}">Delete</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-vtoggle]').forEach(b => b.addEventListener('click', async () => {
    const isActive = b.dataset.active === 'true';
    await updateDoc(doc(db, 'vouchers', b.dataset.vtoggle), { active: !isActive });
  }));
  tbody.querySelectorAll('[data-vdel]').forEach(b => b.addEventListener('click', async () => {
    if (confirm('Delete this voucher?')) await deleteDoc(doc(db, 'vouchers', b.dataset.vdel));
  }));
}

document.getElementById('addVoucherBtn').addEventListener('click', () => {
  document.getElementById('voucherForm').reset();
  document.getElementById('voucherModalOverlay').classList.add('open');
});
document.getElementById('voucherModalClose').addEventListener('click', () =>
  document.getElementById('voucherModalOverlay').classList.remove('open'));

document.getElementById('voucherForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const code = form.code.value.trim().toUpperCase();
  if (!code) return;
  await setDoc(doc(db, 'vouchers', code), {
    type: form.type.value,
    value: Number(form.value.value),
    active: true,
    createdAt: serverTimestamp()
  });
  document.getElementById('voucherModalOverlay').classList.remove('open');
  showToast('Voucher saved');
});

/* ---------------- Hero banner slides ---------------- */
function renderHeroSlides() {
  const grid = document.getElementById('heroSlideGrid');
  if (heroSlides.length === 0) {
    grid.innerHTML = `<div class="hero-slide-empty">No custom slides yet — the homepage is showing its 4 starter images. Add a slide to start replacing them.</div>`;
    return;
  }
  grid.innerHTML = heroSlides.map(s => `
    <div class="hero-slide-thumb">
      <img src="${s.imageUrl}" alt="" onerror="this.style.visibility='hidden'">
      <button class="del-slide-btn" data-del-slide="${s.id}" aria-label="Remove slide">&times;</button>
    </div>
  `).join('');
  grid.querySelectorAll('[data-del-slide]').forEach(b => b.addEventListener('click', async () => {
    if (confirm('Remove this hero slide?')) await deleteDoc(doc(db, 'heroSlides', b.dataset.delSlide));
  }));
}

document.getElementById('addHeroSlideBtn').addEventListener('click', () => {
  document.getElementById('heroSlideForm').reset();
  document.getElementById('heroSlideFormError').textContent = '';
  document.getElementById('heroSlideModalOverlay').classList.add('open');
});
document.getElementById('heroSlideModalClose').addEventListener('click', () =>
  document.getElementById('heroSlideModalOverlay').classList.remove('open'));

document.getElementById('heroSlideForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const errEl = document.getElementById('heroSlideFormError');
  const saveBtn = document.getElementById('heroSlideSaveBtn');
  errEl.textContent = '';

  const file = form.imageFile.files[0];
  let imageUrl = form.imageUrl.value.trim();
  if (file) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Uploading image…';
    try {
      imageUrl = await uploadImageFile(file, 'hero');
    } catch (err) {
      console.error(err);
      errEl.textContent = 'Image upload failed — check Firebase Storage is turned on (see README).';
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save slide';
      return;
    }
  }
  if (!imageUrl) {
    errEl.textContent = 'Add an image URL or upload a file.';
    return;
  }

  await addDoc(collection(db, 'heroSlides'), { imageUrl, createdAt: serverTimestamp() });
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save slide';
  document.getElementById('heroSlideModalOverlay').classList.remove('open');
  showToast('Slide added');
});

/* ---------------- Utilities ---------------- */
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}
