import Link from "next/link";
import { MessageSquare, Phone } from "lucide-react";
import type { BuildingInquiryRecord } from "@mgl/types/building-inquiry";
import { buildingApiBase, buildingToken } from "../server/building-session";
import "./inquiries.css";

interface InquiryInboxData {
  total: number;
  inquiries: BuildingInquiryRecord[];
}

export async function InquiryInbox({ page }: { page: number }) {
  let data: InquiryInboxData | null = null;
  try {
    const token = await buildingToken();
    const response = await fetch(
      `${buildingApiBase}/api/building/admin/inquiries?page=${page}`,
      {
        headers: { Authorization: `Bearer ${token ?? ""}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (response.ok) data = (await response.json()) as InquiryInboxData;
  } catch {
    /* The inbox remains recoverable if the API is unavailable. */
  }
  return (
    <section className="building-inquiry-inbox">
      <header>
        <p>БОРЛУУЛАЛТЫН ХҮСЭЛТ</p>
        <h1>Ирсэн хүсэлтүүд</h1>
        <span>Байр сонирхсон хүмүүсийн нэр, утас, асуулт</span>
      </header>
      {!data ? (
        <div className="inquiry-inbox-empty" role="alert">
          <p>Хүсэлтүүдийг ачаалж чадсангүй.</p>
          <Link href={`/building/manage/inquiries?page=${page}`}>
            Дахин ачаалах →
          </Link>
        </div>
      ) : (
        <>
          <p className="inquiry-inbox-count">Нийт {data.total} хүсэлт</p>
          {!data.inquiries.length && (
            <div className="inquiry-inbox-empty">
              <MessageSquare size={32} />
              <h2>Одоогоор хүсэлт ирээгүй байна</h2>
              <p>Байрны хуудсаас илгээсэн мэдээлэл энд харагдана.</p>
            </div>
          )}
          <div className="inquiry-inbox-list">
            {data.inquiries.map((item) => (
              <article key={item.id}>
                <header>
                  <div>
                    <h2>{item.name}</h2>
                    <a href={`tel:${item.phone}`}>
                      <Phone size={14} /> {item.phone}
                    </a>
                  </div>
                  <time dateTime={item.createdAt}>
                    {new Intl.DateTimeFormat("mn-MN", {
                      timeZone: "Asia/Ulaanbaatar",
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(item.createdAt))}
                  </time>
                </header>
                <p className="inquiry-inbox-unit">
                  {item.project.title} · {item.blockName} блок ·{" "}
                  {item.floorNumber}-р давхар · № {item.unitNo}
                </p>
                {item.question ? (
                  <p className="inquiry-inbox-question">{item.question}</p>
                ) : (
                  <p className="inquiry-inbox-muted">Нэмэлт асуулт бичээгүй.</p>
                )}
              </article>
            ))}
          </div>
          {data.total > 20 && (
            <nav aria-label="Хүсэлтүүдийн хуудас">
              {page > 1 && <Link href={`?page=${page - 1}`}>← Өмнөх</Link>}
              <span>
                {page} / {Math.ceil(data.total / 20)}
              </span>
              {page * 20 < data.total && (
                <Link href={`?page=${page + 1}`}>Дараах →</Link>
              )}
            </nav>
          )}
        </>
      )}
    </section>
  );
}
