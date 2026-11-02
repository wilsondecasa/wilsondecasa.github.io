// GADELO — admin.html: order list behind a single shared admin password.
//
// 2026-11-02, 1단계 (주문 관리자 — see project doc on the admin/membership
// plan). This is intentionally a small MVP: one shared password (the
// ADMIN_PASSWORD secret on the Worker), not per-staff accounts — that's a
// later phase (회원가입/로그인) once real customer accounts exist too.
//
// Logging in gets a short-lived signed token from the Worker (12h — see
// ADMIN_TOKEN_TTL_SECONDS in paypal-worker/worker.js). It's kept in
// localStorage and sent as "Authorization: Bearer <token>" on every
// /admin/* call — not a cookie, so this works the same whether the Worker
// and the site are on different domains (they are: *.workers.dev vs.
// gadelocoffeeroasters.com).
//
// IMPORTANT: this page's HTML is publicly reachable like any file on
// GitHub Pages — there's no server in front of it to gate who can load it.
// The actual protection is entirely the password + token check the Worker
// does on every /admin/* request; anyone who opens this URL just sees an
// empty login form, nothing more.
(function () {
  var API_BASE = 'https://divine-recipe-157e.gadelo.workers.dev';
  var TOKEN_KEY = 'gadelo_admin_token';

  var loginSection = document.getElementById('adminLogin');
  var ordersSection = document.getElementById('adminOrders');
  var passwordEl = document.getElementById('adminPassword');
  var loginBtn = document.getElementById('adminLoginBtn');
  var loginErrorEl = document.getElementById('adminLoginError');
  var statusFilterEl = document.getElementById('adminStatusFilter');
  var refreshBtn = document.getElementById('adminRefreshBtn');
  var logoutBtn = document.getElementById('adminLogoutBtn');
  var ordersStatusEl = document.getElementById('adminOrdersStatus');
  var tableBodyEl = document.getElementById('adminTableBody');

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }
  function setToken(token) {
    try { localStorage.setItem(TOKEN_KEY, token); } catch (e) { /* private browsing etc — ignore */ }
  }
  function clearToken() {
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ }
  }

  function showLogin() {
    if (loginSection) loginSection.hidden = false;
    if (ordersSection) ordersSection.hidden = true;
  }
  function showOrders() {
    if (loginSection) loginSection.hidden = true;
    if (ordersSection) ordersSection.hidden = false;
  }
  function showLoginError(msg) {
    if (!loginErrorEl) return;
    loginErrorEl.textContent = msg;
    loginErrorEl.hidden = false;
  }

  function fmtUSD(n) {
    var num = Number(n) || 0;
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // D1's datetime('now') is UTC, space-separated ("2026-11-02 09:15:00") —
  // normalize to a real ISO string so Date can parse it, then show it in
  // whoever's-looking's local time.
  function fmtDate(raw) {
    if (!raw) return '';
    var d = new Date(String(raw).replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleString();
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  async function login() {
    var password = passwordEl ? passwordEl.value : '';
    if (!password) return;
    if (loginErrorEl) loginErrorEl.hidden = true;
    if (loginBtn) loginBtn.disabled = true;
    try {
      var res = await fetch(API_BASE + '/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password })
      });
      var data = await res.json();
      if (!res.ok || !data.token) {
        showLoginError('Wrong password.');
        return;
      }
      setToken(data.token);
      if (passwordEl) passwordEl.value = '';
      showOrders();
      loadOrders();
    } catch (err) {
      showLoginError('Could not reach the server. Please try again.');
    } finally {
      if (loginBtn) loginBtn.disabled = false;
    }
  }

  function logout() {
    clearToken();
    showLogin();
  }

  function renderOrders(orders) {
    if (!tableBodyEl) return;
    if (!orders.length) {
      tableBodyEl.innerHTML = '<tr><td colspan="8" class="admin-empty">No orders yet.</td></tr>';
      return;
    }
    tableBodyEl.innerHTML = orders.map(function (o) {
      var items = [];
      try { items = JSON.parse(o.items_json || '[]'); } catch (e) { items = []; }
      var itemsText = items
        .map(function (it) { return escapeHtml(it.name) + ' ×' + escapeHtml(it.quantity); })
        .join('<br>');
      var dest = [o.camp_other, o.camp_id, o.region].filter(Boolean).map(escapeHtml).join(' — ');
      var contact = [o.customer_phone, o.customer_email].filter(Boolean).map(escapeHtml).join('<br>');
      var deliveryLabel = o.delivery_type === 'postbox' ? 'Post Box' : (o.delivery_type === 'home' ? 'Door delivery' : '—');
      var statusClass = o.status === 'paid' ? 'admin-status-paid' : 'admin-status-pending';
      var addrLine = escapeHtml(String(o.shipping_text || '').replace(/\n/g, ', '));
      return (
        '<tr>' +
        '<td>' + fmtDate(o.created_at) + '</td>' +
        '<td>' + escapeHtml(o.customer_name) + '</td>' +
        '<td>' + contact + '</td>' +
        '<td>' + dest + '<br><span class="admin-dim">' + addrLine + '</span></td>' +
        '<td>' + deliveryLabel + '</td>' +
        '<td>' + itemsText + '</td>' +
        '<td>' + fmtUSD(o.total) + '</td>' +
        '<td><span class="admin-status ' + statusClass + '">' + escapeHtml(o.status) + '</span></td>' +
        '</tr>'
      );
    }).join('');
  }

  async function loadOrders() {
    var token = getToken();
    if (!token) { showLogin(); return; }
    if (ordersStatusEl) ordersStatusEl.textContent = 'Loading…';
    var status = statusFilterEl ? statusFilterEl.value : 'paid';
    var qs = status ? ('?status=' + encodeURIComponent(status)) : '';
    try {
      var res = await fetch(API_BASE + '/admin/orders' + qs, {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (res.status === 401) {
        clearToken();
        showLogin();
        showLoginError('Session expired — please log in again.');
        return;
      }
      var data = await res.json();
      if (!res.ok) throw new Error((data && data.error) || 'failed');
      renderOrders(data.orders || []);
      if (ordersStatusEl) ordersStatusEl.textContent = (data.orders || []).length + ' order(s)';
    } catch (err) {
      if (ordersStatusEl) ordersStatusEl.textContent = 'Could not load orders.';
    }
  }

  if (loginBtn) loginBtn.addEventListener('click', login);
  if (passwordEl) {
    passwordEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') login();
    });
  }
  if (refreshBtn) refreshBtn.addEventListener('click', loadOrders);
  if (statusFilterEl) statusFilterEl.addEventListener('change', loadOrders);
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  if (getToken()) {
    showOrders();
    loadOrders();
  } else {
    showLogin();
  }
})();
