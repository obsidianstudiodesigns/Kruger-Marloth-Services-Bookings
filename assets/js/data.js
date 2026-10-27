/* =========================================================
   SITE CONTENT — edit this file to update listings & services
   ---------------------------------------------------------
   Fields marked in `draft` are DUMMY values that still need the
   real details from the owner (price, sleeps, rules, etc.).
   Photos live in images/stays/<id>/01.jpg … and thumb/01.jpg …
   ========================================================= */

const SITE = {
  name: 'Kruger Marloth Services & Bookings',
  contactName: 'Nadia',
  phone: '061 512 9208',
  whatsapp: '27615129208',          // international format, no + or spaces
  email: 'whndistributors@gmail.com',
  location: 'Marloth Park, Mpumalanga, South Africa',
  // GitHub repository that hosts the site (used by the admin dashboard)
  repo: { owner: 'obsidianstudiodesigns', name: 'Kruger-Marloth-Services-Bookings', branch: 'main' },
};

/* Default house rules — DUMMY until the owner confirms per property */
const DEFAULT_RULES = {
  checkIn: '14:00',
  checkOut: '10:00',
  minNights: 2,
  deposit: '50% deposit secures the booking, balance due 7 days before arrival.',
};

/* amenity icon keys: pool, wifi, snow, flame, tv, washer, dish, zap, sun, lock, paw, river,
   car, deck, shower, bath, game, kids, bar, home, bed, sofa, fan, safe, tree, star */
const STAYS = [
  {
    id: 'tarentaal',
    name: 'Tarentaal 2794@Marloth',
    tag: 'Backup power',
    tagline: 'Modern self-catering bush home close to the river',
    description: 'A bright, modern bush home with three en-suite bedrooms, an open-plan living area and a covered patio that opens onto the pool deck. Backup water and power keep everything running during load shedding, so evenings are spent at the boma listening to lions roar and hippos calling from the river.',
    sleeps: 6, bedrooms: 3, bathrooms: 3,
    price: 1980, peakPrice: 3300, peakLabel: 'School holidays',
    photos: 9, flyer: true,
    filters: ['pool', 'river', 'power'],
    amenities: [
      ['bed', '3 modern bedrooms'], ['bath', '3 en-suite bathrooms'], ['pool', 'Private pool'],
      ['flame', 'Braai & boma'], ['wifi', 'WiFi'], ['tv', 'TV'], ['snow', 'Aircons'],
      ['washer', 'Washing machine'], ['dish', 'Dishwasher'], ['zap', 'Backup water & power'],
    ],
    draft: ['sleeps', 'rules'],
  },
  {
    id: 'afrika-safari',
    name: 'Afrika Safari Gastehuis',
    tag: 'Guest house',
    tagline: 'Thatched guest house with a private bush bar',
    description: 'A characterful thatched guest house with face-brick interiors, a fully stocked-style entertainment bar and a spacious lounge made for long safari evenings. Bedrooms are dressed with safari linen and the bathrooms feature corner baths and walk-in showers.',
    sleeps: 6, bedrooms: 3, bathrooms: 3,
    price: 2400,
    photos: 11, flyer: false,
    filters: ['groups'],
    amenities: [
      ['home', 'Thatched guest house'], ['bar', 'Entertainment bar'], ['sofa', 'Spacious lounge'],
      ['bath', 'Corner baths & showers'], ['snow', 'Aircons'], ['car', 'Secure parking'],
    ],
    draft: ['price', 'sleeps', 'bedrooms', 'bathrooms', 'description', 'amenities', 'rules'],
  },
  {
    id: 'bosgenade',
    name: 'Berghaan – Bosgenade@Marloth',
    tag: 'Sleeps 8',
    tagline: 'Thatched lapa, plunge pool and lions at night',
    description: 'A relaxed bushveld home with a double-volume lounge, loft sleeping area and a huge thatched outdoor lapa for braais and get-togethers. Enjoy an evening at the boma listening to lions roaring nearby while plenty of animals wander through the area.',
    sleeps: 8, bedrooms: 3, bathrooms: 2,
    price: 2600,
    photos: 9, flyer: true,
    filters: ['pool', 'groups'],
    amenities: [
      ['users', 'Sleeps 8'], ['wifi', 'WiFi'], ['snow', 'Aircons'], ['pool', 'Plunge pool'],
      ['home', 'Outdoor thatched lapa'], ['flame', 'Boma & braai'], ['paw', 'Lots of animals in the area'],
    ],
    draft: ['price', 'bedrooms', 'bathrooms', 'rules'],
  },
  {
    id: 'buffalo-chalets',
    name: 'Buffalo Chalets',
    tag: 'Budget friendly',
    tagline: 'Cosy self-catering chalets around a shared boma',
    description: 'Comfortable face-brick chalets with thatched roofs, kitchenettes and mosquito-netted beds, set around a shared plunge pool, boma and shaded patio. A great-value base for couples and small families exploring Marloth Park and the Kruger.',
    sleeps: 2, bedrooms: 1, bathrooms: 1,
    price: 950,
    photos: 10, flyer: false,
    filters: ['pool', 'couples'],
    amenities: [
      ['home', 'Thatched chalets'], ['bed', 'Mosquito nets'], ['dish', 'Kitchenette'],
      ['pool', 'Plunge pool'], ['flame', 'Shared boma & braai'], ['snow', 'Aircon'],
    ],
    draft: ['price', 'sleeps', 'bedrooms', 'bathrooms', 'description', 'amenities', 'rules'],
  },
  {
    id: 'bushfire-mongoose',
    name: 'Bushfire Mongoose@Marloth',
    tag: 'Newly styled',
    tagline: 'Fresh, modern home with pool and sunken boma',
    description: 'A light-filled, modern home with an open-plan kitchen and lounge, air-conditioned bedrooms and crisp white linen. Outside, a sparkling pool and a sunken boma make the most of Marloth Park’s famous sunsets.',
    sleeps: 6, bedrooms: 3, bathrooms: 2,
    price: 1950,
    photos: 8, flyer: false,
    filters: ['pool'],
    amenities: [
      ['pool', 'Private pool'], ['flame', 'Sunken boma'], ['snow', 'Aircons'],
      ['fan', 'Ceiling fans'], ['dish', 'Open-plan kitchen'], ['sofa', 'Comfortable lounge'],
    ],
    draft: ['price', 'sleeps', 'bedrooms', 'bathrooms', 'description', 'amenities', 'rules'],
  },
  {
    id: 'cheetah',
    name: 'Cheetah@Marloth',
    tag: 'Sleeps 12',
    tagline: 'Very private house for big groups — pool, boma & games',
    description: 'A spacious, very private self-catering house with no neighbours in close proximity. Two air-conditioned bedrooms downstairs, an upstairs bedroom and a large loft with four single and three-quarter beds. The big stoep, boma and pool are perfect for groups, with darts, beer pong and a gas braai for rainy days.',
    sleeps: 12, bedrooms: 4, bathrooms: 2,
    price: 3500, priceNote: 'Tariffs depend on group size · off-peak specials',
    photos: 11, flyer: true,
    filters: ['pool', 'groups', 'power'],
    amenities: [
      ['users', 'Sleeps up to 12'], ['pool', 'Pool with pump & filter'], ['lock', 'Very private house'],
      ['flame', 'Large stoep & boma'], ['flame', 'Gas braai on stoep'], ['wifi', 'Uncapped fibre 30Mb/s'],
      ['tv', 'Smart TV'], ['snow', 'Aircons in bedrooms'], ['washer', 'Washing machine & tumble dryer'],
      ['dish', 'Dishwasher & microwave'], ['zap', 'Backup lights & gas equipment'], ['game', 'Darts & beer pong'],
    ],
    draft: ['price', 'bathrooms', 'rules'],
  },
  {
    id: 'elephant-bush-house',
    name: 'Elephant Bush House',
    tag: 'Family',
    tagline: 'Bush-style family home on Butterfly Street',
    description: 'Escape to the heart of the bushveld in this traditional bush-style home on Butterfly Street. A comfortable lounge and entertainment area with its own bar, a splash pool to cool off and a kids’ play area make it a firm favourite with families — with kudu and warthogs right at your doorstep.',
    sleeps: 8, bedrooms: 3, bathrooms: 2,
    price: 2300,
    photos: 5, flyer: true,
    filters: ['pool', 'groups', 'kids'],
    amenities: [
      ['users', 'Sleeps up to 8'], ['sofa', 'Lounge & entertainment area'], ['bar', 'Bush bar'],
      ['pool', 'Splash pool'], ['kids', 'Kids play area / playroom'], ['snow', 'Air-conditioning'],
      ['paw', 'Wildlife at your doorstep'],
    ],
    draft: ['price', 'bedrooms', 'bathrooms', 'rules'],
  },
  {
    id: 'indabush',
    name: 'Indabush',
    tag: 'Outdoor bath',
    tagline: 'Three-bedroom holiday home near the Crocodile River',
    description: 'A spacious three-bedroom holiday home with three modern bathrooms — including a romantic outdoor bath — a private pool and a covered patio for long lunches. WiFi, an inverter and aircons keep you connected and comfortable, while animals roam freely around the property.',
    sleeps: 6, bedrooms: 3, bathrooms: 3,
    price: 2400,
    photos: 11, flyer: true,
    filters: ['pool', 'river', 'power'],
    amenities: [
      ['bed', '3 bedrooms'], ['bath', '3 modern bathrooms'], ['bath', 'Outdoor bath'],
      ['pool', 'Private pool'], ['wifi', 'WiFi'], ['zap', 'Inverter'], ['snow', 'Aircons'],
      ['flame', 'Fire pit'], ['river', 'Close to the Crocodile River'],
    ],
    draft: ['price', 'sleeps', 'rules'],
  },
  {
    id: 'kruger-naledi',
    name: 'Kruger Naledi@Marloth',
    tag: 'Couples & families',
    tagline: 'A beautiful gem in the bush with a thatched lapa',
    description: 'Come and enjoy an unforgettable holiday at this beautifully decorated thatched home, where animals roam freely around you. Two en-suite bedrooms, a stylish open-plan lounge and kitchen, and a lush garden with pool, braai area and a candle-lit outdoor lapa.',
    sleeps: 4, bedrooms: 2, bathrooms: 2,
    price: 1650,
    photos: 16, flyer: true,
    filters: ['pool', 'couples'],
    amenities: [
      ['bed', '2 en-suite bedrooms'], ['wifi', 'WiFi'], ['pool', 'Pool'], ['flame', 'Braai area'],
      ['deck', 'Outdoor furniture & lapa'], ['tv', 'DStv & TV'],
    ],
    draft: ['price', 'sleeps', 'rules'],
  },
  {
    id: 'moepel',
    name: 'Moepel@Marloth',
    tag: 'Very private',
    tagline: 'Your private bush escape — pool, boma & deck',
    description: 'A fresh, contemporary two-bedroom house with en-suite bathrooms, stacking doors onto a shaded deck with loungers, and a private pool. Evenings are for the fire pit and the sounds of the bush — very private and perfect for a peaceful, relaxing stay.',
    sleeps: 4, bedrooms: 2, bathrooms: 2,
    price: 1600,
    photos: 11, flyer: true,
    filters: ['pool', 'couples'],
    amenities: [
      ['bed', '2 bedrooms, en-suite'], ['pool', 'Private pool'], ['flame', 'Boma / fire pit'],
      ['wifi', 'WiFi'], ['deck', 'Covered deck with loungers'], ['lock', 'Very private'],
      ['paw', 'Lots of animals roaming the area'],
    ],
    draft: ['price', 'sleeps', 'rules'],
  },
  {
    id: 'my-africa-chalet',
    name: 'My Africa Chalet',
    tag: 'Near the river',
    tagline: 'Nature at your doorstep — zebra visit daily',
    description: 'A thatched face-brick chalet with a big deck overlooking the bush, where herds of zebra are regular visitors. Three bedrooms, three bathrooms and a loft sleep up to eight, with solar power and an inverter, a pool, double braai and boma — all within walking distance of the Crocodile River.',
    sleeps: 8, bedrooms: 3, bathrooms: 3,
    price: 2500,
    photos: 9, flyer: true,
    filters: ['pool', 'river', 'groups', 'power'],
    amenities: [
      ['bed', '3 bedrooms + loft'], ['bath', '3 bathrooms'], ['pool', 'Pool'], ['wifi', 'WiFi'],
      ['zap', 'Inverter'], ['sun', 'Solar panels'], ['snow', 'Pre-paid aircons'], ['fan', 'Fans'],
      ['flame', 'Double braai & boma'], ['deck', 'Deck & outside furniture'], ['shower', 'Outside shower'],
      ['flame', 'Gas stove & gas geyser'], ['river', 'Walk to the Crocodile River'],
    ],
    draft: ['price', 'rules'],
  },
  {
    id: 'phai-thong',
    name: 'Phai Thong Hide Away',
    tag: 'Romantic',
    tagline: 'A unique glass luxury unit next to the Kruger fence',
    description: 'A unique, romantic luxury unit with floor-to-ceiling glass, a skylight and sweeping views over the Crocodile River and Kruger National Park. Step out onto the private deck with a braai and bar counter to watch the river below — your private escape in nature.',
    sleeps: 2, bedrooms: 1, bathrooms: 1,
    price: 2200,
    photos: 12, flyer: true,
    filters: ['river', 'couples'],
    amenities: [
      ['star', 'River & Kruger views'], ['snow', 'Aircons'], ['wifi', 'WiFi'], ['flame', 'Braai area'],
      ['deck', 'Private deck'], ['bar', 'Restaurant close by'], ['pool', 'Swimming pool close by'],
    ],
    draft: ['price', 'sleeps', 'rules'],
  },
  {
    id: 'porcupine',
    name: 'Porcupine@Marloth',
    tag: '200m from river',
    tagline: 'A lovely bush house surrounded by wild animals',
    description: 'Enjoy a glass of wine next to the fire, listening to hippos and lions at night. This lovely three-bedroom bush house has a big wooden deck where kudu and nyala come to visit, an undercover fireplace braai, a pool and undercover parking — just 200 m from the river.',
    sleeps: 6, bedrooms: 3, bathrooms: 3,
    price: 2100,
    photos: 16, flyer: true,
    filters: ['pool', 'river'],
    amenities: [
      ['bed', '3 bedrooms'], ['bath', '3 bathrooms'], ['snow', 'Pre-paid aircons'], ['pool', 'Pool'],
      ['flame', 'Braai'], ['river', '200 m from the river'], ['car', 'Undercover parking'],
      ['deck', 'Wooden game-viewing deck'],
    ],
    draft: ['price', 'sleeps', 'rules'],
  },
  {
    id: 'salamah',
    name: 'Salamah',
    tag: 'Sleeps 8',
    tagline: 'Corner stand with a loft overlooking park land',
    description: 'Self-catering accommodation for eight on a corner stand, 700 m from the Crocodile River and Kruger fence. Downstairs: a queen bedroom with en-suite bathroom, a room with two three-quarter beds and a full bathroom. The loft has two double beds overlooking the park land, and the undercover splash pool sits in a lapa with braai facilities. Just bring your food, clothes and swimming towels.',
    sleeps: 8, bedrooms: 3, bathrooms: 2,
    price: 2200,
    photos: 13, flyer: false,
    filters: ['pool', 'river', 'groups'],
    amenities: [
      ['bed', 'Queen en-suite bedroom'], ['bed', 'Loft with two double beds'], ['dish', 'Full kitchen with dishwasher & air fryer'],
      ['pool', 'Undercover splash pool'], ['flame', 'Lapa with braai'], ['deck', 'Stoep overlooking park land'],
      ['tv', 'DStv'], ['wifi', 'WiFi'], ['snow', 'Pre-paid aircons'], ['river', '700 m from the Crocodile River'],
    ],
    draft: ['price', 'rules'],
  },
  {
    id: 'shingwedzi',
    name: 'Shingwedzi@Marloth',
    tag: 'Modern',
    tagline: 'A modern bush home with a huge stoep and pool',
    description: 'Come and enjoy an unforgettable stay in this modern bush home. Three bedrooms (one en-suite with a freestanding bath), a sleeper couch, an open-plan kitchen and lounge, and a huge stoep overlooking the pool — with bushbabies and plenty of other animals roaming the area.',
    sleeps: 8, bedrooms: 3, bathrooms: 2,
    price: 2300,
    photos: 12, flyer: false,
    filters: ['pool', 'groups'],
    amenities: [
      ['bed', '3 bedrooms'], ['bath', 'En-suite bathroom'], ['sofa', 'Sleeper couch'], ['wifi', 'WiFi'],
      ['pool', 'Pool'], ['snow', 'Pre-paid aircons'], ['deck', 'Huge stoep'], ['paw', 'Lots of animals roaming'],
    ],
    draft: ['price', 'sleeps', 'bathrooms', 'rules'],
  },
  {
    id: 'waterpeer',
    name: 'Waterpeer@Marloth',
    tag: 'Safe for kids',
    tagline: 'Your private bush escape, ~300 m from the river',
    description: 'A fully equipped, very private self-catering house with two en-suite bedrooms with queen-size beds (plus an extra single mattress if needed). The pool has a proper pump and filter, there’s uncapped internet and a smart TV with Netflix — and bushbabies drop by the house regularly. Safe for small children.',
    sleeps: 4, bedrooms: 2, bathrooms: 2,
    price: 1500,
    photos: 10, flyer: true,
    filters: ['pool', 'river', 'kids', 'power'],
    amenities: [
      ['users', 'Sleeps 4 +'], ['bed', '2 en-suite bedrooms, queen beds'], ['snow', 'Aircons in both rooms'],
      ['safe', 'Safe for valuables'], ['pool', 'Pool with pump & filter'], ['wifi', 'Uncapped internet'],
      ['tv', 'Smart TV with Netflix'], ['zap', 'Backup lights & gas equipment'], ['lock', 'Very private'],
      ['kids', 'Safe for small children'], ['river', '~300 m from the river'],
    ],
    draft: ['price', 'rules'],
  },
];

/* Filters shown above the accommodation grid */
const STAY_FILTERS = [
  { id: 'all', label: 'All stays' },
  { id: 'pool', label: 'Private pool' },
  { id: 'river', label: 'Near the river' },
  { id: 'couples', label: 'Couples' },
  { id: 'groups', label: 'Groups 8+' },
  { id: 'power', label: 'Backup power' },
  { id: 'kids', label: 'Kid friendly' },
];

/* =========================================================
   SERVICE DIRECTORY
   Empty `providers` show as "coming soon".
   ========================================================= */
const SERVICE_CATEGORIES = [
  {
    id: 'handyman', icon: 'wrench', name: 'Handyman & Maintenance',
    blurb: 'Repairs, plumbing, electrical, decks and pool maintenance.',
    providers: [
      {
        name: 'One Call Maintenance', image: 'images/services/one-call-maintenance.jpg',
        description: 'Your local handyman, maintenance and repair specialists — from bush homes to holiday rentals, one call and they do it all.',
        tags: ['Electrical', 'General repairs', 'Steel fabrication & welding', 'Wooden decks & carports', 'Pool maintenance', 'Patio awnings', 'Staircases'],
        phones: ['064 520 2264', '061 512 9208'],
        area: 'Marloth Park & surrounds',
      },
      {
        name: 'De Langen Projects Plumbing', image: 'images/services/de-langen-plumbing.jpg',
        description: 'Reliable plumbing solutions built to last — quality workmanship from JP de Langen, a PIRB-registered plumber.',
        tags: ['Unblock drains', 'Sink & counter fitment', 'Installations', 'Geysers', 'Repairs & maintenance', 'CoCs'],
        phones: ['076 726 7891'],
        area: 'Marloth Park & surrounds',
      },
      {
        name: 'Professional Handyman Services', image: 'images/services/lappies-handyman.jpg',
        description: 'Reliable, affordable and efficient handyman services — no job too big or too small. Ask for Lappies.',
        tags: ['General repairs', 'Maintenance', 'Home improvements', 'Fast & friendly'],
        phones: ['082 813 1431'],
        area: 'Marloth Park & surrounds',
      },
    ],
  },
  {
    id: 'laundry', icon: 'washer', name: 'Laundry Services',
    blurb: 'Wash, dry, iron and delivery to your door.',
    providers: [
      {
        name: 'Kruger Marloth Laundry Service', image: 'images/services/kruger-marloth-laundry.jpg',
        description: 'Clean laundry, fresh living. They wash, dry, iron and deliver — so you can enjoy your holiday.',
        tags: ['Wash', 'Dry', 'Iron', 'Delivery'],
        phones: ['061 512 9208'],
        email: 'krugermarlothlaundry@gmail.com',
        address: '692 Olifant, Marloth Park, 1321',
      },
    ],
  },
  {
    id: 'photographers', icon: 'camera', name: 'Photographers',
    blurb: 'Capture your safari memories with a local pro.',
    providers: [
      {
        name: 'Marloth Park Photography', image: 'images/services/marloth-photography.jpg',
        description: 'Professional photography in the heart of the bush — beautiful sunset locations, wildlife surroundings and scenic bushveld settings.',
        tags: ['Engagements', 'Couples', 'Family', 'Maternity', 'Birthdays', 'Special events', 'Holiday memories'],
        phones: ['061 512 9208'],
        area: 'Marloth Park area only',
      },
    ],
  },
  { id: 'game-rides', icon: 'binoculars', name: 'Game Rides', blurb: 'Open-vehicle game drives into the Kruger and around Marloth.', providers: [] },
  { id: 'activities', icon: 'compass', name: 'Activities', blurb: 'Horse riding, guided bush walks, river cruises and more.', providers: [] },
  { id: 'shuttles', icon: 'car', name: 'Shuttle Services', blurb: 'Airport transfers and trips to the Kruger gates.', providers: [] },
  { id: 'restaurants', icon: 'utensils', name: 'Restaurants', blurb: 'Bush pubs, cafés and dinner spots in Marloth.', providers: [] },
  { id: 'butcheries', icon: 'flame', name: 'Butcheries', blurb: 'Braai packs, biltong and droëwors.', providers: [] },
  { id: 'chefs', icon: 'chef', name: 'Private Chefs', blurb: 'From casual braais to fine dining at your stay.', providers: [] },
  { id: 'cleaning', icon: 'sparkle', name: 'House Cleaning', blurb: 'Daily or once-off cleaning for holiday homes.', providers: [] },
];

/* Experiences shown in the "Things to do" strip (arranged on request) */
const EXPERIENCES = [
  { name: 'Kruger game drives', text: 'Sunrise and sunset drives into the Kruger with an experienced guide.', image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=900&q=80' },
  { name: 'Bush horse riding', text: 'Ride through the bushveld on well-trained horses — beginners welcome.', image: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=900&q=80' },
  { name: 'Night safaris', text: 'Spot leopard, hyena, genets and bushbabies after dark.', image: 'https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&w=900&q=80' },
  { name: 'Guided bush walks', text: 'Learn to read tracks and the small things most people miss.', image: 'https://images.unsplash.com/photo-1523805009345-7448845a9e53?auto=format&fit=crop&w=900&q=80' },
];
