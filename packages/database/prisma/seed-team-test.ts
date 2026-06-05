import { prisma } from "../src/client";

const departments = [
  "Үүсгэн байгуулагчид",
  "Хөрөнгө оруулагчид",
  "Зөвлөхүүд",
  "Захиргаа удирдлагын хэлтэс",
  "Бүтээгдэхүүн хөгжүүлэлтийн хэлтэс",
  "Технологийн хэлтэс",
  "Маркетинг борлуулалтын хэлтэс",
  "Үйл ажиллагааны хэлтэс",
  "Санхүүгийн хэлтэс",
  "Харилцагчийн үйлчилгээний хэлтэс",
];

const members = [
  {
    id: "seed-team-founder-1",
    name: "Б.Бат-Эрдэнэ",
    role: "Үүсгэн байгуулагч, CEO",
    department: "Үүсгэн байгуулагчид",
    bio: "Компанийн стратеги, урт хугацааны өсөлт болон түншлэлийн чиглэлийг удирддаг.",
    email: "bat-erdene@mglstore.mn",
    experience: "10 жил",
    skills: ["Founder", "Strategy", "Leadership"],
    order: 0,
  },
  {
    id: "seed-team-investor-1",
    name: "Д.Энхтүвшин",
    role: "Хөрөнгө оруулагч",
    department: "Хөрөнгө оруулагчид",
    bio: "Санхүүжилт, зах зээлийн тэлэлт, хөрөнгө оруулалтын бүтэц дээр зөвлөн ажилладаг.",
    email: "enkhtuvshin@mglstore.mn",
    experience: "12 жил",
    skills: ["Investor", "Finance", "Growth"],
    order: 1,
  },
  {
    id: "seed-team-advisor-1",
    name: "О.Ариунболд",
    role: "Стратегийн зөвлөх",
    department: "Зөвлөхүүд",
    bio: "Бизнес модел, franchise систем болон байгууллагын процессын зөвлөхөөр ажилладаг.",
    email: "ariunbold@mglstore.mn",
    experience: "9 жил",
    skills: ["Advisor", "Franchise", "Operations"],
    order: 2,
  },
  {
    id: "seed-team-admin-1",
    name: "Г.Тэмүүлэн",
    role: "HR",
    department: "Захиргаа удирдлагын хэлтэс",
    bio: "Ажилтны бүрдүүлэлт, дотоод соёл, сургалт хөгжлийн үйл ажиллагааг хариуцдаг.",
    email: "temuulen@mglstore.mn",
    experience: "5 жил",
    skills: ["HR", "Culture", "Recruitment"],
    order: 10,
  },
  {
    id: "seed-team-admin-2",
    name: "Ж.Намуун",
    role: "Оффис менежер",
    department: "Захиргаа удирдлагын хэлтэс",
    bio: "Оффисын өдөр тутмын зохион байгуулалт болон дотоод баримт бичгийн урсгалыг хариуцдаг.",
    email: "namuun@mglstore.mn",
    experience: "4 жил",
    skills: ["Admin", "Planning", "Documentation"],
    order: 11,
  },
  {
    id: "seed-team-product-1",
    name: "Э.Бат-Эрдэнэ",
    role: "Бүтээгдэхүүн хөгжүүлэлтийн менежер",
    department: "Бүтээгдэхүүн хөгжүүлэлтийн хэлтэс",
    bio: "Web болон admin бүтээгдэхүүний roadmap, feature delivery-г удирдан ажилладаг.",
    email: "bat-erdene.pd@mglstore.mn",
    experience: "6 жил",
    skills: ["Product", "Roadmap", "Analytics"],
    order: 20,
  },
  {
    id: "seed-team-product-2",
    name: "А.Мөнхзул",
    role: "UI/UX дизайнер",
    department: "Бүтээгдэхүүн хөгжүүлэлтийн хэлтэс",
    bio: "Хэрэглэгчийн урсгал, interface design, prototype болон дизайн систем дээр ажилладаг.",
    email: "munkhzul@mglstore.mn",
    experience: "4 жил",
    skills: ["UI design", "UX research", "Prototype"],
    order: 21,
  },
  {
    id: "seed-team-tech-1",
    name: "Д.Анхбаяр",
    role: "Frontend хөгжүүлэгч",
    department: "Технологийн хэлтэс",
    bio: "Web app, responsive UI, component architecture болон хэрэглэгчийн performance-г сайжруулдаг.",
    email: "ankhbayar@mglstore.mn",
    experience: "5 жил",
    skills: ["React", "Next.js", "TypeScript"],
    order: 30,
  },
  {
    id: "seed-team-tech-2",
    name: "С.Билгүүн",
    role: "Backend хөгжүүлэгч",
    department: "Технологийн хэлтэс",
    bio: "API, өгөгдлийн сан, төлбөрийн интеграц болон байгууллагын системийн найдвартай ажиллагааг хариуцдаг.",
    email: "bilguun@mglstore.mn",
    experience: "5 жил",
    skills: ["Node.js", "Prisma", "PostgreSQL"],
    order: 31,
  },
  {
    id: "seed-team-tech-3",
    name: "Б.Төгөлдөр",
    role: "QA инженер",
    department: "Технологийн хэлтэс",
    bio: "Release бүрийн чанарын шалгалт, regression test болон хэрэглэгчийн алдааны мөрдөлтийг хариуцдаг.",
    email: "tuguldur@mglstore.mn",
    experience: "3 жил",
    skills: ["QA", "Testing", "Automation"],
    order: 32,
  },
  {
    id: "seed-team-marketing-1",
    name: "О.Номин",
    role: "Маркетингийн менежер",
    department: "Маркетинг борлуулалтын хэлтэс",
    bio: "Campaign, brand communication болон social сувгийн контент төлөвлөлтийг удирддаг.",
    email: "nomin@mglstore.mn",
    experience: "4 жил",
    skills: ["Marketing", "Content", "Campaign"],
    order: 40,
  },
  {
    id: "seed-team-marketing-2",
    name: "М.Энхжин",
    role: "Борлуулалтын зөвлөх",
    department: "Маркетинг борлуулалтын хэлтэс",
    bio: "B2B харилцагч, үйлчилгээний танилцуулга болон борлуулалтын funnel-ийг хариуцдаг.",
    email: "enkhjin@mglstore.mn",
    experience: "3 жил",
    skills: ["Sales", "CRM", "B2B"],
    order: 41,
  },
  {
    id: "seed-team-ops-1",
    name: "М.Төгөлдөр",
    role: "Логистик зохицуулагч",
    department: "Үйл ажиллагааны хэлтэс",
    bio: "Захиалга, хүргэлт, агуулах болон салбар хоорондын үйл ажиллагааны уялдааг хариуцдаг.",
    email: "tuguldur.ops@mglstore.mn",
    experience: "4 жил",
    skills: ["Logistics", "Operations", "Inventory"],
    order: 50,
  },
  {
    id: "seed-team-ops-2",
    name: "Л.Саруул",
    role: "Үйл ажиллагааны менежер",
    department: "Үйл ажиллагааны хэлтэс",
    bio: "Өдөр тутмын process, үйлчилгээний стандарт, баг хоорондын гүйцэтгэлийг хянадаг.",
    email: "saruul@mglstore.mn",
    experience: "6 жил",
    skills: ["Operations", "Process", "Service"],
    order: 51,
  },
  {
    id: "seed-team-finance-1",
    name: "Н.Ану",
    role: "Санхүүгийн мэргэжилтэн",
    department: "Санхүүгийн хэлтэс",
    bio: "Төлбөр тооцоо, тайлан, гэрээний санхүүгийн мэдээлэл болон дотоод хяналтад төвлөрөн ажилладаг.",
    email: "anu@mglstore.mn",
    experience: "6 жил",
    skills: ["Finance", "Reporting", "Control"],
    order: 60,
  },
  {
    id: "seed-team-service-1",
    name: "П.Марал",
    role: "Харилцагчийн үйлчилгээний ахлах",
    department: "Харилцагчийн үйлчилгээний хэлтэс",
    bio: "Харилцагчийн санал хүсэлт, support flow болон үйлчилгээний чанарын тайланг хариуцдаг.",
    email: "maral@mglstore.mn",
    experience: "5 жил",
    skills: ["Support", "Service", "Customer success"],
    order: 70,
  },
];

async function main() {
  await prisma.siteSetting.upsert({
    where: { key: "teamDepartments" },
    update: { value: JSON.stringify(departments) },
    create: { key: "teamDepartments", value: JSON.stringify(departments) },
  });

  await prisma.teamMember.deleteMany({
    where: { id: { startsWith: "seed-team-" } },
  });

  await prisma.teamMember.createMany({
    data: members.map((member) => ({
      ...member,
      avatarUrl: null,
      linkedinUrl: null,
      isActive: true,
    })),
  });

  console.log(`Seeded ${departments.length} departments and ${members.length} team members.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
