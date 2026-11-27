import { ChevronDown } from "lucide-react";
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
};
const keyFor = (name: string) =>
  name
    .normalize("NFC")
    .trim()
    .replace(/\.\s*/g, ".")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("mn-MN");

export function StudyTeachers({
  materials,
  settings,
  onOpen,
  onMentor,
  openingId,
}: {
  materials: ProjectItem[];
  settings: StudySettings;
  onOpen: (item: ProjectItem) => void;
  onMentor: () => void;
  openingId: string | null;
}) {
  const mentor = "В. Есөнтөмөр";
  const profiles = new Map<string, TeacherProfile>([
    [
      keyFor(mentor),
      {
        name: mentor,
        description: settings.mentorBio,
        imageUrl: settings.mentorPhoto,
        courses: [],
        mentor: true,
      },
    ],
  ]);
  for (const item of materials) {
    for (const person of parseTeacherItems(item)) {
      const key =
        person.name === "Багшийн мэдээлэл"
          ? person.imageUrl || item.id
          : keyFor(person.name);
      const profile: TeacherProfile = profiles.get(key) ?? {
        ...person,
        courses: [],
      };
      profile.description ||= person.description;
      profile.imageUrl ||= person.imageUrl;
      if (!profile.courses.some((course) => course.id === item.id))
        profile.courses.push(item);
      profiles.set(key, profile);
    }
  }

  return (
    <div className="grid items-start gap-3 sm:grid-cols-2">
      {Array.from(profiles, ([key, profile]) => (
        <details
          key={key}
          className="group rounded-2xl border border-slate-200 bg-white"
        >
          <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl p-4 focus-visible:outline-sky-700 [&::-webkit-details-marker]:hidden">
            <StudyTeacherAvatar
              teacher={profile}
              className="h-14 w-14 rounded-full text-lg"
            />
            <span className="min-w-0 flex-1">
              <strong className="block break-words text-slate-950">
                {profile.name}
              </strong>
              <span className="text-sm text-slate-600">
                {[
                  profile.mentor && "Бизнесийн ментор",
                  profile.courses.length > 0 &&
                    profile.courses.length + " сургалт",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <ChevronDown
              aria-hidden="true"
              className="h-5 w-5 text-slate-500 group-open:rotate-180"
            />
          </summary>
          <div className="mx-4 border-t border-slate-200 py-3">
            {profile.description && (
              <p className="mb-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                {profile.description}
              </p>
            )}
            {profile.courses.map((course) => (
              <button
                type="button"
                key={course.id}
                disabled={openingId === course.id}
                onClick={() => onOpen(course)}
                className="block min-h-11 w-full py-2 text-left font-semibold text-sky-800 underline underline-offset-4"
              >
                {course.title}
              </button>
            ))}
            {profile.mentor && (
              <button
                type="button"
                onClick={onMentor}
                className="min-h-11 rounded-xl bg-sky-700 px-4 font-semibold text-white"
              >
                Уулзалтын цаг авах
              </button>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
