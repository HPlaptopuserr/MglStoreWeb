"use client";
import { MeetingBooking } from "./MeetingBooking";
import { StudyTeacherAvatar } from "./StudyTeacherAvatar";
export function StudyMentor({ bio, photo }: { bio: string; photo: string }) {
  return (
    <div className="mx-auto max-w-xl space-y-5 pb-16">
      <header className="flex items-center gap-4 rounded-3xl bg-slate-900 px-5 py-7 text-white">
        <StudyTeacherAvatar
          teacher={{ name: "В. Есөнтөмөр", imageUrl: photo }}
          className="h-20 w-20 rounded-2xl text-2xl"
        />
        <div>
          <p className="text-sm text-sky-200">Бизнесийн ментор</p>
          <h2 className="mt-1 text-2xl font-bold">В. Есөнтөмөр</h2>
        </div>
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-bold">Багшийн танилцуулга</h3>
        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
          {bio || "Багшийн танилцуулга удахгүй нэмэгдэнэ."}
        </p>
        <details className="mt-3 text-sm text-sky-700">
          <summary className="cursor-pointer">Эх сурвалж</summary>
          <ul className="mt-2 space-y-2 underline">
            <li>
              <a href="/mgl-club/mgl-club-introduction.pdf">
                MGL CLUB · Танилцуулга
              </a>
            </li>
            <li>
              <a href="https://business.mn/2024/11/01/ezneesee-gun-hamaaraltai-biznes-daraagiin-shatand-gardaggui/">
                Business.mn · 2024 оны уулзалт
              </a>
            </li>
            <li>
              <a href="https://www.24tsag.mn/a/46312">
                24цаг · 2013 оны сэтгүүлчид
              </a>
            </li>
          </ul>
        </details>
      </section>
      <MeetingBooking />
    </div>
  );
}
