/** Transcribed from the supplied Euro Plaza presentation and apartment plans.
 * Layouts describe apartment types, not individual units or live availability.
 */
export interface ApartmentLayout {
  code: string;
  rooms: number;
  area: number;
  image: string;
}
export const asset = (name: string) => `/building/euro-plaza/${name}`;
export const apartmentLayouts: readonly ApartmentLayout[] = [
  { code: "А", rooms: 3, area: 71.37, image: "type-a.jpeg" },
  { code: "В", rooms: 3, area: 60.98, image: "type-v.jpeg" },
  { code: "Г", rooms: 2, area: 51.9, image: "type-g.jpeg" },
  { code: "Д", rooms: 1, area: 36.88, image: "type-d.jpeg" },
  { code: "Ж", rooms: 1, area: 34.26, image: "type-j.jpeg" },
  { code: "З", rooms: 2, area: 49.32, image: "type-z.jpeg" },
  { code: "И", rooms: 2, area: 53.63, image: "type-i.jpeg" },
];
export const commercialFloors = [
  {
    floor: "B2",
    title: "Автомашины зогсоол",
    description: "Хотхоны автомашины зогсоол.",
  },
  {
    floor: "B1",
    title: "MGL Mall",
    description: "Худалдаа, үйлчилгээ, өдөр тутмын хэрэглээг нэг дор.",
  },
  {
    floor: "F1",
    title: "Банк & брэндийн дэлгүүрүүд",
    description: "Банк, үүрэн телефон, брэндийн дэлгүүрүүд.",
    note: "Танилцуулгад зарагдсан гэж тэмдэглэсэн",
  },
  {
    floor: "F2",
    title: "Технологийн худалдаа",
    description: "Технологийн барааны худалдааны төв.",
  },
  {
    floor: "F3",
    title: "Худалдаа, үйлчилгээ",
    description: "Төрөл бүрийн худалдаа, үйлчилгээний байгууллагууд.",
  },
  {
    floor: "F4",
    title: "Оффисын талбай",
    description: "Оффис болон түрээсийн зориулалттай талбай.",
  },
];
export const projectAdvantages = [
  {
    title: "Хотын төвийн байршил",
    description:
      "3, 4-р хорооллын бүсэд, худалдаа үйлчилгээ болон нийтийн тээвэрт ойр.",
  },
  {
    title: "Тав тухтай төлөвлөлт",
    description:
      "Том цонх, байгалийн гэрэлтүүлэг, орон зайн оновчтой зохион байгуулалт.",
  },
  {
    title: "Ногоон орчин",
    description: "Ногоон байгууламж, амралтын талбайтай нэгдсэн төлөвлөлт.",
  },
  {
    title: "Өдөр тутмын аюулгүй байдал",
    description: "24 цагийн харуул хамгаалалт, автомашины зогсоол.",
  },
];
export const salesPhones = ["95114691", "80464848"] as const;
