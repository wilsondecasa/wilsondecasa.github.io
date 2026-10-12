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
  var INTL_KEY = 'gadelo_intl_destination';
  // 13차: the flat Korea shipping rate — used both for the old "영외 배송"
  // domestic fee (now retired as a separate flow) and for Korea CAMP/no-camp
  // orders, which are priced the same way. Kept under this name rather than
  // renamed, to minimize the diff.
  var FULFILL_FEES = { domestic: 4.00 };
  var FREE_SHIP_THRESHOLD = 50; // USD subtotal — domestic delivery fee waived at/above this

  // ---------- International (APO/FPO) shipping — added 2026-09-14, Korea
  // added 2026-09-21 (12차) ----------
  // Overseas military bases we ship to. Zone 1 = Japan mainland + Okinawa,
  // Zone 2 = Hawaii + Guam (Zone 2 is priced higher — USPS/EMS "US" rate
  // territory vs. Japan). Korea has NO zone entry here on purpose — CAMP
  // orders to a Korea camp are priced the same flat rate as regular
  // Off-Post delivery (no overseas freight involved), handled as a special
  // case in shippingResult() below rather than the weight-tier table. See
  // project doc "gadelo-해외-apo-배송-확장-스펙.md" for the Japan/Okinawa/
  // Hawaii/Guam rate rationale — these per-kg rates are a draft pending
  // official 우체국 EMS rate verification.
  var REGION_ZONE = {
    japan_mainland: 'ZONE_1',
    okinawa: 'ZONE_1',
    hawaii: 'ZONE_2',
    guam: 'ZONE_2'
  };
  var REGION_LABELS = {
    korea: 'Korea',
    japan_mainland: 'Japan',
    okinawa: 'Okinawa',
    hawaii: 'Hawaii',
    guam: 'Guam'
  };
  var ZONE_LABELS = { ZONE_1: 'Zone 1', ZONE_2: 'Zone 2' };
  function isKoreaRegion(region){ return region === 'korea'; }
  // {id, label, region} — shown grouped by region in the Camp <select>.
  // Every region's list also gets an "Other (enter camp name)" option added
  // by checkout.js at render time (not stored here) — a safety net so a
  // camp missing from this list never blocks checkout.
  var BASE_LIST = [
    { id: 'camp_humphreys', label: 'Camp Humphreys', region: 'korea' },
    { id: 'osan_ab', label: 'Osan Air Base', region: 'korea' },
    { id: 'camp_casey', label: 'Camp Casey', region: 'korea' },
    { id: 'camp_hovey', label: 'Camp Hovey', region: 'korea' },
    { id: 'camp_walker', label: 'Camp Walker', region: 'korea' },
    { id: 'camp_henry', label: 'Camp Henry', region: 'korea' },
    { id: 'camp_carroll', label: 'Camp Carroll', region: 'korea' },
    { id: 'yongsan_garrison', label: 'Yongsan Garrison', region: 'korea' },
    { id: 'kunsan_ab', label: 'Kunsan Air Base', region: 'korea' },
    { id: 'camp_mujuk', label: 'Camp Mujuk', region: 'korea' },
    { id: 'fleet_activities_chinhae', label: 'Fleet Activities Chinhae', region: 'korea' },
    { id: 'yokota_ab', label: 'Yokota Air Base', region: 'japan_mainland' },
    { id: 'camp_zama', label: 'Camp Zama', region: 'japan_mainland' },
    { id: 'yokosuka_nb', label: 'Yokosuka Naval Base', region: 'japan_mainland' },
    { id: 'camp_fuji', label: 'Camp Fuji', region: 'japan_mainland' },
    { id: 'misawa_ab', label: 'Misawa Air Base', region: 'japan_mainland' },
    { id: 'sasebo_nb', label: 'Sasebo Naval Base', region: 'japan_mainland' },
    { id: 'mcas_iwakuni', label: 'MCAS Iwakuni', region: 'japan_mainland' },
    { id: 'naf_atsugi', label: 'NAF Atsugi', region: 'japan_mainland' },
    { id: 'kadena_ab', label: 'Kadena Air Base', region: 'okinawa' },
    { id: 'camp_foster', label: 'Camp Foster', region: 'okinawa' },
    { id: 'camp_kinser', label: 'Camp Kinser', region: 'okinawa' },
    { id: 'camp_hansen', label: 'Camp Hansen', region: 'okinawa' },
    { id: 'camp_schwab', label: 'Camp Schwab', region: 'okinawa' },
    { id: 'camp_courtney', label: 'Camp Courtney', region: 'okinawa' },
    { id: 'mcas_futenma', label: 'MCAS Futenma', region: 'okinawa' },
    { id: 'torii_station', label: 'Torii Station', region: 'okinawa' },
    { id: 'white_beach_nf', label: 'White Beach Naval Facility', region: 'okinawa' },
    { id: 'jbphh', label: 'Joint Base Pearl Harbor-Hickam (JBPHH)', region: 'hawaii' },
    { id: 'schofield_barracks', label: 'Schofield Barracks', region: 'hawaii' },
    { id: 'fort_shafter', label: 'Fort Shafter', region: 'hawaii' },
    { id: 'camp_hm_smith', label: 'Camp H.M. Smith', region: 'hawaii' },
    { id: 'mcb_hawaii_kbay', label: 'MCB Hawaii Kaneohe Bay', region: 'hawaii' },
    { id: 'wheeler_aaf', label: 'Wheeler Army Airfield', region: 'hawaii' },
    { id: 'tripler_amc', label: 'Tripler Army Medical Center', region: 'hawaii' },
    { id: 'andersen_afb', label: 'Andersen Air Force Base', region: 'guam' },
    { id: 'naval_base_guam', label: 'Naval Base Guam', region: 'guam' },
    { id: 'camp_blaz', label: 'Camp Blaz', region: 'guam' }
  ];
  // Total-weight tiers (kg cap, USD fee). First tier whose cap the order's
  // total weight fits under wins — NOT a per-item sum. Weight past the last
  // tier (>5kg) returns null, meaning "manual quote required".
  //
  // 2026-09-14: priced at ~80% of the original 우체국 EMS-estimate draft
  // (사장님 결정 — charge under the estimate for now, then true up rates
  // once real packages have actually been mailed to each zone). Original
  // draft values are in the project doc's history if the 80% baseline ever
  // needs recomputing from scratch.
  var SHIPPING_TIERS = {
    ZONE_1: [
      [0.4, 13.99], [0.8, 14.99], [1.0, 14.99], [1.2, 15.99],
      [1.6, 16.99], [2.0, 17.99], [2.4, 18.99], [3.0, 20.99],
      [4.0, 22.99], [5.0, 25.99]
    ],
    ZONE_2: [
      [0.4, 17.99], [0.8, 19.99], [1.0, 21.99], [1.2, 22.99],
      [1.6, 25.99], [2.0, 28.99], [2.4, 31.99], [3.0, 36.99],
      [4.0, 44.99], [5.0, 52.99]
    ]
  };
  // sizeKey (g) -> kg, for total-order-weight lookups above.
  var SIZE_WEIGHT_KG = { 200: 0.2, 400: 0.4, 1000: 1.0 };

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

  // ---------- Delivery destination (region + specific camp) ----------
  // 13차 (2026-09-21): the old top-level "영외 배송 / CAMP" fulfillment
  // choice is gone — every order now goes through this one destination
  // picker, so there's no separate domestic-vs-international method to
  // track any more (see shippingResult() below).
  function getIntlDestination(){
    try{
      var raw = localStorage.getItem(INTL_KEY);
      var data = raw ? JSON.parse(raw) : null;
      return (data && data.region) ? data : null;
    }catch(e){ return null; }
  }
  function setIntlDestination(region, baseId, baseOtherLabel){
    try{ localStorage.setItem(INTL_KEY, JSON.stringify({ region: region, base: baseId || '', baseOther: baseOtherLabel || '' })); }catch(e){ /* ignore */ }
    notify();
  }
  function zoneForRegion(region){ return REGION_ZONE[region] || null; }
  function baseLabel(baseId){
    var b = BASE_LIST.filter(function(x){ return x.id === baseId; })[0];
    return b ? b.label : '';
  }
  // Resolves a destination object's camp to a display label, including the
  // "Other" case where the shopper typed their own camp name instead of
  // picking one from BASE_LIST. base === 'none' (13차's "No camp / regular
  // address" option) isn't in BASE_LIST either, so it falls through
  // baseLabel() to '' on purpose — the caller then just shows the region
  // name alone ("Ship to: Korea") instead of an awkward "Ship to: none".
  function destinationCampLabel(dest){
    if(!dest) return '';
    if(dest.base === 'other') return dest.baseOther || 'Other';
    return baseLabel(dest.base);
  }

  // Total order weight in kg — used for the international tier lookup (a
  // single weight-based fee for the whole cart, not summed per item).
  function cartWeightKg(){
    return items().reduce(function(s, i){
      return s + (SIZE_WEIGHT_KG[Number(i.sizeKey)] || 0) * i.qty;
    }, 0);
  }
  function tierLookup(zone, weightKg){
    var tiers = SHIPPING_TIERS[zone];
    if(!tiers) return null;
    for(var idx = 0; idx < tiers.length; idx++){
      if(weightKg <= tiers[idx][0]) return tiers[idx][1];
    }
    return null; // over the table's top tier (>5kg) — manual quote required
  }

  // Full result object (not just a number) because international shipping
  // can be "not yet resolvable" (no destination picked) or "too heavy for
  // the automatic table" (needs a manual quote) — both need distinct UI
  // handling, not a $0 fee.
  function shippingResult(){
    if(items().length === 0) return { fee: 0, manualQuoteRequired: false, zone: null, needsDestination: false };
    var dest = getIntlDestination();
    if(!dest || !dest.region) return { fee: 0, manualQuoteRequired: false, zone: null, needsDestination: true };
    // Korea (CAMP or regular/no-camp address alike) ships domestically (no
    // overseas freight), so it's priced the same flat rate as the old
    // Off-Post delivery instead of a weight-tier zone — added 2026-09-21
    // (12차), and applies to every Korea order since 13차 removed the
    // separate domestic-delivery flow this rate used to live under.
    if(isKoreaRegion(dest.region)){
      var subK = subtotal();
      var koreaFee = subK >= FREE_SHIP_THRESHOLD ? 0 : (FULFILL_FEES.domestic || 0);
      return { fee: koreaFee, manualQuoteRequired: false, zone: null, needsDestination: false };
    }
    var zone = zoneForRegion(dest.region);
    if(!zone) return { fee: 0, manualQuoteRequired: false, zone: null, needsDestination: true };
    var weightKg = cartWeightKg();
    var fee = tierLookup(zone, weightKg);
    if(fee == null) return { fee: 0, manualQuoteRequired: true, zone: zone, weightKg: weightKg, needsDestination: false };
    return { fee: fee, manualQuoteRequired: false, zone: zone, weightKg: weightKg, needsDestination: false };
  }
  function shippingFee(){ return shippingResult().fee; }

  function totals(){
    var sub = subtotal();
    var sr = shippingResult();
    var ship = sr.fee || 0;
    return {
      subtotal: sub,
      shipping: ship,
      total: sub + ship,
      manualQuoteRequired: !!sr.manualQuoteRequired,
      needsDestination: !!sr.needsDestination,
      zone: sr.zone || null,
      weightKg: sr.weightKg || 0
    };
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
    shippingFee: shippingFee,
    shippingResult: shippingResult,
    freeShipThreshold: FREE_SHIP_THRESHOLD,
    fulfillmentFees: FULFILL_FEES,
    sizeLabel: sizeLabelFor,
    // International (APO/FPO) shipping
    getIntlDestination: getIntlDestination,
    setIntlDestination: setIntlDestination,
    zoneForRegion: zoneForRegion,
    baseList: BASE_LIST,
    regionLabels: REGION_LABELS,
    zoneLabels: ZONE_LABELS,
    baseLabel: baseLabel,
    destinationCampLabel: destinationCampLabel,
    isKoreaRegion: isKoreaRegion,
    cartWeightKg: cartWeightKg
  };

  // Keep other open tabs (or the drawer vs. the checkout page) in sync.
  window.addEventListener('storage', function(e){
    if(e.key === STORAGE_KEY || e.key === INTL_KEY) notify();
  });
})();
