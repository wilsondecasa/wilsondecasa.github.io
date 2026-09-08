// GADELO — product detail page renderer (product.html?blend=logos)
(function(){
  function fmtUSD(n){ return '$' + n.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}); }

  var params = new URLSearchParams(window.location.search);
  var slug = params.get('blend') || 'logos';
  var product = GADELO_PRODUCTS[slug];

  var root = document.getElementById('pdpRoot');
  var notFoundEl = document.getElementById('pdpNotFound');

  if(!product){
    if(root) root.style.display = 'none';
    if(notFoundEl){
      notFoundEl.style.display = 'block';
      notFoundEl.innerHTML = '<p>' + window.gadeloI18n.t('pdp.notFound') + ' <a href="index.html#blends" style="text-decoration:underline;">' + window.gadeloI18n.t('pdp.breadcrumbShop') + '</a></p>';
    }
    return;
  }

  var state = { size: 400, qty: 1 };

  function render(){
    var lang = window.gadeloI18n.getLang();

    document.title = (lang === 'ko' ? product.nameKo + ' — ' : product.nameEn + ' — ') + 'GADELO Coffee Roasters';

    document.querySelectorAll('.pdp-crumb-blend').forEach(function(el){
      el.textContent = lang === 'ko' ? product.nameKo : product.nameEn;
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
    var mainNameKr = document.getElementById('pdpMainNameKr');
    var mainNameEn = document.getElementById('pdpMainNameEn');
    if(mainNameKr) mainNameKr.textContent = product.nameKo;
    if(mainNameEn) mainNameEn.textContent = product.nameEn;

    var badgeText = window.gadeloI18n.t('badge.' + product.badge);
    ['pdpBadge', 'pdpBadge2'].forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.textContent = badgeText;
    });

    var roastBadge = document.getElementById('pdpRoastBadge');
    if(roastBadge && product.roastLevel){
      roastBadge.textContent = window.gadeloI18n.t('roast.' + product.roastLevel);
    }

    var infoKr = document.getElementById('pdpInfoNameKr');
    var infoEn = document.getElementById('pdpInfoNameEn');
    if(infoKr) infoKr.textContent = product.nameKo;
    if(infoEn) infoEn.textContent = product.nameEn;

    var ratingEl = document.getElementById('pdpRating');
    if(ratingEl) ratingEl.textContent = '☆☆☆☆☆ ' + window.gadeloI18n.t('pdp.reviews');

    var originEl = document.getElementById('pdpOrigin');
    if(originEl) originEl.textContent = lang === 'ko' ? product.originKo : product.originEn;

    var descEl = document.getElementById('pdpDesc');
    if(descEl){
      var paras = lang === 'ko' ? product.descKo : product.descEn;
      descEl.innerHTML = paras.map(function(p){ return '<p>' + p + '</p>'; }).join('');
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
      var sizeLabel = window.gadeloSizeLabel(state.size);
      for(var i = 0; i < state.qty; i++){
        window.gadeloCart.add({
          nameEn: product.nameEn,
          nameKo: product.nameKo,
          size: sizeLabel,
          qty: 1,
          unitPrice: product.prices[state.size],
          color: product.color
        });
      }
      window.gadeloCart.open();
    });
  }

  document.addEventListener('gadelo:langchange', render);
  render();
})();
