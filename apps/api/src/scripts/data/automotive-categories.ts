export type AutomotiveCategorySpec = {
  slug: string;
  name: string;
  icon?: string;
  parentSlug?: string | null;
  sortOrder: number;
};

type VehicleMake = {
  slug: string;
  name: string;
  models: string[];
};

const VEHICLE_MAKES: VehicleMake[] = [
  { slug: "toyota", name: "Toyota", models: ["Prius", "Aqua", "Corolla", "Camry", "Crown", "Mark X", "Harrier", "RAV4", "Highlander", "Land Cruiser 70", "Land Cruiser 80", "Land Cruiser 100", "Land Cruiser 200", "Land Cruiser 300", "Land Cruiser Prado", "Hilux", "Fortuner", "Alphard", "Vellfire", "Hiace", "Probox", "Succeed", "Sienta", "Noah", "Voxy", "Fielder", "Wish", "Passo", "Vitz / Yaris", "Estima", "C-HR", "Raize"] },
  { slug: "lexus", name: "Lexus", models: ["RX", "LX", "GX", "NX", "ES", "GS", "IS", "LS", "UX"] },
  { slug: "nissan", name: "Nissan", models: ["X-Trail", "Patrol", "Qashqai", "Note", "Tiida", "Teana", "Skyline", "Serena", "Elgrand", "Navara", "Juke", "Leaf"] },
  { slug: "honda", name: "Honda", models: ["Fit", "CR-V", "Vezel", "Insight", "Accord", "Civic", "Stepwgn", "Freed", "Odyssey"] },
  { slug: "subaru", name: "Subaru", models: ["Forester", "Outback", "Legacy", "Impreza", "XV / Crosstrek", "Levorg"] },
  { slug: "mitsubishi", name: "Mitsubishi", models: ["Pajero", "Outlander", "Delica D:5", "Lancer", "Triton", "RVR"] },
  { slug: "mazda", name: "Mazda", models: ["CX-5", "CX-7", "CX-9", "Demio / Mazda2", "Axela / Mazda3", "Atenza / Mazda6"] },
  { slug: "suzuki", name: "Suzuki", models: ["Jimny", "Swift", "Vitara", "Escudo", "Hustler", "Every"] },
  { slug: "isuzu", name: "Isuzu", models: ["D-Max", "MU-X", "NPR / NQR"] },
  { slug: "hyundai", name: "Hyundai", models: ["Santa Fe", "Tucson", "Palisade", "Sonata", "Avante / Elantra", "Accent", "Starex", "Porter"] },
  { slug: "kia", name: "Kia", models: ["Sorento", "Sportage", "Carnival", "K5 / Optima", "K3 / Forte", "Morning / Picanto", "Bongo"] },
  { slug: "kgm-ssangyong", name: "KGM / SsangYong", models: ["Rexton", "Korando", "Musso", "Tivoli"] },
  { slug: "daewoo", name: "Daewoo", models: ["Matiz", "Gentra", "Lacetti", "Nexia"] },
  { slug: "mercedes-benz", name: "Mercedes-Benz", models: ["C-Class", "E-Class", "S-Class", "G-Class", "GLA", "GLC", "GLE", "GLS", "Sprinter", "Vito"] },
  { slug: "bmw", name: "BMW", models: ["3 Series", "5 Series", "7 Series", "X1", "X3", "X5", "X6", "X7"] },
  { slug: "audi", name: "Audi", models: ["A3", "A4", "A6", "A8", "Q3", "Q5", "Q7", "Q8"] },
  { slug: "volkswagen", name: "Volkswagen", models: ["Touareg", "Tiguan", "Passat", "Golf", "Jetta", "Transporter"] },
  { slug: "porsche", name: "Porsche", models: ["Cayenne", "Macan", "Panamera", "Taycan"] },
  { slug: "land-rover", name: "Land Rover", models: ["Range Rover", "Range Rover Sport", "Velar", "Evoque", "Discovery", "Defender"] },
  { slug: "volvo", name: "Volvo", models: ["XC40", "XC60", "XC90", "S60", "S90"] },
  { slug: "ford", name: "Ford", models: ["Ranger", "F-150", "Explorer", "Escape", "Everest", "Transit"] },
  { slug: "chevrolet", name: "Chevrolet", models: ["Cruze", "Captiva", "Tahoe", "Suburban", "Silverado", "Trailblazer"] },
  { slug: "jeep", name: "Jeep", models: ["Wrangler", "Grand Cherokee", "Cherokee", "Renegade"] },
  { slug: "tesla", name: "Tesla", models: ["Model 3", "Model Y", "Model S", "Model X"] },
  { slug: "byd", name: "BYD", models: ["Song Plus", "Yuan Plus / Atto 3", "Tang", "Han", "Dolphin", "Seal"] },
  { slug: "geely", name: "Geely", models: ["Monjaro", "Coolray", "Atlas", "Emgrand"] },
  { slug: "chery", name: "Chery", models: ["Tiggo 4", "Tiggo 7", "Tiggo 8", "Arrizo 5"] },
  { slug: "haval", name: "Haval", models: ["H6", "Jolion", "Dargo", "H9"] },
  { slug: "gwm-tank", name: "GWM / Tank", models: ["Poer", "Tank 300", "Tank 500"] },
  { slug: "changan", name: "Changan", models: ["CS35 Plus", "CS55 Plus", "CS75 Plus", "UNI-T", "UNI-K", "UNI-V"] },
  { slug: "jetour", name: "Jetour", models: ["X70", "X90", "T2"] },
  { slug: "li-auto", name: "Li Auto", models: ["L6", "L7", "L8", "L9"] },
  { slug: "zeekr", name: "Zeekr", models: ["001", "X", "009"] },
  { slug: "hongqi", name: "Hongqi", models: ["HS5", "H9", "E-HS9"] },
  { slug: "baic", name: "BAIC", models: ["BJ40", "BJ60", "X7"] },
  { slug: "jac", name: "JAC", models: ["T8", "JS4", "JS6"] },
  { slug: "dongfeng", name: "Dongfeng", models: ["Huge", "T5 EVO", "Rich"] },
  { slug: "foton", name: "Foton", models: ["Tunland", "View", "Aumark"] },
  { slug: "lada", name: "Lada", models: ["Niva", "Vesta", "Granta"] },
  { slug: "uaz", name: "UAZ", models: ["469 / Hunter", "Patriot", "Bukhanka"] },
];

const slugifyModel = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\//g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const makeCategories: AutomotiveCategorySpec[] = VEHICLE_MAKES.flatMap(
  (make, makeIndex) => {
    const makeSlug = `vehicle-make-${make.slug}`;
    const makeOrder = 9300 + makeIndex * 100;
    return [
      {
        slug: makeSlug,
        name: make.name,
        icon: "🚘",
        parentSlug: "vehicle-by-make",
        sortOrder: makeOrder,
      },
      ...make.models.map((model, modelIndex) => ({
        slug: `${makeSlug}-${slugifyModel(model)}`,
        name: model,
        icon: "🚗",
        parentSlug: makeSlug,
        sortOrder: makeOrder + modelIndex + 1,
      })),
    ];
  },
);

export const AUTOMOTIVE_CATEGORIES: AutomotiveCategorySpec[] = [
  { slug: "auto-moto", name: "Авто, мото", icon: "🚗", parentSlug: null, sortOrder: 900 },
  { slug: "auto-parts", name: "Автомашины сэлбэг", icon: "⚙️", parentSlug: "auto-moto", sortOrder: 901 },
  { slug: "engine-parts", name: "Хөдөлгүүрийн сэлбэг", icon: "⚙️", parentSlug: "auto-parts", sortOrder: 9011 },
  { slug: "transmission-drivetrain-parts", name: "Хурдны хайрцаг, дамжуулга", icon: "🔩", parentSlug: "auto-parts", sortOrder: 9012 },
  { slug: "suspension-steering-parts", name: "Явах эд анги, жолоодлого", icon: "🔧", parentSlug: "auto-parts", sortOrder: 9013 },
  { slug: "brake-parts", name: "Тоормосны сэлбэг", icon: "🛑", parentSlug: "auto-parts", sortOrder: 9014 },
  { slug: "auto-electrical-parts", name: "Цахилгаан, электроникийн сэлбэг", icon: "⚡", parentSlug: "auto-parts", sortOrder: 9015 },
  { slug: "body-exterior-parts", name: "Кузов, гадна эд анги", icon: "🚙", parentSlug: "auto-parts", sortOrder: 9016 },
  { slug: "cooling-heating-parts", name: "Хөргөлт, халаалтын сэлбэг", icon: "🌡️", parentSlug: "auto-parts", sortOrder: 9017 },
  { slug: "filters-belts-parts", name: "Шүүлтүүр, ремень, жийргэвч", icon: "🧰", parentSlug: "auto-parts", sortOrder: 9018 },
  { slug: "exhaust-parts", name: "Яндангийн систем", icon: "💨", parentSlug: "auto-parts", sortOrder: 9019 },
  { slug: "auto-accessories", name: "Автомашины дагалдах хэрэгсэл", icon: "🧰", parentSlug: "auto-moto", sortOrder: 902 },
  { slug: "interior-accessories", name: "Салоны дагалдах хэрэгсэл", icon: "💺", parentSlug: "auto-accessories", sortOrder: 9021 },
  { slug: "exterior-accessories", name: "Гадна дагалдах хэрэгсэл", icon: "🚘", parentSlug: "auto-accessories", sortOrder: 9022 },
  { slug: "floor-mats-seat-covers", name: "Шалавч, суудлын бүрээс", icon: "🪑", parentSlug: "auto-accessories", sortOrder: 9023 },
  { slug: "auto-lighting-accessories", name: "Гэрэл, чимэглэл", icon: "💡", parentSlug: "auto-accessories", sortOrder: 9024 },
  { slug: "roof-racks-towing", name: "Ачааны тавиур, чиргүүл", icon: "🧳", parentSlug: "auto-accessories", sortOrder: 9025 },
  { slug: "emergency-tools", name: "Ослын болон засварын хэрэгсэл", icon: "🧯", parentSlug: "auto-accessories", sortOrder: 9026 },
  { slug: "tires-wheels", name: "Дугуй, обуд", icon: "🛞", parentSlug: "auto-moto", sortOrder: 903 },
  { slug: "car-care", name: "Авто арчилгаа, цэвэрлэгээ", icon: "🧴", parentSlug: "auto-moto", sortOrder: 904 },
  { slug: "car-electronics", name: "Авто цахилгаан хэрэгсэл", icon: "🔋", parentSlug: "auto-moto", sortOrder: 905 },
  { slug: "dashcams-navigation", name: "Камер, GPS, навигаци", icon: "📹", parentSlug: "car-electronics", sortOrder: 9051 },
  { slug: "car-audio-multimedia", name: "Аудио, дэлгэц, мультимедиа", icon: "🔊", parentSlug: "car-electronics", sortOrder: 9052 },
  { slug: "battery-charging", name: "Аккумулятор, цэнэглэгч", icon: "🔋", parentSlug: "car-electronics", sortOrder: 9053 },
  { slug: "oils-fluids", name: "Тос, шингэн, нэмэлт", icon: "🛢️", parentSlug: "auto-moto", sortOrder: 906 },
  { slug: "vehicle-by-make", name: "Үйлдвэр, загвараар", icon: "🏭", parentSlug: "auto-moto", sortOrder: 907 },
  { slug: "commercial-vehicle-parts", name: "Ачааны машин, автобусны сэлбэг", icon: "🚛", parentSlug: "auto-moto", sortOrder: 908 },
  { slug: "motorcycle", name: "Мотоцикл, сэлбэг хэрэгсэл", icon: "🏍️", parentSlug: "auto-moto", sortOrder: 909 },
  ...makeCategories,
];
