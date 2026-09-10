// GADELO — checkout page (checkout.html)
//
// Reached from the cart drawer's single "Checkout" button. Reads the cart from
// the shared store (js/cart-store.js), lets the shopper pick fulfillment
// (pickup / Korea domestic delivery — international & APO/FPO coming later)
// and payment method (PayPal account or card via PayPal), then renders the
// matching PayPal Buttons instance for the live total. On successful capture
// the cart is cleared and a plain on-screen confirmation is shown; PayPal
// sends its own receipt email to the buyer, so no separate order notification
// (e.g. Telegram) is sent from here.
(function(){
  var store = window.gadeloCartStore;
  function fmtUSD(n){ return '$' + n.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}); }

  var checkoutGrid = document.getElementById('checkoutGrid');
  var checkoutEmpty = document.getElementById('checkoutEmpty');
  var checkoutSuccess = document.getElementById('checkoutSuccess');

  if(store.items().length === 0){
    if(checkoutGrid) checkoutGrid.hidden = true;
    if(checkoutEmpty) checkoutEmpty.hidden = false;
    return; // nothing else on this page needs to run against an empty cart
  }

  var toastEl = document.getElementById('toast');
  var toastTimer;
  function showToast(msg){
    if(!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, 2200);
  }

  // ---------- Order summary: items + totals ----------
  var checkoutItemsEl = document.getElementById('checkoutItems');
  var cartSubtotalEl = document.getElementById('cartSubtotal');
  var cartShippingEl = document.getElementById('cartShipping');
  var cartTotalEl = document.getElementById('cartTotal');

  function renderItems(){
    if(!checkoutItemsEl) return;
    checkoutItemsEl.innerHTML = store.items().map(function(item){
      var swatch = item.image ? ('background-image:url(' + item.image + ')') : ('background:' + item.color);
      return '<div class="cart-line">' +
        '<div class="swatch" style="' + swatch + '"></div>' +
        '<div class="info">' +
          '<div class="nm">' + item.nameEn + '</div>' +
          '<div class="meta">' + item.sizeLabel + ' &times; ' + item.qty + '</div>' +
        '</div>' +
        '<div class="qty-price">' + fmtUSD(item.unitPrice * item.qty) + '</div>' +
      '</div>';
    }).join('');
  }

  function renderTotals(){
    var t = store.totals();
    if(cartSubtotalEl) cartSubtotalEl.textContent = fmtUSD(t.subtotal);
    if(cartShippingEl) cartShippingEl.textContent = t.shipping > 0 ? fmtUSD(t.shipping) : 'Free';
    if(cartTotalEl) cartTotalEl.textContent = fmtUSD(t.total);
  }

  function renderSummary(){ renderItems(); renderTotals(); }
  document.addEventListener('gadelo:cartchange', renderSummary);

  // ---------- Fulfillment: pickup / Korea domestic delivery ----------
  var fulfillRadios = document.querySelectorAll('input[name="fulfillMethod"]');
  var addressBlock = document.getElementById('cartAddress');
  var pickupNote = document.getElementById('pickupNote');

  function applyFulfillment(method){
    if(addressBlock) addressBlock.hidden = (method === 'pickup');
    if(pickupNote) pickupNote.hidden = (method !== 'pickup');
    renderTotals();
  }
  fulfillRadios.forEach(function(r){
    r.checked = (r.value === store.getFulfillment());
    r.addEventListener('change', function(){
      if(!r.checked) return;
      store.setFulfillment(r.value);
      applyFulfillment(r.value);
    });
  });
  applyFulfillment(store.getFulfillment());

  // ---------- Saved delivery address (this device only — no account or login) ----------
  (function(){
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
    if(!fields.name){ window.gadeloAddress = { save: function(){} }; return; }

    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      if(raw){
        var data = JSON.parse(raw);
        Object.keys(fields).forEach(function(key){
          if(fields[key] && data[key]) fields[key].value = data[key];
        });
      }
    }catch(e){ /* storage unavailable or corrupt — form just stays blank */ }

    function saveCurrent(){
      try{
        var data = {};
        Object.keys(fields).forEach(function(key){ if(fields[key]) data[key] = fields[key].value; });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }catch(e){ /* private browsing, storage full, or disabled — ignore */ }
    }
    window.gadeloAddress = { save: saveCurrent };
  })();

  function currentFulfillMethod(){
    var checked = document.querySelector('input[name="fulfillMethod"]:checked');
    return checked ? checked.value : 'pickup';
  }
  function requiredFieldsOk(method){
    if(method === 'pickup') return true;
    var get = function(id){ var el = document.getElementById(id); return el ? el.value.trim() : ''; };
    var basicsOk = get('addrName') && get('addrPhone') && get('addrLine1') && get('addrCity') && get('addrZip');
    if(!basicsOk){ showToast('Please fill in your name, phone, address, city and ZIP first.'); return false; }
    return true;
  }

  // ---------- Payment method: PayPal account vs. card (still via PayPal) ----------
  var paypalContainer = document.getElementById('paypal-button-container');
  var paypalFallback = document.getElementById('paypalFallback');
  var paymentRadios = document.querySelectorAll('input[name="paymentMethod"]');

  function currentPaymentMethod(){
    var checked = document.querySelector('input[name="paymentMethod"]:checked');
    return checked ? checked.value : 'paypal';
  }

  function renderPaypalButtons(mode){
    if(!paypalContainer) return;
    paypalContainer.innerHTML = '';
    if(paypalFallback) paypalFallback.hidden = true;

    if(!window.paypal || typeof paypal.Buttons !== 'function'){
      // SDK failed to load (network/ad-blocker) — show a plain-language fallback
      // instead of a silently broken button.
      if(paypalFallback) paypalFallback.hidden = false;
      return;
    }

    var buttonConfig = {
      style: { layout: 'vertical', color: mode === 'card' ? 'black' : 'gold', shape: 'rect', label: mode === 'card' ? 'pay' : 'paypal' },
      onClick: function(data, actions){
        if(store.items().length === 0){ showToast('Your cart is empty.'); return actions.reject(); }
        if(!requiredFieldsOk(currentFulfillMethod())) return actions.reject();
        return actions.resolve();
      },
      createOrder: function(data, actions){
        var totals = store.totals();
        var method = currentFulfillMethod();
        var get = function(id){ var el = document.getElementById(id); return el ? el.value.trim() : ''; };

        // Itemized line items so the order (products + quantities) shows up in
        // the seller's PayPal Business account under the transaction details,
        // not just a single lump amount.
        var items = store.items().map(function(item){
          return {
            name: (item.nameEn + ' — ' + item.sizeLabel).slice(0, 127),
            unit_amount: { currency_code: 'USD', value: item.unitPrice.toFixed(2) },
            quantity: String(item.qty)
          };
        });

        var purchaseUnit = {
          amount: {
            currency_code: 'USD',
            value: totals.total.toFixed(2),
            breakdown: {
              item_total: { currency_code: 'USD', value: totals.subtotal.toFixed(2) },
              shipping: { currency_code: 'USD', value: totals.shipping.toFixed(2) }
            }
          },
          items: items,
          description: 'GADELO Coffee Roasters order (' + (method === 'pickup' ? 'store pickup' : 'Korea domestic delivery') + ')'
        };

        // Delivery orders also carry the shopper's name + address, so it shows
        // up next to the order in PayPal — not just saved on their own device.
        if(method === 'domestic'){
          purchaseUnit.shipping = {
            type: 'SHIPPING',
            name: { full_name: get('addrName') },
            address: {
              address_line_1: get('addrLine1'),
              address_line_2: get('addrLine2') || undefined,
              admin_area_2: get('addrCity'),
              postal_code: get('addrZip'),
              country_code: 'KR'
            }
          };
        }

        return actions.order.create({ purchase_units: [purchaseUnit] });
      },
      onApprove: function(data, actions){
        return actions.order.capture().then(function(){
          if(window.gadeloAddress) window.gadeloAddress.save();
          store.clear();
          if(checkoutGrid) checkoutGrid.hidden = true;
          if(checkoutSuccess) checkoutSuccess.hidden = false;
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      },
      onError: function(err){
        console.error('[GADELO] PayPal checkout error:', err);
        showToast('Something went wrong placing your order. Please try again.');
      }
    };
    if(mode === 'card') buttonConfig.fundingSource = paypal.FUNDING.CARD;

    paypal.Buttons(buttonConfig).render('#paypal-button-container');
  }

  paymentRadios.forEach(function(r){
    r.addEventListener('change', function(){
      if(r.checked) renderPaypalButtons(r.value);
    });
  });

  renderSummary();
  renderPaypalButtons(currentPaymentMethod());
})();
