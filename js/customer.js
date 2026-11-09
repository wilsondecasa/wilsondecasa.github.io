// GADELO — shared customer-account client (2단계: 회원가입/로그인, 2026-11-09).
//
// Mirrors js/admin.js's bearer-token pattern, but for real customer
// accounts (separate system — see paypal-worker/worker.js's "CUSTOMER
// ACCOUNTS" section). Loaded by both login.html and checkout.js so neither
// duplicates the fetch/token logic. Exposes window.GadeloCustomer.
(function (global) {
  var API_BASE = 'https://divine-recipe-157e.gadelo.workers.dev';
  var TOKEN_KEY = 'gadelo_customer_token';

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }
  function setToken(token) {
    try { localStorage.setItem(TOKEN_KEY, token); } catch (e) { /* private browsing etc — ignore */ }
  }
  function clearToken() {
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ }
  }
  function isLoggedIn() {
    return !!getToken();
  }

  async function signup(data) {
    var res = await fetch(API_BASE + '/customer/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.email, password: data.password, name: data.name, phone: data.phone })
    });
    var out = await res.json();
    if (!res.ok) throw new Error(out.error || 'signup_failed');
    setToken(out.token);
    return out.customer;
  }

  async function login(email, password) {
    var res = await fetch(API_BASE + '/customer/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password })
    });
    var out = await res.json();
    if (!res.ok) throw new Error(out.error || 'login_failed');
    setToken(out.token);
    return out.customer;
  }

  // Returns the logged-in customer's profile, or null if not logged in /
  // the token is no longer valid (also clears a dead token in that case).
  async function me() {
    var token = getToken();
    if (!token) return null;
    try {
      var res = await fetch(API_BASE + '/customer/me', {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (res.status === 401) {
        clearToken();
        return null;
      }
      if (!res.ok) return null;
      var out = await res.json();
      return out.customer || null;
    } catch (e) {
      return null; // network hiccup — caller falls back to guest checkout
    }
  }

  function logout() {
    clearToken();
  }

  // Best-effort — returns true/false, never throws (called right after a
  // real payment capture; a failure here should never look like an error
  // to the shopper, the order already went through).
  async function saveAddress(data) {
    var token = getToken();
    if (!token) return false;
    try {
      var res = await fetch(API_BASE + '/customer/save-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(data)
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  global.GadeloCustomer = {
    isLoggedIn: isLoggedIn,
    signup: signup,
    login: login,
    me: me,
    logout: logout,
    saveAddress: saveAddress
  };
})(window);
