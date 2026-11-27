import { useEffect, useRef, useState } from "react";
import { studyMentorName, studyTeacherKey } from "@mgl/types";
import { MeetingBooking, type BookingTeacher } from "./MeetingBooking";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ChevronRight,
  X,
} from "lucide-react";
import type { ProjectItem } from "@/components/molecules/projects/project-types";
import { StudyTeacherAvatar } from "./StudyTeacherAvatar";
import {
  parseTeacherItems,
  type StudyTeacherItem,
  type StudySettings,
} from "./study-utils";

type TeacherProfile = StudyTeacherItem & {
  courses: ProjectItem[];
  mentor?: boolean;
  booking: BookingTeacher;
};
export function StudyTeachers({
  materials,
  settings,
  onOpen,
  openingId,
}: {
  materials: ProjectItem[];
  settings: StudySettings;
  onOpen: (item: ProjectItem) => void;
  openingId: string | null;
}) {
  const mentor = studyMentorName;
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, select] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  useEffect(() => {
    const el = dialog.current;
    if (!el || selected === null) return;
    el.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      el.close();
      document.body.style.overflow = previous;
    };
  }, [selected]);
  const profiles = new Map<string, TeacherProfile>([
    [
      studyTeacherKey({ name: mentor, description: "" }, ""),
      {
        name: mentor,
        description: settings.mentorBio,
        imageUrl: settings.mentorPhoto,
        courses: [],
        mentor: true,
        booking: { name: mentor },
      },
    ],
  ]);
  for (const item of materials) {
    for (const [index, person] of parseTeacherItems(item).entries()) {
      const key = studyTeacherKey(person, item.id);
      const profile: TeacherProfile = profiles.get(key) ?? {
        ...person,
        booking: { name: person.name, courseId: item.id, index },
        courses: [],
      };
      profile.description ||= person.description;
      profile.imageUrl ||= person.imageUrl;
      if (!profile.courses.some((course) => course.id === item.id))
        profile.courses.push(item);
      profiles.set(key, profile);
    }
  }

  const profile = selected === null ? undefined : profiles.get(selected);
  function openProfile(key: string) {
    setBooking(false);
    select(key);
  }
  const entries = [...profiles];
  const [featuredKey, featured] = entries[0];
  return (
    <div className="mx-auto max-w-3xl">
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => openProfile(featuredKey)}
        className="relative isolate flex min-h-52 w-full overflow-hidden rounded-[1.75rem] bg-[#113e40] text-left text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700 sm:min-h-60"
      >
        <StudyTeacherAvatar
          teacher={featured}
          className="absolute! inset-y-0 right-0 -z-20 h-full w-[46%] text-5xl"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-linear-to-r from-[#113e40] from-45% via-[#113e40]/70 via-60% to-transparent to-84%"
        />
        <span className="flex max-w-[65%] flex-col items-start justify-between gap-4 px-5 py-6 sm:px-8">
          <span className="flex items-center gap-2 text-xs font-semibold text-teal-100">
            <span className="h-px w-5 bg-teal-300" />
            Бизнесийн ментор
          </span>
          <strong className="text-[clamp(1.5rem,6vw,2.6rem)] leading-tight tracking-tight">
            {featured.name}
          </strong>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-teal-950">
            Намтар үзэх <ArrowUpRight size={15} aria-hidden="true" />
          </span>
        </span>
      </button>
      {entries.length > 1 && (
        <section className="mt-7" aria-labelledby="study-instructors-title">
          <h3
            id="study-instructors-title"
            className="mb-3 text-base font-bold text-slate-900"
          >
            Сургалтын багш нар
          </h3>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200 bg-white">
            {entries.slice(1).map(([key, person]) => (
              <li key={key}>
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => openProfile(key)}
                  className="flex w-full items-center gap-3.5 px-4 py-4 text-left hover:bg-teal-50/50 focus-visible:outline-offset-[-3px] sm:px-6"
                >
                  <StudyTeacherAvatar
                    teacher={person}
                    className="size-14 rounded-2xl text-xl"
                  />
                  <span className="min-w-0 flex-1">
                    <strong className="block text-base text-slate-950">
                      {person.name}
                    </strong>
                    {person.description && (
                      <span className="mt-0.5 block truncate text-sm text-slate-600">
                        {person.description}
                      </span>
                    )}
                    <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-teal-800">
                      <BookOpen size={13} aria-hidden="true" />
                      {person.courses.length} сургалт
                    </span>
                  </span>
                  <ChevronRight
                    size={18}
                    aria-hidden="true"
                    className="shrink-0 text-slate-500"
                  />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {profile && (
        <dialog
          ref={dialog}
          onCancel={() => select(null)}
          aria-labelledby="teacher-profile-title"
          className="fixed inset-x-0 top-auto bottom-0 mx-auto mb-0 w-full max-w-lg max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-[1.75rem] bg-white p-0 text-slate-950 shadow-2xl backdrop:bg-slate-950/55 sm:inset-y-0 sm:my-auto sm:rounded-[1.75rem]"
        >
          <div className="sticky top-0 z-10 bg-white px-5 pt-3 sm:px-6">
            <div
              aria-hidden="true"
              className="mx-auto mb-1 h-1 w-9 rounded-full bg-slate-200 sm:hidden"
            />
            <div className="flex items-center justify-between">
              {booking ? (
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-teal-800"
                  onClick={() => setBooking(false)}
                >
                  <ArrowLeft size={16} />
                  Намтар
                </button>
              ) : (
                <span className="text-sm font-semibold text-slate-600">
                  Багшийн намтар
                </span>
              )}
              <button
                type="button"
                aria-label="Хаах"
                onClick={() => select(null)}
                className="grid size-11 place-items-center rounded-full hover:bg-slate-100"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6">
            <header className="flex items-center gap-4 border-b border-slate-200 py-4">
              <StudyTeacherAvatar
                teacher={profile}
                className={
                  booking
                    ? "size-12 rounded-2xl text-lg"
                    : "size-20 rounded-3xl text-2xl"
                }
              />
              <div>
                <p className="mb-1 text-xs font-semibold text-teal-800">
                  {profile.mentor ? "Бизнесийн ментор" : "Сургалтын багш"}
                </p>
                <h2
                  id="teacher-profile-title"
                  className="text-2xl font-bold leading-tight"
                >
                  {profile.name}
                </h2>
              </div>
            </header>
            {booking ? (
              <MeetingBooking teacher={profile.booking} embedded />
            ) : (
              <>
                <p className="my-5 whitespace-pre-line text-base leading-7 text-slate-700">
                  {profile.description || "Намтар хараахан нэмэгдээгүй байна."}
                </p>
                <button
                  type="button"
                  onClick={() => setBooking(true)}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-800 px-4 font-bold text-white"
                >
                  <CalendarDays size={18} aria-hidden="true" />
                  Уулзалтын цаг авах
                </button>
                {profile.courses.length > 0 && (
                  <h3 className="mt-6 text-sm font-bold">Заадаг сургалтууд</h3>
                )}
                {profile.courses.map((course) => (
                  <button
                    type="button"
                    key={course.id}
                    disabled={openingId === course.id}
                    onClick={() => {
                      select(null);
                      onOpen(course);
                    }}
                    className="flex min-h-12 w-full items-center justify-between gap-3 border-b border-slate-100 py-3 text-left text-sm font-medium text-teal-900"
                  >
                    {course.title}
                    <ChevronRight size={16} className="shrink-0" />
                  </button>
                ))}
              </>
            )}
          </div>
        </dialog>
      )}
    </div>
  );
}
