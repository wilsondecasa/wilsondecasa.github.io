// GADELO — shared blend data (used by index.html and product.html)
// Prices are in USD, converted from GADELO's KRW retail prices at roughly 1,340 KRW = $1
// and rounded to psychological price points. Re-confirm against real USD pricing before launch.
//
// `line` groups blends internally:
//   "core"     — the 3 flagship blends (Fight Tonight / Uncle Sam / Freedom) — the ONLY
//               blends shown on the homepage (#blendGrid) as of the current build.
//   "military" — the original 4 blends (Logos / Covenant / India / Good Will). Their
//               dedicated homepage section was removed at the client's request — the
//               homepage now shows only the core lineup. This data is kept (not deleted)
//               so their product.html?blend=... pages still work for anyone with a direct
//               link, but they are no longer linked from nav, footer, or any homepage grid.
//
// Packaging: only 400g and 1kg bags are sold (no 200g option). 400g ships as two 200g
// bags. Prices object keys stay in grams (400/1000) for continuity with the rest of the
// code, but every place that DISPLAYS a size converts it to oz/lb — see sizeLabelFor()
// in app.js and pdp.js (400 -> "14oz (2 x 7oz bags)", 1000 -> "2.2lb").
//
// ⚠️ Fight Tonight / Uncle Sam / Freedom have NO confirmed recipe or pricing anywhere in the
// project files — the origin %, roast level and prices below are placeholders filled in on
// request so the page has something to show. Replace with real data before this goes live.
var GADELO_PRODUCTS = {
  fighttonight: {
    slug: "fighttonight",
    nameEn: "Fight Tonight",
    nameKo: "파이트 투나잇",
    badge: "flagship",
    roastLevel: "dark",
    line: "core",
    color: "#4B3A2A",
    image: "images/blend-fighttonight.jpg",
    originEn: "Brazil 55% · Guatemala 25% · Robusta 20% (placeholder — recipe TBD)",
    originKo: "브라질 55% · 과테말라 25% · 로부스타 20% (임시값 — 배합비 확정 전)",
    prices: {400: 21.99, 1000: 27.99},
    descEn: [
      "Built for long nights and early formations — a bold, dark-roast blend with brawn to spare.",
      "⚠️ Placeholder recipe and pricing — real composition and cost not yet confirmed."
    ],
    descKo: [
      "긴 밤과 이른 아침 점호를 위한 진하고 힘 있는 다크 로스트 블렌드입니다.",
      "⚠️ 배합비·가격은 아직 확정되지 않은 임시값입니다."
    ]
  },
  unclesam: {
    slug: "unclesam",
    nameEn: "Uncle Sam",
    nameKo: "엉클샘",
    badge: "flagship",
    roastLevel: "medium",
    line: "core",
    color: "#2F3B52",
    image: "images/blend-unclesam.jpg",
    originEn: "Colombia 45% · Brazil 35% · Ethiopia Sidamo 20% (placeholder — recipe TBD)",
    originKo: "콜롬비아 45% · 브라질 35% · 에티오피아 시다모 20% (임시값 — 배합비 확정 전)",
    prices: {400: 21.99, 1000: 27.99},
    descEn: [
      "The all-American standard — a balanced, medium-roast blend that's easy to trust and easy to love.",
      "⚠️ Placeholder recipe and pricing — real composition and cost not yet confirmed."
    ],
    descKo: [
      "믿고 편하게 즐길 수 있는 균형 잡힌 미디움 로스트 블렌드입니다.",
      "⚠️ 배합비·가격은 아직 확정되지 않은 임시값입니다."
    ]
  },
  freedom: {
    slug: "freedom",
    nameEn: "Freedom",
    nameKo: "프리덤",
    badge: "flagship",
    roastLevel: "light",
    line: "core",
    color: "#7A2E2E",
    originEn: "Ethiopia Sidamo 50% · Guatemala 30% · Colombia 20% (placeholder — recipe TBD)",
    originKo: "에티오피아 시다모 50% · 과테말라 30% · 콜롬비아 20% (임시값 — 배합비 확정 전)",
    prices: {400: 23.99, 1000: 29.99},
    descEn: [
      "Named for the promise behind it — this blend carries GADELO's ongoing tribute to Korean War veterans.",
      "⚠️ Placeholder recipe and pricing — real composition and cost not yet confirmed."
    ],
    descKo: [
      "가델로가 한국전쟁 참전용사에게 바치는 헌사를 담은 블렌드입니다.",
      "⚠️ 배합비·가격은 아직 확정되지 않은 임시값입니다."
    ]
  },
  logos: {
    slug: "logos",
    nameEn: "Logos",
    nameKo: "로고스",
    badge: "house",
    roastLevel: "medium",
    line: "military",
    color: "#33361F",
    originEn: "Brazil 65% · Guatemala 25% · Aceh Gayo 10%",
    originKo: "브라질 65% · 과테말라 25% · 아체가요 10%",
    prices: {400: 18.99, 1000: 24.99},
    descEn: [
      "Our everyday house blend — Brazilian body, Guatemalan brightness, and a touch of Aceh Gayo for depth.",
      "Balanced enough for a drip pot at 0500, honest enough to drink black."
    ],
    descKo: [
      "가델로의 기본 하우스 블렌드입니다. 브라질의 묵직한 바디감과 과테말라의 산뜻함에 아체가요를 소량 더해 깊이를 잡았습니다.",
      "이른 아침 드립으로도, 블랙으로 마셔도 균형이 잘 맞습니다."
    ]
  },
  covenant: {
    slug: "covenant",
    nameEn: "Covenant",
    nameKo: "커버넌트",
    badge: "house",
    roastLevel: "medium",
    line: "military",
    color: "#3F4527",
    originEn: "Brazil 65% · Colombia 15% · Guatemala 10% · Sidamo 10%",
    originKo: "브라질 65% · 콜롬비아 15% · 과테말라 10% · 시다모 10%",
    prices: {400: 19.99, 1000: 25.99},
    descEn: [
      "A four-origin blend built for consistency — Brazil and Guatemala for structure, Colombia for sweetness, a small measure of Sidamo for lift.",
      "Named for the promise we keep every batch: same roast, same care."
    ],
    descKo: [
      "네 가지 산지를 조합한 블렌드로 일관성에 초점을 맞췄습니다. 브라질과 과테말라가 뼈대를 잡고, 콜롬비아가 단맛을, 소량의 시다모가 화사함을 더합니다.",
      "매 배치마다 같은 로스팅, 같은 정성을 지키겠다는 약속의 이름입니다."
    ]
  },
  india: {
    slug: "india",
    nameEn: "India",
    nameKo: "인디아",
    badge: "house",
    roastLevel: "dark",
    line: "military",
    color: "#4B5330",
    originEn: "Mysore 65% · Kapi Royale (Robusta) 35%",
    originKo: "마이소르 65% · 카피로얄(로부스타) 35%",
    prices: {400: 19.99, 1000: 25.99},
    descEn: [
      "Mysore Arabica and Kapi Royale Robusta, blended the way South Indian coffee has been made for generations — bold, low-acid, and built to hold up under milk.",
      "Strong enough for a long shift."
    ],
    descKo: [
      "마이소르 아라비카와 카피로얄 로부스타를 남인도 전통 방식으로 배합했습니다. 산미는 낮고 바디감은 진해 우유와도 잘 어울리며,",
      "긴 근무 시간에도 힘을 잃지 않는 한 잔입니다."
    ]
  },
  goodwill: {
    slug: "goodwill",
    nameEn: "Good Will",
    nameKo: "굿윌",
    badge: "premium",
    roastLevel: "light",
    line: "military",
    color: "#8C6A26",
    originEn: "Guat. Huican 40% · Nicaragua Segovia 30% · CR Don Mayo 30%",
    originKo: "과테말라 와이칸 40% · 니카라과 세고비아 30% · 코스타리카 돈마요 30%",
    prices: {400: 22.99, 1000: 31.99},
    descEn: [
      "Our premium lot — Guatemala Huehuetenango, Nicaragua Segovia, and Costa Rica Don Mayo, chosen for complexity over convenience.",
      "Slower to source, worth the wait."
    ],
    descKo: [
      "과테말라 와이칸, 니카라과 세고비아, 코스타리카 돈마요를 엄선한 프리미엄 라인입니다.",
      "편의보다 복합적인 풍미를 우선한 만큼 소싱에 시간이 걸리지만, 그만한 가치가 있습니다."
    ]
  }
};
