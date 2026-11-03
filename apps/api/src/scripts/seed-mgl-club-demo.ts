import "../config/env";
import { prisma } from "@mgl/database";
import {
  MGL_CLUB_PROVINCES,
  mglClubFormFields,
  parseMglClubProfile,
  getMglClubCurrentYear,
} from "@mgl/types";

const businesses = [
  [
    "Худалдаа",
    "Нутгийн сагс",
    "Хүнсний бөөний худалдаа, байгууллагын хангамж",
    "Орон нутгийн хүргэлт, агуулахын үйлчилгээ",
  ],
  [
    "Аялал жуулчлал",
    "Алтай аялал",
    "Хөтөч, нутгийн аяллын маршрут, жуулчны байр",
    "Зураг авалт, аяллын тоног төхөөрөмж",
  ],
  [
    "Үйлдвэрлэл",
    "Дулаан ноос",
    "Ноосон хувцас, захиалгат бэлэг үйлдвэрлэл",
    "Сав баглаа боодол, онлайн худалдааны түнш",
  ],
  [
    "Хоол үйлдвэрлэл",
    "Амтат нутаг",
    "Байгууллагын өдрийн хоол, захиалгат кейтеринг",
    "Мах, хүнсний ногоо, хөргүүртэй тээвэр",
  ],
  [
    "Тээвэр, логистик",
    "Алсын тээвэр",
    "Аймаг хоорондын ачаа тээвэр, хүргэлт",
    "Авто засвар, дугуй, сэлбэгийн нийлүүлэлт",
  ],
  [
    "Мэдээллийн технологи",
    "Нутгийн дижитал",
    "Вэб сайт, онлайн дэлгүүр, программ хөгжүүлэлт",
    "Дизайнер, контент бүтээгчтэй хамтрах",
  ],
  [
    "Барилга, үл хөдлөх",
    "Бат суурь",
    "Дотор засал, амины орон сууцны засвар",
    "Барилгын материал, цахилгаан хэрэгслийн нийлүүлэлт",
  ],
  [
    "Боловсрол",
    "Ирээдүй сургалт",
    "Англи хэл, компьютер, бизнесийн сургалт",
    "Сургалтын тавилга, хэвлэл, цахим платформ",
  ],
  [
    "Эрүүл мэнд, гоо сайхан",
    "Гоо нутаг",
    "Арьс арчилгаа, гоо сайхны үйлчилгээ",
    "Гоо сайхны бүтээгдэхүүн, тоног төхөөрөмж",
  ],
  [
    "Санхүү, зөвлөх үйлчилгээ",
    "Тооцоо түнш",
    "Нягтлан бодох бүртгэл, бизнесийн зөвлөгөө",
    "Оффисын хангамж, программын үйлчилгээ",
  ],
  [
    "Үйлдвэрлэл",
    "Уран мод",
    "Захиалгат тавилга, оффисын тохижилт",
    "Мод, тоноглол, тавилгын дагалдах хэрэгсэл",
  ],
  [
    "Худалдаа",
    "Эрдэнэ хангамж",
    "Ажлын хувцас, хамгаалах хэрэгслийн худалдаа",
    "Оёдлын үйлдвэрлэл, хэвлэлийн үйлчилгээ",
  ],
  [
    "Аялал жуулчлал",
    "Хангайн буудал",
    "Зочид буудал, хурлын танхим, арга хэмжээ",
    "Угаалга, цэвэрлэгээ, хүнсний нийлүүлэлт",
  ],
  [
    "Мэдээллийн технологи",
    "Говь медиа",
    "Сошиал хөтлөлт, зураг авалт, брэнд дизайн",
    "Камерын тоног төхөөрөмж, хэвлэлийн түнш",
  ],
  [
    "Хоол үйлдвэрлэл",
    "Өглөөний амт",
    "Талх, нарийн боов, байгууллагын захиалга",
    "Гурил, сүүн бүтээгдэхүүн, сав баглаа боодол",
  ],
  [
    "Үйлдвэрлэл",
    "Ногоон ургац",
    "Хүлэмжийн хүнсний ногоо, тогтмол нийлүүлэлт",
    "Үр, бордоо, тээвэр, усалгааны тоног төхөөрөмж",
  ],
  [
    "Барилга, үл хөдлөх",
    "Төв засвар",
    "Сантехник, цахилгаан угсралт, засвар",
    "Сантехникийн материал, цахилгааны хэрэгсэл",
  ],
  [
    "Худалдаа",
    "Давст нуур",
    "Нутгийн бүтээгдэхүүн, бэлгийн багц",
    "Савлагаа, шошго хэвлэл, борлуулалтын суваг",
  ],
  [
    "Боловсрол",
    "Мэдлэг төв",
    "Хүүхдийн хөгжлийн сургалт, дугуйлан",
    "Ном, сургалтын хэрэглэгдэхүүн, тавилга",
  ],
  [
    "Тээвэр, логистик",
    "Хоймор хүргэлт",
    "Хот доторх хүргэлт, байгууллагын логистик",
    "Авто үйлчилгээ, агуулах, даатгалын түнш",
  ],
] as const;

async function main() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (
    process.env.NODE_ENV === "production" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  )
    throw new Error("MGL CLUB demo seed only supports a local database");
  await prisma.$transaction(
    async (tx) => {
      const form = await tx.form.upsert({
        where: { slug: "mgl-club" },
        update: { fields: mglClubFormFields },
        create: {
          slug: "mgl-club",
          title: "MGL CLUB • Бизнес эрхлэгчдийн бүртгэл",
          fields: mglClubFormFields,
        },
      });
      for (const [provinceIndex, city] of MGL_CLUB_PROVINCES.entries()) {
        for (let slot = 0; slot < 15; slot += 1) {
          const index = provinceIndex * 15 + slot;
          const [sector, businessName, offers, needs] =
            businesses[(provinceIndex + slot) % businesses.length];
          const number = String(slot + 1).padStart(2, "0");
          const profile = parseMglClubProfile({
            name: `[ТЕСТ] ${city} гишүүн ${number}`,
            businessName: `[ТЕСТ] ${businessName} ${number}`,
            city,
            sector,
            description: `${city} аймагт ${offers.toLowerCase()} чиглэлээр ажилладаг зохиомол бизнес. MGL CLUB-ийн хайлт, аймгийн ангиллыг шалгах туршилтын мэдээлэл.`,
            offers,
            needs,
            foundedYear: String(getMglClubCurrentYear() - (index % 17)),
            role:
              slot % 3 === 0
                ? "Үүсгэн байгуулагч"
                : slot % 3 === 1
                  ? "Захирал"
                  : "Үйлчилгээний менежер",
            teamSize: String(2 + (index % 35)),
            address: `${city} аймаг · Туршилтын хаяг ${number}`,
            workingHours:
              slot % 2 === 0
                ? "Даваа–Баасан 09:00–18:00"
                : "Даваа–Бямба 10:00–19:00",
            serviceArea:
              sector === "Мэдээллийн технологи"
                ? `${city} аймаг болон онлайнаар улс даяар`
                : `${city} аймаг, ойролцоох сумд`,
            website: `https://example.com/mgl-club/province-${provinceIndex + 1}/member-${slot + 1}`,
            phone: "00000000",
            consent: "yes",
          });
          if (!profile)
            throw new Error(`Invalid demo profile: ${city} ${number}`);
          const id = `00000000-0000-4000-a000-${String(index + 1).padStart(12, "0")}`;
          const data = { ...profile, isDemo: true };
          await tx.formResponse.upsert({
            where: { id },
            update: { data, formId: form.id },
            create: { id, data, formId: form.id },
          });
        }
      }
    },
    { timeout: 30000 },
  );
  console.log(
    `MGL CLUB: ${MGL_CLUB_PROVINCES.length * 15} local test members are ready. Re-running this seed does not duplicate them.`,
  );
}
main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
