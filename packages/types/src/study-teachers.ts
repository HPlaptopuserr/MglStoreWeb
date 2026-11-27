const EMPTY_STUDY_TEACHER_MARKER = "__EMPTY_STUDY_TEACHER_ROW__";

function looksLikeUrl(value: string) {
  return /^https?:\/\//i.test(value.trim()) || value.startsWith("data:image/");
}

export type StudyTeacherItem = {
  name: string;
  description: string;
  imageUrl?: string;
};

export function studyTeachers(info?: string): StudyTeacherItem[] {
  return String(info || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && line !== EMPTY_STUDY_TEACHER_MARKER)
    .map((line) => {
      const [rawName, ...rawDescriptionParts] = line.split("::");
      const description = rawDescriptionParts[0]?.trim() || "";
      const imageUrl = rawDescriptionParts.slice(1).join("::").trim();
      const name = rawName.trim();
      if (looksLikeUrl(name) && !description && !imageUrl) {
        return {
          name: "Багшийн мэдээлэл",
          description: "",
          imageUrl: name,
        };
      }
      return {
        name: name || "Багшийн мэдээлэл",
        description,
        imageUrl,
      };
    });
}

export const studyMentorName = "В. Есөнтөмөр";
export function studyTeacherKey(person: StudyTeacherItem, courseId: string) {
  if (person.name === "Багшийн мэдээлэл") return person.imageUrl || courseId;
  return person.name
    .normalize("NFC")
    .trim()
    .replace(/\.\s*/g, ".")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("mn-MN");
}
