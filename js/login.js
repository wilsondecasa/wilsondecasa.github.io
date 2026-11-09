// GADELO — login.html page logic (2026-11-09, 2단계). Tab switching, form
// submit handlers, and the ?next= redirect so checkout.html can link here
// as "login.html?next=checkout.html" and land the shopper right back where
// they were once they're logged in. Depends on js/customer.js (loaded
// first in login.html) for the actual signup/login calls.
(function () {
  var tabLoginBtn = document.getElementById('tabLoginBtn');
  var tabSignupBtn = document.getElementById('tabSignupBtn');
  var loginForm = document.getElementById('loginForm');
  var signupForm = document.getElementById('signupForm');
  var acctSuccess = document.getElementById('acctSuccess');

  var loginEmailEl = document.getElementById('loginEmail');
  var loginPasswordEl = document.getElementById('loginPassword');
  var loginSubmitBtn = document.getElementById('loginSubmitBtn');
  var loginErrorEl = document.getElementById('loginError');

  var signupEmailEl = document.getElementById('signupEmail');
  var signupPasswordEl = document.getElementById('signupPassword');
  var signupNameEl = document.getElementById('signupName');
  var signupPhoneEl = document.getElementById('signupPhone');
  var signupSubmitBtn = document.getElementById('signupSubmitBtn');
  var signupErrorEl = document.getElementById('signupError');

  var acctSuccessLabel = document.getElementById('acctSuccessLabel');
  var acctSuccessName = document.getElementById('acctSuccessName');
  var acctContinueBtn = document.getElementById('acctContinueBtn');
  var acctLogoutLink = document.getElementById('acctLogoutLink');

  var deliveryTabs = document.querySelector('.deliv-select');

  function nextUrl() {
    var params = new URLSearchParams(window.location.search);
    var next = params.get('next');
    // Only ever redirect to a same-site relative page — never trust an
    // absolute/external URL from the query string.
    if (next && /^[a-zA-Z0-9_-]+\.html(\?.*)?$/.test(next)) return next;
    return 'index.html#blends';
  }

  function showTab(which) {
    var isLogin = which === 'login';
    loginForm.hidden = !isLogin;
    signupForm.hidden = isLogin;
    if (tabLoginBtn) tabLoginBtn.classList.toggle('active', isLogin);
    if (tabSignupBtn) tabSignupBtn.classList.toggle('active', !isLogin);
  }
  if (tabLoginBtn) tabLoginBtn.addEventListener('click', function () { showTab('login'); });
  if (tabSignupBtn) tabSignupBtn.addEventListener('click', function () { showTab('signup'); });

  function showError(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
  }
  function errorMessage(err) {
    var map = {
      invalid_credentials: 'Wrong email or password.',
      email_taken: 'An account with that email already exists — try logging in instead.',
      invalid_email: 'Please enter a valid email address.',
      password_too_short: 'Password must be at least 8 characters.',
      database_not_configured: 'Accounts aren’t set up on the server yet — please try again later.'
    };
    return map[err && err.message] || 'Something went wrong. Please try again.';
  }

  function showSuccess(label, customer) {
    if (deliveryTabs) deliveryTabs.hidden = true;
    loginForm.hidden = true;
    signupForm.hidden = true;
    acctSuccess.hidden = false;
    if (acctSuccessLabel) acctSuccessLabel.textContent = label;
    if (acctSuccessName) {
      acctSuccessName.textContent = customer && customer.name
        ? customer.name + ' (' + customer.email + ')'
        : (customer ? customer.email : '');
    }
    var next = nextUrl();
    if (acctContinueBtn && next !== 'index.html#blends') {
      acctContinueBtn.textContent = 'Continue →';
      acctContinueBtn.href = next;
    }
    // If we arrived here FROM checkout (next=checkout.html…), go straight
    // back rather than making the shopper click once more.
    if (next.indexOf('checkout.html') === 0) {
      window.location.href = next;
    }
  }

  if (loginSubmitBtn) {
    loginSubmitBtn.addEventListener('click', async function () {
      var email = loginEmailEl ? loginEmailEl.value.trim() : '';
      var password = loginPasswordEl ? loginPasswordEl.value : '';
      if (!email || !password) return;
      if (loginErrorEl) loginErrorEl.hidden = true;
      loginSubmitBtn.disabled = true;
      try {
        var customer = await window.GadeloCustomer.login(email, password);
        showSuccess('Logged in', customer);
      } catch (err) {
        showError(loginErrorEl, errorMessage(err));
      } finally {
        loginSubmitBtn.disabled = false;
      }
    });
  }
  if (loginPasswordEl) {
    loginPasswordEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && loginSubmitBtn) loginSubmitBtn.click();
    });
  }

  if (signupSubmitBtn) {
    signupSubmitBtn.addEventListener('click', async function () {
      var email = signupEmailEl ? signupEmailEl.value.trim() : '';
      var password = signupPasswordEl ? signupPasswordEl.value : '';
      var name = signupNameEl ? signupNameEl.value.trim() : '';
      var phone = signupPhoneEl ? signupPhoneEl.value.trim() : '';
      if (!email || !password) return;
      if (signupErrorEl) signupErrorEl.hidden = true;
      signupSubmitBtn.disabled = true;
      try {
        var customer = await window.GadeloCustomer.signup({ email: email, password: password, name: name, phone: phone });
        showSuccess('Account created', customer);
      } catch (err) {
        showError(signupErrorEl, errorMessage(err));
      } finally {
        signupSubmitBtn.disabled = false;
      }
    });
  }
  if (signupPasswordEl) {
    signupPasswordEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && signupSubmitBtn) signupSubmitBtn.click();
    });
  }

  if (acctLogoutLink) {
    acctLogoutLink.addEventListener('click', function () {
      window.GadeloCustomer.logout();
      window.location.reload();
    });
  }

  // Already logged in when this page loads (e.g. came back via bookmark) —
  // skip straight to the success view instead of showing the forms again.
  (async function initialCheck() {
    if (!window.GadeloCustomer || !window.GadeloCustomer.isLoggedIn()) return;
    var customer = await window.GadeloCustomer.me();
    if (customer) showSuccess('Logged in', customer);
  })();

  // Pre-select the Sign Up tab if arriving as login.html?tab=signup
  var initialParams = new URLSearchParams(window.location.search);
  if (initialParams.get('tab') === 'signup') showTab('signup');
})();
