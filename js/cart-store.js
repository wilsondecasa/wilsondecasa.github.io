// GADELO — shared cart store
//
// Single source of truth for the cart, persisted to localStorage so it survives
// navigation between index.html, product.html and checkout.html (the previous
// build kept the cart in an in-memory JS variable, which meant it reset itself
// on every page load/navigation — the checkout flow now needs it to survive
// moving from the cart drawer to the dedicated checkout page).
//
// Every page that touches the cart (app.js, pdp.js, checkout.js) reads/writes
// through window.gadeloCartStore rather than keeping its own copy, and listens
// for the 'gadelo:cartchange' event to re-render when it changes — including
// changes made from another tab (via the native 'storage' event).
(function(){
  var STORAGE_KEY = 'gadelo_cart_v2';
  var FULFILL_KEY = 'gadelo_fulfillment';
  var FULFILL_FEES = { pickup: 0, domestic: 4.00 };
  var FREE_SHIP_THRESHOLD = 50; // USD subtotal — domestic delivery fee waived at/above this

  function notify(){
    document.dispatchEvent(new CustomEvent('gadelo:cartchange'));
  }

  function readItems(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      var items = raw ? JSON.parse(raw) : [];
      return Array.isArray(items) ? items : [];
    }catch(e){ return []; }
  }

  function writeItems(items){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }catch(e){ /* storage unavailable — cart just won't persist */ }
    notify();
  }

  // item: {slug, nameEn, sizeKey (200|400|1000), sizeLabel, unitPrice, color, image, qty}
  function add(item){
    var items = readItems();
    var existing = items.find(function(i){ return i.slug === item.slug && i.sizeKey === item.sizeKey; });
    if(existing){
      existing.qty += (item.qty || 1);
    } else {
      items.push({
        slug: item.slug,
        nameEn: item.nameEn,
        sizeKey: item.sizeKey,
        sizeLabel: item.sizeLabel,
        unitPrice: item.unitPrice,
        color: item.color || '#242611',
        image: item.image || null,
        qty: item.qty || 1
      });
    }
    writeItems(items);
  }

  function setQty(slug, sizeKey, qty){
    var items = readItems();
    var idx = items.findIndex(function(i){ return i.slug === slug && i.sizeKey === sizeKey; });
    if(idx === -1) return;
    if(qty <= 0){ items.splice(idx, 1); } else { items[idx].qty = qty; }
    writeItems(items);
  }

  function remove(slug, sizeKey){ setQty(slug, sizeKey, 0); }

  function clear(){ writeItems([]); }

  function items(){ return readItems(); }

  function count(){ return readItems().reduce(function(s, i){ return s + i.qty; }, 0); }

  function subtotal(){ return readItems().reduce(function(s, i){ return s + i.unitPrice * i.qty; }, 0); }

  // ---------- Fulfillment (pickup / Korea domestic delivery) ----------
  // Scoped to these two for now, per current shipping coverage — international/APO
  // delivery is out of scope until that coverage is added later.
  function getFulfillment(){
    var saved = 'pickup';
    try{ saved = localStorage.getItem(FULFILL_KEY) || 'pickup'; }catch(e){}
    return FULFILL_FEES.hasOwnProperty(saved) ? saved : 'pickup';
  }
  function setFulfillment(method){
    if(!FULFILL_FEES.hasOwnProperty(method)) return;
    try{ localStorage.setItem(FULFILL_KEY, method); }catch(e){}
    notify();
  }
  function shippingFee(){
    var method = getFulfillment();
    var sub = subtotal();
    if(method === 'domestic' && sub >= FREE_SHIP_THRESHOLD) return 0;
    return FULFILL_FEES[method] || 0;
  }
  function totals(){
    var sub = subtotal();
    var ship = items().length ? shippingFee() : 0;
    return { subtotal: sub, shipping: ship, total: sub + ship };
  }

  var SIZE_LABELS = {
    200: '7.05 oz (200g)',
    400: '14.11 oz (400g)',
    1000: '2.20 lb (1kg)'
  };
  function sizeLabelFor(sizeKey){
    return SIZE_LABELS[Number(sizeKey)] || (sizeKey + 'g');
  }

  window.gadeloCartStore = {
    items: items,
    add: add,
    setQty: setQty,
    remove: remove,
    clear: clear,
    count: count,
    subtotal: subtotal,
    totals: totals,
    getFulfillment: getFulfillment,
    setFulfillment: setFulfillment,
    shippingFee: shippingFee,
    freeShipThreshold: FREE_SHIP_THRESHOLD,
    fulfillmentFees: FULFILL_FEES,
    sizeLabel: sizeLabelFor
  };

  // Keep other open tabs (or the drawer vs. the checkout page) in sync.
  window.addEventListener('storage', function(e){
    if(e.key === STORAGE_KEY || e.key === FULFILL_KEY) notify();
  });
})();
