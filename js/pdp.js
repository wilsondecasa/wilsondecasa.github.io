// GADELO — product detail page renderer (product.html?blend=fighttonight)
(function(){
  function fmtUSD(n){ return '$' + n.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}); }

  var BADGE_LABEL = { house: 'House Blend', premium: 'Premium Blend', flagship: 'Flagship Blend' };
  var ROAST_LABEL = { light: 'Light Roast', medium: 'Medium Roast', dark: 'Dark Roast' };
  var SIZE_PILL_LABEL = {
    200: {main: '7oz', sub: '(200g)'},
    400: {main: '14oz', sub: '(400g)'},
    1000: {main: '2.2lb', sub: '(1kg)'}
  };

  var params = new URLSearchParams(window.location.search);
  var slug = params.get('blend') || 'fighttonight';
  var product = GADELO_PRODUCTS[slug];

  var root = document.getElementById('pdpRoot');
  var notFoundEl = document.getElementById('pdpNotFound');

  if(!product){
    if(root) root.style.display = 'none';
    if(notFoundEl){
      notFoundEl.style.display = 'block';
      notFoundEl.innerHTML = '<p>Blend not found. Back to <a href="index.html#blends" style="text-decoration:underline;">Our Coffee</a></p>';
    }
    return;
  }

  // Sizes this product actually sells, ascending (Freedom has no 1000/1kg).
  var sizeKeys = Object.keys(product.prices).map(Number).sort(function(a, b){ return a - b; });

  // Gallery: a single actual product photo (the bag for the selected size) —
  // no bean-card marketing thumbnails, no clickable thumbnail strip. Picking a
  // size swaps the main photo directly (see selectSize()).
  var state = { size: sizeKeys[0] === 400 ? 400 : sizeKeys[0], qty: 1, mainSrc: null };
  if(sizeKeys.indexOf(400) !== -1) state.size = 400;

  function setMainImage(src){
    state.mainSrc = src;
    var mainPhoto = document.getElementById('pdpMainPhoto');
    if(mainPhoto){
      if(src){ mainPhoto.src = src; mainPhoto.hidden = false; }
      else { mainPhoto.hidden = true; mainPhoto.removeAttribute('src'); }
    }
  }

  function renderSizePills(){
    var wrap = document.getElementById('pdpSizeRow');
    if(!wrap) return;
    wrap.innerHTML = sizeKeys.map(function(sz){
      var label = SIZE_PILL_LABEL[sz] || {main: sz + 'g', sub: ''};
      return '<button class="pdp-pill pdp-size-opt' + (sz === state.size ? ' active' : '') + '" data-size="' + sz + '">' +
        label.main + ' <span class="pill-sub">' + label.sub + '</span></button>';
    }).join('');
    wrap.querySelectorAll('.pdp-size-opt').forEach(function(btn){
      btn.addEventListener('click', function(){
        selectSize(parseInt(btn.getAttribute('data-size'), 10));
      });
    });
  }

  function selectSize(size){
    state.size = size;
    document.querySelectorAll('.pdp-size-opt').forEach(function(b){
      b.classList.toggle('active', parseInt(b.getAttribute('data-size'), 10) === size);
    });
    var bagSrc = product.images && product.images.bags && product.images.bags[size];
    if(bagSrc) setMainImage(bagSrc);
    renderPrice();
  }

  function renderPrice(){
    var priceEl = document.getElementById('pdpPrice');
    if(!priceEl) return;
    var compare = product.compareAtPrices && product.compareAtPrices[state.size];
    var final = product.prices[state.size];
    var html = '';
    if(compare && compare > final){
      html += '<span class="pdp-price-compare">' + fmtUSD(compare) + '</span>';
      html += '<span class="pdp-price-final">' + fmtUSD(final) + '</span>';
      html += '<span class="discount-badge">Military 10% Off</span>';
    } else {
      html += '<span class="pdp-price-final">' + fmtUSD(final) + '</span>';
    }
    priceEl.innerHTML = html;
  }

  function render(){
    document.title = product.nameEn + ' — GADELO Coffee Roasters';

    document.querySelectorAll('.pdp-crumb-blend').forEach(function(el){
      el.textContent = product.nameEn;
    });

    document.querySelectorAll('.pdp-gallery-main').forEach(function(el){
      el.style.setProperty('--card-bg', product.color);
      el.classList.toggle('has-photo', !!(product.images && product.images.bags));
    });
    var mainNameEn = document.getElementById('pdpMainNameEn');
    if(mainNameEn) mainNameEn.textContent = product.nameEn;

    var badgeText = BADGE_LABEL[product.badge] || product.badge;
    ['pdpBadge', 'pdpBadge2'].forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.textContent = badgeText;
    });

    var roastBadge = document.getElementById('pdpRoastBadge');
    if(roastBadge && product.roastLevel){
      roastBadge.textContent = ROAST_LABEL[product.roastLevel] || product.roastLevel;
    }

    var infoEn = document.getElementById('pdpInfoNameEn');
    if(infoEn) infoEn.textContent = product.nameEn;

    var ratingEl = document.getElementById('pdpRating');
    if(ratingEl) ratingEl.textContent = '☆☆☆☆☆ No reviews yet — be the first';

    var originEl = document.getElementById('pdpOrigin');
    if(originEl) originEl.textContent = product.originEn;

    var descEl = document.getElementById('pdpDesc');
    if(descEl){
      descEl.innerHTML = product.descEn.map(function(p){ return '<p>' + p + '</p>'; }).join('');
    }

    var defaultBagSrc = product.images && product.images.bags && product.images.bags[state.size];
    setMainImage(defaultBagSrc || product.image || null);
    renderSizePills();
    renderPrice();

    var qtyEl = document.getElementById('pdpQtyValue');
    if(qtyEl) qtyEl.textContent = state.qty;
  }

  var qtyMinus = document.getElementById('pdpQtyMinus');
  var qtyPlus = document.getElementById('pdpQtyPlus');
  if(qtyMinus) qtyMinus.addEventListener('click', function(){ state.qty = Math.max(1, state.qty - 1); document.getElementById('pdpQtyValue').textContent = state.qty; });
  if(qtyPlus) qtyPlus.addEventListener('click', function(){ state.qty = Math.min(20, state.qty + 1); document.getElementById('pdpQtyValue').textContent = state.qty; });

  var addBtn = document.getElementById('pdpAddBtn');
  if(addBtn){
    addBtn.addEventListener('click', function(){
      window.gadeloCart.add({
        slug: product.slug,
        nameEn: product.nameEn,
        sizeKey: state.size,
        sizeLabel: window.gadeloCartStore.sizeLabel(state.size),
        qty: state.qty,
        unitPrice: product.prices[state.size],
        color: product.color,
        image: product.image
      });
      window.gadeloCart.open();
    });
  }

  render();
})();
