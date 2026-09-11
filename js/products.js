// GADELO — shared blend data (used by index.html and product.html)
//
// Military Exclusive Lineup — 5 blends, relaunched with confirmed recipes,
// roast levels and USD pricing (see project notes for the KRW basis).
//
// Packaging: 200g, 400g and 1kg bags (Freedom ships in 200g/400g only — no
// 1kg option). Every size on the site is labelled in oz for 200g/400g and lb
// for 1kg — see sizeLabelFor() in cart-store.js.
//
// Pricing: `compareAtPrices` is the pre-discount list price (shown with a
// strikethrough) and `prices` is the Military & Family discount price (10%
// off) — this is the price actually charged everywhere (cart, checkout,
// paypal-worker/worker.js). The discount is automatic, no code required.
var GADELO_PRODUCTS = {
  fighttonight: {
    slug: "fighttonight",
    nameEn: "Fight Tonight",
    nameKo: "파이트 투나잇",
    badge: "flagship",
    roastLevel: "medium",
    line: "core",
    color: "#4B3A2A",
    compareAtPrices: {200: 11.99, 400: 19.99, 1000: 39.99},
    prices: {200: 10.99, 400: 17.99, 1000: 35.99},
    images: {
      card1: "images/products/fighttonight/card1.webp",
      card2: "images/products/fighttonight/card2.webp",
      bags: {200: "images/products/fighttonight/bag-200.webp", 400: "images/products/fighttonight/bag-400.webp", 1000: "images/products/fighttonight/bag-1000.webp"}
    },
    image: "images/products/fighttonight/bag-400.webp",
    originEn: "Guatemala Waikan 55% · Indonesia Aceh Gayo 30% · India Mysore 15%",
    originKo: "과테말라 와이칸 55% · 인도네시아 아체가요 30% · 인도 마이소르 15%",
    descEn: [
      "Bright and creamy, with orange and milk chocolate up front, brown sugar and cedar underneath, and a soft cashew finish.",
      "A medium roast built to stay easy-drinking through a long shift."
    ],
    descKo: [
      "오렌지와 밀크초콜릿으로 시작해 브라운슈가와 시더가 깔리고, 캐슈넛으로 부드럽게 마무리되는 산뜻하고 크리미한 블렌드입니다.",
      "긴 근무 시간에도 편하게 마실 수 있는 미디움 로스트입니다."
    ]
  },
  unclesam: {
    slug: "unclesam",
    nameEn: "Uncle Sam",
    nameKo: "엉클샘",
    badge: "flagship",
    roastLevel: "dark",
    line: "core",
    color: "#2F3B52",
    compareAtPrices: {200: 11.99, 400: 19.99, 1000: 40.99},
    prices: {200: 10.99, 400: 17.99, 1000: 36.99},
    images: {
      card1: "images/products/unclesam/card1.webp",
      card2: "images/products/unclesam/card2.webp",
      bags: {200: "images/products/unclesam/bag-200.webp", 400: "images/products/unclesam/bag-400.webp", 1000: "images/products/unclesam/bag-1000.webp"}
    },
    image: "images/products/unclesam/bag-400.webp",
    originEn: "Indonesia Aceh Gayo 70% · Kenya 30%",
    originKo: "인도네시아 아체가요 70% · 케냐 30%",
    descEn: [
      "Deep and rich, with cedar and blackcurrant over brown sugar and walnut — a dark roast with real weight to it.",
      "The all-American standard, built to hold up under milk or drink black."
    ],
    descKo: [
      "시더와 블랙커런트가 브라운슈가, 월넛 위로 깊게 깔리는 다크 로스트입니다.",
      "우유를 타도, 블랙으로 마셔도 무게감을 잃지 않는 엉클샘의 기준입니다."
    ]
  },
  freedom: {
    slug: "freedom",
    nameEn: "Freedom",
    nameKo: "프리덤",
    badge: "flagship",
    roastLevel: "medium",
    line: "core",
    color: "#7A2E2E",
    compareAtPrices: {200: 18.99, 400: 33.99},
    prices: {200: 16.99, 400: 30.99},
    images: {
      card1: "images/products/freedom/card1.webp",
      card2: "images/products/freedom/card2.webp",
      bags: {200: "images/products/freedom/bag-200.webp", 400: "images/products/freedom/bag-400.webp"}
    },
    image: "images/products/freedom/bag-400.webp",
    originEn: "Thailand 42.3% · Colombia 34.1% · Ethiopia 23.5%",
    originKo: "태국 42.3% · 콜롬비아 34.1% · 에티오피아 23.5%",
    descEn: [
      "Sweet and tangy — tropical fruit and lemon/lime over a cane-sugar sweetness.",
      "Named for the promise behind it — GADELO's ongoing tribute to Korean War veterans. Currently offered in 200g and 400g only."
    ],
    descKo: [
      "트로피컬 프루트와 레몬/라임의 산뜻함에 케인슈가의 단맛이 더해진 블렌드입니다.",
      "가델로가 한국전쟁 참전용사에게 바치는 헌사를 담은 이름입니다. 현재 200g, 400g로만 판매합니다."
    ]
  },
  india: {
    slug: "india",
    nameEn: "Indian Head",
    nameKo: "인디언 헤드",
    badge: "house",
    roastLevel: "dark",
    line: "core",
    color: "#4B5330",
    compareAtPrices: {200: 10.99, 400: 16.99, 1000: 33.99},
    prices: {200: 9.99, 400: 14.99, 1000: 30.99},
    images: {
      card1: "images/products/india/card1.webp",
      card2: "images/products/india/card2.webp",
      bags: {200: "images/products/india/bag-200.webp", 400: "images/products/india/bag-400.webp", 1000: "images/products/india/bag-1000.webp"}
    },
    image: "images/products/india/bag-400.webp",
    originEn: "India Arabica (Mysore) 65% · India Robusta (Kaapi Royale) 35%",
    originKo: "인도 아라비카(마이소르) 65% · 인도 로부스타(카피로얄) 35%",
    descEn: [
      "Nutty and smooth — cashew and malt, cream cheese and white chocolate, with a hint of mandarin and red berry.",
      "Bold, low-acid, and built to hold up under milk. Strong enough for a long shift."
    ],
    descKo: [
      "캐슈넛과 몰트, 크림치즈와 화이트초콜릿에 만다린과 레드베리 힌트가 더해진 넛티하고 부드러운 블렌드입니다.",
      "산미는 낮고 바디감은 진해 우유와도 잘 어울리며, 긴 근무 시간에도 힘을 잃지 않습니다."
    ]
  },
  goodwill: {
    slug: "goodwill",
    nameEn: "Roll Out",
    nameKo: "롤 아웃",
    badge: "premium",
    roastLevel: "dark",
    line: "core",
    color: "#8C6A26",
    compareAtPrices: {200: 12.99, 400: 20.99, 1000: 43.99},
    prices: {200: 11.99, 400: 18.99, 1000: 39.99},
    images: {
      card1: "images/products/goodwill/card1.webp",
      card2: "images/products/goodwill/card2.webp",
      bags: {200: "images/products/goodwill/bag-200.webp", 400: "images/products/goodwill/bag-400.webp", 1000: "images/products/goodwill/bag-1000.webp"}
    },
    image: "images/products/goodwill/bag-400.webp",
    originEn: "Guatemala Waikan 40% · Nicaragua Segovia 30% · Costa Rica Don Mayo 30%",
    originKo: "과테말라 와이칸 40% · 니카라과 세고비아 30% · 코스타리카 돈마요 30%",
    descEn: [
      "Rich and sweet — macadamia and almond, vanilla and berry, with a maple syrup and dark chocolate finish.",
      "Our premium lot, chosen for complexity over convenience. Slower to source, worth the wait."
    ],
    descKo: [
      "마카다미아와 아몬드, 바닐라와 베리에 메이플시럽과 다크초콜릿으로 마무리되는 풍부하고 달콤한 블렌드입니다.",
      "편의보다 복합적인 풍미를 우선한 프리미엄 라인으로, 소싱에 시간이 걸리지만 그만한 가치가 있습니다."
    ]
  }
};
