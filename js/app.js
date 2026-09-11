// GADELO — shared header, announcement bar, mobile nav, and cart drawer.
// Loaded on every page after products.js and cart-store.js.
//
// The cart drawer is now a single step: items (with qty controls) + cross-sell,
// then one "Checkout" button that sends the shopper to checkout.html, where
// fulfillment and payment method are chosen and the order is actually paid.
// Cart state itself lives in js/cart-store.js (localStorage-backed) so it
// survives that page change.
(function(){

  // ---------- Announcement bar rotation ----------
  var ANNOUNCEMENTS = [
    'Freshly roasted in small batches — never sitting on a shelf.',
    'Checkout securely with PayPal — pay the way you trust.',
    "Ask us about bulk orders for your unit or spouses' club."
  ];
  var ai = 0;
  var announceEl = document.getElementById('announceText');
  if(announceEl){
    announceEl.textContent = ANNOUNCEMENTS[ai];
    setInterval(function(){
      ai = (ai + 1) % ANNOUNCEMENTS.length;
      announceEl.textContent = ANNOUNCEMENTS[ai];
    }, 4500);
  }

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
  // Roast level is looked up from GADELO_PRODUCTS by slug rather than duplicated
  // in a data-roast attribute, so the product data stays the single source of truth.
  (function(){
    var tabs = document.querySelectorAll('.roast-tab');
    var cards = document.querySelectorAll('#blendGrid .blend-card');
    if(!tabs.length || typeof GADELO_PRODUCTS === 'undefined') return;
    tabs.forEach(function(tab){
      tab.addEventListener('click', function(){
        tabs.forEach(function(t){ t.classList.remove('active'); });
        tab.classList.add('active');
        var roast = tab.getAttribute('data-roast');
        cards.forEach(function(card){
          var product = GADELO_PRODUCTS[card.getAttribute('data-slug')];
          var match = roast === 'all' || (product && product.roastLevel === roast);
          card.classList.toggle('roast-hidden', !match);
        });
      });
    });
  })();

  // ---------- Mobile menu ----------
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
    document.addEventListener('click', function(e){
      if(!primaryNav.classList.contains('nav-open')) return;
      if(primaryNav.contains(e.target) || hamburger.contains(e.target)) return;
      primaryNav.classList.remove('nav-open');
    });
  }

  // ---------- Helpers ----------
  var store = window.gadeloCartStore;
  function fmtUSD(n){ return '$' + n.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}); }

  var toastEl = document.getElementById('toast');
  var toastTimer;
  function showToast(msg){
    if(!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, 2200);
  }

  // ---------- Cart drawer open/close ----------
  var cartDrawer = document.getElementById('cartDrawer');
  var overlay = document.getElementById('overlay');
  function openCart(){ if(cartDrawer){ cartDrawer.classList.add('open'); overlay.classList.add('open'); } }
  function closeCart(){ if(cartDrawer){ cartDrawer.classList.remove('open'); overlay.classList.remove('open'); } }
  var cartToggle = document.getElementById('cartToggle');
  var cartClose = document.getElementById('cartClose');
  if(cartToggle) cartToggle.addEventListener('click', openCart);
  if(cartClose) cartClose.addEventListener('click', closeCart);
  if(overlay) overlay.addEventListener('click', closeCart);

  function addToCart(item){
    store.add(item);
    showToast(item.nameEn + ' (' + item.sizeLabel + ') — added to cart');
  }
  window.gadeloCart = { add: addToCart, open: openCart };

  // ---------- Cart drawer rendering ----------
  var cartCountEl = document.getElementById('cartCount');
  var cartItemsEl = document.getElementById('cartItems');
  var cartSubtotalMiniEl = document.getElementById('cartSubtotalMini');

  function renderCartItems(){
    if(!cartItemsEl) return;
    var items = store.items();
    if(items.length === 0){
      cartItemsEl.innerHTML = '<div class="cart-empty">Your cart is empty.<br>Add a blend to get started.</div>';
    } else {
      cartItemsEl.innerHTML = items.map(function(item){
        var swatch = item.image ? ('background-image:url(' + item.image + ')') : ('background:' + item.color);
        return '<div class="cart-line">' +
          '<div class="swatch" style="' + swatch + '"></div>' +
          '<div class="info">' +
            '<div class="nm">' + item.nameEn + '</div>' +
            '<div class="meta">' + item.sizeLabel + '</div>' +
            '<div class="cart-line-qty">' +
              '<div class="qty-stepper sm">' +
                '<button class="qty-minus" data-slug="' + item.slug + '" data-size="' + item.sizeKey + '" aria-label="Decrease quantity">&minus;</button>' +
                '<span>' + item.qty + '</span>' +
                '<button class="qty-plus" data-slug="' + item.slug + '" data-size="' + item.sizeKey + '" aria-label="Increase quantity">+</button>' +
              '</div>' +
              '<button class="rm" data-slug="' + item.slug + '" data-size="' + item.sizeKey + '">Remove</button>' +
            '</div>' +
          '</div>' +
          '<div class="qty-price">' + fmtUSD(item.unitPrice * item.qty) + '</div>' +
        '</div>';
      }).join('');
    }

    if(cartCountEl) cartCountEl.textContent = store.count();
    if(cartSubtotalMiniEl) cartSubtotalMiniEl.textContent = fmtUSD(store.subtotal());

    cartItemsEl.querySelectorAll('.qty-minus').forEach(function(btn){
      btn.addEventListener('click', function(){
        var slug = btn.getAttribute('data-slug'), size = btn.getAttribute('data-size');
        var item = store.items().find(function(i){ return i.slug === slug && String(i.sizeKey) === size; });
        if(item) store.setQty(slug, item.sizeKey, item.qty - 1);
      });
    });
    cartItemsEl.querySelectorAll('.qty-plus').forEach(function(btn){
      btn.addEventListener('click', function(){
        var slug = btn.getAttribute('data-slug'), size = btn.getAttribute('data-size');
        var item = store.items().find(function(i){ return i.slug === slug && String(i.sizeKey) === size; });
        if(item) store.setQty(slug, item.sizeKey, item.qty + 1);
      });
    });
    cartItemsEl.querySelectorAll('.rm').forEach(function(btn){
      btn.addEventListener('click', function(){
        var slug = btn.getAttribute('data-slug'), size = btn.getAttribute('data-size');
        var item = store.items().find(function(i){ return i.slug === slug && String(i.sizeKey) === size; });
        store.remove(slug, item ? item.sizeKey : size);
      });
    });
  }

  // ---------- Cross-sell: "You Might Also Like" other core-lineup blends ----------
  function renderCrosssell(){
    var wrap = document.getElementById('cartCrosssell');
    var list = document.getElementById('crosssellList');
    if(!wrap || !list || typeof GADELO_PRODUCTS === 'undefined') return;
    var cartItems = store.items();
    if(cartItems.length === 0){ wrap.hidden = true; return; }
    var inCart = {};
    cartItems.forEach(function(i){ inCart[i.slug] = true; });
    var candidates = Object.keys(GADELO_PRODUCTS).map(function(k){ return GADELO_PRODUCTS[k]; })
      .filter(function(p){ return p.line === 'core' && !inCart[p.slug]; })
      .slice(0, 2);
    if(!candidates.length){ wrap.hidden = true; return; }
    list.innerHTML = candidates.map(function(p){
      var price = p.prices[400];
      var swatch = p.image ? ('background-image:url(' + p.image + ')') : ('background:' + p.color);
      return '<div class="crosssell-card">' +
        '<div class="swatch" style="' + swatch + '"></div>' +
        '<div class="info"><div class="nm">' + p.nameEn + '</div><div class="pr">' + fmtUSD(price) + '</div></div>' +
        '<button type="button" class="crosssell-add" data-slug="' + p.slug + '">Add to Cart</button>' +
      '</div>';
    }).join('');
    list.querySelectorAll('.crosssell-add').forEach(function(btn){
      btn.addEventListener('click', function(){
        var p = GADELO_PRODUCTS[btn.getAttribute('data-slug')];
        if(!p) return;
        addToCart({ slug: p.slug, nameEn: p.nameEn, sizeKey: 400, sizeLabel: store.sizeLabel(400), qty: 1, unitPrice: p.prices[400], color: p.color, image: p.image });
      });
    });
    wrap.hidden = false;
  }

  function renderCart(){
    renderCartItems();
    renderCrosssell();
  }
  document.addEventListener('gadelo:cartchange', renderCart);

  // ---------- Checkout hand-off ----------
  var goCheckoutBtn = document.getElementById('goCheckout');
  if(goCheckoutBtn){
    goCheckoutBtn.addEventListener('click', function(){
      if(store.items().length === 0){ showToast('Your cart is empty.'); return; }
      window.location.href = 'checkout.html';
    });
  }

  // ---------- Product cards on the homepage grid: size switch + add to cart ----------
  // Card markup only carries data-slug — name/price/color/roast all come from
  // GADELO_PRODUCTS so there's one source of truth instead of duplicated data-* attrs.
  document.querySelectorAll('.blend-card').forEach(function(card){
    var slug = card.getAttribute('data-slug');
    var product = typeof GADELO_PRODUCTS !== 'undefined' ? GADELO_PRODUCTS[slug] : null;
    if(!product) return;

    var sizeOpts = card.querySelectorAll('.size-opt');
    var priceEl = card.querySelector('.price');
    var addBtn = card.querySelector('.add-btn');
    var currentSize = 400;

    function updatePrice(){
      if(!priceEl) return;
      var compare = product.compareAtPrices && product.compareAtPrices[currentSize];
      var final = product.prices[currentSize];
      var html = '';
      if(compare && compare > final){
        html += '<span class="price-compare">' + fmtUSD(compare) + '</span>';
        html += '<span class="price-final">' + fmtUSD(final) + '</span>';
        html += '<span class="discount-badge">Military 10% Off</span>';
      } else {
        html += '<span class="price-final">' + fmtUSD(final) + '</span>';
      }
      priceEl.innerHTML = html;
    }

    sizeOpts.forEach(function(opt){
      opt.addEventListener('click', function(){
        sizeOpts.forEach(function(o){ o.classList.remove('active'); });
        opt.classList.add('active');
        currentSize = parseInt(opt.getAttribute('data-size'), 10);
        updatePrice();
      });
    });
    updatePrice();

    if(addBtn){
      addBtn.addEventListener('click', function(){
        addToCart({
          slug: product.slug,
          nameEn: product.nameEn,
          sizeKey: currentSize,
          sizeLabel: store.sizeLabel(currentSize),
          qty: 1,
          unitPrice: product.prices[currentSize],
          color: product.color,
          image: product.image
        });
      });
    }
  });

  renderCart();
})();
