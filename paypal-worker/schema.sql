-- GADELO paypal-worker — D1 schema (1단계: 주문 저장 / 관리자 주문 확인)
--
-- Run this ONCE against the D1 database before deploying worker.js, from
-- the D1 database's own page in the Cloudflare dashboard → "Console" tab
-- (paste this whole file in and run it). Safe to re-run later — every
-- statement is IF NOT EXISTS, so running it again on a database that
-- already has these tables does nothing.
--
-- worker.js writes to this table in two steps: 'pending' when PayPal
-- confirms the order was CREATED (so even an abandoned checkout is
-- visible), then 'paid' once capture actually succeeds.

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paypal_order_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',        -- 'pending' | 'paid'
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  fulfillment TEXT,                               -- 'international' (every order goes through this branch — see worker.js)
  region TEXT,                                    -- 'korea' | 'japan_mainland' | 'okinawa' | 'hawaii' | 'guam'
  camp_id TEXT,                                   -- camp dropdown value, or 'none' / 'other'
  camp_other TEXT,                                -- free-typed camp name if camp_id = 'other'
  delivery_type TEXT,                             -- 'home' | 'postbox'
  shipping_text TEXT,                              -- the shopper's own address / Post Box text
  items_json TEXT,                                -- JSON array of {name, unit_amount, quantity}
  subtotal REAL,
  shipping_fee REAL,
  total REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  captured_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
