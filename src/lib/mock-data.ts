import bangkokSingapore from "@/assets/Bangkok & Singapore.jpeg";
import newYork from "@/assets/Newyork.jpg";
import salonei from "@/assets/Salonei.jpeg";
import switzerland from "@/assets/swizerland.jpeg";
import tokyoSeoul from "@/assets/Tokyo & Seoul.jpeg";
import vietnam from "@/assets/vitenam.jpeg";

export type GalleryItem = {
  type: "photo" | "video";
  src: string;
  caption: string;
  author: string;
};

export const packages = [
  {
    slug: "bangkok-singapore",
    title: "Bangkok & Singapore Journey",
    location: "Thailand & Singapore",
    days: 10,
    price: 10900,
    category: "Signature",
    image: bangkokSingapore,
    tagline: "Street food, skyline bars, and cultural contrast.",
    description:
      "Begin in Bangkok's golden temples and end in Singapore's polished skyline, with private transfers, local dining experiences, and premium stays.",
    rating: 4.9,
    reviewCount: 238,
    reviews: [
      {
        author: "Mila R.",
        role: "Travel Editor",
        date: "May 2026",
        comment:
          "The food tour was worth the trip alone; local guides shared alleyway secrets and the hotel views were cinematic.",
        tip: "Take the river taxi between markets to save time and feel the city pulse.",
        media: [{ type: "photo", src: bangkokSingapore, label: "Bangkok street food" }],
      },
    ],
  },
  {
    slug: "newyork-citypulse",
    title: "New York City Pulse",
    location: "USA",
    days: 8,
    price: 9800,
    category: "City Adventure",
    image: newYork,
    tagline: "Broadway nights and rooftop mornings.",
    description:
      "Experience New York from the iconic skyline to Michelin dining, with private tours, VIP access, and luxury hospitality.",
    rating: 4.8,
    reviewCount: 196,
    reviews: [
      {
        author: "Avery C.",
        role: "Creative Director",
        date: "April 2026",
        comment:
          "The rooftop brunch and Broadway evening were the full city experience. Every transfer was smooth and personalized.",
        tip: "Book the evening museum after-hours to avoid lines and enjoy quieter galleries.",
        media: [{ type: "photo", src: newYork, label: "Manhattan skyline" }],
      },
    ],
  },
  {
    slug: "salonei-retreat",
    title: "Salonei Retreat",
    location: "West Africa",
    days: 9,
    price: 8700,
    category: "Exclusive",
    image: salonei,
    tagline: "Quiet beaches and soulful evenings.",
    description:
      "A refined coastal escape in Salonei with curated dining, seaside villas, and guided cultural experiences.",
    rating: 4.7,
    reviewCount: 142,
    reviews: [
      {
        author: "Camille G.",
        role: "Photographer",
        date: "March 2026",
        comment:
          "Evenings by the beach felt private and unhurried. The local market visit was a highlight with fresh seafood and market stories.",
        tip: "Ask for the beachside storytellers at sunset — they know the hidden fishing coves.",
        media: [{ type: "photo", src: salonei, label: "Salonei sunset" }],
      },
    ],
  },
  {
    slug: "switzerland-alpine",
    title: "Switzerland Alpine Escape",
    location: "Switzerland",
    days: 11,
    price: 12500,
    category: "Luxury",
    image: switzerland,
    tagline: "Chalets, cable cars, and lakeside elegance.",
    description:
      "Traverse the Swiss Alps with scenic rail journeys, luxury chalets, and alpine dining with panoramic views.",
    rating: 4.9,
    reviewCount: 214,
    reviews: [
      {
        author: "Noah L.",
        role: "Executive",
        date: "April 2026",
        comment:
          "The rail journeys felt cinematic and the chalet was a perfect retreat after alpine hikes. Michelin dining in the valley was unforgettable.",
        tip: "Bring layers—mountain mornings are crisp, but afternoons warm beautifully.",
        media: [{ type: "photo", src: switzerland, label: "Swiss chalet view" }],
      },
    ],
  },
  {
    slug: "tokyo-seoul-fusion",
    title: "Tokyo & Seoul Fusion",
    location: "Japan & South Korea",
    days: 10,
    price: 11200,
    category: "Culture & Cuisine",
    image: tokyoSeoul,
    tagline: "Neon nights, temples, and culinary highs.",
    description:
      "Merge Tokyo's modern pulse with Seoul's dynamic culture on a journey of street food, design, and private experiences.",
    rating: 4.8,
    reviewCount: 188,
    reviews: [
      {
        author: "Lina S.",
        role: "Food Critic",
        date: "May 2026",
        comment:
          "Every meal felt like a story, from sushi counters to late-night Korean barbecue. The city tours were lively and deeply local.",
        tip: "Reserve a hidden speakeasy in Tokyo and ask for the song pairing experience in Seoul.",
        media: [
          {
            type: "video",
            src: "https://picsum.photos/seed/tky-reel/600/400",
            label: "Tokyo night ride",
          },
        ],
      },
    ],
  },
  {
    slug: "vietnam-river",
    title: "Vietnam River Reverie",
    location: "Vietnam",
    days: 9,
    price: 8400,
    category: "Adventure",
    image: vietnam,
    tagline: "Emerald waterways and coastal serenity.",
    description:
      "Discover Vietnam from Hanoi to Ha Long Bay with luxury river cruises, heritage stays, and immersive city tours.",
    rating: 4.7,
    reviewCount: 171,
    reviews: [
      {
        author: "Mina K.",
        role: "Journalist",
        date: "April 2026",
        comment:
          "The river cruise was a quiet luxury, with morning mist and rice paddy views. The cultural stops felt thoughtfully paced.",
        tip: "Wake up for sunrise on the water — the light on the karsts is worth the early alarm.",
        media: [{ type: "photo", src: vietnam, label: "Vietnam river cruise" }],
      },
    ],
  },
];

export const destinations = [
  {
    slug: "bangkok-singapore",
    name: "Bangkok & Singapore",
    image: bangkokSingapore,
    packagesCount: 12,
    tagline: "Fusion of flavors and skyline",
    duration: "10 Days",
    price: 10900,
    rating: 4.8,
    reviewCount: 148,
    review: "Two Asian capitals in one elevated journey.",
    reviews: [
      {
        author: "Noah H.",
        date: "Apr 2026",
        comment: "Bangkok and Singapore in one seamless trip — each city felt curated and local.",
        tip: "Skip the midday heat with an early temple visit and rooftop supper.",
      },
    ],
    gallery: [
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/bkk-01/600/800",
        caption: "Golden spires at Wat Pho",
        author: "Sofia K. · Melbourne",
      },
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/sg-01/800/600",
        caption: "Marina Bay Sands at dusk",
        author: "Raj P. · Delhi",
      },
      {
        type: "video" as const,
        src: "https://picsum.photos/seed/bkk-food/600/400",
        caption: "Street food tour reel",
        author: "Chen W. · Shanghai",
      },
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/sg-02/600/800",
        caption: "Gardens by the Bay",
        author: "Sarah L. · Sydney",
      },
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/bkk-02/600/800",
        caption: "Wat Arun at sunrise",
        author: "Lily T. · London",
      },
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/sg-03/800/600",
        caption: "Chinatown night lights",
        author: "Hassan A. · Dubai",
      },
    ] as GalleryItem[],
  },
  {
    slug: "newyork",
    name: "New York",
    image: newYork,
    packagesCount: 9,
    tagline: "City that never sleeps",
    duration: "8 Days",
    price: 9800,
    rating: 4.9,
    reviewCount: 201,
    review: "Luxury energy from Broadway to rooftop bars.",
    reviews: [
      {
        author: "Elena S.",
        date: "May 2026",
        comment: "The Broadway show recommendation and city guide made our week feel legendary.",
        tip: "Take the morning ferry for quiet skyline photos.",
      },
    ],
    gallery: [
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/nyc-01/600/800",
        caption: "Manhattan from Brooklyn Bridge",
        author: "Avery C. · LA",
      },
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/nyc-02/800/600",
        caption: "Central Park autumn morning",
        author: "James H. · Boston",
      },
      {
        type: "video" as const,
        src: "https://picsum.photos/seed/nyc-03/600/400",
        caption: "Night walk through SoHo",
        author: "Elena M. · Rome",
      },
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/nyc-04/600/800",
        caption: "Rooftop brunch views",
        author: "Tara N. · Mumbai",
      },
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/nyc-05/800/600",
        caption: "Times Square at dusk",
        author: "Lucas B. · Toronto",
      },
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/nyc-06/600/800",
        caption: "Brooklyn promenade at dawn",
        author: "Mia F. · Paris",
      },
    ] as GalleryItem[],
  },
  {
    slug: "salonei",
    name: "Salonei",
    image: salonei,
    packagesCount: 7,
    tagline: "Soulful spice and sunset style",
    duration: "9 Days",
    price: 8700,
    rating: 4.7,
    reviewCount: 112,
    review: "Warm beaches and vibrant nights with five-star service.",
    reviews: [
      {
        author: "Tariq B.",
        date: "Mar 2026",
        comment: "The local cultural nights and secret beaches were unforgettable.",
        tip: "Ask your guide for the rainforest dinner location — it changes each week.",
      },
    ],
    gallery: [
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/sal-01/600/800",
        caption: "Private cove at sunset",
        author: "Camille G. · Paris",
      },
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/sal-02/800/600",
        caption: "Morning fish market",
        author: "Tariq B. · Lagos",
      },
      {
        type: "video" as const,
        src: "https://picsum.photos/seed/sal-03/600/400",
        caption: "Sunset boat ride clip",
        author: "Aisha M. · Accra",
      },
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/sal-04/600/800",
        caption: "Coastal village life",
        author: "Finn O. · Dublin",
      },
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/sal-05/800/600",
        caption: "Emerald coast horizon",
        author: "Lena K. · Oslo",
      },
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/sal-06/600/800",
        caption: "Beachside dinner setup",
        author: "Omar H. · Cairo",
      },
    ] as GalleryItem[],
  },
  {
    slug: "switzerland",
    name: "Switzerland",
    image: switzerland,
    packagesCount: 11,
    tagline: "Alpine elegance",
    duration: "11 Days",
    price: 12500,
    rating: 4.9,
    reviewCount: 223,
    review: "Chalets, peaks, and gourmet mountain rail journeys.",
    reviews: [
      {
        author: "Hanna M.",
        date: "Apr 2026",
        comment: "The alpine itinerary was perfectly balanced with adventure and relaxation.",
        tip: "Reserve the sunrise train to the mountain observatory.",
      },
    ],
    gallery: [
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/swi-01/600/800",
        caption: "Alpine sunrise over the peaks",
        author: "Noah L. · Zurich",
      },
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/swi-02/800/600",
        caption: "Lake Geneva reflection",
        author: "Hanna M. · Vienna",
      },
      {
        type: "video" as const,
        src: "https://picsum.photos/seed/swi-03/600/400",
        caption: "Glacier Express journey",
        author: "Hugo F. · Lyon",
      },
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/swi-04/600/800",
        caption: "Chalet terrace at dusk",
        author: "Clara S. · Stockholm",
      },
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/swi-05/800/600",
        caption: "Grindelwald village scene",
        author: "Max W. · Berlin",
      },
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/swi-06/600/800",
        caption: "Ice-blue mountain lake",
        author: "Nina B. · Amsterdam",
      },
    ] as GalleryItem[],
  },
  {
    slug: "tokyo-seoul",
    name: "Tokyo & Seoul",
    image: tokyoSeoul,
    packagesCount: 10,
    tagline: "Tech pulse, culinary thrills",
    duration: "10 Days",
    price: 11200,
    rating: 4.8,
    reviewCount: 189,
    review: "Tradition, neon nights, and Michelin moments.",
    reviews: [
      {
        author: "Lina W.",
        date: "May 2026",
        comment: "The blend of Tokyo calm and Seoul energy was a brilliant travel rhythm.",
        tip: "Use the evening subway to sample street food and late-night fashion districts.",
      },
    ],
    gallery: [
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/tky-01/600/800",
        caption: "Shinjuku neon after midnight",
        author: "Lina S. · Singapore",
      },
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/tky-02/800/600",
        caption: "Senso-ji temple at dawn",
        author: "Yuki T. · Osaka",
      },
      {
        type: "video" as const,
        src: "https://picsum.photos/seed/seo-reel/600/400",
        caption: "Korean BBQ night reel",
        author: "Ji H. · Seoul",
      },
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/seo-01/600/800",
        caption: "Hongdae street fashion",
        author: "Min K. · Busan",
      },
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/tky-03/800/600",
        caption: "Tsukiji morning market",
        author: "Nana O. · Tokyo",
      },
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/seo-02/600/800",
        caption: "Gyeongbokgung palace",
        author: "Ji Y. · Seoul",
      },
    ] as GalleryItem[],
  },
  {
    slug: "vietnam",
    name: "Vietnam",
    image: vietnam,
    packagesCount: 8,
    tagline: "River paths and emerald coasts",
    duration: "9 Days",
    price: 8400,
    rating: 4.7,
    reviewCount: 162,
    review: "Slow mornings on the Mekong and hidden bays.",
    reviews: [
      {
        author: "Mina K.",
        date: "Apr 2026",
        comment: "The river cruise and heritage homestays made the trip feel personal.",
        tip: "Wake up for sunrise on the water for the best photos.",
      },
    ],
    gallery: [
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/vtn-01/600/800",
        caption: "Ha Long Bay morning mist",
        author: "Mina K. · Hanoi",
      },
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/vtn-02/800/600",
        caption: "Hoi An lantern festival",
        author: "Thanh P. · HCMC",
      },
      {
        type: "video" as const,
        src: "https://picsum.photos/seed/vtn-reel/600/400",
        caption: "Mekong Delta cruise clip",
        author: "Marco B. · Milan",
      },
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/vtn-04/600/800",
        caption: "Sa Pa rice terraces",
        author: "Ana R. · Madrid",
      },
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/vtn-05/800/600",
        caption: "Hanoi Old Quarter life",
        author: "David C. · London",
      },
      {
        type: "photo" as const,
        src: "https://picsum.photos/seed/vtn-06/600/800",
        caption: "Hue imperial citadel",
        author: "Linh T. · Da Nang",
      },
    ] as GalleryItem[],
  },
];

export const services = [
  {
    id: "tour-packages",
    name: "Curated Tour Packages",
    description: "Hand-crafted itineraries across 124+ destinations.",
    rating: 4.9,
    reviewCount: 512,
    highlight: "They crafted the exact pace I needed — effortless and luxurious.",
  },
  {
    id: "visa-assistance",
    name: "Visa Concierge",
    description: "Expedited filings, white-glove documentation handling.",
    rating: 4.8,
    reviewCount: 441,
    highlight: "The team handled my urgent paperwork while I focused on the trip.",
  },
  {
    id: "hotel-booking",
    name: "Luxury Hotel Booking",
    description: "Negotiated rates at the world's best properties.",
    rating: 4.9,
    reviewCount: 378,
    highlight: "Every stay felt upgraded, from arrival to late checkout.",
  },
  {
    id: "flight-booking",
    name: "Flight Booking",
    description: "Business & first-class fares, multi-city routing.",
    rating: 4.8,
    reviewCount: 398,
    highlight: "They found the perfect routing with minimal layovers.",
  },
  {
    id: "corporate-tours",
    name: "Corporate Retreats",
    description: "Off-sites that change company culture.",
    rating: 4.7,
    reviewCount: 259,
    highlight: "Our team returned with stronger bonds and zero logistics headaches.",
  },
  {
    id: "group-tours",
    name: "Group Tours",
    description: "Small private groups, never bus-tour scale.",
    rating: 4.8,
    reviewCount: 311,
    highlight: "The group experience felt intimate and perfectly timed.",
  },
  {
    id: "honeymoon",
    name: "Honeymoon Packages",
    description: "Stories that begin a marriage.",
    rating: 4.9,
    reviewCount: 287,
    highlight: "Attention to detail made every moment feel special.",
  },
  {
    id: "adventure",
    name: "Adventure Expeditions",
    description: "Sahara, Patagonia, Himalayas — properly equipped.",
    rating: 4.8,
    reviewCount: 330,
    highlight: "The guides knew every ridge, trail, and local story.",
  },
  {
    id: "international",
    name: "International Travel",
    description: "Global routing handled end-to-end.",
    rating: 4.8,
    reviewCount: 364,
    highlight: "We felt supported in every timezone.",
  },
  {
    id: "domestic",
    name: "Domestic Travel",
    description: "Hidden corners of home, beautifully arranged.",
    rating: 4.7,
    reviewCount: 225,
    highlight: "Domestic escapes felt as polished as overseas journeys.",
  },
  {
    id: "passport",
    name: "Passport Assistance",
    description: "Renewals, expediting, lost-passport recovery.",
    rating: 4.9,
    reviewCount: 402,
    highlight: "They resolved my embassy appointments with ease.",
  },
  {
    id: "custom-trip",
    name: "Custom Trip Planning",
    description: "From a single line of brief to a finished journey.",
    rating: 4.9,
    reviewCount: 487,
    highlight: "Every detail matched our request better than expected.",
  },
];

export const serviceGallery = [
  {
    src: "https://picsum.photos/seed/svc-hotel/600/400",
    caption: "Luxury suite arrival",
    service: "Hotel Booking",
  },
  {
    src: "https://picsum.photos/seed/svc-flight/600/400",
    caption: "Business class lounge",
    service: "Flight Booking",
  },
  {
    src: "https://picsum.photos/seed/svc-visa/600/400",
    caption: "Visa approved",
    service: "Visa Concierge",
  },
  {
    src: "https://picsum.photos/seed/svc-honey/600/400",
    caption: "Honeymoon suite setup",
    service: "Honeymoon",
  },
  {
    src: "https://picsum.photos/seed/svc-corp/600/400",
    caption: "Alpine team retreat",
    service: "Corporate Retreats",
  },
  {
    src: "https://picsum.photos/seed/svc-guide/600/400",
    caption: "Private guide, Kyoto",
    service: "Custom Planning",
  },
  {
    src: "https://picsum.photos/seed/svc-adv/600/400",
    caption: "Summit base camp",
    service: "Adventure",
  },
  {
    src: "https://picsum.photos/seed/svc-group/600/400",
    caption: "Group tour kickoff",
    service: "Group Tours",
  },
];

export const communityReviews = [
  {
    id: "review-1",
    category: "Destination",
    subject: "Bangkok & Singapore",
    rating: 4.9,
    author: "Sofia K.",
    location: "Melbourne",
    date: "May 2026",
    comment:
      "Night markets, hidden temples, and rooftop dinner views made this duo-city journey unforgettable.",
    tip: "Book the first boat cruise at sunrise; the city feels magic before the crowds arrive.",
    media: [
      { type: "photo", src: bangkokSingapore, label: "Bangkok market" },
      {
        type: "video",
        src: "https://picsum.photos/seed/bkk-reel/600/400",
        label: "Street food reel",
      },
    ],
  },
  {
    id: "review-2",
    category: "Package",
    subject: "Tokyo & Seoul Fusion",
    rating: 4.8,
    author: "Lina S.",
    location: "Singapore",
    date: "April 2026",
    comment:
      "The perfect blend of temple calm and neon nights. The team sent video snapshots and private guides who knew the best alleys.",
    tip: "Reserve late dinner at a hidden izakaya and then take the subway through Hongdae after midnight.",
    media: [
      { type: "photo", src: tokyoSeoul, label: "Night cityscape" },
      {
        type: "video",
        src: "https://picsum.photos/seed/tky-food/600/400",
        label: "Food tour clip",
      },
    ],
  },
  {
    id: "review-3",
    category: "Service",
    subject: "Visa Concierge",
    rating: 4.9,
    author: "Michael T.",
    location: "London",
    date: "March 2026",
    comment:
      "They handled my paperwork while I focused on packing. I received clear updates, photo scans, and a quick tipsheet for local entry requirements.",
    tip: "Upload your documents early and let the team confirm everything before you leave.",
    media: [
      {
        type: "video",
        src: "https://picsum.photos/seed/visa-guide/600/400",
        label: "How-to upload guide",
      },
    ],
  },
];

export const testimonials = [
  {
    name: "Aarav Mehta",
    role: "Founder, Loom Capital",
    quote:
      "JourneyMakers planned my honeymoon in Kyoto with surgical taste. Every transition felt rehearsed by an invisible hand.",
    location: "Mumbai",
  },
  {
    name: "Elena Costa",
    role: "Architect",
    quote:
      "I asked for 'somewhere quiet.' They sent me to a fishing village in Hokkaido I didn't know existed. Best week of my year.",
    location: "Milan",
  },
  {
    name: "Marcus Lin",
    role: "CEO, Northwind",
    quote:
      "We've used three concierges. This is the only one that returns calls at 2am in a foreign timezone — and means it.",
    location: "Singapore",
  },
];

export const faqs = [
  {
    q: "How does the booking process work?",
    a: "Submit an inquiry with your vision and dates. A planner reaches out within 24 hours. We design the journey collaboratively; you confirm before any commitments are made.",
  },
  {
    q: "Do you handle visas?",
    a: "Yes. Our concierge handles visa filings for 150+ countries, including expedited and diplomatic routing.",
  },
  {
    q: "Is there a minimum trip cost?",
    a: "We focus on curated experiences. Most journeys begin around $3,500 per traveler, though we tailor to brief, not to floor.",
  },
  {
    q: "Can I customize a published package?",
    a: "Every package is a starting point. Add days, swap stays, change pace — say the word.",
  },
  {
    q: "What if plans change mid-trip?",
    a: "24/7 concierge is included on every journey. Flights re-routed, reservations moved, doctors found — quietly.",
  },
];

export const stats = [
  { value: "124+", label: "Destinations" },
  { value: "12k", label: "Journeys Completed" },
  { value: "98%", label: "Concierge Rating" },
  { value: "24/7", label: "Global Support" },
];
