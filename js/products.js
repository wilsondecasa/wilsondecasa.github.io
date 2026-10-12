// GADELO — shared blend data (used by index.html and product.html)
//
// Military Exclusive Lineup — 5 blends, relaunched with confirmed recipes,
// roast levels and USD pricing (see project notes for the KRW basis).
//
// Packaging: 200g, 400g and 1kg bags — all 5 blends now sell all 3 sizes
// (2026-09-22: Freedom's 1kg size was added this round; see its `images`
// entry below for a temporary bag-photo note). Every size on the site is
// labelled in oz for 200g/400g and lb for 1kg — see sizeLabelFor() in
// cart-store.js.
//
// Pricing: `compareAtPrices` is the pre-discount list price (shown with a
// strikethrough) and `prices` is the Military & Family discount price (10%
// off) — this is the price actually charged on THIS site (cart, checkout).
// paypal-worker/worker.js keeps its own separate copy of this same table
// (see the comment there) since it's the actual authority at payment time —
// any price change here must be mirrored there too, and that file needs a
// Cloudflare redeploy to take effect. The discount itself is automatic here,
// no code required.
var GADELO_PRODUCTS = {
  fighttonight: {
    slug: "fighttonight",
    nameEn: "Fight Tonight",
    nameKo: "파이트 투나잇",
    badge: "flagship",
    roastLevel: "medium",
    line: "core",
    color: "#4B3A2A",
    compareAtPrices: {200: 13.99, 400: 24.99, 1000: 33.99},
    prices: {200: 12.59, 400: 22.49, 1000: 30.59},
    images: {
      card1: "images/products/fighttonight/card1.webp",
      card2: "images/products/fighttonight/card2.webp",
      bags: {200: "images/products/fighttonight/bag-200.webp", 400: "images/products/fighttonight/bag-400.webp", 1000: "images/products/fighttonight/bag-1000.webp"}
    },
    image: "images/products/fighttonight/bag-400.webp",
    originEn: "Guatemala Waikan 55% · Indonesia Aceh Gayo 30% · India Mysore 15%",
    originKo: "과테말라 와이칸 55% · 인도네시아 아체가요 30% · 인도 마이소르 15%",
    descEn: [
      "Ready means ready — that's the whole idea. Fight Tonight opens bright with orange and milk chocolate, then settles into a brown sugar backbone with a whisper of cedar riding underneath. This is the mission-day cup: sharp enough to wake you up, smooth enough to finish before the brief starts.",
      "We donate beans to local firehouses. Always looking for the next unit to team up with."
    ],
    descKo: [
      "준비됐다는 건 곧 준비됐다는 뜻입니다. 파이트 투나잇은 오렌지와 밀크초콜릿으로 산뜻하게 시작해 브라운슈가의 묵직함과 은은한 시더 향으로 이어집니다. 임무 당일 마시는 한 잔 — 정신을 깨우기에 충분히 날카롭고, 브리핑 전에 다 마시기에 충분히 부드럽습니다.",
      "지역 소방서에 원두를 후원하고 있습니다. 함께할 다음 부대를 항상 찾고 있습니다."
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
    compareAtPrices: {200: 13.99, 400: 24.99, 1000: 33.99},
    prices: {200: 12.59, 400: 22.49, 1000: 30.59},
    images: {
      card1: "images/products/unclesam/card1.webp",
      card2: "images/products/unclesam/card2.webp",
      bags: {200: "images/products/unclesam/bag-200.webp", 400: "images/products/unclesam/bag-400.webp", 1000: "images/products/unclesam/bag-1000.webp"}
    },
    image: "images/products/unclesam/bag-400.webp",
    originEn: "Indonesia Aceh Gayo 70% · Kenya 30%",
    originKo: "인도네시아 아체가요 70% · 케냐 30%",
    descEn: [
      "He's been pointing at you since 1917 — now he's pouring, too. Uncle Sam runs deep and dark, with a cedar backbone and a blackcurrant punch that hits harder than you'd expect from a coffee this smooth. Brown sugar and walnut close it out. Your country still needs you. At minimum, it needs you caffeinated.",
      "We donate beans to local firehouses. Always looking for the next unit to team up with."
    ],
    descKo: [
      "1917년부터 당신을 가리켜온 그가, 이제는 커피도 따라줍니다. 엉클샘은 시더의 뼈대 위로 예상보다 강한 블랙커런트의 펀치가 깊고 진하게 흐르는 커피입니다. 브라운슈가와 월넛으로 마무리됩니다. 국가는 여전히 당신을 필요로 합니다. 최소한, 카페인은 채워야죠.",
      "지역 소방서에 원두를 후원하고 있습니다. 함께할 다음 부대를 항상 찾고 있습니다."
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
    compareAtPrices: {200: 14.99, 400: 25.99, 1000: 34.99},
    prices: {200: 13.49, 400: 23.39, 1000: 31.49},
    images: {
      card1: "images/products/freedom/card1.webp",
      card2: "images/products/freedom/card2.webp",
      // 2026-09-22: Freedom now also ships 1kg — no dedicated 1kg bag photo
      // exists yet, so this temporarily reuses the 400g bag shot (see the
      // top-of-file note below). Swap in a real bag-1000.webp once it exists.
      bags: {200: "images/products/freedom/bag-200.webp", 400: "images/products/freedom/bag-400.webp", 1000: "images/products/freedom/bag-400.webp"}
    },
    image: "images/products/freedom/bag-400.webp",
    originEn: "Thailand 42.3% · Colombia 34.1% · Ethiopia 23.5%",
    originKo: "태국 42.3% · 콜롬비아 34.1% · 에티오피아 23.5%",
    descEn: [
      "Three nations, one cup, one debt that doesn't expire. Freedom blends beans from Thailand, Colombia, and Ethiopia — in the exact ratio their troops stood with Korea, back when it mattered most. Bright tropical fruit and lemon-lime up front, cane sugar sweetness to close. Drink it slow. Some things are worth remembering.",
      "A portion of every Freedom sale supports our ongoing fund for Korean War veterans.",
      "We donate beans to local firehouses. Always looking for the next unit to team up with."
    ],
    descKo: [
      "세 나라, 한 잔의 커피, 만료되지 않는 하나의 빚. 프리덤은 태국·콜롬비아·에티오피아의 원두를, 가장 중요했던 순간 한국과 함께했던 각국 파병 비율 그대로 블렌딩했습니다. 트로피컬 프루트와 레몬라임의 산뜻함으로 시작해 케인슈가의 단맛으로 마무리됩니다. 천천히 드세요. 기억할 가치가 있는 것들이니까요.",
      "프리덤 판매금액의 일부는 참전용사 후원금으로 사용됩니다.",
      "지역 소방서에 원두를 후원하고 있습니다. 함께할 다음 부대를 항상 찾고 있습니다."
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
    compareAtPrices: {200: 10.99, 400: 19.99, 1000: 24.99},
    prices: {200: 9.89, 400: 17.99, 1000: 22.49},
    images: {
      card1: "images/products/india/card1.webp",
      card2: "images/products/india/card2.webp",
      bags: {200: "images/products/india/bag-200.webp", 400: "images/products/india/bag-400.webp", 1000: "images/products/india/bag-1000.webp"}
    },
    image: "images/products/india/bag-400.webp",
    originEn: "India Arabica (Mysore) 65% · India Robusta (Kaapi Royale) 35%",
    originKo: "인도 아라비카(마이소르) 65% · 인도 로부스타(카피로얄) 35%",
    descEn: [
      "Named for the patch that's led the way since Korea, Indian Head is nutty, smooth, and built to last. Cashew and malt lay the groundwork, white chocolate keeps it easy-drinking, and a hit of red berry sneaks in at the end to remind you it's still got fight in it. Second to none, cup for cup.",
      "We donate beans to local firehouses. Always looking for the next unit to team up with."
    ],
    descKo: [
      "한국전쟁 때부터 앞장서온 부대 마크에서 이름을 딴 인디언 헤드는 넛티하고 부드러우며 오래 가는 맛을 자랑합니다. 캐슈넛과 몰트가 기본을 잡고, 화이트초콜릿이 편안한 목넘김을 더하며, 마지막엔 레드베리가 살짝 스치며 여전한 존재감을 남깁니다. 어디에도 뒤지지 않는 한 잔입니다.",
      "지역 소방서에 원두를 후원하고 있습니다. 함께할 다음 부대를 항상 찾고 있습니다."
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
    compareAtPrices: {200: 13.99, 400: 21.99, 1000: 38.99},
    prices: {200: 12.59, 400: 19.79, 1000: 35.09},
    images: {
      card1: "images/products/goodwill/card1.webp",
      card2: "images/products/goodwill/card2.webp",
      bags: {200: "images/products/goodwill/bag-200.webp", 400: "images/products/goodwill/bag-400.webp", 1000: "images/products/goodwill/bag-1000.webp"}
    },
    image: "images/products/goodwill/bag-400.webp",
    originEn: "Guatemala Waikan 40% · Nicaragua Segovia 30% · Costa Rica Don Mayo 30%",
    originKo: "과테말라 와이칸 40% · 니카라과 세고비아 30% · 코스타리카 돈마요 30%",
    descEn: [
      "When it's time to move, you move. Roll Out brings a rich, buttery macadamia up front, backed by a soft vanilla warmth and a dark chocolate finish that doesn't quit. This is the coffee you drink standing up, cup in one hand, gear in the other. No hesitation. No second-guessing. Just roll.",
      "We donate beans to local firehouses. Always looking for the next unit to team up with."
    ],
    descKo: [
      "움직여야 할 때는, 움직입니다. 롤 아웃은 진하고 버터리한 마카다미아로 시작해 부드러운 바닐라의 온기, 그리고 끝까지 이어지는 다크초콜릿 피니시로 마무리됩니다. 한 손엔 커피, 한 손엔 장비를 들고 서서 마시는 커피. 망설임 없이, 재고 없이 — 그냥 roll.",
      "지역 소방서에 원두를 후원하고 있습니다. 함께할 다음 부대를 항상 찾고 있습니다."
    ]
  },

  // ---------------------------------------------------------------------
  // Special Edition lineup — seasonal/limited blends, added separately from
  // the 5-blend core lineup above (2026-10-12).
  //
  // Sizes: 200g/400g only (no 1kg) for both of these, matching how they're
  // actually sold on the Korean (Naver) store today — see each entry's price
  // note below for the full basis.
  // ---------------------------------------------------------------------

  halloween: {
    slug: "halloween",
    nameEn: "Halloween Shock and Fear",
    nameKo: "할로윈 충격과 공포",
    badge: "special",
    roastLevel: "light",
    // "seasonal" (not "core") — kept OUT of the homepage grid's cross-sell
    // rotation on purpose, since this one gets its own standalone feature
    // section on index.html instead of a regular grid card. See index.html's
    // "Seasonal — Limited Edition" section, right after the hero.
    line: "seasonal",
    color: "#B9581E",
    // PRICE NOTE (2026-10-12): 조나단 didn't have a US-site USD price set yet
    // and instead passed the Korean/Naver cost-and-margin breakdown for this
    // blend (제조원가 10,735원/200g · 18,070원/400g, Naver 판매가 26,900원/
    // 39,900원). There's no fixed KRW→USD formula on this site — the 5 core
    // blends' USD prices were each given directly by 조나단 and don't track a
    // clean FX rate. These two numbers are MY estimate, extrapolated from how
    // the existing India/Roll Out blends' USD compareAtPrice relates to their
    // own Naver 판매가 (ratio ≈0.00074 × Naver price, rounded to a .99
        // ending) — not a confirmed figure. Flagged to 조나단; treat as
    // provisional until confirmed/corrected.
    compareAtPrices: {200: 19.99, 400: 29.99},
    prices: {200: 17.99, 400: 26.99},
    images: {
      card1: "images/products/halloween/card1.webp",
      card2: "images/products/halloween/card2.webp",
      // No real bag photography yet — temporarily reusing the bean-card
      // illustration (jack-o'-lantern soldier) as the product photo for both
      // sizes. Swap in real bag-200/400.webp once 조나단 sends them.
      bags: {200: "images/products/halloween/card1.webp", 400: "images/products/halloween/card1.webp"}
    },
    image: "images/products/halloween/card1.webp",
    originEn: "Costa Rica Don Mayo El Milagro Cinnamon Anaerobic Honey 70% · Indonesia Sumatra Mandheling Wet-Hulled 30%",
    originKo: "코스타리카 돈 마요 엘 밀라그로 시나몬 아나에로빅 허니 70% · 인도네시아 수마트라 만델링 웻헐링 30%",
    descEn: [
      "This pumpkin spice season doesn't need another run-of-the-mill new release. GADELO's Halloween Shock & Fear takes a light roast base and loads it with real pumpkin spice flavor, cinnamon, and sugar so fall shows up in a single sip."
    ],
    descKo: [
      "이번 가을, 펌킨 스파이스의 계절에 또 그런 흔한 신상은 필요 없습니다. 가델로의 할로윈 충격과 공포는 라이트 로스팅 베이스에 펌킨 스파이스 풍미와 따뜻한 시나몬, 설탕을 담아, 한 모금에 가을이 느껴지도록 만들었습니다."
    ]
  },

  alwaysprepared: {
    slug: "alwaysprepared",
    nameEn: "Always Prepared",
    nameKo: "올웨이즈 프리페어드",
    badge: "special",
    roastLevel: "dark",
    line: "core", // regular grid card + cross-sell eligible, unlike halloween above
    color: "#0D1F3F",
    // PRICE NOTE (2026-10-12): same situation/method as Halloween above —
    // 조나단 passed Naver cost/margin data (제조원가 9,333원/200g ·
    // 15,267원/400g, Naver 판매가 25,000원/36,000원) instead of a USD figure.
    // Estimated the same way (≈0.00074 × Naver price, rounded to .99).
    // Provisional until confirmed/corrected.
    compareAtPrices: {200: 18.99, 400: 26.99},
    prices: {200: 17.09, 400: 24.29},
    images: {
      card1: "images/products/alwaysprepared/card1.webp",
      // No card2/back image or real bag photography yet — reusing the one
      // poster illustration (Patriot battery) everywhere for now.
      bags: {200: "images/products/alwaysprepared/card1.webp", 400: "images/products/alwaysprepared/card1.webp"}
    },
    image: "images/products/alwaysprepared/card1.webp",
    originEn: "Guatemala Kin (Washed) 60% · Nicaragua Segovia (Washed) 40%",
    originKo: "과테말라 킨 워시드 60% · 니카라과 세고비아 워시드 40%",
    descEn: [
      "Chocolate runs through every sip from first to last, with macadamia and pistachio stepping forward, one note at a time. Well-balanced sweetness and a heavy, nutty body fill the palate.",
      "We donate beans to local firehouses. Always looking for the next unit to team up with."
    ],
    descKo: [
      "첫 모금부터 끝까지 초콜릿이 중심을 잡아주고, 그 위로 마카다미아와 피스타치오의 고소함이 한 발 한 발 또렷하게 번집니다. 단맛과 밸런스가 좋고, 묵직한 견과류의 풍미가 입안을 가득 채우는 바디감 좋은 블렌드입니다.",
      "지역 소방서에 원두를 후원하고 있습니다. 함께할 다음 부대를 항상 찾고 있습니다."
    ]
  }
};
