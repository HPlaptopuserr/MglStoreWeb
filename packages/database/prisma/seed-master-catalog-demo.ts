import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const normalizeName = (value: string) =>
  value
    .normalize("NFKC")
    .toLocaleLowerCase("mn")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");

const demoProducts = [
  {
    barcode: "8659900000010",
    canonicalName: "Цэвэр ус 500 мл",
    brand: "Demo Fresh",
    unit: "ш",
    categoryName: "Ундаа, кофе, цай",
    aliases: ["Ус 0.5л", "Цэвэр ус жижиг"],
  },
  {
    barcode: "8659900000027",
    canonicalName: "Цэвэр ус 1.5 л",
    brand: "Demo Fresh",
    unit: "ш",
    categoryName: "Ундаа, кофе, цай",
    aliases: ["Ус 1.5л", "Цэвэр ус том"],
  },
  {
    barcode: "8659900000034",
    canonicalName: "Бүхэл сүү 1 л",
    brand: "Demo Milk",
    unit: "ш",
    categoryName: "Хоол хүнс",
    aliases: ["Сүү 1л", "Бүхэл сүү"],
  },
  {
    barcode: "8659900000041",
    canonicalName: "Тараг 450 мл",
    brand: "Demo Milk",
    unit: "ш",
    categoryName: "Хоол хүнс",
    aliases: ["Тараг", "Савтай тараг"],
  },
  {
    barcode: "8659900000058",
    canonicalName: "Цагаан талх 600 гр",
    brand: "Demo Bakery",
    unit: "ш",
    categoryName: "Талх нарийн боов",
    aliases: ["Талх", "Цагаан талх"],
  },
  {
    barcode: "8659900000065",
    canonicalName: "Хар талх 500 гр",
    brand: "Demo Bakery",
    unit: "ш",
    categoryName: "Талх нарийн боов",
    aliases: ["Хар талх", "Бүхэл үрийн талх"],
  },
  {
    barcode: "8659900000072",
    canonicalName: "Тахианы өндөг 10 ширхэг",
    brand: "Demo Farm",
    unit: "багц",
    categoryName: "Хоол хүнс",
    aliases: ["Өндөг 10ш", "Тахианы өндөг"],
  },
  {
    barcode: "8659900000089",
    canonicalName: "Дээд гурил 1 кг",
    brand: "Demo Grain",
    unit: "уут",
    categoryName: "Хоол хүнс",
    aliases: ["Гурил 1кг", "Дээд гурил"],
  },
  {
    barcode: "8659900000096",
    canonicalName: "Цагаан будаа 1 кг",
    brand: "Demo Grain",
    unit: "уут",
    categoryName: "Хоол хүнс",
    aliases: ["Будаа 1кг", "Цагаан будаа"],
  },
  {
    barcode: "8659900000102",
    canonicalName: "Элсэн чихэр 1 кг",
    brand: "Demo Sweet",
    unit: "уут",
    categoryName: "Хоол хүнс",
    aliases: ["Чихэр 1кг", "Элсэн чихэр"],
  },
  {
    barcode: "8659900000119",
    canonicalName: "Иоджуулсан давс 500 гр",
    brand: "Demo Salt",
    unit: "уут",
    categoryName: "Хоол хүнс",
    aliases: ["Давс 500гр", "Иодтой давс"],
  },
  {
    barcode: "8659900000126",
    canonicalName: "Ургамлын тос 1 л",
    brand: "Demo Oil",
    unit: "ш",
    categoryName: "Хоол хүнс",
    aliases: ["Тос 1л", "Ургамлын тос"],
  },
  {
    barcode: "8659900000133",
    canonicalName: "Жүржийн шүүс 1 л",
    brand: "Demo Juice",
    unit: "ш",
    categoryName: "Ундаа, кофе, цай",
    aliases: ["Шүүс 1л", "Жүржийн шүүс"],
  },
  {
    barcode: "8659900000140",
    canonicalName: "Хийжүүлсэн ундаа 500 мл",
    brand: "Demo Cola",
    unit: "ш",
    categoryName: "Ундаа, кофе, цай",
    aliases: ["Ундаа 0.5л", "Кола"],
  },
  {
    barcode: "8659900000157",
    canonicalName: "Төмсний чипс 90 гр",
    brand: "Demo Snack",
    unit: "уут",
    categoryName: "Хоол хүнс",
    aliases: ["Чипс", "Төмсний чипс"],
  },
  {
    barcode: "8659900000164",
    canonicalName: "Угаалгын нунтаг 1 кг",
    brand: "Demo Clean",
    unit: "уут",
    categoryName: "Цэвэрлэгээний хэрэгсэл",
    aliases: ["Угаалгын нунтаг", "Нунтаг 1кг"],
  },
] as const;

async function main() {
  for (const product of demoProducts) {
    const master = await prisma.masterProduct.upsert({
      where: { barcode: product.barcode },
      update: {
        canonicalName: product.canonicalName,
        normalizedName: normalizeName(product.canonicalName),
        brand: product.brand,
        unit: product.unit,
        categoryName: product.categoryName,
        description: `${product.brand} брэндийн demo нэгдсэн бараа`,
        status: "ACTIVE",
      },
      create: {
        canonicalName: product.canonicalName,
        normalizedName: normalizeName(product.canonicalName),
        barcode: product.barcode,
        brand: product.brand,
        unit: product.unit,
        categoryName: product.categoryName,
        description: `${product.brand} брэндийн demo нэгдсэн бараа`,
        status: "ACTIVE",
      },
    });

    for (const alias of [product.canonicalName, ...product.aliases]) {
      const normalizedValue = normalizeName(alias);
      await prisma.masterProductAlias.upsert({
        where: {
          masterProductId_normalizedValue: {
            masterProductId: master.id,
            normalizedValue,
          },
        },
        update: { value: alias },
        create: { masterProductId: master.id, value: alias, normalizedValue },
      });
    }
  }

  console.log(`Seeded ${demoProducts.length} demo master catalog products.`);
  console.log(`Try barcode: ${demoProducts[0].barcode}`);
  console.log(`Try name: ${demoProducts[2].aliases[0]}`);
}

main()
  .catch((error: unknown) => {
    console.error("Demo master catalog seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
