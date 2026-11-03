import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import type { Prisma, OrganizationTaskStatus } from "@mgl/database";
import { dailyStatus, demoGroupId, demoPrefix, instant } from "./fixtures";

export async function demoEvidence(
  filename: string,
  companyNumber: number,
): Promise<string> {
  const directory = path.resolve(__dirname, "../../../uploads/task-evidence");
  await mkdir(directory, { recursive: true });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="800" height="450" rx="32" fill="#eff4ff"/><rect x="32" y="32" width="736" height="96" rx="20" fill="#145bff"/><text x="64" y="94" font-family="Arial" font-size="36" fill="white">TUGS GROUP / DEMO</text><text x="64" y="205" font-family="Arial" font-size="30" fill="#122341">Company ${companyNumber} - sample evidence</text><text x="64" y="265" font-family="Arial" font-size="24" fill="#576780">Local UI testing data only</text><text x="64" y="335" font-family="Arial" font-size="24" fill="#576780">This is not a real completion report.</text></svg>`;
  await writeFile(
    path.join(directory, filename),
    await sharp(Buffer.from(svg)).png().toBuffer(),
  );
  return `/api/org/tasks/evidence/uploads/${filename}`;
}
interface TaskSeedContext {
  companyIndex: number;
  employeeIndex: number;
  organizationId: string;
  userId: string;
  secondUserId: string;
  actorId: string;
  today: string;
  start: string;
  past: string;
  future: string;
  now: Date;
}
export async function seedEmployeeTasks(
  db: Prisma.TransactionClient,
  c: TaskSeedContext,
  imageUrl: string,
): Promise<void> {
  const examples: {
    key: string;
    title: string;
    status: OrganizationTaskStatus;
    dueDay: string;
  }[] = [
    {
      key: "daily",
      title:
        c.employeeIndex < 2
          ? "Багийн өдрийн ажлыг хянаж тайлагнах"
          : [
              "Өдрийн борлуулалтын тайлан бэлтгэх",
              "Барааны үлдэгдэл тулгах",
              "Үйлчилгээний чанарыг шалгах",
            ][c.employeeIndex % 3],
      status: dailyStatus(c.companyIndex, c.employeeIndex),
      dueDay: c.today,
    },
    {
      key: "history",
      title: "Өмнөх долоо хоногийн ажлын тайлан",
      status: c.employeeIndex % 4 === 0 ? "IN_PROGRESS" : "DONE",
      dueDay: c.past,
    },
    {
      key: "upcoming",
      title: "Ирэх долоо хоногийн бэлтгэл хангах",
      status: "PENDING",
      dueDay: c.future,
    },
  ];
  for (const example of examples) {
    const taskId = `${c.userId}-${example.key}`;
    const submitted =
      example.status === "DONE" || example.status === "PENDING_REVIEW";
    const approved = example.status === "DONE";
    const submittedAt = new Date(+c.now - 90 * 60_000);
    const approvedAt = new Date(+c.now - 60 * 60_000);
    await db.organizationTask.upsert({
      where: { id: taskId },
      update: {},
      create: {
        id: taskId,
        organizationId: c.organizationId,
        sourceGroupId: demoGroupId,
        clientRequestId: `${demoPrefix}-${c.companyIndex}-${c.employeeIndex}-${example.key}`,
        title: example.title,
        description:
          "Локал туршилтын ажил. Хүлээгдэж буй үр дүн: мэдээллээ цуглуулж, шалгаад тайлан хүргүүлэх.",
        priority:
          c.employeeIndex < 2
            ? "HIGH"
            : c.employeeIndex % 3 === 0
              ? "URGENT"
              : "NORMAL",
        createdById: c.actorId,
        createdAt: instant(c.start, 9),
        dueAt: instant(example.dueDay, 18),
        subTasks: {
          create: [
            "Мэдээллээ цуглуулах",
            "Тулгалт, шалгалт хийх",
            "Тайлангаа хүргүүлэх",
          ].map((title, sortOrder) => ({
            title,
            sortOrder,
            isCompleted:
              submitted ||
              (example.status === "IN_PROGRESS" && sortOrder === 0),
            completedAt: submitted ? submittedAt : null,
          })),
        },
        comments: {
          create: {
            authorId: c.userId,
            body: "Демо өгөгдөл: ажлын явц, төлөв болон тайлангийн харагдац шалгах жишээ.",
          },
        },
        assignees: {
          create: [
            {
              userId: c.userId,
              status: example.status,
              submittedAt: submitted ? submittedAt : null,
              completedAt: approved ? approvedAt : null,
              approvedAt: approved ? approvedAt : null,
              approvedById: approved ? c.actorId : null,
              performanceStars: approved
                ? 6 + ((c.companyIndex + c.employeeIndex) % 5)
                : null,
              productivityPercent: approved
                ? 70 + ((c.companyIndex * 3 + c.employeeIndex * 2) % 31)
                : null,
              evaluationNote: approved
                ? "Демо: шалгаж хүлээн авсан ажлын жишээ."
                : null,
              ...(submitted
                ? {
                    evidenceImages: {
                      create: {
                        url: imageUrl,
                        originalName: "Демо гүйцэтгэлийн жишээ.png",
                        sortOrder: 0,
                      },
                    },
                    approvalLogs: {
                      create: [
                        {
                          approvedById: c.userId,
                          action: "SUBMITTED" as const,
                          note: "Демо зурагтай тайлан",
                        },
                        ...(approved
                          ? [
                              {
                                approvedById: c.actorId,
                                action: "APPROVED" as const,
                                note: "Демо баталгаажуулалт",
                              },
                            ]
                          : []),
                      ],
                    },
                  }
                : {}),
            },
            ...(approved && c.employeeIndex === 0
              ? [{ userId: c.secondUserId, status: "CANCELLED" as const }]
              : []),
          ],
        },
      },
    });
  }
}
