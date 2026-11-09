// GADELO Coffee Roasters — PayPal v6 backend (Cloudflare Worker)
//
// The GADELO website itself stays a plain static site (GitHub Pages, no
// change there). This one small file is the only "server" GADELO needs — it
// exists purely because PayPal's v6 SDK requires order creation + capture to
// happen server-side (never in the browser, where a shopper could tamper
// with the price). It has exactly two jobs:
//
//   POST /create-order   — re-prices the cart from the list below (never
//                            trusts whatever the browser sends) and asks
//                            PayPal to create the order.
//   POST /capture-order  — captures a previously-approved order once the
//                            shopper finishes paying.
//
// See README.md in this same folder for the step-by-step deploy guide.
//
// ---------------------------------------------------------------------------
// Required Worker variables (Cloudflare dashboard → your Worker → Settings →
// Variables and Secrets):
//   PAYPAL_CLIENT_ID       Environment Variable — same Client ID already used
//                           on the website.
//   PAYPAL_CLIENT_SECRET   Secret (click "Encrypt") — from the SAME PayPal
//                           app as the Client ID. Never put this in the
//                           website's own code, only here.
//   PAYPAL_API_BASE        Environment Variable —
//                             sandbox (testing): https://api-m.sandbox.paypal.com
//                             live (real money):  https://api-m.paypal.com
//   ALLOWED_ORIGIN          Environment Variable — the exact address of the
//                           GADELO website, e.g. https://yourname.github.io
//                           (no trailing slash). Use * only while testing.
//
// 2026-11-02 (1단계 — admin order list) additions:
//   DB                     D1 Database binding, name MUST be exactly "DB" —
//                           Settings → Bindings → Add → D1 Database. Run the
//                           schema in paypal-worker/schema.sql against it
//                           once (D1 database page → Console tab) before
//                           deploying this file. If DB isn't bound, order
//                           history is just silently skipped — payments
//                           still work fine either way, this is additive.
//   ADMIN_PASSWORD          Secret — the password admin.html's login screen
//                           checks against. Pick something you don't use
//                           anywhere else; this is the only thing standing
//                           between the public internet and your order list.
//   ADMIN_SESSION_SECRET    Secret — a long random string (40+ characters is
//                           plenty) used to sign admin login tokens. Not a
//                           password anyone types — generate it once
//                           (anything random works) and never share it.
//
// 2026-11-09 (2단계 — 회원가입/로그인) additions:
//   No new Cloudflare Secret needed — customer login tokens are signed with
//   the SAME ADMIN_SESSION_SECRET above (see "ACCOUNT TOKENS" section). A
//   signed token carries a "typ" claim ('admin' vs 'customer') so the two
//   kinds can never be mixed up or used on each other's routes, even though
//   they share one signing key. The `customers` table this phase needs is
//   in the same paypal-worker/schema.sql file as `orders` — re-run that
//   file in the D1 Console (it's all IF NOT EXISTS, safe to re-run).
// ---------------------------------------------------------------------------

// Keep this price table in sync with js/products.js on the website. This is
// intentionally a SEPARATE copy — the whole point is that this Worker is the
// one place prices can't be tampered with by editing the browser, so it must
// not simply trust numbers the website sends it.
// Prices here are the Military & Family discount prices (10% off list) —
// this is what's actually charged everywhere, matching js/products.js'
// `prices` field (NOT `compareAtPrices`, which is only the crossed-out
// list price shown on the site for comparison).
// 2026-09-22: confirmed launch pricing — was replaced wholesale (all 5
// blends, all sizes), not a partial tweak, so review the whole block below
// rather than diffing individual numbers. Freedom also gained a 1000/1kg
// size this round (see js/products.js' matching comment).
const PRODUCTS = {
  fighttonight: { name: 'Fight Tonight', prices: { 200: 12.59, 400: 22.49, 1000: 30.59 } },
  unclesam: { name: 'Uncle Sam', prices: { 200: 12.59, 400: 22.49, 1000: 30.59 } },
  freedom: { name: 'Freedom', prices: { 200: 13.49, 400: 23.39, 1000: 31.49 } },
  india: { name: 'Indian Head', prices: { 200: 9.89, 400: 17.99, 1000: 22.49 } },
  goodwill: { name: 'Roll Out', prices: { 200: 12.59, 400: 19.79, 1000: 35.09 } },
  // 2026-10-12: two Special Edition blends, 200g/400g only (no 1000 key —
  // intentional, these don't sell 1kg). Prices mirror js/products.js —
  // see that file's "PRICE NOTE" comment on each entry: these are a
  // provisional estimate (조나단 gave Korean/Naver cost data, not a
  // confirmed USD figure), not a locked-in number. Update both files
  // together if the price changes, same as any other product.
  // 2026-10-28: discontinued, website only (SmartStore listing untouched —
  // see js/products.js' matching comment on the halloween entry). soldOut
  // is enforced below in buildPurchaseUnit() so a checkout can't go through
  // even if a cached page, bookmark, or direct API call tries to buy it —
  // the front-end disabling the button is not enough on its own.
  halloween: { name: 'Halloween Shock and Fear', prices: { 200: 17.99, 400: 26.99 }, soldOut: true },
  alwaysprepared: { name: 'Always Prepared', prices: { 200: 17.09, 400: 24.29 } },
  // 2026-10-28: added alongside the js/products.js entry — see that file's
  // "PRICE NOTE" comment on frozenchosin for how these were estimated
  // (provisional, not yet confirmed by 조나단).
  frozenchosin: { name: 'Frozen Chosin', prices: { 200: 15.29, 400: 22.49 } }
};
const SIZE_LABEL = { 200: '7.05 oz (200g)', 400: '14.11 oz (400g)', 1000: '2.20 lb (1kg)' };
const DOMESTIC_FEE = 4.0;
const FREE_SHIP_THRESHOLD = 50;

// ---------------------------------------------------------------------------
// International (APO/FPO) shipping — added 2026-09-14. Mirrors
// js/cart-store.js on the website EXACTLY (region list, zone assignment,
// weight-tier table) for the same reason PRODUCTS above is a separate copy:
// this Worker must compute the real charge itself, never trust a shipping
// fee sent by the browser. See project doc
// "gadelo-해외-apo-배송-확장-스펙.md" — these per-kg rates are a draft
// pending official 우체국 EMS rate verification, and the >5kg cutoff below
// is enforced here too (not just in the front-end) as defense in depth.
const SIZE_WEIGHT_KG = { 200: 0.2, 400: 0.4, 1000: 1.0 };
const REGION_ZONE = { japan_mainland: 'ZONE_1', okinawa: 'ZONE_1', hawaii: 'ZONE_2', guam: 'ZONE_2' };
// Korea deliberately has no zone entry above — Korea CAMP orders are priced
// like domestic (Off-Post) delivery instead (flat fee / free over $50, no
// weight cap, no manual-quote requirement). See isKoreaRegion() below.
function isKoreaRegion(region) {
  return region === 'korea';
}
// PayPal shipping address admin_area_1 for each region. APO/FPO mail is US
// domestic mail even for OCONUS bases (country_code stays 'US'), addressed
// with the Armed Forces Pacific state code 'AP'. Hawaii is a literal US
// state ('HI'), not APO/FPO. Korea is never APO/FPO — it always ships as a
// plain Korean address ('KR'), regardless of what the shopper writes.
const REGION_ADMIN_AREA = { japan_mainland: 'AP', okinawa: 'AP', hawaii: 'HI', guam: 'AP' };
// Host-country code for an OFF-base (local, non-APO/FPO) address. Guam is a
// US territory but keeps its own ISO country code ('GU') for a real local
// Guam address; Japan mainland/Okinawa addresses off-base are genuinely
// Japanese addresses.
const REGION_OFFBASE_COUNTRY = { japan_mainland: 'JP', okinawa: 'JP', guam: 'GU' };
// 2026-09-21 (12차): the structured on-base/off-base/Hawaii/Post-Box forms
// were replaced site-wide with a single free-text delivery-address box (see
// project doc "gadelo-모바일-최적화-및-배포전-점검.md", 12차 section). This
// Worker no longer receives body.residency or any of the old structured
// address fields (a.street/a.city/a.box/a.apoCode/a.pscCmr/...) — only
// body.address = { name, phone, email, text }. Country code / APO-style
// addressing was inferred from the free text itself:
//   - Korea            → always 'KR' (never APO/FPO).
//   - Hawaii           → always 'US' / admin_area_1 'HI' (real US state).
//   - Japan/Okinawa/Guam → the shopper's own text was scanned for the words
//     "APO" or "FPO"; a match meant on-base (US military mail, country_code
//     'US', admin_area_1 from REGION_ADMIN_AREA, admin_area_2 'APO'), no
//     match meant a genuine local host-country address
//     (REGION_OFFBASE_COUNTRY).
//
// 2026-11-02: checkout.html/checkout.js replaced the "just mention APO/FPO
// somewhere" free-text approach with an explicit yes/no question the
// shopper answers on-screen ("can this address get door delivery, or do you
// need a Post Box") — see the dated comment above #cartAddressIntl in
// checkout.html. The answer now arrives as body.address.deliveryType
// ('home' | 'postbox'), which this Worker trusts directly instead of
// pattern-matching the text. Korea is included now too (조나단 요청) — a
// Korea Post Box answer still ships as a plain 'KR' address (Korea was
// never APO/FPO to begin with; this only changes what goes in the address
// line). The old APO_FPO_PATTERN scan stays below as a fallback ONLY for a
// stale cached client that predates this change and never sends
// deliveryType at all.
const APO_FPO_PATTERN = /\b(APO|FPO)\b/i;
// Best-effort US-style postal code extraction from the free-text address —
// used only when present; PayPal's create-order call does not require it.
const POSTAL_CODE_PATTERN = /\b\d{5}(-\d{4})?\b/;
// Total-order-weight tiers (kg cap, USD fee) — first tier whose cap the
// order fits under wins. This is NOT a per-item sum. null past the last
// tier (>5kg) means "manual quote required" — create-order must fail.
//
// 2026-09-14: priced at ~80% of the original 우체국 EMS-estimate draft
// (사장님 결정 — charge under the estimate for now, then true up rates
// once real packages have actually been mailed to each zone). MUST stay in
// sync with js/cart-store.js's copy of this same table.
const SHIPPING_TIERS = {
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
function intlShippingFee(zone, weightKg) {
  const tiers = SHIPPING_TIERS[zone];
  if (!tiers) return null;
  for (const [capKg, fee] of tiers) {
    if (weightKg <= capKg) return fee;
  }
  return null; // over 5kg — manual quote required, no automatic fee
}

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    // 2026-11-02: GET added for /admin/orders, Authorization added for the
    // admin page's "Bearer <token>" header — see the ADMIN AUTH section.
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };
}

function jsonResponse(data, status, env) {
  return new Response(JSON.stringify(data), { status: status || 200, headers: corsHeaders(env) });
}

async function getAccessToken(env) {
  const basic = btoa(env.PAYPAL_CLIENT_ID + ':' + env.PAYPAL_CLIENT_SECRET);
  const res = await fetch(env.PAYPAL_API_BASE + '/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + basic,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error('PayPal auth failed (' + res.status + '): ' + text);
  }
  const data = await res.json();
  return data.access_token;
}

// Rebuilds the order entirely from PRODUCTS above + the fulfillment choice —
// the only things trusted from the browser are which slugs/sizes/quantities
// were picked and (for delivery) the address to ship to, never a price.
function buildPurchaseUnit(body) {
  const cart = Array.isArray(body.items) ? body.items : [];
  if (cart.length === 0) throw new Error('Cart is empty');

  const items = [];
  let subtotal = 0;
  let totalWeightKg = 0;
  cart.forEach(function (line) {
    const product = PRODUCTS[line.slug];
    const sizeKey = Number(line.sizeKey);
    if (!product || !product.prices[sizeKey]) {
      throw new Error('Unknown product: ' + line.slug + ' / ' + line.sizeKey);
    }
    if (product.soldOut) {
      throw new Error(product.name + ' is sold out.');
    }
    const qty = Math.max(1, Math.min(20, parseInt(line.qty, 10) || 1));
    const unitPrice = product.prices[sizeKey];
    subtotal += unitPrice * qty;
    totalWeightKg += (SIZE_WEIGHT_KG[sizeKey] || 0) * qty;
    items.push({
      name: (product.name + ' — ' + (SIZE_LABEL[sizeKey] || sizeKey)).slice(0, 127),
      unit_amount: { currency_code: 'USD', value: unitPrice.toFixed(2) },
      quantity: String(qty)
    });
  });

  // Only 'domestic' (Korea) and 'international' (APO/FPO) are recognized —
  // anything else from the browser falls back to domestic. Only the item
  // picks + fulfillment/region CHOICE are trusted from the browser; the
  // price for either path is always computed here, never sent by the client.
  const fulfillment = body.fulfillment === 'international' ? 'international' : 'domestic';

  let shipping;
  let zone = null;
  const region = fulfillment === 'international' ? String(body.region || '') : '';
  if (fulfillment === 'international') {
    if (isKoreaRegion(region)) {
      // Korea CAMP delivery is priced exactly like Off-Post (domestic)
      // delivery — flat fee, free over the same threshold, no weight cap,
      // no manual-quote requirement.
      shipping = subtotal >= FREE_SHIP_THRESHOLD ? 0 : DOMESTIC_FEE;
    } else {
      zone = REGION_ZONE[region];
      if (!zone) throw new Error('Invalid or missing international shipping region: ' + region);
      const fee = intlShippingFee(zone, totalWeightKg);
      if (fee == null) {
        throw new Error(
          'Order weight (' + totalWeightKg.toFixed(2) + 'kg) is over the 5kg automatic shipping limit — manual quote required, contact GADELO before ordering'
        );
      }
      shipping = fee;
    }
  } else {
    shipping = subtotal >= FREE_SHIP_THRESHOLD ? 0 : DOMESTIC_FEE;
  }
  const total = subtotal + shipping;

  const purchaseUnit = {
    amount: {
      currency_code: 'USD',
      value: total.toFixed(2),
      breakdown: {
        item_total: { currency_code: 'USD', value: subtotal.toFixed(2) },
        shipping: { currency_code: 'USD', value: shipping.toFixed(2) }
      }
    },
    items: items,
    description:
      fulfillment === 'international'
        ? 'GADELO Coffee Roasters order (CAMP delivery — ' + (isKoreaRegion(region) ? 'Korea' : zone) + ')'
        : 'GADELO Coffee Roasters order (Korea domestic delivery)'
  };

  if (fulfillment === 'domestic' && body.address) {
    const a = body.address;
    purchaseUnit.shipping = {
      type: 'SHIPPING',
      name: { full_name: String(a.name || '').slice(0, 300) },
      address: {
        address_line_1: String(a.line1 || '').slice(0, 300),
        address_line_2: a.line2 ? String(a.line2).slice(0, 300) : undefined,
        admin_area_2: String(a.city || '').slice(0, 120),
        postal_code: String(a.zip || '').slice(0, 60),
        country_code: 'KR'
      }
    };
  } else if (fulfillment === 'international' && body.address) {
    // 2026-09-21 (12차): the site's structured on-base/off-base/Hawaii/
    // Post-Box sub-forms were replaced with one free-text address box —
    // see the APO_FPO_PATTERN / POSTAL_CODE_PATTERN comment above. Only
    // body.address = { name, phone, email, text } arrives now.
    const a = body.address;
    const freeText = String(a.text || '').trim();
    const addrLines = freeText
      .split(/\r?\n/)
      .map(function (l) { return l.trim(); })
      .filter(Boolean);
    const addressLine1 = addrLines.length ? addrLines[0].slice(0, 300) : 'Address not provided';
    const addressLine2 = addrLines.length > 1 ? addrLines.slice(1).join(', ').slice(0, 300) : undefined;
    const postalMatch = freeText.match(POSTAL_CODE_PATTERN);
    const postalCode = postalMatch ? postalMatch[0].slice(0, 60) : undefined;

    let countryCode;
    let adminArea1;
    let adminArea2;
    if (isKoreaRegion(region)) {
      countryCode = 'KR';
    } else if (region === 'hawaii') {
      countryCode = 'US';
      adminArea1 = 'HI';
    } else {
      // 2026-11-02: trust the shopper's explicit on-screen answer when the
      // front-end sends one; only fall back to scanning the text for
      // "APO"/"FPO" for a stale cached client from before this field
      // existed. See the dated comment above APO_FPO_PATTERN.
      const isOnBase = a.deliveryType === 'home' || a.deliveryType === 'postbox'
        ? a.deliveryType === 'postbox'
        : APO_FPO_PATTERN.test(freeText);
      if (isOnBase) {
        countryCode = 'US';
        adminArea1 = REGION_ADMIN_AREA[region] || undefined;
        adminArea2 = 'APO';
      } else {
        countryCode = REGION_OFFBASE_COUNTRY[region] || 'US';
      }
    }

    purchaseUnit.shipping = {
      type: 'SHIPPING',
      name: { full_name: String(a.name || '').slice(0, 300) },
      address: {
        address_line_1: addressLine1,
        address_line_2: addressLine2,
        admin_area_1: adminArea1,
        admin_area_2: adminArea2,
        postal_code: postalCode,
        country_code: countryCode
      }
    };
  }

  return purchaseUnit;
}

// ---------------------------------------------------------------------------
// ORDER STORAGE (D1) — added 2026-11-02, 1단계 (주문 관리자). Every order is
// written to D1 twice: once as 'pending' right after PayPal confirms order
// CREATION (so even an abandoned/never-paid checkout is visible — useful on
// its own), then flipped to 'paid' once capture actually succeeds. Both
// writes are best-effort: if D1 isn't bound yet (env.DB missing) or a write
// throws, we log and move on rather than fail a real customer's checkout
// over our own order-history feature. Schema: paypal-worker/schema.sql —
// run it against the D1 database once (Console tab) before relying on this.
// ---------------------------------------------------------------------------
async function insertPendingOrder(env, body, purchaseUnit, paypalOrderId) {
  if (!env.DB) return;
  const a = body.address || {};
  await env.DB.prepare(
    `INSERT INTO orders
      (paypal_order_id, status, customer_name, customer_phone, customer_email,
       fulfillment, region, camp_id, camp_other, delivery_type, shipping_text,
       items_json, subtotal, shipping_fee, total)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  )
    .bind(
      paypalOrderId,
      'pending',
      String(a.name || ''),
      String(a.phone || ''),
      String(a.email || ''),
      String(body.fulfillment || ''),
      String(body.region || ''),
      String(body.base || ''),
      String(body.baseOther || ''),
      String(a.deliveryType || ''),
      String(a.text || ''),
      JSON.stringify(purchaseUnit.items),
      Number(purchaseUnit.amount.breakdown.item_total.value),
      Number(purchaseUnit.amount.breakdown.shipping.value),
      Number(purchaseUnit.amount.value)
    )
    .run();
}

async function markOrderCaptured(env, paypalOrderId) {
  if (!env.DB) return;
  await env.DB.prepare(
    "UPDATE orders SET status = 'paid', captured_at = datetime('now') WHERE paypal_order_id = ?"
  )
    .bind(paypalOrderId)
    .run();
}

// ---------------------------------------------------------------------------
// ADMIN AUTH — added 2026-11-02, 1단계. One shared password (ADMIN_PASSWORD
// secret), not per-staff accounts — that's a later phase once real customer
// accounts exist too. A successful /admin/login gets back a signed, 12-hour
// token (HMAC-SHA256 over a JSON payload, using ADMIN_SESSION_SECRET) that
// admin.html stores in localStorage and sends back as
// "Authorization: Bearer <token>" on every /admin/* call — a bearer token
// instead of a cookie because the Worker (*.workers.dev) and the site
// (gadelocoffeeroasters.com) are different origins, which makes cross-site
// cookies needlessly fiddly for no real benefit here.
// ---------------------------------------------------------------------------
const ADMIN_TOKEN_TTL_SECONDS = 12 * 60 * 60; // 12 hours

function bufToBase64Url(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function base64UrlToBuf(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}
async function hmacKey(env) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.ADMIN_SESSION_SECRET || ''),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}
// Generic signed-token pair, shared by admin AND customer sessions (see the
// 2026-11-09 doc comment up top) — `claims` carries whatever the caller
// needs (admin tokens: {typ:'admin'}; customer tokens: {typ:'customer',
// sub:<customer id>}) plus an `exp` this function adds itself.
async function signToken(env, claims, ttlSeconds) {
  const payload = JSON.stringify(Object.assign({}, claims, { exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
  const payloadB64 = bufToBase64Url(new TextEncoder().encode(payload).buffer);
  const key = await hmacKey(env);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64));
  return payloadB64 + '.' + bufToBase64Url(sig);
}
// Returns the parsed claims object on success, or null if the signature is
// bad, the token is malformed, or it's expired. Callers check `typ`
// themselves — this function only verifies the signature and expiry.
async function verifyToken(env, token) {
  if (!token || typeof token !== 'string' || token.indexOf('.') === -1) return null;
  const [payloadB64, sigB64] = token.split('.');
  const key = await hmacKey(env);
  const expectedSig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64));
  if (bufToBase64Url(expectedSig) !== sigB64) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBuf(payloadB64)));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (e) {
    return null;
  }
}
function signAdminToken(env) {
  return signToken(env, { typ: 'admin' }, ADMIN_TOKEN_TTL_SECONDS);
}
function getBearerToken(request) {
  const header = request.headers.get('Authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
}
async function requireAdmin(request, env) {
  const claims = await verifyToken(env, getBearerToken(request));
  return !!claims && claims.typ === 'admin';
}
// Returns the logged-in customer's row id (a number), or null if the
// bearer token is missing/invalid/expired/not a customer token.
async function requireCustomer(request, env) {
  const claims = await verifyToken(env, getBearerToken(request));
  if (!claims || claims.typ !== 'customer' || !claims.sub) return null;
  return claims.sub;
}

async function handleAdminLogin(request, env) {
  const body = await request.json();
  const password = String(body.password || '');
  if (!env.ADMIN_PASSWORD || !password || password !== env.ADMIN_PASSWORD) {
    return jsonResponse({ error: 'invalid_credentials' }, 401, env);
  }
  const token = await signAdminToken(env);
  return jsonResponse({ token, expiresIn: ADMIN_TOKEN_TTL_SECONDS }, 200, env);
}

async function handleAdminOrders(request, env) {
  const authed = await requireAdmin(request, env);
  if (!authed) return jsonResponse({ error: 'unauthorized' }, 401, env);
  if (!env.DB) return jsonResponse({ error: 'database_not_configured' }, 500, env);

  const url = new URL(request.url);
  const status = url.searchParams.get('status'); // '' | 'paid' | 'pending'
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit'), 10) || 100));

  let query = 'SELECT * FROM orders';
  const params = [];
  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const result = await env.DB.prepare(query)
    .bind(...params)
    .all();
  return jsonResponse({ orders: result.results || [] }, 200, env);
}

// ---------------------------------------------------------------------------
// CUSTOMER ACCOUNTS (2단계 — 회원가입/로그인) — added 2026-11-09. Real
// customer accounts, separate from the single-shared-password admin login
// above. login.html and checkout.html's inline account section both call
// these routes through js/customer.js. Tokens use the same signToken/
// verifyToken pair as admin (typ:'customer', sub:<customer row id>), a
// 30-day TTL (much longer than admin's 12h — a shopper logging in once per
// visit would defeat the point of "remember my address"), and are stored by
// the front-end in localStorage under 'gadelo_customer_token', never a
// cookie — same cross-origin reasoning as the admin token.
//
// Passwords are never stored in plain text: PBKDF2-SHA256 (100,000
// iterations, a random 16-byte salt per account, via Web Crypto's
// crypto.subtle — no external bcrypt/argon2 library, since this Worker has
// no build step and can't pull npm dependencies) and compared with a
// constant-time check in verifyPassword() below.
// ---------------------------------------------------------------------------
const CUSTOMER_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const PBKDF2_ITERATIONS = 100000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 아이디 (login ID) — 2026-11-09 추가: lowercased before storage/matching so
// it's effectively case-insensitive; email stays account/contact info only,
// it's no longer how a customer logs in.
const USERNAME_PATTERN = /^[a-z0-9_]{4,20}$/;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}
function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}
async function hashPassword(password, saltBuf) {
  const salt = saltBuf || crypto.getRandomValues(new Uint8Array(16)).buffer;
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return { hash: bufToBase64Url(bits), salt: bufToBase64Url(salt) };
}
async function verifyPassword(password, storedHashB64, storedSaltB64) {
  const salt = base64UrlToBuf(storedSaltB64);
  const { hash } = await hashPassword(password, salt);
  // Constant-time-ish compare (fixed-length base64url strings from the same
  // hash function, so this leaks nothing a timing attack could use here).
  if (hash.length !== storedHashB64.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ storedHashB64.charCodeAt(i);
  return diff === 0;
}

// Shape returned to the front-end for "the logged-in customer" — never the
// password hash/salt, and matches the field names checkout.js's auto-fill
// expects (see js/customer.js).
function customerRowToPublic(row) {
  return {
    id: row.id,
    username: row.username || '',
    email: row.email,
    name: row.name || '', // nickname (닉네임) — see the "name" column comment in schema.sql
    phone: row.phone || '',
    savedAddress: {
      region: row.saved_region || '',
      campId: row.saved_camp_id || '',
      campOther: row.saved_camp_other || '',
      deliveryType: row.saved_delivery_type || '',
      city: row.saved_city || '',
      address: row.saved_address || '',
      addressDetail: row.saved_address_detail || ''
    }
  };
}

async function handleCustomerSignup(request, env) {
  if (!env.DB) return jsonResponse({ error: 'database_not_configured' }, 500, env);
  const body = await request.json();
  const email = normalizeEmail(body.email);
  const username = normalizeUsername(body.username);
  const password = String(body.password || '');
  const nickname = String(body.nickname || '').trim().slice(0, 50);
  const phone = String(body.phone || '').trim().slice(0, 60);
  // Address at signup is optional and deliberately simple (region + one
  // address line + detail) — not the full checkout picker (camp/Post Box/
  // city). If given, it's saved as a 'home'-type saved address; checkout's
  // applyProfile() fills whatever's here and the shopper can still add/
  // change camp or switch to Post Box on their first real order.
  const addr = body.address && typeof body.address === 'object' ? body.address : null;

  if (!EMAIL_PATTERN.test(email)) return jsonResponse({ error: 'invalid_email' }, 400, env);
  if (!USERNAME_PATTERN.test(username)) return jsonResponse({ error: 'invalid_username' }, 400, env);
  if (password.length < 8) return jsonResponse({ error: 'password_too_short' }, 400, env);
  if (!nickname) return jsonResponse({ error: 'nickname_required' }, 400, env);
  if (!phone) return jsonResponse({ error: 'phone_required' }, 400, env);

  const existingEmail = await env.DB.prepare('SELECT id FROM customers WHERE email = ?').bind(email).first();
  if (existingEmail) return jsonResponse({ error: 'email_taken' }, 409, env);
  const existingUsername = await env.DB.prepare('SELECT id FROM customers WHERE username = ?').bind(username).first();
  if (existingUsername) return jsonResponse({ error: 'username_taken' }, 409, env);

  const { hash, salt } = await hashPassword(password);

  const savedRegion = addr && addr.region ? String(addr.region).slice(0, 40) : null;
  const savedAddress = addr && addr.address ? String(addr.address).trim().slice(0, 300) : null;
  const savedAddressDetail = addr && addr.addressDetail ? String(addr.addressDetail).trim().slice(0, 300) : null;
  const savedDeliveryType = savedRegion && savedAddress ? 'home' : null;

  const result = await env.DB.prepare(
    `INSERT INTO customers
       (email, username, password_hash, password_salt, name, phone,
        saved_region, saved_delivery_type, saved_address, saved_address_detail)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  )
    .bind(email, username, hash, salt, nickname, phone, savedRegion, savedDeliveryType, savedAddress, savedAddressDetail)
    .run();
  const customerId = result.meta && result.meta.last_row_id;

  const token = await signToken(env, { typ: 'customer', sub: customerId }, CUSTOMER_TOKEN_TTL_SECONDS);
  return jsonResponse(
    {
      token,
      customer: customerRowToPublic({
        id: customerId,
        email: email,
        username: username,
        name: nickname,
        phone: phone,
        saved_region: savedRegion,
        saved_delivery_type: savedDeliveryType,
        saved_address: savedAddress,
        saved_address_detail: savedAddressDetail
      })
    },
    200,
    env
  );
}

async function handleCustomerLogin(request, env) {
  if (!env.DB) return jsonResponse({ error: 'database_not_configured' }, 500, env);
  const body = await request.json();
  const username = normalizeUsername(body.username);
  const password = String(body.password || '');

  const row = await env.DB.prepare('SELECT * FROM customers WHERE username = ?').bind(username).first();
  if (!row) return jsonResponse({ error: 'invalid_credentials' }, 401, env);
  const ok = await verifyPassword(password, row.password_hash, row.password_salt);
  if (!ok) return jsonResponse({ error: 'invalid_credentials' }, 401, env);

  const token = await signToken(env, { typ: 'customer', sub: row.id }, CUSTOMER_TOKEN_TTL_SECONDS);
  return jsonResponse({ token, customer: customerRowToPublic(row) }, 200, env);
}

async function handleCustomerMe(request, env) {
  const customerId = await requireCustomer(request, env);
  if (!customerId) return jsonResponse({ error: 'unauthorized' }, 401, env);
  if (!env.DB) return jsonResponse({ error: 'database_not_configured' }, 500, env);

  const row = await env.DB.prepare('SELECT * FROM customers WHERE id = ?').bind(customerId).first();
  if (!row) return jsonResponse({ error: 'unauthorized' }, 401, env);
  return jsonResponse({ customer: customerRowToPublic(row) }, 200, env);
}

// Called by checkout.js right after a successful PayPal capture, when the
// shopper was logged in — saves exactly the address/contact info that
// order shipped to, so the NEXT order auto-fills from it. Partial-ish: any
// field left out of the request body keeps its previous saved value rather
// than being blanked out (COALESCE below), so a half-filled call never
// wipes out previously-saved info.
async function handleCustomerSaveAddress(request, env) {
  const customerId = await requireCustomer(request, env);
  if (!customerId) return jsonResponse({ error: 'unauthorized' }, 401, env);
  if (!env.DB) return jsonResponse({ error: 'database_not_configured' }, 500, env);

  const body = await request.json();
  await env.DB.prepare(
    `UPDATE customers SET
       name = COALESCE(?, name),
       phone = COALESCE(?, phone),
       saved_region = COALESCE(?, saved_region),
       saved_camp_id = COALESCE(?, saved_camp_id),
       saved_camp_other = COALESCE(?, saved_camp_other),
       saved_delivery_type = COALESCE(?, saved_delivery_type),
       saved_city = COALESCE(?, saved_city),
       saved_address = COALESCE(?, saved_address),
       saved_address_detail = COALESCE(?, saved_address_detail),
       updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(
      body.name != null ? String(body.name).slice(0, 200) : null,
      body.phone != null ? String(body.phone).slice(0, 60) : null,
      body.region != null ? String(body.region) : null,
      body.campId != null ? String(body.campId) : null,
      body.campOther != null ? String(body.campOther) : null,
      body.deliveryType != null ? String(body.deliveryType) : null,
      body.city != null ? String(body.city) : null,
      body.address != null ? String(body.address) : null,
      body.addressDetail != null ? String(body.addressDetail) : null,
      customerId
    )
    .run();
  return jsonResponse({ ok: true }, 200, env);
}

async function handleCreateOrder(request, env) {
  const body = await request.json();
  const purchaseUnit = buildPurchaseUnit(body);
  const accessToken = await getAccessToken(env);

  const res = await fetch(env.PAYPAL_API_BASE + '/v2/checkout/orders', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': crypto.randomUUID()
    },
    body: JSON.stringify({ intent: 'CAPTURE', purchase_units: [purchaseUnit] })
  });
  const data = await res.json();
  if (!res.ok) return jsonResponse({ error: 'create_order_failed', details: data }, 502, env);

  try {
    await insertPendingOrder(env, body, purchaseUnit, data.id);
  } catch (err) {
    // Never fail a real checkout over our own order-history write.
    console.error('[GADELO] insertPendingOrder failed', err);
  }

  return jsonResponse({ id: data.id }, 200, env);
}

async function handleCaptureOrder(request, env) {
  const body = await request.json();
  if (!body.orderId) return jsonResponse({ error: 'orderId is required' }, 400, env);
  const accessToken = await getAccessToken(env);

  const res = await fetch(
    env.PAYPAL_API_BASE + '/v2/checkout/orders/' + encodeURIComponent(body.orderId) + '/capture',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': crypto.randomUUID()
      }
    }
  );
  const data = await res.json();
  if (!res.ok) return jsonResponse({ error: 'capture_failed', details: data }, 502, env);

  try {
    await markOrderCaptured(env, body.orderId);
  } catch (err) {
    console.error('[GADELO] markOrderCaptured failed', err);
  }

  return jsonResponse(data, 200, env);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env) });
    }

    try {
      if (request.method === 'POST' && url.pathname === '/create-order') {
        return await handleCreateOrder(request, env);
      }
      if (request.method === 'POST' && url.pathname === '/capture-order') {
        return await handleCaptureOrder(request, env);
      }
      // 2026-11-02 (1단계) — admin.html's login + order list.
      if (request.method === 'POST' && url.pathname === '/admin/login') {
        return await handleAdminLogin(request, env);
      }
      if (request.method === 'GET' && url.pathname === '/admin/orders') {
        return await handleAdminOrders(request, env);
      }
      // 2026-11-09 (2단계) — customer accounts: login.html + checkout.html's
      // inline account section.
      if (request.method === 'POST' && url.pathname === '/customer/signup') {
        return await handleCustomerSignup(request, env);
      }
      if (request.method === 'POST' && url.pathname === '/customer/login') {
        return await handleCustomerLogin(request, env);
      }
      if (request.method === 'GET' && url.pathname === '/customer/me') {
        return await handleCustomerMe(request, env);
      }
      if (request.method === 'POST' && url.pathname === '/customer/save-address') {
        return await handleCustomerSaveAddress(request, env);
      }
      if (request.method === 'GET' && url.pathname === '/health') {
        return jsonResponse({ ok: true }, 200, env);
      }
    } catch (err) {
      return jsonResponse({ error: 'server_error', message: err.message }, 500, env);
    }

    return jsonResponse({ error: 'not_found' }, 404, env);
  }
};
