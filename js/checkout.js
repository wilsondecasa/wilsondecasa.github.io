// GADELO — checkout page (checkout.html), PayPal JS SDK v6
//
// Reached from the cart drawer's single "Checkout" button. Reads the cart from
// the shared store (js/cart-store.js). Fulfillment is Korea domestic delivery
// only (store pickup has been retired — international & APO/FPO coming
// later), then shows whichever payment buttons PayPal reports as eligible: PayPal,
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
  var API_BASE = 'https://divine-recipe-157e.gadelo.workers.dev';
  // 2) Same PayPal Client ID the site already used — safe to keep in
  //    front-end code (this is the whole point of a "client ID").
  var PAYPAL_CLIENT_ID = 'BAAttir1PdzFexVlRfXKK86wWu38tFu9IzpdPdCExh8PO_4ymyKBNnqdwDJWUqSmegYPY8OTGrsQUXTV2o';
  // 3) Google Pay's own environment flag — switch to 'PRODUCTION' together
  //    with going live on the Worker + PayPal SDK script tag (see the
  //    Worker's README.md "테스트 방법" section).
  var GOOGLE_PAY_ENVIRONMENT = 'PRODUCTION';

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

  var cartDestRowEl = document.getElementById('cartDestRow');
  var cartDestValueEl = document.getElementById('cartDestValue');

  function renderTotals() {
    var t = store.totals();
    if (cartSubtotalEl) cartSubtotalEl.textContent = fmtUSD(t.subtotal);
    if (cartShippingEl) {
      if (t.manualQuoteRequired) {
        cartShippingEl.textContent = 'See note below';
      } else if (t.needsDestination) {
        cartShippingEl.textContent = 'Select destination';
      } else {
        cartShippingEl.textContent = t.shipping > 0 ? fmtUSD(t.shipping) : 'Free';
      }
    }
    if (cartTotalEl) cartTotalEl.textContent = fmtUSD(t.subtotal + (t.manualQuoteRequired || t.needsDestination ? 0 : t.shipping));

    if (cartDestRowEl && cartDestValueEl) {
      var method = currentFulfillMethod();
      if (method === 'international') {
        var dest = store.getIntlDestination();
        if (dest) {
          var zoneLabel = t.zone ? store.zoneLabels[t.zone] : '';
          var baseTxt = store.baseLabel(dest.base);
          cartDestValueEl.textContent = (baseTxt || store.regionLabels[dest.region] || '') + (zoneLabel ? ' (' + zoneLabel + ')' : '');
          cartDestRowEl.hidden = false;
        } else {
          cartDestRowEl.hidden = true;
        }
      } else {
        cartDestRowEl.hidden = true;
      }
    }

    updatePaymentGate();
  }

  function renderSummary() {
    renderItems();
    renderTotals();
  }
  document.addEventListener('gadelo:cartchange', renderSummary);

  // ---------- Fulfillment: Korea domestic delivery, or International (APO/FPO) ----------
  var fulfillRadios = document.querySelectorAll('input[name="fulfillMethod"]');
  var addressBlock = document.getElementById('cartAddress');
  var addressBlockIntl = document.getElementById('cartAddressIntl');

  function applyFulfillment() {
    var method = currentFulfillMethod();
    if (addressBlock) addressBlock.hidden = method !== 'domestic';
    if (addressBlockIntl) addressBlockIntl.hidden = method !== 'international';
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

  // ---------- CAMP (APO/FPO) address — region + mandatory base, then an
  // explicit on-base/off-base choice picks the matching address fields ----------
  // Japan (Mainland) / Okinawa / Guam ("military" regions below) require a
  // base to be picked (that's also how the shopper sees an estimated fee
  // up front), then a residency radio (on-base vs off-base) swaps in either
  // APO/FPO-style fields or a regular local-address field set. Hawaii is a
  // real US state with no APO/FPO addressing at all, so it keeps its own
  // separate standard street-address field set (added 2026-09-14, 9차) with
  // no base/residency choice. Korea (on-post) is planned (2026-09-14, 10차
  // decision) but not yet enabled here — its base list is still pending.
  var intlRegionEl = document.getElementById('intlRegion');
  var intlBaseEl = document.getElementById('intlBase');
  var intlBaseFeeHintEl = document.getElementById('intlBaseFeeHint');
  var intlFieldsMilitaryEl = document.getElementById('intlFieldsMilitary');
  var intlFieldsHawaiiEl = document.getElementById('intlFieldsHawaii');
  var intlFieldsOnBaseEl = document.getElementById('intlFieldsOnBase');
  var intlFieldsOffBaseEl = document.getElementById('intlFieldsOffBase');
  var intlResidencyRadios = document.querySelectorAll('input[name="intlResidency"]');
  var intlReviewBlock = document.getElementById('intlAddressReview');
  var intlReviewText = document.getElementById('intlAddressReviewText');
  var intlConfirmCheck = document.getElementById('intlConfirmCheck');
  var intlManualQuoteEl = document.getElementById('intlManualQuote');
  var intlFields = {
    name: document.getElementById('intlName'),
    phone: document.getElementById('intlPhone'),
    email: document.getElementById('intlEmail'),
    box: document.getElementById('intlBox'),
    apoCode: document.getElementById('intlApoCode'),
    offStreet: document.getElementById('intlOffStreet'),
    offLine2: document.getElementById('intlOffLine2'),
    offCity: document.getElementById('intlOffCity'),
    offPostal: document.getElementById('intlOffPostal'),
    hiStreet: document.getElementById('intlHiStreet'),
    hiLine2: document.getElementById('intlHiLine2'),
    hiCity: document.getElementById('intlHiCity'),
    hiZip: document.getElementById('intlHiZip')
  };

  function isHawaiiRegion(region) {
    return region === 'hawaii';
  }
  function isMilitaryRegion(region) {
    return region === 'japan_mainland' || region === 'okinawa' || region === 'guam';
  }
  function currentResidency() {
    var checked = document.querySelector('input[name="intlResidency"]:checked');
    return checked ? checked.value : '';
  }

  (function () {
    if (!intlRegionEl) return; // page without the international block (shouldn't happen on checkout.html)

    var STORAGE_KEY = 'gadelo_last_address_intl';

    function populateBaseOptions(region, selectedBaseId) {
      if (!intlBaseEl) return;
      intlBaseEl.innerHTML = '';
      var bases = store.baseList.filter(function (b) { return b.region === region; });
      if (!region || bases.length === 0) {
        intlBaseEl.disabled = true;
        var opt = document.createElement('option');
        opt.value = '';
        opt.textContent = region ? 'No bases listed yet' : 'Base…';
        intlBaseEl.appendChild(opt);
        return;
      }
      intlBaseEl.disabled = false;
      var placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Base…';
      intlBaseEl.appendChild(placeholder);
      bases.forEach(function (b) {
        var o = document.createElement('option');
        o.value = b.id;
        o.textContent = b.label;
        if (b.id === selectedBaseId) o.selected = true;
        intlBaseEl.appendChild(o);
      });
    }

    // Base selection doesn't change the fee (it's the same weight-tier fee
    // for the whole region/zone), but showing it right where the shopper
    // picks their base is what actually answers "how much will this cost".
    function updateBaseFeeHint(region) {
      if (!intlBaseFeeHintEl) return;
      if (!isMilitaryRegion(region)) {
        intlBaseFeeHintEl.textContent = '';
        return;
      }
      var zone = store.zoneForRegion(region);
      var t = store.totals();
      if (t.manualQuoteRequired) {
        intlBaseFeeHintEl.textContent = 'This order is over 5kg — see the manual quote note below.';
      } else if (zone && t.shipping != null) {
        intlBaseFeeHintEl.textContent = 'Estimated shipping for this order: ' + fmtUSD(t.shipping) + ' (' + (store.zoneLabels[zone] || zone) + ')';
      } else {
        intlBaseFeeHintEl.textContent = '';
      }
    }

    function toggleRegionFields(region) {
      if (intlFieldsMilitaryEl) intlFieldsMilitaryEl.hidden = !isMilitaryRegion(region);
      if (intlFieldsHawaiiEl) intlFieldsHawaiiEl.hidden = !isHawaiiRegion(region);
      updateBaseFeeHint(region);
    }

    function toggleResidencyFields(residency) {
      if (intlFieldsOnBaseEl) intlFieldsOnBaseEl.hidden = residency !== 'onbase';
      if (intlFieldsOffBaseEl) intlFieldsOffBaseEl.hidden = residency !== 'offbase';
    }

    // Restore saved region/base + address fields (device-local, same pattern as domestic)
    var savedRegion = '';
    var savedBase = '';
    try {
      var dest = store.getIntlDestination();
      if (dest) {
        savedRegion = dest.region || '';
        savedBase = dest.base || '';
      }
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        Object.keys(intlFields).forEach(function (key) {
          if (intlFields[key] && data[key]) intlFields[key].value = data[key];
        });
        if (data.residency) {
          intlResidencyRadios.forEach(function (r) { r.checked = r.value === data.residency; });
        }
      }
    } catch (e) {
      /* storage unavailable or corrupt — form just stays blank */
    }
    if (savedRegion) intlRegionEl.value = savedRegion;
    toggleRegionFields(savedRegion);
    populateBaseOptions(savedRegion, savedBase);
    toggleResidencyFields(currentResidency());

    function saveIntlAddress() {
      try {
        var data = {};
        Object.keys(intlFields).forEach(function (key) {
          if (intlFields[key]) data[key] = intlFields[key].value;
        });
        data.residency = currentResidency();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        /* private browsing, storage full, or disabled — ignore */
      }
    }
    window.gadeloIntlAddress = { save: saveIntlAddress };

    function onIntlChange() {
      // Any edit invalidates a previous "yes this is correct" confirmation —
      // the shopper must re-confirm after changing anything.
      if (intlConfirmCheck) intlConfirmCheck.checked = false;
      updateIntlReview();
      renderTotals();
    }

    function updateIntlReview() {
      var region = intlRegionEl.value;
      if (!intlReviewBlock || !intlReviewText) return;
      var lines;
      if (isHawaiiRegion(region)) {
        var hasMinimumHi = val('intlName') && val('intlPhone') && val('intlHiStreet') && val('intlHiCity') && val('intlHiZip');
        if (!hasMinimumHi) {
          intlReviewBlock.hidden = true;
          return;
        }
        lines = [
          val('intlName'),
          val('intlHiStreet'),
          val('intlHiLine2'),
          (val('intlHiCity') ? val('intlHiCity') + ', HI ' + val('intlHiZip') : ''),
          val('intlPhone') + (val('intlEmail') ? ' · ' + val('intlEmail') : '')
        ].filter(Boolean);
      } else if (isMilitaryRegion(region)) {
        var baseId = intlBaseEl ? intlBaseEl.value : '';
        var residency = currentResidency();
        var baseLabel = baseId ? store.baseLabel(baseId) : '';
        var regionLine = [baseLabel, store.regionLabels[region] || region].filter(Boolean).join(' — ');
        if (residency === 'onbase') {
          var hasMinimumOn = val('intlName') && val('intlPhone') && baseId && val('intlBox') && val('intlApoCode');
          if (!hasMinimumOn) {
            intlReviewBlock.hidden = true;
            return;
          }
          lines = [
            val('intlName'),
            'Box ' + val('intlBox'),
            val('intlApoCode'),
            regionLine,
            val('intlPhone') + (val('intlEmail') ? ' · ' + val('intlEmail') : '')
          ].filter(Boolean);
        } else if (residency === 'offbase') {
          var hasMinimumOff = val('intlName') && val('intlPhone') && baseId && val('intlOffStreet') && val('intlOffCity') && val('intlOffPostal');
          if (!hasMinimumOff) {
            intlReviewBlock.hidden = true;
            return;
          }
          lines = [
            val('intlName'),
            val('intlOffStreet'),
            val('intlOffLine2'),
            [val('intlOffCity'), val('intlOffPostal')].filter(Boolean).join(' '),
            regionLine,
            val('intlPhone') + (val('intlEmail') ? ' · ' + val('intlEmail') : '')
          ].filter(Boolean);
        } else {
          intlReviewBlock.hidden = true;
          return;
        }
      } else {
        intlReviewBlock.hidden = true;
        return;
      }
      intlReviewText.textContent = lines.join('\n');
      intlReviewBlock.hidden = false;
    }

    intlRegionEl.addEventListener('change', function () {
      toggleRegionFields(intlRegionEl.value);
      populateBaseOptions(intlRegionEl.value, '');
      intlResidencyRadios.forEach(function (r) { r.checked = false; });
      toggleResidencyFields('');
      store.setIntlDestination(intlRegionEl.value, '');
      onIntlChange();
    });
    if (intlBaseEl) {
      intlBaseEl.addEventListener('change', function () {
        store.setIntlDestination(intlRegionEl.value, intlBaseEl.value);
        onIntlChange();
      });
    }
    intlResidencyRadios.forEach(function (r) {
      r.addEventListener('change', function () {
        if (!r.checked) return;
        toggleResidencyFields(r.value);
        onIntlChange();
      });
    });
    Object.keys(intlFields).forEach(function (key) {
      if (intlFields[key]) intlFields[key].addEventListener('input', onIntlChange);
    });
    if (intlConfirmCheck) {
      intlConfirmCheck.addEventListener('change', function () {
        renderTotals();
      });
    }
    // Cart weight (and so the estimated fee shown next to Base) can change
    // from the drawer/other tabs without touching this form.
    document.addEventListener('gadelo:cartchange', function () {
      updateBaseFeeHint(intlRegionEl.value);
    });

    updateIntlReview();
  })();

  function currentFulfillMethod() {
    var checked = document.querySelector('input[name="fulfillMethod"]:checked');
    return checked ? checked.value : 'domestic';
  }

  function intlConfirmed() {
    return !!(intlConfirmCheck && intlConfirmCheck.checked);
  }

  // Whether checkout can proceed right now — used by requiredFieldsOk() to
  // block order creation, and by updatePaymentGate() to hide/disable the
  // payment buttons with an explanatory message instead.
  function checkoutBlockReason() {
    var method = currentFulfillMethod();
    if (method === 'domestic') return null;
    // international
    var t = store.totals();
    if (t.manualQuoteRequired) {
      return 'This order is over 5kg, outside our automatic shipping calculator. Please contact us for a manual quote before ordering.';
    }
    var region = intlRegionEl ? intlRegionEl.value : '';
    if (!region) {
      return 'Please select your delivery region.';
    }
    var basicsOk;
    if (isHawaiiRegion(region)) {
      basicsOk = val('intlName') && val('intlPhone') && val('intlHiStreet') && val('intlHiCity') && val('intlHiZip');
      if (!basicsOk) {
        return 'Please fill in your name, phone, street address, city, and ZIP code first.';
      }
    } else {
      var baseId = intlBaseEl ? intlBaseEl.value : '';
      if (!baseId) {
        return 'Please select your base.';
      }
      var residency = currentResidency();
      if (!residency) {
        return 'Please choose on-base (APO/FPO) or off-base (local address).';
      }
      if (residency === 'onbase') {
        basicsOk = val('intlName') && val('intlPhone') && val('intlBox') && val('intlApoCode');
        if (!basicsOk) {
          return 'Please fill in your name, phone, Post Box number, and APO/FPO code first.';
        }
      } else {
        basicsOk = val('intlName') && val('intlPhone') && val('intlOffStreet') && val('intlOffCity') && val('intlOffPostal');
        if (!basicsOk) {
          return 'Please fill in your name, phone, street address, city, and postal code first.';
        }
      }
    }
    if (!intlConfirmed()) {
      return 'Please review your address above and check the confirmation box.';
    }
    return null;
  }

  function updatePaymentGate() {
    var payButtons = document.getElementById('checkoutPayButtons');
    var blockedEl = document.getElementById('checkoutBlocked');
    var reason = checkoutBlockReason();
    if (payButtons) payButtons.hidden = !!reason;
    if (blockedEl) {
      blockedEl.hidden = !reason;
      if (reason) blockedEl.textContent = reason;
    }
    if (intlManualQuoteEl) {
      var t = store.totals();
      intlManualQuoteEl.hidden = !t.manualQuoteRequired;
    }
  }

  function requiredFieldsOk(method) {
    if (method === 'international') {
      var reason = checkoutBlockReason();
      if (reason) {
        showToast(reason);
        return false;
      }
      return true;
    }
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
    var address;
    if (method === 'domestic') {
      address = {
        name: val('addrName'),
        line1: val('addrLine1'),
        line2: val('addrLine2'),
        city: val('addrCity'),
        zip: val('addrZip')
      };
    } else if (method === 'international') {
      var region = intlRegionEl ? intlRegionEl.value : '';
      if (isHawaiiRegion(region)) {
        address = {
          name: val('intlName'),
          phone: val('intlPhone'),
          email: val('intlEmail'),
          street: val('intlHiStreet'),
          line2: val('intlHiLine2'),
          city: val('intlHiCity'),
          zip: val('intlHiZip')
        };
      } else if (currentResidency() === 'onbase') {
        address = {
          name: val('intlName'),
          phone: val('intlPhone'),
          email: val('intlEmail'),
          box: val('intlBox'),
          apoCode: val('intlApoCode')
        };
      } else {
        address = {
          name: val('intlName'),
          phone: val('intlPhone'),
          email: val('intlEmail'),
          street: val('intlOffStreet'),
          line2: val('intlOffLine2'),
          city: val('intlOffCity'),
          postal: val('intlOffPostal')
        };
      }
    }
    return {
      items: store.items().map(function (i) {
        return { slug: i.slug, sizeKey: i.sizeKey, qty: i.qty };
      }),
      fulfillment: method,
      region: method === 'international' && intlRegionEl ? intlRegionEl.value : undefined,
      base: method === 'international' && intlBaseEl ? intlBaseEl.value : undefined,
      residency: method === 'international' && !isHawaiiRegion(intlRegionEl ? intlRegionEl.value : '') ? currentResidency() : undefined,
      address: address
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
    var wasInternational = currentFulfillMethod() === 'international';
    if (window.gadeloAddress) window.gadeloAddress.save();
    if (window.gadeloIntlAddress) window.gadeloIntlAddress.save();
    var successApoWarning = document.getElementById('successApoWarning');
    if (successApoWarning) successApoWarning.hidden = !wasInternational;
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
