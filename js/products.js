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
      "When it's time to move, you move. Roll Out brings a rich, buttery macadamia up front, backed by a soft vanilla warmth and a dark chocolate finish that doesn't quit. This is the coffee you drink standing up, cup in one hand, gear in the other. No hesitation. No second-guessing. Just roll.",
      "We donate beans to local firehouses. Always looking for the next unit to team up with."
    ],
    descKo: [
      "움직여야 할 때는, 움직입니다. 롤 아웃은 진하고 버터리한 마카다미아로 시작해 부드러운 바닐라의 온기, 그리고 끝까지 이어지는 다크초콜릿 피니시로 마무리됩니다. 한 손엔 커피, 한 손엔 장비를 들고 서서 마시는 커피. 망설임 없이, 재고 없이 — 그냥 roll.",
      "지역 소방서에 원두를 후원하고 있습니다. 함께할 다음 부대를 항상 찾고 있습니다."
    ]
  }
};
