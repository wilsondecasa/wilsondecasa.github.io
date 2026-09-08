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
    var subtotal = cart.reduce(function(s,i){return s + i.unitPrice * i.qty;}, 0);
    if(cartCountEl) cartCountEl.textContent = totalQty;
    if(cartSubtotalEl) cartSubtotalEl.textContent = fmtUSD(subtotal);

    cartItemsEl.querySelectorAll('.rm').forEach(function(btn){
      btn.addEventListener('click', function(){
        cart.splice(parseInt(btn.getAttribute('data-idx'), 10), 1);
        renderCart();
      });
    });
  }
  document.addEventListener('gadelo:langchange', renderCart);

  var cartDrawer = document.getElementById('cartDrawer');
  var overlay = document.getElementById('overlay');
  function openCart(){ if(cartDrawer){ cartDrawer.classList.add('open'); overlay.classList.add('open'); } }
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
      zip: document.getElementById('addrZip'),
      country: document.getElementById('addrCountry'),
      camp: document.getElementById('addrCamp')
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

  // ---------- Store pickup vs. courier delivery (cart drawer) ----------
  // Delivery shows the address + camp fields; pickup hides them (nothing to ship).
  // Remembers the last choice on this device the same way the address is remembered.
  (function(){
    var FULFILL_KEY = 'gadelo_fulfillment';
    var radios = document.querySelectorAll('input[name="fulfillMethod"]');
    var addressBlock = document.getElementById('cartAddress');
    var pickupNote = document.getElementById('pickupNote');
    if(!radios.length) return;

    function apply(method){
      if(addressBlock) addressBlock.hidden = (method !== 'delivery');
      if(pickupNote) pickupNote.hidden = (method !== 'pickup');
    }

    var saved = 'delivery';
    try{ saved = localStorage.getItem(FULFILL_KEY) || 'delivery'; }catch(e){}
    radios.forEach(function(r){
      r.checked = (r.value === saved);
      r.addEventListener('change', function(){
        if(!r.checked) return;
        apply(r.value);
        try{ localStorage.setItem(FULFILL_KEY, r.value); }catch(e){}
      });
    });
    apply(saved);
  })();

  // ---------- Checkout placeholder ----------
  var checkoutBtn = document.getElementById('checkoutBtn');
  if(checkoutBtn){
    checkoutBtn.addEventListener('click', function(){
      if(cart.length === 0){ showToast(window.gadeloI18n.t('cart.emptyToast')); return; }
      if(window.gadeloAddress) window.gadeloAddress.save();
      alert(window.gadeloI18n.t('cart.checkoutAlert'));
    });
  }

  renderCart();
})();
