// GADELO — checkout page (checkout.html), PayPal JS SDK v6
//
// Reached from the cart drawer's single "Checkout" button. Reads the cart from
// the shared store (js/cart-store.js), lets the shopper pick fulfillment
// (pickup / Korea domestic delivery — international & APO/FPO coming later),
// then shows whichever payment buttons PayPal reports as eligible: PayPal,
// a hosted "Debit or Credit Card" guest-checkout button, and Google Pay.
//
// Order creation + capture happen on a small separate backend (a Cloudflare
// Worker — see /paypal-worker/ next to this site's own folder), never
// directly in the browser. That backend re-prices the cart itself from its
// own product list, so a shopper editing prices in devtools can't change
// what actually gets charged, and the PayPal secret key never has to touch
// this front-end code.
//
// NOTE: js/checkout.classic-backup.js is the previous, fully-working
// no-backend version (PayPal + Card via the classic SDK). If this v6 version
// ever needs to be rolled back, restoring that file + the old PayPal SDK
// <script> tag in checkout.html reverses this change with nothing else to
// undo.
(function () {
  var store = window.gadeloCartStore;

  // ---- Configure before deploying ----
  // 1) Deploy /paypal-worker/worker.js to Cloudflare Workers (see its
  //    README.md) and put that Worker's address here.
  var API_BASE = 'https://REPLACE-ME.workers.dev'; // <-- set this after deploying the Worker
  // 2) Same PayPal Client ID the site already used — safe to keep in
  //    front-end code (this is the whole point of a "client ID").
  var PAYPAL_CLIENT_ID = 'BAAJNXcoFa7qu2M8zfIpKXUVdTJUXMjq7JAZAhboPLTNgAwzKXEDI5BgUhcpSjo3LULbtF4xLnUO3bt_f0';
  // 3) Google Pay's own environment flag — switch to 'PRODUCTION' together
  //    with going live on the Worker + PayPal SDK script tag (see the
  //    Worker's README.md "테스트 방법" section).
  var GOOGLE_PAY_ENVIRONMENT = 'TEST';

  function fmtUSD(n) {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  var checkoutGrid = document.getElementById('checkoutGrid');
  var checkoutEmpty = document.getElementById('checkoutEmpty');
  var checkoutSuccess = document.getElementById('checkoutSuccess');

  if (store.items().length === 0) {
    if (checkoutGrid) checkoutGrid.hidden = true;
    if (checkoutEmpty) checkoutEmpty.hidden = false;
    return; // nothing else on this page needs to run against an empty cart
  }

  var toastEl = document.getElementById('toast');
  var toastTimer;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('show');
    }, 2200);
  }

  var paypalFallback = document.getElementById('paypalFallback');

  // ---------- Order summary: items + totals ----------
  var checkoutItemsEl = document.getElementById('checkoutItems');
  var cartSubtotalEl = document.getElementById('cartSubtotal');
  var cartShippingEl = document.getElementById('cartShipping');
  var cartTotalEl = document.getElementById('cartTotal');

  function renderItems() {
    if (!checkoutItemsEl) return;
    checkoutItemsEl.innerHTML = store
      .items()
      .map(function (item) {
        var swatch = item.image ? 'background-image:url(' + item.image + ')' : 'background:' + item.color;
        return (
          '<div class="cart-line">' +
          '<div class="swatch" style="' + swatch + '"></div>' +
          '<div class="info">' +
          '<div class="nm">' + item.nameEn + '</div>' +
          '<div class="meta">' + item.sizeLabel + ' &times; ' + item.qty + '</div>' +
          '</div>' +
          '<div class="qty-price">' + fmtUSD(item.unitPrice * item.qty) + '</div>' +
          '</div>'
        );
      })
      .join('');
  }

  function renderTotals() {
    var t = store.totals();
    if (cartSubtotalEl) cartSubtotalEl.textContent = fmtUSD(t.subtotal);
    if (cartShippingEl) cartShippingEl.textContent = t.shipping > 0 ? fmtUSD(t.shipping) : 'Free';
    if (cartTotalEl) cartTotalEl.textContent = fmtUSD(t.total);
  }

  function renderSummary() {
    renderItems();
    renderTotals();
  }
  document.addEventListener('gadelo:cartchange', renderSummary);

  // ---------- Fulfillment: pickup / Korea domestic delivery ----------
  var fulfillRadios = document.querySelectorAll('input[name="fulfillMethod"]');
  var addressBlock = document.getElementById('cartAddress');
  var pickupNote = document.getElementById('pickupNote');

  function applyFulfillment(method) {
    if (addressBlock) addressBlock.hidden = method === 'pickup';
    if (pickupNote) pickupNote.hidden = method !== 'pickup';
    renderTotals();
  }
  fulfillRadios.forEach(function (r) {
    r.checked = r.value === store.getFulfillment();
    r.addEventListener('change', function () {
      if (!r.checked) return;
      store.setFulfillment(r.value);
      applyFulfillment(r.value);
    });
  });
  applyFulfillment(store.getFulfillment());

  // ---------- Saved delivery address (this device only — no account or login) ----------
  (function () {
    var STORAGE_KEY = 'gadelo_last_address';
    var fields = {
      name: document.getElementById('addrName'),
      phone: document.getElementById('addrPhone'),
      email: document.getElementById('addrEmail'),
      line1: document.getElementById('addrLine1'),
      line2: document.getElementById('addrLine2'),
      city: document.getElementById('addrCity'),
      zip: document.getElementById('addrZip')
    };
    if (!fields.name) {
      window.gadeloAddress = { save: function () {} };
      return;
    }

    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        Object.keys(fields).forEach(function (key) {
          if (fields[key] && data[key]) fields[key].value = data[key];
        });
      }
    } catch (e) {
      /* storage unavailable or corrupt — form just stays blank */
    }

    function saveCurrent() {
      try {
        var data = {};
        Object.keys(fields).forEach(function (key) {
          if (fields[key]) data[key] = fields[key].value;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        /* private browsing, storage full, or disabled — ignore */
      }
    }
    window.gadeloAddress = { save: saveCurrent };
  })();

  function currentFulfillMethod() {
    var checked = document.querySelector('input[name="fulfillMethod"]:checked');
    return checked ? checked.value : 'pickup';
  }
  function requiredFieldsOk(method) {
    if (method === 'pickup') return true;
    var basicsOk = val('addrName') && val('addrPhone') && val('addrLine1') && val('addrCity') && val('addrZip');
    if (!basicsOk) {
      showToast('Please fill in your name, phone, address, city and ZIP first.');
      return false;
    }
    return true;
  }

  // ---------- Talk to our own backend (paypal-worker) ----------
  function cartPayload() {
    var method = currentFulfillMethod();
    return {
      items: store.items().map(function (i) {
        return { slug: i.slug, sizeKey: i.sizeKey, qty: i.qty };
      }),
      fulfillment: method,
      address:
        method === 'domestic'
          ? {
              name: val('addrName'),
              line1: val('addrLine1'),
              line2: val('addrLine2'),
              city: val('addrCity'),
              zip: val('addrZip')
            }
          : undefined
    };
  }

  // Returned promise resolves to { orderId } — the shape every v6 payment
  // session's .start()/onPaymentAuthorized expects.
  async function createOrder() {
    if (store.items().length === 0) {
      showToast('Your cart is empty.');
      throw new Error('Cart is empty');
    }
    if (!requiredFieldsOk(currentFulfillMethod())) {
      throw new Error('Missing required address fields');
    }
    var res = await fetch(API_BASE + '/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cartPayload())
    });
    var data = await res.json();
    if (!res.ok || !data.id) {
      throw new Error('Order creation failed: ' + (data && data.error ? data.error : res.status));
    }
    return { orderId: data.id };
  }

  async function captureOrder(orderId) {
    var res = await fetch(API_BASE + '/capture-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: orderId })
    });
    var data = await res.json();
    if (!res.ok) throw new Error('Order capture failed');
    return data;
  }

  function onOrderComplete() {
    if (window.gadeloAddress) window.gadeloAddress.save();
    store.clear();
    if (checkoutGrid) checkoutGrid.hidden = true;
    if (checkoutSuccess) checkoutSuccess.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  var paymentSessionOptions = {
    onApprove: async function (data) {
      try {
        await captureOrder(data.orderId);
        onOrderComplete();
      } catch (err) {
        console.error('[GADELO] capture error', err);
        showToast('Something went wrong finishing your order. Please try again.');
      }
    },
    onCancel: function () {
      /* shopper closed the PayPal window without paying — nothing to do */
    },
    onError: function (err) {
      console.error('[GADELO] PayPal checkout error:', err);
      showToast('Something went wrong placing your order. Please try again.');
    }
  };

  // ---------- PayPal button ----------
  function configurePayPalButton(sdkInstance) {
    var session = sdkInstance.createPayPalOneTimePaymentSession(paymentSessionOptions);
    var btn = document.getElementById('ppButton');
    if (!btn) return;
    btn.removeAttribute('hidden');
    btn.addEventListener('click', async function () {
      try {
        // Get the promise reference by calling createOrder() without awaiting
        // it here — awaiting first can break the "user click" activation
        // PayPal's popup/redirect flow relies on.
        var orderPromise = createOrder();
        await session.start({ presentationMode: 'auto' }, orderPromise);
      } catch (err) {
        console.error('[GADELO] PayPal button error', err);
      }
    });
  }

  // ---------- "Debit or Credit Card" guest checkout button ----------
  function configureCardGuestButton(sdkInstance) {
    try {
      var session = sdkInstance.createPayPalGuestOneTimePaymentSession(paymentSessionOptions);
      var btn = document.getElementById('cardGuestButton');
      if (!btn) return;
      btn.removeAttribute('hidden');
      btn.addEventListener('click', async function () {
        try {
          var orderPromise = createOrder();
          await session.start({ presentationMode: 'auto' }, orderPromise);
        } catch (err) {
          console.error('[GADELO] card guest checkout error', err);
        }
      });
    } catch (err) {
      console.error('[GADELO] card guest button setup failed', err);
    }
  }

  // ---------- Google Pay button ----------
  // Google Pay uses Google's own button/widget (loaded from pay.google.com),
  // wired to PayPal's payment session so PayPal still processes the charge.
  function configureGooglePayButton(sdkInstance, googlePayMethodDetails) {
    if (!(window.google && window.google.payments && window.google.payments.api)) return;
    try {
      var session = sdkInstance.createGooglePayOneTimePaymentSession();
      var config = session.formatConfigForPaymentRequest(googlePayMethodDetails.config);

      var paymentsClient = new google.payments.api.PaymentsClient({
        environment: GOOGLE_PAY_ENVIRONMENT,
        paymentDataCallbacks: {
          onPaymentAuthorized: function (paymentData) {
            return (async function () {
              try {
                var order = await createOrder();
                var confirmResult = await session.confirmOrder({
                  orderId: order.orderId,
                  paymentMethodData: paymentData.paymentMethodData
                });
                if (confirmResult.status !== 'PAYER_ACTION_REQUIRED') {
                  await captureOrder(order.orderId);
                  onOrderComplete();
                }
                return { transactionState: 'SUCCESS' };
              } catch (err) {
                console.error('[GADELO] Google Pay error', err);
                return { transactionState: 'ERROR', error: { message: err.message } };
              }
            })();
          }
        }
      });

      paymentsClient
        .isReadyToPay({
          allowedPaymentMethods: config.allowedPaymentMethods,
          apiVersion: config.apiVersion,
          apiVersionMinor: config.apiVersionMinor
        })
        .then(function (ready) {
          if (!ready || !ready.result) return;
          var button = paymentsClient.createButton({
            onClick: function () {
              if (store.items().length === 0) {
                showToast('Your cart is empty.');
                return;
              }
              if (!requiredFieldsOk(currentFulfillMethod())) return;
              paymentsClient
                .loadPaymentData({
                  apiVersion: config.apiVersion,
                  apiVersionMinor: config.apiVersionMinor,
                  allowedPaymentMethods: config.allowedPaymentMethods,
                  merchantInfo: config.merchantInfo,
                  transactionInfo: {
                    countryCode: config.countryCode,
                    currencyCode: 'USD',
                    totalPriceStatus: 'FINAL',
                    totalPrice: store.totals().total.toFixed(2),
                    totalPriceLabel: 'Total'
                  },
                  callbackIntents: ['PAYMENT_AUTHORIZATION']
                })
                .catch(function (err) {
                  console.error('[GADELO] Google Pay load error', err);
                });
            }
          });
          var container = document.getElementById('googlepayButtonContainer');
          if (container) container.appendChild(button);
        })
        .catch(function (err) {
          console.error('[GADELO] Google Pay isReadyToPay error', err);
        });
    } catch (err) {
      console.error('[GADELO] Google Pay setup failed', err);
    }
  }

  // If the SDK <script> tag itself never loads (network blocked, ad-blocker,
  // offline) its onload never fires, so onPayPalWebSdkLoaded() below never
  // runs either — this separate onerror hook is what still shows the
  // fallback message in that case instead of leaving an empty, unexplained
  // button area.
  window.onPayPalWebSdkFailed = function () {
    console.error('[GADELO] PayPal SDK script failed to load');
    if (paypalFallback) paypalFallback.hidden = false;
  };

  // ---------- SDK bootstrap — called from checkout.html once the v6 SDK script loads ----------
  window.onPayPalWebSdkLoaded = async function () {
    try {
      var sdkInstance = await window.paypal.createInstance({
        clientId: PAYPAL_CLIENT_ID,
        components: ['paypal-payments', 'paypal-guest-payments', 'googlepay-payments'],
        pageType: 'checkout'
      });

      var paymentMethods = await sdkInstance.findEligibleMethods({ currencyCode: 'USD' });

      if (paymentMethods.isEligible('paypal')) {
        configurePayPalButton(sdkInstance);
      }
      // The hosted card-guest form doesn't have a separate eligibility flag
      // in PayPal's own reference examples — it's offered whenever the
      // paypal-guest-payments component is loaded.
      configureCardGuestButton(sdkInstance);

      if (paymentMethods.isEligible('googlepay')) {
        configureGooglePayButton(sdkInstance, paymentMethods.getDetails('googlepay'));
      }
    } catch (err) {
      console.error('[GADELO] PayPal SDK init failed', err);
      if (paypalFallback) paypalFallback.hidden = false;
    }
  };

  renderSummary();
})();
