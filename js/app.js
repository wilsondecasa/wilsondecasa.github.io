// GADELO — shared header, announcement bar, mobile nav, and cart drawer logic.
// Loaded on every page after products.js and i18n.js.
(function(){

  // ---------- Announcement bar rotation ----------
  var announceKeys = ["announce.1", "announce.2", "announce.3"];
  var ai = 0;
  var announceEl = document.getElementById('announceText');
  function tickAnnounce(){
    if(!announceEl) return;
    announceEl.textContent = window.gadeloI18n.t(announceKeys[ai]);
  }
  if(announceEl){
    tickAnnounce();
    setInterval(function(){
      ai = (ai + 1) % announceKeys.length;
      tickAnnounce();
    }, 4500);
  }
  document.addEventListener('gadelo:langchange', tickAnnounce);

  // ---------- Hero carousel (whole hero section rotates through slides; no reload) ----------
  (function(){
    var slides = document.querySelectorAll('#heroCarouselFull .hero-slide-full');
    var dots = document.querySelectorAll('#heroDots .hero-dot');
    if(!slides.length) return;
    var idx = 0;
    var timer;
    function goTo(next){
      if(next === idx) return;
      slides[idx].classList.remove('active');
      slides[idx].classList.add('exit-left');
      slides[next].classList.add('active');
      if(dots[idx]) dots[idx].classList.remove('active');
      if(dots[next]) dots[next].classList.add('active');
      var leaving = slides[idx];
      setTimeout(function(){ leaving.classList.remove('exit-left'); }, 720);
      idx = next;
    }
    function nextSlide(){ goTo((idx + 1) % slides.length); }
    function start(){ stop(); timer = setInterval(nextSlide, 6000); }
    function stop(){ clearInterval(timer); }
    dots.forEach(function(dot, i){
      dot.addEventListener('click', function(){ goTo(i); start(); });
    });
    var carousel = document.getElementById('heroCarouselFull');
    if(carousel){
      carousel.addEventListener('mouseenter', stop);
      carousel.addEventListener('mouseleave', start);
    }
    start();
  })();

  // ---------- Roast level filter (Our Coffee section) ----------
  (function(){
    var tabs = document.querySelectorAll('.roast-tab');
    // Scoped to the core-lineup grid — it's the only blend grid on the homepage.
    var cards = document.querySelectorAll('#blendGrid .blend-card');
    if(!tabs.length) return;
    tabs.forEach(function(tab){
      tab.addEventListener('click', function(){
        tabs.forEach(function(t){ t.classList.remove('active'); });
        tab.classList.add('active');
        var roast = tab.getAttribute('data-roast');
        cards.forEach(function(card){
          var match = roast === 'all' || card.getAttribute('data-roast') === roast;
          card.classList.toggle('roast-hidden', !match);
        });
      });
    });
  })();

  // ---------- Mobile menu ----------
  // Uses a CSS class toggle (see .nav-open in the ≤720px media query) instead of
  // inline styles, so the dropdown's colors always match the current theme and
  // don't need to be duplicated/kept in sync here.
  var hamburger = document.getElementById('hamburgerBtn');
  var primaryNav = document.querySelector('nav.primary');
  if(hamburger && primaryNav){
    hamburger.addEventListener('click', function(){
      primaryNav.classList.toggle('nav-open');
    });
    primaryNav.querySelectorAll('a').forEach(function(link){
      link.addEventListener('click', function(){
        primaryNav.classList.remove('nav-open');
      });
    });
    // Tapping/clicking outside the open dropdown closes it.
    document.addEventListener('click', function(e){
      if(!primaryNav.classList.contains('nav-open')) return;
      if(primaryNav.contains(e.target) || hamburger.contains(e.target)) return;
      primaryNav.classList.remove('nav-open');
    });
  }

  // ---------- Cart state (persists for the tab session only) ----------
  var cart = []; // {nameEn, nameKo, size, qty, unitPrice, color}
  var cartCountEl = document.getElementById('cartCount');
  var cartItemsEl = document.getElementById('cartItems');
  var cartSubtotalEl = document.getElementById('cartSubtotal');

  function fmtUSD(n){ return '$' + n.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}); }

  // Only 400g and 1kg bags are sold. Displayed in oz/lb for the U.S.-based audience;
  // the internal data-size / prices keys stay in grams (400/1000) everywhere else.
  // 400g ships as two separate 200g (~7oz) bags — called out here since it's not obvious from "14oz".
  function sizeLabelFor(sizeKey){
    return sizeKey === '1000' || sizeKey === 1000 ? '2.2lb' : '14oz (2 x 7oz bags)';
  }
  window.gadeloSizeLabel = sizeLabelFor;

  function productLabel(item){
    var lang = window.gadeloI18n.getLang();
    return lang === 'ko' ? (item.nameKo + ' (' + item.nameEn + ')') : (item.nameEn + ' (' + item.nameKo + ')');
  }

  function renderCart(){
    if(!cartItemsEl) return;
    if(cart.length === 0){
      cartItemsEl.innerHTML = '<div class="cart-empty">' + window.gadeloI18n.t('cart.empty') + '</div>';
    } else {
      cartItemsEl.innerHTML = cart.map(function(item, idx){
        return '<div class="cart-line">' +
          '<div class="swatch" style="background:' + item.color + '"></div>' +
          '<div class="info">' +
            '<div class="nm">' + productLabel(item) + '</div>' +
            '<div class="meta">' + item.size + ' &times; ' + item.qty + '</div>' +
            '<button class="rm" data-idx="' + idx + '">' + window.gadeloI18n.t('cart.remove') + '</button>' +
          '</div>' +
          '<div class="qty-price">' + fmtUSD(item.unitPrice * item.qty) + '</div>' +
        '</div>';
      }).join('');
    }
    var totalQty = cart.reduce(function(s,i){return s + i.qty;}, 0);
    if(cartCountEl) cartCountEl.textContent = totalQty;

    cartItemsEl.querySelectorAll('.rm').forEach(function(btn){
      btn.addEventListener('click', function(){
        cart.splice(parseInt(btn.getAttribute('data-idx'), 10), 1);
        renderCart();
      });
    });

    renderShipProgress();
    renderCrosssell();
    renderSummary();
  }
  document.addEventListener('gadelo:langchange', renderCart);

  // ---------- Free-shipping progress bar (cart view) ----------
  // Shown against the $50 domestic-delivery free-shipping threshold below, regardless
  // of which fulfillment method ends up chosen on the checkout screen (that choice isn't
  // made yet at this point in the flow) — pickup is already free either way.
  function renderShipProgress(){
    var el = document.getElementById('shipProgress');
    var fill = document.getElementById('shipProgressFill');
    var label = document.getElementById('shipProgressLabel');
    if(!el) return;
    if(cart.length === 0){ el.hidden = true; return; }
    var threshold = (window.gadeloFulfillment && window.gadeloFulfillment.freeShipThreshold) || 50;
    var subtotal = cart.reduce(function(s,i){return s + i.unitPrice * i.qty;}, 0);
    var pct = Math.max(0, Math.min(100, (subtotal / threshold) * 100));
    if(fill) fill.style.width = pct + '%';
    var remaining = Math.max(0, threshold - subtotal);
    if(label){
      label.innerHTML = remaining > 0
        ? window.gadeloI18n.t('cart.shipProgress').replace('{amount}', '<b>' + fmtUSD(remaining) + '</b>')
        : window.gadeloI18n.t('cart.shipProgressDone');
    }
    el.hidden = false;
  }

  // ---------- Cross-sell: "you might also like" other core-lineup blends ----------
  function renderCrosssell(){
    var wrap = document.getElementById('cartCrosssell');
    var list = document.getElementById('crosssellList');
    if(!wrap || !list || typeof GADELO_PRODUCTS === 'undefined') return;
    if(cart.length === 0){ wrap.hidden = true; return; }
    var inCart = {};
    cart.forEach(function(i){ inCart[i.nameEn] = true; });
    var candidates = Object.keys(GADELO_PRODUCTS).map(function(k){ return GADELO_PRODUCTS[k]; })
      .filter(function(p){ return p.line === 'core' && !inCart[p.nameEn]; })
      .slice(0, 2);
    if(!candidates.length){ wrap.hidden = true; return; }
    list.innerHTML = candidates.map(function(p){
      var price = p.prices[400];
      var swatch = p.image ? ('background-image:url(' + p.image + ')') : ('background:' + p.color);
      return '<div class="crosssell-card">' +
        '<div class="swatch" style="' + swatch + '"></div>' +
        '<div class="info"><div class="nm">' + productLabel(p) + '</div><div class="pr">' + fmtUSD(price) + '</div></div>' +
        '<button type="button" class="crosssell-add" data-slug="' + p.slug + '">' + window.gadeloI18n.t('add.cart') + '</button>' +
      '</div>';
    }).join('');
    list.querySelectorAll('.crosssell-add').forEach(function(btn){
      btn.addEventListener('click', function(){
        var p = GADELO_PRODUCTS[btn.getAttribute('data-slug')];
        if(!p) return;
        addToCart({ nameEn: p.nameEn, nameKo: p.nameKo, size: sizeLabelFor(400), qty: 1, unitPrice: p.prices[400], color: p.color });
      });
    });
    wrap.hidden = false;
  }

  // ---------- Order summary: subtotal, promo discount, shipping, total ----------
  // Shared by the cart drawer display and the PayPal/Telegram checkout flow below, so
  // the amount shown to the customer and the amount actually charged always match.
  var PROMO_CODES = { 'MILITARY10': 0.10 };
  var appliedPromo = null; // { code, rate } | null
  var cartSubtotalMiniEl = document.getElementById('cartSubtotalMini');
  var discountRowEl = document.getElementById('discountRow');
  var cartDiscountEl = document.getElementById('cartDiscount');
  var cartShippingEl = document.getElementById('cartShipping');
  var cartTotalEl = document.getElementById('cartTotal');

  function computeTotals(){
    var subtotal = cart.reduce(function(s,i){return s + i.unitPrice * i.qty;}, 0);
    var discount = appliedPromo ? subtotal * appliedPromo.rate : 0;
    var shipping = (cart.length && window.gadeloFulfillment) ? window.gadeloFulfillment.fee(subtotal) : 0;
    var total = Math.max(0, subtotal - discount + shipping);
    return { subtotal: subtotal, discount: discount, shipping: shipping, total: total };
  }
  window.gadeloCartTotals = computeTotals;

  function renderSummary(){
    var t = computeTotals();
    if(cartSubtotalEl) cartSubtotalEl.textContent = fmtUSD(t.subtotal);
    if(cartSubtotalMiniEl) cartSubtotalMiniEl.textContent = fmtUSD(t.subtotal);
    if(discountRowEl) discountRowEl.hidden = !(appliedPromo && t.discount > 0);
    if(cartDiscountEl) cartDiscountEl.textContent = '-' + fmtUSD(t.discount);
    if(cartShippingEl) cartShippingEl.textContent = t.shipping > 0 ? fmtUSD(t.shipping) : window.gadeloI18n.t('cart.free');
    if(cartTotalEl) cartTotalEl.textContent = fmtUSD(t.total);
  }

  // ---------- Promo code ----------
  var promoInput = document.getElementById('promoInput');
  var promoApplyBtn = document.getElementById('promoApplyBtn');
  var promoMsgEl = document.getElementById('promoMsg');
  function showPromoMsg(text, isError){
    if(!promoMsgEl) return;
    promoMsgEl.textContent = text;
    promoMsgEl.hidden = false;
    promoMsgEl.classList.toggle('is-error', !!isError);
    promoMsgEl.classList.toggle('is-success', !isError);
  }
  if(promoApplyBtn){
    promoApplyBtn.addEventListener('click', function(){
      var code = (promoInput.value || '').trim().toUpperCase();
      if(!code) return;
      if(PROMO_CODES[code]){
        appliedPromo = { code: code, rate: PROMO_CODES[code] };
        showPromoMsg(window.gadeloI18n.t('promo.applied'), false);
      } else {
        appliedPromo = null;
        showPromoMsg(window.gadeloI18n.t('promo.invalid'), true);
      }
      renderSummary();
    });
  }

  // ---------- Cart drawer: two-step flow (item review -> checkout/payment) ----------
  // cartView is items + a free-shipping nudge + cross-sell + two checkout entry points.
  // checkoutView is fulfillment + address + promo + summary + the actual PayPal button —
  // reached only after clicking one of those two entry points, modeled on the
  // cart-drawer -> dedicated-checkout-page pattern other coffee/retail sites use.
  var cartView = document.getElementById('cartView');
  var checkoutView = document.getElementById('checkoutView');
  var goCheckoutPaypalBtn = document.getElementById('goCheckoutPaypal');
  var goCheckoutCardBtn = document.getElementById('goCheckoutCard');
  var checkoutBackBtn = document.getElementById('checkoutBack');
  var checkoutEntryMethod = 'paypal'; // 'paypal' | 'card' — which entry point was clicked

  function showCartView(){
    if(cartView) cartView.hidden = false;
    if(checkoutView) checkoutView.hidden = true;
  }
  function showCheckoutView(entryMethod){
    if(cart.length === 0){ showToast(window.gadeloI18n.t('cart.emptyToast')); return; }
    checkoutEntryMethod = entryMethod;
    if(cartView) cartView.hidden = true;
    if(checkoutView) checkoutView.hidden = false;
    renderPaypalButtons(checkoutEntryMethod);
  }
  if(goCheckoutPaypalBtn) goCheckoutPaypalBtn.addEventListener('click', function(){ showCheckoutView('paypal'); });
  if(goCheckoutCardBtn) goCheckoutCardBtn.addEventListener('click', function(){ showCheckoutView('card'); });
  if(checkoutBackBtn) checkoutBackBtn.addEventListener('click', showCartView);

  var cartDrawer = document.getElementById('cartDrawer');
  var overlay = document.getElementById('overlay');
  function openCart(){ if(cartDrawer){ cartDrawer.classList.add('open'); overlay.classList.add('open'); showCartView(); } }
  function closeCart(){ if(cartDrawer){ cartDrawer.classList.remove('open'); overlay.classList.remove('open'); } }
  var cartToggle = document.getElementById('cartToggle');
  var cartClose = document.getElementById('cartClose');
  if(cartToggle) cartToggle.addEventListener('click', openCart);
  if(cartClose) cartClose.addEventListener('click', closeCart);
  if(overlay) overlay.addEventListener('click', closeCart);

  var toastEl = document.getElementById('toast');
  var toastTimer;
  function showToast(msg){
    if(!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, 2200);
  }

  function addToCart(item){
    var existing = cart.find(function(i){ return i.nameEn === item.nameEn && i.size === item.size; });
    if(existing){ existing.qty += 1; } else { cart.push(item); }
    renderCart();
    showToast(productLabel(item) + ' (' + item.size + ') — ' + window.gadeloI18n.t('add.cart').toLowerCase());
  }
  window.gadeloCart = { add: addToCart, open: openCart };

  // ---------- Product cards on the homepage grid: size switch + add to cart ----------
  document.querySelectorAll('.blend-card').forEach(function(card){
    var sizeOpts = card.querySelectorAll('.size-opt');
    var priceEl = card.querySelector('.price');
    var addBtn = card.querySelector('.add-btn');
    var currentSize = '400';

    function currentPrice(){ return parseFloat(card.getAttribute('data-p' + currentSize)); }
    function updatePrice(){ if(priceEl) priceEl.textContent = fmtUSD(currentPrice()); }

    sizeOpts.forEach(function(opt){
      opt.addEventListener('click', function(){
        sizeOpts.forEach(function(o){ o.classList.remove('active'); });
        opt.classList.add('active');
        currentSize = opt.getAttribute('data-size');
        updatePrice();
      });
    });

    if(addBtn){
      addBtn.addEventListener('click', function(){
        var sizeLabel = sizeLabelFor(currentSize);
        addToCart({
          nameEn: card.getAttribute('data-name-en'),
          nameKo: card.getAttribute('data-name-ko'),
          size: sizeLabel,
          qty: 1,
          unitPrice: currentPrice(),
          color: card.getAttribute('data-color')
        });
      });
    }
  });

  // ---------- Saved shipping address (this browser only — no account or login) ----------
  // Auto-fills the cart's address form from the last order placed on this device,
  // and saves whatever is in the form the next time an order goes through.
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
    if(!fields.name) { window.gadeloAddress = { save: function(){} }; return; }

    function loadSaved(){
      try{
        var raw = localStorage.getItem(STORAGE_KEY);
        if(!raw) return;
        var data = JSON.parse(raw);
        Object.keys(fields).forEach(function(key){
          if(fields[key] && data[key]) fields[key].value = data[key];
        });
      }catch(e){ /* storage unavailable or corrupt — form just stays blank */ }
    }

    function saveCurrent(){
      try{
        var data = {};
        Object.keys(fields).forEach(function(key){
          if(fields[key]) data[key] = fields[key].value;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }catch(e){ /* private browsing, storage full, or disabled — ignore */ }
    }

    loadSaved();
    window.gadeloAddress = { save: saveCurrent };
  })();

  // ---------- USFK camp select (delivery only) ----------
  // The camp dropdown means "the camp you're stationed at / work out of" — living
  // off-post doesn't change this, so the label spells that out rather than assuming
  // the customer lives on base.
  // (No JS logic needed beyond what's already in the saved-address IIFE above; this
  // comment exists so the intent is documented next to the related code.)

  // ---------- Fulfillment: store pickup / Korea domestic delivery ----------
  // Scoped down to these two for now — USFK APO/FPO mail is shelved pending a separate
  // look at how on-post personnel receive parcel deliveries, and can come back later.
  // Pickup hides the address block entirely (nothing to ship). Domestic delivery's flat
  // fee is waived once the subtotal clears FREE_SHIP_THRESHOLD (see also the cart-view
  // progress bar, which nudges toward the same threshold). Remembers the last choice on
  // this device the same way the address is remembered.
  (function(){
    var FULFILL_KEY = 'gadelo_fulfillment';
    var FULFILL_FEES = { pickup: 0, domestic: 4.00 };
    var FREE_SHIP_THRESHOLD = 50; // USD subtotal — domestic delivery fee waived at/above this
    var radios = document.querySelectorAll('input[name="fulfillMethod"]');
    var addressBlock = document.getElementById('cartAddress');
    var pickupNote = document.getElementById('pickupNote');
    if(!radios.length) return;

    function currentMethod(){
      var checked = document.querySelector('input[name="fulfillMethod"]:checked');
      return (checked && FULFILL_FEES.hasOwnProperty(checked.value)) ? checked.value : 'pickup';
    }

    function apply(method){
      if(addressBlock) addressBlock.hidden = (method === 'pickup');
      if(pickupNote) pickupNote.hidden = (method !== 'pickup');
      renderSummary();
    }

    var saved = 'pickup';
    try{ saved = localStorage.getItem(FULFILL_KEY) || 'pickup'; }catch(e){}
    if(!FULFILL_FEES.hasOwnProperty(saved)) saved = 'pickup'; // guard against a stale value (e.g. the old apofpo option)
    radios.forEach(function(r){
      r.checked = (r.value === saved);
      r.addEventListener('change', function(){
        if(!r.checked) return;
        apply(r.value);
        try{ localStorage.setItem(FULFILL_KEY, r.value); }catch(e){}
      });
    });
    apply(saved);

    window.gadeloFulfillment = {
      current: currentMethod,
      fee: function(subtotal){
        var method = currentMethod();
        if(method === 'domestic' && typeof subtotal === 'number' && subtotal >= FREE_SHIP_THRESHOLD) return 0;
        return FULFILL_FEES[method] || 0;
      },
      freeShipThreshold: FREE_SHIP_THRESHOLD,
      label: function(){ return window.gadeloI18n.t('fulfill.' + currentMethod()); }
    };
  })();

  // ---------- PayPal checkout — single combined-total button, rendered on demand ----------
  // Renders one PayPal Buttons instance for the whole cart (subtotal - discount +
  // shipping) instead of a button per item. createOrder() reads the live total at click
  // time via computeTotals(), so it always reflects the current cart, promo code, and
  // shipping method with no need to re-render the button when any of those change.
  //
  // renderPaypalButtons(mode) is called each time the checkout screen opens rather than
  // once at page load, because which button set to show depends on which entry point the
  // customer clicked in the cart ('paypal' = the standard PayPal login button; 'card' =
  // PayPal's own guest card-entry button, restricted to the CARD funding source, so a
  // customer without a PayPal account can pay by debit/credit card without one).
  var paypalContainer = document.getElementById('paypal-button-container');
  var paypalFallback = document.getElementById('paypalFallback');

  function requiredFieldsOk(method){
    if(method === 'pickup') return true;
    var get = function(id){ var el = document.getElementById(id); return el ? el.value.trim() : ''; };
    var basicsOk = get('addrName') && get('addrPhone') && get('addrLine1') && get('addrCity') && get('addrZip');
    if(!basicsOk){ showToast(window.gadeloI18n.t('cart.fillRequired')); return false; }
    return true;
  }

  function renderPaypalButtons(mode){
    if(!paypalContainer) return;
    paypalContainer.innerHTML = '';
    if(paypalFallback) paypalFallback.hidden = true;

    if(!window.paypal || typeof paypal.Buttons !== 'function'){
      // SDK failed to load (network/ad-blocker) — show a plain-language fallback instead
      // of a silently broken button.
      if(paypalFallback) paypalFallback.hidden = false;
      return;
    }

    var buttonConfig = {
      style: { layout: 'vertical', color: mode === 'card' ? 'black' : 'gold', shape: 'rect', label: mode === 'card' ? 'pay' : 'paypal' },
      onClick: function(data, actions){
        if(cart.length === 0){ showToast(window.gadeloI18n.t('cart.emptyToast')); return actions.reject(); }
        var method = window.gadeloFulfillment ? window.gadeloFulfillment.current() : 'pickup';
        if(!requiredFieldsOk(method)) return actions.reject();
        return actions.resolve();
      },
      createOrder: function(data, actions){
        var totals = computeTotals();
        return actions.order.create({
          purchase_units: [{
            amount: { currency_code: 'USD', value: totals.total.toFixed(2) },
            description: 'GADELO Coffee Roasters order'
          }]
        });
      },
      onApprove: function(data, actions){
        return actions.order.capture().then(function(details){
          sendTelegramNotification(details);
          if(window.gadeloAddress) window.gadeloAddress.save();
          cart = [];
          renderCart();
          showCartView();
          closeCart();
          showToast(window.gadeloI18n.t('cart.orderSuccess'));
        });
      },
      onError: function(err){
        console.error('[GADELO] PayPal checkout error:', err);
        showToast(window.gadeloI18n.t('cart.orderError'));
      }
    };
    if(mode === 'card') buttonConfig.fundingSource = paypal.FUNDING.CARD;

    paypal.Buttons(buttonConfig).render('#paypal-button-container');
  }

  // ---------- Telegram order notification ----------
  // ⚠️ Placeholder credentials — set these to your real bot token / chat id before launch.
  // Security note: this is a static site with no backend (GitHub Pages), so whatever is
  // written here is visible to anyone who views the page source or the Network tab. A
  // Telegram bot token only grants "act as this bot" (send messages, read updates for
  // chats it's in) rather than full account access, but a publicly-readable token can
  // still be copied and used to spam through your bot. If that risk isn't acceptable,
  // route this fetch through a small serverless relay (e.g. a Cloudflare Worker or a
  // Google Apps Script Web App) that holds the real token server-side, and point the
  // fetch below at that relay's URL instead of api.telegram.org directly.
  var TELEGRAM_BOT_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN';
  var TELEGRAM_CHAT_ID = 'YOUR_TELEGRAM_CHAT_ID';

  function sendTelegramNotification(paypalDetails){
    if(TELEGRAM_BOT_TOKEN === 'YOUR_TELEGRAM_BOT_TOKEN' || !TELEGRAM_CHAT_ID){
      console.warn('[GADELO] Telegram notification skipped — set TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID in js/app.js.');
      return;
    }
    var totals = computeTotals();
    var method = window.gadeloFulfillment ? window.gadeloFulfillment.label() : '';
    var get = function(id){ var el = document.getElementById(id); return el ? el.value.trim() : ''; };
    var itemLines = cart.map(function(item){
      return '• ' + item.nameEn + ' (' + item.nameKo + ') — ' + item.size + ' x' + item.qty + ' — ' + fmtUSD(item.unitPrice * item.qty);
    }).join('\n');

    var addrBlock = document.getElementById('cartAddress');
    var addrLines = '';
    if(addrBlock && !addrBlock.hidden){
      addrLines = [
        get('addrName'), get('addrPhone'), get('addrEmail'),
        get('addrLine1'), get('addrLine2'),
        (get('addrCity') + ' ' + get('addrZip')).trim()
      ].filter(Boolean).join('\n');
    }

    var textLines = [
      '🛒 New GADELO order',
      '',
      'Order ID: ' + (paypalDetails && paypalDetails.id ? paypalDetails.id : 'n/a'),
      'Fulfillment: ' + method,
      '',
      'Items:',
      itemLines,
      '',
      'Subtotal: ' + fmtUSD(totals.subtotal)
    ];
    if(totals.discount > 0) textLines.push('Discount: -' + fmtUSD(totals.discount));
    textLines.push('Shipping: ' + (totals.shipping > 0 ? fmtUSD(totals.shipping) : window.gadeloI18n.t('cart.free')));
    textLines.push('Total: ' + fmtUSD(totals.total));
    textLines.push('');
    textLines.push(addrLines ? ('Ship to:\n' + addrLines) : 'Store pickup — no shipping address');

    fetch('https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: textLines.join('\n') })
    }).catch(function(err){
      console.error('[GADELO] Telegram notification failed:', err);
    });
  }

  renderCart();
})();
