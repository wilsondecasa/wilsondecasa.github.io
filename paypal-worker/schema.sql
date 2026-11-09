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

-- ---------------------------------------------------------------------------
-- 2단계 (회원가입/로그인) — added 2026-11-09. Real customer accounts, kept
-- in this same file/database so there's only ever one D1 schema to run.
-- password_hash/password_salt are PBKDF2 output (never plain text) — see
-- worker.js's "CUSTOMER ACCOUNTS" section for how they're produced/checked.
-- The saved_* columns are the shipping info auto-filled at checkout next
-- time — written by POST /customer/save-address right after an order ships,
-- or optionally filled right away at signup (region + address + detail
-- only — no camp/Post Box/city, see worker.js's handleCustomerSignup).
--
-- 2026-11-09 수정 — added `username` (아이디, the actual login ID — email is
-- now contact info only, not used to log in) and repurposed `name` to hold
-- the nickname (닉네임) instead of a real name.
--
-- ONE-TIME MIGRATION NOTE: if you already ran the ORIGINAL version of this
-- file (the one without `username`), the line below drops that table before
-- recreating it with the new column. This only matters if `customers`
-- already has real signups in it — it did not at the time this migration
-- was written (only the `orders` table had data), so this was safe to run
-- as-is then. If you are re-reading this later and customers already has
-- real accounts, do NOT run the DROP — ask Claude to write a proper
-- ALTER TABLE migration instead so no accounts are lost.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS customers;

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,                  -- 아이디 — what the customer actually logs in with
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  name TEXT,                                       -- 닉네임 (nickname), despite the column name
  phone TEXT,
  saved_region TEXT,                              -- 'korea' | 'japan_mainland' | 'okinawa' | 'hawaii' | 'guam'
  saved_camp_id TEXT,
  saved_camp_other TEXT,
  saved_delivery_type TEXT,                        -- 'home' | 'postbox'
  saved_city TEXT,
  saved_address TEXT,
  saved_address_detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_username ON customers(username);
