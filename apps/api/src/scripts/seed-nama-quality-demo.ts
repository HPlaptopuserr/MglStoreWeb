import { prisma } from '@mgl/database';

// User-requested local demo. Never replace existing standards or inspections.
async function main() {
  if (new URL(process.env.DATABASE_URL ?? '').hostname !== '127.0.0.1') {
    throw new Error('This demo is restricted to the verified local database.');
  }
  const organizationId = 'a8dc2bec-028c-4c58-ba75-3d9a074ce484';
  const result = await prisma.$transaction(async tx => {
    const organization = await tx.organization.findUniqueOrThrow({ where: { id: organizationId } });
    if (organization.name !== 'nama') throw new Error('Organization mismatch');
    if (await tx.qualityChecklistTemplate.count({ where: { organizationId } })) {
      throw new Error('Existing checklist found; no changes made.');
    }
    const owners = await tx.organizationMember.findMany({
      where: { organizationId, role: 'OWNER', isActive: true, deletedAt: null },
      select: { userId: true },
    });
    if (owners.length !== 1) throw new Error('Expected one organization owner');
    const groups = [
      { title: 'Цэвэрлэгээ', questions: ['Дэлгүүрийн шал, орц цэвэр байна уу?', 'Лангуу, тавиурууд тоосгүй байна уу?'] },
      { title: 'Барааны өрөлт', questions: ['Бараанууд эмх цэгцтэй өрөгдсөн үү?', 'Хугацаа дууссан бараа байхгүй байна уу?'] },
      { title: 'Үнэ, мэдээлэл', questions: ['Барааны үнийн шошго харагдаж байна уу?', 'Шошгон дээрх үнэ борлуулах үнэтэй таарч байна уу?'] },
    ];
    return tx.qualityChecklistTemplate.create({ data: {
      organizationId, createdById: owners[0].userId,
      name: 'ЖИШЭЭ — nama дэлгүүрийн энгийн шалгалт', version: 1, isActive: true,
      schema: groups.map((group, index) => ({ id: `demo-section-${index + 1}`, title: group.title,
        questions: group.questions.map((text, q) => ({ id: `demo-question-${index + 1}-${q + 1}`, text, weight: 1, required: true })) })),
    }, select: { id: true, name: true, version: true, isActive: true } });
  });
  console.log(JSON.stringify(result));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
