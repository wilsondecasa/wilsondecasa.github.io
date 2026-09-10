// GADELO — product detail page renderer (product.html?blend=logos)
(function(){
  function fmtUSD(n){ return '$' + n.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}); }

  var BADGE_LABEL = { house: 'House Blend', premium: 'Premium Blend', flagship: 'Flagship Blend' };
  var ROAST_LABEL = { light: 'Light Roast', medium: 'Medium Roast', dark: 'Dark Roast' };

  var params = new URLSearchParams(window.location.search);
  var slug = params.get('blend') || 'logos';
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

  var state = { size: 400, qty: 1 };

  function render(){
    document.title = product.nameEn + ' — GADELO Coffee Roasters';

    document.querySelectorAll('.pdp-crumb-blend').forEach(function(el){
      el.textContent = product.nameEn;
    });

    document.querySelectorAll('.pdp-gallery-main').forEach(function(el){
      el.style.setProperty('--card-bg', product.color);
      el.classList.toggle('has-photo', !!product.image);
    });
    var mainPhoto = document.getElementById('pdpMainPhoto');
    if(mainPhoto){
      if(product.image){
        mainPhoto.src = product.image;
        mainPhoto.hidden = false;
      } else {
        mainPhoto.hidden = true;
        mainPhoto.removeAttribute('src');
      }
    }
    document.querySelectorAll('.pdp-thumb-swatch').forEach(function(el){
      el.style.background = product.color;
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

    var priceEl = document.getElementById('pdpPrice');
    if(priceEl) priceEl.textContent = fmtUSD(product.prices[state.size]);

    var qtyEl = document.getElementById('pdpQtyValue');
    if(qtyEl) qtyEl.textContent = state.qty;
  }

  document.querySelectorAll('.pdp-size-opt').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('.pdp-size-opt').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      state.size = parseInt(btn.getAttribute('data-size'), 10);
      render();
    });
  });

  var qtyMinus = document.getElementById('pdpQtyMinus');
  var qtyPlus = document.getElementById('pdpQtyPlus');
  if(qtyMinus) qtyMinus.addEventListener('click', function(){ state.qty = Math.max(1, state.qty - 1); render(); });
  if(qtyPlus) qtyPlus.addEventListener('click', function(){ state.qty = Math.min(20, state.qty + 1); render(); });

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
